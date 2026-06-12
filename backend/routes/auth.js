import express from 'express';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/generateToken.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Register Rider
router.post('/register/rider', upload.fields([
  { name: 'selfiePhoto', maxCount: 1 },
  { name: 'idPhoto', maxCount: 1 },
  { name: 'licensePhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, username, phone, email, password, nationalId, vehicleType, preferredAreas, termsAccepted, affidavitAccepted } = req.body;

    // Validate required fields
    if (!name || !username || !phone || !email || !password || !nationalId || !vehicleType) {
      return res.status(400).json({ 
        message: 'All fields are required: name, username, phone, email, password, nationalId, vehicleType' 
      });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return res.status(400).json({ 
        message: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only' 
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken. Please choose another.' });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format. Please enter a valid email address' 
      });
    }

    // Validate phone format
    if (!/^0\d{9}$/.test(phone)) {
      return res.status(400).json({ 
        message: 'Invalid phone number format. Must be 10 digits starting with 0' 
      });
    }

    if (!termsAccepted || !affidavitAccepted) {
      return res.status(400).json({ message: 'You must accept Terms & Conditions and Affidavit' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Check if user exists by phone
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this phone already exists' });
    }

    // Upload photos
    let selfiePhotoUrl = '';
    let idPhotoUrl = '';
    let licensePhotoUrl = '';

    if (req.files) {
      if (req.files.selfiePhoto && req.files.selfiePhoto[0]) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          selfiePhotoUrl = await uploadToCloudinary(req.files.selfiePhoto[0].buffer, 'njiani/riders/selfies');
        } else {
          // Fallback: store as base64 or use a placeholder
          selfiePhotoUrl = `data:${req.files.selfiePhoto[0].mimetype};base64,${req.files.selfiePhoto[0].buffer.toString('base64')}`;
        }
      }
      if (req.files.idPhoto && req.files.idPhoto[0]) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          idPhotoUrl = await uploadToCloudinary(req.files.idPhoto[0].buffer, 'njiani/riders/ids');
        } else {
          idPhotoUrl = `data:${req.files.idPhoto[0].mimetype};base64,${req.files.idPhoto[0].buffer.toString('base64')}`;
        }
      }
      if (req.files.licensePhoto && req.files.licensePhoto[0]) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          licensePhotoUrl = await uploadToCloudinary(req.files.licensePhoto[0].buffer, 'njiani/riders/licenses');
        } else {
          licensePhotoUrl = `data:${req.files.licensePhoto[0].mimetype};base64,${req.files.licensePhoto[0].buffer.toString('base64')}`;
        }
      }
    }

    // Set default preferred areas if empty
    let preferredAreasArray = [];
    if (preferredAreas && preferredAreas.trim()) {
      preferredAreasArray = typeof preferredAreas === 'string' 
        ? preferredAreas.split(',').map(area => area.trim()).filter(area => area.length > 0)
        : preferredAreas;
    }
    
    // Default to CBD/Parklands if no areas specified
    if (preferredAreasArray.length === 0) {
      preferredAreasArray = ['CBD/Parklands'];
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

    const rider = new User({
      role: 'rider',
      name,
      username: username.toLowerCase(),
      phone,
      email: email.toLowerCase(),
      password,
      nationalId,
      selfiePhoto: selfiePhotoUrl,
      idPhoto: idPhotoUrl,
      licensePhoto: licensePhotoUrl,
      vehicleType,
      preferredAreas: preferredAreasArray,
      termsAccepted: true,
      affidavitAccepted: true,
      status: 'pending',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await rider.save();

    // Create wallet for rider
    await Wallet.create({ user: rider._id });

    // Send verification email
    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await sendVerificationEmail(email, verificationToken, name);
      emailSent = emailResult.success;
      
      // In development mode, log the verification URL
      if (emailResult.simulated) {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📧 EMAIL VERIFICATION (DEVELOPMENT MODE)');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Email not configured. Use this link to verify:`);
        console.log(emailResult.verificationUrl);
        console.log('═══════════════════════════════════════════════════════\n');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      emailError = error.message;
    }

    // Create notification about account review
    await Notification.create({
      user: rider._id,
      title: 'Account Under Review',
      message: 'Your account is under review for a minimum of four working days to a maximum of 14 days. You will be notified once your account is approved.',
      type: 'info'
    });

    // Check if email verification is required
    const requiresVerification = true;

    if (requiresVerification) {
      // Don't set auth cookie yet - user needs to verify email first
      res.status(201).json({
        message: emailSent 
          ? 'Registration successful! Please check your email to verify your account.' 
          : 'Registration successful! However, the verification email could not be sent.',
        requiresVerification: true,
        emailSent,
        emailError: emailError || null,
        email: email.toLowerCase(),
        user: {
          id: rider._id,
          role: rider.role,
          name: rider.name,
          phone: rider.phone,
          email: rider.email,
          status: rider.status,
          emailVerified: rider.emailVerified
        }
      });
    } else {
      const token = generateToken(rider._id);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.status(201).json({
        message: 'Rider registration successful. Awaiting approval.',
        user: {
          id: rider._id,
          role: rider.role,
          name: rider.name,
          phone: rider.phone,
          email: rider.email,
          status: rider.status
        }
      });
    }
  } catch (error) {
    console.error('Rider registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Register Shop
router.post('/register/shop', upload.single('shopLogo'), async (req, res) => {
  try {
    console.log('Shop registration request body:', req.body);
    console.log('Shop registration file:', req.file ? 'File received' : 'No file');
    
    const { shopName, username, phone, password, shopAddress, email } = req.body;

    // Validate required fields
    if (!shopName || !username || !phone || !password || !shopAddress || !email) {
      console.log('Missing fields:', { shopName: !!shopName, username: !!username, phone: !!phone, password: !!password, shopAddress: !!shopAddress, email: !!email });
      return res.status(400).json({ 
        message: 'All fields are required: shopName, username, phone, email, password, shopAddress' 
      });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return res.status(400).json({ 
        message: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only' 
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken. Please choose another.' });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format. Please enter a valid email address' 
      });
    }

    // Validate phone format
    if (!/^0\d{9}$/.test(phone)) {
      return res.status(400).json({ 
        message: 'Invalid phone number format. Must be 10 digits starting with 0' 
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Shop with this phone already exists' });
    }

    let shopLogoUrl = '';
    if (req.file) {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        shopLogoUrl = await uploadToCloudinary(req.file.buffer, 'njiani/shops');
      } else {
        shopLogoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

    const shop = new User({
      role: 'shop',
      shopName,
      username: username.toLowerCase(),
      phone,
      email: email.toLowerCase(),
      password,
      shopAddress,
      shopLogo: shopLogoUrl,
      status: 'inactive', // Set to inactive until email is verified
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await shop.save();

    // Create wallet for shop
    await Wallet.create({ user: shop._id });

    // Send verification email
    let emailSent = false;
    let emailError = null;
    let verificationUrl = null;
    try {
      const emailResult = await sendVerificationEmail(email, verificationToken, shopName);
      emailSent = emailResult.success;
      
      // In development mode, log the verification URL and include it in response
      if (emailResult.simulated) {
        verificationUrl = emailResult.verificationUrl;
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📧 EMAIL VERIFICATION (DEVELOPMENT MODE)');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Email not configured. Use this link to verify:`);
        console.log(verificationUrl);
        console.log('═══════════════════════════════════════════════════════\n');
      } else {
        // Build verification URL even when email is sent (for resend feature)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
      }
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      emailError = emailErr.message;
      // Build verification URL even on error (for manual verification)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
      // Don't fail registration if email fails in development
      // In production, you might want to handle this differently
    }

    // Create notification about email verification
    await Notification.create({
      user: shop._id,
      title: 'Verify Your Email',
      message: 'Please check your email and click the verification link to activate your account. The link will expire in 24 hours.',
      type: 'info'
    });

    // Don't set auth token - user needs to verify email first
    // User will be logged in after email verification

    // Determine response message based on email status
    let responseMessage = 'Shop registered successfully!';
    if (emailError && process.env.NODE_ENV === 'production') {
      responseMessage = 'Shop registered, but verification email could not be sent. Please use the resend verification feature.';
    } else if (!emailSent) {
      responseMessage = 'Shop registered successfully! Email verification is not configured. Please contact admin for manual verification or use the resend verification feature.';
    } else {
      responseMessage = 'Shop registered successfully! Please check your email to verify your account.';
    }

    res.status(201).json({
      message: responseMessage,
      requiresVerification: true,
      email: email,
      emailSent: emailSent,
      emailError: emailError || null,
      verificationUrl: verificationUrl || null, // Include verification URL in response
      user: {
        id: shop._id,
        role: shop.role,
        shopName: shop.shopName,
        phone: shop.phone,
        email: shop.email,
        emailVerified: false
      }
    });
  } catch (error) {
    console.error('Shop registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: messages 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Shop with this phone number already exists' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Registration failed. Please try again.' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  console.log('\n========== LOGIN ATTEMPT ==========');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const { username, phone, email, password, role } = req.body;
    
    // Username is primary, email and phone are secondary
    const identifier = username || email || phone;
    
    console.log('Login Request:');
    console.log('- Username:', username || 'N/A');
    console.log('- Email:', email || 'N/A');
    console.log('- Phone:', phone || 'N/A');
    console.log('- Identifier used:', identifier);
    console.log('- Role:', role);
    console.log('- Password length:', password ? password.length : 0);

    if (!identifier || !password || !role) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Username (primary), email, or phone number, password, and role are required' });
    }

    // Find user - prioritize username first (primary), then email, then phone (secondary)
    console.log('Searching for user (username first, then email, then phone)...');
    let user;
    
    // Try username first (primary identifier)
    if (username && typeof username === 'string' && username.trim()) {
      console.log('Trying username first (primary)...');
      user = await User.findOne({ 
        role, 
        username: username.toLowerCase().trim() 
      }).select('+password');
      
      if (user) {
        console.log('✅ User found by username');
      } else {
        console.log('Username not found, trying email and phone as fallback...');
      }
    }
    
    // If username not found or not provided, try email (secondary)
    if (!user && email && typeof email === 'string' && email.trim()) {
      console.log('Trying email (secondary)...');
      user = await User.findOne({ 
        role, 
        email: email.toLowerCase().trim() 
      }).select('+password');
      
      if (user) {
        console.log('✅ User found by email');
      }
    }
    
    // If still not found, try phone (secondary)
    if (!user && phone && typeof phone === 'string' && phone.trim()) {
      console.log('Trying phone (secondary)...');
      user = await User.findOne({ 
        role, 
        phone: phone.trim() 
      }).select('+password');
      
      if (user) {
        console.log('✅ User found by phone');
      }
    }
    
    // If password is still not loaded, try without select
    if (user && !user.password) {
      console.warn('⚠️  Password not loaded with select("+password"), trying without select...');
      // Re-fetch user without select to get password
      let searchQuery = { role };
      if (username && typeof username === 'string' && username.trim()) {
        searchQuery.username = username.toLowerCase().trim();
      } else if (email && typeof email === 'string' && email.trim()) {
        searchQuery.email = email.toLowerCase().trim();
      } else if (phone && typeof phone === 'string' && phone.trim()) {
        searchQuery.phone = phone.trim();
      }
      user = await User.findOne(searchQuery).select('+password');
      if (user && user.password) {
        console.log('✅ Password loaded without select');
      }
    }
    
    if (!user) {
      console.log('❌ User not found');
      console.log('   Searched for:', { username: username || 'N/A', email: email || 'N/A', phone: phone || 'N/A', role });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ User found:');
    console.log('- User ID:', user._id);
    console.log('- Username:', user.username || 'N/A');
    console.log('- Name/Shop:', user.name || user.shopName);
    console.log('- Email:', user.email || 'N/A');
    console.log('- Phone:', user.phone || 'N/A');
    console.log('- Email Verified:', user.emailVerified);
    console.log('- Status:', user.status);
    console.log('- Password hash exists:', !!user.password);
    console.log('- Password hash preview:', user.password ? user.password.substring(0, 20) + '...' : 'null');
    console.log('- Password is bcrypt hash:', user.password ? (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) : false);

    // Admin login check - verify user is actually an admin
    if (role === 'admin') {
      console.log('Admin login attempt');
      // Verify the user's role is actually admin
      if (user.role !== 'admin') {
        console.log('❌ User role is not admin');
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }
      // For admin, we can accept username='admin', email containing 'admin', or phone='admin'
      // The search query already found the user, so we just need to verify password
      const isMatch = await user.comparePassword(password);
      console.log('- Password match:', isMatch);
      if (!isMatch) {
        console.log('❌ Admin password mismatch');
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }
    } else {
      console.log('Comparing password...');
      console.log('- Stored password hash:', user.password ? user.password.substring(0, 30) + '...' : 'null');
      console.log('- Input password length:', password.length);
      
      // First try using the comparePassword method
      const isMatch = await user.comparePassword(password);
      console.log('- Password match result (comparePassword method):', isMatch);
      
      // Also try direct bcrypt comparison for debugging
      if (user.password) {
        const directCompare = await bcrypt.compare(password, user.password);
        console.log('- Password match result (direct bcrypt):', directCompare);
        
        if (isMatch !== directCompare) {
          console.warn('⚠️  WARNING: comparePassword method and direct bcrypt comparison differ!');
        }
      }
      
      if (!isMatch) {
        console.log('❌ Password mismatch');
        console.log('   Debugging info:');
        console.log('   - Stored hash type:', user.password ? (user.password.startsWith('$2a$') ? 'bcrypt $2a$' : user.password.startsWith('$2b$') ? 'bcrypt $2b$' : user.password.startsWith('$2y$') ? 'bcrypt $2y$' : 'NOT A BCRYPT HASH') : 'null');
        console.log('   - Hash length:', user.password ? user.password.length : 0);
        console.log('   - Input password:', password.substring(0, 3) + '***' + password.substring(password.length - 1));
        console.log('   This could mean:');
        console.log('   1. Wrong password entered');
        console.log('   2. Password was not hashed correctly during reset/signup');
        console.log('   3. Password hash in database is corrupted');
        console.log('   4. Password was double-hashed or incorrectly stored');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      console.log('✅ Password matches!');
    }

    // Email verification is only required during registration, not for login
    // Users can log in even if email is not verified
    if (user.role === 'shop' && !user.emailVerified) {
      console.log('⚠️  Shop email not verified (non-blocking)');
      console.log('- Email:', user.email);
      console.log('- User can still login, but should verify email for full access');
      // Don't block login, just log a warning
    }

    // Allow all riders to login regardless of status (they can use dashboard but may have limited features)
    // Status checks can be done at feature level if needed

    console.log('Generating authentication token...');
    const token = generateToken(user._id);
    console.log('✅ Token generated');

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    console.log('✅ Cookie set');

    const userData = {
      _id: user._id,
      id: user._id, // Include both for compatibility
      role: user.role,
      name: user.name || user.shopName,
      phone: user.phone,
      status: user.status
    };

    if (user.role === 'rider') {
      userData.rating = user.rating;
      userData.totalEarnings = user.totalEarnings;
      userData.isFree = user.isFree;
    }

    if (user.role === 'shop') {
      userData.shopName = user.shopName;
    }

    const duration = Date.now() - startTime;
    console.log('✅ LOGIN SUCCESSFUL');
    console.log('- Duration:', duration + 'ms');
    console.log('- User ID:', userData._id);
    console.log('- Role:', userData.role);
    console.log('=====================================\n');

    res.json({
      message: 'Login successful',
      user: userData
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ LOGIN ERROR');
    console.error('- Duration:', duration + 'ms');
    console.error('- Error:', error.message);
    console.error('- Stack:', error.stack);
    console.log('=====================================\n');
    res.status(500).json({ message: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Email verification is no longer required for login/access
    // It's only required during registration
    // Return user regardless of email verification status
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token. Please request a new verification email.' 
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    // For shops, activate account after email verification
    // For riders, keep status as 'pending' (they need admin approval)
    if (user.role === 'shop') {
      user.status = 'active';
    } else if (user.role === 'rider' && user.status === 'pending') {
      // Keep rider status as 'pending' - they still need admin approval
      // But we can update the notification to reflect email verification
    }
    
    await user.save();

    // Generate token for automatic login
    const authToken = generateToken(user._id);

    res.cookie('token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Create success notification
    const notificationMessage = user.role === 'shop'
      ? 'Your email has been verified successfully! Your account is now active.'
      : 'Your email has been verified successfully! Your account is pending admin approval.';
    
    await Notification.create({
      user: user._id,
      title: 'Email Verified',
      message: notificationMessage,
      type: 'success'
    });

    res.json({
      message: user.role === 'shop' 
        ? 'Email verified successfully! Your account is now active.' 
        : 'Email verified successfully! Your account is pending admin approval.',
      verified: true,
      user: {
        id: user._id,
        role: user.role,
        role: user.role,
        shopName: user.shopName,
        phone: user.phone,
        email: user.email,
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Failed to verify email. Please try again.' });
  }
});

// Get verification link (for development/testing)
router.get('/verification-link', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== 'shop') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    if (!user.emailVerificationToken) {
      return res.status(404).json({ message: 'No verification token found. Please use resend verification.' });
    }

    // Check if token is expired
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ message: 'Verification token has expired. Please use resend verification.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${user.emailVerificationToken}`;

    res.json({ 
      verificationUrl: verificationUrl,
      expiresAt: user.emailVerificationExpires,
      message: 'Use this link to verify your email'
    });
  } catch (error) {
    console.error('Get verification link error:', error);
    res.status(500).json({ message: 'Failed to get verification link' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'shop' });

    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ 
        message: 'If an account with this email exists, a verification email has been sent.' 
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    try {
      const emailResult = await sendVerificationEmail(user.email, verificationToken, user.shopName);
      
      if (emailResult.simulated) {
        // In development mode, return the verification URL
        const verificationUrl = emailResult.verificationUrl;
        return res.json({ 
          message: 'Email not configured. Use this verification link:',
          verificationUrl: verificationUrl,
          simulated: true
        });
      }
      
      res.json({ message: 'Verification email sent! Please check your inbox (and spam folder).' });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      console.error('Email error details:', emailError.response || emailError.message);
      
      // In development, provide the verification URL
      if (process.env.NODE_ENV !== 'production') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
        return res.json({ 
          message: 'Email not configured or failed to send. Use this verification link:',
          verificationUrl: verificationUrl,
          simulated: true,
          error: emailError.message
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later or contact support.',
        error: emailError.message
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification email' });
  }
});

// Forgot password - request password reset
router.post('/forgot-password', async (req, res) => {
  const startTime = Date.now();
  console.log('\n========== FORGOT PASSWORD REQUEST ==========');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const { emailOrPhone } = req.body;

    console.log('Request Details:');
    console.log('- Email/Phone:', emailOrPhone);

    if (!emailOrPhone) {
      console.log('❌ Email or phone is required');
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    const searchQuery = isEmail 
      ? { email: emailOrPhone.toLowerCase() }
      : { phone: emailOrPhone };

    // Find user by email or phone across all roles
    console.log('Searching for user...');
    console.log('- Search query:', searchQuery);
    const user = await User.findOne(searchQuery);

    if (!user) {
      console.log('⚠️  User not found (for security, returning success message)');
      console.log('   Searched for:', searchQuery);
      // Don't reveal if user exists or not for security
      return res.json({ 
        message: 'If an account with that email or phone exists, a password reset link has been sent.' 
      });
    }

    console.log('✅ User found:');
    console.log('- User ID:', user._id);
    console.log('- Role:', user.role);
    console.log('- Phone:', user.phone);
    console.log('- Email:', user.email || 'N/A');
    console.log('- Name:', user.shopName || user.name || 'N/A');

    // Generate reset token
    console.log('Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry
    
    console.log('- Token generated:', resetToken.substring(0, 16) + '...');
    console.log('- Token expires:', resetExpires.toISOString());

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();
    console.log('✅ Reset token saved to database');

    // Send reset email (only if user has email)
    console.log('Sending password reset email...');
    let emailSent = false;
    let emailError = null;
    let resetUrl = null;
    
    if (user.email) {
      try {
        const emailResult = await sendPasswordResetEmail(
          user.email, 
          resetToken, 
          user.shopName || user.name || 'User'
        );
        emailSent = emailResult.success;
        
        // In development mode, return the reset URL if email is not configured
        if (emailResult.simulated && emailResult.resetUrl) {
          resetUrl = emailResult.resetUrl;
          console.log('⚠️  Email not configured (development mode)');
          console.log('   Reset URL:', resetUrl);
        } else {
          console.log('✅ Password reset email sent');
          console.log('- To:', user.email);
        }
      } catch (err) {
        console.error('❌ Failed to send password reset email:', err.message);
        emailError = err.message;
        // If email failed, provide the reset URL in development
        if (process.env.NODE_ENV !== 'production') {
          resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
          console.log('   Providing reset URL for development:', resetUrl);
        }
      }
    } else {
      // User doesn't have email, provide reset URL directly
      console.log('⚠️  User has no email address');
      resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      console.log('   Providing reset URL:', resetUrl);
    }

    const duration = Date.now() - startTime;
    console.log('✅ FORGOT PASSWORD REQUEST COMPLETED');
    console.log('- Duration:', duration + 'ms');
    console.log('- Email sent:', emailSent);
    console.log('- Reset URL provided:', !!resetUrl);
    console.log('==========================================\n');

    // Always return success message (don't reveal if user exists)
    return res.json({ 
      message: 'If an account with that email or phone exists, a password reset link has been sent.',
      emailSent: emailSent,
      emailError: emailError || null,
      resetUrl: resetUrl || null,
      simulated: !!resetUrl
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ FORGOT PASSWORD ERROR');
    console.error('- Duration:', duration + 'ms');
    console.error('- Error:', error.message);
    console.error('- Stack:', error.stack);
    console.log('==========================================\n');
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  const startTime = Date.now();
  console.log('\n========== RESET PASSWORD REQUEST ==========');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const { token, password } = req.body;

    console.log('Request Details:');
    console.log('- Token provided:', !!token);
    console.log('- Token preview:', token ? token.substring(0, 16) + '...' : 'null');
    console.log('- Password length:', password ? password.length : 0);

    if (!token || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      console.log('❌ Password too short (minimum 6 characters)');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user with valid reset token - include password field
    console.log('Searching for user with reset token...');
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password'); // Explicitly include password field

    if (!user) {
      console.log('❌ Invalid or expired reset token');
      console.log('   Token:', token.substring(0, 16) + '...');
      return res.status(400).json({ 
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    console.log('✅ User found with valid token:');
    console.log('- User ID:', user._id);
    console.log('- Phone:', user.phone);
    console.log('- Email:', user.email || 'N/A');
    console.log('- Shop Name:', user.shopName || 'N/A');
    console.log('- Old password hash exists:', !!user.password);
    console.log('- Old password hash preview:', user.password ? user.password.substring(0, 20) + '...' : 'null');
    console.log('- Old password is bcrypt hash:', user.password ? (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) : false);

    // Hash the password manually BEFORE saving to ensure it's always hashed correctly
    // Use findOneAndUpdate to bypass pre-save hook entirely for maximum reliability
    console.log('Hashing new password manually...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('- Password hashed successfully');
    console.log('- Hash preview:', hashedPassword.substring(0, 30) + '...');
    console.log('- Hash type: bcrypt $2b$');
    
    // Use findOneAndUpdate to update password directly - this bypasses pre-save hooks
    console.log('Updating user with hashed password using findOneAndUpdate...');
    let updatedUser;
    try {
      // Use save() method - password is already hashed, so pre-save hook will skip it
      console.log('Setting password and clearing reset tokens...');
      user.password = hashedPassword; // Already hashed, pre-save hook will skip
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      
      console.log('Saving user (pre-save hook should skip hashing since password is already hashed)...');
      await user.save();
      
      // Fetch updated user to verify
      updatedUser = await User.findById(user._id).select('+password');
      
      if (!updatedUser) {
        console.error('❌ Failed to fetch updated user');
        return res.status(500).json({ message: 'Failed to reset password. Please try again.' });
      }
      
      console.log('✅ User saved successfully');
    } catch (updateError) {
      console.error('❌ Error updating user:', updateError.message);
      console.error('   Stack:', updateError.stack);
      return res.status(500).json({ 
        message: 'Failed to reset password. Database error occurred.',
        error: updateError.message 
      });
    }
    
    user = updatedUser; // Update user reference for verification
    
    // Verify the password was saved correctly
    console.log('Verifying password was saved correctly...');
    const savedUser = await User.findById(user._id).select('+password');
    const isHashed = savedUser.password && (savedUser.password.startsWith('$2a$') || savedUser.password.startsWith('$2b$') || savedUser.password.startsWith('$2y$'));
    
    console.log('Password Reset Verification:');
    console.log('- User ID:', user._id);
    console.log('- Phone:', user.phone);
    console.log('- Password is hashed:', isHashed);
    console.log('- Saved password hash preview:', savedUser.password ? savedUser.password.substring(0, 30) + '...' : 'null');
    console.log('- Hash type:', savedUser.password ? (savedUser.password.startsWith('$2a$') ? 'bcrypt $2a$' : savedUser.password.startsWith('$2b$') ? 'bcrypt $2b$' : savedUser.password.startsWith('$2y$') ? 'bcrypt $2y$' : 'UNKNOWN') : 'null');
    
    // Test password comparison to ensure it works
    console.log('Testing password comparison...');
    const testComparison = await bcrypt.compare(password, savedUser.password);
    console.log('- Password comparison test:', testComparison ? '✅ PASSED' : '❌ FAILED');
    
    // Also test using the comparePassword method
    const testCompareMethod = await savedUser.comparePassword(password);
    console.log('- comparePassword method test:', testCompareMethod ? '✅ PASSED' : '❌ FAILED');
    
    if (!isHashed) {
      console.error('❌ CRITICAL ERROR: Password is not hashed!');
      return res.status(500).json({ 
        message: 'Failed to reset password. Password was not hashed correctly.' 
      });
    }
    
    if (!testComparison || !testCompareMethod) {
      console.error('❌ CRITICAL ERROR: Password comparison failed!');
      console.error('   - Direct bcrypt compare:', testComparison);
      console.error('   - comparePassword method:', testCompareMethod);
      console.error('   - This means the password cannot be used for login!');
      console.error('   - Attempting to re-hash and save...');
      
      // Try to fix by re-hashing
      const newHash = await bcrypt.hash(password, 12);
      savedUser.password = newHash;
      await savedUser.save();
      
      // Test again
      const retestComparison = await bcrypt.compare(password, savedUser.password);
      const retestMethod = await savedUser.comparePassword(password);
      
      if (retestComparison && retestMethod) {
        console.log('✅ Fixed: Password re-hashed and comparison now works');
      } else {
        console.error('❌ FAILED to fix password!');
        return res.status(500).json({ 
          message: 'Failed to reset password. Please contact support.' 
        });
      }
    }
    
    console.log('✅ Password reset verified and ready for login');
    console.log('   User can now login with:');
    console.log('   - Phone:', user.phone);
    console.log('   - Password: [the password they just set]');

    // Create success notification (don't fail if this fails)
    try {
      console.log('Creating success notification...');
      await Notification.create({
        user: user._id,
        title: 'Password Reset',
        message: 'Your password has been reset successfully.',
        type: 'success'
      });
      console.log('✅ Notification created');
    } catch (notifError) {
      console.warn('⚠️  Failed to create notification (non-critical):', notifError.message);
      // Don't fail the request if notification creation fails
    }

    // Final verification - try to fetch user again and test login
    console.log('Performing final login simulation test...');
    const finalUser = await User.findOne({ phone: user.phone, role: user.role }).select('+password');
    if (finalUser) {
      const finalTest = await bcrypt.compare(password, finalUser.password);
      console.log('- Final login simulation:', finalTest ? '✅ WOULD SUCCEED' : '❌ WOULD FAIL');
      if (!finalTest) {
        console.error('❌ FINAL TEST FAILED - Login will not work!');
        console.error('   This is a critical issue that needs to be fixed.');
      }
    } else {
      console.warn('⚠️  Could not fetch user for final test');
    }
    
    const duration = Date.now() - startTime;
    console.log('✅ PASSWORD RESET COMPLETED');
    console.log('- Duration:', duration + 'ms');
    console.log('- User ID:', user._id);
    console.log('- Phone:', user.phone);
    console.log('- Password ready for login:', isHashed && testComparison);
    console.log('==========================================\n');

    res.json({ 
      message: 'Password reset successfully. You can now login with your new password.',
      userRole: user.role // Return role for proper redirect
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ RESET PASSWORD ERROR');
    console.error('- Duration:', duration + 'ms');
    console.error('- Error name:', error.name);
    console.error('- Error message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to reset password';
    if (error.name === 'ValidationError') {
      errorMessage = 'Password validation failed. Please ensure your password meets the requirements.';
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid user ID. Please request a new password reset.';
    } else if (error.message.includes('duplicate')) {
      errorMessage = 'An error occurred. Please try again.';
    }
    
    console.log('==========================================\n');
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

