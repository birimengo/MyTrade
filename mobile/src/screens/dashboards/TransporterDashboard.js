import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Updated import

const TransporterDashboard = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transporter Dashboard</Text> {/* ✅ Fixed */}
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Deliveries</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>12</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>KM</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>450</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Earnings</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>$1,250</Text>
        </View>
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.statusLabel}>Current Status:</Text> {/* ✅ Fixed */}
        <Text style={styles.statusText}>ACTIVE</Text> {/* ✅ Fixed */}
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Deliveries</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Manage deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Vehicles</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Vehicle management</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Routes</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Delivery routes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Earnings</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>View earnings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Deliveries</Text> {/* ✅ Fixed */}
        <View style={styles.deliveryItem}>
          <Text style={styles.deliveryText}>#ORD-001 - Kampala to Entebbe</Text> {/* ✅ Fixed */}
          <Text style={styles.deliveryStatus}>In Progress</Text> {/* ✅ Fixed */}
        </View>
        <View style={styles.deliveryItem}>
          <Text style={styles.deliveryText}>#ORD-002 - Jinja to Mbale</Text> {/* ✅ Fixed */}
          <Text style={styles.deliveryStatus}>Scheduled</Text> {/* ✅ Fixed */}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text> {/* ✅ Fixed */}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  navigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  navDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  deliveryStatus: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransporterDashboard;