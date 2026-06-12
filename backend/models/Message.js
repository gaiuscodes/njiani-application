import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
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
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message;

