// components/TransporterComponents/Deliveries.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Deliveries = ({ isDarkMode }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = () => {
    // Mock data
    setDeliveries([
      {
        id: '1',
        orderId: 'ORD-001',
        from: 'Wholesaler A',
        to: 'Retailer X',
        status: 'in-progress',
        scheduledDate: '2024-01-15',
        items: 15,
        distance: '25 km',
      },
      {
        id: '2',
        orderId: 'ORD-002',
        from: 'Supplier B',
        to: 'Retailer Y',
        status: 'pending',
        scheduledDate: '2024-01-16',
        items: 8,
        distance: '40 km',
      },
      {
        id: '3',
        orderId: 'ORD-003',
        from: 'Wholesaler C',
        to: 'Retailer Z',
        status: 'completed',
        scheduledDate: '2024-01-14',
        items: 22,
        distance: '18 km',
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in-progress': return '#3B82F6';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'in-progress': return 'time';
      case 'pending': return 'hourglass';
      default: return 'alert-circle';
    }
  };

  const renderDeliveryItem = ({ item }) => (
    <TouchableOpacity style={[styles.deliveryCard, isDarkMode && styles.darkDeliveryCard]}>
      <View style={styles.deliveryHeader}>
        <Text style={[styles.orderId, isDarkMode && styles.darkText]}>
          {item.orderId}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status)} size={12} color="#FFFFFF" />
          <Text style={styles.statusText}>
            {item.status.replace('-', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.deliveryInfo}>
        <View style={styles.route}>
          <Ionicons name="location" size={16} color="#EF4444" />
          <Text style={[styles.location, isDarkMode && styles.darkSubtext]}>
            {item.from}
          </Text>
        </View>
        <View style={styles.route}>
          <Ionicons name="location" size={16} color="#10B981" />
          <Text style={[styles.location, isDarkMode && styles.darkSubtext]}>
            {item.to}
          </Text>
        </View>
      </View>

      <View style={styles.deliveryMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar" size={14} color="#6B7280" />
          <Text style={[styles.metaText, isDarkMode && styles.darkSubtext]}>
            {item.scheduledDate}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cube" size={14} color="#6B7280" />
          <Text style={[styles.metaText, isDarkMode && styles.darkSubtext]}>
            {item.items} items
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="navigate" size={14} color="#6B7280" />
          <Text style={[styles.metaText, isDarkMode && styles.darkSubtext]}>
            {item.distance}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Start Delivery</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Deliveries
        </Text>
        <TouchableOpacity style={[styles.addButton, isDarkMode && styles.darkAddButton]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>New Delivery</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  darkAddButton: {
    backgroundColor: '#2563EB',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    gap: 12,
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  darkDeliveryCard: {
    backgroundColor: '#1F2937',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  deliveryInfo: {
    marginBottom: 12,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
  },
  deliveryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default Deliveries;