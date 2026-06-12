import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BidChat = ({ orderId, bidIndex, bid, onClose, onBidAccepted, onBidRejected }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [riderInfo, setRiderInfo] = useState(null);
  const [action, setAction] = useState('message'); // 'message', 'bargain', 'accept', 'reject'
  const [bargainPrice, setBargainPrice] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadBidDetails();
    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [orderId, bidIndex]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadBidDetails = async () => {
    try {
      const response = await axios.get(`/api/shop/orders/${orderId}`);
      const order = response.data.order;
      const currentBid = order.bids[bidIndex];
      
      if (currentBid) {
        setMessages(currentBid.communicationHistory || []);
        setRiderInfo(currentBid.rider);
      }
    } catch (error) {
      console.error('Error loading bid details:', error);
    }
  };

  const initializeSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { withCredentials: true });
    
    socket.on('connect', () => {
      socket.emit('join_user', JSON.parse(localStorage.getItem('user'))?._id);
    });

    socket.on('bid_message', (data) => {
      if (data.orderId === orderId) {
        loadBidDetails();
      }
    });

    socketRef.current = socket;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (providedPin = null) => {
    if (!newMessage.trim() && action === 'message') return;
    if (action === 'bargain' && !bargainPrice) {
      alert('Please enter a bargain price');
      return;
    }

    // If accepting and no PIN provided, show PIN modal
    if (action === 'accept' && !providedPin) {
      setShowPinModal(true);
      return;
    }

    try {
      let messageText = newMessage;
      if (action === 'bargain') {
        messageText = `I'd like to negotiate the price to KES ${bargainPrice}. ${newMessage || ''}`;
      } else if (action === 'accept') {
        messageText = newMessage || 'I accept your offer!';
      } else if (action === 'reject') {
        messageText = newMessage || 'Thank you for your bid, but I will go with another rider.';
      }

      await axios.post(`/api/shop/orders/${orderId}/bids/${bidIndex}/message`, {
        message: messageText,
        action: action,
        pin: action === 'accept' ? providedPin : undefined
      });

      setNewMessage('');
      setBargainPrice('');
      setAction('message');
      setShowPinModal(false);
      setPin('');
      loadBidDetails();

      if (action === 'accept' && onBidAccepted) {
        onBidAccepted();
      } else if (action === 'reject' && onBidRejected) {
        onBidRejected();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error.response?.data?.message || 'Failed to send message';
      alert(errorMsg);
      
      // If PIN error, keep modal open
      if (errorMsg.includes('PIN')) {
        setPin('');
      } else {
        setShowPinModal(false);
        setPin('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Bid Chat</h3>
            {riderInfo && (
              <div className="mt-2 text-sm text-gray-300">
                <p><strong>Rider:</strong> {riderInfo.name}</p>
                <p><strong>Rating:</strong> {riderInfo.rating?.toFixed(1) || 'N/A'} ⭐</p>
                <p><strong>Deliveries:</strong> {riderInfo.totalDeliveries || 0}</p>
                <p><strong>Vehicle:</strong> {riderInfo.vehicleType}</p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center">No messages yet</p>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender?.role === 'rider' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender?.role === 'rider'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold mb-1">
                    {msg.sender?.name || msg.sender?.shopName || 'Unknown'}
                  </p>
                  <p>{msg.message}</p>
                  {msg.action === 'bargain' && (
                    <span className="text-xs bg-yellow-600 px-2 py-1 rounded mt-1 inline-block">
                      💰 Bargain
                    </span>
                  )}
                  {msg.action === 'accept' && (
                    <span className="text-xs bg-green-600 px-2 py-1 rounded mt-1 inline-block">
                      ✓ Accepted
                    </span>
                  )}
                  {msg.action === 'reject' && (
                    <span className="text-xs bg-red-600 px-2 py-1 rounded mt-1 inline-block">
                      ✗ Rejected
                    </span>
                  )}
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-dark-700">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setAction('message')}
              className={`px-3 py-1 rounded text-sm ${
                action === 'message'
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-gray-300'
              }`}
            >
              Message
            </button>
            <button
              onClick={() => setAction('bargain')}
              className={`px-3 py-1 rounded text-sm ${
                action === 'bargain'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-dark-700 text-gray-300'
              }`}
            >
              Bargain
            </button>
            <button
              onClick={() => setAction('accept')}
              className={`px-3 py-1 rounded text-sm ${
                action === 'accept'
                  ? 'bg-green-600 text-white'
                  : 'bg-dark-700 text-gray-300'
              }`}
            >
              Accept Offer
            </button>
            <button
              onClick={() => setAction('reject')}
              className={`px-3 py-1 rounded text-sm ${
                action === 'reject'
                  ? 'bg-red-600 text-white'
                  : 'bg-dark-700 text-gray-300'
              }`}
            >
              Reject
            </button>
          </div>

          {action === 'bargain' && (
            <input
              type="number"
              placeholder="New price (KES)"
              value={bargainPrice}
              onChange={(e) => setBargainPrice(e.target.value)}
              className="input-field mb-2"
            />
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder={action === 'accept' ? 'Optional message...' : action === 'reject' ? 'Optional message...' : 'Type a message...'}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="input-field flex-1"
            />
            <button onClick={sendMessage} className="btn-primary">
              Send
            </button>
          </div>
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Enter Transaction PIN</h3>
            <p className="text-gray-300 mb-4">Please enter your 4-digit transaction PIN to accept this bid.</p>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="input-field w-full mb-4 text-center text-2xl tracking-widest"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && pin.length === 4) {
                  sendMessage(pin);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                  setAction('message');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pin.length === 4) {
                    sendMessage(pin);
                  } else {
                    alert('Please enter a valid 4-digit PIN');
                  }
                }}
                disabled={pin.length !== 4}
                className="btn-primary flex-1"
              >
                Verify & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BidChat;















