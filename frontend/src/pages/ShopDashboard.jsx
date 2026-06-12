import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import LiveTracking from '../components/LiveTracking';
import Notifications from '../components/Notifications';
import Messages from '../components/Messages';
import ChatBox from '../components/ChatBox';
import Inbox from '../components/Inbox';
import AddressAutocomplete from '../components/AddressAutocomplete';
import BidChat from '../components/BidChat';
import EditProfile from '../components/EditProfile';
import Reports from '../components/Reports';
import Products from '../components/Products';
import TalkToAdmin from '../components/TalkToAdmin';
import Complaints from '../components/Complaints';
import Pricing from '../components/Pricing';
import LogoutConfirm from '../components/LogoutConfirm';

const ShopDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [orders, setOrders] = useState([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [socket, setSocket] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [messageOrderId, setMessageOrderId] = useState(null);
  const [showBidChat, setShowBidChat] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [chatBoxOrderId, setChatBoxOrderId] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTalkToAdmin, setShowTalkToAdmin] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForBid, setPinForBid] = useState('');
  const [pendingBidAction, setPendingBidAction] = useState(null); // { orderId, bidIndex }
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupData, setPinSetupData] = useState({ pin: '', confirmPin: '', currentPin: '' });
  const [pinSetupMode, setPinSetupMode] = useState('new'); // 'new' or 'update'

  useEffect(() => {
    const verifyAndLoad = async () => {
      // Wait a bit for AuthContext to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If no user in context, try to get from server
      if (!user) {
        try {
          const response = await axios.get('/api/auth/me');
          const userData = response.data.user;
          
          if (userData && userData.role === 'shop') {
            // Email verification is no longer required for login
            // User can access dashboard even if email is not verified
            // User will be set by AuthContext, but we can proceed
            loadData();
            initializeSocket();
            return;
          } else {
            navigate('/shop/login');
            return;
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          navigate('/shop/login');
          return;
        }
      }
      
      if (!user || user.role !== 'shop') {
        navigate('/shop/login');
        return;
      }

      // Email verification is no longer required for login
      // User can access dashboard even if email is not verified
      loadData();
      initializeSocket();
    };

    verifyAndLoad();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  const loadData = async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        axios.get('/api/shop/profile'),
        axios.get('/api/shop/orders')
      ]);

      setProfile(profileRes.data.shop);
      setWallet(profileRes.data.wallet || { balance: 0, transactions: [] });
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('Error loading data:', error);
      
      if (error.response?.status === 401) {
        navigate('/shop/login');
      } else {
        alert('Failed to load dashboard data. Please refresh the page.');
      }
    }
  };

  // Check if PIN is set and show setup modal if needed
  useEffect(() => {
    if (profile) {
      // If PIN is not set, show setup modal (but only once per session)
      if (!profile.hasTransactionPin && !localStorage.getItem('pinSetupShown')) {
        // Delay slightly to let dashboard render first
        setTimeout(() => {
          setShowPinSetup(true);
          setPinSetupMode('new');
          localStorage.setItem('pinSetupShown', 'true');
        }, 1000);
      }
    }
  }, [profile]);

  const setupTransactionPin = async () => {
    try {
      if (pinSetupData.pin.length !== 4 || !/^\d{4}$/.test(pinSetupData.pin)) {
        alert('PIN must be exactly 4 digits');
        return;
      }

      if (pinSetupData.pin !== pinSetupData.confirmPin) {
        alert('PINs do not match. Please try again.');
        return;
      }

      const requestData = {
        pin: pinSetupData.pin
      };

      // If updating, include current PIN
      if (pinSetupMode === 'update' && pinSetupData.currentPin) {
        requestData.currentPin = pinSetupData.currentPin;
      }

      await axios.put('/api/wallet/transaction-pin', requestData);
      
      alert('✅ Transaction PIN set successfully!');
      setShowPinSetup(false);
      setPinSetupData({ pin: '', confirmPin: '', currentPin: '' });
      loadData(); // Reload profile
    } catch (error) {
      console.error('Error setting PIN:', error);
      const errorMsg = error.response?.data?.message || 'Failed to set transaction PIN';
      alert(`❌ ${errorMsg}`);
    }
  };

  const initializeSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      const userId = user._id || user.id;
      if (userId) {
        newSocket.emit('join_user', userId);
      }
    });

    newSocket.on('new_bid', (data) => {
      // Show notification for new bid
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-primary-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.innerHTML = `💰 New bid received! <strong>KES ${data.bid?.price}</strong> from ${data.bid?.rider?.name || 'a rider'}`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 5000);
      // Refresh orders to show new bid
      loadData();
    });

    newSocket.on('bid_message', (data) => {
      // Update when rider sends a message
      loadData();
    });

    newSocket.on('order_status_update', (data) => {
      // Update order status in real-time
      loadData();
    });

    setSocket(newSocket);
  };

  const createOrder = async (orderData) => {
    try {
      await axios.post('/api/shop/orders', orderData);
      alert('Order created successfully!');
      setShowCreateOrder(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create order');
    }
  };

  const [acceptingBids, setAcceptingBids] = useState(new Set()); // Track orders being accepted

  const acceptBid = async (orderId, bidIndex, pin = null) => {
    // Prevent duplicate actions
    const actionKey = `${orderId}-${bidIndex}`;
    if (acceptingBids.has(actionKey)) {
      return;
    }

    // If PIN not provided, show PIN modal
    if (!pin) {
      setPendingBidAction({ orderId, bidIndex });
      setShowPinModal(true);
      return;
    }

    // Confirm before accepting
    const confirmed = confirm('Are you sure you want to accept this bid? This will reject all other bids.');
    if (!confirmed) {
      return;
    }

    setAcceptingBids(prev => new Set(prev).add(actionKey));
    
    try {
      const response = await axios.post(`/api/shop/orders/${orderId}/accept-bid`, { 
        bidIndex,
        pin: pin
      });
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.textContent = '✅ Bid accepted! The rider has been notified.';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
      
      loadData();
      
      // Close PIN modal if open
      setShowPinModal(false);
      setPinForBid('');
      setPendingBidAction(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to accept bid. Please try again.';
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.textContent = `❌ ${errorMessage}`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 4000);
      }, 4000);
      
      // If PIN error, keep modal open
      if (error.response?.data?.message?.includes('PIN')) {
        setPinForBid('');
      } else {
        setShowPinModal(false);
        setPinForBid('');
        setPendingBidAction(null);
      }
    } finally {
      setAcceptingBids(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const handlePinSubmit = () => {
    if (!pinForBid || pinForBid.length !== 4) {
      alert('Please enter a valid 4-digit PIN');
      return;
    }

    if (pendingBidAction) {
      acceptBid(pendingBidAction.orderId, pendingBidAction.bidIndex, pinForBid);
    }
  };

  const markHandover = async (orderId) => {
    try {
      await axios.post(`/api/shop/orders/${orderId}/handover`);
      loadData();
    } catch (error) {
      alert('Failed to mark handover');
    }
  };

  const rateRider = async (orderId, rating) => {
    try {
      await axios.post(`/api/shop/orders/${orderId}/rate`, { rating });
      alert('Rating submitted!');
      loadData();
    } catch (error) {
      alert('Failed to submit rating');
    }
  };

  const topUpWallet = async (amount, phone, method = 'mpesa') => {
    try {
      if (method === 'mpesa') {
        const response = await axios.post('/api/mpesa/stk-push', { 
          amount, 
          phone: phone || profile.phone 
        });
        
        if (response.data.simulated) {
          alert(`Top-up successful! KES ${amount} added to your wallet. (Simulated in development mode)`);
          loadData(); // Refresh wallet balance
        } else {
          alert('STK Push sent! Please check your phone and enter your M-Pesa PIN to complete the payment. Your wallet will be updated automatically once payment is confirmed.');
          // Poll for wallet update (in a real app, use WebSocket or polling)
          setTimeout(() => {
            loadData();
          }, 5000);
        }
      } else {
        // Manual top-up request
        alert('Manual top-up requested. Please contact admin to complete the transaction.');
      }
    } catch (error) {
      console.error('Top-up error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to initiate payment. Please try again.';
      
      // If M-Pesa is not configured, suggest manual top-up
      if (errorMessage.includes('M-Pesa service not configured')) {
        const useManual = confirm('M-Pesa is not configured. Would you like to request a manual top-up instead?');
        if (useManual) {
          // You can implement manual top-up request here
          alert('Manual top-up requested. Please contact admin to complete the transaction.');
        }
      } else {
        alert(errorMessage);
      }
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-dark-900/30 border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-2xl font-bold text-primary-500 hover:text-primary-400 transition-colors"
              onClick={(e) => {
                // Just navigate, don't log out - session stays active
              }}
            >
              Njiani Shop
            </Link>
            <Link 
              to="/" 
              className="text-sm text-gray-400 hover:text-primary-500 transition-colors relative group flex items-center gap-2"
              onClick={(e) => {
                // Just navigate to home, keep user logged in
              }}
            >
              <span className="text-lg">🏠</span>
              <span>Home</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <button
              onClick={() => {
                // Navigate back within dashboard (scroll to top)
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm text-gray-400 hover:text-primary-500 transition-colors relative group flex items-center gap-2"
              title="Back to Top"
            >
              <span className="text-lg transform transition-transform group-hover:-translate-x-1">←</span>
              <span>Back</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowInbox(true)}
              className="btn-secondary flex items-center gap-2"
              title="Open Inbox"
            >
              💬 Inbox
            </button>
            <Notifications 
              onMessageNotificationClick={(orderId) => {
                // Open inbox with the selected order
                setShowInbox(true);
                setChatBoxOrderId(orderId);
              }}
            />
            <span className="text-gray-300">KES {wallet.balance.toFixed(2)}</span>
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              className="btn-secondary hover:bg-red-600/20 hover:border-red-500/50 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Shop Profile</h2>
              <button
                onClick={() => setShowEditProfile(true)}
                className="text-primary-500 hover:text-primary-400 transition-colors"
                title="Edit Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-gray-300">
              <div className="flex gap-3 mb-3">
                {profile.profilePicture && (
                  <div>
                    <img
                      src={profile.profilePicture}
                      alt="Profile picture"
                      className="w-20 h-20 object-cover rounded-full border-2 border-primary-500/50"
                    />
                  </div>
                )}
                {profile.shopLogo && (
                  <div>
                    <img
                      src={profile.shopLogo}
                      alt="Shop logo"
                      className="w-20 h-20 object-cover rounded-lg border border-dark-700"
                    />
                  </div>
                )}
              </div>
              <p><strong>Name:</strong> {profile.shopName}</p>
              <p><strong>Phone:</strong> {profile.phone}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              {profile.emailVerified && (
                <p className="text-green-400 text-sm">✓ Email verified</p>
              )}
              <p><strong>Address:</strong> {profile.shopAddress}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCreateOrder(true)}
                className="btn-primary flex-1"
              >
                Create New Order
              </button>
              <button
                onClick={() => setShowReports(true)}
                className="btn-secondary flex-1"
                title="Generate Reports"
              >
                📊 Reports
              </button>
              <button
                onClick={() => setShowProducts(true)}
                className="btn-secondary flex-1"
                title="Manage Products"
              >
                📦 Products
              </button>
              <button
                onClick={() => setShowComplaints(true)}
                className="btn-secondary flex-1"
                title="Submit or View Complaints"
              >
                📝 Complaints
              </button>
              <button
                onClick={() => setShowPricing(true)}
                className="btn-secondary flex-1"
                title="View Pricing Plans"
              >
                💎 Pricing
              </button>
            </div>
          </div>

          {/* Wallet */}
          <div className="card md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Wallet</h2>
              <button
                onClick={() => {
                  setPinSetupMode('update');
                  setShowPinSetup(true);
                }}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                title="Set or update transaction PIN"
              >
                🔒 {profile?.hasTransactionPin ? 'Update PIN' : 'Set PIN'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-3xl font-bold text-primary-500 mb-4">
                  KES {wallet.balance.toFixed(2)}
                </p>
                {!profile?.hasTransactionPin && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-yellow-400 text-sm mb-2">
                      ⚠️ Transaction PIN not set
                    </p>
                    <p className="text-gray-300 text-xs mb-2">
                      Set up your PIN to accept bids and request payouts securely.
                    </p>
                    <button
                      onClick={() => {
                        setPinSetupMode('new');
                        setShowPinSetup(true);
                      }}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      Set PIN Now
                    </button>
                  </div>
                )}
                <TopUpForm onTopUp={topUpWallet} phone={profile.phone} />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-white">Recent Transactions</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {wallet.transactions.length === 0 ? (
                    <p className="text-gray-400 text-sm">No transactions yet</p>
                  ) : (
                    wallet.transactions.map((tx, idx) => (
                      <div key={idx} className="text-sm text-gray-300 border-b border-dark-700 pb-2">
                        <p>{tx.description}</p>
                        <p className={tx.type === 'topup' ? 'text-green-400' : 'text-red-400'}>
                          {tx.type === 'topup' ? '+' : '-'}KES {tx.amount.toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="card md:col-span-3">
            <h2 className="text-xl font-bold mb-4 text-white">Orders</h2>
            
            {orders.length === 0 ? (
              <p className="text-gray-400">No orders yet</p>
            ) : (
              <>
                {/* Categorize orders */}
                {(() => {
                  const urgentOrders = orders.filter(order => order.isUrgent);
                  const normalOrders = orders.filter(order => !order.isUrgent);
                  
                  return (
                    <div className="space-y-6">
                      {/* Urgent Orders Section */}
                      {urgentOrders.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🚨</span>
                            <h3 className="text-lg font-semibold text-red-400">Urgent Orders ({urgentOrders.length})</h3>
                          </div>
                          <div className="space-y-4 border-l-4 border-red-500 pl-4">
                            {urgentOrders.map((order) => (
                              <div key={order._id} className="border border-red-500/30 rounded-lg">
                                <OrderCard
                                  order={order}
                                  onAcceptBid={acceptBid}
                                  onHandover={markHandover}
                                  onRate={rateRider}
                                  onViewTracking={() => setSelectedOrder(order)}
                                  onMessage={() => {
                                    setMessageOrderId(order._id);
                                    setShowMessages(true);
                                  }}
                                  acceptingBids={acceptingBids}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Normal Orders Section */}
                      {normalOrders.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📦</span>
                            <h3 className="text-lg font-semibold text-gray-300">Regular Orders ({normalOrders.length})</h3>
                          </div>
                          <div className="space-y-4">
                            {normalOrders.map((order) => (
                              <OrderCard
                                key={order._id}
                                order={order}
                                onAcceptBid={acceptBid}
                                onHandover={markHandover}
                                onRate={rateRider}
                                onViewTracking={() => setSelectedOrder(order)}
                                onMessage={() => {
                                  setMessageOrderId(order._id);
                                  setShowMessages(true);
                                }}
                                acceptingBids={acceptingBids}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateOrder && (
        <CreateOrderModal
          shopAddress={profile.shopAddress}
          onCreate={createOrder}
          onClose={() => setShowCreateOrder(false)}
        />
      )}

      {/* Tracking Modal */}
      {selectedOrder && (
        <TrackingModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Messages Modal */}
      {showMessages && messageOrderId && (
        <Messages 
          orderId={messageOrderId} 
          onClose={() => {
            setShowMessages(false);
            setMessageOrderId(null);
          }} 
        />
      )}

      {/* Bid Chat Modal */}
      {showBidChat && selectedBid && (
        <BidChat
          orderId={selectedBid.orderId}
          bidIndex={selectedBid.bidIndex}
          bid={selectedBid.bid}
          onClose={() => {
            setShowBidChat(false);
            setSelectedBid(null);
            loadData();
          }}
          onBidAccepted={() => {
            setShowBidChat(false);
            setSelectedBid(null);
            loadData();
          }}
          onBidRejected={() => {
            setShowBidChat(false);
            setSelectedBid(null);
            loadData();
          }}
        />
      )}

      {showEditProfile && profile && (
        <EditProfile
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
            setShowEditProfile(false);
            // Reload all data to ensure consistency
            loadData();
          }}
        />
      )}

      {showReports && (
        <Reports onClose={() => setShowReports(false)} />
      )}

      {showProducts && (
        <Products onClose={() => setShowProducts(false)} />
      )}

      {showTalkToAdmin && (
        <TalkToAdmin onClose={() => setShowTalkToAdmin(false)} />
      )}

      {showComplaints && (
        <Complaints onClose={() => setShowComplaints(false)} userRole="shop" />
      )}

      {showPricing && (
        <Pricing onClose={() => setShowPricing(false)} showCurrentPlan={true} />
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <Inbox onClose={() => setShowInbox(false)} />
      )}

      {/* Persistent ChatBox */}
      <ChatBox 
        orders={orders} 
        initialOrderId={chatBoxOrderId}
        onOrderSelected={(orderId) => setChatBoxOrderId(orderId)}
      />

      {/* Urban Style Logout Confirmation */}
      {showLogoutConfirm && (
        <LogoutConfirm
          onConfirm={() => {
            logout();
            setShowLogoutConfirm(false);
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {/* Transaction PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {pinSetupMode === 'new' ? 'Set Transaction PIN' : 'Update Transaction PIN'}
              </h3>
              <button
                onClick={() => {
                  setShowPinSetup(false);
                  setPinSetupData({ pin: '', confirmPin: '', currentPin: '' });
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-4">
              {pinSetupMode === 'new' 
                ? 'Create a 4-digit PIN to secure your transactions (accepting bids, payouts, etc.)'
                : 'Enter your current PIN and create a new 4-digit PIN'}
            </p>

            {pinSetupMode === 'update' && (
              <div className="mb-4">
                <label className="block text-gray-300 mb-2 text-sm">Current PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinSetupData.currentPin}
                  onChange={(e) => setPinSetupData({ ...pinSetupData, currentPin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Enter current PIN"
                  className="input-field w-full text-center text-xl tracking-widest"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm">New PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pinSetupData.pin}
                onChange={(e) => setPinSetupData({ ...pinSetupData, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="Enter 4-digit PIN"
                className="input-field w-full text-center text-xl tracking-widest"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm">Confirm PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pinSetupData.confirmPin}
                onChange={(e) => setPinSetupData({ ...pinSetupData, confirmPin: e.target.value.replace(/\D/g, '') })}
                placeholder="Confirm 4-digit PIN"
                className="input-field w-full text-center text-xl tracking-widest"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && pinSetupData.pin.length === 4 && pinSetupData.confirmPin.length === 4) {
                    setupTransactionPin();
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPinSetup(false);
                  setPinSetupData({ pin: '', confirmPin: '', currentPin: '' });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={setupTransactionPin}
                disabled={pinSetupData.pin.length !== 4 || pinSetupData.confirmPin.length !== 4 || (pinSetupMode === 'update' && pinSetupData.currentPin.length !== 4)}
                className="btn-primary flex-1"
              >
                {pinSetupMode === 'new' ? 'Set PIN' : 'Update PIN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TopUpForm = ({ onTopUp, phone }) => {
  const [amount, setAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('mpesa'); // 'mpesa' or 'manual'
  const [topUpPhone, setTopUpPhone] = useState(phone || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount && parseFloat(amount) > 0) {
      if (topUpMethod === 'mpesa') {
        onTopUp(parseFloat(amount), topUpPhone || phone);
      } else {
        // Manual top-up - just add to wallet directly
        onTopUp(parseFloat(amount), null, 'manual');
      }
      setAmount('');
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-3">
      <div>
        <label className="block text-gray-300 mb-2 text-sm">Top-Up Method</label>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setTopUpMethod('mpesa')}
            className={`flex-1 py-2 rounded text-sm font-semibold ${
              topUpMethod === 'mpesa'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            M-Pesa
          </button>
          <button
            type="button"
            onClick={() => setTopUpMethod('manual')}
            className={`flex-1 py-2 rounded text-sm font-semibold ${
              topUpMethod === 'manual'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            Manual
          </button>
        </div>
      </div>
      
      <input
        type="number"
        placeholder="Amount (KES)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="input-field"
        min="1"
        required
      />
      
      {topUpMethod === 'mpesa' && (
        <input
          type="tel"
          placeholder="M-Pesa Phone Number (optional)"
          value={topUpPhone}
          onChange={(e) => setTopUpPhone(e.target.value)}
          className="input-field"
        />
      )}
      
      {topUpMethod === 'manual' && (
        <p className="text-xs text-gray-400">
          Manual top-up: Contact admin to add funds to your wallet.
        </p>
      )}
      
      <button 
        type="submit" 
        className="btn-primary w-full"
      >
        {topUpMethod === 'mpesa' ? 'Top Up via M-Pesa' : 'Request Manual Top-Up'}
      </button>
    </form>
  );
};

const OrderCard = ({ order, onAcceptBid, onHandover, onRate, onViewTracking, onMessage, acceptingBids }) => {
  const [showBids, setShowBids] = useState(false);
  
  const isAcceptingBid = (orderId, bidIndex) => {
    return acceptingBids?.has(`${orderId}-${bidIndex}`) || false;
  };

  return (
    <div className={`bg-dark-700 p-4 rounded-lg ${order.isUrgent ? 'border-l-4 border-red-500' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white">Order #{order._id.slice(-6)}</p>
            {order.isUrgent && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
                🚨 URGENT
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">To: {order.deliveryAddress}</p>
          {order.distance && (
            <p className="text-sm text-primary-400 font-semibold">
              📍 Distance: {order.distance.text || `${order.distance.value?.toFixed(1)} km`}
              {order.distance.durationText && ` • ⏱️ ${order.distance.durationText}`}
            </p>
          )}
          <p className="text-sm text-gray-400">Customer: {order.customerName} - {order.customerPhone}</p>
          <p className="text-sm text-gray-400">Value: KES {order.goodsValue}</p>
          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
            order.status === 'delivered' ? 'bg-green-600' :
            order.status === 'in_transit' ? 'bg-blue-600' :
            order.status === 'bidding' ? 'bg-yellow-600' :
            'bg-gray-600'
          }`}>
            {order.status}
          </span>
        </div>
        <div className="flex gap-2">
          {order.status === 'bidding' && order.bids?.length > 0 && (
            <button
              onClick={() => setShowBids(!showBids)}
              className="btn-secondary text-sm"
            >
              View Bids ({order.bids.length})
            </button>
          )}
          {(order.status === 'picked_up' || order.status === 'in_transit') && (
            <>
              <button
                onClick={() => onViewTracking()}
                className="btn-primary text-sm"
              >
                Track
              </button>
              <button
                onClick={() => onMessage()}
                className="btn-secondary text-sm"
              >
                💬 Message
              </button>
            </>
          )}
          {(order.status === 'accepted' || order.status === 'picked_up' || order.status === 'in_transit') && !order.rider && (
            <button
              onClick={() => onMessage()}
              className="btn-secondary text-sm"
            >
              💬 Message
            </button>
          )}
        </div>
      </div>

      {showBids && order.bids?.length > 0 && (
        <div className="mt-4 space-y-2">
          {order.bids.map((bid, idx) => (
            <div key={idx} className="bg-dark-800 p-3 rounded">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">{bid.rider?.name}</p>
                  <p className="text-sm text-gray-400">
                    KES {bid.price} • ⏱️ {bid.estimatedTime >= 60 
                      ? `${(bid.estimatedTime / 60).toFixed(1)} hours` 
                      : `${bid.estimatedTime} minutes`}
                  </p>
                  {bid.message && (
                    <p 
                      className="text-sm text-primary-400 mt-2 cursor-pointer hover:underline"
                      onClick={() => {
                        setSelectedBid({ orderId: order._id, bidIndex: idx, bid });
                        setShowBidChat(true);
                      }}
                    >
                      💬 {bid.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedBid({ orderId: order._id, bidIndex: idx, bid });
                      setShowBidChat(true);
                    }}
                    className="btn-secondary text-sm"
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => onAcceptBid(order._id, idx)}
                    disabled={isAcceptingBid(order._id, idx) || bid.status === 'accepted' || bid.status === 'rejected'}
                    className={`btn-primary text-sm ${
                      isAcceptingBid(order._id, idx) || bid.status === 'accepted' || bid.status === 'rejected'
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {isAcceptingBid(order._id, idx) 
                      ? '⏳ Accepting...' 
                      : bid.status === 'accepted' 
                        ? '✓ Accepted' 
                        : bid.status === 'rejected'
                          ? '✗ Rejected'
                          : 'Accept'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {order.status === 'accepted' && (
        <button
          onClick={() => onHandover(order._id)}
          className="btn-primary w-full mt-2"
        >
          Mark Goods Handed Over
        </button>
      )}

      {order.status === 'delivered' && !order.shopRating && (
        <div className="mt-2">
          <p className="text-sm text-gray-300 mb-2">Rate this delivery:</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => onRate(order._id, rating)}
                className="bg-dark-600 hover:bg-primary-600 px-3 py-1 rounded"
              >
                ⭐ {rating}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateOrderModal = ({ shopAddress, onCreate, onClose }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryLocation: null,
    goodsDescription: '',
    goodsValue: '',
    category: 'Other',
    isUrgent: false
  });

  const handleChange = (e) => {
    if (e.target.type === 'checkbox') {
      setFormData({ ...formData, [e.target.name]: e.target.checked });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.deliveryAddress || formData.deliveryAddress.trim() === '') {
      alert('Please enter a delivery address');
      return;
    }
    
    onCreate({
      ...formData,
      pickupAddress: shopAddress,
      goodsValue: parseFloat(formData.goodsValue) || 0,
      deliveryLocation: formData.deliveryLocation
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-white">Create New Order</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Customer Name</label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Customer Phone</label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Delivery Address *</label>
            <AddressAutocomplete
              placeholder="Search for delivery address (e.g., Jevanjee Gardens, Nairobi)"
              defaultValue={formData.deliveryAddress}
              onPlaceSelect={(place) => {
                if (place && place.address) {
                  setFormData({
                    ...formData,
                    deliveryAddress: place.address,
                    deliveryLocation: place.location
                  });
                }
              }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Start typing to search for addresses in Kenya. You can also enter manually.
            </p>
          </div>
          <div>
            <label className="block text-gray-300 mb-2">Goods Description</label>
            <textarea
              name="goodsDescription"
              value={formData.goodsDescription}
              onChange={handleChange}
              required
              rows="3"
              className="input-field"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Goods Value (KES)</label>
              <input
                type="number"
                name="goodsValue"
                value={formData.goodsValue}
                onChange={handleChange}
                required
                min="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field"
              >
                <option value="Documents">Documents</option>
                <option value="Food">Food</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Groceries">Groceries</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isUrgent"
              checked={formData.isUrgent}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-gray-300">Urgent Delivery</span>
          </label>
          <div className="flex gap-4">
            <button type="submit" className="btn-primary flex-1">Create Order</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TrackingModal = ({ order, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Order Tracking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <LiveTracking orderId={order._id} />
      </div>
    </div>
  );
};

export default ShopDashboard;

