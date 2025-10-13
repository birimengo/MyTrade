// src/components/RetailerComponents/Orders.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// SVG Icons
const SearchIcon = ({ size = 16, color = "#6B7280" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.searchCircle, { borderColor: color }]} />
    <View style={[styles.searchLine, { backgroundColor: color }]} />
  </View>
);

const ChevronDownIcon = ({ size = 16, color = "#6B7280" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.chevron, { borderTopColor: color }]} />
  </View>
);

const ChevronLeftIcon = ({ size = 16, color = "#FFFFFF" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.chevronLeft, { borderRightColor: color }]} />
  </View>
);

const ChevronRightIcon = ({ size = 16, color = "#FFFFFF" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.chevronRight, { borderLeftColor: color }]} />
  </View>
);

const CheckIcon = ({ size = 16, color = "#FFFFFF" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.checkStem, { backgroundColor: color }]} />
    <View style={[styles.checkKick, { backgroundColor: color }]} />
  </View>
);

const CloseIcon = ({ size = 16, color = "#FFFFFF" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.closeLine, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
    <View style={[styles.closeLine, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
  </View>
);

const ImageIcon = ({ size = 24, color = "#9CA3AF" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.imageRect, { borderColor: color }]} />
    <View style={[styles.imageLine1, { backgroundColor: color }]} />
    <View style={[styles.imageLine2, { backgroundColor: color }]} />
    <View style={[styles.imageDot1, { backgroundColor: color }]} />
    <View style={[styles.imageDot2, { backgroundColor: color }]} />
  </View>
);

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
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const placeholderImage = 'https://via.placeholder.com/150/3B82F6/FFFFFF?text=No+Image';

  const getAuthToken = async () => {
    try {
      const tokenKeys = ['userToken', 'token', 'authToken', 'accessToken'];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [statusFilter, currentPage, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      let endpoint = '';
      if (user.role === 'retailer') {
        endpoint = 'retailer';
      } else if (user.role === 'wholesaler') {
        endpoint = 'wholesaler';
      } else if (user.role === 'transporter') {
        endpoint = 'transporter';
      } else {
        setError('Invalid user role');
        return;
      }

      const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';
      const response = await fetch(
        `${API_BASE_URL}/api/retailer-orders/${endpoint}?status=${statusFilter}&page=${currentPage}&limit=10`,
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
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setError('');
      
      const indexes = {};
      (data.orders || []).forEach(order => {
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
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
      const token = await getAuthToken();
      const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

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
        `${API_BASE_URL}/api/retailer-orders/${orderId}/status`,
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

      fetchOrders();
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
      Alert.alert('Error', 'Failed to update order status. Please try again.');
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
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';
              const response = await fetch(
                `${API_BASE_URL}/api/retailer-orders/${orderId}`,
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

              fetchOrders();
              setSuccessMessage('Order deleted successfully.');
              
              setTimeout(() => {
                setSuccessMessage('');
              }, 5000);
            } catch (err) {
              setError(err.message);
              console.error('Error deleting order:', err);
              Alert.alert('Error', 'Failed to delete order. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: { bg: '#FEF3C7', text: '#92400E' },
      accepted: { bg: '#DBEAFE', text: '#1E40AF' },
      rejected: { bg: '#FEE2E2', text: '#991B1B' },
      processing: { bg: '#F3E8FF', text: '#6B21A8' },
      assigned_to_transporter: { bg: '#E0E7FF', text: '#3730A3' },
      accepted_by_transporter: { bg: '#CCFBF1', text: '#0F766E' },
      in_transit: { bg: '#FFEDD5', text: '#9A3412' },
      delivered: { bg: '#D1FAE5', text: '#065F46' },
      certified: { bg: '#D1FAE5', text: '#065F46' },
      disputed: { bg: '#FEE2E2', text: '#991B1B' },
      return_to_wholesaler: { bg: '#FEF3C7', text: '#92400E' },
      return_accepted: { bg: '#D1FAE5', text: '#065F46' },
      return_rejected: { bg: '#FEE2E2', text: '#991B1B' },
      cancelled_by_retailer: { bg: '#F3F4F6', text: '#374151' },
      cancelled_by_wholesaler: { bg: '#F3F4F6', text: '#374151' },
      cancelled_by_transporter: { bg: '#F3F4F6', text: '#374151' },
    };
    return statusColors[status] || { bg: '#F3F4F6', text: '#374151' };
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
      // Allow deletion for pending, return_accepted, and return_rejected orders
      if (['pending', 'rejected', 'return_accepted', 'return_rejected', 'cancelled_by_wholesaler'].includes(order.status)) {
        buttons.push(
          <TouchableOpacity
            key="delete"
            onPress={() => handleDeleteOrder(order._id)}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Delete</Text></Text>
          </TouchableOpacity>
        );
      }
      
      // Allow cancellation for pending, accepted, and processing orders
      if (['pending', 'accepted', 'processing'].includes(order.status)) {
        buttons.push(
          <TouchableOpacity
            key="cancel"
            onPress={() => setSelectedOrder({ ...order, action: 'cancel' })}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Cancel</Text></Text>
          </TouchableOpacity>
        );
      }
      
      // Delivery certification buttons
      if (order.status === 'delivered') {
        buttons.push(
          <TouchableOpacity
            key="certify"
            onPress={() => handleDeliveryCertification(order, true)}
            style={[styles.actionButton, styles.certifyButton]}
          >
            <CheckIcon size={12} color="#FFFFFF" />
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Certify</Text></Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="dispute"
            onPress={() => handleDeliveryCertification(order, false)}
            style={[styles.actionButton, styles.disputeButton]}
          >
            <CloseIcon size={12} color="#FFFFFF" />
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Dispute</Text></Text>
          </TouchableOpacity>
        );
      }
    }
    
    if (user.role === 'wholesaler') {
      if (order.status === 'pending') {
        buttons.push(
          <TouchableOpacity
            key="accept"
            onPress={() => handleStatusUpdate(order._id, 'accepted')}
            style={[styles.actionButton, styles.acceptButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Accept</Text></Text>
          </TouchableOpacity>,
          <TouchableOpacity
            key="reject"
            onPress={() => setSelectedOrder({ ...order, action: 'reject' })}
            style={[styles.actionButton, styles.rejectButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Reject</Text></Text>
          </TouchableOpacity>
        );
      }
      
      if (order.status === 'accepted') {
        buttons.push(
          <TouchableOpacity
            key="process"
            onPress={() => handleStatusUpdate(order._id, 'processing')}
            style={[styles.actionButton, styles.processButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Process</Text></Text>
          </TouchableOpacity>
        );
        buttons.push(
          <TouchableOpacity
            key="cancel"
            onPress={() => setSelectedOrder({ ...order, action: 'cancel' })}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Cancel</Text></Text>
          </TouchableOpacity>
        );
      }
      
      if (order.status === 'processing') {
        buttons.push(
          <TouchableOpacity
            key="assign"
            onPress={() => setSelectedOrder({ ...order, action: 'assign' })}
            style={[styles.actionButton, styles.assignButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Assign</Text></Text>
          </TouchableOpacity>
        );
        buttons.push(
          <TouchableOpacity
            key="cancel"
            onPress={() => setSelectedOrder({ ...order, action: 'cancel' })}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Cancel</Text></Text>
          </TouchableOpacity>
        );
      }
    }
    
    if (user.role === 'transporter') {
      if (order.status === 'assigned_to_transporter') {
        buttons.push(
          <TouchableOpacity
            key="transit"
            onPress={() => handleStatusUpdate(order._id, 'in_transit')}
            style={[styles.actionButton, styles.transitButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Start</Text></Text>
          </TouchableOpacity>
        );
        buttons.push(
          <TouchableOpacity
            key="cancel"
            onPress={() => setSelectedOrder({ ...order, action: 'cancel' })}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Cancel</Text></Text>
          </TouchableOpacity>
        );
      }
      
      if (order.status === 'in_transit') {
        buttons.push(
          <TouchableOpacity
            key="deliver"
            onPress={() => handleStatusUpdate(order._id, 'delivered')}
            style={[styles.actionButton, styles.deliverButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Deliver</Text></Text>
          </TouchableOpacity>
        );
        buttons.push(
          <TouchableOpacity
            key="cancel"
            onPress={() => setSelectedOrder({ ...order, action: 'cancel' })}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Cancel</Text></Text>
          </TouchableOpacity>
        );
      }
    }
    
    return buttons;
  };

  const renderOrderDetailsModal = () => {
    if (!selectedOrder) return null;
    
    return (
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setSelectedOrder(null);
          setDisputeReason('');
        }}
      >
        <View style={[styles.modalContainer, isDarkMode && styles.darkModalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              {selectedOrder.action === 'cancel' && 'Cancel Order'}
              {selectedOrder.action === 'reject' && 'Reject Order'}
              {selectedOrder.action === 'assign' && 'Assign to Transporter'}
              {selectedOrder.action === 'dispute' && 'Dispute Delivery'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedOrder(null);
                setDisputeReason('');
              }}
              style={styles.closeModalButton}
            >
              <CloseIcon size={20} color={isDarkMode ? "#FFFFFF" : "#374151"} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {(selectedOrder.action === 'cancel' || selectedOrder.action === 'reject' || selectedOrder.action === 'dispute') && (
              <View style={styles.formSection}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}><Text style={[styles.label, isDarkMode && styles.darkText]}>Reason</Text></Text>
                <TextInput
                  style={[styles.textArea, isDarkMode && styles.darkInput]}
                  value={selectedOrder.action === 'dispute' ? disputeReason : selectedOrder.cancellationReason || ''}
                  onChangeText={(text) => {
                    if (selectedOrder.action === 'dispute') {
                      setDisputeReason(text);
                    } else {
                      setSelectedOrder({
                        ...selectedOrder, 
                        cancellationReason: text 
                      });
                    }
                  }}
                  placeholder={
                    selectedOrder.action === 'dispute' 
                      ? "Explain why you are not satisfied with the delivery..." 
                      : "Enter reason for cancellation/rejection"
                  }
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
            
            {selectedOrder.action === 'assign' && (
              <View style={styles.formSection}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}><Text style={[styles.label, isDarkMode && styles.darkText]}>Transporter ID</Text></Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.darkInput]}
                  placeholder="Enter transporter ID"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  onChangeText={(text) => setSelectedOrder({
                    ...selectedOrder, 
                    transporterId: text 
                  })}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelModalButton, isDarkMode && styles.darkCancelButton]}
                onPress={() => {
                  setSelectedOrder(null);
                  setDisputeReason('');
                }}
              >
                <Text style={[styles.cancelModalButtonText, isDarkMode && styles.darkText]}><Text style={[styles.cancelModalButtonText, isDarkMode && styles.darkText]}>Cancel</Text></Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalButton}
                onPress={() => {
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
                  }
                  
                  if (selectedOrder.action === 'dispute') {
                    handleStatusUpdate(
                      selectedOrder._id, 
                      newStatus, 
                      '', 
                      disputeReason
                    );
                  } else {
                    handleStatusUpdate(
                      selectedOrder._id, 
                      newStatus, 
                      selectedOrder.cancellationReason
                    );
                  }
                }}
                disabled={
                  (selectedOrder.action === 'dispute' && !disputeReason.trim()) ||
                  (selectedOrder.action === 'assign' && !selectedOrder.transporterId?.trim())
                }
              >
                <Text style={styles.confirmModalButtonText}><Text style={styles.confirmModalButtonText}>Confirm</Text></Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
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
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>Orders</Text></Text>
        <View style={styles.centeredContent}>
          <Text style={[styles.noDataText, isDarkMode && styles.darkSubtitle]}>
            Please log in to view your orders
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>Orders</Text></Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading orders...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>My Orders</Text></Text>
      
      {/* Search and Filter */}
      <View style={styles.filterContainer}>
        <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
          <SearchIcon size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkText]}
            placeholder="Search by product or business name..."
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterWrapper}>
          <Text style={[styles.filterLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.filterLabel, isDarkMode && styles.darkSubtitle]}>Filter:</Text></Text>
          <TouchableOpacity
            style={[styles.filterSelect, isDarkMode && styles.darkFilterSelect]}
            onPress={() => setShowStatusFilter(!showStatusFilter)}
          >
            <Text style={[styles.filterSelectText, isDarkMode && styles.darkText]}>
              {statusFilter === 'all' ? 'All Statuses' : statusFilter.replace(/_/g, ' ')}
            </Text>
            <ChevronDownIcon size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        </View>
      </View>

      {showStatusFilter && (
        <View style={[styles.statusFilterDropdown, isDarkMode && styles.darkStatusFilterDropdown]}>
          <ScrollView style={styles.statusFilterList}>
            {[
              'all', 'pending', 'accepted', 'rejected', 'processing', 
              'assigned_to_transporter', 'in_transit', 'delivered', 
              'certified', 'disputed', 'return_to_wholesaler',
              'return_accepted', 'return_rejected', 'cancelled'
            ].map(status => (
              <TouchableOpacity
                key={status}
                style={styles.statusFilterItem}
                onPress={() => {
                  setStatusFilter(status);
                  setShowStatusFilter(false);
                  setCurrentPage(1);
                }}
              >
                <Text style={[
                  styles.statusFilterText,
                  isDarkMode && styles.darkText,
                  statusFilter === status && styles.selectedStatusFilter
                ]}>
                  {status === 'all' ? 'All Statuses' : status.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Orders List */}
      <ScrollView
        style={styles.ordersContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.centeredContent}>
            <Text style={[styles.noDataText, isDarkMode && styles.darkSubtitle]}>
              No orders found matching your criteria.
            </Text>
          </View>
        ) : (
          <View style={styles.ordersGrid}>
            {filteredOrders.map((order) => {
              const images = order.product?.images || [];
              const currentImageIndex = activeImageIndexes[order._id] || 0;
              const currentImage = images[currentImageIndex]?.url;
              const hasMultipleImages = images.length > 1;
              const certificationStatus = getDeliveryCertificationStatus(order);
              const statusColor = getStatusColor(order.status);

              return (
                <View 
                  key={order._id} 
                  style={[styles.orderCard, isDarkMode && styles.darkOrderCard]}
                >
                  {/* Order Header */}
                  <View style={styles.orderHeader}>
                    <Text style={[styles.orderId, isDarkMode && styles.darkText]} numberOfLines={1}>
                      Order #{order._id?.slice(-6)?.toUpperCase() || 'N/A'}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {order.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Certification Status */}
                  {certificationStatus && (
                    <View style={[
                      styles.certificationStatus,
                      order.status === 'certified' ? styles.certifiedStatus : styles.disputedStatus
                    ]}>
                      <Text style={styles.certificationText}>{certificationStatus.text}</Text>
                      {certificationStatus.date && (
                        <Text style={styles.certificationDate}>On: {certificationStatus.date}</Text>
                      )}
                      {order.status === 'disputed' && order.deliveryDispute?.reason && (
                        <Text style={styles.disputeReason}>
                          Reason: {order.deliveryDispute.reason}
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {/* Product Image with Carousel */}
                  <View style={styles.imageContainer}>
                    {currentImage ? (
                      <View style={styles.imageWrapper}>
                        <Image
                          source={{ uri: currentImage }}
                          style={styles.productImage}
                          resizeMode="cover"
                          onError={() => console.log('Image failed to load')}
                        />
                        {hasMultipleImages && (
                          <>
                            <TouchableOpacity
                              style={styles.imageNavButtonLeft}
                              onPress={() => handleImageNavigation(order._id, 'prev', images.length)}
                            >
                              <ChevronLeftIcon size={12} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.imageNavButtonRight}
                              onPress={() => handleImageNavigation(order._id, 'next', images.length)}
                            >
                              <ChevronRightIcon size={12} color="#FFFFFF" />
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
                      <View style={styles.placeholderImage}>
                        <ImageIcon size={32} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                      </View>
                    )}
                  </View>

                  {/* Order Details */}
                  <View style={styles.orderDetails}>
                    <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
                      {order.product?.name || 'N/A'}
                    </Text>
                    <Text style={[styles.quantity, isDarkMode && styles.darkSubtitle]}>
                      {order.quantity} {order.measurementUnit}
                    </Text>
                    <Text style={styles.price}>
                      UGX {order.totalPrice?.toLocaleString() || 'N/A'}
                    </Text>
                  </View>
                  
                  {/* Business Info */}
                  <View style={styles.businessInfo}>
                    <Text style={[styles.businessText, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
                      {user.role === 'retailer' 
                        ? `By: ${order.wholesaler?.businessName || order.wholesaler?.firstName || 'N/A'}`
                        : `For: ${order.retailer?.businessName || order.retailer?.firstName || 'N/A'}`
                      }
                    </Text>
                    <Text style={[styles.dateText, isDarkMode && styles.darkSubtitle]}>
                      Date: {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                    {order.actualDeliveryDate && (
                      <Text style={[styles.dateText, isDarkMode && styles.darkSubtitle]}>
                        Delivered: {new Date(order.actualDeliveryDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {getActionButtons(order)}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
          >
            <Text style={[styles.paginationButtonText, isDarkMode && styles.darkText]}><Text style={[styles.paginationButtonText, isDarkMode && styles.darkText]}>Prev</Text></Text>
          </TouchableOpacity>
          
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
              <TouchableOpacity
                key={pageNum}
                onPress={() => setCurrentPage(pageNum)}
                style={[
                  styles.paginationButton,
                  currentPage === pageNum && styles.activePaginationButton
                ]}
              >
                <Text style={[
                  styles.paginationButtonText,
                  isDarkMode && styles.darkText,
                  currentPage === pageNum && styles.activePaginationButtonText
                ]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            );
          })}
          
          <TouchableOpacity
            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
          >
            <Text style={[styles.paginationButtonText, isDarkMode && styles.darkText]}><Text style={[styles.paginationButtonText, isDarkMode && styles.darkText]}>Next</Text></Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Modal */}
      {renderOrderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  filterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  darkFilterSelect: {
    backgroundColor: '#374151',
    borderColor: '#6B7280',
  },
  filterSelectText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  statusFilterDropdown: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    maxHeight: 200,
    width: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  darkStatusFilterDropdown: {
    backgroundColor: '#374151',
    borderColor: '#6B7280',
  },
  statusFilterList: {
    maxHeight: 200,
  },
  statusFilterItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  darkStatusFilterItem: {
    borderBottomColor: '#4B5563',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedStatusFilter: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  ordersContainer: {
    flex: 1,
  },
  ordersGrid: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  darkOrderCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
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
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  certificationStatus: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  certifiedStatus: {
    backgroundColor: '#D1FAE5',
  },
  disputedStatus: {
    backgroundColor: '#FEE2E2',
  },
  certificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  certificationDate: {
    fontSize: 11,
    marginTop: 2,
  },
  disputeReason: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  imageContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNavButtonLeft: {
    position: 'absolute',
    left: 4,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
    borderRadius: 12,
  },
  imageNavButtonRight: {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
    borderRadius: 12,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  orderDetails: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  businessInfo: {
    marginBottom: 12,
  },
  businessText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  certifyButton: {
    backgroundColor: '#059669',
  },
  disputeButton: {
    backgroundColor: '#DC2626',
  },
  acceptButton: {
    backgroundColor: '#059669',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  processButton: {
    backgroundColor: '#3B82F6',
  },
  assignButton: {
    backgroundColor: '#7C3AED',
  },
  transitButton: {
    backgroundColor: '#EA580C',
  },
  deliverButton: {
    backgroundColor: '#059669',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  activePaginationButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  activePaginationButtonText: {
    color: '#FFFFFF',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkModalContainer: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeModalButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#374151',
  },
  darkInput: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  confirmModalButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // SVG Icon Styles
  searchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  searchLine: {
    width: 6,
    height: 1.5,
    position: 'absolute',
    bottom: -2,
    right: -2,
    transform: [{ rotate: '45deg' }],
  },
  chevron: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  chevronLeft: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 6,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  chevronRight: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  checkStem: {
    width: 8,
    height: 2,
    position: 'absolute',
    top: 9,
    left: 3,
    transform: [{ rotate: '45deg' }],
  },
  checkKick: {
    width: 4,
    height: 2,
    position: 'absolute',
    top: 7,
    left: 5,
    transform: [{ rotate: '-45deg' }],
  },
  closeLine: {
    width: 12,
    height: 1.5,
    position: 'absolute',
  },
  imageRect: {
    width: 28,
    height: 20,
    borderWidth: 1.5,
    position: 'absolute',
    top: 6,
  },
  imageLine1: {
    width: 8,
    height: 1.5,
    position: 'absolute',
    top: 12,
    left: 6,
    transform: [{ rotate: '45deg' }],
  },
  imageLine2: {
    width: 12,
    height: 1.5,
    position: 'absolute',
    top: 16,
    left: 10,
  },
  imageDot1: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    left: 8,
  },
  imageDot2: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default Orders;