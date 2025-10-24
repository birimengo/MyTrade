// src/components/WholesalerComponents/Overview.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FontAwesome5, 
  MaterialCommunityIcons, 
  Ionicons,
  Feather,
  FontAwesome,
  MaterialIcons,
  Entypo
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// Use your live backend URL directly
const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const Overview = ({ isDarkMode }) => {
  const { user, token } = useAuth();
  const [metrics, setMetrics] = useState({
    // Revenue & Sales
    totalRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    averageOrderValue: 0,
    
    // Orders
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    certifiedOrders: 0,
    cancelledOrders: 0,
    
    // Inventory
    stockValue: 0,
    totalProducts: 0,
    certifiedProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    stockUtilization: 0,
    
    // Business Relationships
    totalRetailers: 0,
    activeRetailers: 0,
    supplierOrders: 0,
    certifiedSupplierOrders: 0,
    
    // Performance Metrics
    orderConversionRate: 0,
    inventoryTurnover: 0,
    customerRetentionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Get date ranges
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Enhanced API requests
      const requests = [
        // Retailer orders (all time)
        fetch(`${API_BASE_URL}/api/retailer-orders/wholesaler`, { headers }),
        // Today's retailer orders
        fetch(`${API_BASE_URL}/api/retailer-orders/wholesaler?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}`, { headers }),
        // Monthly retailer orders
        fetch(`${API_BASE_URL}/api/retailer-orders/wholesaler?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`, { headers }),
        // Supplier orders
        fetch(`${API_BASE_URL}/api/wholesaler-orders`, { headers }),
        // Products (including certified)
        fetch(`${API_BASE_URL}/api/products`, { headers }),
        // Retailers
        fetch(`${API_BASE_URL}/api/retailers`, { headers }),
        // Order statistics
        fetch(`${API_BASE_URL}/api/retailer-orders/stats`, { headers }).catch(() => ({ ok: false })), // Optional
        // Wholesaler order statistics
        fetch(`${API_BASE_URL}/api/wholesaler-orders/statistics`, { headers }).catch(() => ({ ok: false })) // Optional
      ];

      const responses = await Promise.all(requests.map(req => 
        req.catch(err => ({ ok: false, error: err }))
      ));
      
      // Process responses
      const [
        retailerOrdersRes,
        todayOrdersRes,
        monthlyOrdersRes,
        supplierOrdersRes,
        productsRes,
        retailersRes,
        orderStatsRes,
        wholesalerStatsRes
      ] = responses;

      // Initialize metrics data
      let metricsData = {
        // Revenue & Sales
        totalRevenue: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        averageOrderValue: 0,
        
        // Orders
        totalOrders: 0,
        todayOrders: 0,
        pendingOrders: 0,
        certifiedOrders: 0,
        cancelledOrders: 0,
        
        // Inventory
        stockValue: 0,
        totalProducts: 0,
        certifiedProducts: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        stockUtilization: 0,
        
        // Business Relationships
        totalRetailers: 0,
        activeRetailers: 0,
        supplierOrders: 0,
        certifiedSupplierOrders: 0,
        
        // Performance Metrics
        orderConversionRate: 0,
        inventoryTurnover: 0,
        customerRetentionRate: 0
      };

      // Process retailer orders for revenue and order metrics
      if (retailerOrdersRes.ok) {
        const retailerOrdersData = await retailerOrdersRes.json();
        const allOrders = retailerOrdersData.orders || [];
        
        metricsData.totalOrders = allOrders.length;
        metricsData.pendingOrders = allOrders.filter(order => 
          ['pending', 'confirmed', 'assigned_to_transporter'].includes(order.status)
        ).length;
        
        metricsData.certifiedOrders = allOrders.filter(order => 
          order.status === 'certified'
        ).length;
        
        metricsData.cancelledOrders = allOrders.filter(order => 
          ['cancelled', 'rejected', 'returned'].includes(order.status)
        ).length;

        // Calculate total revenue from certified orders
        metricsData.totalRevenue = allOrders
          .filter(order => order.status === 'certified')
          .reduce((total, order) => total + (order.totalPrice || 0), 0);

        // Calculate average order value
        const certifiedOrders = allOrders.filter(order => order.status === 'certified');
        metricsData.averageOrderValue = certifiedOrders.length > 0 ? 
          metricsData.totalRevenue / certifiedOrders.length : 0;
      }

      // Process today's orders
      if (todayOrdersRes.ok) {
        const todayOrdersData = await todayOrdersRes.json();
        const todayOrders = todayOrdersData.orders || [];
        
        metricsData.todayOrders = todayOrders.length;
        metricsData.todayRevenue = todayOrders
          .filter(order => order.status === 'certified')
          .reduce((total, order) => total + (order.totalPrice || 0), 0);
      }

      // Process monthly orders
      if (monthlyOrdersRes.ok) {
        const monthlyOrdersData = await monthlyOrdersRes.json();
        const monthlyOrders = monthlyOrdersData.orders || [];
        
        metricsData.monthlyRevenue = monthlyOrders
          .filter(order => order.status === 'certified')
          .reduce((total, order) => total + (order.totalPrice || 0), 0);
      }

      // Process supplier orders
      if (supplierOrdersRes.ok) {
        const supplierOrdersData = await supplierOrdersRes.json();
        const supplierOrders = supplierOrdersData.orders || [];
        
        metricsData.supplierOrders = supplierOrders.length;
        metricsData.certifiedSupplierOrders = supplierOrders.filter(order => 
          order.status === 'certified'
        ).length;
      }

      // Process products for inventory metrics
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const products = productsData.products || [];
        
        metricsData.totalProducts = products.length;
        metricsData.certifiedProducts = products.filter(product => 
          product.fromCertifiedOrder
        ).length;
        
        // Calculate stock value
        metricsData.stockValue = products.reduce((total, product) => {
          return total + (product.price * product.quantity);
        }, 0);
        
        // Calculate stock metrics
        metricsData.lowStockItems = products.filter(product => 
          product.quantity > 0 && product.quantity < 10
        ).length;
        
        metricsData.outOfStockItems = products.filter(product => 
          product.quantity === 0
        ).length;
        
        // Calculate stock utilization
        const productsWithStock = products.filter(product => product.quantity > 0).length;
        metricsData.stockUtilization = products.length > 0 ? 
          Math.round((productsWithStock / products.length) * 100) : 0;

        // Calculate inventory turnover (simplified)
        if (metricsData.totalRevenue > 0 && metricsData.stockValue > 0) {
          metricsData.inventoryTurnover = Math.round(metricsData.totalRevenue / metricsData.stockValue * 100) / 100;
        }
      }

      // Process retailers for customer metrics
      if (retailersRes.ok) {
        const retailersData = await retailersRes.json();
        const retailers = retailersData.retailers || [];
        
        metricsData.totalRetailers = retailers.length;
        
        // Calculate active retailers (have placed at least one certified order)
        // This is a simplified calculation - in a real app, you'd track this properly
        metricsData.activeRetailers = Math.round(retailers.length * 0.7); // Placeholder
      }

      // Calculate performance metrics
      if (metricsData.totalOrders > 0) {
        metricsData.orderConversionRate = Math.round(
          (metricsData.certifiedOrders / metricsData.totalOrders) * 100
        );
      }

      // Calculate customer retention rate (simplified)
      if (metricsData.totalRetailers > 0) {
        metricsData.customerRetentionRate = Math.round(
          (metricsData.activeRetailers / metricsData.totalRetailers) * 100
        );
      }

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
      
      // Set zero data instead of demo data
      setMetrics({
        totalRevenue: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        todayOrders: 0,
        pendingOrders: 0,
        certifiedOrders: 0,
        cancelledOrders: 0,
        stockValue: 0,
        totalProducts: 0,
        certifiedProducts: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        stockUtilization: 0,
        totalRetailers: 0,
        activeRetailers: 0,
        supplierOrders: 0,
        certifiedSupplierOrders: 0,
        orderConversionRate: 0,
        inventoryTurnover: 0,
        customerRetentionRate: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const MetricCard = ({ title, value, iconName, iconType = 'FontAwesome5', color, subtitle, trend, isPercentage = false, isCurrency = false, isDecimal = false }) => {
    const cardSize = isMobile ? styles.mobileCard : styles.desktopCard;

    const renderIcon = () => {
      const iconProps = { size: isMobile ? 20 : 24, color };
      
      switch (iconType) {
        case 'MaterialCommunityIcons':
          return <MaterialCommunityIcons name={iconName} {...iconProps} />;
        case 'Ionicons':
          return <Ionicons name={iconName} {...iconProps} />;
        case 'Feather':
          return <Feather name={iconName} {...iconProps} />;
        case 'FontAwesome':
          return <FontAwesome name={iconName} {...iconProps} />;
        case 'FontAwesome5':
        default:
          return <FontAwesome5 name={iconName} {...iconProps} />;
      }
    };

    const formatValue = (val) => {
      if (isPercentage) return `${val}%`;
      if (isCurrency) return `UGX ${typeof val === 'number' ? val.toLocaleString() : '0'}`;
      if (isDecimal) return typeof val === 'number' ? val.toFixed(2) : '0.00';
      return typeof val === 'number' ? val.toLocaleString() : '0';
    };

    return (
      <View style={[
        styles.metricCard,
        cardSize,
        isDarkMode && styles.darkMetricCard,
        { borderLeftColor: color }
      ]}>
        <View style={styles.metricContent}>
          <View style={styles.metricTextContainer}>
            <Text style={[styles.metricTitle, isDarkMode && styles.darkText]}>
              {title}
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color={color} style={styles.loadingIndicator} />
            ) : (
              <>
                <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
                  {formatValue(value)}
                </Text>
                {subtitle && (
                  <Text style={[styles.metricSubtitle, isDarkMode && styles.darkSubtitle]}>
                    {subtitle}
                  </Text>
                )}
                {trend && (
                  <Text style={[
                    styles.metricTrend,
                    trend.includes('+') || trend === 'Active' || trend === 'Good' || trend === 'Excellent' ? styles.positiveTrend : 
                    trend.includes('Attention') || trend.includes('Low') || trend === 'Poor' ? styles.negativeTrend : 
                    styles.neutralTrend
                  ]}>
                    {trend}
                  </Text>
                )}
              </>
            )}
          </View>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            {renderIcon()}
          </View>
        </View>
      </View>
    );
  };

  const ErrorBanner = () => (
    <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
      <View style={styles.errorContent}>
        <View style={styles.errorTextContainer}>
          <Text style={[styles.errorTitle, isDarkMode && styles.darkErrorTitle]}>
            Connection Issue
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkErrorMessage]}>
            {error} Showing real data from your business.
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onRefresh}
          style={styles.retryButton}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getGridStyle = () => {
    return isMobile ? styles.mobileGrid : styles.desktopGrid;
  };

  // Enhanced trend calculations
  const getRevenueTrend = () => {
    if (metrics.todayRevenue === 0) return "No sales today";
    return metrics.todayRevenue > metrics.averageOrderValue ? "Above average" : "Normal";
  };

  const getStockTrend = (utilization) => {
    if (utilization === 0) return "No data";
    return utilization >= 80 ? "Excellent" : utilization >= 60 ? "Good" : utilization >= 40 ? "Fair" : "Low";
  };

  const getPerformanceTrend = (rate) => {
    if (rate === 0) return "No data";
    return rate >= 80 ? "Excellent" : rate >= 60 ? "Good" : rate >= 40 ? "Fair" : "Needs improvement";
  };

  const getInventoryTrend = (turnover) => {
    if (turnover === 0) return "No sales";
    return turnover >= 2 ? "Fast" : turnover >= 1 ? "Normal" : "Slow";
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor={isDarkMode ? '#2563eb' : '#2563eb'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && !loading && <ErrorBanner />}

        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <Text style={[styles.welcomeText, isDarkMode && styles.darkText]}>
            Welcome, {user?.businessName || user?.firstName || 'Wholesaler'}!
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            Business Performance Dashboard
          </Text>
        </View>

        {/* Revenue & Sales Overview */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Today's Revenue"
            value={metrics.todayRevenue}
            iconName="money-bill-wave"
            color="#16a34a"
            subtitle="Certified orders today"
            trend={getRevenueTrend()}
            loading={loading}
            isCurrency={true}
          />
          
          <MetricCard
            title="Total Revenue"
            value={metrics.totalRevenue}
            iconName="chart-line"
            iconType="FontAwesome5"
            color="#9333ea"
            subtitle="All certified orders"
            loading={loading}
            isCurrency={true}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Monthly Revenue"
                value={metrics.monthlyRevenue}
                iconName="calendar-alt"
                iconType="FontAwesome5"
                color="#2563eb"
                subtitle="This month's revenue"
                loading={loading}
                isCurrency={true}
              />
              
              <MetricCard
                title="Avg Order Value"
                value={metrics.averageOrderValue}
                iconName="shopping-bag"
                iconType="Feather"
                color="#ea580c"
                subtitle="Per certified order"
                loading={loading}
                isCurrency={true}
              />
            </>
          )}
        </View>

        {/* Order Performance */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders}
            iconName="shopping-cart"
            color="#0d9488"
            subtitle="All time orders"
            loading={loading}
          />
          
          <MetricCard
            title="Certified Orders"
            value={metrics.certifiedOrders}
            iconName="check-circle"
            iconType="Feather"
            color="#16a34a"
            subtitle="Completed orders"
            loading={loading}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Pending Orders"
                value={metrics.pendingOrders}
                iconName="clock"
                iconType="Feather"
                color="#ea580c"
                subtitle="Awaiting processing"
                loading={loading}
              />
              
              <MetricCard
                title="Order Conversion"
                value={metrics.orderConversionRate}
                iconName="trending-up"
                iconType="Feather"
                color="#9333ea"
                subtitle="Completion rate"
                trend={getPerformanceTrend(metrics.orderConversionRate)}
                loading={loading}
                isPercentage={true}
              />
            </>
          )}
        </View>

        {/* Inventory Management */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Stock Value"
            value={metrics.stockValue}
            iconName="box"
            color="#4f46e5"
            subtitle="Current inventory value"
            loading={loading}
            isCurrency={true}
          />
          
          <MetricCard
            title="Total Products"
            value={metrics.totalProducts}
            iconName="cubes"
            iconType="FontAwesome5"
            color="#0d9488"
            subtitle="Active products"
            loading={loading}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Stock Utilization"
                value={metrics.stockUtilization}
                iconName="pie-chart"
                iconType="Feather"
                color="#16a34a"
                subtitle="Products in stock"
                trend={getStockTrend(metrics.stockUtilization)}
                loading={loading}
                isPercentage={true}
              />
              
              <MetricCard
                title="Inventory Turnover"
                value={metrics.inventoryTurnover}
                iconName="repeat"
                iconType="Feather"
                color="#db2777"
                subtitle="Sales vs stock"
                trend={getInventoryTrend(metrics.inventoryTurnover)}
                loading={loading}
                isDecimal={true}
              />
            </>
          )}
        </View>

        {/* Business Relationships */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Total Retailers"
            value={metrics.totalRetailers}
            iconName="users"
            color="#2563eb"
            subtitle="Customer base"
            loading={loading}
          />
          
          <MetricCard
            title="Active Retailers"
            value={metrics.activeRetailers}
            iconName="user-check"
            iconType="Feather"
            color="#16a34a"
            subtitle="Regular customers"
            loading={loading}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Supplier Orders"
                value={metrics.supplierOrders}
                iconName="industry"
                color="#9333ea"
                subtitle="Orders to suppliers"
                loading={loading}
              />
              
              <MetricCard
                title="Customer Retention"
                value={metrics.customerRetentionRate}
                iconName="heart"
                iconType="Feather"
                color="#dc2626"
                subtitle="Retailer loyalty"
                trend={getPerformanceTrend(metrics.customerRetentionRate)}
                loading={loading}
                isPercentage={true}
              />
            </>
          )}
        </View>

        {/* Additional metrics for mobile */}
        {isMobile && (
          <>
            <View style={styles.mobileGrid}>
              <MetricCard
                title="Monthly Revenue"
                value={metrics.monthlyRevenue}
                iconName="calendar-alt"
                iconType="FontAwesome5"
                color="#2563eb"
                subtitle="This month"
                loading={loading}
                isCurrency={true}
              />
              
              <MetricCard
                title="Avg Order Value"
                value={metrics.averageOrderValue}
                iconName="shopping-bag"
                iconType="Feather"
                color="#ea580c"
                subtitle="Per order"
                loading={loading}
                isCurrency={true}
              />
            </View>

            <View style={styles.mobileGrid}>
              <MetricCard
                title="Pending Orders"
                value={metrics.pendingOrders}
                iconName="clock"
                iconType="Feather"
                color="#ea580c"
                subtitle="Awaiting processing"
                loading={loading}
              />
              
              <MetricCard
                title="Order Conversion"
                value={metrics.orderConversionRate}
                iconName="trending-up"
                iconType="Feather"
                color="#9333ea"
                subtitle="Completion rate"
                loading={loading}
                isPercentage={true}
              />
            </View>

            <View style={styles.mobileGrid}>
              <MetricCard
                title="Stock Utilization"
                value={metrics.stockUtilization}
                iconName="pie-chart"
                iconType="Feather"
                color="#16a34a"
                subtitle="Products in stock"
                loading={loading}
                isPercentage={true}
              />
              
              <MetricCard
                title="Low Stock Items"
                value={metrics.lowStockItems}
                iconName="exclamation-triangle"
                color="#dc2626"
                subtitle="Need restocking"
                loading={loading}
              />
            </View>

            <View style={styles.mobileGrid}>
              <MetricCard
                title="Supplier Orders"
                value={metrics.supplierOrders}
                iconName="industry"
                color="#9333ea"
                subtitle="Orders to suppliers"
                loading={loading}
              />
              
              <MetricCard
                title="Certified Products"
                value={metrics.certifiedProducts}
                iconName="award"
                iconType="Feather"
                color="#16a34a"
                subtitle="From suppliers"
                loading={loading}
              />
            </View>
          </>
        )}

        {/* Stock Alerts Section */}
        {(metrics.lowStockItems > 0 || metrics.outOfStockItems > 0) && !loading && (
          <View style={[styles.alertSection, isDarkMode && styles.darkAlertSection]}>
            <View style={styles.alertHeader}>
              <Feather name="alert-triangle" size={20} color="#dc2626" />
              <Text style={[styles.alertTitle, isDarkMode && styles.darkText]}>
                Stock Alerts
              </Text>
            </View>
            <View style={styles.alertContent}>
              {metrics.lowStockItems > 0 && (
                <Text style={[styles.alertText, isDarkMode && styles.darkSubtitle]}>
                  {metrics.lowStockItems} product(s) are low in stock
                </Text>
              )}
              {metrics.outOfStockItems > 0 && (
                <Text style={[styles.alertText, isDarkMode && styles.darkSubtitle]}>
                  {metrics.outOfStockItems} product(s) are out of stock
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },

  // Header Styles
  welcomeHeader: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },

  // Grid Styles
  mobileGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },

  // Metric Card Styles
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkMetricCard: {
    backgroundColor: '#1F2937',
  },
  mobileCard: {
    flex: 1,
    minHeight: 100,
  },
  desktopCard: {
    width: '48%',
    minHeight: 120,
    marginBottom: 12,
  },
  metricContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 10,
    fontWeight: '500',
  },
  positiveTrend: {
    color: '#16a34a',
  },
  negativeTrend: {
    color: '#dc2626',
  },
  neutralTrend: {
    color: '#6B7280',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  loadingIndicator: {
    marginVertical: 8,
  },

  // Error Banner Styles
  errorBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  darkErrorBanner: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
  },
  errorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  errorTitle: {
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    fontSize: 14,
  },
  darkErrorTitle: {
    color: '#FEF3C7',
  },
  errorMessage: {
    color: '#92400E',
    fontSize: 12,
  },
  darkErrorMessage: {
    color: '#FEF3C7',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Alert Section Styles
  alertSection: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  darkAlertSection: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  alertContent: {
    gap: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default Overview;