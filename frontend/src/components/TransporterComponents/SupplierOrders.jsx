// components/TransporterComponents/SupplierOrders.jsx
import React, { useState, useEffect } from 'react';
import { FaSpinner, FaTruck } from 'react-icons/fa';
import OrdersHeader from './OrdersHeader';
import OrderCard from './OrderCard';
import OrderDetailsModal from './OrderDetailsModal';

const SupplierOrders = () => {
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

  // Fetch orders assigned to this transporter
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:5000/api/transporters/assigned-orders?type=${filters.type}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Fetched assigned orders:', data.orders);
          setOrders(data.orders || []);
          setStatistics(data.statistics || {});
          
          // Initialize image indices for each order
          const initialIndices = {};
          data.orders.forEach(order => {
            initialIndices[order._id] = 0;
          });
          setImageIndices(initialIndices);
        }
      } catch (error) {
        console.error('❌ Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [filters.type]);

  // Fetch available return orders that can be accepted
  useEffect(() => {
    const fetchAvailableReturnOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/transporters/return-orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ Fetched available return orders:', data.orders);
            setAvailableReturnOrders(data.orders || []);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching available return orders:', error);
      }
    };

    fetchAvailableReturnOrders();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.search && !order.orderNumber.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Enhanced order type detection
  const getOrderType = (order) => {
    if (order.returnTransporter || order.status.includes('return_')) {
      return 'return';
    }
    if (order.assignedTransporter) {
      return 'delivery';
    }
    return 'delivery';
  };

  // Enhanced status icons for both delivery and return orders
  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned_to_transporter': return <FaTruck className="text-indigo-500 text-xs" />;
      case 'accepted_by_transporter': return <FaTruck className="text-blue-500 text-xs" />;
      case 'in_transit': return <FaTruck className="text-orange-500 text-xs" />;
      case 'delivered': return <FaTruck className="text-green-500 text-xs" />;
      case 'cancelled': return <FaTruck className="text-red-500 text-xs" />;
      case 'return_requested': return <FaTruck className="text-amber-500 text-xs" />;
      case 'return_accepted': return <FaTruck className="text-blue-500 text-xs" />;
      case 'return_in_transit': return <FaTruck className="text-orange-500 text-xs" />;
      case 'returned_to_supplier': return <FaTruck className="text-green-500 text-xs" />;
      case 'certified': return <FaTruck className="text-green-500 text-xs" />;
      default: return <FaTruck className="text-gray-500 text-xs" />;
    }
  };

  // Enhanced status colors for both delivery and return orders
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

  // Get order type badge with enhanced logic
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

  // Update order status for both delivery and return orders - WITH DEBUGGING
  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    try {
      console.log('🔄 Frontend - Updating order status:', { 
        orderId, 
        newStatus, 
        notes,
        currentOrder: orders.find(o => o._id === orderId)
      });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/transporters/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: newStatus,
          notes: notes
        })
      });

      console.log('📡 Frontend - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Frontend - Success:', data);
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        
        alert(`✅ Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      } else {
        const errorData = await response.json();
        console.error('❌ Frontend - Error response:', errorData);
        alert(`❌ Error: ${errorData.message || 'Failed to update order status'}`);
      }
    } catch (error) {
      console.error('💥 Frontend - Network error:', error);
      alert('❌ Error updating order status. Please try again.');
    }
  };

  // Accept return order (only for orders assigned to this transporter)
  const acceptReturnOrder = async (orderId) => {
    try {
      console.log('🔄 Frontend - Accepting return order:', orderId);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/transporters/return-orders/${orderId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Frontend - Accept return response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Frontend - Return order accepted:', data);
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: 'return_accepted', returnTransporter: data.order.returnTransporter } : order
          )
        );
        
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ 
            ...selectedOrder, 
            status: 'return_accepted',
            returnTransporter: data.order.returnTransporter
          });
        }
        
        setAvailableReturnOrders(prev => prev.filter(order => order._id !== orderId));
        
        alert('✅ Return order accepted successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ Frontend - Accept return error:', errorData);
        alert(`❌ Error: ${errorData.message || 'Failed to accept return order'}`);
      }
    } catch (error) {
      console.error('💥 Frontend - Accept return network error:', error);
      alert('❌ Error accepting return order. Please try again.');
    }
  };

  // Enhanced action buttons for return orders with "Returned" status
  const renderActionButtons = (order) => {
    const orderType = getOrderType(order);
    
    console.log(`🔄 Rendering action buttons for order ${order.orderNumber}:`, {
      orderType,
      status: order.status,
      hasReturnTransporter: !!order.returnTransporter
    });
    
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

          {/* Show "Delivered" status when delivery is completed */}
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
          {/* Return orders available for acceptance (not yet assigned) */}
          {order.status === 'return_requested' && !order.returnTransporter && (
            <button 
              onClick={() => acceptReturnOrder(order._id)}
              className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors flex-1"
            >
              Accept Return
            </button>
          )}
          
          {/* Return orders assigned to this transporter */}
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

          {/* Show "Returned" status when return is completed */}
          {order.status === 'returned_to_supplier' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex-1 text-center">
              Returned
            </span>
          )}

          {/* Cancel button for return orders */}
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

  // Refresh orders data
  const refreshOrders = () => {
    console.log('🔄 Refreshing orders...');
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`http://localhost:5000/api/transporters/assigned-orders?type=${filters.type}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ Orders refreshed successfully');
            setOrders(data.orders || []);
            setStatistics(data.statistics || {});
          }
        }
      } catch (error) {
        console.error('❌ Error refreshing orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-2 h-[700px] flex items-center justify-center">
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500" />
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Loading supplier orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-2 h-[700px] flex flex-col">
      {/* Header Component */}
      <OrdersHeader 
        filters={filters}
        setFilters={setFilters}
        statistics={statistics}
        availableReturnOrders={availableReturnOrders}
        refreshOrders={refreshOrders}
      />

      {/* Orders Grid - Scrollable area */}
      <div className="flex-1 overflow-hidden">
        {filteredOrders.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-4">
              <FaTruck className="mx-auto text-3xl text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">No orders assigned</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {filters.status !== 'all' || filters.search ? 'Try adjusting your filters' : 'No supplier orders have been assigned to you yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[450px] overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-4">
              {/* Display available return orders first when viewing all orders */}
              {filters.type === 'all' && availableReturnOrders.map((order) => {
                const images = getAllProductImages(order);
                const currentImage = images[0] || null;
                const orderType = 'return';
                
                return (
                  <OrderCard
                    key={order._id}
                    order={order}
                    orderType={orderType}
                    isAvailableReturn={true}
                    currentImage={currentImage}
                    currentIndex={0}
                    images={images}
                    onImageNavigate={navigateImage}
                    onOpenDetails={openOrderDetails}
                    onAcceptReturn={acceptReturnOrder}
                    onUpdateStatus={updateOrderStatus}
                    getOrderTypeBadge={getOrderTypeBadge}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                    getSupplierName={getSupplierName}
                    getWholesalerName={getWholesalerName}
                    getSupplierLocation={getSupplierLocation}
                    getAllProductImages={getAllProductImages}
                    renderActionButtons={renderActionButtons}
                  />
                );
              })}

              {/* Regular assigned orders */}
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
                    onAcceptReturn={acceptReturnOrder}
                    onUpdateStatus={updateOrderStatus}
                    getOrderTypeBadge={getOrderTypeBadge}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                    getSupplierName={getSupplierName}
                    getWholesalerName={getWholesalerName}
                    getSupplierLocation={getSupplierLocation}
                    getAllProductImages={getAllProductImages}
                    renderActionButtons={renderActionButtons}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setIsModalOpen(false)}
          getStatusIcon={getStatusIcon}
          getStatusColor={getStatusColor}
          formatDate={formatDate}
          updateOrderStatus={updateOrderStatus}
          getOrderType={getOrderType}
          acceptReturnOrder={acceptReturnOrder}
          availableReturnOrders={availableReturnOrders}
        />
      )}
    </div>
  );
};

export default SupplierOrders;