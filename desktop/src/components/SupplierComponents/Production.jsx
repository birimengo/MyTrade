import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaBox,
  FaIndustry,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaRedo,
  FaCheck,
  FaPlay,
  FaImage,
  FaTimes,
  FaUpload,
  FaDollarSign,
  FaCalculator,
  FaCalendarAlt,
  FaCube,
  FaChevronLeft,
  FaChevronRight,
  FaWarehouse,
  FaClock,
  FaShoppingCart,
  FaPercent,
  FaTags,
  FaLayerGroup,
  FaMinus,
  FaSave,
  FaExclamationCircle,
  FaWindowClose,
  FaExpand,
  FaCompress,
  FaSync,
  FaSpinner
} from 'react-icons/fa';

const Production = ({ isElectron, isDarkMode }) => {
  const { user, token, getAuthHeaders, API_BASE_URL, isAuthenticated, logout, getAuthToken } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    totalStockValue: 0,
    inProductionCount: 0,
    readyCount: 0,
    lowStockCount: 0,
    averageProfitMargin: 0,
    totalImages: 0
  });
  const [currentImageIndexes, setCurrentImageIndexes] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const [profitMargin, setProfitMargin] = useState(0);
  const [profitAmount, setProfitAmount] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state with all fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sellingPrice: '',
    productionPrice: '',
    quantity: '',
    productionTime: '',
    measurementUnit: 'pieces',
    minOrderQuantity: '1',
    materials: [],
    tags: '',
    bulkDiscount: false,
    bulkDiscountMinQuantity: '',
    bulkDiscountPercentage: '',
    productionStatus: 'ready',
    images: [],
    lowStockThreshold: '10'
  });

  const measurementUnits = [
    'pieces', 'boxes', 'cartons', 'crates', 'kg', 'g', 'l', 'ml', 'packs', 'units', 'dozens'
  ];

  const tabs = ['basic', 'pricing', 'materials', 'images', 'settings'];

  // Enhanced API call function with better FormData handling
  const makeApiCall = async (endpoint, options = {}) => {
    try {
      if (!isAuthenticated) {
        setError('Authentication required. Please log in again.');
        logout();
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/api${endpoint}`;
      
      // Get the actual token
      const authToken = getAuthToken();
      if (!authToken) {
        setError('Authentication token not found. Please log in again.');
        logout();
        throw new Error('No authentication token available');
      }

      // For FormData requests, we need to handle headers differently
      const isFormData = options.body instanceof FormData;
      
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      };

      const config = {
        headers,
        ...options,
      };

      console.log(`🔄 Making API call to: ${url}`, { 
        method: options.method || 'GET', 
        isFormData,
        hasAuth: !!authToken 
      });
      
      const response = await fetch(url, config);

      if (response.status === 401) {
        console.log('🔴 Authentication failed - logging out');
        setError('Session expired. Please log in again.');
        logout();
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('🔴 Backend error details:', errorData);
        } catch (e) {
          // If we can't parse JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ API call successful');
      return data;

    } catch (error) {
      console.error(`🔴 API Error (${endpoint}):`, error);
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchCategories();
      fetchStatistics();
    }
    
    // Add scroll event listener for sticky header
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAuthenticated]);

  // Calculate profit margin whenever prices change
  useEffect(() => {
    calculateProfit();
  }, [formData.sellingPrice, formData.productionPrice]);

  const calculateProfit = () => {
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const productionPrice = parseFloat(formData.productionPrice) || 0;
    
    let margin = 0;
    let amount = 0;
    
    if (productionPrice > 0) {
      margin = ((sellingPrice - productionPrice) / productionPrice) * 100;
      amount = sellingPrice - productionPrice;
    }
    
    setProfitMargin(margin);
    setProfitAmount(amount);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeApiCall('/supplier-products');

      if (response && response.success) {
        setProducts(response.products || []);
        const indexes = {};
        response.products.forEach(product => {
          indexes[product._id] = 0;
        });
        setCurrentImageIndexes(indexes);
      } else {
        throw new Error(response?.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await makeApiCall('/supplier-products/categories');

      if (response && response.success) {
        setCategories(response.categories || []);
      } else {
        throw new Error(response?.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch categories: ' + error.message);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await makeApiCall('/supplier-products/stats');

      if (response && response.success) {
        setStatistics(response.statistics || {
          totalProducts: 0,
          totalStockValue: 0,
          inProductionCount: 0,
          readyCount: 0,
          lowStockCount: 0,
          averageProfitMargin: 0,
          totalImages: 0
        });
      } else {
        throw new Error(response?.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStatistics({
        totalProducts: 0,
        totalStockValue: 0,
        inProductionCount: 0,
        readyCount: 0,
        lowStockCount: 0,
        averageProfitMargin: 0,
        totalImages: 0
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    fetchProducts();
    fetchCategories();
    fetchStatistics();
  };

  // Image navigation
  const nextImage = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.images || product.images.length <= 1) return;
    
    setCurrentImageIndexes(prev => ({
      ...prev,
      [productId]: (prev[productId] + 1) % product.images.length
    }));
  };

  const prevImage = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.images || product.images.length <= 1) return;
    
    setCurrentImageIndexes(prev => ({
      ...prev,
      [productId]: prev[productId] === 0 ? product.images.length - 1 : prev[productId] - 1
    }));
  };

  // Material management
  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { material: '', quantity: '', unit: '', cost: '' }]
    });
  };

  const updateMaterial = (index, field, value) => {
    const updatedMaterials = [...formData.materials];
    updatedMaterials[index][field] = value;
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const removeMaterial = (index) => {
    const updatedMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxImages = 5 - formData.images.length;
    
    if (files.length > maxImages) {
      alert(`You can only upload up to 5 images. ${maxImages} slots remaining.`);
      files.splice(maxImages);
    }
    
    setFormData({
      ...formData,
      images: [...formData.images, ...files]
    });
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  // Enhanced handleSubmit with better FormData and authentication handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      console.log('🔄 Starting product submission...', { editing: !!editingProduct });
      
      // Validate required fields
      const requiredFields = ['name', 'category', 'sellingPrice', 'productionPrice', 'quantity', 'productionTime'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      // Validate production time is a positive number
      if (formData.productionTime <= 0) {
        throw new Error('Production time must be greater than 0');
      }

      const formDataToSend = new FormData();

      // Append all basic form data
      const basicFields = [
        'name', 'description', 'category', 'sellingPrice', 'productionPrice',
        'quantity', 'productionTime', 'measurementUnit', 'minOrderQuantity',
        'tags', 'productionStatus', 'lowStockThreshold'
      ];

      basicFields.forEach(field => {
        if (formData[field] !== undefined && formData[field] !== null && formData[field] !== '') {
          formDataToSend.append(field, formData[field].toString());
        }
      });

      // Handle bulk discount
      formDataToSend.append('bulkDiscount', formData.bulkDiscount.toString());
      if (formData.bulkDiscount) {
        if (formData.bulkDiscountMinQuantity) {
          formDataToSend.append('bulkDiscountMinQuantity', formData.bulkDiscountMinQuantity);
        }
        if (formData.bulkDiscountPercentage) {
          formDataToSend.append('bulkDiscountPercentage', formData.bulkDiscountPercentage);
        }
      }

      // Handle materials
      if (formData.materials.length > 0) {
        // Filter out empty materials
        const validMaterials = formData.materials.filter(material => 
          material.material && material.quantity && material.unit
        );
        if (validMaterials.length > 0) {
          formDataToSend.append('materials', JSON.stringify(validMaterials));
        }
      }

      // Handle images - only append new images (not existing ones during edit)
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((image, index) => {
          // Only append if it's a File object (new upload)
          if (image instanceof File) {
            formDataToSend.append('images', image, image.name);
          }
        });
      }

      // Log FormData contents for debugging
      console.log('📦 FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        if (key === 'images') {
          console.log(`  ${key}:`, value.name, value.size, value.type);
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      let response;
      if (editingProduct) {
        console.log(`📝 Updating product: ${editingProduct._id}`);
        response = await makeApiCall(`/supplier-products/${editingProduct._id}`, {
          method: 'PUT',
          body: formDataToSend
        });
      } else {
        console.log('🆕 Creating new product');
        response = await makeApiCall('/supplier-products', {
          method: 'POST',
          body: formDataToSend
        });
      }

      if (response && response.success) {
        console.log('✅ Product saved successfully!');
        setShowAddForm(false);
        setEditingProduct(null);
        resetForm();
        await fetchProducts();
        await fetchStatistics();
        alert(`✅ Product ${editingProduct ? 'updated' : 'added'} successfully!`);
      } else {
        throw new Error(response?.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('❌ Error saving product:', error);
      alert(`❌ Failed to save product: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await makeApiCall(`/supplier-products/${productId}`, {
          method: 'DELETE'
        });
        
        await fetchProducts();
        await fetchStatistics();
        alert('✅ Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('❌ Failed to delete product: ' + error.message);
      }
    }
  };

  const handleStatusUpdate = async (productId, status) => {
    try {
      await makeApiCall(`/supplier-products/${productId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      
      await fetchProducts();
      alert(`✅ Product status updated to ${status.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Failed to update status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      sellingPrice: '',
      productionPrice: '',
      quantity: '',
      productionTime: '',
      measurementUnit: 'pieces',
      minOrderQuantity: '1',
      materials: [],
      tags: '',
      bulkDiscount: false,
      bulkDiscountMinQuantity: '',
      bulkDiscountPercentage: '',
      productionStatus: 'ready',
      images: [],
      lowStockThreshold: '10'
    });
    setProfitMargin(0);
    setProfitAmount(0);
    setActiveTab('basic');
  };

  const startEditing = (product) => {
    console.log('✏️ Starting to edit product:', product);
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      sellingPrice: product.sellingPrice || '',
      productionPrice: product.productionPrice || '',
      quantity: product.quantity || '',
      productionTime: product.productionTime || '',
      measurementUnit: product.measurementUnit || 'pieces',
      minOrderQuantity: product.minOrderQuantity || '1',
      materials: product.materials || [],
      tags: product.tags ? product.tags.join(', ') : '',
      bulkDiscount: product.bulkDiscount || false,
      bulkDiscountMinQuantity: product.bulkDiscount?.minQuantity || '',
      bulkDiscountPercentage: product.bulkDiscount?.discountPercentage || '',
      productionStatus: product.productionStatus || 'ready',
      images: [], // Reset images array for new uploads
      lowStockThreshold: product.lowStockThreshold || '10'
    });
    setShowAddForm(true);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.productionStatus === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className={`rounded-lg shadow p-6 h-[600px] flex items-center justify-center ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="text-center">
          <FaExclamationTriangle className="text-yellow-500 text-4xl mx-auto mb-4" />
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Authentication Required
          </h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Please log in to view production management
          </p>
        </div>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-center h-64">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mr-3" />
          <span className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading products...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-2 lg:p-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Error Message */}
      {error && (
        <div className={`mb-4 border px-3 py-2 rounded relative text-sm ${
          isDarkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <FaExclamationCircle className="mr-2" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="absolute top-0 right-0 mt-1 mr-2 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-1 transition-all duration-300 ${
          isSticky
            ? `sticky top-0 z-40 pt-1 pb-2 shadow-md ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`
            : ''
        }`}
      >
        <div className={`bg-gradient-to-br rounded-lg shadow p-3 border ${
          isDarkMode 
            ? 'from-blue-900 to-blue-800 border-blue-700' 
            : 'from-blue-50 to-blue-100 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                Total Products
              </p>
              <p className={`text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.totalProducts}
              </p>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <FaBox className="text-white text-lg" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow p-3 border ${
          isDarkMode 
            ? 'from-green-900 to-green-800 border-green-700' 
            : 'from-green-50 to-green-100 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                Stock Value
              </p>
              <p className={`text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ${(statistics.totalStockValue || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-green-500 rounded-lg">
              <FaDollarSign className="text-white text-lg" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow p-3 border ${
          isDarkMode 
            ? 'from-orange-900 to-orange-800 border-orange-700' 
            : 'from-orange-50 to-orange-100 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                In Production
              </p>
              <p className={`text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.inProductionCount}
              </p>
            </div>
            <div className="p-2 bg-orange-500 rounded-lg">
              <FaIndustry className="text-white text-lg" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow p-3 border ${
          isDarkMode 
            ? 'from-red-900 to-red-800 border-red-700' 
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                Low Stock
              </p>
              <p className={`text-xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.lowStockCount}
              </p>
            </div>
            <div className="p-2 bg-red-500 rounded-lg">
              <FaExclamationTriangle className="text-white text-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Header and Filters */}
      <div className={`rounded-lg shadow p-1 mb-4 border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } ${
        isSticky 
          ? 'sticky top-20 z-30 shadow-lg' 
          : ''
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3">
          <div className="mb-2 lg:mb-0">
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Production Management
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your products and production status
            </p>
          </div>
          <div className="flex items-center space-x-2">
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
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow hover:shadow text-sm"
            >
              <FaPlus className="mr-1 text-xs" />
              Add New Product
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="flex-1 relative">
            <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Categories</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="in_production">In Production</option>
              <option value="ready">Ready</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="h-[calc(100vh-280px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-3 gap-4 pb-4">
          {filteredProducts.map((product) => {
            const currentImageIndex = currentImageIndexes[product._id] || 0;
            const currentImage = product.images && product.images.length > 0 
              ? product.images[currentImageIndex] 
              : null;
            const totalImages = product.images ? product.images.length : 0;

            return (
              <div key={product._id} className={`rounded-lg shadow border overflow-hidden hover:shadow-md transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                
                {/* Image Section */}
                <div className="relative h-32 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {currentImage ? (
                    <>
                      <img 
                        src={currentImage.url} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      
                      {totalImages > 1 && (
                        <>
                          <button
                            onClick={() => prevImage(product._id)}
                            className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all duration-200 text-xs"
                          >
                            <FaChevronLeft />
                          </button>
                          <button
                            onClick={() => nextImage(product._id)}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all duration-200 text-xs"
                          >
                            <FaChevronRight />
                          </button>
                        </>
                      )}
                      
                      {totalImages > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white px-1 py-0.5 rounded-full text-xs">
                          {currentImageIndex + 1} / {totalImages}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaImage className={`text-2xl ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.productionStatus === 'ready' 
                        ? isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                        : product.productionStatus === 'in_production'
                        ? isDarkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                        : isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.productionStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Profit Margin Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.profitMargin > 0 
                        ? isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                        : isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.profitMargin?.toFixed(1)}% Margin
                    </span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-base font-bold truncate flex-1 mr-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {product.name}
                    </h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {product.category}
                    </span>
                  </div>

                  <p className={`text-xs mb-3 line-clamp-2 leading-relaxed ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {product.description}
                  </p>

                  {/* Pricing Information */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`text-center p-2 rounded ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className={`font-bold text-sm ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        ${product.sellingPrice}
                      </div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Selling Price
                      </div>
                    </div>
                    <div className={`text-center p-2 rounded ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className={`font-bold text-sm ${
                        product.profitMargin > 0 
                          ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {product.profitMargin?.toFixed(1)}%
                      </div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Profit Margin
                      </div>
                    </div>
                  </div>

                  {/* Stock and Production Info */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`flex items-center ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <FaWarehouse className="mr-1 text-xs" />
                        Stock
                      </span>
                      <span className={`font-medium ${
                        product.lowStockAlert 
                          ? isDarkMode ? 'text-red-400' : 'text-red-600'
                          : isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {product.quantity} {product.measurementUnit}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className={`flex items-center ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <FaClock className="mr-1 text-xs" />
                        Production Time
                      </span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {product.productionTime} days
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className={`flex items-center ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <FaShoppingCart className="mr-1 text-xs" />
                        Min Order
                      </span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {product.minOrderQuantity}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-1.5 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => startEditing(product)}
                      className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded text-xs transition-colors duration-200 ${
                        isDarkMode
                          ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <FaEdit className="mr-1 text-xs" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded text-xs transition-colors duration-200 ${
                        isDarkMode
                          ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <FaTrash className="mr-1 text-xs" />
                      Delete
                    </button>
                    {product.productionStatus === 'in_production' ? (
                      <button
                        onClick={() => handleStatusUpdate(product._id, 'ready')}
                        className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded text-xs transition-colors duration-200 ${
                          isDarkMode
                            ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <FaCheck className="mr-1 text-xs" />
                        Ready
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusUpdate(product._id, 'in_production')}
                        className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded text-xs transition-colors duration-200 ${
                          isDarkMode
                            ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30'
                            : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                        }`}
                      >
                        <FaPlay className="mr-1 text-xs" />
                        Produce
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className={`text-center py-8 rounded-lg shadow border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <FaBox className={`mx-auto text-4xl mb-3 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`} />
            <h3 className={`text-lg font-bold mb-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              No products found
            </h3>
            <p className={`max-w-md mx-auto mb-4 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Start by adding your first product.'
              }
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow hover:shadow font-medium text-sm"
            >
              <FaPlus className="inline mr-1" />
              Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Product Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-3 z-50">
          <div 
            className={`rounded-lg shadow-xl flex flex-col ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } ${isModalMaximized ? 'w-full h-full' : 'max-w-4xl w-full max-h-[90vh]'}`}
          >
            {/* Modal Title Bar */}
            <div className={`flex justify-between items-center px-4 py-3 border-b ${
              isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center">
                <FaBox className="text-blue-500 mr-2" />
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingProduct ? `Edit: ${formData.name}` : 'Add New Product'}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsModalMaximized(!isModalMaximized)}
                  className={`p-1.5 rounded ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  {isModalMaximized ? <FaCompress /> : <FaExpand />}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className={`p-1.5 rounded ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <FaWindowClose className="text-lg" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Form Tabs */}
              <div className={`flex border-b mb-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 font-medium text-xs border-b-2 transition-colors ${
                      activeTab === tab
                        ? isDarkMode 
                          ? 'border-blue-500 text-blue-400' 
                          : 'border-blue-500 text-blue-600'
                        : isDarkMode
                          ? 'border-transparent text-gray-400 hover:text-gray-300'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter product name"
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Category *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => updateFormData('category', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="e.g., Electronics, Clothing"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Description *
                      </label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        rows={3}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Detailed product description..."
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <FaTags className="inline mr-1 text-xs" />
                        Tags
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => updateFormData('tags', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="tag1, tag2, tag3"
                      />
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Separate tags with commas
                      </p>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Production Status
                      </label>
                      <select
                        value={formData.productionStatus}
                        onChange={(e) => updateFormData('productionStatus', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="ready">Ready</option>
                        <option value="in_production">In Production</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Pricing & Stock Tab */}
                {activeTab === 'pricing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Selling Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.sellingPrice}
                        onChange={(e) => updateFormData('sellingPrice', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Production Cost ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.productionPrice}
                        onChange={(e) => updateFormData('productionPrice', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    {/* Real-time Profit Calculation */}
                    <div className="md:col-span-2">
                      <div className={`p-3 rounded border ${
                        profitMargin > 0 
                          ? isDarkMode 
                            ? 'bg-green-900/20 border-green-800' 
                            : 'bg-green-50 border-green-200'
                          : profitMargin < 0
                          ? isDarkMode 
                            ? 'bg-red-900/20 border-red-800' 
                            : 'bg-red-50 border-red-200'
                          : isDarkMode 
                            ? 'bg-blue-900/20 border-blue-800' 
                            : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs">
                            <FaCalculator className={`mr-1 ${
                              profitMargin > 0 
                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                : profitMargin < 0 
                                ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`} />
                            <span className={`font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              Profit Analysis:
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${
                              profitMargin > 0 
                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                : profitMargin < 0 
                                ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              Margin: {profitMargin.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${
                              profitAmount > 0 
                                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                : profitAmount < 0 
                                ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              Profit: ${profitAmount.toFixed(2)} per unit
                            </div>
                          </div>
                        </div>
                        {profitMargin < 0 && (
                          <div className={`mt-1 text-xs flex items-center ${
                            isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            <FaExclamationCircle className="mr-1" />
                            Warning: Selling below production cost
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Quantity in Stock *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={(e) => updateFormData('quantity', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Measurement Unit *
                      </label>
                      <select
                        value={formData.measurementUnit}
                        onChange={(e) => updateFormData('measurementUnit', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        {measurementUnits.map(unit => (
                          <option key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <FaClock className="inline mr-1 text-xs" />
                        Production Time (days) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.productionTime}
                        onChange={(e) => updateFormData('productionTime', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter production time in days"
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <FaShoppingCart className="inline mr-1 text-xs" />
                        Minimum Order Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.minOrderQuantity}
                        onChange={(e) => updateFormData('minOrderQuantity', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Materials Tab */}
                {activeTab === 'materials' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className={`font-medium flex items-center text-sm ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        <FaLayerGroup className="mr-1 text-xs" />
                        Production Materials
                      </h4>
                      <button
                        type="button"
                        onClick={addMaterial}
                        className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                      >
                        <FaPlus className="mr-1" />
                        Add Material
                      </button>
                    </div>

                    {formData.materials.length === 0 ? (
                      <div className={`text-center py-4 rounded text-xs ${
                        isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'
                      }`}>
                        <FaLayerGroup className={`mx-auto text-xl mb-1 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                        <p>No materials added yet</p>
                      </div>
                    ) : (
                      formData.materials.map((material, index) => (
                        <div key={index} className={`grid grid-cols-1 md:grid-cols-5 gap-2 p-2 rounded text-xs ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div>
                            <label className={`block mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Material</label>
                            <input
                              type="text"
                              value={material.material}
                              onChange={(e) => updateMaterial(index, 'material', e.target.value)}
                              className={`w-full border rounded px-1.5 py-1 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="Material name"
                            />
                          </div>
                          <div>
                            <label className={`block mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Quantity</label>
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                              className={`w-full border rounded px-1.5 py-1 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Unit</label>
                            <input
                              type="text"
                              value={material.unit}
                              onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                              className={`w-full border rounded px-1.5 py-1 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="kg, pieces, etc."
                            />
                          </div>
                          <div>
                            <label className={`block mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Cost ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={material.cost}
                              onChange={(e) => updateMaterial(index, 'cost', e.target.value)}
                              className={`w-full border rounded px-1.5 py-1 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeMaterial(index)}
                              className="w-full py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center justify-center"
                            >
                              <FaMinus className="mr-0.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Images Tab */}
                {activeTab === 'images' && (
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Product Images (Max 5)
                      </label>
                      <div className="flex flex-wrap gap-3 mb-2">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={URL.createObjectURL(image)} 
                              alt={`Preview ${index + 1}`}
                              className="h-20 w-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs"
                            >
                              <FaTimes size={10} />
                            </button>
                          </div>
                        ))}
                        {formData.images.length < 5 && (
                          <label className={`flex flex-col items-center justify-center h-20 w-20 border border-dashed rounded cursor-pointer transition-colors duration-200 ${
                            isDarkMode 
                              ? 'border-gray-600 hover:border-blue-500' 
                              : 'border-gray-300 hover:border-blue-500'
                          }`}>
                            <FaUpload className={`mb-0.5 text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`} />
                            <span className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Add Image</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {5 - formData.images.length} image slots remaining
                      </p>
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={`flex items-center mb-3 text-xs ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.bulkDiscount}
                          onChange={(e) => updateFormData('bulkDiscount', e.target.checked)}
                          className={`mr-2 rounded focus:ring-blue-500 ${
                            isDarkMode 
                              ? 'border-gray-600 text-blue-600 bg-gray-700' 
                              : 'border-gray-300 text-blue-600'
                          }`}
                        />
                        <span className="font-medium flex items-center">
                          <FaPercent className="mr-1 text-xs" />
                          Enable Bulk Discount
                        </span>
                      </label>
                      
                      {formData.bulkDiscount && (
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 p-2 rounded text-xs ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div>
                            <label className={`block mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Minimum Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={formData.bulkDiscountMinQuantity}
                              onChange={(e) => updateFormData('bulkDiscountMinQuantity', e.target.value)}
                              className={`w-full border rounded px-1.5 py-1 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block mb-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Discount Percentage</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={formData.bulkDiscountPercentage}
                              onChange={(e) => updateFormData('bulkDiscountPercentage', e.target.value)}
                              className={`w-full border rounded px-1.5 py-1 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.lowStockThreshold}
                        onChange={(e) => updateFormData('lowStockThreshold', e.target.value)}
                        className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Alert when stock falls below this quantity
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation and Submit Buttons */}
                <div className={`flex justify-between pt-4 border-t ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <div className="flex space-x-2">
                    {activeTab !== 'basic' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) - 1])}
                        className={`px-4 py-2 border rounded text-xs font-medium transition-colors duration-200 ${
                          isDarkMode
                            ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                    )}
                    {activeTab !== 'settings' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) + 1])}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 text-xs font-medium"
                      >
                        Next
                      </button>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingProduct(null);
                        resetForm();
                      }}
                      className={`px-4 py-2 border rounded text-xs font-medium transition-colors duration-200 ${
                        isDarkMode
                          ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow hover:shadow text-xs font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <FaSpinner className="animate-spin mr-1" />
                          {editingProduct ? 'Updating...' : 'Adding...'}
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-1" />
                          {editingProduct ? 'Update Product' : 'Add Product'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )} 
    </div>
  );
};

export default Production; 