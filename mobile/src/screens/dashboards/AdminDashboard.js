import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Updated import

const AdminDashboard = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text> {/* ✅ Fixed */}
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Users</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>150</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Orders</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>45</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Revenue</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>$12,450</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text> {/* ✅ Fixed */}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Manage Users</Text> {/* ✅ Fixed */}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>View Reports</Text> {/* ✅ Fixed */}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>System Settings</Text> {/* ✅ Fixed */}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Analytics</Text> {/* ✅ Fixed */}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Overview</Text> {/* ✅ Fixed */}
        <View style={styles.systemInfo}>
          <Text style={styles.systemLabel}>Server Status:</Text> {/* ✅ Fixed */}
          <Text style={[styles.systemValue, { color: '#10B981' }]}>Online</Text> {/* ✅ Fixed */}
        </View>
        <View style={styles.systemInfo}>
          <Text style={styles.systemLabel}>Database:</Text> {/* ✅ Fixed */}
          <Text style={[styles.systemValue, { color: '#10B981' }]}>Connected</Text> {/* ✅ Fixed */}
        </View>
        <View style={styles.systemInfo}>
          <Text style={styles.systemLabel}>Last Backup:</Text> {/* ✅ Fixed */}
          <Text style={styles.systemValue}>2 hours ago</Text>
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
  actionButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
  },
  systemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  systemLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  systemValue: {
    fontSize: 14,
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

export default AdminDashboard;