// src/components/SupplierComponents/Analytics.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert
} from 'react-native';
import { useDarkMode } from '../../context/DarkModeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AnalyticsTab = ({ apiCall }) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeframe, setTimeframe] = useState('month');
  const [error, setError] = useState(null);

  // Load analytics data from real APIs
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sales statistics
      const salesStatsResponse = await apiCall('/supplier-sales/statistics');
      const salesAnalyticsResponse = await apiCall('/supplier-sales/analytics/detailed');
      const orderStatsResponse = await apiCall('/supplier/orders/statistics');
      const performanceResponse = await apiCall('/supplier-sales/analytics/performance');

      if (salesStatsResponse.success && salesAnalyticsResponse.success) {
        const combinedData = {
          salesStatistics: salesStatsResponse.statistics,
          detailedAnalytics: salesAnalyticsResponse.analytics,
          orderStatistics: orderStatsResponse.statistics,
          performanceMetrics: performanceResponse.performance
        };
        setAnalyticsData(combinedData);
      } else {
        throw new Error('Failed to load analytics data');
      }
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  // Calculate growth percentage
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Get growth color and icon
  const getGrowthInfo = (growth) => {
    if (growth > 0) return { color: '#10B981', icon: 'trending-up', text: '+' + growth.toFixed(1) + '%' };
    if (growth < 0) return { color: '#EF4444', icon: 'trending-down', text: growth.toFixed(1) + '%' };
    return { color: '#6B7280', icon: 'minus', text: '0%' };
  };

  // Handle export report
  const handleExportReport = async () => {
    try {
      Alert.alert('Export Report', 'Exporting analytics report...');
      // In a real app, you would call the export API endpoint
      // const exportResponse = await apiCall('/supplier-sales/export/data');
      setTimeout(() => {
        Alert.alert('Success', 'Analytics report exported successfully!');
      }, 1500);
    } catch (error) {
      Alert.alert('Error', 'Failed to export report: ' + error.message);
    }
  };

  // Handle view details
  const handleViewDetails = () => {
    Alert.alert('Detailed View', 'Opening detailed analytics dashboard...');
    // In a real app, you would navigate to a detailed analytics screen
    // navigation.navigate('AnalyticsDetails');
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading Analytics...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, isDarkMode && styles.darkContainer]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MaterialCommunityIcons 
            name="chart-bar" 
            size={20} 
            color={isDarkMode ? "#10B981" : "#059669"} 
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Analytics
          </Text>
        </View>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
          Real-time business insights
        </Text>
        
        {/* Timeframe Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeframeContainer}>
          {['today', 'week', 'month', 'quarter', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timeframeButton,
                timeframe === period && styles.timeframeButtonActive,
                isDarkMode && timeframe === period && styles.darkTimeframeButtonActive
              ]}
              onPress={() => setTimeframe(period)}
            >
              <Text style={[
                styles.timeframeText,
                timeframe === period && styles.timeframeTextActive,
                isDarkMode && styles.darkTimeframeText
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorCard, isDarkMode && styles.darkErrorCard]}>
          <View style={styles.errorContent}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity onPress={loadAnalyticsData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Key Performance Metrics - Compact */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, isDarkMode && styles.darkCard]}>
          <View style={styles.metricHeader}>
            <MaterialCommunityIcons name="currency-usd" size={16} color="#10B981" />
            {analyticsData?.performanceMetrics?.growth?.sales && (
              <View style={styles.growthBadge}>
                <MaterialCommunityIcons 
                  name={getGrowthInfo(analyticsData.performanceMetrics.growth.sales).icon} 
                  size={10} 
                  color={getGrowthInfo(analyticsData.performanceMetrics.growth.sales).color} 
                />
                <Text style={[styles.growthText, { color: getGrowthInfo(analyticsData.performanceMetrics.growth.sales).color }]}>
                  {getGrowthInfo(analyticsData.performanceMetrics.growth.sales).text}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
            UGX {formatCurrency(analyticsData?.salesStatistics?.sales?.totalSales || 0)}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.darkSubtitle]}>
            Revenue
          </Text>
        </View>

        <View style={[styles.metricCard, isDarkMode && styles.darkCard]}>
          <View style={styles.metricHeader}>
            <MaterialCommunityIcons name="package" size={16} color="#3B82F6" />
            {analyticsData?.performanceMetrics?.growth?.orders && (
              <View style={styles.growthBadge}>
                <MaterialCommunityIcons 
                  name={getGrowthInfo(analyticsData.performanceMetrics.growth.orders).icon} 
                  size={10} 
                  color={getGrowthInfo(analyticsData.performanceMetrics.growth.orders).color} 
                />
                <Text style={[styles.growthText, { color: getGrowthInfo(analyticsData.performanceMetrics.growth.orders).color }]}>
                  {getGrowthInfo(analyticsData.performanceMetrics.growth.orders).text}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
            {analyticsData?.salesStatistics?.sales?.totalOrders || 0}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.darkSubtitle]}>
            Orders
          </Text>
        </View>

        <View style={[styles.metricCard, isDarkMode && styles.darkCard]}>
          <View style={styles.metricHeader}>
            <MaterialCommunityIcons name="trending-up" size={16} color="#F59E0B" />
            {analyticsData?.performanceMetrics?.growth?.profit && (
              <View style={styles.growthBadge}>
                <MaterialCommunityIcons 
                  name={getGrowthInfo(analyticsData.performanceMetrics.growth.profit).icon} 
                  size={10} 
                  color={getGrowthInfo(analyticsData.performanceMetrics.growth.profit).color} 
                />
                <Text style={[styles.growthText, { color: getGrowthInfo(analyticsData.performanceMetrics.growth.profit).color }]}>
                  {getGrowthInfo(analyticsData.performanceMetrics.growth.profit).text}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
            UGX {formatCurrency(analyticsData?.salesStatistics?.sales?.totalProfit || 0)}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.darkSubtitle]}>
            Profit
          </Text>
        </View>
      </View>

      {/* Additional Metrics - Compact */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, isDarkMode && styles.darkCard]}>
          <MaterialCommunityIcons name="shopping" size={14} color="#8B5CF6" />
          <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
            UGX {formatCurrency(analyticsData?.salesStatistics?.sales?.averageOrderValue || 0)}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.darkSubtitle]}>
            Avg Order
          </Text>
        </View>

        <View style={[styles.metricCard, isDarkMode && styles.darkCard]}>
          <MaterialCommunityIcons name="cube" size={14} color="#EC4899" />
          <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
            {analyticsData?.salesStatistics?.sales?.totalItemsSold || 0}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.darkSubtitle]}>
            Items Sold
          </Text>
        </View>

        <View style={[styles.metricCard, isDarkMode && styles.darkCard]}>
          <MaterialCommunityIcons name="percent" size={14} color="#06B6D4" />
          <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
            {analyticsData?.salesStatistics?.stock?.averageProfitMargin?.toFixed(1) || 0}%
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.darkSubtitle]}>
            Margin
          </Text>
        </View>
      </View>

      {/* Compact Stock Overview */}
      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Stock Overview
          </Text>
          <MaterialCommunityIcons name="package-variant" size={16} color={isDarkMode ? "#10B981" : "#059669"} />
        </View>
        <View style={styles.stockGrid}>
          <View style={styles.stockItem}>
            <Text style={[styles.stockNumber, isDarkMode && styles.darkText]}>
              {analyticsData?.salesStatistics?.stock?.totalProducts || 0}
            </Text>
            <Text style={[styles.stockLabel, isDarkMode && styles.darkSubtitle]}>Products</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={[styles.stockNumber, isDarkMode && styles.darkText]}>
              {analyticsData?.salesStatistics?.stock?.totalItemsInStock || 0}
            </Text>
            <Text style={[styles.stockLabel, isDarkMode && styles.darkSubtitle]}>In Stock</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={[styles.stockNumber, isDarkMode && styles.darkText]}>
              UGX {formatCurrency(analyticsData?.salesStatistics?.stock?.totalStockValue || 0)}
            </Text>
            <Text style={[styles.stockLabel, isDarkMode && styles.darkSubtitle]}>Value</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={[styles.stockNumber, { color: '#EF4444' }]}>
              {analyticsData?.salesStatistics?.stock?.outOfStockCount || 0}
            </Text>
            <Text style={[styles.stockLabel, isDarkMode && styles.darkSubtitle]}>Out of Stock</Text>
          </View>
        </View>
      </View>

      {/* Top Performing Products - Compact */}
      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Top Products
          </Text>
          <Text style={[styles.sectionSubtitle, isDarkMode && styles.darkSubtitle]}>
            By revenue
          </Text>
        </View>
        {analyticsData?.detailedAnalytics?.topProducts?.length > 0 ? (
          analyticsData.detailedAnalytics.topProducts.slice(0, 5).map((product, index) => (
            <View key={product._id || index} style={styles.productItem}>
              <View style={styles.productRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
                  {product.productName || product.product?.name || 'Unknown Product'}
                </Text>
                <View style={styles.productDetails}>
                  <Text style={[styles.productSales, isDarkMode && styles.darkSubtitle]}>
                    {product.totalQuantity || 0} sold
                  </Text>
                  <Text style={[styles.productRevenue, isDarkMode && styles.darkSubtitle]}>
                    UGX {formatCurrency(product.totalRevenue || 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={24} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
            <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
              No sales data
            </Text>
          </View>
        )}
      </View>

      {/* Order Status Overview - Compact */}
      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Order Status
          </Text>
          <Text style={[styles.sectionSubtitle, isDarkMode && styles.darkSubtitle]}>
            Production
          </Text>
        </View>
        <View style={styles.orderStatusGrid}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#3B82F6' }]} />
            <Text style={[styles.statusCount, isDarkMode && styles.darkText]}>
              {analyticsData?.orderStatistics?.overview?.pendingOrders || 0}
            </Text>
            <Text style={[styles.statusLabel, isDarkMode && styles.darkSubtitle]}>Pending</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.statusCount, isDarkMode && styles.darkText]}>
              {analyticsData?.orderStatistics?.overview?.inProgressOrders || 0}
            </Text>
            <Text style={[styles.statusLabel, isDarkMode && styles.darkSubtitle]}>In Progress</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.statusCount, isDarkMode && styles.darkText]}>
              {analyticsData?.orderStatistics?.overview?.completedOrders || 0}
            </Text>
            <Text style={[styles.statusLabel, isDarkMode && styles.darkSubtitle]}>Completed</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.statusCount, isDarkMode && styles.darkText]}>
              {analyticsData?.orderStatistics?.overview?.cancelledOrders || 0}
            </Text>
            <Text style={[styles.statusLabel, isDarkMode && styles.darkSubtitle]}>Cancelled</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
          onPress={handleExportReport}
        >
          <MaterialCommunityIcons name="download" size={16} color="#3B82F6" />
          <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
            Export Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
          onPress={handleViewDetails}
        >
          <MaterialCommunityIcons name="chart-box" size={16} color="#10B981" />
          <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
            View Details
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last Updated */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, isDarkMode && styles.darkSubtitle]}>
          Updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  timeframeContainer: {
    marginTop: 4,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  timeframeButtonActive: {
    backgroundColor: '#10B981',
  },
  darkTimeframeButtonActive: {
    backgroundColor: '#059669',
  },
  timeframeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  darkTimeframeText: {
    color: '#D1D5DB',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  darkErrorCard: {
    backgroundColor: '#451A1A',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
  },
  retryText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  growthText: {
    fontSize: 9,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
  },
  darkSection: {
    backgroundColor: '#1F2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  stockGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockItem: {
    alignItems: 'center',
    flex: 1,
  },
  stockNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productSales: {
    fontSize: 10,
    color: '#6B7280',
  },
  productRevenue: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  orderStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  statusCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  darkActionButton: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  footer: {
    alignItems: 'center',
    padding: 12,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
  },
});

export default AnalyticsTab;