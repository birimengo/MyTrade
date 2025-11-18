import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import { FaReceipt, FaSearch, FaEye, FaTrash, FaSync, FaUser, FaCalendar, FaBox, FaDollarSign, FaFileExport, FaShoppingCart, FaPhone, FaEnvelope } from 'react-icons/fa';

const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentMethod: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);

  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const isElectron = window.electronAPI;

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      setOfflineMode(false);

      // Try to fetch fresh data first
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        let url = `${API_BASE_URL}/api/retailer-receipts?page=${page}&limit=${pagination.limit}`;

        if (filters.startDate && filters.endDate) {
          url += `&startDate=${filters.startDate}&endDate=${filters.endDate}`;
        }
        if (filters.status) {
          url += `&status=${filters.status}`;
        }
        if (filters.paymentMethod) {
          url += `&paymentMethod=${filters.paymentMethod}`;
        }

        const response = await fetch(url, {
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Failed to fetch receipts: ${response.status}`;
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            if (errorText && errorText.length < 100) {
              errorMessage = errorText;
            }
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch receipts');
        }

        const receiptsData = data.receipts || data.formattedReceipts || [];
        
        setReceipts(receiptsData);
        setPagination(prev => ({
          ...prev,
          page: data.currentPage || page,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }));

        // Cache data for offline use
        if (isElectron) {
          await window.electronAPI.storage.setPersistent('receipts_data', {
            data: receiptsData,
            pagination: {
              page: data.currentPage || page,
              total: data.total || 0,
              totalPages: data.totalPages || 0
            },
            lastUpdated: new Date().toISOString(),
            filters
          });
        }
        return;
      } catch (networkError) {
        console.log('Network unavailable, trying cached receipts data');
      }

      // Fallback to cached data
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('receipts_data');
        if (cachedData.success && cachedData.value?.data) {
          setReceipts(cachedData.value.data);
          setPagination(cachedData.value.pagination || pagination);
          setOfflineMode(true);
          setError('Using cached data - No network connection');
          return;
        }
      }

      throw new Error('No network connection and no cached data available');
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError(err.message);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchReceipts = async (query) => {
    try {
      if (!query.trim()) {
        fetchReceipts();
        return;
      }

      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/retailer-receipts/search/${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Search failed');
      }

      setReceipts(data.receipts || data.formattedReceipts || []);
      setPagination(prev => ({
        ...prev,
        page: data.currentPage || 1,
        total: data.total || 0,
        totalPages: data.totalPages || 0
      }));
    } catch (error) {
      console.error('Error searching receipts:', error);
      setError(error.message);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const viewReceiptDetails = async (receiptId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/retailer-receipts/${receiptId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load receipt details');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load receipt details');
      }

      setSelectedReceipt(data.receipt || data.formattedReceipt);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching receipt details:', error);
      setError(error.message);
    }
  };

  const deleteReceipt = async (receiptId) => {
    try {
      // For Electron offline mode
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_receipt_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        actions.push({
          type: 'delete',
          receiptId,
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_receipt_actions', actions);
        
        // Update local state optimistically
        setReceipts(prev => prev.filter(receipt => receipt._id !== receiptId));
        
        window.electronAPI.showNotification(
          'Delete Saved Offline',
          'Receipt deletion saved and will sync when online'
        );
        
        setSuccessMessage('Receipt deletion saved offline and will sync when connected.');
        setTimeout(() => setSuccessMessage(''), 5000);
        setDeleteModalOpen(false);
        setReceiptToDelete(null);
        return;
      }

      // Online mode
      const response = await fetch(`${API_BASE_URL}/api/retailer-receipts/${receiptId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Delete failed');
      }

      if (isElectron) {
        window.electronAPI.showNotification(
          'Receipt Deleted',
          'Receipt deleted successfully'
        );
      }

      setDeleteModalOpen(false);
      setReceiptToDelete(null);
      setSuccessMessage('Receipt deleted successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      fetchReceipts(pagination.page);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      setError(error.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Delete Failed',
          error.message || 'Failed to delete receipt'
        );
      }
    }
  };

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (query.trim()) {
        searchReceipts(query);
      } else {
        fetchReceipts(1);
      }
    }, 500);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));

    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      fetchReceipts(1);
    }, 300);
  };

  const handlePageChange = (page) => {
    fetchReceipts(page);
  };

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  const handleDeleteClick = (receipt) => {
    setReceiptToDelete(receipt);
    setDeleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setViewModalOpen(false);
    setDeleteModalOpen(false);
    setSelectedReceipt(null);
    setReceiptToDelete(null);
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      paymentMethod: ''
    });
    setSearchQuery('');
    fetchReceipts(1);
  };

  const handleExportReceipts = async () => {
    const receiptsToExport = receipts;
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalReceipts: receiptsToExport.length,
      totalAmount: receiptsToExport.reduce((sum, receipt) => sum + (receipt.subtotal || receipt.grandTotal || 0), 0),
      filters: {
        ...filters,
        searchQuery
      },
      receipts: receiptsToExport
    };

    if (isElectron) {
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `receipts-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          `${receiptsToExport.length} receipts exported successfully`
        );
      }
    } else {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipts-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return 'UGX 0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  // Global timeouts
  let searchTimeout;
  let filterTimeout;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(searchTimeout);
      clearTimeout(filterTimeout);
    };
  }, []);

  const renderReceiptCards = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading receipts (offline capable)...' : 'Loading receipts...'}
          </span>
        </div>
      );
    }

    if (receipts.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
            <FaReceipt className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No matching receipts' : 'No receipts found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
            {searchQuery
              ? `No receipts match "${searchQuery}". Try a different search term.`
              : 'No receipts available. Your receipts will appear here after sales transactions.'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Clear Search
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Receipt Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {receipts.map((receipt) => (
            <div 
              key={receipt.id || receipt._id} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800/50 group"
            >
              {/* Header Section */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg dark:bg-blue-900/30 mr-3">
                    <FaReceipt className="text-blue-600 dark:text-blue-400" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      #{receipt.receiptNumber || 'N/A'}
                    </h3>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <FaCalendar className="mr-1" size={10} />
                      <span>{formatDate(receipt.receiptDate)}</span>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                  {receipt.status || 'completed'}
                </span>
              </div>

              {/* Customer Info */}
              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <FaUser className="mr-2 text-gray-400" size={12} />
                  <span className="font-medium">{receipt.customerName || receipt.customer?.name || 'Walk-in Customer'}</span>
                </div>
                {(receipt.customerPhone || receipt.customer?.phone) && (
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 ml-4">
                    <FaPhone className="mr-1" size={10} />
                    <span>{receipt.customerPhone || receipt.customer?.phone}</span>
                  </div>
                )}
              </div>

              {/* Items Preview */}
              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <FaShoppingCart className="mr-2 text-gray-400" size={12} />
                  <span>Items ({receipt.totalQuantity || (receipt.items ? receipt.items.length : 0)})</span>
                </div>
                {receipt.items && receipt.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-xs text-gray-500 dark:text-gray-400 ml-4 mb-1">
                    <span className="truncate flex-1 mr-2">{item.productName}</span>
                    <span className="whitespace-nowrap">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                ))}
                {receipt.items && receipt.items.length > 3 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                    +{receipt.items.length - 3} more items
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total:</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(receipt.subtotal || receipt.grandTotal)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleViewReceipt(receipt)}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  <FaEye className="mr-1" size={12} />
                  View
                </button>
                <button
                  onClick={() => handleDeleteClick(receipt)}
                  className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={receipt.status === 'cancelled'}
                >
                  <FaTrash className="mr-1" size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    );
  };

  const renderReceiptModal = () => {
    if (!selectedReceipt || !viewModalOpen) return null;

    const receipt = selectedReceipt;
    const items = receipt.items || [];
    const subtotal = receipt.subtotal || 0;
    const grandTotal = receipt.grandTotal || subtotal;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaReceipt className="text-blue-500 mr-3" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Receipt - {receipt.receiptNumber}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatDate(receipt.receiptDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModals}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Customer Information
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-900 dark:text-white">
                    <strong>Name:</strong> {receipt.customerName || receipt.customer?.name || 'Walk-in Customer'}
                  </p>
                  {(receipt.customerPhone || receipt.customer?.phone) && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>Phone:</strong> {receipt.customerPhone || receipt.customer?.phone}
                    </p>
                  )}
                  {(receipt.customerEmail || receipt.customer?.email) && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>Email:</strong> {receipt.customerEmail || receipt.customer?.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Receipt Details
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Status:</strong> 
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                      {receipt.status || 'completed'}
                    </span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Payment Method:</strong> {receipt.paymentMethod || 'Cash'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Items ({items.length})
              </h3>
              {items.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">
                            {item.productName}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-right">
                            {item.quantity} {item.measurementUnit || 'units'}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-right">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white text-right font-medium">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No items found</p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-end">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 mr-4">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  {receipt.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 mr-4">Discount:</span>
                      <span className="text-red-600 dark:text-red-400">-{formatCurrency(receipt.discountAmount)}</span>
                    </div>
                  )}
                  {receipt.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 mr-4">Tax:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(receipt.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-900 dark:text-white mr-4">Total:</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleCloseModals}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (!receiptToDelete || !deleteModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full dark:bg-red-900/30 mr-3">
                <FaTrash className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Delete Receipt
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete receipt <strong>{receiptToDelete.receiptNumber}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseModals}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteReceipt(receiptToDelete.id || receiptToDelete._id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Delete Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Receipts Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and view all your sales receipts
              {isElectron && ' • Desktop Mode'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            {isElectron && (
              <button
                onClick={handleExportReceipts}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export receipts data to JSON file"
              >
                <FaFileExport className="w-4 h-4 mr-2" />
                Export
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                {offlineMode && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    You can still view receipts. Changes will sync when you're back online.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 dark:text-green-300 text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search receipts by number, customer..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Date Range:</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <FaSync className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>

        {/* Receipt Cards */}
        {renderReceiptCards()}

        {/* Modals */}
        {renderReceiptModal()}
        {renderDeleteModal()}
      </div>
    </ErrorBoundary>
  );
};

export default Receipts;