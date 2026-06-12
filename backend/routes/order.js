import express from 'express';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = express.Router();

// Get live map data (public route for landing page)
router.get('/live-map', async (req, res) => {
  try {
    // Get active deliveries
    const activeDeliveries = await Order.find({
      status: { $in: ['picked_up', 'in_transit'] }
    })
      .populate('rider', 'name phone vehicleType currentLocation')
      .populate('shop', 'shopName shopAddress shopLogo')
      .select('pickupAddress deliveryAddress deliveryLocation pickupLocation trackingHistory status createdAt');

    // Get active riders with locations
    const activeRiders = await User.find({
      role: 'rider',
      status: { $in: ['approved', 'active'] },
      currentLocation: { $exists: true, $ne: null },
      isFree: false // Only show riders who are currently working
    })
      .select('name phone vehicleType currentLocation isFree');

    // Get shops with locations
    const shops = await User.find({
      role: 'shop',
      status: 'active',
      shopAddress: { $exists: true, $ne: '' }
    })
      .select('shopName shopAddress shopLogo phone')
      .limit(50); // Limit to prevent too many markers

    res.json({
      activeDeliveries: activeDeliveries.map(delivery => ({
        id: delivery._id,
        status: delivery.status,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        pickupLocation: delivery.pickupLocation,
        deliveryLocation: delivery.deliveryLocation,
        rider: delivery.rider ? {
          id: delivery.rider._id,
          name: delivery.rider.name,
          phone: delivery.rider.phone,
          vehicleType: delivery.rider.vehicleType,
          currentLocation: delivery.rider.currentLocation
        } : null,
        shop: delivery.shop ? {
          id: delivery.shop._id,
          name: delivery.shop.shopName,
          address: delivery.shop.shopAddress,
          logo: delivery.shop.shopLogo
        } : null,
        trackingHistory: delivery.trackingHistory || [],
        createdAt: delivery.createdAt
      })),
      activeRiders: activeRiders.map(rider => ({
        id: rider._id,
        name: rider.name,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        location: rider.currentLocation,
        isFree: rider.isFree
      })),
      shops: shops.map(shop => ({
        id: shop._id,
        name: shop.shopName,
        address: shop.shopAddress,
        logo: shop.shopLogo,
        phone: shop.phone
      }))
    });
  } catch (error) {
    console.error('Error fetching live map data:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get order details (for viewing, not modifying)
router.get('/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('shop', 'shopName shopAddress phone email')
      .populate('rider', 'name phone email vehicleType')
      .populate('bids.rider', 'name phone vehicleType rating');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access: shop, rider, or admin
    const isShop = order.shop.toString() === req.user._id.toString();
    const isRider = order.rider && order.rider.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isShop && !isRider && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order tracking (for real-time map)
router.get('/:orderId/tracking', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('rider', 'name phone vehicleType currentLocation')
      .populate('shop', 'shopName shopAddress');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    const isShop = req.user.role === 'shop' && order.shop.toString() === req.user._id.toString();
    const isRider = req.user.role === 'rider' && order.rider && order.rider._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isShop && !isRider && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

