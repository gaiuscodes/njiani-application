import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Notifications from '../components/Notifications';
import EditShop from '../components/admin/EditShop';
import EditRider from '../components/admin/EditRider';
import ShopProducts from '../components/admin/ShopProducts';
import QuickPasswordReset from '../components/admin/QuickPasswordReset';
import AdminBids from '../components/admin/AdminBids';
import AdminReports from '../components/admin/AdminReports';
import AdminMessages from '../components/admin/AdminMessages';
import Inbox from '../components/Inbox';
import Complaints from '../components/Complaints';
import ChatBox from '../components/ChatBox';
import LogoutConfirm from '../components/LogoutConfirm';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [riders, setRiders] = useState([]);
  const [shops, setShops] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [showEditShop, setShowEditShop] = useState(false);
  const [showEditRider, setShowEditRider] = useState(false);
  const [showShopProducts, setShowShopProducts] = useState(false);
  const [selectedShopForProducts, setSelectedShopForProducts] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedItems, setExpandedItems] = useState({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showQuickPasswordReset, setShowQuickPasswordReset] = useState(false);
  const [passwordResetTarget, setPasswordResetTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAdminBids, setShowAdminBids] = useState(false);
  const [showAdminReports, setShowAdminReports] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [chatBoxOrderId, setChatBoxOrderId] = useState(null);
  const [showInbox, setShowInbox] = useState(false);

  useEffect(() => {
    const verifyAndLoad = async () => {
      // If no user in context, try to get from server
      if (!user) {
        try {
          const response = await axios.get('/api/auth/me');
          if (response.data.user && response.data.user.role === 'admin') {
            // User will be set by AuthContext, but we can proceed
            loadDashboard();
            return;
          }
        } catch (error) {
          navigate('/admin/login');
          return;
        }
      }
      
      if (!user || user.role !== 'admin') {
        navigate('/admin/login');
        return;
      }

      loadDashboard();
    };

    verifyAndLoad();
  }, [user]);

  const loadDashboard = async () => {
    try {
      const [statsRes, ridersRes, shopsRes, ordersRes] = await Promise.all([
        axios.get('/api/admin/dashboard'),
        axios.get('/api/admin/riders'),
        axios.get('/api/admin/shops'),
        axios.get('/api/admin/orders')
      ]);

      setStats(statsRes.data.stats || {});
      setRiders(ridersRes.data.riders || []);
      setShops(shopsRes.data.shops || []);
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      } else {
        alert('Failed to load dashboard data. Please refresh the page.');
      }
    }
  };

  const approveRider = async (riderId, action) => {
    try {
      const response = await axios.post(`/api/admin/riders/${riderId}/approve`, { action });
      alert(`Rider ${action}d successfully`);
      loadDashboard();
    } catch (error) {
      console.error('Error approving rider:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update rider status';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleShopUpdate = (updatedShop) => {
    setShops(shops.map(s => s._id === updatedShop._id ? updatedShop : s));
    loadDashboard();
  };

  const handleRiderUpdate = (updatedRider) => {
    setRiders(riders.map(r => r._id === updatedRider._id ? updatedRider : r));
    loadDashboard();
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter and sort functions
  const filteredRiders = riders.filter(rider => {
    const matchesSearch = !searchTerm || 
      rider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.phone?.includes(searchTerm) ||
      rider.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rider.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
    return 0;
  });

  const filteredShops = shops.filter(shop => {
    const matchesSearch = !searchTerm || 
      shop.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.phone?.includes(searchTerm) ||
      shop.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shop.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'name') return (a.shopName || '').localeCompare(b.shopName || '');
    return 0;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) ||
      order.deliveryAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return 0;
  });

  if (!stats) return <div className="min-h-screen bg-dark-900 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-dark-900/30 border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold text-primary-500 hover:text-primary-400 transition-colors">
              Njiani Admin
            </Link>
            <Link 
              to="/" 
              className="text-sm text-gray-400 hover:text-primary-500 transition-colors relative group flex items-center gap-2"
              onClick={(e) => {
                // Just navigate, don't log out
                // Navigation handled by Link
              }}
            >
              <span className="text-lg">🏠</span>
              <span>Home</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            {/* Interactive Back Button */}
            {activeTab !== 'dashboard' && (
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSortBy('newest');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm text-gray-400 hover:text-primary-500 transition-colors relative group flex items-center gap-2"
                title="Back to Dashboard"
              >
                <span className="text-lg transform transition-transform group-hover:-translate-x-1">←</span>
                <span>Back</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowInbox(true)}
              className="btn-secondary text-sm flex items-center gap-2"
              title="Open Inbox"
            >
              💬 Inbox
            </button>
            <Notifications />
            <button
              onClick={() => setShowAdminMessages(true)}
              className="btn-secondary text-sm"
              title="View User Messages"
            >
              📨 User Messages
            </button>
            <button
              onClick={() => setShowAdminReports(true)}
              className="btn-secondary text-sm"
              title="View Reports"
            >
              📊 Reports
            </button>
            <button
              onClick={() => setShowComplaints(true)}
              className="btn-secondary text-sm"
              title="Manage Complaints"
            >
              📝 Complaints
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              className="btn-secondary hover:bg-red-600/20 hover:border-red-500/50 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 bg-green-500/90 backdrop-blur-sm text-white px-6 py-4 rounded-lg shadow-2xl animate-slide-in-right">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <p>{successMessage}</p>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-4 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-dark-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2 px-4 ${activeTab === 'dashboard' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-400'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('riders')}
            className={`pb-2 px-4 ${activeTab === 'riders' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-400'}`}
          >
            Riders
          </button>
          <button
            onClick={() => setActiveTab('shops')}
            className={`pb-2 px-4 ${activeTab === 'shops' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-400'}`}
          >
            Shops
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2 px-4 ${activeTab === 'orders' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-400'}`}
          >
            Orders
          </button>
          <button
            onClick={() => setShowAdminBids(true)}
            className="pb-2 px-4 text-gray-400 hover:text-primary-500"
          >
            Bids
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="card hover:border-primary-500/50 transition-all cursor-pointer group" onClick={() => setActiveTab('riders')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Riders</p>
                    <p className="text-3xl font-bold text-white group-hover:text-primary-400 transition-colors">{stats.totalRiders}</p>
                    <p className="text-sm text-gray-500 mt-1">{stats.approvedRiders} approved</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-500 hover:text-primary-400">
                    View →
                  </button>
                </div>
              </div>
              <div className="card hover:border-yellow-500/50 transition-all cursor-pointer group" onClick={() => { setActiveTab('riders'); setStatusFilter('pending'); }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Pending Approvals</p>
                    <p className="text-3xl font-bold text-yellow-500 group-hover:text-yellow-400 transition-colors">{stats.pendingRiders}</p>
                    {stats.pendingRiders > 0 && (
                      <p className="text-xs text-yellow-400 mt-1">Click to review</p>
                    )}
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-500 hover:text-yellow-400">
                    Review →
                  </button>
                </div>
              </div>
              <div className="card hover:border-primary-500/50 transition-all cursor-pointer group" onClick={() => setActiveTab('shops')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Shops</p>
                    <p className="text-3xl font-bold text-white group-hover:text-primary-400 transition-colors">{stats.totalShops}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-500 hover:text-primary-400">
                    View →
                  </button>
                </div>
              </div>
              <div className="card hover:border-green-500/50 transition-all">
                <p className="text-gray-400 text-sm mb-1">Platform Earnings</p>
                <p className="text-3xl font-bold text-primary-500">KES {stats.platformBalance.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Total revenue</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="card hover:border-primary-500/50 transition-all cursor-pointer group" onClick={() => setActiveTab('orders')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-white group-hover:text-primary-400 transition-colors">{stats.totalOrders}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-500 hover:text-primary-400">
                    View →
                  </button>
                </div>
              </div>
              <div className="card hover:border-blue-500/50 transition-all cursor-pointer group" onClick={() => { setActiveTab('orders'); setStatusFilter('in_transit'); }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Active Deliveries</p>
                    <p className="text-3xl font-bold text-blue-500 group-hover:text-blue-400 transition-colors">{stats.activeOrders}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-400">
                    Track →
                  </button>
                </div>
              </div>
              <div className="card hover:border-green-500/50 transition-all">
                <p className="text-gray-400 text-sm mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-500">{stats.completedOrders}</p>
                <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Top Riders</h2>
                <button
                  onClick={() => setActiveTab('riders')}
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {stats.topRiders?.length > 0 ? (
                  stats.topRiders.map((rider, idx) => (
                    <div 
                      key={rider._id} 
                      className="bg-dark-700 p-4 rounded-lg flex justify-between items-center hover:bg-dark-600 transition-colors cursor-pointer group"
                      onClick={() => {
                        const fullRider = riders.find(r => r._id === rider._id);
                        if (fullRider) {
                          setSelectedRider(fullRider);
                          setShowEditRider(true);
                        } else {
                          setActiveTab('riders');
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">#{idx + 1} {rider.name}</p>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-500 text-xs">
                            Edit
                          </button>
                        </div>
                        <p className="text-sm text-gray-400">
                          {rider.totalDeliveries} deliveries • ⭐ {rider.rating?.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                      <p className="text-primary-500 font-bold">KES {rider.totalEarnings?.toFixed(2) || '0.00'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No riders yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Riders Tab */}
        {activeTab === 'riders' && (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-white">All Riders ({filteredRiders.length})</h2>
              
              {/* Search and Filters */}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search riders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field flex-1 min-w-[200px]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={loadDashboard}
                  className="btn-secondary text-sm"
                  title="Refresh"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Pending Riders Alert */}
            {stats.pendingRiders > 0 && statusFilter === 'all' && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-400 font-semibold">⚠️ {stats.pendingRiders} Rider(s) Awaiting Approval</p>
                    <p className="text-sm text-gray-300 mt-1">Click "Approve" or "Reject" to review pending applications</p>
                  </div>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className="btn-primary text-sm"
                  >
                    Review Now
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {filteredRiders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No riders found</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-primary-400 hover:text-primary-300 text-sm mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredRiders.map((rider) => {
                  const isExpanded = expandedItems[rider._id];
                  return (
                    <div key={rider._id} className="bg-dark-700 p-4 rounded-lg hover:bg-dark-600 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {rider.selfiePhoto && (
                              <img src={rider.selfiePhoto} alt={rider.name} className="w-12 h-12 object-cover rounded-full border-2 border-primary-500/50" />
                            )}
                            <div>
                              <p className="font-semibold text-white">{rider.name}</p>
                              <p className="text-sm text-gray-400">Phone: {rider.phone}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            {rider.email && <p className="text-gray-400">📧 {rider.email}</p>}
                            <p className="text-gray-400">🏍️ {rider.vehicleType}</p>
                            <p className="text-gray-400">🆔 {rider.nationalId || 'N/A'}</p>
                            <p className="text-gray-400">
                              Status: <span className={`px-2 py-1 rounded text-xs ${
                                rider.status === 'approved' || rider.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                rider.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>{rider.status}</span>
                            </p>
                            {rider.rating > 0 && (
                              <p className="text-gray-400">⭐ {rider.rating.toFixed(1)} rating</p>
                            )}
                            {rider.totalDeliveries > 0 && (
                              <p className="text-gray-400">📦 {rider.totalDeliveries} deliveries</p>
                            )}
                            {rider.totalEarnings > 0 && (
                              <p className="text-gray-400">💰 KES {rider.totalEarnings?.toFixed(2)}</p>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-dark-600 space-y-3">
                              {rider.preferredAreas && rider.preferredAreas.length > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Preferred Areas:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {rider.preferredAreas.map((area, idx) => (
                                      <span key={idx} className="bg-dark-800 text-gray-300 text-xs px-2 py-1 rounded">
                                        {area}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-400">
                                <p>Created: {new Date(rider.createdAt).toLocaleDateString()}</p>
                                {rider.lastLogin && <p>Last Login: {new Date(rider.lastLogin).toLocaleDateString()}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => toggleExpand(rider._id)}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            {isExpanded ? '▲ Less' : '▼ More'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRider(rider);
                              setShowEditRider(true);
                            }}
                            className="btn-secondary text-sm"
                            title="Edit Rider"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              setPasswordResetTarget({
                                userId: rider._id,
                                userName: rider.name,
                                userType: 'rider'
                              });
                              setShowQuickPasswordReset(true);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                            title="Quick Password Reset"
                          >
                            🔑 Reset Password
                          </button>
                          {rider.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Approve ${rider.name}?`)) {
                                    approveRider(rider._id, 'approve');
                                  }
                                }}
                                className="btn-primary text-sm"
                              >
                                ✅ Approve
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Reject ${rider.name}? This action cannot be undone.`)) {
                                    approveRider(rider._id, 'reject');
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                              >
                                ❌ Reject
                              </button>
                            </>
                          )}
                          {rider.status !== 'pending' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Change ${rider.name}'s status?`)) {
                                  setSelectedRider(rider);
                                  setShowEditRider(true);
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Change Status
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Photos */}
                      {(rider.selfiePhoto || rider.idPhoto || rider.licensePhoto) && (
                        <div className="mt-3 pt-3 border-t border-dark-600">
                          <p className="text-xs text-gray-500 mb-2">Documents:</p>
                          <div className="flex gap-2">
                            {rider.selfiePhoto && (
                              <div className="relative group">
                                <img src={rider.selfiePhoto} alt="Selfie" className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                  <span className="text-white text-xs">Selfie</span>
                                </div>
                              </div>
                            )}
                            {rider.idPhoto && (
                              <div className="relative group">
                                <img src={rider.idPhoto} alt="ID" className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                  <span className="text-white text-xs">ID Card</span>
                                </div>
                              </div>
                            )}
                            {rider.licensePhoto && (
                              <div className="relative group">
                                <img src={rider.licensePhoto} alt="License" className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                  <span className="text-white text-xs">License</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Shops Tab */}
        {activeTab === 'shops' && (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-white">All Shops ({filteredShops.length})</h2>
              
              {/* Search and Filters */}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search shops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field flex-1 min-w-[200px]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="approved">Approved</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                </select>
                <button
                  onClick={loadDashboard}
                  className="btn-secondary text-sm"
                  title="Refresh"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredShops.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No shops found</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-primary-400 hover:text-primary-300 text-sm mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredShops.map((shop) => {
                  const isExpanded = expandedItems[shop._id];
                  return (
                    <div key={shop._id} className="bg-dark-700 p-4 rounded-lg hover:bg-dark-600 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {shop.shopLogo && (
                              <img src={shop.shopLogo} alt={shop.shopName} className="w-16 h-16 object-cover rounded-lg border-2 border-primary-500/50" />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-white">{shop.shopName}</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mt-2">
                                <p className="text-gray-400">📱 {shop.phone}</p>
                                {shop.email && <p className="text-gray-400">📧 {shop.email}</p>}
                                <p className="text-gray-400">
                                  Status: <span className={`px-2 py-1 rounded text-xs ${
                                    shop.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                    shop.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>{shop.status}</span>
                                </p>
                                <p className="text-gray-400">
                                  Email: {shop.emailVerified ? '✅ Verified' : '❌ Not Verified'}
                                </p>
                                {shop.shopRating > 0 && (
                                  <p className="text-gray-400">⭐ {shop.shopRating.toFixed(1)} ({shop.shopTotalRatings} reviews)</p>
                                )}
                              </div>
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-dark-600">
                                  <p className="text-sm text-gray-400">📍 {shop.shopAddress}</p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Created: {new Date(shop.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => toggleExpand(shop._id)}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            {isExpanded ? '▲ Less' : '▼ More'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedShop(shop);
                              setShowEditShop(true);
                            }}
                            className="btn-secondary text-sm"
                            title="Edit Shop"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              setPasswordResetTarget({
                                userId: shop._id,
                                userName: shop.shopName,
                                userType: 'shop'
                              });
                              setShowQuickPasswordReset(true);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                            title="Quick Password Reset"
                          >
                            🔑 Reset Password
                          </button>
                          <button
                            onClick={() => {
                              setSelectedShopForProducts(shop);
                              setShowShopProducts(true);
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm"
                            title="View Products"
                          >
                            📦 Products
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-white">All Orders ({filteredOrders.length})</h2>
              
              {/* Search and Filters */}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field flex-1 min-w-[200px]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="bidding">Bidding</option>
                  <option value="accepted">Accepted</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <button
                  onClick={loadDashboard}
                  className="btn-secondary text-sm"
                  title="Refresh"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No orders found</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-primary-400 hover:text-primary-300 text-sm mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    onStatusUpdate={loadDashboard}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Toolbar */}
      {activeTab !== 'dashboard' && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="bg-dark-800 rounded-lg shadow-2xl p-4 border border-primary-500/20">
            <p className="text-xs text-gray-400 mb-2">Quick Actions</p>
            <div className="flex flex-col gap-2">
              {activeTab === 'riders' && stats.pendingRiders > 0 && (
                <button
                  onClick={() => {
                    setStatusFilter('pending');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-2 rounded text-sm flex items-center gap-2"
                >
                  ⚠️ {stats.pendingRiders} Pending
                </button>
              )}
              <button
                onClick={loadDashboard}
                className="bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 px-3 py-2 rounded text-sm"
                title="Refresh Data"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSortBy('newest');
                }}
                className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-3 py-2 rounded text-sm"
                title="Clear Filters"
              >
                🗑️ Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modals */}
      {showEditShop && selectedShop && (
        <EditShop
          shop={selectedShop}
          onClose={() => {
            setShowEditShop(false);
            setSelectedShop(null);
          }}
          onUpdate={handleShopUpdate}
        />
      )}

      {showEditRider && selectedRider && (
        <EditRider
          rider={selectedRider}
          onClose={() => {
            setShowEditRider(false);
            setSelectedRider(null);
          }}
          onUpdate={handleRiderUpdate}
        />
      )}

      {showShopProducts && selectedShopForProducts && (
        <ShopProducts
          shopId={selectedShopForProducts._id}
          shopName={selectedShopForProducts.shopName}
          onClose={() => {
            setShowShopProducts(false);
            setSelectedShopForProducts(null);
          }}
        />
      )}

      {/* Quick Password Reset Modal */}
      {showQuickPasswordReset && passwordResetTarget && (
        <QuickPasswordReset
          userId={passwordResetTarget.userId}
          userName={passwordResetTarget.userName}
          userType={passwordResetTarget.userType}
          onClose={() => {
            setShowQuickPasswordReset(false);
            setPasswordResetTarget(null);
          }}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 5000);
          }}
        />
      )}

      {/* Admin Bids Modal */}
      {showAdminBids && (
        <AdminBids onClose={() => setShowAdminBids(false)} />
      )}

      {/* Admin Reports Modal */}
      {showAdminReports && (
        <AdminReports onClose={() => setShowAdminReports(false)} />
      )}

      {/* Admin Messages Modal */}
      {showAdminMessages && (
        <AdminMessages onClose={() => setShowAdminMessages(false)} />
      )}

      {/* Complaints Modal */}
      {showComplaints && (
        <Complaints onClose={() => setShowComplaints(false)} userRole="admin" />
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <Inbox onClose={() => setShowInbox(false)} />
      )}

      {/* Persistent ChatBox for Admin - View all active order conversations */}
      <ChatBox 
        orders={orders.filter(order => 
          order.rider && ['accepted', 'picked_up', 'in_transit'].includes(order.status)
        )} 
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
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onStatusUpdate }) => {
  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async () => {
    if (newStatus === order.status) {
      setShowStatusEdit(false);
      return;
    }

    setLoading(true);
    try {
      await axios.put(`/api/admin/orders/${order._id}/status`, { status: newStatus });
      setShowStatusEdit(false);
      onStatusUpdate();
    } catch (error) {
      alert('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-700 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-semibold text-white">Order #{order._id.slice(-6)}</p>
          <p className="text-sm text-gray-400">Shop: {order.shop?.shopName}</p>
          <p className="text-sm text-gray-400">Customer: {order.customerName} ({order.customerPhone})</p>
          <p className="text-sm text-gray-400">To: {order.deliveryAddress}</p>
          {order.rider && (
            <p className="text-sm text-gray-400">Rider: {order.rider?.name}</p>
          )}
          <p className="text-sm text-gray-400">Category: {order.category} {order.isUrgent && <span className="text-red-400">🚨 URGENT</span>}</p>
          {showStatusEdit ? (
            <div className="mt-2 flex items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="input-field text-sm"
              >
                <option value="pending">Pending</option>
                <option value="bidding">Bidding</option>
                <option value="accepted">Accepted</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={loading}
                className="btn-primary text-xs px-3 py-1"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowStatusEdit(false);
                  setNewStatus(order.status);
                }}
                className="btn-secondary text-xs px-3 py-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                order.status === 'delivered' ? 'bg-green-600' :
                order.status === 'in_transit' ? 'bg-blue-600' :
                order.status === 'bidding' ? 'bg-yellow-600' :
                order.status === 'accepted' ? 'bg-purple-600' :
                order.status === 'picked_up' ? 'bg-indigo-600' :
                order.status === 'cancelled' ? 'bg-red-600' :
                'bg-gray-600'
              }`}>
                {order.status}
              </span>
              <button
                onClick={() => setShowStatusEdit(true)}
                className="text-primary-500 hover:text-primary-400 text-xs"
                title="Edit Status"
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
        <div className="text-right ml-4">
          <p className="text-sm text-gray-400">Value: KES {order.goodsValue}</p>
          {order.deliveryFee > 0 && (
            <p className="text-sm text-gray-400">Fee: KES {order.deliveryFee}</p>
          )}
          {order.distance && (
            <p className="text-sm text-gray-400">Distance: {order.distance.text}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

