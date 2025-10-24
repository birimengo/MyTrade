// components/TransporterComponents/Vehicles.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const Vehicles = ({ isDarkMode }) => {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = () => {
    // Mock data
    setVehicles([
      {
        id: '1',
        name: 'Delivery Van 1',
        type: 'Van',
        licensePlate: 'ABC-123',
        capacity: '1000 kg',
        status: 'active',
        lastService: '2024-01-10',
        nextService: '2024-02-10',
      },
      {
        id: '2',
        name: 'Truck 1',
        type: 'Truck',
        licensePlate: 'XYZ-789',
        capacity: '5000 kg',
        status: 'maintenance',
        lastService: '2024-01-05',
        nextService: '2024-02-05',
      },
      {
        id: '3',
        name: 'Delivery Van 2',
        type: 'Van',
        licensePlate: 'DEF-456',
        capacity: '1200 kg',
        status: 'active',
        lastService: '2024-01-12',
        nextService: '2024-02-12',
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'maintenance': return '#F59E0B';
      case 'inactive': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'Truck': return 'truck';
      case 'Van': return 'van';
      default: return 'car';
    }
  };

  const renderVehicleItem = ({ item }) => (
    <View style={[styles.vehicleCard, isDarkMode && styles.darkVehicleCard]}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <FontAwesome5 name={getVehicleIcon(item.type)} size={24} color="#3B82F6" />
          <View style={styles.vehicleDetails}>
            <Text style={[styles.vehicleName, isDarkMode && styles.darkText]}>
              {item.name}
            </Text>
            <Text style={[styles.vehicleType, isDarkMode && styles.darkSubtext]}>
              {item.type} • {item.licensePlate}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.vehicleSpecs}>
        <View style={styles.specItem}>
          <Ionicons name="cube" size={16} color="#6B7280" />
          <Text style={[styles.specText, isDarkMode && styles.darkSubtext]}>
            Capacity: {item.capacity}
          </Text>
        </View>
        <View style={styles.specItem}>
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text style={[styles.specText, isDarkMode && styles.darkSubtext]}>
            Next Service: {item.nextService}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
          <Text style={styles.actionButtonText}>Service History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Vehicle Fleet
        </Text>
        <TouchableOpacity style={[styles.addButton, isDarkMode && styles.darkAddButton]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        renderItem={renderVehicleItem}
        keyExtractor={item => item.id}
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
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  darkAddButton: {
    backgroundColor: '#059669',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    gap: 12,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  darkVehicleCard: {
    backgroundColor: '#1F2937',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  vehicleSpecs: {
    marginBottom: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  specText: {
    fontSize: 14,
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

export default Vehicles;