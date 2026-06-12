import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      const userData = response.data.user;
      
      // Check if email verification is required
      if (response.data.requiresVerification && userData.role === 'shop') {
        setUser(null);
        return null;
      }
      
      // Normalize user data structure
      const normalizedUser = {
        ...userData,
        _id: userData._id || userData.id,
        id: userData.id || userData._id
      };
      setUser(normalizedUser);
      return normalizedUser;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    // Normalize user data structure (convert id to _id if needed)
    const normalizedUser = {
      ...userData,
      _id: userData._id || userData.id,
      id: userData.id || userData._id
    };
    setUser(normalizedUser);
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

