# 🚀 ClearView Pro CRM - Vercel Deployment Guide

This guide will walk you through deploying the ClearView Pro CRM to your Vercel account.

## Prerequisites

Before deploying, ensure you have:
- [ ] Vercel account (free tier works for development)
- [ ] PostgreSQL database (Neon, Vercel Postgres, or other)
- [ ] Stripe account (test mode for development)
- [ ] Resend account for email
- [ ] Google Cloud account (for OCR) or use Tesseract fallback

## Step 1: Database Setup

### Option A: Neon (Recommended)
1. Go to [Neon.tech](https://neon.tech) and create a free account
2. Create a new project called "clearview-pro-crm"
3. Copy the connection string (starts with `postgresql://`)

### Option B: Vercel Postgres
1. In your Vercel dashboard, go to Storage
2. Create a new Postgres database
3. Copy the connection string

### Option C: Other PostgreSQL Provider
Use any PostgreSQL provider (Railway, Supabase, etc.) and get the connection string.

## Step 2: External Service Setup

### Stripe Setup
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your **Publishable Key** and **Secret Key** from API Keys
3. Set up a webhook endpoint (we'll configure this after deployment):
   - URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events to select:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the webhook secret

### Resend Setup
1. Go to [Resend](https://resend.com) and create an account
2. Create an API key
3. Verify your domain (or use the default for testing)

### OCR Setup (Optional - Tesseract fallback works)
#### Google Vision API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Vision API
4. Create a service account key
5. Download the JSON credentials

#### AWS Textract (Alternative)
1. Go to AWS Console
2. Create IAM user with Textract permissions
3. Get Access Key ID and Secret Access Key

## Step 3: Deploy to Vercel

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   cd /Users/jeshualeger/Sites/clear-view-pro-crm
   git init
   git add .
   git commit -m "Initial commit: ClearView Pro CRM"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/clear-view-pro-crm.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project settings:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: `npm run build`
     - Output Directory: .next
     - Install Command: `npm install`

### Method 2: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy:**
   ```bash
   cd /Users/jeshualeger/Sites/clear-view-pro-crm
   vercel login
   vercel --prod
   ```

## Step 4: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-32-character-random-string"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Email
RESEND_API_KEY="re_your_resend_api_key"

# OCR (choose one)
OCR_PROVIDER="tesseract"  # or "google" or "aws"

# For Google Vision (if using)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'

# For AWS Textract (if using)
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_TEXTRACT_REGION="us-east-1"

# External APIs
NHTSA_API_BASE="https://vpic.nhtsa.dot.gov/api"

# File Storage (UploadThing - create account at uploadthing.com)
UPLOADTHING_SECRET="sk_live_your_uploadthing_secret"
UPLOADTHING_APP_ID="your_uploadthing_app_id"

# Cron Jobs Security
CRON_SECRET="your-random-cron-secret-32-chars"

# Company Info
COMPANY_NAME="ClearView Pro"
COMPANY_EMAIL="info@clearviewpro.com"
COMPANY_PHONE="(555) 123-4567"

# Optional
SENTRY_DSN="your_sentry_dsn"
SENTRY_ENABLED="false"
```

### How to Generate Secrets
```bash
# Generate NEXTAUTH_SECRET and CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Database Migration

After deployment, run the database migrations:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Run migrations:**
   ```bash
   vercel env pull .env.local  # Pull environment variables
   npm run db:deploy          # Deploy migrations
   npm run db:seed           # Seed with sample data
   ```

   Or use the Vercel dashboard to run these commands in the Functions tab.

## Step 6: Configure Webhooks

### Stripe Webhook
1. Go to your Stripe Dashboard → Webhooks
2. Update the webhook URL to: `https://your-app.vercel.app/api/webhooks/stripe`
3. Ensure these events are selected:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Cron Jobs
The cron jobs are automatically configured in `vercel.json`:
- Warranty checks: Daily at 9 AM UTC
- Dunning emails: Daily at 8 AM UTC

## Step 7: Test the Deployment

1. **Visit your app**: `https://your-app.vercel.app`
2. **Test authentication**: Try signing in with email
3. **Test VIN scanner**: Upload a VIN image
4. **Test admin functions**: Create customers, jobs, invoices
5. **Test webhooks**: Make a test payment in Stripe

### Default Login Accounts (from seed data)
- Admin: `admin@clearviewpro.com`
- Tech: `tech@clearviewpro.com`

Use the magic link authentication or set up Google OAuth.

## Step 8: Production Checklist

Before going live:

- [ ] Set up custom domain in Vercel
- [ ] Switch Stripe to live mode
- [ ] Configure production email templates
- [ ] Set up monitoring (Sentry)
- [ ] Test all critical workflows
- [ ] Set up backup strategy for database
- [ ] Configure proper CORS settings
- [ ] Review and update company information
- [ ] Test mobile responsiveness
- [ ] Verify all cron jobs are working

## Troubleshooting

### Common Issues

1. **Build Errors:**
   - Check that all dependencies are in `package.json`
   - Ensure TypeScript types are correct
   - Verify environment variables are set

2. **Database Connection:**
   - Verify DATABASE_URL is correct
   - Check if database allows external connections
   - Ensure migrations have been run

3. **Webhook Issues:**
   - Verify webhook URL is accessible
   - Check STRIPE_WEBHOOK_SECRET is correct
   - Monitor webhook logs in Stripe dashboard

4. **OCR Not Working:**
   - Start with `OCR_PROVIDER="tesseract"` for testing
   - Verify Google/AWS credentials if using cloud OCR
   - Check image upload functionality first

5. **Email Issues:**
   - Verify RESEND_API_KEY is correct
   - Check domain verification in Resend
   - Test with simple transactional emails first

### Logs and Monitoring

- **Vercel Logs**: Check the Functions tab in Vercel dashboard
- **Database Logs**: Monitor your database provider's logs
- **Stripe Logs**: Use Stripe dashboard for webhook logs
- **Email Logs**: Check Resend dashboard for delivery status

## Support

If you encounter issues:
1. Check the logs in Vercel dashboard
2. Verify all environment variables are set correctly
3. Test individual components (auth, database, webhooks) separately
4. Review the troubleshooting section above

## Next Steps

Once deployed successfully:
1. Customize the branding and company information
2. Set up your team with appropriate roles
3. Import your existing customer data
4. Configure email templates for your brand
5. Set up analytics and monitoring
6. Plan for scaling and additional features

Your ClearView Pro CRM is now ready for production use! 🎉
