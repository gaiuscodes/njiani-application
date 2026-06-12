import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const listAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani');
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('-password -emailVerificationToken -passwordResetToken').sort({ role: 1, createdAt: 1 });

    if (users.length === 0) {
      console.log('❌ No accounts found in the system.');
      process.exit(0);
    }

    // Group by role
    const admins = users.filter(u => u.role === 'admin');
    const shops = users.filter(u => u.role === 'shop');
    const riders = users.filter(u => u.role === 'rider');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    ACCOUNT LOGIN DETAILS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Admin Accounts
    if (admins.length > 0) {
      console.log('👑 ADMIN ACCOUNTS');
      console.log('─────────────────────────────────────────────────────────────');
      admins.forEach((admin, idx) => {
        console.log(`\n${idx + 1}. Admin Account:`);
        console.log(`   📱 Phone/Username: ${admin.phone}`);
        console.log(`   👤 Name: ${admin.name || 'N/A'}`);
        console.log(`   📧 Email: ${admin.email || 'N/A'}`);
        console.log(`   ✅ Status: ${admin.status || 'N/A'}`);
        console.log(`   🆔 User ID: ${admin._id}`);
        console.log(`   📅 Created: ${admin.createdAt ? new Date(admin.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`   🔐 Login: Use phone "${admin.phone}" and password (set during creation)`);
      });
      console.log('\n');
    }

    // Shop Accounts
    if (shops.length > 0) {
      console.log('🏪 SHOP ACCOUNTS');
      console.log('─────────────────────────────────────────────────────────────');
      shops.forEach((shop, idx) => {
        console.log(`\n${idx + 1}. ${shop.shopName || 'Unnamed Shop'}:`);
        console.log(`   📱 Phone: ${shop.phone}`);
        console.log(`   📧 Email: ${shop.email || 'N/A'}`);
        console.log(`   🏪 Shop Name: ${shop.shopName || 'N/A'}`);
        console.log(`   📍 Address: ${shop.shopAddress || 'N/A'}`);
        console.log(`   ✅ Status: ${shop.status || 'N/A'}`);
        console.log(`   ✉️  Email Verified: ${shop.emailVerified ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   🆔 User ID: ${shop._id}`);
        console.log(`   📅 Created: ${shop.createdAt ? new Date(shop.createdAt).toLocaleString() : 'N/A'}`);
        const loginEmail = shop.email || 'N/A (use phone only)';
        console.log(`   🔐 Login: Use email "${loginEmail}" or phone "${shop.phone}" with password`);
      });
      console.log('\n');
    }

    // Rider Accounts
    if (riders.length > 0) {
      console.log('🏍️  RIDER ACCOUNTS');
      console.log('─────────────────────────────────────────────────────────────');
      riders.forEach((rider, idx) => {
        console.log(`\n${idx + 1}. ${rider.name || 'Unnamed Rider'}:`);
        console.log(`   📱 Phone: ${rider.phone}`);
        console.log(`   📧 Email: ${rider.email || 'N/A'}`);
        console.log(`   👤 Name: ${rider.name || 'N/A'}`);
        console.log(`   🆔 National ID: ${rider.nationalId || 'N/A'}`);
        console.log(`   🏍️  Vehicle: ${rider.vehicleType || 'N/A'}`);
        console.log(`   ✅ Status: ${rider.status || 'N/A'}`);
        console.log(`   ✉️  Email Verified: ${rider.emailVerified ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   🆔 User ID: ${rider._id}`);
        console.log(`   📅 Created: ${rider.createdAt ? new Date(rider.createdAt).toLocaleString() : 'N/A'}`);
        const loginEmail = rider.email || 'N/A (use phone only)';
        console.log(`   🔐 Login: Use email "${loginEmail}" or phone "${rider.phone}" with password`);
      });
      console.log('\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   👑 Admins: ${admins.length}`);
    console.log(`   🏪 Shops: ${shops.length}`);
    console.log(`   🏍️  Riders: ${riders.length}`);
    console.log(`   📊 Total Accounts: ${users.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Note about passwords
    console.log('📝 NOTE:');
    console.log('   - Passwords are hashed and cannot be displayed');
    console.log('   - To reset a password, use the "Forgot Password" feature');
    console.log('   - Admin password is set to "King2025" (can be changed)');
    console.log('   - Other accounts use passwords set during registration\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing accounts:', error);
    process.exit(1);
  }
};

listAccounts();

