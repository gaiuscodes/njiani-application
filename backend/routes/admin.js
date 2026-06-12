import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Product from '../models/Product.js';
import AdminMessage from '../models/AdminMessage.js';
import upload from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalRiders = await User.countDocuments({ role: 'rider' });
    const approvedRiders = await User.countDocuments({ role: 'rider', status: { $in: ['approved', 'active'] } });
    const pendingRiders = await User.countDocuments({ role: 'rider', status: 'pending' });
    const totalShops = await User.countDocuments({ role: 'shop' });
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ status: { $in: ['accepted', 'picked_up', 'in_transit'] } });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });

    // Calculate platform earnings
    const completedOrdersList = await Order.find({ status: 'delivered' });
    const totalPlatformFees = completedOrdersList.reduce((sum, order) => sum + (order.platformFee || 0), 0);

    // Get admin wallet
    const adminWallet = await Wallet.findOne({ user: req.user._id });
    const platformBalance = adminWallet?.balance || 0;

    // Top riders
    const topRiders = await User.find({ role: 'rider' })
      .sort({ totalEarnings: -1 })
      .limit(5)
      .select('name phone totalEarnings totalDeliveries rating');

    res.json({
      stats: {
        totalRiders,
        approvedRiders,
        pendingRiders,
        totalShops,
        totalOrders,
        activeOrders,
        completedOrders,
        totalPlatformFees,
        platformBalance
      },
      topRiders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all riders
router.get('/riders', async (req, res) => {
  try {
    const { status } = req.query;
    const query = { role: 'rider' };
    
    if (status) {
      query.status = status;
    }

    const riders = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ riders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all shops
router.get('/shops', async (req, res) => {
  try {
    const shops = await User.find({ role: 'shop' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ shops });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('shop', 'shopName shopAddress phone')
      .populate('rider', 'name phone vehicleType')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/reject rider
router.post('/riders/:riderId/approve', async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const { riderId } = req.params;

    console.log('=== RIDER APPROVAL REQUEST ===');
    console.log('Rider ID:', riderId);
    console.log('Action:', action);
    console.log('User:', req.user?._id, req.user?.role);

    if (!action || !['approve', 'reject'].includes(action)) {
      console.log('❌ Invalid action:', action);
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    const rider = await User.findById(riderId);

    if (!rider) {
      console.log('❌ Rider not found:', riderId);
      return res.status(404).json({ message: 'Rider not found' });
    }

    if (rider.role !== 'rider') {
      console.log('❌ User is not a rider:', rider.role);
      return res.status(400).json({ message: 'User is not a rider' });
    }

    console.log('✅ Rider found:', rider.name, 'Current status:', rider.status);

    // Update status
    const previousStatus = rider.status;
    if (action === 'approve') {
      rider.status = 'approved';
    } else if (action === 'reject') {
      rider.status = 'rejected';
    }

    console.log('Updating status to:', rider.status);
    await rider.save();

    // Verify the save
    const updatedRider = await User.findById(riderId);
    console.log('✅ Status updated successfully. New status:', updatedRider.status);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`rider_${rider._id}`).emit('approval_status', {
        status: rider.status
      });
      console.log('✅ Socket event emitted');
    }

    console.log('✅ RIDER APPROVAL SUCCESS');
    console.log('========================\n');

    res.json({ 
      message: `Rider ${action}d successfully`, 
      rider: {
        _id: updatedRider._id,
        name: updatedRider.name,
        status: updatedRider.status,
        role: updatedRider.role
      }
    });
  } catch (error) {
    console.error('❌ RIDER APPROVAL ERROR');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('========================\n');
    res.status(500).json({ 
      message: error.message || 'Failed to update rider status',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get active deliveries for map
router.get('/active-deliveries', async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['picked_up', 'in_transit'] }
    })
      .populate('rider', 'name phone vehicleType currentLocation')
      .populate('shop', 'shopName shopAddress')
      .select('deliveryAddress deliveryLocation trackingHistory status');

    res.json({ deliveries: orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== EDIT SHOP ====================

// Get single shop details
router.get('/shops/:shopId', async (req, res) => {
  try {
    const shop = await User.findById(req.params.shopId).select('-password');
    if (!shop || shop.role !== 'shop') {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json({ shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update shop
router.put('/shops/:shopId', upload.single('shopLogo'), async (req, res) => {
  try {
    const { shopName, phone, email, shopAddress, status, emailVerified } = req.body;
    const shop = await User.findById(req.params.shopId);

    if (!shop || shop.role !== 'shop') {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (shopName) shop.shopName = shopName.trim();
    if (phone) {
      if (!/^0\d{9}$/.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      shop.phone = phone;
    }
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      shop.email = email.toLowerCase();
    }
    if (shopAddress) shop.shopAddress = shopAddress.trim();
    if (status) shop.status = status;
    if (emailVerified !== undefined) shop.emailVerified = emailVerified === 'true' || emailVerified === true;

    if (req.file) {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          shop.shopLogo = await uploadToCloudinary(req.file.buffer, 'njiani/shops');
        } else {
          shop.shopLogo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
      } catch (uploadError) {
        console.error('Error uploading shop logo:', uploadError);
        return res.status(500).json({ message: 'Failed to upload shop logo' });
      }
    }

    await shop.save();
    const updatedShop = await User.findById(shop._id).select('-password');
    res.json({ message: 'Shop updated successfully', shop: updatedShop });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reset shop password
router.post('/shops/:shopId/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const shop = await User.findById(req.params.shopId);

    if (!shop || shop.role !== 'shop') {
      return res.status(404).json({ message: 'Shop not found' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    shop.password = hashedPassword;
    await shop.save();

    res.json({ message: 'Shop password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== EDIT RIDER ====================

// Get single rider details
router.get('/riders/:riderId', async (req, res) => {
  try {
    const rider = await User.findById(req.params.riderId).select('-password');
    if (!rider || rider.role !== 'rider') {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.json({ rider });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update rider
router.put('/riders/:riderId', upload.fields([
  { name: 'selfiePhoto', maxCount: 1 },
  { name: 'idPhoto', maxCount: 1 },
  { name: 'licensePhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, phone, email, nationalId, vehicleType, status, preferredAreas } = req.body;
    const rider = await User.findById(req.params.riderId);

    if (!rider || rider.role !== 'rider') {
      return res.status(404).json({ message: 'Rider not found' });
    }

    if (name) rider.name = name.trim();
    if (phone) {
      if (!/^0\d{9}$/.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      rider.phone = phone;
    }
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      rider.email = email.toLowerCase();
    }
    if (nationalId) rider.nationalId = nationalId.trim();
    if (vehicleType) rider.vehicleType = vehicleType;
    if (status) rider.status = status;
    if (preferredAreas) {
      rider.preferredAreas = Array.isArray(preferredAreas) 
        ? preferredAreas 
        : preferredAreas.split(',').map(a => a.trim()).filter(a => a);
    }

    // Handle photo uploads
    if (req.files) {
      if (req.files.selfiePhoto && req.files.selfiePhoto[0]) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          rider.selfiePhoto = await uploadToCloudinary(req.files.selfiePhoto[0].buffer, 'njiani/riders/selfies');
        } else {
          rider.selfiePhoto = `data:${req.files.selfiePhoto[0].mimetype};base64,${req.files.selfiePhoto[0].buffer.toString('base64')}`;
        }
      }
      if (req.files.idPhoto && req.files.idPhoto[0]) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          rider.idPhoto = await uploadToCloudinary(req.files.idPhoto[0].buffer, 'njiani/riders/ids');
        } else {
          rider.idPhoto = `data:${req.files.idPhoto[0].mimetype};base64,${req.files.idPhoto[0].buffer.toString('base64')}`;
        }
      }
      if (req.files.licensePhoto && req.files.licensePhoto[0]) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          rider.licensePhoto = await uploadToCloudinary(req.files.licensePhoto[0].buffer, 'njiani/riders/licenses');
        } else {
          rider.licensePhoto = `data:${req.files.licensePhoto[0].mimetype};base64,${req.files.licensePhoto[0].buffer.toString('base64')}`;
        }
      }
    }

    await rider.save();
    const updatedRider = await User.findById(rider._id).select('-password');
    res.json({ message: 'Rider updated successfully', rider: updatedRider });
  } catch (error) {
    console.error('Error updating rider:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reset rider password
router.post('/riders/:riderId/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const rider = await User.findById(req.params.riderId);

    if (!rider || rider.role !== 'rider') {
      return res.status(404).json({ message: 'Rider not found' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    rider.password = hashedPassword;
    await rider.save();

    res.json({ message: 'Rider password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SHOP PRODUCTS ====================

// Get shop products
router.get('/shops/:shopId/products', async (req, res) => {
  try {
    const products = await Product.find({ shop: req.params.shopId }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update shop product
router.put('/shops/:shopId/products/:productId', upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, inStock, stockQuantity, unit } = req.body;
    const product = await Product.findOne({
      _id: req.params.productId,
      shop: req.params.shopId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (category) product.category = category.trim();
    if (price !== undefined) product.price = parseFloat(price);
    if (inStock !== undefined) product.inStock = inStock === 'true' || inStock === true;
    if (stockQuantity !== undefined) product.stockQuantity = parseInt(stockQuantity);
    if (unit) product.unit = unit.trim();

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
    res.status(500).json({ message: error.message });
  }
});

// Delete shop product
router.delete('/shops/:shopId/products/:productId', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.productId,
      shop: req.params.shopId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== ORDER MANAGEMENT ====================

// Update order status
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'bidding', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        status: order.status
      });
    }

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all bids across all orders
router.get('/bids', async (req, res) => {
  try {
    const { status, sortBy = 'newest' } = req.query;
    
    // Get all orders with bids
    const query = { 'bids.0': { $exists: true } };
    if (status && status !== 'all') {
      query['bids.status'] = status;
    }
    
    const orders = await Order.find(query)
      .populate('shop', 'shopName phone email')
      .populate('bids.rider', 'name phone email vehicleType rating')
      .sort(sortBy === 'newest' ? { createdAt: -1 } : { createdAt: 1 });

    // Flatten bids with order info
    const allBids = [];
    orders.forEach(order => {
      order.bids.forEach(bid => {
        allBids.push({
          _id: bid._id,
          orderId: order._id,
          orderDetails: {
            customerName: order.customerName,
            deliveryAddress: order.deliveryAddress,
            goodsDescription: order.goodsDescription,
            goodsValue: order.goodsValue,
            isUrgent: order.isUrgent,
            status: order.status
          },
          shop: order.shop,
          rider: bid.rider,
          price: bid.price,
          estimatedTime: bid.estimatedTime,
          message: bid.message,
          bidAt: bid.bidAt,
          status: bid.status,
          communicationHistory: bid.communicationHistory || []
        });
      });
    });

    // Filter by status if specified
    const filteredBids = status && status !== 'all' 
      ? allBids.filter(bid => bid.status === status)
      : allBids;

    res.json({ bids: filteredBids, total: filteredBids.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get reports from all users (admin view)
router.get('/reports/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, format = 'json', userRole, userId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let data = [];

    switch (reportType) {
      case 'orders':
        const orderQuery = {
          createdAt: { $gte: start, $lte: end }
        };
        if (userRole) {
          if (userRole === 'shop') {
            const shops = userId ? [userId] : (await User.find({ role: 'shop' })).map(s => s._id);
            orderQuery.shop = { $in: shops };
          } else if (userRole === 'rider') {
            const riders = userId ? [userId] : (await User.find({ role: 'rider' })).map(r => r._id);
            orderQuery.rider = { $in: riders };
          }
        }
        data = await Order.find(orderQuery)
          .populate('shop', 'shopName phone email')
          .populate('rider', 'name phone email')
          .sort({ createdAt: -1 });
        break;

      case 'transactions':
        const walletQuery = {};
        if (userRole) {
          const users = userId ? [userId] : (await User.find({ role: userRole })).map(u => u._id);
          walletQuery.user = { $in: users };
        }
        const wallets = await Wallet.find(walletQuery);
        wallets.forEach(wallet => {
          wallet.transactions.forEach(tx => {
            if (tx.createdAt >= start && tx.createdAt <= end) {
              data.push({
                userId: wallet.user,
                type: tx.type,
                amount: tx.amount,
                description: tx.description,
                order: tx.order,
                status: tx.status,
                createdAt: tx.createdAt
              });
            }
          });
        });
        break;

      case 'users':
        const userQuery = {
          createdAt: { $gte: start, $lte: end }
        };
        if (userRole) {
          userQuery.role = userRole;
        }
        data = await User.find(userQuery)
          .select('-password')
          .sort({ createdAt: -1 });
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    if (format === 'csv') {
      // CSV export logic here
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${Date.now()}.csv`);
      // Simple CSV conversion
      const csv = convertToCSV(data, reportType);
      res.send(csv);
    } else {
      res.json({ data, total: data.length, startDate, endDate });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data, type) {
  if (!data || data.length === 0) return '';
  
  // Simple CSV conversion - can be enhanced
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(item => {
    return Object.values(item).map(val => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val).replace(/,/g, ';');
    }).join(',');
  });
  
  return [headers, ...rows].join('\n');
}

// Get all admin messages (conversations)
router.get('/messages', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    const conversations = await AdminMessage.find(query)
      .populate('user', 'name shopName phone email role')
      .sort({ lastMessageAt: -1 });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a specific conversation
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const conversation = await AdminMessage.findById(req.params.conversationId)
      .populate('user', 'name shopName phone email role');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send message as admin
router.post('/messages/:conversationId/send', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const conversation = await AdminMessage.findById(req.params.conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.messages.push({
      sender: 'admin',
      message: message.trim(),
      timestamp: new Date(),
      read: false
    });
    
    conversation.lastMessageAt = new Date();
    if (conversation.status === 'resolved') {
      conversation.status = 'open';
    }
    
    await conversation.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${conversation.user}`).emit('admin_message', {
        conversationId: conversation._id,
        message: {
          sender: 'admin',
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

// Update conversation status
router.put('/messages/:conversationId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['open', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const conversation = await AdminMessage.findByIdAndUpdate(
      req.params.conversationId,
      { status },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json({ message: 'Status updated successfully', conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

