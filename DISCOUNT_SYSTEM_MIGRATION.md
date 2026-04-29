# Discount Pricing System - Database Migration

## Overview
This document describes the database schema changes needed to support the discount pricing system.

## Database Changes Required

### Products Table - Add New Columns

You need to add two new columns to your `products` table in Supabase:

```sql
ALTER TABLE products ADD COLUMN discount_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN discounted_price DECIMAL(10, 2) NULL;
```

### Column Descriptions

- **`discount_enabled`** (BOOLEAN): 
  - Default: `FALSE`
  - Controls whether the discount pricing is active for this product
  - When `FALSE`, only the original `price` is displayed

- **`discounted_price`** (DECIMAL(10, 2)): 
  - Default: `NULL`
  - The sale price after discount
  - Must be less than the original `price`
  - Only used when `discount_enabled = TRUE`

### Example SQL

```sql
-- Add columns to products table
ALTER TABLE products 
ADD COLUMN discount_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN discounted_price DECIMAL(10, 2) NULL;

-- Optional: Add index for faster queries if you have many products
CREATE INDEX idx_products_discount_enabled ON products(discount_enabled);
```

## How It Works

### Backend Validation (server.js)

The API validates discount pricing:

1. **When discount is enabled:**
   - Both `price` and `discounted_price` must be positive numbers
   - `discounted_price` must be less than `price`
   - Returns error if validation fails

2. **Allowed values:**
   - `discount_enabled: true` + `discounted_price: null` → Discount disabled
   - `discount_enabled: false` + any `discounted_price` → Discount ignored

### Frontend Display

**Admin Panel (AdminPanel.tsx)**
- Toggle switch to enable/disable discounts
- Input field for discounted price (only shown when enabled)
- Real-time discount percentage calculation (e.g., "25% OFF")
- Visual feedback with orange highlight for discount section

**Product Cards (ProductCard.tsx)**
- If discount enabled:
  - Original price: shown with strikethrough in gray
  - Discounted price: shown in green, bold text
  - Discount badge: shows percentage (e.g., "25% OFF")
- If discount disabled:
  - Only original price is shown

**Product Detail Page (ProductDetail.tsx)**
- Same display logic as product cards
- Large price display with discount visualization

## Updating Existing Products

To enable discounts for existing products:

```sql
-- Example: Set 20% discount on all products in Bomba Hidráulica category
UPDATE products 
SET 
  discount_enabled = TRUE,
  discounted_price = price * 0.8
WHERE category = 'Bomba Hidráulica';

-- Example: Set specific discounted price for one product
UPDATE products 
SET 
  discount_enabled = TRUE,
  discounted_price = 150.00
WHERE id = 'product-id-here';

-- Disable discount on all products
UPDATE products 
SET discount_enabled = FALSE;
```

## Rollback (If Needed)

If you need to remove the discount system:

```sql
-- Remove columns
ALTER TABLE products DROP COLUMN discount_enabled;
ALTER TABLE products DROP COLUMN discounted_price;

-- Or just disable all discounts without removing columns
UPDATE products SET discount_enabled = FALSE;
```

## Testing

After migration:

1. **In Admin Panel:**
   - Create/edit a product
   - Toggle the "Habilitar Descuento" switch
   - Enter a discounted price lower than original
   - Verify percentage calculation appears
   - Save and verify it persists

2. **In Product Cards:**
   - Navigate to catalog
   - Verify products with discounts show both prices
   - Verify discount percentage is calculated correctly

3. **In Product Detail:**
   - Click on discounted product
   - Verify large price display shows discount details

## API Endpoints

### Create Product (POST /api/products)

```json
{
  "name": "Product Name",
  "price": 100,
  "discounted_price": 75,
  "discount_enabled": true,
  ...other fields
}
```

### Update Product (PUT /api/products/:id)

```json
{
  "price": 100,
  "discounted_price": 75,
  "discount_enabled": true
}
```

### Validation Rules
- If `discount_enabled` is true:
  - Both prices must be > 0
  - `discounted_price` must be < `price`
  - Returns 400 error if validation fails
- If `discount_enabled` is false:
  - `discounted_price` is ignored (set to null)

## Performance Considerations

- The `discount_enabled` column has an index for quick filtering
- Discounts are calculated client-side (no server overhead)
- No additional API calls required for discount data
- Full backward compatibility with existing products

## Notes

- Original `price` column remains unchanged
- All existing products work without discounts by default
- No breaking changes to API or database structure
- Discount percentages are calculated dynamically
