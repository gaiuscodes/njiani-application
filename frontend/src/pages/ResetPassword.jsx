import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setPasswordError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password: formData.password
      });

      setSuccess(true);
      
      // Redirect to appropriate login page based on user role
      const userRole = response.data.userRole || 'shop';
      const loginPath = userRole === 'admin' 
        ? '/admin/login' 
        : userRole === 'rider' 
        ? '/rider/login' 
        : '/shop/login';
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(loginPath);
      }, 3000);
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.response?.data?.message || 'Failed to reset password. The link may have expired. Please request a new password reset.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successful!</h2>
            <p className="text-gray-300 mb-6">
              Your password has been reset successfully. You can now login with your new password.
            </p>
            <p className="text-gray-400 text-sm mb-4">Redirecting to login page...</p>
            <Link to="/" className="btn-primary inline-block">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-500">Njiani</Link>
          <h2 className="text-2xl font-bold text-white mt-4">Reset Password</h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-gray-300 mb-2">New Password</label>
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
            <label className="block text-gray-300 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
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
            {formData.confirmPassword && !passwordError && formData.password === formData.confirmPassword && (
              <p className="text-green-400 text-sm mt-1">✓ Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>

          <p className="text-center text-gray-400">
            Remember your password?{' '}
            <Link to="/" className="text-primary-500 hover:underline">
              Back to Home
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;



