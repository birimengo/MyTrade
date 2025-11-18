// components/WholesalerComponents/SystemStock.jsx
import React, { Component } from 'react';
import axios from 'axios';
import { 
  FaBox, FaSearch, FaFilter, FaExclamationTriangle, 
  FaChartBar, FaCube, FaExclamationCircle, FaRedo, FaBell, 
  FaDatabase, FaSync, FaCheckCircle, FaCalendar, FaMoneyBillWave,
  FaTruck, FaUser, FaMapMarkerAlt, FaShoppingCart, FaImage,
  FaChevronLeft, FaChevronRight,
  FaDownload,
  FaPrint
} from 'react-icons/fa';
import { API_BASE_URL } from "../../config/api";

class SystemStock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      certifiedOrders: [],
      loading: true,
      error: null,
      searchTerm: '',
      categoryFilter: 'all',
      currentPage: 1,
      itemsPerPage: 12,
      categories: [],
      total: 0,
      totalPages: 0,
      statistics: {
        totalOrders: 0,
        totalValue: 0
      },
      syncing: false,
      productImages: {},
      imageLoading: {},
      orderImageIndices: {},
      lastSync: null,
      exportLoading: false,
      authInitialized: false
    };
  }

  componentDidMount() {
    this.initializeAndFetchData();
  }

  // Safe Electron API access
  safeElectronAPI = {
    showNotification: (title, message) => {
      if (this.props.isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (this.props.isElectron && typeof window.electronAPI?.storage?.getPersistent === 'function') {
          return await window.electronAPI.storage.getPersistent(key);
        }
        try {
          const value = localStorage.getItem(`electron_${key}`);
          return { success: true, value: value ? JSON.parse(value) : null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      setPersistent: async (key, value) => {
        if (this.props.isElectron && typeof window.electronAPI?.storage?.setPersistent === 'function') {
          return await window.electronAPI.storage.setPersistent(key, value);
        }
        try {
          localStorage.setItem(`electron_${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },

    saveRegistrationData: async (data, filename) => {
      if (this.props.isElectron && typeof window.electronAPI?.saveRegistrationData === 'function') {
        return await window.electronAPI.saveRegistrationData(data, filename);
      }
      // Fallback for web
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  // SIMPLIFIED token retrieval - just get the token directly
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

  // SIMPLIFIED initialization - remove complex retry logic
  initializeAndFetchData = async () => {
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
      this.setState({ authInitialized: true }, () => {
        this.fetchCertifiedOrders();
      });
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.setState({
        error: error.message,
        loading: false,
        authInitialized: true
      });
    }
  };

  // Cache certified orders for offline use
  cacheCertifiedOrders = async (data) => {
    try {
      await this.safeElectronAPI.storage.setPersistent('cached_certified_orders', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching certified orders:', error);
    }
  };

  // Get cached certified orders
  getCachedCertifiedOrders = async () => {
    try {
      let cachedData = null;
      
      if (this.props.isElectron) {
        const result = await this.safeElectronAPI.storage.getPersistent('cached_certified_orders');
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem('system_stock_certified_orders_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedData = parsed.data;
        }
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error getting cached certified orders:', error);
      return null;
    }
  };

  // SIMPLIFIED fetch method - remove auth check blocking
  fetchCertifiedOrders = async () => {
    try {
      console.log('🔄 Starting to fetch certified orders...');

      // Try to get cached data first for immediate display
      const cachedData = await this.getCachedCertifiedOrders();
      if (cachedData) {
        console.log('📦 Found cached data, displaying immediately');
        this.setState({
          certifiedOrders: cachedData,
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
      
      const response = await axios.get(`${API_BASE_URL}/api/wholesaler-orders`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          status: 'certified',
          search: searchTerm || undefined
        },
        timeout: 15000 // 15 second timeout
      });

      console.log('✅ API Response received:', response.data);

      if (response.data.success) {
        const orders = response.data.orders || [];
        
        // Extract categories from orders
        const categories = this.extractCategories(orders);
        
        // Initialize image indices for all orders
        const orderImageIndices = {};
        orders.forEach(order => {
          orderImageIndices[order._id] = 0;
        });
        
        this.setState({
          certifiedOrders: orders,
          categories,
          totalPages: response.data.pagination?.totalPages || 0,
          total: response.data.pagination?.totalOrders || 0,
          loading: false,
          orderImageIndices,
          statistics: {
            totalOrders: response.data.pagination?.totalOrders || 0,
            totalValue: this.calculateTotalValue(orders)
          },
          lastSync: new Date().toLocaleTimeString()
        });

        // Cache the data for offline use
        await this.cacheCertifiedOrders(orders);

        // Show desktop notification
        this.safeElectronAPI.showNotification(
          'System Stock Updated',
          `Loaded ${orders.length} certified orders`
        );

        // Fetch images for all products in the background
        this.fetchAllProductImages(orders);
      } else {
        throw new Error(response.data.message || 'Failed to fetch certified orders');
      }
    } catch (error) {
      console.error('❌ Error fetching certified orders:', error);
      
      // If we have cached data, use it even if fetch failed
      const cachedData = await this.getCachedCertifiedOrders();
      if (cachedData && this.state.certifiedOrders.length === 0) {
        console.log('🔄 Using cached data due to fetch error');
        this.setState({
          certifiedOrders: cachedData,
          loading: false,
          error: 'Using cached data - ' + (error.response?.data?.message || error.message || 'Network error')
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch certified orders';
        this.setState({
          error: errorMessage,
          loading: false
        });
      }
      
      this.safeElectronAPI.showNotification(
        'Fetch Failed',
        error.response?.data?.message || error.message || 'Failed to fetch certified orders'
      );
    }
  };

  extractCategories = (orders) => {
    const categories = new Set();
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.product?.category) {
          categories.add(item.product.category);
        }
      });
    });
    return Array.from(categories);
  };

  calculateTotalValue = (orders) => {
    return orders.reduce((total, order) => total + (order.finalAmount || 0), 0);
  };

  fetchAllProductImages = async (orders) => {
    const productIds = new Set();
    const productImages = { ...this.state.productImages };
    const imageLoading = { ...this.state.imageLoading };

    // Collect all product IDs
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.product?._id) {
          productIds.add(item.product._id);
        }
      });
    });

    console.log('🖼️ Fetching images for products:', Array.from(productIds));

    // Try multiple strategies to get product images
    for (const productId of productIds) {
      if (productImages[productId] || imageLoading[productId]) continue;

      imageLoading[productId] = true;
      this.setState({ imageLoading });

      try {
        // Strategy 1: Check if product data already has images in the order
        const orderWithProduct = orders.find(order => 
          order.items?.some(item => item.product?._id === productId)
        );
        
        const productFromOrder = orderWithProduct?.items?.find(item => 
          item.product?._id === productId
        )?.product;

        if (productFromOrder?.images?.length > 0) {
          console.log(`✅ Found images in order data for product ${productId}`);
          productImages[productId] = {
            images: productFromOrder.images,
            name: productFromOrder.name,
            category: productFromOrder.category
          };
          continue;
        }

        // Strategy 2: Try supplier products endpoint
        const token = this.getAuthToken();
        if (token) {
          try {
            const response = await axios.get(`${API_BASE_URL}/api/supplier/products/${productId}`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            if (response.data.success && response.data.product) {
              const product = response.data.product;
              console.log(`✅ Fetched product ${productId} from supplier API`);
              productImages[productId] = {
                images: product.images || [],
                name: product.name,
                category: product.category
              };
              continue;
            }
          } catch (supplierError) {
            console.log(`❌ Supplier API failed for product ${productId}`);
          }

          // Strategy 3: Try general products endpoint
          try {
            const response = await axios.get(`${API_BASE_URL}/api/products/${productId}`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            if (response.data.success && response.data.product) {
              const product = response.data.product;
              console.log(`✅ Fetched product ${productId} from products API`);
              productImages[productId] = {
                images: product.images || [],
                name: product.name,
                category: product.category
              };
              continue;
            }
          } catch (productError) {
            console.log(`❌ Products API failed for product ${productId}`);
          }
        }

        // Strategy 4: Use fallback data from order
        if (productFromOrder) {
          productImages[productId] = {
            images: [],
            name: productFromOrder.name || 'Unknown Product',
            category: productFromOrder.category || 'Unknown'
          };
        } else {
          // Final fallback
          productImages[productId] = {
            images: [],
            name: 'Unknown Product',
            category: 'Unknown'
          };
        }

      } catch (error) {
        console.error(`❌ Error fetching product ${productId}:`, error);
        productImages[productId] = {
          images: [],
          name: 'Error Loading Product',
          category: 'Unknown'
        };
      } finally {
        delete imageLoading[productId];
      }
    }

    this.setState({ productImages, imageLoading });
  };

  getProductData = (productId) => {
    return this.state.productImages[productId] || {
      images: [],
      name: 'Loading...',
      category: 'Unknown'
    };
  };

  getProductImage = (productId, index = 0) => {
    const productData = this.getProductData(productId);
    if (productData.images && productData.images.length > 0) {
      const imageIndex = Math.min(index, productData.images.length - 1);
      const image = productData.images[imageIndex];
      return typeof image === 'string' ? image : image.url;
    }
    return null;
  };

  getProductName = (productId) => {
    return this.getProductData(productId).name;
  };

  getProductCategory = (productId) => {
    return this.getProductData(productId).category;
  };

  // Image navigation methods
  nextImage = (orderId, event) => {
    event.stopPropagation();
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) return;

    const productData = this.getProductData(firstProductId);
    if (productData.images.length <= 1) return;

    this.setState(prevState => {
      const currentIndex = prevState.orderImageIndices[orderId] || 0;
      const nextIndex = (currentIndex + 1) % productData.images.length;
      
      return {
        orderImageIndices: {
          ...prevState.orderImageIndices,
          [orderId]: nextIndex
        }
      };
    });
  };

  prevImage = (orderId, event) => {
    event.stopPropagation();
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) return;

    const productData = this.getProductData(firstProductId);
    if (productData.images.length <= 1) return;

    this.setState(prevState => {
      const currentIndex = prevState.orderImageIndices[orderId] || 0;
      const prevIndex = currentIndex === 0 ? productData.images.length - 1 : currentIndex - 1;
      
      return {
        orderImageIndices: {
          ...prevState.orderImageIndices,
          [orderId]: prevIndex
        }
      };
    });
  };

  getCurrentImageIndex = (orderId) => {
    return this.state.orderImageIndices[orderId] || 0;
  };

  getTotalImages = (orderId) => {
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return 0;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) return 0;

    const productData = this.getProductData(firstProductId);
    return productData.images ? productData.images.length : 0;
  };

  renderProductImage = (orderId, className = "w-full h-full object-cover") => {
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return null;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) {
      return (
        <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative`}>
          <FaImage className="text-gray-400 text-xl" />
        </div>
      );
    }

    const productData = this.getProductData(firstProductId);
    const currentIndex = this.getCurrentImageIndex(orderId);
    const totalImages = this.getTotalImages(orderId);
    const imageUrl = this.getProductImage(firstProductId, currentIndex);
    
    if (imageUrl) {
      return (
        <div className="relative w-full h-full">
          <img 
            src={imageUrl} 
            alt={`${productData.name} - Image ${currentIndex + 1}`}
            className={className}
            onError={(e) => {
              console.log(`❌ Image failed to load: ${imageUrl}`);
              e.target.style.display = 'none';
            }}
          />
          
          {/* Navigation Arrows - Only show if multiple images */}
          {totalImages > 1 && (
            <>
              <button
                onClick={(e) => this.prevImage(orderId, e)}
                className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-all duration-200 z-10"
                title="Previous image"
              >
                <FaChevronLeft className="text-xs" />
              </button>
              
              <button
                onClick={(e) => this.nextImage(orderId, e)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-all duration-200 z-10"
                title="Next image"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </>
          )}
          
          {/* Image Counter - Only show if multiple images */}
          {totalImages > 1 && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs z-10">
              {currentIndex + 1} / {totalImages}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative`}>
        <FaImage className="text-gray-400 text-xl" />
      </div>
    );
  };

  syncToSystemStock = async () => {
    try {
      this.setState({ syncing: true });
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/system-stocks/sync`, {}, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.success) {
        const message = `Sync completed! Created: ${response.data.created}, Skipped: ${response.data.skipped}`;
        alert(message);
        this.safeElectronAPI.showNotification('Sync Successful', message);
        this.fetchCertifiedOrders();
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing to system stock:', error);
      const errorMessage = 'Sync failed: ' + (error.response?.data?.message || error.message);
      alert(errorMessage);
      this.safeElectronAPI.showNotification('Sync Failed', errorMessage);
    } finally {
      this.setState({ syncing: false });
    }
  };

  handleSearch = (e) => {
    this.setState({ searchTerm: e.target.value }, () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.setState({ currentPage: 1 }, this.fetchCertifiedOrders);
      }, 500);
    });
  };

  handleCategoryFilter = (e) => {
    this.setState({ 
      categoryFilter: e.target.value,
      currentPage: 1 
    }, this.fetchCertifiedOrders);
  };

  handlePageChange = (page) => {
    this.setState({ currentPage: page }, this.fetchCertifiedOrders);
  };

  handleRetry = () => {
    this.setState({ loading: true, error: null });
    this.fetchCertifiedOrders();
  };

  getPrimaryProduct = (order) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return { name: 'No Products', category: 'Unknown' };
    
    const productId = firstItem.product?._id;
    return {
      name: this.getProductName(productId),
      category: this.getProductCategory(productId)
    };
  };

  calculateTotalQuantity = (order) => {
    return order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
  };

  handleExportData = async () => {
    this.setState({ exportLoading: true });
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        type: 'system_stock_certified_orders',
        data: {
          totalOrders: this.state.total,
          totalValue: this.state.statistics.totalValue,
          searchTerm: this.state.searchTerm,
          categoryFilter: this.state.categoryFilter,
          lastSync: this.state.lastSync
        },
        orders: this.state.certifiedOrders.map(order => ({
          orderNumber: order.orderNumber,
          supplier: order.supplier?.businessName,
          totalAmount: order.totalAmount,
          finalAmount: order.finalAmount,
          items: order.items?.map(item => ({
            product: this.getProductName(item.product?._id),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          certifiedAt: order.certifiedAt
        }))
      };

      const result = await this.safeElectronAPI.saveRegistrationData(
        exportData,
        `system-stock-orders-${new Date().getTime()}.json`
      );

      if (result.success) {
        this.safeElectronAPI.showNotification(
          'Export Successful',
          'System stock data exported successfully'
        );
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.safeElectronAPI.showNotification('Export Failed', error.message);
    } finally {
      this.setState({ exportLoading: false });
    }
  };

  handleManualRefresh = () => {
    if (!this.props.isOnline) {
      this.safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    this.setState({ loading: true });
    this.fetchCertifiedOrders();
  };

  handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  render() {
    const { 
      certifiedOrders,
      loading, 
      error,
      searchTerm, 
      categoryFilter, 
      categories,
      currentPage, 
      totalPages,
      total,
      statistics,
      syncing,
      lastSync,
      exportLoading
    } = this.state;

    const { isElectron, isOnline } = this.props;

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
                {isAuthError ? 'Authentication Required' : 'Failed to Load Certified Orders'}
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

    return (
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-900 p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white mb-0">
                System Stock Management
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Certified orders from suppliers - Ready for system stock
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
                onClick={this.syncToSystemStock}
                disabled={syncing}
                className="flex items-center px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSync className={`mr-1 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync to System Stock'}
              </button>
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
                  <FaDatabase className="text-blue-600 dark:text-blue-400 text-sm" />
                  <div>
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                      Desktop System Stock
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {isOnline ? 'Real-time certified orders' : 'Working with cached orders'}
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-3">
            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                  <FaCheckCircle className="text-blue-600 dark:text-blue-300 text-xs" /> 
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Certified Orders</h2>
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
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Total Value</h2>
                  <p className="text-sm font-semibold dark:text-white">
                    UGX {statistics.totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
                  <FaBox className="text-purple-600 dark:text-purple-300 text-xs" />
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Total Items</h2>
                  <p className="text-sm font-semibold dark:text-white">
                    {certifiedOrders.reduce((total, order) => total + this.calculateTotalQuantity(order), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded shadow p-1.5">
              <div className="flex items-center">
                <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded">
                  <FaDatabase className="text-orange-600 dark:text-orange-300 text-xs" />
                </div>
                <div className="ml-2">
                  <h2 className="text-gray-500 dark:text-gray-300 text-[10px] font-medium">Ready to Sync</h2>
                  <p className="text-sm font-semibold dark:text-white">{total}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Certified Orders Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Filters and Search */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-1.5">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search certified orders..."
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
           
            {/* Orders Cards Container */}
            <div className="p-2">
              {certifiedOrders.length > 0 ? (
                <>
                  {/* Orders Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                    {certifiedOrders.map(order => {
                      const primaryProduct = this.getPrimaryProduct(order);
                      const totalQuantity = this.calculateTotalQuantity(order);
                      
                      return (
                        <div 
                          key={order._id} 
                          className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-green-500 overflow-hidden transition-all duration-200 hover:shadow-md"
                        >
                          {/* Product Image with Navigation */}
                          <div className="relative h-24 bg-gray-100 dark:bg-gray-700">
                            {this.renderProductImage(order._id, "w-full h-full object-cover")}
                            <div className="absolute top-1 right-1">
                              <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded-full font-semibold">
                                Certified
                              </span>
                            </div>
                            {primaryProduct.category && primaryProduct.category !== 'Unknown' && (
                              <div className="absolute top-1 left-1">
                                <span className="px-1.5 py-0.5 bg-black bg-opacity-50 text-white text-[10px] rounded-full">
                                  {primaryProduct.category}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Order Details */}
                          <div className="p-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate mb-1">
                              {primaryProduct.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Order: {order.orderNumber}
                            </p>

                            {/* Order Information */}
                            <div className="space-y-1.5 mb-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Supplier:</span>
                                <span className="font-semibold dark:text-white truncate ml-2 max-w-20">
                                  {order.supplier?.businessName || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Total Items:</span>
                                <span className="font-semibold dark:text-white">
                                  {totalQuantity}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Order Value:</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  UGX {(order.finalAmount || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Products List */}
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                <strong>Products:</strong>
                                <div className="mt-1 space-y-1 max-h-16 overflow-y-auto">
                                  {order.items?.slice(0, 3).map((item, index) => {
                                    const productId = item.product?._id;
                                    return (
                                      <div key={index} className="flex justify-between items-center text-xs">
                                        <span className="truncate flex-1">
                                          {this.getProductName(productId)}
                                        </span>
                                        <span className="font-semibold ml-1 whitespace-nowrap">
                                          {item.quantity} {item.product?.measurementUnit || 'units'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {order.items && order.items.length > 3 && (
                                    <div className="text-xs text-gray-500 text-center">
                                      +{order.items.length - 3} more items
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-700 dark:text-gray-300">
                          Showing {((currentPage - 1) * this.state.itemsPerPage) + 1} to {Math.min(currentPage * this.state.itemsPerPage, total)} of {total} orders
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
                  <FaCheckCircle className="mx-auto text-4xl text-gray-400 mb-3" />
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                    No certified orders found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 max-w-md mx-auto">
                    {searchTerm || categoryFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'No orders have been certified yet. Certified orders will appear here automatically.'
                    }
                  </p>
                  <button 
                    onClick={this.handleRetry}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Refresh
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

export default SystemStock;