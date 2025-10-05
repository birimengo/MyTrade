import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [returnRejectionReason, setReturnRejectionReason] = useState('');
  const [transporters, setTransporters] = useState([]);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [assignmentType, setAssignmentType] = useState('specific');
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [transporterError, setTransporterError] = useState(null);
  const [showCancellationDetails, setShowCancellationDetails] = useState(false);
  const [showReturnDetails, setShowReturnDetails] = useState(false);

  useEffect(() => {
    fetchWholesalerOrders();
    fetchTransporters();
  }, [filterStatus]);

  const fetchWholesalerOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/wholesaler?status=${filterStatus}`,
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

  const fetchTransporters = async () => {
    try {
      setLoadingTransporters(true);
      setTransporterError(null);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/transporters/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transporters: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTransporters(data.transporters || []);
      } else {
        throw new Error(data.message || 'Failed to fetch transporters');
      }
    } catch (error) {
      console.error('Error fetching transporters:', error);
      setTransporterError(error.message);
    } finally {
      setLoadingTransporters(false);
    }
  };

  const handleOrderAction = async () => {
    try {
      // Check if user is trying to skip steps
      if (actionType === 'assigned_to_transporter' && 
          (selectedOrder.status === 'pending' || selectedOrder.status === 'accepted')) {
        
        // Determine which step they need to complete first
        let requiredAction = '';
        let message = '';
        
        if (selectedOrder.status === 'pending') {
          requiredAction = 'accepted';
          message = 'You need to accept this order first before assigning it to a transporter.';
        } else if (selectedOrder.status === 'accepted') {
          requiredAction = 'processing';
          message = 'You need to start processing this order before assigning it to a transporter.';
        }
        
        // Show guidance instead of error
        setError(message);
        setShowModal(false);
        
        // Automatically open the correct action modal after a delay
        setTimeout(() => {
          openActionModal(selectedOrder, requiredAction);
        }, 1500);
        
        return;
      }

      const token = localStorage.getItem('token');
      let updateData = { 
        status: actionType,
        assignmentType: assignmentType
      };

      if (actionType === 'cancelled_by_wholesaler') {
        updateData.cancellationReason = cancellationReason;
      } else if (actionType === 'assigned_to_transporter') {
        if (assignmentType === 'specific') {
          updateData.transporterId = transporterId;
        }
      } else if (actionType === 'return_accepted' || actionType === 'return_rejected') {
        updateData.rejectionReason = returnRejectionReason;
      }

      let endpoint = `http://localhost:5000/api/retailer-orders/${selectedOrder._id}/status`;
      
      // Use different endpoint for return handling
      if (actionType === 'return_accepted' || actionType === 'return_rejected') {
        endpoint = `http://localhost:5000/api/retailer-orders/${selectedOrder._id}/handle-return`;
        updateData = {
          action: actionType === 'return_accepted' ? 'accept' : 'reject',
          rejectionReason: returnRejectionReason
        };
      }

      const response = await fetch(
        endpoint,
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
        // Show success message based on action
        let message = 'Order updated successfully';
        if (actionType === 'accepted') {
          message = 'Order accepted! You can now start processing it.';
        } else if (actionType === 'processing') {
          message = 'Order processing started! You can now assign it to a transporter.';
        } else if (actionType === 'assigned_to_transporter') {
          message = 'Order assigned to transporter successfully!';
        } else if (actionType === 'return_accepted') {
          message = 'Return request accepted! Payment has been refunded.';
        } else if (actionType === 'return_rejected') {
          message = 'Return request rejected.';
        }
        
        setSuccessMessage(message);
        setError(null);
        
        // Refresh orders list
        fetchWholesalerOrders();
        setShowModal(false);
        setSelectedOrder(null);
        setActionType('');
        setTransporterId('');
        setCancellationReason('');
        setReturnRejectionReason('');
        setAssignmentType('specific');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        throw new Error(data.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      // Only show error if it's not a step-skipping issue (already handled above)
      if (!error.message.includes('Invalid status transition')) {
        setError(error.message);
      }
    }
  };

  const openActionModal = (order, action) => {
    setSelectedOrder(order);
    setActionType(action);
    setShowModal(true);
    setAssignmentType('specific');
    setTransporterId('');
    setCancellationReason('');
    setReturnRejectionReason('');
    
    // Refresh transporters list when opening modal
    if (action === 'assigned_to_transporter') {
      fetchTransporters();
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
      case 'return_accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'return_rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled_by_retailer':
      case 'cancelled_by_wholesaler':
      case 'rejected_by_transporter':
      case 'cancelled_by_transporter': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getOrderWorkflowGuidance = (order) => {
    const steps = [
      { status: 'pending', action: 'Accept or reject the order', completed: order.status !== 'pending' },
      { status: 'accepted', action: 'Start processing the order', completed: ['processing', 'assigned_to_transporter', 'accepted_by_transporter', 'in_transit', 'delivered', 'certified', 'disputed'].includes(order.status) },
      { status: 'processing', action: 'Assign to a transporter', completed: ['assigned_to_transporter', 'accepted_by_transporter', 'in_transit', 'delivered', 'certified', 'disputed'].includes(order.status) },
      { status: 'assigned_to_transporter', action: 'Wait for transporter to accept', completed: ['accepted_by_transporter', 'in_transit', 'delivered', 'certified', 'disputed'].includes(order.status) },
      { status: 'accepted_by_transporter', action: 'Order is being delivered', completed: ['in_transit', 'delivered', 'certified', 'disputed'].includes(order.status) },
      { status: 'in_transit', action: 'Order is being delivered', completed: ['delivered', 'certified', 'disputed'].includes(order.status) },
      { status: 'delivered', action: 'Wait for retailer certification', completed: ['certified', 'disputed'].includes(order.status) },
      { status: 'certified', action: 'Order completed successfully', completed: order.status === 'certified' },
      { status: 'disputed', action: 'Handle retailer dispute', completed: ['return_to_wholesaler', 'assigned_to_transporter'].includes(order.status) },
      { status: 'return_to_wholesaler', action: 'Review return request', completed: ['return_accepted', 'return_rejected'].includes(order.status) }
    ];

    return steps;
  };

  const getAllowedActions = (order) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending':
        actions.push('accepted', 'rejected');
        break;
      case 'accepted':
        actions.push('processing', 'cancelled_by_wholesaler');
        break;
      case 'processing':
        actions.push('assigned_to_transporter', 'cancelled_by_wholesaler');
        break;
      case 'assigned_to_transporter':
        // Allow reassignment if assignment expired or transporter rejected
        if (order.assignmentExpiry) {
          const expiryTime = new Date(order.assignmentExpiry).getTime();
          if (expiryTime < Date.now()) {
            actions.push('assigned_to_transporter');
          }
        }
        break;
      case 'rejected_by_transporter':
      case 'cancelled_by_transporter':
      case 'return_rejected':
        actions.push('assigned_to_transporter');
        break;
      case 'disputed':
        // Allow reassignment for disputed orders
        actions.push('assigned_to_transporter');
        break;
      case 'return_to_wholesaler':
        // Handle return requests
        actions.push('return_accepted', 'return_rejected');
        break;
      default:
        // No additional actions for other statuses
        break;
    }
    
    return actions;
  };

  const getActionButtonClass = (action) => {
    switch (action) {
      case 'accepted': 
      case 'return_accepted': return 'bg-green-600 hover:bg-green-700 text-white';
      case 'rejected':
      case 'cancelled_by_wholesaler': 
      case 'return_rejected': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'processing': return 'bg-purple-600 hover:bg-purple-700 text-white';
      case 'assigned_to_transporter': return 'bg-indigo-600 hover:bg-indigo-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'accepted': return 'Accept Order';
      case 'rejected': return 'Reject Order';
      case 'processing': return 'Start Processing';
      case 'assigned_to_transporter': return 'Assign Order';
      case 'cancelled_by_wholesaler': return 'Cancel Order';
      case 'return_accepted': return 'Accept Return';
      case 'return_rejected': return 'Reject Return';
      default: return action;
    }
  };

  const getAssignmentStatus = (order) => {
    if (order.status !== 'assigned_to_transporter') return null;
    
    if (order.assignmentType === 'free') {
      return 'Waiting for any transporter to accept';
    }
    
    if (order.assignmentExpiry) {
      const expiryTime = new Date(order.assignmentExpiry).getTime();
      if (expiryTime < Date.now()) {
        return 'Assignment expired - needs re-assignment';
      }
      return `Waiting for ${order.transporter?.businessName || order.transporter?.firstName} to accept`;
    }
    
    return `Assigned to ${order.transporter?.businessName || order.transporter?.firstName}`;
  };

  const getCancellationDetails = (order) => {
    if (!order.cancellationDetails) return null;
    
    return {
      cancelledBy: order.cancellationDetails.cancelledBy?.businessName || 
                  `${order.cancellationDetails.cancelledBy?.firstName} ${order.cancellationDetails.cancelledBy?.lastName}`,
      cancelledAt: new Date(order.cancellationDetails.cancelledAt).toLocaleString(),
      reason: order.cancellationDetails.reason,
      previousStatus: order.cancellationDetails.previousStatus
    };
  };

  const getReturnDetails = (order) => {
    if (!order.returnDetails) return null;
    
    return {
      returnedBy: order.returnDetails.returnedBy?.businessName || 
                 `${order.returnDetails.returnedBy?.firstName} ${order.returnDetails.returnedBy?.lastName}`,
      returnRequestedAt: order.returnDetails.returnRequestedAt ? new Date(order.returnDetails.returnRequestedAt).toLocaleString() : '',
      returnReason: order.returnDetails.returnReason,
      returnAcceptedAt: order.returnDetails.returnAcceptedAt ? new Date(order.returnDetails.returnAcceptedAt).toLocaleString() : '',
      returnRejectedAt: order.returnDetails.returnRejectedAt ? new Date(order.returnDetails.returnRejectedAt).toLocaleString() : '',
      returnRejectionReason: order.returnDetails.returnRejectionReason,
      status: order.status
    };
  };

  const getDisputeDetails = (order) => {
    // Only show dispute details for orders with return_to_wholesaler status
    if (!order.deliveryDispute || order.status !== 'return_to_wholesaler') return null;
    
    return {
      disputedBy: order.deliveryDispute.disputedBy?.businessName || 
                 `${order.deliveryDispute.disputedBy?.firstName} ${order.deliveryDispute.disputedBy?.lastName}`,
      disputedAt: order.deliveryDispute.disputedAt ? new Date(order.deliveryDispute.disputedAt).toLocaleString() : '',
      reason: order.deliveryDispute.reason,
      resolved: order.deliveryDispute.resolved,
      resolvedAt: order.deliveryDispute.resolvedAt ? new Date(order.deliveryDispute.resolvedAt).toLocaleString() : '',
      resolutionNotes: order.deliveryDispute.resolutionNotes
    };
  };

  const getAssignmentHistory = (order) => {
    if (!order.assignmentHistory || order.assignmentHistory.length === 0) return null;
    
    return order.assignmentHistory.map(assignment => ({
      transporter: assignment.transporter?.businessName || 
                  `${assignment.transporter?.firstName} ${assignment.transporter?.lastName}` ||
                  'Free assignment',
      assignedAt: new Date(assignment.assignedAt).toLocaleString(),
      assignmentType: assignment.assignmentType,
      status: assignment.status,
      reason: assignment.reason,
      expiredAt: assignment.expiredAt ? new Date(assignment.expiredAt).toLocaleString() : null
    }));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Orders</h2>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-2">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Orders from Retailers</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage orders placed by retailers for your products
          </p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 lg:mt-0">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filter by:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value='accepted'>Accepted</option>
            <option value='processing'>Processing</option>
            <option value='assigned_to_transporter'>Assigned</option>
            <option value='accepted_by_transporter'>Accepted by Transporter</option>
            <option value='in_transit'>In Transit</option>
            <option value='delivered'>Delivered</option>
            <option value='certified'>Certified</option>
            <option value='disputed'>Disputed</option>
            <option value='return_to_wholesaler'>Return Requests</option>
            <option value='return_accepted'>Returns Accepted</option>
            <option value='return_rejected'>Returns Rejected</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 dark:bg-red-900/20 dark:border-red-800">
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

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 dark:bg-green-900/20 dark:border-green-800">
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
        <div className="text-center py-12">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders found</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filterStatus === 'all' 
              ? 'You haven\'t received any orders yet.'
              : `No orders with status "${filterStatus}" found.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[400px] overflow-y-auto">
          {orders.map((order) => {
            const images = order.product?.images || [];
            const currentImageIndex = activeImageIndexes[order._id] || 0;
            const currentImage = images[currentImageIndex]?.url;
            const hasMultipleImages = images.length > 1;
            const assignmentStatus = getAssignmentStatus(order);
            const workflowSteps = getOrderWorkflowGuidance(order);
            const cancellationDetails = getCancellationDetails(order);
            const returnDetails = getReturnDetails(order);
            const disputeDetails = getDisputeDetails(order);
            const assignmentHistory = getAssignmentHistory(order);

            return (
              <div key={order._id} className="border border-gray-200 rounded-xl p-4 dark:border-gray-700 dark:bg-gray-800/50 flex flex-col">
                <div className="flex flex-col mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    From: {order.retailer?.businessName || `${order.retailer?.firstName} ${order.retailer?.lastName}`}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {assignmentStatus && (
                  <div className="mb-2 p-2 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {assignmentStatus}
                    </p>
                  </div>
                )}

                {disputeDetails && (
                  <div className="mb-2 p-2 bg-rose-50 rounded-lg dark:bg-rose-900/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                          Disputed by: {disputeDetails.disputedBy}
                        </p>
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          Reason: {disputeDetails.reason}
                        </p>
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          On: {disputeDetails.disputedAt}
                        </p>
                        {disputeDetails.resolved && (
                          <p className="text-xs text-rose-600 dark:text-rose-400">
                            Resolved: {disputeDetails.resolvedAt}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {returnDetails && (
                  <div className="mb-2 p-2 bg-amber-50 rounded-lg dark:bg-amber-900/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Return requested by: {returnDetails.returnedBy}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Reason: {returnDetails.returnReason}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Requested: {returnDetails.returnRequestedAt}
                        </p>
                        {returnDetails.returnAcceptedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Accepted: {returnDetails.returnAcceptedAt}
                          </p>
                        )}
                        {returnDetails.returnRejectedAt && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Rejected: {returnDetails.returnRejectedAt}
                          </p>
                        )}
                        {returnDetails.returnRejectionReason && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Rejection Reason: {returnDetails.returnRejectionReason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowReturnDetails(!showReturnDetails)}
                        className="text-amber-600 dark:text-amber-400 text-xs"
                      >
                        {showReturnDetails ? 'Hide' : 'Show'} Details
                      </button>
                    </div>
                  </div>
                )}

                {cancellationDetails && (
                  <div className="mb-2 p-2 bg-red-50 rounded-lg dark:bg-red-900/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-700 dark:text-red-300">
                          Cancelled by: {cancellationDetails.cancelledBy}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Reason: {cancellationDetails.reason}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          On: {cancellationDetails.cancelledAt}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowCancellationDetails(!showCancellationDetails)}
                        className="text-red-600 dark:text-red-400 text-xs"
                      >
                        {showCancellationDetails ? 'Hide' : 'Show'} Details
                      </button>
                    </div>
                    
                    {showCancellationDetails && assignmentHistory && assignmentHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                          Assignment History:
                        </p>
                        {assignmentHistory.map((history, index) => (
                          <div key={index} className="text-xs text-red-600 dark:text-red-400 mb-1">
                            <p>• {history.transporter} - {history.status} on {history.assignedAt}</p>
                            {history.reason && <p className="ml-2">Reason: {history.reason}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative mb-3">
                  {currentImage ? (
                    <div className="relative w-full h-32">
                      <img
                        src={currentImage}
                        alt={order.product?.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {hasMultipleImages && (
                        <>
                          <button
                            onClick={() => handleImageNavigation(order._id, 'prev', images.length)}
                            className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200"
                            aria-label="Previous image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleImageNavigation(order._id, 'next', images.length)}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200"
                            aria-label="Next image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {currentImageIndex + 1}/{images.length}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center dark:bg-gray-700">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="mb-3 flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    {order.product?.name}
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-600 dark:text-gray-400">
                      {order.quantity} {order.measurementUnit} × UGX {order.unitPrice?.toLocaleString()}
                    </p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      Total: UGX {order.totalPrice?.toLocaleString()}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Location:</span> {order.deliveryPlace}
                    </p>
                  </div>
                </div>

                {/* Order Workflow Guidance */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Order Process:</p>
                  <div className="space-y-1">
                    {workflowSteps.map((step, index) => (
                      <div key={index} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          step.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}></div>
                        <span className={`text-xs ${
                          step.completed ? 'text-green-600 dark:text-green-400 line-through' : 
                          order.status === step.status ? 'text-blue-600 dark:text-blue-400 font-medium' : 
                          'text-gray-500 dark:text-gray-400'
                        }`}>
                          {step.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {order.orderNotes && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 p-2 rounded dark:bg-gray-700 line-clamp-2">
                      {order.orderNotes}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1 mt-auto pt-3">
                  {getAllowedActions(order).includes('accepted') && (
                    <button
                      onClick={() => openActionModal(order, 'accepted')}
                      className={`w-full px-1.5 py-0.5 rounded-lg text-[10px] font-medium transition-colors duration-200 ${getActionButtonClass('accepted')}`}
                    >
                      {getActionText('accepted')}
                    </button>
                  )}

                  <div className="flex flex-wrap justify-between gap-1">
                    {getAllowedActions(order).filter(action => action !== 'accepted').map(action => (
                      <button
                        key={action}
                        onClick={() => openActionModal(order, action)}
                        className={`flex-1 px-1.5 py-0.5 rounded-lg text-[10px] font-medium transition-colors duration-200 ${getActionButtonClass(action)}`}
                      >
                        {getActionText(action)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {getActionText(actionType)} - Order #{selectedOrder._id.slice(-8).toUpperCase()}
            </h3>

            {actionType === 'assigned_to_transporter' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignment Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="specific"
                        checked={assignmentType === 'specific'}
                        onChange={() => setAssignmentType('specific')}
                        className="mr-2"
                      />
                      <span className="text-sm">Specific Transporter</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="free"
                        checked={assignmentType === 'free'}
                        onChange={() => setAssignmentType('free')}
                        className="mr-2"
                      />
                      <span className="text-sm">Free Assignment</span>
                    </label>
                  </div>
                </div>

                {assignmentType === 'specific' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Transporter
                    </label>
                    {loadingTransporters ? (
                      <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Loading transporters...</p>
                      </div>
                    ) : transporterError ? (
                      <div className="p-3 bg-red-50 rounded-lg dark:bg-red-900/20">
                        <p className="text-sm text-red-600 dark:text-red-300">Error loading transporters</p>
                      </div>
                    ) : transporters.length > 0 ? (
                      <select
                        value={transporterId}
                        onChange={(e) => setTransporterId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        required
                      >
                        <option value="">Choose a transporter</option>
                        {transporters.map((transporter) => (
                          <option key={transporter._id} value={transporter._id}>
                            {transporter.businessName || `${transporter.firstName} ${transporter.lastName}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-yellow-50 rounded-lg dark:bg-yellow-900/20">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          No active transporters available. Please try free assignment.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {assignmentType === 'free' && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This order will be available for any active transporter to accept. The first transporter to accept will be assigned.
                    </p>
                  </div>
                )}
              </>
            )}

            {(actionType === 'rejected' || actionType === 'cancelled_by_wholesaler') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for {actionType === 'rejected' ? 'Rejection' : 'Cancellation'}
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  rows="3"
                  required
                />
              </div>
            )}

            {(actionType === 'return_accepted' || actionType === 'return_rejected') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {actionType === 'return_rejected' ? 'Reason for Rejection' : 'Notes'}
                </label>
                <textarea
                  value={returnRejectionReason}
                  onChange={(e) => setReturnRejectionReason(e.target.value)}
                  placeholder={actionType === 'return_rejected' ? 'Please provide a reason for rejecting this return...' : 'Add any notes about this return...'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  rows="3"
                  required={actionType === 'return_rejected'}
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedOrder(null);
                  setActionType('');
                  setTransporterId('');
                  setCancellationReason('');
                  setReturnRejectionReason('');
                  setAssignmentType('specific');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleOrderAction}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${getActionButtonClass(actionType)}`}
                disabled={
                  (actionType === 'assigned_to_transporter' && assignmentType === 'specific' && !transporterId) ||
                  ((actionType === 'rejected' || actionType === 'cancelled_by_wholesaler') && !cancellationReason) ||
                  (actionType === 'return_rejected' && !returnRejectionReason)
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

export default Orders;