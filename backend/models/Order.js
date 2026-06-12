import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  pickupAddress: {
    type: String,
    required: true
  },
  pickupLocation: {
    lat: Number,
    lng: Number
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryLocation: {
    lat: Number,
    lng: Number
  },
  distance: {
    value: Number, // Distance in kilometers
    text: String, // Human-readable distance (e.g., "2.5 km")
    duration: Number, // Estimated duration in minutes (optional)
    durationText: String // Human-readable duration (e.g., "15 mins")
  },
  goodsDescription: {
    type: String,
    required: true
  },
  goodsValue: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['Documents', 'Food', 'Electronics', 'Clothing', 'Groceries', 'Other'],
    default: 'Other'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'bidding', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bids: [{
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    estimatedTime: {
      type: Number, // in minutes
      required: true
    },
    bidAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    message: {
      type: String,
      default: ''
    },
    communicationHistory: [{
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      message: {
        type: String,
        required: function() {
          return !this.attachments || this.attachments.length === 0;
        }
      },
      attachments: [{
        type: {
          type: String,
          enum: ['image', 'file'],
          default: 'image'
        },
        url: {
          type: String,
          required: true
        },
        filename: {
          type: String
        },
        size: {
          type: Number
        },
        mimeType: {
          type: String
        }
      }],
      action: {
        type: String,
        enum: ['message', 'bargain', 'accept', 'reject'],
        default: 'message'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  acceptedBid: {
    price: Number,
    estimatedTime: Number,
    acceptedAt: Date
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  platformFee: {
    type: Number,
    default: 0
  },
  riderEarnings: {
    type: Number,
    default: 0
  },
  receiptPhoto: {
    type: String
  },
  shopRating: {
    type: Number,
    min: 1,
    max: 5
  },
  riderRating: {
    type: Number,
    min: 1,
    max: 5
  },
  pickedUpAt: Date,
  deliveredAt: Date,
  trackingHistory: [{
    lat: Number,
    lng: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;

