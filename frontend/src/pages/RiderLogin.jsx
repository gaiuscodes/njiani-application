import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ErrorModal from '../components/ErrorModal';

const RiderLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Determine if input is email, phone, or username
      const input = formData.emailOrPhone?.trim() || '';
      const isEmail = input.includes('@');
      const isPhone = /^0\d{9}$/.test(input);
      const loginData = {
        password: formData.password,
        role: 'rider'
      };
      
      // Username is primary - send it first, then email/phone as fallback
      if (isEmail) {
        loginData.email = input;
      } else if (isPhone) {
        loginData.phone = input;
      } else {
        // Treat as username (primary identifier)
        loginData.username = input.toLowerCase();
      }
      
      console.log('Sending login request to:', axios.defaults.baseURL + '/api/auth/login');
      console.log('Login data:', { ...loginData, password: '***' });
      
      const response = await axios.post('/api/auth/login', loginData);
      
      console.log('Login response received:', response.data);

      if (response.data && response.data.user) {
        console.log('Login successful, setting user:', response.data.user);
        login(response.data.user);
        navigate('/rider/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorData = error.response?.data;
      
      // Set error message for modal
      let errorMessage = 'Invalid credentials. Please check your email/phone number and password and try again.';
      
      if (errorData?.message) {
        if (errorData.message.includes('Invalid credentials') || errorData.message.includes('Invalid')) {
          errorMessage = 'The email/phone number or password you entered is incorrect. Please try again.';
        } else {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        if (error.message.includes('Network') || error.message.includes('timeout') || error.code === 'ERR_NETWORK') {
          errorMessage = 'Unable to connect to the server. Please ensure the backend server is running on http://localhost:5000';
        } else {
          errorMessage = error.message;
        }
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Backend server is not running. Please start the backend server.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-500">Njiani</Link>
          <h2 className="text-2xl font-bold text-white mt-4">Rider Login</h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Username, Email, or Phone</label>
            <input
              type="text"
              name="emailOrPhone"
              value={formData.emailOrPhone}
              onChange={handleChange}
              placeholder="username, rider@example.com, or 0700412580"
              required
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter your username, email address, or phone number
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
                required
                className="input-field pr-10"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="text-center">
            <Link
              to="/forgot-password" 
              className="text-sm text-primary-500 hover:text-primary-400 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <Link to="/rider/signup" className="text-primary-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>

      {/* Error Modal */}
      {error && (
        <ErrorModal
          message={error}
          onClose={() => setError(null)}
          autoClose={true}
          duration={6000}
        />
      )}
    </div>
  );
};

export default RiderLogin;

