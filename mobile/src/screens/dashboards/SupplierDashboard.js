import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Updated import

const SupplierDashboard = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Supplier Dashboard</Text> {/* ✅ Fixed */}
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Products</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>85</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Orders</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>23</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Revenue</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>$8,720</Text>
        </View>
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Raw Materials</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Manage materials</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Production</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Track production</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>My Stock</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Inventory management</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navTitle}>Clients</Text> {/* ✅ Fixed */}
          <Text style={styles.navDescription}>Manage clients</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text> {/* ✅ Fixed */}
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>New production batch started</Text> {/* ✅ Fixed */}
          <Text style={styles.activityTime}>2 hours ago</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>Order from Wholesaler Co.</Text> {/* ✅ Fixed */}
          <Text style={styles.activityTime}>4 hours ago</Text>
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
  activityItem: {
    marginBottom: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
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

export default SupplierDashboard;