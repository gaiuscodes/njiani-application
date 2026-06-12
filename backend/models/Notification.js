import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'order', 'message'],
    default: 'info'
  },
  read: {
    type: Boolean,
    default: false
  },
  link: {
    type: String // Optional link to related page
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

