import React, { useState, useEffect } from 'react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [user, setUser] = useState(null);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const limit = 10;

  // Base64 encoded placeholder image
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxM00yMCAyN00xMyAyMEgyNyIgc3Ryb2tlPSIjOUE5QTlBIiBzdHJva2Utd2lkdGhuYW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';

  useEffect(() => {
    // Handle window resize for responsive behavior
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    
    // Get user info from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    if (userData) {
      fetchOrders(userData);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [statusFilter, currentPage]);

  const fetchOrders = async (userData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      if (userData.role === 'retailer') {
        endpoint = 'retailer';
      } else if (userData.role === 'wholesaler') {
        endpoint = 'wholesaler';
      } else if (userData.role === 'transporter') {
        endpoint = 'transporter';
      } else {
        setError('Invalid user role');
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/${endpoint}?status=${statusFilter}&page=${currentPage}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setError('');
      
      const indexes = {};
      data.orders.forEach(order => {
        if (order.product?.images?.length > 0) {
          indexes[order._id] = 0;
        }
      });
      setActiveImageIndexes(indexes);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
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
      const token = localStorage.getItem('token');
      
      const updateData = { 
        status: newStatus
      };
      
      if (cancellationReason) {
        updateData.cancellationReason = cancellationReason;
      }
      
      if (disputeReason) {
        updateData.disputeReason = disputeReason;
      }

      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      fetchOrders(user);
      setSelectedOrder(null);
      setDisputeReason('');
      
      // Show success message
      if (newStatus === 'certified') {
        setSuccessMessage('Delivery certified successfully! Thank you for your confirmation.');
      } else if (newStatus === 'disputed') {
        setSuccessMessage('Delivery dispute submitted. The wholesaler will review your concerns.');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      setError(err.message);
      console.error('Error updating order status:', err);
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
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      fetchOrders(user);
      setSuccessMessage('Order deleted successfully.');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting order:', err);
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
    
    const leftButtons = [];
    const rightButtons = [];
    
    if (user.role === 'retailer') {
      // Allow deletion for pending, return_accepted, and return_rejected orders
      if (['pending', 'rejected', 'return_accepted', 'return_rejected', 'cancelled_by_wholesaler'].includes(order.status)) {
        rightButtons.push(
          <button
            key="delete"
            onClick={() => handleDeleteOrder(order._id)}
            className="px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
            title="Delete Order"
          >
            Delete
          </button>
        );
      }
      
      // Allow cancellation for pending, accepted, and processing orders
      if (['pending', 'accepted', 'processing'].includes(order.status)) {
        rightButtons.push(
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            title="Cancel Order"
          >
            Cancel
          </button>
        );
      }
      
      // Delivery certification buttons
      if (order.status === 'delivered') {
        leftButtons.push(
          <button
            key="certify"
            onClick={() => handleDeliveryCertification(order, true)}
            className="px-1.5 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs"
            title="Certify Delivery"
          >
            ✓ Certify
          </button>
        );
        rightButtons.push(
          <button
            key="dispute"
            onClick={() => handleDeliveryCertification(order, false)}
            className="px-1.5 py-0.5 bg-rose-600 text-white rounded hover:bg-rose-700 text-xs"
            title="Dispute Delivery"
          >
            ✗ Dispute
          </button>
        );
      }
    }
    
    if (user.role === 'wholesaler') {
      if (order.status === 'pending') {
        leftButtons.push(
          <button
            key="accept"
            onClick={() => handleStatusUpdate(order._id, 'accepted')}
            className="px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            title="Accept Order"
          >
            Accept
          </button>,
          <button
            key="reject"
            onClick={() => setSelectedOrder({ ...order, action: 'reject' })}
            className="px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
            title="Reject Order"
          >
            Reject
          </button>
        );
      }
      
      if (order.status === 'accepted') {
        leftButtons.push(
          <button
            key="process"
            onClick={() => handleStatusUpdate(order._id, 'processing')}
            className="px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            title="Process Order"
          >
            Process
          </button>
        );
        rightButtons.push(
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            title="Cancel Order"
          >
            Cancel
          </button>
        );
      }
      
      if (order.status === 'processing') {
        leftButtons.push(
          <button
            key="assign"
            onClick={() => setSelectedOrder({ ...order, action: 'assign' })}
            className="px-1.5 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
            title="Assign to Transporter"
          >
            Assign
          </button>
        );
        rightButtons.push(
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            title="Cancel Order"
          >
            Cancel
          </button>
        );
      }
      
      // Handle return requests for wholesaler
      if (order.status === 'return_to_wholesaler') {
        leftButtons.push(
          <button
            key="accept-return"
            onClick={() => setSelectedOrder({ ...order, action: 'accept_return' })}
            className="px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            title="Accept Return"
          >
            Accept Return
          </button>
        );
        rightButtons.push(
          <button
            key="reject-return"
            onClick={() => setSelectedOrder({ ...order, action: 'reject_return' })}
            className="px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
            title="Reject Return"
          >
            Reject Return
          </button>
        );
      }
      
      // Dispute resolution for wholesaler
      if (order.status === 'disputed') {
        leftButtons.push(
          <button
            key="resolve"
            onClick={() => setSelectedOrder({ ...order, action: 'resolve' })}
            className="px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
            title="Resolve Dispute"
          >
            Resolve
          </button>
        );
      }
    }
    
    if (user.role === 'transporter') {
      if (order.status === 'assigned_to_transporter') {
        leftButtons.push(
          <button
            key="transit"
            onClick={() => handleStatusUpdate(order._id, 'in_transit')}
            className="px-1.5 py-0.5 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs"
            title="Start Transport"
          >
            Start
          </button>
        );
        rightButtons.push(
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            title="Cancel Transport"
          >
            Cancel
          </button>
        );
      }
      
      if (order.status === 'in_transit') {
        leftButtons.push(
          <button
            key="deliver"
            onClick={() => handleStatusUpdate(order._id, 'delivered')}
            className="px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            title="Mark as Delivered"
          >
            Deliver
          </button>
        );
        rightButtons.push(
          <button
            key="cancel"
            onClick={() => setSelectedOrder({ ...order, action: 'cancel' })}
            className="px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            title="Cancel Transport"
          >
            Cancel
          </button>
        );
      }
      
      // Return to wholesaler option for disputed orders
      if (order.status === 'disputed') {
        leftButtons.push(
          <button
            key="return"
            onClick={() => setSelectedOrder({ ...order, action: 'return' })}
            className="px-1.5 py-0.5 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs"
            title="Return to Wholesaler"
          >
            Return
          </button>
        );
      }
    }
    
    return (
      <>
        <div className="flex flex-wrap gap-1">
          {leftButtons}
        </div>
        <div className="flex-grow flex justify-end gap-1">
          {rightButtons}
        </div>
      </>
    );
  };

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-sm mx-2">
          <h3 className="text-base font-semibold mb-3 dark:text-white">
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
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded text-xs dark:bg-gray-700 dark:text-white"
                rows="3"
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
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transporter ID
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded text-xs dark:bg-gray-700 dark:text-white"
                placeholder="Enter transporter ID"
                onChange={(e) => setSelectedOrder({
                  ...selectedOrder, 
                  transporterId: e.target.value 
                })}
              />
            </div>
          )}
          
          {selectedOrder.action === 'resolve' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resolution Notes
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded text-xs dark:bg-gray-700 dark:text-white"
                rows="3"
                placeholder="Enter resolution notes..."
                onChange={(e) => setSelectedOrder({
                  ...selectedOrder, 
                  resolutionNotes: e.target.value 
                })}
              />
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    onChange={(e) => setSelectedOrder({
                      ...selectedOrder, 
                      reassign: e.target.checked 
                    })}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Reassign to another transporter</span>
                </label>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setSelectedOrder(null);
                setDisputeReason('');
              }}
              className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-xs"
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
                  // Handle dispute resolution through separate API endpoint
                  handleResolveDispute(selectedOrder);
                } else if (selectedOrder.action === 'accept_return' || selectedOrder.action === 'reject_return') {
                  // Handle return request through separate API endpoint
                  handleReturnRequest(selectedOrder);
                } else {
                  handleStatusUpdate(
                    selectedOrder._id, 
                    newStatus, 
                    selectedOrder.cancellationReason
                  );
                }
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
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
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/retailer-orders/${order._id}/resolve-dispute`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            resolutionNotes: order.resolutionNotes,
            reassign: order.reassign || false
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve dispute');
      }

      fetchOrders(user);
      setSelectedOrder(null);
      setSuccessMessage('Dispute resolved successfully.');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      setError(err.message);
      console.error('Error resolving dispute:', err);
    }
  };

  const handleReturnRequest = async (order) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = `http://localhost:5000/api/retailer-orders/${order._id}/handle-return`;
      
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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to handle return request');
      }

      fetchOrders(user);
      setSelectedOrder(null);
      setSuccessMessage(`Return request ${order.action === 'accept_return' ? 'accepted' : 'rejected'} successfully.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      setError(err.message);
      console.error('Error handling return request:', err);
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Orders</h2>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
          Please log in to view your orders
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2">
        <h2 className="text-base font-semibold mb-3 dark:text-white">Orders</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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

  // Responsive height calculations
  const containerHeight = isMobile ? 'h-[500px]' : 'h-[450px]';
  const ordersContainerHeight = isMobile ? 'h-[380px]' : 'h-[320px]';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 mt-2 ${containerHeight}`}>
      <h2 className="text-base font-semibold dark:text-white mb-3">My Orders</h2>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by product or business name..."
            className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Filter:</span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
                
              }}
              className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white w-28 appearance-none cursor-pointer"
              style={{
                maxHeight: '120px',
                overflowY: 'auto'
              }}
              size="1"
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
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-700 dark:text-gray-300">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded mb-2 text-xs dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-2 py-1 rounded mb-2 text-xs dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Orders Container with Responsive Height and Scroll */}
      <div className={`overflow-y-auto ${ordersContainerHeight}`}>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
            No orders found matching your criteria.
          </div>
        ) : (
          <>
            {/* Orders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredOrders.map((order) => {
                const images = order.product?.images || [];
                const currentImageIndex = activeImageIndexes[order._id] || 0;
                const currentImage = images[currentImageIndex]?.url;
                const hasMultipleImages = images.length > 1;
                const certificationStatus = getDeliveryCertificationStatus(order);

                return (
                  <div 
                    key={order._id} 
                    className="bg-white dark:bg-gray-700 rounded shadow-sm border border-gray-200 dark:border-gray-600 p-3 flex flex-col"
                  >
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-xs truncate flex-1 mr-1">
                        Order #{order._id.slice(-6).toUpperCase()}
                      </h3>
                      <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full flex-shrink-0 ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    {/* Certification Status */}
                    {certificationStatus && (
                      <div className={`mb-1.5 p-1.5 rounded text-xs ${
                        order.status === 'certified' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' 
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                      }`}>
                        <p className="font-medium">{certificationStatus.text}</p>
                        {certificationStatus.date && <p>On: {certificationStatus.date}</p>}
                        {order.status === 'disputed' && order.deliveryDispute?.reason && (
                          <p className="mt-0.5">Reason: {order.deliveryDispute.reason}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Return Details */}
                    {(order.status === 'return_to_wholesaler' || order.status === 'return_accepted' || order.status === 'return_rejected') && order.returnDetails && (
                      <div className={`mb-1.5 p-1.5 rounded text-xs ${
                        order.status === 'return_accepted' 
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
                          : order.status === 'return_rejected'
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                      }`}>
                        <p className="font-medium">
                          {order.status === 'return_accepted' 
                            ? 'Return Accepted' 
                            : order.status === 'return_rejected'
                            ? 'Return Rejected'
                            : 'Return Requested'}
                        </p>
                        {order.returnDetails.returnReason && (
                          <p className="mt-0.5">Reason: {order.returnDetails.returnReason}</p>
                        )}
                        {order.returnDetails.returnRejectionReason && (
                          <p className="mt-0.5">Rejection Reason: {order.returnDetails.returnRejectionReason}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Product Image with Carousel */}
                    <div className="relative mb-2">
                      {currentImage ? (
                        <div className="relative w-full h-24">
                          <img
                            src={currentImage}
                            alt={order.product?.name}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => { e.target.src = placeholderImage; }}
                          />
                          {hasMultipleImages && (
                            <>
                              <button
                                onClick={() => handleImageNavigation(order._id, 'prev', images.length)}
                                className="absolute left-0.5 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-0.5 rounded-full hover:bg-opacity-75 transition-opacity duration-200 focus:outline-none"
                                aria-label="Previous image"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleImageNavigation(order._id, 'next', images.length)}
                                className="absolute right-0.5 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-0.5 rounded-full hover:bg-opacity-75 transition-opacity duration-200 focus:outline-none"
                                aria-label="Next image"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-0.5 rounded">
                                {currentImageIndex + 1}/{images.length}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center dark:bg-gray-600">
                          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Other Details */}
                    <div className="flex-1 mb-2">
                      <p className="font-medium text-gray-900 dark:text-white text-xs truncate">
                        {order.product?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {order.quantity} {order.measurementUnit}
                      </p>
                      <p className="text-xs text-green-600 font-semibold dark:text-green-400">
                        UGX {order.totalPrice?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <p className="truncate">
                        {user.role === 'retailer' 
                          ? `By: ${order.wholesaler?.businessName || order.wholesaler?.firstName || 'N/A'}`
                          : `For: ${order.retailer?.businessName || order.retailer?.firstName || 'N/A'}`
                        }
                      </p>
                      <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                      {order.actualDeliveryDate && (
                        <p>Delivered: {new Date(order.actualDeliveryDate).toLocaleDateString()}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 mt-auto pt-1.5 border-t border-gray-200 dark:border-gray-600">
                      {getActionButtons(order)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-3">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-1.5 py-0.5 rounded border border-gray-300 disabled:opacity-50 text-xs dark:bg-gray-700 dark:text-white"
            >
              Prev
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
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 dark:bg-gray-700 dark:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-1.5 py-0.5 rounded border border-gray-300 disabled:opacity-50 text-xs dark:bg-gray-700 dark:text-white"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Action Modal */}
      {renderOrderDetails()}
    </div>
  );
};

export default Orders;