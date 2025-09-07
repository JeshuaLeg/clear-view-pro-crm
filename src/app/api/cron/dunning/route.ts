import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replaceTemplateVariables } from '@/lib/email'
import { formatDate, formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting dunning cron job...')

    const now = new Date()
    
    // Find overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'PARTIAL'] },
        dueAt: { lt: now },
      },
      include: {
        job: {
          include: {
            vehicle: true,
          },
        },
        customer: true,
        dealership: true,
        payments: {
          where: { status: 'SUCCEEDED' },
        },
      },
    })

    const results = []

    for (const invoice of overdueInvoices) {
      const daysPastDue = Math.floor(
        (now.getTime() - (invoice.dueAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)
      )

      // Skip if we've already sent a dunning email recently
      const recentDunning = await prisma.communicationLog.findFirst({
        where: {
          customerId: invoice.customerId,
          dealershipId: invoice.dealershipId,
          channel: 'EMAIL',
          subject: {
            contains: 'overdue',
            mode: 'insensitive',
          },
          createdAt: {
            gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      })

      if (recentDunning) {
        continue // Skip if we sent a dunning email in the last week
      }

      // Update invoice status to overdue
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      })

      const customerEmail = invoice.customer?.email || invoice.dealership?.email
      const customerName = invoice.customer 
        ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
        : invoice.dealership?.name

      if (!customerEmail || !customerName) {
        continue // Skip if no email or name
      }

      const totalPaid = invoice.payments.reduce((sum, payment) => 
        sum + Number(payment.amount), 0
      )
      const remainingBalance = Number(invoice.total) - totalPaid

      const vehicleDescription = [
        invoice.job.vehicle.year,
        invoice.job.vehicle.make,
        invoice.job.vehicle.model,
      ].filter(Boolean).join(' ')

      // Create dunning email template
      const subject = `Overdue Payment Reminder - Invoice ${invoice.number}`
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Payment Overdue</h2>
          <p>Dear ${customerName.trim()},</p>
          <p>This is a friendly reminder that your payment for invoice ${invoice.number} is now <strong>${daysPastDue} days overdue</strong>.</p>
          
          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #991b1b;">Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.number}</p>
            <p><strong>Vehicle:</strong> ${vehicleDescription}</p>
            <p><strong>Original Due Date:</strong> ${formatDate(invoice.dueAt!)}</p>
            <p><strong>Amount Due:</strong> <span style="font-size: 18px; font-weight: bold; color: #dc2626;">${formatCurrency(remainingBalance)}</span></p>
            <p><strong>Days Past Due:</strong> ${daysPastDue}</p>
          </div>
          
          <p>To avoid any service interruption or additional fees, please remit payment immediately.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/admin/invoices/${invoice.id}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a>
          </div>
          
          <p>If you have already sent payment, please disregard this notice. If you have any questions or concerns, please contact us immediately.</p>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            ClearView Pro<br>
            Professional Headlight Restoration<br>
            ${process.env.COMPANY_PHONE || '(555) 123-4567'} | ${process.env.COMPANY_EMAIL || 'info@clearviewpro.com'}
          </p>
        </div>
      `

      const textBody = `
Payment Overdue

Dear ${customerName.trim()},

This is a friendly reminder that your payment for invoice ${invoice.number} is now ${daysPastDue} days overdue.

Invoice Details:
Invoice Number: ${invoice.number}
Vehicle: ${vehicleDescription}
Original Due Date: ${formatDate(invoice.dueAt!)}
Amount Due: ${formatCurrency(remainingBalance)}
Days Past Due: ${daysPastDue}

Please remit payment immediately to avoid any service interruption or additional fees.

Pay online: ${process.env.NEXTAUTH_URL}/admin/invoices/${invoice.id}

If you have already sent payment, please disregard this notice.

ClearView Pro
${process.env.COMPANY_PHONE || '(555) 123-4567'} | ${process.env.COMPANY_EMAIL || 'info@clearviewpro.com'}
      `

      const emailResult = await sendEmail({
        to: customerEmail,
        subject,
        html: htmlBody,
        text: textBody,
        tags: [
          { name: 'type', value: 'dunning' },
          { name: 'invoice_id', value: invoice.id },
          { name: 'days_past_due', value: daysPastDue.toString() },
        ],
      })

      // Log the communication
      await prisma.communicationLog.create({
        data: {
          customerId: invoice.customerId,
          dealershipId: invoice.dealershipId,
          userId: 'system',
          channel: 'EMAIL',
          subject,
          bodySnippet: `Payment overdue reminder - ${daysPastDue} days past due`,
          metadata: {
            invoiceId: invoice.id,
            emailResult,
            daysPastDue,
            remainingBalance,
            templateKey: 'dunning_reminder',
          },
        },
      })

      results.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        customerEmail,
        daysPastDue,
        remainingBalance,
        emailSent: emailResult.success,
        error: emailResult.error,
      })
    }

    const summary = {
      timestamp: new Date().toISOString(),
      overdueInvoicesFound: overdueInvoices.length,
      dunningEmailsSent: results.filter(r => r.emailSent).length,
      errors: results.filter(r => !r.emailSent).length,
    }

    console.log('Dunning job completed:', summary)

    return NextResponse.json({
      success: true,
      message: 'Dunning job completed successfully',
      summary,
      results,
    })
  } catch (error) {
    console.error('Dunning cron job error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also allow POST requests for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
