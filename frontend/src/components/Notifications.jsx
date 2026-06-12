import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const Notifications = ({ onMessageNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    loadNotifications();
    initializeSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const [notificationsRes, countRes] = await Promise.all([
        axios.get('/api/notifications'),
        axios.get('/api/notifications/unread-count')
      ]);
      setNotifications(notificationsRes.data.notifications);
      setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const initializeSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      // Socket will be used for real-time notifications
    });

    newSocket.on('new_notification', () => {
      loadNotifications();
    });

    setSocket(newSocket);
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-300 hover:text-primary-500 transition"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-80 bg-dark-800 rounded-lg shadow-xl border border-dark-700 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-dark-700 flex justify-between items-center">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary-500 hover:text-primary-400"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-700 ${
                    !notification.read ? 'bg-dark-750' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification._id);
                    
                    // If it's a message notification and callback is provided, open chat
                    if (notification.type === 'message' && notification.order && onMessageNotificationClick) {
                      // Handle both object and string ID formats
                      const orderId = typeof notification.order === 'object' 
                        ? notification.order._id || notification.order.id 
                        : notification.order;
                      onMessageNotificationClick(orderId);
                      setShowPanel(false); // Close notification panel
                      return;
                    }
                    
                    // Otherwise, use link if available
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{notification.title}</p>
                      <p className="text-gray-400 text-xs mt-1">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full ml-2"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

