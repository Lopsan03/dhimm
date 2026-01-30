import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present (Vite-style env file)
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Mercado Pago credentials (env override, fallback to provided test token)
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN || 'TEST-4373910761408557-012309-3558695af674ac083263ab322f010d4f-3131107438';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

// Supabase credentials (must be provided)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ ERROR: Supabase credentials not configured!');
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY env vars (or .env file)');
  process.exit(1);
}

let GUEST_USER_ID = process.env.GUEST_USER_ID || null;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service role client for webhook operations (bypasses RLS)
const supabaseAdmin = process.env.MP_WEBHOOK_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.MP_WEBHOOK_SERVICE_ROLE_KEY)
  : null;

// ============================================
// PRODUCTION PAYMENT LOGGING
// ============================================
class PaymentLogger {
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };
    console.log(`[${level}] ${timestamp} - ${message}`, data);
    // TODO: Send to cloud logging (Firebase, DataDog, CloudWatch, etc.)
  }

  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
}

const logger = new PaymentLogger();

// ============================================
// WEBHOOK SIGNATURE VERIFICATION (PRODUCTION)
// ============================================
const validateWebhookSignature = (req) => {
  // In TEST mode, skip signature validation (webhooks from Mercado Pago are not always signed)
  if (MP_ACCESS_TOKEN?.includes('TEST')) {
    logger.warn('Webhook signature check skipped (TEST mode)');
    return true;
  }

  if (!MP_WEBHOOK_SECRET) {
    logger.error('MP_WEBHOOK_SECRET not configured - cannot validate webhooks', {
      mode: 'PRODUCTION_MODE_INSECURE'
    });
    return false;
  }

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (!signature || !requestId) {
    logger.error('Missing webhook signature headers', { signature: !!signature, requestId: !!requestId });
    return false;
  }

  try {
    // MP signature format: "timestamp=TS,signature=SIG"
    const parts = {};
    signature.split(',').forEach(part => {
      const [key, value] = part.split('=');
      parts[key.trim()] = value.trim();
    });

    const timestamp = parts.timestamp;
    const hash = parts.signature;

    if (!timestamp || !hash) {
      logger.error('Invalid signature format', { signature });
      return false;
    }

    // Build the string to sign: "{requestId}.{rawBody}"
    const stringToSign = `${requestId}.${rawBody}`;
    const hmac = crypto
      .createHmac('sha256', MP_WEBHOOK_SECRET)
      .update(stringToSign)
      .digest('hex');

    if (hmac !== hash) {
      logger.error('Webhook signature mismatch', {
        expected: hash,
        calculated: hmac,
        requestId
      });
      return false;
    }

    // Verify timestamp not too old (prevent replay attacks)
    const age = Math.abs(Date.now() - parseInt(timestamp) * 1000);
    if (age > 600000) { // 10 minutes
      logger.error('Webhook timestamp too old (possible replay attack)', {
        timestamp,
        age: `${age}ms`
      });
      return false;
    }

    logger.info('Webhook signature valid', { requestId });
    return true;
  } catch (err) {
    logger.error('Error validating signature', { error: err.message });
    return false;
  }
};

// Ensure middleware to capture raw body for signature validation
app.use(express.json({ verify: (req, res, buf) => {
  req.rawBody = buf.toString();
}}));
app.use(cors());

// Ensure a guest user/profile exists; capture its UUID for FK
async function ensureGuestIdentity() {
  if (!supabaseAdmin) {
    console.warn('⚠️  No service role key; cannot ensure guest identity.');
    return;
  }
  const guestEmail = process.env.GUEST_EMAIL || 'guest@dhimm.local';

  try {
    // Try to find guest by listing users (first page is usually enough)
    const usersRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let guestUser = usersRes?.data?.users?.find(u => u.email === guestEmail);

    if (!guestUser) {
      const createRes = await supabaseAdmin.auth.admin.createUser({
        email: guestEmail,
        password: `guest-temp-${Date.now()}`,
        email_confirm: true,
        user_metadata: { role: 'guest' }
      });
      if (createRes.error) {
        console.error('❌ Failed to create guest user:', createRes.error);
      } else {
        guestUser = createRes.data.user;
      }
    }

    if (guestUser?.id) {
      // Ensure a profile exists
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', guestUser.id)
        .single();

      if (!profile) {
        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .insert({ id: guestUser.id, name: 'Guest', email: guestEmail });
        if (profileErr) {
          console.warn('⚠️  Could not insert guest profile (may be auto-created):', profileErr.message);
        }
      }

      GUEST_USER_ID = guestUser.id;
      process.env.GUEST_USER_ID = GUEST_USER_ID;
    }
  } catch (err) {
    console.error('❌ Error ensuring guest identity:', err);
  }
}


// ============================================
// UTILITY FUNCTIONS
// ============================================
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Production-safe amount comparison (allows 1 cent rounding)
const amountsMatch = (expected, actual, tolerance = 1) => {
  return Math.abs((expected || 0) - (actual || 0)) <= tolerance;
};

// Map Mercado Pago payment status to order status
const mapPaymentStatus = (mpStatus) => {
  const statusMap = {
    'approved': 'Pagado',
    'pending': 'Pendiente',
    'in_process': 'Pendiente',
    'rejected': null,
    'cancelled': null,
    'refunded': 'Refunded',
    'charged_back': 'ChargedBack',
    'in_mediation': 'InDispute'
  };
  return statusMap[mpStatus] || null;
};

// Async retry logic for transient failures
const retryAsync = async (fn, maxAttempts = 3, backoffMs = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      const waitTime = backoffMs * Math.pow(2, i);
      logger.warn(`Retrying after ${waitTime}ms`, { attempt: i + 1, error: err.message });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Reduce stock for purchased items
const reduceStock = async (items, orderId, requestId) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    logger.warn('No items to reduce stock for', { orderId, requestId });
    return;
  }

  try {
    for (const item of items) {
      if (!item.id || !item.quantity) continue;

      const { data: product, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.id)
        .single();

      if (fetchError || !product) {
        logger.warn('Product not found for stock reduction', { 
          productId: item.id, 
          orderId, 
          requestId 
        });
        continue;
      }

      const newStock = Math.max(0, (product.stock || 0) - item.quantity);

      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.id);

      if (updateError) {
        logger.error('Failed to reduce stock', {
          productId: item.id,
          orderId,
          error: updateError.message,
          requestId
        });
      } else {
        logger.info('Stock reduced', {
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          newStock,
          orderId,
          requestId
        });
      }
    }
  } catch (err) {
    logger.error('Exception reducing stock', {
      error: err.message,
      orderId,
      requestId
    });
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory store for pending orders (cleared on server restart)
const pendingOrders = new Map();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store order data from checkout (called before payment)
app.post('/api/pending-orders/:orderId', express.json(), (req, res) => {
  const { orderId } = req.params;
  const orderData = req.body || {};

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  try {
    // Store order data in-memory for webhook to retrieve later
    // (short-lived; webhook must process within 10 minutes)
    pendingOrders.set(orderId, orderData);
    setTimeout(() => pendingOrders.delete(orderId), 600000); // 10 min TTL

    res.json({ success: true });
  } catch (e) {
    console.error('Error storing pending order:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    // Use service role to read orders (created by webhook with service role)
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders for a user (uses service role to bypass RLS for dashboard)
app.get('/api/user-orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Products for admin/clients (uses service role when available to bypass RLS)
app.get('/api/products', async (_req, res) => {
  const client = supabaseAdmin || supabase;
  if (!supabaseAdmin) {
    console.warn('⚠️  /api/products using anon key (set MP_WEBHOOK_SERVICE_ROLE_KEY in Railway to bypass RLS)');
  }
  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error.message);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    console.log(`[products] count=${data?.length || 0} usingServiceRole=${!!supabaseAdmin}`);
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a product (admin only via service role)
app.put('/api/products/:id', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(403).json({ error: 'Service role key required for product updates' });
  }
  const { id } = req.params;
  const payload = req.body || {};
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        name: payload.name,
        category: payload.category,
        brand: payload.brand,
        compatible_models: payload.compatibleModels,
        price: payload.price,
        stock: payload.stock,
        image: payload.image,
        description: payload.description,
        estado: payload.estado,
        updated_by_admin_id: payload.updated_by_admin_id || null
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error.message);
      return res.status(500).json({ error: 'Failed to update product' });
    }

    console.log(`[products] updated id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a product (admin only via service role)
app.post('/api/products', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(403).json({ error: 'Service role key required for product creation' });
  }
  const payload = req.body || {};
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: payload.name,
        category: payload.category,
        brand: payload.brand,
        compatible_models: payload.compatibleModels || [],
        price: payload.price,
        stock: payload.stock,
        image: payload.image,
        description: payload.description,
        estado: payload.estado,
        updated_by_admin_id: payload.updated_by_admin_id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error.message);
      return res.status(500).json({ error: 'Failed to create product' });
    }

    console.log(`[products] created id=${data?.id}`);
    res.json(data);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a product (admin only via service role)
app.delete('/api/products/:id', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(403).json({ error: 'Service role key required for product deletion' });
  }
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error.message);
      return res.status(500).json({ error: 'Failed to delete product' });
    }

    console.log(`[products] deleted id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload product image (admin only via service role)
app.post('/api/uploads/product-image', upload.single('file'), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(403).json({ error: 'Service role key required for image upload' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const bucketName = 'product-images';

    // Ensure bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError.message);
      return res.status(500).json({ error: 'Failed to access storage' });
    }
    const bucketExists = (buckets || []).some((b) => b.name === bucketName);
    if (!bucketExists) {
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, { public: true });
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError.message);
        return res.status(500).json({ error: 'Failed to create storage bucket' });
      }
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const safeExt = ext.toLowerCase();
    const fileName = `products/${Date.now()}-${crypto.randomUUID()}${safeExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError.message);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);
    res.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders (admin only - uses service role to bypass RLS)
app.get('/api/all-orders', async (req, res) => {
  try {
    const client = supabaseAdmin || supabase;
    if (!supabaseAdmin) {
      console.warn('⚠️  /api/all-orders using anon key (set MP_WEBHOOK_SERVICE_ROLE_KEY in Railway to bypass RLS)');
    }
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    console.log(`[all-orders] count=${data?.length || 0} usingServiceRole=${!!supabaseAdmin}`);
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching all orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (admin) using service role
app.put('/api/orders/:id', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(403).json({ error: 'Service role key required for order updates' });
  }
  const { id } = req.params;
  const { status } = req.body || {};
  if (!status) {
    return res.status(400).json({ error: 'Missing status' });
  }
  try {
    console.log(`[orders] updating id=${id} with status=${status}`);
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error(`[orders] update failed: code=${error.code} message=${error.message}`, error);
      return res.status(500).json({ error: `Failed to update order: ${error.message}` });
    }

    console.log(`[orders] updated id=${id} status=${status}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[orders] exception:', err);
    res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
});

app.post('/api/mp/webhook', async (req, res) => {
  let requestId = req.headers['x-request-id'] || 'unknown';
  
  try {
    logger.info('🔔 Webhook received', {
      requestId,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    // ============================================
    // STEP 1: VALIDATE WEBHOOK SIGNATURE
    // ============================================
    if (!validateWebhookSignature(req)) {
      logger.error('❌ Webhook signature validation failed', { requestId });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ============================================
    // STEP 2: EXTRACT PAYMENT DATA
    // ============================================
    const paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
    const topic = req.query.topic || req.body?.type || req.body?.topic;

    logger.info('Webhook data extracted', { paymentId, topic, requestId });

    if (!paymentId) {
      logger.warn('No payment ID found', { requestId });
      return res.sendStatus(400);
    }

    // Only process payment-related webhooks
    if (topic && !['payment', 'merchant_order'].includes(topic)) {
      logger.info(`Ignoring topic: ${topic}`, { requestId });
      return res.sendStatus(200);
    }

    // ============================================
    // STEP 3: FETCH PAYMENT FROM MERCADO PAGO API
    // ============================================
    let payment;
    try {
      const paymentResponse = await retryAsync(async () => {
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (resp.status === 404) {
          throw new Error(`Payment not found: ${paymentId}`);
        }
        if (!resp.ok) {
          throw new Error(`MP API error: ${resp.status} ${resp.statusText}`);
        }
        return resp.json();
      }, 3, 1000);

      payment = paymentResponse;
    } catch (err) {
      logger.error('Failed to fetch payment from MP API', { 
        paymentId, 
        error: err.message,
        requestId 
      });
      // Return 200 to prevent MP from retrying (we can't get the payment)
      return res.sendStatus(200);
    }

    // ============================================
    // STEP 4: VALIDATE PAYMENT DATA
    // ============================================
    const orderId = payment.external_reference;
    if (!orderId) {
      logger.warn('Payment has no external_reference', { paymentId, requestId });
      return res.sendStatus(200);
    }

    if (!isUuid(orderId)) {
      logger.error('Invalid order ID format', { orderId, paymentId, requestId });
      return res.sendStatus(200);
    }

    // Map MP status to our order status
    const orderStatus = mapPaymentStatus(payment.status);
    logger.info('Payment status mapped', {
      mpStatus: payment.status,
      orderStatus,
      paymentId,
      orderId,
      requestId
    });

    // Validate currency
    if (payment.currency_id !== 'MXN') {
      logger.error('Unexpected currency', {
        currency: payment.currency_id,
        paymentId,
        orderId,
        requestId
      });
      return res.sendStatus(400);
    }

    // ============================================
    // STEP 5: VALIDATE AMOUNT (CRITICAL)
    // ============================================
    const pendingOrderData = pendingOrders.get(orderId) || {};
    const expectedAmount = pendingOrderData.total || 0;
    const paidAmount = payment.transaction_amount;

    if (!amountsMatch(expectedAmount, paidAmount)) {
      logger.error('❌ AMOUNT MISMATCH - Payment rejected!', {
        expected: expectedAmount,
        actual: paidAmount,
        difference: paidAmount - expectedAmount,
        orderId,
        paymentId,
        requestId
      });
      // Don't create order, flag for manual review
      return res.sendStatus(400);
    }

    logger.info('Amount validation passed', {
      amount: paidAmount,
      currency: payment.currency_id,
      orderId,
      paymentId,
      requestId
    });

    // ============================================
    // STEP 6: CHECK FOR DUPLICATE (IDEMPOTENCY)
    // ============================================
    const client = supabaseAdmin || supabase;
    
    // Check if payment already processed by payment_id (if column exists)
    const { data: existingByPayment } = await client
      .from('orders')
      .select('id, status')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existingByPayment) {
      logger.info('⚠️  Payment already processed (idempotent)', {
        paymentId,
        orderId,
        existingStatus: existingByPayment.status,
        requestId
      });
      return res.sendStatus(200); // Success, already processed
    }

    // Also check by order ID for backward compatibility
    const { data: existingOrder } = await client
      .from('orders')
      .select('id, status, payment_id')
      .eq('id', orderId)
      .maybeSingle();

    // ============================================
    // STEP 7: HANDLE DIFFERENT PAYMENT STATUSES
    // ============================================
    if (orderStatus === null) {
      // Payment rejected, cancelled, or otherwise failed
      logger.warn('Payment failed - not creating order', {
        status: payment.status,
        orderId,
        paymentId,
        requestId
      });
      pendingOrders.delete(orderId);
      return res.sendStatus(200);
    }

    // If order doesn't exist, create it
    if (!existingOrder) {
      const userIdForInsert = pendingOrderData.userId && pendingOrderData.userId !== 'guest'
        ? pendingOrderData.userId
        : GUEST_USER_ID;

      const orderData = {
        id: orderId,
        user_id: userIdForInsert,
        user_name: pendingOrderData.userName || 'Cliente',
        user_email: pendingOrderData.userEmail || '',
        user_phone: pendingOrderData.userPhone || '',
        items: pendingOrderData.items || [],
        total: pendingOrderData.total || 0,
        shipping_address: pendingOrderData.shippingAddress || '',
        status: orderStatus,
        // NEW: Payment tracking fields
        payment_id: payment.id,
        merchant_order_id: payment.order?.id || null,
        currency: payment.currency_id,
        transaction_amount: payment.transaction_amount,
        payment_status: payment.status,
        paid_at: orderStatus === 'Pagado' ? new Date().toISOString() : null
      };

      try {
        const { error: insertError, data: createdOrder } = await client
          .from('orders')
          .insert(orderData)
          .select();

        if (insertError) {
          logger.error('Error creating order', {
            error: insertError.message,
            orderId,
            paymentId,
            requestId
          });
          return res.sendStatus(500);
        }

        logger.info('✅ Order created successfully', {
          orderId,
          status: orderStatus,
          paymentId,
          amount: paidAmount,
          requestId
        });

        // Reduce stock if payment was successful
        if (orderStatus === 'Pagado') {
          await reduceStock(pendingOrderData.items, orderId, requestId);
        }
      } catch (err) {
        logger.error('Exception creating order', {
          error: err.message,
          orderId,
          paymentId,
          requestId
        });
        return res.sendStatus(500);
      }
    } else {
      // Order exists, update status if different
      if (existingOrder.status !== orderStatus) {
        try {
          const updateData = {
            status: orderStatus,
            payment_id: payment.id,
            currency: payment.currency_id,
            transaction_amount: payment.transaction_amount,
            payment_status: payment.status,
            paid_at: orderStatus === 'Pagado' ? new Date().toISOString() : existingOrder.paid_at
          };

          const { error: updateError } = await client
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

          if (updateError) {
            logger.error('Error updating order', {
              error: updateError.message,
              orderId,
              paymentId,
              requestId
            });
            return res.sendStatus(500);
          }

          logger.info('✅ Order updated', {
            orderId,
            newStatus: orderStatus,
            paymentId,
            requestId
          });

          // Reduce stock if order just became paid
          if (orderStatus === 'Pagado' && existingOrder.status !== 'Pagado') {
            await reduceStock(pendingOrderData.items, orderId, requestId);
          }
        } catch (err) {
          logger.error('Exception updating order', {
            error: err.message,
            orderId,
            paymentId,
            requestId
          });
          return res.sendStatus(500);
        }
      } else {
        logger.info('Order status unchanged, no update needed', {
          orderId,
          status: orderStatus,
          paymentId,
          requestId
        });
      }
    }

    // Clean up pending order data
    pendingOrders.delete(orderId);

    logger.info('✅ Webhook processed successfully', {
      orderId,
      paymentId,
      status: orderStatus,
      amount: paidAmount,
      requestId
    });

    res.sendStatus(200);
  } catch (err) {
    logger.error('❌ Unexpected webhook error', {
      error: err.message,
      stack: err.stack,
      requestId
    });
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend server running on port ${PORT}`);
  console.log(`📍 Webhook URL: http://localhost:${PORT}/api/mp/webhook`);
  console.log(`🔗 Cloudflare URL: https://dublin-protocol-acm-msie.trycloudflare.com/api/mp/webhook`);
  console.log(`\n⚠️  Keep this terminal open! Press Ctrl+C to stop.\n`);
  // Ensure guest identity at startup (fire and forget)
  ensureGuestIdentity();
});

// Keep process alive and handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down server...');
  process.exit(0);
});
