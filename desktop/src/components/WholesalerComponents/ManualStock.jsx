// components/WholesalerComponents/ManualStock.jsx
import React, { Component } from 'react';
import axios from 'axios';
import { 
  FaBox, FaSearch, FaFilter, FaEdit, FaTrash, FaExclamationTriangle, 
  FaChartBar, FaCube, FaExclamationCircle, FaRedo, FaBell, FaTag, 
  FaWarehouse, FaShoppingCart, FaSync, FaDownload, FaPrint 
} from 'react-icons/fa';
import { API_BASE_URL } from "../../config/api";

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
      totalPages: 0,
      lastSync: null,
      exportLoading: false,
      authChecked: false
    };
  }

  componentDidMount() {
    console.log('🔄 ManualStock component mounted');
    this.initializeAuthAndFetch();
  }

  // SIMPLIFIED token retrieval
  getAuthToken = () => {
    try {
      // Try multiple token storage locations
      const tokenKeys = [
        'trade_uganda_token',
        'token',
        'auth_token',
        'user_token'
      ];

      for (const key of tokenKeys) {
        const storedToken = localStorage.getItem(key);
        if (storedToken) {
          console.log(`🔑 Found token in localStorage with key: ${key}`);
          
          // Handle different token formats
          if (typeof storedToken === 'string' && storedToken.startsWith('eyJ')) {
            return storedToken; // It's already a JWT token string
          }

          try {
            const parsed = JSON.parse(storedToken);
            if (parsed && typeof parsed === 'object') {
              return parsed.token || parsed.data || parsed;
            }
            return parsed;
          } catch (parseError) {
            // If parsing fails, return the raw value
            return storedToken;
          }
        }
      }

      console.warn('❌ No authentication token found');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // SIMPLIFIED initialization
  initializeAuthAndFetch = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      // Small delay to ensure AuthContext is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('✅ Auth initialized, fetching data...');
      
      // Set auth initialized and fetch data
      this.setState({ authChecked: true }, () => {
        this.fetchProducts();
        this.fetchCategories();
      });
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.setState({
        error: error.message,
        loading: false,
        authChecked: true
      });
    }
  };

  // Cache products for offline use
  cacheProducts = async (data) => {
    try {
      const cacheData = {
        data,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('manual_stock_products_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching products:', error);
    }
  };

  // Get cached products
  getCachedProducts = () => {
    try {
      const stored = localStorage.getItem('manual_stock_products_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached products:', error);
      return null;
    }
  };

  // SIMPLIFIED fetch method
  fetchProducts = async () => {
    try {
      console.log('🔄 Starting to fetch products...');

      this.setState({ loading: true, error: null });

      // Try to get cached data first for immediate display
      const cachedData = this.getCachedProducts();
      if (cachedData) {
        console.log('📦 Found cached data, displaying immediately');
        this.setState({
          products: cachedData,
          loading: false
        });
        
        // If offline, use cached data and return
        if (!this.props.isOnline) {
          console.log('📴 Offline mode - using cached data only');
          return;
        }
      }

      // Get token for API call
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      console.log('🔐 Making API request with token...');

      const { searchTerm, categoryFilter, currentPage, itemsPerPage } = this.state;
      
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
        },
        timeout: 15000 // 15 second timeout
      });

      console.log('✅ API Response received:', response.data);

      if (response.data.success) {
        const productsData = response.data.products || [];
        this.setState({
          products: productsData,
          totalPages: response.data.totalPages || 0,
          total: response.data.total || 0,
          loading: false,
          lastSync: new Date().toLocaleTimeString()
        });

        // Cache the data for offline use
        await this.cacheProducts(productsData);

        console.log(`✅ Loaded ${productsData.length} products successfully`);
      } else {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      
      // If we have cached data, use it even if fetch failed
      const cachedData = this.getCachedProducts();
      if (cachedData && this.state.products.length === 0) {
        console.log('🔄 Using cached data due to fetch error');
        this.setState({
          products: cachedData,
          loading: false,
          error: 'Using cached data - ' + (error.response?.data?.message || error.message || 'Network error')
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch products';
        this.setState({
          error: errorMessage,
          loading: false,
          products: []
        });
      }
    }
  };

  fetchCategories = async () => {
    try {
      const token = this.getAuthToken();
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
    console.log('Editing product:', product);
    // Navigate to products page for editing
    window.location.href = '/dashboard/wholesaler/products';
  };

  handleDeleteProduct = async (product) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      console.log('Deleting product:', product);
      // Navigate to products page for deletion
      window.location.href = '/dashboard/wholesaler/products';
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

  handleExportData = async () => {
    this.setState({ exportLoading: true });
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        type: 'manual_stock_products',
        data: {
          totalProducts: this.state.total,
          stockValue: this.calculateStockValue(),
          lowStockCount: this.getLowStockProducts().length,
          criticalStockCount: this.getCriticallyLowStockProducts().length,
          searchTerm: this.state.searchTerm,
          categoryFilter: this.state.categoryFilter,
          lastSync: this.state.lastSync
        },
        products: this.state.products.map(product => ({
          name: product.name,
          sku: product.sku,
          category: product.category,
          price: product.price,
          quantity: product.quantity,
          measurementUnit: product.measurementUnit,
          stockPercentage: this.calculateStockPercentage(product),
          lowStockAlert: product.lowStockAlert,
          isActive: product.isActive,
          images: product.images?.length || 0
        }))
      };

      // Simple download implementation
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual-stock-products-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Export failed: ' + error.message);
    } finally {
      this.setState({ exportLoading: false });
    }
  };

  handleManualRefresh = () => {
    if (!this.props.isOnline) {
      alert('Cannot refresh without internet connection');
      return;
    }
    this.fetchProducts();
  };

  handleLoginRedirect = () => {
    window.location.href = '/login';
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
      total,
      lastSync,
      exportLoading
    } = this.state;

    const { isElectron, isOnline } = this.props;

    console.log('🔄 ManualStock render - loading:', loading, 'error:', error, 'products count:', products.length);

    // Show loading state
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

    // Show error state
    if (error) {
      const isAuthError = error.includes('authentication') || error.includes('token') || error.includes('login');
      
      return (
        <div className="h-full bg-gray-100 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-center py-6">
              <FaExclamationCircle className="text-3xl text-red-500 dark:text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                {isAuthError ? 'Authentication Required' : 'Failed to Load Products'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 max-w-md mx-auto">
                {error}
              </p>
              <div className="space-y-2">
                {isAuthError ? (
                  <button 
                    onClick={this.handleLoginRedirect}
                    className="flex items-center justify-center mx-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Go to Login
                  </button>
                ) : (
                  <button 
                    onClick={this.handleRetry}
                    className="flex items-center justify-center mx-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <FaRedo className="mr-1.5" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const stockValue = this.calculateStockValue();
    const lowStockCount = this.getLowStockProducts().length;
    const criticallyLowCount = this.getCriticallyLowStockProducts().length;

    console.log('✅ Rendering ManualStock with products:', products.length);

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
                {isElectron && ' • Desktop Mode'}
              </p>
              {lastSync && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Last synced: {lastSync}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1 sm:mt-0">
              {/* Desktop Controls */}
              {isElectron && (
                <>
                  <button
                    onClick={this.handleManualRefresh}
                    disabled={!isOnline}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                      isOnline
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FaSync className="h-3 w-3" />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={this.handleExportData}
                    disabled={exportLoading}
                    className="flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <FaDownload className={`w-3 h-3 mr-1 ${exportLoading ? 'animate-spin' : ''}`} />
                    <span>Export</span>
                  </button>
                </>
              )}

              <button 
                onClick={this.handleRetry}
                className="flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <FaRedo className="mr-1" />
                Refresh
              </button>
            </div>
          </div>

          {/* Desktop Features Banner */}
          {isElectron && (
            <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaBox className="text-blue-600 dark:text-blue-400 text-sm" />
                  <div>
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                      Desktop Manual Stock
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {isOnline ? 'Real-time inventory management' : 'Working with cached product data'}
                    </p>
                  </div>
                </div>
                {!isOnline && (
                  <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                    Offline Mode
                  </span>
                )}
              </div>
            </div>
          )}
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
           
            {/* Products Cards Container */}
            <div className="p-2">
              {products.length > 0 ? (
                <>
                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
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
                            h-64
                            ${isCriticallyLow ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 
                              isLowStock ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 
                              'border-green-500 hover:border-green-600'}
                          `}
                        >
                          {/* Product Image */}
                          <div className="relative h-24">
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

                          {/* Product Info */}
                          <div className="p-2 h-40 flex flex-col">
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

                            {/* Status and Actions */}
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
                    onClick={() => window.location.href = '/dashboard/wholesaler/products'}
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