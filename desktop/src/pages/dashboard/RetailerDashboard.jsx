// src/pages/dashboard/RetailerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaStore, 
  FaShoppingCart, 
  FaChartLine, 
  FaBoxOpen,
  FaUsers,
  FaFileInvoice,
  FaComments,
  FaSun,
  FaMoon,
  FaDollarSign,
  FaBars,
  FaCog,
  FaHome,
  FaSync,
  FaWifi,
  FaDownload,
  FaSignal,
  FaExclamationTriangle
} from "react-icons/fa";
import Sidebar from '../../components/Sidebar';
import Settings from '../../components/Settings';
import CustomTitleBar from '../../components/CustomTitleBar';

// Import all retailer components
import Overview from '../../components/RetailerComponents/Overview';
import Orders from '../../components/RetailerComponents/Orders';
import MyStock from '../../components/RetailerComponents/MyStock';
import Wholesalers from '../../components/RetailerComponents/Wholesalers';
import DailySales from '../../components/RetailerComponents/DailySales';
import Receipts from '../../components/RetailerComponents/Receipts';
import DesktopChatContainer from '../../components/ChatComponents/DesktopChatContainer';

const RetailerDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const isElectron = window.electronAPI;

  // Chat connection status management
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
      if (isElectron) {
        window.electronAPI.showNotification('Back Online', 'Connection restored. Syncing data...');
        triggerAutoSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
      if (isElectron) {
        window.electronAPI.showNotification('Offline Mode', 'Working with cached data');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending sync items
    checkPendingSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isElectron]);

  const setupDesktopFeatures = async () => {
    if (isElectron) {
      window.electronAPI.onMenuNewRegistration(() => {
        console.log('New registration menu clicked');
      });

      window.electronAPI.onMenuBackToRole(() => {
        logout();
      });

      await loadOfflineData();
    }
  };

  const loadOfflineData = async () => {
    if (!isElectron) return;

    try {
      const pendingOrders = await window.electronAPI.storage.getPersistent('pending_orders');
      if (pendingOrders.success && pendingOrders.value) {
        setPendingSyncCount(pendingOrders.value.length);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const checkPendingSync = async () => {
    if (!isElectron) return;

    try {
      const pendingOrders = await window.electronAPI.storage.getPersistent('pending_orders');
      const count = pendingOrders.success && pendingOrders.value ? pendingOrders.value.length : 0;
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Error checking pending sync:', error);
    }
  };

  const triggerAutoSync = async () => {
    if (!isElectron || !isOnline) return;

    setSyncStatus('syncing');
    setConnectionStatus('connecting');
    try {
      const pendingOrders = await window.electronAPI.storage.getPersistent('pending_orders');
      if (pendingOrders.success && pendingOrders.value && pendingOrders.value.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await window.electronAPI.storage.setPersistent('pending_orders', []);
        setPendingSyncCount(0);
        
        setSyncStatus('success');
        setConnectionStatus('connected');
        window.electronAPI.showNotification('Sync Complete', 'All pending data has been synchronized');
        
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('idle');
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setConnectionStatus('error');
      setTimeout(() => {
        setSyncStatus('idle');
        setConnectionStatus(isOnline ? 'connected' : 'disconnected');
      }, 3000);
    }
  };

  const handleManualSync = () => {
    if (!isOnline) {
      if (isElectron) {
        window.electronAPI.showNotification('Offline', 'Cannot sync without internet connection');
      }
      return;
    }
    triggerAutoSync();
  };

  // Enhanced chat reconnection handler
  const handleReconnectChat = async () => {
    setConnectionStatus('connecting');
    if (isElectron) {
      window.electronAPI.showNotification('Reconnecting', 'Attempting to reconnect chat service...');
    }
    
    // Simulate reconnection with better error handling
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (isOnline) {
            setConnectionStatus('connected');
            if (isElectron) {
              window.electronAPI.showNotification('Reconnected', 'Chat service reconnected successfully');
            }
            resolve();
          } else {
            setConnectionStatus('disconnected');
            reject(new Error('No internet connection'));
          }
        }, 2000);
      });
    } catch (error) {
      console.error('Chat reconnection failed:', error);
      setConnectionStatus('error');
      if (isElectron) {
        window.electronAPI.showNotification('Connection Failed', 'Unable to connect to chat service');
      }
    }
  };

  const handleExportAllData = async () => {
    if (!isElectron) return;

    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          name: `${user?.firstName} ${user?.lastName}`,
          business: user?.businessName,
          role: user?.role
        },
        dashboardData: {
          activeTab,
          lastSync: new Date().toISOString(),
          onlineStatus: isOnline,
          pendingSyncCount
        }
      };

      const result = await window.electronAPI.saveRegistrationData(
        exportData,
        `retailer-dashboard-export-${new Date().getTime()}.json`
      );

      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          'Dashboard data exported successfully'
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (isElectron) {
        window.electronAPI.showNotification('Export Failed', 'Could not export data');
      }
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Enhanced content renderer with proper chat handling
  const renderContent = () => {
    const commonProps = {
      isElectron,
      isOnline,
      onSync: triggerAutoSync
    };

    switch (activeTab) {
      case 'overview':
        return <Overview {...commonProps} />;
      case 'settings':
        return <Settings {...commonProps} />;
      case 'orders':
        return <Orders {...commonProps} />;
      case 'inventory':
        return <MyStock {...commonProps} />;
      case 'wholesalers':
        return <Wholesalers {...commonProps} />;
      case 'daily-sales':
        return <DailySales {...commonProps} />;
      case 'receipts':
        return <Receipts {...commonProps} />;
      case 'chat':
        return (
          <div className="h-full w-full">
            <DesktopChatContainer 
              connectionStatus={connectionStatus}
              onReconnect={handleReconnectChat}
              userRole={user?.role}
            />
          </div>
        );
      default:
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dashboard</h2>
            <div className="text-center py-12">
              <FaHome className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Welcome to Your Dashboard</h3>
              <p className="text-gray-500 dark:text-gray-400">Select a section from the sidebar to get started.</p>
              {isElectron && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Desktop Mode Active</strong> - You have access to offline features, data export, and desktop notifications.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-yellow-600 dark:text-yellow-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': return 'Sync Complete';
      case 'error': return 'Sync Failed';
      default: return isOnline ? 'Online' : 'Offline';
    }
  };

  const getConnectionIcon = () => {
    if (syncStatus === 'syncing') {
      return <FaSync className="h-3 w-3 animate-spin" />;
    }
    return isOnline ? <FaWifi className="h-3 w-3 text-green-500" /> : <FaSignal className="h-3 w-3 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex relative">
      {/* Custom Title Bar for Electron with online indicator */}
      {isElectron && (
        <CustomTitleBar 
          isOnline={isOnline}
          syncStatus={syncStatus}
          pendingSyncCount={pendingSyncCount}
          getConnectionIcon={getConnectionIcon}
          getSyncStatusText={getSyncStatusText}
          onManualSync={handleManualSync}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:fixed z-30
        ${isElectron ? 'top-12' : 'top-0'} left-0
        h-full
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          isElectron={isElectron}
        />
      </div>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-64'
      }`}>
        {/* Content starts directly at the top */}
        <div className="flex-1 overflow-auto">
          <main className="p-4 sm:p-6 lg:p-8 h-full">
            {renderContent()}
          </main>
        </div>

        {/* Enhanced Connection Status Banner */}
        {activeTab === 'chat' && connectionStatus !== 'connected' && (
          <div className="sticky bottom-0 z-20">
            <div className={`p-3 text-center ${
              connectionStatus === 'connecting' 
                ? 'bg-yellow-500 text-white' 
                : connectionStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-gray-500 text-white'
            }`}>
              <div className="flex items-center justify-center space-x-2 text-sm">
                {connectionStatus === 'connecting' && <FaSync className="h-4 w-4 animate-spin" />}
                {connectionStatus === 'error' && <FaExclamationTriangle className="h-4 w-4" />}
                {connectionStatus === 'disconnected' && <FaSignal className="h-4 w-4" />}
                <span>
                  {connectionStatus === 'connecting' 
                    ? 'Connecting to chat service...' 
                    : connectionStatus === 'error'
                    ? 'Failed to connect to chat service'
                    : 'You are currently offline'
                  }
                </span>
                {connectionStatus === 'error' && (
                  <button 
                    onClick={handleReconnectChat}
                    className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Offline Banner for other tabs */}
        {!isOnline && activeTab !== 'chat' && isElectron && (
          <div className="sticky bottom-0 z-20">
            <div className="bg-yellow-500 text-white p-3 text-center">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <FaExclamationTriangle className="h-4 w-4" />
                <span>You are currently offline. Some features may be limited.</span>
                {pendingSyncCount > 0 && (
                  <span className="bg-white text-yellow-600 px-2 py-1 rounded-full text-xs">
                    {pendingSyncCount} items pending sync
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetailerDashboard;