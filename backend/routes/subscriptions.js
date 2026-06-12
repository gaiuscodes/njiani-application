import express from 'express';
import { protect } from '../middleware/auth.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { PRICING_PACKAGES, getPackageDetails } from '../config/pricing.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all available packages
router.get('/packages', (req, res) => {
  try {
    const packages = Object.keys(PRICING_PACKAGES).map(key => ({
      id: key,
      ...PRICING_PACKAGES[key]
    }));
    
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user's subscription
router.get('/my-subscription', async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user._id });
    
    // If no subscription exists, create a free one
    if (!subscription) {
      subscription = new Subscription({
        user: req.user._id,
        package: req.user.subscriptionPackage || 'free',
        status: 'active'
      });
      await subscription.save();
    }
    
    const packageDetails = getPackageDetails(subscription.package);
    
    res.json({
      subscription: {
        ...subscription.toObject(),
        packageDetails
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ message: error.message });
  }
});

// Subscribe to a package
router.post('/subscribe', async (req, res) => {
  try {
    const { package: packageName, paymentMethod = 'wallet' } = req.body;
    
    if (!packageName || !['free', 'standard', 'premium'].includes(packageName)) {
      return res.status(400).json({ message: 'Invalid package. Must be free, standard, or premium' });
    }
    
    const packageDetails = getPackageDetails(packageName);
    
    // Free package doesn't require payment
    if (packageName === 'free') {
      let subscription = await Subscription.findOne({ user: req.user._id });
      
      if (!subscription) {
        subscription = new Subscription({
          user: req.user._id,
          package: 'free',
          status: 'active'
        });
      } else {
        subscription.package = 'free';
        subscription.status = 'active';
        subscription.startDate = new Date();
        subscription.endDate = null;
      }
      
      await subscription.save();
      
      // Update user's subscription package
      req.user.subscriptionPackage = 'free';
      await req.user.save();
      
      return res.json({
        message: 'Subscribed to Free package successfully',
        subscription: {
          ...subscription.toObject(),
          packageDetails
        }
      });
    }
    
    // Paid packages require payment
    if (packageDetails.price > 0) {
      // Check wallet balance if paying with wallet
      if (paymentMethod === 'wallet') {
        const wallet = await Wallet.findOne({ user: req.user._id });
        
        if (!wallet || wallet.balance < packageDetails.price) {
          return res.status(400).json({
            message: `Insufficient wallet balance. Required: KES ${packageDetails.price}, Available: KES ${wallet?.balance || 0}`,
            required: packageDetails.price,
            available: wallet?.balance || 0
          });
        }
        
        // Deduct from wallet
        wallet.balance -= packageDetails.price;
        wallet.transactions.push({
          type: 'fee',
          amount: packageDetails.price,
          description: `Subscription payment: ${packageDetails.name} package`,
          status: 'completed'
        });
        await wallet.save();
      }
      
      // For M-Pesa, you would integrate with M-Pesa API here
      // For now, we'll simulate successful payment
    }
    
    // Create or update subscription
    let subscription = await Subscription.findOne({ user: req.user._id });
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    
    if (!subscription) {
      subscription = new Subscription({
        user: req.user._id,
        package: packageName,
        status: 'active',
        startDate: now,
        endDate: endDate,
        paymentMethod: paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate
      });
    } else {
      subscription.package = packageName;
      subscription.status = 'active';
      subscription.startDate = now;
      subscription.endDate = endDate;
      subscription.paymentMethod = paymentMethod;
      subscription.lastPaymentDate = now;
      subscription.nextBillingDate = endDate;
    }
    
    // Add payment history
    if (packageDetails.price > 0) {
      subscription.paymentHistory.push({
        amount: packageDetails.price,
        paymentDate: now,
        paymentMethod: paymentMethod,
        status: 'completed'
      });
    }
    
    await subscription.save();
    
    // Update user's subscription package
    req.user.subscriptionPackage = packageName;
    await req.user.save();
    
    res.json({
      message: `Subscribed to ${packageDetails.name} package successfully`,
      subscription: {
        ...subscription.toObject(),
        packageDetails
      }
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ message: error.message });
  }
});

// Upgrade or downgrade subscription
router.post('/change-package', async (req, res) => {
  try {
    const { package: newPackage, paymentMethod = 'wallet' } = req.body;
    
    if (!newPackage || !['free', 'standard', 'premium'].includes(newPackage)) {
      return res.status(400).json({ message: 'Invalid package' });
    }
    
    const currentSubscription = await Subscription.findOne({ user: req.user._id });
    const currentPackage = currentSubscription?.package || req.user.subscriptionPackage || 'free';
    
    if (currentPackage === newPackage) {
      return res.status(400).json({ message: 'You are already on this package' });
    }
    
    const packageDetails = getPackageDetails(newPackage);
    
    // Free package doesn't require payment
    if (newPackage === 'free') {
      if (currentSubscription) {
        currentSubscription.package = 'free';
        currentSubscription.status = 'active';
        currentSubscription.startDate = new Date();
        currentSubscription.endDate = null;
        await currentSubscription.save();
      }
      
      req.user.subscriptionPackage = 'free';
      await req.user.save();
      
      return res.json({
        message: 'Downgraded to Free package successfully',
        subscription: {
          ...(currentSubscription?.toObject() || {}),
          packageDetails
        }
      });
    }
    
    // Paid packages require payment
    if (packageDetails.price > 0) {
      // Check wallet balance if paying with wallet
      if (paymentMethod === 'wallet') {
        const wallet = await Wallet.findOne({ user: req.user._id });
        
        if (!wallet || wallet.balance < packageDetails.price) {
          return res.status(400).json({
            message: `Insufficient wallet balance. Required: KES ${packageDetails.price}, Available: KES ${wallet?.balance || 0}`,
            required: packageDetails.price,
            available: wallet?.balance || 0
          });
        }
        
        // Deduct from wallet
        wallet.balance -= packageDetails.price;
        wallet.transactions.push({
          type: 'fee',
          amount: packageDetails.price,
          description: `Subscription payment: ${packageDetails.name} package`,
          status: 'completed'
        });
        await wallet.save();
      }
    }
    
    // Update subscription
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);
    
    if (!currentSubscription) {
      const newSubscription = new Subscription({
        user: req.user._id,
        package: newPackage,
        status: 'active',
        startDate: now,
        endDate: endDate,
        paymentMethod: paymentMethod,
        lastPaymentDate: now,
        nextBillingDate: endDate
      });
      
      if (packageDetails.price > 0) {
        newSubscription.paymentHistory.push({
          amount: packageDetails.price,
          paymentDate: now,
          paymentMethod: paymentMethod,
          status: 'completed'
        });
      }
      
      await newSubscription.save();
    } else {
      currentSubscription.package = newPackage;
      currentSubscription.status = 'active';
      currentSubscription.startDate = now;
      currentSubscription.endDate = endDate;
      currentSubscription.paymentMethod = paymentMethod;
      currentSubscription.lastPaymentDate = now;
      currentSubscription.nextBillingDate = endDate;
      
      if (packageDetails.price > 0) {
        currentSubscription.paymentHistory.push({
          amount: packageDetails.price,
          paymentDate: now,
          paymentMethod: paymentMethod,
          status: 'completed'
        });
      }
      
      await currentSubscription.save();
    }
    
    // Update user's subscription package
    req.user.subscriptionPackage = newPackage;
    await req.user.save();
    
    const updatedSubscription = await Subscription.findOne({ user: req.user._id });
    
    res.json({
      message: `Changed to ${packageDetails.name} package successfully`,
      subscription: {
        ...updatedSubscription.toObject(),
        packageDetails
      }
    });
  } catch (error) {
    console.error('Error changing package:', error);
    res.status(500).json({ message: error.message });
  }
});

// Cancel subscription (downgrade to free)
router.post('/cancel', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }
    
    if (subscription.package === 'free') {
      return res.status(400).json({ message: 'Free package cannot be cancelled' });
    }
    
    // Downgrade to free at end of current billing period
    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();
    
    // Note: User keeps current package until endDate, then auto-downgrades
    // For immediate downgrade, uncomment below:
    // subscription.package = 'free';
    // subscription.status = 'active';
    // req.user.subscriptionPackage = 'free';
    // await req.user.save();
    
    res.json({
      message: 'Subscription cancelled. You will be downgraded to Free package at the end of your billing period.',
      subscription: {
        ...subscription.toObject(),
        packageDetails: getPackageDetails(subscription.package)
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get subscription usage/stats
router.get('/usage', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    const packageName = subscription?.package || req.user.subscriptionPackage || 'free';
    const packageDetails = getPackageDetails(packageName);
    
    // Get current usage (this would be calculated based on actual usage)
    // For now, return package limits
    res.json({
      package: packageName,
      packageDetails,
      usage: {
        ordersThisMonth: 0, // Would calculate from Order model
        productsCount: 0, // Would calculate from Product model
        storageUsed: 0 // Would calculate from uploaded files
      },
      limits: packageDetails.limits
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

