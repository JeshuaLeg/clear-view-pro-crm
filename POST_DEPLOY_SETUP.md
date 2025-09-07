# 🚀 Post-Deployment Setup

After your ClearView Pro CRM has been deployed to Vercel, follow these steps to complete the setup:

## 1. 🗄️ Database Setup

Your database needs to be initialized with the schema and seed data.

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link to your project**:
   ```bash
   vercel link
   ```

4. **Run database migrations**:
   ```bash
   vercel env pull .env.local
   npm run db:deploy
   npm run db:seed
   ```

### Option B: Using Vercel Dashboard

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Functions** tab
3. Create a new serverless function to run the setup:

Create this temporary function at `api/setup.js`:
```javascript
import { exec } from 'child_process';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Run database setup
  exec('npx prisma migrate deploy && npx prisma db seed', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, stderr });
    }
    res.status(200).json({ success: true, stdout });
  });
}
```

Then call: `POST https://your-app.vercel.app/api/setup`

### Option C: Manual Database Setup

If you have direct database access:

1. **Connect to your database** (Neon, Vercel Postgres, etc.)
2. **Run the SQL migrations** manually
3. **Insert seed data** from `prisma/seed.ts`

## 2. 🔗 Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Webhooks
2. **Add endpoint**: `https://your-app.vercel.app/api/webhooks/stripe`
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Copy the webhook secret** and update your `STRIPE_WEBHOOK_SECRET` environment variable

## 3. ✅ Test Your Deployment

1. **Visit your app**: `https://your-app.vercel.app`
2. **Test sign in**: Try the magic link authentication
3. **Default accounts** (after seeding):
   - Admin: `admin@clearviewpro.com`
   - Tech: `tech@clearviewpro.com`

## 4. 🎯 Verify Core Features

- [ ] **Authentication**: Sign in with email magic link
- [ ] **Dashboard**: View KPIs and recent activity
- [ ] **VIN Scanner**: Upload an image and test OCR
- [ ] **Customer Management**: Create a test customer
- [ ] **Invoice System**: Create and send a test invoice
- [ ] **Email System**: Check that emails are being sent
- [ ] **Webhooks**: Test a Stripe payment

## 5. 🔧 Environment Variables Check

Make sure these are set in your Vercel project:

### Required:
- ✅ `DATABASE_URL` - Your PostgreSQL connection string
- ✅ `NEXTAUTH_SECRET` - Random 32-character string
- ✅ `NEXTAUTH_URL` - Your Vercel app URL
- ✅ `RESEND_API_KEY` - For email functionality
- ✅ `STRIPE_SECRET_KEY` - Stripe secret key
- ✅ `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- ✅ `OCR_PROVIDER=tesseract` - OCR provider

### Optional but Recommended:
- `STRIPE_WEBHOOK_SECRET` - After setting up webhooks
- `CRON_SECRET` - For securing cron job endpoints
- `COMPANY_NAME`, `COMPANY_EMAIL`, `COMPANY_PHONE` - Your business info

## 6. 🚨 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if your database allows external connections
- Ensure the database exists and is accessible

### Email Not Working
- Verify `RESEND_API_KEY` is correct
- Check domain verification in Resend dashboard
- Look at Vercel function logs for email errors

### Payment Issues
- Ensure Stripe keys are for the correct environment (test/live)
- Verify webhook endpoint is accessible
- Check Stripe webhook logs for delivery issues

### OCR Not Working
- Start with `OCR_PROVIDER=tesseract` (no setup required)
- For Google/AWS OCR, verify credentials are correct
- Check function logs for OCR processing errors

## 7. 🎉 You're Ready!

Once everything is working:

1. **Customize branding** - Update company information
2. **Import data** - Add your real customers and vehicles  
3. **Train your team** - Set up user accounts with appropriate roles
4. **Go live** - Switch Stripe to live mode when ready

## Support

If you encounter issues:
- Check Vercel function logs in your dashboard
- Review the main [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Verify all environment variables are set correctly

Your ClearView Pro CRM is now fully deployed and ready for business! 🚀
