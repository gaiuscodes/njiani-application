import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  package: {
    type: String,
    enum: ['free', 'standard', 'premium'],
    default: 'free',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'wallet', 'manual'],
    default: 'wallet'
  },
  lastPaymentDate: {
    type: Date
  },
  nextBillingDate: {
    type: Date
  },
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['mpesa', 'wallet', 'manual']
    },
    mpesaReference: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ package: 1, status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;



