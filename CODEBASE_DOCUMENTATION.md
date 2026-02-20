# DHIMM Codebase Documentation

## 1) Project overview

**DHIMM** is a full-stack e-commerce platform for automotive parts (mainly steering racks, hydraulic pumps, and related components), built for **Dhimma Automotriz**.

It provides:
- Public storefront (home, catalog, product detail, about)
- Cart and checkout flow
- Mercado Pago payment processing
- Customer authentication and profile/address management
- Customer order tracking dashboard
- Admin panel for products and orders
- Backend API for products, orders, webhook handling, and media uploads

Primary business goal: sell automotive parts online with secure payment and operational order management.

---

## 2) Tech stack

### Frontend
- React 19 + TypeScript
- React Router (HashRouter)
- Vite
- Tailwind utility classes + custom CSS
- Font Awesome icons

### Backend
- Node.js + Express
- Supabase JS client
- Multer (image uploads)
- CORS + dotenv

### External services
- Supabase (Auth, PostgreSQL tables, Storage)
- Mercado Pago (checkout + webhook status updates)
- EmailJS (order confirmation email on checkout success page)

---

## 3) High-level architecture

### App shell
`App.tsx` is the central orchestrator:
- Restores user state from localStorage (`dhimma_user`)
- Loads products from backend (`/api/products`)
- Loads orders depending on role:
  - user -> `/api/user-orders/:userId`
  - admin -> `/api/all-orders`
- Keeps cart in memory
- Handles route protection:
  - `/dashboard/*` requires logged-in user
  - `/admin/*` requires `user.role === 'admin'`
- Bridges frontend events to backend mutations:
  - product CRUD
  - order status updates
  - user address updates
  - product image uploads

### Routing model
Uses `HashRouter` with key routes:
- `/` Home
- `/catalog` Catalog
- `/about` About Us
- `/product/:id` Product detail
- `/cart` Cart
- `/checkout` Checkout
- `/checkout/waiting/:orderId`
- `/checkout/success`
- `/checkout/failure`
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/dashboard/*` User dashboard
- `/admin/*` Admin panel

### Data source strategy
- Most reads/writes are proxied through backend endpoints to bypass Supabase RLS friction.
- Frontend still uses Supabase Auth directly for login/register/password reset.

---

## 4) Domain models

Defined in `types.ts`:
- `User`: id, name, email, role (`user | admin`), addresses[]
- `Product`: id, name, category, brand, compatibleModels[], price, stock, image, description
- `CartItem`: Product + quantity
- `Order`: id, user info, items, total, status, date, shippingAddress + optional payment tracking fields

Order statuses in usage are mixed-language/case, so app normalizes statuses in `App.tsx` (`normalizeStatus`).

---

## 5) Frontend functionality by area

## 5.1 Shared components
- **Header**: desktop/mobile navigation, cart badge, profile menu, login/logout/admin/user shortcuts.
- **MobileBottomNav**: mobile quick nav (home/catalog/cart/dashboard).
- **WhatsAppButton**: floating action button linking to WhatsApp contact.
- **ProductCard**: catalog card with stock badge, out-of-stock overlay, add-to-cart animation.
- **CustomDropdown**: reusable dropdown with outside-click close and optional placeholders.
- **Footer**: company info, navigation, contact, social links.

## 5.2 Public pages
- **Home**:
  - Hero section + contact CTA
  - Benefits section
  - Featured products (first 4)
  - Company/about teaser block
- **Catalog**:
  - Search by product name, brand, compatibility
  - Filter by brand and category
  - Reset filters
- **ProductDetail**:
  - Product hero with buy/add actions
  - Technical details and compatibility list
  - Related products carousel
- **AboutUs**:
  - Team image carousel (auto-rotate and manual controls)
  - Mission, vision, values, customer message

## 5.3 Cart and checkout
- **Cart**:
  - Quantity controls constrained by stock
  - Remove item
  - Shipping rule: free above 5000 MXN, otherwise 250 MXN
  - Order summary and checkout entry

- **Checkout** (`pages/Checkout.tsx`):
  - 3-step UI (delivery data -> payment -> confirmation view)
  - Delivery methods:
    - Shipping
    - Pickup (Monterrey / Mérida options)
  - Logged-in users can reuse saved addresses
  - Validation of required fields before payment
  - Creates a pending order record in backend memory (`/api/pending-orders/:orderId`)
  - Creates Mercado Pago preference and opens popup checkout
  - On popup close, redirects to waiting page

- **CheckoutWaiting**:
  - Polls `/api/orders/:orderId` every 5s (max ~5 min)
  - Interprets pending/approved/rejected statuses
  - Redirects to success/failure routes accordingly

- **CheckoutSuccess**:
  - Reads order from navigation state
  - Sets `sessionStorage.refreshProducts = true` so stock refreshes in `App.tsx`
  - Sends confirmation email via EmailJS (if configured)

- **CheckoutFailure**:
  - Retry payment or return to catalog

## 5.4 Authentication
- **Login**:
  - Supabase password sign-in
  - Extra auth-state fallback race to avoid hung sign-in UX
  - Fetches profile from backend endpoint `/api/user-profile/:userId`
  - Stores user in localStorage and routes by role
- **Register**:
  - Supabase sign-up + profile upsert in `profiles` table
- **ForgotPassword**:
  - Sends reset link via Supabase with hash-route redirect
- **ResetPassword**:
  - Handles token parsing from URL/hash
  - Sets recovery session and updates password

## 5.5 User dashboard
`pages/UserDashboard.tsx` provides nested routes:
- `/dashboard` -> active orders
- `/dashboard/history` -> completed orders
- `/dashboard/addresses` -> address CRUD (local state + backend persistence via parent callback)

Addresses are stored as formatted strings with optional labels.

## 5.6 Admin panel
`pages/AdminPanel.tsx`:
- Tabbed operations: inventory and orders
- Product inventory:
  - View/filter by category
  - Create product (with image upload)
  - Edit product (including image replacement)
  - Delete product
- Order management:
  - Filter by order status
  - Update status through dropdown
  - Open full order details modal
- KPI cards: revenue, pending count, product count, total orders

---

## 6) Backend API behavior (`server.js`)

## 6.1 Core runtime
- Express app with JSON + urlencoded parsing
- CORS enabled
- Optional raw body capture for webhook signature validation
- Supabase clients:
  - `supabase` (anon key)
  - `supabaseAdmin` (service role, if `MP_WEBHOOK_SERVICE_ROLE_KEY` exists)

## 6.2 Startup behavior
- Validates Supabase env vars on startup
- Attempts to ensure a guest auth user/profile for guest checkout linkage (`ensureGuestIdentity`)

## 6.3 Public/system endpoints
- `GET /api/health`
- `GET /api/mp/payment-methods` (diagnostic)
- `GET /api/mp/preferences/:preferenceId` (diagnostic)

## 6.4 Checkout/order endpoints
- `POST /api/pending-orders/:orderId`
  - stores pending order data in memory map (10-minute TTL)
- `GET /api/orders/:orderId`
- `GET /api/user-orders/:userId`
- `GET /api/all-orders`
- `PUT /api/orders/:id` (admin status update)

## 6.5 Product endpoints
- `GET /api/products`
- `POST /api/products` (service role required)
- `PUT /api/products/:id` (service role required)
- `DELETE /api/products/:id` (service role required)
- `POST /api/uploads/product-image` (service role required)
  - uploads to Supabase Storage bucket `product-images`

## 6.6 User profile endpoints
- `GET /api/user-profile/:userId`
- `PUT /api/user-addresses/:userId`

## 6.7 Mercado Pago webhook (`POST /api/mp/webhook`)
Production-oriented flow:
1. Validate signature (skippable in TEST mode or if explicitly allowed)
2. Extract payment id and topic
3. Fetch payment from Mercado Pago API with retry
4. Validate data (external reference UUID, currency)
5. Validate amount vs pending-order total (with tolerance)
6. Enforce idempotency checks
7. Create/update order in Supabase with payment metadata
8. Reduce stock on paid transition
9. Cleanup pending-order cache

Includes structured logging via `PaymentLogger`.

---

## 7) Payment flow end-to-end

1. User clicks pay in checkout.
2. Frontend stores pending order data and creates Mercado Pago preference.
3. User pays in MP popup.
4. MP sends webhook to backend.
5. Backend validates webhook and payment integrity.
6. Backend creates/updates order and stock.
7. Waiting page polls until order status becomes success/failure.
8. Success page confirms order and optionally emails receipt.

---

## 8) Environment variables

From `.env.example` and code usage:

### Frontend (`VITE_*`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MP_PUBLIC_KEY`
- `VITE_MP_ACCESS_TOKEN`
- `VITE_MP_WEBHOOK_URL`
- `VITE_BACKEND_URL`
- `VITE_EMAILJS_SERVICE_ID` (optional)
- `VITE_EMAILJS_TEMPLATE_ID` (optional)
- `VITE_EMAILJS_PUBLIC_KEY` (optional)

### Backend
- `SUPABASE_URL` (or fallback `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (or fallback `VITE_SUPABASE_ANON_KEY`)
- `MP_ACCESS_TOKEN` (or fallback `VITE_MP_ACCESS_TOKEN`)
- `MP_WEBHOOK_SECRET`
- `MP_WEBHOOK_SERVICE_ROLE_KEY` (enables admin/storage-safe operations)
- `MP_ALLOW_UNSIGNED_WEBHOOKS` (optional)
- `GUEST_EMAIL` / `GUEST_USER_ID`
- `PORT`

---

## 9) Build and deployment model

- Frontend built by Vite (`npm run build`) to `dist/`
- Vercel config rewrites all routes to `index.html`
- Railway config starts backend with `node server.js`
- `vite.config.ts` uses host `0.0.0.0`, port `3000`, sourcemaps enabled

---

## 10) Notable implementation details

- `HashRouter` is used, useful for static hosting compatibility.
- Product images can come from:
  1) local mapped `images/*` by product name
  2) DB-stored image URL
- Frontend includes robust localStorage/sessionStorage fallbacks for user and payment state continuity.
- `services/geminiService.ts` exists but is currently not referenced by the app (dead code for now).

---

## 11) Operational responsibilities by role

### Customer
- Browse catalog and details
- Add/remove/update cart
- Checkout with delivery/pickup
- Pay via Mercado Pago
- View current and past orders
- Manage saved addresses

### Admin
- View all orders
- Update order status lifecycle
- Create/edit/delete products
- Upload product images
- Monitor basic KPIs on admin dashboard

---

## 12) Suggested reading order for maintainers

1. `App.tsx` (state + routing + data orchestration)
2. `pages/Checkout.tsx` + `pages/CheckoutWaiting.tsx`
3. `server.js` (API + webhook + stock updates)
4. `pages/AdminPanel.tsx` and `pages/UserDashboard.tsx`
5. `services/mercadoPagoService.ts` and `services/supabaseClient.ts`

This sequence gives fastest understanding of critical business logic.
