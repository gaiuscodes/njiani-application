import express from 'express';
import { protect, shopOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Product from '../models/Product.js';
import AdminMessage from '../models/AdminMessage.js';
import { getDistanceFromGoogle, geocodeAddress } from '../utils/distance.js';
import upload from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

router.use(protect);
router.use(shopOnly);

// Get shop profile
router.get('/profile', async (req, res) => {
  try {
    const shop = await User.findById(req.user._id).select('-password');
    
    // Email verification is no longer required for accessing dashboard
    // It's only required during registration
    
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    // Check if transaction PIN is set (without exposing it)
    const shopWithPin = await User.findById(req.user._id).select('+transactionPin');
    const hasPin = !!shopWithPin.transactionPin;
    
    // Add PIN status to shop object
    const shopData = shop.toObject();
    shopData.hasTransactionPin = hasPin;
    
    res.json({
      shop: shopData,
      wallet: {
        balance: wallet?.balance || 0,
        transactions: wallet?.transactions.slice(-10) || []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update shop profile
router.put('/profile', upload.fields([
  { name: 'shopLogo', maxCount: 1 },
  { name: 'profilePicture', maxCount: 1 }
]), async (req, res) => {
  try {
    const { shopName, phone, email, shopAddress } = req.body;
    const shop = await User.findById(req.user._id);

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Validate required fields
    if (!shopName || !phone || !email || !shopAddress) {
      return res.status(400).json({ 
        message: 'All fields are required: shopName, phone, email, shopAddress' 
      });
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

    // Check if email is being changed and if new email already exists
    if (email.toLowerCase() !== shop.email.toLowerCase()) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: shop._id }
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }
      // If email is changed, mark as unverified
      shop.emailVerified = false;
      shop.email = email.toLowerCase();
    }

    // Check if phone is being changed and if new phone already exists
    if (phone !== shop.phone) {
      const existingPhone = await User.findOne({ 
        phone: phone,
        _id: { $ne: shop._id }
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'An account with this phone number already exists' });
      }
      shop.phone = phone;
    }

    // Update shop details
    shop.shopName = shopName;
    shop.shopAddress = shopAddress;

    // Handle shop logo upload
    if (req.files && req.files.shopLogo && req.files.shopLogo[0]) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          shop.shopLogo = await uploadToCloudinary(req.files.shopLogo[0].buffer, 'njiani/shops');
        } else {
          shop.shopLogo = `data:${req.files.shopLogo[0].mimetype};base64,${req.files.shopLogo[0].buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.error('Error uploading shop logo:', uploadError);
        return res.status(500).json({ message: 'Failed to upload shop logo' });
      }
    }

    // Handle profile picture upload
    if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          shop.profilePicture = await uploadToCloudinary(req.files.profilePicture[0].buffer, 'njiani/profiles');
        } else {
          shop.profilePicture = `data:${req.files.profilePicture[0].mimetype};base64,${req.files.profilePicture[0].buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    await shop.save();

    // Return updated shop (without password)
    const updatedShop = await User.findById(shop._id).select('-password');
    
    res.json({
      message: 'Profile updated successfully',
      shop: updatedShop
    });
  } catch (error) {
    console.error('Error updating shop profile:', error);
    
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
        message: 'A shop with this phone number or email already exists' 
      });
    }
    
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
});

// Set or update transaction PIN
router.put('/transaction-pin', async (req, res) => {
  try {
    const { pin, currentPin } = req.body;
    
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        message: 'PIN must be exactly 4 digits' 
      });
    }

    const shop = await User.findById(req.user._id).select('+transactionPin');
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // If PIN already exists, require current PIN for verification
    if (shop.transactionPin) {
      if (!currentPin) {
        return res.status(400).json({ 
          message: 'Current PIN is required to update your transaction PIN' 
        });
      }
      
      const isCurrentPinValid = await shop.compareTransactionPin(currentPin);
      if (!isCurrentPinValid) {
        return res.status(401).json({ 
          message: 'Current PIN is incorrect' 
        });
      }
    }

    // Set new PIN (will be hashed by pre-save hook)
    shop.transactionPin = pin;
    await shop.save();

    res.json({
      message: shop.transactionPin ? 'Transaction PIN updated successfully' : 'Transaction PIN set successfully'
    });
  } catch (error) {
    console.error('Error setting transaction PIN:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to set transaction PIN' 
    });
  }
});

// Create new order
router.post('/orders', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      pickupAddress,
      deliveryAddress,
      pickupLocation,
      deliveryLocation,
      goodsDescription,
      goodsValue,
      category,
      isUrgent
    } = req.body;

    const shop = await User.findById(req.user._id);
    
    // Validate required fields
    if (!customerName || !customerPhone || !deliveryAddress || !goodsDescription) {
      return res.status(400).json({ 
        message: 'Missing required fields: customerName, customerPhone, deliveryAddress, goodsDescription' 
      });
    }

    // Get pickup location (shop location)
    let finalPickupLocation = pickupLocation;
    if (!finalPickupLocation) {
      // First try shop's stored location
      if (shop.shopLocation && shop.shopLocation.lat && shop.shopLocation.lng) {
        finalPickupLocation = { lat: shop.shopLocation.lat, lng: shop.shopLocation.lng };
      } else if (shop.shopAddress) {
        // Try to geocode shop address if no location provided
        const geocoded = await geocodeAddress(shop.shopAddress);
        if (geocoded) {
          finalPickupLocation = { lat: geocoded.lat, lng: geocoded.lng };
          // Save location to shop for future use
          shop.shopLocation = { lat: geocoded.lat, lng: geocoded.lng };
          await shop.save();
        }
      }
    }

    // Get delivery location
    let finalDeliveryLocation = deliveryLocation;
    if (!finalDeliveryLocation && deliveryAddress) {
      // Try to geocode delivery address if no location provided
      const geocoded = await geocodeAddress(deliveryAddress);
      if (geocoded) {
        finalDeliveryLocation = { lat: geocoded.lat, lng: geocoded.lng };
      }
    }

    // Calculate distance if both locations are available
    let distanceInfo = null;
    if (finalPickupLocation && finalDeliveryLocation) {
      distanceInfo = await getDistanceFromGoogle(finalPickupLocation, finalDeliveryLocation);
    }

    const order = new Order({
      shop: req.user._id,
      customerName,
      customerPhone,
      pickupAddress: pickupAddress || shop.shopAddress,
      pickupLocation: finalPickupLocation ? {
        lat: parseFloat(finalPickupLocation.lat),
        lng: parseFloat(finalPickupLocation.lng)
      } : null,
      deliveryAddress,
      deliveryLocation: finalDeliveryLocation ? {
        lat: parseFloat(finalDeliveryLocation.lat),
        lng: parseFloat(finalDeliveryLocation.lng)
      } : null,
      distance: distanceInfo ? {
        value: distanceInfo.distance,
        text: distanceInfo.distanceText,
        duration: distanceInfo.duration,
        durationText: distanceInfo.durationText
      } : null,
      goodsDescription,
      goodsValue: parseFloat(goodsValue) || 0,
      category: category || 'Other',
      isUrgent: isUrgent === true || isUrgent === 'true',
      status: 'bidding' // Changed from 'pending' to 'bidding' so riders can see it
    });

    await order.save();

    // Emit socket event for available riders
    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', {
        orderId: order._id,
        order: await Order.findById(order._id).populate('shop', 'shopName shopAddress')
      });
    }

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get shop orders
router.get('/orders', async (req, res) => {
  try {
    // Email verification is no longer required for accessing orders
    // It's only required during registration
    
    const { status } = req.query;
    const query = { shop: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('rider', 'name phone vehicleType rating')
      .populate('bids.rider', 'name phone vehicleType rating totalDeliveries totalEarnings')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order details with bids
router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('shop', 'shopName shopAddress phone shopCertified shopRating shopTotalRatings')
      .populate('rider', 'name phone vehicleType rating totalDeliveries totalEarnings')
      .populate('bids.rider', 'name phone vehicleType rating totalDeliveries totalEarnings')
      .populate('bids.communicationHistory.sender', 'name shopName role phone');

    if (!order || order.shop.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send message to rider on a bid
router.post('/orders/:orderId/bids/:bidIndex/message', upload.array('attachments', 5), async (req, res) => {
  try {
    const { message, action } = req.body; // action: 'message', 'bargain', 'accept', 'reject'
    
    // Ensure message is always defined and handle null/undefined cases
    let messageText = '';
    if (message !== null && message !== undefined && typeof message === 'string') {
      messageText = message.trim();
    } else if (message !== null && message !== undefined) {
      messageText = String(message).trim();
    }
    
    // Ensure action is always defined
    const actionType = (action && typeof action === 'string') ? action.toLowerCase() : 'message';
    
    const order = await Order.findById(req.params.orderId);

    if (!order || order.shop.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const bidIndex = parseInt(req.params.bidIndex);
    if (!order.bids[bidIndex]) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    const bid = order.bids[bidIndex];

    // Handle image attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          let attachmentUrl;
          if (process.env.CLOUDINARY_CLOUD_NAME) {
            attachmentUrl = await uploadToCloudinary(file.buffer, 'njiani/messages');
          } else {
            attachmentUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          }
          
          attachments.push({
            type: 'image',
            url: attachmentUrl,
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          });
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          return res.status(500).json({ message: 'Failed to upload attachment' });
        }
      }
    }

    // Message or attachments required
    if (!messageText && attachments.length === 0) {
      return res.status(400).json({ message: 'Message text or attachment is required' });
    }

    // Add message to communication history
    bid.communicationHistory.push({
      sender: req.user._id,
      message: messageText,
      attachments: attachments,
      action: actionType,
      timestamp: new Date()
    });

    // Update bid status if action is accept/reject
    if (actionType === 'accept') {
      // Check for PIN in request
      const { pin } = req.body;
      if (!pin) {
        return res.status(400).json({ message: 'Transaction PIN is required to accept bid' });
      }

      // Verify transaction PIN
      const shopUser = await User.findById(req.user._id).select('+transactionPin');
      if (!shopUser.transactionPin) {
        return res.status(400).json({ 
          message: 'Transaction PIN not set. Please set your PIN in profile settings first.' 
        });
      }

      const isPinValid = await shopUser.compareTransactionPin(pin);
      if (!isPinValid) {
        return res.status(401).json({ message: 'Invalid transaction PIN' });
      }

      // Check shop wallet balance before accepting
      const shopWallet = await Wallet.findOne({ user: req.user._id });
      if (!shopWallet || shopWallet.balance < bid.price) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      
      bid.status = 'accepted';
      // Mark other bids as rejected
      order.bids.forEach((b, idx) => {
        if (idx !== bidIndex) {
          b.status = 'rejected';
        }
      });
      order.rider = bid.rider;
      order.acceptedBid = {
        price: bid.price,
        estimatedTime: bid.estimatedTime,
        acceptedAt: new Date()
      };
      order.status = 'accepted';
      
      // Update rider status
      const rider = await User.findById(bid.rider);
      if (rider) {
        rider.isFree = false;
        rider.activeOrder = order._id;
        
        // Handle route acceptance logic
        if (rider.acceptingOrders && rider.activeRoute) {
          const isSameRoute = order.deliveryAddress.includes(rider.activeRoute.area) ||
            (rider.activeRoute.deliveryLocation && order.deliveryLocation &&
             Math.abs(rider.activeRoute.deliveryLocation.lat - order.deliveryLocation.lat) < 0.01 &&
             Math.abs(rider.activeRoute.deliveryLocation.lng - order.deliveryLocation.lng) < 0.01);
          
          if (isSameRoute && rider.ordersAcceptedOnRoute < rider.maxOrdersOnRoute) {
            rider.ordersAcceptedOnRoute += 1;
          } else if (!isSameRoute) {
            rider.acceptingOrders = true;
            rider.activeRoute = {
              ...(order.deliveryLocation && { deliveryLocation: order.deliveryLocation }),
              deliveryAddress: order.deliveryAddress,
              area: order.deliveryAddress.split(',')[0]
            };
            rider.maxOrdersOnRoute = 4;
            rider.ordersAcceptedOnRoute = 1;
          }
        } else {
          rider.acceptingOrders = true;
          rider.activeRoute = {
            ...(order.deliveryLocation && { deliveryLocation: order.deliveryLocation }),
            deliveryAddress: order.deliveryAddress,
            area: order.deliveryAddress.split(',')[0]
          };
          rider.maxOrdersOnRoute = 4;
          rider.ordersAcceptedOnRoute = 1;
        }
        await rider.save();
      }
      
      // Emit bid_accepted event
      const io = req.app.get('io');
      if (io) {
        const populatedOrder = await Order.findById(order._id)
          .populate('shop', 'shopName shopAddress phone shopCertified')
          .populate('rider', 'name phone vehicleType rating');
        
        io.to(`rider_${bid.rider}`).emit('bid_accepted', {
          orderId: order._id,
          order: populatedOrder
        });
        
        // Also notify shop
        io.to(`shop_${req.user._id}`).emit('bid_accepted', {
          orderId: order._id,
          order: populatedOrder
        });
        
        // Notify order room
        io.to(`order_${order._id}`).emit('order_status_update', {
          orderId: order._id,
          status: 'accepted',
          rider: populatedOrder.rider
        });
      }
    } else if (actionType === 'reject') {
      bid.status = 'rejected';
    }

    await order.save();

    // Emit socket event to both rider and shop
    const io = req.app.get('io');
    if (io) {
      // Emit to rider
      io.to(`rider_${bid.rider}`).emit('bid_message', {
        orderId: order._id,
        bidIndex,
        message: messageText,
        action: actionType,
        shop: {
          shopName: req.user.shopName,
          shopCertified: req.user.shopCertified
        }
      });
      // Also emit to shop so they see their own message immediately
      io.to(`user_${req.user._id}`).emit('bid_message', {
        orderId: order._id,
        bidIndex,
        message: messageText,
        action: actionType
      });
      // Emit to order room
      io.to(`order_${order._id}`).emit('bid_message', {
        orderId: order._id,
        bidIndex,
        message: messageText,
        action: actionType
      });
    }

    res.json({ message: 'Message sent successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept a bid
router.post('/orders/:orderId/accept-bid', async (req, res) => {
  try {
    const { bidIndex } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order || order.shop.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'bidding') {
      return res.status(400).json({ message: 'Order is not in bidding status' });
    }

    const bid = order.bids[bidIndex];
    if (!bid) {
      return res.status(400).json({ message: 'Invalid bid' });
    }

    // Check for PIN in request
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ message: 'Transaction PIN is required to accept bid' });
    }

    // Verify transaction PIN
    const shopUser = await User.findById(req.user._id).select('+transactionPin');
    if (!shopUser.transactionPin) {
      return res.status(400).json({ 
        message: 'Transaction PIN not set. Please set your PIN in profile settings first.' 
      });
    }

    const isPinValid = await shopUser.compareTransactionPin(pin);
    if (!isPinValid) {
      return res.status(401).json({ message: 'Invalid transaction PIN' });
    }

    // Check shop wallet balance
    const shopWallet = await Wallet.findOne({ user: req.user._id });
    if (!shopWallet || shopWallet.balance < bid.price) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Mark the accepted bid
    order.bids[bidIndex].status = 'accepted';
    
    // Mark all other bids as rejected
    order.bids.forEach((b, idx) => {
      if (idx !== bidIndex) {
        b.status = 'rejected';
      }
    });
    
    order.rider = bid.rider;
    order.acceptedBid = {
      price: bid.price,
      estimatedTime: bid.estimatedTime,
      acceptedAt: new Date()
    };
    order.status = 'accepted';
    await order.save();

    // Update rider status to "accepting orders" on this route
    const rider = await User.findById(bid.rider);
    rider.isFree = false;
    rider.activeOrder = order._id;
    
    // Check if rider is already accepting orders on a route
    if (rider.acceptingOrders && rider.activeRoute) {
      // Check if this order is on the same route
      const isSameRoute = order.deliveryAddress.includes(rider.activeRoute.area) ||
        (rider.activeRoute.deliveryLocation && order.deliveryLocation &&
         Math.abs(rider.activeRoute.deliveryLocation.lat - order.deliveryLocation.lat) < 0.01 &&
         Math.abs(rider.activeRoute.deliveryLocation.lng - order.deliveryLocation.lng) < 0.01);
      
      if (isSameRoute) {
        // Same route - increment count
        if (rider.ordersAcceptedOnRoute < rider.maxOrdersOnRoute) {
          rider.ordersAcceptedOnRoute += 1;
          console.log(`✅ Rider ${rider.name} accepted another order on route: ${order.deliveryAddress} (${rider.ordersAcceptedOnRoute}/${rider.maxOrdersOnRoute})`);
        }
      } else {
        // Different route - reset and start new route
        rider.acceptingOrders = true;
        rider.activeRoute = {
          deliveryLocation: order.deliveryLocation || null,
          deliveryAddress: order.deliveryAddress,
          area: order.deliveryAddress.split(',')[0]
        };
        rider.maxOrdersOnRoute = 4;
        rider.ordersAcceptedOnRoute = 1;
        console.log(`✅ Rider ${rider.name} started new route: ${order.deliveryAddress} (1/4)`);
      }
    } else {
      // First order on a route - set up route acceptance
      rider.acceptingOrders = true;
      rider.activeRoute = {
        deliveryLocation: order.deliveryLocation || null,
        deliveryAddress: order.deliveryAddress,
        area: order.deliveryAddress.split(',')[0] // Extract area name
      };
      rider.maxOrdersOnRoute = 4; // Maximum 4 more orders on this route
      rider.ordersAcceptedOnRoute = 1; // This is the first order on this route
      console.log(`✅ Rider ${rider.name} is now accepting orders on route: ${order.deliveryAddress} (1/4)`);
    }
    
    await rider.save();

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      const populatedOrder = await Order.findById(order._id)
        .populate('shop', 'shopName shopAddress phone shopCertified')
        .populate('rider', 'name phone vehicleType rating');
      
      // Notify rider
      io.to(`rider_${bid.rider}`).emit('bid_accepted', {
        orderId: order._id,
        order: populatedOrder
      });
      
      // Notify shop
      io.to(`shop_${req.user._id}`).emit('bid_accepted', {
        orderId: order._id,
        order: populatedOrder
      });
      
      // Notify order room
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        status: 'accepted',
        rider: populatedOrder.rider
      });
      
      // Notify all riders that this order is no longer available
      io.emit('order_accepted', {
        orderId: order._id,
        riderId: bid.rider
      });
    }

    res.json({ message: 'Bid accepted successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark goods as handed over
router.post('/orders/:orderId/handover', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order || order.shop.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'accepted') {
      return res.status(400).json({ message: 'Order must be accepted first' });
    }

    order.status = 'picked_up';
    order.pickedUpAt = new Date();
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        status: 'picked_up'
      });
    }

    res.json({ message: 'Goods marked as handed over', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate rider after delivery
router.post('/orders/:orderId/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order || order.shop.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Order must be delivered first' });
    }

    order.shopRating = parseInt(rating);
    await order.save();

    // Update rider rating
    if (order.rider) {
      const rider = await User.findById(order.rider);
      const totalRating = (rider.rating * rider.totalRatings) + parseInt(rating);
      rider.totalRatings += 1;
      rider.rating = totalRating / rider.totalRatings;
      await rider.save();
    }

    res.json({ message: 'Rating submitted successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PRODUCT ROUTES ====================

// Get all products for the shop
router.get('/products', async (req, res) => {
  try {
    const { category, inStock } = req.query;
    const query = { shop: req.user._id };
    
    if (category) {
      query.category = category;
    }
    
    if (inStock !== undefined) {
      query.inStock = inStock === 'true';
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/products/:productId', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      shop: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new product
router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, inStock, stockQuantity, unit } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, category, price' 
      });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          imageUrl = await uploadToCloudinary(req.file.buffer, 'njiani/products');
        } else {
          imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.error('Error uploading product image:', uploadError);
        return res.status(500).json({ message: 'Failed to upload product image' });
      }
    }

    const product = new Product({
      shop: req.user._id,
      name: name.trim(),
      description: description?.trim() || '',
      category: category.trim(),
      price: parseFloat(price),
      image: imageUrl,
      inStock: inStock === 'true' || inStock === true,
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
      unit: unit?.trim() || 'piece'
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update product
router.put('/products/:productId', upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, inStock, stockQuantity, unit } = req.body;
    
    const product = await Product.findOne({
      _id: req.params.productId,
      shop: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update fields
    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (category !== undefined) product.category = category.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (inStock !== undefined) product.inStock = inStock === 'true' || inStock === true;
    if (stockQuantity !== undefined) product.stockQuantity = parseInt(stockQuantity);
    if (unit !== undefined) product.unit = unit.trim();

    // Handle image upload
    if (req.file) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          product.image = await uploadToCloudinary(req.file.buffer, 'njiani/products');
        } else {
          product.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.error('Error uploading product image:', uploadError);
        return res.status(500).json({ message: 'Failed to upload product image' });
      }
    }

    await product.save();
    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete product
router.delete('/products/:productId', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.productId,
      shop: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product categories (unique categories for the shop)
router.get('/products/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { shop: req.user._id });
    res.json({ categories });
  } catch (error) {
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
        userRole: 'shop',
        messages: [],
        status: 'open'
      });
      await conversation.save();
    }
    
    await conversation.populate('user', 'shopName name phone email role');
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
        userRole: 'shop',
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

