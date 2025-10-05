import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  FaExclamationCircle
} from 'react-icons/fa';

const Production = () => {
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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStatistics();
    
    // Add scroll event listener for sticky header
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-products', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProducts(response.data.products);
        const indexes = {};
        response.data.products.forEach(product => {
          indexes[product._id] = 0;
        });
        setCurrentImageIndexes(indexes);
      }
    } catch (error) {
      setError('Failed to fetch products: ' + error.message);
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-products/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-products/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStatistics(response.data.statistics);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      // Append all form data
      Object.keys(formData).forEach(key => {
        if (key !== 'materials' && key !== 'images') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Append materials as JSON
      if (formData.materials.length > 0) {
        formDataToSend.append('materials', JSON.stringify(formData.materials));
      }

      // Append images
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((image, index) => {
          formDataToSend.append('images', image);
        });
      }

      let response;
      if (editingProduct) {
        response = await axios.put(`http://localhost:5000/api/supplier-products/${editingProduct._id}`, formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await axios.post('http://localhost:5000/api/supplier-products', formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      if (response.data.success) {
        setShowAddForm(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
        fetchStatistics();
      }
    } catch (error) {
      setError('Failed to save product: ' + (error.response?.data?.message || error.message));
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/supplier-products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchProducts();
        fetchStatistics();
      } catch (error) {
        setError('Failed to delete product: ' + error.message);
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleStatusUpdate = async (productId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/supplier-products/${productId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProducts();
    } catch (error) {
      setError('Failed to update status: ' + error.message);
      console.error('Error updating status:', error);
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
      bulkDiscount: !!product.bulkDiscount,
      bulkDiscountMinQuantity: product.bulkDiscount?.minQuantity || '',
      bulkDiscountPercentage: product.bulkDiscount?.discountPercentage || '',
      productionStatus: product.productionStatus || 'ready',
      images: [],
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 lg:p-1">
      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative text-sm">
          <div className="flex items-center">
            <FaExclamationCircle className="mr-2" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="absolute top-0 right-0 mt-1 mr-2 text-lg">
            ×
          </button>
        </div>
      )}

      {/* Statistics Cards - Made smaller and sticky */}
     <div
  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-1 transition-all duration-300 ${
    isSticky
      ? 'sticky top-0 z-40 pt-1 pb-2 bg-gray-100 dark:bg-gray-900 shadow-md'
      : ''
  }`}
>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg shadow p-3 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-300 text-xs font-medium">Total Products</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{statistics.totalProducts}</p>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <FaBox className="text-white text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg shadow p-3 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-300 text-xs font-medium">Stock Value</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                ${(statistics.totalStockValue || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-green-500 rounded-lg">
              <FaDollarSign className="text-white text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg shadow p-3 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 dark:text-orange-300 text-xs font-medium">In Production</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{statistics.inProductionCount}</p>
            </div>
            <div className="p-2 bg-orange-500 rounded-lg">
              <FaIndustry className="text-white text-lg" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-lg shadow p-3 border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 dark:text-red-300 text-xs font-medium">Low Stock</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{statistics.lowStockCount}</p>
            </div>
            <div className="p-2 bg-red-500 rounded-lg">
              <FaExclamationTriangle className="text-white text-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Header and Filters - Made smaller and sticky */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-1 mb-4 border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isSticky 
          ? 'sticky top-20 z-30 shadow-lg' 
          : ''
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3">
          <div className="mb-2 lg:mb-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Production Management</h1>
            <p className="text-gray-600 dark:text-gray-300 text-xs">Manage your products and production status</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow hover:shadow text-sm"
          >
            <FaPlus className="mr-1 text-xs" />
            Add New Product
          </button>
        </div>

        {/* Filters - Made smaller */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in_production">In Production</option>
              <option value="ready">Ready</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <button
              onClick={fetchProducts}
              className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-sm"
            >
              <FaRedo className="mr-1 text-xs" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid with Scrollable Section */}
      <div className="h-[calc(100vh-280px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-3 gap-4 pb-4">
          {filteredProducts.map((product) => {
            const currentImageIndex = currentImageIndexes[product._id] || 0;
            const currentImage = product.images && product.images.length > 0 
              ? product.images[currentImageIndex] 
              : null;
            const totalImages = product.images ? product.images.length : 0;

            return (
              <div key={product._id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300">
                
                {/* Image Section - Made smaller */}
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
                      <FaImage className="text-gray-400 text-2xl" />
                    </div>
                  )}
                  
                  {/* Status Badge - Made smaller */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.productionStatus === 'ready' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : product.productionStatus === 'in_production'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {product.productionStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Profit Margin Badge - Made smaller */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.profitMargin > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {product.profitMargin?.toFixed(1)}% Margin
                    </span>
                  </div>
                </div>

                {/* Product Details - Made more compact */}
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate flex-1 mr-2">
                      {product.name}
                    </h3>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-1.5 py-0.5 rounded-full">
                      {product.category}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-xs mb-3 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Pricing Information - Made more compact */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="text-green-600 dark:text-green-400 font-bold text-sm">
                        ${product.sellingPrice}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Selling Price</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className={`font-bold text-sm ${
                        product.profitMargin > 0 
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {product.profitMargin?.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Profit Margin</div>
                    </div>
                  </div>

                  {/* Stock and Production Info - Made more compact */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center">
                        <FaWarehouse className="mr-1 text-xs" />
                        Stock
                      </span>
                      <span className={`font-medium ${
                        product.lowStockAlert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {product.quantity} {product.measurementUnit}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center">
                        <FaClock className="mr-1 text-xs" />
                        Production Time
                      </span>
                      <span className="text-gray-900 dark:text-white">{product.productionTime} days</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center">
                        <FaShoppingCart className="mr-1 text-xs" />
                        Min Order
                      </span>
                      <span className="text-gray-900 dark:text-white">{product.minOrderQuantity}</span>
                    </div>
                  </div>

                  {/* Action Buttons - Made smaller */}
                  <div className="flex space-x-1.5 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => startEditing(product)}
                      className="flex-1 flex items-center justify-center px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
                    >
                      <FaEdit className="mr-1 text-xs" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="flex-1 flex items-center justify-center px-2 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200"
                    >
                      <FaTrash className="mr-1 text-xs" />
                      Delete
                    </button>
                    {product.productionStatus === 'in_production' ? (
                      <button
                        onClick={() => handleStatusUpdate(product._id, 'ready')}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-xs hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200"
                      >
                        <FaCheck className="mr-1 text-xs" />
                        Ready
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusUpdate(product._id, 'in_production')}
                        className="flex-1 flex items-center justify-center px-2 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded text-xs hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors duration-200"
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

        {/* Empty State - Made smaller */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <FaBox className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No products found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4 text-sm">
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

      {/* Enhanced Add/Edit Product Form Modal - Made more compact */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingProduct ? `Edit: ${formData.name}` : 'Add New Product'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Form Tabs - Made smaller */}
              <div className="flex border-b border-gray-200 dark:border-gray-600 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 font-medium text-xs border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information Tab - Made more compact */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => updateFormData('name', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter product name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => updateFormData('category', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Electronics, Clothing"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description *
                      </label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Detailed product description..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <FaTags className="inline mr-1 text-xs" />
                        Tags
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => updateFormData('tags', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="tag1, tag2, tag3"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate tags with commas</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Production Status
                      </label>
                      <select
                        value={formData.productionStatus}
                        onChange={(e) => updateFormData('productionStatus', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="ready">Ready</option>
                        <option value="in_production">In Production</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Pricing & Stock Tab - Made more compact */}
                {activeTab === 'pricing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Selling Price ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.sellingPrice}
                        onChange={(e) => updateFormData('sellingPrice', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Production Cost ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.productionPrice}
                        onChange={(e) => updateFormData('productionPrice', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Real-time Profit Calculation - Made more compact */}
                    <div className="md:col-span-2">
                      <div className={`p-3 rounded ${
                        profitMargin > 0 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : profitMargin < 0
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs">
                            <FaCalculator className={`mr-1 ${
                              profitMargin > 0 ? 'text-green-600' : profitMargin < 0 ? 'text-red-600' : 'text-blue-600'
                            }`} />
                            <span className="font-medium">Profit Analysis:</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${
                              profitMargin > 0 ? 'text-green-600' : profitMargin < 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              Margin: {profitMargin.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${
                              profitAmount > 0 ? 'text-green-600' : profitAmount < 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              Profit: ${profitAmount.toFixed(2)} per unit
                            </div>
                          </div>
                        </div>
                        {profitMargin < 0 && (
                          <div className="mt-1 text-red-600 text-xs flex items-center">
                            <FaExclamationCircle className="mr-1" />
                            Warning: Selling below production cost
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity in Stock *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.quantity}
                        onChange={(e) => updateFormData('quantity', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Measurement Unit *
                      </label>
                      <select
                        value={formData.measurementUnit}
                        onChange={(e) => updateFormData('measurementUnit', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      >
                        {measurementUnits.map(unit => (
                          <option key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <FaClock className="inline mr-1 text-xs" />
                        Production Time (days) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.productionTime}
                        onChange={(e) => updateFormData('productionTime', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <FaShoppingCart className="inline mr-1 text-xs" />
                        Minimum Order Quantity
                      </label>
                      <input
                        type="number"
                        value={formData.minOrderQuantity}
                        onChange={(e) => updateFormData('minOrderQuantity', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Materials Tab - Made more compact */}
                {activeTab === 'materials' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center text-sm">
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
                      <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
                        <FaLayerGroup className="mx-auto text-xl text-gray-400 mb-1" />
                        <p>No materials added yet</p>
                      </div>
                    ) : (
                      formData.materials.map((material, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                          <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1">Material</label>
                            <input
                              type="text"
                              value={material.material}
                              onChange={(e) => updateMaterial(index, 'material', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-600"
                              placeholder="Material name"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-600"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                            <input
                              type="text"
                              value={material.unit}
                              onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-600"
                              placeholder="kg, pieces, etc."
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1">Cost ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={material.cost}
                              onChange={(e) => updateMaterial(index, 'cost', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-600"
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

                {/* Images Tab - Made more compact */}
                {activeTab === 'images' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                          <label className="flex flex-col items-center justify-center h-20 w-20 border border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-blue-500 transition-colors duration-200">
                            <FaUpload className="text-gray-400 mb-0.5 text-sm" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Add Image</span>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {5 - formData.images.length} image slots remaining
                      </p>
                    </div>
                  </div>
                )}

                {/* Settings Tab - Made more compact */}
                {activeTab === 'settings' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="flex items-center mb-3 text-xs">
                        <input
                          type="checkbox"
                          checked={formData.bulkDiscount}
                          onChange={(e) => updateFormData('bulkDiscount', e.target.checked)}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <FaPercent className="mr-1 text-xs" />
                          Enable Bulk Discount
                        </span>
                      </label>
                      
                      {formData.bulkDiscount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                          <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1">Minimum Quantity</label>
                            <input
                              type="number"
                              value={formData.bulkDiscountMinQuantity}
                              onChange={(e) => updateFormData('bulkDiscountMinQuantity', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-600"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 dark:text-gray-400 mb-1">Discount Percentage</label>
                            <input
                              type="number"
                              step="0.1"
                              max="100"
                              value={formData.bulkDiscountPercentage}
                              onChange={(e) => updateFormData('bulkDiscountPercentage', e.target.value)}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        value={formData.lowStockThreshold}
                        onChange={(e) => updateFormData('lowStockThreshold', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Alert when stock falls below this quantity
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation and Submit Buttons - Made smaller */}
                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex space-x-2">
                    {activeTab !== 'basic' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) - 1])}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-xs font-medium"
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
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow hover:shadow text-xs font-medium flex items-center"
                    >
                      <FaSave className="mr-1" />
                      {editingProduct ? 'Update Product' : 'Add Product'}
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