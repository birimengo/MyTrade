// components/TransporterComponents/SupplierOrders.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaSpinner, 
  FaTruck, 
  FaSearch, 
  FaFilter, 
  FaSync, 
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBox,
  FaUser,
  FaBuilding,
  FaMoneyBillWave,
  FaInfoCircle,
  FaSignOutAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const SupplierOrders = ({ isElectron, isOnline, onSync, syncStatus, pendingSyncCount, isDarkMode }) => {
  const { user, getAuthHeaders, logout, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    type: 'all'
  });
  const [imageIndices, setImageIndices] = useState({});
  const [statistics, setStatistics] = useState({});
  const [availableReturnOrders, setAvailableReturnOrders] = useState([]);
  const [offlineData, setOfflineData] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [authError, setAuthError] = useState(false);

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
    }
  };

  // Enhanced authentication check
  const checkAuthentication = () => {
    if (!isAuthenticated || !user) {
      setAuthError(true);
      return false;
    }
    return true;
  };

  // Enhanced API request function with proper auth handling
  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!checkAuthentication()) {
      throw new Error('User not authenticated');
    }

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        setAuthError(true);
        safeElectronAPI.showNotification('Session Expired', 'Please login again');
        // Optionally trigger logout after a delay
        setTimeout(() => {
          logout();
        }, 2000);
        throw new Error('Authentication failed - Please login again');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error.message.includes('Authentication failed')) {
        throw error; // Re-throw auth errors
      }
      throw new Error(`Network error: ${error.message}`);
    }
  };

  // Load offline data on component mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  // Fetch orders assigned to this transporter
  useEffect(() => {
    if (isOnline && checkAuthentication()) {
      fetchOrders();
    } else if (!isOnline) {
      // Use offline data when not online
      setOrders(offlineData);
      setLoading(false);
    }
  }, [filters.type, isOnline, isAuthenticated]);

  // Fetch available return orders that can be accepted
  useEffect(() => {
    if (isOnline && checkAuthentication()) {
      fetchAvailableReturnOrders();
    }
  }, [isOnline, isAuthenticated]);

  const loadOfflineData = async () => {
    try {
      const offlineOrders = await safeElectronAPI.storage.getPersistent('supplier_orders_offline');
      if (offlineOrders.success && offlineOrders.value) {
        setOfflineData(offlineOrders.value);
      }
      
      const lastSyncData = await safeElectronAPI.storage.getPersistent('supplier_orders_last_sync');
      if (lastSyncData.success && lastSyncData.value) {
        setLastSync(lastSyncData.value);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = async (ordersData) => {
    try {
      await safeElectronAPI.storage.setPersistent('supplier_orders_offline', ordersData);
      await safeElectronAPI.storage.setPersistent('supplier_orders_last_sync', new Date().toISOString());
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      if (!checkAuthentication()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setAuthError(false);
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/transporters/assigned-orders?type=${filters.type}`
      );

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Fetched assigned orders:', data.orders);
        setOrders(data.orders || []);
        setStatistics(data.statistics || {});
        
        // Save to offline storage
        await saveOfflineData(data.orders || []);
        
        // Initialize image indices for each order
        const initialIndices = {};
        data.orders.forEach(order => {
          initialIndices[order._id] = 0;
        });
        setImageIndices(initialIndices);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      if (error.message.includes('Authentication failed')) {
        setAuthError(true);
      } else if (!isOnline) {
        // Use offline data when fetch fails and we're offline
        setOrders(offlineData);
      } else {
        safeElectronAPI.showNotification('Sync Failed', 'Could not fetch orders from server');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableReturnOrders = async () => {
    try {
      if (!checkAuthentication()) {
        return;
      }

      const response = await makeAuthenticatedRequest(
        'http://localhost:5000/api/transporters/return-orders'
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Fetched available return orders:', data.orders);
          setAvailableReturnOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching available return orders:', error);
      if (error.message.includes('Authentication failed')) {
        setAuthError(true);
      }
    }
  };

  // Enhanced update order status with proper auth
  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    try {
      if (!checkAuthentication()) {
        safeElectronAPI.showNotification('Authentication Required', 'Please login to update orders');
        return;
      }

      console.log('🔄 Frontend - Updating order status:', { 
        orderId, 
        newStatus, 
        notes,
        isOnline
      });
      
      const updateData = {
        orderId,
        newStatus,
        notes,
        timestamp: new Date().toISOString()
      };

      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      if (isOnline) {
        // Online: Update server immediately
        const response = await makeAuthenticatedRequest(
          `http://localhost:5000/api/transporters/orders/${orderId}/status`,
          {
            method: 'PUT',
            body: JSON.stringify({ 
              status: newStatus,
              notes: notes
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Frontend - Success:', data);
          safeElectronAPI.showNotification('Status Updated', `Order status updated to ${newStatus.replace(/_/g, ' ')}`);
        } else {
          throw new Error('Server update failed');
        }
      } else {
        // Offline: Store update for later sync
        const pendingUpdates = await safeElectronAPI.storage.getPersistent('pending_order_updates');
        const updates = pendingUpdates.success && pendingUpdates.value ? pendingUpdates.value : [];
        updates.push(updateData);
        await safeElectronAPI.storage.setPersistent('pending_order_updates', updates);
        
        safeElectronAPI.showNotification('Update Queued', 'Order update saved for sync when online');
      }
    } catch (error) {
      console.error('💥 Frontend - Update error:', error);
      if (error.message.includes('Authentication failed')) {
        setAuthError(true);
      } else {
        safeElectronAPI.showNotification('Update Failed', 'Could not update order status');
      }
      
      // Revert local state on error
      fetchOrders(); // Refresh to get correct state
    }
  };

  // Enhanced accept return order with proper auth
  const acceptReturnOrder = async (orderId) => {
    try {
      if (!checkAuthentication()) {
        safeElectronAPI.showNotification('Authentication Required', 'Please login to accept returns');
        return;
      }

      console.log('🔄 Frontend - Accepting return order:', orderId);
      
      // Update local state immediately
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? { ...order, status: 'return_accepted' } : order
        )
      );
      
      setAvailableReturnOrders(prev => prev.filter(order => order._id !== orderId));

      if (isOnline) {
        const response = await makeAuthenticatedRequest(
          `http://localhost:5000/api/transporters/return-orders/${orderId}/accept`,
          {
            method: 'PUT'
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Frontend - Return order accepted:', data);
          safeElectronAPI.showNotification('Return Accepted', 'Return order accepted successfully!');
        } else {
          throw new Error('Server update failed');
        }
      } else {
        // Offline: Store for sync
        const pendingReturns = await safeElectronAPI.storage.getPersistent('pending_return_acceptances');
        const returns = pendingReturns.success && pendingReturns.value ? pendingReturns.value : [];
        returns.push({
          orderId,
          timestamp: new Date().toISOString()
        });
        await safeElectronAPI.storage.setPersistent('pending_return_acceptances', returns);
        
        safeElectronAPI.showNotification('Return Queued', 'Return acceptance saved for sync when online');
      }
    } catch (error) {
      console.error('💥 Frontend - Accept return error:', error);
      if (error.message.includes('Authentication failed')) {
        setAuthError(true);
      } else {
        safeElectronAPI.showNotification('Accept Failed', 'Could not accept return order');
      }
      fetchOrders(); // Refresh to get correct state
    }
  };

  // Rest of the component functions remain the same...
  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.search && !order.orderNumber.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getOrderType = (order) => {
    if (order.returnTransporter || order.status.includes('return_')) {
      return 'return';
    }
    if (order.assignedTransporter) {
      return 'delivery';
    }
    return 'delivery';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned_to_transporter': return <FaTruck className="text-indigo-500 text-xs" />;
      case 'accepted_by_transporter': return <FaTruck className="text-blue-500 text-xs" />;
      case 'in_transit': return <FaTruck className="text-orange-500 text-xs" />;
      case 'delivered': return <FaCheck className="text-green-500 text-xs" />;
      case 'cancelled': return <FaTimes className="text-red-500 text-xs" />;
      case 'return_requested': return <FaTruck className="text-amber-500 text-xs" />;
      case 'return_accepted': return <FaTruck className="text-blue-500 text-xs" />;
      case 'return_in_transit': return <FaTruck className="text-orange-500 text-xs" />;
      case 'returned_to_supplier': return <FaCheck className="text-green-500 text-xs" />;
      case 'certified': return <FaCheck className="text-green-500 text-xs" />;
      default: return <FaInfoCircle className="text-gray-500 text-xs" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned_to_transporter': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'accepted_by_transporter': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_transit': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'return_requested': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'return_accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'return_in_transit': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'returned_to_supplier': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'certified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getOrderTypeBadge = (order) => {
    const type = getOrderType(order);
    if (type === 'return') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
          <FaTruck className="mr-1" />
          Return
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
        <FaTruck className="mr-1" />
        Delivery
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAllProductImages = (order) => {
    const images = [];
    order.items.forEach(item => {
      if (item.product?.images) {
        images.push(...item.product.images);
      }
    });
    return images;
  };

  const getCurrentImage = (order) => {
    const images = getAllProductImages(order);
    const currentIndex = imageIndices[order._id] || 0;
    return images[currentIndex] || null;
  };

  const navigateImage = (orderId, direction) => {
    const images = getAllProductImages(orders.find(o => o._id === orderId));
    if (images.length <= 1) return;

    setImageIndices(prev => {
      const currentIndex = prev[orderId] || 0;
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % images.length;
      } else {
        newIndex = (currentIndex - 1 + images.length) % images.length;
      }
      
      return {
        ...prev,
        [orderId]: newIndex
      };
    });
  };

  const getSupplierName = (supplier) => {
    if (!supplier) return 'Unknown Supplier';
    return supplier.businessName || `${supplier.firstName} ${supplier.lastName}`;
  };

  const getSupplierLocation = (supplier) => {
    if (!supplier) return '';
    const locationParts = [supplier.city, supplier.country].filter(Boolean);
    return locationParts.join(', ');
  };

  const getWholesalerName = (wholesaler) => {
    if (!wholesaler) return 'Unknown Wholesaler';
    return wholesaler.businessName || `${wholesaler.firstName} ${wholesaler.lastName}`;
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const renderActionButtons = (order) => {
    const orderType = getOrderType(order);
    
    if (orderType === 'delivery') {
      return (
        <div className="flex flex-wrap gap-1">
          {order.status === 'assigned_to_transporter' && (
            <>
              <button 
                onClick={() => updateOrderStatus(order._id, 'accepted_by_transporter')}
                className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors flex-1 min-w-[60px]"
              >
                Accept
              </button>
              <button 
                onClick={() => updateOrderStatus(order._id, 'cancelled', 'Transporter declined the assignment')}
                className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors flex-1 min-w-[60px]"
              >
                Decline
              </button>
            </>
          )}
          
          {order.status === 'accepted_by_transporter' && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'in_transit')}
              className="px-2 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors flex-1"
            >
              Start Delivery
            </button>
          )}
          
          {order.status === 'in_transit' && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'delivered')}
              className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors flex-1"
            >
              Mark Delivered
            </button>
          )}

          {order.status === 'delivered' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex-1 text-center">
              Delivered
            </span>
          )}

          {['accepted_by_transporter', 'in_transit'].includes(order.status) && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'cancelled', 'Delivery cancelled by transporter')}
              className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors flex-1 min-w-[60px]"
            >
              Cancel
            </button>
          )}
        </div>
      );
    } else if (orderType === 'return') {
      return (
        <div className="flex flex-wrap gap-1">
          {order.status === 'return_requested' && !order.returnTransporter && (
            <button 
              onClick={() => acceptReturnOrder(order._id)}
              className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors flex-1"
            >
              Accept Return
            </button>
          )}
          
          {order.status === 'return_requested' && order.returnTransporter && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'return_accepted')}
              className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex-1"
            >
              Start Return
            </button>
          )}
          
          {order.status === 'return_accepted' && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'return_in_transit')}
              className="px-2 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors flex-1"
            >
              Pickup Return
            </button>
          )}
          
          {order.status === 'return_in_transit' && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'returned_to_supplier')}
              className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors flex-1"
            >
              Complete Return
            </button>
          )}

          {order.status === 'returned_to_supplier' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex-1 text-center">
              Returned
            </span>
          )}

          {['return_requested', 'return_accepted', 'return_in_transit'].includes(order.status) && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'cancelled', 'Return cancelled by transporter')}
              className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors flex-1 min-w-[60px]"
            >
              Cancel
            </button>
          )}
        </div>
      );
    }
  };

  // Manual refresh with offline support
  const refreshOrders = () => {
    if (isOnline && checkAuthentication()) {
      fetchOrders();
      fetchAvailableReturnOrders();
    } else if (!isOnline) {
      safeElectronAPI.showNotification('Offline Mode', 'Using cached data. Connect to internet to sync.');
    }
  };

  // Authentication Error Component
  const AuthErrorComponent = () => (
    <div className={`rounded-lg shadow p-6 h-[700px] flex items-center justify-center ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="text-center max-w-md">
        <FaExclamationTriangle className="mx-auto text-4xl text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Your session has expired or you are not authenticated. Please login again to access supplier orders.
        </p>
        <button
          onClick={logout}
          className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mx-auto"
        >
          <FaSignOutAlt className="mr-2" />
          Login Again
        </button>
      </div>
    </div>
  );

  // Desktop Header Component
  const DesktopHeader = () => (
    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Supplier Orders</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your assigned supplier orders and returns
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Sync Status */}
          {isElectron && (
            <div className="flex items-center space-x-2 text-sm">
              {!isOnline && (
                <div className="flex items-center text-amber-600">
                  <FaExclamationTriangle className="mr-1" />
                  <span>Offline</span>
                </div>
              )}
              {lastSync && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last sync: {formatDate(lastSync)}
                </div>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={refreshOrders}
            disabled={loading}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className={`px-3 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="all">All Status</option>
          <option value="assigned_to_transporter">Assigned</option>
          <option value="accepted_by_transporter">Accepted</option>
          <option value="in_transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="return_requested">Return Requested</option>
          <option value="return_in_transit">Return in Transit</option>
          <option value="returned_to_supplier">Returned</option>
        </select>

        {/* Type Filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className={`px-3 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="all">All Types</option>
          <option value="delivery">Delivery</option>
          <option value="return">Return</option>
        </select>
      </div>

      {/* Statistics */}
      {Object.keys(statistics).length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(statistics).map(([key, value]) => (
            <div key={key} className={`p-3 rounded-lg border ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Order Card Component
  const OrderCard = ({ order, orderType, isAvailableReturn, currentImage, currentIndex, images, onImageNavigate, onOpenDetails }) => (
    <div className={`rounded-lg border ${
      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
    } shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {order.orderNumber}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(order.createdAt)}
            </p>
          </div>
          {getOrderTypeBadge(order)}
        </div>
        
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusIcon(order.status)}
            <span className="ml-1 capitalize">
              {order.status.replace(/_/g, ' ')}
            </span>
          </span>
          
          {isAvailableReturn && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
              <FaExclamationTriangle className="mr-1" />
              Available
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Supplier/Wholesaler Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm">
            <FaBuilding className="mr-2 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {order.supplier ? getSupplierName(order.supplier) : getWholesalerName(order.wholesaler)}
            </span>
          </div>
          {order.supplier && (
            <div className="flex items-center text-sm">
              <FaMapMarkerAlt className="mr-2 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {getSupplierLocation(order.supplier)}
              </span>
            </div>
          )}
        </div>

        {/* Items Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {order.items?.length || 0} items • Total: ${order.totalAmount?.toFixed(2) || '0.00'}
        </div>

        {/* Action Buttons */}
        {renderActionButtons(order)}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600/20">
        <button
          onClick={() => onOpenDetails(order)}
          className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-600 text-white hover:bg-gray-500' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaInfoCircle className="mr-2" />
          View Details
        </button>
      </div>
    </div>
  );

  // Show auth error if authentication failed
  if (authError) {
    return <AuthErrorComponent />;
  }

  if (loading) {
    return (
      <div className={`rounded-lg shadow p-6 h-[700px] flex items-center justify-center ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500" />
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">
            {isOnline ? 'Loading supplier orders...' : 'Loading cached orders...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow h-[700px] flex flex-col ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      {/* Header */}
      <DesktopHeader />

      {/* Orders Grid - Scrollable area */}
      <div className="flex-1 overflow-hidden">
        {filteredOrders.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-4">
              <FaTruck className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                {isOnline ? 'No orders assigned' : 'No cached orders'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {filters.status !== 'all' || filters.search ? 'Try adjusting your filters' : 
                 isOnline ? 'No supplier orders have been assigned to you yet' : 'Connect to internet to fetch latest orders'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[450px] overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const images = getAllProductImages(order);
                const currentImage = getCurrentImage(order);
                const currentIndex = imageIndices[order._id] || 0;
                const orderType = getOrderType(order);
                const isAvailableReturn = availableReturnOrders.some(ro => ro._id === order._id);
                
                return (
                  <OrderCard
                    key={order._id}
                    order={order}
                    orderType={orderType}
                    isAvailableReturn={isAvailableReturn}
                    currentImage={currentImage}
                    currentIndex={currentIndex}
                    images={images}
                    onImageNavigate={navigateImage}
                    onOpenDetails={openOrderDetails}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Offline Indicator */}
      {!isOnline && isElectron && (
        <div className="border-t border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
          <div className="flex items-center justify-center text-sm text-amber-800 dark:text-amber-300">
            <FaExclamationTriangle className="mr-2" />
            <span>You are currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierOrders;