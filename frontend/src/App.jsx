import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './pages/LandingPage';
import RiderSignup from './pages/RiderSignup';
import ShopSignup from './pages/ShopSignup';
import RiderLogin from './pages/RiderLogin';
import ShopLogin from './pages/ShopLogin';
import AdminLogin from './pages/AdminLogin';
import RiderDashboard from './pages/RiderDashboard';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider } from './context/AuthContext';

axios.defaults.withCredentials = true;
// Use full URL to backend - CORS is configured on backend
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Add axios interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('Network Error: Backend server may not be running');
      console.error('Please ensure the backend server is running on http://localhost:5000');
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/rider/signup" element={<RiderSignup />} />
          <Route path="/rider/login" element={<RiderLogin />} />
          <Route path="/shop/signup" element={<ShopSignup />} />
          <Route path="/shop/login" element={<ShopLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/rider/dashboard" element={<RiderDashboard />} />
          <Route path="/shop/dashboard" element={<ShopDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

