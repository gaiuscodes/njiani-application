# M-Pesa Integration Setup Guide

## Current Status

The M-Pesa integration is configured to work in two modes:

### 1. Development Mode (Simulated)

When M-Pesa credentials are not configured, the system automatically simulates successful payments in development mode. This allows you to test the wallet top-up functionality without needing actual M-Pesa credentials.

**How it works:**

- When you try to top up via M-Pesa without credentials configured
- The system automatically adds the amount to your wallet
- A simulated transaction is created with receipt number `SIM-{timestamp}`
- This only works when `NODE_ENV` is not set to `production`

### 2. Production Mode (Real M-Pesa)

To use real M-Pesa payments, you need to configure M-Pesa Daraja API credentials.

## Setting Up M-Pesa (Optional - for Production)

### Step 1: Get M-Pesa Daraja API Credentials

1. Go to https://developer.safaricom.co.ke/
2. Create an account or log in
3. Create a new app to get:
   - Consumer Key
   - Consumer Secret
   - Shortcode (Paybill or Till number)
   - Passkey

### Step 2: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# M-Pesa Daraja API Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey_here
MPESA_ENVIRONMENT=sandbox  # or 'production' for live
MPESA_CALLBACK_URL=http://localhost:5000/api/mpesa/callback
```

### Step 3: For Production

1. Update `MPESA_ENVIRONMENT=production`
2. Update `MPESA_SHORTCODE` to your production shortcode
3. Update `MPESA_CALLBACK_URL` to your production backend URL (must be HTTPS)
4. Update `MPESA_PASSKEY` to your production passkey

## Testing Without M-Pesa Credentials

**You don't need M-Pesa credentials to test!**

The system will automatically simulate payments when:

- M-Pesa credentials are not configured
- Running in development mode (`NODE_ENV` is not `production`)

Just try to top up your wallet, and it will work automatically with simulated payments.

## Troubleshooting

### Error: "M-Pesa service not configured"

**Solution 1: Use Development Mode (Recommended for Testing)**

- Make sure `NODE_ENV` is not set to `production` in your `.env` file
- Or remove `NODE_ENV` from `.env` entirely
- The system will automatically simulate payments

**Solution 2: Configure M-Pesa Credentials**

- Follow the setup steps above
- Add your M-Pesa credentials to `backend/.env`
- Restart your backend server

**Solution 3: Use Manual Top-Up**

- In the shop dashboard, select "Manual" top-up method
- Contact admin to manually add funds to your wallet

## Current Behavior

✅ **Development Mode (No Credentials)**: Automatically simulates payments
✅ **Development Mode (With Credentials)**: Uses real M-Pesa sandbox
✅ **Production Mode (With Credentials)**: Uses real M-Pesa production API
❌ **Production Mode (No Credentials)**: Returns error (for security)








