import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  FaSignOutAlt,
  FaShoppingCart,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';

const TransporterOrders = ({ isElectron, isOnline, onSync, syncStatus, pendingSyncCount, isDarkMode }) => {
  const { user, getAuthHeaders, logout, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('assigned_to_transporter');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [showFreeOrders, setShowFreeOrders] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
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
        throw error;
      }
      throw new Error(`Network error: ${error.message}`);
    }
  };

  // Load offline data on component mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  useEffect(() => {
    if (isOnline && checkAuthentication()) {
      fetchTransporterOrders();
    } else if (!isOnline) {
      setOrders(offlineData);
      setLoading(false);
    }
  }, [filterStatus, showFreeOrders, isOnline, isAuthenticated]);

  const loadOfflineData = async () => {
    try {
      const offlineOrders = await safeElectronAPI.storage.getPersistent('transporter_orders_offline');
      if (offlineOrders.success && offlineOrders.value) {
        setOfflineData(offlineOrders.value);
      }
      
      const lastSyncData = await safeElectronAPI.storage.getPersistent('transporter_orders_last_sync');
      if (lastSyncData.success && lastSyncData.value) {
        setLastSync(lastSyncData.value);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = async (ordersData) => {
    try {
      await safeElectronAPI.storage.setPersistent('transporter_orders_offline', ordersData);
      await safeElectronAPI.storage.setPersistent('transporter_orders_last_sync', new Date().toISOString());
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const fetchTransporterOrders = async () => {
    try {
      if (!checkAuthentication()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setAuthError(false);

      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('includeFree', showFreeOrders.toString());
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/retailer-orders/transporter?${params.toString()}`
      );

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        await saveOfflineData(data.orders || []);
        
        const indexes = {};
        data.orders.forEach(order => {
          if (order.product?.images?.length > 0) {
            indexes[order._id] = 0;
          }
        });
        setActiveImageIndexes(indexes);
      } else {
        throw new Error(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.message.includes('Authentication failed')) {
        setAuthError(true);
      } else if (!isOnline) {
        setOrders(offlineData);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async () => {
    try {
      if (!checkAuthentication()) {
        safeElectronAPI.showNotification('Authentication Required', 'Please login to update orders');
        return;
      }

      let updateData = { status: actionType };

      if (actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter') {
        updateData.cancellationReason = cancellationReason;
      }

      if (actionType === 'return_to_wholesaler') {
        updateData.returnReason = returnReason;
      }

      if (actionType === 'accepted_by_transporter' && getOrderType(selectedOrder) === 'free') {
        updateData.transporterId = user.id;
      }

      if (isOnline) {
        const response = await makeAuthenticatedRequest(
          `http://localhost:5000/api/retailer-orders/${selectedOrder._id}/status`,
          {
            method: 'PUT',
            body: JSON.stringify(updateData)
          }
        );

        const data = await response.json();

        if (data.success) {
          fetchTransporterOrders();
          setShowActionModal(false);
          setSelectedOrder(null);
          setActionType('');
          setCancellationReason('');
          setReturnReason('');
          
          setError(null);
          setSuccessMessage(`Order ${getActionSuccessMessage(actionType)} successfully!`);
          
          setTimeout(() => {
            setSuccessMessage('');
          }, 5000);
        } else {
          throw new Error(data.message || 'Failed to update order');
        }
      } else {
        // Offline: Store update for later sync
        const pendingUpdates = await safeElectronAPI.storage.getPersistent('pending_transporter_updates');
        const updates = pendingUpdates.success && pendingUpdates.value ? pendingUpdates.value : [];
        updates.push({
          orderId: selectedOrder._id,
          updateData,
          timestamp: new Date().toISOString()
        });
        await safeElectronAPI.storage.setPersistent('pending_transporter_updates', updates);
        
        safeElectronAPI.showNotification('Update Queued', 'Order update saved for sync when online');
        setShowActionModal(false);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      if (error.message.includes('Authentication failed')) {
        setAuthError(true);
      } else {
        setError(error.message);
      }
    }
  };

  const getActionSuccessMessage = (action) => {
    switch (action) {
      case 'accepted_by_transporter': return 'accepted';
      case 'rejected_by_transporter': return 'rejected';
      case 'cancelled_by_transporter': return 'cancelled';
      case 'in_transit': return 'marked as in transit';
      case 'delivered': return 'marked as delivered';
      case 'return_to_wholesaler': return 'return initiated';
      default: return 'updated';
    }
  };

  const openActionModal = (order, action) => {
    setSelectedOrder(order);
    setActionType(action);
    setShowActionModal(true);
    setCancellationReason('');
    setReturnReason('');
  };

  const handleImageNavigation = (orderId, direction, imagesLength) => {
    setActiveImageIndexes(prev => {
      const currentIndex = prev[orderId] || 0;
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % imagesLength;
      } else {
        newIndex = (currentIndex - 1 + imagesLength) % imagesLength;
      }
      
      return {
        ...prev,
        [orderId]: newIndex
      };
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'processing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'assigned_to_transporter': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'accepted_by_transporter': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
      case 'in_transit': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'certified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'disputed': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'return_to_wholesaler': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'return_accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'return_rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled_by_retailer':
      case 'cancelled_by_wholesaler':
      case 'cancelled_by_transporter': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getOrderType = (order) => {
    if (order.transporter && (order.transporter._id === user.id || order.transporter === user.id)) {
      return 'specific';
    }
    else if (!order.transporter || 
             (typeof order.transporter === 'object' && Object.keys(order.transporter).length === 0) ||
             order.transporter === null) {
      return 'free';
    }
    return 'other';
  };

  const getAllowedActions = (order) => {
    const actions = [];
    const orderType = getOrderType(order);
    const currentStatus = order.status;
    
    if (currentStatus === 'assigned_to_transporter') {
      if (orderType === 'specific' || orderType === 'free') {
        actions.push('accepted_by_transporter', 'rejected_by_transporter');
      }
    }
    else if (currentStatus === 'accepted_by_transporter') {
      actions.push('in_transit', 'cancelled_by_transporter');
    }
    else if (currentStatus === 'in_transit') {
      actions.push('delivered', 'cancelled_by_transporter');
    }
    else if (currentStatus === 'disputed') {
      if (orderType === 'specific' && order.transporter && 
          (order.transporter._id === user.id || order.transporter === user.id)) {
        actions.push('return_to_wholesaler');
      }
    }
    
    return actions;
  };

  const getActionButtonClass = (action) => {
    switch (action) {
      case 'accepted_by_transporter': 
      case 'in_transit':
      case 'delivered': 
      case 'return_to_wholesaler': return 'bg-green-600 hover:bg-green-700 text-white';
      case 'rejected_by_transporter': 
      case 'cancelled_by_transporter': return 'bg-red-600 hover:bg-red-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'accepted_by_transporter': return 'Accept Order';
      case 'rejected_by_transporter': return 'Reject Order';
      case 'in_transit': return 'Start Delivery';
      case 'delivered': return 'Mark as Delivered';
      case 'cancelled_by_transporter': return 'Cancel Delivery';
      case 'return_to_wholesaler': return 'Return to Wholesaler';
      default: return action;
    }
  };

  const getOrderAssignmentInfo = (order) => {
    const orderType = getOrderType(order);
    
    if (orderType === 'specific') {
      return 'Assigned specifically to you';
    } else if (orderType === 'free') {
      return 'Available for any transporter';
    }
    return 'Assigned to another transporter';
  };

  const getDisputeInfo = (order) => {
    if (order.status !== 'disputed' && order.status !== 'return_to_wholesaler') return null;
    
    return {
      reason: order.deliveryDispute?.reason || 'No reason provided',
      disputedBy: order.deliveryDispute?.disputedBy?.businessName || 
                 order.deliveryDispute?.disputedBy?.firstName || 
                 'Retailer',
      disputedAt: order.deliveryDispute?.disputedAt ? new Date(order.deliveryDispute.disputedAt).toLocaleDateString() : ''
    };
  };

  const getReturnInfo = (order) => {
    if (order.status !== 'return_to_wholesaler' && order.status !== 'return_accepted' && order.status !== 'return_rejected') return null;
    
    return {
      reason: order.returnReason || order.returnDetails?.reason || 'No reason provided',
      requestedAt: order.returnRequestedAt ? new Date(order.returnRequestedAt).toLocaleDateString() : '',
      status: order.status
    };
  };

  const canTransporterTakeAction = (order) => {
    const orderType = getOrderType(order);
    return orderType === 'specific' || orderType === 'free';
  };

  const toggleFreeOrders = () => {
    setShowFreeOrders(!showFreeOrders);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Manual refresh with offline support
  const refreshOrders = () => {
    if (isOnline && checkAuthentication()) {
      fetchTransporterOrders();
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
          Your session has expired or you are not authenticated. Please login again to access transporter orders.
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transport Orders</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage orders assigned to you and available for pickup
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-3 lg:mt-0">
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

          {/* Available Orders Toggle */}
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOrders}
                onChange={toggleFreeOrders}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Available Orders
              </span>
            </label>
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="assigned_to_transporter">Available Orders</option>
              <option value="accepted_by_transporter">Accepted Orders</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="disputed">Disputed</option>
              <option value="return_to_wholesaler">Return Requests</option>
              <option value="all">All Orders</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Order Card Component
  const OrderCard = ({ order }) => {
    const images = order.product?.images || [];
    const currentImageIndex = activeImageIndexes[order._id] || 0;
    const currentImage = images[currentImageIndex]?.url;
    const hasMultipleImages = images.length > 1;
    const orderType = getOrderType(order);
    const assignmentInfo = getOrderAssignmentInfo(order);
    const allowedActions = getAllowedActions(order);
    const canTakeAction = canTransporterTakeAction(order);
    const disputeInfo = getDisputeInfo(order);
    const returnInfo = getReturnInfo(order);

    return (
      <div key={order._id} className={`border rounded-lg p-4 flex flex-col ${
        orderType === 'free' 
          ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' 
          : orderType === 'specific'
          ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-700 dark:bg-gray-800/50'
      }`}>
        <div className="flex flex-col mb-3">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Order #{order._id.slice(-6).toUpperCase()}
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          
          {assignmentInfo && (
            <div className={`mb-2 p-2 rounded-md text-xs ${
              orderType === 'free' 
                ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200' 
                : orderType === 'specific'
                ? 'bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200'
                : 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200'
            }`}>
              {assignmentInfo}
            </div>
          )}
          
          {disputeInfo && (
            <div className="mb-2 p-2 rounded-md text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200">
              <p className="font-medium">Disputed by {disputeInfo.disputedBy}</p>
              <p>Reason: {disputeInfo.reason}</p>
              {disputeInfo.disputedAt && <p>On: {disputeInfo.disputedAt}</p>}
            </div>
          )}
          
          {returnInfo && (
            <div className={`mb-2 p-2 rounded-md text-xs ${
              returnInfo.status === 'return_to_wholesaler' 
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                : returnInfo.status === 'return_accepted'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}>
              <p className="font-medium">Return {returnInfo.status.split('_')[1]}</p>
              <p>Reason: {returnInfo.reason}</p>
              {returnInfo.requestedAt && <p>Requested: {returnInfo.requestedAt}</p>}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">From:</span>
            <span>{order.wholesaler?.businessName || `${order.wholesaler?.firstName} ${order.wholesaler?.lastName}`}</span>
            
            <span className="font-medium">To:</span>
            <span>{order.retailer?.businessName || `${order.retailer?.firstName} ${order.retailer?.lastName}`}</span>
            
            <span className="font-medium">Date:</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="relative mb-3">
          {currentImage ? (
            <div className="relative w-full h-32">
              <img
                src={currentImage}
                alt={order.product?.name}
                className="w-full h-full object-cover rounded-md"
              />
              {hasMultipleImages && (
                <>
                  <button
                    onClick={() => handleImageNavigation(order._id, 'prev', images.length)}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200"
                    aria-label="Previous image"
                  >
                    <FaArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleImageNavigation(order._id, 'next', images.length)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200"
                    aria-label="Next image"
                  >
                    <FaArrowRight className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {currentImageIndex + 1}/{images.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center dark:bg-gray-700">
              <FaBox className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="mb-3 flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">
            {order.product?.name}
          </h4>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              {order.quantity} {order.measurementUnit} × UGX {order.unitPrice?.toLocaleString()}
            </p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              Total: UGX {order.totalPrice?.toLocaleString()}
            </p>
            <p className="text-gray-600 dark:text-gray-400 line-clamp-1">
              <span className="font-medium">To:</span> {order.deliveryPlace}
            </p>
            {order.deliveryCoordinates && (
              <p className="text-gray-600 dark:text-gray-400 line-clamp-1">
                <span className="font-medium">Coords:</span> {order.deliveryCoordinates.lat}, {order.deliveryCoordinates.lng}
              </p>
            )}
          </div>
        </div>

        {order.orderNotes && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 p-2 rounded dark:bg-gray-700 line-clamp-2">
              <span className="font-medium">Notes:</span> {order.orderNotes}
            </p>
          </div>
        )}

        {canTakeAction && allowedActions.length > 0 && (
          <div className="flex flex-col gap-2 mt-auto pt-3">
            {allowedActions.map(action => (
              <button
                key={action}
                onClick={() => openActionModal(order, action)}
                className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getActionButtonClass(action)}`}
              >
                {getActionText(action)}
              </button>
            ))}
          </div>
        )}

        {!canTakeAction && (
          <div className="mt-auto pt-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic">
              Assigned to another transporter
            </p>
          </div>
        )}
      </div>
    );
  };

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
            {isOnline ? 'Loading transporter orders...' : 'Loading cached orders...'}
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

      {/* Error and Success Messages */}
      {error && (
        <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400 mr-3" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="m-4 bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center">
            <FaCheck className="text-green-600 dark:text-green-400 mr-3" />
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-4">
              <FaTruck className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                {isOnline ? 'No orders found' : 'No cached orders'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {filterStatus === 'all' 
                  ? `You don't have any orders ${showFreeOrders ? 'assigned to you or available' : 'assigned to you'} yet.`
                  : `No orders with status "${filterStatus}" found.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[450px] overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
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

      {/* Action Modal */}
      {showActionModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {getActionText(actionType)} - Order #{selectedOrder._id.slice(-8).toUpperCase()}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {actionType === 'accepted_by_transporter' 
                ? 'Are you sure you want to accept this delivery order?'
                : actionType === 'rejected_by_transporter'
                ? 'Please provide a reason for rejecting this order:'
                : actionType === 'cancelled_by_transporter'
                ? 'Please provide a reason for cancelling this delivery:'
                : actionType === 'return_to_wholesaler'
                ? 'Please provide a reason for returning this order to the wholesaler:'
                : `Are you sure you want to mark this order as ${actionType.replace('_', ' ')}?`
              }
            </p>

            {(actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter' || actionType === 'return_to_wholesaler') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={actionType === 'return_to_wholesaler' ? returnReason : cancellationReason}
                  onChange={(e) => {
                    if (actionType === 'return_to_wholesaler') {
                      setReturnReason(e.target.value);
                    } else {
                      setCancellationReason(e.target.value);
                    }
                  }}
                  placeholder="Please provide a reason..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  rows="3"
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedOrder(null);
                  setActionType('');
                  setCancellationReason('');
                  setReturnReason('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleOrderAction}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getActionButtonClass(actionType)}`}
                disabled={
                  (actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter' || actionType === 'return_to_wholesaler') && 
                  !(actionType === 'return_to_wholesaler' ? returnReason.trim() : cancellationReason.trim())
                }
              >
                Confirm {getActionText(actionType)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransporterOrders;