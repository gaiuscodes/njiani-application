import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import riderRoutes from './routes/rider.js';
import shopRoutes from './routes/shop.js';
import adminRoutes from './routes/admin.js';
import orderRoutes from './routes/order.js';
import walletRoutes from './routes/wallet.js';
import mpesaRoutes from './routes/mpesa.js';
import notificationRoutes from './routes/notifications.js';
import messageRoutes from './routes/messages.js';
import reportRoutes from './routes/reports.js';
import complaintRoutes from './routes/complaints.js';
import subscriptionRoutes from './routes/subscriptions.js';
import { initializeSocket } from './socket/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.io
initializeSocket(io);

// Make io available to routes
app.set('io', io);

// Initialize payout requests storage (in production, use Redis or database)
app.set('payoutRequests', new Map());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// M-Pesa callback doesn't need auth (it's called by Safaricom)
// This is already handled in mpesaRoutes, but ensure it's accessible

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Njiani API is running' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani';
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected');
    
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Njiani server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Make sure MongoDB is running and accessible');
    console.error('   Default connection: mongodb://localhost:27017/njiani');
    console.error('   Or set MONGODB_URI environment variable');
    
    // Still start the server but it won't work without DB
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`⚠️  Server started on port ${PORT} but MongoDB is not connected`);
      console.log(`📡 API available at http://localhost:${PORT}/api (will fail without DB)`);
    });
  }
};

connectDB();

export { io };

