import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const EditProfile = ({ profile, onClose, onUpdate }) => {
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
    shopAddress: ''
  });
  const [shopLogo, setShopLogo] = useState(null);
  const [shopLogoPreview, setShopLogoPreview] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        shopName: profile.shopName || '',
        phone: profile.phone || '',
        email: profile.email || '',
        shopAddress: profile.shopAddress || ''
      });
      setShopLogoPreview(profile.shopLogo || null);
      setProfilePicturePreview(profile.profilePicture || null);
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fieldName = e.target.name;
      if (fieldName === 'shopLogo') {
        setShopLogo(file);
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setShopLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (fieldName === 'profilePicture') {
        setProfilePicture(file);
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePicturePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    if (!formData.shopName || !formData.phone || !formData.email || !formData.shopAddress) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate phone format
    if (!/^0\d{9}$/.test(formData.phone)) {
      setError('Phone number must be 10 digits starting with 0');
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('shopName', formData.shopName.trim());
      data.append('phone', formData.phone.trim());
      data.append('email', formData.email.trim());
      data.append('shopAddress', formData.shopAddress.trim());
      if (shopLogo) {
        data.append('shopLogo', shopLogo);
      }
      if (profilePicture) {
        data.append('profilePicture', profilePicture);
      }

      const response = await axios.put('/api/shop/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      // Call onUpdate callback with updated profile
      if (onUpdate) {
        onUpdate(response.data.shop);
      }

      alert('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.join(', ') || 
                          'Failed to update profile. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-300 mb-2">Shop Name *</label>
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              required
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0700412580"
              pattern="^0\d{9}$"
              required
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">Must be 10 digits starting with 0</p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="shop@example.com"
              required
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              {profile?.emailVerified ? (
                <span className="text-green-400">✓ Email verified</span>
              ) : (
                <span className="text-yellow-400">⚠ Email not verified. Changing email will require re-verification.</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Shop Address *</label>
            <textarea
              name="shopAddress"
              value={formData.shopAddress}
              onChange={handleChange}
              required
              rows="3"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Shop Logo</label>
            <div className="flex items-start gap-4">
              {shopLogoPreview && (
                <div className="flex-shrink-0">
                  <img
                    src={shopLogoPreview}
                    alt="Shop logo preview"
                    className="w-24 h-24 object-cover rounded-lg border border-dark-700"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  name="shopLogo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-400 mt-1">Optional. Max size: 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Profile Picture</label>
            <div className="flex items-start gap-4">
              {profilePicturePreview && (
                <div className="flex-shrink-0">
                  <img
                    src={profilePicturePreview}
                    alt="Profile picture preview"
                    className="w-24 h-24 object-cover rounded-full border border-dark-700"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  name="profilePicture"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-400 mt-1">Optional. Max size: 5MB</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;

