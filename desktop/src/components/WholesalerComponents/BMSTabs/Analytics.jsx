import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaChartBar, 
  FaMoneyBillWave, 
  FaShoppingCart, 
  FaUsers, 
  FaBox, 
  FaFilter,
  FaCalendar,
  FaArrowUp,
  FaArrowDown,
  FaDollarSign,
  FaChartLine,
  FaChartPie,
  FaStar,
  FaReceipt,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaSearch,
  FaHistory,
  FaTable,
  FaFileExport,
  FaDownload,
  FaFileCsv,
  FaFileExcel
} from 'react-icons/fa';

const Analytics = ({ 
  businessMetrics = {},
  wholesaleSales = [],
  products = [],
  customers = []
}) => {
  const [dateRange, setDateRange] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [dateDetails, setDateDetails] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'daily', 'detailed'
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Calculate accurate profit with comprehensive cost handling
  const calculateAccurateProfit = (sales) => {
    let totalProfit = 0;
    let itemsWithMissingCost = 0;
    let itemsProcessed = 0;

    sales.forEach(sale => {
      sale.items?.forEach(saleItem => {
        itemsProcessed++;
        
        // Find actual product to get accurate cost
        const actualProduct = products.find(p => 
          p._id === saleItem.productId || p.id === saleItem.productId || p.name === saleItem.productName
        );
        
        // Determine cost price with fallbacks
        let actualCostPrice = null;
        
        // Priority 1: Use sale item cost price
        if (saleItem.costPrice && saleItem.costPrice > 0) {
          actualCostPrice = saleItem.costPrice;
        }
        // Priority 2: Use product cost price
        else if (actualProduct?.costPrice && actualProduct.costPrice > 0) {
          actualCostPrice = actualProduct.costPrice;
        }
        // Priority 3: Use product price with standard margin
        else if (actualProduct?.price && actualProduct.price > 0) {
          actualCostPrice = actualProduct.price * 0.7; // Assume 30% margin
        }
        // Priority 4: Use sale item unit price with standard margin
        else if (saleItem.unitPrice && saleItem.unitPrice > 0) {
          actualCostPrice = saleItem.unitPrice * 0.7; // Assume 30% margin
          itemsWithMissingCost++;
        }
        // Priority 5: Default fallback
        else {
          actualCostPrice = 0.01; // Minimum cost
          itemsWithMissingCost++;
        }

        const sellingPrice = saleItem.unitPrice || 0;
        const quantity = saleItem.quantity || 0;
        
        // Calculate profit for this item
        const itemProfit = (sellingPrice - actualCostPrice) * quantity;
        totalProfit += itemProfit;
      });
    });

    // Set debug info
    setDebugInfo({
      totalProfit,
      itemsProcessed,
      itemsWithMissingCost,
      percentageMissing: itemsProcessed > 0 ? (itemsWithMissingCost / itemsProcessed * 100).toFixed(1) : 0
    });

    return totalProfit;
  };

  // Get all unique dates from sales data
  const getAllSalesDates = () => {
    const dates = wholesaleSales.map(sale => {
      const saleDate = new Date(sale.saleDate || sale.createdAt);
      return saleDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    });
    
    return [...new Set(dates)].sort().reverse(); // Unique dates, sorted newest first
  };

  // Calculate daily profits for all time
  const calculateDailyProfits = () => {
    const dailyData = {};
    
    wholesaleSales.forEach(sale => {
      const saleDate = new Date(sale.saleDate || sale.createdAt);
      const dateKey = saleDate.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          displayDate: saleDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
          sales: [],
          revenue: 0,
          profit: 0,
          transactionCount: 0
        };
      }
      
      dailyData[dateKey].sales.push(sale);
      dailyData[dateKey].revenue += sale.grandTotal || sale.total || 0;
      dailyData[dateKey].transactionCount += 1;
    });

    // Calculate profit for each day
    Object.keys(dailyData).forEach(dateKey => {
      dailyData[dateKey].profit = calculateAccurateProfit(dailyData[dateKey].sales);
    });

    return Object.values(dailyData).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Get detailed data for a specific date
  const getDateDetails = (dateString) => {
    const salesOnDate = wholesaleSales.filter(sale => {
      const saleDate = new Date(sale.saleDate || sale.createdAt);
      return saleDate.toISOString().split('T')[0] === dateString;
    });

    const revenue = salesOnDate.reduce((sum, sale) => sum + (sale.grandTotal || sale.total || 0), 0);
    const profit = calculateAccurateProfit(salesOnDate);
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Get top products for the day
    const productSales = {};
    salesOnDate.forEach(sale => {
      sale.items?.forEach(item => {
        const productId = item.productId || item.productName;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0
          };
        }
        productSales[productId].quantity += item.quantity || 0;
        productSales[productId].revenue += item.total || (item.unitPrice * item.quantity) || 0;
        
        // Calculate profit for this product
        const actualProduct = products.find(p => 
          p._id === item.productId || p.id === item.productId || p.name === item.productName
        );
        
        let actualCostPrice = item.costPrice;
        if (!actualCostPrice || actualCostPrice <= 0) {
          if (actualProduct?.costPrice && actualProduct.costPrice > 0) {
            actualCostPrice = actualProduct.costPrice;
          } else if (actualProduct?.price && actualProduct.price > 0) {
            actualCostPrice = actualProduct.price * 0.7;
          } else if (item.unitPrice && item.unitPrice > 0) {
            actualCostPrice = item.unitPrice * 0.7;
          } else {
            actualCostPrice = 0.01;
          }
        }
        
        const itemProfit = (item.unitPrice - actualCostPrice) * item.quantity;
        productSales[productId].profit += itemProfit;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return {
      date: dateString,
      displayDate: new Date(dateString).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      sales: salesOnDate,
      revenue,
      profit,
      profitMargin,
      transactionCount: salesOnDate.length,
      topProducts,
      customers: [...new Set(salesOnDate.map(sale => sale.customerName))].filter(Boolean)
    };
  };

  // Handle date selection
  const handleDateSelect = (dateString) => {
    setSelectedDate(dateString);
    const details = getDateDetails(dateString);
    setDateDetails(details);
    setShowDateDetails(true);
  };

  // Calculate lifetime totals
  const calculateLifetimeTotals = () => {
    const totalRevenue = wholesaleSales.reduce((sum, sale) => sum + (sale.grandTotal || sale.total || 0), 0);
    const totalProfit = calculateAccurateProfit(wholesaleSales);
    const totalTransactions = wholesaleSales.length;
    const totalDays = getAllSalesDates().length;
    const averageDailyProfit = totalDays > 0 ? totalProfit / totalDays : 0;
    const averageDailyRevenue = totalDays > 0 ? totalRevenue / totalDays : 0;

    return {
      totalRevenue,
      totalProfit,
      totalTransactions,
      totalDays,
      averageDailyProfit,
      averageDailyRevenue,
      overallMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    };
  };

  // Calculate filtered metrics with accurate profit
  const calculateFilteredMetrics = () => {
    let filteredSales = wholesaleSales;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date range filter
    if (dateRange !== 'all') {
      switch (dateRange) {
        case 'today':
          filteredSales = filteredSales.filter(sale => 
            new Date(sale.saleDate || sale.createdAt).toDateString() === today.toDateString()
          );
          break;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - 7);
          filteredSales = filteredSales.filter(sale => 
            new Date(sale.saleDate || sale.createdAt) >= startOfWeek
          );
          break;
        case 'month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          filteredSales = filteredSales.filter(sale => 
            new Date(sale.saleDate || sale.createdAt) >= startOfMonth
          );
          break;
        default:
          break;
      }
    }

    // Customer filter
    if (customerFilter !== 'all') {
      filteredSales = filteredSales.filter(sale => sale.customerName === customerFilter);
    }

    const revenue = filteredSales.reduce((sum, sale) => sum + (sale.grandTotal || sale.total || 0), 0);
    const profit = calculateAccurateProfit(filteredSales);
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      sales: filteredSales.length,
      revenue,
      profit,
      profitMargin,
      filteredSales
    };
  };

  // Get most sold products with accurate profit
  const getMostSoldProducts = () => {
    const productSales = {};
    
    wholesaleSales.forEach(sale => {
      sale.items?.forEach(item => {
        const productId = item.productId || item.productName;
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
            costPrice: 0
          };
        }
        
        productSales[productId].quantity += item.quantity || 0;
        productSales[productId].revenue += item.total || (item.unitPrice * item.quantity) || 0;
        
        // Calculate accurate profit per product
        const actualProduct = products.find(p => 
          p._id === item.productId || p.id === item.productId || p.name === item.productName
        );
        
        let actualCostPrice = item.costPrice;
        if (!actualCostPrice || actualCostPrice <= 0) {
          if (actualProduct?.costPrice && actualProduct.costPrice > 0) {
            actualCostPrice = actualProduct.costPrice;
          } else if (actualProduct?.price && actualProduct.price > 0) {
            actualCostPrice = actualProduct.price * 0.7;
          } else if (item.unitPrice && item.unitPrice > 0) {
            actualCostPrice = item.unitPrice * 0.7;
          } else {
            actualCostPrice = 0.01;
          }
        }
        
        const sellingPrice = item.unitPrice || 0;
        const itemProfit = (sellingPrice - actualCostPrice) * (item.quantity || 0);
        productSales[productId].profit += Math.max(0, itemProfit);
        productSales[productId].costPrice = actualCostPrice;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  };

  // EXPORT FUNCTIONALITY
  const exportSalesData = async (format = 'csv') => {
    setExportLoading(true);
    try {
      const exportData = prepareExportData();
      
      if (format === 'csv') {
        exportToCSV(exportData);
      } else if (format === 'excel') {
        exportToExcel(exportData);
      }
      
      // Show success message
      setTimeout(() => {
        alert(`Sales data exported successfully as ${format.toUpperCase()}!`);
      }, 500);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Prepare data for export
  const prepareExportData = () => {
    const exportData = [];

    wholesaleSales.forEach(sale => {
      const saleDate = new Date(sale.saleDate || sale.createdAt);
      
      // If sale has multiple items, create a row for each item
      sale.items?.forEach((item, itemIndex) => {
        // Find actual product to get accurate cost
        const actualProduct = products.find(p => 
          p._id === item.productId || p.id === item.productId || p.name === item.productName
        );
        
        // Calculate cost price with same logic as profit calculation
        let actualCostPrice = item.costPrice;
        if (!actualCostPrice || actualCostPrice <= 0) {
          if (actualProduct?.costPrice && actualProduct.costPrice > 0) {
            actualCostPrice = actualProduct.costPrice;
          } else if (actualProduct?.price && actualProduct.price > 0) {
            actualCostPrice = actualProduct.price * 0.7;
          } else if (item.unitPrice && item.unitPrice > 0) {
            actualCostPrice = item.unitPrice * 0.7;
          } else {
            actualCostPrice = 0.01;
          }
        }

        const sellingPrice = item.unitPrice || 0;
        const quantity = item.quantity || 0;
        const itemProfit = (sellingPrice - actualCostPrice) * quantity;
        const profitMargin = sellingPrice > 0 ? (itemProfit / (sellingPrice * quantity)) * 100 : 0;

        exportData.push({
          // Sale Information
          'Sale ID': sale.referenceNumber || sale._id,
          'Sale Date': saleDate.toLocaleDateString('en-US'),
          'Sale Time': sale.saleTime || saleDate.toLocaleTimeString('en-US'),
          'Transaction Date': saleDate.toISOString().split('T')[0],
          
          // Customer Information
          'Customer Name': sale.customerName,
          'Customer Phone': sale.customerPhone,
          'Customer Email': sale.customerEmail,
          'Customer Business': sale.customerBusinessName,
          'Customer Type': sale.customerType,
          
          // Product Information
          'Product Name': item.productName,
          'Product SKU': actualProduct?.sku || 'N/A',
          'Product Category': actualProduct?.category || 'N/A',
          'Product Type': item.isCertifiedProduct ? 'Certified' : 'Regular',
          
          // Financial Details
          'Quantity': quantity,
          'Unit Cost Price': actualCostPrice.toFixed(2),
          'Unit Selling Price': sellingPrice.toFixed(2),
          'Total Cost': (actualCostPrice * quantity).toFixed(2),
          'Total Selling Price': item.total || (sellingPrice * quantity).toFixed(2),
          'Item Profit': itemProfit.toFixed(2),
          'Profit Margin %': profitMargin.toFixed(2),
          'Discount %': item.discount || 0,
          'Discount Amount': ((item.discount || 0) / 100 * (sellingPrice * quantity)).toFixed(2),
          
          // Sale Summary
          'Sale Subtotal': sale.subtotal || 0,
          'Sale Total Discount': sale.totalDiscount || 0,
          'Sale Grand Total': sale.grandTotal || sale.total || 0,
          'Amount Paid': sale.amountPaid || 0,
          'Balance Due': sale.balanceDue || 0,
          
          // Payment Information
          'Payment Method': sale.paymentMethod,
          'Payment Status': sale.paymentStatus,
          'Sale Status': sale.status,
          
          // Additional Info
          'Sale Notes': sale.saleNotes || '',
          'Item Index': itemIndex + 1,
          'Total Items in Sale': sale.items?.length || 0
        });
      });

      // If no items, still export sale header
      if (!sale.items || sale.items.length === 0) {
        exportData.push({
          'Sale ID': sale.referenceNumber || sale._id,
          'Sale Date': saleDate.toLocaleDateString('en-US'),
          'Sale Time': sale.saleTime || saleDate.toLocaleTimeString('en-US'),
          'Transaction Date': saleDate.toISOString().split('T')[0],
          'Customer Name': sale.customerName,
          'Customer Phone': sale.customerPhone,
          'Sale Grand Total': sale.grandTotal || sale.total || 0,
          'Payment Method': sale.paymentMethod,
          'Payment Status': sale.paymentStatus,
          'Product Name': 'NO ITEMS',
          'Quantity': 0,
          'Unit Selling Price': 0,
          'Item Profit': 0,
          'Notes': 'Sale has no items recorded'
        });
      }
    });

    return exportData;
  };

  // Export to CSV
  const exportToCSV = (data) => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-profit-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (simulated with CSV for now)
  const exportToExcel = (data) => {
    // For a real implementation, you might want to use a library like SheetJS
    // For now, we'll export as CSV with .xlsx extension
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-profit-data-${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export summary data
  const exportSummaryData = () => {
    const summaryData = {
      exportDate: new Date().toISOString(),
      summary: calculateLifetimeTotals(),
      dailyProfits: calculateDailyProfits(),
      topProducts: getMostSoldProducts(),
      totalRecords: wholesaleSales.length,
      dateRange: 'All Time'
    };

    const jsonContent = JSON.stringify(summaryData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-summary-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized calculations
  const filteredMetrics = useMemo(() => calculateFilteredMetrics(), [wholesaleSales, dateRange, customerFilter, products]);
  const mostSoldProducts = useMemo(() => getMostSoldProducts(), [wholesaleSales, products]);
  const dailyProfits = useMemo(() => calculateDailyProfits(), [wholesaleSales, products]);
  const lifetimeTotals = useMemo(() => calculateLifetimeTotals(), [wholesaleSales, products]);
  const allSalesDates = useMemo(() => getAllSalesDates(), [wholesaleSales]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format number compact
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return new Intl.NumberFormat().format(num || 0);
  };

  // Render compact metric card
  const renderMetricCard = (title, value, subtitle, icon, color, trend = null) => {
    const colorClasses = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-900/20', darkText: 'dark:text-blue-400' },
      green: { bg: 'bg-green-100', text: 'text-green-600', darkBg: 'dark:bg-green-900/20', darkText: 'dark:text-green-400' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-900/20', darkText: 'dark:text-purple-400' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-900/20', darkText: 'dark:text-orange-400' },
      red: { bg: 'bg-red-100', text: 'text-red-600', darkBg: 'dark:bg-red-900/20', darkText: 'dark:text-red-400' }
    };

    const colors = colorClasses[color] || colorClasses.blue;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {title.includes('Revenue') || title.includes('Profit') || title.includes('Average') ? formatCurrency(value) : formatNumber(value)}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
            {trend !== null && (
              <div className={`flex items-center mt-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-full ${colors.bg} ${colors.darkBg} ${colors.text} ${colors.darkText}`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  // Render daily profits table
  const renderDailyProfitsTable = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FaHistory className="mr-2 text-blue-500" />
          Daily Profit History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Transactions</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Profit</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Margin</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dailyProfits.map((day, index) => (
                <tr key={day.date} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                    {day.displayDate}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                    {day.transactionCount}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(day.revenue)}
                  </td>
                  <td className={`py-2 px-3 text-right font-semibold ${day.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(day.profit)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                    {day.revenue > 0 ? ((day.profit / day.revenue) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleDateSelect(day.date)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dailyProfits.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FaCalendarAlt className="mx-auto text-3xl mb-2 opacity-50" />
            <p>No sales data available</p>
          </div>
        )}
      </div>
    );
  };

  // Render date details modal
  const renderDateDetails = () => {
    if (!showDateDetails || !dateDetails) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sales Details for {dateDetails.displayDate}
              </h3>
              <button
                onClick={() => setShowDateDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">Transactions</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{dateDetails.transactionCount}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400">Revenue</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(dateDetails.revenue)}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p className="text-xs text-purple-600 dark:text-purple-400">Profit</p>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(dateDetails.profit)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <p className="text-xs text-orange-600 dark:text-orange-400">Margin</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{dateDetails.profitMargin.toFixed(1)}%</p>
              </div>
            </div>

            {/* Top Products */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Top Products</h4>
              <div className="space-y-2">
                {dateDetails.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{product.quantity} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">+{formatCurrency(product.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customers */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Customers ({dateDetails.customers.length})</h4>
              <div className="flex flex-wrap gap-2">
                {dateDetails.customers.map((customer, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300">
                    {customer}
                  </span>
                ))}
              </div>
            </div>

            {/* Sales List */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Sales Transactions</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dateDetails.sales.map((sale, index) => (
                  <div key={sale._id || index} className="p-3 border border-gray-200 dark:border-gray-700 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{sale.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sale.referenceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.grandTotal || sale.total)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sale.paymentMethod}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {sale.items?.length} items • {sale.paymentStatus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render lifetime overview
  const renderLifetimeOverview = () => {
    return (
      <div className="space-y-4">
        {/* Lifetime Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {renderMetricCard(
            'Total Revenue', 
            lifetimeTotals.totalRevenue, 
            `Over ${lifetimeTotals.totalDays} days`,
            <FaMoneyBillWave className="text-sm" />,
            'green'
          )}
          
          {renderMetricCard(
            'Total Profit', 
            lifetimeTotals.totalProfit, 
            `${lifetimeTotals.overallMargin.toFixed(1)}% margin`,
            <FaDollarSign className="text-sm" />,
            'purple'
          )}
          
          {renderMetricCard(
            'Total Transactions', 
            lifetimeTotals.totalTransactions, 
            `${allSalesDates.length} business days`,
            <FaShoppingCart className="text-sm" />,
            'blue'
          )}
          
          {renderMetricCard(
            'Avg Daily Profit', 
            lifetimeTotals.averageDailyProfit, 
            `Per day average`,
            <FaChartLine className="text-sm" />,
            'orange'
          )}
        </div>

        {/* Quick Date Access */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <FaCalendarAlt className="mr-2 text-blue-500" />
            Quick Date Access
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {allSalesDates.slice(0, 12).map((date) => (
              <button
                key={date}
                onClick={() => handleDateSelect(date)}
                className="p-2 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {new Date(date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </button>
            ))}
          </div>
          {allSalesDates.length > 12 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              +{allSalesDates.length - 12} more dates available
            </p>
          )}
        </div>

        {/* Recent Days Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <FaHistory className="mr-2 text-purple-500" />
            Recent Days Performance
          </h3>
          <div className="space-y-2">
            {dailyProfits.slice(0, 7).map((day, index) => (
              <div key={day.date} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{day.displayDate}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{day.transactionCount} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatCurrency(day.revenue)}</p>
                  <p className={`text-xs ${day.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    +{formatCurrency(day.profit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-3">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <FaChartBar className="mr-2 text-blue-500" />
              Profit Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Complete profit tracking across all business days • {allSalesDates.length} days of data
            </p>
          </div>
          
          {/* View Mode Toggle and Export Buttons */}
          <div className="flex flex-wrap gap-2 mt-3 lg:mt-0">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {['overview', 'daily', 'detailed'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {mode === 'overview' ? 'Overview' : mode === 'daily' ? 'Daily View' : 'Detailed'}
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              {/* Format Selection */}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>

              {/* Main Export Button */}
              <button
                onClick={() => exportSalesData(exportFormat)}
                disabled={exportLoading || wholesaleSales.length === 0}
                className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FaDownload className="mr-1" />
                    Export Data
                  </>
                )}
              </button>

              {/* Summary Export */}
              <button
                onClick={exportSummaryData}
                disabled={exportLoading || wholesaleSales.length === 0}
                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaFileExport className="mr-1" />
                Summary
              </button>
            </div>

            {/* Filters */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'overview' && renderLifetimeOverview()}
      
      {viewMode === 'daily' && renderDailyProfitsTable()}
      
      {viewMode === 'detailed' && (
        <div className="space-y-4">
          {renderLifetimeOverview()}
          {renderDailyProfitsTable()}
        </div>
      )}

      {/* Date Details Modal */}
      {renderDateDetails()}

      {/* Debug Info */}
      {debugInfo && debugInfo.itemsWithMissingCost > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center text-yellow-800 dark:text-yellow-200 text-xs">
            <FaExclamationTriangle className="mr-2" />
            <span>
              Cost data estimated for {debugInfo.itemsWithMissingCost} items ({debugInfo.percentageMissing}% of total)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;