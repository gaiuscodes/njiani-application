import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Check if email is configured
const isEmailConfigured = () => {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
};

// Create transporter - supports Gmail, Outlook, and custom SMTP
const createTransporter = () => {
  // Check if email is configured
  if (!isEmailConfigured()) {
    return null;
  }

  // If using Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App password for Gmail
      }
    });
  }

  // If using Outlook/Hotmail
  if (process.env.EMAIL_SERVICE === 'outlook') {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Custom SMTP (default)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

export const sendVerificationEmail = async (email, verificationToken, shopName) => {
  // Check if email is configured
  if (!isEmailConfigured()) {
    console.log('⚠️  Email not configured. Skipping email send.');
    console.log('📧 Verification URL for development:', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`);
    // In development, we'll allow registration to continue
    // The user can use the resend verification endpoint or verify manually
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service not configured. Please contact administrator.');
    }
    // In development, return success but log the verification URL
    return { 
      success: true, 
      simulated: true,
      verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`
    };
  }

  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      throw new Error('Failed to create email transporter');
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"Njiani" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Njiani Shop Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #F97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Njiani</h1>
              <p>Mizigo njiani</p>
            </div>
            <div class="content">
              <h2>Welcome to Njiani, ${shopName}!</h2>
              <p>Thank you for registering your shop on Njiani. To complete your registration and start receiving delivery orders, please verify your email address.</p>
              <p>Click the button below to verify your email:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${verificationUrl}</p>
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with Njiani, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Njiani. All rights reserved.</p>
              <p>Built by Gaius</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Njiani, ${shopName}!
        
        Thank you for registering your shop on Njiani. To complete your registration, please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with Njiani, please ignore this email.
        
        © ${new Date().getFullYear()} Njiani. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  if (!isEmailConfigured()) {
    console.warn(`Email service not configured. In development, use this link to reset password: ${resetUrl}`);
    return { success: true, simulated: true, resetUrl: resetUrl };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Email transporter could not be created due to missing configuration.');
    }
    
    const mailOptions = {
      from: `"Njiani" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Njiani Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #F97316; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Njiani</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Njiani. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

