# Production Deployment Guide

## Architecture
- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway (Node.js + Express)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Payments**: Mercado Pago

---

## 🚀 Railway (Backend) Setup

### 1. Create Railway Project
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli
railway login
railway init
```

### 2. Configure Environment Variables in Railway Dashboard

Add these in Railway → Variables:

```env
# Supabase
SUPABASE_URL=https://ytafvpwmrdfbjesecbcv.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
MP_WEBHOOK_SERVICE_ROLE_KEY=your_service_role_key_here

# Mercado Pago
MP_ACCESS_TOKEN=your_production_access_token
MP_WEBHOOK_SECRET=your_webhook_secret_here

# Guest User
GUEST_USER_ID=your_guest_uuid
GUEST_EMAIL=guest@dhimm.local

# Port (Railway auto-assigns)
PORT=3001
```

### 3. Deploy Backend
```bash
git push railway main
```

### 4. Get Railway Backend URL
- Copy your Railway app URL (e.g., `https://dhimm-backend.up.railway.app`)
- Update webhook URL in Mercado Pago dashboard: `https://your-railway-url.railway.app/api/mp/webhook`

---

## 🌐 Vercel (Frontend) Setup

### 1. Connect GitHub Repository
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

### 2. Configure Environment Variables in Vercel Dashboard

Add these in Vercel → Settings → Environment Variables:

```env
# Supabase
VITE_SUPABASE_URL=https://ytafvpwmrdfbjesecbcv.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Mercado Pago
VITE_MP_PUBLIC_KEY=your_mp_public_key
VITE_MP_ACCESS_TOKEN=your_mp_access_token

# Backend URL (Railway)
VITE_BACKEND_URL=https://your-railway-url.railway.app

# Webhook URL (Railway)
VITE_MP_WEBHOOK_URL=https://your-railway-url.railway.app/api/mp/webhook

# EmailJS
VITE_EMAILJS_SERVICE_ID=service_qx0z97v
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

### 3. Deploy
```bash
git push origin main
# Vercel auto-deploys on push
```

---

## 📋 Pre-Deployment Checklist

### Backend (Railway)
- [ ] Remove all `console.log` statements (or use production logger)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for Vercel domain
- [ ] Test webhook signature validation
- [ ] Verify Supabase service role key works
- [ ] Test image upload endpoint

### Frontend (Vercel)
- [ ] Remove debug console.logs
- [ ] Update `VITE_BACKEND_URL` to Railway URL
- [ ] Test payment flow end-to-end
- [ ] Verify email sending works
- [ ] Test stock reduction after payment
- [ ] Check mobile responsiveness

### Database (Supabase)
- [ ] Run all migrations from `DATABASE_MIGRATION.md`
- [ ] Verify RLS policies are active
- [ ] Create product-images bucket (public)
- [ ] Test admin role assignment

### Mercado Pago
- [ ] Switch to PRODUCTION credentials (not TEST)
- [ ] Update webhook URL to Railway backend
- [ ] Test payment with real card (small amount)
- [ ] Verify webhook signature works

---

## 🔄 Git Workflow

```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit
git commit -m "Production ready: cleaned code, configured deployment"

# 4. Push to GitHub (triggers Vercel deployment)
git push origin main

# 5. Push to Railway (if using Railway CLI)
railway up
```

---

## 🐛 Troubleshooting

### Backend Issues
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Test endpoints with Postman/curl

### Frontend Issues
- Check Vercel deployment logs
- Verify environment variables in Vercel dashboard
- Test API calls to Railway backend

### Payment Issues
- Check Mercado Pago webhook logs
- Verify webhook secret matches
- Check Railway backend logs for webhook requests

---

## 📊 Monitoring

### Backend (Railway)
```bash
# View logs
railway logs

# Check status
railway status
```

### Frontend (Vercel)
- Check Vercel dashboard for deployment status
- View function logs in Vercel

### Database (Supabase)
- Monitor query performance in Supabase dashboard
- Check table activity logs
- Monitor storage usage

---

## 🔐 Security Notes

1. **Never commit `.env.local` to Git** - already in .gitignore
2. **Use PRODUCTION Mercado Pago credentials** for live payments
3. **Enable webhook signature validation** in production
4. **Keep service role keys secure** - only in backend env vars
5. **Enable RLS policies** on all Supabase tables
6. **Use HTTPS** for all API endpoints (Railway/Vercel auto-provide)

---

## 📝 Post-Deployment

1. Test complete purchase flow
2. Verify email confirmations arrive
3. Check stock reduction works
4. Test admin panel (create/edit/delete products)
5. Monitor error logs for first 24 hours
