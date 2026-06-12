import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    enum: ['rider', 'shop', 'admin'],
    required: true
  },
  complaintType: {
    type: String,
    enum: ['order', 'payment', 'rider', 'shop', 'technical', 'other'],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // For complaints about another user (rider/shop)
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  adminResponse: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    type: String // URLs to uploaded files/images
  }]
}, {
  timestamps: true
});

// Index for efficient queries
complaintSchema.index({ user: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ complaintType: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;





