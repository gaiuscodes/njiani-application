import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const showLoginDetails = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani');
    console.log('✅ Connected to MongoDB\n');

    // Get all shops
    const shops = await User.find({ role: 'shop' }).sort({ createdAt: -1 });
    
    // Get all riders
    const riders = await User.find({ role: 'rider' }).sort({ createdAt: -1 });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('              SHOP LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (shops.length === 0) {
      console.log('   No shop accounts found.\n');
    } else {
      shops.forEach((shop, index) => {
        console.log(`${index + 1}. ${shop.shopName || 'Unnamed Shop'}`);
        console.log('   ───────────────────────────────────────────────────────────');
        console.log(`   📱 Phone:        ${shop.phone}`);
        if (shop.email) {
          console.log(`   📧 Email:        ${shop.email}`);
        } else {
          console.log(`   📧 Email:        Not provided`);
        }
        console.log(`   🏪 Shop Name:    ${shop.shopName || 'N/A'}`);
        console.log(`   📍 Address:      ${shop.shopAddress || 'N/A'}`);
        console.log(`   ✅ Status:       ${shop.status}`);
        console.log(`   ✉️  Verified:     ${shop.emailVerified ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   🔐 Login With:   ${shop.email ? `Email: "${shop.email}"` : 'Phone only'} OR Phone: "${shop.phone}"`);
        console.log(`   🔑 Password:     [Set during registration - use "Forgot Password" if needed]`);
        console.log('');
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('              RIDER LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (riders.length === 0) {
      console.log('   No rider accounts found.\n');
    } else {
      riders.forEach((rider, index) => {
        console.log(`${index + 1}. ${rider.name || 'Unnamed Rider'}`);
        console.log('   ───────────────────────────────────────────────────────────');
        console.log(`   📱 Phone:        ${rider.phone}`);
        if (rider.email) {
          console.log(`   📧 Email:        ${rider.email}`);
        } else {
          console.log(`   📧 Email:        Not provided`);
        }
        console.log(`   👤 Name:         ${rider.name || 'N/A'}`);
        console.log(`   🆔 National ID:  ${rider.nationalId || 'N/A'}`);
        console.log(`   🏍️  Vehicle:      ${rider.vehicleType || 'N/A'}`);
        console.log(`   ✅ Status:       ${rider.status}`);
        console.log(`   ✉️  Verified:     ${rider.emailVerified ? 'Yes ✓' : 'No ✗'}`);
        console.log(`   🔐 Login With:   ${rider.email ? `Email: "${rider.email}"` : 'Phone only'} OR Phone: "${rider.phone}"`);
        console.log(`   🔑 Password:     [Set during registration - use "Forgot Password" if needed]`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   🏪 Total Shops:  ${shops.length}`);
    console.log(`   🏍️  Total Riders: ${riders.length}`);
    console.log(`   📊 Total:        ${shops.length + riders.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📝 LOGIN INSTRUCTIONS:');
    console.log('   1. Go to the login page (/shop/login or /rider/login)');
    console.log('   2. Enter Email OR Phone Number (both work)');
    console.log('   3. Enter Password (set during registration)');
    console.log('   4. Click Login');
    console.log('\n   💡 If you forgot your password, use "Forgot Password" feature\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

showLoginDetails();












