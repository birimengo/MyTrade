import React, { useState, useEffect } from 'react';
import { 
  FaShoppingCart, 
  FaDollarSign, 
  FaBox, 
  FaChartLine, 
  FaExclamationTriangle,
  FaReceipt,
  FaFileInvoiceDollar,
  FaCalendarDay,
  FaChartBar,
  FaMoneyBillWave
} from 'react-icons/fa';

const Overview = () => {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalSalesCount: 0,
    totalSalesValue: 0,
    todaySalesCount: 0,
    todaySalesValue: 0,
    todayProfit: 0,
    totalProfit: 0,
    stockValue: 0,
    lowStockItems: 0,
    totalReceipts: 0,
    totalReceiptsValue: 0,
    totalStockItems: 0,
    originalStockValue: 0,
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

      // Use absolute URLs to avoid path issues
      const baseURL = 'http://localhost:5000/api';

      // Get today's date for filtering
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch data from endpoints that actually exist in your backend
      const requests = [
        // Orders statistics
        fetch(`${baseURL}/retailer-orders/stats`, { headers }),
        // Sales statistics  
        fetch(`${baseURL}/retailer-sales/stats`, { headers }),
        // Today's sales data
        fetch(`${baseURL}/retailer-sales?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}&limit=1000`, { headers }),
        // All sales data for total counts
        fetch(`${baseURL}/retailer-sales?limit=1000`, { headers }),
        // Stock statistics
        fetch(`${baseURL}/retailer-stocks/stats`, { headers }),
        // Receipts statistics
        fetch(`${baseURL}/retailer-receipts/stats`, { headers }),
        // Get all stocks to calculate detailed metrics
        fetch(`${baseURL}/retailer-stocks`, { headers }),
        // Get all receipts to calculate total receipt value
        fetch(`${baseURL}/retailer-receipts?limit=1000`, { headers })
      ];

      const responses = await Promise.all(requests);
      
      // Check if any response failed
      const failedResponse = responses.find(response => !response.ok);
      if (failedResponse) {
        const errorText = await failedResponse.text();
        console.error('API Error:', {
          status: failedResponse.status,
          statusText: failedResponse.statusText,
          body: errorText
        });
        
        // If it's an HTML response, the endpoint likely doesn't exist
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
          throw new Error('API endpoint not found or server error. Using demo data.');
        }
        
        throw new Error(`API error: ${failedResponse.status} ${failedResponse.statusText}`);
      }

      // Parse JSON responses
      const [ordersData, salesData, todaysSalesData, allSalesData, stockData, receiptsData, stocksData, allReceiptsData] = await Promise.all(
        responses.map(response => response.json())
      );

      console.log('API Responses:', { 
        ordersData, 
        salesData, 
        todaysSalesData, 
        allSalesData, 
        stockData, 
        receiptsData, 
        stocksData, 
        allReceiptsData 
      });

      // Calculate detailed stock metrics from the stocks array
      const stocks = stocksData?.stocks || [];
      const totalStockItems = stocks.length;
      
      // Calculate current stock value (using current quantity)
      const currentStockValue = stocks.reduce((total, stock) => {
        return total + (stock.quantity * stock.unitPrice);
      }, 0);
      
      // Calculate original stock value (using original quantity)
      const originalStockValue = stocks.reduce((total, stock) => {
        return total + (stock.originalQuantity * stock.unitPrice);
      }, 0);
      
      // Calculate stock utilization percentage
      const stockUtilization = originalStockValue > 0 
        ? ((currentStockValue / originalStockValue) * 100) 
        : 0;

      // Calculate total receipts value from receipts data
      const receipts = allReceiptsData?.receipts || allReceiptsData?.formattedReceipts || [];
      const totalReceiptsValue = receipts.reduce((total, receipt) => {
        // Handle both formatted and regular receipt objects
        const grandTotal = receipt.grandTotal || receipt.summary?.grandTotal || 0;
        return total + grandTotal;
      }, 0);

      // Get total receipts count from statistics or count the array
      const totalReceiptsCount = receiptsData?.statistics?.totalReceipts || receipts.length;

      // Calculate today's sales metrics
      const todaysSales = todaysSalesData?.sales || todaysSalesData || [];
      const todaySalesCount = todaysSales.length;
      const todaySalesValue = todaysSales.reduce((total, sale) => {
        const quantity = sale.quantity || 0;
        const sellingPrice = sale.sellingPrice || 0;
        return total + (quantity * sellingPrice);
      }, 0);

      // Calculate today's profit
      const todayProfit = todaysSales.reduce((total, sale) => {
        const profit = sale.profit || 0;
        return total + profit;
      }, 0);

      // Calculate total sales metrics from all sales data
      const allSales = allSalesData?.sales || allSalesData || [];
      const totalSalesCount = allSales.length;
      const totalSalesValue = allSales.reduce((total, sale) => {
        const quantity = sale.quantity || 0;
        const sellingPrice = sale.sellingPrice || 0;
        return total + (quantity * sellingPrice);
      }, 0);

      // Calculate total profit from all sales
      const totalProfit = allSales.reduce((total, sale) => {
        const profit = sale.profit || 0;
        return total + profit;
      }, 0);

      // Extract data with fallbacks
      setMetrics({
        totalOrders: ordersData?.totalOrders || 0,
        totalSalesCount: totalSalesCount,
        totalSalesValue: totalSalesValue,
        todaySalesCount: todaySalesCount,
        todaySalesValue: todaySalesValue,
        todayProfit: todayProfit,
        totalProfit: totalProfit,
        stockValue: currentStockValue || stockData?.totalValue || 0,
        lowStockItems: stockData?.lowStockCount || 0,
        totalReceipts: totalReceiptsCount,
        totalReceiptsValue: totalReceiptsValue,
        totalStockItems: totalStockItems,
        originalStockValue: originalStockValue,
        stockUtilization: Math.round(stockUtilization)
      });

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
      
      // Set comprehensive demo data for development
      const demoStockValue = 50000; // UGX 50,000 from your data
      const demoOriginalStockValue = 750000; // 150 headphones × UGX 5,000
      const demoStockUtilization = Math.round((demoStockValue / demoOriginalStockValue) * 100);
      const demoTotalReceiptsValue = 185000; // Demo total receipts value
      const demoTodaysSalesCount = 8; // Demo today's sales count
      const demoTodaysSalesValue = 2450; // Demo today's sales value
      const demoTodaysProfit = 680; // Demo today's profit
      const demoTotalSalesCount = 156; // Demo total sales count
      const demoTotalSalesValue = 45800; // Demo total sales value
      const demoTotalProfit = 12500; // Demo total profit
      
      setMetrics({
        totalOrders: 24,
        totalSalesCount: demoTotalSalesCount,
        totalSalesValue: demoTotalSalesValue,
        todaySalesCount: demoTodaysSalesCount,
        todaySalesValue: demoTodaysSalesValue,
        todayProfit: demoTodaysProfit,
        totalProfit: demoTotalProfit,
        stockValue: demoStockValue,
        lowStockItems: 3,
        totalReceipts: 18,
        totalReceiptsValue: demoTotalReceiptsValue,
        totalStockItems: 15,
        originalStockValue: demoOriginalStockValue,
        stockUtilization: demoStockUtilization
      });
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon, color, subtitle, trend, loading, isPercentage = false }) => (
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
                 typeof value === 'number' && (title.includes('Sales') || title.includes('Profit') || title.includes('Value') || title.includes('Receipts Value')) 
                  ? `UGX ${value.toLocaleString()}`
                  : value.toLocaleString()
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

        {/* Profit Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricCard
            title="Today's Profit"
            value={metrics.todayProfit}
            icon={<FaMoneyBillWave />}
            color="#16a34a"
            subtitle="Profit today"
            trend="+18%"
            loading={false}
          />
          
          <MetricCard
            title="Total Profit"
            value={metrics.totalProfit}
            icon={<FaChartLine />}
            color="#9333ea"
            subtitle="All time profit"
            loading={false}
          />
          
          <MetricCard
            title="Today's Sales"
            value={metrics.todaySalesValue}
            icon={<FaDollarSign />}
            color="#2563eb"
            subtitle="Revenue today"
            loading={false}
          />
          
          <MetricCard
            title="Total Sales"
            value={metrics.totalSalesValue}
            icon={<FaChartBar />}
            color="#4f46e5"
            subtitle="All time revenue"
            loading={false}
          />
        </div>

        {/* Sales & Orders */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricCard
            title="Today's Transactions"
            value={metrics.todaySalesCount}
            icon={<FaCalendarDay />}
            color="#ea580c"
            subtitle="Sales today"
            loading={false}
          />
          
          <MetricCard
            title="Total Transactions"
            value={metrics.totalSalesCount}
            icon={<FaShoppingCart />}
            color="#0d9488"
            subtitle="All time sales"
            loading={false}
          />
          
          <MetricCard
            title="Total Orders"
            value={metrics.totalOrders}
            icon={<FaShoppingCart />}
            color="#db2777"
            subtitle="Orders placed"
            loading={false}
          />
          
          <MetricCard
            title="Total Receipts"
            value={metrics.totalReceipts}
            icon={<FaReceipt />}
            color="#9333ea"
            subtitle="Receipts issued"
            loading={false}
          />
        </div>

        {/* Stock Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricCard
            title="Current Stock"
            value={metrics.stockValue}
            icon={<FaBox />}
            color="#ea580c"
            subtitle="Inventory value"
            loading={false}
          />
          
          <MetricCard
            title="Original Stock"
            value={metrics.originalStockValue}
            icon={<FaBox />}
            color="#2563eb"
            subtitle="Initial investment"
            loading={false}
          />
          
          <MetricCard
            title="Stock Utilization"
            value={metrics.stockUtilization}
            icon={<FaChartLine />}
            color="#0d9488"
            subtitle="Stock sold %"
            trend={metrics.stockUtilization < 50 ? "Low" : "Good"}
            loading={false}
            isPercentage={true}
          />
          
          <MetricCard
            title="Low Stock Alerts"
            value={metrics.lowStockItems}
            icon={<FaExclamationTriangle />}
            color="#dc2626"
            subtitle="Need restocking"
            trend={metrics.lowStockItems > 0 ? "Attention" : "Good"}
            loading={false}
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            title="Receipts Value"
            value={metrics.totalReceiptsValue}
            icon={<FaFileInvoiceDollar />}
            color="#16a34a"
            subtitle="Total receipts"
            loading={false}
          />
          
          <MetricCard
            title="Product Types"
            value={metrics.totalStockItems}
            icon={<FaBox />}
            color="#4f46e5"
            subtitle="Different products"
            loading={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {/* Profit Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          title="Today's Profit"
          value={metrics.todayProfit}
          icon={<FaMoneyBillWave />}
          color="#16a34a"
          subtitle="Profit today"
          trend="+18%"
          loading={loading}
        />
        
        <MetricCard
          title="Total Profit"
          value={metrics.totalProfit}
          icon={<FaChartLine />}
          color="#9333ea"
          subtitle="All time profit"
          loading={loading}
        />
        
        <MetricCard
          title="Today's Sales"
          value={metrics.todaySalesValue}
          icon={<FaDollarSign />}
          color="#2563eb"
          subtitle="Revenue today"
          loading={loading}
        />
        
        <MetricCard
          title="Total Sales"
          value={metrics.totalSalesValue}
          icon={<FaChartBar />}
          color="#4f46e5"
          subtitle="All time revenue"
          loading={loading}
        />
      </div>

      {/* Sales & Orders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          title="Today's Transactions"
          value={metrics.todaySalesCount}
          icon={<FaCalendarDay />}
          color="#ea580c"
          subtitle="Sales today"
          loading={loading}
        />
        
        <MetricCard
          title="Total Transactions"
          value={metrics.totalSalesCount}
          icon={<FaShoppingCart />}
          color="#0d9488"
          subtitle="All time sales"
          loading={loading}
        />
        
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={<FaShoppingCart />}
          color="#db2777"
          subtitle="Orders placed"
          loading={loading}
        />
        
        <MetricCard
          title="Total Receipts"
          value={metrics.totalReceipts}
          icon={<FaReceipt />}
          color="#9333ea"
          subtitle="Receipts issued"
          loading={loading}
        />
      </div>

      {/* Stock Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricCard
          title="Current Stock"
          value={metrics.stockValue}
          icon={<FaBox />}
          color="#ea580c"
          subtitle="Inventory value"
          loading={loading}
        />
        
        <MetricCard
          title="Original Stock"
          value={metrics.originalStockValue}
          icon={<FaBox />}
          color="#2563eb"
          subtitle="Initial investment"
          loading={loading}
        />
        
        <MetricCard
          title="Stock Utilization"
          value={metrics.stockUtilization}
          icon={<FaChartLine />}
          color="#0d9488"
          subtitle="Stock sold %"
          trend={metrics.stockUtilization < 50 ? "Low" : "Good"}
          loading={loading}
          isPercentage={true}
        />
        
        <MetricCard
          title="Low Stock Alerts"
          value={metrics.lowStockItems}
          icon={<FaExclamationTriangle />}
          color="#dc2626"
          subtitle="Need restocking"
          trend={metrics.lowStockItems > 0 ? "Attention" : "Good"}
          loading={loading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          title="Receipts Value"
          value={metrics.totalReceiptsValue}
          icon={<FaFileInvoiceDollar />}
          color="#16a34a"
          subtitle="Total receipts"
          loading={loading}
        />
        
        <MetricCard
          title="Product Types"
          value={metrics.totalStockItems}
          icon={<FaBox />}
          color="#4f46e5"
          subtitle="Different products"
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Overview;