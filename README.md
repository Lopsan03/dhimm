# DHIMM - E-commerce Store

Online store for DHIMM automotive parts with Mercado Pago payment integration.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **Payments**: Mercado Pago
- **Deployment**: Vercel (frontend) + Backend server

## Local Development

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Mercado Pago account (TEST or PROD credentials)
- Cloudflare tunnel for webhook testing (or ngrok alternative)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd DHIMM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `VITE_MP_PUBLIC_KEY`: Mercado Pago public key (TEST or PROD)
   - `VITE_MP_ACCESS_TOKEN`: Mercado Pago access token
   - `MP_WEBHOOK_SECRET`: Mercado Pago webhook secret (from MP dashboard)
   - `MP_WEBHOOK_SERVICE_ROLE_KEY`: Supabase service role key (for webhook operations)
   - `VITE_BACKEND_URL`: Backend API URL (http://localhost:3001 for local)

4. **Run development servers**
   
   Terminal 1 - Frontend:
   ```bash
   npm run dev
   ```
   
   Terminal 2 - Backend:
   ```bash
   node server.js
   ```
   
   Terminal 3 - Cloudflare tunnel (for webhooks):
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```

## Production Deployment to Vercel

### Frontend Deployment

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Import project to Vercel**
   - Go to https://vercel.com and click "Import Project"
   - Select your GitHub repository
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Configure environment variables in Vercel**
   
   Go to Project Settings → Environment Variables and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MP_PUBLIC_KEY`
   - `VITE_MP_ACCESS_TOKEN`
   - `VITE_BACKEND_URL` (your production backend URL)

4. **Deploy**
   - Vercel will automatically deploy on push to main branch

### Backend Deployment

#### Option 1: Railway.app (Recommended) ⭐

1. **Create Railway account**
   - Go to https://railway.app and sign up
   - Connect your GitHub account

2. **Create new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your DHIMM repository
   - Choose the main branch

3. **Configure Railway**
   - Railway auto-detects Node.js and installs dependencies
   - Click on your service to open settings
   - Go to "Settings" tab and set Start Command:
     ```
     node server.js
     ```

4. **Add environment variables**
   - In Railway dashboard, go to "Variables" tab
   - Add all backend variables:
     ```
     MP_WEBHOOK_SECRET=your_mp_webhook_secret
     MP_WEBHOOK_SERVICE_ROLE_KEY=your_supabase_service_role_key
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your_anon_key
     MP_ACCESS_TOKEN=TEST-your_mp_access_token
     MP_WEBHOOK_SERVICE_ROLE_KEY=your_service_role_key
     GUEST_EMAIL=guest@dhimm.local
     PORT=3001
     ```

5. **Get your Railway URL**
   - After deployment, Railway gives you a public URL
   - You'll see it in the "Deployments" tab or as `https://your-app.railway.app`
   - Use this as `VITE_BACKEND_URL` in Vercel

6. **Update Vercel with backend URL**
   - Go to Vercel dashboard
   - Update `VITE_BACKEND_URL` to `https://your-app.railway.app`
   - Redeploy frontend

7. **Configure Mercado Pago webhook**
   - Go to MP dashboard → Webhooks
   - Add URL: `https://your-app.railway.app/api/mp/webhook`
   - Select events: payment, merchant_order

**Benefits:**
- Free tier available
- No code changes needed
- Auto-deploys on git push
- Perfect for Express servers

#### Option 2: Heroku

1. **Create Heroku account**
   - Go to https://heroku.com and sign up

2. **Install Heroku CLI**
   ```bash
   # Windows
   npm install -g heroku
   ```

3. **Login and create app**
   ```bash
   heroku login
   heroku create your-app-name
   ```

4. **Add Procfile** to project root:
   ```
   web: node server.js
   ```

5. **Set environment variables**
   ```bash
   heroku config:set MP_WEBHOOK_SECRET=your_secret
   heroku config:set MP_WEBHOOK_SERVICE_ROLE_KEY=your_key
   # ... add all other variables
   ```

6. **Deploy**
   ```bash
   git push heroku main
   ```

7. **Get your URL**
   ```bash
   heroku open
   # Your app is at https://your-app-name.herokuapp.com
   ```

#### Option 3: Traditional VPS/Server

For complete control, deploy to a Linux server:

1. SSH into your server
2. Install Node.js 18+
3. Clone your repository
4. Install dependencies: `npm install`
5. Set environment variables in `.env` file
6. Install PM2: `npm install -g pm2`
7. Start server: `pm2 start server.js`
8. Set up SSL with Certbot
9. Configure nginx reverse proxy
10. Point domain to your server

**Not recommended** unless you need full control or have existing server infrastructure.

### Mercado Pago Webhook Configuration

1. Go to your Mercado Pago dashboard
2. Navigate to Webhooks settings
3. Add webhook URL: `https://your-backend-domain.com/api/mp/webhook`
4. Select events: `payment` and `merchant_order`

### Security Checklist

- ✅ `.env.local` is in `.gitignore`
- ✅ No hardcoded credentials in source code
- ✅ Service role key only used server-side
- ✅ CORS configured properly in server.js
- ✅ RLS policies enabled in Supabase

## Environment Variables Reference

### Frontend (VITE_* prefix)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (safe for frontend)
- `VITE_MP_PUBLIC_KEY` - Mercado Pago public key
- `VITE_MP_ACCESS_TOKEN` - Mercado Pago access token
- `VITE_BACKEND_URL` - Backend API URL

### Backend (server.js)
- `MP_WEBHOOK_SECRET` - Mercado Pago webhook secret
- `MP_WEBHOOK_SERVICE_ROLE_KEY` - Supabase service role key
- `GUEST_EMAIL` - Guest user email (default: guest@dhimm.local)
- `PORT` - Server port (default: 3001)

## License

Private - All Rights Reserved## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
