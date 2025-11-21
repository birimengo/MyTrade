// components/WholesalerComponents/Products.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import AddProducts from './AddProducts';
import MyProducts from './MyProducts';
import { 
  FaBox, 
  FaPlus, 
  FaExclamationTriangle, 
  FaSync,
  FaDownload,
  FaPrint,
  FaChartLine,
  FaDollarSign,
  FaFilter,
  FaSearch
} from 'react-icons/fa';

const Products = ({ isElectron, isOnline, onSync, syncStatus }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('myProducts');
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [profitAnalytics, setProfitAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all'); // 'all', 'certified', 'manual'
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    quantity: '',
    measurementUnit: 'units',
    category: '',
    images: [],
    minOrderQuantity: '1',
    bulkDiscount: false,
    discountPercentage: '',
    tags: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Debug products when they change
  useEffect(() => {
    if (products.length > 0) {
      console.log('🔍 Products Analysis:', {
        totalProducts: products.length,
        certifiedProducts: products.filter(p => p.fromCertifiedOrder).length,
        manualProducts: products.filter(p => !p.fromCertifiedOrder).length,
        certifiedProductNames: products.filter(p => p.fromCertifiedOrder).map(p => p.name),
        manualProductNames: products.filter(p => !p.fromCertifiedOrder).map(p => p.name)
      });
    }
  }, [products]);

  // Handle navigation state
  useEffect(() => {
    const manualState = localStorage.getItem('product_edit_state');
    if (manualState) {
      try {
        const state = JSON.parse(manualState);
        if (state.action === 'edit' && state.productData) {
          handleEdit(state.productData);
        }
        if (state.action === 'delete' && state.productId) {
          setHighlightedProduct(state.productId);
        }
        // Clear the manual state
        localStorage.removeItem('product_edit_state');
      } catch (error) {
        console.error('Error parsing manual state:', error);
      }
    }
  }, []);

  // Handle deletion when highlightedProduct is set
  useEffect(() => {
    if (highlightedProduct && products.length > 0) {
      const productToDelete = products.find(p => p._id === highlightedProduct);
      if (productToDelete) {
        if (window.confirm(`Are you sure you want to delete "${productToDelete.name}"?`)) {
          handleDelete(highlightedProduct);
        }
        setHighlightedProduct(null);
      }
    }
  }, [highlightedProduct, products]);

  // Calculate profit analytics locally
  const calculateProfitAnalytics = () => {
    if (!products.length) {
      return {
        totalProducts: 0,
        totalInvestment: 0,
        totalPotentialRevenue: 0,
        totalPotentialProfit: 0,
        averageProfitMargin: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0
      };
    }

    const analytics = {
      totalProducts: products.length,
      totalInvestment: 0,
      totalPotentialRevenue: 0,
      totalPotentialProfit: 0,
      averageProfitMargin: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0
    };

    products.forEach(product => {
      const costPrice = product.costPrice || 0;
      const investment = costPrice * product.quantity;
      const potentialRevenue = product.price * product.quantity;
      const potentialProfit = potentialRevenue - investment;

      analytics.totalInvestment += investment;
      analytics.totalPotentialRevenue += potentialRevenue;
      analytics.totalPotentialProfit += potentialProfit;

      if (product.lowStockAlert) {
        analytics.lowStockProducts++;
      }

      if (product.quantity === 0) {
        analytics.outOfStockProducts++;
      }
    });

    if (analytics.totalInvestment > 0) {
      analytics.averageProfitMargin = (analytics.totalPotentialProfit / analytics.totalInvestment) * 100;
    }

    return analytics;
  };

  // Update analytics when products change
  useEffect(() => {
    if (products.length > 0) {
      const analytics = calculateProfitAnalytics();
      setProfitAnalytics(analytics);
    }
  }, [products]);

  // Cache products for offline use
  const cacheProducts = async (data) => {
    try {
      await safeElectronAPI.storage.setPersistent('cached_products', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching products:', error);
    }
  };

  // Get cached products
  const getCachedProducts = async () => {
    try {
      let cachedData = null;
      
      if (isElectron) {
        const result = await safeElectronAPI.storage.getPersistent('cached_products');
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem('wholesaler_products_cache');
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

  // Fetch ALL products without pagination limits
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached data first
      const cachedData = await getCachedProducts();
      if (cachedData && !isOnline) {
        console.log('📦 Using cached products data (offline mode)');
        setProducts(cachedData);
        setLoading(false);
        return;
      }

      if (cachedData && isOnline) {
        // Show cached data immediately while fetching fresh data
        setProducts(cachedData);
      }

      // Build URL with parameters to get ALL products
      const url = new URL(`${API_BASE_URL}/api/products`);
      url.searchParams.append('limit', '1000'); // Large number to get all products
      url.searchParams.append('page', '1');
      url.searchParams.append('includeCertified', 'true'); // Ensure certified products are included

      // Add search and category filters if active
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }
      if (categoryFilter !== 'all') {
        url.searchParams.append('category', categoryFilter);
      }

      console.log('🔄 Fetching products from:', url.toString());

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Products API endpoint not found. Please check server configuration.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      
      if (data.success) {
        const productsData = data.products || [];
        console.log('📦 Products fetch results:', {
          totalReceived: productsData.length,
          totalInResponse: data.total,
          hasMore: data.total > productsData.length,
          certifiedProducts: productsData.filter(p => p.fromCertifiedOrder).length,
          manualProducts: productsData.filter(p => !p.fromCertifiedOrder).length
        });
        
        setProducts(productsData);
        
        // Cache the data for offline use
        await cacheProducts(productsData);
        setLastSync(new Date().toLocaleTimeString());

        // Show desktop notification
        safeElectronAPI.showNotification(
          'Products Updated',
          `Loaded ${productsData.length} products (${data.total} total)`
        );
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
      
      // Try to use cached data as fallback
      const cachedData = await getCachedProducts();
      if (cachedData) {
        console.log('🔄 Using cached data due to fetch error');
        setProducts(cachedData);
        setError('Using cached data - ' + error.message);
      } else {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/categories`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        images: Array.from(files)
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'images') {
          formData.images.forEach(file => {
            formDataToSend.append('images', file);
          });
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const url = editingProduct 
        ? `${API_BASE_URL}/api/products/${editingProduct._id}`
        : `${API_BASE_URL}/api/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': getAuthHeaders().Authorization
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActiveTab('myProducts');
        setEditingProduct(null);
        resetForm();
        fetchProducts(); // Refresh the products list
        
        // Show desktop notification
        safeElectronAPI.showNotification(
          editingProduct ? 'Product Updated' : 'Product Created',
          editingProduct 
            ? `${formData.name} updated successfully`
            : `${formData.name} created successfully`
        );
      } else {
        throw new Error(data.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message);
      safeElectronAPI.showNotification('Save Failed', error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      costPrice: '',
      quantity: '',
      measurementUnit: 'units',
      category: '',
      images: [],
      minOrderQuantity: '1',
      bulkDiscount: false,
      discountPercentage: '',
      tags: ''
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      costPrice: product.costPrice || '',
      quantity: product.quantity,
      measurementUnit: product.measurementUnit,
      category: product.category,
      images: [],
      minOrderQuantity: product.minOrderQuantity,
      bulkDiscount: product.bulkDiscount,
      discountPercentage: product.discountPercentage || '',
      tags: product.tags?.join(', ') || ''
    });
    setActiveTab('addProduct');
    
    // Scroll to the top of the form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchProducts(); // Refresh the products list
        safeElectronAPI.showNotification('Product Deleted', 'Product deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error.message);
      safeElectronAPI.showNotification('Delete Failed', error.message);
    }
  };

  const cancelForm = () => {
    setEditingProduct(null);
    resetForm();
    setActiveTab('myProducts');
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        name: `${user?.firstName} ${user?.lastName}`,
        business: user?.businessName,
        role: user?.role
      },
      productsData: {
        totalProducts: products.length,
        lastSync: lastSync,
        activeTab: activeTab,
        profitAnalytics: profitAnalytics
      },
      products: products.map(product => ({
        name: product.name,
        description: product.description,
        price: product.price,
        costPrice: product.costPrice,
        quantity: product.quantity,
        measurementUnit: product.measurementUnit,
        category: product.category,
        minOrderQuantity: product.minOrderQuantity,
        bulkDiscount: product.bulkDiscount,
        discountPercentage: product.discountPercentage,
        tags: product.tags,
        images: product.images?.length || 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        isCertified: product.fromCertifiedOrder || false
      }))
    };

    const result = await safeElectronAPI.saveRegistrationData(
      exportData,
      `products-data-${new Date().getTime()}.json`
    );

    if (result.success) {
      safeElectronAPI.showNotification(
        'Export Successful',
        'Products data exported successfully'
      );
    } else {
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  const handleManualRefresh = () => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    fetchProducts();
  };

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryFilterChange = (e) => {
    setCategoryFilter(e.target.value);
  };

  const handleProductFilterChange = (filter) => {
    setProductFilter(filter);
  };

  // Filter products based on current filters
  const getFilteredProducts = () => {
    let filtered = products;

    // Apply product type filter
    if (productFilter === 'certified') {
      filtered = filtered.filter(product => product.fromCertifiedOrder);
    } else if (productFilter === 'manual') {
      filtered = filtered.filter(product => !product.fromCertifiedOrder);
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Calculate quick stats for header
  const calculateQuickStats = () => {
    if (!products.length) return null;

    const totalInvestment = products.reduce((sum, product) => 
      sum + ((product.costPrice || 0) * product.quantity), 0
    );
    const totalPotentialRevenue = products.reduce((sum, product) => 
      sum + (product.price * product.quantity), 0
    );
    const totalPotentialProfit = totalPotentialRevenue - totalInvestment;
    const averageMargin = totalInvestment > 0 ? (totalPotentialProfit / totalInvestment) * 100 : 0;

    return {
      totalInvestment,
      totalPotentialRevenue,
      totalPotentialProfit,
      averageMargin
    };
  };

  const quickStats = calculateQuickStats();

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                <FaBox className="inline mr-2 text-blue-600" />
                Product Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isElectron ? 'Loading from local cache and network...' : 'Loading your products...'}
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
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <FaBox className="inline mr-2 text-blue-600" />
              Product Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your product catalog and inventory
              {isElectron && ' • Desktop Mode'}
            </p>
            {lastSync && (
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                Last synced: {lastSync}
              </p>
            )}
            {editingProduct && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Editing:</strong> {editingProduct.name}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
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
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                  title="Print products summary"
                >
                  <FaPrint className="w-4 h-4 mr-2" />
                  Print
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setEditingProduct(null);
                resetForm();
                setActiveTab('addProduct');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <FaPlus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        {activeTab === 'myProducts' && products.length > 0 && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, description, or tags..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-400" />
                <select 
                  value={categoryFilter} 
                  onChange={handleCategoryFilterChange}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Type Filter */}
              <div className="flex bg-gray-100 dark:bg-gray-600 rounded-lg p-1">
                <button
                  onClick={() => handleProductFilterChange('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    productFilter === 'all' 
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All ({products.length})
                </button>
                <button
                  onClick={() => handleProductFilterChange('certified')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    productFilter === 'certified' 
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Certified ({products.filter(p => p.fromCertifiedOrder).length})
                </button>
                <button
                  onClick={() => handleProductFilterChange('manual')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    productFilter === 'manual' 
                      ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Manual ({products.filter(p => !p.fromCertifiedOrder).length})
                </button>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {filteredProducts.length} of {products.length} products
                {searchTerm && ` for "${searchTerm}"`}
                {categoryFilter !== 'all' && ` in ${categoryFilter}`}
                {productFilter !== 'all' && ` (${productFilter} only)`}
              </span>
              <span className="text-xs">
                {products.filter(p => p.fromCertifiedOrder).length} certified • {products.filter(p => !p.fromCertifiedOrder).length} manual
              </span>
            </div>
          </div>
        )}

        {/* Profit Analytics Banner */}
        {quickStats && products.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaChartLine className="text-green-600 dark:text-green-400 text-xl" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Business Overview
                  </h4>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Real-time profit analytics for your inventory
                  </p>
                </div>
              </div>
              <div className="flex space-x-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    UGX {quickStats.totalInvestment.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Investment</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    UGX {quickStats.totalPotentialRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Potential Revenue</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    UGX {quickStats.totalPotentialProfit.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Potential Profit</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    {quickStats.averageMargin.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Avg Margin</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Features Banner */}
        {isElectron && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 transition-colors duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaBox className="text-blue-600 dark:text-blue-400 text-lg" />
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <FaExclamationTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('myProducts');
                setEditingProduct(null);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'myProducts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              My Products {products.length > 0 && `(${products.length})`}
            </button>
            <button
              onClick={() => setActiveTab('addProduct')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'addProduct'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'myProducts' ? (
            <MyProducts
              products={filteredProducts}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              setShowCreateForm={() => setActiveTab('addProduct')}
              highlightedProduct={highlightedProduct}
              isElectron={isElectron}
              isOnline={isOnline}
            />
          ) : (
            <AddProducts
              formData={formData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              handleInputChange={handleInputChange}
              categories={categories}
              editingProduct={editingProduct}
              cancelForm={cancelForm}
              isElectron={isElectron}
              isOnline={isOnline}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Products;