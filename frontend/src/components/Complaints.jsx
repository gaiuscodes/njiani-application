import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Complaints = ({ onClose, userRole = 'user' }) => {
  const { user } = useAuth();
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState(userRole === 'admin' ? 'all-complaints' : 'my-complaints');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Form state
  const [complaintType, setComplaintType] = useState('other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [orderId, setOrderId] = useState('');
  const [relatedUserId, setRelatedUserId] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Admin state
  const [adminResponse, setAdminResponse] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (activeTab === 'my-complaints' || (isAdmin && activeTab === 'all-complaints')) {
      loadComplaints();
    } else if (isAdmin && activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab, statusFilter, typeFilter, isAdmin]);

  const loadStats = async () => {
    setLoadingStats(true);
    setError('');
    try {
      const response = await axios.get('/api/complaints/admin/stats');
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoadingStats(false);
    }
  };

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

  const loadComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isAdmin && activeTab === 'all-complaints'
        ? '/api/complaints/admin/all'
        : '/api/complaints/my-complaints';
      
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      
      const response = await axios.get(endpoint, { params });
      setComplaints(response.data.complaints || []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError(err.response?.data?.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/complaints', {
        complaintType,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        orderId: orderId || undefined,
        relatedUserId: relatedUserId || undefined
      });

      setSuccess('Complaint submitted successfully!');
      setSubject('');
      setDescription('');
      setOrderId('');
      setRelatedUserId('');
      setComplaintType('other');
      setPriority('medium');
      
      // Reload complaints after a short delay
      setTimeout(() => {
        loadComplaints();
        setActiveTab('my-complaints');
      }, 1500);
    } catch (err) {
      console.error('Error submitting complaint:', err);
      setError(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    if (!adminResponse.trim() && (newStatus === 'resolved' || newStatus === 'closed')) {
      setError('Please provide an admin response');
      return;
    }

    setUpdatingStatus(true);
    setError('');

    try {
      await axios.patch(`/api/complaints/${complaintId}/status`, {
        status: newStatus,
        adminResponse: adminResponse.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined
      });

      setSuccess('Complaint status updated successfully');
      setAdminResponse('');
      setAdminNotes('');
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err) {
      console.error('Error updating complaint status:', err);
      setError(err.response?.data?.message || 'Failed to update complaint status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Complaints</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 px-6 py-2 border-b border-gray-700 flex gap-4">
          {!isAdmin && (
            <button
              onClick={() => setActiveTab('my-complaints')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'my-complaints'
                  ? 'bg-gray-900 text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My Complaints
            </button>
          )}
          {!isAdmin && (
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'submit'
                  ? 'bg-gray-900 text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Submit Complaint
            </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('all-complaints')}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === 'all-complaints'
                    ? 'bg-gray-900 text-primary-500 border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All Complaints
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-gray-900 text-primary-500 border-b-2 border-primary-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Statistics
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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

          {/* Submit Complaint Form */}
          {activeTab === 'submit' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-2">Complaint Type *</label>
                <select
                  value={complaintType}
                  onChange={(e) => setComplaintType(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  required
                >
                  <option value="order">Order Related</option>
                  <option value="payment">Payment Issue</option>
                  <option value="rider">Rider Issue</option>
                  <option value="shop">Shop Issue</option>
                  <option value="technical">Technical Problem</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-white mb-2">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  placeholder="Brief description of your complaint"
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  rows="6"
                  placeholder="Please provide detailed information about your complaint..."
                  maxLength={2000}
                  required
                />
                <p className="text-gray-400 text-sm mt-1">
                  {description.length}/2000 characters
                </p>
              </div>

              <div>
                <label className="block text-white mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white mb-2">Order ID (Optional)</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    placeholder="If related to an order"
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">Related User ID (Optional)</label>
                  <input
                    type="text"
                    value={relatedUserId}
                    onChange={(e) => setRelatedUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    placeholder="If complaint is about another user"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-6 rounded transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </form>
          )}

          {/* Complaints List */}
          {(activeTab === 'my-complaints' || activeTab === 'all-complaints') && (
            <div>
              {/* Filters */}
              <div className="mb-4 flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  <option value="all">All Types</option>
                  <option value="order">Order</option>
                  <option value="payment">Payment</option>
                  <option value="rider">Rider</option>
                  <option value="shop">Shop</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading complaints...</div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No complaints found</div>
              ) : (
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <div
                      key={complaint._id}
                      className="bg-gray-800 border border-gray-700 rounded p-4 cursor-pointer hover:border-primary-500 transition-colors"
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-semibold">{complaint.subject}</h3>
                            <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(complaint.status)}`}>
                              {complaint.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(complaint.priority)}`}>
                              {complaint.priority}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{complaint.description.substring(0, 150)}...</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Type: {complaint.complaintType}</span>
                            <span>Submitted: {formatDate(complaint.createdAt)}</span>
                            {isAdmin && complaint.user && (
                              <span>User: {complaint.user.name || complaint.user.shopName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistics View (Admin Only) */}
          {activeTab === 'stats' && isAdmin && (
            <div>
              {loadingStats ? (
                <div className="text-center py-8 text-gray-400">Loading statistics...</div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-800 border border-gray-700 rounded p-4">
                      <div className="text-gray-400 text-sm">Total</div>
                      <div className="text-2xl font-bold text-white">{stats.total || 0}</div>
                    </div>
                    <div className="bg-yellow-900 border border-yellow-700 rounded p-4">
                      <div className="text-yellow-300 text-sm">Pending</div>
                      <div className="text-2xl font-bold text-white">{stats.pending || 0}</div>
                    </div>
                    <div className="bg-blue-900 border border-blue-700 rounded p-4">
                      <div className="text-blue-300 text-sm">In Progress</div>
                      <div className="text-2xl font-bold text-white">{stats.inProgress || 0}</div>
                    </div>
                    <div className="bg-green-900 border border-green-700 rounded p-4">
                      <div className="text-green-300 text-sm">Resolved</div>
                      <div className="text-2xl font-bold text-white">{stats.resolved || 0}</div>
                    </div>
                    <div className="bg-gray-700 border border-gray-600 rounded p-4">
                      <div className="text-gray-300 text-sm">Closed</div>
                      <div className="text-2xl font-bold text-white">{stats.closed || 0}</div>
                    </div>
                  </div>

                  {/* By Type */}
                  {stats.byType && stats.byType.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded p-4">
                      <h3 className="text-white font-semibold mb-3">Complaints by Type</h3>
                      <div className="space-y-2">
                        {stats.byType.map((item) => (
                          <div key={item._id} className="flex justify-between items-center">
                            <span className="text-gray-300 capitalize">{item._id || 'N/A'}</span>
                            <span className="text-white font-semibold">{item.count || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Priority */}
                  {stats.byPriority && stats.byPriority.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded p-4">
                      <h3 className="text-white font-semibold mb-3">Complaints by Priority</h3>
                      <div className="space-y-2">
                        {stats.byPriority.map((item) => (
                          <div key={item._id} className="flex justify-between items-center">
                            <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(item._id)}`}>
                              {item._id || 'N/A'}
                            </span>
                            <span className="text-white font-semibold">{item.count || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No statistics available</div>
              )}
            </div>
          )}

          {/* Complaint Detail Modal */}
          {selectedComplaint && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white">{selectedComplaint.subject}</h3>
                    <button
                      onClick={() => setSelectedComplaint(null)}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-sm">Status</label>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-3 py-1 rounded text-sm text-white ${getStatusColor(selectedComplaint.status)}`}>
                          {selectedComplaint.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded text-sm text-white ${getPriorityColor(selectedComplaint.priority)}`}>
                          {selectedComplaint.priority}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm">Type</label>
                      <p className="text-white">{selectedComplaint.complaintType}</p>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm">Description</label>
                      <p className="text-white bg-gray-800 p-3 rounded">{selectedComplaint.description}</p>
                    </div>

                    {selectedComplaint.order && (
                      <div>
                        <label className="text-gray-400 text-sm">Related Order</label>
                        <p className="text-white">Order #{selectedComplaint.order.orderNumber}</p>
                      </div>
                    )}

                    {selectedComplaint.adminResponse && (
                      <div>
                        <label className="text-gray-400 text-sm">Admin Response</label>
                        <p className="text-white bg-gray-800 p-3 rounded">{selectedComplaint.adminResponse}</p>
                      </div>
                    )}

                    <div className="text-sm text-gray-400">
                      <p>Submitted: {formatDate(selectedComplaint.createdAt)}</p>
                      {selectedComplaint.resolvedAt && (
                        <p>Resolved: {formatDate(selectedComplaint.resolvedAt)}</p>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && selectedComplaint.status !== 'closed' && (
                      <div className="border-t border-gray-700 pt-4 mt-4">
                        <h4 className="text-white font-semibold mb-3">Update Status</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-white mb-2">Admin Response *</label>
                            <textarea
                              value={adminResponse}
                              onChange={(e) => setAdminResponse(e.target.value)}
                              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                              rows="3"
                              placeholder="Response to the user..."
                            />
                          </div>
                          <div>
                            <label className="block text-white mb-2">Admin Notes (Internal)</label>
                            <textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                              rows="2"
                              placeholder="Internal notes..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusUpdate(selectedComplaint._id, 'in_progress')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                            >
                              Mark In Progress
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(selectedComplaint._id, 'resolved')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(selectedComplaint._id, 'closed')}
                              disabled={updatingStatus}
                              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded disabled:opacity-50"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Complaints;

