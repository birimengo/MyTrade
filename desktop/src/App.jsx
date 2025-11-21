// src/App.jsx
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { DarkModeProvider } from './context/DarkModeContext';
import UserDataGuard from './components/UserDataGuard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RoleSelection from './pages/RoleSelection';
import RetailerDashboard from './pages/dashboard/RetailerDashboard';
import WholesalerDashboard from './pages/dashboard/WholesalerDashboard';
import SupplierDashboard from './pages/dashboard/SupplierDashboard';
import TransporterDashboard from './pages/dashboard/TransporterDashboard';

function AppContent() {
  const { isAuthenticated, user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('role');
  const [selectedRole, setSelectedRole] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    console.log('🔄 App mounted - checking initial auth state');
    setAuthChecked(true);
  }, []);

  // Debug authentication state changes
  useEffect(() => {
    console.log('🔍 App Auth State:', { 
      isAuthenticated, 
      user: user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null',
      loading,
      currentView 
    });

    // Auto-redirect to dashboard if authenticated
    if (isAuthenticated && user && currentView !== 'dashboard') {
      console.log('🚀 Auto-redirecting to dashboard for role:', user.role);
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, user, loading, currentView]);

  // Handle Electron menu events
  useEffect(() => {
    if (window.electronAPI) {
      const handleNewRegistration = () => {
        setCurrentView('role');
        setSelectedRole('');
      };

      const handleBackToRole = () => {
        setCurrentView('role');
        setSelectedRole('');
      };

      window.electronAPI.onMenuNewRegistration(handleNewRegistration);
      window.electronAPI.onMenuBackToRole(handleBackToRole);

      return () => {
        window.electronAPI?.removeAllListeners('menu-new-registration');
        window.electronAPI?.removeAllListeners('menu-back-to-role');
      };
    }
  }, []);

  // Show loading state only during initial app load
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-900 dark:text-white text-lg font-medium">Starting Trade Uganda...</div>
        </div>
      </div>
    );
  }

  // If authenticated, show appropriate dashboard based on role
  if (isAuthenticated && user && currentView === 'dashboard') {
    console.log('🎯 Rendering Dashboard for:', user.role);
    
    const RoleBasedDashboard = () => {
      switch (user.role) {
        case 'retailer':
          return <RetailerDashboard />;
        case 'wholesaler':
          return <WholesalerDashboard />;
        case 'supplier':
          return <SupplierDashboard />;
        case 'transporter':
          return <TransporterDashboard />;
        default:
          return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-4">Invalid user role</div>
                <button 
                  onClick={() => setCurrentView('role')}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Select Role
                </button>
              </div>
            </div>
          );
      }
    };

    return (
      <SocketProvider>
        <DarkModeProvider>
          <UserDataGuard>
            <RoleBasedDashboard />
          </UserDataGuard>
        </DarkModeProvider>
      </SocketProvider>
    );
  }

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4 transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Registration Successful!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Your account has been created successfully. Please login to continue.
          </p>
          <button
            onClick={() => {
              setRegistrationSuccess(false);
              setCurrentView('login');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  // Authentication flow
  const renderView = () => {
    switch (currentView) {
      case 'role':
        return (
          <RoleSelection 
            onRoleSelect={(role) => {
              setSelectedRole(role);
              setCurrentView('signup');
            }}
            onSwitchToLogin={() => setCurrentView('login')}
            onSwitchToSignup={(role) => {
              setSelectedRole(role);
              setCurrentView('signup');
            }}
          />
        );

      case 'signup':
        return (
          <Signup 
            selectedRole={selectedRole}
            onSwitchToLogin={() => setCurrentView('login')}
            onSwitchToRoleSelection={() => setCurrentView('role')}
            onSignupSuccess={() => setRegistrationSuccess(true)}
          />
        );
      
      case 'login':
        return (
          <Login 
            onSwitchToRoleSelection={() => setCurrentView('role')}
            onLoginSuccess={() => {
              console.log('🎯 Login success - switching to dashboard view');
              setCurrentView('dashboard');
            }}
          />
        );
      
      default:
        return (
          <RoleSelection 
            onRoleSelect={(role) => {
              setSelectedRole(role);
              setCurrentView('signup');
            }}
            onSwitchToLogin={() => setCurrentView('login')}
            onSwitchToSignup={(role) => {
              setSelectedRole(role);
              setCurrentView('signup');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {renderView()}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;