import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani');
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // await Wallet.deleteMany({});

    // Create Admin
    const adminExists = await User.findOne({ role: 'admin', phone: 'admin' });
    if (!adminExists) {
      const admin = new User({
        role: 'admin',
        name: 'Admin',
        phone: 'admin',
        password: 'King2025',
        status: 'active'
      });
      await admin.save();
      await Wallet.create({ user: admin._id });
      console.log('✅ Admin created');
    } else {
      console.log('ℹ️  Admin already exists');
    }

    // Create Pre-seeded Riders
    const riders = [
      {
        name: 'Einstein Masaba',
        phone: '0700412580',
        password: 'akanda123',
        nationalId: '12345678',
        vehicleType: 'Motorcycle',
        preferredAreas: ['CBD/Parklands'],
        status: 'approved',
        termsAccepted: true,
        affidavitAccepted: true,
        isFree: true,
        rating: 4.5,
        totalRatings: 10
      },
      {
        name: 'Peter Munyasia',
        phone: '0724427780',
        password: 'munyasia321',
        nationalId: '87654321',
        vehicleType: 'Bicycle',
        preferredAreas: ['CBD/Parklands'],
        status: 'approved',
        termsAccepted: true,
        affidavitAccepted: true,
        isFree: true,
        rating: 4.8,
        totalRatings: 15
      },
      {
        name: 'Godie',
        phone: '0712345678',
        password: 'godie123',
        nationalId: '11111111',
        vehicleType: 'Motorcycle',
        preferredAreas: ['CBD/Parklands'],
        status: 'approved',
        termsAccepted: true,
        affidavitAccepted: true,
        isFree: true,
        rating: 4.7,
        totalRatings: 8
      },
      {
        name: 'Bob',
        phone: '0723456789',
        password: 'bob123',
        nationalId: '22222222',
        vehicleType: 'Bicycle',
        preferredAreas: ['CBD/Parklands'],
        status: 'approved',
        termsAccepted: true,
        affidavitAccepted: true,
        isFree: true,
        rating: 4.6,
        totalRatings: 12
      }
    ];

    for (const riderData of riders) {
      const existingRider = await User.findOne({ phone: riderData.phone });
      if (!existingRider) {
        const rider = new User({
          role: 'rider',
          ...riderData
        });
        await rider.save();
        await Wallet.create({ user: rider._id });
        console.log(`✅ Rider created: ${riderData.name}`);
      } else {
        console.log(`ℹ️  Rider already exists: ${riderData.name}`);
      }
    }

    // Create Test Shop: Umai Naturals
    const shopExists = await User.findOne({ phone: '0700111222' });
    if (!shopExists) {
      const shop = new User({
        role: 'shop',
        shopName: 'Umai Naturals',
        phone: '0700111222',
        password: 'umai123',
        shopAddress: 'Westlands, Nairobi, Kenya',
        status: 'active'
      });
      await shop.save();
      await Wallet.create({ user: shop._id });
      console.log('✅ Test shop created: Umai Naturals');
    } else {
      console.log('ℹ️  Test shop already exists: Umai Naturals');
    }

    console.log('✅ Database seeding completed!');
    console.log('\n📋 Test Account Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏪 SHOP:');
    console.log('   Name: Umai Naturals');
    console.log('   Phone: 0700111222');
    console.log('   Password: umai123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏍️  RIDERS:');
    console.log('   Godie - Phone: 0712345678 | Password: godie123');
    console.log('   Bob - Phone: 0723456789 | Password: bob123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 ADMIN:');
    console.log('   Username: admin');
    console.log('   Password: King2025');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();

