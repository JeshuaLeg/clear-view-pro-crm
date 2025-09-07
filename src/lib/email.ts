import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export async function sendEmail(options: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: options.from || process.env.EMAIL_FROM || 'ClearView Pro <noreply@clearviewpro.com>',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      tags: options.tags,
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Email sending error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Template variable replacement
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string | number | undefined>
): string {
  let result = template
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    const replacement = value?.toString() || ''
    result = result.replace(new RegExp(placeholder, 'g'), replacement)
  })
  
  return result
}

// Email template types and interfaces
export interface EmailTemplate {
  id: string
  key: string
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  variables: string[]
  type: 'TRANSACTIONAL' | 'CAMPAIGN'
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

// Predefined email templates
export const DEFAULT_EMAIL_TEMPLATES = {
  INVOICE_CREATED: {
    key: 'invoice_created',
    name: 'Invoice Created',
    subject: 'Your ClearView Pro Invoice #{invoiceNumber}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Invoice #{invoiceNumber}</h2>
        <p>Dear {customerName},</p>
        <p>Thank you for choosing ClearView Pro for your headlight restoration service.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Service Details</h3>
          <p><strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}</p>
          <p><strong>Service Date:</strong> {serviceDate}</p>
          <p><strong>Amount Due:</strong> <span style="font-size: 18px; font-weight: bold; color: #2563eb;">{total}</span></p>
          <p><strong>Due Date:</strong> {dueDate}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{paymentLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Online</a>
        </div>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        <p>Thank you for your business!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          ClearView Pro<br>
          Professional Headlight Restoration<br>
          {companyPhone} | {companyEmail}
        </p>
      </div>
    `,
    textBody: `
Invoice #{invoiceNumber}

Dear {customerName},

Thank you for choosing ClearView Pro for your headlight restoration service.

Service Details:
Vehicle: {vehicleYear} {vehicleMake} {vehicleModel}
Service Date: {serviceDate}
Amount Due: {total}
Due Date: {dueDate}

Pay online: {paymentLink}

Thank you for your business!

ClearView Pro
{companyPhone} | {companyEmail}
    `,
    variables: ['invoiceNumber', 'customerName', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'serviceDate', 'total', 'dueDate', 'paymentLink', 'companyPhone', 'companyEmail'],
  },
  
  WARRANTY_EXPIRING: {
    key: 'warranty_expiring',
    name: 'Warranty Expiring Soon',
    subject: 'Your ClearView Pro Warranty Expires in {daysUntilExpiry} Days',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Warranty Expiring Soon</h2>
        <p>Dear {customerName},</p>
        <p>This is a friendly reminder that your headlight restoration warranty will expire in <strong>{daysUntilExpiry} days</strong>.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Warranty Details</h3>
          <p><strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}</p>
          <p><strong>Service Date:</strong> {serviceDate}</p>
          <p><strong>Warranty Expires:</strong> {warrantyExpireDate}</p>
        </div>
        
        <p>If you notice any issues with your headlights, please contact us before your warranty expires. We stand behind our work and want to ensure your complete satisfaction.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{scheduleLink}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Schedule Inspection</a>
        </div>
        
        <p>Thank you for trusting ClearView Pro with your headlight restoration needs.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          ClearView Pro<br>
          Professional Headlight Restoration<br>
          {companyPhone} | {companyEmail}
        </p>
      </div>
    `,
    textBody: `
Warranty Expiring Soon

Dear {customerName},

This is a friendly reminder that your headlight restoration warranty will expire in {daysUntilExpiry} days.

Warranty Details:
Vehicle: {vehicleYear} {vehicleMake} {vehicleModel}
Service Date: {serviceDate}
Warranty Expires: {warrantyExpireDate}

If you notice any issues with your headlights, please contact us before your warranty expires.

Schedule inspection: {scheduleLink}

ClearView Pro
{companyPhone} | {companyEmail}
    `,
    variables: ['customerName', 'daysUntilExpiry', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'serviceDate', 'warrantyExpireDate', 'scheduleLink', 'companyPhone', 'companyEmail'],
  },
  
  WARRANTY_EXPIRED: {
    key: 'warranty_expired',
    name: 'Warranty Follow-up',
    subject: 'Your ClearView Pro Warranty Has Expired - Special Offer Inside',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Warranty Follow-up</h2>
        <p>Dear {customerName},</p>
        <p>We hope you've been satisfied with your headlight restoration service. Your warranty expired on <strong>{warrantyExpireDate}</strong>, but we'd love to help keep your headlights looking great.</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #991b1b;">Vehicle Information</h3>
          <p><strong>Vehicle:</strong> {vehicleYear} {vehicleMake} {vehicleModel}</p>
          <p><strong>Original Service Date:</strong> {serviceDate}</p>
          <p><strong>Warranty Expired:</strong> {warrantyExpireDate}</p>
        </div>
        
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3 style="margin-top: 0; color: #15803d;">Special Offer</h3>
          <p>As a valued customer, we're offering you <strong>20% off</strong> your next headlight restoration service.</p>
          <p>This offer is valid for the next 30 days.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{scheduleLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Schedule Service</a>
        </div>
        
        <p>Thank you for being a loyal ClearView Pro customer!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          ClearView Pro<br>
          Professional Headlight Restoration<br>
          {companyPhone} | {companyEmail}
        </p>
      </div>
    `,
    textBody: `
Warranty Follow-up

Dear {customerName},

We hope you've been satisfied with your headlight restoration service. Your warranty expired on {warrantyExpireDate}.

Vehicle Information:
Vehicle: {vehicleYear} {vehicleMake} {vehicleModel}
Original Service Date: {serviceDate}
Warranty Expired: {warrantyExpireDate}

Special Offer: 20% off your next headlight restoration service (valid for 30 days)

Schedule service: {scheduleLink}

ClearView Pro
{companyPhone} | {companyEmail}
    `,
    variables: ['customerName', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'serviceDate', 'warrantyExpireDate', 'scheduleLink', 'companyPhone', 'companyEmail'],
  },
  
  PAYMENT_RECEIVED: {
    key: 'payment_received',
    name: 'Payment Confirmation',
    subject: 'Payment Received - Invoice #{invoiceNumber}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Confirmed</h2>
        <p>Dear {customerName},</p>
        <p>We've successfully received your payment. Thank you for your prompt payment!</p>
        
        <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3 style="margin-top: 0; color: #15803d;">Payment Details</h3>
          <p><strong>Invoice Number:</strong> {invoiceNumber}</p>
          <p><strong>Amount Paid:</strong> {amountPaid}</p>
          <p><strong>Payment Date:</strong> {paymentDate}</p>
          <p><strong>Payment Method:</strong> {paymentMethod}</p>
        </div>
        
        <p>Your vehicle: <strong>{vehicleYear} {vehicleMake} {vehicleModel}</strong></p>
        
        <p>A receipt for this payment has been attached to this email. Please keep it for your records.</p>
        
        <p>If you have any questions about this payment or need additional documentation, please don't hesitate to contact us.</p>
        
        <p>Thank you for choosing ClearView Pro!</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          ClearView Pro<br>
          Professional Headlight Restoration<br>
          {companyPhone} | {companyEmail}
        </p>
      </div>
    `,
    textBody: `
Payment Confirmed

Dear {customerName},

We've successfully received your payment. Thank you for your prompt payment!

Payment Details:
Invoice Number: {invoiceNumber}
Amount Paid: {amountPaid}
Payment Date: {paymentDate}
Payment Method: {paymentMethod}

Vehicle: {vehicleYear} {vehicleMake} {vehicleModel}

Thank you for choosing ClearView Pro!

ClearView Pro
{companyPhone} | {companyEmail}
    `,
    variables: ['customerName', 'invoiceNumber', 'amountPaid', 'paymentDate', 'paymentMethod', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'companyPhone', 'companyEmail'],
  }
}
