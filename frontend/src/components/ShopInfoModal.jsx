import { useState } from 'react';
import axios from 'axios';

const ShopInfoModal = ({ shop, orderId, onClose, onCancelBid }) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelBid = async () => {
    try {
      await axios.post(`/api/rider/bids/${orderId}/cancel`);
      if (onCancelBid) {
        onCancelBid();
      }
      onClose();
    } catch (error) {
      console.error('Error canceling bid:', error);
      alert('Failed to cancel bid');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white">Shop Information</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 text-gray-300">
          <div>
            <p className="text-sm text-gray-400">Shop Name</p>
            <p className="font-semibold text-white">{shop.shopName || 'Unknown Shop'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400">Certification Status</p>
            <div className="flex items-center gap-2 mt-1">
              {shop.shopCertified ? (
                <>
                  <span className="text-green-500">✓ Certified</span>
                  <span className="text-xs bg-green-600 px-2 py-1 rounded">Verified</span>
                </>
              ) : (
                <>
                  <span className="text-yellow-500">⚠ Not Certified</span>
                  <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Unverified</span>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400">Shop Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white font-semibold">
                {shop.shopRating?.toFixed(1) || 'N/A'} ⭐
              </span>
              {shop.shopTotalRatings > 0 && (
                <span className="text-xs text-gray-400">
                  ({shop.shopTotalRatings} {shop.shopTotalRatings === 1 ? 'rating' : 'ratings'})
                </span>
              )}
            </div>
          </div>

          {shop.shopAddress && (
            <div>
              <p className="text-sm text-gray-400">Address</p>
              <p className="text-white">{shop.shopAddress}</p>
            </div>
          )}
        </div>

        {!shop.shopCertified && (
          <div className="mt-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg">
            <p className="text-yellow-400 text-sm font-semibold mb-2">
              ⚠️ This shop is not certified
            </p>
            <p className="text-gray-300 text-xs mb-3">
              This shop has not been verified by Njiani. You can proceed with the bid or cancel it.
            </p>
            {!showCancelConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="btn-secondary text-sm flex-1"
                >
                  Cancel Bid
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary text-sm flex-1"
                >
                  Proceed Anyway
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-300 text-sm mb-3">
                  Are you sure you want to cancel this bid?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelBid}
                    className="btn-secondary text-sm flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Yes, Cancel Bid
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="btn-primary text-sm flex-1"
                  >
                    No, Keep Bid
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {shop.shopCertified && (
          <div className="mt-6">
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopInfoModal;















