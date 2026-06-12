import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const AdminMessages = ({ onClose }) => {
  const modalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadConversations();
    initializeSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationDetails(selectedConversation._id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

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

  const initializeSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_user', 'admin');
    });

    newSocket.on('user_message', (data) => {
      loadConversations();
      if (selectedConversation && selectedConversation._id === data.conversationId) {
        loadConversationDetails(data.conversationId);
      }
    });

    setSocket(newSocket);
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/messages', {
        params: { status: statusFilter }
      });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (conversationId) => {
    try {
      const response = await axios.get(`/api/admin/messages/${conversationId}`);
      setSelectedConversation(response.data.conversation);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const response = await axios.post(`/api/admin/messages/${selectedConversation._id}/send`, {
        message: newMessage
      });
      setSelectedConversation(response.data.conversation);
      setNewMessage('');
      loadConversations(); // Refresh list
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (conversationId, status) => {
    try {
      await axios.put(`/api/admin/messages/${conversationId}/status`, { status });
      loadConversations();
      if (selectedConversation && selectedConversation._id === conversationId) {
        loadConversationDetails(conversationId);
      }
    } catch (error) {
      console.error('Error updating status:', error);
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

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-yellow-600',
      resolved: 'bg-green-600',
      closed: 'bg-gray-600'
    };
    return badges[status] || 'bg-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-dark-700 flex flex-col">
          <div className="p-4 border-b border-dark-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">User Messages</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No conversations</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-700 transition-colors ${
                    selectedConversation?._id === conv._id ? 'bg-dark-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-semibold">
                      {conv.user?.name || conv.user?.shopName || 'Unknown User'}
                    </p>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(conv.status)}`}>
                      {conv.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">
                    {conv.messages[conv.messages.length - 1]?.message || 'No messages'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-dark-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedConversation.user?.name || selectedConversation.user?.shopName || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {selectedConversation.userRole} • {selectedConversation.user?.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedConversation.status}
                      onChange={(e) => updateStatus(selectedConversation._id, e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.sender === 'admin'
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-700 text-gray-100'
                      }`}
                    >
                      <p className="text-sm mb-1">{msg.message}</p>
                      <p className={`text-xs ${msg.sender === 'admin' ? 'text-primary-200' : 'text-gray-400'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-dark-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your response..."
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
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;











