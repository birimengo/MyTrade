// C:\Users\ham\Desktop\trade\mobile\src\components\TransporterComponents\TransporterOrders.js
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
  Switch
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const TransporterOrders = ({ isDarkMode }) => {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

  useEffect(() => {
    fetchTransporterOrders();
  }, [filterStatus, showFreeOrders]);

  const getToken = async () => {
    try {
      // First try to use the token from AuthContext
      if (token) {
        console.log('Using token from AuthContext');
        return token;
      }
      
      // Fallback to AsyncStorage
      const storedToken = await AsyncStorage.getItem('userToken');
      if (storedToken) {
        console.log('Using token from AsyncStorage');
        return storedToken;
      }
      
      console.log('No token found');
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const fetchTransporterOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = await getToken();
      
      if (!authToken) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('includeFree', showFreeOrders.toString());
      
      console.log('Fetching orders with token:', authToken ? 'Token exists' : 'No token');
      
      const response = await fetch(
        `${API_BASE_URL}/api/retailer-orders/transporter?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Response status:', response.status);

      if (response.status === 401) {
        // Token is invalid or expired
        setError('Session expired. Please log in again.');
        // Optionally trigger logout
        // logout();
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      console.log('Orders data received:', data);

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
      if (error.message.includes('401')) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(error.message || 'Failed to load orders. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransporterOrders();
  };

  const handleOrderAction = async () => {
    try {
      const authToken = await getToken();
      
      if (!authToken) {
        setError('Authentication required. Please log in again.');
        return;
      }

      let updateData = { status: actionType };

      if (actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter') {
        updateData.cancellationReason = cancellationReason;
      }

      if (actionType === 'return_to_wholesaler') {
        updateData.returnReason = returnReason;
      }

      // For free assignment orders, we need to set the transporter when accepting
      if (actionType === 'accepted_by_transporter' && getOrderType(selectedOrder) === 'free') {
        updateData.transporterId = user?.id;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/retailer-orders/${selectedOrder._id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        setShowActionModal(false);
        return;
      }

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

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    };

    if (isDarkMode) {
      switch (status) {
        case 'pending': return { ...baseStyle, backgroundColor: 'rgba(253, 230, 138, 0.3)' };
        case 'accepted': return { ...baseStyle, backgroundColor: 'rgba(191, 219, 254, 0.3)' };
        case 'rejected': return { ...baseStyle, backgroundColor: 'rgba(254, 226, 226, 0.3)' };
        case 'processing': return { ...baseStyle, backgroundColor: 'rgba(233, 213, 255, 0.3)' };
        case 'assigned_to_transporter': return { ...baseStyle, backgroundColor: 'rgba(199, 210, 254, 0.3)' };
        case 'accepted_by_transporter': return { ...baseStyle, backgroundColor: 'rgba(153, 246, 228, 0.3)' };
        case 'in_transit': return { ...baseStyle, backgroundColor: 'rgba(254, 215, 170, 0.3)' };
        case 'delivered': return { ...baseStyle, backgroundColor: 'rgba(187, 247, 208, 0.3)' };
        case 'certified': return { ...baseStyle, backgroundColor: 'rgba(167, 243, 208, 0.3)' };
        case 'disputed': return { ...baseStyle, backgroundColor: 'rgba(254, 205, 211, 0.3)' };
        case 'return_to_wholesaler': return { ...baseStyle, backgroundColor: 'rgba(253, 230, 138, 0.3)' };
        case 'return_accepted': return { ...baseStyle, backgroundColor: 'rgba(191, 219, 254, 0.3)' };
        case 'return_rejected': return { ...baseStyle, backgroundColor: 'rgba(254, 226, 226, 0.3)' };
        case 'cancelled_by_retailer':
        case 'cancelled_by_wholesaler':
        case 'cancelled_by_transporter': return { ...baseStyle, backgroundColor: 'rgba(156, 163, 175, 0.3)' };
        default: return { ...baseStyle, backgroundColor: 'rgba(156, 163, 175, 0.3)' };
      }
    } else {
      switch (status) {
        case 'pending': return { ...baseStyle, backgroundColor: '#fef3c7' };
        case 'accepted': return { ...baseStyle, backgroundColor: '#dbeafe' };
        case 'rejected': return { ...baseStyle, backgroundColor: '#fee2e2' };
        case 'processing': return { ...baseStyle, backgroundColor: '#f3e8ff' };
        case 'assigned_to_transporter': return { ...baseStyle, backgroundColor: '#e0e7ff' };
        case 'accepted_by_transporter': return { ...baseStyle, backgroundColor: '#ccfbf1' };
        case 'in_transit': return { ...baseStyle, backgroundColor: '#ffedd5' };
        case 'delivered': return { ...baseStyle, backgroundColor: '#dcfce7' };
        case 'certified': return { ...baseStyle, backgroundColor: '#d1fae5' };
        case 'disputed': return { ...baseStyle, backgroundColor: '#ffe4e6' };
        case 'return_to_wholesaler': return { ...baseStyle, backgroundColor: '#fef3c7' };
        case 'return_accepted': return { ...baseStyle, backgroundColor: '#dbeafe' };
        case 'return_rejected': return { ...baseStyle, backgroundColor: '#fee2e2' };
        case 'cancelled_by_retailer':
        case 'cancelled_by_wholesaler':
        case 'cancelled_by_transporter': return { ...baseStyle, backgroundColor: '#f3f4f6' };
        default: return { ...baseStyle, backgroundColor: '#f3f4f6' };
      }
    }
  };

  const getStatusTextColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case 'pending': return '#fef3c7';
        case 'accepted': return '#93c5fd';
        case 'rejected': return '#fca5a5';
        case 'processing': return '#d8b4fe';
        case 'assigned_to_transporter': return '#a5b4fc';
        case 'accepted_by_transporter': return '#5eead4';
        case 'in_transit': return '#fdba74';
        case 'delivered': return '#86efac';
        case 'certified': return '#6ee7b7';
        case 'disputed': return '#fda4af';
        case 'return_to_wholesaler': return '#fde68a';
        case 'return_accepted': return '#93c5fd';
        case 'return_rejected': return '#fca5a5';
        case 'cancelled_by_retailer':
        case 'cancelled_by_wholesaler':
        case 'cancelled_by_transporter': return '#d1d5db';
        default: return '#d1d5db';
      }
    } else {
      switch (status) {
        case 'pending': return '#92400e';
        case 'accepted': return '#1e40af';
        case 'rejected': return '#991b1b';
        case 'processing': return '#7e22ce';
        case 'assigned_to_transporter': return '#3730a3';
        case 'accepted_by_transporter': return '#0f766e';
        case 'in_transit': return '#9a3412';
        case 'delivered': return '#166534';
        case 'certified': return '#065f46';
        case 'disputed': return '#be123c';
        case 'return_to_wholesaler': return '#92400e';
        case 'return_accepted': return '#1e40af';
        case 'return_rejected': return '#991b1b';
        case 'cancelled_by_retailer':
        case 'cancelled_by_wholesaler':
        case 'cancelled_by_transporter': return '#374151';
        default: return '#374151';
      }
    }
  };

  const getStatusText = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getOrderType = (order) => {
    if (order.transporter && (order.transporter._id === user?.id || order.transporter === user?.id)) {
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
          (order.transporter._id === user?.id || order.transporter === user?.id)) {
        actions.push('return_to_wholesaler');
      }
    }
    else if (currentStatus === 'return_to_wholesaler') {
      // Transporter can track return status but no further actions
    }
    
    return actions;
  };

  const getActionButtonStyle = (action) => {
    const baseStyle = {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
      marginVertical: 2,
    };

    switch (action) {
      case 'accepted_by_transporter': 
      case 'in_transit':
      case 'delivered': 
      case 'return_to_wholesaler': 
        return { ...baseStyle, backgroundColor: '#16a34a' };
      case 'rejected_by_transporter': 
      case 'cancelled_by_transporter': 
        return { ...baseStyle, backgroundColor: '#dc2626' };
      default: 
        return { ...baseStyle, backgroundColor: '#4b5563' };
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

  const getOrderCardStyle = (order) => {
    const orderType = getOrderType(order);
    const baseStyle = {
      borderRadius: 8,
      padding: 12,
      marginVertical: 4,
      borderWidth: 1,
    };

    if (isDarkMode) {
      if (orderType === 'free') {
        return { ...baseStyle, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6' };
      } else if (orderType === 'specific') {
        return { ...baseStyle, backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: '#22c55e' };
      } else {
        return { ...baseStyle, backgroundColor: 'rgba(55, 65, 81, 0.5)', borderColor: '#374151' };
      }
    } else {
      if (orderType === 'free') {
        return { ...baseStyle, backgroundColor: '#dbeafe', borderColor: '#3b82f6' };
      } else if (orderType === 'specific') {
        return { ...baseStyle, backgroundColor: '#dcfce7', borderColor: '#22c55e' };
      } else {
        return { ...baseStyle, backgroundColor: '#f9fafb', borderColor: '#d1d5db' };
      }
    }
  };

  const getAssignmentInfoStyle = (order) => {
    const orderType = getOrderType(order);
    const baseStyle = {
      padding: 6,
      borderRadius: 4,
      marginBottom: 4,
    };

    if (isDarkMode) {
      if (orderType === 'free') {
        return { ...baseStyle, backgroundColor: 'rgba(59, 130, 246, 0.3)' };
      } else if (orderType === 'specific') {
        return { ...baseStyle, backgroundColor: 'rgba(34, 197, 94, 0.3)' };
      } else {
        return { ...baseStyle, backgroundColor: 'rgba(55, 65, 81, 0.3)' };
      }
    } else {
      if (orderType === 'free') {
        return { ...baseStyle, backgroundColor: '#dbeafe' };
      } else if (orderType === 'specific') {
        return { ...baseStyle, backgroundColor: '#dcfce7' };
      } else {
        return { ...baseStyle, backgroundColor: '#f3f4f6' };
      }
    }
  };

  const getAssignmentInfoTextColor = (order) => {
    const orderType = getOrderType(order);
    if (isDarkMode) {
      if (orderType === 'free') return '#93c5fd';
      if (orderType === 'specific') return '#86efac';
      return '#9ca3af';
    } else {
      if (orderType === 'free') return '#1e40af';
      if (orderType === 'specific') return '#166534';
      return '#374151';
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchTransporterOrders();
  };

  const handleLogout = () => {
    // This would typically be handled by your auth context
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please log in again.',
      [
        {
          text: 'OK',
          onPress: () => logout()
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>Transport Orders</Text>
          <ActivityIndicator size="small" color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>Transport Orders</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
            Manage orders assigned to you and available for pickup
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, isDarkMode && styles.darkText]}>Show available orders</Text>
          <Switch
            value={showFreeOrders}
            onValueChange={setShowFreeOrders}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={showFreeOrders ? '#ffffff' : '#f3f4f6'}
          />
        </View>

        <View style={styles.selectContainer}>
          <Text style={[styles.selectLabel, isDarkMode && styles.darkText]}>Filter by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { value: 'assigned_to_transporter', label: 'Available' },
              { value: 'accepted_by_transporter', label: 'Accepted' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'disputed', label: 'Disputed' },
              { value: 'return_to_wholesaler', label: 'Returns' },
              { value: 'all', label: 'All' },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.value}
                onPress={() => setFilterStatus(filter.value)}
                style={[
                  styles.filterButton,
                  filterStatus === filter.value && styles.filterButtonActive,
                  isDarkMode && styles.darkFilterButton,
                  filterStatus === filter.value && isDarkMode && styles.darkFilterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === filter.value && styles.filterButtonTextActive,
                    isDarkMode && styles.darkFilterButtonText,
                    filterStatus === filter.value && isDarkMode && styles.darkFilterButtonTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, isDarkMode && styles.darkErrorContainer]}>
          <Ionicons name="warning" size={20} color={isDarkMode ? "#fca5a5" : "#dc2626"} />
          <View style={styles.errorContent}>
            <Text style={[styles.errorText, isDarkMode && styles.darkErrorText]}>{error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
              {error.includes('expired') || error.includes('Authentication') ? (
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                  <Text style={styles.logoutText}>Log In</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      )}

      {/* Success Message */}
      {successMessage && (
        <View style={[styles.successContainer, isDarkMode && styles.darkSuccessContainer]}>
          <Ionicons name="checkmark-circle" size={20} color={isDarkMode ? "#86efac" : "#16a34a"} />
          <Text style={[styles.successText, isDarkMode && styles.darkSuccessText]}>{successMessage}</Text>
        </View>
      )}

      {/* Orders List */}
      {orders.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="cube-outline" 
            size={48} 
            color={isDarkMode ? "#6b7280" : "#9ca3af"} 
          />
          <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
            No orders found
          </Text>
          <Text style={[styles.emptySubtitle, isDarkMode && styles.darkSubtext]}>
            {filterStatus === 'all' 
              ? `You don't have any orders ${showFreeOrders ? 'assigned to you or available' : 'assigned to you'} yet.`
              : `No orders with status "${filterStatus}" found.`
            }
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.ordersList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[isDarkMode ? "#60a5fa" : "#3b82f6"]}
              tintColor={isDarkMode ? "#60a5fa" : "#3b82f6"}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {orders.map((order) => {
            const images = order.product?.images || [];
            const currentImageIndex = activeImageIndexes[order._id] || 0;
            const currentImage = images[currentImageIndex]?.url;
            const hasMultipleImages = images.length > 1;
            const orderType = getOrderType(order);
            const assignmentInfo = getOrderAssignmentInfo(order);
            const allowedActions = getAllowedActions(order);
            const canTakeAction = orderType === 'specific' || orderType === 'free';

            return (
              <View key={order._id} style={getOrderCardStyle(order)}>
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <Text style={[styles.orderId, isDarkMode && styles.darkText]}>
                    Order #{order._id.slice(-6).toUpperCase()}
                  </Text>
                  <View style={getStatusBadgeStyle(order.status)}>
                    <Text style={[styles.statusText, { color: getStatusTextColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>

                {/* Assignment Info */}
                {assignmentInfo && (
                  <View style={getAssignmentInfoStyle(order)}>
                    <Text style={[styles.assignmentText, { color: getAssignmentInfoTextColor(order) }]}>
                      {assignmentInfo}
                    </Text>
                  </View>
                )}

                {/* Product Image */}
                <View style={styles.imageContainer}>
                  {currentImage ? (
                    <View style={styles.imageWrapper}>
                      <Image
                        source={{ uri: currentImage }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      {hasMultipleImages && (
                        <>
                          <TouchableOpacity
                            style={[styles.navButton, styles.navButtonLeft]}
                            onPress={() => handleImageNavigation(order._id, 'prev', images.length)}
                          >
                            <Ionicons name="chevron-back" size={16} color="#ffffff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.navButton, styles.navButtonRight]}
                            onPress={() => handleImageNavigation(order._id, 'next', images.length)}
                          >
                            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
                          </TouchableOpacity>
                          <View style={styles.imageCounter}>
                            <Text style={styles.imageCounterText}>
                              {currentImageIndex + 1}/{images.length}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
                      <Ionicons name="image-outline" size={24} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
                    </View>
                  )}
                </View>

                {/* Order Details */}
                <View style={styles.orderDetails}>
                  <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
                    {order.product?.name}
                  </Text>

                  <View style={styles.detailsGrid}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>From:</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={1}>
                      {order.wholesaler?.businessName || `${order.wholesaler?.firstName} ${order.wholesaler?.lastName}`}
                    </Text>

                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>To:</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={1}>
                      {order.retailer?.businessName || `${order.retailer?.firstName} ${order.retailer?.lastName}`}
                    </Text>

                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Date:</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={[styles.quantity, isDarkMode && styles.darkSubtext]}>
                      {order.quantity} {order.measurementUnit} × UGX {order.unitPrice?.toLocaleString()}
                    </Text>
                    <Text style={[styles.totalPrice, isDarkMode && styles.darkSuccessText]}>
                      Total: UGX {order.totalPrice?.toLocaleString()}
                    </Text>
                  </View>

                  <Text style={[styles.deliveryAddress, isDarkMode && styles.darkSubtext]} numberOfLines={2}>
                    To: {order.deliveryPlace}
                  </Text>

                  {order.deliveryCoordinates && (
                    <Text style={[styles.coordinates, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
                      Coordinates: {order.deliveryCoordinates.lat}, {order.deliveryCoordinates.lng}
                    </Text>
                  )}

                  {order.orderNotes && (
                    <View style={[styles.notesContainer, isDarkMode && styles.darkNotesContainer]}>
                      <Text style={[styles.notesLabel, isDarkMode && styles.darkSubtext]}>Notes:</Text>
                      <Text style={[styles.notesText, isDarkMode && styles.darkText]} numberOfLines={2}>
                        {order.orderNotes}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                {canTakeAction && allowedActions.length > 0 && (
                  <View style={styles.actionsContainer}>
                    {allowedActions.map((action) => (
                      <TouchableOpacity
                        key={action}
                        style={getActionButtonStyle(action)}
                        onPress={() => openActionModal(order, action)}
                      >
                        <Text style={styles.actionButtonText}>
                          {getActionText(action)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!canTakeAction && (
                  <View style={styles.noActionContainer}>
                    <Text style={[styles.noActionText, isDarkMode && styles.darkSubtext]}>
                      Assigned to another transporter
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {getActionText(actionType)} - Order #{selectedOrder?._id.slice(-8).toUpperCase()}
            </Text>

            <Text style={[styles.modalDescription, isDarkMode && styles.darkSubtext]}>
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
            </Text>

            {(actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter' || actionType === 'return_to_wholesaler') && (
              <TextInput
                style={[styles.reasonInput, isDarkMode && styles.darkReasonInput]}
                value={actionType === 'return_to_wholesaler' ? returnReason : cancellationReason}
                onChangeText={(text) => {
                  if (actionType === 'return_to_wholesaler') {
                    setReturnReason(text);
                  } else {
                    setCancellationReason(text);
                  }
                }}
                placeholder="Please provide a reason..."
                placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, isDarkMode && styles.darkCancelButton]}
                onPress={() => {
                  setShowActionModal(false);
                  setSelectedOrder(null);
                  setActionType('');
                  setCancellationReason('');
                  setReturnReason('');
                }}
              >
                <Text style={[styles.cancelButtonText, isDarkMode && styles.darkCancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, getActionButtonStyle(actionType)]}
                onPress={handleOrderAction}
                disabled={
                  (actionType === 'rejected_by_transporter' || actionType === 'cancelled_by_transporter' || actionType === 'return_to_wholesaler') && 
                  !(actionType === 'return_to_wholesaler' ? returnReason.trim() : cancellationReason.trim())
                }
              >
                <Text style={styles.actionButtonText}>
                  Confirm {getActionText(actionType)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  darkText: {
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  darkSubtext: {
    color: '#d1d5db',
  },
  filterContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginRight: 8,
  },
  filterScroll: {
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  darkFilterButton: {
    backgroundColor: '#374151',
  },
  darkFilterButtonActive: {
    backgroundColor: '#60a5fa',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  darkFilterButtonText: {
    color: '#d1d5db',
  },
  darkFilterButtonTextActive: {
    color: '#ffffff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  darkErrorContainer: {
    backgroundColor: 'rgba(127, 29, 29, 0.3)',
  },
  errorContent: {
    flex: 1,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 8,
  },
  darkErrorText: {
    color: '#fca5a5',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#dc2626',
    borderRadius: 4,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  darkSuccessContainer: {
    backgroundColor: 'rgba(6, 95, 70, 0.3)',
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#16a34a',
    marginLeft: 8,
  },
  darkSuccessText: {
    color: '#86efac',
  },
  ordersList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  assignmentText: {
    fontSize: 10,
    fontWeight: '500',
  },
  imageContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkPlaceholderImage: {
    backgroundColor: '#374151',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -8 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  orderDetails: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    width: '25%',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#374151',
    width: '75%',
    marginBottom: 4,
  },
  priceContainer: {
    marginBottom: 8,
  },
  quantity: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  deliveryAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
  },
  notesContainer: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  darkNotesContainer: {
    backgroundColor: '#374151',
  },
  notesLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#374151',
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  noActionContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  noActionText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  darkModalContent: {
    backgroundColor: '#1f2937',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  darkReasonInput: {
    borderColor: '#4b5563',
    backgroundColor: '#374151',
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  darkCancelButtonText: {
    color: '#d1d5db',
  },
});

export default TransporterOrders;