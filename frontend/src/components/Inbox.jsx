import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ChatBox from './ChatBox';

const Inbox = ({ onClose }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let response;
      if (user.role === 'rider') {
        // Get rider's orders (active and with bids)
        const [activeRes, bidsRes] = await Promise.all([
          axios.get('/api/rider/my-orders').catch(() => ({ data: { orders: [] } })),
          axios.get('/api/rider/bids').catch(() => ({ data: { bids: {} } }))
        ]);
        
        const activeOrders = activeRes.data?.orders || [];
        const bidOrders = [];
        
        // Get orders from bids
        try {
          Object.values(bidsRes.data?.bids || {}).forEach(bidArray => {
            if (Array.isArray(bidArray)) {
              bidArray.forEach(bidInfo => {
                if (bidInfo?.order && !bidOrders.find(o => o._id === bidInfo.order._id)) {
                  bidOrders.push(bidInfo.order);
                }
              });
            }
          });
        } catch (err) {
          console.error('Error processing bids:', err);
        }
        
        const allOrders = [...activeOrders, ...bidOrders];
        setOrders(allOrders);
        
        // Create conversations from orders
        const convs = allOrders
          .filter(order => order && order._id)
          .map(order => ({
            orderId: order._id,
            order: order,
            lastMessage: null,
            unreadCount: 0,
            type: ['accepted', 'picked_up', 'in_transit'].includes(order.status) ? 'active' : 'bid'
          }));
        
        setConversations(convs);
      } else if (user.role === 'shop') {
        // Get shop's orders
        response = await axios.get('/api/shop/orders').catch(() => ({ data: { orders: [] } }));
        const shopOrders = response.data?.orders || [];
        setOrders(shopOrders);
        
        // Create conversations from orders
        const convs = shopOrders
          .filter(order => order && order._id && ['bidding', 'accepted', 'picked_up', 'in_transit'].includes(order.status))
          .map(order => ({
            orderId: order._id,
            order: order,
            lastMessage: null,
            unreadCount: 0,
            type: order.status === 'bidding' ? 'bid' : 'active'
          }));
        
        setConversations(convs);
      } else if (user.role === 'admin') {
        // Admin can see all active orders
        response = await axios.get('/api/admin/orders').catch(() => ({ data: { orders: [] } }));
        const adminOrders = response.data?.orders || [];
        setOrders(adminOrders);
        
        const convs = adminOrders
          .filter(order => order && order._id && ['bidding', 'accepted', 'picked_up', 'in_transit'].includes(order.status))
          .map(order => ({
            orderId: order._id,
            order: order,
            lastMessage: null,
            unreadCount: 0,
            type: order.status === 'bidding' ? 'bid' : 'active'
          }));
        
        setConversations(convs);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getConversationTitle = (conv) => {
    const order = conv.order;
    if (user && user.role === 'shop') {
      return order.rider?.name || (order.status === 'bidding' ? `${order.bids?.length || 0} Bids` : 'Rider');
    } else if (user && user.role === 'rider') {
      return order.shop?.shopName || 'Shop';
    } else {
      return `${order.shop?.shopName || 'Shop'} - ${order.rider?.name || 'Rider'}`;
    }
  };

  const getConversationSubtitle = (conv) => {
    const order = conv.order;
    if (order.status === 'bidding') {
      return `Order #${order._id.slice(-6)} • ${order.bids?.length || 0} bids`;
    }
    return `Order #${order._id.slice(-6)} • ${order.status}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-4 border-b border-dark-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">💬 Inbox</h2>
            <p className="text-sm text-gray-400 mt-1">All your conversations</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-300 text-lg mb-2">No Conversations</p>
              <p className="text-gray-400 text-sm">
                {user && user.role === 'shop' 
                  ? 'Create an order and wait for riders to bid'
                  : user && user.role === 'rider'
                  ? 'Bid on orders to start conversations'
                  : 'No active conversations'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-dark-700 overflow-y-auto">
              <div className="p-2 space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.orderId}
                    onClick={() => setSelectedOrderId(conv.orderId)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedOrderId === conv.orderId
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 hover:bg-dark-600 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold truncate">{getConversationTitle(conv)}</p>
                      {conv.type === 'bid' && (
                        <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">Bid</span>
                      )}
                    </div>
                    <p className="text-xs opacity-75 truncate">{getConversationSubtitle(conv)}</p>
                    {conv.unreadCount > 0 && (
                      <span className="text-xs bg-red-600 px-2 py-0.5 rounded mt-1 inline-block">
                        {conv.unreadCount} new
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-dark-800 overflow-hidden">
              {selectedOrderId ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <ChatBox
                    orders={orders}
                    initialOrderId={selectedOrderId}
                    onOrderSelected={(orderId) => {
                      setSelectedOrderId(orderId);
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg mb-2">Select a conversation</p>
                    <p className="text-sm text-gray-500">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;

