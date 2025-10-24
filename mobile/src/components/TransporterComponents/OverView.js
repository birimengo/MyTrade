// components/TransporterComponents/OverView.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const OverView = ({ isDarkMode }) => {
  const [stats, setStats] = useState({
    activeDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    vehicles: 0,
  });

  useEffect(() => {
    // Mock data - replace with actual API call
    setStats({
      activeDeliveries: 5,
      completedDeliveries: 124,
      totalEarnings: 12500,
      vehicles: 3,
    });
  }, []);

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity 
      style={[
        styles.statCard,
        isDarkMode && styles.darkStatCard,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
          {value}
        </Text>
        <Text style={[styles.statTitle, isDarkMode && styles.darkSubtext]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Dashboard Overview
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
          Welcome back! Here's your delivery summary
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Active Deliveries"
          value={stats.activeDeliveries}
          icon="cube"
          color="#3B82F6"
        />
        <StatCard
          title="Completed Deliveries"
          value={stats.completedDeliveries}
          icon="checkmark-done"
          color="#10B981"
        />
        <StatCard
          title="Total Earnings"
          value={`$${stats.totalEarnings}`}
          icon="cash"
          color="#F59E0B"
        />
        <StatCard
          title="Vehicles"
          value={stats.vehicles}
          icon="car"
          color="#8B5CF6"
        />
      </View>

      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, isDarkMode && styles.darkActionCard]}>
            <FontAwesome5 name="route" size={20} color="#3B82F6" />
            <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
              Plan Route
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionCard, isDarkMode && styles.darkActionCard]}>
            <MaterialIcons name="add-box" size={20} color="#10B981" />
            <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
              New Delivery
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionCard, isDarkMode && styles.darkActionCard]}>
            <Ionicons name="document-text" size={20} color="#F59E0B" />
            <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
              View Reports
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
  statsGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: isMobile ? 1 : 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: isMobile ? '100%' : 150,
  },
  darkStatCard: {
    backgroundColor: '#1F2937',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  darkSection: {
    backgroundColor: '#1F2937',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkActionCard: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
});

export default OverView;