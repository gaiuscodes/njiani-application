import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { geocodeAddress, getDistanceFromGoogle } from '../utils/distance.js';

dotenv.config();

const createTestOrders = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/njiani');
    console.log('✅ Connected to MongoDB');

    // Find Umai Naturals shop
    const shop = await User.findOne({ shopName: 'Umai Naturals' });
    if (!shop) {
      console.log('❌ Umai Naturals shop not found');
      process.exit(1);
    }

    // Get shop location
    const shopLocation = shop.shopLocation || { lat: -1.2921, lng: 36.8219 }; // Jevanjee Gardens area

    // Delivery addresses with approximate coordinates
    const deliveries = [
      { 
        address: 'Khoja Bus Stop, Nairobi, Kenya', 
        description: 'First product delivery',
        lat: -1.2850, // Approximate coordinates for Khoja Bus Stop
        lng: 36.8200
      },
      { 
        address: 'Afya Centre, Nairobi, Kenya', 
        description: 'Second product delivery',
        lat: -1.2950, // Approximate coordinates for Afya Centre
        lng: 36.8150
      }
    ];

    for (const delivery of deliveries) {
      // Try geocoding first, fallback to approximate coordinates
      let deliveryLocation = await geocodeAddress(delivery.address);
      
      if (!deliveryLocation) {
        console.log(`⚠️  Could not geocode: ${delivery.address}, using approximate coordinates`);
        deliveryLocation = {
          lat: delivery.lat,
          lng: delivery.lng,
          formattedAddress: delivery.address
        };
      }

      // Calculate distance
      const distanceInfo = await getDistanceFromGoogle(
        shopLocation,
        { lat: deliveryLocation.lat, lng: deliveryLocation.lng }
      );

      // Check if order already exists
      const existingOrder = await Order.findOne({
        shop: shop._id,
        deliveryAddress: delivery.address
      });

      if (existingOrder) {
        console.log(`ℹ️  Order already exists for: ${delivery.address}`);
        // Update distance if not set
        if (!existingOrder.distance && distanceInfo) {
          existingOrder.distance = {
            value: distanceInfo.distance,
            text: distanceInfo.distanceText,
            duration: distanceInfo.duration,
            durationText: distanceInfo.durationText
          };
          await existingOrder.save();
          console.log(`✅ Updated distance for existing order`);
        }
        continue;
      }

      // Create order
      const order = new Order({
        shop: shop._id,
        customerName: 'Test Customer',
        customerPhone: '0700000000',
        pickupAddress: shop.shopAddress,
        pickupLocation: shopLocation,
        deliveryAddress: delivery.address,
        deliveryLocation: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng
        },
        distance: distanceInfo ? {
          value: distanceInfo.distance,
          text: distanceInfo.distanceText,
          duration: distanceInfo.duration,
          durationText: distanceInfo.durationText
        } : null,
        goodsDescription: delivery.description,
        goodsValue: 1000,
        category: 'Other',
        isUrgent: false,
        status: 'bidding'
      });

      await order.save();
      console.log(`✅ Created order for: ${delivery.address}`);
      if (distanceInfo) {
        console.log(`   Distance: ${distanceInfo.distanceText}`);
      }
    }

    console.log('\n✅ Test orders created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createTestOrders();

