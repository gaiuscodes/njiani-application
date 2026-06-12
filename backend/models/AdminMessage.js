import mongoose from 'mongoose';

const adminMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    enum: ['rider', 'shop'],
    required: true
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['open', 'resolved', 'closed'],
    default: 'open'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
adminMessageSchema.index({ user: 1, status: 1 });
adminMessageSchema.index({ lastMessageAt: -1 });

const AdminMessage = mongoose.model('AdminMessage', adminMessageSchema);
export default AdminMessage;











