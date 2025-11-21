// src/components/SupplierComponents/Stock.jsx
import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaBox, 
  FaEdit, 
  FaTrash, 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight,
  FaExclamationTriangle,
  FaCheck,
  FaBan,
  FaImage
} from 'react-icons/fa';

const StockTab = ({ apiCall, isDarkMode, isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  // Get stock status
  const getStockStatus = (quantity, lowStockThreshold = 10) => {
    if (quantity === 0) return { status: 'out-of-stock', color: '#EF4444', text: 'Out of Stock' };
    if (quantity <= lowStockThreshold) return { status: 'low-stock', color: '#F59E0B', text: 'Low Stock' };
    return { status: 'in-stock', color: '#10B981', text: 'In Stock' };
  };

  // Calculate profit per unit
  const calculateProfit = (product) => {
    const profitPerUnit = (product.sellingPrice || 0) - (product.productionPrice || 0);
    const totalPotentialProfit = profitPerUnit * (product.quantity || 0);
    const profitMargin = product.sellingPrice > 0 ? 
      ((profitPerUnit / product.sellingPrice) * 100) : 0;
    
    return {
      profitPerUnit,
      totalPotentialProfit,
      profitMargin
    };
  };

  // Get profit color
  const getProfitColor = (profit) => {
    return profit > 0 ? '#10B981' : profit < 0 ? '#EF4444' : '#6B7280';
  };

  // Fetch real products data
  const loadStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiCall('/supplier-products');
      
      if (data && data.success) {
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
      
    } catch (error) {
      console.error('Error loading stock data:', error);
      setError('Failed to load products: ' + error.message);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStockData();
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setEditingProduct({ ...product });
    setEditModalVisible(true);
  };

  // Handle save product
  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      setSaving(true);
      
      // Validate required fields
      if (!editingProduct.name || !editingProduct.sellingPrice || !editingProduct.productionPrice) {
        alert('Error: Please fill in all required fields');
        return;
      }

      // Update product via API
      const response = await apiCall(`/supplier-products/${editingProduct._id}`, {
        method: 'PUT',
        body: JSON.stringify(editingProduct)
      });
      
      if (response && response.success) {
        // Update local state
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p._id === editingProduct._id ? { ...editingProduct } : p
          )
        );
        setEditModalVisible(false);
        alert('Success: Product updated successfully');
      } else {
        alert('Error: Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error: Failed to update product: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      try {
        const response = await apiCall(`/supplier-products/${product._id}`, {
          method: 'DELETE'
        });
        
        if (response && response.success) {
          // Remove from local state
          setProducts(prevProducts => 
            prevProducts.filter(p => p._id !== product._id)
          );
          alert('Success: Product deleted successfully');
        } else {
          alert('Error: Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error: Failed to delete product: ' + error.message);
      }
    }
  };

  // Update product field
  const updateProductField = (field, value) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Image Carousel Component
  const ImageCarousel = ({ images, productName }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
      return (
        <div className={`h-48 rounded-lg flex flex-col items-center justify-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <FaImage className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No Image
          </span>
        </div>
      );
    }

    const goToNext = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    };

    const goToPrevious = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
    };

    return (
      <div className="h-48 rounded-lg overflow-hidden relative">
        <img 
          src={images[currentIndex].url} 
          alt={productName}
          className="w-full h-full object-cover"
        />
        
        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-60 px-2 py-1 rounded">
            <span className="text-white text-xs font-semibold">
              {currentIndex + 1}/{images.length}
            </span>
          </div>
        )}

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 w-8 h-8 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
              onClick={goToPrevious}
            >
              <FaChevronLeft className="w-4 h-4 text-white" />
            </button>
            
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 w-8 h-8 rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
              onClick={goToNext}
            >
              <FaChevronRight className="w-4 h-4 text-white" />
            </button>
          </>
        )}
      </div>
    );
  };

  // Edit Product Modal
  const EditProductModal = () => {
    if (!editingProduct) return null;

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isDarkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
      }`}>
        <div className={`w-full max-w-2xl rounded-xl shadow-2xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Modal Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Edit Product
            </h3>
            <button 
              onClick={() => setEditModalVisible(false)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <FaTimes className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-6">
            {/* Product Name */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Product Name *
              </label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) => updateProductField('name', e.target.value)}
                placeholder="Enter product name"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description
              </label>
              <textarea
                value={editingProduct.description}
                onChange={(e) => updateProductField('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Category
              </label>
              <input
                type="text"
                value={editingProduct.category}
                onChange={(e) => updateProductField('category', e.target.value)}
                placeholder="Enter category"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Prices Row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Selling Price (UGX) *
                </label>
                <input
                  type="number"
                  value={editingProduct.sellingPrice || ''}
                  onChange={(e) => updateProductField('sellingPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Cost Price (UGX) *
                </label>
                <input
                  type="number"
                  value={editingProduct.productionPrice || ''}
                  onChange={(e) => updateProductField('productionPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Stock Information */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Quantity in Stock
                </label>
                <input
                  type="number"
                  value={editingProduct.quantity || ''}
                  onChange={(e) => updateProductField('quantity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Measurement Unit
                </label>
                <input
                  type="text"
                  value={editingProduct.measurementUnit}
                  onChange={(e) => updateProductField('measurementUnit', e.target.value)}
                  placeholder="kg, pieces, etc."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Low Stock Threshold */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={editingProduct.lowStockThreshold || ''}
                onChange={(e) => updateProductField('lowStockThreshold', parseInt(e.target.value) || 10)}
                placeholder="10"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <p className={`text-xs mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Alert when stock falls below this number
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className={`flex gap-3 p-6 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => setEditModalVisible(false)}
              disabled={saving}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50'
              }`}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSaveProduct}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Product Card Component
  const ProductCard = ({ product }) => {
    const stockStatus = getStockStatus(product.quantity, product.lowStockThreshold);
    const profitInfo = calculateProfit(product);

    const getStatusIcon = () => {
      switch (stockStatus.status) {
        case 'out-of-stock':
          return <FaBan className="w-3 h-3" style={{ color: stockStatus.color }} />;
        case 'low-stock':
          return <FaExclamationTriangle className="w-3 h-3" style={{ color: stockStatus.color }} />;
        default:
          return <FaCheck className="w-3 h-3" style={{ color: stockStatus.color }} />;
      }
    };

    return (
      <div className={`rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } p-4`}>
        {/* Image Carousel */}
        <ImageCarousel images={product.images} productName={product.name} />

        {/* Product Header */}
        <div className="mt-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`font-semibold text-lg leading-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {product.name}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
            }`}>
              {product.category}
            </span>
          </div>

          {/* Product Description */}
          {product.description && (
            <p className={`text-sm mb-3 line-clamp-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {product.description}
            </p>
          )}

          {/* Stock and Price Information */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Quantity
              </p>
              <p className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {product.quantity} {product.measurementUnit}
              </p>
            </div>
            
            <div>
              <p className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Status
              </p>
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                <span className="text-xs font-semibold" style={{ color: stockStatus.color }}>
                  {stockStatus.text}
                </span>
              </div>
            </div>

            <div>
              <p className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Selling Price
              </p>
              <p className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                UGX {formatCurrency(product.sellingPrice)}
              </p>
            </div>

            <div>
              <p className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Cost Price
              </p>
              <p className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                UGX {formatCurrency(product.productionPrice)}
              </p>
            </div>
          </div>

          {/* Profit Information */}
          <div className={`border-t pt-3 mb-4 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-xs font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Profit/Unit:
                </p>
                <p className="text-sm font-semibold" style={{ color: getProfitColor(profitInfo.profitPerUnit) }}>
                  UGX {formatCurrency(profitInfo.profitPerUnit)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Margin:
                </p>
                <p className="text-sm font-semibold" style={{ color: getProfitColor(profitInfo.profitMargin) }}>
                  {profitInfo.profitMargin > 0 ? '+' : ''}{profitInfo.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Product Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleEditProduct(product)}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <FaEdit className="w-3 h-3" />
              Edit
            </button>
            
            <button
              onClick={() => handleDeleteProduct(product)}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <FaTrash className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } p-6`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Loading Products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FaBox className={`w-5 h-5 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Stock Management
          </h2>
        </div>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          {products.length} products • Manage inventory
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 border-red-500 ${
          isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
        }`}>
          <div className="flex items-center">
            <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-3" />
            <p className={isDarkMode ? 'text-red-200' : 'text-red-800'}>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Stock Summary */}
      <div className={`grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <p className={`text-2xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {products.length}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Total
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold mb-1 text-red-500">
            {products.filter(p => p.quantity === 0).length}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Out of Stock
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold mb-1 text-yellow-500">
            {products.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 10)).length}
          </p>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Low Stock
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div>
        {products.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
          } p-12 text-center`}>
            <FaBox className={`mx-auto w-12 h-12 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            } mb-4`} />
            <h3 className={`text-lg font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              No Products Found
            </h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              {error ? 'Failed to load products' : 'Start by adding your first product'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editModalVisible && <EditProductModal />}
    </div>
  );
};

export default StockTab;