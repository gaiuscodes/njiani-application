import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const ChatBox = ({ orders = [], initialOrderId = null, onOrderSelected }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBidIndex, setSelectedBidIndex] = useState(null); // For bidding conversations
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [action, setAction] = useState('message'); // For bid chat: 'message', 'bargain', 'accept', 'reject'
  const [bargainPrice, setBargainPrice] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [attachments, setAttachments] = useState([]); // Array of { file, preview }
  const [uploading, setUploading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Filter orders that can have messages:
  // 1. Orders with riders (accepted, picked_up, in_transit)
  // 2. Orders in bidding status with bids
  const activeOrders = orders.filter(order => {
    if (!order) return false;
    
    // Orders with assigned riders
    if (['accepted', 'picked_up', 'in_transit'].includes(order.status) && order.rider) {
      return true;
    }
    
    // Orders in bidding status with bids
    if (order.status === 'bidding' && order.bids && order.bids.length > 0) {
      return true;
    }
    
    return false;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async (orderId, bidIndex = null) => {
    if (!orderId) return;
    
    try {
      // If it's a bidding conversation, load bid communication history
      if (bidIndex !== null) {
        const response = await axios.get(`/api/shop/orders/${orderId}`);
        const order = response.data.order;
        if (order.bids && order.bids[bidIndex]) {
          const bid = order.bids[bidIndex];
          
          // Start with the initial bid message if it exists
          const initialMessages = [];
          if (bid.message && bid.message.trim()) {
            initialMessages.push({
              _id: `bid_${bidIndex}_initial`,
              message: bid.message,
              sender: bid.rider,
              createdAt: bid.bidAt || new Date(),
              action: 'message',
              isInitialBid: true
            });
          }
          
          // Convert communication history to message format
          const historyMessages = (bid.communicationHistory || [])
            .map(msg => ({
              _id: `bid_${bidIndex}_${msg.timestamp}`,
              message: msg.message,
              sender: msg.sender,
              createdAt: msg.timestamp,
              action: msg.action,
              attachments: msg.attachments || []
            }));
          
          // Combine and sort chronologically
          const allMessages = [...initialMessages, ...historyMessages]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          
          setMessages(allMessages);
        } else {
          setMessages([]);
        }
      } else {
        // Regular order messages - API already sorts by createdAt ascending
        try {
          const response = await axios.get(`/api/messages/order/${orderId}`);
          const sortedMessages = (response.data.messages || []).sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
          setMessages(sortedMessages);
          console.log(`Loaded ${sortedMessages.length} messages for order ${orderId}`);
        } catch (error) {
          console.error('Error loading messages:', error);
          // If error is about messaging not available, show empty messages
          if (error.response?.status === 400) {
            console.log('Messaging not available for this order status');
            setMessages([]);
          } else {
            throw error;
          }
        }
        
        // Determine the other user (receiver or sender)
        if (sortedMessages.length > 0) {
          const firstMessage = sortedMessages[0];
          const isSender = firstMessage.sender?._id === user?._id || firstMessage.sender?._id === user?.id;
          setOtherUser(isSender ? firstMessage.receiver : firstMessage.sender);
        } else if (selectedOrder) {
          // If no messages yet, determine from order
          if (user?.role === 'shop' && selectedOrder.rider) {
            setOtherUser(selectedOrder.rider);
          } else if (user?.role === 'rider' && selectedOrder.shop) {
            setOtherUser(selectedOrder.shop);
          } else if (user?.role === 'admin') {
            // Admin can see both
            setOtherUser(selectedOrder.rider || selectedOrder.shop);
          }
        }
        
        // Mark messages as read
        await axios.put(`/api/messages/order/${orderId}/read`);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (initialOrderId) {
      const order = activeOrders.find(o => o && o._id === initialOrderId);
      if (order) {
        setSelectedOrderId(initialOrderId);
        setSelectedOrder(order);
        // If it's a bidding order, select first bid
        if (order.status === 'bidding' && order.bids && order.bids.length > 0) {
          setSelectedBidIndex(0);
        } else {
          setSelectedBidIndex(null);
        }
        setIsOpen(true);
        setIsMinimized(false);
      }
    } else if (isOpen && activeOrders.length > 0 && !selectedOrderId) {
      // Auto-select first active order
      const firstOrder = activeOrders[0];
      if (firstOrder) {
        setSelectedOrderId(firstOrder._id);
        setSelectedOrder(firstOrder);
        // If it's a bidding order, select first bid
        if (firstOrder.status === 'bidding' && firstOrder.bids && firstOrder.bids.length > 0) {
          setSelectedBidIndex(0);
        } else {
          setSelectedBidIndex(null);
        }
      }
    }
  }, [isOpen, activeOrders.length, initialOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedOrderId, selectedBidIndex);

    // Initialize socket
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      console.log('Joining rooms...');
      
      // Join order room first
      if (selectedOrderId) {
        const orderIdStr = selectedOrderId.toString();
        newSocket.emit('join_order', orderIdStr);
        console.log(`📦 Joined order room: order_${orderIdStr}`);
      }
      
      // Join user room - ensure userId is a string
      const userId = user?._id || user?.id;
      if (userId) {
        const userIdStr = userId.toString();
        newSocket.emit('join_user', userIdStr);
        console.log(`👤 Joined user room: user_${userIdStr}`);
      } else {
        console.warn('⚠️ No user ID available to join user room');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for regular order messages
    newSocket.on('new_message', (data) => {
      console.log('📨 Received socket event new_message:', data);
      
      if (!data || !data.message) {
        console.warn('⚠️ Socket message data is invalid:', data);
        return;
      }
      
      const message = data.message;
      // Check if message belongs to current order
      const messageOrderId = message.order?._id || message.order?.toString() || message.order;
      const currentOrderId = selectedOrderId?.toString();
      
      console.log(`Comparing order IDs: messageOrderId="${messageOrderId}", currentOrderId="${currentOrderId}", selectedBidIndex=${selectedBidIndex}`);
      
      if (messageOrderId && currentOrderId && messageOrderId.toString() === currentOrderId.toString() && selectedBidIndex === null) {
        console.log('✅ Message matches current order, adding to messages:', message);
        
        // Check if message already exists (to avoid duplicates)
        setMessages(prev => {
          const exists = prev.some(m => {
            if (m._id === message._id) return true;
            // Check for optimistic message match
            if (m.isOptimistic && message.message && m.message === message.message) {
              const timeDiff = Math.abs(new Date(m.createdAt) - new Date(message.createdAt));
              if (timeDiff < 2000) return true; // Within 2 seconds
            }
            return false;
          });
          
          if (exists) {
            // Replace optimistic message with real one
            return prev.map(m => {
              if (m.isOptimistic && message.message && m.message === message.message) {
                const timeDiff = Math.abs(new Date(m.createdAt) - new Date(message.createdAt));
                if (timeDiff < 2000) {
                  return message; // Replace optimistic with real
                }
              }
              if (m._id === message._id) {
                return message; // Update existing
              }
              return m;
            }).sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
          }
          
          // Add new message and maintain chronological order
          const updated = [...prev, message];
          return updated.sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
        });
        setTimeout(scrollToBottom, 100);
      }
    });

    // Listen for bid messages
    newSocket.on('bid_message', (data) => {
      if (data.orderId === selectedOrderId && selectedBidIndex !== null) {
        // Reload messages to get updated history
        loadMessages(selectedOrderId, selectedBidIndex);
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedOrderId, selectedBidIndex, loadMessages, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const remainingSlots = 5 - attachments.length;
    const filesToAdd = files.slice(0, remainingSlots);

    filesToAdd.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (e, providedPin = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedOrderId) return;
    
    // For bidding conversations
    if (selectedBidIndex !== null) {
      if (!newMessage.trim() && action === 'message' && attachments.length === 0) return;
      if (action === 'bargain' && !bargainPrice) {
        alert('Please enter a bargain price');
        return;
      }

      // If accepting and no PIN provided, show PIN modal
      if (action === 'accept' && !providedPin) {
        setShowPinModal(true);
        return;
      }

      setLoading(true);
      try {
        let messageText = newMessage;
        if (action === 'bargain') {
          messageText = `I'd like to negotiate the price to KES ${bargainPrice}. ${newMessage || ''}`;
        } else if (action === 'accept') {
          messageText = newMessage || 'I accept your offer!';
        } else if (action === 'reject') {
          messageText = newMessage || 'Thank you for your bid, but I will go with another rider.';
        }

        // Only shops can send bid messages
        if (user?.role === 'shop') {
          // Prepare form data for attachments
          const formData = new FormData();
          formData.append('message', messageText);
          formData.append('action', action);
          if (action === 'accept' && providedPin) {
            formData.append('pin', providedPin);
          }
          attachments.forEach((attachment) => {
            formData.append('attachments', attachment.file);
          });

          await axios.post(`/api/shop/orders/${selectedOrderId}/bids/${selectedBidIndex}/message`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          throw new Error('Only shops can send bid messages');
        }

        // Clear attachments after sending
        setAttachments([]);

        // Reload messages to get the updated history from server
        loadMessages(selectedOrderId, selectedBidIndex);
        
        // If bid was accepted, show success message
        if (action === 'accept') {
          const notification = document.createElement('div');
          notification.className = 'fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all';
          notification.textContent = '✅ Bid accepted successfully!';
          document.body.appendChild(notification);
          setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 3000);
          }, 3000);
        }
      } catch (error) {
        console.error('Error sending bid message:', error);
        const errorMsg = error.response?.data?.message || 'Failed to send message';
        alert(errorMsg);
        
        // If PIN error, keep modal open
        if (errorMsg.includes('PIN')) {
          setPin('');
        } else {
          setShowPinModal(false);
          setPin('');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Regular order messages
      if (!newMessage.trim()) return;

      const messageText = newMessage.trim();
      setLoading(true);
      
      // Optimistically add message to state immediately
      const tempMessage = {
        _id: `temp_${Date.now()}`,
        message: messageText,
        sender: user,
        createdAt: new Date(),
        isOptimistic: true
      };
      setMessages(prev => {
        const updated = [...prev, tempMessage];
        return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
      
      try {
        // For bidding orders, shops must use bid chat
        if (selectedBidIndex === null && selectedOrder?.status === 'bidding' && user?.role === 'shop') {
          alert('⚠️ Please select a rider from the bid list above to start chatting. Use bid chat to communicate during bidding.');
          setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
          setNewMessage(messageText);
          setLoading(false);
          return;
        }

        // Check if order has required participants
        const order = selectedOrder;
        if (!order) {
          console.error('Order not found when trying to send message');
          alert('⚠️ Order not found. Please refresh and try again.');
          setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
          setNewMessage(messageText);
          setLoading(false);
          return;
        }

        console.log('Sending message for order:', {
          orderId: order._id,
          status: order.status,
          hasRider: !!order.rider,
          riderId: order.rider?._id || order.rider,
          userRole: user?.role,
          selectedBidIndex
        });

        // For active orders (not bidding), ensure rider is assigned
        if (order.status !== 'bidding' && !order.rider && user?.role === 'shop') {
          alert('⚠️ This order does not have a rider assigned yet. Please wait for a rider to accept the order.');
          setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
          setNewMessage(messageText);
          setLoading(false);
          return;
        }

        // Check if user is messaging themselves
        let receiverId;
        if (user?.role === 'shop' && order?.rider) {
          receiverId = order.rider._id || order.rider;
        } else if (user?.role === 'rider' && order?.shop) {
          receiverId = order.shop._id || order.shop;
        } else if (user?.role === 'admin') {
          receiverId = order?.rider?._id || order?.shop?._id;
        }
        
        if (!receiverId) {
          alert('⚠️ Cannot determine message recipient. Please refresh and try again.');
          setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
          setNewMessage(messageText);
          setLoading(false);
          return;
        }
        
        if (receiverId && (receiverId.toString() === user?._id?.toString() || receiverId.toString() === user?.id?.toString())) {
          alert('⚠️ You cannot message yourself!');
          setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
          setNewMessage(messageText);
          setLoading(false);
          return;
        }

        // Validate: need message text or attachments
        if (!messageText.trim() && attachments.length === 0) {
          alert('Please enter a message or attach an image');
          setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
          setNewMessage(messageText);
          setLoading(false);
          return;
        }
        
        // Prepare form data for attachments
        const formData = new FormData();
        if (messageText.trim()) {
          formData.append('message', messageText);
        }
        attachments.forEach((attachment) => {
          formData.append('attachments', attachment.file);
        });
        
        const response = await axios.post(`/api/messages/order/${selectedOrderId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        console.log('Message API response:', response.data);

        // Clear attachments after sending
        setAttachments([]);
        
        // Replace optimistic message with real one from server
        if (response.data && response.data.message) {
          const serverMessage = response.data.message;
          console.log('Message sent successfully:', serverMessage);
          
          setMessages(prev => {
            // Remove optimistic message
            const filtered = prev.filter(m => m._id !== tempMessage._id);
            // Check if message already exists (from socket)
            const exists = filtered.some(m => {
              if (m._id && serverMessage._id) {
                return m._id.toString() === serverMessage._id.toString();
              }
              return false;
            });
            if (!exists) {
              const updated = [...filtered, serverMessage];
              return updated.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.timestamp || 0);
                const dateB = new Date(b.createdAt || b.timestamp || 0);
                return dateA - dateB;
              });
            }
            return filtered.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.timestamp || 0);
              const dateB = new Date(b.createdAt || b.timestamp || 0);
              return dateA - dateB;
            });
          });
          setTimeout(scrollToBottom, 100);
        } else {
          // If no message in response, reload all messages after a short delay
          console.log('No message in response, reloading...');
          setTimeout(() => {
            loadMessages(selectedOrderId, null);
          }, 500);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
        setNewMessage(messageText); // Restore message text
        // Don't clear attachments on error so user can retry
        const errorMsg = error.response?.data?.message || error.message || 'Failed to send message';
        console.error('Full error:', error);
        alert(`❌ ${errorMsg}\n\nTroubleshooting:\n- Ensure order status is "accepted", "picked_up", or "in_transit"\n- Ensure order has a rider assigned\n- Check browser console for details`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOrderSelect = (order) => {
    if (!order || !order._id) return;
    const orderId = order._id;
    setSelectedOrderId(orderId);
    setSelectedOrder(order);
    setMessages([]);
    
    // If it's a bidding order, select first bid by default
    if (order.status === 'bidding' && order.bids && order.bids.length > 0) {
      setSelectedBidIndex(0);
    } else {
      setSelectedBidIndex(null);
    }
    
    if (onOrderSelected) {
      onOrderSelected(orderId);
    }
  };

  // Always show the chat button, even if there are no active orders
  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg z-40 flex items-center gap-2 transition-all"
        title="Open Messages"
      >
        <span className="text-2xl">💬</span>
        {activeOrders.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {activeOrders.length}
          </span>
        )}
      </button>

      {/* Chat Box */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 bg-dark-800 rounded-xl shadow-2xl z-50 flex flex-col transition-all ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-dark-700 bg-dark-800 rounded-t-xl">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Messages</h3>
                {activeOrders.length > 0 && (
                  <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
                    {activeOrders.length}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCompose(true)}
                  className="text-primary-400 hover:text-primary-300 text-sm font-semibold"
                  title="Compose New Message"
                >
                  ✏️ Compose
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  {isMinimized ? '□' : '−'}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsMinimized(true);
                  }}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Other User Profile */}
            {selectedOrderId && otherUser && (
              <div className="flex items-center gap-2 pt-2 border-t border-dark-700">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {(otherUser.name || otherUser.shopName || otherUser.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {otherUser.name || otherUser.shopName || otherUser.username || 'Unknown User'}
                  </p>
                  {otherUser.username && (otherUser.name || otherUser.shopName) && (
                    <p className="text-xs text-gray-400 truncate">@{otherUser.username}</p>
                  )}
                  {otherUser.role && (
                    <p className="text-xs text-gray-500 capitalize">{otherUser.role}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isMinimized && (
            <>
              {/* Order List */}
              <div className="border-b border-dark-700 bg-dark-750">
                <div className="p-2 overflow-x-auto">
                  <div className="flex gap-2">
                    {activeOrders.length === 0 ? (
                      <div className="px-4 py-2 text-center w-full">
                        <p className="text-sm text-gray-400">No active conversations</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {orders.length === 0 
                            ? "Create an order to start chatting"
                            : "Orders will appear here once riders bid"}
                        </p>
                      </div>
                    ) : (
                      activeOrders.map((order) => {
                      if (!order || !order._id) return null;
                      const orderId = order._id;
                      const isSelected = selectedOrderId === orderId;
                      const riderName = order.rider?.name || (order.status === 'bidding' && order.bids?.length > 0 ? `${order.bids.length} Bids` : 'Rider');
                      const isBidding = order.status === 'bidding';
                      
                      return (
                        <button
                          key={orderId}
                          onClick={() => handleOrderSelect(order)}
                          className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{isBidding ? '💰' : '📦'}</span>
                            <span className="font-semibold">#{orderId.slice(-6)}</span>
                            <span className="text-xs opacity-75">{riderName}</span>
                            {isBidding && order.bids?.length > 0 && (
                              <span className="text-xs bg-yellow-600 px-1.5 py-0.5 rounded">{order.bids.length}</span>
                            )}
                          </div>
                        </button>
                      );
                    }))}
                  </div>
                </div>
              </div>

              {/* Bid Selection (for bidding orders) - Only for shops */}
              {user?.role === 'shop' && selectedOrder && selectedOrder.status === 'bidding' && selectedOrder.bids && selectedOrder.bids.length > 0 && (
                <div className="border-b border-dark-700 bg-dark-750 p-2">
                  <p className="text-xs text-gray-400 mb-2 px-2">Select a rider to chat:</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedOrder.bids.map((bid, idx) => {
                      const rider = bid.rider;
                      const isSelected = selectedBidIndex === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedBidIndex(idx);
                            loadMessages(selectedOrderId, idx);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>🏍️</span>
                            <span className="font-semibold">{rider?.name || 'Rider'}</span>
                            <span className="text-xs opacity-75">KES {bid.price}</span>
                            {bid.status === 'accepted' && <span className="text-xs bg-green-600 px-1.5 py-0.5 rounded">✓</span>}
                            {bid.status === 'rejected' && <span className="text-xs bg-red-600 px-1.5 py-0.5 rounded">✗</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Messages Area */}
              {!selectedOrderId && activeOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8 bg-dark-800">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-gray-300 text-lg mb-2">No Active Conversations</p>
                    <p className="text-gray-400 text-sm">
                      {orders.length === 0 
                        ? "Create an order to start chatting with riders"
                        : "Orders will appear here once riders bid or are assigned"}
                    </p>
                  </div>
                </div>
              ) : selectedOrderId ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-800">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 mt-8">
                        <p>No messages yet.</p>
                        <p className="text-sm mt-2">Start the conversation!</p>
                        {selectedBidIndex !== null && selectedOrder?.bids?.[selectedBidIndex] && (
                          <div className="mt-4 p-3 bg-dark-700 rounded-lg text-left">
                            <p className="text-sm text-white font-semibold mb-2">Bid Details:</p>
                            <p className="text-xs text-gray-300">Price: KES {selectedOrder.bids[selectedBidIndex].price}</p>
                            <p className="text-xs text-gray-300">
                              Estimated Time: {selectedOrder.bids[selectedBidIndex].estimatedTime >= 60
                                ? `${(selectedOrder.bids[selectedBidIndex].estimatedTime / 60).toFixed(1)} hours`
                                : `${selectedOrder.bids[selectedBidIndex].estimatedTime} minutes`}
                            </p>
                            {selectedOrder.bids[selectedBidIndex].message && (
                              <p className="text-xs text-primary-400 mt-2">"{selectedOrder.bids[selectedBidIndex].message}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      (() => {
                        // Group messages by date and render with date separators
                        const groupedMessages = [];
                        let currentDate = null;
                        
                        messages.forEach((message, index) => {
                          if (!message || !message._id) return;
                          
                          const messageDate = new Date(message.createdAt || message.timestamp);
                          const dateStr = messageDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                          const isNewDate = dateStr !== currentDate;
                          
                          if (isNewDate) {
                            currentDate = dateStr;
                            groupedMessages.push({ type: 'date', date: dateStr });
                          }
                          
                          groupedMessages.push({ type: 'message', message });
                        });
                        
                        return groupedMessages.map((item, idx) => {
                          if (item.type === 'date') {
                            return (
                              <div key={`date-${idx}`} className="flex justify-center my-4">
                                <div className="bg-dark-700 px-4 py-1 rounded-full">
                                  <p className="text-xs text-gray-400">{item.date}</p>
                                </div>
                              </div>
                            );
                          }
                          
                          const message = item.message;
                          // Determine if message is from current user
                          const isOwnMessage = user && message.sender && (
                            message.sender._id === user.id || 
                            message.sender._id === user._id ||
                            (user.role === 'shop' && message.sender.role === 'shop' && message.sender._id === user._id) ||
                            (user.role === 'rider' && message.sender.role === 'rider' && message.sender._id === user._id) ||
                            (user.role === 'admin' && message.sender.role === 'admin' && message.sender._id === user._id)
                          );
                          
                          // Check if user messaged themselves
                          const isSelfMessage = message.sender && message.receiver && 
                            (message.sender._id?.toString() === message.receiver._id?.toString() ||
                             message.sender._id?.toString() === message.receiver?.toString() ||
                             message.sender?.toString() === message.receiver._id?.toString());
                          
                          const messageDate = new Date(message.createdAt || message.timestamp);
                          const timeStr = messageDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          
                          // Check if we should show sender name (show if different from previous message)
                          const prevMessage = idx > 0 && groupedMessages[idx - 1]?.type === 'message' 
                            ? groupedMessages[idx - 1].message 
                            : null;
                          const showSenderName = !prevMessage || 
                            prevMessage.sender?._id !== message.sender?._id ||
                            (new Date(message.createdAt || message.timestamp) - new Date(prevMessage.createdAt || prevMessage.timestamp)) > 300000; // 5 minutes
                          
                          return (
                            <div
                              key={message._id}
                              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[75%] px-4 py-2 rounded-lg ${
                                  isOwnMessage
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-dark-700 text-gray-100'
                                }`}
                              >
                                {showSenderName && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs opacity-75">
                                      {message.sender?.name || message.sender?.shopName || message.sender?.username || 'Unknown'}
                                    </p>
                                    {message.isInitialBid && (
                                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">Initial Bid</span>
                                    )}
                                    {isSelfMessage && (
                                      <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">⚠️ Self Message</span>
                                    )}
                                  </div>
                                )}
                                {isSelfMessage && !showSenderName && (
                                  <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded mb-1 inline-block">⚠️ Self Message</span>
                                )}
                                {/* Display attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mb-2 space-y-2">
                                    {message.attachments.map((attachment, attIdx) => (
                                      <div key={attIdx} className="relative">
                                        {attachment.type === 'image' && (
                                          <img
                                            src={attachment.url}
                                            alt={attachment.filename || 'Attachment'}
                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(attachment.url, '_blank')}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {message.message && (
                                  <p className="text-sm">{message.message}</p>
                                )}
                                {message.action && message.action !== 'message' && (
                                  <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                                    message.action === 'bargain' ? 'bg-yellow-600' :
                                    message.action === 'accept' ? 'bg-green-600' :
                                    message.action === 'reject' ? 'bg-red-600' : 'bg-gray-600'
                                  }`}>
                                    {message.action === 'bargain' && '💰 Bargain'}
                                    {message.action === 'accept' && '✓ Accepted'}
                                    {message.action === 'reject' && '✗ Rejected'}
                                  </span>
                                )}
                                <p className="text-xs mt-1 opacity-70">
                                  {timeStr}
                                </p>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-dark-700 bg-dark-800">
                    {/* Action Buttons for Bid Chat - Only for shops */}
                    {user?.role === 'shop' && selectedBidIndex !== null && (
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setAction('message')}
                          className={`px-2 py-1 rounded text-xs ${
                            action === 'message'
                              ? 'bg-primary-600 text-white'
                              : 'bg-dark-700 text-gray-300'
                          }`}
                        >
                          Message
                        </button>
                        <button
                          type="button"
                          onClick={() => setAction('bargain')}
                          className={`px-2 py-1 rounded text-xs ${
                            action === 'bargain'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-dark-700 text-gray-300'
                          }`}
                        >
                          Bargain
                        </button>
                        <button
                          type="button"
                          onClick={() => setAction('accept')}
                          className={`px-2 py-1 rounded text-xs ${
                            action === 'accept'
                              ? 'bg-green-600 text-white'
                              : 'bg-dark-700 text-gray-300'
                          }`}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setAction('reject')}
                          className={`px-2 py-1 rounded text-xs ${
                            action === 'reject'
                              ? 'bg-red-600 text-white'
                              : 'bg-dark-700 text-gray-300'
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {action === 'bargain' && selectedBidIndex !== null && (
                      <input
                        type="number"
                        placeholder="New price (KES)"
                        value={bargainPrice}
                        onChange={(e) => setBargainPrice(e.target.value)}
                        className="input-field text-sm mb-2"
                      />
                    )}
                    
                    <div className="flex gap-2 items-end">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary px-3 py-2 text-lg"
                        title="Attach Image"
                        disabled={loading || attachments.length >= 5}
                      >
                        📎
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={
                          (selectedBidIndex === null && selectedOrder?.status === 'bidding' && user?.role === 'shop')
                            ? 'Select a rider from above to chat...'
                            : (selectedOrder?.status !== 'bidding' && !selectedOrder?.rider && user?.role === 'shop')
                            ? 'Waiting for rider to be assigned...'
                            : selectedBidIndex !== null
                            ? action === 'accept' ? 'Optional message...' 
                            : action === 'reject' ? 'Optional message...'
                            : 'Type a message...'
                            : 'Type a message...'
                        }
                        className="input-field flex-1 text-sm"
                        disabled={(() => {
                          // Disable when loading
                          if (loading) return true;
                          
                          // For bid chat (selectedBidIndex !== null), always allow typing
                          if (selectedBidIndex !== null) return false;
                          
                          // For regular messages (selectedBidIndex === null)
                          if (!selectedOrder) return true; // No order selected
                          
                          // Bidding orders: shop must select a bid to chat
                          if (selectedOrder.status === 'bidding' && user?.role === 'shop') {
                            return true; // Disable - need to select bid first
                          }
                          
                          // Active orders (accepted, picked_up, in_transit): allow if participants exist
                          if (['accepted', 'picked_up', 'in_transit'].includes(selectedOrder.status)) {
                            // Check if rider exists (for shop) or shop exists (for rider)
                            // Rider/shop can be ObjectId string or populated object
                            const hasRider = selectedOrder.rider && (
                              selectedOrder.rider._id || 
                              selectedOrder.rider.toString() || 
                              typeof selectedOrder.rider === 'string'
                            );
                            const hasShop = selectedOrder.shop && (
                              selectedOrder.shop._id || 
                              selectedOrder.shop.toString() || 
                              typeof selectedOrder.shop === 'string'
                            );
                            
                            if (user?.role === 'shop' && !hasRider) {
                              return true; // Disable - no rider assigned
                            }
                            if (user?.role === 'rider' && !hasShop) {
                              return true; // Disable - no shop (shouldn't happen)
                            }
                            // Both participants exist, allow typing
                            return false;
                          }
                          
                          // For other statuses, allow typing (will be validated on send)
                          return false;
                        })()}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!loading && (newMessage.trim() || attachments.length > 0)) {
                              sendMessage(e);
                            }
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={
                          loading || 
                          (action === 'message' && !newMessage.trim() && attachments.length === 0) || 
                          (action === 'bargain' && !bargainPrice) ||
                          (selectedBidIndex === null && selectedOrder?.status === 'bidding' && user?.role === 'shop') ||
                          (selectedOrder?.status !== 'bidding' && !selectedOrder?.rider && user?.role === 'shop')
                        }
                        className="btn-primary px-4 py-2"
                        title={
                          (selectedBidIndex === null && selectedOrder?.status === 'bidding' && user?.role === 'shop')
                            ? 'Please select a rider from the bid list above'
                            : (selectedOrder?.status !== 'bidding' && !selectedOrder?.rider && user?.role === 'shop')
                            ? 'No rider assigned to this order yet'
                            : undefined
                        }
                      >
                        {loading ? '⏳' : 'Send'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <p>Select an order to start chatting</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Compose Message Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-dark-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Compose Message</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                To start a new conversation, select an order from the list above. 
                Messages are currently tied to active orders.
              </p>
              <p className="text-gray-400 text-xs">
                💡 Tip: Create an order or wait for riders to bid to start chatting.
              </p>
              <button
                onClick={() => setShowCompose(false)}
                className="btn-primary w-full"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

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
                  sendMessage(null, pin);
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
                    sendMessage(null, pin);
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
    </>
  );
};

export default ChatBox;
