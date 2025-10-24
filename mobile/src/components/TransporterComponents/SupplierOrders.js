// C:\Users\ham\Desktop\trade\mobile\src\components\TransporterComponents\SupplierOrders.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome5,
  Feather 
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrdersHeader from './OrdersHeader';
import OrderCard from './OrderCard';
import OrderDetailsModal from './OrderDetailsModal';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const SupplierOrders = ({ isDarkMode }) => {
  const { user, token: authToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

  const getToken = async () => {
    try {
      if (authToken) return authToken;
      const storedToken = await AsyncStorage.getItem('userToken');
      return storedToken;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  // Fetch orders assigned to this transporter
  useEffect(() => {
    fetchOrders();
  }, [filters.type]);

  // Fetch available return orders
  useEffect(() => {
    fetchAvailableReturnOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/transporters/assigned-orders?type=${filters.type}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
        setStatistics(data.statistics || {});
        
        const initialIndices = {};
        data.orders.forEach(order => {
          initialIndices[order._id] = 0;
        });
        setImageIndices(initialIndices);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableReturnOrders = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/api/transporters/return-orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableReturnOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error('Error fetching return orders:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchAvailableReturnOrders();
  };

  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.search && !order.orderNumber?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getOrderType = (order) => {
    if (order.returnTransporter || order.status?.includes('return_')) {
      return 'return';
    }
    if (order.assignedTransporter) {
      return 'delivery';
    }
    return 'delivery';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned_to_transporter': return 'truck';
      case 'accepted_by_transporter': return 'checkmark-circle';
      case 'in_transit': return 'navigate';
      case 'delivered': return 'home';
      case 'cancelled': return 'close-circle';
      case 'return_requested': return 'return-up-back';
      case 'return_accepted': return 'checkmark-circle';
      case 'return_in_transit': return 'navigate';
      case 'returned_to_supplier': return 'home';
      case 'certified': return 'shield-checkmark';
      default: return 'help-circle';
    }
  };

  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case 'assigned_to_transporter': return { bg: '#3730a3', text: '#c7d2fe' };
        case 'accepted_by_transporter': return { bg: '#1e40af', text: '#dbeafe' };
        case 'in_transit': return { bg: '#9a3412', text: '#fed7aa' };
        case 'delivered': return { bg: '#166534', text: '#dcfce7' };
        case 'cancelled': return { bg: '#991b1b', text: '#fee2e2' };
        case 'return_requested': return { bg: '#92400e', text: '#fef3c7' };
        case 'return_accepted': return { bg: '#1e40af', text: '#dbeafe' };
        case 'return_in_transit': return { bg: '#9a3412', text: '#fed7aa' };
        case 'returned_to_supplier': return { bg: '#166534', text: '#dcfce7' };
        default: return { bg: '#374151', text: '#d1d5db' };
      }
    } else {
      switch (status) {
        case 'assigned_to_transporter': return { bg: '#e0e7ff', text: '#3730a3' };
        case 'accepted_by_transporter': return { bg: '#dbeafe', text: '#1e40af' };
        case 'in_transit': return { bg: '#ffedd5', text: '#9a3412' };
        case 'delivered': return { bg: '#dcfce7', text: '#166534' };
        case 'cancelled': return { bg: '#fee2e2', text: '#991b1b' };
        case 'return_requested': return { bg: '#fef3c7', text: '#92400e' };
        case 'return_accepted': return { bg: '#dbeafe', text: '#1e40af' };
        case 'return_in_transit': return { bg: '#ffedd5', text: '#9a3412' };
        case 'returned_to_supplier': return { bg: '#dcfce7', text: '#166534' };
        default: return { bg: '#f3f4f6', text: '#374151' };
      }
    }
  };

  const getStatusText = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getAllProductImages = (order) => {
    const images = [];
    order.items?.forEach(item => {
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
    const order = orders.find(o => o._id === orderId);
    const images = getAllProductImages(order);
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

  const getWholesalerName = (wholesaler) => {
    if (!wholesaler) return 'Unknown Wholesaler';
    return wholesaler.businessName || `${wholesaler.firstName} ${wholesaler.lastName}`;
  };

  const getSupplierLocation = (supplier) => {
    if (!supplier) return '';
    const locationParts = [supplier.city, supplier.country].filter(Boolean);
    return locationParts.join(', ');
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/transporters/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            status: newStatus,
            notes: notes
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        
        Alert.alert('Success', `Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const acceptReturnOrder = async (orderId) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/transporters/return-orders/${orderId}/accept`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
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
        
        Alert.alert('Success', 'Return order accepted successfully!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to accept return order');
      }
    } catch (error) {
      console.error('Error accepting return order:', error);
      Alert.alert('Error', 'Failed to accept return order');
    }
  };

  const renderActionButtons = (order) => {
    const orderType = getOrderType(order);
    
    if (orderType === 'delivery') {
      return (
        <View style={styles.actionButtonsContainer}>
          {order.status === 'assigned_to_transporter' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => updateOrderStatus(order._id, 'accepted_by_transporter')}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => updateOrderStatus(order._id, 'cancelled', 'Transporter declined the assignment')}
              >
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
          
          {order.status === 'accepted_by_transporter' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => updateOrderStatus(order._id, 'in_transit')}
            >
              <Text style={styles.actionButtonText}>Start Delivery</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'in_transit' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliverButton]}
              onPress={() => updateOrderStatus(order._id, 'delivered')}
            >
              <Text style={styles.actionButtonText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {order.status === 'delivered' && (
            <View style={[styles.actionButton, styles.completedButton]}>
              <Text style={[styles.actionButtonText, styles.completedText]}>Delivered</Text>
            </View>
          )}

          {['accepted_by_transporter', 'in_transit'].includes(order.status) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => updateOrderStatus(order._id, 'cancelled', 'Delivery cancelled by transporter')}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    } else if (orderType === 'return') {
      return (
        <View style={styles.actionButtonsContainer}>
          {order.status === 'return_requested' && !order.returnTransporter && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => acceptReturnOrder(order._id)}
            >
              <Text style={styles.actionButtonText}>Accept Return</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'return_requested' && order.returnTransporter && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => updateOrderStatus(order._id, 'return_accepted')}
            >
              <Text style={styles.actionButtonText}>Start Return</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'return_accepted' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.pickupButton]}
              onPress={() => updateOrderStatus(order._id, 'return_in_transit')}
            >
              <Text style={styles.actionButtonText}>Pickup Return</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'return_in_transit' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => updateOrderStatus(order._id, 'returned_to_supplier')}
            >
              <Text style={styles.actionButtonText}>Complete Return</Text>
            </TouchableOpacity>
          )}

          {order.status === 'returned_to_supplier' && (
            <View style={[styles.actionButton, styles.completedButton]}>
              <Text style={[styles.actionButtonText, styles.completedText]}>Returned</Text>
            </View>
          )}

          {['return_requested', 'return_accepted', 'return_in_transit'].includes(order.status) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => updateOrderStatus(order._id, 'cancelled', 'Return cancelled by transporter')}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
  };

  const refreshOrders = () => {
    fetchOrders();
    fetchAvailableReturnOrders();
  };

  const renderOrderItem = ({ item: order }) => {
    const images = getAllProductImages(order);
    const currentImage = getCurrentImage(order);
    const currentIndex = imageIndices[order._id] || 0;
    const orderType = getOrderType(order);
    const isAvailableReturn = availableReturnOrders.some(ro => ro._id === order._id);

    return (
      <OrderCard
        order={order}
        orderType={orderType}
        isAvailableReturn={isAvailableReturn}
        currentImage={currentImage}
        currentIndex={currentIndex}
        images={images}
        onImageNavigate={navigateImage}
        onOpenDetails={openOrderDetails}
        onAcceptReturn={acceptReturnOrder}
        getStatusIcon={getStatusIcon}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        formatDate={(date) => new Date(date).toLocaleDateString()}
        getSupplierName={getSupplierName}
        getWholesalerName={getWholesalerName}
        getSupplierLocation={getSupplierLocation}
        renderActionButtons={renderActionButtons}
        isDarkMode={isDarkMode}
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading supplier orders...
          </Text>
        </View>
      </View>
    );
  }

  const allOrders = [
    ...(filters.type === 'all' ? availableReturnOrders : []),
    ...filteredOrders
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <OrdersHeader 
        filters={filters}
        setFilters={setFilters}
        statistics={statistics}
        availableReturnOrders={availableReturnOrders}
        refreshOrders={refreshOrders}
        isDarkMode={isDarkMode}
      />

      {allOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="cube-outline" 
            size={48} 
            color={isDarkMode ? "#6b7280" : "#9ca3af"} 
          />
          <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
            No orders assigned
          </Text>
          <Text style={[styles.emptySubtitle, isDarkMode && styles.darkSubtext]}>
            {filters.status !== 'all' || filters.search ? 
              'Try adjusting your filters' : 
              'No supplier orders have been assigned to you yet'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={allOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          style={styles.ordersList}
          contentContainerStyle={styles.ordersContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[isDarkMode ? "#60a5fa" : "#3b82f6"]}
              tintColor={isDarkMode ? "#60a5fa" : "#3b82f6"}
            />
          }
          showsVerticalScrollIndicator={false}
          numColumns={1}
        />
      )}

      <OrderDetailsModal
        order={selectedOrder}
        isVisible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        getStatusIcon={getStatusIcon}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        formatDate={(date) => new Date(date).toLocaleDateString()}
        updateOrderStatus={updateOrderStatus}
        getOrderType={getOrderType}
        acceptReturnOrder={acceptReturnOrder}
        availableReturnOrders={availableReturnOrders}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  ordersList: {
    flex: 1,
  },
  ordersContent: {
    padding: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    flex: 1,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#16a34a',
  },
  declineButton: {
    backgroundColor: '#dc2626',
  },
  startButton: {
    backgroundColor: '#ea580c',
  },
  deliverButton: {
    backgroundColor: '#16a34a',
  },
  pickupButton: {
    backgroundColor: '#ea580c',
  },
  completeButton: {
    backgroundColor: '#16a34a',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
  },
  completedButton: {
    backgroundColor: '#f3f4f6',
  },
  completedText: {
    color: '#374151',
  },
  darkText: {
    color: '#ffffff',
  },
  darkSubtext: {
    color: '#d1d5db',
  },
});

export default SupplierOrders;