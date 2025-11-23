import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaTrash, 
  FaFileExport,
  FaCalendar,
  FaUser,
  FaMoneyBillWave,
  FaReceipt,
  FaBox,
  FaPlus,
  FaTimes,
  FaPrint,
  FaWhatsapp,
  FaShareAlt
} from 'react-icons/fa';

const Sales = ({ 
  wholesaleSales = [], 
  searchTerm, 
  onSearchChange, 
  onViewSale, 
  onDeleteSale, 
  onCreateNewSale 
}) => {
  const [allSales, setAllSales] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(null);

  // Initialize sales data
  useEffect(() => {
    setAllSales(wholesaleSales);
  }, [wholesaleSales]);

  // Filter sales based on current filters
  const getFilteredSales = () => {
    let filtered = allSales;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.referenceNumber?.toLowerCase().includes(searchLower) ||
        sale.customerName?.toLowerCase().includes(searchLower) ||
        sale.customerPhone?.includes(searchTerm) ||
        sale.customerBusinessName?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentStatus === paymentFilter);
    }

    // Customer filter
    if (customerFilter !== 'all') {
      filtered = filtered.filter(sale => sale.customerName === customerFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= today;
          });
          break;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          filtered = filtered.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= startOfWeek;
          });
          break;
        case 'month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          filtered = filtered.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= startOfMonth;
          });
          break;
        default:
          break;
      }
    }

    return filtered;
  };

  // Get unique customers for filter
  const getUniqueCustomers = () => {
    const customers = [...new Set(allSales.map(sale => sale.customerName))].filter(Boolean);
    return customers.sort();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'green', text: '✓' },
      pending: { color: 'yellow', text: '⏳' },
      cancelled: { color: 'red', text: '✕' },
      refunded: { color: 'gray', text: '↩' }
    };
    const config = statusConfig[status] || { color: 'gray', text: '?' };
    return (
      <span className={`px-2 py-1 rounded text-xs bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900/30 dark:text-${config.color}-300`}>
        {config.text}
      </span>
    );
  };

  // Get payment badge
  const getPaymentBadge = (paymentStatus) => {
    const paymentConfig = {
      paid: { color: 'green', text: '💰' },
      pending: { color: 'yellow', text: '⏳' },
      partial: { color: 'blue', text: '💳' }
    };
    const config = paymentConfig[paymentStatus] || { color: 'gray', text: '?' };
    return (
      <span className={`px-2 py-1 rounded text-xs bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900/30 dark:text-${config.color}-300`}>
        {config.text}
      </span>
    );
  };

  // Generate receipt text for WhatsApp
  const generateReceiptText = (sale) => {
    const itemsText = sale.items?.map(item => 
      `• ${item.productName} (${item.quantity} x ${formatCurrency(item.unitPrice)}) = ${formatCurrency(item.total)}${item.discount > 0 ? ` - ${item.discount}% discount` : ''}`
    ).join('\n');

    return `🛍️ *SALES RECEIPT - TRADE UGANDA*

📋 *Reference:* ${sale.referenceNumber}
📅 *Date:* ${formatDate(sale.saleDate)}

👤 *CUSTOMER INFORMATION*
Name: ${sale.customerName}
Phone: ${sale.customerPhone}
${sale.customerBusinessName ? `Business: ${sale.customerBusinessName}` : ''}

🛒 *ITEMS PURCHASED*
${itemsText}

💰 *PAYMENT SUMMARY*
Subtotal: ${formatCurrency(sale.subtotal)}
Discount: -${formatCurrency(sale.totalDiscount)}
*Grand Total: ${formatCurrency(sale.grandTotal)}*
Amount Paid: ${formatCurrency(sale.amountPaid)}
${sale.balanceDue > 0 ? `Balance Due: ${formatCurrency(sale.balanceDue)}` : ''}

💳 *PAYMENT DETAILS*
Method: ${sale.paymentMethod?.replace('_', ' ').toUpperCase()}
Status: ${sale.paymentStatus?.toUpperCase()}

Thank you for your business! 🙏
*TRADE UGANDA*`;
  };

  // Share to WhatsApp as text
  const shareToWhatsAppText = (sale) => {
    const receiptText = generateReceiptText(sale);
    const phoneNumber = sale.customerPhone.replace(/\D/g, ''); // Remove non-digits
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(receiptText)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareOptions(null);
  };

  // Share to any WhatsApp number
  const shareToWhatsAppCustom = (sale) => {
    const receiptText = generateReceiptText(sale);
    const phoneNumber = prompt('Enter WhatsApp number (include country code, e.g., 256712345678):');
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(receiptText)}`;
      window.open(whatsappUrl, '_blank');
    }
    setShowShareOptions(null);
  };

  // Share as text (copy to clipboard)
  const shareAsText = (sale) => {
    const receiptText = generateReceiptText(sale);
    navigator.clipboard.writeText(receiptText)
      .then(() => {
        alert('Receipt copied to clipboard! You can now paste it anywhere.');
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = receiptText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Receipt copied to clipboard!');
      });
    setShowShareOptions(null);
  };

  // Print receipt
  const handlePrintReceipt = (sale) => {
    const receiptWindow = window.open('', '_blank');
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${sale.referenceNumber}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            margin: 20px; 
            font-size: 14px;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #000; 
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .business-name { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          .receipt-title { 
            font-size: 16px; 
            margin-bottom: 10px;
          }
          .section { 
            margin: 10px 0; 
          }
          .section-title { 
            font-weight: bold; 
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
          }
          .item-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            font-weight: bold; 
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            border-top: 2px dashed #000;
            padding-top: 10px;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">TRADE UGANDA</div>
          <div class="receipt-title">SALES RECEIPT</div>
          <div>Reference: ${sale.referenceNumber}</div>
          <div>Date: ${formatDate(sale.saleDate)}</div>
        </div>

        <div class="section">
          <div class="section-title">CUSTOMER INFORMATION</div>
          <div>Name: ${sale.customerName}</div>
          <div>Phone: ${sale.customerPhone}</div>
          ${sale.customerBusinessName ? `<div>Business: ${sale.customerBusinessName}</div>` : ''}
          ${sale.customerEmail ? `<div>Email: ${sale.customerEmail}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">ITEMS SOLD</div>
          ${sale.items?.map(item => `
            <div class="item-row">
              <div>${item.productName} (${item.quantity}x${formatCurrency(item.unitPrice)})</div>
              <div>${formatCurrency(item.total)}</div>
            </div>
            ${item.discount > 0 ? `<div style="font-size: 12px; color: #666; margin-left: 20px;">Discount: ${item.discount}%</div>` : ''}
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">PAYMENT SUMMARY</div>
          <div class="item-row">
            <div>Subtotal:</div>
            <div>${formatCurrency(sale.subtotal)}</div>
          </div>
          <div class="item-row">
            <div>Total Discount:</div>
            <div>-${formatCurrency(sale.totalDiscount)}</div>
          </div>
          <div class="total-row">
            <div>GRAND TOTAL:</div>
            <div>${formatCurrency(sale.grandTotal)}</div>
          </div>
          <div class="item-row">
            <div>Amount Paid:</div>
            <div>${formatCurrency(sale.amountPaid)}</div>
          </div>
          ${sale.balanceDue > 0 ? `
            <div class="item-row">
              <div>Balance Due:</div>
              <div>${formatCurrency(sale.balanceDue)}</div>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">PAYMENT DETAILS</div>
          <div>Method: ${sale.paymentMethod?.replace('_', ' ').toUpperCase()}</div>
          <div>Status: ${sale.paymentStatus?.toUpperCase()}</div>
          ${sale.saleNotes ? `<div>Notes: ${sale.saleNotes}</div>` : ''}
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Generated on: ${new Date().toLocaleDateString()}</div>
        </div>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
    
    setTimeout(() => {
      receiptWindow.print();
    }, 500);
  };

  // Handle delete sale with confirmation
  const handleDeleteSale = async (saleId, saleReference) => {
    if (window.confirm(`Are you sure you want to delete sale ${saleReference}? This action cannot be undone.`)) {
      try {
        await onDeleteSale(saleId);
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Failed to delete sale. Please try again.');
      }
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    setExportLoading(true);
    try {
      const filteredSales = getFilteredSales();
      let csv = 'Reference,Date,Customer,Phone,Items,Amount,Payment Method,Payment Status,Status\n';
      
      filteredSales.forEach(sale => {
        const itemsList = sale.items?.map(item => 
          `${item.productName} (${item.quantity})`
        ).join('; ') || '';
        
        csv += `"${sale.referenceNumber}","${formatDate(sale.saleDate)}","${sale.customerName}","${sale.customerPhone}","${itemsList}",${sale.grandTotal},"${sale.paymentMethod}","${sale.paymentStatus}","${sale.status}"\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data');
    } finally {
      setExportLoading(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setCustomerFilter('all');
    setDateFilter('all');
    onSearchChange('');
  };

  // Render share options dropdown
  const renderShareOptions = (sale) => {
    if (showShareOptions !== sale._id && showShareOptions !== sale.id) return null;

    return (
      <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
        <div className="p-2">
          <button
            onClick={() => shareToWhatsAppText(sale)}
            className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center"
          >
            <FaWhatsapp className="mr-2 text-green-500" />
            WhatsApp to Customer
          </button>
          <button
            onClick={() => shareToWhatsAppCustom(sale)}
            className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center"
          >
            <FaWhatsapp className="mr-2 text-green-500" />
            WhatsApp to Any Number
          </button>
          <button
            onClick={() => shareAsText(sale)}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center"
          >
            <FaShareAlt className="mr-2 text-blue-500" />
            Copy as Text
          </button>
        </div>
      </div>
    );
  };

  // Render filters
  const renderFilters = () => {
    if (!showFilters) return null;

    const uniqueCustomers = getUniqueCustomers();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <FaFilter className="mr-1 text-blue-500 text-xs" />
            Filters
          </h3>
          <button
            onClick={() => setShowFilters(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-xs"
          >
            <FaTimes />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
          </select>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Customers</option>
            {uniqueCustomers.map(customer => (
              <option key={customer} value={customer}>
                {customer}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <button
          onClick={clearFilters}
          className="w-full mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-1"
        >
          Clear All Filters
        </button>
      </div>
    );
  };

  // Render sales cards
  const renderSalesCards = () => {
    const filteredSales = getFilteredSales();

    if (allSales.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <FaReceipt className="text-3xl text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            No Sales Found
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            No sales have been recorded yet.
          </p>
          {onCreateNewSale && (
            <button
              onClick={onCreateNewSale}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
            >
              Create First Sale
            </button>
          )}
        </div>
      );
    }

    if (filteredSales.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <FaFilter className="text-2xl text-gray-400 dark:text-gray-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            No Matching Sales
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Try different search or filters
          </p>
          <button
            onClick={clearFilters}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
          >
            Clear Filters
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSales.map((sale) => (
          <div
            key={sale._id || sale.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow relative"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <FaCalendar className="text-gray-400 text-xs" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDisplayDate(sale.saleDate)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {sale.referenceNumber}
                </h3>
              </div>
              <div className="flex space-x-1">
                {getStatusBadge(sale.status)}
                {getPaymentBadge(sale.paymentStatus)}
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex items-center space-x-2 mb-2">
              <FaUser className="text-gray-400 text-xs flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {sale.customerName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {sale.customerPhone}
                </p>
              </div>
            </div>

            {/* Items Summary */}
            <div className="flex items-center space-x-2 mb-2">
              <FaBox className="text-gray-400 text-xs flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {sale.items?.length || 0} items • {formatCurrency(sale.grandTotal)}
              </span>
            </div>

            {/* Payment Details */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 capitalize">
              {sale.paymentMethod?.replace('_', ' ')} • {sale.paymentStatus}
              {sale.balanceDue > 0 && (
                <span className="text-orange-500 ml-1">
                  (Due: {formatCurrency(sale.balanceDue)})
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => onViewSale(sale._id || sale.id)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs flex items-center"
              >
                <FaEye className="mr-1" />
                View
              </button>
              
              <button
                onClick={() => handlePrintReceipt(sale)}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs flex items-center"
              >
                <FaPrint className="mr-1" />
                Print
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowShareOptions(showShareOptions === (sale._id || sale.id) ? null : (sale._id || sale.id))}
                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 text-xs flex items-center"
                >
                  <FaShareAlt className="mr-1" />
                  Share
                </button>
                {renderShareOptions(sale)}
              </div>
              
              <button
                onClick={() => handleDeleteSale(sale._id || sale.id, sale.referenceNumber)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs flex items-center"
              >
                <FaTrash className="mr-1" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3 p-3">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex-1">
            <div className="relative max-w-md">
              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search sales by reference, customer, phone..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FaFilter className="mr-1" />
              Filters
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={exportLoading}
              className="flex items-center px-2 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors disabled:opacity-50"
            >
              <FaFileExport className="mr-1" />
              {exportLoading ? '...' : 'Export'}
            </button>

            {onCreateNewSale && (
              <button
                onClick={onCreateNewSale}
                className="flex items-center px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
              >
                <FaPlus className="mr-1" />
                New Sale
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {getFilteredSales().length} of {allSales.length} sales
        </div>
      </div>

      {renderFilters()}
      {renderSalesCards()}
    </div>
  );
};

export default Sales;