import React, { Component } from 'react';
import axios from 'axios';
import { FaBox, FaSearch, FaFilter, FaEdit, FaTrash, FaExclamationTriangle, FaChartBar, FaCube, FaExclamationCircle, FaRedo, FaBell, FaTag, FaWarehouse, FaShoppingCart } from 'react-icons/fa';
import { API_BASE_URL } from "../../config/api.jsx";
class ManualStock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      products: [],
      loading: true,
      error: null,
      searchTerm: '',
      categoryFilter: 'all',
      currentPage: 1,
      itemsPerPage: 12,
      categories: [],
      total: 0,
      totalPages: 0
    };
  }

  componentDidMount() {
    this.fetchProducts();
    this.fetchCategories();
  }

  fetchProducts = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const { searchTerm, categoryFilter, currentPage, itemsPerPage } = this.state;
      
      console.log('Fetching products with params:', {
        page: currentPage,
        limit: itemsPerPage,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm || undefined
      });

      const response = await axios.get(`${API_BASE_URL}/api/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: searchTerm || undefined
        }
      });

      console.log('API Response:', response.data);

      if (response.data.success) {
        this.setState({
          products: response.data.products || [],
          totalPages: response.data.totalPages || 0,
          total: response.data.total || 0,
          loading: false
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      this.setState({
        error: error.response?.data?.message || error.message || 'Failed to fetch products',
        loading: false,
        products: []
      });
    }
  };

  fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/products/categories`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        this.setState({ categories: response.data.categories || [] });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      this.setState({ categories: [] });
    }
  };

  calculateStockValue = () => {
    const { products } = this.state;
    if (!products || !Array.isArray(products)) {
      return 0;
    }
    return products.reduce((total, product) => {
      const price = Number(product.price) || 0;
      const quantity = Number(product.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  };

  getLowStockProducts = () => {
    const { products } = this.state;
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return products.filter(product => product.lowStockAlert === true);
  };

  getCriticallyLowStockProducts = () => {
    const { products } = this.state;
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return products.filter(product => {
      const quantity = Number(product.quantity) || 0;
      return quantity <= 10;
    });
  };

  handleSearch = (e) => {
    this.setState({ searchTerm: e.target.value }, () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.setState({ currentPage: 1 }, this.fetchProducts);
      }, 500);
    });
  };

  handleCategoryFilter = (e) => {
    this.setState({ 
      categoryFilter: e.target.value,
      currentPage: 1 
    }, this.fetchProducts);
  };

  handlePageChange = (page) => {
    this.setState({ currentPage: page }, this.fetchProducts);
  };

  handleEditProduct = (product) => {
    // Navigate to products page with edit state
    if (this.props.navigate) {
      this.props.navigate('/dashboard/wholesaler/products', { 
        state: { 
          action: 'edit',
          productId: product._id,
          productData: product 
        } 
      });
    } else {
      console.warn('Navigate function not available');
      // Fallback: redirect to products page
      window.location.href = '/dashboard/wholesaler/products';
    }
  };

  handleDeleteProduct = async (product) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      // Navigate to products page with delete state
      if (this.props.navigate) {
        this.props.navigate('/dashboard/wholesaler/products', { 
          state: { 
            action: 'delete',
            productId: product._id
          } 
        });
      } else {
        // Fallback: direct API call
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/api/products/${product._id}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          this.fetchProducts();
        } catch (error) {
          alert('Failed to delete product: ' + (error.response?.data?.message || error.message));
        }
      }
    }
  };

  handleRetry = () => {
    this.fetchProducts();
  };

  calculateStockPercentage = (product) => {
    if (!product.originalStockQuantity || product.originalStockQuantity === 0) {
      return 100;
    }
    return (product.quantity / product.originalStockQuantity) * 100;
  };

  getStockStatusColor = (percentage) => {
    if (percentage <= 10) return 'red';
    if (percentage <= 50) return 'orange';
    return 'green';
  };

  getStockStatusText = (percentage) => {
    if (percentage <= 10) return 'Critical';
    if (percentage <= 50) return 'Low';
    return 'Good';
  };

  render() {
    const { 
      products,
      loading, 
      error,
      searchTerm, 
      categoryFilter, 
      categories,
      currentPage, 
      totalPages,
      total
    } = this.state;

    if (loading) {
      return (
        <div className="h-full bg-gray-100 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full bg-gray-100 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-center py-6">
              <FaExclamationCircle className="text-3xl text-red-500 dark:text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Failed to Load Products
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-md mx-auto">
                {error}
              </p>
              <div className="space-y-2">
                <button 
                  onClick={this.handleRetry}
                  className="flex items-center justify-center mx-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <FaRedo className="mr-1.5" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const stockValue = this.calculateStockValue();
    const lowStockCount = this.getLowStockProducts().length;
    const criticallyLowCount = this.getCriticallyLowStockProducts().length;

    return (
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-900 p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white mb-0">
                Manual Stock Management
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Manage your product inventory and stock levels manually
              </p>
            </div>
            <button 
              onClick={this.handleRetry}
              className="flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 mt-1 sm:mt-0"
            >
              <FaRedo className="mr-1" />
              Refresh
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-2">
          {/* Summary Cards - Reduced Size */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                  <FaCube className="text-blue-600 dark:text-blue-300 text-xs" /> 
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Total Products</h2>
                  <p className="text-sm font-semibold dark:text-white">{total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-green-100 dark:bg-green-900 rounded">
                  <FaChartBar className="text-green-600 dark:text-green-300 text-xs" />
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Stock Value</h2>
                  <p className="text-sm font-semibold dark:text-white">
                    UGX {stockValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
                  <FaBell className="text-orange-600 dark:text-orange-300 text-xs" />
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Low Stock</h2>
                  <p className="text-sm font-semibold dark:text-white">{lowStockCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-red-100 dark:bg-red-900 rounded">
                  <FaExclamationTriangle className="text-red-600 dark:text-red-300 text-xs" />
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Critical</h2>
                  <p className="text-sm font-semibold dark:text-white">{criticallyLowCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Filters and Search - Reduced Size */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-1.5">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={this.handleSearch}
                    className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <FaFilter className="text-gray-400 text-xs" />
                  <select 
                    value={categoryFilter} 
                    onChange={this.handleCategoryFilter}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
           
            {/* Products Cards Container with Fixed Height and Scroll */}
            <div className="p-2">
              {products.length > 0 ? (
                <>
                  {/* Products Grid with Fixed Height Container */}
                  <div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4"
                    style={{ 
                      maxHeight: 'calc(100vh - 300px)', 
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}
                  >
                    {products.map(product => {
                      const stockPercentage = this.calculateStockPercentage(product);
                      const statusColor = this.getStockStatusColor(stockPercentage);
                      const statusText = this.getStockStatusText(stockPercentage);
                      const isLowStock = product.lowStockAlert;
                      const isCriticallyLow = product.quantity <= 10;
                      
                      return (
                        <div 
                          key={product._id} 
                          className={`
                            bg-white dark:bg-gray-800 rounded shadow border-l-3 overflow-hidden transition-all duration-200 hover:shadow-md
                            h-64 /* Fixed height for all cards */
                            ${isCriticallyLow ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 
                              isLowStock ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 
                              'border-green-500 hover:border-green-600'}
                          `}
                        >
                          {/* Product Image */}
                          <div className="relative h-24"> {/* Fixed image height */}
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0].url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <FaBox className="text-xl text-gray-400" />
                              </div>
                            )}
                            
                            {/* Status Badge */}
                            <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              statusColor === 'red' ? 'bg-red-500 text-white' :
                              statusColor === 'orange' ? 'bg-orange-500 text-white' :
                              'bg-green-500 text-white'
                            }`}>
                              {statusText}
                            </div>
                            
                            {/* Category Badge */}
                            <div className="absolute top-1 left-1">
                              <span className="px-1.5 py-0.5 bg-black bg-opacity-50 text-white text-[10px] rounded-full">
                                {product.category}
                              </span>
                            </div>
                          </div>

                          {/* Product Info - Fixed height content area */}
                          <div className="p-2 h-40 flex flex-col"> {/* Fixed height for content */}
                            <div className="mb-2 flex-shrink-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                SKU: {product.sku}
                              </p>
                            </div>

                            {/* Price */}
                            <div className="flex items-center justify-between mb-2 flex-shrink-0">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                UGX {(product.price || 0).toLocaleString()}
                              </span>
                              <span className={`text-xs font-medium ${
                                isCriticallyLow ? 'text-red-600 dark:text-red-400' : 
                                isLowStock ? 'text-orange-600 dark:text-orange-400' : 
                                'text-green-600 dark:text-green-400'
                              }`}>
                                {product.quantity || 0} {product.measurementUnit}
                              </span>
                            </div>

                            {/* Stock Progress Bar */}
                            <div className="mb-2 flex-shrink-0">
                              <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                <span>Stock Level</span>
                                <span>{stockPercentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    statusColor === 'red' ? 'bg-red-500' :
                                    statusColor === 'orange' ? 'bg-orange-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.max(stockPercentage, 5)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Status and Actions - Pushed to bottom */}
                            <div className="mt-auto flex items-center justify-between flex-shrink-0">
                              <div className="flex space-x-0.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  product.isActive 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}>
                                  {product.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {isLowStock && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                    Low
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => this.handleEditProduct(product)}
                                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                                  title="Edit Product"
                                >
                                  <FaEdit className="text-xs" />
                                </button>
                                <button
                                  onClick={() => this.handleDeleteProduct(product)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                  title="Delete Product"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination - Reduced Size */}
                  {totalPages > 1 && (
                    <div className="px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          Showing {((currentPage - 1) * this.state.itemsPerPage) + 1} to {Math.min(currentPage * this.state.itemsPerPage, total)} of {total} products
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => this.handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => this.handlePageChange(page)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => this.handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <FaBox className="mx-auto text-4xl text-gray-400 mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                    No products found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 max-w-md mx-auto">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'You haven\'t added any products yet'
                    }
                  </p>
                  <button 
                    onClick={() => window.location.href = '/add-product'}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Add Your First Product
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ManualStock;