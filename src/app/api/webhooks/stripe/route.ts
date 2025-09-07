import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { constructWebhookEvent } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = constructWebhookEvent(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log('Received Stripe webhook:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.created':
        console.log('Customer created:', event.data.object.id)
        break

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge)
        break

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout session completed:', session.id)

    const invoiceId = session.metadata?.invoiceId
    if (!invoiceId) {
      console.error('No invoiceId in session metadata')
      return
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })

    if (!invoice) {
      console.error('Invoice not found:', invoiceId)
      return
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: Number(invoice.total),
        method: 'CARD',
        status: 'SUCCEEDED',
        stripePaymentId: session.payment_intent as string,
        paidAt: new Date(),
        metadata: {
          sessionId: session.id,
          customerEmail: session.customer_details?.email,
        },
      },
    })

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    console.log('Invoice marked as paid:', invoice.number)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing payment intent succeeded:', paymentIntent.id)

    // Find payment by Stripe payment intent ID
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id },
      include: { invoice: true }
    })

    if (payment) {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      })

      // Check if this completes the invoice
      const totalPaid = await prisma.payment.aggregate({
        where: {
          invoiceId: payment.invoiceId,
          status: 'SUCCEEDED'
        },
        _sum: { amount: true }
      })

      const invoiceTotal = Number(payment.invoice.total)
      const amountPaid = Number(totalPaid._sum.amount || 0)

      let invoiceStatus = 'SENT'
      if (amountPaid >= invoiceTotal) {
        invoiceStatus = 'PAID'
      } else if (amountPaid > 0) {
        invoiceStatus = 'PARTIAL'
      }

      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: invoiceStatus,
          paidAt: invoiceStatus === 'PAID' ? new Date() : undefined,
        },
      })

      console.log('Payment processed successfully for invoice:', payment.invoice.number)
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Processing payment intent failed:', paymentIntent.id)

    const payment = await prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntent.id }
    })

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        },
      })

      console.log('Payment marked as failed:', payment.id)
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error)
  }
}

async function handleInvoicePaymentSucceeded(stripeInvoice: Stripe.Invoice) {
  try {
    console.log('Processing Stripe invoice payment succeeded:', stripeInvoice.id)

    // Find our invoice by Stripe invoice ID
    const invoice = await prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id }
    })

    if (invoice) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: stripeInvoice.amount_paid / 100, // Convert from cents
          method: 'CARD',
          status: 'SUCCEEDED',
          stripePaymentId: stripeInvoice.payment_intent as string,
          paidAt: new Date(),
        },
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      })

      console.log('Stripe invoice payment processed:', invoice.number)
    }
  } catch (error) {
    console.error('Error handling Stripe invoice payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice) {
  try {
    console.log('Processing Stripe invoice payment failed:', stripeInvoice.id)

    const invoice = await prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id }
    })

    if (invoice) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: stripeInvoice.amount_due / 100,
          method: 'CARD',
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: 'Stripe invoice payment failed',
        },
      })

      console.log('Stripe invoice payment failed recorded:', invoice.number)
    }
  } catch (error) {
    console.error('Error handling Stripe invoice payment failed:', error)
  }
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  try {
    console.log('Processing charge succeeded:', charge.id)

    // Update payment record if it exists
    const payment = await prisma.payment.findFirst({
      where: { stripeChargeId: charge.id }
    })

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      })
    }
  } catch (error) {
    console.error('Error handling charge succeeded:', error)
  }
}

async function handleChargeFailed(charge: Stripe.Charge) {
  try {
    console.log('Processing charge failed:', charge.id)

    const payment = await prisma.payment.findFirst({
      where: { stripeChargeId: charge.id }
    })

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: charge.failure_message || 'Charge failed',
        },
      })
    }
  } catch (error) {
    console.error('Error handling charge failed:', error)
  }
}
