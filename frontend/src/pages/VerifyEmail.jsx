import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('pending'); // pending, verifying, success, error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [resending, setResending] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState(searchParams.get('url') || '');

  useEffect(() => {
    const token = searchParams.get('token');
    const urlParam = searchParams.get('url');
    
    // If URL is passed, set it immediately
    if (urlParam) {
      setVerificationUrl(urlParam);
      setMessage('Email service is not configured. Use the verification link below:');
      setStatus('pending');
    }
    
    // If token is in URL, verify immediately
    if (token) {
      verifyEmail(token);
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    setLoading(true);
    setStatus('verifying');
    setMessage('Verifying your email...');

    try {
      const response = await axios.get(`/api/auth/verify-email?token=${token}`);
      
      if (response.data.verified) {
        setStatus('success');
        setMessage('Email verified successfully! Your account is now active.');
        
        // Set user in context
        if (response.data.user) {
          login(response.data.user);
          
          // Redirect to appropriate dashboard based on user role
          const userRole = response.data.user.role;
          setTimeout(() => {
            if (userRole === 'shop') {
              navigate('/shop/dashboard');
            } else if (userRole === 'rider') {
              navigate('/rider/dashboard');
            } else {
              navigate('/');
            }
          }, 2000);
        } else {
          // Try to fetch user data
          try {
            const user = await checkAuth();
            if (user) {
              login(user);
              const userRole = user.role;
              setTimeout(() => {
                if (userRole === 'shop') {
                  navigate('/shop/dashboard');
                } else if (userRole === 'rider') {
                  navigate('/rider/dashboard');
                } else {
                  navigate('/');
                }
              }, 2000);
            }
          } catch (err) {
            console.error('Error fetching user after verification:', err);
            // Default redirect
            setTimeout(() => {
              navigate('/');
            }, 2000);
          }
        }
      }
    } catch (error) {
      setStatus('error');
      const errorMessage = error.response?.data?.message || 'Failed to verify email. The link may have expired.';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      const response = await axios.post('/api/auth/resend-verification', { email });
      
      if (response.data.simulated && response.data.verificationUrl) {
        // Email not configured - show the verification URL
        setVerificationUrl(response.data.verificationUrl);
        setMessage('Email service is not configured. Use the verification link below:');
        setStatus('pending');
      } else {
        setMessage(response.data.message || 'Verification email sent! Please check your inbox (and spam folder).');
        setStatus('pending');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to resend verification email';
      setMessage(errorMessage);
      setStatus('error');
    } finally {
      setResending(false);
    }
  };

  const copyVerificationUrl = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl);
      alert('Verification link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-500">Njiani</Link>
          <h2 className="text-2xl font-bold text-white mt-4">Verify Your Email</h2>
        </div>

        <div className="card space-y-6">
          {status === 'pending' && !searchParams.get('token') && (
            <>
              <div className="text-center">
                <div className="text-6xl mb-4">📧</div>
                {message ? (
                  <>
                    <p className="text-gray-300 mb-4">{message}</p>
                    {verificationUrl && (
                      <div className="bg-primary-500/20 border border-primary-500/50 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-400 mb-2">Verification Link:</p>
                        <div className="space-y-2">
                          <a
                            href={verificationUrl}
                            className="btn-primary block text-center text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Verification Link
                          </a>
                          <button
                            onClick={copyVerificationUrl}
                            className="btn-secondary w-full text-sm"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 mb-4">
                      We've sent a verification email to your inbox.
                    </p>
                    <p className="text-gray-400 text-sm mb-2">
                      Please check your email and click the verification link to activate your account.
                    </p>
                    <p className="text-gray-500 text-xs mb-6">
                      💡 Don't forget to check your spam/junk folder!
                    </p>
                  </>
                )}
              </div>

              <div className="bg-dark-700 p-4 rounded-lg space-y-3">
                <p className="text-sm text-gray-400 mb-2">Didn't receive the email?</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                  <button
                    onClick={resendVerification}
                    disabled={resending}
                    className="btn-primary w-full"
                  >
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  If email is not configured, the verification link will be shown after clicking resend.
                </p>
              </div>
            </>
          )}

          {status === 'verifying' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-300">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-green-400 text-lg font-semibold mb-2">Email Verified!</p>
              <p className="text-gray-300 mb-4">{message}</p>
              <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <>
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <p className="text-red-400 text-lg font-semibold mb-2">Verification Failed</p>
                <p className="text-gray-300 mb-6">{message}</p>
              </div>

              <div className="bg-dark-700 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Need a new verification link?</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                  <button
                    onClick={resendVerification}
                    disabled={resending}
                    className="btn-primary w-full"
                  >
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            </>
          )}

              <div className="text-center pt-4 border-t border-dark-700">
                <Link to="/" className="text-primary-500 hover:underline text-sm">
                  Back to Home
                </Link>
              </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

