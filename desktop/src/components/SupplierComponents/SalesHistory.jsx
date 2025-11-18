// src/components/SupplierComponents/SalesHistory.jsx
import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaHistory, 
  FaReceipt, 
  FaUser, 
  FaCalendar, 
  FaBox, 
  FaDollarSign,
  FaCreditCard,
  FaCheck,
  FaTimes,
  FaPlus,
  FaEye,
  FaFileExport
} from 'react-icons/fa';

const SalesHistoryTab = ({ apiCall, isDarkMode, isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [existingReceipts, setExistingReceipts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showCreateReceiptModal, setShowCreateReceiptModal] = useState(false);
  const [receiptNotes, setReceiptNotes] = useState('');

  const loadSalesHistory = async () => {
    try {
      setLoading(true);
      
      // Load both sales and receipts to cross-reference
      const [salesResponse, receiptsResponse] = await Promise.all([
        apiCall('/supplier-sales?limit=100'),
        apiCall('/supplier-receipts?limit=100&status=active')
      ]);

      if (salesResponse && salesResponse.success) {
        setAllSales(salesResponse.sales || []);
        
        if (receiptsResponse && receiptsResponse.success) {
          setExistingReceipts(receiptsResponse.receipts || []);
          
          // Extract all sale IDs that are already in receipts
          const salesInReceipts = new Set();
          receiptsResponse.receipts.forEach(receipt => {
            if (receipt.sales && Array.isArray(receipt.sales)) {
              receipt.sales.forEach(sale => {
                if (sale._id) salesInReceipts.add(sale._id);
                if (typeof sale === 'string') salesInReceipts.add(sale);
              });
            }
          });

          console.log('Sales in receipts:', Array.from(salesInReceipts));
          console.log('Total sales from API:', salesResponse.sales.length);

          // Filter out sales that are in receipts and only show completed sales
          const availableSales = salesResponse.sales.filter(sale => 
            !salesInReceipts.has(sale._id) && 
            sale.status === 'completed'
          );
          
          console.log('Available sales for receipts:', availableSales.length);
          setSalesHistory(availableSales);
        } else {
          // Fallback: only show completed sales if receipts API fails
          const completedSales = salesResponse.sales.filter(sale => 
            sale.status === 'completed'
          );
          setSalesHistory(completedSales);
        }
      } else {
        // Mock data fallback
        const mockData = [
          { 
            _id: '1',
            saleNumber: 'SALE-1737456000000-ABC123', 
            customerDetails: { 
              name: 'John Doe',
              email: 'john.doe@email.com',
              phone: '+256712345678',
              address: '123 Main Street, Kampala',
              customerType: 'regular'
            }, 
            totalAmount: 250000, 
            totalProfit: 75000,
            totalProfitMargin: 30,
            saleDate: '2024-01-15T10:30:00.000Z',
            status: 'completed',
            paymentMethod: 'cash',
            paymentStatus: 'paid',
            notes: 'Regular customer, paid in full',
            items: [
              { 
                productName: 'Tomatoes', 
                quantity: 10, 
                unitPrice: 5000, 
                productionPrice: 3500,
                totalPrice: 50000,
                profit: 15000,
                profitMargin: 30
              },
              { 
                productName: 'Onions', 
                quantity: 5, 
                unitPrice: 40000, 
                productionPrice: 28000,
                totalPrice: 200000,
                profit: 60000,
                profitMargin: 30
              }
            ],
            discountAmount: 0,
            discountPercentage: 0,
            taxAmount: 0,
            shippingDetails: { shippingCost: 0 },
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z'
          }
        ];
        setSalesHistory(mockData);
        setAllSales(mockData);
      }
    } catch (error) {
      console.error('Error loading sales history:', error);
      // Fallback mock data
      const mockData = [
        { 
          _id: '1',
          saleNumber: 'SALE-001', 
          customerDetails: { name: 'John Doe' }, 
          totalAmount: 250000, 
          saleDate: '2024-01-15T10:30:00.000Z',
          status: 'completed',
          items: [{ productName: 'Product A', quantity: 3, unitPrice: 83333 }],
          paymentMethod: 'cash'
        },
      ];
      setSalesHistory(mockData);
      setAllSales(mockData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if a sale is already in any receipt
  const isSaleInReceipt = (saleId) => {
    return existingReceipts.some(receipt => {
      if (!receipt.sales || !Array.isArray(receipt.sales)) return false;
      
      return receipt.sales.some(sale => {
        if (typeof sale === 'string') return sale === saleId;
        if (sale && sale._id) return sale._id === saleId;
        return false;
      });
    });
  };

  useEffect(() => {
    loadSalesHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSalesHistory();
  };

  // Selection functions
  const toggleSaleSelection = (sale) => {
    // Don't allow selection if sale is already in a receipt
    if (isSaleInReceipt(sale._id)) {
      alert('Sale Already Processed: This sale is already included in an existing receipt and cannot be selected.');
      return;
    }

    if (selectedSales.some(selected => selected._id === sale._id)) {
      setSelectedSales(selectedSales.filter(selected => selected._id !== sale._id));
    } else {
      setSelectedSales([...selectedSales, sale]);
    }
  };

  const startSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedSales([]);
    setReceiptNotes('');
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedSales([]);
    setReceiptNotes('');
  };

  const handleCreateReceipt = async () => {
    if (selectedSales.length === 0) {
      alert('No Sales Selected: Please select at least one sale to create a receipt.');
      return;
    }

    // Double-check that none of the selected sales are already in receipts
    const alreadyProcessedSales = selectedSales.filter(sale => isSaleInReceipt(sale._id));
    if (alreadyProcessedSales.length > 0) {
      const saleNumbers = alreadyProcessedSales.map(sale => sale.saleNumber).join(', ');
      const refresh = confirm(
        `The following sales are already in receipts and cannot be processed again: ${saleNumbers}. Would you like to refresh the list?`
      );
      if (refresh) {
        loadSalesHistory();
        cancelSelectionMode();
        setShowCreateReceiptModal(false);
      }
      return;
    }

    try {
      setLoading(true);
      const saleIds = selectedSales.map(sale => sale._id);
      
      const receiptData = {
        saleIds: saleIds,
        notes: receiptNotes || `Receipt for ${selectedSales.length} sale(s) totaling UGX ${formatCurrency(getSelectedTotalAmount())}`,
        receiptDate: new Date().toISOString().split('T')[0]
      };

      console.log('Creating receipt with data:', receiptData);

      const response = await apiCall('/supplier-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData)
      });

      if (response && response.success) {
        alert(`Success: Receipt ${response.receipt?.receiptNumber} created successfully for ${selectedSales.length} sale(s)`);
        setShowCreateReceiptModal(false);
        cancelSelectionMode();
        loadSalesHistory(); // Refresh to remove created receipts
      } else {
        alert('Error: ' + (response?.message || 'Failed to create receipt'));
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      if (error.message.includes('already included in receipts')) {
        // Extract receipt numbers from error message
        const receiptMatch = error.message.match(/receipts: ([^)]+)/);
        const receiptNumbers = receiptMatch ? receiptMatch[1].split(', ') : [];
        
        const refresh = confirm(
          `Some selected sales are already included in existing receipts: ${receiptNumbers.join(', ')}. Would you like to refresh the list?`
        );
        if (refresh) {
          loadSalesHistory();
          cancelSelectionMode();
          setShowCreateReceiptModal(false);
        }
      } else if (error.message.includes('Authentication failed')) {
        alert('Authentication Error: Please check your login credentials and try again.');
      } else {
        alert('Error: Failed to create receipt. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#8B5CF6';
      case 'partially_refunded': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return FaDollarSign;
      case 'card': return FaCreditCard;
      case 'mobile_money': return FaCreditCard;
      case 'bank_transfer': return FaCreditCard;
      default: return FaDollarSign;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  const getTotalItems = (sale) => {
    return sale.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
  };

  const getTotalRevenue = () => {
    return salesHistory.reduce((total, sale) => total + (sale.totalAmount || 0), 0);
  };

  const getTotalItemsSold = () => {
    return salesHistory.reduce((total, sale) => total + getTotalItems(sale), 0);
  };

  const handleViewDetails = (sale) => {
    if (isSelectionMode) {
      toggleSaleSelection(sale);
    } else {
      setSelectedSale(sale);
      setShowDetailsModal(true);
    }
  };

  const getSelectedTotalAmount = () => {
    return selectedSales.reduce((total, sale) => total + (sale.totalAmount || 0), 0);
  };

  const getSelectedTotalProfit = () => {
    return selectedSales.reduce((total, sale) => total + (sale.totalProfit || 0), 0);
  };

  const getSelectedTotalItems = () => {
    return selectedSales.reduce((total, sale) => total + getTotalItems(sale), 0);
  };

  const SaleItem = ({ sale }) => {
    const isSelected = selectedSales.some(selected => selected._id === sale._id);
    const isInReceipt = isSaleInReceipt(sale._id);
    const PaymentIcon = getPaymentIcon(sale.paymentMethod);
    const statusColor = getStatusColor(sale.status);
    
    return (
      <div 
        className={`rounded-xl border p-4 cursor-pointer transition-all ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } ${
          isSelected 
            ? 'border-purple-500 border-2 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20' 
            : isInReceipt
            ? 'opacity-60 bg-gray-50 dark:bg-gray-900'
            : 'hover:shadow-md'
        }`}
        onClick={() => handleViewDetails(sale)}
      >
        {/* Receipt Badge for processed sales */}
        {isInReceipt && (
          <div className="absolute top-2 left-2 flex items-center bg-purple-600 text-white px-2 py-1 rounded text-xs">
            <FaReceipt className="w-3 h-3 mr-1" />
            <span>Receipt Created</span>
          </div>
        )}
        
        {/* Selection Indicator (only for available sales) */}
        {isSelectionMode && !isInReceipt && (
          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected 
              ? 'bg-purple-600 border-purple-600' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
          }`}>
            {isSelected && <FaCheck className="w-3 h-3 text-white" />}
          </div>
        )}
        
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 mr-2">
            <h3 className={`font-semibold text-sm truncate ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            } ${isInReceipt ? 'opacity-60' : ''}`}>
              {sale.saleNumber}
            </h3>
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-1 ${
              isInReceipt ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`} style={!isInReceipt ? { backgroundColor: statusColor + '20' } : {}}>
              <span style={!isInReceipt ? { color: statusColor } : { color: '#6B7280' }}>
                {isInReceipt ? 'Receipted' : sale.status.charAt(0).toUpperCase() + sale.status.slice(1).replace('_', ' ')}
              </span>
            </div>
          </div>
          <p className={`font-bold text-sm ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          } ${isInReceipt ? 'opacity-60' : ''}`}>
            UGX {formatCurrency(sale.totalAmount)}
          </p>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center">
            <FaUser className={`w-3 h-3 mr-2 ${
              isInReceipt 
                ? 'text-gray-400 dark:text-gray-600' 
                : isDarkMode 
                  ? 'text-gray-400' 
                  : 'text-gray-500'
            }`} />
            <span className={`text-sm truncate flex-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            } ${isInReceipt ? 'opacity-50' : ''}`}>
              {sale.customerDetails?.name || 'Walk-in Customer'}
            </span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center">
              <FaCalendar className={`w-3 h-3 mr-1 ${
                isInReceipt 
                  ? 'text-gray-400 dark:text-gray-600' 
                  : isDarkMode 
                    ? 'text-gray-400' 
                    : 'text-gray-500'
              }`} />
              <span className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              } ${isInReceipt ? 'opacity-50' : ''}`}>
                {formatDate(sale.saleDate)}
              </span>
            </div>
            
            <div className="flex items-center">
              <FaBox className={`w-3 h-3 mr-1 ${
                isInReceipt 
                  ? 'text-gray-400 dark:text-gray-600' 
                  : isDarkMode 
                    ? 'text-gray-400' 
                    : 'text-gray-500'
              }`} />
              <span className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              } ${isInReceipt ? 'opacity-50' : ''}`}>
                {getTotalItems(sale)} items
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <PaymentIcon className={`w-3 h-3 mr-1 ${
              isInReceipt 
                ? 'text-gray-400 dark:text-gray-600' 
                : isDarkMode 
                  ? 'text-gray-400' 
                  : 'text-gray-500'
            }`} />
            <span className={`text-xs capitalize ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            } ${isInReceipt ? 'opacity-50' : ''}`}>
              {sale.paymentMethod?.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {sale.totalProfit && !isInReceipt && (
              <span className={`text-xs font-medium ${
                (sale.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                UGX {formatCurrency(sale.totalProfit || 0)}
              </span>
            )}
            {!isSelectionMode && !isInReceipt && (
              <button 
                className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-purple-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(sale);
                }}
              >
                View
              </button>
            )}
            {isInReceipt && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                Already Receipted
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CreateReceiptModal = () => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isDarkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
    }`}>
      <div className={`w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Create Receipt
          </h2>
          <button 
            onClick={() => setShowCreateReceiptModal(false)}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <FaTimes className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className={`rounded-xl border p-6 mb-6 ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className={`font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Receipt Summary
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Number of Sales
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {selectedSales.length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Total Items
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {getSelectedTotalItems()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Total Amount
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  UGX {formatCurrency(getSelectedTotalAmount())}
                </span>
              </div>

              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Total Profit
                </span>
                <span className="text-green-500">
                  UGX {formatCurrency(getSelectedTotalProfit())}
                </span>
              </div>
            </div>

            {/* Notes Input */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Receipt Notes (Optional)
              </label>
              <textarea
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Add notes for this receipt..."
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Selected Sales ({selectedSales.length}):
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedSales.map((sale) => (
                  <div key={sale._id} className="flex justify-between items-center py-2 border-b border-gray-300 dark:border-gray-600 last:border-0">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {sale.saleNumber}
                      </p>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {sale.customerDetails?.name || 'Walk-in Customer'}
                      </p>
                    </div>
                    <p className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      UGX {formatCurrency(sale.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateReceiptModal(false)}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleCreateReceipt}
              disabled={loading}
              className="flex items-center gap-2 flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <FaReceipt className="w-4 h-4" />
                  <span>Create Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const SaleDetailsModal = () => {
    if (!selectedSale) return null;

    const PaymentIcon = getPaymentIcon(selectedSale.paymentMethod);
    const statusColor = getStatusColor(selectedSale.status);

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isDarkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
      }`}>
        <div className={`w-full max-w-4xl rounded-xl shadow-2xl max-h-[95vh] flex flex-col ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Sale Details
            </h2>
            <button 
              onClick={() => setShowDetailsModal(false)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <FaTimes className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Sale Header */}
            <div className={`rounded-xl border p-6 mb-6 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedSale.saleNumber}
                </h3>
                <div className="flex items-center px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: statusColor + '20' }}>
                  <span style={{ color: statusColor }}>
                    {selectedSale.status.charAt(0).toUpperCase() + selectedSale.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
              </div>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                {formatDateTime(selectedSale.saleDate)}
              </p>
            </div>

            {/* Customer Details */}
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
                  }`}>Name</p>
                  <p className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedSale.customerDetails?.name || 'Walk-in Customer'}
                  </p>
                </div>
                {selectedSale.customerDetails?.email && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Email</p>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedSale.customerDetails.email}
                    </p>
                  </div>
                )}
                {selectedSale.customerDetails?.phone && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Phone</p>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedSale.customerDetails.phone}
                    </p>
                  </div>
                )}
                {selectedSale.customerDetails?.customerType && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Customer Type</p>
                    <p className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedSale.customerDetails.customerType.charAt(0).toUpperCase() + selectedSale.customerDetails.customerType.slice(1)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className={`rounded-xl border p-6 mb-6 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Items ({getTotalItems(selectedSale)})
              </h3>
              <div className="space-y-3">
                {selectedSale.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-3 border-b border-gray-300 dark:border-gray-600 last:border-0">
                    <div className="flex-1">
                      <p className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {item.productName}
                      </p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {item.quantity} × UGX {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        UGX {formatCurrency(item.totalPrice)}
                      </p>
                      <p className={`text-sm ${
                        (item.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        Profit: UGX {formatCurrency(item.profit || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Totals */}
            <div className={`rounded-xl border p-6 ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Payment & Totals
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    UGX {formatCurrency(selectedSale.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0)}
                  </span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Discount</span>
                    <span className="text-red-500">
                      -UGX {formatCurrency(selectedSale.discountAmount)}
                    </span>
                  </div>
                )}
                {selectedSale.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tax</span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      UGX {formatCurrency(selectedSale.taxAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                  <span className={`font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Total Amount</span>
                  <span className={`font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    UGX {formatCurrency(selectedSale.totalAmount)}
                  </span>
                </div>
                {selectedSale.totalProfit && (
                  <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Profit</span>
                    <span className={(selectedSale.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                      UGX {formatCurrency(selectedSale.totalProfit)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 mt-2">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Payment Method</span>
                  <div className="flex items-center gap-2">
                    <PaymentIcon className={`w-4 h-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedSale.paymentMethod?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedSale.notes && (
              <div className={`rounded-xl border p-6 mt-6 ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Notes
                </h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {selectedSale.notes}
                </p>
              </div>
            )}
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Loading Sales History...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Selection Mode */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <FaHistory className={`w-5 h-5 ${
              isDarkMode ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <h2 className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {isSelectionMode ? `Select Sales (${selectedSales.length})` : 'Sales History'}
            </h2>
          </div>
          
          {isSelectionMode ? (
            <div className="flex gap-2">
              <button 
                onClick={cancelSelectionMode}
                className="flex items-center gap-2 bg-red-100 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 dark:hover:bg-opacity-30 transition-colors"
              >
                <FaTimes className="w-3 h-3" />
                <span className="text-sm font-medium">Cancel</span>
              </button>
              
              <button 
                onClick={() => setShowCreateReceiptModal(true)}
                disabled={selectedSales.length === 0}
                className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <FaReceipt className="w-3 h-3" />
                <span className="text-sm font-medium">
                  Receipt ({selectedSales.length})
                </span>
              </button>
            </div>
          ) : (
            <button 
              onClick={startSelectionMode}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              <span className="text-sm font-medium">Create Receipt</span>
            </button>
          )}
        </div>
        
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          {isSelectionMode 
            ? 'Click to select available sales for receipt • Grayed out sales are already receipted' 
            : 'Sales available for receipt creation • Grayed out sales are already receipted'
          }
        </p>
      </div>

      {/* Filter Tabs - Hide during selection */}
      {!isSelectionMode && (
        <div className="flex gap-2">
          {['all', 'today', 'week', 'month'].map((period) => (
            <button
              key={period}
              onClick={() => setFilter(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === period
                  ? 'bg-purple-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Summary Cards - Hide during selection */}
      {!isSelectionMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-xl border p-4 text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <FaReceipt className={`w-4 h-4 mx-auto mb-2 ${
              isDarkMode ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <p className={`text-2xl font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {salesHistory.length}
            </p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Available Sales
            </p>
          </div>

          <div className={`rounded-xl border p-4 text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <FaDollarSign className={`w-4 h-4 mx-auto mb-2 ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
            <p className={`text-2xl font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              UGX {formatCurrency(getTotalRevenue())}
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
            <FaBox className={`w-4 h-4 mx-auto mb-2 ${
              isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
            <p className={`text-2xl font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {getTotalItemsSold()}
            </p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Items Available
            </p>
          </div>
        </div>
      )}

      {/* Sales List */}
      <div>
        {!isSelectionMode && (
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Recent Sales • {salesHistory.length} Available
            </h3>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 disabled:opacity-50' 
                  : 'hover:bg-gray-100 disabled:opacity-50'
              }`}
            >
              <FaHistory className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {salesHistory.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
          } p-12 text-center`}>
            <FaReceipt className={`mx-auto w-8 h-8 mb-3 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`font-medium mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              No sales available for receipts
            </p>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              All completed sales have been receipted or no sales available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesHistory.map((sale) => (
              <SaleItem key={sale._id} sale={sale} />
            ))}
          </div>
        )}
      </div>

      {/* Selection Mode Footer */}
      {isSelectionMode && selectedSales.length > 0 && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full shadow-lg ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <span className={`font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {selectedSales.length} sales selected • UGX {formatCurrency(getSelectedTotalAmount())}
          </span>
          <button 
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition-colors"
            onClick={() => setShowCreateReceiptModal(true)}
          >
            <FaReceipt className="w-4 h-4" />
            <span className="font-medium">Create Receipt</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showDetailsModal && <SaleDetailsModal />}
      {showCreateReceiptModal && <CreateReceiptModal />}
    </div>
  );
};

export default SalesHistoryTab;