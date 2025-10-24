import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Dimensions,
  FlatList
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const Orders = ({ isDarkMode }) => {
  const { user, getAuthToken, API_BASE_URL } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'processing', label: 'Processing' },
    { value: 'assigned_to_transporter', label: 'Assigned' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'certified', label: 'Certified' },
    { value: 'return_to_wholesaler', label: 'Return' },
    { value: 'cancelled_by_wholesaler', label: 'Cancelled' }
  ];

  useEffect(() => {
    fetchWholesalerOrders();
  }, [filterStatus]);

  const fetchWholesalerOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setError('Please log in to view orders');
        setLoading(false);
        return;
      }

      const url = filterStatus === 'all' 
        ? `${API_BASE_URL}/api/retailer-orders/wholesaler`
        : `${API_BASE_URL}/api/retailer-orders/wholesaler?status=${filterStatus}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

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
      setRefreshing(false);
    }
  };

  const fetchTransporters = async () => {
    try {
      setLoadingTransporters(true);
      setTransporterError(null);
      
      const token = await getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/transporters/active`, {
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
      if (actionType === 'assigned_to_transporter' && 
          (selectedOrder.status === 'pending' || selectedOrder.status === 'accepted')) {
        
        let requiredAction = '';
        let message = '';
        
        if (selectedOrder.status === 'pending') {
          requiredAction = 'accepted';
          message = 'You need to accept this order first before assigning it to a transporter.';
        } else if (selectedOrder.status === 'accepted') {
          requiredAction = 'processing';
          message = 'You need to start processing this order before assigning it to a transporter.';
        }
        
        setError(message);
        setShowModal(false);
        
        setTimeout(() => {
          openActionModal(selectedOrder, requiredAction);
        }, 1500);
        
        return;
      }

      const token = await getAuthToken();
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

      let endpoint = `${API_BASE_URL}/api/retailer-orders/${selectedOrder._id}/status`;
      
      if (actionType === 'return_accepted' || actionType === 'return_rejected') {
        endpoint = `${API_BASE_URL}/api/retailer-orders/${selectedOrder._id}/handle-return`;
        updateData = {
          action: actionType === 'return_accepted' ? 'accept' : 'reject',
          rejectionReason: returnRejectionReason
        };
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update order: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (data.success) {
        let message = 'Order updated successfully';
        if (actionType === 'accepted') message = 'Order accepted! You can now start processing it.';
        else if (actionType === 'processing') message = 'Order processing started! You can now assign it to a transporter.';
        else if (actionType === 'assigned_to_transporter') message = 'Order assigned to transporter successfully!';
        else if (actionType === 'return_accepted') message = 'Return request accepted! Payment has been refunded.';
        else if (actionType === 'return_rejected') message = 'Return request rejected.';
        
        setSuccessMessage(message);
        setError(null);
        
        fetchWholesalerOrders();
        setShowModal(false);
        resetModalState();
        
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        throw new Error(data.message || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      if (!error.message.includes('Invalid status transition')) {
        setError(error.message);
      }
    }
  };

  const resetModalState = () => {
    setSelectedOrder(null);
    setActionType('');
    setTransporterId('');
    setCancellationReason('');
    setReturnRejectionReason('');
    setAssignmentType('specific');
  };

  const openActionModal = (order, action) => {
    setSelectedOrder(order);
    setActionType(action);
    setShowModal(true);
    setAssignmentType('specific');
    setTransporterId('');
    setCancellationReason('');
    setReturnRejectionReason('');
    
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

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: '#FEF3C7', text: '#92400E', darkBg: '#78350F', darkText: '#FCD34D' },
      accepted: { bg: '#DBEAFE', text: '#1E40AF', darkBg: '#1E3A8A', darkText: '#93C5FD' },
      processing: { bg: '#E0E7FF', text: '#3730A3', darkBg: '#312E81', darkText: '#A5B4FC' },
      assigned_to_transporter: { bg: '#EDE9FE', text: '#5B21B6', darkBg: '#4C1D95', darkText: '#C4B5FD' },
      in_transit: { bg: '#FFEDD5', text: '#9A3412', darkBg: '#7C2D12', darkText: '#FDBA74' },
      delivered: { bg: '#D1FAE5', text: '#065F46', darkBg: '#064E3B', darkText: '#A7F3D0' },
      certified: { bg: '#10B981', text: '#FFFFFF', darkBg: '#047857', darkText: '#FFFFFF' },
      return_to_wholesaler: { bg: '#FEF3C7', text: '#92400E', darkBg: '#78350F', darkText: '#FCD34D' },
      cancelled_by_wholesaler: { bg: '#FEE2E2', text: '#DC2626', darkBg: '#7F1D1D', darkText: '#FCA5A5' }
    };
    return colors[status] || { bg: '#F3F4F6', text: '#374151', darkBg: '#4B5563', darkText: '#D1D5DB' };
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'clock',
      accepted: 'check-circle',
      processing: 'package',
      assigned_to_transporter: 'truck',
      in_transit: 'shipping-bag',
      delivered: 'check-square',
      certified: 'award',
      return_to_wholesaler: 'refresh-ccw',
      cancelled_by_wholesaler: 'x-circle'
    };
    return icons[status] || 'file-text';
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
        if (order.assignmentExpiry) {
          const expiryTime = new Date(order.assignmentExpiry).getTime();
          if (expiryTime < Date.now()) {
            actions.push('assigned_to_transporter');
          }
        }
        break;
      case 'return_to_wholesaler':
        actions.push('return_accepted', 'return_rejected');
        break;
      default:
        break;
    }
    
    return actions;
  };

  const getActionButtonStyle = (action) => {
    switch (action) {
      case 'accepted': 
      case 'return_accepted': return { backgroundColor: '#10B981' };
      case 'rejected':
      case 'cancelled_by_wholesaler': 
      case 'return_rejected': return { backgroundColor: '#EF4444' };
      case 'processing': return { backgroundColor: '#8B5CF6' };
      case 'assigned_to_transporter': return { backgroundColor: '#4F46E5' };
      default: return { backgroundColor: '#6B7280' };
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'accepted': return 'Accept';
      case 'rejected': return 'Reject';
      case 'processing': return 'Process';
      case 'assigned_to_transporter': return 'Assign';
      case 'cancelled_by_wholesaler': return 'Cancel';
      case 'return_accepted': return 'Accept Return';
      case 'return_rejected': return 'Reject Return';
      default: return action;
    }
  };

  const OrderCard = ({ order }) => {
    const images = order.product?.images || [];
    const currentImageIndex = activeImageIndexes[order._id] || 0;
    const currentImage = images[currentImageIndex]?.url;
    const hasMultipleImages = images.length > 1;
    const statusColors = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);
    const allowedActions = getAllowedActions(order);

    return (
      <View style={[styles.orderCard, isDarkMode && styles.darkOrderCard]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, isDarkMode && styles.darkText]}>
              #{order._id.slice(-6).toUpperCase()}
            </Text>
            <Text style={[styles.retailerName, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
              {order.retailer?.businessName || `${order.retailer?.firstName} ${order.retailer?.lastName}`}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isDarkMode ? statusColors.darkBg : statusColors.bg }
          ]}>
            <Feather name={statusIcon} size={10} color={isDarkMode ? statusColors.darkText : statusColors.text} />
            <Text style={[
              styles.statusText,
              { color: isDarkMode ? statusColors.darkText : statusColors.text }
            ]}>
              {order.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productSection}>
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
                      style={styles.navButton}
                      onPress={() => handleImageNavigation(order._id, 'prev', images.length)}
                    >
                      <Feather name="chevron-left" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.navButton, styles.navButtonRight]}
                      onPress={() => handleImageNavigation(order._id, 'next', images.length)}
                    >
                      <Feather name="chevron-right" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.imageIndicator}>
                      <Text style={styles.imageCounter}>
                        {currentImageIndex + 1}/{images.length}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
                <Feather name="package" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </View>
            )}
          </View>

          <View style={styles.productDetails}>
            <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={2}>
              {order.product?.name}
            </Text>
            <Text style={[styles.quantity, isDarkMode && styles.darkSubtext]}>
              {order.quantity} {order.measurementUnit}
            </Text>
            <Text style={[styles.price, isDarkMode && styles.darkText]}>
              UGX {order.totalPrice?.toLocaleString()}
            </Text>
            <Text style={[styles.location, isDarkMode && styles.darkSubtext]}>
              {order.deliveryPlace}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {allowedActions.length > 0 && (
          <View style={styles.actionButtons}>
            {allowedActions.includes('accepted') && (
              <TouchableOpacity
                style={[styles.actionButton, getActionButtonStyle('accepted')]}
                onPress={() => openActionModal(order, 'accepted')}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.secondaryActions}>
              {allowedActions.filter(action => action !== 'accepted').map(action => (
                <TouchableOpacity
                  key={action}
                  style={[styles.actionButton, styles.smallButton, getActionButtonStyle(action)]}
                  onPress={() => openActionModal(order, action)}
                >
                  <Text style={styles.actionButtonText}>{getActionText(action)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const ActionModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          resetModalState();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                {getActionText(actionType)}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowModal(false);
                  resetModalState();
                }}
                style={styles.closeButton}
              >
                <Feather name="x" size={18} color={isDarkMode ? "#FFFFFF" : "#374151"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.orderReference, isDarkMode && styles.darkSubtext]}>
                Order #{selectedOrder._id.slice(-8).toUpperCase()}
              </Text>

              {actionType === 'assigned_to_transporter' && (
                <>
                  <Text style={[styles.modalLabel, isDarkMode && styles.darkText]}>
                    Assignment Type
                  </Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity 
                      style={styles.radioOption}
                      onPress={() => setAssignmentType('specific')}
                    >
                      <View style={[
                        styles.radioCircle,
                        assignmentType === 'specific' && styles.radioCircleSelected
                      ]} />
                      <Text style={[styles.radioLabel, isDarkMode && styles.darkText]}>
                        Specific Transporter
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.radioOption}
                      onPress={() => setAssignmentType('free')}
                    >
                      <View style={[
                        styles.radioCircle,
                        assignmentType === 'free' && styles.radioCircleSelected
                      ]} />
                      <Text style={[styles.radioLabel, isDarkMode && styles.darkText]}>
                        Free Assignment
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {assignmentType === 'specific' && (
                    <>
                      <Text style={[styles.modalLabel, isDarkMode && styles.darkText]}>
                        Select Transporter
                      </Text>
                      {loadingTransporters ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#3B82F6" />
                          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtext]}>
                            Loading transporters...
                          </Text>
                        </View>
                      ) : transporterError ? (
                        <View style={[styles.errorContainer, isDarkMode && styles.darkErrorContainer]}>
                          <Text style={[styles.errorText, isDarkMode && styles.darkErrorText]}>
                            Error loading transporters
                          </Text>
                        </View>
                      ) : transporters.length > 0 ? (
                        <ScrollView style={styles.transporterList}>
                          {transporters.map((transporter) => (
                            <TouchableOpacity
                              key={transporter._id}
                              style={[
                                styles.transporterOption,
                                transporterId === transporter._id && styles.transporterOptionSelected,
                                isDarkMode && styles.darkTransporterOption
                              ]}
                              onPress={() => setTransporterId(transporter._id)}
                            >
                              <Text style={[
                                styles.transporterName,
                                isDarkMode && styles.darkText,
                                transporterId === transporter._id && styles.transporterNameSelected
                              ]}>
                                {transporter.businessName || `${transporter.firstName} ${transporter.lastName}`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={[styles.warningContainer, isDarkMode && styles.darkWarningContainer]}>
                          <Text style={[styles.warningText, isDarkMode && styles.darkWarningText]}>
                            No active transporters available
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {assignmentType === 'free' && (
                    <View style={[styles.infoContainer, isDarkMode && styles.darkInfoContainer]}>
                      <Text style={[styles.infoText, isDarkMode && styles.darkInfoText]}>
                        Available for any transporter to accept
                      </Text>
                    </View>
                  )}
                </>
              )}

              {(actionType === 'rejected' || actionType === 'cancelled_by_wholesaler') && (
                <>
                  <Text style={[styles.modalLabel, isDarkMode && styles.darkText]}>
                    Reason
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    placeholder="Provide reason..."
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={cancellationReason}
                    onChangeText={setCancellationReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </>
              )}

              {(actionType === 'return_accepted' || actionType === 'return_rejected') && (
                <>
                  <Text style={[styles.modalLabel, isDarkMode && styles.darkText]}>
                    {actionType === 'return_rejected' ? 'Rejection Reason' : 'Notes'}
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    placeholder={actionType === 'return_rejected' ? 'Reason for rejection...' : 'Additional notes...'}
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={returnRejectionReason}
                    onChangeText={setReturnRejectionReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, isDarkMode && styles.darkCancelButton]}
                onPress={() => {
                  setShowModal(false);
                  resetModalState();
                }}
              >
                <Text style={[styles.cancelButtonText, isDarkMode && styles.darkCancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, getActionButtonStyle(actionType)]}
                onPress={handleOrderAction}
                disabled={
                  (actionType === 'assigned_to_transporter' && assignmentType === 'specific' && !transporterId) ||
                  ((actionType === 'rejected' || actionType === 'cancelled_by_wholesaler') && !cancellationReason) ||
                  (actionType === 'return_rejected' && !returnRejectionReason)
                }
              >
                <Text style={styles.modalButtonText}>
                  {getActionText(actionType)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWholesalerOrders();
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading orders...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Retailer Orders
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchWholesalerOrders}
        >
          <Feather name="refresh-cw" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
      >
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterChip,
              filterStatus === option.value && styles.activeFilterChip,
              isDarkMode && styles.darkFilterChip,
              filterStatus === option.value && isDarkMode && styles.darkActiveFilterChip
            ]}
            onPress={() => setFilterStatus(option.value)}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === option.value && styles.activeFilterChipText,
              isDarkMode && styles.darkFilterChipText,
              filterStatus === option.value && isDarkMode && styles.darkActiveFilterChipText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      {error && (
        <View style={[styles.messageBanner, styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text style={[styles.messageText, styles.errorText, isDarkMode && styles.darkErrorText]}>
            {error}
          </Text>
        </View>
      )}

      {successMessage && (
        <View style={[styles.messageBanner, styles.successBanner, isDarkMode && styles.darkSuccessBanner]}>
          <Feather name="check-circle" size={14} color="#059669" />
          <Text style={[styles.messageText, styles.successText, isDarkMode && styles.darkSuccessText]}>
            {successMessage}
          </Text>
        </View>
      )}

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderCard order={item} />}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor={isDarkMode ? '#3B82F6' : '#3B82F6'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={40} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
              No orders found
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.darkSubtext]}>
              {filterStatus !== 'all' ? 'Try changing the filter' : 'No orders from retailers yet'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <ActionModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 8,
  },

  // Alternative solution with even better vertical alignment:

// Filter
filterScroll: {
  marginBottom: 12,
  height: 36, // Slightly taller container
},
filterChip: {
  paddingHorizontal: 14,
  paddingVertical: 0, // Remove vertical padding
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  marginRight: 8,
  height: 32,
  justifyContent: 'center',
  alignItems: 'center',
},
darkFilterChip: {
  backgroundColor: '#1F2937',
  borderColor: '#374151',
},
activeFilterChip: {
  backgroundColor: '#3B82F6',
  borderColor: '#3B82F6',
},
darkActiveFilterChip: {
  backgroundColor: '#3B82F6',
  borderColor: '#3B82F6',
},
filterChipText: {
  fontSize: 12,
  fontWeight: '500',
  color: '#6B7280',
  lineHeight: 16, // Ensure proper line height
  textAlign: 'center',
  textAlignVertical: 'center',
},
darkFilterChipText: {
  color: '#D1D5DB',
},
activeFilterChipText: {
  color: '#FFFFFF',
},
darkActiveFilterChipText: {
  color: '#FFFFFF',
},
  // Messages
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
  },
  darkErrorBanner: {
    backgroundColor: '#7F1D1D',
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
  },
  darkSuccessBanner: {
    backgroundColor: '#064E3B',
  },
  messageText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
  },
  darkErrorText: {
    color: '#FCA5A5',
  },
  successText: {
    color: '#065F46',
  },
  darkSuccessText: {
    color: '#A7F3D0',
  },

  // List
  listContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  darkOrderCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
    marginRight: 8,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  retailerName: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Product Section
  productSection: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  imageContainer: {
    marginRight: 10,
  },
  imageWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -6 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 2,
    left: 4,
  },
  navButtonRight: {
    left: 'auto',
    right: 4,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '500',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkPlaceholderImage: {
    backgroundColor: '#374151',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  quantity: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 2,
  },
  location: {
    fontSize: 10,
    color: '#6B7280',
  },

  // Action Buttons
  actionButtons: {
    gap: 6,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallButton: {
    flex: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
  },
  darkModalContent: {
    backgroundColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 2,
  },
  modalBody: {
    padding: 16,
  },
  orderReference: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  // Radio Group
  radioGroup: {
    gap: 10,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  radioLabel: {
    fontSize: 13,
    color: '#374151',
  },

  // Loading
  loadingContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },

  // Error
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  darkErrorContainer: {
    backgroundColor: '#7F1D1D',
  },

  // Transporter List
  transporterList: {
    maxHeight: 120,
    marginBottom: 16,
  },
  transporterOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  darkTransporterOption: {
    backgroundColor: '#374151',
  },
  transporterOptionSelected: {
    backgroundColor: '#3B82F6',
  },
  transporterName: {
    fontSize: 13,
    color: '#374151',
  },
  transporterNameSelected: {
    color: '#FFFFFF',
  },

  // Warning
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  darkWarningContainer: {
    backgroundColor: '#78350F',
  },
  warningText: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
  },
  darkWarningText: {
    color: '#FCD34D',
  },

  // Info
  infoContainer: {
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  darkInfoContainer: {
    backgroundColor: '#1E3A8A',
  },
  infoText: {
    fontSize: 11,
    color: '#1E40AF',
    textAlign: 'center',
  },
  darkInfoText: {
    color: '#93C5FD',
  },

  // Text Input
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 16,
  },
  darkTextInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  darkCancelButtonText: {
    color: '#D1D5DB',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Text Styles
  darkText: {
    color: '#F9FAFB',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
});

export default Orders;