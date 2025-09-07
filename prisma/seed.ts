import { PrismaClient, UserRole, AccountType, JobStatus, InvoiceStatus, PaymentTerms, WarrantyStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@clearviewpro.com' },
    update: {},
    create: {
      email: 'admin@clearviewpro.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })

  // Create tech user
  const techUser = await prisma.user.upsert({
    where: { email: 'tech@clearviewpro.com' },
    update: {},
    create: {
      email: 'tech@clearviewpro.com',
      name: 'Tech User',
      role: UserRole.TECH,
    },
  })

  // Create residential customers
  const customer1 = await prisma.customer.create({
    data: {
      type: AccountType.RESIDENTIAL,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      phone: '(555) 123-4567',
      addresses: {
        create: {
          type: 'BILLING',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          isPrimary: true,
        },
      },
    },
  })

  const customer2 = await prisma.customer.create({
    data: {
      type: AccountType.RESIDENTIAL,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@email.com',
      phone: '(555) 987-6543',
      addresses: {
        create: {
          type: 'BILLING',
          street: '456 Oak Ave',
          city: 'Springfield',
          state: 'CA',
          zipCode: '54321',
          isPrimary: true,
        },
      },
    },
  })

  // Create dealership
  const dealership = await prisma.dealership.create({
    data: {
      name: 'Premier Auto Dealership',
      email: 'info@premierauto.com',
      phone: '(555) 555-0123',
      website: 'https://premierauto.com',
      paymentTerms: PaymentTerms.NET_30,
      addresses: {
        create: {
          type: 'BILLING',
          street: '789 Business Blvd',
          city: 'Commerce City',
          state: 'CA',
          zipCode: '67890',
          isPrimary: true,
        },
      },
      contacts: {
        create: [
          {
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike@premierauto.com',
            phone: '(555) 555-0124',
            role: 'Service Manager',
            isPrimary: true,
          },
          {
            firstName: 'Sarah',
            lastName: 'Wilson',
            email: 'sarah@premierauto.com',
            phone: '(555) 555-0125',
            role: 'Parts Manager',
            isPrimary: false,
          },
        ],
      },
    },
  })

  // Create vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      vin: '1HGCM82633A123456',
      year: 2023,
      make: 'Honda',
      model: 'Accord',
      trim: 'LX',
      color: 'Silver',
      mileage: 15000,
      customerId: customer1.id,
      vinMeta: {
        nhtsa: {
          make: 'HONDA',
          model: 'Accord',
          modelYear: '2023',
          trim: 'LX',
        },
        ocr: {
          confidence: 0.95,
          extractedText: '1HGCM82633A123456',
        },
      },
    },
  })

  const vehicle2 = await prisma.vehicle.create({
    data: {
      vin: '1FTFW1ET5DFC12345',
      year: 2022,
      make: 'Ford',
      model: 'F-150',
      trim: 'XLT',
      color: 'Blue',
      mileage: 25000,
      customerId: customer2.id,
      vinMeta: {
        nhtsa: {
          make: 'FORD',
          model: 'F-150',
          modelYear: '2022',
          trim: 'XLT',
        },
        ocr: {
          confidence: 0.92,
          extractedText: '1FTFW1ET5DFC12345',
        },
      },
    },
  })

  const vehicle3 = await prisma.vehicle.create({
    data: {
      vin: '1G1ZD5ST8GF123456',
      year: 2021,
      make: 'Chevrolet',
      model: 'Malibu',
      trim: 'LT',
      color: 'White',
      mileage: 32000,
      dealershipId: dealership.id,
      vinMeta: {
        nhtsa: {
          make: 'CHEVROLET',
          model: 'Malibu',
          modelYear: '2021',
          trim: 'LT',
        },
        ocr: {
          confidence: 0.88,
          extractedText: '1G1ZD5ST8GF123456',
        },
      },
    },
  })

  // Create service jobs
  const completedJob = await prisma.serviceJob.create({
    data: {
      vehicleId: vehicle1.id,
      customerId: customer1.id,
      technicianId: techUser.id,
      status: JobStatus.COMPLETED,
      scheduledAt: new Date('2024-01-15T10:00:00Z'),
      startedAt: new Date('2024-01-15T10:15:00Z'),
      completedAt: new Date('2024-01-15T12:30:00Z'),
      notes: 'Both headlights restored to like-new condition. Customer very satisfied.',
      serviceItems: {
        create: [
          {
            description: 'Headlight Restoration - Driver Side',
            quantity: 1,
            unitPrice: 75.00,
            type: 'LABOR',
          },
          {
            description: 'Headlight Restoration - Passenger Side',
            quantity: 1,
            unitPrice: 75.00,
            type: 'LABOR',
          },
          {
            description: 'Restoration Kit Materials',
            quantity: 1,
            unitPrice: 25.00,
            type: 'MATERIAL',
          },
        ],
      },
    },
  })

  const scheduledJob = await prisma.serviceJob.create({
    data: {
      vehicleId: vehicle2.id,
      customerId: customer2.id,
      technicianId: techUser.id,
      status: JobStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      notes: 'Customer requested both headlights. Moderate oxidation observed.',
      serviceItems: {
        create: [
          {
            description: 'Headlight Restoration - Both Sides',
            quantity: 2,
            unitPrice: 75.00,
            type: 'LABOR',
          },
          {
            description: 'Premium Restoration Kit',
            quantity: 1,
            unitPrice: 35.00,
            type: 'MATERIAL',
          },
        ],
      },
    },
  })

  // Create warranty for completed job (expiring soon for demo)
  const warranty = await prisma.warranty.create({
    data: {
      jobId: completedJob.id,
      startsAt: new Date('2024-01-15T12:30:00Z'),
      months: 12,
      expiresAt: new Date('2025-01-15T12:30:00Z'),
      status: WarrantyStatus.ACTIVE,
      coverage: '12-month warranty against oxidation and yellowing',
      terms: 'Warranty covers defects in workmanship and materials. Does not cover damage from accidents or misuse.',
    },
  })

  // Create invoice for completed job
  const invoice = await prisma.invoice.create({
    data: {
      number: 'INV-2024-0001',
      jobId: completedJob.id,
      customerId: customer1.id,
      status: InvoiceStatus.PAID,
      subtotal: 175.00,
      taxRate: 0.0875,
      taxAmount: 15.31,
      total: 190.31,
      terms: PaymentTerms.IMMEDIATE,
      paidAt: new Date('2024-01-15T14:00:00Z'),
      payments: {
        create: {
          amount: 190.31,
          method: 'CARD',
          status: 'SUCCEEDED',
          paidAt: new Date('2024-01-15T14:00:00Z'),
          stripePaymentId: 'pi_demo_payment_123',
        },
      },
    },
  })

  // Create email templates
  const invoiceTemplate = await prisma.emailTemplate.create({
    data: {
      key: 'invoice_created',
      name: 'Invoice Created',
      subject: 'Your ClearView Pro Invoice #{invoiceNumber}',
      htmlBody: `
        <h2>Invoice #{invoiceNumber}</h2>
        <p>Dear {customerName},</p>
        <p>Thank you for choosing ClearView Pro for your headlight restoration service.</p>
        <p><strong>Service Details:</strong></p>
        <p>Vehicle: {vehicleYear} {vehicleMake} {vehicleModel}</p>
        <p>Service Date: {serviceDate}</p>
        <p><strong>Amount Due: {total}</strong></p>
        <p>Due Date: {dueDate}</p>
        <p><a href="{paymentLink}">Pay Online</a></p>
        <p>Thank you for your business!</p>
        <p>ClearView Pro Team</p>
      `,
      textBody: 'Invoice #{invoiceNumber} - Amount Due: {total}. Pay online: {paymentLink}',
      type: 'TRANSACTIONAL',
      variables: ['invoiceNumber', 'customerName', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'serviceDate', 'total', 'dueDate', 'paymentLink'],
    },
  })

  const warrantyExpiringTemplate = await prisma.emailTemplate.create({
    data: {
      key: 'warranty_expiring',
      name: 'Warranty Expiring Soon',
      subject: 'Your ClearView Pro Warranty Expires in {daysUntilExpiry} Days',
      htmlBody: `
        <h2>Warranty Expiring Soon</h2>
        <p>Dear {customerName},</p>
        <p>This is a friendly reminder that your headlight restoration warranty will expire in {daysUntilExpiry} days.</p>
        <p><strong>Warranty Details:</strong></p>
        <p>Vehicle: {vehicleYear} {vehicleMake} {vehicleModel}</p>
        <p>Service Date: {serviceDate}</p>
        <p>Warranty Expires: {warrantyExpireDate}</p>
        <p>If you notice any issues with your headlights, please contact us before your warranty expires.</p>
        <p><a href="{scheduleLink}">Schedule Inspection</a></p>
        <p>ClearView Pro Team</p>
      `,
      textBody: 'Your headlight warranty expires in {daysUntilExpiry} days. Schedule inspection: {scheduleLink}',
      type: 'TRANSACTIONAL',
      variables: ['customerName', 'daysUntilExpiry', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'serviceDate', 'warrantyExpireDate', 'scheduleLink'],
    },
  })

  const campaignTemplate = await prisma.emailTemplate.create({
    data: {
      key: 'headlight_service_offer',
      name: 'Headlight Service Offer',
      subject: 'Time to Restore Your {vehicleYear} {vehicleMake} {vehicleModel} Headlights?',
      htmlBody: `
        <h2>Professional Headlight Restoration</h2>
        <p>Dear {customerName},</p>
        <p>We noticed you own a {vehicleYear} {vehicleMake} {vehicleModel}. Vehicles of this age often benefit from professional headlight restoration.</p>
        <p><strong>Benefits of our service:</strong></p>
        <ul>
          <li>Improved visibility and safety</li>
          <li>Enhanced vehicle appearance</li>
          <li>12-month warranty</li>
          <li>Professional mobile service</li>
        </ul>
        <p><strong>Special Offer: $150 for both headlights (reg. $175)</strong></p>
        <p><a href="{scheduleLink}">Schedule Your Service</a></p>
        <p>ClearView Pro Team</p>
      `,
      textBody: 'Professional headlight restoration for your {vehicleYear} {vehicleMake} {vehicleModel}. Special offer: $150. Schedule: {scheduleLink}',
      type: 'CAMPAIGN',
      variables: ['customerName', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'scheduleLink'],
    },
  })

  // Create a sample campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: '2020-2022 Vehicle Owners Headlight Campaign',
      subject: 'Time to Restore Your Headlights?',
      templateId: campaignTemplate.id,
      segmentQuery: {
        vehicleYear: { gte: 2020, lte: 2022 },
        accountType: 'RESIDENTIAL',
      },
      status: 'DRAFT',
    },
  })

  console.log('✅ Seed completed successfully!')
  console.log('Created:')
  console.log(`- ${2} users (admin, tech)`)
  console.log(`- ${2} residential customers`)
  console.log(`- ${1} dealership with contacts`)
  console.log(`- ${3} vehicles`)
  console.log(`- ${2} service jobs`)
  console.log(`- ${1} warranty`)
  console.log(`- ${1} invoice with payment`)
  console.log(`- ${3} email templates`)
  console.log(`- ${1} campaign`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
