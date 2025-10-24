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

const ShipmentsTracking = ({ navigation }) => {
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, ready, assigned, shipped, delivered

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/supplier/orders?status=ready_for_delivery,assigned_to_transporter,shipped`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShipments(data.orders || data.data || []);
      } else {
        throw new Error('Failed to fetch shipments');
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      // Demo data
      setShipments([
        {
          _id: '1',
          orderNumber: 'ORD-001',
          client: {
            businessName: 'City Mart Supermarket',
            contactPerson: 'John Kamya',
            deliveryAddress: 'Shop 15, City Mall, Kampala Road'
          },
          products: [
            {
              product: { name: 'Wireless Headphones' },
              quantity: 50
            }
          ],
          totalAmount: 3750000,
          status: 'ready_for_delivery',
          orderDate: '2024-01-15',
          deliveryDate: '2024-01-20',
          deliveryCoordinates: {
            lat: 0.3476,
            lng: 32.5825
          }
        },
        {
          _id: '2',
          orderNumber: 'ORD-002',
          client: {
            businessName: 'Quick Buy Stores',
            contactPerson: 'Sarah Nakato', 
            deliveryAddress: 'Nakawa Market, Kampala'
          },
          products: [
            {
              product: { name: 'Smart Watch Series 5' },
              quantity: 25
            }
          ],
          totalAmount: 3000000,
          status: 'assigned_to_transporter',
          orderDate: '2024-01-14',
          deliveryDate: '2024-01-18',
          transporter: {
            name: 'Speedy Deliveries',
            contact: '+256712345679'
          },
          trackingNumber: 'TRK-789012'
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredShipments = shipments.filter(shipment => {
    if (filter === 'all') return true;
    return shipment.status === filter;
  });

  const getStatusInfo = (status) => {
    switch (status) {
      case 'ready_for_delivery':
        return { 
          label: 'Ready for Delivery', 
          color: '#EA580C', 
          icon: 'package',
          description: 'Order is ready and awaiting transporter assignment'
        };
      case 'assigned_to_transporter':
        return { 
          label: 'Assigned to Transporter', 
          color: '#2563EB', 
          icon: 'truck',
          description: 'Transporter has been assigned and will pick up soon'
        };
      case 'shipped':
        return { 
          label: 'In Transit', 
          color: '#9333EA', 
          icon: 'shipping-fast',
          description: 'Order is on the way to customer'
        };
      case 'delivered':
        return { 
          label: 'Delivered', 
          color: '#16A34A', 
          icon: 'check-circle',
          description: 'Order has been successfully delivered'
        };
      default:
        return { 
          label: 'Ready', 
          color: '#6B7280', 
          icon: 'package',
          description: 'Order is ready for next steps'
        };
    }
  };

  const assignTransporter = async (orderId) => {
    // In a real app, this would open a modal to select transporter
    Alert.alert(
      'Assign Transporter',
      'Choose a transporter for this delivery:',
      [
        { text: 'Speedy Deliveries', onPress: () => updateOrderStatus(orderId, 'assigned_to_transporter') },
        { text: 'Quick Ship UG', onPress: () => updateOrderStatus(orderId, 'assigned_to_transporter') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
        Alert.alert('Success', `Order status updated to ${getStatusInfo(newStatus).label}`);
        fetchShipments();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const markAsShipped = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/supplier/orders/${orderId}/ship`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          trackingNumber: `TRK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          shippedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Order marked as shipped with tracking number');
        fetchShipments();
      } else {
        throw new Error('Failed to mark order as shipped');
      }
    } catch (error) {
      console.error('Error marking as shipped:', error);
      Alert.alert('Error', 'Failed to mark order as shipped');
    }
  };

  const ShipmentCard = ({ shipment }) => {
    const statusInfo = getStatusInfo(shipment.status);
    const totalItems = shipment.products?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const isUrgent = new Date(shipment.deliveryDate) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    return (
      <View style={[styles.shipmentCard, isDarkMode && styles.darkShipmentCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.shipmentInfo}>
            <Text style={[styles.orderNumber, isDarkMode && styles.darkText]}>
              {shipment.orderNumber}
            </Text>
            <Text style={[styles.clientName, isDarkMode && styles.darkSubtitle]}>
              {shipment.client?.businessName}
            </Text>
          </View>
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
              <Feather name={statusInfo.icon} size={14} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Feather name="alert-triangle" size={12} color="#FFFFFF" />
                <Text style={styles.urgentText}>Urgent</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.shipmentDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Feather name="map-pin" size={14} color="#6B7280" />
              <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
                {shipment.client?.deliveryAddress || 'Address not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Feather name="calendar" size={14} color="#6B7280" />
              <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
                Due: {new Date(shipment.deliveryDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="package" size={14} color="#6B7280" />
              <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
                {totalItems} items
              </Text>
            </View>
          </View>

          {shipment.transporter && (
            <View style={styles.transporterInfo}>
              <Text style={[styles.transporterLabel, isDarkMode && styles.darkSubtitle]}>
                Transporter:
              </Text>
              <Text style={[styles.transporterName, isDarkMode && styles.darkText]}>
                {shipment.transporter.name} • {shipment.transporter.contact}
              </Text>
            </View>
          )}

          {shipment.trackingNumber && (
            <View style={styles.trackingInfo}>
              <Text style={[styles.trackingLabel, isDarkMode && styles.darkSubtitle]}>
                Tracking Number:
              </Text>
              <Text style={[styles.trackingNumber, isDarkMode && styles.darkText]}>
                {shipment.trackingNumber}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.shipmentActions}>
          {shipment.status === 'ready_for_delivery' && (
            <TouchableOpacity 
              style={styles.assignButton}
              onPress={() => assignTransporter(shipment._id)}
            >
              <Feather name="truck" size={16} color="#FFFFFF" />
              <Text style={styles.assignButtonText}>Assign Transporter</Text>
            </TouchableOpacity>
          )}

          {shipment.status === 'assigned_to_transporter' && (
            <TouchableOpacity 
              style={styles.shipButton}
              onPress={() => markAsShipped(shipment._id)}
            >
              <Feather name="shipping-fast" size={16} color="#FFFFFF" />
              <Text style={styles.shipButtonText}>Mark as Shipped</Text>
            </TouchableOpacity>
          )}

          {shipment.status === 'shipped' && (
            <TouchableOpacity 
              style={styles.deliverButton}
              onPress={() => updateOrderStatus(shipment._id, 'delivered')}
            >
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.deliverButtonText}>Mark as Delivered</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => navigation.navigate('OrderDetails', { order: shipment })}
          >
            <Feather name="eye" size={16} color="#2563EB" />
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Shipments Tracking
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
          Manage order deliveries and tracking
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterContainer}>
          {['all', 'ready_for_delivery', 'assigned_to_transporter', 'shipped', 'delivered'].map((status) => (
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

      {/* Shipments List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading shipments...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredShipments}
          renderItem={({ item }) => <ShipmentCard shipment={item} />}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={fetchShipments}
              colors={['#2563eb']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="truck" size={48} color="#9CA3AF" />
              <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
                No shipments found
              </Text>
              <Text style={[styles.emptySubtext, isDarkMode && styles.darkSubtitle]}>
                Orders ready for delivery will appear here
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
  shipmentCard: {
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
  darkShipmentCard: {
    backgroundColor: '#1F2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipmentInfo: {
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
  statusSection: {
    alignItems: 'flex-end',
    gap: 4,
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
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  shipmentDetails: {
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  transporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transporterLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  transporterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  shipmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  assignButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shipButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  shipButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deliverButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  deliverButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  detailsButtonText: {
    color: '#2563EB',
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
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default ShipmentsTracking;