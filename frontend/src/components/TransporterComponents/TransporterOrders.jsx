import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const TransporterOrders = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchTransporterOrders();
  }, [filterStatus, showFreeOrders]);

  const fetchTransporterOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('includeFree', showFreeOrders.toString());
      
      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/transporter?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders || []);
        
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
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async () => {
    try {
      const token = localStorage.getItem('token');
      let updateData = { status: actionType };

      if (actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter') {
        updateData.cancellationReason = cancellationReason;
      }

      if (actionType === 'return_to_wholesaler') {
        updateData.returnReason = returnReason;
      }

      // For free assignment orders, we need to set the transporter when accepting
      if (actionType === 'accepted_by_transporter' && getOrderType(selectedOrder) === 'free') {
        updateData.transporterId = user.id;
      }

      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/${selectedOrder._id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update order: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (data.success) {
        // Refresh orders list
        fetchTransporterOrders();
        setShowActionModal(false);
        setSelectedOrder(null);
        setActionType('');
        setCancellationReason('');
        setReturnReason('');
        
        // Show success message
        setError(null);
        setSuccessMessage(`Order ${getActionSuccessMessage(actionType)} successfully!`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        throw new Error(data.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      setError(error.message);
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
      // Only the transporter who delivered can initiate return
      if (orderType === 'specific' && order.transporter && 
          (order.transporter._id === user.id || order.transporter === user.id)) {
        actions.push('return_to_wholesaler');
      }
    }
    else if (currentStatus === 'return_to_wholesaler') {
      // Transporter can track return status but no further actions
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2 h-[calc(100vh-150px)] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">My Orders</h2>
          <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-300">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2 h-[calc(100vh-150px)] flex flex-col">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">My Orders</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800 flex flex-col flex-1 justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-2 rounded-full dark:bg-red-900/30 mb-3">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-red-800 dark:text-red-300 mb-1">Unable to load orders</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mb-3">{error}</p>
            <button
              onClick={fetchTransporterOrders}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2 h-[calc(100vh-95px)] flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Transport Orders</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Manage orders assigned to you and available for pickup
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-3 lg:mt-0">
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOrders}
                onChange={toggleFreeOrders}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                Show available orders
              </span>
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Filter by:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
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

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <div className="bg-red-100 p-2 rounded-full dark:bg-red-900/30 mr-3">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full dark:bg-green-900/30 mr-3">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 dark:bg-gray-700">
              <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">No orders found</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {filterStatus === 'all' 
                ? `You don't have any orders ${showFreeOrders ? 'assigned to you or available' : 'assigned to you'} yet.`
                : `No orders with status "${filterStatus}" found.`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1 -mr-1">
          {orders.map((order) => {
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
              <div key={order._id} className={`border rounded-lg p-3 flex flex-col ${
                orderType === 'free' 
                  ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20' 
                  : orderType === 'specific'
                  ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 dark:bg-gray-800/50'
              }`}>
                <div className="flex flex-col mb-2">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </h3>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadgeClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  
                  {assignmentInfo && (
                    <div className={`mb-1 p-1 rounded-md text-[10px] ${
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
                    <div className="mb-1 p-1 rounded-md text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200">
                      <p className="font-medium">Disputed by {disputeInfo.disputedBy}</p>
                      <p>Reason: {disputeInfo.reason}</p>
                      {disputeInfo.disputedAt && <p>On: {disputeInfo.disputedAt}</p>}
                    </div>
                  )}
                  
                  {returnInfo && (
                    <div className={`mb-1 p-1 rounded-md text-[10px] ${
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
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-600 dark:text-gray-400">
                    <span className="font-medium">From:</span>
                    <span>{order.wholesaler?.businessName || `${order.wholesaler?.firstName} ${order.wholesaler?.lastName}`}</span>
                    
                    <span className="font-medium">To:</span>
                    <span>{order.retailer?.businessName || `${order.retailer?.firstName} ${order.retailer?.lastName}`}</span>
                    
                    <span className="font-medium">Date:</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="relative mb-2">
                  {currentImage ? (
                    <div className="relative w-full h-20">
                      <img
                        src={currentImage}
                        alt={order.product?.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                      {hasMultipleImages && (
                        <>
                          <button
                            onClick={() => handleImageNavigation(order._id, 'prev', images.length)}
                            className="absolute left-0.5 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-0.5 rounded-full hover:bg-opacity-75 transition-opacity duration-200"
                            aria-label="Previous image"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleImageNavigation(order._id, 'next', images.length)}
                            className="absolute right-0.5 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-0.5 rounded-full hover:bg-opacity-75 transition-opacity duration-200"
                            aria-label="Next image"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-[10px] px-0.5 rounded">
                            {currentImageIndex + 1}/{images.length}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-20 bg-gray-200 rounded-md flex items-center justify-center dark:bg-gray-700">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="mb-2 flex-1">
                  <h4 className="font-medium text-gray-90 dark:text-white text-xs mb-0.5 line-clamp-1">
                    {order.product?.name}
                  </h4>
                  <div className="space-y-0.5 text-[10px]">
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
                  <div className="mb-2">
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 bg-gray-50 p-1 rounded dark:bg-gray-700 line-clamp-2">
                      <span className="font-medium">Notes:</span> {order.orderNotes}
                    </p>
                  </div>
                )}

                {canTakeAction && allowedActions.length > 0 && (
                  <div className="flex flex-col gap-1 mt-auto pt-2">
                    {allowedActions.map(action => (
                      <button
                        key={action}
                        onClick={() => openActionModal(order, action)}
                        className={`w-full px-2 py-1 rounded-md text-[10px] font-medium transition-colors duration-200 ${getActionButtonClass(action)}`}
                      >
                        {getActionText(action)}
                      </button>
                    ))}
                  </div>
                )}

                {!canTakeAction && (
                  <div className="mt-auto pt-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center italic">
                      Assigned to another transporter
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showActionModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {getActionText(actionType)} - Order #{selectedOrder._id.slice(-8).toUpperCase()}
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
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
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  rows="3"
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedOrder(null);
                  setActionType('');
                  setCancellationReason('');
                  setReturnReason('');
                }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleOrderAction}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${getActionButtonClass(actionType)}`}
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