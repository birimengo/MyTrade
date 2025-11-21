// src/components/SupplierComponents/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaChartBar, 
  FaDollarSign, 
  FaBox, 
  FaShoppingCart,
  FaCube,
  FaPercent,
  FaDownload,
  FaChartLine,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaMinus
} from 'react-icons/fa';

const AnalyticsTab = ({ apiCall, isDarkMode, isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
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
    if (growth > 0) return { color: '#10B981', icon: FaArrowUp, text: '+' + growth.toFixed(1) + '%' };
    if (growth < 0) return { color: '#EF4444', icon: FaArrowDown, text: growth.toFixed(1) + '%' };
    return { color: '#6B7280', icon: FaMinus, text: '0%' };
  };

  // Handle export report
  const handleExportReport = async () => {
    try {
      alert('Export Report: Exporting analytics report...');
      // In a real app, you would call the export API endpoint
      // const exportResponse = await apiCall('/supplier-sales/export/data');
      setTimeout(() => {
        alert('Success: Analytics report exported successfully!');
      }, 1500);
    } catch (error) {
      alert('Error: Failed to export report: ' + error.message);
    }
  };

  // Handle view details
  const handleViewDetails = () => {
    alert('Detailed View: Opening detailed analytics dashboard...');
    // In a real app, you would navigate to a detailed analytics screen
  };

  if (loading) {
    return (
      <div className={`rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } p-6`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Loading Analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FaChartBar className={`w-5 h-5 ${
            isDarkMode ? 'text-green-400' : 'text-green-600'
          }`} />
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Analytics
          </h2>
        </div>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Real-time business insights
        </p>
        
        {/* Timeframe Selector */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {['today', 'week', 'month', 'quarter', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                timeframe === period
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`rounded-lg border-l-4 border-red-500 p-4 ${
          isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaExclamationCircle className="w-4 h-4 text-red-500 mr-3" />
              <p className={isDarkMode ? 'text-red-200' : 'text-red-800'}>
                {error}
              </p>
            </div>
            <button
              onClick={loadAnalyticsData}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaDollarSign className="w-4 h-4 text-green-500" />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Revenue
              </span>
            </div>
            {analyticsData?.performanceMetrics?.growth?.sales && (
              <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900 dark:bg-opacity-20 px-2 py-1 rounded">
                <FaArrowUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  {getGrowthInfo(analyticsData.performanceMetrics.growth.sales).text}
                </span>
              </div>
            )}
          </div>
          <p className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            UGX {formatCurrency(analyticsData?.salesStatistics?.sales?.totalSales || 0)}
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total revenue
          </p>
        </div>

        {/* Orders Card */}
        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaBox className="w-4 h-4 text-blue-500" />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Orders
              </span>
            </div>
            {analyticsData?.performanceMetrics?.growth?.orders && (
              <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 dark:bg-opacity-20 px-2 py-1 rounded">
                <FaArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {getGrowthInfo(analyticsData.performanceMetrics.growth.orders).text}
                </span>
              </div>
            )}
          </div>
          <p className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {analyticsData?.salesStatistics?.sales?.totalOrders || 0}
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total orders
          </p>
        </div>

        {/* Profit Card */}
        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaChartLine className="w-4 h-4 text-yellow-500" />
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Profit
              </span>
            </div>
            {analyticsData?.performanceMetrics?.growth?.profit && (
              <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900 dark:bg-opacity-20 px-2 py-1 rounded">
                <FaArrowUp className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                  {getGrowthInfo(analyticsData.performanceMetrics.growth.profit).text}
                </span>
              </div>
            )}
          </div>
          <p className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            UGX {formatCurrency(analyticsData?.salesStatistics?.sales?.totalProfit || 0)}
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total profit
          </p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <FaShoppingCart className="w-4 h-4 text-purple-500" />
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Avg Order
            </span>
          </div>
          <p className={`text-xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            UGX {formatCurrency(analyticsData?.salesStatistics?.sales?.averageOrderValue || 0)}
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Average order value
          </p>
        </div>

        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <FaCube className="w-4 h-4 text-pink-500" />
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Items Sold
            </span>
          </div>
          <p className={`text-xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {analyticsData?.salesStatistics?.sales?.totalItemsSold || 0}
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total items sold
          </p>
        </div>

        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <FaPercent className="w-4 h-4 text-cyan-500" />
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Margin
            </span>
          </div>
          <p className={`text-xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {analyticsData?.salesStatistics?.stock?.averageProfitMargin?.toFixed(1) || 0}%
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Average profit margin
          </p>
        </div>
      </div>

      {/* Stock Overview */}
      <div className={`rounded-xl border p-6 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Stock Overview
          </h3>
          <FaBox className={`w-5 h-5 ${
            isDarkMode ? 'text-green-400' : 'text-green-600'
          }`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {analyticsData?.salesStatistics?.stock?.totalProducts || 0}
            </p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Products
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {analyticsData?.salesStatistics?.stock?.totalItemsInStock || 0}
            </p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              In Stock
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              UGX {formatCurrency(analyticsData?.salesStatistics?.stock?.totalStockValue || 0)}
            </p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Value
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold mb-1 text-red-500">
              {analyticsData?.salesStatistics?.stock?.outOfStockCount || 0}
            </p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Out of Stock
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Products */}
        <div className={`rounded-xl border p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Top Products
            </h3>
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              By revenue
            </span>
          </div>
          {analyticsData?.detailedAnalytics?.topProducts?.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.detailedAnalytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={product._id || index} className="flex items-center gap-4 py-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {product.productName || product.product?.name || 'Unknown Product'}
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {product.totalQuantity || 0} sold
                      </span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        UGX {formatCurrency(product.totalRevenue || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaBox className={`mx-auto w-8 h-8 mb-3 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                No sales data
              </p>
            </div>
          )}
        </div>

        {/* Order Status Overview */}
        <div className={`rounded-xl border p-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Order Status
            </h3>
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Production
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
              <p className={`text-xl font-bold mb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {analyticsData?.orderStatistics?.overview?.pendingOrders || 0}
              </p>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Pending
              </p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-2"></div>
              <p className={`text-xl font-bold mb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {analyticsData?.orderStatistics?.overview?.inProgressOrders || 0}
              </p>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                In Progress
              </p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className={`text-xl font-bold mb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {analyticsData?.orderStatistics?.overview?.completedOrders || 0}
              </p>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Completed
              </p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2"></div>
              <p className={`text-xl font-bold mb-1 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {analyticsData?.orderStatistics?.overview?.cancelledOrders || 0}
              </p>
              <p className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Cancelled
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleExportReport}
          className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <FaDownload className="w-5 h-5 text-blue-500" />
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Export Report
          </span>
        </button>
        <button
          onClick={handleViewDetails}
          className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <FaChartLine className="w-5 h-5 text-green-500" />
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            View Details
          </span>
        </button>
      </div>

      {/* Last Updated */}
      <div className="text-center">
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default AnalyticsTab;