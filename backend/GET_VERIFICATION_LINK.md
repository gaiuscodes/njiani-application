# How to Get Your Verification Link

If you haven't received the verification email, here are several ways to get your verification link:

## Method 1: Check Server Console (Development)

When you register, if email is not configured, the verification URL is logged to the server console. Check your backend server terminal for a message like:

```
═══════════════════════════════════════════════════════
📧 EMAIL VERIFICATION (DEVELOPMENT MODE)
═══════════════════════════════════════════════════════
Email not configured. Use this link to verify:
http://localhost:5173/verify-email?token=YOUR_TOKEN_HERE
═══════════════════════════════════════════════════════
```

## Method 2: Use Resend Verification Feature

1. Go to the verification page: `http://localhost:5173/verify-email`
2. Enter your email address
3. Click "Resend Verification Email"
4. If email is not configured, the verification URL will be shown in an alert

## Method 3: API Endpoint (If Logged In)

If you're logged in (even with unverified email), you can get your verification link via API:

```bash
GET http://localhost:5000/api/auth/verification-link
```

This requires authentication (cookie with token).

## Method 4: Check Gmail Settings

If email IS configured but you're not receiving emails:

1. **Check Spam/Junk Folder** - Gmail sometimes filters verification emails
2. **Check Gmail Security Settings**:
   - Go to https://myaccount.google.com/security
   - Enable "Less secure app access" (if using regular password)
   - OR use an App Password (recommended)

## Setting Up Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Enable 2-Step Verification
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate a new app password for "Mail"
5. Use this 16-character password in your `.env` file:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
FRONTEND_URL=http://localhost:5173
```

## Quick Fix: Manual Verification (Development Only)

If you need to verify immediately for testing, you can:

1. Check the backend console logs when you register
2. Copy the verification URL
3. Paste it in your browser
4. Your account will be verified








