import React, { Component } from 'react';
import { FaReceipt, FaSearch, FaEye, FaTrash, FaSync } from 'react-icons/fa';

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
      receiptToDelete: null
    };
  }

  componentDidMount() {
    this.fetchReceipts();
  }

  fetchReceipts = async (page = 1) => {
    try {
      this.setState({ loading: true, error: '' });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { filters, pagination } = this.state;

      let url = `http://localhost:5000/api/retailer-receipts?page=${page}&limit=${pagination.limit}`;

      // Add filters to URL
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
          // If not JSON, use the text as is
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
      
      // Show success message
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
    
    // Debounce search
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
      // Apply filters after a short delay
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

  renderFilters() {
    const { filters, searchQuery } = this.state;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-3"> {/* Reduced margin-bottom */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Receipts
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={this.handleSearchChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by receipt number, customer..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => this.handleFilterChange('startDate', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => this.handleFilterChange('endDate', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center text-sm"
            >
              <FaSync className="mr-2" />
              Reset
            </button>
          </div>
        </div>
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
      <div className="flex flex-col h-[360px]"> {/* Fixed height container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex-grow min-h-0"> {/* Flex-grow for remaining space */}
          <div className="overflow-x-auto h-full"> {/* Full height for scroll */}
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10"> {/* Sticky header */}
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
          <div className="flex justify-center mt-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow"> {/* Reduced padding and margin */}
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

  renderReceiptModal() {
    const { selectedReceipt, viewModalOpen } = this.state;

    if (!selectedReceipt || !viewModalOpen) return null;

    const receipt = selectedReceipt;
    const items = receipt.items || [];
    const subtotal = receipt.subtotal || 0;
    const grandTotal = receipt.grandTotal || subtotal;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FaReceipt className="text-blue-500 mr-2" size={18} />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Receipt Details - {receipt.receiptNumber}
                </h2>
              </div>
              <button
                onClick={this.handleCloseModals}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Customer Information
                </h3>
                <p className="text-gray-900 dark:text-white text-sm">
                  {receipt.customerName || receipt.customer?.name || 'Walk-in Customer'}
                </p>
                {(receipt.customerPhone || receipt.customer?.phone) && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Phone: {receipt.customerPhone || receipt.customer?.phone}
                  </p>
                )}
                {(receipt.customerEmail || receipt.customer?.email) && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Email: {receipt.customerEmail || receipt.customer?.email}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Receipt Information
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Date: {this.formatDate(receipt.receiptDate)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Items ({items.length})
              </h3>
              {items.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Product
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Quantity
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Unit Price
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                            {item.productName}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                            {item.quantity} {item.measurementUnit || 'units'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                            {this.formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-white text-right">
                            {this.formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-xs">No items found</p>
              )}
            </div>

            <div className="text-right">
              <div className="space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Subtotal: {this.formatCurrency(subtotal)}
                </p>
                {receipt.discountAmount > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Discount: -{this.formatCurrency(receipt.discountAmount)}
                  </p>
                )}
                {receipt.taxAmount > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tax: {this.formatCurrency(receipt.taxAmount)}
                  </p>
                )}
                <p className="text-md font-bold text-gray-900 dark:text-white mt-2">
                  Total: {this.formatCurrency(grandTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={this.handleCloseModals}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderDeleteModal() {
    const { deleteModalOpen, receiptToDelete } = this.state;

    if (!receiptToDelete || !deleteModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          <div className="p-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Delete Receipt
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete receipt {receiptToDelete.receiptNumber}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={this.handleCloseModals}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => this.deleteReceipt(receiptToDelete.id || receiptToDelete._id)}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm"
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
    const { error } = this.state;

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6"> {/* Reduced padding */}
        <div className="max-w-7xl mx-auto">
          <div className="mb-2 pt-2"> {/* Reduced margin-bottom and removed padding-top */}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white"> {/* Smaller text */}
              Receipts Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1"> {/* Added margin-top instead of padding */}
              Manage and view all your sales receipts
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded text-sm"> {/* Reduced padding and smaller text */}
              <strong>Error:</strong> {error}
            </div>
          )}

          {this.renderFilters()}
          {this.renderReceiptsTable()}
          {this.renderReceiptModal()}
          {this.renderDeleteModal()}
        </div>
      </div>
    );
  }
}

export default Receipts;