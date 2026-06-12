# Email Configuration Guide

This guide explains how to configure email sending for Njiani's email verification system.

## Supported Email Services

The system supports:

- Gmail
- Outlook/Hotmail
- Custom SMTP servers

## Environment Variables

Add these variables to your `.env` file in the `backend` directory:

### For Gmail:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

### For Outlook/Hotmail:

```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### For Custom SMTP:

```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

## Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate a new app password for "Mail"
5. Use this 16-character password in `EMAIL_PASSWORD`

## Testing Email Configuration

After setting up your email credentials, restart the backend server. When a shop registers, a verification email will be sent automatically.

## Development Mode

If email is not configured, the registration will still succeed, but the verification email won't be sent. The user will need to use the resend verification feature or contact support.

## Troubleshooting

- **Emails not sending**: Check that all environment variables are set correctly
- **Gmail errors**: Make sure you're using an App Password, not your regular password
- **SMTP errors**: Verify your SMTP server settings and port numbers
- **Check server logs**: Look for email-related error messages in the console








