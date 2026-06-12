import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      console.log('No token in cookies. Cookies:', req.cookies);
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Fetch user - don't use lean() to keep it as Mongoose document
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.error('User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'User not found' });
    }

    // Ensure user object has role
    if (!user.role) {
      console.error('User missing role field. User ID:', user._id, 'User:', user.toObject());
      return res.status(401).json({ message: 'User role not found' });
    }

    // Debug log for rider routes
    if (req.path && req.path.includes('/rider/')) {
      console.log('Protect middleware - User role:', user.role, 'User ID:', user._id, 'Status:', user.status);
      console.log('User object type:', typeof user.role, 'User is Mongoose doc:', user.constructor.name);
    }

    // Ensure user object is properly set
    req.user = user;
    
    // Double-check role is accessible
    if (!req.user.role) {
      console.error('CRITICAL: User role is missing after setting req.user');
      console.error('User object keys:', Object.keys(req.user.toObject ? req.user.toObject() : req.user));
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

export const riderOnly = (req, res, next) => {
  if (!req.user) {
    console.error('RiderOnly: No user in request');
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Get role - handle Mongoose document
  let userRole = req.user.role;
  
  // If it's a Mongoose document, get the value directly
  if (req.user.get && typeof req.user.get === 'function') {
    userRole = req.user.get('role');
  }
  
  // Convert to string and normalize
  const roleString = String(userRole || '').trim().toLowerCase();
  
  // Debug log
  console.log('RiderOnly check:', {
    userId: req.user._id,
    role: userRole,
    roleString: roleString,
    isRider: roleString === 'rider'
  });
  
  // Grant access to all riders regardless of status
  if (roleString === 'rider') {
    console.log('✅ Rider access granted for:', req.user._id);
    next();
  } else {
    console.error('❌ Rider access denied:', {
      userId: req.user._id,
      role: userRole,
      roleString: roleString
    });
    res.status(403).json({ 
      message: 'Rider access required',
      userRole: userRole,
      userId: req.user._id
    });
  }
};

export const shopOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.role !== 'shop') {
    return res.status(403).json({ message: 'Shop access required' });
  }
  
  // Email verification is no longer required for login/access
  // It's only required during registration
  // Users can access dashboard even if email is not verified
  next();
};

