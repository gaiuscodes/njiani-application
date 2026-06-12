import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const EditShop = ({ shop, onClose, onUpdate }) => {
  const modalRef = useRef(null);

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
  const [formData, setFormData] = useState({
    shopName: '',
    phone: '',
    email: '',
    shopAddress: '',
    status: 'active',
    emailVerified: false
  });
  const [shopLogo, setShopLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (shop) {
      setFormData({
        shopName: shop.shopName || '',
        phone: shop.phone || '',
        email: shop.email || '',
        shopAddress: shop.shopAddress || '',
        status: shop.status || 'active',
        emailVerified: shop.emailVerified || false
      });
      setLogoPreview(shop.shopLogo || '');
    }
  }, [shop]);

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
    setShopLogo(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(shop?.shopLogo || '');
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      if (shopLogo) {
        data.append('shopLogo', shopLogo);
      }

      const response = await axios.put(`/api/admin/shops/${shop._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Shop updated successfully!');
      onUpdate(response.data.shop);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error updating shop:', err);
      setError(err.response?.data?.message || 'Failed to update shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(`/api/admin/shops/${shop._id}/reset-password`, {
        newPassword
      });
      setSuccess('Password reset successfully!');
      setNewPassword('');
      setShowPasswordReset(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!shop) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Shop: {shop.shopName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Shop Name *</label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                pattern="^0\d{9}$"
                required
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Shop Address *</label>
            <textarea
              name="shopAddress"
              value={formData.shopAddress}
              onChange={handleChange}
              required
              rows="3"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="emailVerified"
                  checked={formData.emailVerified}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-gray-300">Email Verified</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Shop Logo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="input-field"
            />
            {logoPreview && (
              <div className="mt-3">
                <img src={logoPreview} alt="Logo Preview" className="w-24 h-24 object-cover rounded-lg border border-dark-700" />
              </div>
            )}
          </div>

          {/* Password Reset Section */}
          <div className="border-t border-dark-700 pt-4">
            <button
              type="button"
              onClick={() => setShowPasswordReset(!showPasswordReset)}
              className="text-primary-500 hover:text-primary-400 text-sm"
            >
              {showPasswordReset ? 'Cancel Password Reset' : 'Reset Shop Password'}
            </button>
            {showPasswordReset && (
              <div className="mt-3 space-y-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  minLength={6}
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="btn-secondary text-sm"
                >
                  Reset Password
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShop;

