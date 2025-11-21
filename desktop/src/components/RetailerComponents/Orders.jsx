import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

  const isElectron = window.electronAPI;
  const limit = 10;

  // Base64 encoded placeholder image
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxM00yMCAyN00xMyAyMEgyNyIgc3Ryb2tlPSIjOUE5QTlBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, statusFilter, currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      setOfflineMode(false);

      try {
        let endpoint = '';
        if (user.role === 'retailer') {
          endpoint = 'retailer';
        } else if (user.role === 'wholesaler') {
          endpoint = 'wholesaler';
        } else if (user.role === 'transporter') {
          endpoint = 'transporter';
        } else {
          throw new Error('Invalid user role');
        }

        const response = await fetch(
          `${API_BASE_URL}/api/retailer-orders/${endpoint}?status=${statusFilter}&page=${currentPage}&limit=${limit}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
          setTotalPages(data.totalPages || 1);
          
          if (isElectron) {
            await window.electronAPI.storage.setPersistent('orders_data', {
              data: data.orders || [],
              totalPages: data.totalPages || 1,
              lastUpdated: new Date().toISOString(),
              statusFilter,
              currentPage
            });
          }

          const indexes = {};
          (data.orders || []).forEach(order => {
            if (order.product?.images?.length > 0) {
              indexes[order._id] = 0;
            }
          });
          setActiveImageIndexes(indexes);
          return;
        }
      } catch (networkError) {
        console.log('Network unavailable, trying cached orders data');
      }

      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('orders_data');
        if (cachedData.success && cachedData.value?.data) {
          setOrders(cachedData.value.data);
          setTotalPages(cachedData.value.totalPages || 1);
          setOfflineMode(true);
          setError('Using cached data - No network connection');
          
          const indexes = {};
          cachedData.value.data.forEach(order => {
            if (order.product?.images?.length > 0) {
              indexes[order._id] = 0;
            }
          });
          setActiveImageIndexes(indexes);
          return;
        }
      }

      throw new Error('No network connection and no cached data available');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const handleStatusUpdate = async (orderId, newStatus, cancellationReason = '', disputeReason = '') => {
    try {
      const updateData = { 
        status: newStatus
      };
      
      if (cancellationReason) {
        updateData.cancellationReason = cancellationReason;
      }
      
      if (disputeReason) {
        updateData.disputeReason = disputeReason;
      }

      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_order_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        actions.push({
          type: 'status_update',
          orderId,
          data: updateData,
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_order_actions', actions);
        
        setOrders(prev => prev.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus, cancellationReason, deliveryDispute: disputeReason ? { reason: disputeReason } : null }
            : order
        ));
        
        window.electronAPI.showNotification(
          'Update Saved Offline',
          'Order status update saved and will sync when online'
        );
        
        setSelectedOrder(null);
        setDisputeReason('');
        setSuccessMessage('Update saved offline and will sync when connected.');
        setTimeout(() => setSuccessMessage(''), 5000);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/retailer-orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      if (isElectron) {
        window.electronAPI.showNotification(
          'Order Updated',
          `Order status updated to ${newStatus.replace(/_/g, ' ')}`
        );
      }

      fetchOrders();
      setSelectedOrder(null);
      setDisputeReason('');
      
      if (newStatus === 'certified') {
        setSuccessMessage('Delivery certified successfully! Thank you for your confirmation.');
      } else if (newStatus === 'disputed') {
        setSuccessMessage('Delivery dispute submitted. The wholesaler will review your concerns.');
      }
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Update Failed',
          err.message || 'Failed to update order status'
        );
      }
    }
  };

  const handleDeliveryCertification = async (order, certified) => {
    if (certified) {
      await handleStatusUpdate(order._id, 'certified');
    } else {
      setSelectedOrder({ ...order, action: 'dispute' });
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_order_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        actions.push({
          type: 'delete',
          orderId,
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_order_actions', actions);
        
        setOrders(prev => prev.filter(order => order._id !== orderId));
        
        window.electronAPI.showNotification(
          'Delete Saved Offline',
          'Order deletion saved and will sync when online'
        );
        
        setSuccessMessage('Order deletion saved offline and will sync when connected.');
        setTimeout(() => setSuccessMessage(''), 5000);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/retailer-orders/${orderId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      if (isElectron) {
        window.electronAPI.showNotification(
          'Order Deleted',
          'Order has been deleted successfully'
        );
      }

      fetchOrders();
      setSuccessMessage('Order deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(err.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Delete Failed',
          err.message || 'Failed to delete order'
        );
      }
    }
  };

  const handleExportOrders = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      userRole: user?.role,
      statusFilter,
      totalOrders: filteredOrders.length,
      orders: filteredOrders
    };

    if (isElectron) {
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `orders-${user?.role}-${statusFilter}-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          `Orders data exported successfully`
        );
      }
    } else {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${user?.role}-${statusFilter}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      assigned_to_transporter: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      accepted_by_transporter: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      certified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      disputed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
      return_to_wholesaler: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      return_accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      return_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled_by_retailer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled_by_wholesaler: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled_by_transporter: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getDeliveryCertificationStatus = (order) => {
    if (order.status === 'certified') {
      return {
        text: 'Delivery Certified',
        date: order.deliveryCertificationDate ? new Date(order.deliveryCertificationDate).toLocaleDateString() : ''
      };
    } else if (order.status === 'disputed') {
      return {
        text: 'Delivery Disputed',
        date: order.deliveryDispute?.disputedAt ? new Date(order.deliveryDispute.disputedAt).toLocaleDateString() : ''
      };
    }
    return null;
  };

  const getActionButtons = (order) => {
    if (!user) return [];
    
    const buttons = [];
    
    if (user.role === 'retailer') {
      if (['pending', 'rejected', 'return_accepted', 'return_rejected', 'cancelled_by_wholesaler'].includes(order.status)) {
        buttons.push(
          <button
            key="delete"
            onClick={() => handleDeleteOrder(order._id)}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Delete Order"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        );
      }
      
      if (['pending', 'accepted', 'processing'].includes(order.status)) {
        buttons.push(
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Cancel Order"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        );
      }
      
      if (order.status === 'delivered') {
        buttons.push(
          <button
            key="certify"
            onClick={() => handleDeliveryCertification(order, true)}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Certify Delivery"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Certify
          </button>,
          <button
            key="dispute"
            onClick={() => handleDeliveryCertification(order, false)}
            className="px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Dispute Delivery"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Dispute
          </button>
        );
      }
    }
    
    if (user.role === 'wholesaler') {
      if (order.status === 'pending') {
        buttons.push(
          <button
            key="accept"
            onClick={() => handleStatusUpdate(order._id, 'accepted')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Accept Order"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>,
          <button
            key="reject"
            onClick={() => setSelectedOrder({ ...order, action: 'reject' })}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Reject Order"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        );
      }
      
      if (order.status === 'accepted') {
        buttons.push(
          <button
            key="process"
            onClick={() => handleStatusUpdate(order._id, 'processing')}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Process Order"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Process
          </button>,
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Cancel Order"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        );
      }
      
      if (order.status === 'processing') {
        buttons.push(
          <button
            key="assign"
            onClick={() => setSelectedOrder({ ...order, action: 'assign' })}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Assign to Transporter"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Assign
          </button>
        );
      }
      
      if (order.status === 'return_to_wholesaler') {
        buttons.push(
          <button
            key="accept-return"
            onClick={() => setSelectedOrder({ ...order, action: 'accept_return' })}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Accept Return"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept Return
          </button>,
          <button
            key="reject-return"
            onClick={() => setSelectedOrder({ ...order, action: 'reject_return' })}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Reject Return"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject Return
          </button>
        );
      }
      
      if (order.status === 'disputed') {
        buttons.push(
          <button
            key="resolve"
            onClick={() => setSelectedOrder({ ...order, action: 'resolve' })}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Resolve Dispute"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Resolve
          </button>
        );
      }
    }
    
    if (user.role === 'transporter') {
      if (order.status === 'assigned_to_transporter') {
        buttons.push(
          <button
            key="transit"
            onClick={() => handleStatusUpdate(order._id, 'in_transit')}
            className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Start Transport"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start
          </button>,
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Cancel Transport"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        );
      }
      
      if (order.status === 'in_transit') {
        buttons.push(
          <button
            key="deliver"
            onClick={() => handleStatusUpdate(order._id, 'delivered')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Mark as Delivered"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Deliver
          </button>
        );
      }
      
      if (order.status === 'disputed') {
        buttons.push(
          <button
            key="return"
            onClick={() => setSelectedOrder({ ...order, action: 'return' })}
            className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
            title="Return to Wholesaler"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Return
          </button>
        );
      }
    }
    
    return (
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        {buttons}
      </div>
    );
  };

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">
            {selectedOrder.action === 'cancel' && 'Cancel Order'}
            {selectedOrder.action === 'reject' && 'Reject Order'}
            {selectedOrder.action === 'assign' && 'Assign to Transporter'}
            {selectedOrder.action === 'dispute' && 'Dispute Delivery'}
            {selectedOrder.action === 'resolve' && 'Resolve Dispute'}
            {selectedOrder.action === 'accept_return' && 'Accept Return'}
            {selectedOrder.action === 'reject_return' && 'Reject Return'}
            {selectedOrder.action === 'return' && 'Return to Wholesaler'}
          </h3>
          
          {(selectedOrder.action === 'cancel' || selectedOrder.action === 'reject' || selectedOrder.action === 'dispute' || selectedOrder.action === 'reject_return' || selectedOrder.action === 'return') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                rows="4"
                placeholder={
                  selectedOrder.action === 'dispute' 
                    ? "Explain why you are not satisfied with the delivery..." 
                    : selectedOrder.action === 'return'
                    ? "Explain why you are returning the order to the wholesaler..."
                    : "Enter reason for cancellation/rejection"
                }
                value={selectedOrder.action === 'dispute' || selectedOrder.action === 'return' ? disputeReason : selectedOrder.cancellationReason || ''}
                onChange={(e) => {
                  if (selectedOrder.action === 'dispute' || selectedOrder.action === 'return') {
                    setDisputeReason(e.target.value);
                  } else {
                    setSelectedOrder({
                      ...selectedOrder, 
                      cancellationReason: e.target.value 
                    });
                  }
                }}
              />
            </div>
          )}
          
          {selectedOrder.action === 'assign' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transporter ID
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                placeholder="Enter transporter ID"
                onChange={(e) => setSelectedOrder({
                  ...selectedOrder, 
                  transporterId: e.target.value 
                })}
              />
            </div>
          )}
          
          {selectedOrder.action === 'resolve' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resolution Notes
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                rows="4"
                placeholder="Enter resolution notes..."
                onChange={(e) => setSelectedOrder({
                  ...selectedOrder, 
                  resolutionNotes: e.target.value 
                })}
              />
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    onChange={(e) => setSelectedOrder({
                      ...selectedOrder, 
                      reassign: e.target.checked 
                    })}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Reassign to another transporter</span>
                </label>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setSelectedOrder(null);
                setDisputeReason('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                let newStatus = '';
                if (selectedOrder.action === 'cancel') {
                  newStatus = user.role === 'retailer' ? 'cancelled_by_retailer' :
                              user.role === 'wholesaler' ? 'cancelled_by_wholesaler' :
                              'cancelled_by_transporter';
                } else if (selectedOrder.action === 'reject') {
                  newStatus = 'rejected';
                } else if (selectedOrder.action === 'assign') {
                  newStatus = 'assigned_to_transporter';
                } else if (selectedOrder.action === 'dispute') {
                  newStatus = 'disputed';
                } else if (selectedOrder.action === 'return') {
                  newStatus = 'return_to_wholesaler';
                } else if (selectedOrder.action === 'accept_return') {
                  newStatus = 'return_accepted';
                } else if (selectedOrder.action === 'reject_return') {
                  newStatus = 'return_rejected';
                }
                
                if (selectedOrder.action === 'dispute' || selectedOrder.action === 'return') {
                  handleStatusUpdate(
                    selectedOrder._id, 
                    newStatus, 
                    '', 
                    disputeReason
                  );
                } else if (selectedOrder.action === 'resolve') {
                  handleResolveDispute(selectedOrder);
                } else if (selectedOrder.action === 'accept_return' || selectedOrder.action === 'reject_return') {
                  handleReturnRequest(selectedOrder);
                } else {
                  handleStatusUpdate(
                    selectedOrder._id, 
                    newStatus, 
                    selectedOrder.cancellationReason
                  );
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                (selectedOrder.action === 'dispute' && !disputeReason.trim()) ||
                (selectedOrder.action === 'resolve' && !selectedOrder.resolutionNotes?.trim()) ||
                (selectedOrder.action === 'return' && !disputeReason.trim()) ||
                (selectedOrder.action === 'reject_return' && !selectedOrder.cancellationReason?.trim())
              }
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleResolveDispute = async (order) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/retailer-orders/${order._id}/resolve-dispute`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            resolutionNotes: order.resolutionNotes,
            reassign: order.reassign || false
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve dispute');
      }

      if (isElectron) {
        window.electronAPI.showNotification(
          'Dispute Resolved',
          'Dispute has been resolved successfully'
        );
      }

      fetchOrders();
      setSelectedOrder(null);
      setSuccessMessage('Dispute resolved successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error resolving dispute:', err);
      setError(err.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Resolution Failed',
          err.message || 'Failed to resolve dispute'
        );
      }
    }
  };

  const handleReturnRequest = async (order) => {
    try {
      const endpoint = `${API_BASE_URL}/api/retailer-orders/${order._id}/handle-return`;
      
      let body = {
        action: order.action === 'accept_return' ? 'accept' : 'reject'
      };
      
      if (order.action === 'reject_return' && order.cancellationReason) {
        body.rejectionReason = order.cancellationReason;
      }

      const response = await fetch(
        endpoint,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to handle return request');
      }

      if (isElectron) {
        window.electronAPI.showNotification(
          'Return Handled',
          `Return request ${order.action === 'accept_return' ? 'accepted' : 'rejected'} successfully`
        );
      }

      fetchOrders();
      setSelectedOrder(null);
      setSuccessMessage(`Return request ${order.action === 'accept_return' ? 'accepted' : 'rejected'} successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Error handling return request:', err);
      setError(err.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Action Failed',
          err.message || 'Failed to handle return request'
        );
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    const productName = order.product?.name?.toLowerCase() || '';
    const retailerName = order.retailer?.businessName?.toLowerCase() || '';
    const wholesalerName = order.wholesaler?.businessName?.toLowerCase() || '';
    
    return (
      productName.includes(query) ||
      retailerName.includes(query) ||
      wholesalerName.includes(query)
    );
  });

  if (!user) {
    return (
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">My Orders</h2>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Please log in to view your orders
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Orders</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isElectron ? 'Loading from local cache and network...' : 'Loading your orders...'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
              {isElectron ? 'Loading orders (offline capable)...' : 'Loading orders...'}
            </span>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Orders</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your orders and track their status
              {isElectron && ' • Desktop Mode'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            {user?.role && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            )}
            
            {isElectron && (
              <button
                onClick={handleExportOrders}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export orders data to JSON file"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search orders by product or business name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-40"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="processing">Processing</option>
                <option value="assigned_to_transporter">Assigned</option>
                <option value="accepted_by_transporter">Accepted by Transporter</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="certified">Certified</option>
                <option value="disputed">Disputed</option>
                <option value="return_to_wholesaler">Return Requested</option>
                <option value="return_accepted">Return Accepted</option>
                <option value="return_rejected">Return Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {filteredOrders.length} of {orders.length} orders
            {offlineMode && isElectron && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                Offline
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                {offlineMode && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    You can still view and manage orders. Changes will sync when you're back online.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 dark:text-green-300 text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Orders Grid */}
        <div className="overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No matching orders' : 'No orders found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                {searchQuery
                  ? `No orders match "${searchQuery}" with your current filters.`
                  : statusFilter !== 'all'
                  ? `No orders found with status "${statusFilter}".`
                  : 'You haven\'t placed any orders yet.'
                }
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {setSearchQuery(''); setStatusFilter('all');}}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {filteredOrders.map((order) => {
                const images = order.product?.images || [];
                const currentImageIndex = activeImageIndexes[order._id] || 0;
                const currentImage = images[currentImageIndex]?.url;
                const hasMultipleImages = images.length > 1;
                const certificationStatus = getDeliveryCertificationStatus(order);

                return (
                  <div 
                    key={order._id} 
                    className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group flex flex-col"
                  >
                    {/* Product Image - Prominently placed at top */}
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {currentImage ? (
                        <img
                          src={currentImage}
                          alt={order.product?.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => { e.target.src = placeholderImage; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Image Navigation */}
                      {hasMultipleImages && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageNavigation(order._id, 'prev', images.length);
                            }}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-all duration-200 backdrop-blur-sm"
                            aria-label="Previous image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageNavigation(order._id, 'next', images.length);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-all duration-200 backdrop-blur-sm"
                            aria-label="Next image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>

                          {/* Image Indicators */}
                          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
                            {images.map((_, index) => (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndexes(prev => ({ ...prev, [order._id]: index }));
                                }}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                  currentImageIndex === index 
                                    ? 'bg-white scale-125' 
                                    : 'bg-white/50 hover:bg-white/80'
                                }`}
                                aria-label={`View image ${index + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Order ID Badge */}
                      <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
                        #{order._id.slice(-8).toUpperCase()}
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} backdrop-blur-sm bg-opacity-90`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Product Info */}
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {order.product?.name || 'N/A'}
                        </h3>
                        
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {order.quantity} {order.measurementUnit}
                          </span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            UGX {order.totalPrice?.toLocaleString() || 'N/A'}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <p className="truncate">
                            {user.role === 'retailer' 
                              ? `Supplier: ${order.wholesaler?.businessName || order.wholesaler?.firstName || 'N/A'}`
                              : `Customer: ${order.retailer?.businessName || order.retailer?.firstName || 'N/A'}`
                            }
                          </p>
                          {order.deliveryPlace && (
                            <p className="truncate">📍 {order.deliveryPlace}</p>
                          )}
                          <p>📅 Ordered: {new Date(order.createdAt).toLocaleDateString()}</p>
                          {order.actualDeliveryDate && (
                            <p>🚚 Delivered: {new Date(order.actualDeliveryDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>

                      {/* Certification Status */}
                      {certificationStatus && (
                        <div className={`mb-3 p-2 rounded-lg ${
                          order.status === 'certified' 
                            ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                            : 'bg-rose-50 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
                        }`}>
                          <p className={`font-medium text-xs ${
                            order.status === 'certified' 
                              ? 'text-emerald-800 dark:text-emerald-300' 
                              : 'text-rose-800 dark:text-rose-300'
                          }`}>
                            {certificationStatus.text}
                          </p>
                          {certificationStatus.date && (
                            <p className={`text-xs mt-0.5 ${
                              order.status === 'certified' 
                                ? 'text-emerald-700 dark:text-emerald-400' 
                                : 'text-rose-700 dark:text-rose-400'
                            }`}>
                              On: {certificationStatus.date}
                            </p>
                          )}
                          {order.status === 'disputed' && order.deliveryDispute?.reason && (
                            <p className={`text-xs mt-0.5 ${
                              order.status === 'certified' 
                                ? 'text-emerald-700 dark:text-emerald-400' 
                                : 'text-rose-700 dark:text-rose-400'
                            }`}>
                              Reason: {order.deliveryDispute.reason}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Return Details */}
                      {(order.status === 'return_to_wholesaler' || order.status === 'return_accepted' || order.status === 'return_rejected') && order.returnDetails && (
                        <div className={`mb-3 p-2 rounded-lg ${
                          order.status === 'return_accepted' 
                            ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                            : order.status === 'return_rejected'
                            ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                            : 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                        }`}>
                          <p className={`font-medium text-xs ${
                            order.status === 'return_accepted' 
                              ? 'text-green-800 dark:text-green-300' 
                              : order.status === 'return_rejected'
                              ? 'text-red-800 dark:text-red-300'
                              : 'text-amber-800 dark:text-amber-300'
                          }`}>
                            {order.status === 'return_accepted' 
                              ? 'Return Accepted' 
                              : order.status === 'return_rejected'
                              ? 'Return Rejected'
                              : 'Return Requested'}
                          </p>
                          {order.returnDetails.returnReason && (
                            <p className={`text-xs mt-0.5 ${
                              order.status === 'return_accepted' 
                                ? 'text-green-700 dark:text-green-400' 
                                : order.status === 'return_rejected'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              Reason: {order.returnDetails.returnReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {getActionButtons(order)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Action Modal */}
        {renderOrderDetails()}
      </div>
    </ErrorBoundary>
  );
};

export default Orders;