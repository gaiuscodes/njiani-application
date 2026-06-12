import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AdminBids = ({ onClose }) => {
  const modalRef = useRef(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBids();
  }, [statusFilter]);

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

  const loadBids = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/bids', {
        params: { status: statusFilter }
      });
      setBids(response.data.bids || []);
    } catch (error) {
      console.error('Error loading bids:', error);
      alert('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const filteredBids = bids.filter(bid => {
    const matchesSearch = !searchTerm ||
      bid.rider?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.shop?.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.orderDetails?.deliveryAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-600',
      accepted: 'bg-green-600',
      rejected: 'bg-red-600'
    };
    return badges[status] || 'bg-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 p-6 z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">All Bids</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by rider, shop, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field flex-1"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading bids...</div>
          ) : filteredBids.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No bids found</div>
          ) : (
            <div className="space-y-4">
              {filteredBids.map((bid) => (
                <div key={bid._id} className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(bid.status)}`}>
                          {bid.status.toUpperCase()}
                        </span>
                        {bid.orderDetails?.isUrgent && (
                          <span className="bg-red-600 px-2 py-1 rounded text-xs font-semibold">URGENT</span>
                        )}
                      </div>
                      <p className="text-white font-semibold mb-1">
                        Order: {bid.orderDetails?.customerName} → {bid.orderDetails?.deliveryAddress}
                      </p>
                      <p className="text-gray-400 text-sm mb-1">
                        Shop: {bid.shop?.shopName || 'Unknown'} | Rider: {bid.rider?.name || 'Unknown'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Goods: {bid.orderDetails?.goodsDescription} | Value: KES {bid.orderDetails?.goodsValue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary-400 font-bold text-lg">KES {bid.price}</p>
                      <p className="text-gray-400 text-sm">
                        ⏱️ {bid.estimatedTime >= 60 
                          ? `${(bid.estimatedTime / 60).toFixed(1)} hours` 
                          : `${bid.estimatedTime} minutes`}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(bid.bidAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {bid.message && (
                    <div className="bg-dark-600 rounded p-3 mt-3">
                      <p className="text-gray-300 text-sm italic">"{bid.message}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBids;

