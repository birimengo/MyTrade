// components/TransporterComponents/Routes.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const RoutesComponent = ({ isDarkMode }) => {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = () => {
    // Mock data
    setRoutes([
      {
        id: '1',
        name: 'City Center Route',
        stops: 5,
        distance: '45 km',
        estimatedTime: '2h 30m',
        status: 'active',
        completedToday: 3,
      },
      {
        id: '2',
        name: 'Suburban Route',
        stops: 8,
        distance: '65 km',
        estimatedTime: '3h 15m',
        status: 'active',
        completedToday: 5,
      },
      {
        id: '3',
        name: 'Industrial Zone',
        stops: 3,
        distance: '25 km',
        estimatedTime: '1h 45m',
        status: 'inactive',
        completedToday: 0,
      },
    ]);
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10B981' : '#6B7280';
  };

  const renderRouteItem = ({ item }) => (
    <TouchableOpacity style={[styles.routeCard, isDarkMode && styles.darkRouteCard]}>
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <MaterialIcons name="route" size={24} color="#3B82F6" />
          <View style={styles.routeDetails}>
            <Text style={[styles.routeName, isDarkMode && styles.darkText]}>
              {item.name}
            </Text>
            <View style={styles.routeStats}>
              <View style={styles.stat}>
                <Ionicons name="location" size={12} color="#6B7280" />
                <Text style={[styles.statText, isDarkMode && styles.darkSubtext]}>
                  {item.stops} stops
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="navigate" size={12} color="#6B7280" />
                <Text style={[styles.statText, isDarkMode && styles.darkSubtext]}>
                  {item.distance}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time" size={12} color="#6B7280" />
                <Text style={[styles.statText, isDarkMode && styles.darkSubtext]}>
                  {item.estimatedTime}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.routeFooter}>
        <Text style={[styles.completedText, isDarkMode && styles.darkSubtext]}>
          Completed today: {item.completedToday}
        </Text>
        <View style={styles.routeActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="play" size={16} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="pencil" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Delivery Routes
        </Text>
        <TouchableOpacity style={[styles.addButton, isDarkMode && styles.darkAddButton]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Plan Route</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={routes}
        renderItem={renderRouteItem}
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
  routeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  darkRouteCard: {
    backgroundColor: '#1F2937',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  routeDetails: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  routeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
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
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 14,
    color: '#6B7280',
  },
  routeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
});

export default RoutesComponent;