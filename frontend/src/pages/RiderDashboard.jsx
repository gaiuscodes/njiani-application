import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import LiveTracking from '../components/LiveTracking';
import Notifications from '../components/Notifications';
import Messages from '../components/Messages';
import ShopInfoModal from '../components/ShopInfoModal';
import ChangePassword from '../components/ChangePassword';
import Reports from '../components/Reports';
import TalkToAdmin from '../components/TalkToAdmin';
import Complaints from '../components/Complaints';
import CountdownTimer from '../components/CountdownTimer';
import ChatBox from '../components/ChatBox';
import Inbox from '../components/Inbox';
import LogoutConfirm from '../components/LogoutConfirm';
import PhotoCapture from '../components/PhotoCapture';
import EditRiderProfile from '../components/EditRiderProfile';

const RiderDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [socket, setSocket] = useState(null);
  const [locationInterval, setLocationInterval] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [myBids, setMyBids] = useState({ pending: [], accepted: [], rejected: [], cancelled: [] });
  const [activeBidTab, setActiveBidTab] = useState('pending');
  const [showShopInfo, setShowShopInfo] = useState(false);
  const [selectedShopInfo, setSelectedShopInfo] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showTalkToAdmin, setShowTalkToAdmin] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [payoutPin, setPayoutPin] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
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
          if (response.data.user && response.data.user.role === 'rider') {
            // User will be set by AuthContext, but we can proceed
            loadData();
            initializeSocket();
            return;
          } else {
            navigate('/rider/login');
            return;
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          navigate('/rider/login');
          return;
        }
      }
      
      if (!user || user.role !== 'rider') {
        navigate('/rider/login');
        return;
      }

      loadData();
      initializeSocket();
    };

    verifyAndLoad();

    return () => {
      if (socket) socket.disconnect();
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [user]);

  const [riderOrders, setRiderOrders] = useState([]);
  const [chatBoxOrderId, setChatBoxOrderId] = useState(null);

  const loadData = async () => {
    try {
      const [profileRes, ordersRes, activeRes, bidsRes] = await Promise.all([
        axios.get('/api/rider/profile'),
        axios.get('/api/rider/available-orders'),
        axios.get('/api/rider/active-order'),
        axios.get('/api/rider/bids')
      ]);

      if (profileRes.data && profileRes.data.rider) {
        setProfile(profileRes.data.rider);
      } else {
        console.error('Invalid profile data received:', profileRes.data);
        setProfile(null);
      }
      setWallet(profileRes.data.wallet || { balance: 0, transactions: [] });
      setAvailableOrders(ordersRes.data.orders || []);
      const activeOrderData = activeRes.data.order || null;
      setActiveOrder(activeOrderData);
      
      // Load rider's active orders for chat
      if (activeOrderData) {
        setRiderOrders([activeOrderData]);
      } else {
        // Get all orders where rider is assigned
        try {
          const myOrdersRes = await axios.get('/api/rider/my-orders');
          setRiderOrders(myOrdersRes.data.orders || []);
        } catch (err) {
          console.error('Error loading rider orders:', err);
          setRiderOrders([]);
        }
      }
      
      setMyBids(bidsRes.data.bids || { pending: [], accepted: [], rejected: [], cancelled: [] });
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        navigate('/rider/login');
      } else {
        // Set profile to null to show loading state, but don't show alert immediately
        // The user will see the loading screen
        setProfile(null);
        console.error('Failed to load dashboard data:', error);
        // Show error after a delay to avoid blocking the UI
        setTimeout(() => {
          alert('Failed to load dashboard data. Please refresh the page.');
        }, 1000);
      }
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
      if (activeOrder) {
        newSocket.emit('join_order', activeOrder._id);
      }
    });

    newSocket.on('new_order', (data) => {
      loadData();
    });

    newSocket.on('bid_accepted', (data) => {
      setActiveOrder(data.order);
      // Show notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.textContent = '🎉 Your bid was accepted! Check your active orders.';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
      loadData();
    });

    newSocket.on('bid_message', (data) => {
      // Update bids when shop sends a message
      loadData();
    });

    newSocket.on('status_updated', (data) => {
      // Update rider status in real-time
      if (data.rider) {
        setProfile(prev => ({ ...prev, ...data.rider, isFree: data.isFree }));
      }
    });

    newSocket.on('wallet_updated', (data) => {
      // Update wallet balance in real-time
      setWallet(prev => ({
        ...prev,
        balance: data.balance
      }));
      // Reload full wallet data to get updated transactions
      loadData();
    });

    setSocket(newSocket);

    // Start location tracking if rider has active order
    if (activeOrder) {
      startLocationTracking(newSocket);
    }
  };

  const startLocationTracking = (socket) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userId = user._id || user.id;
          const locationData = {
            riderId: userId,
            lat: latitude,
            lng: longitude,
            orderId: activeOrder?._id
          };

          socket.emit('rider_location', locationData);
          axios.post('/api/rider/update-location', {
            lat: latitude,
            lng: longitude
          }).catch(err => console.error('Location update error:', err));
        },
        (error) => console.error('Geolocation error:', error)
      );
    }, 10000); // Every 10 seconds

    setLocationInterval(interval);
  };

  const [togglingStatus, setTogglingStatus] = useState(false);

  const toggleStatus = async () => {
    if (togglingStatus) return; // Prevent duplicate clicks
    
    setTogglingStatus(true);
    try {
      const response = await axios.post('/api/rider/toggle-status');
      setProfile({ ...profile, isFree: response.data.isFree, ...response.data.rider });
      
      // Show success feedback
      const statusMessage = response.data.isFree 
        ? '✅ You are now free and can accept orders!' 
        : '⏸️ You are now busy';
      
      // Use a subtle notification instead of alert
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.textContent = statusMessage;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update status. Please try again.';
      
      if (error.response?.data?.hasActiveOrder) {
        alert('⚠️ ' + errorMessage);
      } else {
        alert('❌ ' + errorMessage);
      }
    } finally {
      setTogglingStatus(false);
    }
  };

  const [placingBids, setPlacingBids] = useState(new Set()); // Track orders being bid on

  const placeBid = async (orderId, price, estimatedTime, message) => {
    // Prevent duplicate bids
    if (placingBids.has(orderId)) {
      return;
    }

    try {
      // Validate inputs
      if (!orderId) {
        alert('❌ Error: Order ID is missing. Please refresh the page.');
        return;
      }
      
      if (!price || price <= 0) {
        alert('⚠️ Please enter a valid price (greater than 0)');
        return;
      }
      
      if (!estimatedTime || estimatedTime <= 0) {
        alert('⚠️ Please enter a valid estimated time (greater than 0)');
        return;
      }
      
      // Ensure message is always defined as a string (never undefined or null)
      const bidMessage = (message !== null && message !== undefined && typeof message === 'string') 
        ? message.trim() 
        : '';
      
      setPlacingBids(prev => new Set(prev).add(orderId));
      
      const response = await axios.post(`/api/rider/bid/${orderId}`, { 
        price: parseFloat(price), 
        estimatedTime: parseInt(estimatedTime),
        message: bidMessage
      });
      
      // Check if shop is not certified and show warning
      if (response.data.order?.shop && !response.data.order.shop.shopCertified) {
        const proceed = confirm(
          '⚠️ This shop is not certified. Do you want to proceed with the bid anyway?'
        );
        if (!proceed) {
          // Cancel the bid
          try {
            await axios.post(`/api/rider/bids/${orderId}/cancel`);
          } catch (err) {
            console.error('Error canceling bid:', err);
          }
          setPlacingBids(prev => {
            const newSet = new Set(prev);
            newSet.delete(orderId);
            return newSet;
          });
          return;
        }
      }
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.textContent = '✅ Bid placed successfully! The shop will be notified.';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
      
      // Refresh data
      loadData();
    } catch (error) {
      console.error('Error placing bid:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to place bid. Please try again.';
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
      notification.textContent = `❌ ${errorMessage}`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 4000);
      }, 4000);
    } finally {
      setPlacingBids(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const markPickedUp = async (orderId) => {
    try {
      await axios.post(`/api/rider/order/${orderId}/pickup`);
      loadData();
    } catch (error) {
      alert('Failed to mark as picked up');
    }
  };

  const markInTransit = async (orderId) => {
    try {
      await axios.post(`/api/rider/order/${orderId}/in-transit`);
      if (socket && !locationInterval) {
        startLocationTracking(socket);
      }
      loadData();
    } catch (error) {
      alert('Failed to mark as in transit');
    }
  };

  const handleDeliveryPhotoSelect = (e) => {
    const file = e.target.files?.[0] || e.target.value;
    if (file) {
      setReceiptPhoto(file);
    } else {
      setReceiptPhoto(null);
    }
  };

  const requestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(payoutAmount) < 10) {
      alert('Minimum payout amount is KES 10');
      return;
    }

    if (parseFloat(payoutAmount) > wallet.balance) {
      alert('Insufficient balance');
      return;
    }

    if (!payoutPhone || payoutPhone.trim() === '') {
      alert('Please enter your M-Pesa phone number');
      return;
    }

    if (!payoutPin || payoutPin.length !== 4) {
      alert('Please enter your 4-digit transaction PIN');
      return;
    }

    setRequestingPayout(true);
    try {
      const response = await axios.post('/api/wallet/payout', {
        amount: parseFloat(payoutAmount),
        phone: payoutPhone.trim(),
        pin: payoutPin
      });

      if (response.data.simulated) {
        alert(`Payout successful! KES ${payoutAmount} sent to ${payoutPhone}. (Simulated in development mode)`);
      } else {
        alert('Payout request submitted successfully! Processing...');
      }

      // Refresh wallet data
      loadData();
      
      // Close modal and reset form
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutPhone('');
      setPayoutPin('');
    } catch (error) {
      console.error('Payout error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process payout request. Please try again.';
      alert(errorMessage);
    } finally {
      setRequestingPayout(false);
    }
  };

  const completeDelivery = async () => {
    if (!activeOrder) return;
    
    if (!receiptPhoto) {
      alert('Please upload a photo of the receipt/invoice/confirmation before completing delivery');
      return;
    }

    setUploadingDelivery(true);
    try {
      const formData = new FormData();
      formData.append('receiptPhoto', receiptPhoto);

      await axios.post(`/api/rider/order/${activeOrder._id}/complete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('✅ Delivery completed successfully!');
      setActiveOrder(null);
      setReceiptPhoto(null);
      setShowDeliveryModal(false);
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }
      loadData();
    } catch (error) {
      console.error('Delivery completion error:', error);
      alert(error.response?.data?.message || 'Failed to complete delivery. Please try again.');
    } finally {
      setUploadingDelivery(false);
    }
  };

  if (!profile || typeof profile !== 'object') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">If this persists, please refresh the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-2xl font-bold text-primary-500 hover:text-primary-400 transition-colors"
              onClick={(e) => {
                // Just navigate, don't log out - session stays active
              }}
            >
              Njiani Rider
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
            <Notifications />
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
            <h2 className="text-xl font-bold mb-4 text-white">Profile</h2>
            {profile?.profilePicture && (
              <div className="mb-4 flex justify-center">
                <img
                  src={profile?.profilePicture}
                  alt={profile?.name || 'Profile'}
                  className="w-24 h-24 object-cover rounded-full border-2 border-primary-500/50"
                />
              </div>
            )}
            <div className="space-y-2 text-gray-300">
              <p><strong>Name:</strong> {profile?.name || 'N/A'}</p>
              <p><strong>Phone:</strong> {profile?.phone || 'N/A'}</p>
              <p><strong>Vehicle:</strong> {profile?.vehicleType || 'N/A'}</p>
              <p><strong>Rating:</strong> {(profile?.rating || 0).toFixed(1)} ⭐</p>
              <p><strong>Total Earnings:</strong> KES {(profile?.totalEarnings || 0).toFixed(2)}</p>
              <p><strong>Deliveries:</strong> {profile?.totalDeliveries || 0}</p>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="mt-4 w-full btn-secondary py-2"
            >
              ✏️ Edit Profile
            </button>
            <button
              onClick={toggleStatus}
              disabled={togglingStatus}
              className={`mt-2 w-full py-2 rounded-lg font-semibold transition-all ${
                profile?.isFree
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white ${togglingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {togglingStatus ? '⏳ Updating...' : (profile?.isFree ? '🟢 I am Free' : '🔴 I am Busy')}
            </button>
            <button
              onClick={() => setShowChangePassword(true)}
              className="mt-2 w-full btn-secondary py-2"
            >
              🔐 Change Password
            </button>
            <button
              onClick={() => setShowComplaints(true)}
              className="mt-2 w-full btn-secondary py-2"
            >
              📝 Complaints
            </button>
          </div>

          {/* Active Order */}
          {activeOrder && (
            <div className="card md:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-white">Active Delivery</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-300"><strong>Shop:</strong> {activeOrder.shop?.shopName}</p>
                  <p className="text-gray-300"><strong>To:</strong> {activeOrder.deliveryAddress}</p>
                  <p className="text-gray-300"><strong>Status:</strong> {activeOrder.status}</p>
                  {activeOrder.acceptedBid && (
                    <p className="text-gray-300 mt-1">
                      <strong>Estimated Time:</strong> {
                        activeOrder.acceptedBid.estimatedTime >= 60
                          ? `${(activeOrder.acceptedBid.estimatedTime / 60).toFixed(1)} hours`
                          : `${activeOrder.acceptedBid.estimatedTime} minutes`
                      }
                    </p>
                  )}
                </div>

                {/* Countdown Timer - Shows for accepted, picked_up, and in_transit orders */}
                {['accepted', 'picked_up', 'in_transit'].includes(activeOrder.status) && 
                 activeOrder.acceptedBid && 
                 activeOrder.acceptedBid.acceptedAt && (
                  <CountdownTimer
                    acceptedAt={activeOrder.acceptedBid.acceptedAt}
                    estimatedTimeMinutes={activeOrder.acceptedBid.estimatedTime}
                  />
                )}

                {activeOrder.status === 'accepted' && (
                  <button
                    onClick={() => markPickedUp(activeOrder._id)}
                    className="btn-primary w-full"
                  >
                    Mark as Picked Up
                  </button>
                )}

                {(activeOrder.status === 'accepted' || activeOrder.status === 'picked_up' || activeOrder.status === 'in_transit') && (
                  <button
                    onClick={() => setShowMessages(true)}
                    className="btn-secondary w-full mb-2"
                  >
                    💬 Message Shop
                  </button>
                )}

                {activeOrder.status === 'picked_up' && (
                  <>
                    <button
                      onClick={() => markInTransit(activeOrder._id)}
                      className="btn-primary w-full mb-2"
                    >
                      Start Delivery (In Transit)
                    </button>
                    <LiveTracking orderId={activeOrder._id} />
                  </>
                )}

                {activeOrder.status === 'in_transit' && (
                  <div>
                    <LiveTracking orderId={activeOrder._id} />
                    <button
                      onClick={() => setShowDeliveryModal(true)}
                      className="btn-primary w-full mt-4 py-3 text-lg font-semibold"
                    >
                      📦 Goods Delivered
                    </button>
                    <p className="text-sm text-gray-400 mt-2 text-center">
                      Click to upload receipt/invoice/confirmation photo
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Orders */}
          {!activeOrder && (profile?.isFree || profile?.acceptingOrders) && (
            <div className="card md:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-white">
                {profile?.acceptingOrders 
                  ? `Available Orders on Route (${profile?.ordersAcceptedOnRoute || 0}/${profile?.maxOrdersOnRoute || 4})`
                  : 'Available Orders'
                }
              </h2>
              {profile?.acceptingOrders && (
                <div className="mb-4 p-3 bg-primary-600 rounded-lg">
                  <p className="text-white font-semibold">
                    📍 Accepting orders on route: {profile?.activeRoute?.area || profile?.activeRoute?.deliveryAddress || 'Current route'}
                  </p>
                  <p className="text-sm text-gray-200">
                    You can accept {(profile?.maxOrdersOnRoute || 4) - (profile?.ordersAcceptedOnRoute || 0)} more orders on this route
                  </p>
                </div>
              )}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableOrders.length === 0 ? (
                  <p className="text-gray-400">No available orders</p>
                ) : (
                  availableOrders.map((order) => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      onBid={placeBid}
                      isPlacingBid={placingBids.has(order._id)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* My Bids */}
          <div className="card md:col-span-3">
            <h2 className="text-xl font-bold mb-4 text-white">My Bids</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-dark-700 overflow-x-auto">
              <button
                onClick={() => setActiveBidTab('pending')}
                className={`px-4 py-2 font-semibold whitespace-nowrap ${
                  activeBidTab === 'pending'
                    ? 'border-b-2 border-primary-500 text-primary-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Pending ({myBids.pending.length})
              </button>
              <button
                onClick={() => setActiveBidTab('accepted')}
                className={`px-4 py-2 font-semibold whitespace-nowrap ${
                  activeBidTab === 'accepted'
                    ? 'border-b-2 border-green-500 text-green-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Accepted ({myBids.accepted.length})
              </button>
              <button
                onClick={() => setActiveBidTab('rejected')}
                className={`px-4 py-2 font-semibold whitespace-nowrap ${
                  activeBidTab === 'rejected'
                    ? 'border-b-2 border-red-500 text-red-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rejected ({myBids.rejected.length})
              </button>
              <button
                onClick={() => setActiveBidTab('cancelled')}
                className={`px-4 py-2 font-semibold whitespace-nowrap ${
                  activeBidTab === 'cancelled'
                    ? 'border-b-2 border-gray-500 text-gray-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Cancelled ({myBids.cancelled.length})
              </button>
            </div>

            {/* Bids List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {myBids[activeBidTab].length === 0 ? (
                <p className="text-gray-400 text-center py-8">No {activeBidTab} bids</p>
              ) : (
                myBids[activeBidTab].map((bidInfo) => (
                  <BidCard 
                    key={bidInfo.orderId} 
                    bidInfo={bidInfo} 
                    activeTab={activeBidTab}
                    onViewShop={(shop, orderId) => {
                      setSelectedShopInfo({ shop, orderId });
                      setShowShopInfo(true);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Wallet */}
          <div className="card md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">My Wallet</h2>
              <button
                onClick={() => {
                  setPinSetupMode(profile?.hasTransactionPin ? 'update' : 'new');
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
                <p className="text-3xl font-bold text-primary-500 mb-2">
                  KES {wallet.balance.toFixed(2)}
                </p>
                {!profile?.hasTransactionPin && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-yellow-400 text-sm mb-2">
                      ⚠️ Transaction PIN not set
                    </p>
                    <p className="text-gray-300 text-xs mb-2">
                      Set up your PIN to request payouts securely.
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
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setPayoutPhone(profile?.phone || '');
                    setShowPayoutModal(true);
                  }}
                  disabled={wallet.balance < 10}
                >
                  Request Payout
                </button>
                {wallet.balance < 10 && (
                  <p className="text-xs text-gray-400 mt-2">Minimum balance: KES 10</p>
                )}
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
                        <p className={tx.type === 'earning' ? 'text-green-400' : 'text-red-400'}>
                          {tx.type === 'earning' ? '+' : '-'}KES {tx.amount.toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Modal */}
      {showMessages && activeOrder && (
        <Messages 
          orderId={activeOrder._id} 
          onClose={() => setShowMessages(false)} 
        />
      )}

      {/* Shop Info Modal */}
      {showShopInfo && selectedShopInfo && (
        <ShopInfoModal
          shop={selectedShopInfo.shop}
          orderId={selectedShopInfo.orderId}
          onClose={() => {
            setShowShopInfo(false);
            setSelectedShopInfo(null);
          }}
          onCancelBid={() => {
            loadData();
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && profile && (
        <EditRiderProfile
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
            loadData(); // Reload to get fresh data
          }}
        />
      )}

      {showReports && (
        <Reports onClose={() => setShowReports(false)} />
      )}

      {showTalkToAdmin && (
        <TalkToAdmin onClose={() => setShowTalkToAdmin(false)} />
      )}

      {showComplaints && (
        <Complaints onClose={() => setShowComplaints(false)} userRole="rider" />
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <Inbox onClose={() => setShowInbox(false)} />
      )}

      {/* Persistent ChatBox */}
      <ChatBox 
        orders={riderOrders} 
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
                ? 'Create a 4-digit PIN to secure your transactions (payouts, etc.)'
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

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full border border-dark-700">
            <h2 className="text-2xl font-bold text-white mb-4">Request Payout</h2>
            <p className="text-gray-300 mb-4">
              Withdraw funds from your wallet to your M-Pesa account.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Available Balance</label>
                <p className="text-2xl font-bold text-primary-500">KES {wallet.balance.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">Amount (KES)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input-field"
                  min="10"
                  max={wallet.balance}
                  step="1"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Minimum: KES 10</p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="input-field"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Enter the phone number registered with M-Pesa</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={requestPayout}
                  disabled={!payoutAmount || !payoutPhone || !payoutPin || payoutPin.length !== 4 || requestingPayout || parseFloat(payoutAmount) < 10 || parseFloat(payoutAmount) > wallet.balance}
                  className={`btn-primary flex-1 py-3 ${
                    !payoutAmount || !payoutPhone || !payoutPin || payoutPin.length !== 4 || requestingPayout || parseFloat(payoutAmount) < 10 || parseFloat(payoutAmount) > wallet.balance
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {requestingPayout ? 'Processing...' : 'Request Payout'}
                </button>
                <button
                  onClick={() => {
                    setShowPayoutModal(false);
                    setPayoutAmount('');
                    setPayoutPhone('');
                    setPayoutPin('');
                  }}
                  className="btn-secondary py-3 px-6"
                  disabled={requestingPayout}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goods Delivered Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full border border-dark-700">
            <h2 className="text-2xl font-bold text-white mb-4">Goods Delivered</h2>
            <p className="text-gray-300 mb-4">
              Please upload a photo of the receipt, invoice, or delivery confirmation to complete the delivery.
            </p>
            
            <div className="space-y-4">
              <PhotoCapture
                label="Receipt/Invoice/Confirmation Photo"
                name="receiptPhoto"
                value={receiptPhoto}
                onChange={handleDeliveryPhotoSelect}
                required={true}
                maxSizeMB={10}
              />

              <div className="flex gap-3">
                <button
                  onClick={completeDelivery}
                  disabled={!receiptPhoto || uploadingDelivery}
                  className={`btn-primary flex-1 py-3 ${
                    !receiptPhoto || uploadingDelivery
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {uploadingDelivery ? 'Completing...' : 'Complete Delivery'}
                </button>
                <button
                  onClick={() => {
                    setShowDeliveryModal(false);
                    setReceiptPhoto(null);
                  }}
                  className="btn-secondary py-3 px-6"
                  disabled={uploadingDelivery}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderCard = ({ order, onBid, isPlacingBid }) => {
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [hasBid, setHasBid] = useState(false);

  const handleBid = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Bid button clicked', { price, estimatedTime, orderId: order._id });
    
    if (!price || !estimatedTime) {
      alert('Please enter price and estimated time');
      return;
    }
    
    // Validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price');
      return;
    }
    
    const timeInMinutes = parseInt(estimatedTime);
    
    if (isNaN(timeInMinutes) || timeInMinutes <= 0) {
      alert('Please enter a valid time in minutes');
      return;
    }
    
    if (!onBid || !order || !order._id) {
      alert('Error: Unable to place bid. Please refresh the page.');
      return;
    }
    
    try {
      onBid(order._id, priceNum, timeInMinutes, '');
    } catch (error) {
      console.error('Error calling onBid:', error);
      alert('Failed to place bid. Please try again.');
    }
  };

  return (
    <div className="bg-dark-700 p-4 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-white">{order.shop?.shopName}</p>
          <p className="text-sm text-gray-400">{order.deliveryAddress}</p>
          {order.distance && (
            <p className="text-sm text-primary-400 font-semibold">
              📍 {order.distance.text || `${order.distance.value?.toFixed(1)} km`}
              {order.distance.durationText && ` • ⏱️ ${order.distance.durationText}`}
            </p>
          )}
          <p className="text-sm text-gray-400">Value: KES {order.goodsValue}</p>
          {order.isUrgent && <span className="text-xs bg-red-600 px-2 py-1 rounded">Urgent</span>}
        </div>
      </div>
      <form onSubmit={handleBid} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="KES"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-field flex-1"
            min="0"
            step="0.01"
            required
          />
          <input
            type="number"
            placeholder="Time (min)"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            className="input-field w-28"
            min="0"
            required
          />
          <button 
            type="submit"
            className="btn-primary px-4"
            disabled={!price || !estimatedTime || isPlacingBid || hasBid}
          >
            {isPlacingBid ? '⏳' : hasBid ? '✓' : 'BID'}
          </button>
        </div>
      </form>
    </div>
  );
};

const BidCard = ({ bidInfo, activeTab, onViewShop }) => {
  const { order, bid } = bidInfo;
  
  const getStatusBadge = () => {
    switch (activeTab) {
      case 'accepted':
        return <span className="text-xs bg-green-600 px-2 py-1 rounded">Accepted</span>;
      case 'rejected':
        return <span className="text-xs bg-red-600 px-2 py-1 rounded">Rejected</span>;
      case 'cancelled':
        return <span className="text-xs bg-gray-600 px-2 py-1 rounded">Cancelled</span>;
      default:
        return <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Pending</span>;
    }
  };

  return (
    <div className="bg-dark-700 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-white">Order #{order._id.slice(-6)}</p>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-gray-300">
              <strong>Shop:</strong> {order.shop?.shopName || 'Unknown Shop'}
            </p>
            {order.shop && (
              <>
                {order.shop.shopCertified ? (
                  <span className="text-xs bg-green-600 px-2 py-1 rounded">✓ Certified</span>
                ) : (
                  <span className="text-xs bg-yellow-600 px-2 py-1 rounded">⚠ Not Certified</span>
                )}
                <button
                  onClick={() => onViewShop && onViewShop(order.shop, order._id)}
                  className="text-xs text-primary-400 hover:text-primary-300 underline"
                >
                  View Shop Info
                </button>
              </>
            )}
          </div>
          <p className="text-sm text-gray-400"><strong>To:</strong> {order.deliveryAddress}</p>
          {order.distance && (
            <p className="text-sm text-primary-400">
              📍 {order.distance.text || `${order.distance.value?.toFixed(1)} km`}
            </p>
          )}
          <p className="text-sm text-gray-400"><strong>Description:</strong> {order.goodsDescription}</p>
          <p className="text-sm text-gray-400"><strong>Value:</strong> KES {order.goodsValue}</p>
          {bid.message && (
            <p className="text-sm text-gray-300 mt-2 italic">"{bid.message}"</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary-500">KES {bid.price}</p>
          <p className="text-sm text-gray-400">
            ⏱️ {bid.estimatedTime >= 60 
              ? `${(bid.estimatedTime / 60).toFixed(1)} hours` 
              : `${bid.estimatedTime} minutes`}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Bid placed: {new Date(bid.bidAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      {activeTab === 'accepted' && order.status !== 'delivered' && (
        <div className="mt-3 pt-3 border-t border-dark-600">
          <p className="text-sm text-gray-300">
            <strong>Order Status:</strong> <span className="capitalize">{order.status.replace('_', ' ')}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;

