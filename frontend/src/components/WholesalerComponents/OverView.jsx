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
  FaMoneyBillWave
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
  </div>
);

const Overview = () => {
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
          return total + (product.price * product.quantity);
        }, 0);
        
        // Calculate low stock items (products with quantity < 10 as example)
        metricsData.lowStockItems = products.filter(product => 
          product.quantity < 10
        ).length;
        
        // Calculate stock utilization (percentage of products with stock)
        const productsWithStock = products.filter(product => product.quantity > 0).length;
        metricsData.stockUtilization = products.length > 0 ? 
          Math.round((productsWithStock / products.length) * 100) : 0;
      }

      // Process retailers
      if (retailersRes.ok) {
        const retailersData = await retailersRes.json();
        metricsData.totalRetailers = retailersData.retailers?.length || 0;
      }

      setMetrics(metricsData);

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
      
      // Set demo data for development
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