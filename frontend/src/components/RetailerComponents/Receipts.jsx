import React, { Component } from 'react';
import { FaReceipt, FaSearch, FaEye, FaTrash, FaSync, FaUser, FaCalendar, FaBox, FaDollarSign } from 'react-icons/fa';

class Receipts extends Component {
  constructor(props) {
    super(props);
    this.state = {
      receipts: [],
      loading: true,
      error: '',
      searchQuery: '',
      filters: {
        startDate: '',
        endDate: '',
        status: '',
        paymentMethod: ''
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      },
      selectedReceipt: null,
      viewModalOpen: false,
      deleteModalOpen: false,
      receiptToDelete: null,
      isMobile: window.innerWidth < 768
    };
  }

  componentDidMount() {
    this.fetchReceipts();
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    this.setState({ isMobile: window.innerWidth < 768 });
  };

  fetchReceipts = async (page = 1) => {
    try {
      this.setState({ loading: true, error: '' });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { filters, pagination } = this.state;

      let url = `http://localhost:5000/api/retailer-receipts?page=${page}&limit=${pagination.limit}`;

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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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

      this.setState({
        receipts: data.receipts || data.formattedReceipts || [],
        loading: false,
        pagination: {
          ...pagination,
          page: data.currentPage || page,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }
      });

    } catch (error) {
      console.error('Error fetching receipts:', error);
      this.setState({
        loading: false,
        error: error.message,
        receipts: []
      });
    }
  };

  searchReceipts = async (query) => {
    try {
      if (!query.trim()) {
        this.fetchReceipts();
        return;
      }

      this.setState({ loading: true, error: '' });

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/retailer-receipts/search/${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Search failed');
      }

      this.setState({
        receipts: data.receipts || data.formattedReceipts || [],
        loading: false,
        pagination: {
          ...this.state.pagination,
          page: data.currentPage || 1,
          total: data.total || 0,
          totalPages: data.totalPages || 0
        }
      });
    } catch (error) {
      console.error('Error searching receipts:', error);
      this.setState({ 
        loading: false, 
        error: error.message,
        receipts: []
      });
    }
  };

  viewReceiptDetails = async (receiptId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/retailer-receipts/${receiptId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load receipt details');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load receipt details');
      }

      this.setState({
        selectedReceipt: data.receipt || data.formattedReceipt,
        viewModalOpen: true
      });
    } catch (error) {
      console.error('Error fetching receipt details:', error);
      this.setState({ error: error.message });
    }
  };

  deleteReceipt = async (receiptId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/retailer-receipts/${receiptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Delete failed');
      }

      this.setState({
        deleteModalOpen: false,
        receiptToDelete: null
      });
      
      this.setState({ error: '' });
      this.fetchReceipts(this.state.pagination.page);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      this.setState({ error: error.message });
    }
  };

  handleSearchChange = (event) => {
    const query = event.target.value;
    this.setState({ searchQuery: query });
    
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (query.trim()) {
        this.searchReceipts(query);
      } else {
        this.fetchReceipts(1);
      }
    }, 500);
  };

  handleFilterChange = (filterName, value) => {
    this.setState(prevState => ({
      filters: {
        ...prevState.filters,
        [filterName]: value
      }
    }), () => {
      clearTimeout(this.filterTimeout);
      this.filterTimeout = setTimeout(() => {
        this.fetchReceipts(1);
      }, 300);
    });
  };

  handlePageChange = (page) => {
    this.fetchReceipts(page);
  };

  handleViewReceipt = (receipt) => {
    this.setState({
      selectedReceipt: receipt,
      viewModalOpen: true
    });
  };

  handleDeleteClick = (receipt) => {
    this.setState({
      receiptToDelete: receipt,
      deleteModalOpen: true
    });
  };

  handleCloseModals = () => {
    this.setState({
      viewModalOpen: false,
      deleteModalOpen: false,
      selectedReceipt: null,
      receiptToDelete: null
    });
  };

  formatCurrency = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // NEW: Render receipt cards for mobile
  renderReceiptCards() {
    const { receipts, loading } = this.state;

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading receipts...</span>
        </div>
      );
    }

    if (receipts.length === 0) {
      return (
        <div className="text-center py-8">
          <FaReceipt className="mx-auto text-3xl text-gray-400 mb-3" />
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-1">
            No receipts found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {this.state.searchQuery ? 'Try adjusting your search' : 'Try adjusting your filters'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3 pb-4">
        {receipts.map((receipt) => (
          <div 
            key={receipt.id || receipt._id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200"
          >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center mb-1">
                  <FaReceipt className="text-blue-500 mr-2 text-sm" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    #{receipt.receiptNumber || 'N/A'}
                  </h3>
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <FaCalendar className="mr-1" />
                  <span>{this.formatDate(receipt.receiptDate)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {this.formatCurrency(receipt.subtotal || receipt.grandTotal)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {receipt.totalQuantity || (receipt.items ? receipt.items.length : 0)} items
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex items-center mb-3 text-xs text-gray-600 dark:text-gray-400">
              <FaUser className="mr-2 text-gray-400" />
              <span>{receipt.customerName || receipt.customer?.name || 'Walk-in Customer'}</span>
              {(receipt.customerPhone || receipt.customer?.phone) && (
                <span className="ml-2">• {receipt.customerPhone || receipt.customer?.phone}</span>
              )}
            </div>

            {/* Items Preview */}
            {receipt.items && receipt.items.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center mb-2 text-xs text-gray-500 dark:text-gray-400">
                  <FaBox className="mr-1" />
                  <span>Items:</span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {receipt.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                        {item.productName}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {item.quantity} × {this.formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  ))}
                  {receipt.items.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{receipt.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <button
                  onClick={() => this.handleViewReceipt(receipt)}
                  className="flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
                >
                  <FaEye className="mr-1" size={12} />
                  View
                </button>
                <button
                  onClick={() => this.handleDeleteClick(receipt)}
                  className="flex items-center px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={receipt.status === 'cancelled'}
                >
                  <FaTrash className="mr-1" size={12} />
                  Delete
                </button>
              </div>
              
              {/* Status Badge */}
              {receipt.status && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  receipt.status === 'completed' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : receipt.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {receipt.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  renderReceiptsTable() {
    const { receipts, loading, pagination } = this.state;

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading receipts...</span>
        </div>
      );
    }

    if (receipts.length === 0) {
      return (
        <div className="text-center py-8">
          <FaReceipt className="mx-auto text-3xl text-gray-400 mb-3" />
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-1">
            No receipts found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {this.state.searchQuery ? 'Try adjusting your search' : 'Try adjusting your filters'}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[360px]">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex-grow min-h-0">
          <div className="overflow-x-auto h-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Receipt Number
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {receipts.map((receipt) => (
                  <tr key={receipt.id || receipt._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {receipt.receiptNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {this.formatDate(receipt.receiptDate)}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {receipt.customerName || receipt.customer?.name || 'Walk-in Customer'}
                      </div>
                      {(receipt.customerPhone || receipt.customer?.phone) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {receipt.customerPhone || receipt.customer?.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {receipt.totalQuantity || (receipt.items ? receipt.items.length : 0)} items
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {this.formatCurrency(receipt.subtotal || receipt.grandTotal)}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => this.handleViewReceipt(receipt)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded transition-colors"
                          title="View Details"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          onClick={() => this.handleDeleteClick(receipt)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                          disabled={receipt.status === 'cancelled'}
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex space-x-2">
              <button
                onClick={() => this.handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => this.handlePageChange(pageNum)}
                    className={`px-3 py-1 border rounded-md transition-colors text-sm ${
                      pageNum === pagination.page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => this.handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderFilters() {
    const { filters, searchQuery, isMobile } = this.state;

    const textSize = isMobile ? 'text-xs' : 'text-sm';
    const labelSize = isMobile ? 'text-xs' : 'text-sm';
    const inputPadding = isMobile ? 'py-1 px-2' : 'py-2 px-3';
    const gridLayout = isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3';
    const searchSpan = isMobile ? 'col-span-1' : 'lg:col-span-2';

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-3 ${isMobile ? 'p-2' : ''}`}>
        <div className={`grid ${gridLayout} items-end`}>
          <div className={searchSpan}>
            <label className={`block ${labelSize} font-medium text-gray-700 dark:text-gray-300 mb-1`}>
              Search Receipts
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className={`${isMobile ? 'text-xs' : ''} text-gray-400`} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={this.handleSearchChange}
                className={`block w-full pl-10 pr-3 ${inputPadding} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${textSize}`}
                placeholder="Search by receipt number, customer..."
              />
            </div>
          </div>
          
          <div>
            <label className={`block ${labelSize} font-medium text-gray-700 dark:text-gray-300 mb-1`}>
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => this.handleFilterChange('startDate', e.target.value)}
              className={`block w-full ${inputPadding} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${textSize}`}
            />
          </div>
          
          <div>
            <label className={`block ${labelSize} font-medium text-gray-700 dark:text-gray-300 mb-1`}>
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => this.handleFilterChange('endDate', e.target.value)}
              className={`block w-full ${inputPadding} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${textSize}`}
            />
          </div>
          
          <div>
            <button
              onClick={() => {
                this.setState({
                  filters: {
                    startDate: '',
                    endDate: '',
                    status: '',
                    paymentMethod: ''
                  },
                  searchQuery: ''
                }, () => {
                  this.fetchReceipts(1);
                });
              }}
              className={`w-full ${inputPadding} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center ${textSize}`}
            >
              <FaSync className={`${isMobile ? 'mr-1' : 'mr-2'} ${isMobile ? 'text-xs' : ''}`} />
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderReceiptModal() {
    const { selectedReceipt, viewModalOpen, isMobile } = this.state;

    if (!selectedReceipt || !viewModalOpen) return null;

    const receipt = selectedReceipt;
    const items = receipt.items || [];
    const subtotal = receipt.subtotal || 0;
    const grandTotal = receipt.grandTotal || subtotal;

    const modalSize = isMobile ? 'max-w-full mx-2' : 'max-w-4xl';
    const textSize = isMobile ? 'text-xs' : 'text-sm';
    const headerTextSize = isMobile ? 'text-base' : 'text-lg';
    const padding = isMobile ? 'p-3' : 'p-4';
    const gridLayout = isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${modalSize} max-h-[90vh] overflow-y-auto`}>
          <div className={`${padding} border-b border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaReceipt className="text-blue-500 mr-2" size={isMobile ? 16 : 18} />
                <h2 className={`font-bold text-gray-900 dark:text-white ${headerTextSize}`}>
                  Receipt - {receipt.receiptNumber}
                </h2>
              </div>
              <button
                onClick={this.handleCloseModals}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <div className={padding}>
            <div className={`grid ${gridLayout} mb-4`}>
              <div>
                <h3 className={`${textSize} font-medium text-gray-500 dark:text-gray-400 mb-1`}>
                  Customer Information
                </h3>
                <p className={`text-gray-900 dark:text-white ${textSize}`}>
                  {receipt.customerName || receipt.customer?.name || 'Walk-in Customer'}
                </p>
                {(receipt.customerPhone || receipt.customer?.phone) && (
                  <p className={`${textSize} text-gray-600 dark:text-gray-400 mt-1`}>
                    Phone: {receipt.customerPhone || receipt.customer?.phone}
                  </p>
                )}
                {(receipt.customerEmail || receipt.customer?.email) && (
                  <p className={`${textSize} text-gray-600 dark:text-gray-400`}>
                    Email: {receipt.customerEmail || receipt.customer?.email}
                  </p>
                )}
              </div>

              <div>
                <h3 className={`${textSize} font-medium text-gray-500 dark:text-gray-400 mb-1`}>
                  Receipt Information
                </h3>
                <p className={`${textSize} text-gray-600 dark:text-gray-400`}>
                  Date: {this.formatDate(receipt.receiptDate)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className={`${textSize} font-medium text-gray-500 dark:text-gray-400 mb-2`}>
                Items ({items.length})
              </h3>
              {items.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-left ${textSize} font-medium text-gray-500 dark:text-gray-300 uppercase`}>
                            Product
                          </th>
                          <th className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-right ${textSize} font-medium text-gray-500 dark:text-gray-300 uppercase`}>
                            Qty
                          </th>
                          <th className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-right ${textSize} font-medium text-gray-500 dark:text-gray-300 uppercase`}>
                            Price
                          </th>
                          <th className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-right ${textSize} font-medium text-gray-500 dark:text-gray-300 uppercase`}>
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-gray-900 dark:text-white ${textSize}`}>
                              {item.productName}
                            </td>
                            <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-gray-900 dark:text-white ${textSize} text-right`}>
                              {item.quantity} {item.measurementUnit || 'units'}
                            </td>
                            <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-gray-900 dark:text-white ${textSize} text-right`}>
                              {this.formatCurrency(item.unitPrice)}
                            </td>
                            <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-gray-900 dark:text-white ${textSize} text-right`}>
                              {this.formatCurrency(item.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className={`text-gray-500 dark:text-gray-400 ${textSize}`}>No items found</p>
              )}
            </div>

            <div className="text-right">
              <div className="space-y-1">
                <p className={`text-gray-600 dark:text-gray-400 ${textSize}`}>
                  Subtotal: {this.formatCurrency(subtotal)}
                </p>
                {receipt.discountAmount > 0 && (
                  <p className={`text-gray-600 dark:text-gray-400 ${textSize}`}>
                    Discount: -{this.formatCurrency(receipt.discountAmount)}
                  </p>
                )}
                {receipt.taxAmount > 0 && (
                  <p className={`text-gray-600 dark:text-gray-400 ${textSize}`}>
                    Tax: {this.formatCurrency(receipt.taxAmount)}
                  </p>
                )}
                <p className={`font-bold text-gray-900 dark:text-white mt-2 ${isMobile ? 'text-sm' : 'text-md'}`}>
                  Total: {this.formatCurrency(grandTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className={`${padding} border-t border-gray-200 dark:border-gray-700 flex justify-end`}>
            <button
              onClick={this.handleCloseModals}
              className={`px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${textSize}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderDeleteModal() {
    const { deleteModalOpen, receiptToDelete, isMobile } = this.state;

    if (!receiptToDelete || !deleteModalOpen) return null;

    const textSize = isMobile ? 'text-xs' : 'text-sm';
    const headerSize = isMobile ? 'text-sm' : 'text-md';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'max-w-xs' : 'max-w-md'} w-full`}>
          <div className="p-4">
            <h3 className={`${headerSize} font-medium text-gray-900 dark:text-white mb-3`}>
              Delete Receipt
            </h3>
            <p className={`${textSize} text-gray-600 dark:text-gray-400 mb-4`}>
              Are you sure you want to delete receipt {receiptToDelete.receiptNumber}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={this.handleCloseModals}
                className={`px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${textSize}`}
              >
                Cancel
              </button>
              <button
                onClick={() => this.deleteReceipt(receiptToDelete.id || receiptToDelete._id)}
                className={`px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors ${textSize}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { error, isMobile } = this.state;

    const headerTextSize = isMobile ? 'text-lg' : 'text-xl';
    const subTextSize = isMobile ? 'text-xs' : 'text-sm';
    const errorTextSize = isMobile ? 'text-xs' : 'text-sm';
    const containerPadding = isMobile ? 'p-3' : 'p-6';

    return (
      <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 ${containerPadding}`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-2 pt-2">
            <h1 className={`font-bold text-gray-900 dark:text-white ${headerTextSize}`}>
              Receipts Management
            </h1>
            <p className={`text-gray-600 dark:text-gray-400 mt-1 ${subTextSize}`}>
              Manage and view all your sales receipts
            </p>
          </div>

          {error && (
            <div className={`mb-3 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded ${errorTextSize}`}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {this.renderFilters()}
          
          {/* UPDATED: Conditionally render cards for mobile, table for desktop */}
          {isMobile ? this.renderReceiptCards() : this.renderReceiptsTable()}
          
          {this.renderReceiptModal()}
          {this.renderDeleteModal()}
        </div>
      </div>
    );
  }
}

export default Receipts;