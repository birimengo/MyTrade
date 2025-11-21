// src/pages/dashboard/SupplierDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaWarehouse, 
  FaShippingFast, 
  FaUsers, 
  FaDollarSign,
  FaClipboardList,
  FaIndustry,
  FaBox,
  FaComments,
  FaSun,
  FaMoon,
  FaTools,
  FaBoxes,
  FaChartLine,
  FaUserTie,
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

// Import all supplier components
import Overview from '../../components/SupplierComponents/OverView';
import Materials from '../../components/SupplierComponents/Materials';
import Production from '../../components/SupplierComponents/Production';
import MyStock from '../../components/SupplierComponents/MyStock';
import Shipments from '../../components/SupplierComponents/Shipments';
import Clients from '../../components/SupplierComponents/Clients';
import Orders from '../../components/SupplierComponents/Orders';
import ViewOrderDetails from '../../components/SupplierComponents/ViewOrderDetails'; // ADDED IMPORT
import DesktopChatContainer from '../../components/ChatComponents/DesktopChatContainer';

const SupplierDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [selectedOrderData, setSelectedOrderData] = useState(null); // ADDED STATE for order details
  const isElectron = window.electronAPI;

  // Safe Electron API access with fallbacks
  const safeElectronAPI = {
    showNotification: (title, message) => {
      if (isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (isElectron && typeof window.electronAPI?.storage?.getPersistent === 'function') {
          return await window.electronAPI.storage.getPersistent(key);
        }
        // Fallback to localStorage
        try {
          const value = localStorage.getItem(`electron_${key}`);
          return { success: true, value: value ? JSON.parse(value) : null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      setPersistent: async (key, value) => {
        if (isElectron && typeof window.electronAPI?.storage?.setPersistent === 'function') {
          return await window.electronAPI.storage.setPersistent(key, value);
        }
        // Fallback to localStorage
        try {
          localStorage.setItem(`electron_${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    saveRegistrationData: async (data, filename) => {
      if (isElectron && typeof window.electronAPI?.saveRegistrationData === 'function') {
        return await window.electronAPI.saveRegistrationData(data, filename);
      }
      // Fallback: download as JSON file
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  // Initialize desktop features and connection monitoring
  useEffect(() => {
    setupDesktopFeatures();
    
    // Listen for navigation events from child components - EXPANDED to handle order details
    const handleNavigateToTab = (event) => {
      const { tab, orderData, orderId } = event.detail;
      setActiveTab(tab);
      
      // Handle order details navigation with data
      if (tab === 'order-details' && (orderData || orderId)) {
        setSelectedOrderData(orderData || { id: orderId });
      } else if (tab !== 'order-details') {
        setSelectedOrderData(null); // Clear order data when navigating away
      }
    };

    // Listen for order details specific events
    const handleOpenOrderDetails = (event) => {
      const { orderData, orderId } = event.detail;
      setActiveTab('order-details');
      setSelectedOrderData(orderData || { id: orderId });
    };

    window.addEventListener('navigateToTab', handleNavigateToTab);
    window.addEventListener('openOrderDetails', handleOpenOrderDetails); // ADDED EVENT LISTENER

    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
      safeElectronAPI.showNotification('Back Online', 'Connection restored. Syncing data...');
      triggerAutoSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
      safeElectronAPI.showNotification('Offline Mode', 'Working with cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending sync items on startup
    checkPendingSync();

    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab);
      window.removeEventListener('openOrderDetails', handleOpenOrderDetails); // ADDED CLEANUP
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isElectron]);

  // Safe Electron menu event setup
  const setupDesktopFeatures = async () => {
    if (!isElectron) return;

    try {
      // Only setup menu handlers if they exist
      if (typeof window.electronAPI?.onMenuNewRegistration === 'function') {
        window.electronAPI.onMenuNewRegistration(() => {
          console.log('New registration menu clicked');
          // Handle new registration from menu
        });
      }

      if (typeof window.electronAPI?.onMenuBackToRole === 'function') {
        window.electronAPI.onMenuBackToRole(() => {
          logout();
        });
      }

      // These might not exist in your preload script, so we'll handle them gracefully
      if (typeof window.electronAPI?.onMenuExportData === 'function') {
        window.electronAPI.onMenuExportData(() => {
          handleExportAllData();
        });
      }

      if (typeof window.electronAPI?.onMenuManualSync === 'function') {
        window.electronAPI.onMenuManualSync(() => {
          handleManualSync();
        });
      }

      // ADDED: Menu handler for order management
      if (typeof window.electronAPI?.onMenuViewOrders === 'function') {
        window.electronAPI.onMenuViewOrders(() => {
          setActiveTab('orders');
        });
      }

      // Load any offline data
      await loadOfflineData();
    } catch (error) {
      console.warn('Electron menu setup failed:', error);
      // Continue without menu handlers
    }
  };

  const loadOfflineData = async () => {
    if (!isElectron) return;

    try {
      const pendingOrders = await safeElectronAPI.storage.getPersistent('pending_orders');
      const pendingMaterials = await safeElectronAPI.storage.getPersistent('pending_materials');
      const pendingProduction = await safeElectronAPI.storage.getPersistent('pending_production');
      const orderDetails = await safeElectronAPI.storage.getPersistent('cached_order_details'); // ADDED: Load cached order details
      
      let totalPending = 0;
      if (pendingOrders.success && pendingOrders.value) {
        totalPending += pendingOrders.value.length;
      }
      if (pendingMaterials.success && pendingMaterials.value) {
        totalPending += pendingMaterials.value.length;
      }
      if (pendingProduction.success && pendingProduction.value) {
        totalPending += pendingProduction.value.length;
      }
      
      setPendingSyncCount(totalPending);

      // ADDED: Set cached order details if available
      if (orderDetails.success && orderDetails.value) {
        setSelectedOrderData(orderDetails.value);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const checkPendingSync = async () => {
    if (!isElectron) return;

    try {
      const pendingOrders = await safeElectronAPI.storage.getPersistent('pending_orders');
      const pendingMaterials = await safeElectronAPI.storage.getPersistent('pending_materials');
      const pendingProduction = await safeElectronAPI.storage.getPersistent('pending_production');
      
      let totalPending = 0;
      if (pendingOrders.success && pendingOrders.value) {
        totalPending += pendingOrders.value.length;
      }
      if (pendingMaterials.success && pendingMaterials.value) {
        totalPending += pendingMaterials.value.length;
      }
      if (pendingProduction.success && pendingProduction.value) {
        totalPending += pendingProduction.value.length;
      }
      
      setPendingSyncCount(totalPending);
    } catch (error) {
      console.error('Error checking pending sync:', error);
    }
  };

  const triggerAutoSync = async () => {
    if (!isElectron || !isOnline) return;

    setSyncStatus('syncing');
    setConnectionStatus('connecting');
    
    try {
      // Simulate syncing process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear pending data after successful sync
      await safeElectronAPI.storage.setPersistent('pending_orders', []);
      await safeElectronAPI.storage.setPersistent('pending_materials', []);
      await safeElectronAPI.storage.setPersistent('pending_production', []);
      
      setPendingSyncCount(0);
      setSyncStatus('success');
      setConnectionStatus('connected');
      
      safeElectronAPI.showNotification('Sync Complete', 'All pending data has been synchronized');
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setConnectionStatus('error');
      safeElectronAPI.showNotification('Sync Failed', 'Could not synchronize data');
      setTimeout(() => {
        setSyncStatus('idle');
        setConnectionStatus(isOnline ? 'connected' : 'disconnected');
      }, 3000);
    }
  };

  const handleManualSync = () => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot sync without internet connection');
      return;
    }
    triggerAutoSync();
  };

  // Enhanced chat reconnection handler
  const handleReconnectChat = async () => {
    setConnectionStatus('connecting');
    safeElectronAPI.showNotification('Reconnecting', 'Attempting to reconnect chat service...');
    
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (isOnline) {
            setConnectionStatus('connected');
            safeElectronAPI.showNotification('Reconnected', 'Chat service reconnected successfully');
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
      safeElectronAPI.showNotification('Connection Failed', 'Unable to connect to chat service');
    }
  };

  const handleExportAllData = async () => {
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
          // Include relevant business data for supplier
          totalMaterials: 156,
          activeProductions: 23,
          monthlyShipments: 67,
          activeClients: 45
        }
      };

      const result = await safeElectronAPI.saveRegistrationData(
        exportData,
        `supplier-export-${new Date().getTime()}.json`
      );

      if (result.success) {
        safeElectronAPI.showNotification(
          'Export Successful',
          'Supplier data exported successfully'
        );
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  // Function to trigger chat opening with filter (for clients component)
  const openChatWithFilter = (roleFilter = '') => {
    // This can be used by child components to open chat with specific filters
    const event = new CustomEvent('openChatWithFilter', { 
      detail: { filter: roleFilter } 
    });
    window.dispatchEvent(event);
    setActiveTab('chat');
  };

  // ADDED: Function to handle order details navigation
  const handleOpenOrderDetails = (orderData) => {
    setActiveTab('order-details');
    setSelectedOrderData(orderData);
    
    // Cache order details for offline access
    if (isElectron) {
      safeElectronAPI.storage.setPersistent('cached_order_details', orderData);
    }
  };

  // ADDED: Function to navigate back to orders list
  const handleBackToOrders = () => {
    setActiveTab('orders');
    setSelectedOrderData(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Enhanced content renderer with proper error handling and dark mode - EXPANDED with order-details
  const renderContent = () => {
    const commonProps = {
      isElectron,
      isOnline,
      onSync: triggerAutoSync,
      syncStatus,
      pendingSyncCount,
      onMessageWholesaler: openChatWithFilter,
      isDarkMode, // CRITICAL: Pass dark mode to all components
      onOpenOrderDetails: handleOpenOrderDetails, // ADDED: Pass order details handler
      onBackToOrders: handleBackToOrders // ADDED: Pass back navigation handler
    };

    // ADDED: Specific props for order details
    const orderDetailsProps = {
      ...commonProps,
      orderData: selectedOrderData,
      onBack: handleBackToOrders
    };

    try {
      switch (activeTab) {
        case 'overview':
          return <Overview {...commonProps} />;
        case 'settings':
          return <Settings {...commonProps} />;
        case 'materials':
          return <Materials {...commonProps} />;
        case 'production':
          return <Production {...commonProps} />;
        case 'mystock':
          return <MyStock {...commonProps} />;
        case 'shipments':
          return <Shipments {...commonProps} />;
        case 'clients':
          return <Clients {...commonProps} />;
        case 'orders':
          return <Orders {...commonProps} />;
        case 'order-details': // ADDED CASE for order details
          return <ViewOrderDetails {...orderDetailsProps} />;
        case 'chat':
          return (
            <div className="h-full w-full">
              <DesktopChatContainer 
                connectionStatus={connectionStatus}
                onReconnect={handleReconnectChat}
                userRole={user?.role}
                user={user}
                isDarkMode={isDarkMode} // Pass dark mode to chat
              />
            </div>
          );
        default:
          return <Overview {...commonProps} />;
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12">
            <FaExclamationTriangle className="mx-auto text-4xl text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Content</h3>
            <p className="text-gray-500 dark:text-gray-400">There was a problem loading this section. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
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
      default: return isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400';
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
      return <FaSync className="h-3 w-3 animate-spin text-yellow-500" />;
    }
    return isOnline ? 
      <FaWifi className="h-3 w-3 text-green-500" /> : 
      <FaSignal className="h-3 w-3 text-red-500" />;
  };

  // Mobile menu button for smaller screens (non-Electron)
  const MobileMenuButton = () => (
    <button
      onClick={toggleSidebar}
      className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
    >
      <FaBars className="h-5 w-5 text-gray-600 dark:text-gray-300" />
    </button>
  );

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
          onExportData={handleExportAllData}
          userRole="supplier"
          isDarkMode={isDarkMode}
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
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          isElectron={isElectron}
          userRole="supplier"
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0 lg:ml-64'
      } ${isElectron ? 'mt-0' : 'mt-0'}`}>
        
        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <main className="p-4 sm:p-6 lg:p-8 h-full">
            {renderContent()}
          </main>
        </div>

        {/* Enhanced Connection Status Banner */}
        {activeTab === 'chat' && connectionStatus !== 'connected' && (
          <div className="sticky bottom-0 z-30">
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
                {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
                  <button 
                    onClick={handleReconnectChat}
                    className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors text-sm"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Offline Banner for other tabs */}
        {!isOnline && activeTab !== 'chat' && (
          <div className="sticky bottom-0 z-30">
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
                    onClick={handleManualSync}
                    disabled={!isOnline}
                    className="ml-2 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Sync Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sync Status Banner */}
        {syncStatus === 'syncing' && (
          <div className="sticky bottom-0 z-30 bg-blue-500 text-white p-3 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <FaSync className="h-4 w-4 animate-spin" />
              <span>Syncing data with server...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;