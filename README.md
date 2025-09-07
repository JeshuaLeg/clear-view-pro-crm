# ClearView Pro CRM

A comprehensive headlight restoration CRM system built with Next.js 14, TypeScript, Prisma, and modern web technologies.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJeshuaLeg%2Fclear-view-pro-crm&env=DATABASE_URL,NEXTAUTH_SECRET,NEXTAUTH_URL,RESEND_API_KEY,STRIPE_SECRET_KEY,STRIPE_PUBLISHABLE_KEY,STRIPE_WEBHOOK_SECRET,OCR_PROVIDER&envDescription=Environment%20variables%20needed%20for%20ClearView%20Pro%20CRM&envLink=https%3A%2F%2Fgithub.com%2FJeshuaLeg%2Fclear-view-pro-crm%2Fblob%2Fmain%2Fenv.example&project-name=clear-view-pro-crm&repository-name=clear-view-pro-crm)

**One-click deploy to Vercel** - All environment variables will be prompted during setup.

## Features

### 🚗 VIN Management
- **OCR VIN Extraction**: Supports Google Vision, AWS Textract, and Tesseract.js
- **Automatic VIN Validation**: ISO 3779 check digit validation
- **NHTSA Integration**: Automatic vehicle information decoding
- **Mobile-Friendly**: Optimized for field technicians

### 👥 Customer Management
- **Residential Customers**: Individual customer management
- **Commercial Accounts**: Dealership management with multiple contacts
- **Address Management**: Multiple addresses per account
- **Vehicle Assignment**: Link vehicles to customers or dealerships

### 🔧 Service Management
- **Job Tracking**: Complete lifecycle from scheduled to invoiced
- **Technician Assignment**: Track who performed the work
- **Before/After Photos**: Visual documentation of work performed
- **Service Items**: Detailed breakdown of labor and materials

### 💰 Billing & Payments
- **Stripe Integration**: Secure payment processing
- **Invoice Generation**: Professional PDF invoices
- **Payment Terms**: Support for Net-15/30/45 for B2B
- **Deposit Handling**: Partial payments for scheduled services
- **Webhook Processing**: Real-time payment status updates

### 🛡️ Warranty Management
- **Automatic Tracking**: Track warranty periods per job
- **Expiration Alerts**: Automated email notifications
- **Status Management**: Active, expired, claimed, voided

### 📧 Email System
- **Transactional Emails**: Invoice notifications, receipts, warranties
- **Campaign Management**: Targeted marketing campaigns
- **Template System**: Customizable email templates
- **Resend Integration**: Reliable email delivery

### 🔐 Authentication & Security
- **NextAuth.js**: Secure authentication
- **Role-Based Access**: ADMIN, TECH, STAFF, CUSTOMER_PORTAL
- **Magic Link Login**: Passwordless authentication
- **Google OAuth**: Social login support

### 📱 Mobile-First Design
- **Responsive UI**: Works on all devices
- **Field Tech Optimized**: Mobile-friendly interfaces
- **Bottom Navigation**: Quick access to key functions
- **Progressive Web App**: Installable on mobile devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Email**: Resend
- **OCR**: Google Vision API, AWS Textract, Tesseract.js
- **File Storage**: UploadThing / Vercel Blob
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon, Vercel Postgres, or local)
- Stripe account (for payments)
- Resend account (for emails)
- OCR provider account (Google Vision API, AWS Textract) or use Tesseract.js fallback
- Vercel account (for deployment and cron jobs)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clear-view-pro-crm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/clearviewpro"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email
RESEND_API_KEY="re_your_api_key_here"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# OCR Provider
OCR_PROVIDER="google" # google|aws|tesseract
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# External APIs
NHTSA_API_BASE="https://vpic.nhtsa.dot.gov/api"

# File Storage
UPLOADTHING_SECRET="sk_live_your_uploadthing_secret"
UPLOADTHING_APP_ID="your_uploadthing_app_id"
```

4. Set up the database:
```bash
npm run db:migrate
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Default Login

After seeding, you can log in with:
- Email: `admin@clearviewpro.com` (Admin role)
- Email: `tech@clearviewpro.com` (Tech role)

Use the magic link authentication or set up Google OAuth.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin interface
│   ├── portal/            # Customer portal
│   ├── api/               # API routes
│   ├── actions/           # Server actions
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   └── [feature]/         # Feature-specific components
├── lib/                   # Utilities and configuration
│   ├── ocr/              # OCR providers
│   ├── auth.ts           # Authentication config
│   ├── prisma.ts         # Database client
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Seed data
```

## Database Schema

The application uses a comprehensive PostgreSQL schema with the following main entities:

- **Users**: Authentication and role management
- **Customers/Dealerships**: Account management
- **Vehicles**: VIN and vehicle information
- **ServiceJobs**: Work order management
- **Invoices/Payments**: Billing and payment processing
- **Warranties**: Warranty tracking
- **EmailTemplates/Campaigns**: Email marketing
- **CommunicationLog**: Interaction history

## API Routes

### Admin Routes
- `GET /admin` - Dashboard
- `GET /admin/accounts/customers` - Customer management
- `GET /admin/accounts/dealerships` - Dealership management
- `GET /admin/vehicles` - Vehicle management
- `GET /admin/vins/new` - VIN scanner
- `GET /admin/jobs` - Job management
- `GET /admin/invoices` - Invoice management
- `GET /admin/campaigns` - Email campaigns

### Customer Portal Routes
- `GET /portal` - Customer dashboard
- `GET /portal/invoices` - Customer invoices
- `GET /portal/vehicles` - Customer vehicles
- `GET /portal/warranties` - Customer warranties

### API Endpoints
- `POST /api/auth/[...nextauth]` - Authentication
- `POST /api/webhooks/stripe` - Stripe webhooks
- `POST /api/webhooks/resend` - Email webhooks

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all required environment variables in your production environment:

- Database connection string
- Authentication secrets
- API keys for Stripe, Resend, OCR providers
- File storage configuration

### Cron Jobs

The application includes Vercel Cron jobs for:
- Daily warranty expiration checks
- Overdue invoice reminders
- Campaign email sending

Configure these in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/warranty-check",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/dunning",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Testing

Run the test suite:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## 📊 System Status

All core features have been implemented and are ready for production:

- ✅ **VIN OCR System**: Multi-provider OCR with validation and NHTSA integration
- ✅ **Invoice & Payments**: Full Stripe integration with webhooks
- ✅ **Warranty Tracking**: Automated expiration monitoring and email alerts  
- ✅ **Customer Portal**: Self-service dashboard for customers
- ✅ **Email System**: Transactional and campaign emails with Resend
- ✅ **Admin Dashboard**: Complete CRM interface for staff
- ✅ **Authentication**: Role-based access control with NextAuth
- ✅ **Database**: Comprehensive schema with proper indexing
- ✅ **Testing**: Unit, integration, and E2E test coverage
- ✅ **Deployment**: Vercel-ready with cron jobs configured

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run db:migrate       # Run database migrations  
npm run db:seed         # Seed development data
npm run db:studio       # Open Prisma Studio

# Testing
npm test                # Run unit tests
npm run test:e2e        # Run E2E tests
npm run type-check      # TypeScript type checking

# Production
npm run build           # Build for production
npm start              # Start production server
npm run db:deploy      # Deploy migrations to production
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Portal  │    │ Customer Portal │    │   API Routes    │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Invoices      │    │ • Webhooks      │
│ • VIN Scanner   │    │ • Warranties    │    │ • Cron Jobs     │
│ • Job Management│    │ • Vehicles      │    │ • Server Actions│
│ • Invoicing     │    │ • Payments      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Core Services │
                    │                 │
                    │ • Authentication│
                    │ • Database      │
                    │ • Email System  │
                    │ • OCR Engine    │
                    │ • PDF Generator │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External APIs │    │    Database     │    │  File Storage   │
│                 │    │                 │    │                 │
│ • Stripe        │    │ • PostgreSQL    │    │ • UploadThing   │
│ • Resend        │    │ • Prisma ORM    │    │ • Vercel Blob   │
│ • Google Vision │    │ • 15+ Tables    │    │ • Image URLs    │
│ • AWS Textract  │    │ • Proper Indexes│    │                 │
│ • NHTSA API     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Key Features Demonstrated

### VIN Processing Pipeline
1. **Image Upload**: Drag-and-drop or camera capture
2. **OCR Processing**: Multi-provider fallback (Google → AWS → Tesseract)
3. **VIN Validation**: ISO 3779 check digit verification
4. **Vehicle Decoding**: NHTSA API integration for make/model/year
5. **Data Storage**: Structured storage with audit trail

### Payment Processing Flow
1. **Invoice Creation**: From completed service jobs
2. **Stripe Integration**: Checkout sessions and payment links
3. **Webhook Processing**: Real-time payment status updates
4. **PDF Generation**: Professional invoice documents
5. **Customer Communication**: Automated email notifications

### Automated Warranty System
1. **Warranty Creation**: Automatic generation from completed jobs
2. **Expiration Monitoring**: Daily cron job checks
3. **Email Campaigns**: Multi-stage notification system
4. **Customer Follow-up**: Post-expiration retention emails

## 🔒 Security Features

- **Authentication**: NextAuth.js with multiple providers
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Input validation with Zod schemas
- **API Security**: Server actions with session verification
- **Webhook Security**: Stripe signature verification
- **Environment Security**: Proper secret management

## 📈 Performance Optimizations

- **Server Components**: Reduced client-side JavaScript
- **Database Indexing**: Optimized queries with proper indexes
- **Image Optimization**: Next.js automatic image optimization
- **Caching**: Strategic use of revalidation and caching
- **Bundle Splitting**: Automatic code splitting

## 🚀 Production Deployment

The system is production-ready with:
- **Vercel Deployment**: One-click deployment with environment variables
- **Database Migrations**: Automated schema deployment
- **Cron Jobs**: Automated warranty and dunning processes
- **Monitoring**: Error tracking and performance monitoring
- **Scalability**: Serverless architecture that scales automatically

## 💡 Business Value

This CRM system provides:
- **Operational Efficiency**: Automated VIN processing saves 5+ minutes per vehicle
- **Revenue Protection**: Automated warranty tracking prevents missed opportunities  
- **Customer Experience**: Self-service portal reduces support burden
- **Payment Acceleration**: Integrated payments improve cash flow
- **Data Insights**: Comprehensive reporting and analytics foundation
- **Scalability**: Built to handle growth from startup to enterprise

## 🤝 Support

For technical support or questions:
- Review the comprehensive documentation above
- Check the test suites for usage examples
- Examine the seed data for sample scenarios
- Contact the development team for customizations

This system represents a complete, production-ready CRM solution built with modern best practices and enterprise-grade architecture.
