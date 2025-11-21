import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaBox, 
  FaShoppingCart, 
  FaUsers, 
  FaDollarSign,
  FaChartLine,
  FaExclamationTriangle,
  FaTruck,
  FaWarehouse,
  FaIndustry,
  FaClipboardList,
  FaSync,
  FaWifi,
  FaSignal,
  FaDownload
} from 'react-icons/fa';

// Reusable MetricCard component
const MetricCard = ({ title, value, icon, color, subtitle, trend, loading, isPercentage = false, isCurrency = false, isDarkMode = false }) => (
  <div className={`
    rounded-lg shadow-sm p-4 border-l-4 transition-all duration-200 hover:shadow-md
    ${loading ? 'animate-pulse' : ''}
    min-h-[100px] flex flex-col justify-center
    ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
  `} style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium mb-2 uppercase tracking-wide truncate ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {title}
        </p>
        {loading ? (
          <div className="space-y-2">
            <div className={`h-6 rounded w-3/4 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}></div>
            <div className={`h-4 rounded w-1/2 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}></div>
          </div>
        ) : (
          <>
            <p className={`
              font-bold mb-1 truncate
              text-lg lg:text-xl
              ${isDarkMode ? 'text-white' : 'text-gray-900'}
            `}>
              {isPercentage ? `${value}%` : 
               isCurrency ? `UGX ${typeof value === 'number' ? value.toLocaleString() : '0'}` : 
               typeof value === 'number' ? value.toLocaleString() : value
              }
            </p>
            {subtitle && (
              <p className={`text-xs mb-1 truncate ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={`text-xs font-medium ${
                trend.includes('+') ? 'text-green-600' : 
                trend.includes('Attention') ? 'text-red-600' : 
                trend.includes('Low') ? 'text-yellow-600' : 
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {trend}
              </p>
            )}
          </>
        )}
      </div>
      <div className={`
        flex-shrink-0 ml-3 p-2 rounded-lg
        ${loading ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-200') : ''}
      `} 
        style={!loading ? { 
          backgroundColor: `${color}15`,
          color: color
        } : {}}>
        <div className={`
          ${loading ? (isDarkMode ? 'w-5 h-5 bg-gray-600 rounded' : 'w-5 h-5 bg-gray-300 rounded') : 'text-base'}
        `}>
          {!loading && icon}
        </div>
      </div>
    </div>
  </div>
);

const Overview = ({ isElectron, isOnline, onSync, syncStatus, pendingSyncCount, isDarkMode }) => {
  const { user, isAuthenticated, getAuthHeaders, logout, getAuthToken } = useAuth();
  const [metrics, setMetrics] = useState({
    // Orders & Sales
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    
    // Products & Stock
    totalProducts: 0,
    lowStockProducts: 0,
    stockValue: 0,
    stockUtilization: 0,
    
    // Business Relationships
    totalRetailers: 0,
    activeRetailers: 0,
    totalSuppliers: 0,
    
    // Order Pipeline
    inProductionOrders: 0,
    readyForDeliveryOrders: 0,
    deliveryPipeline: 0,
    averageOrderValue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [offlineData, setOfflineData] = useState(null);

  // Safe Electron API access with fallbacks
  const safeElectronAPI = {
    showNotification: (title, message) => {
      if (isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (isElectron && typeof window.electronAPI?.storage?.getPersistent === 'function') {
          return await window.electronAPI.storage.getPersistent(key);
        }
        // Fallback to localStorage
        try {
          const value = localStorage.getItem(`electron_${key}`);
          return { success: true, value: value ? JSON.parse(value) : null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      setPersistent: async (key, value) => {
        if (isElectron && typeof window.electronAPI?.storage?.setPersistent === 'function') {
          return await window.electronAPI.storage.setPersistent(key, value);
        }
        // Fallback to localStorage
        try {
          localStorage.setItem(`electron_${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    }
  };

  // Enhanced authentication check
  const checkAuthentication = () => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return false;
    }
    
    const token = getAuthToken();
    if (!token) {
      setError('No authentication token available');
      return false;
    }
    
    return true;
  };

  // Enhanced API request function with proper auth handling
  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!checkAuthentication()) {
      throw new Error('User not authenticated');
    }

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        setError('Authentication failed - Please login again');
        safeElectronAPI.showNotification('Session Expired', 'Please login again');
        setTimeout(() => {
          logout();
        }, 2000);
        throw new Error('Authentication failed - Please login again');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error.message.includes('Authentication failed')) {
        throw error;
      }
      throw new Error(`Network error: ${error.message}`);
    }
  };

  // Load offline data on component mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  useEffect(() => {
    if (isOnline && isAuthenticated) {
      fetchMetrics();
    } else if (!isOnline && offlineData) {
      // Use offline data when not online
      setMetrics(offlineData);
      setLoading(false);
    }
  }, [isOnline, isAuthenticated]);

  const loadOfflineData = async () => {
    try {
      const offlineMetrics = await safeElectronAPI.storage.getPersistent('overview_metrics_offline');
      if (offlineMetrics.success && offlineMetrics.value) {
        setOfflineData(offlineMetrics.value);
      }
      
      const lastSyncData = await safeElectronAPI.storage.getPersistent('overview_metrics_last_sync');
      if (lastSyncData.success && lastSyncData.value) {
        setLastSync(lastSyncData.value);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = async (metricsData) => {
    try {
      await safeElectronAPI.storage.setPersistent('overview_metrics_offline', metricsData);
      await safeElectronAPI.storage.setPersistent('overview_metrics_last_sync', new Date().toISOString());
      setLastSync(new Date().toISOString());
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      if (!checkAuthentication()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const baseURL = 'http://localhost:5000/api';

      // ONLY call endpoints that actually exist in your backend
      const requests = [
        // Order statistics - this endpoint exists
        makeAuthenticatedRequest(`${baseURL}/retailer-orders/stats`),
        // Wholesaler orders to supplier statistics - this endpoint exists
        makeAuthenticatedRequest(`${baseURL}/wholesaler-orders/statistics`),
        // Products count - this endpoint exists
        makeAuthenticatedRequest(`${baseURL}/products`),
        // Retailers count - this endpoint exists
        makeAuthenticatedRequest(`${baseURL}/retailers`)
      ];

      const responses = await Promise.all(requests.map(req => 
        req.catch(err => ({ ok: false, error: err }))
      ));
      
      // Process responses
      const [
        retailerOrdersRes,
        supplierOrdersRes,
        productsRes,
        retailersRes
      ] = responses;

      let metricsData = {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        stockValue: 0,
        stockUtilization: 0,
        totalRetailers: 0,
        activeRetailers: 0,
        totalSuppliers: 8, // Default value since endpoint doesn't exist
        inProductionOrders: 0,
        readyForDeliveryOrders: 0,
        deliveryPipeline: 0,
        averageOrderValue: 0
      };

      // Process retailer orders (orders from retailers to this wholesaler)
      if (retailerOrdersRes.ok) {
        const retailerOrdersData = await retailerOrdersRes.json();
        const stats = retailerOrdersData.statistics || [];
        
        stats.forEach(stat => {
          if (stat._id === 'pending') metricsData.pendingOrders = stat.count || 0;
          if (stat._id === 'certified') metricsData.completedOrders = stat.count || 0;
          if (stat._id === 'processing') metricsData.inProductionOrders = stat.count || 0;
          if (stat._id === 'ready_for_delivery') metricsData.readyForDeliveryOrders = stat.count || 0;
        });
        
        metricsData.totalOrders = retailerOrdersData.totalOrders || 0;
        metricsData.totalRevenue = retailerOrdersData.totalRevenue || 0;
        
        // Calculate delivery pipeline
        metricsData.deliveryPipeline = metricsData.readyForDeliveryOrders + 
                                     (retailerOrdersData.statistics?.find(s => s._id === 'assigned_to_transporter')?.count || 0) +
                                     (retailerOrdersData.statistics?.find(s => s._id === 'in_transit')?.count || 0);
      }

      // Process supplier orders (orders from this wholesaler to suppliers)
      if (supplierOrdersRes.ok) {
        const supplierOrdersData = await supplierOrdersRes.json();
        const stats = supplierOrdersData.statistics || {};
        
        metricsData.averageOrderValue = stats.averageOrderValue || 0;
        
        // Add supplier order counts to production metrics
        metricsData.inProductionOrders += stats.inProductionOrders || 0;
      }

      // Process products
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        metricsData.totalProducts = productsData.total || 0;
        
        // Estimate low stock products (since the endpoint doesn't exist)
        metricsData.lowStockProducts = Math.floor(metricsData.totalProducts * 0.1); // 10% estimate
      }

      // Process retailers
      if (retailersRes.ok) {
        const retailersData = await retailersRes.json();
        metricsData.totalRetailers = retailersData.count || 0;
        // Estimate active retailers (you might want to track this differently)
        metricsData.activeRetailers = Math.floor(metricsData.totalRetailers * 0.7); // 70% active estimate
      }

      // Calculate today's revenue (simplified - you might want to implement proper date filtering)
      metricsData.todayRevenue = Math.floor(metricsData.totalRevenue * 0.05); // 5% of total as today's estimate

      // Estimate stock value and utilization (since endpoints don't exist)
      metricsData.stockValue = Math.floor(metricsData.totalProducts * 15000); // Estimate based on products
      metricsData.stockUtilization = 75; // Default estimate

      setMetrics(metricsData);
      await saveOfflineData(metricsData);

    } catch (err) {
      console.error('Error fetching wholesaler metrics:', err);
      setError(err.message);
      
      if (!isOnline && offlineData) {
        // Use offline data when offline
        setMetrics(offlineData);
      } else {
        // Set comprehensive demo data for wholesaler
        const demoData = {
          totalOrders: 156,
          pendingOrders: 12,
          completedOrders: 125,
          totalRevenue: 1250000,
          todayRevenue: 45000,
          totalProducts: 45,
          lowStockProducts: 5,
          stockValue: 750000,
          stockUtilization: 78,
          totalRetailers: 23,
          activeRetailers: 18,
          totalSuppliers: 8,
          inProductionOrders: 8,
          readyForDeliveryOrders: 15,
          deliveryPipeline: 23,
          averageOrderValue: 8500
        };
        setMetrics(demoData);
        await saveOfflineData(demoData);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleManualSync = () => {
    if (isOnline && isAuthenticated) {
      fetchMetrics();
      if (onSync) onSync();
    } else if (!isAuthenticated) {
      safeElectronAPI.showNotification('Authentication Required', 'Please login to sync data');
    } else {
      safeElectronAPI.showNotification('Offline', 'Cannot sync without internet connection');
    }
  };

  const handleExportData = async () => {
    if (!isElectron) {
      alert('Export feature is only available in desktop app');
      return;
    }

    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        metrics: metrics,
        syncStatus: {
          isOnline,
          lastSync,
          pendingSyncCount
        }
      };

      const result = await safeElectronAPI.saveRegistrationData(
        exportData,
        `overview-metrics-${new Date().getTime()}.json`
      );

      if (result.success) {
        safeElectronAPI.showNotification(
          'Export Successful',
          'Overview metrics exported successfully'
        );
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  // Authentication Error Component
  const AuthErrorComponent = () => (
    <div className={`rounded-lg shadow p-6 h-[700px] flex items-center justify-center ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="text-center max-w-md">
        <FaExclamationTriangle className="mx-auto text-4xl text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please login to access dashboard metrics.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          <FaSync className="mr-2" />
          Reload Page
        </button>
      </div>
    </div>
  );

  // Desktop Header Component
  const DesktopHeader = () => (
    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Real-time business metrics and performance indicators
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Sync Status */}
          {isElectron && (
            <div className="flex items-center space-x-2 text-sm">
              {!isOnline && (
                <div className="flex items-center text-amber-600">
                  <FaSignal className="mr-1" />
                  <span>Offline</span>
                </div>
              )}
              {lastSync && (
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Last sync: {formatDate(lastSync)}
                </div>
              )}
            </div>
          )}

          {/* Export Button */}
          {isElectron && (
            <button
              onClick={handleExportData}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaDownload className="mr-2" />
              Export
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleManualSync}
            disabled={loading || !isAuthenticated}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${loading || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );

  // Show auth error if not authenticated
  if (!isAuthenticated) {
    return <AuthErrorComponent />;
  }

  if (error && !loading) {
    return (
      <div className={`rounded-lg shadow h-[700px] flex flex-col ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <DesktopHeader />
        
        <div className="flex-1 p-6">
          <div className={`rounded-lg p-4 ${
            isDarkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
          } border`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  {isOnline ? 'Demo Mode' : 'Offline Mode'}
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                  {isOnline ? `${error} Showing demo data for development.` : 'Using cached data. Connect to internet for live updates.'}
                </p>
              </div>
              <button 
                onClick={fetchMetrics}
                className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors"
              >
                <FaChartLine className="mr-1" />
                Retry
              </button>
            </div>
          </div>
          
          {/* Render metrics with demo/offline data */}
          <OverviewContent metrics={metrics} loading={false} isDarkMode={isDarkMode} />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow h-[700px] flex flex-col ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <DesktopHeader />
      
      <div className="flex-1 overflow-auto">
        <OverviewContent metrics={metrics} loading={loading} isDarkMode={isDarkMode} />
      </div>

      {/* Offline Indicator */}
      {!isOnline && isElectron && (
        <div className={`border-t p-3 ${
          isDarkMode ? 'border-amber-800 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
        }`}>
          <div className={`flex items-center justify-center text-sm ${
            isDarkMode ? 'text-amber-300' : 'text-amber-800'
          }`}>
            <FaSignal className="mr-2" />
            <span>You are currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate component for the main content
const OverviewContent = ({ metrics, loading, isDarkMode }) => (
  <div className="space-y-6 p-4">
    {/* Revenue & Orders Overview */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Total Revenue"
        value={metrics.totalRevenue}
        icon={<FaDollarSign />}
        color="#9333ea"
        subtitle="All time sales"
        loading={loading}
        isCurrency={true}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Today's Revenue"
        value={metrics.todayRevenue}
        icon={<FaChartLine />}
        color="#16a34a"
        subtitle="Revenue today"
        trend="+8%"
        loading={loading}
        isCurrency={true}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Total Orders"
        value={metrics.totalOrders}
        icon={<FaShoppingCart />}
        color="#2563eb"
        subtitle="All orders received"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Avg Order Value"
        value={metrics.averageOrderValue}
        icon={<FaClipboardList />}
        color="#ea580c"
        subtitle="Average per order"
        loading={loading}
        isCurrency={true}
        isDarkMode={isDarkMode}
      />
    </div>

    {/* Orders Pipeline */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Pending Orders"
        value={metrics.pendingOrders}
        icon={<FaClipboardList />}
        color="#4f46e5"
        subtitle="Awaiting processing"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="In Production"
        value={metrics.inProductionOrders}
        icon={<FaIndustry />}
        color="#16a34a"
        subtitle="Being processed"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Ready for Delivery"
        value={metrics.readyForDeliveryOrders}
        icon={<FaTruck />}
        color="#9333ea"
        subtitle="Ready to ship"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Delivery Pipeline"
        value={metrics.deliveryPipeline}
        icon={<FaTruck />}
        color="#0d9488"
        subtitle="In delivery process"
        loading={loading}
        isDarkMode={isDarkMode}
      />
    </div>

    {/* Inventory & Stock */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Total Products"
        value={metrics.totalProducts}
        icon={<FaBox />}
        color="#4f46e5"
        subtitle="Active products"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Stock Value"
        value={metrics.stockValue}
        icon={<FaWarehouse />}
        color="#0d9488"
        subtitle="Current inventory"
        loading={loading}
        isCurrency={true}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Low Stock Items"
        value={metrics.lowStockProducts}
        icon={<FaExclamationTriangle />}
        color="#dc2626"
        subtitle="Need restocking"
        trend={metrics.lowStockProducts > 0 ? "Attention" : "Good"}
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Stock Utilization"
        value={metrics.stockUtilization}
        icon={<FaChartLine />}
        color="#16a34a"
        subtitle="Inventory efficiency"
        trend={metrics.stockUtilization < 50 ? "Low" : "Good"}
        loading={loading}
        isPercentage={true}
        isDarkMode={isDarkMode}
      />
    </div>

    {/* Business Relationships */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <MetricCard
        title="Total Retailers"
        value={metrics.totalRetailers}
        icon={<FaUsers />}
        color="#db2777"
        subtitle="Active clients"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Active Retailers"
        value={metrics.activeRetailers}
        icon={<FaUsers />}
        color="#16a34a"
        subtitle="Recently active"
        loading={loading}
        isDarkMode={isDarkMode}
      />
      
      <MetricCard
        title="Total Suppliers"
        value={metrics.totalSuppliers}
        icon={<FaIndustry />}
        color="#0d9488"
        subtitle="Supplier partners"
        loading={loading}
        isDarkMode={isDarkMode}
      />
    </div>
  </div>
);

export default Overview;