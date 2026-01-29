# ✅ Production Deployment Checklist

Use this before pushing to production.

## 🔧 Configuration

### Railway (Backend) Environment Variables
```
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY  
✅ MP_WEBHOOK_SERVICE_ROLE_KEY
✅ MP_ACCESS_TOKEN (PRODUCTION - not TEST)
✅ MP_WEBHOOK_SECRET
✅ GUEST_USER_ID
✅ GUEST_EMAIL
```

### Vercel (Frontend) Environment Variables
```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
✅ VITE_MP_PUBLIC_KEY (PRODUCTION - not TEST)
✅ VITE_MP_ACCESS_TOKEN (PRODUCTION - not TEST)
✅ VITE_BACKEND_URL (Railway URL)
✅ VITE_MP_WEBHOOK_URL (Railway webhook endpoint)
✅ VITE_EMAILJS_SERVICE_ID
✅ VITE_EMAILJS_TEMPLATE_ID
✅ VITE_EMAILJS_PUBLIC_KEY
```

## 🗄️ Database

```
✅ All migrations from DATABASE_MIGRATION.md applied
✅ RLS policies enabled
✅ product-images bucket created (public)
✅ Admin user role assigned
✅ Guest user/profile created
```

## 💳 Mercado Pago

```
✅ Production credentials configured (not TEST)
✅ Webhook URL updated: https://your-railway-url.railway.app/api/mp/webhook
✅ Webhook signature validation enabled
✅ Test payment with real card (small amount)
```

## 📧 EmailJS

```
✅ Template created with correct variables
✅ Service ID configured
✅ Public key added
✅ Email sending tested
```

## 🚀 Deployment

```
✅ Git repository clean (no uncommitted changes)
✅ .env.local NOT committed (in .gitignore)
✅ Build succeeds locally (npm run build)
✅ Backend starts without errors (npm start)
```

## 🧪 Testing (Post-Deploy)

```
✅ Complete purchase flow works
✅ Payment webhook receives and processes correctly
✅ Stock reduces after successful payment
✅ Email confirmation sends
✅ Order appears in user dashboard
✅ Admin can create/edit/delete products
✅ Image upload works
✅ Mobile responsive
```

## 🔐 Security

```
✅ All production credentials secured
✅ Service role key only in backend
✅ RLS enabled on all tables
✅ HTTPS enforced (auto by Railway/Vercel)
✅ CORS configured for production domains
```

---

## 🚢 Deploy Commands

```bash
# 1. Commit changes
git add .
git commit -m "Production ready"

# 2. Push to GitHub (triggers Vercel)
git push origin main

# 3. Backend deploys to Railway automatically on push
# or manually: railway up
```

## 📊 Monitoring

- **Railway**: railway logs
- **Vercel**: Check deployment logs in dashboard
- **Supabase**: Monitor query performance
- **Mercado Pago**: Check webhook delivery logs

---

**Ready?** See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step guide.
