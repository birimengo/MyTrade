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

// Metric Card Component
const MetricCard = ({ title, value, iconName, iconType = 'FontAwesome5', color, subtitle, trend, loading, isPercentage = false, isCurrency = false }) => {
  const { isDarkMode } = useDarkMode();
  
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
      case 'MaterialIcons':
        return <MaterialIcons name={iconName} {...iconProps} />;
      case 'Entypo':
        return <Entypo name={iconName} {...iconProps} />;
      case 'FontAwesome5':
      default:
        return <FontAwesome5 name={iconName} {...iconProps} />;
    }
  };

  const formatValue = (val) => {
    if (isPercentage) return `${val}%`;
    if (isCurrency) return `UGX ${val?.toLocaleString() || '0'}`;
    if (typeof val === 'number') return val.toLocaleString();
    return val || '0';
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
                  trend.includes('+') || trend === 'Active' || trend === 'Good' || trend === 'All good' || trend === 'Excellent' ? styles.positiveTrend : 
                  trend.includes('Attention') || trend.includes('Low') || trend === 'No profit' || trend === 'Critical' ? styles.negativeTrend : 
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

// Main Supplier Overview Component
const Overview = ({ navigation }) => {
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  
  const [metrics, setMetrics] = useState({
    // Revenue & Sales
    todayRevenue: 0,
    totalRevenue: 0,
    todayProfit: 0,
    totalProfit: 0,
    
    // Orders & Production
    totalOrders: 0,
    pendingOrders: 0,
    inProductionOrders: 0,
    readyForDeliveryOrders: 0,
    assignedToTransporter: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    
    // Inventory & Stock
    stockValue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    stockUtilization: 0,
    inStockCount: 0,
    
    // Business Relationships & Delivery Pipeline
    totalWholesalers: 0,
    deliveryPipeline: 0,
    completedDeliveries: 0,
    averageProfitMargin: 0,
    
    // Additional metrics
    todayOrders: 0,
    totalSalesValue: 0,
    todaySalesValue: 0
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

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch data from supplier-specific endpoints
      const requests = [
        // Supplier orders
        fetch(`${API_BASE_URL}/api/supplier/orders?limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        
        // Supplier products and stock
        fetch(`${API_BASE_URL}/api/supplier-products?limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        
        // Wholesalers (clients)
        fetch(`${API_BASE_URL}/api/wholesalers?limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        
        // Supplier sales
        fetch(`${API_BASE_URL}/api/supplier-sales?limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        
        // Today's orders
        fetch(`${API_BASE_URL}/api/supplier/orders?startDate=${startOfToday.toISOString()}&endDate=${endOfToday.toISOString()}&limit=1000`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ];

      const responses = await Promise.all(requests.map(req => 
        req.catch(err => ({ ok: false, error: err }))
      ));
      
      // Process responses
      const [
        ordersRes,
        productsRes,
        wholesalersRes,
        salesRes,
        todayOrdersRes
      ] = responses;

      let metricsData = {
        todayRevenue: 0,
        totalRevenue: 0,
        todayProfit: 0,
        totalProfit: 0,
        totalOrders: 0,
        pendingOrders: 0,
        inProductionOrders: 0,
        readyForDeliveryOrders: 0,
        assignedToTransporter: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        stockValue: 0,
        totalProducts: 0,
        lowStockItems: 0,
        stockUtilization: 0,
        inStockCount: 0,
        totalWholesalers: 0,
        deliveryPipeline: 0,
        completedDeliveries: 0,
        averageProfitMargin: 0,
        todayOrders: 0,
        totalSalesValue: 0,
        todaySalesValue: 0
      };

      // Process orders data
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const orders = ordersData.orders || ordersData.data || [];
        
        // Calculate order metrics
        metricsData.totalOrders = orders.length;
        metricsData.pendingOrders = orders.filter(order => 
          order.status === 'pending' || order.status === 'confirmed'
        ).length;
        metricsData.inProductionOrders = orders.filter(order => 
          order.status === 'in_production' || order.status === 'processing'
        ).length;
        metricsData.readyForDeliveryOrders = orders.filter(order => 
          order.status === 'ready_for_delivery' || order.status === 'ready_to_ship'
        ).length;
        metricsData.assignedToTransporter = orders.filter(order => 
          order.status === 'assigned_to_transporter'
        ).length;
        metricsData.shippedOrders = orders.filter(order => 
          order.status === 'shipped' || order.status === 'in_transit'
        ).length;
        metricsData.deliveredOrders = orders.filter(order => 
          order.status === 'delivered' || order.status === 'completed'
        ).length;
        
        // Calculate delivery pipeline
        metricsData.deliveryPipeline = metricsData.assignedToTransporter + metricsData.shippedOrders;
        metricsData.completedDeliveries = metricsData.deliveredOrders;
      }

      // Process today's orders
      if (todayOrdersRes.ok) {
        const todayOrdersData = await todayOrdersRes.json();
        const todayOrders = todayOrdersData.orders || todayOrdersData.data || [];
        metricsData.todayOrders = todayOrders.length;
      }

      // Process products data
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const products = productsData.products || productsData.data || [];
        
        metricsData.totalProducts = products.length;
        
        // Calculate stock value
        metricsData.stockValue = products.reduce((total, product) => {
          const quantity = product.quantity || product.stockQuantity || 0;
          const price = product.price || product.unitPrice || 0;
          return total + (quantity * price);
        }, 0);
        
        // Calculate low stock items (assuming low stock is less than 10)
        metricsData.lowStockItems = products.filter(product => {
          const quantity = product.quantity || product.stockQuantity || 0;
          return quantity < 10;
        }).length;
        
        // Calculate in stock count
        metricsData.inStockCount = products.filter(product => {
          const quantity = product.quantity || product.stockQuantity || 0;
          return quantity > 0;
        }).length;
        
        // Calculate stock utilization
        if (products.length > 0) {
          metricsData.stockUtilization = Math.round((metricsData.inStockCount / products.length) * 100);
        }
        
        // Calculate average profit margin (simplified)
        const totalMargin = products.reduce((total, product) => {
          const costPrice = product.costPrice || product.manufacturingCost || 0;
          const sellingPrice = product.price || product.unitPrice || 0;
          if (costPrice > 0 && sellingPrice > costPrice) {
            return total + ((sellingPrice - costPrice) / costPrice) * 100;
          }
          return total;
        }, 0);
        
        metricsData.averageProfitMargin = products.length > 0 ? Math.round(totalMargin / products.length) : 0;
      }

      // Process wholesalers data
      if (wholesalersRes.ok) {
        const wholesalersData = await wholesalersRes.json();
        const wholesalers = wholesalersData.wholesalers || wholesalersData.data || [];
        metricsData.totalWholesalers = wholesalers.length;
      }

      // Process sales data
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        const sales = salesData.sales || salesData.data || [];
        
        // Calculate revenue and profit
        let todayRevenue = 0;
        let totalRevenue = 0;
        let todayProfit = 0;
        let totalProfit = 0;
        let todaySalesValue = 0;
        let totalSalesValue = 0;

        sales.forEach(sale => {
          const saleDate = new Date(sale.saleDate || sale.createdAt);
          const isToday = saleDate >= startOfToday && saleDate < endOfToday;
          
          const quantity = sale.quantity || 0;
          const unitPrice = sale.unitPrice || sale.price || 0;
          const saleValue = quantity * unitPrice;
          const profit = sale.profit || (saleValue * 0.2); // Assume 20% profit if not provided
          
          if (isToday) {
            todayRevenue += saleValue;
            todayProfit += profit;
            todaySalesValue += saleValue;
          }
          
          totalRevenue += saleValue;
          totalProfit += profit;
          totalSalesValue += saleValue;
        });

        metricsData.todayRevenue = todayRevenue;
        metricsData.totalRevenue = totalRevenue;
        metricsData.todayProfit = todayProfit;
        metricsData.totalProfit = totalProfit;
        metricsData.todaySalesValue = todaySalesValue;
        metricsData.totalSalesValue = totalSalesValue;
      }

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching supplier metrics:', err);
      setError(`Backend connection failed: ${err.message}. Using demo data.`);
      
      // Set comprehensive demo data for supplier
      setMetrics({
        todayRevenue: 245000,
        totalRevenue: 1250000,
        todayProfit: 68000,
        totalProfit: 350000,
        totalOrders: 156,
        pendingOrders: 12,
        inProductionOrders: 8,
        readyForDeliveryOrders: 15,
        assignedToTransporter: 5,
        shippedOrders: 3,
        deliveredOrders: 125,
        stockValue: 750000,
        totalProducts: 45,
        lowStockItems: 5,
        stockUtilization: 78,
        inStockCount: 35,
        totalWholesalers: 23,
        deliveryPipeline: 8,
        completedDeliveries: 125,
        averageProfitMargin: 28,
        todayOrders: 8,
        totalSalesValue: 1250000,
        todaySalesValue: 245000
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

  const ErrorBanner = () => (
    <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
      <View style={styles.errorContent}>
        <View style={styles.errorTextContainer}>
          <Text style={[styles.errorTitle, isDarkMode && styles.darkErrorTitle]}>
            Connection Issue
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkErrorMessage]}>
            {error}
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

  // Calculate trends based on real data
  const getProfitTrend = (profit) => {
    if (profit === 0) return "No sales today";
    return profit > 0 ? "Active" : "No profit";
  };

  const getStockTrend = (utilization) => {
    if (utilization === 0) return "No data";
    return utilization >= 80 ? "Excellent" : utilization >= 60 ? "Good" : "Low";
  };

  const getLowStockTrend = (lowStockCount) => {
    if (lowStockCount === 0) return "All good";
    return lowStockCount > 5 ? "Critical" : lowStockCount > 0 ? "Attention needed" : "Good";
  };

  const getOrderTrend = (pendingOrders) => {
    if (pendingOrders === 0) return "All processed";
    return pendingOrders > 10 ? "High volume" : "Normal";
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
            Welcome, {user?.businessName || user?.firstName || 'Supplier'}!
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            Supplier Dashboard Overview
          </Text>
        </View>

        {/* Revenue & Sales Overview */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Today's Revenue"
            value={metrics.todayRevenue}
            iconName="money-bill-wave"
            color="#16a34a"
            subtitle="From completed sales"
            trend={getProfitTrend(metrics.todayProfit)}
            loading={loading}
            isCurrency={true}
          />
          
          <MetricCard
            title="Total Revenue"
            value={metrics.totalRevenue}
            iconName="trending-up"
            iconType="Feather"
            color="#9333ea"
            subtitle="All time sales"
            loading={loading}
            isCurrency={true}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Today's Profit"
                value={metrics.todayProfit}
                iconName="dollar-sign"
                iconType="Feather"
                color="#2563eb"
                subtitle="Profit today"
                loading={loading}
                isCurrency={true}
              />
              
              <MetricCard
                title="Total Profit"
                value={metrics.totalProfit}
                iconName="chart-line"
                iconType="FontAwesome5"
                color="#ea580c"
                subtitle="All time profit"
                loading={loading}
                isCurrency={true}
              />
            </>
          )}
        </View>

        {/* Mobile additional revenue metrics */}
        {isMobile && (
          <View style={styles.mobileGrid}>
            <MetricCard
              title="Today's Profit"
              value={metrics.todayProfit}
              iconName="dollar-sign"
              iconType="Feather"
              color="#2563eb"
              subtitle="Profit today"
              loading={loading}
              isCurrency={true}
            />
            
            <MetricCard
              title="Total Profit"
              value={metrics.totalProfit}
              iconName="chart-line"
              iconType="FontAwesome5"
              color="#ea580c"
              subtitle="All time profit"
              loading={loading}
              isCurrency={true}
            />
          </View>
        )}

        {/* Orders & Production */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders}
            iconName="clipboard-list"
            iconType="FontAwesome5"
            color="#0d9488"
            subtitle="All orders received"
            loading={loading}
          />
          
          <MetricCard
            title="Pending Orders"
            value={metrics.pendingOrders}
            iconName="clock"
            iconType="Feather"
            color="#4f46e5"
            subtitle="Awaiting processing"
            trend={getOrderTrend(metrics.pendingOrders)}
            loading={loading}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="In Production"
                value={metrics.inProductionOrders}
                iconName="industry"
                iconType="FontAwesome5"
                color="#16a34a"
                subtitle="Being manufactured"
                loading={loading}
              />
              
              <MetricCard
                title="Ready for Delivery"
                value={metrics.readyForDeliveryOrders}
                iconName="truck"
                iconType="FontAwesome5"
                color="#9333ea"
                subtitle="Ready to ship"
                loading={loading}
              />
            </>
          )}
        </View>

        {/* Mobile additional order metrics */}
        {isMobile && (
          <View style={styles.mobileGrid}>
            <MetricCard
              title="In Production"
              value={metrics.inProductionOrders}
              iconName="industry"
              iconType="FontAwesome5"
              color="#16a34a"
              subtitle="Being manufactured"
              loading={loading}
            />
            
            <MetricCard
              title="Ready for Delivery"
              value={metrics.readyForDeliveryOrders}
              iconName="truck"
              iconType="FontAwesome5"
              color="#9333ea"
              subtitle="Ready to ship"
              loading={loading}
            />
          </View>
        )}

        {/* Delivery Pipeline */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Delivery Pipeline"
            value={metrics.deliveryPipeline}
            iconName="road"
            iconType="FontAwesome5"
            color="#0d9488"
            subtitle="Orders in delivery process"
            loading={loading}
          />
          
          <MetricCard
            title="Completed Deliveries"
            value={metrics.completedDeliveries}
            iconName="check-circle"
            iconType="Feather"
            color="#16a34a"
            subtitle="Successfully delivered"
            loading={loading}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Shipped Orders"
                value={metrics.shippedOrders}
                iconName="shipping-fast"
                iconType="FontAwesome5"
                color="#2563eb"
                subtitle="In transit"
                loading={loading}
              />
              
              <MetricCard
                title="Today's Orders"
                value={metrics.todayOrders}
                iconName="calendar-day"
                iconType="FontAwesome5"
                color="#ea580c"
                subtitle="New orders today"
                loading={loading}
              />
            </>
          )}
        </View>

        {/* Mobile additional delivery metrics */}
        {isMobile && (
          <View style={styles.mobileGrid}>
            <MetricCard
              title="Shipped Orders"
              value={metrics.shippedOrders}
              iconName="shipping-fast"
              iconType="FontAwesome5"
              color="#2563eb"
              subtitle="In transit"
              loading={loading}
            />
            
            <MetricCard
              title="Today's Orders"
              value={metrics.todayOrders}
              iconName="calendar-day"
              iconType="FontAwesome5"
              color="#ea580c"
              subtitle="New orders today"
              loading={loading}
            />
          </View>
        )}

        {/* Inventory & Stock */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Stock Value"
            value={metrics.stockValue}
            iconName="warehouse"
            iconType="FontAwesome5"
            color="#0d9488"
            subtitle="Current inventory value"
            loading={loading}
            isCurrency={true}
          />
          
          <MetricCard
            title="Total Products"
            value={metrics.totalProducts}
            iconName="box"
            iconType="Feather"
            color="#4f46e5"
            subtitle="Active products"
            loading={loading}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Low Stock Items"
                value={metrics.lowStockItems}
                iconName="exclamation-triangle"
                iconType="FontAwesome5"
                color="#dc2626"
                subtitle="Need restocking"
                trend={getLowStockTrend(metrics.lowStockItems)}
                loading={loading}
              />
              
              <MetricCard
                title="Stock Utilization"
                value={metrics.stockUtilization}
                iconName="pie-chart"
                iconType="Feather"
                color="#16a34a"
                subtitle="Inventory efficiency"
                trend={getStockTrend(metrics.stockUtilization)}
                loading={loading}
                isPercentage={true}
              />
            </>
          )}
        </View>

        {/* Mobile additional inventory metrics */}
        {isMobile && (
          <View style={styles.mobileGrid}>
            <MetricCard
              title="Low Stock Items"
              value={metrics.lowStockItems}
              iconName="exclamation-triangle"
              iconType="FontAwesome5"
              color="#dc2626"
              subtitle="Need restocking"
              trend={getLowStockTrend(metrics.lowStockItems)}
              loading={loading}
            />
            
            <MetricCard
              title="Stock Utilization"
              value={metrics.stockUtilization}
              iconName="pie-chart"
              iconType="Feather"
              color="#16a34a"
              subtitle="Inventory efficiency"
              trend={getStockTrend(metrics.stockUtilization)}
              loading={loading}
              isPercentage={true}
            />
          </View>
        )}

        {/* Business Relationships */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Total Wholesalers"
            value={metrics.totalWholesalers}
            iconName="users"
            iconType="FontAwesome5"
            color="#db2777"
            subtitle="Active clients"
            loading={loading}
          />
          
          <MetricCard
            title="Avg Profit Margin"
            value={metrics.averageProfitMargin}
            iconName="percent"
            iconType="FontAwesome5"
            color="#16a34a"
            subtitle="Product profitability"
            loading={loading}
            isPercentage={true}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="In Stock Products"
                value={metrics.inStockCount}
                iconName="package"
                iconType="Feather"
                color="#0d9488"
                subtitle="Available for sale"
                loading={loading}
              />
              
              <MetricCard
                title="Today's Sales Value"
                value={metrics.todaySalesValue}
                iconName="shopping-bag"
                iconType="Feather"
                color="#9333ea"
                subtitle="Sales revenue today"
                loading={loading}
                isCurrency={true}
              />
            </>
          )}
        </View>

        {/* Mobile additional business metrics */}
        {isMobile && (
          <View style={styles.mobileGrid}>
            <MetricCard
              title="In Stock Products"
              value={metrics.inStockCount}
              iconName="package"
              iconType="Feather"
              color="#0d9488"
              subtitle="Available for sale"
              loading={loading}
            />
            
            <MetricCard
              title="Today's Sales Value"
              value={metrics.todaySalesValue}
              iconName="shopping-bag"
              iconType="Feather"
              color="#9333ea"
              subtitle="Sales revenue today"
              loading={loading}
              isCurrency={true}
            />
          </View>
        )}

        {/* Quick Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
              onPress={() => navigation.navigate('SupplierProducts')}
            >
              <MaterialIcons name="inventory" size={24} color="#2563eb" />
              <Text style={[styles.actionText, isDarkMode && styles.darkText]}>Manage Products</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
              onPress={() => navigation.navigate('SupplierOrders')}
            >
              <Feather name="clipboard" size={24} color="#16a34a" />
              <Text style={[styles.actionText, isDarkMode && styles.darkText]}>View Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
              onPress={() => navigation.navigate('SupplierSales')}
            >
              <FontAwesome5 name="chart-bar" size={24} color="#9333ea" />
              <Text style={[styles.actionText, isDarkMode && styles.darkText]}>Sales Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
              onPress={() => navigation.navigate('Wholesalers')}
            >
              <FontAwesome5 name="users" size={24} color="#ea580c" />
              <Text style={[styles.actionText, isDarkMode && styles.darkText]}>Manage Clients</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container Styles
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Actions Section
  actionsSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkActionButton: {
    backgroundColor: '#374151',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
});

export default Overview;