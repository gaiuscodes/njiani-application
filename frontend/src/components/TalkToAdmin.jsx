import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const TalkToAdmin = ({ onClose }) => {
  const { user } = useAuth();
  const modalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [sending, setSending] = useState(false);

  const userRole = user?.role || '';

  useEffect(() => {
    loadConversation();
    initializeSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const loadConversation = async () => {
    try {
      setLoading(true);
      const endpoint = userRole === 'rider' ? '/api/rider/admin-chat' : '/api/shop/admin-chat';
      const response = await axios.get(endpoint);
      setConversation(response.data.conversation);
      setMessages(response.data.conversation.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
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
    });

    newSocket.on('admin_message', (data) => {
      if (data.conversationId === conversation?._id) {
        setMessages(prev => [...prev, data.message]);
        loadConversation(); // Refresh to get full conversation
      }
    });

    setSocket(newSocket);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const endpoint = userRole === 'rider' ? '/api/rider/admin-chat/send' : '/api/shop/admin-chat/send';
      const response = await axios.post(endpoint, { message: newMessage });
      setConversation(response.data.conversation);
      setMessages(response.data.conversation.messages || []);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-dark-700">
          <div>
            <h2 className="text-2xl font-bold text-white">💬 Talk to Admin</h2>
            <p className="text-sm text-gray-400 mt-1">
              Get help and support from our admin team
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-lg mb-2">👋 Start a conversation</p>
              <p className="text-sm">Send a message to get help from admin</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-100'
                  }`}
                >
                  <p className="text-sm mb-1">{msg.message}</p>
                  <p className={`text-xs ${msg.sender === 'user' ? 'text-primary-200' : 'text-gray-400'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-6 border-t border-dark-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="input-field flex-1"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="btn-primary px-6"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Admin will respond to your message as soon as possible
          </p>
        </form>
      </div>
    </div>
  );
};

export default TalkToAdmin;











