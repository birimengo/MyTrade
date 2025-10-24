// components/TransporterComponents/Earnings.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const Earnings = ({ isDarkMode }) => {
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = () => {
    // Mock data
    setEarnings({
      today: 250,
      thisWeek: 1250,
      thisMonth: 5200,
      total: 28750,
    });

    setRecentTransactions([
      {
        id: '1',
        date: '2024-01-15',
        description: 'Delivery ORD-001',
        amount: 85,
        type: 'credit',
        status: 'completed',
      },
      {
        id: '2',
        date: '2024-01-15',
        description: 'Delivery ORD-002',
        amount: 120,
        type: 'credit',
        status: 'completed',
      },
      {
        id: '3',
        date: '2024-01-14',
        description: 'Vehicle Maintenance',
        amount: 45,
        type: 'debit',
        status: 'completed',
      },
    ]);
  };

  const StatCard = ({ title, value, change, period }) => (
    <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
      <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
        ${value}
      </Text>
      <Text style={[styles.statTitle, isDarkMode && styles.darkSubtext]}>
        {title}
      </Text>
      {change && (
        <View style={styles.changeContainer}>
          <Ionicons 
            name={change > 0 ? "trending-up" : "trending-down"} 
            size={16} 
            color={change > 0 ? "#10B981" : "#EF4444"} 
          />
          <Text style={[
            styles.changeText,
            { color: change > 0 ? "#10B981" : "#EF4444" }
          ]}>
            {change > 0 ? '+' : ''}{change}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderTransactionItem = (item) => (
    <View key={item.id} style={[styles.transactionCard, isDarkMode && styles.darkTransactionCard]}>
      <View style={styles.transactionInfo}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: item.type === 'credit' ? '#D1FAE5' : '#FEE2E2' }
        ]}>
          <Ionicons 
            name={item.type === 'credit' ? "arrow-down" : "arrow-up"} 
            size={16} 
            color={item.type === 'credit' ? '#059669' : '#DC2626'} 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionDesc, isDarkMode && styles.darkText]}>
            {item.description}
          </Text>
          <Text style={[styles.transactionDate, isDarkMode && styles.darkSubtext]}>
            {item.date}
          </Text>
        </View>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.amount,
          { color: item.type === 'credit' ? '#10B981' : '#EF4444' }
        ]}>
          {item.type === 'credit' ? '+' : '-'}${item.amount}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'completed' ? '#065F46' : '#92400E' }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          Earnings & Analytics
        </Text>
        <TouchableOpacity style={[styles.reportButton, isDarkMode && styles.darkReportButton]}>
          <Ionicons name="download" size={16} color="#FFFFFF" />
          <Text style={styles.reportButtonText}>Export Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Today's Earnings"
          value={earnings.today}
          change={12}
          period="today"
        />
        <StatCard
          title="This Week"
          value={earnings.thisWeek}
          change={8}
          period="week"
        />
        <StatCard
          title="This Month"
          value={earnings.thisMonth}
          change={15}
          period="month"
        />
        <StatCard
          title="Total Earnings"
          value={earnings.total}
          period="total"
        />
      </View>

      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          Recent Transactions
        </Text>
        <View style={styles.transactionsList}>
          {recentTransactions.map(renderTransactionItem)}
        </View>
        <TouchableOpacity style={[styles.viewAllButton, isDarkMode && styles.darkViewAllButton]}>
          <Text style={[styles.viewAllText, isDarkMode && styles.darkViewAllText]}>
            View All Transactions
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  darkReportButton: {
    backgroundColor: '#2563EB',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: isMobile ? 1 : 1,
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
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
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
  transactionsList: {
    gap: 12,
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  darkTransactionCard: {
    backgroundColor: '#374151',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  darkViewAllButton: {
    backgroundColor: '#374151',
  },
  viewAllText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  darkViewAllText: {
    color: '#60A5FA',
  },
});

export default Earnings;