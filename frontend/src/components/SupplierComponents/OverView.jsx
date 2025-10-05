import React, { useState, useEffect } from 'react';
import { 
  FaWarehouse, 
  FaShippingFast, 
  FaUsers, 
  FaDollarSign,
  FaClipboardList,
  FaIndustry,
  FaBox,
  FaChartLine,
  FaExclamationTriangle,
  FaCalendarDay,
  FaMoneyBillWave,
  FaTruck,
  FaBoxOpen,
  FaRoad
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
               isCurrency ? `UGX ${value.toLocaleString()}` : 
               value.toLocaleString()
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
const OverviewContent = ({ metrics, loading }) => (
  <div className="space-y-4 p-3">
    {/* Revenue & Sales Overview */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Today's Revenue"
        value={metrics.todayRevenue}
        icon={<FaMoneyBillWave />}
        color="#16a34a"
        subtitle="From completed sales"
        trend="+15%"
        loading={loading}
        isCurrency={true}
      />
      
      <MetricCard
        title="Total Revenue"
        value={metrics.totalRevenue}
        icon={<FaChartLine />}
        color="#9333ea"
        subtitle="All time sales"
        loading={loading}
        isCurrency={true}
      />
      
      <MetricCard
        title="Today's Profit"
        value={metrics.todayProfit}
        icon={<FaDollarSign />}
        color="#2563eb"
        subtitle="Profit today"
        loading={loading}
        isCurrency={true}
      />
      
      <MetricCard
        title="Total Profit"
        value={metrics.totalProfit}
        icon={<FaChartLine />}
        color="#ea580c"
        subtitle="All time profit"
        loading={loading}
        isCurrency={true}
      />
    </div>

    {/* Orders & Production */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Total Orders"
        value={metrics.totalOrders}
        icon={<FaClipboardList />}
        color="#0d9488"
        subtitle="All orders received"
        loading={loading}
      />
      
      <MetricCard
        title="Pending Orders"
        value={metrics.pendingOrders}
        icon={<FaClipboardList />}
        color="#4f46e5"
        subtitle="Awaiting processing"
        loading={loading}
      />
      
      <MetricCard
        title="In Production"
        value={metrics.inProductionOrders}
        icon={<FaIndustry />}
        color="#16a34a"
        subtitle="Being manufactured"
        loading={loading}
      />
      
      <MetricCard
        title="Ready for Delivery"
        value={metrics.readyForDeliveryOrders}
        icon={<FaTruck />}
        color="#9333ea"
        subtitle="Ready to ship"
        loading={loading}
      />
    </div>

    {/* Inventory & Stock */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Stock Value"
        value={metrics.stockValue}
        icon={<FaWarehouse />}
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
        title="Low Stock Items"
        value={metrics.lowStockItems}
        icon={<FaExclamationTriangle />}
        color="#dc2626"
        subtitle="Need restocking"
        trend={metrics.lowStockItems > 0 ? "Attention" : "Good"}
        loading={loading}
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
      />
    </div>

    {/* Business Relationships & Delivery Pipeline */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <MetricCard
        title="Total Wholesalers"
        value={metrics.totalWholesalers}
        icon={<FaUsers />}
        color="#db2777"
        subtitle="Active clients"
        loading={loading}
      />
      
      <MetricCard
        title="Delivery Pipeline"
        value={metrics.deliveryPipeline}
        icon={<FaRoad />}
        color="#0d9488"
        subtitle="Orders in delivery process"
        loading={loading}
      />
      
      <MetricCard
        title="Completed Deliveries"
        value={metrics.completedDeliveries}
        icon={<FaBoxOpen />}
        color="#9333ea"
        subtitle="Successfully delivered"
        loading={loading}
      />
      
      <MetricCard
        title="Avg Profit Margin"
        value={metrics.averageProfitMargin}
        icon={<FaChartLine />}
        color="#16a34a"
        subtitle="Product profitability"
        loading={loading}
        isPercentage={true}
      />
    </div>
  </div>
);

const Overview = () => {
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
    
    // Inventory & Stock
    stockValue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    stockUtilization: 0,
    
    // Business Relationships & Delivery Pipeline
    totalWholesalers: 0,
    deliveryPipeline: 0,
    completedDeliveries: 0,
    averageProfitMargin: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const baseURL = 'http://localhost:5000/api';

      // Get today's date for filtering
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch data from supplier-specific endpoints
      const requests = [
        // Sales statistics
        fetch(`${baseURL}/supplier-sales/statistics?timeframe=today`, { headers }),
        // All sales statistics
        fetch(`${baseURL}/supplier-sales/statistics`, { headers }),
        // Supplier orders
        fetch(`${baseURL}/supplier/orders`, { headers }),
        // Products and stock
        fetch(`${baseURL}/supplier-products/sales/statistics`, { headers }),
        // Low stock items
        fetch(`${baseURL}/supplier-products/stock/low-stock`, { headers }),
        // Wholesalers (clients)
        fetch(`${baseURL}/wholesalers`, { headers }),
        // Today's orders
        fetch(`${baseURL}/supplier/orders?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}`, { headers })
      ];

      const responses = await Promise.all(requests.map(req => 
        req.catch(err => ({ ok: false, error: err }))
      ));
      
      // Process responses
      const [
        todaySalesRes,
        allSalesRes,
        ordersRes,
        productsRes,
        lowStockRes,
        wholesalersRes,
        todayOrdersRes
      ] = responses;

      // Calculate metrics from responses
      let metricsData = {
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
        averageProfitMargin: 0
      };

      // Process today's sales
      if (todaySalesRes.ok) {
        const todaySalesData = await todaySalesRes.json();
        const todayStats = todaySalesData.statistics?.today || {};
        
        metricsData.todayRevenue = todayStats.todaySales || 0;
        metricsData.todayProfit = todayStats.todayProfit || 0;
      }

      // Process all sales
      if (allSalesRes.ok) {
        const allSalesData = await allSalesRes.json();
        const salesStats = allSalesData.statistics?.sales || {};
        
        metricsData.totalRevenue = salesStats.totalSales || 0;
        metricsData.totalProfit = salesStats.totalProfit || 0;
      }

      // Process orders
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const ordersStats = ordersData.statistics || {};
        
        metricsData.totalOrders = ordersStats.total || 0;
        metricsData.pendingOrders = ordersStats.pending || 0;
        metricsData.inProductionOrders = ordersStats.in_production || 0;
        metricsData.readyForDeliveryOrders = ordersStats.ready_for_delivery || 0;
        
        // Calculate delivery pipeline (orders in delivery process)
        metricsData.deliveryPipeline = (ordersStats.assigned_to_transporter || 0) + (ordersStats.shipped || 0);
        metricsData.completedDeliveries = ordersStats.delivered || 0;
      }

      // Process today's orders for additional metrics
      if (todayOrdersRes.ok) {
        const todayOrdersData = await todayOrdersRes.json();
        // If we need additional today-specific order metrics
      }

      // Process products and stock
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const stockStats = productsData.statistics?.stock || {};
        
        metricsData.stockValue = stockStats.totalStockValue || 0;
        metricsData.totalProducts = stockStats.totalProducts || 0;
        metricsData.lowStockItems = stockStats.lowStockCount || 0;
        metricsData.averageProfitMargin = stockStats.averageProfitMargin || 0;
        
        // Calculate stock utilization (percentage of products with adequate stock)
        if (stockStats.totalProducts > 0) {
          const adequateStock = stockStats.inStockCount || 0;
          metricsData.stockUtilization = Math.round((adequateStock / stockStats.totalProducts) * 100);
        }
      }

      // Process low stock items
      if (lowStockRes.ok) {
        const lowStockData = await lowStockRes.json();
        metricsData.lowStockItems = lowStockData.products?.length || metricsData.lowStockItems;
      }

      // Process wholesalers (clients)
      if (wholesalersRes.ok) {
        const wholesalersData = await wholesalersRes.json();
        metricsData.totalWholesalers = wholesalersData.wholesalers?.length || 0;
      }

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching supplier metrics:', err);
      setError(err.message);
      
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
        stockValue: 750000,
        totalProducts: 45,
        lowStockItems: 5,
        stockUtilization: 78,
        totalWholesalers: 23,
        deliveryPipeline: 8,
        completedDeliveries: 125,
        averageProfitMargin: 28
      });
    } finally {
      setLoading(false);
    }
  };

  if (error && !loading) {
    return (
      <div className="space-y-4 p-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                Demo Mode
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                {error} Showing demo data for development.
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
        <OverviewContent metrics={metrics} loading={false} />
      </div>
    );
  }

  return <OverviewContent metrics={metrics} loading={loading} />;
};

export default Overview;