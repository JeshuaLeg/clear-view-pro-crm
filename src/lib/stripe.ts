import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const getStripePublishableKey = () => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not set')
  }
  return process.env.STRIPE_PUBLISHABLE_KEY
}

// Stripe webhook signature verification
export const constructWebhookEvent = (body: string, signature: string) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}

// Create a Stripe customer
export const createStripeCustomer = async (params: {
  email: string
  name?: string
  phone?: string
  metadata?: Record<string, string>
}) => {
  return await stripe.customers.create({
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: params.metadata,
  })
}

// Create a Stripe invoice
export const createStripeInvoice = async (params: {
  customerId: string
  description?: string
  metadata?: Record<string, string>
  dueDate?: number
  collectionMethod?: 'charge_automatically' | 'send_invoice'
  items: Array<{
    description: string
    quantity: number
    unitAmount: number // in cents
  }>
}) => {
  // Create invoice items first
  for (const item of params.items) {
    await stripe.invoiceItems.create({
      customer: params.customerId,
      description: item.description,
      quantity: item.quantity,
      unit_amount: item.unitAmount,
    })
  }

  // Create the invoice
  const invoice = await stripe.invoices.create({
    customer: params.customerId,
    description: params.description,
    metadata: params.metadata,
    due_date: params.dueDate,
    collection_method: params.collectionMethod || 'send_invoice',
    auto_advance: false, // Don't auto-finalize
  })

  return invoice
}

// Create a Stripe Checkout session
export const createCheckoutSession = async (params: {
  customerId?: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  items: Array<{
    description: string
    quantity: number
    unitAmount: number // in cents
  }>
  mode?: 'payment' | 'subscription'
  paymentMethodTypes?: string[]
}) => {
  const lineItems = params.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.description,
      },
      unit_amount: item.unitAmount,
    },
    quantity: item.quantity,
  }))

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    line_items: lineItems,
    mode: params.mode || 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    payment_method_types: (params.paymentMethodTypes as any) || ['card'],
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['US'],
    },
  }

  if (params.customerId) {
    sessionParams.customer = params.customerId
  } else if (params.customerEmail) {
    sessionParams.customer_email = params.customerEmail
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

// Create a Payment Link
export const createPaymentLink = async (params: {
  metadata?: Record<string, string>
  items: Array<{
    description: string
    quantity: number
    unitAmount: number // in cents
  }>
}) => {
  // First create products and prices
  const lineItems = []
  
  for (const item of params.items) {
    const product = await stripe.products.create({
      name: item.description,
      metadata: params.metadata,
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: item.unitAmount,
      currency: 'usd',
    })

    lineItems.push({
      price: price.id,
      quantity: item.quantity,
    })
  }

  return await stripe.paymentLinks.create({
    line_items: lineItems,
    metadata: params.metadata,
  })
}

// Retrieve a payment intent
export const retrievePaymentIntent = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId)
}

// Retrieve a checkout session
export const retrieveCheckoutSession = async (sessionId: string) => {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'payment_intent'],
  })
}

// Format amount for display (convert cents to dollars)
export const formatStripeAmount = (amount: number): string => {
  return (amount / 100).toFixed(2)
}

// Convert dollars to cents for Stripe
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100)
}
