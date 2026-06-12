import express from 'express';
import { protect, shopOnly, adminOnly } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';

const router = express.Router();

// Helper function to format date range
const getDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(0); // Beginning of time if not provided
  const end = endDate ? new Date(endDate) : new Date(); // Now if not provided
  end.setHours(23, 59, 59, 999); // End of day
  return { start, end };
};

// Helper function to generate CSV
const generateCSV = (data, headers) => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
};

// Shop Reports Routes
router.use(protect);

// Get shop order report
router.get('/shop/orders', shopOnly, async (req, res) => {
  try {
    const { startDate, endDate, status, format = 'json' } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    // Build query
    const query = {
      shop: req.user._id,
      createdAt: { $gte: start, $lte: end }
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('rider', 'name phone')
      .populate('shop', 'shopName')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      total: orders.length,
      byStatus: {},
      totalRevenue: 0,
      totalDistance: 0,
      byCategory: {}
    };

    orders.forEach(order => {
      // Status count
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;

      // Revenue (from accepted bid price)
      if (order.acceptedBid && order.acceptedBid.price) {
        stats.totalRevenue += order.acceptedBid.price;
      }

      // Distance
      if (order.distance && order.distance.value) {
        stats.totalDistance += order.distance.value;
      }

      // Category count
      stats.byCategory[order.category] = (stats.byCategory[order.category] || 0) + 1;
    });

    const report = {
      shop: {
        name: req.user.shopName,
        email: req.user.email,
        phone: req.user.phone
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      statistics: stats,
      orders: orders.map(order => ({
        orderId: order._id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        pickupAddress: order.pickupAddress,
        deliveryAddress: order.deliveryAddress,
        goodsDescription: order.goodsDescription,
        goodsValue: order.goodsValue,
        category: order.category,
        status: order.status,
        isUrgent: order.isUrgent,
        distance: order.distance?.text || 'N/A',
        riderName: order.rider?.name || 'N/A',
        riderPhone: order.rider?.phone || 'N/A',
        deliveryPrice: order.acceptedBid?.price || 0,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt
      }))
    };

    if (format === 'csv') {
      const headers = [
        'Order ID', 'Customer Name', 'Customer Phone', 'Pickup Address', 
        'Delivery Address', 'Goods Description', 'Goods Value', 'Category',
        'Status', 'Is Urgent', 'Distance', 'Rider Name', 'Rider Phone',
        'Delivery Price', 'Created At', 'Delivered At'
      ];
      
      const csvData = report.orders.map(order => ({
        'Order ID': order.orderId,
        'Customer Name': order.customerName,
        'Customer Phone': order.customerPhone,
        'Pickup Address': order.pickupAddress,
        'Delivery Address': order.deliveryAddress,
        'Goods Description': order.goodsDescription,
        'Goods Value': order.goodsValue,
        'Category': order.category,
        'Status': order.status,
        'Is Urgent': order.isUrgent ? 'Yes' : 'No',
        'Distance': order.distance,
        'Rider Name': order.riderName,
        'Rider Phone': order.riderPhone,
        'Delivery Price': order.deliveryPrice,
        'Created At': new Date(order.createdAt).toLocaleString(),
        'Delivered At': order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'N/A'
      }));

      const csv = generateCSV(csvData, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders-report-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.json(report);
  } catch (error) {
    console.error('Error generating order report:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get shop financial report
router.get('/shop/financial', shopOnly, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Filter transactions by date
    const transactions = wallet.transactions.filter(trans => {
      const transDate = new Date(trans.createdAt);
      return transDate >= start && transDate <= end;
    });

    // Calculate statistics
    const stats = {
      totalTopups: 0,
      totalPayments: 0,
      totalEarnings: 0,
      totalPayouts: 0,
      totalFees: 0,
      currentBalance: wallet.balance,
      byType: {}
    };

    transactions.forEach(trans => {
      const amount = Math.abs(trans.amount);
      
      if (trans.type === 'topup') {
        stats.totalTopups += amount;
      } else if (trans.type === 'payment') {
        stats.totalPayments += amount;
      } else if (trans.type === 'earning') {
        stats.totalEarnings += amount;
      } else if (trans.type === 'payout') {
        stats.totalPayouts += amount;
      } else if (trans.type === 'fee') {
        stats.totalFees += amount;
      }

      stats.byType[trans.type] = (stats.byType[trans.type] || 0) + amount;
    });

    const report = {
      shop: {
        name: req.user.shopName,
        email: req.user.email,
        phone: req.user.phone
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      statistics: stats,
      transactions: transactions.map(trans => ({
        transactionId: trans._id,
        type: trans.type,
        amount: trans.amount,
        description: trans.description,
        status: trans.status,
        mpesaReference: trans.mpesaReference || 'N/A',
        orderId: trans.order || 'N/A',
        createdAt: trans.createdAt
      }))
    };

    if (format === 'csv') {
      const headers = [
        'Transaction ID', 'Type', 'Amount', 'Description', 
        'Status', 'M-Pesa Reference', 'Order ID', 'Created At'
      ];
      
      const csvData = report.transactions.map(trans => ({
        'Transaction ID': trans.transactionId,
        'Type': trans.type,
        'Amount': trans.amount,
        'Description': trans.description,
        'Status': trans.status,
        'M-Pesa Reference': trans.mpesaReference,
        'Order ID': trans.orderId,
        'Created At': new Date(trans.createdAt).toLocaleString()
      }));

      const csv = generateCSV(csvData, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=financial-report-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.json(report);
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Reports Routes
router.get('/admin/overview', adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    // Get all orders in period
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    })
      .populate('shop', 'shopName')
      .populate('rider', 'name');

    // Get all users
    const shops = await User.countDocuments({ role: 'shop' });
    const riders = await User.countDocuments({ role: 'rider' });

    // Calculate statistics
    const stats = {
      totalOrders: orders.length,
      totalShops: shops,
      totalRiders: riders,
      ordersByStatus: {},
      ordersByCategory: {},
      totalRevenue: 0,
      averageOrderValue: 0
    };

    orders.forEach(order => {
      stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
      stats.ordersByCategory[order.category] = (stats.ordersByCategory[order.category] || 0) + 1;
      
      if (order.acceptedBid && order.acceptedBid.price) {
        stats.totalRevenue += order.acceptedBid.price;
      }
    });

    if (orders.length > 0) {
      stats.averageOrderValue = stats.totalRevenue / orders.length;
    }

    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      statistics: stats,
      orders: orders.length
    });
  } catch (error) {
    console.error('Error generating admin overview:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;












