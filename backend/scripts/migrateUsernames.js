import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to generate username from name
function generateUsername(name) {
  if (!name) return null;
  
  // Get first name (first word)
  const firstName = name.trim().split(/\s+/)[0];
  
  // Convert to lowercase, remove special characters, keep only alphanumeric and underscores
  let username = firstName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 30);
  
  // Ensure minimum length of 3
  if (username.length < 3) {
    username = username + '123'; // Add numbers if too short
  }
  
  return username;
}

// Helper function to generate unique username
async function generateUniqueUsername(baseUsername, userId) {
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existing = await User.findOne({ 
      username: username,
      _id: { $ne: userId }
    });
    
    if (!existing) {
      return username;
    }
    
    // Append counter if username exists
    const suffix = counter.toString();
    const maxLength = 30;
    const truncated = baseUsername.substring(0, maxLength - suffix.length);
    username = truncated + suffix;
    counter++;
    
    // Safety check
    if (counter > 9999) {
      throw new Error('Unable to generate unique username');
    }
  }
}

async function migrateUsernames() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani');
    console.log('✅ Connected to MongoDB');

    // Get all users without username
    const usersWithoutUsername = await User.find({ 
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    });

    console.log(`\n📊 Found ${usersWithoutUsername.length} users without username`);

    let updated = 0;
    let errors = 0;

    for (const user of usersWithoutUsername) {
      try {
        let baseUsername;
        
        if (user.role === 'shop') {
          // For shops, use shopName
          baseUsername = user.shopName 
            ? user.shopName.toLowerCase().replace(/[^a-z0-9_]/g, '').substring(0, 30)
            : `shop_${user.phone}`;
        } else {
          // For riders and admins, use first name
          baseUsername = generateUsername(user.name) || `user_${user.phone}`;
        }

        // Ensure minimum length
        if (baseUsername.length < 3) {
          baseUsername = baseUsername + '123';
        }

        // Generate unique username
        const username = await generateUniqueUsername(baseUsername, user._id);

        // Update user
        user.username = username;
        await user.save();

        console.log(`✅ Updated ${user.role} ${user.name || user.shopName}: ${username}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating user ${user._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${usersWithoutUsername.length}`);

    // Verify all users have username
    const usersStillWithoutUsername = await User.countDocuments({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    });

    if (usersStillWithoutUsername > 0) {
      console.log(`\n⚠️  Warning: ${usersStillWithoutUsername} users still without username`);
    } else {
      console.log(`\n✅ All users now have usernames!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateUsernames();











