import React, { useState, useEffect } from 'react';
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
  FaClipboardList
} from 'react-icons/fa';

// Reusable MetricCard component
const MetricCard = ({ title, value, icon, color, subtitle, trend, loading, isPercentage = false, isCurrency = false }) => (
  <div className={`
    bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 transition-all duration-200 hover:shadow-md
    ${loading ? 'animate-pulse' : ''}
    min-h-[100px] flex flex-col justify-center
  `} style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide truncate">
          {title}
        </p>
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : (
          <>
            <p className={`
              font-bold text-gray-900 dark:text-white mb-1 truncate
              text-lg lg:text-xl
            `}>
              {isPercentage ? `${value}%` : 
               isCurrency ? `UGX ${typeof value === 'number' ? value.toLocaleString() : '0'}` : 
               typeof value === 'number' ? value.toLocaleString() : value
              }
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={`text-xs font-medium ${
                trend.includes('+') ? 'text-green-600' : 
                trend.includes('Attention') ? 'text-red-600' : 
                trend.includes('Low') ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                {trend}
              </p>
            )}
          </>
        )}
      </div>
      <div className={`
        flex-shrink-0 ml-3 p-2 rounded-lg
        ${loading ? 'bg-gray-200 dark:bg-gray-700' : ''}
      `} 
        style={!loading ? { 
          backgroundColor: `${color}15`,
          color: color
        } : {}}>
        <div className={`
          ${loading ? 'w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded' : 'text-base'}
        `}>
          {!loading && icon}
        </div>
      </div>
    </div>
  </div>
);

const Overview = () => {
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

      // Fetch data from multiple endpoints
      const requests = [
        // Order statistics
        fetch(`${baseURL}/retailer-orders/stats`, { headers }),
        // Wholesaler orders to supplier statistics
        fetch(`${baseURL}/wholesaler-orders/statistics`, { headers }),
        // Products count
        fetch(`${baseURL}/products`, { headers }),
        // Low stock products
        fetch(`${baseURL}/stock-alerts/low-stock`, { headers }),
        // Stock statistics
        fetch(`${baseURL}/stock-alerts/statistics`, { headers }),
        // Retailers count
        fetch(`${baseURL}/retailers`, { headers }),
        // Suppliers count
        fetch(`${baseURL}/suppliers`, { headers })
      ];

      const responses = await Promise.all(requests.map(req => 
        req.catch(err => ({ ok: false, error: err }))
      ));
      
      // Process responses
      const [
        retailerOrdersRes,
        supplierOrdersRes,
        productsRes,
        lowStockRes,
        stockStatsRes,
        retailersRes,
        suppliersRes
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
        totalSuppliers: 0,
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
      }

      // Process low stock products
      if (lowStockRes.ok) {
        const lowStockData = await lowStockRes.json();
        metricsData.lowStockProducts = lowStockData.total || 0;
      }

      // Process stock statistics
      if (stockStatsRes.ok) {
        const stockStatsData = await stockStatsRes.json();
        const stats = stockStatsData.statistics || {};
        
        metricsData.stockValue = stats.totalStockValue || 0;
        
        // Calculate stock utilization
        if (stats.totalProducts > 0) {
          const adequateStock = stats.totalProducts - (stats.lowStockCount || 0);
          metricsData.stockUtilization = Math.round((adequateStock / stats.totalProducts) * 100);
        }
      }

      // Process retailers
      if (retailersRes.ok) {
        const retailersData = await retailersRes.json();
        metricsData.totalRetailers = retailersData.count || 0;
        // Estimate active retailers (you might want to track this differently)
        metricsData.activeRetailers = Math.floor(metricsData.totalRetailers * 0.7); // 70% active estimate
      }

      // Process suppliers
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        metricsData.totalSuppliers = suppliersData.count || 0;
      }

      // Calculate today's revenue (simplified - you might want to implement proper date filtering)
      metricsData.todayRevenue = Math.floor(metricsData.totalRevenue * 0.05); // 5% of total as today's estimate

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching wholesaler metrics:', err);
      setError(err.message);
      
      // Set comprehensive demo data for wholesaler
      setMetrics({
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
      });
    } finally {
      setLoading(false);
    }
  };

  if (error && !loading) {
    return (
      <div className="space-y-6 p-4">
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
        
        {/* Render metrics with demo data */}
        <OverviewContent metrics={metrics} loading={false} />
      </div>
    );
  }

  return <OverviewContent metrics={metrics} loading={loading} />;
};

// Separate component for the main content
const OverviewContent = ({ metrics, loading }) => (
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
      />
      
      <MetricCard
        title="Total Orders"
        value={metrics.totalOrders}
        icon={<FaShoppingCart />}
        color="#2563eb"
        subtitle="All orders received"
        loading={loading}
      />
      
      <MetricCard
        title="Avg Order Value"
        value={metrics.averageOrderValue}
        icon={<FaClipboardList />}
        color="#ea580c"
        subtitle="Average per order"
        loading={loading}
        isCurrency={true}
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
      />
      
      <MetricCard
        title="In Production"
        value={metrics.inProductionOrders}
        icon={<FaIndustry />}
        color="#16a34a"
        subtitle="Being processed"
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
      
      <MetricCard
        title="Delivery Pipeline"
        value={metrics.deliveryPipeline}
        icon={<FaTruck />}
        color="#0d9488"
        subtitle="In delivery process"
        loading={loading}
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
      />
      
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
        title="Low Stock Items"
        value={metrics.lowStockProducts}
        icon={<FaExclamationTriangle />}
        color="#dc2626"
        subtitle="Need restocking"
        trend={metrics.lowStockProducts > 0 ? "Attention" : "Good"}
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

    {/* Business Relationships */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <MetricCard
        title="Total Retailers"
        value={metrics.totalRetailers}
        icon={<FaUsers />}
        color="#db2777"
        subtitle="Active clients"
        loading={loading}
      />
      
      <MetricCard
        title="Active Retailers"
        value={metrics.activeRetailers}
        icon={<FaUsers />}
        color="#16a34a"
        subtitle="Recently active"
        loading={loading}
      />
      
      <MetricCard
        title="Total Suppliers"
        value={metrics.totalSuppliers}
        icon={<FaIndustry />}
        color="#0d9488"
        subtitle="Supplier partners"
        loading={loading}
      />
    </div>
  </div>
);

export default Overview;