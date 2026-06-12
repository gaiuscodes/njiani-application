import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Pricing = ({ onClose, onSelect, showCurrentPlan = true }) => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPackages();
    if (showCurrentPlan) {
      loadCurrentSubscription();
    }
  }, [showCurrentPlan]);

  const loadPackages = async () => {
    try {
      const response = await axios.get('/api/subscriptions/packages');
      setPackages(response.data.packages || []);
    } catch (err) {
      console.error('Error loading packages:', err);
      setError('Failed to load pricing packages');
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const response = await axios.get('/api/subscriptions/my-subscription');
      setCurrentSubscription(response.data.subscription);
    } catch (err) {
      console.error('Error loading subscription:', err);
    }
  };

  const handleSubscribe = async (packageId) => {
    if (subscribing) return;
    
    setSubscribing(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/subscriptions/subscribe', {
        package: packageId,
        paymentMethod: 'wallet'
      });

      setSuccess(`Successfully subscribed to ${response.data.subscription.packageDetails.name} package!`);
      
      if (showCurrentPlan) {
        await loadCurrentSubscription();
      }
      
      if (onSelect) {
        onSelect(response.data.subscription);
      }
      
      // Reload after 2 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      console.error('Error subscribing:', err);
      const errorMessage = err.response?.data?.message || 'Failed to subscribe. Please try again.';
      setError(errorMessage);
    } finally {
      setSubscribing(false);
    }
  };

  const getFeatureIcon = (hasFeature) => {
    return hasFeature ? '✓' : '✗';
  };

  const getFeatureClass = (hasFeature) => {
    return hasFeature ? 'text-green-400' : 'text-gray-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl my-8">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Choose Your Plan</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Plan */}
          {showCurrentPlan && currentSubscription && (
            <div className="mb-6 p-4 bg-primary-900 border border-primary-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Current Plan</h3>
                  <p className="text-gray-300">
                    {currentSubscription.packageDetails.name} Package
                    {currentSubscription.endDate && (
                      <span className="text-gray-400 ml-2">
                        (Expires: {new Date(currentSubscription.endDate).toLocaleDateString()})
                      </span>
                    )}
                  </p>
                </div>
                <span className="px-3 py-1 bg-primary-500 text-white rounded text-sm font-semibold">
                  {currentSubscription.packageDetails.name}
                </span>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-900 border border-green-700 rounded text-green-200">
              {success}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const isCurrent = currentSubscription?.package === pkg.id;
              const isFree = pkg.id === 'free';
              
              return (
                <div
                  key={pkg.id}
                  className={`bg-gray-800 border-2 rounded-lg p-6 ${
                    isCurrent
                      ? 'border-primary-500'
                      : pkg.id === 'premium'
                      ? 'border-yellow-500'
                      : 'border-gray-700'
                  } hover:border-primary-500 transition-colors`}
                >
                  {/* Package Header */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-primary-500">
                        {pkg.price === 0 ? 'Free' : `KES ${pkg.price.toLocaleString()}`}
                      </span>
                      {pkg.price > 0 && (
                        <span className="text-gray-400 text-sm ml-2">/{pkg.billingPeriod}</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{pkg.description}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    <div className={`${getFeatureClass(pkg.features.maxOrdersPerMonth > 0)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.maxOrdersPerMonth > 0)}</span>
                      <span className="text-sm">
                        {pkg.features.maxOrdersPerMonth === -1
                          ? 'Unlimited orders'
                          : `${pkg.features.maxOrdersPerMonth} orders/month`}
                      </span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.maxProducts > 0)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.maxProducts > 0)}</span>
                      <span className="text-sm">
                        {pkg.features.maxProducts === -1
                          ? 'Unlimited products'
                          : `${pkg.features.maxProducts} products`}
                      </span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.realTimeTracking)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.realTimeTracking)}</span>
                      <span className="text-sm">Real-time tracking</span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.basicReports)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.basicReports)}</span>
                      <span className="text-sm">Basic reports</span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.prioritySupport)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.prioritySupport)}</span>
                      <span className="text-sm">Priority support</span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.advancedAnalytics)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.advancedAnalytics)}</span>
                      <span className="text-sm">Advanced analytics</span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.apiAccess)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.apiAccess)}</span>
                      <span className="text-sm">API access</span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.customBranding)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.customBranding)}</span>
                      <span className="text-sm">Custom branding</span>
                    </div>
                    <div className={`${getFeatureClass(pkg.features.whiteLabel)} flex items-center`}>
                      <span className="mr-2">{getFeatureIcon(pkg.features.whiteLabel)}</span>
                      <span className="text-sm">White label</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSubscribe(pkg.id)}
                    disabled={subscribing || isCurrent}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : pkg.id === 'premium'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-primary-500 hover:bg-primary-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {subscribing
                      ? 'Processing...'
                      : isCurrent
                      ? 'Current Plan'
                      : isFree
                      ? 'Select Free'
                      : `Subscribe for KES ${pkg.price.toLocaleString()}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center text-gray-400 text-sm">
            <p>All plans include basic features. Upgrade anytime to unlock more features.</p>
            <p className="mt-2">Payment is processed securely through your wallet or M-Pesa.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;



