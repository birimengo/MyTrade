import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Updated import

const WholesalerDashboard = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wholesaler Dashboard</Text> {/* ✅ Fixed */}
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Suppliers</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>8</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Products</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>156</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Revenue</Text> {/* ✅ Fixed */}
          <Text style={styles.statValue}>$15,320</Text>
        </View>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Wholesaler Features Coming Soon</Text> {/* ✅ Fixed */}
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
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
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

export default WholesalerDashboard;