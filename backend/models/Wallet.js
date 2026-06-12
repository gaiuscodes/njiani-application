import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [{
    type: {
      type: String,
      enum: ['topup', 'payment', 'earning', 'payout', 'fee'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    mpesaReference: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Method to add transaction
walletSchema.methods.addTransaction = function(type, amount, description, order = null, mpesaReference = null) {
  this.transactions.push({
    type,
    amount,
    description,
    order,
    mpesaReference,
    status: 'completed'
  });
  
  if (type === 'topup' || type === 'earning') {
    this.balance += amount;
  } else if (type === 'payment' || type === 'payout' || type === 'fee') {
    this.balance -= amount;
  }
  
  return this.save();
};

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;

