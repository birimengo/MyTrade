// components/WholesalerComponents/OutOrders.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const OutOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [productImageIndices, setProductImageIndices] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchOutgoingOrders();
  }, [user]);

  useEffect(() => {
    groupOrdersBySupplier();
  }, [orders, statusFilter]);

  const fetchOutgoingOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/wholesaler-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
        
        // Initialize image indices for all products
        const initialIndices = {};
        data.orders.forEach(order => {
          order.items.forEach((item, itemIndex) => {
            if (item.product && item.product.images && item.product.images.length > 0) {
              const key = `${order._id}-${itemIndex}`;
              initialIndices[key] = 0;
            }
          });
        });
        setProductImageIndices(initialIndices);
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

  // Update order status - FIXED: Using correct status values
  const updateOrderStatus = async (orderId, newStatus, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: true }));
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/wholesaler-orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
        
        // Show success message
        alert(`Order status updated to ${newStatus.replace('_', ' ')}`);
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Error: ${error.message}`);
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
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/wholesaler-orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      const data = await response.json();
      
      if (data.success) {
        // Remove the order from state
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        alert('Order deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(`Error: ${error.message}`);
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
            className="w-32 h-24 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm"
          />
        </div>
        
        {hasMultipleImages && (
          <>
            {/* Navigation Arrows */}
            <button
              onClick={(e) => prevImage(orderId, itemIndex, e)}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={(e) => nextImage(orderId, itemIndex, e)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Image Counter */}
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
              {/* Product Image */}
              <ProductImage 
                product={item.product} 
                orderId={order._id} 
                itemIndex={index} 
              />
              
              {/* Product Details - Below Image */}
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
          {/* Certified and Return buttons for delivered orders */}
          {canCertifyOrReturn(order) && (
            <div className="flex space-x-2">
              <button
                onClick={() => updateOrderStatus(order._id, 'certified', 'Order certified by wholesaler')}
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center space-x-1"
              >
                {isLoading ? (
                  <span>⏳</span>
                ) : (
                  <>
                    <span>⭐</span>
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
                  <span>⏳</span>
                ) : (
                  <>
                    <span>↩️</span>
                    <span>Return</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Cancel button for orders that can be cancelled */}
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
                <span>⏳</span>
              ) : (
                <>
                  <span>❌</span>
                  <span>Cancel Order</span>
                </>
              )}
            </button>
          )}

          {/* Delete button for pending orders */}
          {canDeleteOrder(order) && (
            <button
              onClick={() => deleteOrder(order._id)}
              disabled={isLoading}
              className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center space-x-1"
            >
              {isLoading ? (
                <span>⏳</span>
              ) : (
                <>
                  <span>🗑️</span>
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

        {/* Assigned Transporter Info */}
        {order.assignedTransporter && (
          <div className="mt-3 pt-3 border-t dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <span className="mr-1">🚚</span>
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
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {supplierData.supplierName.charAt(0).toUpperCase()}
            </span>
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-3"></div>
              <div className="text-gray-700 dark:text-gray-300 text-base font-medium">Loading orders...</div>
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">Fetching your outgoing orders</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="text-red-600 dark:text-red-400 text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Orders</h3>
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">{error}</p>
            <button
              onClick={fetchOutgoingOrders}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Outgoing Orders
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Manage and track your orders placed with suppliers
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <button
                onClick={fetchOutgoingOrders}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Object.keys(groupedOrders).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Suppliers</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {orders.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {orders.filter(o => o.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Orders</div>
          </div>
        </div>

        {/* Orders Grouped by Supplier */}
        {Object.keys(groupedOrders).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No orders found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {statusFilter !== 'all' 
                  ? `No orders with status "${statusFilter}" found.` 
                  : "You haven't placed any orders with suppliers yet."}
              </p>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Show All Orders
                </button>
              )}
            </div>
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
    </div>
  );
};

export default OutOrders;