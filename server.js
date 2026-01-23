import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present (Vite-style env file)
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

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

let GUEST_USER_ID = process.env.GUEST_USER_ID || null; // Will be resolved to a real user UUID

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service role client for webhook operations (bypasses RLS)
const supabaseAdmin = process.env.MP_WEBHOOK_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.MP_WEBHOOK_SERVICE_ROLE_KEY)
  : null;

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

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateWebhookSignature = (req) => {
  if (!MP_WEBHOOK_SECRET) {
    console.warn('⚠️  MP_WEBHOOK_SECRET not configured; skipping signature validation');
    return true;
  }

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];

  // If headers are missing, log warning but allow webhook to proceed (for testing)
  if (!signature || !requestId) {
    console.warn('⚠️  Missing webhook signature or request ID headers; accepting anyway for testing');
    return true;
  }

  // Mercado Pago signature format: ts=<timestamp>,v1=<sha256>
  const parts = signature.split(',');
  const signatureData = {};
  parts.forEach(part => {
    const [key, value] = part.split('=');
    signatureData[key.trim()] = value;
  });

  const timestamp = signatureData.ts;
  const receivedSignature = signatureData.v1;

  if (!timestamp || !receivedSignature) {
    console.error('❌ Invalid signature format. Expected ts=...,v1=...');
    return false;
  }

  // Recreate signature: HMAC-SHA256(secret, requestId + timestamp)
  const data = `${requestId}${timestamp}`;
  const calculatedSignature = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(data)
    .digest('hex');

  if (calculatedSignature !== receivedSignature) {
    console.error('❌ Signature mismatch');
    return false;
  }

  return true;
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
  const orderData = req.body;
  
  if (!orderId || !orderData) {
    return res.status(400).json({ error: 'Missing orderId or order data' });
  }

  // Store for max 10 minutes (600000ms), then auto-delete
  pendingOrders.set(orderId, orderData);
  setTimeout(() => pendingOrders.delete(orderId), 600000);

  console.log(`📦 Stored pending order: ${orderId}`);
  res.json({ success: true });
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

app.post('/api/mp/webhook', async (req, res) => {
  try {
    // TODO: Implement proper signature validation using Mercado Pago's algorithm
    // For now, accept all webhooks (they must come through cloudflare tunnel)

    const paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;
    const topic = req.query.topic || req.body?.type || req.body?.topic;

    if (!paymentId) {
      return res.sendStatus(400);
    }

    if (topic && !['payment', 'merchant_order'].includes(topic)) {
      return res.sendStatus(200);
    }

    // Merchant order callbacks sometimes send merchant_order IDs; handle separately
    if (topic === 'merchant_order') {
      const moResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`
        }
      });

      if (!moResponse.ok) {
        console.error('MP merchant_order fetch error', moResponse.status);
        return res.sendStatus(200);
      }

      const merchantOrder = await moResponse.json();
      const orderId = merchantOrder.external_reference;
      if (!orderId) return res.sendStatus(200);
      if (!isUuid(orderId)) {
        console.error('Skipping update; external_reference is not a UUID', orderId);
        return res.sendStatus(200);
      }

      const payments = merchantOrder.payments || [];
      const hasApproved = payments.some(p => p.status === 'approved');
      const allRejected = payments.length > 0 && payments.every(p => p.status === 'rejected');
      const isCancelled = merchantOrder.status === 'cancelled' || merchantOrder.status === 'closed';

      if (!hasApproved) return res.sendStatus(200);
      const newStatus = 'completed';

      // Create order if it doesn't exist
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .single();

      if (!existingOrder) {
        const { error: insertError } = await supabaseAdmin
          .from('orders')
          .insert({
            id: orderId,
            user_id: GUEST_USER_ID,
            user_name: 'Cliente',
            user_email: '',
            items: [],
            total: 0,
            shipping_address: ''
          });

        if (insertError) {
          console.error('Error creating order from webhook:', insertError);
          return res.sendStatus(500);
        }
      }

      return res.sendStatus(200);
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}` , {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`
      }
    });

    if (paymentResponse.status === 404) {
      console.error('❌ MP fetch error 404 for payment', paymentId);
      return res.sendStatus(200);
    }

    if (!paymentResponse.ok) {
      console.error('❌ MP fetch error', paymentResponse.status);
      return res.sendStatus(500);
    }

    const payment = await paymentResponse.json();

    const orderId = payment.external_reference;
    if (!orderId) {
      console.warn('⚠️  No external_reference in payment; skipping order creation');
      return res.sendStatus(200);
    }

    if (!isUuid(orderId)) {
      console.error('❌ Skipping update; external_reference is not a UUID', orderId);
      return res.sendStatus(200);
    }

    if (payment.status !== 'approved') {
      return res.sendStatus(200);
    }

    // Create order if it doesn't exist
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (!existingOrder) {
      console.log('📝 Creating order from webhook:', orderId);
      
      // Fetch stored order data from checkout
      const pendingOrderData = pendingOrders.get(orderId);
      const orderData = pendingOrderData || {};
      
      // Use real data if available, otherwise defaults
      const userId = orderData.userId && orderData.userId !== 'guest' 
        ? orderData.userId 
        : GUEST_USER_ID;
      
      const { error: insertError } = await supabaseAdmin
        .from('orders')
        .insert({
          id: orderId,
          user_id: userId,
          user_name: orderData.userName || 'Cliente',
          user_email: orderData.userEmail || '',
          items: orderData.items || [],
          total: orderData.total || 0,
          shipping_address: orderData.shippingAddress || ''
        });

      if (insertError) {
        console.error('❌ Error creating order from webhook:', insertError);
        return res.sendStatus(500);
      }
      
      // Clean up pending order data
      pendingOrders.delete(orderId);
      console.log('✅ Order created:', orderId);
    } else {
      console.log('ℹ️ Order already exists; skipping status update');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error', err);
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
