import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { geocodeAddress } from '../utils/distance.js';

dotenv.config();

const updateUmaiLocation = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani');
    console.log('✅ Connected to MongoDB');

    // Find Umai Naturals shop
    const shop = await User.findOne({ shopName: 'Umai Naturals' });
    if (!shop) {
      console.log('❌ Umai Naturals shop not found');
      process.exit(1);
    }

    // Update shop address and location
    const address = 'Robins House opposite Jevanjee Gardens, Nairobi, Kenya';
    const location = await geocodeAddress(address);

    if (location) {
      shop.shopAddress = address;
      shop.shopLocation = {
        lat: location.lat,
        lng: location.lng
      };
      await shop.save();
      console.log('✅ Umai Naturals location updated:');
      console.log('   Address:', address);
      console.log('   Coordinates:', location.lat, location.lng);
    } else {
      // Manual coordinates for Robins House opposite Jevanjee Gardens
      shop.shopAddress = address;
      shop.shopLocation = {
        lat: -1.2921, // Approximate coordinates for Jevanjee Gardens area
        lng: 36.8219
      };
      await shop.save();
      console.log('✅ Umai Naturals location updated (using approximate coordinates)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateUmaiLocation();

