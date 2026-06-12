/**
 * Pricing Configuration
 * Defines the features and pricing for each subscription package
 */

export const PRICING_PACKAGES = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'KES',
    billingPeriod: 'month',
    features: {
      maxOrdersPerMonth: 10,
      maxProducts: 5,
      realTimeTracking: true,
      basicReports: true,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
      advancedAnalytics: false,
      bulkOperations: false,
      whiteLabel: false
    },
    limits: {
      ordersPerMonth: 10,
      products: 5,
      ridersPerOrder: 3,
      storageGB: 1
    },
    description: 'Perfect for small shops getting started'
  },
  standard: {
    name: 'Standard',
    price: 2999,
    currency: 'KES',
    billingPeriod: 'month',
    features: {
      maxOrdersPerMonth: 100,
      maxProducts: 50,
      realTimeTracking: true,
      basicReports: true,
      prioritySupport: true,
      apiAccess: false,
      customBranding: false,
      advancedAnalytics: true,
      bulkOperations: true,
      whiteLabel: false
    },
    limits: {
      ordersPerMonth: 100,
      products: 50,
      ridersPerOrder: 5,
      storageGB: 10
    },
    description: 'Ideal for growing businesses'
  },
  premium: {
    name: 'Premium',
    price: 7999,
    currency: 'KES',
    billingPeriod: 'month',
    features: {
      maxOrdersPerMonth: -1, // Unlimited
      maxProducts: -1, // Unlimited
      realTimeTracking: true,
      basicReports: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: true,
      advancedAnalytics: true,
      bulkOperations: true,
      whiteLabel: true
    },
    limits: {
      ordersPerMonth: -1, // Unlimited
      products: -1, // Unlimited
      ridersPerOrder: -1, // Unlimited
      storageGB: 100
    },
    description: 'For large enterprises with advanced needs'
  }
};

/**
 * Get package details
 */
export const getPackageDetails = (packageName) => {
  return PRICING_PACKAGES[packageName] || PRICING_PACKAGES.free;
};

/**
 * Check if user has access to a feature
 */
export const hasFeature = (userPackage, feature) => {
  const packageDetails = getPackageDetails(userPackage);
  return packageDetails.features[feature] === true;
};

/**
 * Check if user has reached a limit
 */
export const checkLimit = (userPackage, limitType, currentUsage) => {
  const packageDetails = getPackageDetails(userPackage);
  const limit = packageDetails.limits[limitType];
  
  // -1 means unlimited
  if (limit === -1) return { allowed: true, remaining: -1 };
  
  const remaining = limit - currentUsage;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: limit
  };
};



