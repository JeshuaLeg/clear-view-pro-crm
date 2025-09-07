# 🚀 Quick Deploy to Vercel

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJeshuaLeg%2Fclear-view-pro-crm&env=DATABASE_URL,NEXTAUTH_SECRET,NEXTAUTH_URL,RESEND_API_KEY,STRIPE_SECRET_KEY,STRIPE_PUBLISHABLE_KEY,STRIPE_WEBHOOK_SECRET,OCR_PROVIDER&envDescription=Environment%20variables%20needed%20for%20ClearView%20Pro%20CRM&envLink=https%3A%2F%2Fgithub.com%2FJeshuaLeg%2Fclear-view-pro-crm%2Fblob%2Fmain%2Fenv.example&project-name=clear-view-pro-crm&repository-name=clear-view-pro-crm)

## 5-Minute Setup

### 1. 📊 Set up Database (2 minutes)
- Go to [neon.tech](https://neon.tech)
- Create free account
- Create new project: `clear-view-pro-crm`
- Copy connection string

### 2. 📧 Set up Email (1 minute)
- Go to [resend.com](https://resend.com)
- Create free account (3,000 emails/month)
- Create API key
- Copy API key

### 3. 💳 Set up Payments (2 minutes)
- Go to [stripe.com](https://stripe.com)
- Create account
- Get test API keys from Dashboard > Developers > API keys
- Copy Publishable and Secret keys

### 4. 🚀 Deploy
Click the deploy button above and paste your keys when prompted:

```bash
DATABASE_URL=postgresql://your-neon-connection-string
NEXTAUTH_SECRET=generate-random-32-chars
NEXTAUTH_URL=https://your-app.vercel.app
RESEND_API_KEY=re_your-resend-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-public
STRIPE_WEBHOOK_SECRET=whsec_leave-blank-for-now
OCR_PROVIDER=tesseract
```

### 5. 🎯 After Deploy
1. Run database setup: `npm run db:migrate && npm run db:seed`
2. Login with: `admin@clearviewpro.com` or `tech@clearviewpro.com`
3. Configure Stripe webhooks to point to your app

## Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Default Login
- **Admin**: `admin@clearviewpro.com`
- **Tech**: `tech@clearviewpro.com`

Use magic link authentication (check your email).

## Need Help?
- Full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Issues: Create an issue on GitHub
- Email: Contact via the repository
