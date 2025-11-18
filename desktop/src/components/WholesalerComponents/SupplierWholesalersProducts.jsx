import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaArrowLeft, 
  FaComments, 
  FaShoppingCart, 
  FaChevronLeft, 
  FaChevronRight,
  FaBox,
  FaTag,
  FaClock,
  FaWifi,
  FaSignal,
  FaSync,
  FaExclamationTriangle,
  FaDownload,
  FaPrint,
  FaIndustry
} from 'react-icons/fa';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import SupplierOrderForm from './SupplierOrderForm';

const SupplierWholesalersProducts = ({ isElectron, isOnline, onSync, syncStatus }) => {
  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [productImageIndices, setProductImageIndices] = useState({});
  const [lastSync, setLastSync] = useState(null);
  
  const { 
    isConnected, 
    onlineUsers, 
    connectionStatus,
    connectionHealth 
  } = useSocket();

  const { getAuthHeaders, API_BASE_URL } = useAuth();

  // Safe Electron API access
  const safeElectronAPI = {
    showNotification: (title, message) => {
      if (isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (isElectron && typeof window.electronAPI?.storage?.getPersistent === 'function') {
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
        if (isElectron && typeof window.electronAPI?.storage?.setPersistent === 'function') {
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
      if (isElectron && typeof window.electronAPI?.saveRegistrationData === 'function') {
        return await window.electronAPI.saveRegistrationData(data, filename);
      }
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

  // Get supplier ID from URL or navigation event
  const getSupplierId = () => {
    // Try to get from URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const supplierIdFromUrl = urlParams.get('supplierId');
    
    // Try to get from navigation event
    const navigationEvent = window.supplierNavigationData;
    
    // Try to get from localStorage (fallback)
    const storedSupplier = localStorage.getItem('selectedSupplier');
    
    return supplierIdFromUrl || (navigationEvent?.supplier?._id) || (storedSupplier ? JSON.parse(storedSupplier)._id : null);
  };

  // Cache products data
  const cacheProducts = async (supplierId, data) => {
    try {
      await safeElectronAPI.storage.setPersistent(`cached_supplier_products_${supplierId}`, {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching products:', error);
    }
  };

  const getCachedProducts = async (supplierId) => {
    try {
      let cachedData = null;
      
      if (isElectron) {
        const result = await safeElectronAPI.storage.getPersistent(`cached_supplier_products_${supplierId}`);
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem(`wholesaler_supplier_products_${supplierId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedData = parsed.data;
        }
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error getting cached products:', error);
      return null;
    }
  };

  // Check if supplier is online
  const isSupplierOnline = () => {
    return supplier ? onlineUsers.includes(supplier._id) : false;
  };

  useEffect(() => {
    // Listen for navigation events
    const handleNavigateToSupplierProducts = (event) => {
      const { supplier } = event.detail;
      if (supplier) {
        setSupplier(supplier);
        localStorage.setItem('selectedSupplier', JSON.stringify(supplier));
        fetchSupplierProducts(supplier._id);
      }
    };

    window.addEventListener('navigateToSupplierProducts', handleNavigateToSupplierProducts);

    // Initial load
    const supplierId = getSupplierId();
    if (supplierId) {
      fetchSupplierProducts(supplierId);
    } else {
      setError('No supplier selected');
      setLoading(false);
    }

    return () => {
      window.removeEventListener('navigateToSupplierProducts', handleNavigateToSupplierProducts);
    };
  }, []);

  const fetchSupplierProducts = async (supplierId) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached data first
      const cachedData = await getCachedProducts(supplierId);
      if (cachedData && !isOnline) {
        console.log('📦 Using cached supplier products data (offline mode)');
        setProducts(cachedData.products || []);
        setSupplier(cachedData.supplier);
        setFilteredProducts(cachedData.products || []);
        setLoading(false);
        return;
      }

      if (cachedData && isOnline) {
        setProducts(cachedData.products || []);
        setSupplier(cachedData.supplier);
        setFilteredProducts(cachedData.products || []);
      }

      const token = localStorage.getItem('trade_uganda_token');
      
      if (!token) {
        setError('Please log in to view products');
        setLoading(false);
        return;
      }

      // Fetch supplier details from backend
      const supplierResponse = await fetch(`${API_BASE_URL}/api/users/${supplierId}`, {
        headers: getAuthHeaders()
      });

      if (!supplierResponse.ok) {
        throw new Error('Failed to fetch supplier details');
      }

      const supplierData = await supplierResponse.json();
      if (!supplierData.success) {
        throw new Error(supplierData.message || 'Failed to fetch supplier');
      }

      setSupplier(supplierData.user);

      // Fetch supplier's products from backend
      const productsResponse = await fetch(
        `${API_BASE_URL}/api/supplier-products/supplier/${supplierId}`,
        { headers: getAuthHeaders() }
      );

      if (!productsResponse.ok) {
        throw new Error('Failed to fetch supplier products');
      }

      const productsData = await productsResponse.json();
      
      if (productsData.success) {
        const productsList = productsData.products || [];
        
        // Enhance products with default images if none provided
        const enhancedProducts = productsList.map(product => ({
          ...product,
          images: product.images?.length > 0 ? product.images : [
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
            { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=300&fit=crop' },
            { url: 'https://images.unsplash.com/photo-1557804483-efd2960ffc0e?w=400&h=300&fit=crop' }
          ],
          // Calculate profit margin if not provided
          profitMargin: product.profitMargin || ((product.sellingPrice - product.productionPrice) / product.productionPrice * 100),
          // Ensure production status
          productionStatus: product.productionStatus || 'ready',
          // Ensure measurement unit
          measurementUnit: product.measurementUnit || 'units'
        }));
        
        setProducts(enhancedProducts);
        setFilteredProducts(enhancedProducts);
        
        // Initialize image indices
        const initialIndices = {};
        enhancedProducts.forEach(product => {
          initialIndices[product._id] = 0;
        });
        setProductImageIndices(initialIndices);
        
        // Cache the data
        await cacheProducts(supplierId, {
          supplier: supplierData.user,
          products: enhancedProducts
        });
        
        setLastSync(new Date().toLocaleTimeString());
        
        safeElectronAPI.showNotification(
          'Products Loaded',
          `Loaded ${enhancedProducts.length} products from ${supplierData.user.businessName}`
        );
        
      } else {
        throw new Error(productsData.message || 'Failed to load products');
      }
      
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
      
      // Try to use cached data as fallback
      const supplierId = getSupplierId();
      if (supplierId) {
        const cachedData = await getCachedProducts(supplierId);
        if (cachedData) {
          setProducts(cachedData.products || []);
          setSupplier(cachedData.supplier);
          setFilteredProducts(cachedData.products || []);
          setError('Using cached data - ' + error.message);
        } else {
          // Only use mock data as last resort
          setError('Failed to load products: ' + error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  useEffect(() => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  // Image navigation
  const nextImage = (productId, event) => {
    event?.stopPropagation();
    setProductImageIndices(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p._id === productId);
      const maxIndex = product?.images?.length ? product.images.length - 1 : 0;
      return {
        ...prev,
        [productId]: currentIndex < maxIndex ? currentIndex + 1 : 0
      };
    });
  };

  const prevImage = (productId, event) => {
    event?.stopPropagation();
    setProductImageIndices(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p._id === productId);
      const maxIndex = product?.images?.length ? product.images.length - 1 : 0;
      return {
        ...prev,
        [productId]: currentIndex > 0 ? currentIndex - 1 : maxIndex
      };
    });
  };

  const handleBackToSuppliers = () => {
    window.dispatchEvent(new CustomEvent('navigateToTab', { 
      detail: { tab: 'suppliers' } 
    }));
  };

  const handleContactSupplier = () => {
    if (isSupplierOnline()) {
      safeElectronAPI.showNotification(
        'Chat Started', 
        `Opening chat with ${supplier?.businessName}`
      );
      window.dispatchEvent(new CustomEvent('navigateToChat', { 
        detail: { targetUser: supplier } 
      }));
    } else {
      safeElectronAPI.showNotification(
        'Supplier Offline', 
        `${supplier?.businessName} is currently offline. Try again later.`
      );
    }
  };

  const handleAddToCart = (product) => {
    safeElectronAPI.showNotification(
      'Added to Cart',
      `${product.name} has been added to your cart`
    );
    // Implement cart logic here
  };

  const handleOrderNow = (product) => {
    setSelectedProduct(product);
    setShowOrderModal(true);
  };

  const handleOrderPlaced = () => {
    // Refresh products after order
    const supplierId = getSupplierId();
    if (supplierId) {
      fetchSupplierProducts(supplierId);
    }
    safeElectronAPI.showNotification(
      'Order Placed',
      'Your order has been placed successfully'
    );
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setSelectedProduct(null);
  };

  const handleManualRefresh = () => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    if (onSync) {
      onSync();
    }
    const supplierId = getSupplierId();
    if (supplierId) {
      fetchSupplierProducts(supplierId);
    }
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      supplier: {
        name: supplier?.businessName,
        contact: `${supplier?.firstName} ${supplier?.lastName}`,
        email: supplier?.email,
        phone: supplier?.phone,
        category: supplier?.productCategory
      },
      productsData: {
        totalProducts: filteredProducts.length,
        categories: [...new Set(products.map(p => p.category))],
        lastSync: lastSync,
        searchTerm: searchTerm
      },
      products: filteredProducts.map(product => ({
        name: product.name,
        description: product.description,
        price: product.sellingPrice,
        category: product.category,
        quantity: product.quantity,
        minOrder: product.minOrderQuantity,
        status: product.productionStatus,
        specifications: product.specifications
      }))
    };

    const result = await safeElectronAPI.saveRegistrationData(
      exportData,
      `supplier-products-${supplier?.businessName?.replace(/\s+/g, '-')}-${new Date().getTime()}.json`
    );

    if (result.success) {
      safeElectronAPI.showNotification(
        'Export Successful',
        'Supplier products data exported successfully'
      );
    } else {
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  const getCategories = () => {
    return [...new Set(products.map(product => product.category).filter(Boolean))];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_production': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'discontinued': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getConnectionStatus = () => {
    if (syncStatus === 'syncing') return 'syncing';
    if (!isOnline) return 'offline';
    if (!isConnected) return 'disconnected';
    return 'connected';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <FaWifi className="h-3 w-3" />;
      case 'disconnected': return <FaSignal className="h-3 w-3" />;
      case 'syncing': return <FaSync className="h-3 w-3 animate-spin" />;
      case 'offline': return <FaExclamationTriangle className="h-3 w-3" />;
      default: return <FaSignal className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <FaIndustry className="inline mr-2 text-blue-600" />
              Supplier Products
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Loading from local cache and network...' : 'Loading supplier product catalog...'}
            </p>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading products (offline capable)...' : 'Loading products...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToSuppliers}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-sm font-medium p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Suppliers
          </button>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <FaIndustry className="inline mr-2 text-blue-600" />
              {supplier?.businessName}'s Products
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Browse and order from supplier's product catalog
              {isElectron && ' • Desktop Mode'}
            </p>
            {lastSync && (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                Last synced: {lastSync}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {/* Connection Status */}
          <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            getConnectionStatus() === 'connected' 
              ? 'bg-green-500 text-white shadow' 
              : getConnectionStatus() === 'syncing'
              ? 'bg-yellow-500 text-white shadow'
              : 'bg-red-500 text-white shadow'
          }`}>
            <div className="mr-1.5">
              {getStatusIcon(getConnectionStatus())}
            </div>
            {getConnectionStatus() === 'syncing' ? 'Syncing...' : 
             getConnectionStatus() === 'connected' ? 'Live' : 
             getConnectionStatus() === 'disconnected' ? 'Offline' : 'No Connection'}
          </div>

          {/* Supplier Online Status */}
          <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
            isSupplierOnline()
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${isSupplierOnline() ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
            {isSupplierOnline() ? 'Supplier Online' : 'Supplier Offline'}
          </div>

          {/* Desktop Actions */}
          {isElectron && (
            <div className="flex space-x-2">
              <button
                onClick={handleManualRefresh}
                disabled={!isOnline || syncStatus === 'syncing'}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isOnline && syncStatus !== 'syncing'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FaSync className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export products data to JSON file"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={handleContactSupplier}
                disabled={!isSupplierOnline()}
                className={`px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium ${
                  isSupplierOnline()
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FaComments className="w-4 h-4" />
                <span>Contact</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="ml-2">
                <h3 className="text-yellow-800 dark:text-yellow-200 font-medium text-xs">
                  {isOnline ? 'Sync Issue' : 'Offline Mode'}
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">{error}</p>
              </div>
            </div>
            {isOnline && (
              <button 
                onClick={handleManualRefresh}
                className="flex items-center px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors"
              >
                <FaSync className="mr-1" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Features Banner */}
      {isElectron && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaWifi className="text-blue-600 dark:text-blue-400 text-lg" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  Desktop Mode Active
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {isOnline ? 'Real-time updates enabled' : 'Working with cached data - some features limited'}
                </p>
              </div>
            </div>
            {!isOnline && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                Offline Mode
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      {products.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            >
              <option value="all">All Categories</option>
              {getCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
            <FaSearch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || selectedCategory !== 'all' ? 'No matching products' : 'No products found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search terms or category filter' 
              : 'This supplier hasn\'t added any products yet.'}
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const currentImageIndex = productImageIndices[product._id] || 0;
            const currentImage = product.images?.[currentImageIndex] || { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' };
            const hasMultipleImages = product.images && product.images.length > 1;

            return (
              <div key={product._id} className="border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group">
                {/* Product Image with Navigation */}
                <div className="relative aspect-w-16 aspect-h-12 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-lg mb-4">
                  <img
                    src={currentImage.url}
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Image Navigation Arrows */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={(e) => prevImage(product._id, e)}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <FaChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={(e) => nextImage(product._id, e)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <FaChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  {/* Image Indicator Dots */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                      {product.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductImageIndices(prev => ({
                              ...prev,
                              [product._id]: index
                            }));
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            index === currentImageIndex 
                              ? 'bg-white' 
                              : 'bg-white bg-opacity-50 hover:bg-opacity-70'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Image Counter */}
                  {hasMultipleImages && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                      {currentImageIndex + 1} / {product.images.length}
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.productionStatus)}`}>
                      {product.productionStatus?.replace('_', ' ') || 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        ${product.sellingPrice}
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {product.profitMargin?.toFixed(1)}% margin
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Min order: {product.minOrderQuantity} {product.measurementUnit}</span>
                      <span>Production: {product.productionTime} days</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded text-sm ${
                      product.quantity > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize flex items-center">
                      <FaTag className="w-3 h-3 mr-1" />
                      {product.category}
                    </span>
                  </div>

                  {/* Specifications */}
                  {product.specifications && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Specifications:</h4>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-400">
                        {Object.entries(product.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <button 
                      onClick={() => handleAddToCart(product)}
                      disabled={product.quantity === 0}
                      className={`flex-1 py-2 px-3 rounded text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                        product.quantity > 0
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <FaShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                    
                    <button 
                      onClick={() => handleOrderNow(product)}
                      disabled={product.quantity === 0}
                      className={`flex-1 py-2 px-3 rounded text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                        product.quantity > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <FaBox className="w-4 h-4" />
                      <span>Order Now</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && selectedProduct && (
        <SupplierOrderForm
          product={selectedProduct}
          supplier={supplier}
          onClose={handleCloseOrderModal}
          onOrderPlaced={handleOrderPlaced}
          isElectron={isElectron}
          isOnline={isOnline}
        />
      )}
    </div>
  );
};

export default SupplierWholesalersProducts;