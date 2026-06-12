import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PhotoCapture from '../components/PhotoCapture';
import AddressAutocomplete from '../components/AddressAutocomplete';

const ShopSignup = () => {
  const navigate = useNavigate();
  const { login, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shopName: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    shopAddress: ''
  });
  const [shopLogo, setShopLogo] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear password error when user types
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    // Clear error when user types
    setPasswordError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || e.target.value || (e.target.files && e.target.files[0]);
    setShopLogo(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password match
    if (formData.password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setPasswordError('');

    try {
      // Validate all required fields before sending
      if (!formData.shopName || !formData.username || !formData.phone || !formData.email || !formData.password || !formData.shopAddress) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const data = new FormData();
      data.append('shopName', formData.shopName.trim());
      data.append('username', formData.username.trim().toLowerCase());
      data.append('phone', formData.phone.trim());
      data.append('email', formData.email.trim());
      data.append('password', formData.password);
      data.append('shopAddress', formData.shopAddress.trim());
      if (shopLogo) {
        data.append('shopLogo', shopLogo);
      }

      console.log('Sending registration request:', {
        shopName: formData.shopName,
        phone: formData.phone,
        email: formData.email,
        hasPassword: !!formData.password,
        shopAddress: formData.shopAddress,
        hasLogo: !!shopLogo
      });

      const response = await axios.post('/api/auth/register/shop', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 second timeout
      });

      // Check if email verification is required
      if (response.data.requiresVerification) {
        setLoading(false);
        
        // If email wasn't sent, navigate with verification URL if available
        if (!response.data.emailSent && response.data.verificationUrl) {
          // Navigate to verification page with the URL
          navigate(`/verify-email?email=${encodeURIComponent(response.data.email)}&url=${encodeURIComponent(response.data.verificationUrl)}`);
        } else {
          // Navigate to verification page
          navigate(`/verify-email?email=${encodeURIComponent(response.data.email)}`);
        }
        return;
      }

      // Set user in context
      login(response.data.user);
      
      // Navigate to dashboard
      setLoading(false);
      navigate('/shop/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Registration failed. Please check all fields and try again.';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-500">Njiani</Link>
          <h2 className="text-2xl font-bold text-white mt-4">Shop Registration</h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Shop Name</label>
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
            <label className="block text-gray-300 mb-2">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="myshop"
              pattern="^[a-z0-9_]{3,30}$"
              required
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              3-30 characters, lowercase letters, numbers, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0700412580"
              pattern="^0\d{9}$"
              required
              className="input-field"
            />
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
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              A verification email will be sent to this address
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
                required
                className={`input-field pr-10 ${passwordError ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 12m3.29-5.71L12 12m-5.71 5.71L12 12m0 0l8.29 8.29M12 12l-8.29-8.29m16.58 0L12 12m8.29 8.29L12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {formData.password && (
              <p className="text-xs text-gray-400 mt-1">
                Must be at least 6 characters
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                minLength={6}
                required
                className={`input-field pr-10 ${passwordError ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 12m3.29-5.71L12 12m-5.71 5.71L12 12m0 0l8.29 8.29M12 12l-8.29-8.29m16.58 0L12 12m8.29 8.29L12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-400 text-sm mt-1">{passwordError}</p>
            )}
            {confirmPassword && !passwordError && formData.password === confirmPassword && (
              <p className="text-green-400 text-sm mt-1">✓ Passwords match</p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Shop Address</label>
            <AddressAutocomplete
              placeholder="Search for shop address or enter manually"
              defaultValue={formData.shopAddress}
              onPlaceSelect={(place) => {
                if (place && place.address) {
                  setFormData({
                    ...formData,
                    shopAddress: place.address
                  });
                }
              }}
            />
          </div>

          <PhotoCapture
            label="Shop Logo"
            name="shopLogo"
            value={shopLogo}
            onChange={handleFileChange}
            required={false}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Registering...' : 'Register Shop'}
          </button>

          <p className="text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/shop/login" className="text-primary-500 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ShopSignup;

