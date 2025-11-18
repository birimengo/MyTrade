
// components/WholesalerComponents/OutOrders.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaSync, 
  FaDownload, 
  FaPrint, 
  FaArrowLeft, 
  FaArrowRight,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTruck,
  FaBox,
  FaMoneyBillWave,
  FaUser
} from 'react-icons/fa';

const OutOrders = ({ isElectron, isOnline, onSync, syncStatus }) => {
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [productImageIndices, setProductImageIndices] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [lastSync, setLastSync] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Safe Electron API access
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
      // Fallback for web
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

  useEffect(() => {
    fetchOutgoingOrders();
  }, [user, statusFilter]);

  useEffect(() => {
    groupOrdersBySupplier();
  }, [orders, statusFilter]);

  // Cache orders for offline use
  const cacheOrders = async (data) => {
    try {
      await safeElectronAPI.storage.setPersistent('cached_outgoing_orders', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching orders:', error);
    }
  };

  // Get cached orders
  const getCachedOrders = async () => {
    try {
      let cachedData = null;
      
      if (isElectron) {
        const result = await safeElectronAPI.storage.getPersistent('cached_outgoing_orders');
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem('wholesaler_outgoing_orders_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedData = parsed.data;
        }
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error getting cached orders:', error);
      return null;
    }
  };

  const fetchOutgoingOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached data first
      const cachedData = await getCachedOrders();
      if (cachedData && !isOnline) {
        console.log('📦 Using cached outgoing orders data (offline mode)');
        setOrders(cachedData);
        initializeImageIndices(cachedData);
        setLoading(false);
        return;
      }

      if (cachedData && isOnline) {
        // Show cached data immediately while fetching fresh data
        setOrders(cachedData);
        initializeImageIndices(cachedData);
      }

      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      if (data.success) {
        const ordersData = data.orders || [];
        setOrders(ordersData);
        initializeImageIndices(ordersData);
        
        // Cache the data for offline use
        await cacheOrders(ordersData);
        setLastSync(new Date().toLocaleTimeString());

        // Show desktop notification
        safeElectronAPI.showNotification(
          'Orders Updated',
          `Loaded ${ordersData.length} outgoing orders`
        );
      } else {
        throw new Error(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
      
      // Try to use cached data as fallback
      const cachedData = await getCachedOrders();
      if (cachedData) {
        console.log('🔄 Using cached data due to fetch error');
        setOrders(cachedData);
        initializeImageIndices(cachedData);
        setError('Using cached data - ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeImageIndices = (ordersData) => {
    const initialIndices = {};
    ordersData.forEach(order => {
      order.items.forEach((item, itemIndex) => {
        if (item.product && item.product.images && item.product.images.length > 0) {
          const key = `${order._id}-${itemIndex}`;
          initialIndices[key] = 0;
        }
      });
    });
    setProductImageIndices(initialIndices);
  };

  const groupOrdersBySupplier = () => {
    let filteredOrders = orders;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredOrders = orders.filter(order => order.status === statusFilter);
    }

    const grouped = filteredOrders.reduce((acc, order) => {
      const supplierId = order.supplier?._id || 'unknown';
      const supplierName = order.supplier?.businessName || 
                          `${order.supplier?.firstName || ''} ${order.supplier?.lastName || ''}`.trim() || 
                          'Unknown Supplier';
      
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier: order.supplier,
          supplierName: supplierName,
          orders: [],
          totalOrders: 0,
          totalAmount: 0,
          statusCounts: {}
        };
      }
      
      acc[supplierId].orders.push(order);
      acc[supplierId].totalOrders += 1;
      acc[supplierId].totalAmount += order.totalAmount;
      
      // Count orders by status
      acc[supplierId].statusCounts[order.status] = 
        (acc[supplierId].statusCounts[order.status] || 0) + 1;
      
      return acc;
    }, {});

    setGroupedOrders(grouped);
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: true }));
      
      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders/${orderId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          status: newStatus,
          reason: reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update the order in state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        
        // Show desktop notification
        safeElectronAPI.showNotification(
          'Order Updated',
          `Order status updated to ${newStatus.replace('_', ' ')}`
        );
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      safeElectronAPI.showNotification('Update Failed', error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Delete pending order
  const deleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [orderId]: true }));
      
      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      const data = await response.json();
      
      if (data.success) {
        // Remove the order from state
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        safeElectronAPI.showNotification('Order Deleted', 'Order deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      safeElectronAPI.showNotification('Delete Failed', error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Check if order can be cancelled by wholesaler
  const canCancelOrder = (order) => {
    const cancellableStatuses = ['pending', 'confirmed'];
    return cancellableStatuses.includes(order.status);
  };

  // Check if order can be deleted by wholesaler
  const canDeleteOrder = (order) => {
    return order.status === 'pending';
  };

  // Check if order can be certified or returned
  const canCertifyOrReturn = (order) => {
    return order.status === 'delivered';
  };

  // Image navigation functions
  const nextImage = (orderId, itemIndex, event) => {
    event?.stopPropagation();
    const key = `${orderId}-${itemIndex}`;
    setProductImageIndices(prev => {
      const currentIndex = prev[key] || 0;
      const order = orders.find(o => o._id === orderId);
      const item = order?.items[itemIndex];
      const maxIndex = item?.product?.images?.length ? item.product.images.length - 1 : 0;
      return {
        ...prev,
        [key]: currentIndex < maxIndex ? currentIndex + 1 : 0
      };
    });
  };

  const prevImage = (orderId, itemIndex, event) => {
    event?.stopPropagation();
    const key = `${orderId}-${itemIndex}`;
    setProductImageIndices(prev => {
      const currentIndex = prev[key] || 0;
      const order = orders.find(o => o._id === orderId);
      const item = order?.items[itemIndex];
      const maxIndex = item?.product?.images?.length ? item.product.images.length - 1 : 0;
      return {
        ...prev,
        [key]: currentIndex > 0 ? currentIndex - 1 : maxIndex
      };
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_production': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ready_for_delivery': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'assigned_to_transporter': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      case 'accepted_by_transporter': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'in_transit': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'certified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'return_requested': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'return_accepted': return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      case 'return_in_transit': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'returned_to_supplier': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'in_production': return '🏭';
      case 'ready_for_delivery': return '📦';
      case 'assigned_to_transporter': return '🚚';
      case 'accepted_by_transporter': return '📥';
      case 'in_transit': return '🚛';
      case 'delivered': return '🎯';
      case 'certified': return '⭐';
      case 'return_requested': return '↩️';
      case 'return_accepted': return '📋';
      case 'return_in_transit': return '🔄';
      case 'returned_to_supplier': return '📦';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateOrderAge = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        name: `${user?.firstName} ${user?.lastName}`,
        business: user?.businessName,
        role: user?.role
      },
      ordersData: {
        totalOrders: orders.length,
        filteredOrders: Object.values(groupedOrders).reduce((sum, group) => sum + group.orders.length, 0),
        lastSync: lastSync,
        statusFilter: statusFilter
      },
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        supplier: order.supplier?.businessName || `${order.supplier?.firstName} ${order.supplier?.lastName}`,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          product: item.product?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        }))
      }))
    };

    const result = await safeElectronAPI.saveRegistrationData(
      exportData,
      `outgoing-orders-${new Date().getTime()}.json`
    );

    if (result.success) {
      safeElectronAPI.showNotification(
        'Export Successful',
        'Outgoing orders data exported successfully'
      );
    } else {
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  const handleManualRefresh = () => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    fetchOutgoingOrders();
  };

  const ProductImage = ({ product, orderId, itemIndex }) => {
    const key = `${orderId}-${itemIndex}`;
    const currentImageIndex = productImageIndices[key] || 0;
    const images = product?.images || [];
    const currentImage = images[currentImageIndex] || { 
      url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop' 
    };
    const hasMultipleImages = images.length > 1;

    return (
      <div className="relative group mb-3">
        <div className="flex justify-center">
          <img
            src={currentImage.url}
            alt={product.name}
            className="w-32 h-24 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              setSelectedOrder({ orderId, itemIndex, product, images, currentImageIndex });
              setShowOrderDetails(true);
            }}
          />
        </div>
        
        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => prevImage(orderId, itemIndex, e)}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-1 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <FaArrowLeft className="w-3 h-3" />
            </button>
            
            <button
              onClick={(e) => nextImage(orderId, itemIndex, e)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-1 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <FaArrowRight className="w-3 h-3" />
            </button>

            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
              {currentImageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>
    );
  };

  const OrderCard = ({ order }) => {
    const isLoading = actionLoading[order._id];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              Order #{order.orderNumber}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(order.createdAt)} • {calculateOrderAge(order.createdAt)}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusIcon(order.status)} {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="space-y-4 mb-3">
          {order.items.map((item, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <ProductImage 
                product={item.product} 
                orderId={order._id} 
                itemIndex={index} 
              />
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {item.product?.name || 'Product'}
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="text-left">
                    <span className="font-medium">Quantity:</span>
                  </div>
                  <div className="text-right">
                    <span>{item.quantity} {item.product?.measurementUnit || 'units'}</span>
                  </div>
                  
                  <div className="text-left">
                    <span className="font-medium">Unit Price:</span>
                  </div>
                  <div className="text-right">
                    <span>${item.unitPrice}</span>
                  </div>
                  
                  <div className="text-left">
                    <span className="font-medium">Total:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-600 dark:text-blue-400">${item.totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-3">
          {canCertifyOrReturn(order) && (
            <div className="flex space-x-2">
              <button
                onClick={() => updateOrderStatus(order._id, 'certified', 'Order certified by wholesaler')}
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center space-x-1"
              >
                {isLoading ? (
                  <FaSync className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <FaCheckCircle className="w-3 h-3" />
                    <span>Certified</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Please specify the reason for return:');
                  if (reason) {
                    updateOrderStatus(order._id, 'return_requested', reason);
                  }
                }}
                disabled={isLoading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center space-x-1"
              >
                {isLoading ? (
                  <FaSync className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <FaExclamationTriangle className="w-3 h-3" />
                    <span>Return</span>
                  </>
                )}
              </button>
            </div>
          )}

          {canCancelOrder(order) && (
            <button
              onClick={() => {
                const reason = prompt('Please specify the reason for cancellation:');
                if (reason) {
                  updateOrderStatus(order._id, 'cancelled', reason);
                }
              }}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center space-x-1"
            >
              {isLoading ? (
                <FaSync className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <FaExclamationTriangle className="w-3 h-3" />
                  <span>Cancel Order</span>
                </>
              )}
            </button>
          )}

          {canDeleteOrder(order) && (
            <button
              onClick={() => deleteOrder(order._id)}
              disabled={isLoading}
              className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center space-x-1"
            >
              {isLoading ? (
                <FaSync className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <FaExclamationTriangle className="w-3 h-3" />
                  <span>Delete Order</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center border-t dark:border-gray-700 pt-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </span>
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
            ${order.totalAmount}
          </span>
        </div>

        {order.shippingAddress && (
          <div className="mt-3 pt-3 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <span className="mr-1">📍</span>
              {order.shippingAddress.fullAddress || 
                `${order.shippingAddress.street}, ${order.shippingAddress.city}`}
            </p>
          </div>
        )}

        {order.assignedTransporter && (
          <div className="mt-3 pt-3 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <FaTruck className="w-3 h-3 mr-1" />
              Assigned to: {order.assignedTransporter.businessName || 
                           `${order.assignedTransporter.firstName} ${order.assignedTransporter.lastName}`}
            </p>
          </div>
        )}
      </div>
    );
  };

  const SupplierSection = ({ supplierId, supplierData }) => (
    <div key={supplierId} className="mb-8">
      <div className="flex items-center justify-between mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <FaUser className="text-lg text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {supplierData.supplierName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {supplierData.supplier?.email || 'No email'} • {supplierData.supplier?.phone || 'No phone'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {supplierData.totalOrders} order{supplierData.totalOrders !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Total: ${supplierData.totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(supplierData.statusCounts).map(([status, count]) => (
          <span key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusIcon(status)} {status.replace(/_/g, ' ')}: {count}
          </span>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {supplierData.orders.map(order => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <FaBox className="inline mr-2 text-blue-600" />
              Outgoing Orders
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Loading from local cache and network...' : 'Loading your orders from suppliers...'}
            </p>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading orders (offline capable)...' : 'Loading orders...'}
          </span>
        </div>
      </div>
    );
  }

  if (error && !orders.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Outgoing Orders</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Desktop Mode - Offline Capable' : 'Manage your orders from suppliers'}
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-3 rounded-full dark:bg-red-900/30 mb-4">
              <FaExclamationTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Unable to load orders</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-md">{error}</p>
            <div className="flex space-x-3 flex-wrap justify-center gap-2">
              <button
                onClick={handleManualRefresh}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
              >
                <FaSync className="w-4 h-4 mr-2" />
                Try Again
              </button>
              {isElectron && (
                <button
                  onClick={handleExportData}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center"
                >
                  <FaDownload className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            <FaBox className="inline mr-2 text-blue-600" />
            Outgoing Orders
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track your orders placed with suppliers
            {isElectron && ' • Desktop Mode'}
          </p>
          {lastSync && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Last synced: {lastSync}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {isElectron && (
            <div className="flex space-x-2">
              <button
                onClick={handleManualRefresh}
                disabled={!isOnline || syncStatus === 'syncing'}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isOnline && syncStatus !== 'syncing'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FaSync className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export orders data to JSON file"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Print orders summary"
              >
                <FaPrint className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Features Banner */}
      {isElectron && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaBox className="text-blue-600 dark:text-blue-400 text-lg" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  Desktop Mode Active
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {isOnline ? 'Real-time updates enabled' : 'Working with cached data - some features limited'}
                </p>
              </div>
            </div>
            {!isOnline && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                Offline Mode
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-48"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_production">In Production</option>
            <option value="ready_for_delivery">Ready for Delivery</option>
            <option value="assigned_to_transporter">Assigned to Transporter</option>
            <option value="accepted_by_transporter">Accepted by Transporter</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="certified">Certified</option>
            <option value="return_requested">Return Requested</option>
            <option value="return_accepted">Return Accepted</option>
            <option value="return_in_transit">Return in Transit</option>
            <option value="returned_to_supplier">Returned to Supplier</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Total: {orders.length} orders</span>
          <span>•</span>
          <span>Suppliers: {Object.keys(groupedOrders).length}</span>
          <span>•</span>
          <span className="text-green-600 dark:text-green-400 font-medium">
            ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="overflow-y-auto">
        {Object.keys(groupedOrders).length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
              <FaBox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No orders found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              {statusFilter !== 'all' 
                ? `No orders with status "${statusFilter}" found.` 
                : "You haven't placed any orders with suppliers yet."
              }
            </p>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Show All Orders
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedOrders).map(([supplierId, supplierData]) => (
              <SupplierSection 
                key={supplierId} 
                supplierId={supplierId} 
                supplierData={supplierData} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Product Details
              </h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <img
                  src={selectedOrder.images[selectedOrder.currentImageIndex]?.url}
                  alt={selectedOrder.product.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {selectedOrder.images.length > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    <button
                      onClick={() => prevImage(selectedOrder.orderId, selectedOrder.itemIndex)}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 p-2 rounded-full"
                    >
                      <FaArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => nextImage(selectedOrder.orderId, selectedOrder.itemIndex)}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 p-2 rounded-full"
                    >
                      <FaArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedOrder.product.name}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedOrder.product.description || 'No description available'}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium">{selectedOrder.product.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Measurement Unit:</span>
                    <span className="font-medium">{selectedOrder.product.measurementUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Price Range:</span>
                    <span className="font-medium">
                      ${selectedOrder.product.minPrice} - ${selectedOrder.product.maxPrice}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutOrders;