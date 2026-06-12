import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

/**
 * Password Verification Tool
 * 
 * This tool verifies if a password matches a user's stored password hash.
 * Passwords are hashed with bcrypt and cannot be decrypted, but we can verify them.
 * 
 * Usage:
 *   node scripts/verify-password.js <identifier> <password> [role]
 * 
 * Examples:
 *   node scripts/verify-password.js admin King2025 admin
 *   node scripts/verify-password.js 0700412580 akanda123 rider
 *   node scripts/verify-password.js davidzebedi@gmail.com mypassword shop
 */

const verifyPassword = async () => {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('🔐 PASSWORD VERIFICATION TOOL');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('Usage: node scripts/verify-password.js <identifier> <password> [role]');
      console.log('\nExamples:');
      console.log('  node scripts/verify-password.js admin King2025 admin');
      console.log('  node scripts/verify-password.js 0700412580 akanda123 rider');
      console.log('  node scripts/verify-password.js davidzebedi@gmail.com mypassword shop');
      console.log('\nIdentifier can be:');
      console.log('  - Username (primary)');
      console.log('  - Phone number');
      console.log('  - Email address');
      console.log('\nRole is optional but helps narrow down the search:');
      console.log('  - admin');
      console.log('  - rider');
      console.log('  - shop');
      console.log('\n═══════════════════════════════════════════════════════\n');
      process.exit(1);
    }

    const identifier = args[0];
    const password = args[1];
    const role = args[2] || null;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔐 PASSWORD VERIFICATION TOOL');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Connecting to MongoDB...');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Determine identifier type
    const isEmail = identifier.includes('@');
    const isPhone = /^0\d{9}$/.test(identifier) || identifier === 'admin';
    const isUsername = !isEmail && !isPhone;

    console.log('Searching for user...');
    console.log(`- Identifier: ${identifier}`);
    console.log(`- Type: ${isEmail ? 'Email' : isPhone ? 'Phone' : 'Username'}`);
    if (role) console.log(`- Role filter: ${role}`);
    console.log('');

    // Build search query
    let searchQuery = {};
    if (role) {
      searchQuery.role = role;
    }

    // Search by identifier type
    if (isEmail) {
      searchQuery.email = identifier.toLowerCase();
    } else if (isPhone) {
      searchQuery.phone = identifier;
    } else {
      // Try username first (primary)
      searchQuery.username = identifier.toLowerCase();
    }

    // Find user with password field
    let user = await User.findOne(searchQuery).select('+password');

    // If not found by primary method, try alternatives
    if (!user && isUsername) {
      // Try email
      const emailQuery = { ...searchQuery };
      delete emailQuery.username;
      emailQuery.email = identifier.toLowerCase();
      user = await User.findOne(emailQuery).select('+password');
      
      if (!user) {
        // Try phone
        const phoneQuery = { ...searchQuery };
        delete phoneQuery.username;
        phoneQuery.phone = identifier;
        user = await User.findOne(phoneQuery).select('+password');
      }
    }

    if (!user) {
      console.log('❌ User not found');
      console.log(`   Searched for: ${identifier}`);
      if (role) console.log(`   With role: ${role}`);
      console.log('\n💡 Try:');
      console.log('   - Check the identifier spelling');
      console.log('   - Try without role filter');
      console.log('   - Use phone number format: 0700000000');
      console.log('   - Use email format: user@example.com');
      console.log('   - Use username (lowercase, alphanumeric + underscore)');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   - User ID: ${user._id}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Name/Shop: ${user.name || user.shopName || 'N/A'}`);
    console.log(`   - Username: ${user.username || 'N/A'}`);
    console.log(`   - Phone: ${user.phone || 'N/A'}`);
    console.log(`   - Email: ${user.email || 'N/A'}`);
    console.log(`   - Status: ${user.status || 'N/A'}`);
    console.log('');

    // Check if password exists
    if (!user.password) {
      console.log('❌ ERROR: No password hash found for this user');
      console.log('   This user may not have a password set.');
      process.exit(1);
    }

    // Check if password is hashed
    const isHashed = user.password.startsWith('$2a$') || 
                     user.password.startsWith('$2b$') || 
                     user.password.startsWith('$2y$');
    
    if (!isHashed) {
      console.log('⚠️  WARNING: Password is not hashed!');
      console.log('   This is a security issue. Password should be hashed.');
      console.log(`   Stored value: ${user.password.substring(0, 20)}...`);
      console.log('');
      console.log('   Direct comparison:');
      const directMatch = user.password === password;
      console.log(`   ${directMatch ? '✅' : '❌'} Password ${directMatch ? 'MATCHES' : 'DOES NOT MATCH'}`);
      process.exit(directMatch ? 0 : 1);
    }

    console.log('Verifying password...');
    console.log(`   - Password hash type: ${user.password.substring(0, 7)}...`);
    console.log('');

    // Verify password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    
    // Also try using the user model's comparePassword method
    let methodMatch = false;
    try {
      methodMatch = await user.comparePassword(password);
    } catch (err) {
      console.log('⚠️  Could not use comparePassword method');
    }

    console.log('═══════════════════════════════════════════════════════');
    if (isMatch) {
      console.log('✅ PASSWORD VERIFICATION: SUCCESS');
      console.log('   The password is CORRECT for this user.');
      console.log('   User can login with these credentials.');
    } else {
      console.log('❌ PASSWORD VERIFICATION: FAILED');
      console.log('   The password is INCORRECT for this user.');
      console.log('   User cannot login with these credentials.');
    }
    console.log('═══════════════════════════════════════════════════════');
    
    if (isMatch !== methodMatch) {
      console.log('\n⚠️  WARNING: Direct bcrypt and method comparison differ!');
    }

    console.log('\n📋 Summary:');
    console.log(`   - Direct bcrypt compare: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    if (methodMatch !== undefined) {
      console.log(`   - comparePassword method: ${methodMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    }
    console.log('');

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');

    process.exit(isMatch ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the verification
verifyPassword();





