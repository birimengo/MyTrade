import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FontAwesome5, 
  Ionicons,
  Feather,
  MaterialIcons
} from '@expo/vector-icons';

const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const OrdersManagement = ({ navigation }) => {
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, production, ready, delivered

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/supplier/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || data.data || []);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Demo data
      setOrders([
        {
          _id: '1',
          orderNumber: 'ORD-001',
          client: {
            businessName: 'City Mart Supermarket',
            contactPerson: 'John Kamya'
          },
          products: [
            {
              product: { name: 'Wireless Headphones' },
              quantity: 50,
              unitPrice: 75000
            }
          ],
          totalAmount: 3750000,
          status: 'pending',
          orderDate: '2024-01-15',
          deliveryDate: '2024-01-20'
        },
        {
          _id: '2',
          orderNumber: 'ORD-002',
          client: {
            businessName: 'Quick Buy Stores', 
            contactPerson: 'Sarah Nakato'
          },
          products: [
            {
              product: { name: 'Smart Watch Series 5' },
              quantity: 25,
              unitPrice: 120000
            }
          ],
          totalAmount: 3000000,
          status: 'in_production',
          orderDate: '2024-01-14',
          deliveryDate: '2024-01-18'
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: '#EA580C', icon: 'clock' };
      case 'confirmed':
        return { label: 'Confirmed', color: '#2563EB', icon: 'check-circle' };
      case 'in_production':
        return { label: 'In Production', color: '#9333EA', icon: 'settings' };
      case 'ready_for_delivery':
        return { label: 'Ready for Delivery', color: '#16A34A', icon: 'package' };
      case 'assigned_to_transporter':
        return { label: 'Assigned to Transporter', color: '#0D9488', icon: 'truck' };
      case 'shipped':
        return { label: 'Shipped', color: '#7C3AED', icon: 'shipping-fast' };
      case 'delivered':
        return { label: 'Delivered', color: '#059669', icon: 'check-circle' };
      default:
        return { label: 'Pending', color: '#6B7280', icon: 'clock' };
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/supplier/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        Alert.alert('Success', 'Order status updated successfully');
        fetchOrders(); // Refresh orders
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const OrderCard = ({ order }) => {
    const statusInfo = getStatusInfo(order.status);
    const totalItems = order.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
      <TouchableOpacity 
        style={[styles.orderCard, isDarkMode && styles.darkOrderCard]}
        onPress={() => navigation.navigate('OrderDetails', { order })}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderNumber, isDarkMode && styles.darkText]}>
              {order.orderNumber}
            </Text>
            <Text style={[styles.clientName, isDarkMode && styles.darkSubtitle]}>
              {order.client?.businessName}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
            <Feather name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Order Date</Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {new Date(order.orderDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Delivery Date</Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {new Date(order.deliveryDate).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.productsInfo}>
            <Text style={[styles.productsLabel, isDarkMode && styles.darkSubtitle]}>
              Products: {totalItems} items
            </Text>
            <Text style={[styles.totalAmount, isDarkMode && styles.darkText]}>
              UGX {order.totalAmount?.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.orderActions}>
          {order.status === 'pending' && (
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={() => updateOrderStatus(order._id, 'confirmed')}
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm Order</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'confirmed' && (
            <TouchableOpacity 
              style={styles.productionButton}
              onPress={() => updateOrderStatus(order._id, 'in_production')}
            >
              <Feather name="settings" size={16} color="#FFFFFF" />
              <Text style={styles.productionButtonText}>Start Production</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'in_production' && (
            <TouchableOpacity 
              style={styles.readyButton}
              onPress={() => updateOrderStatus(order._id, 'ready_for_delivery')}
            >
              <Feather name="package" size={16} color="#FFFFFF" />
              <Text style={styles.readyButtonText}>Mark Ready</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Orders
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
          Manage customer orders
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterContainer}>
          {['all', 'pending', 'confirmed', 'in_production', 'ready_for_delivery', 'delivered'].map((status) => (
            <TouchableOpacity 
              key={status}
              style={[styles.filterTab, filter === status && styles.activeFilterTab]}
              onPress={() => setFilter(status)}
            >
              <Text style={[styles.filterText, filter === status && styles.activeFilterText]}>
                {getStatusInfo(status).label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading orders...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <OrderCard order={item} />}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={fetchOrders}
              colors={['#2563eb']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="package" size={48} color="#9CA3AF" />
              <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
                No orders found
              </Text>
            </View>
          }
        />
      )}
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  activeFilterTab: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkOrderCard: {
    backgroundColor: '#1F2937',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  productsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  orderActions: {
    marginTop: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  productionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  productionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  readyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default OrdersManagement;