import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const fixAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      console.log('Creating new admin user...');
      const hashedPassword = await bcrypt.hash('King2025', 12);

      admin = new User({
        role: 'admin',
        username: 'admin',
        name: 'Admin',
        phone: 'admin',
        password: hashedPassword,
        status: 'active',
        emailVerified: true,
      });
      await admin.save();
      console.log('✅ Admin user created');

      const walletExists = await Wallet.findOne({ user: admin._id });
      if (!walletExists) {
        await Wallet.create({ user: admin._id });
        console.log('✅ Admin wallet created');
      }
    } else {
      console.log('Admin found, updating...');
      const hashedPassword = await bcrypt.hash('King2025', 12);
      admin.password = hashedPassword;
      admin.username = admin.username || 'admin';  // ← ensure username exists
      admin.name = admin.name || 'Admin';
      admin.status = 'active';
      await admin.save();

      const testMatch = await bcrypt.compare('King2025', admin.password);
      console.log('✅ Password verification:', testMatch ? 'PASSED' : 'FAILED');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Username: admin');
    console.log('   Password: King2025');
    console.log('   Status:', admin.status);
    console.log('   User ID:', admin._id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixAdmin();