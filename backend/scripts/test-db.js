import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const testConnection = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani';
    console.log('🔌 Connecting to MongoDB:', uri.replace(/\/\/.*@/, '//***@')); // Hide credentials
    
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully!');
    
    // Test query
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
    // Check test accounts
    const umaiShop = await User.findOne({ shopName: 'Umai Naturals' });
    const godieRider = await User.findOne({ name: 'Godie' });
    const bobRider = await User.findOne({ name: 'Bob' });
    
    console.log('\n📋 Test Accounts Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏪 Umai Naturals: ${umaiShop ? '✅ Found' : '❌ Not found'}`);
    console.log(`🏍️  Godie: ${godieRider ? '✅ Found' : '❌ Not found'}`);
    console.log(`🏍️  Bob: ${bobRider ? '✅ Found' : '❌ Not found'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.disconnect();
    console.log('✅ Database connection test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('\n💡 Make sure MongoDB is running:');
    console.error('   - Windows: Check if MongoDB service is running');
    console.error('   - Or use MongoDB Atlas (cloud) and set MONGODB_URI in .env');
    process.exit(1);
  }
};

testConnection();

