import express from 'express';
import { protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import upload from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

router.use(protect);

// Get messages for an order (only if user is shop or rider of that order)
router.get('/order/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is part of this order
    const isShop = order.shop.toString() === req.user._id.toString();
    const isRider = order.rider && order.rider.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isShop && !isRider && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allow messaging for active orders or bidding orders (admin can view all)
    if (!isAdmin) {
      const allowedStatuses = ['bidding', 'accepted', 'picked_up', 'in_transit'];
      if (!allowedStatuses.includes(order.status)) {
        return res.status(400).json({ 
          message: `Messaging only available for orders in bidding or active status. Current status: ${order.status}` 
        });
      }
    }

    const messages = await Message.find({ order: order._id })
      .populate('sender', 'name shopName phone username role profilePicture')
      .populate('receiver', 'name shopName phone username role profilePicture')
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message (with optional image attachments)
router.post('/order/:orderId', upload.array('attachments', 5), async (req, res) => {
  try {
    const { message } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is part of this order
    const isShop = order.shop.toString() === req.user._id.toString();
    const isRider = order.rider && order.rider.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isShop && !isRider && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allow messaging for active orders only (accepted, picked_up, in_transit)
    // During bidding, use bid chat instead of regular messages
    if (!isAdmin && !['accepted', 'picked_up', 'in_transit'].includes(order.status)) {
      return res.status(400).json({ 
        message: `Messaging only available for active orders (accepted, picked_up, in_transit). Current status: ${order.status}. ${order.status === 'bidding' ? 'Please use bid chat to communicate during bidding.' : 'Please wait for order to be accepted.'}` 
      });
    }

    // Determine receiver - only for active orders
    let receiverId;
    if (isAdmin) {
      // Admin can send to both shop and rider, default to shop
      receiverId = order.shop;
    } else {
      // For active orders, determine receiver based on sender role
      receiverId = isShop ? order.rider : order.shop;
    }

    if (!receiverId) {
      console.error(`No receiver found for order ${order._id}. Shop: ${order.shop}, Rider: ${order.rider}, Status: ${order.status}, User: ${req.user._id}`);
      return res.status(400).json({ 
        message: `No receiver found for this order. Order status: ${order.status}. The order may not have a rider assigned yet.` 
      });
    }

    // Ensure receiverId is a string/ObjectId for consistent comparison
    receiverId = receiverId.toString();
    const senderId = req.user._id.toString();
    
    // Prevent self-messaging
    if (receiverId === senderId) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }
    
    console.log(`Sending message: Order ${order._id}, From ${senderId} to ${receiverId}`);

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
    if (!message?.trim() && attachments.length === 0) {
      return res.status(400).json({ message: 'Message text or attachment is required' });
    }

    const newMessage = new Message({
      order: order._id,
      sender: req.user._id,
      receiver: receiverId,
      message: message?.trim() || '',
      attachments: attachments
    });

    await newMessage.save();

    // Populate sender and receiver info for response
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name shopName phone username role profilePicture')
      .populate('receiver', 'name shopName phone username role profilePicture')
      .populate('order', '_id status');

    // Emit socket event for real-time messaging to both sender and receiver
    const io = req.app.get('io');
    if (io) {
      // Convert to plain object for socket emission
      const messageData = populatedMessage.toObject();
      
      // Get socket rooms for debugging
      const receiverRoom = `user_${receiverId}`;
      const senderRoom = `user_${senderId}`;
      const orderRoom = `order_${order._id}`;
      
      // Emit to receiver
      io.to(receiverRoom).emit('new_message', {
        message: messageData
      });
      console.log(`📤 Emitted to receiver room: ${receiverRoom}`);
      
      // Also emit to sender so they see their own message immediately
      io.to(senderRoom).emit('new_message', {
        message: messageData
      });
      console.log(`📤 Emitted to sender room: ${senderRoom}`);
      
      // Also emit to order room for all participants
      io.to(orderRoom).emit('new_message', {
        message: messageData
      });
      console.log(`📤 Emitted to order room: ${orderRoom}`);
      
      // Log socket room sizes for debugging
      const receiverSockets = io.sockets.adapter.rooms.get(receiverRoom);
      const senderSockets = io.sockets.adapter.rooms.get(senderRoom);
      const orderSockets = io.sockets.adapter.rooms.get(orderRoom);
      
      console.log(`✅ Message sent via socket: Order ${order._id}, From ${senderId} to ${receiverId}`);
      console.log(`   Receiver room (${receiverRoom}) has ${receiverSockets?.size || 0} socket(s)`);
      console.log(`   Sender room (${senderRoom}) has ${senderSockets?.size || 0} socket(s)`);
      console.log(`   Order room (${orderRoom}) has ${orderSockets?.size || 0} socket(s)`);
    } else {
      console.warn('Socket.io not available for message delivery');
    }

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Message.countDocuments({ 
      receiver: req.user._id, 
      read: false 
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put('/order/:orderId/read', async (req, res) => {
  try {
    await Message.updateMany(
      { order: req.params.orderId, receiver: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

