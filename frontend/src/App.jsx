import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import RoleSelection from './pages/RoleSelection';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import RetailerDashboard from './pages/dashboards/RetailerDashboard';
import WholesalerDashboard from './pages/dashboards/WholesalerDashboard';
import SupplierDashboard from './pages/dashboards/SupplierDashboard';
import TransporterDashboard from './pages/dashboards/TransporterDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DashboardRedirect from './components/DashboardRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import WholesalerProducts from './components/RetailerComponents/WholesalerProducts';
import SupplierWholesalersProducts from './components/WholesalerComponents/SupplierWholesalersProducts';
import InstallPWA from './components/InstallPWA'; // Add this import

// Import your API config
import { API_BASE_URL, SOCKET_SERVER } from './config/api';

// 🚀 GLOBAL URL TRANSFORMATION
const originalFetch = window.fetch;

window.fetch = function(url, options) {
  let finalUrl = url;
  
  // Transform HTTP URLs from localhost to production
  if (typeof url === 'string' && url.includes('http://localhost:5000')) {
    if (API_BASE_URL && !API_BASE_URL.includes('localhost')) {
      finalUrl = url.replace('http://localhost:5000', API_BASE_URL);
      console.log(`🌐 Auto-transformed: ${url} → ${finalUrl}`);
    } else {
      console.log(`🔧 Development mode: Using ${url}`);
    }
  }
  
  return originalFetch.call(this, finalUrl, options);
};

// 🚀 WebSocket URL Transformation
const originalWebSocket = window.WebSocket;

window.WebSocket = function(url, protocols) {
  let finalUrl = url;
  
  // Transform WebSocket URLs
  if (typeof url === 'string' && url.includes('ws://localhost:5000')) {
    if (SOCKET_SERVER && !SOCKET_SERVER.includes('localhost')) {
      const wsUrl = SOCKET_SERVER.replace('http', 'ws').replace('https', 'wss');
      finalUrl = url.replace('ws://localhost:5000', wsUrl);
      console.log(`🌐 WebSocket transformed: ${url} → ${finalUrl}`);
    }
  }
  
  return new originalWebSocket(finalUrl, protocols);
};

// Enhanced logging
console.log('=== ENVIRONMENT DEBUG INFO ===');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('VITE_SOCKET_SERVER:', import.meta.env.VITE_SOCKET_SERVER);
console.log('API_BASE_URL from config:', API_BASE_URL);
console.log('SOCKET_SERVER from config:', SOCKET_SERVER);
console.log('Current hostname:', window.location.hostname);
console.log('Environment:', API_BASE_URL && !API_BASE_URL.includes('localhost') ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('==============================');

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            {/* Install PWA Button - Will only show when conditions are met */}
            <InstallPWA />
            
            <Routes>
              <Route path="/" element={<RoleSelection />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard/retailer/*"
                element={
                  <ProtectedRoute requiredRole="retailer">
                    <RetailerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/wholesaler/*"
                element={
                  <ProtectedRoute requiredRole="wholesaler">
                    <WholesalerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/supplier/*"
                element={
                  <ProtectedRoute requiredRole="supplier">
                    <SupplierDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/transporter/*"
                element={
                  <ProtectedRoute requiredRole="transporter">
                    <TransporterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Wholesaler specific routes */}
              <Route
                path="/wholesaler/supplier/:supplierId/products"
                element={
                  <ProtectedRoute requiredRole="wholesaler">
                    <SupplierWholesalersProducts />
                  </ProtectedRoute>
                }
              />

              {/* Redirect to appropriate dashboard */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/dashboard/redirect" element={<DashboardRedirect />} />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;