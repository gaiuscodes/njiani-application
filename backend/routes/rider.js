import express from 'express';
import { protect, riderOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import AdminMessage from '../models/AdminMessage.js';
import upload from '../middleware/upload.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// All routes require authentication and rider role
router.use(protect);
router.use(riderOnly);

// Get rider profile
router.get('/profile', async (req, res) => {
  try {
    const rider = await User.findById(req.user._id).select('-password');
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    // Check if transaction PIN is set (without exposing it)
    const riderWithPin = await User.findById(req.user._id).select('+transactionPin');
    const hasPin = !!riderWithPin.transactionPin;
    
    // Add PIN status to rider object
    const riderData = rider.toObject();
    riderData.hasTransactionPin = hasPin;
    
    res.json({
      rider: {
        ...riderData,
        acceptingOrders: rider.acceptingOrders || false,
        activeRoute: rider.activeRoute || null,
        ordersAcceptedOnRoute: rider.ordersAcceptedOnRoute || 0,
        maxOrdersOnRoute: rider.maxOrdersOnRoute || 4
      },
      wallet: {
        balance: wallet?.balance || 0,
        transactions: wallet?.transactions.slice(-10) || []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update rider profile
router.put('/profile', upload.single('profilePicture'), async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const rider = await User.findById(req.user._id);

    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    // Validate required fields
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Name is required' });
      }
      rider.name = name.trim();
    }

    if (phone !== undefined) {
      // Validate phone format
      if (!/^0\d{9}$/.test(phone)) {
        return res.status(400).json({ 
          message: 'Invalid phone number format. Must be 10 digits starting with 0' 
        });
      }

      // Check if phone is being changed and if new phone already exists
      if (phone !== rider.phone) {
        const existingPhone = await User.findOne({ 
          phone: phone,
          _id: { $ne: rider._id }
        });
        if (existingPhone) {
          return res.status(400).json({ message: 'An account with this phone number already exists' });
        }
        rider.phone = phone;
      }
    }

    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Invalid email format. Please enter a valid email address' 
        });
      }

      // Check if email is being changed and if new email already exists
      if (email.toLowerCase() !== rider.email.toLowerCase()) {
        const existingEmail = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: rider._id }
        });
        if (existingEmail) {
          return res.status(400).json({ message: 'An account with this email already exists' });
        }
        // If email is changed, mark as unverified
        rider.emailVerified = false;
        rider.email = email.toLowerCase();
      }
    }

    // Handle profile picture upload
    if (req.file) {
      try {
        const { uploadToCloudinary } = await import('../utils/cloudinary.js');
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          rider.profilePicture = await uploadToCloudinary(req.file.buffer, 'njiani/profiles');
        } else {
          rider.profilePicture = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    await rider.save();

    // Return updated rider (without password)
    const updatedRider = await User.findById(rider._id).select('-password');
    
    res.json({
      message: 'Profile updated successfully',
      rider: updatedRider
    });
  } catch (error) {
    console.error('Error updating rider profile:', error);
    
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
        message: 'A user with this information already exists' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Failed to update profile. Please try again.' 
    });
  }
});

// Toggle availability status
router.post('/toggle-status', async (req, res) => {
  try {
    const rider = await User.findById(req.user._id);
    
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    // Check if rider has active order
    if (rider.activeOrder) {
      const activeOrder = await Order.findById(rider.activeOrder);
      if (activeOrder && ['accepted', 'picked_up', 'in_transit'].includes(activeOrder.status)) {
        return res.status(400).json({ 
          message: 'Cannot change status while you have an active delivery. Complete or cancel the current order first.',
          hasActiveOrder: true
        });
      }
    }

    const newStatus = !rider.isFree;
    
    // Use findByIdAndUpdate to update only isFree without triggering full validation
    const updatedRider = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { isFree: newStatus } },
      { runValidators: false, new: true }
    ).select('isFree acceptingOrders activeRoute ordersAcceptedOnRoute maxOrdersOnRoute');
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`rider_${req.user._id}`).emit('status_updated', {
        isFree: newStatus,
        rider: updatedRider
      });
    }
    
    res.json({
      message: newStatus ? 'You are now free and can accept orders' : 'You are now busy',
      isFree: newStatus,
      rider: updatedRider
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to update status. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get available orders
router.get('/available-orders', async (req, res) => {
  try {
    const rider = await User.findById(req.user._id);
    
    // If rider is accepting orders on a specific route, show matching orders
    if (rider.acceptingOrders && rider.activeRoute && rider.ordersAcceptedOnRoute < rider.maxOrdersOnRoute) {
      // Find orders going to the same route/area
      const query = {
        status: { $in: ['pending', 'bidding'] },
        deliveryAddress: { $regex: rider.activeRoute.area, $options: 'i' }
      };
      
      // If we have coordinates, also match by proximity (within 2km)
      if (rider.activeRoute.deliveryLocation && rider.activeRoute.deliveryLocation.lat) {
        const { calculateDistance } = await import('../utils/distance.js');
        const orders = await Order.find({
          status: { $in: ['pending', 'bidding'] },
          deliveryLocation: { $exists: true }
        })
          .populate('shop', 'shopName shopAddress phone')
          .sort({ createdAt: -1 });
        
        // Filter orders by distance to active route
        const matchingOrders = orders.filter(order => {
          if (!order.deliveryLocation || !order.deliveryLocation.lat) return false;
          const distance = calculateDistance(
            rider.activeRoute.deliveryLocation.lat,
            rider.activeRoute.deliveryLocation.lng,
            order.deliveryLocation.lat,
            order.deliveryLocation.lng
          );
          return distance <= 2; // Within 2km of the route
        });
        
        return res.json({ 
          orders: matchingOrders,
          routeInfo: {
            area: rider.activeRoute.area,
            ordersAccepted: rider.ordersAcceptedOnRoute,
            maxOrders: rider.maxOrdersOnRoute,
            remaining: rider.maxOrdersOnRoute - rider.ordersAcceptedOnRoute
          }
        });
      }
      
      // Fallback: match by address text
      const orders = await Order.find(query)
        .populate('shop', 'shopName shopAddress phone')
        .sort({ createdAt: -1 });
      
      return res.json({ 
        orders,
        routeInfo: {
          area: rider.activeRoute.area,
          ordersAccepted: rider.ordersAcceptedOnRoute,
          maxOrders: rider.maxOrdersOnRoute,
          remaining: rider.maxOrdersOnRoute - rider.ordersAcceptedOnRoute
        }
      });
    }
    
    // If rider is not accepting orders or has reached max, show all available orders
    if (!rider.isFree && !rider.acceptingOrders) {
      return res.json({ orders: [] });
    }

    const orders = await Order.find({
      status: { $in: ['pending', 'bidding'] }
    })
      .populate('shop', 'shopName shopAddress phone')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Place a bid on an order
router.post('/bid/:orderId', async (req, res) => {
  try {
    // Debug: Log user info (this should already be authenticated by middleware)
    console.log('=== BID REQUEST ===');
    console.log('User ID:', req.user?._id);
    console.log('User role:', req.user?.role);
    console.log('==================');
    
    const { price, estimatedTime, message } = req.body;
    const order = await Order.findById(req.params.orderId)
      .populate('shop', 'shopName shopCertified shopRating shopTotalRatings');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'pending' && order.status !== 'bidding') {
      return res.status(400).json({ message: 'Order is no longer accepting bids' });
    }

    // Check if rider already bid
    const existingBid = order.bids.find(bid => bid.rider.toString() === req.user._id.toString());
    if (existingBid) {
      return res.status(400).json({ message: 'You have already placed a bid on this order' });
    }

    // Check if rider is accepting orders on a route and has reached the limit
    const rider = await User.findById(req.user._id);
    if (rider.acceptingOrders) {
      const isSameRoute = rider.activeRoute && 
        (order.deliveryAddress.includes(rider.activeRoute.area) ||
         (rider.activeRoute.deliveryLocation && order.deliveryLocation &&
          Math.abs(rider.activeRoute.deliveryLocation.lat - order.deliveryLocation.lat) < 0.01 &&
          Math.abs(rider.activeRoute.deliveryLocation.lng - order.deliveryLocation.lng) < 0.01));
      
      if (isSameRoute && rider.ordersAcceptedOnRoute >= rider.maxOrdersOnRoute) {
        return res.status(400).json({ 
          message: `You have reached the maximum of ${rider.maxOrdersOnRoute} orders on your current route. Complete your current deliveries first.` 
        });
      }
    }

    // Create default message if not provided - ensure message is always defined
    const bidMessage = (message && message.trim()) ? message.trim() : `I'm available for this order and my rate is KES ${price}`;

    const newBid = {
      rider: req.user._id,
      price: parseFloat(price),
      estimatedTime: parseInt(estimatedTime),
      message: bidMessage,
      communicationHistory: [{
        sender: req.user._id,
        message: bidMessage,
        action: 'message',
        timestamp: new Date()
      }]
    };

    order.bids.push(newBid);

    order.status = 'bidding';
    await order.save();

    // Populate shop for socket event and response
    await order.populate('shop', '_id shopName shopCertified shopRating shopTotalRatings');

    // Emit socket event for shop notification
    const io = req.app.get('io');
    if (io) {
      const populatedBid = await Order.findById(order._id).populate('bids.rider', 'name phone vehicleType rating');
      const shopId = order.shop?._id || order.shop;
      if (shopId) {
        io.to(`shop_${shopId}`).emit('new_bid', {
          orderId: order._id,
          bid: populatedBid.bids[populatedBid.bids.length - 1],
          shop: order.shop
        });
      }
    }

    // Return order with shop info for rider to review
    const shopInfo = order.shop && typeof order.shop === 'object' ? {
      shopName: order.shop.shopName || 'Unknown Shop',
      shopCertified: order.shop.shopCertified || false,
      shopRating: order.shop.shopRating || 0,
      shopTotalRatings: order.shop.shopTotalRatings || 0
    } : null;

    res.json({ 
      message: 'Bid placed successfully', 
      order: {
        ...order.toObject(),
        shop: shopInfo
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my active order
router.get('/active-order', async (req, res) => {
  try {
    const order = await Order.findOne({
      rider: req.user._id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    })
      .populate('shop', 'shopName shopAddress phone');

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all my orders (for chat)
router.get('/my-orders', async (req, res) => {
  try {
    const orders = await Order.find({
      rider: req.user._id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    })
      .populate('shop', 'shopName shopAddress phone')
      .populate('rider', 'name phone vehicleType')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my bids (pending, accepted, rejected, cancelled)
router.get('/bids', async (req, res) => {
  try {
    const riderId = req.user._id;
    
    // Find all orders where rider has placed a bid
    const ordersWithBids = await Order.find({
      'bids.rider': riderId
    })
      .populate('shop', 'shopName shopAddress phone')
      .sort({ createdAt: -1 });
    
    // Categorize bids
    const myBids = {
      pending: [],
      accepted: [],
      rejected: [],
      cancelled: []
    };
    
    ordersWithBids.forEach(order => {
      const myBid = order.bids.find(bid => bid.rider.toString() === riderId.toString());
      if (!myBid) return;
      
      // Ensure shop ID is properly extracted
      let shopId = null;
      let shopName = 'Unknown Shop';
      
      if (order.shop) {
        if (typeof order.shop === 'object') {
          shopId = order.shop._id || order.shop.id;
          shopName = order.shop.shopName || 'Unknown Shop';
        } else {
          shopId = order.shop; // If it's just an ID
        }
      }

      const bidInfo = {
        orderId: order._id,
        order: {
          _id: order._id,
          shop: shopId ? {
            _id: shopId,
            id: shopId,
            shopName: shopName,
            shopCertified: order.shop?.shopCertified || false,
            shopRating: order.shop?.shopRating || 0,
            shopTotalRatings: order.shop?.shopTotalRatings || 0
          } : null,
          deliveryAddress: order.deliveryAddress,
          distance: order.distance,
          goodsDescription: order.goodsDescription,
          goodsValue: order.goodsValue,
          status: order.status,
          createdAt: order.createdAt
        },
        bid: {
          price: myBid.price,
          estimatedTime: myBid.estimatedTime,
          bidAt: myBid.bidAt,
          status: myBid.status || 'pending',
          message: myBid.message || '',
          communicationHistory: myBid.communicationHistory || []
        }
      };
      
      // Categorize based on order status and bid status
      if (order.status === 'cancelled') {
        myBids.cancelled.push(bidInfo);
      } else if (myBid.status === 'accepted' || (order.rider && order.rider.toString() === riderId.toString())) {
        myBids.accepted.push(bidInfo);
      } else if (myBid.status === 'rejected' || (order.rider && order.rider.toString() !== riderId.toString())) {
        myBids.rejected.push(bidInfo);
      } else {
        myBids.pending.push(bidInfo);
      }
    });
    
    res.json({ bids: myBids });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update location (for live tracking)
router.post('/update-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    // Use findByIdAndUpdate to update only location without triggering full validation
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          currentLocation: {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            updatedAt: new Date()
          }
        }
      },
      { runValidators: false }
    );

    // Update order tracking if rider has active order
    const activeOrder = await Order.findOne({
      rider: req.user._id,
      status: { $in: ['picked_up', 'in_transit'] }
    });

    if (activeOrder) {
      activeOrder.trackingHistory.push({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date()
      });
      await activeOrder.save();

      // Emit socket event for real-time tracking
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${activeOrder._id}`).emit('location_update', {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          timestamp: new Date()
        });
      }
    }

    res.json({ message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark order as picked up
router.post('/order/:orderId/pickup', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order || order.rider.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'accepted') {
      return res.status(400).json({ message: 'Order cannot be picked up in current status' });
    }

    order.status = 'picked_up';
    order.pickedUpAt = new Date();
    await order.save();
    
    // Note: ordersAcceptedOnRoute is incremented when the bid is accepted (in shop.js),
    // not when the order is picked up. This prevents double-counting.

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        status: 'picked_up'
      });
    }

    res.json({ message: 'Order marked as picked up', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark order as in transit
router.post('/order/:orderId/in-transit', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order || order.rider.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = 'in_transit';
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        status: 'in_transit'
      });
    }

    res.json({ message: 'Order marked as in transit', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete delivery
router.post('/order/:orderId/complete', upload.single('receiptPhoto'), async (req, res) => {
  try {
    const { uploadToCloudinary } = await import('../utils/cloudinary.js');
    const order = await Order.findById(req.params.orderId);

    if (!order || order.rider.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'in_transit') {
      return res.status(400).json({ message: 'Order must be in transit to complete delivery' });
    }

    // Require receipt photo
    if (!req.file) {
      return res.status(400).json({ message: 'Receipt/invoice/confirmation photo is required to complete delivery' });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    // Validate file size (max 10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'Image size must be less than 10MB' });
    }

    let receiptPhotoUrl = '';
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      receiptPhotoUrl = await uploadToCloudinary(req.file.buffer, 'njiani/receipts');
    } else {
      receiptPhotoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    order.status = 'delivered';
    order.receiptPhoto = receiptPhotoUrl;
    order.deliveredAt = new Date();

    // Calculate fees and earnings
    const deliveryFee = order.acceptedBid.price;
    const platformFee = deliveryFee * 0.13;
    const riderEarnings = deliveryFee * 0.87;

    order.deliveryFee = deliveryFee;
    order.platformFee = platformFee;
    order.riderEarnings = riderEarnings;

    await order.save();

    // Update rider stats using findByIdAndUpdate to avoid validation issues
    const updateData = {
      $inc: {
        totalDeliveries: 1,
        totalEarnings: riderEarnings
      }
    };
    
    // Check if this was the last order on the route
    const rider = await User.findById(req.user._id);
    if (rider.acceptingOrders && rider.ordersAcceptedOnRoute >= rider.maxOrdersOnRoute) {
      // Reset route acceptance status
      updateData.$set = {
        acceptingOrders: false,
        activeRoute: null,
        ordersAcceptedOnRoute: 0,
        maxOrdersOnRoute: 4,
        isFree: true,
        activeOrder: null
      };
      console.log(`✅ Rider ${rider.name} completed all orders on route. Status reset.`);
    } else if (rider.acceptingOrders) {
      // Still has orders on route, but this delivery is complete
      // Find next order on the same route
      const nextOrder = await Order.findOne({
        rider: rider._id,
        status: { $in: ['accepted', 'picked_up', 'in_transit'] }
      });
      
      if (nextOrder) {
        updateData.$set = {
          activeOrder: nextOrder._id,
          isFree: false
        };
      } else {
        // No more active orders, but still accepting on route
        updateData.$set = {
          activeOrder: null,
          isFree: true // Can accept more orders on the route
        };
      }
    } else {
      updateData.$set = {
        isFree: true,
        activeOrder: null
      };
    }
    
    // Use findByIdAndUpdate to update only specific fields without triggering full validation
    await User.findByIdAndUpdate(req.user._id, updateData, { runValidators: false });

    // Update wallets
    const riderWallet = await Wallet.findOne({ user: req.user._id });
    const shopWallet = await Wallet.findOne({ user: order.shop });
    const adminUser = await User.findOne({ role: 'admin' });
    const adminWallet = adminUser ? await Wallet.findOne({ user: adminUser._id }) : null;

    if (riderWallet) {
      await riderWallet.addTransaction('earning', riderEarnings, `Delivery earnings for order ${order._id}`, order._id);
    }

    if (adminWallet) {
      await adminWallet.addTransaction('fee', platformFee, `Platform fee from order ${order._id}`, order._id);
    }

    // Deduct from shop wallet
    if (shopWallet && shopWallet.balance >= deliveryFee) {
      await shopWallet.addTransaction('payment', deliveryFee, `Payment for delivery order ${order._id}`, order._id);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        status: 'delivered'
      });
    }

    res.json({ message: 'Delivery completed successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Current password, new password, and confirmation are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: 'New password and confirmation do not match' 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    // Get user with password field
    const rider = await User.findById(req.user._id).select('+password');

    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await rider.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    rider.password = hashedPassword;
    await rider.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: error.message });
  }
});

// Talk to Admin - Get or create conversation
router.get('/admin-chat', async (req, res) => {
  try {
    let conversation = await AdminMessage.findOne({ user: req.user._id });
    
    if (!conversation) {
      conversation = new AdminMessage({
        user: req.user._id,
        userRole: 'rider',
        messages: [],
        status: 'open'
      });
      await conversation.save();
    }
    
    await conversation.populate('user', 'name phone email role');
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send message to admin
router.post('/admin-chat/send', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let conversation = await AdminMessage.findOne({ user: req.user._id });
    
    if (!conversation) {
      conversation = new AdminMessage({
        user: req.user._id,
        userRole: 'rider',
        messages: [],
        status: 'open'
      });
    }

    conversation.messages.push({
      sender: 'user',
      message: message.trim(),
      timestamp: new Date(),
      read: false
    });
    
    conversation.lastMessageAt = new Date();
    if (conversation.status === 'resolved' || conversation.status === 'closed') {
      conversation.status = 'open';
    }
    
    await conversation.save();

    // Emit socket event to admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('user_message', {
        conversationId: conversation._id,
        user: req.user._id,
        message: {
          sender: 'user',
          message: message.trim(),
          timestamp: new Date()
        }
      });
    }

    res.json({ message: 'Message sent successfully', conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

