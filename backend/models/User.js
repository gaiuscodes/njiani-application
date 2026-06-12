import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'rider', 'shop'],
    required: true
  },
  // Username - Primary identifier across all accounts
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v) {
        // Username must be 3-30 characters, alphanumeric and underscores only
        return /^[a-z0-9_]{3,30}$/.test(v);
      },
      message: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only'
    }
  },
  // Common fields
  name: {
    type: String,
    required: function() { return this.role !== 'shop'; }
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        // Allow 'admin' for admin role, otherwise must be 10 digits starting with 0
        if (this.role === 'admin' && v === 'admin') {
          return true;
        }
        return /^0\d{9}$/.test(v);
      },
      message: 'Please enter a valid phone number (10 digits starting with 0) or "admin" for admin role'
    }
  },
  email: {
    type: String,
    required: function() { return this.role === 'shop' || this.role === 'rider'; },
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePicture: {
    type: String
  },
  transactionPin: {
    type: String,
    select: false, // Don't include in queries by default for security
    validate: {
      validator: function(v) {
        // PIN is optional, but if set, must be exactly 4 digits
        return !v || /^\d{4}$/.test(v);
      },
      message: 'Transaction PIN must be exactly 4 digits'
    }
  },
  // Shop specific
  shopName: {
    type: String,
    required: function() { return this.role === 'shop'; }
  },
  shopAddress: {
    type: String,
    required: function() { return this.role === 'shop'; }
  },
  shopLocation: {
    lat: Number,
    lng: Number
  },
  shopLogo: {
    type: String
  },
  shopCertified: {
    type: Boolean,
    default: false
  },
  shopRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  shopTotalRatings: {
    type: Number,
    default: 0
  },
  // Rider specific
  nationalId: {
    type: String,
    required: function() { return this.role === 'rider'; }
  },
  selfiePhoto: {
    type: String
  },
  idPhoto: {
    type: String
  },
  licensePhoto: {
    type: String
  },
  vehicleType: {
    type: String,
    enum: ['Motorcycle', 'Bicycle', 'Foot'],
    required: function() { return this.role === 'rider'; }
  },
  preferredAreas: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'inactive'],
    default: 'pending'
  },
  isFree: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  termsAccepted: {
    type: Boolean,
    default: false
  },
  affidavitAccepted: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date
  },
  activeOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  // Route-based order acceptance
  acceptingOrders: {
    type: Boolean,
    default: false
  },
  activeRoute: {
    deliveryLocation: {
      lat: Number,
      lng: Number
    },
    deliveryAddress: String,
    area: String // General area name (e.g., "Khoja Bus Stop area")
  },
  maxOrdersOnRoute: {
    type: Number,
    default: 4
  },
  ordersAcceptedOnRoute: {
    type: Number,
    default: 0
  },
  // Subscription package
  subscriptionPackage: {
    type: String,
    enum: ['free', 'standard', 'premium'],
    default: 'free'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip if password is not modified
  if (!this.isModified('password')) return next();
  
  // Skip if password is already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  // This prevents double-hashing when we manually hash passwords (e.g., during password reset)
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$'))) {
    console.log('Password is already hashed, skipping pre-save hash');
    return next();
  }
  
  // Hash the plain text password
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Clean up activeRoute before validation to prevent validation errors
// This runs BEFORE validation, so null values are cleaned up before Mongoose tries to cast them
userSchema.pre('validate', function(next) {
  if (this.activeRoute) {
    // If deliveryLocation is explicitly null, remove it
    if (this.activeRoute.deliveryLocation === null) {
      if (!this.activeRoute.deliveryAddress && !this.activeRoute.area) {
        // If entire activeRoute is empty, set to undefined
        this.activeRoute = undefined;
      } else {
        // If only deliveryLocation is null, set to undefined (don't use delete with Mongoose)
        this.activeRoute.deliveryLocation = undefined;
      }
      this.markModified('activeRoute');
    }
    // If deliveryLocation exists but has null/undefined lat/lng, remove the whole deliveryLocation
    else if (this.activeRoute.deliveryLocation && 
             (this.activeRoute.deliveryLocation.lat === null || 
              this.activeRoute.deliveryLocation.lat === undefined ||
              this.activeRoute.deliveryLocation.lng === null || 
              this.activeRoute.deliveryLocation.lng === undefined)) {
      this.activeRoute.deliveryLocation = undefined;
      this.markModified('activeRoute');
    }
  }
  next();
});

// Also clean up before saving (as backup, in case validate hook didn't run)
userSchema.pre('save', function(next) {
  if (this.activeRoute && this.activeRoute.deliveryLocation === null) {
    if (!this.activeRoute.deliveryAddress && !this.activeRoute.area) {
      this.activeRoute = undefined;
    } else {
      this.activeRoute.deliveryLocation = undefined;
    }
    this.markModified('activeRoute');
  }
  next();
});

// Hash transaction PIN before saving
userSchema.pre('save', async function(next) {
  // Only hash transaction PIN if it's modified and not already hashed
  if (this.isModified('transactionPin') && this.transactionPin) {
    // Skip if PIN is already a bcrypt hash
    if (!this.transactionPin.startsWith('$2a$') && !this.transactionPin.startsWith('$2b$') && !this.transactionPin.startsWith('$2y$')) {
      this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
    }
  }
  next();
});

// Compare transaction PIN method
userSchema.methods.compareTransactionPin = async function(candidatePin) {
  if (!this.transactionPin) {
    return false; // No PIN set
  }
  return await bcrypt.compare(candidatePin, this.transactionPin);
};

const User = mongoose.model('User', userSchema);
export default User;

