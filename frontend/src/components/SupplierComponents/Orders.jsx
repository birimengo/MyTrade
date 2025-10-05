import React, { useState, useEffect } from 'react';
import { 
  FaBox, 
  FaShippingFast, 
  FaClock, 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaSearch,
  FaUser,
  FaDollarSign,
  FaSpinner,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaChevronLeft,
  FaChevronRight,
  FaTruck,
  FaUserPlus,
  FaUserCheck
} from 'react-icons/fa';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [imageIndices, setImageIndices] = useState({});
  const [transporters, setTransporters] = useState([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [showTransporterModal, setShowTransporterModal] = useState(false);
  const [selectedOrderForTransporter, setSelectedOrderForTransporter] = useState(null);

  // Fetch orders with populated data from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:5000/api/supplier/orders?populate=wholesaler,items.product,assignedTransporter', {
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
          console.log('Fetched orders:', data.orders);
          setOrders(data.orders || []);
          
          // Initialize image indices for each order
          const initialIndices = {};
          data.orders.forEach(order => {
            initialIndices[order._id] = 0;
          });
          setImageIndices(initialIndices);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Fetch active transporters
  const fetchTransporters = async () => {
    try {
      setLoadingTransporters(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/transporters/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transporters');
      }

      const data = await response.json();
      
      if (data.success) {
        setTransporters(data.transporters || []);
      }
    } catch (error) {
      console.error('Error fetching transporters:', error);
    } finally {
      setLoadingTransporters(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.search && !order.orderNumber.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaClock className="text-yellow-500 text-xs" />;
      case 'confirmed': return <FaCheck className="text-blue-500 text-xs" />;
      case 'in_production': return <FaBox className="text-purple-500 text-xs" />;
      case 'ready_for_delivery': return <FaShippingFast className="text-orange-500 text-xs" />;
      case 'assigned_to_transporter': return <FaTruck className="text-indigo-500 text-xs" />;
      case 'shipped': return <FaShippingFast className="text-green-500 text-xs" />;
      case 'delivered': return <FaCheck className="text-green-600 text-xs" />;
      case 'cancelled': return <FaTimes className="text-red-500 text-xs" />;
      default: return <FaClock className="text-gray-500 text-xs" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_production': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'ready_for_delivery': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'assigned_to_transporter': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'shipped': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
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

  const getWholesalerName = (wholesaler) => {
    if (!wholesaler) return 'Unknown Wholesaler';
    return wholesaler.businessName || `${wholesaler.firstName} ${wholesaler.lastName}`;
  };

  const getWholesalerLocation = (wholesaler) => {
    if (!wholesaler) return '';
    const locationParts = [wholesaler.city, wholesaler.country].filter(Boolean);
    return locationParts.join(', ');
  };

  const getTransporterName = (transporter) => {
    if (!transporter) return 'Not assigned';
    return transporter.businessName || `${transporter.firstName} ${transporter.lastName}`;
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/supplier/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === orderId ? { ...order, status: newStatus } : order
            )
          );
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const openTransporterAssignment = async (order) => {
    setSelectedOrderForTransporter(order);
    await fetchTransporters();
    setShowTransporterModal(true);
  };

  const assignTransporter = async (transporterId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/supplier/orders/${selectedOrderForTransporter._id}/assign-transporter`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transporterId })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the order in state
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === selectedOrderForTransporter._id ? 
                { ...order, assignedTransporter: data.transporter, status: 'assigned_to_transporter' } : order
            )
          );
          
          setShowTransporterModal(false);
          setSelectedOrderForTransporter(null);
        }
      }
    } catch (error) {
      console.error('Error assigning transporter:', error);
    }
  };

  const assignToAnyTransporter = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/supplier/orders/${selectedOrderForTransporter._id}/assign-any-transporter`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === selectedOrderForTransporter._id ? 
                { ...order, assignedTransporter: data.transporter, status: 'assigned_to_transporter' } : order
            )
          );
          
          setShowTransporterModal(false);
          setSelectedOrderForTransporter(null);
        }
      }
    } catch (error) {
      console.error('Error assigning any transporter:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-2 h-[600px] flex items-center justify-center">
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500" />
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-2 h-[530px] flex flex-col">
      {/* Header - Fixed height */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Supplier Orders</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Manage orders from wholesalers</p>
          </div>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <div className="relative">
              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search by order number..."
                className="pl-7 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-40 text-xs"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_production">In Production</option>
              <option value="ready_for_delivery">Ready for Delivery</option>
              <option value="assigned_to_transporter">Assigned to Transporter</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Statistics - Smaller cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {['pending', 'confirmed', 'in_production', 'ready_for_delivery'].map(status => (
            <div key={status} className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
              <div className="flex items-center">
                {getStatusIcon(status)}
                <div className="ml-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400 capitalize">
                    {status.replace('_', ' ')}
                  </p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {orders.filter(o => o.status === status).length}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Grid - Scrollable area */}
      <div className="flex-1 overflow-hidden">
        {filteredOrders.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-6">
              <FaBox className="mx-auto text-2xl text-gray-300 dark:text-gray-600 mb-2" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No orders found</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filters.status !== 'all' || filters.search ? 'Try adjusting your filters' : 'No orders have been placed yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-3">
              {filteredOrders.map((order) => {
                const images = getAllProductImages(order);
                const currentImage = getCurrentImage(order);
                const currentIndex = imageIndices[order._id] || 0;
                
                return (
                  <div key={order._id} className="border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-800 overflow-hidden h-[340px] flex flex-col">
                    
                    {/* Image Section - Reduced height */}
                    <div className="relative h-28 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      {currentImage ? (
                        <>
                          <img
                            src={currentImage.url}
                            alt="Product"
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Navigation Arrows - Smaller */}
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateImage(order._id, 'prev');
                                }}
                                className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
                              >
                                <FaChevronLeft className="w-2 h-2" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateImage(order._id, 'next');
                                }}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
                              >
                                <FaChevronRight className="w-2 h-2" />
                              </button>
                            </>
                          )}
                          
                          {/* Image Counter - Smaller */}
                          {images.length > 1 && (
                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white px-1 py-0.5 rounded-full text-xs">
                              {currentIndex + 1} / {images.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaBox className="text-gray-400 text-xl" />
                        </div>
                      )}
                    </div>

                    {/* Order Content - Compact layout */}
                    <div className="flex-1 p-2 flex flex-col">
                      {/* Order Header */}
                      <div className="flex justify-between items-start mb-1 flex-shrink-0">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-xs">
                            {order.orderNumber}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-0.5 capitalize text-xs">{order.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      {/* Wholesaler Info - Compact */}
                      <div className="flex items-center mb-2 flex-shrink-0">
                        <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <FaUser className="text-blue-600 dark:text-blue-300 text-xs" />
                        </div>
                        <div className="ml-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[100px]">
                            {getWholesalerName(order.wholesaler)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                            {getWholesalerLocation(order.wholesaler)}
                          </p>
                        </div>
                      </div>

                      {/* Transporter Info - Compact */}
                      {order.assignedTransporter && (
                        <div className="flex items-center mb-2 flex-shrink-0">
                          <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <FaTruck className="text-green-600 dark:text-green-300 text-xs" />
                          </div>
                          <div className="ml-1">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[100px]">
                              {getTransporterName(order.assignedTransporter)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Assigned
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Order Items Summary - Compact */}
                      <div className="mb-2 flex-1 overflow-hidden">
                        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                          <span>Items ({order.items.length})</span>
                          <span>Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </div>
                        
                        <div className="space-y-0.5 max-h-16 overflow-y-auto">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-xs text-gray-900 dark:text-white truncate flex-1">
                                {item.product?.name || 'Product'}
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400 ml-0.5 whitespace-nowrap">
                                {item.quantity} × ${item.unitPrice}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                              +{order.items.length - 3} more items
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Total - Compact */}
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">Total</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          ${order.finalAmount?.toFixed(2) || order.totalAmount?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Actions - Compact buttons */}
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="inline-flex items-center px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <FaEye className="mr-0.5 text-xs" />
                          Details
                        </button>
                        
                        <div className="flex space-x-1">
                          {order.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                className="px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                className="px-1.5 py-0.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {order.status === 'confirmed' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'in_production')}
                              className="px-1.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                            >
                              Production
                            </button>
                          )}
                          
                          {order.status === 'in_production' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'ready_for_delivery')}
                              className="px-1.5 py-0.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700"
                            >
                              Ready
                            </button>
                          )}

                          {order.status === 'ready_for_delivery' && (
                            <>
                              <button 
                                onClick={() => openTransporterAssignment(order)}
                                className="px-1.5 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                              >
                                Assign Transporter
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'shipped')}
                                className="px-1.5 py-0.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700"
                              >
                                Ship
                              </button>
                            </>
                          )}

                          {order.status === 'assigned_to_transporter' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'shipped')}
                              className="px-1.5 py-0.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700"
                            >
                              Ship
                            </button>
                          )}

                          {order.status === 'shipped' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'delivered')}
                              className="px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                            >
                              Deliver
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
          openTransporterAssignment={openTransporterAssignment}
        />
      )}

      {/* Transporter Assignment Modal */}
      {showTransporterModal && selectedOrderForTransporter && (
        <TransporterAssignmentModal
          order={selectedOrderForTransporter}
          transporters={transporters}
          loading={loadingTransporters}
          onAssign={assignTransporter}
          onAssignAny={assignToAnyTransporter}
          onClose={() => {
            setShowTransporterModal(false);
            setSelectedOrderForTransporter(null);
          }}
        />
      )}
    </div>
  );
};

// Separate Modal Component
const OrderDetailsModal = ({ order, onClose, getStatusIcon, getStatusColor, formatDate, updateOrderStatus, openTransporterAssignment }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getAllProductImages = (order) => {
    const images = [];
    order.items.forEach(item => {
      if (item.product?.images) {
        images.push(...item.product.images);
      }
    });
    return images;
  };

  const images = getAllProductImages(order);

  const navigateImage = (direction) => {
    if (images.length <= 1) return;

    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Order Details - {order.orderNumber}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Large Image Display */}
          {images.length > 0 && (
            <div className="mb-4">
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={images[currentImageIndex]?.url}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateImage('prev')}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigateImage('next')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <FaChevronRight className="w-4 h-4" />
                    </button>
                    
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="flex space-x-2 mt-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-12 h-12 rounded border-2 ${
                        index === currentImageIndex 
                          ? 'border-blue-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order Status and Actions */}
          <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
              </span>
              <span className="ml-3 text-xs text-gray-600 dark:text-gray-400">
                Ordered on {formatDate(order.createdAt)}
              </span>
            </div>
            
            {/* Status Action Buttons */}
            <div className="flex space-x-2">
              {order.status === 'pending' && (
                <>
                  <button 
                    onClick={() => updateOrderStatus(order._id, 'confirmed')}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order._id, 'cancelled')}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              
              {order.status === 'confirmed' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'in_production')}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                >
                  Production
                </button>
              )}
              
              {order.status === 'in_production' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'ready_for_delivery')}
                  className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700"
                >
                  Ready
                </button>
              )}

              {order.status === 'ready_for_delivery' && (
                <>
                  <button 
                    onClick={() => openTransporterAssignment(order)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                  >
                    Assign Transporter
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order._id, 'shipped')}
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700"
                  >
                    Ship
                  </button>
                </>
              )}

              {order.status === 'assigned_to_transporter' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'shipped')}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700"
                >
                  Ship
                </button>
              )}

              {order.status === 'shipped' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'delivered')}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                >
                  Deliver
                </button>
              )}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Order Items */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">Order Items</h4>
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const product = item.product;
                  const imageUrl = product?.images?.[0]?.url;
                  
                  return (
                    <div key={index} className="flex items-center p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product?.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <FaBox className="text-gray-400 text-lg" />
                        </div>
                      )}
                      <div className="ml-3 flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm">{product?.name}</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{product?.description}</p>
                        <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>Qty: {item.quantity}</span>
                          <span>Price: ${item.unitPrice}</span>
                          {product?.measurementUnit && (
                            <span className="capitalize">{product.measurementUnit}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">${order.totalAmount?.toFixed(2)}</span>
                  </div>
                  {order.discounts > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="text-red-600 dark:text-red-400">-${order.discounts.toFixed(2)}</span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                      <span className="text-gray-900 dark:text-white">${order.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      ${order.finalAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Wholesaler, Transporter and Shipping Info */}
            <div>
              {/* Wholesaler Information */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">Wholesaler Information</h4>
                <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <FaUser className="text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="ml-2">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {order.wholesaler?.businessName || `${order.wholesaler?.firstName} ${order.wholesaler?.lastName}`}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Wholesaler
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    {order.wholesaler?.email && (
                      <div className="flex items-center">
                        <FaEnvelope className="text-gray-400 mr-2" />
                        <span className="text-gray-600 dark:text-gray-400">{order.wholesaler.email}</span>
                      </div>
                    )}
                    {order.wholesaler?.phone && (
                      <div className="flex items-center">
                        <FaPhone className="text-gray-400 mr-2" />
                        <span className="text-gray-600 dark:text-gray-400">{order.wholesaler.phone}</span>
                      </div>
                    )}
                    {(order.wholesaler?.city || order.wholesaler?.country) && (
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="text-gray-400 mr-2" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {[order.wholesaler.city, order.wholesaler.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transporter Information */}
              {order.assignedTransporter && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">Assigned Transporter</h4>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <FaTruck className="text-green-600 dark:text-green-300" />
                      </div>
                      <div className="ml-2">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {order.assignedTransporter.businessName || `${order.assignedTransporter.firstName} ${order.assignedTransporter.lastName}`}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Transporter
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      {order.assignedTransporter.email && (
                        <div className="flex items-center">
                          <FaEnvelope className="text-gray-400 mr-2" />
                          <span className="text-gray-600 dark:text-gray-400">{order.assignedTransporter.email}</span>
                        </div>
                      )}
                      {order.assignedTransporter.phone && (
                        <div className="flex items-center">
                          <FaPhone className="text-gray-400 mr-2" />
                          <span className="text-gray-600 dark:text-gray-400">{order.assignedTransporter.phone}</span>
                        </div>
                      )}
                      {order.assignedTransporter.vehicleType && (
                        <div className="flex items-center">
                          <FaTruck className="text-gray-400 mr-2" />
                          <span className="text-gray-600 dark:text-gray-400 capitalize">{order.assignedTransporter.vehicleType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Information */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">Shipping Address</h4>
                <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <FaMapMarkerAlt className="text-blue-500 text-sm" />
                    <span className="ml-2 font-medium text-gray-900 dark:text-white text-sm">Delivery Address</span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <p>{order.shippingAddress?.street}</p>
                    <p>
                      {order.shippingAddress?.city}
                      {order.shippingAddress?.state && `, ${order.shippingAddress.state}`}
                      {order.shippingAddress?.postalCode && ` ${order.shippingAddress.postalCode}`}
                    </p>
                    <p>{order.shippingAddress?.country}</p>
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              {order.orderNotes && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">Order Notes</h4>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">{order.orderNotes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Transporter Assignment Modal Component
const TransporterAssignmentModal = ({ order, transporters, loading, onAssign, onAssignAny, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Assign Transporter - {order.orderNumber}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Assign a transporter to deliver this order to the wholesaler.
            </p>
          </div>

          {/* Assign to any available transporter */}
          <div className="mb-6">
            <button
              onClick={onAssignAny}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <FaUserCheck className="mr-2" />
              Assign to Any Available Transporter
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              System will automatically assign the best available transporter
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-base">
              Or Select Specific Transporter
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <FaSpinner className="animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600 dark:text-gray-400">Loading transporters...</span>
              </div>
            ) : transporters.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <FaTruck className="text-3xl mx-auto mb-2 opacity-50" />
                <p>No active transporters available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transporters.map((transporter) => (
                  <div
                    key={transporter._id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onAssign(transporter._id)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <FaUser className="text-blue-600 dark:text-blue-300 text-sm" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {transporter.businessName || `${transporter.firstName} ${transporter.lastName}`}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          {transporter.vehicleType && (
                            <span className="capitalize">{transporter.vehicleType}</span>
                          )}
                          {transporter.isOnline && (
                            <span className="ml-2 flex items-center text-green-600 dark:text-green-400">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                              Online
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <FaUserPlus className="text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Orders;