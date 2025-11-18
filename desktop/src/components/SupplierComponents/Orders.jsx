import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; // Import your auth context
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
  FaUserCheck,
  FaWindowClose,
  FaExpand,
  FaCompress,
  FaExclamationTriangle,
  FaSync
} from 'react-icons/fa';

const Orders = ({ isElectron, isDarkMode, apiCall }) => {
  const { user, token, getAuthHeaders, API_BASE_URL, logout, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [imageIndices, setImageIndices] = useState({});
  const [transporters, setTransporters] = useState([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [showTransporterModal, setShowTransporterModal] = useState(false);
  const [selectedOrderForTransporter, setSelectedOrderForTransporter] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced API call function with proper authentication
  const makeApiCall = async (endpoint, options = {}) => {
    try {
      if (!isAuthenticated || !token) {
        setError('Authentication required. Please log in again.');
        logout();
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/api${endpoint}`;
      const config = {
        headers: getAuthHeaders(),
        ...options,
      };

      console.log(`🔄 Making API call to: ${url}`);
      
      const response = await fetch(url, config);

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      setError(error.message);
      throw error;
    }
  };

  // Electron window controls
  const minimizeWindow = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const maximizeWindow = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.maximize();
    }
  };

  const closeWindow = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.close();
    }
  };

  // Fetch orders with populated data from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeApiCall('/supplier/orders?populate=wholesaler,items.product,assignedTransporter');

      if (response && response.success) {
        console.log('✅ Fetched orders:', response.orders);
        setOrders(response.orders || []);
        
        // Initialize image indices for each order
        const initialIndices = {};
        response.orders.forEach(order => {
          initialIndices[order._id] = 0;
        });
        setImageIndices(initialIndices);
      } else {
        throw new Error(response?.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch active transporters
  const fetchTransporters = async () => {
    try {
      setLoadingTransporters(true);
      
      const response = await makeApiCall('/transporters/active');

      if (response && response.success) {
        setTransporters(response.transporters || []);
      } else {
        throw new Error(response?.message || 'Failed to fetch transporters');
      }
    } catch (error) {
      console.error('Error fetching transporters:', error);
      setError('Failed to load transporters: ' + error.message);
    } finally {
      setLoadingTransporters(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    fetchOrders();
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
      const response = await makeApiCall(`/supplier/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (response && response.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        alert(`✅ Order status updated to ${newStatus.replace('_', ' ')}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('❌ Failed to update order status: ' + error.message);
    }
  };

  const openTransporterAssignment = async (order) => {
    setSelectedOrderForTransporter(order);
    await fetchTransporters();
    setShowTransporterModal(true);
  };

  const assignTransporter = async (transporterId) => {
    try {
      const response = await makeApiCall(`/supplier/orders/${selectedOrderForTransporter._id}/assign-transporter`, {
        method: 'PUT',
        body: JSON.stringify({ transporterId })
      });

      if (response && response.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === selectedOrderForTransporter._id ? 
              { ...order, assignedTransporter: response.transporter, status: 'assigned_to_transporter' } : order
          )
        );
        
        setShowTransporterModal(false);
        setSelectedOrderForTransporter(null);
        alert('✅ Transporter assigned successfully');
      }
    } catch (error) {
      console.error('Error assigning transporter:', error);
      alert('❌ Failed to assign transporter: ' + error.message);
    }
  };

  const assignToAnyTransporter = async () => {
    try {
      const response = await makeApiCall(`/supplier/orders/${selectedOrderForTransporter._id}/assign-any-transporter`, {
        method: 'PUT'
      });

      if (response && response.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === selectedOrderForTransporter._id ? 
              { ...order, assignedTransporter: response.transporter, status: 'assigned_to_transporter' } : order
          )
        );
        
        setShowTransporterModal(false);
        setSelectedOrderForTransporter(null);
        alert('✅ Transporter assigned automatically');
      }
    } catch (error) {
      console.error('Error assigning any transporter:', error);
      alert('❌ Failed to assign transporter: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`rounded-lg shadow p-6 h-[600px] flex items-center justify-center ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="text-center">
          <FaExclamationTriangle className="text-yellow-500 text-4xl mx-auto mb-4" />
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Authentication Required
          </h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Please log in to view orders
          </p>
        </div>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className={`rounded-lg shadow p-6 h-[600px] flex items-center justify-center ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500" />
          <span className={`ml-3 text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading orders...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ height: 'calc(100vh - 100px)' }}>
      {/* Title Bar for Electron */}
      {isElectron && (
        <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 draggable">
          <div className="flex items-center">
            <FaBox className="text-blue-500 mr-2" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">Supplier Orders</span>
          </div>
          <div className="flex space-x-2 non-draggable">
            <button 
              onClick={minimizeWindow}
              className="w-3 h-3 bg-yellow-400 rounded-full hover:bg-yellow-500 transition-colors"
            />
            <button 
              onClick={maximizeWindow}
              className="w-3 h-3 bg-green-400 rounded-full hover:bg-green-500 transition-colors"
            />
            <button 
              onClick={closeWindow}
              className="w-3 h-3 bg-red-400 rounded-full hover:bg-red-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Supplier Orders
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage orders from wholesalers
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-2 md:mt-0">
            <div className="relative">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search by order number..."
                className={`pl-10 pr-4 py-2 border rounded-lg w-48 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className={`px-3 py-2 border rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
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
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 disabled:opacity-50' 
                  : 'hover:bg-gray-100 disabled:opacity-50'
              }`}
            >
              <FaSync className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mt-4 p-3 rounded-lg border-l-4 border-red-500 ${
            isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
          }`}>
            <div className="flex items-center">
              <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-3" />
              <p className={isDarkMode ? 'text-red-200' : 'text-red-800'}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {['pending', 'confirmed', 'in_production', 'ready_for_delivery'].map(status => (
            <div key={status} className={`rounded-lg p-3 ${
              isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
            }`}>
              <div className="flex items-center">
                {getStatusIcon(status)}
                <div className="ml-2">
                  <p className={`text-sm font-medium ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  } capitalize`}>
                    {status.replace('_', ' ')}
                  </p>
                  <p className={`text-lg font-bold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    {orders.filter(o => o.status === status).length}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-hidden">
        {filteredOrders.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8">
              <FaBox className={`mx-auto text-4xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {orders.length === 0 ? 'No orders found' : 'No orders match your filters'}
              </h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {orders.length === 0 
                  ? 'Your orders will appear here once wholesalers place orders' 
                  : 'Try adjusting your search or filters'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const images = getAllProductImages(order);
                const currentImage = getCurrentImage(order);
                const currentIndex = imageIndices[order._id] || 0;
                
                return (
                  <div 
                    key={order._id} 
                    className={`border rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 hover:border-gray-500' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ height: '380px' }}
                  >
                    {/* Image Section */}
                    <div className="relative h-32 bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                      {currentImage ? (
                        <>
                          <img
                            src={currentImage.url}
                            alt="Product"
                            className="w-full h-full object-cover"
                          />
                          
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateImage(order._id, 'prev');
                                }}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
                              >
                                <FaChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateImage(order._id, 'next');
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
                              >
                                <FaChevronRight className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                              {currentIndex + 1} / {images.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FaBox className={`text-2xl ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                      )}
                    </div>

                    {/* Order Content */}
                    <div className="flex-1 p-3 flex flex-col">
                      {/* Order Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {order.orderNumber}
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      {/* Wholesaler Info */}
                      <div className="flex items-center mb-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                        }`}>
                          <FaUser className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                        </div>
                        <div className="ml-2">
                          <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {getWholesalerName(order.wholesaler)}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getWholesalerLocation(order.wholesaler)}
                          </p>
                        </div>
                      </div>

                      {/* Transporter Info */}
                      {order.assignedTransporter && (
                        <div className="flex items-center mb-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-green-900' : 'bg-green-100'
                          }`}>
                            <FaTruck className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-600'}`} />
                          </div>
                          <div className="ml-2">
                            <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {getTransporterName(order.assignedTransporter)}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Assigned
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Order Items Summary */}
                      <div className="mb-3 flex-1 overflow-hidden">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Items ({order.items.length})
                          </span>
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {order.items.slice(0, 4).map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className={`text-sm truncate flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.product?.name || 'Product'}
                              </span>
                              <span className={`text-sm ml-2 whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.quantity} × ${item.unitPrice}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 4 && (
                            <div className={`text-center text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              +{order.items.length - 4} more items
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Total */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Total
                        </span>
                        <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          ${order.finalAmount?.toFixed(2) || order.totalAmount?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600/50">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded transition-colors ${
                            isDarkMode
                              ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <FaEye className="mr-1.5" />
                          Details
                        </button>
                        
                        <div className="flex space-x-2">
                          {order.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'cancelled')}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {order.status === 'confirmed' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'in_production')}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              Production
                            </button>
                          )}
                          
                          {order.status === 'in_production' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'ready_for_delivery')}
                              className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition-colors"
                            >
                              Ready
                            </button>
                          )}

                          {order.status === 'ready_for_delivery' && (
                            <>
                              <button 
                                onClick={() => openTransporterAssignment(order)}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
                              >
                                Assign
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order._id, 'shipped')}
                                className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                              >
                                Ship
                              </button>
                            </>
                          )}

                          {order.status === 'assigned_to_transporter' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'shipped')}
                              className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                            >
                              Ship
                            </button>
                          )}

                          {order.status === 'shipped' && (
                            <button 
                              onClick={() => updateOrderStatus(order._id, 'delivered')}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
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
          isDarkMode={isDarkMode}
          isModalMaximized={isModalMaximized}
          onClose={() => setIsModalOpen(false)}
          onMaximize={() => setIsModalMaximized(!isModalMaximized)}
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
          isDarkMode={isDarkMode}
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
const OrderDetailsModal = ({ 
  order, 
  isDarkMode, 
  isModalMaximized, 
  onClose, 
  onMaximize, 
  getStatusIcon, 
  getStatusColor, 
  formatDate, 
  updateOrderStatus, 
  openTransporterAssignment 
}) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div 
        className={`rounded-lg flex flex-col ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } ${isModalMaximized ? 'w-full h-full' : 'max-w-6xl w-full max-h-[90vh]'}`}
      >
        {/* Modal Title Bar */}
        <div className={`flex justify-between items-center px-4 py-3 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        } draggable`}>
          <div className="flex items-center">
            <FaBox className="text-blue-500 mr-2" />
            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Order Details - {order.orderNumber}
            </h3>
          </div>
          <div className="flex items-center space-x-2 non-draggable">
            <button
              onClick={onMaximize}
              className={`p-1.5 rounded ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              {isModalMaximized ? <FaCompress /> : <FaExpand />}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <FaWindowClose className="text-lg" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Large Image Display */}
          {images.length > 0 && (
            <div className="mb-6">
              <div className="relative h-64 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={images[currentImageIndex]?.url}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateImage('prev')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigateImage('next')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <FaChevronRight className="w-4 h-4" />
                    </button>
                    
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="flex space-x-3 mt-3 overflow-x-auto py-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-blue-500 shadow-md' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
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
          <div className={`flex justify-between items-center mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2 capitalize">{order.status.replace('_', ' ')}</span>
              </span>
              <span className={`ml-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Ordered on {formatDate(order.createdAt)}
              </span>
            </div>
            
            {/* Status Action Buttons */}
            <div className="flex space-x-3">
              {order.status === 'pending' && (
                <>
                  <button 
                    onClick={() => updateOrderStatus(order._id, 'confirmed')}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    Confirm Order
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order._id, 'cancelled')}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                  >
                    Reject Order
                  </button>
                </>
              )}
              
              {order.status === 'confirmed' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'in_production')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Start Production
                </button>
              )}
              
              {order.status === 'in_production' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'ready_for_delivery')}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition-colors"
                >
                  Mark as Ready
                </button>
              )}

              {order.status === 'ready_for_delivery' && (
                <>
                  <button 
                    onClick={() => openTransporterAssignment(order)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors"
                  >
                    Assign Transporter
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order._id, 'shipped')}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                  >
                    Mark as Shipped
                  </button>
                </>
              )}

              {order.status === 'assigned_to_transporter' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'shipped')}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors"
                >
                  Mark as Shipped
                </button>
              )}

              {order.status === 'shipped' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'delivered')}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                >
                  Mark as Delivered
                </button>
              )}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Order Items */}
            <div>
              <h4 className={`font-semibold mb-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Order Items
              </h4>
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const product = item.product;
                  const imageUrl = product?.images?.[0]?.url;
                  
                  return (
                    <div key={index} className={`flex items-center p-4 border rounded-lg ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product?.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-100'
                        }`}>
                          <FaBox className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                        </div>
                      )}
                      <div className="ml-4 flex-1">
                        <h5 className={`font-medium text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {product?.name}
                        </h5>
                        <p className={`text-sm mt-1 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {product?.description}
                        </p>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Quantity: {item.quantity}</span>
                          <span>Price: ${item.unitPrice}</span>
                          {product?.measurementUnit && (
                            <span className="capitalize">{product.measurementUnit}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className={`mt-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal:</span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      ${order.totalAmount?.toFixed(2)}
                    </span>
                  </div>
                  {order.discounts > 0 && (
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Discount:</span>
                      <span className="text-red-600 dark:text-red-400">
                        -${order.discounts.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tax:</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        ${order.taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2">
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Total Amount:
                    </span>
                    <span className={`font-bold text-lg ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      ${order.finalAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Wholesaler, Transporter and Shipping Info */}
            <div>
              {/* Wholesaler Information */}
              <div className="mb-6">
                <h4 className={`font-semibold mb-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Wholesaler Information
                </h4>
                <div className={`p-4 border rounded-lg ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                    }`}>
                      <FaUser className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                    </div>
                    <div className="ml-3">
                      <p className={`font-medium text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {order.wholesaler?.businessName || `${order.wholesaler?.firstName} ${order.wholesaler?.lastName}`}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Wholesaler
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {order.wholesaler?.email && (
                      <div className="flex items-center">
                        <FaEnvelope className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {order.wholesaler.email}
                        </span>
                      </div>
                    )}
                    {order.wholesaler?.phone && (
                      <div className="flex items-center">
                        <FaPhone className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {order.wholesaler.phone}
                        </span>
                      </div>
                    )}
                    {(order.wholesaler?.city || order.wholesaler?.country) && (
                      <div className="flex items-center">
                        <FaMapMarkerAlt className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {[order.wholesaler.city, order.wholesaler.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transporter Information */}
              {order.assignedTransporter && (
                <div className="mb-6">
                  <h4 className={`font-semibold mb-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Assigned Transporter
                  </h4>
                  <div className={`p-4 border rounded-lg ${
                    isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-green-900' : 'bg-green-100'
                      }`}>
                        <FaTruck className={`${isDarkMode ? 'text-green-300' : 'text-green-600'}`} />
                      </div>
                      <div className="ml-3">
                        <p className={`font-medium text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {order.assignedTransporter.businessName || `${order.assignedTransporter.firstName} ${order.assignedTransporter.lastName}`}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Transporter
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {order.assignedTransporter.email && (
                        <div className="flex items-center">
                          <FaEnvelope className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {order.assignedTransporter.email}
                          </span>
                        </div>
                      )}
                      {order.assignedTransporter.phone && (
                        <div className="flex items-center">
                          <FaPhone className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {order.assignedTransporter.phone}
                          </span>
                        </div>
                      )}
                      {order.assignedTransporter.vehicleType && (
                        <div className="flex items-center">
                          <FaTruck className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Vehicle: {order.assignedTransporter.vehicleType}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Information */}
              <div>
                <h4 className={`font-semibold mb-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Shipping Address
                </h4>
                <div className={`p-4 border rounded-lg ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center mb-3">
                    <FaMapMarkerAlt className={`text-blue-500 mr-2`} />
                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Delivery Address
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {order.shippingAddress?.street}
                    </p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {order.shippingAddress?.city}
                      {order.shippingAddress?.state && `, ${order.shippingAddress.state}`}
                      {order.shippingAddress?.postalCode && ` ${order.shippingAddress.postalCode}`}
                    </p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {order.shippingAddress?.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              {order.orderNotes && (
                <div className="mt-6">
                  <h4 className={`font-semibold mb-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Order Notes
                  </h4>
                  <div className={`p-4 border rounded-lg ${
                    isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                      {order.orderNotes}
                    </p>
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
const TransporterAssignmentModal = ({ order, transporters, isDarkMode, loading, onAssign, onAssignAny, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className={`rounded-lg max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b ${
          isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Assign Transporter - {order.orderNumber}
            </h3>
            <button
              onClick={onClose}
              className={`text-xl ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FaWindowClose />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Assign a transporter to deliver this order to the wholesaler.
            </p>
          </div>

          {/* Assign to any available transporter */}
          <div className="mb-6">
            <button
              onClick={onAssignAny}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <FaUserCheck className="mr-2" />
              Assign to Any Available Transporter
            </button>
            <p className={`text-xs text-center mt-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              System will automatically assign the best available transporter
            </p>
          </div>

          <div className="border-t border-gray-300 dark:border-gray-700 pt-6">
            <h4 className={`font-semibold mb-4 text-base ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Or Select Specific Transporter
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <FaSpinner className="animate-spin text-blue-500 mr-3" />
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Loading transporters...
                </span>
              </div>
            ) : transporters.length === 0 ? (
              <div className="text-center py-6">
                <FaTruck className={`text-4xl mx-auto mb-3 ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                  No active transporters available
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {transporters.map((transporter) => (
                  <div
                    key={transporter._id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-gray-600 hover:bg-gray-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onAssign(transporter._id)}
                  >
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-900' : 'bg-blue-100'
                      }`}>
                        <FaUser className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                      </div>
                      <div className="ml-3">
                        <p className={`font-medium text-sm ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {transporter.businessName || `${transporter.firstName} ${transporter.lastName}`}
                        </p>
                        <div className="flex items-center text-xs mt-1">
                          {transporter.vehicleType && (
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {transporter.vehicleType}
                            </span>
                          )}
                          {transporter.isOnline && (
                            <span className={`ml-3 flex items-center ${
                              isDarkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              <span className={`w-2 h-2 rounded-full mr-1 ${
                                isDarkMode ? 'bg-green-500' : 'bg-green-600'
                              }`}></span>
                              Online
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <FaUserPlus className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`p-4 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`w-full py-2 px-4 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Orders;