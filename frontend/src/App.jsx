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

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
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