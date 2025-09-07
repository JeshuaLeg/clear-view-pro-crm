"use server"

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, createStripeCustomer, createCheckoutSession, createPaymentLink, toStripeAmount } from '@/lib/stripe'
import { generateInvoicePDF, savePDFToStorage } from '@/lib/pdf'
import { generateInvoiceNumber, calculateDueDate } from '@/lib/utils'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  jobId: z.string(),
  terms: z.enum(['IMMEDIATE', 'NET_15', 'NET_30', 'NET_45']).default('IMMEDIATE'),
  taxRate: z.number().min(0).max(1).default(0),
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().optional(),
  notes: z.string().optional(),
})

export async function createInvoice(data: z.infer<typeof createInvoiceSchema>) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const validatedData = createInvoiceSchema.parse(data)

    // Get the job with all related data
    const job = await prisma.serviceJob.findUnique({
      where: { id: validatedData.jobId },
      include: {
        serviceItems: true,
        vehicle: true,
        customer: true,
        dealership: true,
        technician: { select: { name: true } },
      },
    })

    if (!job) {
      return { 
        success: false, 
        error: 'Job not found' 
      }
    }

    if (job.status !== 'COMPLETED') {
      return { 
        success: false, 
        error: 'Job must be completed before creating an invoice' 
      }
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { jobId: job.id }
    })

    if (existingInvoice) {
      return { 
        success: false, 
        error: 'Invoice already exists for this job' 
      }
    }

    // Calculate totals
    const subtotal = job.serviceItems.reduce((sum, item) => 
      sum + (Number(item.unitPrice) * item.quantity), 0
    )

    const taxAmount = subtotal * validatedData.taxRate
    const total = subtotal + taxAmount

    // Validate deposit amount
    if (validatedData.depositRequired && validatedData.depositAmount) {
      if (validatedData.depositAmount > total) {
        return { 
          success: false, 
          error: 'Deposit amount cannot exceed total invoice amount' 
        }
      }
    }

    // Calculate due date
    const dueDate = calculateDueDate(validatedData.terms)

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        number: generateInvoiceNumber(),
        jobId: job.id,
        customerId: job.customerId,
        dealershipId: job.dealershipId,
        status: 'DRAFT',
        subtotal,
        taxRate: validatedData.taxRate,
        taxAmount,
        total,
        terms: validatedData.terms,
        dueAt: validatedData.terms === 'IMMEDIATE' ? new Date() : dueDate,
        depositRequired: validatedData.depositRequired,
        depositAmount: validatedData.depositAmount || null,
        notes: validatedData.notes,
      },
      include: {
        job: {
          include: {
            vehicle: true,
            serviceItems: true,
          },
        },
        customer: true,
        dealership: true,
      },
    })

    // Generate PDF
    const pdfData = {
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        total: Number(invoice.total),
        dueAt: invoice.dueAt,
        createdAt: invoice.createdAt,
        notes: invoice.notes,
      },
      customer: invoice.customer,
      dealership: invoice.dealership,
      job: {
        jobNumber: job.jobNumber,
        vehicle: job.vehicle,
        serviceItems: job.serviceItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          type: item.type,
        })),
        completedAt: job.completedAt,
      },
      company: {
        name: process.env.COMPANY_NAME || 'ClearView Pro',
        email: process.env.COMPANY_EMAIL || 'info@clearviewpro.com',
        phone: process.env.COMPANY_PHONE || '(555) 123-4567',
      },
    }

    const pdfBuffer = await generateInvoicePDF(pdfData)
    const pdfUrl = await savePDFToStorage(pdfBuffer, `invoice-${invoice.number}.pdf`)

    // Update invoice with PDF URL
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl },
    })

    // Update job status
    await prisma.serviceJob.update({
      where: { id: job.id },
      data: { status: 'INVOICED' },
    })

    revalidatePath('/admin/invoices')
    revalidatePath('/admin/jobs')
    revalidatePath(`/admin/jobs/${job.id}`)

    return {
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        total: Number(invoice.total),
        status: invoice.status,
        pdfUrl,
      },
    }
  } catch (error) {
    console.error('Invoice creation error:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
        details: error.errors,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    }
  }
}

export async function createStripeCheckout(invoiceId: string) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        job: {
          include: {
            vehicle: true,
            serviceItems: true,
          },
        },
        customer: true,
        dealership: true,
      },
    })

    if (!invoice) {
      return { 
        success: false, 
        error: 'Invoice not found' 
      }
    }

    const customerEmail = invoice.customer?.email || invoice.dealership?.email

    if (!customerEmail) {
      return { 
        success: false, 
        error: 'Customer email not found' 
      }
    }

    // Create or get Stripe customer
    let stripeCustomerId = invoice.customer?.stripeCustomerId || invoice.dealership?.stripeCustomerId

    if (!stripeCustomerId) {
      const stripeCustomer = await createStripeCustomer({
        email: customerEmail,
        name: invoice.customer 
          ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
          : invoice.dealership?.name,
        phone: invoice.customer?.phone || invoice.dealership?.phone,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customerId || '',
          dealershipId: invoice.dealershipId || '',
        },
      })

      stripeCustomerId = stripeCustomer.id

      // Update customer/dealership with Stripe ID
      if (invoice.customerId) {
        await prisma.customer.update({
          where: { id: invoice.customerId },
          data: { stripeCustomerId },
        })
      } else if (invoice.dealershipId) {
        await prisma.dealership.update({
          where: { id: invoice.dealershipId },
          data: { stripeCustomerId },
        })
      }
    }

    const vehicleDescription = [
      invoice.job.vehicle.year,
      invoice.job.vehicle.make,
      invoice.job.vehicle.model,
    ].filter(Boolean).join(' ')

    const checkoutSession = await createCheckoutSession({
      customerId: stripeCustomerId,
      successUrl: `${process.env.NEXTAUTH_URL}/admin/invoices/${invoice.id}?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/admin/invoices/${invoice.id}?canceled=true`,
      metadata: {
        invoiceId: invoice.id,
        jobId: invoice.jobId,
      },
      items: [{
        description: `Headlight Restoration - ${vehicleDescription} (Invoice ${invoice.number})`,
        quantity: 1,
        unitAmount: toStripeAmount(Number(invoice.total)),
      }],
    })

    // Update invoice with Stripe checkout ID
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { 
        stripeCheckoutId: checkoutSession.id,
        status: 'SENT',
      },
    })

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${invoice.id}`)

    return {
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    }
  } catch (error) {
    console.error('Stripe checkout creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }
  }
}

export async function createStripePaymentLink(invoiceId: string) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        job: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    if (!invoice) {
      return { 
        success: false, 
        error: 'Invoice not found' 
      }
    }

    const vehicleDescription = [
      invoice.job.vehicle.year,
      invoice.job.vehicle.make,
      invoice.job.vehicle.model,
    ].filter(Boolean).join(' ')

    const paymentLink = await createPaymentLink({
      metadata: {
        invoiceId: invoice.id,
        jobId: invoice.jobId,
      },
      items: [{
        description: `Headlight Restoration - ${vehicleDescription} (Invoice ${invoice.number})`,
        quantity: 1,
        unitAmount: toStripeAmount(Number(invoice.total)),
      }],
    })

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT' },
    })

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${invoice.id}`)

    return {
      success: true,
      paymentUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
    }
  } catch (error) {
    console.error('Payment link creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment link',
    }
  }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    })

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${invoice.id}`)

    return {
      success: true,
      invoice,
    }
  } catch (error) {
    console.error('Invoice status update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invoice status',
    }
  }
}
