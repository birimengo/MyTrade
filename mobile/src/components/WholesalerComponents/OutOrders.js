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
  RefreshControl,
  Modal,
  Dimensions,
  FlatList
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const OutOrders = ({ isDarkMode }) => {
  const { user, getAuthToken, API_BASE_URL } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_production', label: 'In Production' },
    { value: 'ready_for_delivery', label: 'Ready' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'certified', label: 'Certified' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'return_requested', label: 'Return Requested' }
  ];

  useEffect(() => {
    fetchOutgoingOrders();
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchQuery]);

  const fetchOutgoingOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAuthToken();
      
      if (!token) {
        setError('Please log in to view orders');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders`, {
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

  const filterOrders = () => {
    let filtered = orders;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber?.toLowerCase().includes(query) ||
        order.supplier?.businessName?.toLowerCase().includes(query) ||
        order.supplier?.firstName?.toLowerCase().includes(query) ||
        order.supplier?.lastName?.toLowerCase().includes(query) ||
        order.items.some(item => 
          item.product?.name?.toLowerCase().includes(query)
        )
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, newStatus, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: true }));
      
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders/${orderId}/status`, {
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
        throw new Error('Failed to update order status');
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        Alert.alert('Success', `Order status updated to ${newStatus.replace('_', ' ')}`);
        setShowOrderModal(false);
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const deleteOrder = async (orderId) => {
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
              setActionLoading(prev => ({ ...prev, [orderId]: true }));
              
              const token = await getAuthToken();
              const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders/${orderId}`, {
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
                setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
                Alert.alert('Success', 'Order deleted successfully');
                setShowOrderModal(false);
              } else {
                throw new Error(data.message || 'Failed to delete order');
              }
            } catch (error) {
              console.error('Error deleting order:', error);
              Alert.alert('Error', error.message);
            } finally {
              setActionLoading(prev => ({ ...prev, [orderId]: false }));
            }
          }
        }
      ]
    );
  };

  const canCancelOrder = (order) => {
    return ['pending', 'confirmed'].includes(order.status);
  };

  const canDeleteOrder = (order) => {
    return order.status === 'pending';
  };

  const canCertifyOrReturn = (order) => {
    return order.status === 'delivered';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: '#FEF3C7', text: '#92400E', darkBg: '#78350F', darkText: '#FCD34D' },
      confirmed: { bg: '#DBEAFE', text: '#1E40AF', darkBg: '#1E3A8A', darkText: '#93C5FD' },
      in_production: { bg: '#E0E7FF', text: '#3730A3', darkBg: '#312E81', darkText: '#A5B4FC' },
      ready_for_delivery: { bg: '#EDE9FE', text: '#5B21B6', darkBg: '#4C1D95', darkText: '#C4B5FD' },
      in_transit: { bg: '#FFEDD5', text: '#9A3412', darkBg: '#7C2D12', darkText: '#FDBA74' },
      delivered: { bg: '#D1FAE5', text: '#065F46', darkBg: '#064E3B', darkText: '#A7F3D0' },
      certified: { bg: '#10B981', text: '#FFFFFF', darkBg: '#047857', darkText: '#FFFFFF' },
      cancelled: { bg: '#FEE2E2', text: '#DC2626', darkBg: '#991B1B', darkText: '#FCA5A5' },
      return_requested: { bg: '#FEF3C7', text: '#92400E', darkBg: '#78350F', darkText: '#FCD34D' }
    };
    return colors[status] || { bg: '#F3F4F6', text: '#374151', darkBg: '#4B5563', darkText: '#D1D5DB' };
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'clock',
      confirmed: 'check-circle',
      in_production: 'package',
      ready_for_delivery: 'truck',
      in_transit: 'shipping-bag',
      delivered: 'check-square',
      certified: 'award',
      cancelled: 'x-circle',
      return_requested: 'refresh-ccw'
    };
    return icons[status] || 'file-text';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderItem = ({ item }) => (
    <View style={[styles.orderItem, isDarkMode && styles.darkOrderItem]}>
      <Image
        source={{ uri: item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=80&fit=crop' }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.itemDetails}>
        <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
          {item.product?.name || 'Product'}
        </Text>
        <Text style={[styles.productInfo, isDarkMode && styles.darkSubtext]}>
          {item.quantity} × ${item.unitPrice}
        </Text>
      </View>
      <Text style={[styles.itemTotal, isDarkMode && styles.darkText]}>
        ${item.totalPrice}
      </Text>
    </View>
  );

  const OrderCard = ({ order }) => {
    const statusColors = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);

    return (
      <TouchableOpacity 
        style={[styles.orderCard, isDarkMode && styles.darkOrderCard]}
        onPress={() => {
          setSelectedOrder(order);
          setShowOrderModal(true);
        }}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderNumber, isDarkMode && styles.darkText]}>
              #{order.orderNumber}
            </Text>
            <Text style={[styles.supplierName, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
              {order.supplier?.businessName || `${order.supplier?.firstName} ${order.supplier?.lastName}`}
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

        <View style={styles.itemsPreview}>
          {order.items.slice(0, 2).map((item, index) => (
            <OrderItem key={index} item={item} />
          ))}
          {order.items.length > 2 && (
            <Text style={[styles.moreItems, isDarkMode && styles.darkSubtext]}>
              +{order.items.length - 2} more items
            </Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={[styles.orderDate, isDarkMode && styles.darkSubtext]}>
            {formatDate(order.createdAt)}
          </Text>
          <Text style={[styles.orderTotal, isDarkMode && styles.darkText]}>
            ${order.totalAmount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const OrderModal = () => {
    if (!selectedOrder) return null;

    const isLoading = actionLoading[selectedOrder._id];
    const statusColors = getStatusColor(selectedOrder.status);
    const statusIcon = getStatusIcon(selectedOrder.status);

    return (
      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                  Order #{selectedOrder.orderNumber}
                </Text>
                <Text style={[styles.modalSubtitle, isDarkMode && styles.darkSubtext]}>
                  {formatDate(selectedOrder.createdAt)}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowOrderModal(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={20} color={isDarkMode ? "#FFFFFF" : "#374151"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status */}
              <View style={[
                styles.modalStatus,
                { backgroundColor: isDarkMode ? statusColors.darkBg : statusColors.bg }
              ]}>
                <Feather name={statusIcon} size={14} color={isDarkMode ? statusColors.darkText : statusColors.text} />
                <Text style={[
                  styles.modalStatusText,
                  { color: isDarkMode ? statusColors.darkText : statusColors.text }
                ]}>
                  {selectedOrder.status.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>

              {/* Supplier Info */}
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Supplier</Text>
                <Text style={[styles.sectionContent, isDarkMode && styles.darkText]}>
                  {selectedOrder.supplier?.businessName || 
                   `${selectedOrder.supplier?.firstName} ${selectedOrder.supplier?.lastName}`}
                </Text>
                <Text style={[styles.sectionSubtext, isDarkMode && styles.darkSubtext]}>
                  {selectedOrder.supplier?.email}
                </Text>
              </View>

              {/* Items */}
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Items</Text>
                {selectedOrder.items.map((item, index) => (
                  <OrderItem key={index} item={item} />
                ))}
              </View>

              {/* Shipping */}
              {selectedOrder.shippingAddress && (
                <View style={styles.infoSection}>
                  <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Shipping Address</Text>
                  <Text style={[styles.sectionContent, isDarkMode && styles.darkText]}>
                    {selectedOrder.shippingAddress.fullAddress || 
                     `${selectedOrder.shippingAddress.street}, ${selectedOrder.shippingAddress.city}`}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionSection}>
                {canCertifyOrReturn(selectedOrder) && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.certifyButton]}
                      onPress={() => updateOrderStatus(selectedOrder._id, 'certified')}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="award" size={14} color="#FFFFFF" />
                          <Text style={styles.buttonText}>Certify</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.returnButton]}
                      onPress={() => {
                        Alert.prompt(
                          'Return Order',
                          'Reason for return:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Submit',
                              onPress: (reason) => {
                                if (reason) updateOrderStatus(selectedOrder._id, 'return_requested', reason);
                              }
                            }
                          ]
                        );
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="refresh-ccw" size={14} color="#FFFFFF" />
                          <Text style={styles.buttonText}>Return</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {canCancelOrder(selectedOrder) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      Alert.prompt(
                        'Cancel Order',
                        'Reason for cancellation:',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Submit',
                            onPress: (reason) => {
                              if (reason) updateOrderStatus(selectedOrder._id, 'cancelled', reason);
                            }
                          }
                        ]
                      );
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="x-circle" size={14} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Cancel Order</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {canDeleteOrder(selectedOrder) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteOrder(selectedOrder._id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="trash-2" size={14} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Delete Order</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOutgoingOrders();
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

  if (error) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={32} color="#DC2626" />
          <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
            {error}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchOutgoingOrders}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
            Outgoing Orders
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchOutgoingOrders}
        >
          <Feather name="refresh-cw" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.filterSection}>
        <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
          <Feather name="search" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
            placeholder="Search orders..."
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          ) : null}
        </View>

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
                statusFilter === option.value && styles.activeFilterChip,
                isDarkMode && styles.darkFilterChip,
                statusFilter === option.value && isDarkMode && styles.darkActiveFilterChip
              ]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text style={[
                styles.filterChipText,
                statusFilter === option.value && styles.activeFilterChipText,
                isDarkMode && styles.darkFilterChipText,
                statusFilter === option.value && isDarkMode && styles.darkActiveFilterChipText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
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
            <Feather name="package" size={40} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
              No orders found
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.darkSubtext]}>
              {statusFilter !== 'all' ? `Try changing the filter` : 'Start placing orders with suppliers'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <OrderModal />
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

  // Filter Section
  filterSection: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkSearchContainer: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    marginLeft: 6,
    padding: 0,
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  filterScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
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
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  supplierName: {
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
  itemsPreview: {
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  orderTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Order Item
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  darkOrderItem: {
    // Dark mode styles if needed
  },
  productImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 8,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 1,
  },
  productInfo: {
    fontSize: 10,
    color: '#6B7280',
  },
  itemTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  moreItems: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
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

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
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
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  closeButton: {
    padding: 2,
  },
  modalBody: {
    padding: 16,
  },
  modalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
    gap: 4,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Modal Sections
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Action Buttons
  actionSection: {
    marginTop: 8,
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    flex: 1,
  },
  certifyButton: {
    backgroundColor: '#10B981',
  },
  returnButton: {
    backgroundColor: '#F59E0B',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  deleteButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Text Styles
  darkText: {
    color: '#F9FAFB',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
});

export default OutOrders;