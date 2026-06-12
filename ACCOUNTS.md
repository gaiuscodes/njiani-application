# Njiani System - Account Login Details

## Quick Reference

### Admin Account

- **Phone/Username:** `admin`
- **Password:** `King2025`
- **Login URL:** `/admin/login`
- **Note:** Can login with phone "admin" or email (if set)

---

## Account Summary

Run the following command to see all accounts:

```bash
cd backend
node scripts/listAccounts.js
```

## Login Instructions

### For Shops:

1. Go to `/shop/login`
2. Enter **Email** OR **Phone Number**
3. Enter your **Password**
4. Click "Login"

### For Riders:

1. Go to `/rider/login`
2. Enter **Email** OR **Phone Number**
3. Enter your **Password**
4. Click "Login"

### For Admin:

1. Go to `/admin/login`
2. Enter **Phone/Username:** `admin`
3. Enter **Password:** `King2025`
4. Click "Login"

---

## Password Reset

If you forgot your password:

1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Check your email for the reset link
4. If email is not configured, check the backend console for the reset link

---

## Notes

- Passwords are securely hashed and cannot be retrieved
- Use the "Forgot Password" feature to reset passwords
- Email verification is required for shops and riders during registration
- Login works with either email or phone number for all roles








