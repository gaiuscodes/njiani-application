import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ShopProducts = ({ shopId, shopName, onClose }) => {
  const modalRef = useRef(null);
  const editModalRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    inStock: true,
    stockQuantity: '',
    unit: 'piece',
    image: null
  });
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    loadProducts();
  }, [shopId]);

  // Handle click outside main modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (!showEditModal) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, showEditModal]);

  // Handle click outside edit modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editModalRef.current && !editModalRef.current.contains(event.target)) {
        if (showEditModal) {
          setShowEditModal(false);
          setSelectedProduct(null);
        }
      }
    };

    if (showEditModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEditModal]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/shops/${shopId}/products`);
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity || '',
      unit: product.unit || 'piece',
      image: null
    });
    setImagePreview(product.image || '');
    setShowEditModal(true);
    setError('');
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/shops/${shopId}/products/${productId}`);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'image') {
          data.append(key, formData[key]);
        }
      });
      if (formData.image) {
        data.append('image', formData.image);
      }

      await axios.put(`/api/admin/shops/${shopId}/products/${selectedProduct._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      loadProducts();
      setShowEditModal(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Products: {shopName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-6">
          {loading && products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📦</span>
              <p className="text-gray-400 text-lg mb-2">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product._id}
                  className={`bg-dark-700 rounded-lg p-4 border-2 ${
                    product.inStock ? 'border-dark-600' : 'border-red-500/50'
                  }`}
                >
                  {product.image && (
                    <div className="mb-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        product.inStock
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <p className="text-xs text-primary-400 mb-2 font-semibold">{product.category}</p>
                  {product.description && (
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="mb-3">
                    <p className="text-primary-500 font-bold text-lg">
                      KES {product.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Stock: {product.stockQuantity} {product.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="btn-secondary flex-1 text-sm py-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-2 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div ref={editModalRef} className="bg-dark-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white">Edit Product</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedProduct(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Product Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Category *</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Price (KES) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Stock Quantity</label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity}
                      onChange={handleChange}
                      min="0"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Unit</label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="inStock"
                      checked={formData.inStock}
                      onChange={handleChange}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-gray-300">In Stock</span>
                  </label>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="input-field"
                  />
                  {imagePreview && (
                    <div className="mt-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-dark-700"
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Saving...' : 'Update Product'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedProduct(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopProducts;

