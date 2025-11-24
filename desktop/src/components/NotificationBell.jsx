// components/NotificationBell.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  FaBell, 
  FaTimes, 
  FaBox, 
  FaShoppingCart, 
  FaExclamationTriangle, 
  FaSync,
  FaWifi,
  FaPause,
  FaPlay
} from 'react-icons/fa';

const NotificationBell = ({ isElectron, isDarkMode }) => {
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const { isConnected, socket } = useSocket();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingStatus, setPollingStatus] = useState('idle');
  
  const dropdownRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Simple fetch function with polling support
  const fetchNotifications = useCallback(async (isPolling = false) => {
    if (!user?._id) return;

    // Cancel previous request if still in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (isPolling) {
        setPollingStatus('checking');
      } else {
        setLoading(true);
      }

      console.log(`📡 ${isPolling ? 'Polling' : 'Fetching'} notifications...`);
      
      const timestamp = Date.now();
      const response = await fetch(
        `${API_BASE_URL}/api/notifications?limit=20&unreadOnly=false&timestamp=${timestamp}`,
        { 
          headers: getAuthHeaders(),
          cache: 'no-cache',
          signal: abortControllerRef.current.signal
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
          setLastUpdate(new Date().toISOString());
          
          if (isPolling) {
            setLastChecked(new Date().toISOString());
            setPollingStatus('success');
          }
          
          console.log(`✅ ${isPolling ? 'Polling' : 'Fetch'} successful: ${data.notifications?.length || 0} notifications`);
        }
      } else {
        console.error(`❌ ${isPolling ? 'Polling' : 'Fetch'} failed:`, response.status);
        if (isPolling) {
          setPollingStatus('error');
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`❌ Error ${isPolling ? 'polling' : 'fetching'} notifications:`, error);
        if (isPolling) {
          setPollingStatus('error');
        }
      }
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, [user, API_BASE_URL, getAuthHeaders]);

  // Setup polling interval with visibility control
  const startPolling = useCallback(() => {
    if (!pollingEnabled || !user?._id) return;

    console.log('🔄 Starting notification polling (10s interval)');
    
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial poll
    fetchNotifications(true);

    // Set up interval for polling
    pollingIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
      }
    }, 10000); // 10 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingEnabled, user, fetchNotifications]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('⏸️ Polling stopped');
    }
  }, []);

  // Toggle polling
  const togglePolling = useCallback(() => {
    const newPollingState = !pollingEnabled;
    setPollingEnabled(newPollingState);
    
    if (newPollingState) {
      startPolling();
    } else {
      stopPolling();
    }
    
    console.log(`🔔 Polling ${newPollingState ? 'enabled' : 'disabled'}`);
  }, [pollingEnabled, startPolling, stopPolling]);

  // Setup real-time listeners as backup
  const setupRealTimeListeners = useCallback(() => {
    if (!socket) {
      console.log('❌ No socket available for real-time notifications');
      return () => {};
    }

    console.log('🔔 Setting up real-time notification listeners (backup)');

    // Listen for new notifications
    const handleNewNotification = (data) => {
      console.log('🔔 REAL-TIME: New notification received:', data);
      
      const newNotification = {
        _id: data.notification?._id || `temp-${Date.now()}`,
        type: data.type || data.notification?.type,
        title: data.notification?.title || data.title,
        message: data.notification?.message || data.message,
        data: data.notification?.data || data.data,
        read: false,
        createdAt: data.notification?.createdAt || new Date().toISOString()
      };

      // Add to top of list
      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
      setLastUpdate(new Date().toISOString());

      // Show desktop notification
      if (isElectron && window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          newNotification.title,
          newNotification.message
        );
      }
    };

    // Listen for new orders specifically
    const handleNewOrder = (data) => {
      console.log('🛒 REAL-TIME: New order received:', data);
      
      const newNotification = {
        _id: data.order?._id || `order-${Date.now()}`,
        type: 'new_order',
        title: 'New Order Received',
        message: `New order from ${data.order?.retailer?.businessName || 'a retailer'}`,
        data: {
          orderId: data.order?._id,
          productName: data.order?.product?.name,
          quantity: data.order?.quantity,
          retailerName: data.order?.retailer?.businessName,
          totalPrice: data.order?.totalPrice,
          measurementUnit: data.order?.measurementUnit
        },
        read: false,
        createdAt: new Date().toISOString()
      };

      // Add to top of list
      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
      setLastUpdate(new Date().toISOString());

      // Show desktop notification
      if (isElectron && window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          'New Order Received',
          `You have a new order for ${data.order?.quantity} ${data.order?.measurementUnit} of ${data.order?.product?.name}`
        );
      }
    };

    // Setup event listeners
    socket.on('new_notification', handleNewNotification);
    socket.on('new_order', handleNewOrder);
    socket.on('notification_created', handleNewNotification);

    console.log('✅ Real-time listeners setup complete');

    // Cleanup function
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('new_order', handleNewOrder);
      socket.off('notification_created', handleNewNotification);
    };
  }, [socket, isElectron]);

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        // Revert on error
        fetchNotifications(false);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      fetchNotifications(false);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);

      await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: 'PUT',
          headers: getAuthHeaders()
        }
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }

    if (notification.data?.orderId) {
      window.dispatchEvent(new CustomEvent('navigateToTab', { 
        detail: { tab: 'orders' } 
      }));
    }

    setIsOpen(false);
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
        return <FaShoppingCart className="text-green-500" />;
      case 'order_status_update':
        return <FaBox className="text-blue-500" />;
      case 'order_delivered':
        return <FaBox className="text-green-500" />;
      case 'order_disputed':
        return <FaExclamationTriangle className="text-red-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get polling status text
  const getPollingStatusText = () => {
    switch (pollingStatus) {
      case 'checking':
        return 'Checking...';
      case 'success':
        return 'Last check successful';
      case 'error':
        return 'Last check failed';
      default:
        return 'Idle';
    }
  };

  // Get polling status color
  const getPollingStatusColor = () => {
    switch (pollingStatus) {
      case 'checking':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-500';
    }
  };

  // Main useEffect
  useEffect(() => {
    if (user?._id) {
      console.log('🔄 Initializing notification system for user:', user._id);
      
      // Initial fetch
      fetchNotifications(false);
      
      // Setup real-time listeners if socket is available
      const cleanupListeners = setupRealTimeListeners();
      
      // Start polling (primary method)
      const cleanupPolling = startPolling();

      return () => {
        cleanupListeners();
        if (cleanupPolling) cleanupPolling();
        
        // Clean up abort controller
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [user, fetchNotifications, setupRealTimeListeners, startPolling]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pollingEnabled) {
        // Refresh immediately when tab becomes visible
        fetchNotifications(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollingEnabled, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [stopPolling]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-300' 
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        aria-label="Notifications"
        title={`Notifications - Polling ${pollingEnabled ? 'ON (10s)' : 'OFF'}`}
      >
        <FaBell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Polling status indicator */}
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 ${
          isDarkMode ? 'border-gray-800' : 'border-white'
        } ${
          pollingEnabled ? 'bg-green-500' : 'bg-gray-400'
        }`}></div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 top-12 w-80 sm:w-96 rounded-xl shadow-lg border z-50 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`p-4 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <div className="flex items-center space-x-2">
                {/* Polling Toggle */}
                <button
                  onClick={togglePolling}
                  className={`p-1 rounded transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-100'
                  } ${pollingEnabled ? 'text-green-500' : 'text-gray-400'}`}
                  title={pollingEnabled ? 'Disable auto-refresh (10s)' : 'Enable auto-refresh (10s)'}
                >
                  {pollingEnabled ? <FaWifi className="w-4 h-4" /> : <FaPause className="w-4 h-4" />}
                </button>
                
                {/* Refresh Button */}
                <button
                  onClick={() => fetchNotifications(false)}
                  disabled={loading}
                  className={`p-1 rounded transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400' 
                      : 'hover:bg-gray-100 text-gray-500'
                  } ${loading ? 'animate-spin' : ''}`}
                  title="Refresh notifications now"
                >
                  <FaSync className="w-4 h-4" />
                </button>
                
                {/* Mark All Read */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Mark all read
                  </button>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400' 
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Polling Status */}
            <div className="flex items-center justify-between text-xs">
              <div className="space-x-3">
                <span className={pollingEnabled ? 'text-green-500' : 'text-gray-500'}>
                  {pollingEnabled ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
                </span>
                <span className={isConnected ? 'text-green-500' : 'text-yellow-500'}>
                  {isConnected ? '🔔 Real-time backup' : '📡 Polling only'}
                </span>
              </div>
              
              <div className="text-right space-y-1">
                {lastUpdate && (
                  <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Updated: {formatTime(lastUpdate)}
                  </div>
                )}
                {lastChecked && pollingStatus !== 'checking' && (
                  <div className={getPollingStatusColor()}>
                    {getPollingStatusText()}: {formatTime(lastChecked)}
                  </div>
                )}
                {pollingStatus === 'checking' && (
                  <div className="text-blue-500 animate-pulse">Checking for updates...</div>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && pollingStatus !== 'checking' ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <FaBell className="mx-auto text-3xl text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">No notifications</p>
                <p className="text-gray-400 text-xs mt-1">
                  {pollingEnabled ? 
                    'Auto-refreshing every 10 seconds' : 
                    'Auto-refresh is disabled - click refresh to check'
                  }
                </p>
                {!pollingEnabled && (
                  <p className="text-yellow-500 text-xs mt-2">
                    Auto-refresh is disabled - enable for automatic checks
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors duration-200 ${
                      notification.read
                        ? isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                        : isDarkMode ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        } mb-1 line-clamp-2`}>
                          {notification.message}
                        </p>
                        {notification.data && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                            {notification.data.productName && (
                              <div>Product: {notification.data.productName}</div>
                            )}
                            {notification.data.quantity && (
                              <div>Quantity: {notification.data.quantity} {notification.data.measurementUnit}</div>
                            )}
                            {notification.data.totalPrice && (
                              <div>Total: UGX {notification.data.totalPrice?.toLocaleString()}</div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`p-3 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            } text-center`}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigateToTab', { 
                    detail: { tab: 'orders' } 
                  }));
                  setIsOpen(false);
                }}
                className={`text-sm font-medium ${
                  isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                View All Orders
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;