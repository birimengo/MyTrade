// src/components/WholesalerComponents/Overview.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaShoppingCart, 
  FaDollarSign, 
  FaBox, 
  FaChartLine, 
  FaExclamationTriangle,
  FaUsers,
  FaTruck,
  FaIndustry,
  FaCalendarDay,
  FaChartBar,
  FaMoneyBillWave,
  FaSync,
  FaWifi,
  FaCloudDownloadAlt
} from 'react-icons/fa';

// Move MetricCard component outside so it's accessible by both Overview and OverviewContent
const MetricCard = ({ title, value, icon, color, subtitle, trend, loading, isPercentage = false, isCurrency = false }) => (
  <div className={`
    bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border-l-3 transition-all duration-200 hover:shadow-md
    ${loading ? 'animate-pulse' : ''}
    min-h-[80px] flex flex-col justify-center
  `} style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide truncate">
          {title}
        </p>
        {loading ? (
          <div className="space-y-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : (
          <>
            <p className={`
              font-bold text-gray-900 dark:text-white mb-0.5 truncate
              text-sm lg:text-base
            `}>
              {isPercentage ? `${value}%` : 
               isCurrency ? `UGX ${typeof value === 'number' ? value.toLocaleString() : '0'}` : 
               typeof value === 'number' ? value.toLocaleString() : value
              }
            </p>
            {subtitle && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={`text-[10px] font-medium ${
                trend.includes('+') ? 'text-green-600' : 
                trend.includes('Attention') ? 'text-red-600' : 
                trend.includes('Low') ? 'text-red-600' : 'text-gray-500'
              }`}>
                {trend}
              </p>
            )}
          </>
        )}
      </div>
      <div className={`
        flex-shrink-0 ml-2 p-1.5 rounded-lg
        ${loading ? 'bg-gray-200 dark:bg-gray-700' : ''}
      `} 
        style={!loading ? { 
          backgroundColor: `${color}15`,
          color: color
        } : {}}>
        <div className={`
          ${loading ? 'w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded' : 'text-sm'}
        `}>
          {!loading && icon}
        </div>
      </div>
    </div>
  </div>
);

// Separate component for the main content
const OverviewContent = ({ metrics, loading, isOnline, syncStatus, onSync, isElectron }) => (
  <div className="space-y-4 p-3">
    {/* Header with sync status */}
    <div className="flex justify-between items-center mb-2">
      <div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Wholesaler Overview</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Real-time business metrics and performance indicators
        </p>
      </div>
      
      {isElectron && (
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm ${
            isOnline ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
          }`}>
            {syncStatus === 'syncing' ? (
              <FaSync className="h-3 w-3 animate-spin" />
            ) : (
              <FaWifi className={`h-3 w-3 ${isOnline ? 'text-green-500' : 'text-yellow-500'}`} />
            )}
            <span className="font-medium">
              {syncStatus === 'syncing' ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <button
            onClick={onSync}
            disabled={!isOnline || syncStatus === 'syncing'}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isOnline && syncStatus !== 'syncing'
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            <FaCloudDownloadAlt className="h-3 w-3" />
            <span>Sync</span>
          </button>
        </div>
      )}
    </div>

    {/* Sales & Revenue Overview */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Today's Revenue"
        value={metrics.todaySalesValue}
        icon={<FaMoneyBillWave />}
        color="#16a34a"
        subtitle="From certified orders"
        trend="+12%"
        loading={loading}
        isCurrency={true}
      />
      
      <MetricCard
        title="Total Revenue"
        value={metrics.totalSalesValue}
        icon={<FaChartLine />}
        color="#9333ea"
        subtitle="All time sales"
        loading={loading}
        isCurrency={true}
      />
      
      <MetricCard
        title="Today's Orders"
        value={metrics.todayOrders}
        icon={<FaCalendarDay />}
        color="#2563eb"
        subtitle="New orders today"
        loading={loading}
      />
      
      <MetricCard
        title="Pending Orders"
        value={metrics.pendingOrders}
        icon={<FaShoppingCart />}
        color="#ea580c"
        subtitle="Awaiting processing"
        loading={loading}
      />
    </div>

    {/* Inventory & Stock */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Stock Value"
        value={metrics.stockValue}
        icon={<FaBox />}
        color="#0d9488"
        subtitle="Current inventory"
        loading={loading}
        isCurrency={true}
      />
      
      <MetricCard
        title="Total Products"
        value={metrics.totalProducts}
        icon={<FaBox />}
        color="#4f46e5"
        subtitle="Active products"
        loading={loading}
      />
      
      <MetricCard
        title="Stock Utilization"
        value={metrics.stockUtilization}
        icon={<FaChartBar />}
        color="#16a34a"
        subtitle="Inventory efficiency"
        trend={metrics.stockUtilization < 50 ? "Low" : "Good"}
        loading={loading}
        isPercentage={true}
      />
      
      <MetricCard
        title="Low Stock Items"
        value={metrics.lowStockItems}
        icon={<FaExclamationTriangle />}
        color="#dc2626"
        subtitle="Need restocking"
        trend={metrics.lowStockItems > 0 ? "Attention" : "Good"}
        loading={loading}
      />
    </div>

    {/* Business Relationships */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Total Retailers"
        value={metrics.totalRetailers}
        icon={<FaUsers />}
        color="#db2777"
        subtitle="Active customers"
        loading={loading}
      />
      
      <MetricCard
        title="Total Orders"
        value={metrics.totalOrders}
        icon={<FaShoppingCart />}
        color="#0d9488"
        subtitle="All time orders"
        loading={loading}
      />
      
      <MetricCard
        title="Supplier Orders"
        value={metrics.supplierOrders}
        icon={<FaIndustry />}
        color="#9333ea"
        subtitle="Orders to suppliers"
        loading={loading}
      />
      
      <MetricCard
        title="Certified Orders"
        value={metrics.certifiedOrders}
        icon={<FaTruck />}
        color="#16a34a"
        subtitle="Completed supplier orders"
        loading={loading}
      />
    </div>

    {/* Desktop-specific features */}
    {isElectron && (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaCloudDownloadAlt className="text-blue-600 dark:text-blue-400 text-lg" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Desktop Features Active
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Offline mode, data export, and desktop notifications available
              </p>
            </div>
          </div>
          {!isOnline && (
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
              Working Offline
            </span>
          )}
        </div>
      </div>
    )}
  </div>
);

const Overview = ({ isElectron, isOnline, onSync, syncStatus }) => {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalSalesValue: 0,
    todayOrders: 0,
    todaySalesValue: 0,
    stockValue: 0,
    lowStockItems: 0,
    totalProducts: 0,
    totalRetailers: 0,
    certifiedOrders: 0,
    supplierOrders: 0,
    stockUtilization: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Enhanced fetchMetrics with offline support
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get cached data first for better performance
      const cachedData = await getCachedMetrics();
      if (cachedData && !isOnline) {
        console.log('📊 Using cached metrics data (offline mode)');
        setMetrics(cachedData);
        setLoading(false);
        return;
      }

      if (cachedData && isOnline) {
        // Show cached data immediately while fetching fresh data
        setMetrics(cachedData);
      }

      const token = localStorage.getItem('trade_uganda_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const baseURL = 'https://mytrade-cx5z.onrender.com/api';

      // Get today's date for filtering
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Only use endpoints that actually exist in your backend
      const requests = [
        // Wholesaler orders (from retailers)
        fetch(`${baseURL}/retailer-orders/wholesaler`, { headers }),
        // Supplier orders (to suppliers)
        fetch(`${baseURL}/wholesaler-orders`, { headers }),
        // Products
        fetch(`${baseURL}/products`, { headers }),
        // Retailers (customers)
        fetch(`${baseURL}/retailers`, { headers }),
        // Today's orders
        fetch(`${baseURL}/retailer-orders/wholesaler?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}`, { headers })
      ];

      const responses = await Promise.all(requests.map(req => 
        req.catch(err => ({ ok: false, error: err }))
      ));
      
      // Process responses
      const [
        retailerOrdersRes,
        supplierOrdersRes,
        productsRes,
        retailersRes,
        todayOrdersRes
      ] = responses;

      // Calculate metrics from responses
      let metricsData = {
        totalOrders: 0,
        pendingOrders: 0,
        totalSalesValue: 0,
        todayOrders: 0,
        todaySalesValue: 0,
        stockValue: 0,
        lowStockItems: 0,
        totalProducts: 0,
        totalRetailers: 0,
        certifiedOrders: 0,
        supplierOrders: 0,
        stockUtilization: 0
      };

      // Process retailer orders
      if (retailerOrdersRes.ok) {
        const retailerOrdersData = await retailerOrdersRes.json();
        const orders = retailerOrdersData.orders || [];
        
        metricsData.totalOrders = orders.length;
        metricsData.pendingOrders = orders.filter(order => 
          ['pending', 'confirmed', 'assigned_to_transporter'].includes(order.status)
        ).length;
        
        metricsData.totalSalesValue = orders
          .filter(order => order.status === 'certified')
          .reduce((total, order) => total + (order.totalPrice || 0), 0);
      }

      // Process today's orders
      if (todayOrdersRes.ok) {
        const todayOrdersData = await todayOrdersRes.json();
        const todayOrders = todayOrdersData.orders || [];
        
        metricsData.todayOrders = todayOrders.length;
        metricsData.todaySalesValue = todayOrders
          .filter(order => order.status === 'certified')
          .reduce((total, order) => total + (order.totalPrice || 0), 0);
      }

      // Process supplier orders
      if (supplierOrdersRes.ok) {
        const supplierOrdersData = await supplierOrdersRes.json();
        const supplierOrders = supplierOrdersData.orders || [];
        
        metricsData.supplierOrders = supplierOrders.length;
        metricsData.certifiedOrders = supplierOrders.filter(order => 
          order.status === 'certified'
        ).length;
      }

      // Process products - this will give us stock information
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const products = productsData.products || [];
        
        metricsData.totalProducts = products.length;
        
        // Calculate stock value from products
        metricsData.stockValue = products.reduce((total, product) => {
          return total + ((product.price || 0) * (product.quantity || 0));
        }, 0);
        
        // Calculate low stock items (products with quantity < 10 as example)
        metricsData.lowStockItems = products.filter(product => 
          (product.quantity || 0) < 10
        ).length;
        
        // Calculate stock utilization (percentage of products with stock)
        const productsWithStock = products.filter(product => (product.quantity || 0) > 0).length;
        metricsData.stockUtilization = products.length > 0 ? 
          Math.round((productsWithStock / products.length) * 100) : 0;
      }

      // Process retailers
      if (retailersRes.ok) {
        const retailersData = await retailersRes.json();
        metricsData.totalRetailers = retailersData.retailers?.length || 0;
      }

      setMetrics(metricsData);
      
      // Cache the data for offline use
      await cacheMetrics(metricsData);
      setLastSync(new Date().toLocaleTimeString());

      // Show desktop notification if Electron is available
      if (isElectron && window.electronAPI) {
        window.electronAPI.showNotification(
          'Data Updated',
          'Wholesaler metrics have been refreshed successfully'
        );
      }

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
      
      // Try to use cached data as fallback
      const cachedData = await getCachedMetrics();
      if (cachedData) {
        console.log('🔄 Using cached data due to fetch error');
        setMetrics(cachedData);
        setError('Using cached data - ' + err.message);
      } else {
        // Set demo data for development as last resort
        setMetrics({
          totalOrders: 45,
          pendingOrders: 12,
          totalSalesValue: 1250000,
          todayOrders: 8,
          todaySalesValue: 245000,
          stockValue: 750000,
          lowStockItems: 3,
          totalProducts: 28,
          totalRetailers: 15,
          certifiedOrders: 5,
          supplierOrders: 18,
          stockUtilization: 75
        });
        setError('Network error - Showing demo data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cache metrics for offline use
  const cacheMetrics = async (data) => {
    try {
      if (isElectron && window.electronAPI?.storage) {
        await window.electronAPI.storage.setPersistent('cached_metrics', {
          data,
          timestamp: new Date().toISOString()
        });
      } else {
        localStorage.setItem('wholesaler_metrics_cache', JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error caching metrics:', error);
    }
  };

  // Get cached metrics
  const getCachedMetrics = async () => {
    try {
      let cachedData = null;
      
      if (isElectron && window.electronAPI?.storage) {
        const result = await window.electronAPI.storage.getPersistent('cached_metrics');
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem('wholesaler_metrics_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedData = parsed.data;
        }
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error getting cached metrics:', error);
      return null;
    }
  };

  // Handle manual sync
  const handleSync = () => {
    if (isOnline && onSync) {
      onSync();
    }
    fetchMetrics();
  };

  if (error && !loading) {
    return (
      <div className="space-y-4 p-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                {isOnline ? 'Sync Issue' : 'Offline Mode'}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                {error}
              </p>
              {lastSync && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                  Last sync: {lastSync}
                </p>
              )}
            </div>
            <button 
              onClick={handleSync}
              disabled={!isOnline && syncStatus === 'syncing'}
              className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              <FaSync className="mr-1" />
              {isOnline ? 'Retry' : 'Offline'}
            </button>
          </div>
        </div>
        <OverviewContent 
          metrics={metrics} 
          loading={false}
          isOnline={isOnline}
          syncStatus={syncStatus}
          onSync={handleSync}
          isElectron={isElectron}
        />
      </div>
    );
  }

  return (
    <OverviewContent 
      metrics={metrics} 
      loading={loading}
      isOnline={isOnline}
      syncStatus={syncStatus}
      onSync={handleSync}
      isElectron={isElectron}
    />
  );
};

export default Overview;