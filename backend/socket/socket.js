import User from '../models/User.js';
import Order from '../models/Order.js';

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user-specific room
    socket.on('join_user', async (userId) => {
      if (!userId) {
        console.warn('join_user called without userId');
        return;
      }
      
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`👤 User ${userId} joined room: ${roomName}`);
      
      const user = await User.findById(userId);
      if (user) {
        if (user.role === 'rider') {
          socket.join(`rider_${userId}`);
          console.log(`🏍️ Rider ${userId} joined rider room`);
        } else if (user.role === 'shop') {
          socket.join(`shop_${userId}`);
          console.log(`🏪 Shop ${userId} joined shop room`);
        } else if (user.role === 'admin') {
          socket.join('admin');
          console.log(`👑 Admin ${userId} joined admin room`);
        }
      } else {
        console.warn(`User ${userId} not found in database`);
      }
    });

    // Join order room for tracking and messaging
    socket.on('join_order', (orderId) => {
      if (!orderId) {
        console.warn('join_order called without orderId');
        return;
      }
      const roomName = `order_${orderId}`;
      socket.join(roomName);
      console.log(`📦 Socket ${socket.id} joined order room: ${roomName}`);
    });

    // Handle location updates from rider
    socket.on('rider_location', async (data) => {
      const { riderId, lat, lng, orderId } = data;

      // Update rider location
      await User.findByIdAndUpdate(riderId, {
        currentLocation: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          updatedAt: new Date()
        }
      });

      // Update order tracking if order exists
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          $push: {
            trackingHistory: {
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              timestamp: new Date()
            }
          }
        });

        // Broadcast to order room
        io.to(`order_${orderId}`).emit('location_update', {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          timestamp: new Date()
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Make io available to routes
  return io;
};

