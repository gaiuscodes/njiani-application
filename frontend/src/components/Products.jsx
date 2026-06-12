import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Product Card Component
const ProductCard = ({ product, onEdit, onToggleStock, onDelete }) => {
  return (
    <div
      className={`bg-dark-700 rounded-lg p-4 border-2 ${
        product.inStock ? 'border-dark-600' : 'border-red-500/50'
      } hover:border-primary-500/50 transition-all`}
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
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">{product.name}</h3>
          <span className="inline-block bg-primary-500/20 text-primary-400 px-2 py-1 rounded text-xs font-semibold">
            {product.category}
          </span>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded flex-shrink-0 ml-2 ${
            product.inStock
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
      {product.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {product.description}
        </p>
      )}
      <div className="mb-3">
        <p className="text-primary-500 font-bold text-xl mb-1">
          KES {product.price.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400">
          Stock: {product.stockQuantity} {product.unit}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(product)}
          className="btn-secondary flex-1 text-sm py-2"
        >
          Edit
        </button>
        <button
          onClick={() => onToggleStock(product)}
          className={`flex-1 text-sm py-2 rounded ${
            product.inStock
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {product.inStock ? 'Mark Out' : 'Mark In'}
        </button>
        <button
          onClick={() => onDelete(product._id)}
          className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-2 rounded text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const Products = ({ onClose }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [viewMode, setViewMode] = useState('category'); // 'category' or 'grid'
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const modalRef = useRef(null);
  const addEditModalRef = useRef(null);

  // Handle click outside main modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle click outside add/edit modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addEditModalRef.current && !addEditModalRef.current.contains(event.target)) {
        if (showAddModal || showEditModal) {
          closeModals();
        }
      }
    };

    if (showAddModal || showEditModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAddModal, showEditModal]);
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
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterStock !== 'all') params.inStock = filterStock === 'inStock';
      
      const response = await axios.get('/api/shop/products', { params });
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/shop/products/categories');
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filterCategory, filterStock]);

  const handleInputChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category.trim());
      data.append('price', formData.price);
      data.append('inStock', formData.inStock);
      data.append('stockQuantity', formData.stockQuantity || 0);
      data.append('unit', formData.unit.trim());
      if (formData.image) {
        data.append('image', formData.image);
      }

      if (selectedProduct) {
        // Update existing product
        await axios.put(`/api/shop/products/${selectedProduct._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Create new product
        await axios.post('/api/shop/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // Reset form and reload products
      resetForm();
      loadProducts();
      loadCategories();
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.message || 'Failed to save product');
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
      await axios.delete(`/api/shop/products/${productId}`);
      loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const toggleStockStatus = async (product) => {
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'image') {
          data.append(key, product[key]);
        }
      });
      data.append('inStock', !product.inStock);
      
      await axios.put(`/api/shop/products/${product._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      loadProducts();
    } catch (err) {
      console.error('Error updating stock status:', err);
      alert(err.response?.data?.message || 'Failed to update stock status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      inStock: true,
      stockQuantity: '',
      unit: 'piece',
      image: null
    });
    setImagePreview('');
    setSelectedProduct(null);
    setError('');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };

  // Group products by category
  const groupProductsByCategory = () => {
    const grouped = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    return grouped;
  };

  const groupedProducts = groupProductsByCategory();

  // Initialize expanded categories when products load
  useEffect(() => {
    if (products.length > 0 && expandedCategories.size === 0) {
      const categories = Object.keys(groupProductsByCategory());
      setExpandedCategories(new Set(categories));
    }
  }, [products.length]);

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const categoryStats = Object.keys(groupedProducts).map(cat => ({
    name: cat,
    count: groupedProducts[cat].length,
    inStock: groupedProducts[cat].filter(p => p.inStock).length,
    outOfStock: groupedProducts[cat].filter(p => !p.inStock).length
  }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Products Catalog</h2>
          <div className="flex gap-2">
            <button
              onClick={openAddModal}
              className="btn-primary flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Product</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="p-6 border-b border-dark-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Filter by Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-field"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Filter by Stock</label>
              <select
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value)}
                className="input-field"
              >
                <option value="all">All Products</option>
                <option value="inStock">In Stock</option>
                <option value="outOfStock">Out of Stock</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">View Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('category')}
                  className={`flex-1 py-2 px-3 rounded text-sm ${
                    viewMode === 'category'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  By Category
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-2 px-3 rounded text-sm ${
                    viewMode === 'grid'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  Grid View
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadProducts}
                className="btn-secondary w-full"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Statistics */}
          {products.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-dark-700">
              <div className="bg-dark-700/50 px-4 py-2 rounded-lg">
                <span className="text-xs text-gray-400">Total Products</span>
                <p className="text-lg font-bold text-white">{products.length}</p>
              </div>
              <div className="bg-green-500/20 px-4 py-2 rounded-lg">
                <span className="text-xs text-gray-400">In Stock</span>
                <p className="text-lg font-bold text-green-400">{products.filter(p => p.inStock).length}</p>
              </div>
              <div className="bg-red-500/20 px-4 py-2 rounded-lg">
                <span className="text-xs text-gray-400">Out of Stock</span>
                <p className="text-lg font-bold text-red-400">{products.filter(p => !p.inStock).length}</p>
              </div>
              <div className="bg-primary-500/20 px-4 py-2 rounded-lg">
                <span className="text-xs text-gray-400">Categories</span>
                <p className="text-lg font-bold text-primary-400">{categories.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="p-6">
          {loading && products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📦</span>
              <p className="text-gray-400 text-lg mb-2">No products found</p>
              <p className="text-gray-500 text-sm">Click "Add Product" to get started</p>
            </div>
          ) : viewMode === 'category' ? (
            /* Category View */
            <div className="space-y-6">
              {Object.keys(groupedProducts).map((category) => {
                const categoryProducts = groupedProducts[category];
                const isExpanded = expandedCategories.has(category) || expandedCategories.size === 0;
                const stats = categoryStats.find(s => s.name === category);

                return (
                  <div key={category} className="bg-dark-700/50 rounded-lg border border-dark-600 overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full p-4 flex items-center justify-between hover:bg-dark-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-lg font-semibold">
                          {category}
                        </div>
                        <div className="text-sm text-gray-400">
                          <span className="text-green-400">{stats?.inStock || 0} in stock</span>
                          {' • '}
                          <span className="text-red-400">{stats?.outOfStock || 0} out</span>
                          {' • '}
                          <span className="text-white">{stats?.count || 0} total</span>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Category Products */}
                    {isExpanded && (
                      <div className="p-4 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {categoryProducts.map((product) => (
                            <ProductCard
                              key={product._id}
                              product={product}
                              onEdit={handleEdit}
                              onToggleStock={toggleStockStatus}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onEdit={handleEdit}
                  onToggleStock={toggleStockStatus}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div ref={addEditModalRef} className="bg-dark-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-white">
                  {selectedProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button
                  onClick={closeModals}
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
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="e.g., Samsung Galaxy S21"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Category *</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="e.g., Electronics, Food, Clothing"
                      list="categories"
                    />
                    <datalist id="categories">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="input-field"
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Price (KES) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Stock Quantity</label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity}
                      onChange={handleInputChange}
                      min="0"
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Unit</label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="piece, kg, liter"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="inStock"
                      checked={formData.inStock}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-gray-300">In Stock</span>
                  </label>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Product Image</label>
                  <input
                    type="file"
                    name="image"
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
                    {loading ? 'Saving...' : selectedProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
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

export default Products;

