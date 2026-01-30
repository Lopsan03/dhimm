# Address Persistence Debug Guide

## Quick Checklist

Follow these steps to diagnose and fix the address persistence issue:

### Step 1: Execute the SQL Migration

**CRITICAL:** This must be done first!

1. Open **Supabase Dashboard** (https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Paste this SQL:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS addresses TEXT[] DEFAULT ARRAY[]::TEXT[];
```

6. Click **Run**
7. Should see: "Success. No rows returned" ✅

### Step 2: Verify the Column was Added

In Supabase SQL Editor, run:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'addresses';
```

Expected output:
```
column_name | data_type
addresses   | ARRAY
```

If you see this, the column exists! ✅

### Step 3: Start the Backend Server

In a **NEW** terminal (separate from your frontend dev server):

```bash
cd C:\Users\games\OneDrive\Desktop\DHIMM
npm start
```

You should see:
```
✅ Backend server running on port 3001
📍 Webhook URL: http://localhost:3001/api/mp/webhook
```

**Keep this terminal open!** The backend must be running for addresses to save.

### Step 4: Test with Browser Console Open

1. Open your app in browser (http://localhost:3000)
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. **Keep console open** to see logs

### Step 5: Test Address Save

1. **Log in** to your account
2. Go to **Dashboard → Direcciones**
3. Click **Nueva Dirección**
4. Fill in ALL fields (name, lastName, email, phone, address, city, state, zip)
5. Click **Agregar Dirección**

**Check Console** - you should see:
```
🔄 handleUpdateUser called with addresses: 1 addresses
📤 Sending addresses to backend: http://localhost:3001 User ID: [your-user-id]
✅ Addresses saved to database: {success: true, addresses: [...]}
```

### Step 6: Verify in Supabase

Go to Supabase → **Table Editor** → **profiles** table

Find your user row and check the `addresses` column.

**Expected:** Should show an array with your address like:
```json
["[Casa] Juan Pérez | juan@example.com | 8112345678 | ..."]
```

### Step 7: Test Reload

1. **Log out** completely
2. **Log back in**
3. Go to **Dashboard → Direcciones**

**Check Console** - should see:
```
[login] 10b. addresses from profile: ["[Casa] Juan Pérez | juan@example.com | ..."]
```

Your addresses should appear! ✅

## Common Issues and Solutions

### Issue: "Failed to save addresses to database"

**Console shows:**
```
⚠️ Failed to save addresses to database: 404
```

**Solution:** Backend server is not running. Go to Step 3 and start the backend.

---

### Issue: "TypeError: Cannot read property 'addresses'"

**Console shows:**
```
❌ Could not save addresses to database: TypeError...
```

**Solution:** SQL migration not executed. Go to Step 1.

---

### Issue: Addresses save but disappear after logout

**In browser console, check:**
```
[login] 10b. addresses from profile: null
```

**Solutions:**
1. Verify SQL column exists (Step 2)
2. Check Supabase Table Editor - does your user row have addresses?
3. If addresses column is null, the save didn't work - check backend is running

---

### Issue: Backend won't start

**Error:**
```
Error: Cannot find module '@supabase/supabase-js'
```

**Solution:**
```bash
npm install
```

---

### Issue: "Not saving addresses - User ID: undefined"

**Console shows:**
```
⚠️ Not saving addresses - User ID: undefined Has addresses: true
```

**Solution:** User is not properly logged in. Log out completely and log back in.

---

## Testing Backend API Directly

You can test if the backend API works using PowerShell:

```powershell
$userId = "YOUR-USER-ID-HERE"  # Get from Supabase or console logs
$body = @{
    addresses = @(
        "[Test] Test User | test@test.com | 1234567890 | Test St, Test City, Test State, 12345, México"
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/user-addresses/$userId" `
    -Method PUT `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

Expected response:
```json
{
  "success": true,
  "addresses": [...]
}
```

## Final Verification Steps

1. ✅ SQL column exists in Supabase
2. ✅ Backend server is running (port 3001)
3. ✅ Frontend dev server is running (port 3000)
4. ✅ Console shows "Addresses saved to database"
5. ✅ Supabase Table Editor shows addresses
6. ✅ After logout/login, addresses are loaded
7. ✅ Addresses appear in Dashboard
8. ✅ Addresses auto-fill in Checkout

## Need More Help?

Share the console logs from:
1. When you add an address
2. When you log out
3. When you log back in

This will help identify exactly where the issue is.
