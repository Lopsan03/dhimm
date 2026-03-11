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
const MP_ALLOW_UNSIGNED_WEBHOOKS = process.env.MP_ALLOW_UNSIGNED_WEBHOOKS === 'true';

const sanitizeEnvValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^['\"]|['\"]$/g, '');
};

const normalizeBaseUrl = (value) => {
  const sanitized = sanitizeEnvValue(value);
  if (!sanitized) return null;
  try {
    const url = new URL(sanitized);
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
};

// Skydropx shipping quotation configuration
const SKYDROPX_API_KEY = sanitizeEnvValue(process.env.SKYDROPX_API_KEY);
const SKYDROPX_BEARER_TOKEN = sanitizeEnvValue(process.env.SKYDROPX_BEARER_TOKEN) || SKYDROPX_API_KEY;
const SKYDROPX_API_BASE_URL = normalizeBaseUrl(process.env.SKYDROPX_API_BASE_URL) || 'https://pro.skydropx.com';
const SKYDROPX_DEBUG = process.env.SKYDROPX_DEBUG === 'true';
const SKYDROPX_ORIGIN = {
  company: process.env.SKYDROPX_ORIGIN_COMPANY || 'Dhimma Automotriz',
  name: process.env.SKYDROPX_ORIGIN_NAME || 'Dhimma',
  phone: process.env.SKYDROPX_ORIGIN_PHONE || '8132732525',
  email: process.env.SKYDROPX_ORIGIN_EMAIL || 'ventas_duar@hotmail.com',
  street_1: process.env.SKYDROPX_ORIGIN_STREET || 'AV DE LA JUVENTUD #590',
  city: process.env.SKYDROPX_ORIGIN_CITY || 'San Nicolás de los Garza',
  province: process.env.SKYDROPX_ORIGIN_STATE || 'Nuevo León',
  zip_code: process.env.SKYDROPX_ORIGIN_ZIP || '66455',
  country: process.env.SKYDROPX_ORIGIN_COUNTRY || 'MX'
};

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
  // In TEST mode or when explicitly allowed, skip signature validation
  if (MP_ACCESS_TOKEN?.includes('TEST') || MP_ALLOW_UNSIGNED_WEBHOOKS) {
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
  const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

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

const getIsoDay = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return value.toISOString().split('T')[0];
};

const startOfUtcDay = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addUtcDays = (value, days) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const startOfUtcWeek = (value) => {
  const dayStart = startOfUtcDay(value);
  const day = dayStart.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  return addUtcDays(dayStart, -diffToMonday);
};

const startOfUtcMonth = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

const addUtcMonths = (value, months) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
};

const buildAnalyticsRange = (granularity, offset) => {
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const now = new Date();

  if (granularity === 'week') {
    const currentWeekStart = startOfUtcWeek(now);
    const pageWeeks = 8;
    const endExclusive = addUtcDays(currentWeekStart, 7 - safeOffset * pageWeeks * 7);
    const start = addUtcDays(endExclusive, -pageWeeks * 7);
    return { granularity, start, endExclusive, points: pageWeeks };
  }

  if (granularity === 'month') {
    const currentMonthStart = startOfUtcMonth(now);
    const pageMonths = 12;
    const endExclusive = addUtcMonths(currentMonthStart, 1 - safeOffset * pageMonths);
    const start = addUtcMonths(endExclusive, -pageMonths);
    return { granularity, start, endExclusive, points: pageMonths };
  }

  const todayStart = startOfUtcDay(now);
  const pageDays = 7;
  const endExclusive = addUtcDays(todayStart, 1 - safeOffset * pageDays);
  const start = addUtcDays(endExclusive, -pageDays);
  return { granularity: 'day', start, endExclusive, points: pageDays };
};

const getAnalyticsBucketKey = (dateValue, granularity) => {
  const date = new Date(dateValue);
  if (granularity === 'month') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (granularity === 'week') {
    return getIsoDay(startOfUtcWeek(date));
  }
  return getIsoDay(date);
};

const getAnalyticsBucketLabel = (key, granularity) => {
  if (granularity === 'month') {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
    return date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  if (granularity === 'week') {
    const date = new Date(`${key}T00:00:00.000Z`);
    const weekEnd = addUtcDays(date, 6);
    return `${date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })}`;
  }
  const date = new Date(`${key}T00:00:00.000Z`);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' });
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/shipping/quote', async (req, res) => {
  const debugId = `ship_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const debugEnabled = SKYDROPX_DEBUG || req.query?.debug === '1';
  const debugAttempts = [];

  const registerAttempt = ({ url, authLabel, status, ok, responseSnippet, error }) => {
    debugAttempts.push({
      url,
      auth: authLabel,
      status,
      ok,
      responseSnippet,
      error
    });
  };

  try {
    if (!SKYDROPX_BEARER_TOKEN) {
      return res.status(503).json({ error: 'SKYDROPX_BEARER_TOKEN (or SKYDROPX_API_KEY fallback) is not configured on backend' });
    }

    const destination = req.body?.destination || {};
    const requiredFields = ['street_1', 'city', 'province', 'zip_code', 'country'];
    const missing = requiredFields.filter((field) => !destination?.[field]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing destination fields: ${missing.join(', ')}` });
    }

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const normalizeOptions = (quotationPayload) => {
      const options = quotationPayload?.rates || quotationPayload?.data?.rates || [];
      return (Array.isArray(options) ? options : [])
        .map((option) => {
          const amount = Number(option?.total ?? option?.amount ?? option?.price ?? option?.cost ?? option?.total_price ?? 0);
          return {
            amount,
            currency: option?.currency_code || option?.currency || 'MXN',
            provider: option?.provider_display_name || option?.provider_name || option?.provider || option?.carrier || option?.name || 'Skydropx',
            success: !!option?.success,
            status: option?.status || null
          };
        })
        .filter((option) => Number.isFinite(option.amount) && option.amount > 0)
        .sort((a, b) => a.amount - b.amount);
    };

    const payload = {
      quotation: {
        address_from: {
          country_code: SKYDROPX_ORIGIN.country || 'MX',
          postal_code: SKYDROPX_ORIGIN.zip_code,
          area_level1: SKYDROPX_ORIGIN.province,
          area_level2: SKYDROPX_ORIGIN.city,
          area_level3: SKYDROPX_ORIGIN.street_1
        },
        address_to: {
          country_code: destination.country || 'MX',
          postal_code: destination.zip_code,
          area_level1: destination.province,
          area_level2: destination.city,
          area_level3: destination.street_1
        },
        parcels: [
          {
            weight: 5,
            length: 40,
            width: 30,
            height: 20
          }
        ]
      }
    };

    const tryRequest = async (url, authHeader, authLabel) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      const bodyText = await response.text();
      const bodySnippet = bodyText.slice(0, 300);

      if (!response.ok) {
        registerAttempt({
          url,
          authLabel,
          status: response.status,
          ok: false,
          responseSnippet: bodySnippet
        });
        const requestError = new Error(`[${authLabel}] ${response.status} ${response.statusText} - ${bodyText.slice(0, 500)}`);
        requestError.status = response.status;
        requestError.url = url;
        requestError.authLabel = authLabel;
        throw requestError;
      }

      registerAttempt({
        url,
        authLabel,
        status: response.status,
        ok: true,
        responseSnippet: bodySnippet
      });

      try {
        return bodyText ? JSON.parse(bodyText) : {};
      } catch {
        return { raw: bodyText };
      }
    };

    const tryFetchQuotationById = async (baseUrl, quotationId, authHeader, authLabel) => {
      const url = `${baseUrl}/api/v1/quotations/${quotationId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });

      const bodyText = await response.text();
      const bodySnippet = bodyText.slice(0, 300);

      if (!response.ok) {
        registerAttempt({
          url,
          authLabel,
          status: response.status,
          ok: false,
          responseSnippet: bodySnippet
        });
        const requestError = new Error(`[${authLabel}] ${response.status} ${response.statusText} - ${bodyText.slice(0, 500)}`);
        requestError.status = response.status;
        requestError.url = url;
        requestError.authLabel = authLabel;
        throw requestError;
      }

      registerAttempt({
        url,
        authLabel,
        status: response.status,
        ok: true,
        responseSnippet: bodySnippet
      });

      try {
        return bodyText ? JSON.parse(bodyText) : {};
      } catch {
        return { raw: bodyText };
      }
    };

    const baseUrlCandidates = Array.from(new Set([
      SKYDROPX_API_BASE_URL,
      'https://pro.skydropx.com'
    ].map(normalizeBaseUrl).filter(Boolean)));

    const candidateUrls = baseUrlCandidates.map((baseUrl) => `${baseUrl}/api/v1/quotations`);
    const candidateAuthHeaders = [
      { value: `Bearer ${SKYDROPX_BEARER_TOKEN}`, label: 'Bearer' }
    ];

    let quotation = null;
    let lastError = null;

    for (const url of candidateUrls) {
      for (const auth of candidateAuthHeaders) {
        try {
          quotation = await tryRequest(url, auth.value, auth.label);
          if (quotation) break;
        } catch (error) {
          lastError = error;
        }
      }
      if (quotation) break;
    }

    const hasPrimaryAuthFailure = debugAttempts.some(
      (attempt) => attempt.status === 401 && typeof attempt.url === 'string' && attempt.url.endsWith('/api/v1/quotations')
    );

    if (!quotation && hasPrimaryAuthFailure) {
      throw new Error('Skydropx authentication failed (401 Bad credentials). Verify SKYDROPX_API_KEY in Railway backend environment.');
    }

    if (!quotation) {
      throw lastError || new Error('Unable to retrieve quotation from Skydropx');
    }

    let finalQuotation = quotation;
    let normalizedOptions = normalizeOptions(finalQuotation);

    if (normalizedOptions.length === 0 && finalQuotation?.id && finalQuotation?.is_completed === false) {
      const pollingRounds = 6;
      const pollingDelayMs = 1200;

      for (let round = 0; round < pollingRounds; round++) {
        await wait(pollingDelayMs);

        let polled = null;
        let pollError = null;
        for (const baseUrl of baseUrlCandidates) {
          for (const auth of candidateAuthHeaders) {
            try {
              polled = await tryFetchQuotationById(baseUrl, finalQuotation.id, auth.value, auth.label);
              if (polled) break;
            } catch (error) {
              pollError = error;
            }
          }
          if (polled) break;
        }

        if (!polled && pollError) {
          lastError = pollError;
          continue;
        }

        if (polled) {
          finalQuotation = polled;
          normalizedOptions = normalizeOptions(finalQuotation);
          if (normalizedOptions.length > 0) break;
          if (finalQuotation?.is_completed === true) break;
        }
      }
    }

    if (normalizedOptions.length === 0) {
      return res.status(422).json({ error: 'No shipping options returned by Skydropx', raw: finalQuotation });
    }

    const selected = normalizedOptions[0];
    return res.json({
      amount: selected.amount,
      currency: selected.currency,
      provider: selected.provider,
      package: {
        weight_kg: 5,
        length_cm: 40,
        width_cm: 30,
        height_cm: 20
      },
      options: normalizedOptions
    });
  } catch (error) {
    console.error('Skydropx quote error:', {
      debugId,
      message: error?.message,
      configuredBaseUrl: SKYDROPX_API_BASE_URL,
      attempts: debugAttempts
    });

    const responsePayload = {
      error: 'Failed to calculate shipping quote',
      detail: error?.message || 'Unknown shipping error',
      debugId
    };

    if (SKYDROPX_DEBUG || req.query?.debug === '1') {
      responsePayload.debug = {
        configuredBaseUrl: SKYDROPX_API_BASE_URL,
        attempts: debugAttempts
      };
    }

    return res.status(500).json(responsePayload);
  }
});

app.post('/api/analytics/visit', async (req, res) => {
  try {
    const { visitorId, path: visitedPath } = req.body || {};
    if (!visitorId || typeof visitorId !== 'string') {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Service role key required for analytics tracking' });
    }

    const now = new Date();
    const day = getIsoDay(now);

    const { error } = await supabaseAdmin
      .from('page_visits')
      .upsert(
        {
          visitor_id: visitorId,
          path: typeof visitedPath === 'string' ? visitedPath : '/',
          visit_date: day,
          created_at: now.toISOString()
        },
        { onConflict: 'visitor_id,visit_date' }
      );

    if (error) {
      console.error('Error saving visit analytics:', error);
      return res.status(500).json({ error: 'Failed to persist visit analytics' });
    }

    res.json({ tracked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/visits', async (_req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Service role key required for analytics stats' });
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const { data, error } = await supabaseAdmin
      .from('page_visits')
      .select('visitor_id, visit_date')

    if (error) {
      console.error('Error fetching visit analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch visit analytics' });
    }

    const rows = data || [];
    const weekVisitorIds = new Set();
    const monthVisitorIds = new Set();
    const allVisitorIds = new Set();

    for (const row of rows) {
      const visitDate = new Date(`${row.visit_date}T00:00:00.000Z`);
      if (Number.isNaN(visitDate.getTime())) continue;

      allVisitorIds.add(row.visitor_id);
      if (visitDate >= weekAgo) weekVisitorIds.add(row.visitor_id);
      if (visitDate >= monthAgo) monthVisitorIds.add(row.visitor_id);
    }

    res.json({
      weekUniqueVisitors: weekVisitorIds.size,
      monthUniqueVisitors: monthVisitorIds.size,
      totalTrackedVisitors: allVisitorIds.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/series', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Service role key required for analytics series' });
    }

    const granularityInput = (req.query.granularity || 'day').toString().toLowerCase();
    const granularity = ['day', 'week', 'month'].includes(granularityInput) ? granularityInput : 'day';
    const offset = Number.parseInt((req.query.offset || '0').toString(), 10);

    const range = buildAnalyticsRange(granularity, Number.isNaN(offset) ? 0 : offset);
    const rangeStartIso = range.start.toISOString();
    const rangeEndIso = range.endExclusive.toISOString();

    const { data: visitRows, error: visitsError } = await supabaseAdmin
      .from('page_visits')
      .select('visitor_id, visit_date')
      .gte('visit_date', getIsoDay(range.start))
      .lt('visit_date', getIsoDay(range.endExclusive));

    if (visitsError) {
      return res.status(500).json({ error: `Failed to fetch visits: ${visitsError.message}` });
    }

    const { data: orderRows, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, created_at')
      .gte('created_at', rangeStartIso)
      .lt('created_at', rangeEndIso);

    if (ordersError) {
      return res.status(500).json({ error: `Failed to fetch orders: ${ordersError.message}` });
    }

    const keys = [];
    if (granularity === 'month') {
      for (let i = 0; i < range.points; i++) {
        const monthDate = addUtcMonths(range.start, i);
        keys.push(getAnalyticsBucketKey(monthDate, granularity));
      }
    } else if (granularity === 'week') {
      for (let i = 0; i < range.points; i++) {
        const weekDate = addUtcDays(range.start, i * 7);
        keys.push(getAnalyticsBucketKey(weekDate, granularity));
      }
    } else {
      for (let i = 0; i < range.points; i++) {
        const dayDate = addUtcDays(range.start, i);
        keys.push(getAnalyticsBucketKey(dayDate, granularity));
      }
    }

    const visitorsByBucket = new Map();
    const revenueByBucket = new Map();
    const ordersByBucket = new Map();
    const uniqueVisitorsPeriod = new Set();

    keys.forEach((key) => {
      visitorsByBucket.set(key, new Set());
      revenueByBucket.set(key, 0);
      ordersByBucket.set(key, 0);
    });

    for (const row of visitRows || []) {
      const key = getAnalyticsBucketKey(`${row.visit_date}T00:00:00.000Z`, granularity);
      if (!visitorsByBucket.has(key)) continue;
      visitorsByBucket.get(key).add(row.visitor_id);
      uniqueVisitorsPeriod.add(row.visitor_id);
    }

    const paidStatuses = new Set(['pagado', 'paid', 'approved', 'completado', 'completed', 'enviado', 'shipped']);
    for (const row of orderRows || []) {
      const key = getAnalyticsBucketKey(row.created_at, granularity);
      if (!ordersByBucket.has(key)) continue;

      ordersByBucket.set(key, Number(ordersByBucket.get(key) || 0) + 1);
      if (paidStatuses.has((row.status || '').toString().toLowerCase())) {
        revenueByBucket.set(key, Number(revenueByBucket.get(key) || 0) + Number(row.total || 0));
      }
    }

    const points = keys.map((key) => ({
      key,
      label: getAnalyticsBucketLabel(key, granularity),
      visitors: (visitorsByBucket.get(key) || new Set()).size,
      revenue: Number(revenueByBucket.get(key) || 0),
      orders: Number(ordersByBucket.get(key) || 0)
    }));

    const totals = points.reduce(
      (acc, point) => {
        acc.revenue += point.revenue;
        acc.orders += point.orders;
        return acc;
      },
      { visitors: uniqueVisitorsPeriod.size, revenue: 0, orders: 0 }
    );

    const rangeLabel = `${range.start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })} - ${addUtcDays(range.endExclusive, -1).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;

    return res.json({
      granularity,
      offset: Number.isNaN(offset) ? 0 : Math.max(0, offset),
      rangeStart: getIsoDay(range.start),
      rangeEndExclusive: getIsoDay(range.endExclusive),
      rangeLabel,
      points,
      totals,
      canGoNext: (Number.isNaN(offset) ? 0 : offset) > 0
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Diagnostic: list available payment methods for the configured MP account
app.get('/api/mp/payment-methods', async (_req, res) => {
  try {
    if (!MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' });
    }

    const resp = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({
        error: 'Mercado Pago API error',
        status: resp.status,
        body: text
      });
    }

    const data = await resp.json();

    // Return a minimal, readable view
    const methods = (data || []).map(method => ({
      id: method.id,
      name: method.name,
      payment_type_id: method.payment_type_id,
      status: method.status
    }));

    res.json({
      count: methods.length,
      methods
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment methods', detail: err.message });
  }
});

// Diagnostic: inspect a preference by id to verify payment_methods and settings
app.get('/api/mp/preferences/:preferenceId', async (req, res) => {
  try {
    const { preferenceId } = req.params;
    if (!MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' });
    }

    if (!preferenceId) {
      return res.status(400).json({ error: 'Missing preferenceId' });
    }

    const resp = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({
        error: 'Mercado Pago API error',
        status: resp.status,
        body: text
      });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preference', detail: err.message });
  }
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
  const updatePayload = {
    name: payload.name,
    category: payload.category,
    brand: payload.brand,
    compatible_models: payload.compatibleModels,
    price: payload.price,
    stock: payload.stock,
    image: payload.image,
    description: payload.description,
    updated_by_admin_id: payload.updated_by_admin_id || null
  };

  // Backward-compatible: only persist estado when explicitly provided and column still exists.
  if (typeof payload.estado !== 'undefined') {
    updatePayload.estado = payload.estado;
  }

  try {
    const { error } = await supabaseAdmin
      .from('products')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error.message);
      return res.status(500).json({
        error: 'Failed to update product',
        details: error.message
      });
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
  const insertPayload = {
    name: payload.name,
    category: payload.category,
    brand: payload.brand,
    compatible_models: payload.compatibleModels || [],
    price: payload.price,
    stock: payload.stock,
    image: payload.image,
    description: payload.description,
    updated_by_admin_id: payload.updated_by_admin_id || null
  };

  // Backward-compatible: only persist estado when explicitly provided and column still exists.
  if (typeof payload.estado !== 'undefined') {
    insertPayload.estado = payload.estado;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error.message);
      return res.status(500).json({
        error: 'Failed to create product',
        details: error.message
      });
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

// Get user profile (bypasses RLS using admin client)
app.get('/api/user-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Use service role if available, otherwise use regular client
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('profiles')
      .select('id, name, email, role, addresses')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Exception fetching user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update user profile
app.post('/api/user-profile', async (req, res) => {
  try {
    const { id, name, email, role, addresses } = req.body || {};

    if (!supabaseAdmin) {
      return res.status(503).json({
        error: 'Profile writes require MP_WEBHOOK_SERVICE_ROLE_KEY on backend'
      });
    }

    if (!id || !isUuid(id)) {
      return res.status(400).json({ error: 'Invalid or missing id' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields: name, email' });
    }

    const safeRole = role === 'admin' ? 'admin' : 'user';
    const safeAddresses = Array.isArray(addresses) ? addresses : [];

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id,
        name,
        email,
        role: safeRole,
        addresses: safeAddresses
      })
      .select('id, name, email, role, addresses')
      .single();

    if (error) {
      console.error('Error upserting user profile:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Exception upserting user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user addresses
app.put('/api/user-addresses/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { addresses } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    if (!Array.isArray(addresses)) {
      return res.status(400).json({ error: 'addresses must be an array' });
    }

    // Use service role if available, otherwise use regular client
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('profiles')
      .update({ addresses })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating user addresses:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, addresses });
  } catch (err) {
    console.error('Exception updating user addresses:', err);
    res.status(500).json({ error: err.message });
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
