// components/TransporterComponents/Schedule.js
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

const Schedule = ({ isDarkMode }) => {
  const [schedule, setSchedule] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = () => {
    // Mock data
    setSchedule([
      {
        id: '1',
        time: '08:00 AM',
        delivery: 'ORD-001',
        from: 'Wholesaler A',
        to: 'Retailer X',
        status: 'scheduled',
        priority: 'high',
      },
      {
        id: '2',
        time: '10:30 AM',
        delivery: 'ORD-002',
        from: 'Supplier B',
        to: 'Retailer Y',
        status: 'scheduled',
        priority: 'medium',
      },
      {
        id: '3',
        time: '02:15 PM',
        delivery: 'ORD-003',
        from: 'Wholesaler C',
        to: 'Retailer Z',
        status: 'scheduled',
        priority: 'low',
      },
    ]);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderScheduleItem = ({ item }) => (
    <View style={[styles.scheduleCard, isDarkMode && styles.darkScheduleCard]}>
      <View style={styles.timeSection}>
        <Text style={[styles.time, isDarkMode && styles.darkText]}>
          {item.time}
        </Text>
      </View>
      
      <View style={styles.deliveryInfo}>
        <View style={styles.deliveryHeader}>
          <Text style={[styles.deliveryId, isDarkMode && styles.darkText]}>
            {item.delivery}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.route}>
          <View style={styles.location}>
            <Ionicons name="location" size={12} color="#EF4444" />
            <Text style={[styles.locationText, isDarkMode && styles.darkSubtext]}>
              {item.from}
            </Text>
          </View>
          <View style={styles.location}>
            <Ionicons name="location" size={12} color="#10B981" />
            <Text style={[styles.locationText, isDarkMode && styles.darkSubtext]}>
              {item.to}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
          <Ionicons name="navigate" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Delivery Schedule
        </Text>
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateButton}>
            <Ionicons name="chevron-back" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={[styles.dateText, isDarkMode && styles.darkText]}>
            {selectedDate.toDateString()}
          </Text>
          <TouchableOpacity style={styles.dateButton}>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={schedule}
        renderItem={renderScheduleItem}
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    minWidth: 150,
    textAlign: 'center',
  },
  listContent: {
    gap: 12,
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  darkScheduleCard: {
    backgroundColor: '#1F2937',
  },
  timeSection: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
  },
  time: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  route: {
    gap: 4,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },
});

export default Schedule;