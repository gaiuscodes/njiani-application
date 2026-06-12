import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const Messages = ({ orderId, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (orderId) {
      loadMessages();
      initializeSocket();
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`/api/messages/order/${orderId}`);
      setMessages(response.data.messages);
      
      // Mark messages as read
      await axios.put(`/api/messages/order/${orderId}/read`);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const initializeSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_order', orderId);
    });

    newSocket.on('new_message', (data) => {
      if (data.message.order.toString() === orderId) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    });

    setSocket(newSocket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await axios.post(`/api/messages/order/${orderId}`, {
        message: newMessage
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl h-[600px] flex flex-col">
        <div className="p-4 border-b border-dark-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Messages</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = user && message.sender._id === user.id;
              return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-100'
                  }`}
                >
                  <p className="text-xs text-gray-300 mb-1">
                    {message.sender.name || message.sender.shopName}
                  </p>
                  <p>{message.message}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-dark-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="input-field flex-1"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="btn-primary"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Messages;

