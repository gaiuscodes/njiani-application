import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String // URL or base64
  },
  inStock: {
    type: Boolean,
    default: true
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    default: 'piece', // piece, kg, liter, etc.
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
productSchema.index({ shop: 1, category: 1 });
productSchema.index({ shop: 1, inStock: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;












