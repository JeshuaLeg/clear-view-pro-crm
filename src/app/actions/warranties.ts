"use server"

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WarrantyStatus } from '@prisma/client'
import { sendEmail, replaceTemplateVariables, DEFAULT_EMAIL_TEMPLATES } from '@/lib/email'
import { formatDate, formatCurrency } from '@/lib/utils'
import { z } from 'zod'

const createWarrantySchema = z.object({
  jobId: z.string(),
  months: z.number().min(1).max(120).default(12),
  coverage: z.string().optional(),
  terms: z.string().optional(),
})

export async function createWarranty(data: z.infer<typeof createWarrantySchema>) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const validatedData = createWarrantySchema.parse(data)

    // Get the job with related data
    const job = await prisma.serviceJob.findUnique({
      where: { id: validatedData.jobId },
      include: {
        vehicle: true,
        customer: true,
        dealership: true,
      },
    })

    if (!job) {
      return { 
        success: false, 
        error: 'Job not found' 
      }
    }

    if (job.status !== 'COMPLETED' && job.status !== 'INVOICED') {
      return { 
        success: false, 
        error: 'Job must be completed before creating a warranty' 
      }
    }

    // Check if warranty already exists
    const existingWarranty = await prisma.warranty.findFirst({
      where: { jobId: job.id }
    })

    if (existingWarranty) {
      return { 
        success: false, 
        error: 'Warranty already exists for this job' 
      }
    }

    const startsAt = job.completedAt || new Date()
    const expiresAt = new Date(startsAt)
    expiresAt.setMonth(expiresAt.getMonth() + validatedData.months)

    // Create warranty
    const warranty = await prisma.warranty.create({
      data: {
        jobId: job.id,
        startsAt,
        months: validatedData.months,
        expiresAt,
        status: 'ACTIVE',
        coverage: validatedData.coverage || '12-month warranty against oxidation and yellowing',
        terms: validatedData.terms || 'Warranty covers defects in workmanship and materials. Does not cover damage from accidents or misuse.',
      },
      include: {
        job: {
          include: {
            vehicle: true,
            customer: true,
            dealership: true,
          },
        },
      },
    })

    revalidatePath('/admin/jobs')
    revalidatePath(`/admin/jobs/${job.id}`)

    return {
      success: true,
      warranty: {
        id: warranty.id,
        startsAt: warranty.startsAt,
        expiresAt: warranty.expiresAt,
        months: warranty.months,
        status: warranty.status,
      },
    }
  } catch (error) {
    console.error('Warranty creation error:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
        details: error.errors,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create warranty',
    }
  }
}

export async function checkExpiringWarranties(daysAhead: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

    const expiringWarranties = await prisma.warranty.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: cutoffDate,
          gt: new Date(), // Not yet expired
        },
      },
      include: {
        job: {
          include: {
            vehicle: true,
            customer: true,
            dealership: true,
            technician: { select: { name: true } },
          },
        },
      },
    })

    const results = []

    for (const warranty of expiringWarranties) {
      const daysUntilExpiry = Math.ceil(
        (warranty.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      // Skip if we've already sent a reminder recently
      const recentCommunication = await prisma.communicationLog.findFirst({
        where: {
          customerId: warranty.job.customerId,
          dealershipId: warranty.job.dealershipId,
          channel: 'EMAIL',
          subject: {
            contains: 'warranty',
            mode: 'insensitive',
          },
          createdAt: {
            gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      })

      if (recentCommunication) {
        continue // Skip if we sent a warranty email in the last week
      }

      const customerEmail = warranty.job.customer?.email || warranty.job.dealership?.email
      const customerName = warranty.job.customer 
        ? `${warranty.job.customer.firstName} ${warranty.job.customer.lastName}`
        : warranty.job.dealership?.name

      if (!customerEmail || !customerName) {
        continue // Skip if no email or name
      }

      const vehicleDescription = [
        warranty.job.vehicle.year,
        warranty.job.vehicle.make,
        warranty.job.vehicle.model,
      ].filter(Boolean).join(' ')

      const template = DEFAULT_EMAIL_TEMPLATES.WARRANTY_EXPIRING
      
      const variables = {
        customerName: customerName.trim(),
        daysUntilExpiry: daysUntilExpiry.toString(),
        vehicleYear: warranty.job.vehicle.year?.toString() || '',
        vehicleMake: warranty.job.vehicle.make || '',
        vehicleModel: warranty.job.vehicle.model || '',
        serviceDate: formatDate(warranty.startsAt),
        warrantyExpireDate: formatDate(warranty.expiresAt),
        scheduleLink: `${process.env.NEXTAUTH_URL}/portal/schedule?warranty=${warranty.id}`,
        companyPhone: process.env.COMPANY_PHONE || '(555) 123-4567',
        companyEmail: process.env.COMPANY_EMAIL || 'info@clearviewpro.com',
      }

      const subject = replaceTemplateVariables(template.subject, variables)
      const htmlBody = replaceTemplateVariables(template.htmlBody, variables)
      const textBody = replaceTemplateVariables(template.textBody || '', variables)

      const emailResult = await sendEmail({
        to: customerEmail,
        subject,
        html: htmlBody,
        text: textBody,
        tags: [
          { name: 'type', value: 'warranty_expiring' },
          { name: 'warranty_id', value: warranty.id },
          { name: 'days_until_expiry', value: daysUntilExpiry.toString() },
        ],
      })

      // Log the communication
      await prisma.communicationLog.create({
        data: {
          customerId: warranty.job.customerId,
          dealershipId: warranty.job.dealershipId,
          userId: 'system', // System-generated email
          channel: 'EMAIL',
          subject,
          bodySnippet: `Warranty expires in ${daysUntilExpiry} days`,
          metadata: {
            warrantyId: warranty.id,
            emailResult: emailResult as any,
            daysUntilExpiry,
            templateKey: template.key,
          } as any,
        },
      })

      results.push({
        warrantyId: warranty.id,
        customerEmail,
        daysUntilExpiry,
        emailSent: emailResult.success,
        error: emailResult.error,
      })
    }

    return {
      success: true,
      processed: results.length,
      results,
    }
  } catch (error) {
    console.error('Warranty expiration check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check expiring warranties',
    }
  }
}

export async function checkExpiredWarranties() {
  try {
    const expiredWarranties = await prisma.warranty.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: new Date(),
        },
      },
      include: {
        job: {
          include: {
            vehicle: true,
            customer: true,
            dealership: true,
          },
        },
      },
    })

    const results = []

    for (const warranty of expiredWarranties) {
      // Update warranty status
      await prisma.warranty.update({
        where: { id: warranty.id },
        data: { status: 'EXPIRED' },
      })

      // Check if we should send a follow-up email
      const daysSinceExpiry = Math.floor(
        (new Date().getTime() - warranty.expiresAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Send follow-up email 7 days after expiry
      if (daysSinceExpiry === 7) {
        const customerEmail = warranty.job.customer?.email || warranty.job.dealership?.email
        const customerName = warranty.job.customer 
          ? `${warranty.job.customer.firstName} ${warranty.job.customer.lastName}`
          : warranty.job.dealership?.name

        if (customerEmail && customerName) {
          const template = DEFAULT_EMAIL_TEMPLATES.WARRANTY_EXPIRED
          
          const variables = {
            customerName: customerName.trim(),
            vehicleYear: warranty.job.vehicle.year?.toString() || '',
            vehicleMake: warranty.job.vehicle.make || '',
            vehicleModel: warranty.job.vehicle.model || '',
            serviceDate: formatDate(warranty.startsAt),
            warrantyExpireDate: formatDate(warranty.expiresAt),
            scheduleLink: `${process.env.NEXTAUTH_URL}/portal/schedule?vehicle=${warranty.job.vehicleId}`,
            companyPhone: process.env.COMPANY_PHONE || '(555) 123-4567',
            companyEmail: process.env.COMPANY_EMAIL || 'info@clearviewpro.com',
          }

          const subject = replaceTemplateVariables(template.subject, variables)
          const htmlBody = replaceTemplateVariables(template.htmlBody, variables)
          const textBody = replaceTemplateVariables(template.textBody || '', variables)

          const emailResult = await sendEmail({
            to: customerEmail,
            subject,
            html: htmlBody,
            text: textBody,
            tags: [
              { name: 'type', value: 'warranty_expired' },
              { name: 'warranty_id', value: warranty.id },
              { name: 'days_since_expiry', value: daysSinceExpiry.toString() },
            ],
          })

          // Log the communication
          await prisma.communicationLog.create({
            data: {
              customerId: warranty.job.customerId,
              dealershipId: warranty.job.dealershipId,
              userId: 'system',
              channel: 'EMAIL',
              subject,
              bodySnippet: `Warranty expired follow-up with special offer`,
              metadata: {
                warrantyId: warranty.id,
                emailResult: emailResult as any,
                daysSinceExpiry,
                templateKey: template.key,
              } as any,
            },
          })

          results.push({
            warrantyId: warranty.id,
            customerEmail,
            daysSinceExpiry,
            emailSent: emailResult.success,
            error: emailResult.error,
          })
        }
      }
    }

    return {
      success: true,
      expired: expiredWarranties.length,
      followUpsSent: results.length,
      results,
    }
  } catch (error) {
    console.error('Expired warranty check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check expired warranties',
    }
  }
}

export async function updateWarrantyStatus(warrantyId: string, status: WarrantyStatus) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const warranty = await prisma.warranty.update({
      where: { id: warrantyId },
      data: { status },
    })

    revalidatePath('/admin/jobs')
    
    return {
      success: true,
      warranty,
    }
  } catch (error) {
    console.error('Warranty status update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update warranty status',
    }
  }
}
