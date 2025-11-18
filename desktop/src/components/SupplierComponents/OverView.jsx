// src/components/SupplierComponents/OverView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaChartLine, 
  FaDollarSign, 
  FaShoppingCart, 
  FaBox, 
  FaExclamationTriangle, 
  FaUsers,
  FaIndustry,
  FaShippingFast,
  FaSync,
  FaWarehouse,
  FaClipboardCheck,
  FaTachometerAlt
} from "react-icons/fa";

const OverviewContent = ({ metrics, loading, isElectron, isOnline, syncStatus, onSync }) => {
  const [localSyncStatus, setLocalSyncStatus] = useState('idle');

  const handleSyncClick = () => {
    if (typeof onSync === 'function') {
      setLocalSyncStatus('syncing');
      onSync();
      setTimeout(() => setLocalSyncStatus('idle'), 3000);
    }
  };

  const MetricCard = ({ title, value, change, icon, color, subtitle, onClick }) => (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
        onClick ? 'hover:border-blue-300 dark:hover:border-blue-600' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                change > 0 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const StatCard = ({ title, value, description, trend }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        {trend && (
          <span className={`text-xs font-medium ${
            trend === 'up' 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {trend === 'up' ? '↗' : '↘'}
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaTachometerAlt className="mr-3 text-blue-600 dark:text-blue-400" />
            Supplier Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time overview of your manufacturing and distribution operations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isElectron && (
            <div className="flex items-center space-x-2 text-sm">
              <div className={`flex items-center px-3 py-1 rounded-full ${
                isOnline 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isOnline ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                {isOnline ? 'Online' : 'Offline'}
              </div>
              
              <button
                onClick={handleSyncClick}
                disabled={!isOnline || localSyncStatus === 'syncing'}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {localSyncStatus === 'syncing' ? (
                  <FaSync className="animate-spin mr-2" />
                ) : (
                  <FaSync className="mr-2" />
                )}
                Sync Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Revenue"
          value={`$${(metrics.todayRevenue || 0).toLocaleString()}`}
          change={metrics.revenueChange}
          icon={<FaDollarSign className="text-2xl text-green-600 dark:text-green-400" />}
          color="text-green-600 dark:text-green-400"
          subtitle={`From ${metrics.todayOrders || 0} orders`}
        />

        <MetricCard
          title="Total Revenue"
          value={`$${(metrics.totalRevenue || 0).toLocaleString()}`}
          change={metrics.totalRevenueChange}
          icon={<FaChartLine className="text-2xl text-blue-600 dark:text-blue-400" />}
          color="text-blue-600 dark:text-blue-400"
          subtitle="Lifetime earnings"
        />

        <MetricCard
          title="Today's Profit"
          value={`$${(metrics.todayProfit || 0).toLocaleString()}`}
          change={metrics.profitChange}
          icon={<FaDollarSign className="text-2xl text-emerald-600 dark:text-emerald-400" />}
          color="text-emerald-600 dark:text-emerald-400"
          subtitle={`${metrics.averageProfitMargin || 0}% avg margin`}
        />

        <MetricCard
          title="Active Orders"
          value={metrics.totalOrders || 0}
          change={metrics.ordersChange}
          icon={<FaShoppingCart className="text-2xl text-purple-600 dark:text-purple-400" />}
          color="text-purple-600 dark:text-purple-400"
          subtitle="Across all stages"
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Production Pipeline"
          value={metrics.inProductionOrders || 0}
          icon={<FaIndustry className="text-2xl text-orange-600 dark:text-orange-400" />}
          color="text-orange-600 dark:text-orange-400"
          subtitle="In manufacturing"
        />

        <MetricCard
          title="Ready for Delivery"
          value={metrics.readyForDeliveryOrders || 0}
          icon={<FaShippingFast className="text-2xl text-cyan-600 dark:text-cyan-400" />}
          color="text-cyan-600 dark:text-cyan-400"
          subtitle="Pending shipment"
        />

        <MetricCard
          title="Pending Orders"
          value={metrics.pendingOrders || 0}
          icon={<FaClipboardCheck className="text-2xl text-yellow-600 dark:text-yellow-400" />}
          color="text-yellow-600 dark:text-yellow-400"
          subtitle="Awaiting processing"
        />
      </div>

      {/* Inventory & Client Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FaWarehouse className="mr-2 text-blue-600 dark:text-blue-400" />
              Inventory Overview
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">Real-time</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Stock Value"
              value={`$${(metrics.stockValue || 0).toLocaleString()}`}
              description="Total inventory worth"
              trend={metrics.stockValueTrend || 'up'}
            />
            <StatCard
              title="Total Products"
              value={metrics.totalProducts || 0}
              description="SKUs in stock"
              trend={metrics.productsTrend || 'up'}
            />
            <StatCard
              title="Low Stock Items"
              value={metrics.lowStockItems || 0}
              description="Need reordering"
              trend={metrics.lowStockTrend || 'down'}
            />
            <StatCard
              title="Stock Utilization"
              value={`${metrics.stockUtilization || 0}%`}
              description="Optimal stock levels"
              trend={metrics.utilizationTrend || 'up'}
            />
          </div>
        </div>

        {/* Client & Delivery Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FaUsers className="mr-2 text-green-600 dark:text-green-400" />
              Client & Delivery
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Active Wholesalers"
              value={metrics.totalWholesalers || 0}
              description="Business clients"
              trend={metrics.wholesalersTrend || 'up'}
            />
            <StatCard
              title="Delivery Pipeline"
              value={metrics.deliveryPipeline || 0}
              description="In transit"
              trend={metrics.deliveryTrend || 'up'}
            />
            <StatCard
              title="Completed Deliveries"
              value={metrics.completedDeliveries || 0}
              description="This month"
              trend={metrics.completedTrend || 'up'}
            />
            <StatCard
              title="Avg Profit Margin"
              value={`${metrics.averageProfitMargin || 0}%`}
              description="Per product"
              trend={metrics.marginTrend || 'up'}
            />
          </div>
        </div>
      </div>

      {isElectron && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h4>
          <div className="flex space-x-3">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'production' } }))}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FaIndustry className="mr-2" />
              View Production
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'orders' } }))}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FaShoppingCart className="mr-2" />
              Manage Orders
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'mystock' } }))}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <FaWarehouse className="mr-2" />
              Check Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Overview = (props) => {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAuthHeaders, isAuthenticated, API_BASE_URL } = useAuth(); // Use auth context

  // Helper function for API calls using AuthContext
  const makeApiCall = async (endpoint) => {
    try {
      console.log(`🔄 Making API call to: ${endpoint}`);
      
      const headers = getAuthHeaders();
      
      // Check if we have proper authentication headers
      if (!headers.Authorization || !headers.Authorization.startsWith('Bearer ')) {
        throw new Error('Authentication required - no valid token found');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: headers
      });

      console.log(`📡 API Response status for ${endpoint}:`, response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API call successful for ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  };

  const fetchMetrics = async () => {
    // Check authentication first
    if (!isAuthenticated || !user) {
      console.warn('User not authenticated, loading offline data');
      const offlineData = await loadOfflineMetrics();
      setMetrics(offlineData);
      setLoading(false);
      return;
    }

    // If we're offline and using Electron, try to load cached data
    if (!props.isOnline && props.isElectron) {
      const offlineData = await loadOfflineMetrics();
      setMetrics(offlineData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting to fetch supplier metrics...');
      
      // Use correct API endpoints based on your documentation
      const endpoints = [
        // Today's sales statistics
        '/api/supplier-sales/statistics?timeframe=today',
        // Overall sales statistics
        '/api/supplier-sales/statistics',
        // All orders with status breakdown
        '/api/supplier/orders',
        // Product stock and sales statistics
        '/api/supplier-products/sales/statistics',
        // Low stock products
        '/api/supplier-products/stock/low-stock',
        // Wholesalers list
        '/api/wholesalers'
      ];

      console.log('📡 Making API calls to endpoints:', endpoints);

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => makeApiCall(endpoint))
      );

      console.log('📊 API responses received:', responses);

      const [
        todaySalesRes,
        overallSalesRes,
        ordersRes,
        productsStatsRes,
        lowStockRes,
        wholesalersRes
      ] = responses;

      const metricsData = {
        todayRevenue: 0,
        totalRevenue: 0,
        todayProfit: 0,
        totalProfit: 0,
        totalOrders: 0,
        pendingOrders: 0,
        inProductionOrders: 0,
        readyForDeliveryOrders: 0,
        stockValue: 0,
        totalProducts: 0,
        lowStockItems: 0,
        stockUtilization: 0,
        totalWholesalers: 0,
        deliveryPipeline: 0,
        completedDeliveries: 0,
        averageProfitMargin: 0,
        todayOrders: 0
      };

      // Process today's sales
      if (todaySalesRes.status === 'fulfilled') {
        const todayData = todaySalesRes.value;
        console.log('💰 Today sales data:', todayData);
        
        metricsData.todayRevenue = todayData.revenue || todayData.totalSales || 0;
        metricsData.todayProfit = todayData.profit || todayData.netProfit || 0;
        metricsData.todayOrders = todayData.ordersCount || todayData.totalOrders || 0;
        
        if (props.isElectron) {
          cacheData('today_sales', todayData);
        }
      } else {
        console.error('❌ Failed to fetch today sales:', todaySalesRes.reason);
      }

      // Process overall sales
      if (overallSalesRes.status === 'fulfilled') {
        const overallData = overallSalesRes.value;
        console.log('📈 Overall sales data:', overallData);
        
        metricsData.totalRevenue = overallData.revenue || overallData.totalSales || 0;
        metricsData.totalProfit = overallData.profit || overallData.netProfit || 0;
        
        if (props.isElectron) {
          cacheData('overall_sales', overallData);
        }
      } else {
        console.error('❌ Failed to fetch overall sales:', overallSalesRes.reason);
      }

      // Process orders
      if (ordersRes.status === 'fulfilled') {
        const ordersData = ordersRes.value;
        console.log('📦 Orders data:', ordersData);
        
        const orders = ordersData.orders || ordersData.data || [];
        
        metricsData.totalOrders = orders.length;
        metricsData.pendingOrders = orders.filter(order => 
          order.status === 'pending' || order.status === 'confirmed'
        ).length;
        metricsData.inProductionOrders = orders.filter(order => 
          order.status === 'production' || order.status === 'manufacturing'
        ).length;
        metricsData.readyForDeliveryOrders = orders.filter(order => 
          order.status === 'ready_for_delivery' || order.status === 'ready_to_ship'
        ).length;
        metricsData.deliveryPipeline = orders.filter(order => 
          order.status === 'in_transit' || order.status === 'shipped'
        ).length;
        metricsData.completedDeliveries = orders.filter(order => 
          order.status === 'delivered' || order.status === 'completed'
        ).length;

        if (props.isElectron) {
          cacheData('orders', ordersData);
        }
      } else {
        console.error('❌ Failed to fetch orders:', ordersRes.reason);
      }

      // Process product statistics
      if (productsStatsRes.status === 'fulfilled') {
        const productsData = productsStatsRes.value;
        console.log('📊 Products stats data:', productsData);
        
        metricsData.stockValue = productsData.stockValue || productsData.totalInventoryValue || 0;
        metricsData.totalProducts = productsData.totalProducts || productsData.productCount || 0;
        metricsData.averageProfitMargin = productsData.averageProfitMargin || productsData.avgMargin || 0;
        metricsData.stockUtilization = productsData.stockUtilization || productsData.utilizationRate || 0;
        
        if (props.isElectron) {
          cacheData('products_stats', productsData);
        }
      } else {
        console.error('❌ Failed to fetch product statistics:', productsStatsRes.reason);
      }

      // Process low stock items
      if (lowStockRes.status === 'fulfilled') {
        const lowStockData = lowStockRes.value;
        console.log('⚠️ Low stock data:', lowStockData);
        
        const lowStockProducts = lowStockData.products || lowStockData.data || [];
        metricsData.lowStockItems = lowStockProducts.length;
        
        if (props.isElectron) {
          cacheData('low_stock', lowStockData);
        }
      } else {
        console.error('❌ Failed to fetch low stock:', lowStockRes.reason);
      }

      // Process wholesalers
      if (wholesalersRes.status === 'fulfilled') {
        const wholesalersData = wholesalersRes.value;
        console.log('👥 Wholesalers data:', wholesalersData);
        
        const wholesalers = wholesalersData.wholesalers || wholesalersData.data || [];
        metricsData.totalWholesalers = wholesalers.length;
        
        if (props.isElectron) {
          cacheData('wholesalers', wholesalersData);
        }
      } else {
        console.error('❌ Failed to fetch wholesalers:', wholesalersRes.reason);
      }

      console.log('✅ Final metrics data:', metricsData);

      // Calculate trends
      const previousData = await loadPreviousMetrics();
      const trends = calculateTrends(metricsData, previousData);
      const finalMetrics = { ...metricsData, ...trends };

      // Cache current data
      if (props.isElectron) {
        cacheData('current_metrics', finalMetrics);
      }

      setMetrics(finalMetrics);
      console.log('✅ Metrics successfully set');

    } catch (err) {
      console.error('❌ Error fetching supplier metrics:', err);
      setError(err.message);
      
      // Try to load cached data
      const cachedData = await loadOfflineMetrics();
      setMetrics(cachedData);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrends = (currentData, previousData) => {
    return {
      revenueChange: previousData.todayRevenue ? 
        Math.round(((currentData.todayRevenue - previousData.todayRevenue) / previousData.todayRevenue) * 100) : 0,
      totalRevenueChange: previousData.totalRevenue ? 
        Math.round(((currentData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue) * 100) : 0,
      profitChange: previousData.todayProfit ? 
        Math.round(((currentData.todayProfit - previousData.todayProfit) / previousData.todayProfit) * 100) : 0,
      ordersChange: previousData.totalOrders ? 
        Math.round(((currentData.totalOrders - previousData.totalOrders) / previousData.totalOrders) * 100) : 0,
      stockValueTrend: 'up',
      productsTrend: 'up',
      lowStockTrend: currentData.lowStockItems < (previousData.lowStockItems || 0) ? 'down' : 'up',
      utilizationTrend: 'up',
      wholesalersTrend: 'up',
      deliveryTrend: 'up',
      completedTrend: 'up',
      marginTrend: 'up'
    };
  };

  const cacheData = async (key, data) => {
    if (props.isElectron && window.electronAPI?.storage?.setPersistent) {
      try {
        await window.electronAPI.storage.setPersistent(`supplier_${key}`, data);
      } catch (error) {
        console.warn('Failed to cache data:', error);
      }
    }
  };

  const loadOfflineMetrics = async () => {
    if (props.isElectron && window.electronAPI?.storage?.getPersistent) {
      try {
        const cached = await window.electronAPI.storage.getPersistent('supplier_current_metrics');
        if (cached.success && cached.value) {
          console.log('📂 Loaded cached metrics');
          return cached.value;
        }
      } catch (error) {
        console.warn('Failed to load cached metrics:', error);
      }
    }

    console.log('📂 No cached data found, returning empty metrics');
    // Return empty metrics when no cached data available
    return {
      todayRevenue: 0,
      totalRevenue: 0,
      todayProfit: 0,
      totalProfit: 0,
      totalOrders: 0,
      pendingOrders: 0,
      inProductionOrders: 0,
      readyForDeliveryOrders: 0,
      stockValue: 0,
      totalProducts: 0,
      lowStockItems: 0,
      stockUtilization: 0,
      totalWholesalers: 0,
      deliveryPipeline: 0,
      completedDeliveries: 0,
      averageProfitMargin: 0,
      todayOrders: 0
    };
  };

  const loadPreviousMetrics = async () => {
    if (props.isElectron && window.electronAPI?.storage?.getPersistent) {
      try {
        const cached = await window.electronAPI.storage.getPersistent('supplier_previous_metrics');
        if (cached.success && cached.value) {
          return cached.value;
        }
      } catch (error) {
        console.warn('Failed to load previous metrics:', error);
      }
    }
    return {};
  };

  useEffect(() => {
    console.log('🏁 Overview component mounted, fetching metrics...');
    fetchMetrics();
  }, [props.isOnline, isAuthenticated]); // Re-fetch when online status or authentication changes

  if (error && !loading) {
    return (
      <div className="space-y-4 p-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                {props.isOnline ? 'Data Loading Issue' : 'Offline Mode'}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                {props.isOnline ? error : 'Working with cached data'}. Showing available metrics.
              </p>
            </div>
            <button 
              onClick={fetchMetrics}
              disabled={!props.isOnline}
              className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              <FaSync className="mr-1" />
              Retry
            </button>
          </div>
        </div>
        <OverviewContent 
          metrics={metrics} 
          loading={false} 
          isElectron={props.isElectron}
          isOnline={props.isOnline}
          syncStatus={props.syncStatus}
          onSync={props.onSync}
        />
      </div>
    );
  }

  return (
    <OverviewContent 
      metrics={metrics} 
      loading={loading} 
      isElectron={props.isElectron}
      isOnline={props.isOnline}
      syncStatus={props.syncStatus}
      onSync={props.onSync}
    />
  );
};

export default Overview;