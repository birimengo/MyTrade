// src/pages/dashboard/WholesalerDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaBars,
  FaSync,
  FaWifi,
  FaExclamationTriangle
} from "react-icons/fa";

// Import components
import Sidebar from '../../components/Sidebar';
import Settings from '../../components/Settings';
import CustomTitleBar from '../../components/CustomTitleBar';

// Import all wholesaler components including BMS
import Overview from '../../components/WholesalerComponents/Overview';
import Products from '../../components/WholesalerComponents/Products';
import Orders from '../../components/WholesalerComponents/Orders';
import Retailers from '../../components/WholesalerComponents/Retailers';
import MyStock from '../../components/WholesalerComponents/MyStock';
import OutOrders from '../../components/WholesalerComponents/OutOrders';
import Suppliers from '../../components/WholesalerComponents/Suppliers';
import SupplierWholesalersProducts from '../../components/WholesalerComponents/SupplierWholesalersProducts';
import BMS from '../../components/WholesalerComponents/BMS';
import DesktopChatContainer from '../../components/ChatComponents/DesktopChatContainer';

// Custom hooks
const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionStatus, setConnectionStatus };
};

const useSyncManager = (isElectron, isOnline) => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const safeElectronAPI = useMemo(() => ({
    showNotification: (title, message) => {
      if (isElectron && window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (isElectron && window.electronAPI?.storage?.getPersistent) {
          return await window.electronAPI.storage.getPersistent(key);
        }
        try {
          const value = localStorage.getItem(`electron_${key}`);
          return { success: true, value: value ? JSON.parse(value) : null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      setPersistent: async (key, value) => {
        if (isElectron && window.electronAPI?.storage?.setPersistent) {
          return await window.electronAPI.storage.setPersistent(key, value);
        }
        try {
          localStorage.setItem(`electron_${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    }
  }), [isElectron]);

  const checkPendingSync = useCallback(async () => {
    if (!isElectron) return;

    try {
      const [pendingOrders, pendingProducts] = await Promise.all([
        safeElectronAPI.storage.getPersistent('pending_orders'),
        safeElectronAPI.storage.getPersistent('pending_products')
      ]);
      
      let totalPending = 0;
      if (pendingOrders.success && pendingOrders.value) {
        totalPending += pendingOrders.value.length;
      }
      if (pendingProducts.success && pendingProducts.value) {
        totalPending += pendingProducts.value.length;
      }
      
      setPendingSyncCount(totalPending);
    } catch (error) {
      console.error('Error checking pending sync:', error);
    }
  }, [isElectron, safeElectronAPI]);

  const triggerAutoSync = useCallback(async () => {
    if (!isElectron || !isOnline) return;

    setSyncStatus('syncing');
    
    try {
      // Simulate API calls for syncing
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 2000)), // Orders sync
        new Promise(resolve => setTimeout(resolve, 1500)), // Products sync
      ]);
      
      // Clear pending data
      await Promise.all([
        safeElectronAPI.storage.setPersistent('pending_orders', []),
        safeElectronAPI.storage.setPersistent('pending_products', [])
      ]);
      
      setPendingSyncCount(0);
      setSyncStatus('success');
      safeElectronAPI.showNotification('Sync Complete', 'All data synchronized successfully');
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      safeElectronAPI.showNotification('Sync Failed', 'Could not synchronize data');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [isElectron, isOnline, safeElectronAPI]);

  const handleManualSync = useCallback(() => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot sync without internet connection');
      return;
    }
    triggerAutoSync();
  }, [isOnline, triggerAutoSync, safeElectronAPI]);

  return {
    syncStatus,
    pendingSyncCount,
    triggerAutoSync,
    handleManualSync,
    checkPendingSync,
    safeElectronAPI
  };
};

const WholesalerDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isElectron = useMemo(() => window.electronAPI, []);
  const { isOnline, connectionStatus, setConnectionStatus } = useConnectionStatus();
  const {
    syncStatus,
    pendingSyncCount,
    triggerAutoSync,
    handleManualSync,
    checkPendingSync,
    safeElectronAPI
  } = useSyncManager(isElectron, isOnline);

  // Initialize desktop features
  useEffect(() => {
    setupDesktopFeatures();
    checkPendingSync();

    // Listen for navigation events from child components
    const handleNavigateToTab = (event) => {
      const { tab } = event.detail;
      console.log('🎯 Navigation event received:', tab);
      setActiveTab(tab);
    };

    window.addEventListener('navigateToTab', handleNavigateToTab);

    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab);
    };
  }, [checkPendingSync]);

  const setupDesktopFeatures = useCallback(async () => {
    if (!isElectron) return;

    try {
      // Setup menu event handlers if they exist
      const setupMenuHandler = (menuEvent, handler) => {
        if (typeof window.electronAPI?.[menuEvent] === 'function') {
          window.electronAPI[menuEvent](handler);
        }
      };

      setupMenuHandler('onMenuNewRegistration', () => {
        console.log('New registration menu clicked');
      });

      setupMenuHandler('onMenuBackToRole', () => {
        logout();
      });

      setupMenuHandler('onMenuExportData', handleExportAllData);
      setupMenuHandler('onMenuManualSync', handleManualSync);

    } catch (error) {
      console.warn('Electron menu setup failed:', error);
    }
  }, [isElectron, logout, handleManualSync]);

  const handleReconnectChat = useCallback(async () => {
    setConnectionStatus('connecting');
    safeElectronAPI.showNotification('Reconnecting', 'Attempting to reconnect chat service...');
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (isOnline) {
            setConnectionStatus('connected');
            safeElectronAPI.showNotification('Reconnected', 'Chat service reconnected successfully');
            resolve();
          } else {
            setConnectionStatus('disconnected');
            reject(new Error('No internet connection'));
          }
        }, 2000);
        
        // Cleanup timeout
        return () => clearTimeout(timeout);
      });
    } catch (error) {
      console.error('Chat reconnection failed:', error);
      setConnectionStatus('error');
      safeElectronAPI.showNotification('Connection Failed', 'Unable to connect to chat service');
    }
  }, [isOnline, safeElectronAPI, setConnectionStatus]);

  const handleExportAllData = useCallback(async () => {
    if (!isElectron) {
      alert('Export feature is only available in desktop app');
      return;
    }

    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          name: `${user?.firstName} ${user?.lastName}`,
          business: user?.businessName,
          email: user?.email,
          role: user?.role
        },
        dashboardData: {
          activeTab,
          lastSync: new Date().toISOString(),
          onlineStatus: isOnline,
          pendingSyncCount,
          syncStatus
        },
        businessData: {
          totalProducts: 1248,
          activeRetailers: 89,
          monthlyRevenue: 45200
        }
      };

      const result = await safeElectronAPI.saveRegistrationData(
        exportData,
        `wholesaler-export-${new Date().getTime()}.json`
      );

      if (result.success) {
        safeElectronAPI.showNotification('Export Successful', 'Wholesaler data exported successfully');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  }, [isElectron, user, activeTab, isOnline, pendingSyncCount, syncStatus, safeElectronAPI]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleTabChange = (tab) => {
    console.log('🎯 Tab change requested:', tab);
    setActiveTab(tab);
    handleCloseSidebar();
  };

  // Enhanced content renderer with proper BMS integration
  const renderContent = useCallback(() => {
    console.log('🔄 Rendering content for tab:', activeTab);
    
    const commonProps = {
      isElectron,
      isOnline,
      onSync: triggerAutoSync,
      syncStatus,
      pendingSyncCount
    };

    // Component mapping - ensure all tab IDs match sidebar exactly
    const componentMap = {
      overview: Overview,
      settings: Settings,
      products: Products,
      orders: Orders,
      retailers: Retailers,
      mystock: MyStock,
      outorders: OutOrders,
      suppliers: Suppliers,
      'supplier-products': SupplierWholesalersProducts,
      bms: BMS, // This must match the sidebar tab ID exactly
      chat: DesktopChatContainer
    };

    console.log('📋 Available components:', Object.keys(componentMap));
    console.log('🔍 Component for active tab:', componentMap[activeTab]);

    const Component = componentMap[activeTab] || Overview;

    try {
      if (activeTab === 'chat') {
        return (
          <div className="h-full w-full">
            <DesktopChatContainer 
              connectionStatus={connectionStatus}
              onReconnect={handleReconnectChat}
              userRole={user?.role}
              user={user}
              {...commonProps}
            />
          </div>
        );
      }

      return <Component {...commonProps} />;
    } catch (error) {
      console.error('❌ Error rendering content:', error);
      return <ErrorFallback error={error} />;
    }
  }, [activeTab, isElectron, isOnline, triggerAutoSync, syncStatus, pendingSyncCount, connectionStatus, handleReconnectChat, user]);

  const getConnectionIcon = () => {
    if (syncStatus === 'syncing') {
      return <FaSync className="h-3 w-3 animate-spin text-yellow-500" />;
    }
    return isOnline ? 
      <FaWifi className="h-3 w-3 text-green-500" /> : 
      <FaExclamationTriangle className="h-3 w-3 text-red-500" />;
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': return 'Sync Complete';
      case 'error': return 'Sync Failed';
      default: return isOnline ? 'Online' : 'Offline';
    }
  };

  // Mobile menu button component
  const MobileMenuButton = () => (
    <button
      onClick={toggleSidebar}
      className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
      aria-label="Toggle sidebar"
    >
      <FaBars className="h-5 w-5 text-gray-600 dark:text-gray-300" />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex relative">
      {/* Custom Title Bar for Electron */}
      {isElectron && (
        <CustomTitleBar 
          isOnline={isOnline}
          syncStatus={syncStatus}
          pendingSyncCount={pendingSyncCount}
          getConnectionIcon={getConnectionIcon}
          getSyncStatusText={getSyncStatusText}
          onManualSync={handleManualSync}
          onExportData={handleExportAllData}
          userRole="wholesaler"
        />
      )}
      
      {/* Mobile Menu Button */}
      {!isElectron && <MobileMenuButton />}

      {/* Sidebar */}
      <div className={`
        fixed lg:fixed z-40
        ${isElectron ? 'top-12' : 'top-0'} left-0
        h-full
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          isElectron={isElectron}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0 lg:ml-64'
      } ${isElectron ? 'mt-0' : 'mt-0'}`}>
        
        {/* Debug info - remove in production */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 hidden">
          <div className="flex items-center">
            <div className="text-sm">
              <strong>Debug Info:</strong> Active Tab: {activeTab} | Online: {isOnline.toString()} | Sync: {syncStatus}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <main className="p-4 sm:p-6 lg:p-8 h-full">
            {renderContent()}
          </main>
        </div>

        {/* Status Banners */}
        <StatusBanners 
          activeTab={activeTab}
          connectionStatus={connectionStatus}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          syncStatus={syncStatus}
          onReconnectChat={handleReconnectChat}
          onManualSync={handleManualSync}
          isElectron={isElectron}
        />
      </div>
    </div>
  );
};

// Error Fallback Component
const ErrorFallback = ({ error }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
    <div className="text-center py-12">
      <FaExclamationTriangle className="mx-auto text-4xl text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Error Loading Content
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        There was a problem loading this section. Please try again.
      </p>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded">
        Error: {error?.message || 'Unknown error'}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Status Banners Component
const StatusBanners = ({ 
  activeTab, 
  connectionStatus, 
  isOnline, 
  pendingSyncCount, 
  syncStatus, 
  onReconnectChat, 
  onManualSync, 
  isElectron 
}) => {
  // Chat connection banner
  if (activeTab === 'chat' && connectionStatus !== 'connected') {
    return (
      <div className="sticky bottom-0 z-30">
        <ConnectionBanner 
          connectionStatus={connectionStatus}
          onReconnect={onReconnectChat}
        />
      </div>
    );
  }

  // Offline banner for other tabs
  if (!isOnline && activeTab !== 'chat') {
    return (
      <div className="sticky bottom-0 z-30">
        <OfflineBanner 
          pendingSyncCount={pendingSyncCount}
          onManualSync={onManualSync}
          isElectron={isElectron}
          isOnline={isOnline}
        />
      </div>
    );
  }

  // Sync status banner
  if (syncStatus === 'syncing') {
    return (
      <div className="sticky bottom-0 z-30">
        <SyncBanner />
      </div>
    );
  }

  return null;
};

// Connection Banner Component
const ConnectionBanner = ({ connectionStatus, onReconnect }) => {
  const getBannerConfig = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          bgColor: 'bg-yellow-500',
          icon: <FaSync className="h-4 w-4 animate-spin" />,
          message: 'Connecting to chat service...',
          showButton: false
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          icon: <FaExclamationTriangle className="h-4 w-4" />,
          message: 'Failed to connect to chat service',
          showButton: true
        };
      case 'disconnected':
        return {
          bgColor: 'bg-gray-500',
          icon: <FaExclamationTriangle className="h-4 w-4" />,
          message: 'You are currently offline',
          showButton: true
        };
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <div className={`p-3 text-center text-white ${config.bgColor}`}>
      <div className="flex items-center justify-center space-x-2 text-sm">
        {config.icon}
        <span>{config.message}</span>
        {config.showButton && (
          <button 
            onClick={onReconnect}
            className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors text-sm"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

// Offline Banner Component
const OfflineBanner = ({ pendingSyncCount, onManualSync, isElectron, isOnline }) => (
  <div className="bg-yellow-500 text-white p-3 text-center">
    <div className="flex items-center justify-center space-x-2 text-sm">
      <FaExclamationTriangle className="h-4 w-4" />
      <span>You are currently offline. Some features may be limited.</span>
      {pendingSyncCount > 0 && (
        <span className="bg-white text-yellow-600 px-2 py-1 rounded-full text-xs font-medium">
          {pendingSyncCount} items pending sync
        </span>
      )}
      {isElectron && (
        <button 
          onClick={onManualSync}
          disabled={!isOnline}
          className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Sync Now
        </button>
      )}
    </div>
  </div>
);

// Sync Banner Component
const SyncBanner = () => (
  <div className="bg-blue-500 text-white p-3 text-center">
    <div className="flex items-center justify-center space-x-2 text-sm">
      <FaSync className="h-4 w-4 animate-spin" />
      <span>Syncing data with server...</span>
    </div>
  </div>
);

export default WholesalerDashboard;