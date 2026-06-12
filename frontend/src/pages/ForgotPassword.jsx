import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');

    try {
      const response = await axios.post('/api/auth/forgot-password', { emailOrPhone });

      if (response.data.resetUrl || response.data.simulated) {
        // Email not configured - show the reset URL
        const url = response.data.resetUrl;
        if (url) {
          setResetUrl(url);
          setMessage('Email service is not configured. Use the link below to reset your password:');
        } else {
          setMessage(response.data.message || 'If an account with that email or phone exists, a password reset link has been sent.');
        }
      } else {
        setMessage(response.data.message || 'If an account with that email or phone exists, a password reset link has been sent.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.response?.data?.message || 'Failed to process password reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyResetUrl = () => {
    if (resetUrl) {
      navigator.clipboard.writeText(resetUrl);
      alert('Reset link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-500">Njiani</Link>
          <h2 className="text-2xl font-bold text-white mt-4">Forgot Password</h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Email or Phone Number</label>
            <input
              type="text"
              name="emailOrPhone"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="shop@example.com or 0700000000"
              required
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter your registered email address or phone number. We'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-3">
              <p className="text-green-400 text-sm">{message}</p>
              {resetUrl && (
                <div className="mt-3 space-y-2">
                  <a
                    href={resetUrl}
                    className="btn-primary block text-center"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Reset Link
                  </a>
                  <button
                    type="button"
                    onClick={copyResetUrl}
                    className="btn-secondary w-full"
                  >
                    Copy Reset Link
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Or copy and paste this link into your browser
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;

