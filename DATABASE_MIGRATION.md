# Database Migration Guide - Payment Fields

Run these SQL migrations in your Supabase dashboard to add production payment tracking:

## Step 1: Add Payment Tracking Columns to Orders Table

```sql
-- Add payment tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS merchant_order_id TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN',
ADD COLUMN IF NOT EXISTS transaction_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Create index for payment_id lookups (prevents duplicate processing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id 
ON orders(payment_id) 
WHERE payment_id IS NOT NULL;

-- Create index for payment_status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
ON orders(payment_status);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_orders_paid_at 
ON orders(paid_at);
```

## Step 2: Update Order Status Constraint (if needed)

If your `status` constraint is still `('Pendiente', 'Pagado', 'Enviado', 'Completado')`, extend it:

```sql
-- Drop old constraint (if exists)
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with all statuses
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'Pendiente', 'Pagado', 'Enviado', 'Completado', 
  'Refunded', 'ChargedBack', 'InDispute'
));
```

## Step 3: Create Payment History Table (Optional but Recommended)

```sql
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL,
  merchant_order_id TEXT,
  old_status TEXT,
  new_status TEXT,
  mp_status TEXT, -- Mercado Pago status (approved, pending, rejected, etc)
  amount DECIMAL(10,2),
  currency TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  webhook_request_id TEXT,
  notes TEXT
);

CREATE INDEX idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX idx_payment_history_payment_id ON payment_history(payment_id);
CREATE INDEX idx_payment_history_changed_at ON payment_history(changed_at);
```

## Step 4: Create Payment Event Log Table (Optional but Recommended)

```sql
CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'webhook_received', 'webhook_valid', 'payment_created', 'payment_updated', 'error'
  payment_id TEXT,
  order_id UUID,
  mp_status TEXT,
  message TEXT,
  error_details JSONB,
  webhook_request_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX idx_payment_events_order_id ON payment_events(order_id);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at);
CREATE INDEX idx_payment_events_event_type ON payment_events(event_type);
```

## Step 5: Enable Row Level Security (if needed)

```sql
-- Allow authenticated users to see their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admin can see all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow webhook service role to insert/update (service role ignores RLS anyway, but this allows INSERT/UPDATE/DELETE)
CREATE POLICY "Service role can manage orders"
  ON orders FOR ALL
  USING (true);
```

## Verification Queries

After migration, verify the schema:

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders';
```

## Rollback (if needed)

```sql
-- If something goes wrong, remove the new columns
ALTER TABLE orders 
DROP COLUMN IF EXISTS payment_id,
DROP COLUMN IF EXISTS merchant_order_id,
DROP COLUMN IF EXISTS currency,
DROP COLUMN IF EXISTS transaction_amount,
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS paid_at;

-- Drop tables
DROP TABLE IF EXISTS payment_history;
DROP TABLE IF EXISTS payment_events;
```

## Remove Deprecated Product Field (estado)

If you no longer use the `estado` field in products, remove it from the database:

```sql
ALTER TABLE products
DROP COLUMN IF EXISTS estado;
```

## Environment Variables to Update

Make sure these are set in Railway (production) and `.env.local` (development):

```env
# CRITICAL: Required for webhook signature validation in PRODUCTION
MP_WEBHOOK_SECRET=your_secret_from_mp_dashboard

# Backend service role key (for webhook operations)
MP_WEBHOOK_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Guest email for guest orders
GUEST_EMAIL=guest@dhimm.local
```

## Testing the Migration

```sql
-- Create a test order to verify schema
INSERT INTO orders (
  id, 
  user_id, 
  user_name, 
  user_email, 
  items, 
  total, 
  status,
  shipping_address,
  payment_id,
  currency,
  transaction_amount,
  payment_status,
  paid_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'Test Customer',
  'test@example.com',
  '[]'::jsonb,
  100.00,
  'Pagado',
  'Test Address',
  'test-mp-12345',
  'MXN',
  100.00,
  'approved',
  NOW()
);

-- Verify it was created
SELECT id, user_name, status, payment_id, payment_status, paid_at 
FROM orders 
WHERE user_name = 'Test Customer';

-- Clean up test data
DELETE FROM orders WHERE user_name = 'Test Customer';
```

## Post-Migration Checklist

- [ ] All new columns added successfully
- [ ] Indexes created for performance
- [ ] Constraints updated
- [ ] RLS policies applied (if using)
- [ ] Environment variables set in Railway
- [ ] Backend redeployed (new code references payment fields)
- [ ] Test webhook received and created order with payment fields
- [ ] Verify payment_id prevents duplicate processing
- [ ] Test amount validation
- [ ] Monitor logs for payment events

---

**⚠️ IMPORTANT**: Deploy the code changes (server.js) AFTER running these migrations. The code expects these columns to exist.
