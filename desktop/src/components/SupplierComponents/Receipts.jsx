// src/components/SupplierComponents/Receipts.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '../../context/DarkModeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  FaFileAlt, 
  FaEye, 
  FaPrint, 
  FaTrash, 
  FaTimes, 
  FaShare, 
  FaUser,
  FaCalendar,
  FaCreditCard,
  FaReceipt,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
  FaDollarSign,
  FaBox,
  FaSearch,
  FaFilter,
  FaDownload,
  FaSync
} from 'react-icons/fa';
import html2canvas from 'html2canvas';

const ReceiptsTab = ({ apiCall, isDarkMode, isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailedReceipt, setDetailedReceipt] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const receiptRef = useRef();

  // Load receipts from API
  const loadReceipts = async () => {
    try {
      setLoading(true);
      
      const response = await apiCall('/supplier-receipts?limit=1000');
      
      if (response && response.success) {
        const transformedReceipts = response.receipts.map(receipt => ({
          id: receipt._id,
          receiptId: receipt.receiptNumber || `RCP-${receipt._id.slice(-6)}`,
          orderId: receipt.sales && receipt.sales.length > 0 ? 
                   `SALE-${receipt.sales[0]?.saleNumber || receipt.sales[0]?._id?.slice(-6) || 'N/A'}` : 
                   'NO-SALES',
          customer: receipt.customerDetails?.name || 'Walk-in Customer',
          customerDetails: receipt.customerDetails || {},
          amount: receipt.totalAmount || 0,
          profit: receipt.totalProfit || 0,
          taxAmount: receipt.taxAmount || 0,
          discountAmount: receipt.discountAmount || 0,
          date: new Date(receipt.receiptDate || receipt.createdAt).toISOString().split('T')[0],
          datetime: receipt.receiptDate || receipt.createdAt,
          type: receipt.status === 'refunded' ? 'refund' : 'sale',
          status: receipt.status || 'completed',
          paymentMethod: receipt.paymentMethod || 'cash',
          notes: receipt.notes || '',
          salesCount: receipt.sales?.length || 0,
          itemsCount: receipt.sales?.reduce((total, sale) => 
            total + (sale.items?.length || 0), 0) || 0,
          totalItemsQuantity: receipt.sales?.reduce((total, sale) => 
            total + (sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0), 0) || 0,
          sales: receipt.sales || [],
          originalData: receipt
        }));
        
        // Sort by date (newest first)
        transformedReceipts.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        
        setReceipts(transformedReceipts);
        setFilteredReceipts(transformedReceipts);
      } else {
        throw new Error(response?.message || 'Failed to load receipts');
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      alert('Error: Failed to load receipts. Please check your connection and try again.');
      setReceipts([]);
      setFilteredReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load detailed receipt data
  const loadDetailedReceipt = async (receiptId) => {
    try {
      const response = await apiCall(`/supplier-receipts/${receiptId}`);
      if (response && response.success) {
        setDetailedReceipt(response.receipt);
      }
    } catch (error) {
      console.error('Error loading detailed receipt:', error);
      alert('Error: Failed to load receipt details');
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = receipts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(receipt => receipt.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(receipt => receipt.type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      filtered = filtered.filter(receipt => {
        const receiptDate = new Date(receipt.datetime);
        
        switch (dateFilter) {
          case 'today':
            return receiptDate >= today;
          case 'yesterday':
            return receiptDate >= yesterday && receiptDate < today;
          case 'week':
            return receiptDate >= lastWeek;
          case 'month':
            return receiptDate >= lastMonth;
          default:
            return true;
        }
      });
    }

    setFilteredReceipts(filtered);
  }, [receipts, searchTerm, statusFilter, typeFilter, dateFilter]);

  useEffect(() => {
    loadReceipts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReceipts();
  };

  const viewReceiptDetails = async (receipt) => {
    setSelectedReceipt(receipt);
    setModalVisible(true);
    await loadDetailedReceipt(receipt.id);
  };

  const printReceipt = async (receipt) => {
    try {
      if (confirm(`Would you like to print receipt ${receipt.receiptId}?`)) {
        // In a real app, you would integrate with a printing library
        // For now, we'll open a print dialog with the receipt content
        const printWindow = window.open('', '_blank');
        const receiptContent = generateReceiptHTML(receipt);
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt ${receipt.receiptId}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 300px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .business-info { text-align: center; margin-bottom: 15px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
              </style>
            </head>
            <body>
              ${receiptContent}
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 1000);
                }
              </script>
            </body>
          </html>
        `);
        
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error preparing print:', error);
      alert('Error: Failed to prepare receipt for printing');
    }
  };

  const generateReceiptHTML = (receipt) => {
    const allItems = getAllItemsFromReceipt();
    const customer = detailedReceipt?.customerDetails || receipt.customerDetails;
    
    return `
      <div class="receipt">
        <div class="header">
          <h2>OFFICIAL RECEIPT</h2>
          <h3>#${receipt.receiptId}</h3>
        </div>
        
        <div class="business-info">
          <p><strong>${user?.businessName || 'Your Business Name'}</strong></p>
          <p>${user?.businessAddress || 'Business Address'}</p>
          <p>Tel: ${user?.phone || '+256 XXX XXX XXX'}</p>
        </div>
        
        <div>
          <p><strong>Date:</strong> ${formatDateTime(receipt.datetime)}</p>
          <p><strong>Customer:</strong> ${customer?.name || 'Walk-in Customer'}</p>
          <p><strong>Payment:</strong> ${getPaymentMethodText(receipt.paymentMethod)}</p>
        </div>
        
        <hr>
        <div>
          ${allItems.map(item => `
            <div class="item">
              <span>${item.productName || 'Product'} (${item.quantity})</span>
              <span>UGX ${formatCurrency(item.unitPrice * item.quantity)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          <div class="item">
            <span>Total:</span>
            <span>UGX ${formatCurrency(receipt.amount)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${receipt.notes || ''}</p>
        </div>
      </div>
    `;
  };

  const captureAndShareReceipt = async (receipt) => {
    try {
      setSharing(true);
      
      if (!receiptRef.current) {
        throw new Error('Receipt view not ready');
      }

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Create download link
      const link = document.createElement('a');
      link.download = `receipt-${receipt.receiptId}.jpg`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Success: Receipt image downloaded! You can now share it.');

    } catch (error) {
      console.error('Error capturing receipt as image:', error);
      alert('Error: Failed to capture receipt as image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const shareReceiptAsText = async (receipt) => {
    try {
      const receiptText = generateReceiptText(receipt);
      
      if (navigator.share) {
        await navigator.share({
          title: `Receipt ${receipt.receiptId}`,
          text: receiptText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(receiptText);
        alert('Success: Receipt copied to clipboard!');
      } else {
        // Fallback
        alert(`Receipt ${receipt.receiptId}:\n\n${receiptText}`);
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      if (error.name !== 'AbortError') {
        alert('Error: Failed to share receipt');
      }
    }
  };

  const shareReceipt = async (receipt) => {
    const shareMethod = confirm('Share as image (OK) or as text (Cancel)?') ? 'image' : 'text';
    
    if (shareMethod === 'image') {
      await captureAndShareReceipt(receipt);
    } else {
      await shareReceiptAsText(receipt);
    }
  };

  const generateReceiptText = (receipt) => {
    const allItems = getAllItemsFromReceipt();
    const totalItemsQuantity = allItems.reduce((total, item) => total + (item.quantity || 0), 0);

    return `
🛒 RECEIPT ${receipt.receiptId}
==============================

Customer: ${receipt.customerDetails?.name || 'Walk-in Customer'}
Date: ${formatDateTime(receipt.datetime)}
Payment: ${getPaymentMethodText(receipt.paymentMethod)}
Status: ${getStatusText(receipt.status)}

ITEMS SOLD:
==============================
${allItems.map((item, index) => 
  `${index + 1}. ${item.productName || 'Product'}
   Qty: ${item.quantity} × UGX ${formatCurrency(item.unitPrice)}
   Total: UGX ${formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}`
).join('\n')}

SUMMARY:
==============================
Total Items: ${totalItemsQuantity}
Subtotal: UGX ${formatCurrency(receipt.amount)}
${receipt.taxAmount > 0 ? `Tax: UGX ${formatCurrency(receipt.taxAmount)}\n` : ''}
${receipt.discountAmount > 0 ? `Discount: -UGX ${formatCurrency(receipt.discountAmount)}\n` : ''}
GRAND TOTAL: UGX ${formatCurrency(receipt.amount)}

${receipt.notes ? `Notes: ${receipt.notes}` : ''}

Thank you for your business! 🎉
    `.trim();
  };

  const deleteReceipt = async (receipt) => {
    if (!confirm(`Are you sure you want to delete receipt ${receipt.receiptId}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      const response = await apiCall(`/supplier-receipts/${receipt.id}`, {
        method: 'DELETE'
      });

      if (response && response.success) {
        alert('Success: Receipt deleted successfully');
        loadReceipts();
      } else {
        throw new Error(response?.message || 'Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Error: Failed to delete receipt. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelReceipt = async (receipt) => {
    if (receipt.status === 'cancelled') {
      alert('This receipt is already cancelled.');
      return;
    }

    if (!confirm(`Are you sure you want to cancel receipt ${receipt.receiptId}?`)) {
      return;
    }

    try {
      const response = await apiCall(`/supplier-receipts/${receipt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: 'Cancelled by user'
        })
      });

      if (response && response.success) {
        alert('Success: Receipt cancelled successfully');
        loadReceipts();
      } else {
        throw new Error(response?.message || 'Failed to cancel receipt');
      }
    } catch (error) {
      console.error('Error cancelling receipt:', error);
      alert('Error: Failed to cancel receipt. Please try again.');
    }
  };

  // Helper functions
  const getTypeColor = (type) => {
    return type === 'sale' ? '#10B981' : '#EF4444';
  };

  const getTypeIcon = (type) => {
    return FaReceipt;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#F59E0B';
      case 'pending': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'mobile_money': return 'Mobile Money';
      case 'bank_transfer': return 'Bank Transfer';
      case 'credit': return 'Credit';
      case 'multiple': return 'Multiple Methods';
      default: return method?.replace('_', ' ') || 'Cash';
    }
  };

  const getAllItemsFromReceipt = () => {
    if (!detailedReceipt || !detailedReceipt.sales) return [];
    
    const allItems = [];
    detailedReceipt.sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          allItems.push({
            ...item,
            saleNumber: sale.saleNumber,
            saleDate: sale.saleDate
          });
        });
      }
    });
    return allItems;
  };

  const getTotalItemsQuantity = () => {
    const allItems = getAllItemsFromReceipt();
    return allItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  // Calculate metrics
  const totalReceipts = receipts.length;
  const salesReceipts = receipts.filter(r => r.type === 'sale').length;
  const refundReceipts = receipts.filter(r => r.type === 'refund').length;
  const cancelledReceipts = receipts.filter(r => r.status === 'cancelled').length;
  const totalRevenue = receipts.filter(r => r.type === 'sale').reduce((sum, r) => sum + r.amount, 0);
  const totalProfit = receipts.filter(r => r.type === 'sale').reduce((sum, r) => sum + (r.profit || 0), 0);

  // Receipt Item Component
  const ReceiptItem = ({ receipt }) => {
    const TypeIcon = getTypeIcon(receipt.type);
    const typeColor = getTypeColor(receipt.type);
    const statusColor = getStatusColor(receipt.status);

    return (
      <div className={`rounded-xl border p-4 transition-all hover:shadow-md ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <TypeIcon className="w-5 h-5 mt-0.5" style={{ color: typeColor }} />
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-sm truncate ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {receipt.receiptId}
              </h3>
              <p className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {receipt.salesCount} sales • {receipt.itemsCount} items
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}></div>
            <span className="text-xs font-medium" style={{ color: statusColor }}>
              {getStatusText(receipt.status)}
            </span>
          </div>
        </div>
        
        {/* Details Section */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <FaUser className={`w-3 h-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm truncate flex-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {receipt.customer}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <FaCalendar className={`w-3 h-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {formatDate(receipt.date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <FaCreditCard className={`w-3 h-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {getPaymentMethodText(receipt.paymentMethod)}
            </span>
          </div>
        </div>
        
        {/* Amount Section */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className={`font-bold text-lg ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              UGX {formatCurrency(receipt.amount)}
            </p>
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Profit: UGX {formatCurrency(receipt.profit)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => viewReceiptDetails(receipt)}
            className={`flex items-center gap-1 flex-1 justify-center py-2 px-3 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-blue-400' 
                : 'bg-white border-gray-300 hover:bg-gray-50 text-blue-600'
            }`}
          >
            <FaEye className="w-3 h-3" />
            <span className="text-xs font-medium">View</span>
          </button>
          
          <button
            onClick={() => printReceipt(receipt)}
            className={`flex items-center gap-1 flex-1 justify-center py-2 px-3 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FaPrint className="w-3 h-3" />
            <span className={`text-xs font-medium ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Print
            </span>
          </button>

          <button
            onClick={() => shareReceipt(receipt)}
            className={`flex items-center gap-1 flex-1 justify-center py-2 px-3 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-green-400' 
                : 'bg-white border-gray-300 hover:bg-gray-50 text-green-600'
            }`}
          >
            <FaShare className="w-3 h-3" />
            <span className="text-xs font-medium">Share</span>
          </button>
        </div>

        {/* Admin Actions */}
        <div className="flex gap-2 mt-2">
          {receipt.status !== 'cancelled' && (
            <button
              onClick={() => cancelReceipt(receipt)}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-white border-gray-300 hover:bg-gray-50 text-yellow-600'
              }`}
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={() => deleteReceipt(receipt)}
            disabled={deleting}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-red-400 disabled:opacity-50' 
                : 'bg-white border-gray-300 hover:bg-gray-50 text-red-600 disabled:opacity-50'
            }`}
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    );
  };

  // Receipt Image Template for Sharing
  const ReceiptImageTemplate = ({ receipt }) => {
    const allItems = getAllItemsFromReceipt();
    const customer = detailedReceipt?.customerDetails || receipt.customerDetails;
    const totalItemsQuantity = getTotalItemsQuantity();
    
    return (
      <div ref={receiptRef} className="bg-white p-6 border-2 border-black max-w-md mx-auto">
        {/* Receipt Header */}
        <div className="text-center mb-4 border-b-2 border-black pb-2">
          <h1 className="text-xl font-bold mb-1">OFFICIAL RECEIPT</h1>
          <p className="text-lg font-bold">#{receipt.receiptId}</p>
        </div>

        {/* Business Info */}
        <div className="text-center mb-4">
          <p className="text-lg font-bold mb-1">{user?.businessName || 'Your Business Name'}</p>
          <p className="text-sm">{user?.businessAddress || 'Business Address, City'}</p>
          <p className="text-sm">Phone: {user?.phone || '+256 XXX XXX XXX'}</p>
        </div>

        {/* Receipt Details */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-bold">Date:</span>
            <span className="text-sm">{formatDateTime(receipt.datetime)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-bold">Customer:</span>
            <span className="text-sm">{customer?.name || 'Walk-in Customer'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-bold">Payment Method:</span>
            <span className="text-sm">{getPaymentMethodText(receipt.paymentMethod)}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <div className="flex border-b border-black pb-1 mb-2">
            <span className="text-xs font-bold flex-1">ITEM</span>
            <span className="text-xs font-bold w-12 text-center">QTY</span>
            <span className="text-xs font-bold w-16 text-center">PRICE</span>
            <span className="text-xs font-bold w-16 text-center">TOTAL</span>
          </div>

          {allItems.map((item, index) => (
            <div key={index} className="flex mb-1">
              <span className="text-xs flex-1">{item.productName || 'Product'}</span>
              <span className="text-xs w-12 text-center">{item.quantity}</span>
              <span className="text-xs w-16 text-center">UGX {formatCurrency(item.unitPrice)}</span>
              <span className="text-xs w-16 text-center font-bold">UGX {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-black pt-2">
          <div className="flex justify-between mb-1">
            <span className="text-sm">Subtotal:</span>
            <span className="text-sm">UGX {formatCurrency(receipt.amount)}</span>
          </div>
          {receipt.taxAmount > 0 && (
            <div className="flex justify-between mb-1">
              <span className="text-sm">Tax:</span>
              <span className="text-sm">UGX {formatCurrency(receipt.taxAmount)}</span>
            </div>
          )}
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between mb-1">
              <span className="text-sm">Discount:</span>
              <span className="text-sm">-UGX {formatCurrency(receipt.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-black pt-2 mt-2">
            <span className="font-bold">TOTAL:</span>
            <span className="font-bold">UGX {formatCurrency(receipt.amount)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 border-t border-black pt-2">
          <p className="font-bold mb-1">Thank you for your business!</p>
          <p className="text-xs">Items: {totalItemsQuantity} | Receipt: {receipt.receiptId}</p>
          {receipt.notes && (
            <p className="text-xs italic mt-1">Notes: {receipt.notes}</p>
          )}
        </div>
      </div>
    );
  };

  // Receipt Details Modal
  const ReceiptDetailsModal = () => {
    if (!selectedReceipt) return null;

    const allItems = getAllItemsFromReceipt();
    const customer = detailedReceipt?.customerDetails || selectedReceipt.customerDetails;
    const totalItemsQuantity = getTotalItemsQuantity();
    const TypeIcon = getTypeIcon(selectedReceipt.type);
    const typeColor = getTypeColor(selectedReceipt.type);

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isDarkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
      }`}>
        <div className={`w-full max-w-4xl rounded-xl shadow-2xl max-h-[95vh] flex flex-col ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Modal Header */}
          <div className={`flex items-start justify-between p-6 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-start gap-3 flex-1">
              <TypeIcon className="w-6 h-6 mt-0.5" style={{ color: typeColor }} />
              <div className="flex-1">
                <h2 className={`text-lg font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Receipt Details
                </h2>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {selectedReceipt.receiptId} • {formatDate(selectedReceipt.date)}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setModalVisible(false)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <FaTimes className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Hidden receipt image template for sharing */}
            <div className="fixed left-[-1000px] top-[-1000px] opacity-0">
              <ReceiptImageTemplate receipt={selectedReceipt} />
            </div>

            {/* Receipt Information */}
            <div className={`rounded-xl border p-6 mb-6 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Receipt Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Receipt Number
                  </p>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedReceipt.receiptId}
                  </p>
                </div>
                
                <div>
                  <p className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Date & Time
                  </p>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatDateTime(selectedReceipt.datetime)}
                  </p>
                </div>

                <div>
                  <p className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(selectedReceipt.status) }}></div>
                    <span className="text-sm font-medium" style={{ color: getStatusColor(selectedReceipt.status) }}>
                      {getStatusText(selectedReceipt.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Payment Method
                  </p>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {getPaymentMethodText(selectedReceipt.paymentMethod)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className={`rounded-xl border p-6 mb-6 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Customer Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Name
                  </p>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {customer?.name || 'Walk-in Customer'}
                  </p>
                </div>
                
                {customer?.email && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Email
                    </p>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {customer.email}
                    </p>
                  </div>
                )}
                
                {customer?.phone && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Phone
                    </p>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {customer.phone}
                    </p>
                  </div>
                )}
                
                {customer?.address && (
                  <div className="md:col-span-2">
                    <p className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Address
                    </p>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {customer.address}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            {allItems.length > 0 ? (
              <div className={`rounded-xl border p-6 mb-6 ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Items Sold ({allItems.length})
                  </h3>
                  <div className="text-right">
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Total Quantity: {totalItemsQuantity}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {allItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-start py-3 border-b border-gray-300 dark:border-gray-600 last:border-0">
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.productName || 'Product'}
                        </p>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {item.quantity} × UGX {formatCurrency(item.unitPrice)}
                        </p>
                        {item.saleNumber && (
                          <p className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          } italic`}>
                            Sale: {item.saleNumber}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          UGX {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}
                        </p>
                        {item.profit !== undefined && (
                          <p className={`text-xs ${
                            (item.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            Profit: UGX {formatCurrency(item.profit)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`rounded-xl border p-6 mb-6 ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Items Sold
                </h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No items found for this receipt
                </p>
              </div>
            )}

            {/* Financial Summary */}
            <div className={`rounded-xl border p-6 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Financial Summary
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    UGX {formatCurrency(selectedReceipt.amount)}
                  </span>
                </div>
                
                {selectedReceipt.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tax</span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      UGX {formatCurrency(selectedReceipt.taxAmount)}
                    </span>
                  </div>
                )}
                
                {selectedReceipt.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Discount</span>
                    <span className="text-red-500">
                      -UGX {formatCurrency(selectedReceipt.discountAmount)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                  <span className={`font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Total Amount
                  </span>
                  <span className={`font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    UGX {formatCurrency(selectedReceipt.amount)}
                  </span>
                </div>
                
                <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Total Profit
                  </span>
                  <span className={(selectedReceipt.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                    UGX {formatCurrency(selectedReceipt.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedReceipt.notes && (
              <div className={`rounded-xl border p-6 mt-6 ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Notes
                </h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {selectedReceipt.notes}
                </p>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className={`flex gap-3 p-6 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => setModalVisible(false)}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
            
            <button
              onClick={() => shareReceipt(selectedReceipt)}
              disabled={sharing}
              className="flex items-center gap-2 flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 justify-center"
            >
              <FaShare className="w-4 h-4" />
              {sharing ? 'Sharing...' : 'Share'}
            </button>
            
            <button
              onClick={() => {
                setModalVisible(false);
                setTimeout(() => printReceipt(selectedReceipt), 300);
              }}
              className="flex items-center gap-2 flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors justify-center"
            >
              <FaPrint className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className={`rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } p-6`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Loading Receipts...
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
          <FaFileAlt className={`w-5 h-5 ${
            isDarkMode ? 'text-pink-400' : 'text-pink-600'
          }`} />
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Receipts Management
          </h2>
        </div>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Manage and view all transaction receipts
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 text-center ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {totalReceipts}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total Receipts
          </p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`text-2xl font-bold mb-1 text-green-500`}>
            {salesReceipts}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Sales
          </p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`text-2xl font-bold mb-1 text-blue-500`}>
            UGX {formatCurrency(totalRevenue)}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total Revenue
          </p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`text-2xl font-bold mb-1 text-green-500`}>
            UGX {formatCurrency(totalProfit)}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total Profit
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`rounded-xl border p-4 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            }`}>
              <FaSearch className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`flex-1 bg-transparent outline-none ${
                  isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Types</option>
              <option value="sale">Sales</option>
              <option value="refund">Refunds</option>
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {[
            { value: 'all', label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value)}
              className={`px-3 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                dateFilter === filter.value
                  ? 'bg-pink-600 border-pink-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Receipts List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Receipts • {filteredReceipts.length} of {receipts.length}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 disabled:opacity-50' 
                  : 'hover:bg-gray-100 disabled:opacity-50'
              }`}
            >
              <FaSync className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {filteredReceipts.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
          } p-12 text-center`}>
            <FaReceipt className={`mx-auto w-8 h-8 mb-3 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`font-medium mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {receipts.length === 0 ? 'No receipts found' : 'No receipts match your filters'}
            </p>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              {receipts.length === 0 
                ? 'Your receipts will appear here once created' 
                : 'Try adjusting your search or filters'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReceipts.map((receipt) => (
              <ReceiptItem key={receipt.id} receipt={receipt} />
            ))}
          </div>
        )}
      </div>

      {/* Receipt Details Modal */}
      {modalVisible && <ReceiptDetailsModal />}
    </div>
  );
};

export default ReceiptsTab;