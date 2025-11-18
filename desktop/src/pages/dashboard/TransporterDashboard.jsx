// src/pages/dashboard/TransporterDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaTruck, 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaClock,
  FaShippingFast,
  FaRoute,
  FaCalendarAlt,
  FaDollarSign,
  FaComments,
  FaSun,
  FaMoon,
  FaTools,
  FaToggleOn,
  FaToggleOff,
  FaClipboardList,
  FaBox,
  FaBars,
  FaSync,
  FaWifi,
  FaDownload,
  FaSignal,
  FaExclamationTriangle,
  FaHome,
  FaCog
} from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Settings from '../../components/Settings';
import CustomTitleBar from '../../components/CustomTitleBar';
import DesktopChatContainer from '../../components/ChatComponents/DesktopChatContainer';

// Import transporter components
import OverView from '../../components/TransporterComponents/OverView';
import Deliveries from '../../components/TransporterComponents/Deliveries';
import Vehicles from '../../components/TransporterComponents/Vehicles';
import RoutesComponent from '../../components/TransporterComponents/Routes';
import Schedule from '../../components/TransporterComponents/Schedule';
import Earnings from '../../components/TransporterComponents/Earnings';
import TransporterOrders from '../../components/TransporterComponents/TransporterOrders';
import SupplierOrders from '../../components/TransporterComponents/SupplierOrders';

const TransporterDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [isActive, setIsActive] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
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
    
    // Listen for navigation events from child components
    const handleNavigateToTab = (event) => {
      const { tab } = event.detail;
      setActiveTab(tab);
    };

    window.addEventListener('navigateToTab', handleNavigateToTab);

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

    // Fetch transporter status
    fetchTransporterStatus();

    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isElectron]);

  // Fetch transporter's active status
  const fetchTransporterStatus = async () => {
    try {
      const statusData = await safeElectronAPI.storage.getPersistent('transporter_status');
      if (statusData.success && statusData.value !== null) {
        setIsActive(statusData.value);
      } else {
        // Default to inactive if no status stored
        setIsActive(false);
        await safeElectronAPI.storage.setPersistent('transporter_status', false);
      }
    } catch (error) {
      console.error('Error fetching transporter status:', error);
      setIsActive(false);
    }
  };

  // Safe Electron menu event setup
  const setupDesktopFeatures = async () => {
    if (!isElectron) return;

    try {
      // Setup menu handlers if they exist
      if (typeof window.electronAPI?.onMenuBackToRole === 'function') {
        window.electronAPI.onMenuBackToRole(() => {
          logout();
        });
      }

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

      if (typeof window.electronAPI?.onMenuViewDeliveries === 'function') {
        window.electronAPI.onMenuViewDeliveries(() => {
          setActiveTab('deliveries');
        });
      }

      if (typeof window.electronAPI?.onMenuToggleStatus === 'function') {
        window.electronAPI.onMenuToggleStatus(() => {
          toggleActiveStatus();
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
      const pendingDeliveries = await safeElectronAPI.storage.getPersistent('pending_deliveries');
      const pendingRoutes = await safeElectronAPI.storage.getPersistent('pending_routes');
      const pendingEarnings = await safeElectronAPI.storage.getPersistent('pending_earnings');
      
      let totalPending = 0;
      if (pendingDeliveries.success && pendingDeliveries.value) {
        totalPending += pendingDeliveries.value.length;
      }
      if (pendingRoutes.success && pendingRoutes.value) {
        totalPending += pendingRoutes.value.length;
      }
      if (pendingEarnings.success && pendingEarnings.value) {
        totalPending += pendingEarnings.value.length;
      }
      
      setPendingSyncCount(totalPending);
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const checkPendingSync = async () => {
    if (!isElectron) return;

    try {
      const pendingDeliveries = await safeElectronAPI.storage.getPersistent('pending_deliveries');
      const pendingRoutes = await safeElectronAPI.storage.getPersistent('pending_routes');
      const pendingEarnings = await safeElectronAPI.storage.getPersistent('pending_earnings');
      
      let totalPending = 0;
      if (pendingDeliveries.success && pendingDeliveries.value) {
        totalPending += pendingDeliveries.value.length;
      }
      if (pendingRoutes.success && pendingRoutes.value) {
        totalPending += pendingRoutes.value.length;
      }
      if (pendingEarnings.success && pendingEarnings.value) {
        totalPending += pendingEarnings.value.length;
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
      await safeElectronAPI.storage.setPersistent('pending_deliveries', []);
      await safeElectronAPI.storage.setPersistent('pending_routes', []);
      await safeElectronAPI.storage.setPersistent('pending_earnings', []);
      
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

  const toggleActiveStatus = async () => {
    setLoadingStatus(true);
    try {
      const newStatus = !isActive;
      
      // Store status locally for offline use
      await safeElectronAPI.storage.setPersistent('transporter_status', newStatus);
      
      // If online, sync with server
      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Add to pending sync if offline
        if (!isOnline) {
          const pendingStatus = await safeElectronAPI.storage.getPersistent('pending_status_updates');
          const updates = pendingStatus.success && pendingStatus.value ? pendingStatus.value : [];
          updates.push({
            transporterId: user._id,
            isActive: newStatus,
            timestamp: new Date().toISOString()
          });
          await safeElectronAPI.storage.setPersistent('pending_status_updates', updates);
          setPendingSyncCount(prev => prev + 1);
        }
      }
      
      setIsActive(newStatus);
      
      safeElectronAPI.showNotification(
        'Status Updated', 
        `You are now ${newStatus ? 'active' : 'inactive'}`
      );
      
    } catch (error) {
      console.error('Error updating transporter status:', error);
      safeElectronAPI.showNotification('Update Failed', 'Could not update status');
    } finally {
      setLoadingStatus(false);
    }
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
          syncStatus,
          transporterStatus: isActive ? 'active' : 'inactive'
        },
        businessData: {
          // Include relevant business data for transporter
          activeDeliveries: 12,
          totalVehicles: 8,
          monthlyEarnings: 12500,
          completedRoutes: 45
        }
      };

      const result = await safeElectronAPI.saveRegistrationData(
        exportData,
        `transporter-export-${new Date().getTime()}.json`
      );

      if (result.success) {
        safeElectronAPI.showNotification(
          'Export Successful',
          'Transporter data exported successfully'
        );
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  // Function to trigger chat opening with filter
  const openChatWithFilter = (roleFilter = '') => {
    const event = new CustomEvent('openChatWithFilter', { 
      detail: { filter: roleFilter } 
    });
    window.dispatchEvent(event);
    setActiveTab('chat');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Enhanced content renderer with proper error handling and dark mode
  const renderContent = () => {
    const commonProps = {
      isElectron,
      isOnline,
      onSync: triggerAutoSync,
      syncStatus,
      pendingSyncCount,
      onMessageWholesaler: openChatWithFilter,
      isDarkMode,
      transporterStatus: isActive,
      onToggleStatus: toggleActiveStatus
    };

    try {
      switch (activeTab) {
        case 'overview':
          return <OverView {...commonProps} />;
        case 'settings':
          return <Settings {...commonProps} />;
        case 'deliveries':
          return <Deliveries {...commonProps} />;
        case 'vehicles':
          return <Vehicles {...commonProps} />;
        case 'routes':
          return <RoutesComponent {...commonProps} />;
        case 'schedule':
          return <Schedule {...commonProps} />;
        case 'earnings':
          return <Earnings {...commonProps} />;
        case 'w-orders':
          return <TransporterOrders {...commonProps} />;
        case 's-orders':
          return <SupplierOrders {...commonProps} />;
        case 'chat':
          return (
            <div className="h-full w-full">
              <DesktopChatContainer 
                connectionStatus={connectionStatus}
                onReconnect={handleReconnectChat}
                userRole={user?.role}
                user={user}
                isDarkMode={isDarkMode}
              />
            </div>
          );
        default:
          return <OverView {...commonProps} />;
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
          userRole="transporter"
          isDarkMode={isDarkMode}
          additionalControls={
            <button
              onClick={toggleActiveStatus}
              disabled={loadingStatus}
              className={`flex items-center px-3 py-1 rounded text-xs font-medium transition-colors ${
                isActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {loadingStatus ? (
                <FaSync className="h-3 w-3 mr-1 animate-spin" />
              ) : isActive ? (
                <FaToggleOn className="h-3 w-3 mr-1" />
              ) : (
                <FaToggleOff className="h-3 w-3 mr-1" />
              )}
              {isActive ? 'Active' : 'Inactive'}
            </button>
          }
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
          userRole="transporter"
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

export default TransporterDashboard;