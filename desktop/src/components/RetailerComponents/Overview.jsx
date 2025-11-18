import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import ErrorBoundary from '../ErrorBoundary';
import { 
  FaMoneyBillWave, 
  FaChartLine, 
  FaDollarSign, 
  FaChartBar, 
  FaCalendarDay, 
  FaShoppingCart, 
  FaClipboardList, 
  FaChartPie, 
  FaStore, 
  FaDatabase, 
  FaBox, 
  FaLayerGroup, 
  FaExclamationTriangle, 
  FaShoppingBag, 
  FaMapMarkerAlt, 
  FaCashRegister,
  FaMobile,
  FaImage,
  FaBoxOpen,
  FaTags,
  FaRedo,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaDownload,
  FaBell,
  FaCube
} from 'react-icons/fa';

// Order Form Component
const OrderForm = ({ visible, product, onClose, onSubmit }) => {
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const { isDarkMode } = useDarkMode();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity: '',
    deliveryPlace: '',
    deliveryCoordinates: {
      lat: '',
      lng: ''
    },
    orderNotes: '',
    paymentMethod: 'cash_on_delivery'
  });

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        quantity: product.minOrderQuantity?.toString() || '1',
        deliveryPlace: '',
        deliveryCoordinates: {
          lat: '',
          lng: ''
        },
        orderNotes: '',
        paymentMethod: 'cash_on_delivery'
      });
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.quantity || parseInt(formData.quantity) < 1) {
      alert('Error: Please enter a valid quantity');
      return false;
    }

    if (parseInt(formData.quantity) < (product.minOrderQuantity || 1)) {
      alert(`Error: Minimum order quantity is ${product.minOrderQuantity || 1}`);
      return false;
    }

    if (parseInt(formData.quantity) > product.quantity) {
      alert(`Error: Only ${product.quantity} units available in stock`);
      return false;
    }

    if (!formData.deliveryPlace.trim()) {
      alert('Error: Please enter delivery place');
      return false;
    }

    if (!formData.deliveryCoordinates.lat || !formData.deliveryCoordinates.lng) {
      alert('Error: Please enter delivery coordinates');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const orderData = {
        product: product._id,
        quantity: parseInt(formData.quantity),
        deliveryPlace: formData.deliveryPlace.trim(),
        deliveryCoordinates: {
          lat: parseFloat(formData.deliveryCoordinates.lat),
          lng: parseFloat(formData.deliveryCoordinates.lng)
        },
        orderNotes: formData.orderNotes.trim(),
        paymentMethod: formData.paymentMethod
      };

      console.log('Submitting order:', orderData);

      const response = await fetch(`${API_BASE_URL}/api/retailer-orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        alert('Success! Your order has been placed successfully!');
        onSubmit?.(result.order);
        onClose();
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      alert(`Error: ${error.message || 'Failed to place order. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitPrice = product?.price || 0;
    return quantity * unitPrice;
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            deliveryCoordinates: {
              lat: position.coords.latitude.toString(),
              lng: position.coords.longitude.toString()
            }
          }));
          alert('Success: Current location set!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback to Kampala coordinates
          setFormData(prev => ({
            ...prev,
            deliveryCoordinates: {
              lat: '0.3476',
              lng: '32.5825'
            }
          }));
          alert('Success: Location set to Kampala coordinates (fallback)');
        }
      );
    } else {
      // Fallback to Kampala coordinates
      setFormData(prev => ({
        ...prev,
        deliveryCoordinates: {
          lat: '0.3476',
          lng: '32.5825'
        }
      }));
      alert('Success: Location set to Kampala coordinates (fallback)');
    }
  };

  if (!visible || !product) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50`}>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${
        isDarkMode ? 'dark' : ''
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Place Order
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Product Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {product.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {product.description}
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Price:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  UGX {product.price?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Available Stock:</span>
                <span className={`font-semibold ${
                  product.quantity > 10 ? 'text-green-600 dark:text-green-400' :
                  product.quantity > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {product.quantity} {product.measurementUnit}
                </span>
              </div>
              {product.minOrderQuantity > 1 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Min Order:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {product.minOrderQuantity} {product.measurementUnit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Form */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Order Details
            </h3>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={`Enter quantity (min: ${product.minOrderQuantity || 1})`}
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value.replace(/[^0-9]/g, ''))}
                min="1"
              />
              {formData.quantity && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total: UGX {calculateTotal().toLocaleString()}
                </p>
              )}
            </div>

            {/* Delivery Place */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Place *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Enter delivery address or location"
                value={formData.deliveryPlace}
                onChange={(e) => handleInputChange('deliveryPlace', e.target.value)}
                rows={2}
              />
            </div>

            {/* Delivery Coordinates */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Delivery Coordinates *
                </label>
                <button
                  onClick={getCurrentLocation}
                  className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                >
                  <FaMapMarkerAlt size={12} />
                  <span>Use Current</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.0000"
                    value={formData.deliveryCoordinates.lat}
                    onChange={(e) => handleInputChange('deliveryCoordinates.lat', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.0000"
                    value={formData.deliveryCoordinates.lng}
                    onChange={(e) => handleInputChange('deliveryCoordinates.lng', e.target.value)}
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Example: 0.3476, 32.5825 (Kampala)
              </p>
            </div>

            {/* Order Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Any special instructions for delivery..."
                value={formData.orderNotes}
                onChange={(e) => handleInputChange('orderNotes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Payment Method
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => handleInputChange('paymentMethod', 'cash_on_delivery')}
                  className={`w-full flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                    formData.paymentMethod === 'cash_on_delivery'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <FaCashRegister 
                    size={20} 
                    className={
                      formData.paymentMethod === 'cash_on_delivery' 
                        ? 'text-blue-500' 
                        : 'text-gray-400 dark:text-gray-500'
                    } 
                  />
                  <span className={
                    formData.paymentMethod === 'cash_on_delivery'
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }>
                    Cash on Delivery
                  </span>
                </button>
                
                <button
                  onClick={() => handleInputChange('paymentMethod', 'mobile_money')}
                  className={`w-full flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                    formData.paymentMethod === 'mobile_money'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <FaMobile 
                    size={18} 
                    className={
                      formData.paymentMethod === 'mobile_money' 
                        ? 'text-blue-500' 
                        : 'text-gray-400 dark:text-gray-500'
                    } 
                  />
                  <span className={
                    formData.paymentMethod === 'mobile_money'
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }>
                    Mobile Money
                  </span>
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Order Summary
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Unit Price:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    UGX {product.price?.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Quantity:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formData.quantity || '0'} {product.measurementUnit}
                  </span>
                </div>
                
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Amount:</span>
                  <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                    UGX {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.quantity || !formData.deliveryPlace || !formData.deliveryCoordinates.lat || !formData.deliveryCoordinates.lng}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <FaShoppingBag size={16} />
                <span>Place Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Overview Component
const OverviewOrderForm = () => {
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalSalesCount: 0,
    totalSalesValue: 0,
    todaySalesCount: 0,
    todaySalesValue: 0,
    todayProfit: 0,
    totalProfit: 0,
    retailerStockValue: 0,
    systemStockValue: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    totalReceipts: 0,
    totalReceiptsValue: 0,
    totalStockItems: 0,
    originalStockValue: 0,
    stockUtilization: 0
  });
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);

  const isElectron = window.electronAPI;

  useEffect(() => {
    console.log('User product category:', user?.productCategory);
    fetchMetrics();
    fetchTrendingProducts();
  }, []);

  // Helper function to handle API requests with offline support
  const apiRequest = async (url, options = {}) => {
    try {
      setOfflineMode(false);
      
      const defaultOptions = {
        headers: getAuthHeaders(),
        ...options
      };

      const response = await fetch(`${API_BASE_URL}${url}`, defaultOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed: ${response.status}`;
        
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
      return data;
    } catch (error) {
      console.error('API request error:', error);
      
      // Fallback to cached data for Electron offline mode
      if (isElectron) {
        const cacheKey = `cache_${url.replace(/\//g, '_')}`;
        const cachedData = await window.electronAPI.storage.getPersistent(cacheKey);
        if (cachedData.success && cachedData.value) {
          setOfflineMode(true);
          return cachedData.value;
        }
      }
      
      throw error;
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get today's date range
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // 1. Fetch ALL sales records to calculate profits and sales data
      const salesData = await apiRequest('/api/retailer-sales?limit=1000');

      if (!salesData.success || !salesData.sales) {
        throw new Error('Invalid sales data format');
      }

      // Calculate profits and sales data manually
      let todayProfit = 0;
      let totalProfit = 0;
      let todaySalesCount = 0;
      let totalSalesCount = salesData.total || salesData.sales.length;
      let todaySalesValue = 0;
      let totalSalesValue = 0;

      salesData.sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate);
        const isToday = saleDate >= startOfToday && saleDate < endOfToday;
        
        // Calculate sales value (quantity * sellingPrice)
        const saleValue = (sale.quantity || 0) * (sale.sellingPrice || 0);
        
        // Sum up profits
        const profit = sale.profit || 0;
        
        if (isToday) {
          todayProfit += profit;
          todaySalesCount += 1;
          todaySalesValue += saleValue;
        }
        
        totalProfit += profit;
        totalSalesValue += saleValue;
      });

      // 2. Fetch ALL Retailer Stocks and calculate total value manually
      let retailerStockValue = 0;
      let retailerLowStockCount = 0;
      let retailerTotalItems = 0;

      try {
        const retailerStocksData = await apiRequest('/api/retailer-stocks?limit=1000');
        if (retailerStocksData.success && retailerStocksData.stocks) {
          retailerStockValue = retailerStocksData.stocks.reduce((total, stock) => {
            return total + (stock.totalValue || 0);
          }, 0);
          
          retailerLowStockCount = retailerStocksData.stocks.filter(stock => stock.lowStockAlert === true).length;
          retailerTotalItems = retailerStocksData.total || retailerStocksData.stocks.length;
        }
      } catch (retailerError) {
        console.log('Retailer stocks fetch failed:', retailerError.message);
      }

      // 3. Fetch ALL System Stocks and calculate total value manually
      let systemStockValue = 0;
      let systemLowStockCount = 0;
      let systemTotalItems = 0;

      try {
        const systemStocksData = await apiRequest('/api/system-stocks?limit=1000');
        if (systemStocksData.success && systemStocksData.stocks) {
          systemStockValue = systemStocksData.stocks.reduce((total, stock) => {
            return total + (stock.totalValue || 0);
          }, 0);
          
          systemLowStockCount = systemStocksData.stocks.filter(stock => {
            return stock.quantity <= (stock.minStockLevel || 0);
          }).length;
          
          systemTotalItems = systemStocksData.total || systemStocksData.stocks.length;
        }
      } catch (systemError) {
        console.log('System stocks fetch failed:', systemError.message);
      }

      // 4. Calculate combined stock metrics
      const totalStockValue = retailerStockValue + systemStockValue;
      const totalLowStockItems = retailerLowStockCount + systemLowStockCount;
      const totalStockItems = retailerTotalItems + systemTotalItems;

      // 5. Calculate stock utilization
      const stockUtilization = totalSalesValue > 0 
        ? Math.min(100, Math.round((totalSalesValue / (totalSalesValue + totalStockValue)) * 100))
        : 0;

      // Get total orders count
      let totalOrders = totalSalesCount;

      // Update metrics with all calculated data
      setMetrics({
        todayProfit: todayProfit,
        totalProfit: totalProfit,
        todaySalesCount: todaySalesCount,
        totalSalesCount: totalSalesCount,
        todaySalesValue: todaySalesValue,
        totalSalesValue: totalSalesValue,
        totalOrders: totalOrders,
        retailerStockValue: retailerStockValue,
        systemStockValue: systemStockValue,
        totalStockValue: totalStockValue,
        lowStockItems: totalLowStockItems,
        totalStockItems: totalStockItems,
        originalStockValue: totalStockValue,
        stockUtilization: stockUtilization,
        totalReceipts: 0,
        totalReceiptsValue: 0
      });

      // Cache data for offline use
      if (isElectron && !offlineMode) {
        await window.electronAPI.storage.setPersistent('metrics_data', {
          data: {
            todayProfit: todayProfit,
            totalProfit: totalProfit,
            todaySalesCount: todaySalesCount,
            totalSalesCount: totalSalesCount,
            todaySalesValue: todaySalesValue,
            totalSalesValue: totalSalesValue,
            totalOrders: totalOrders,
            retailerStockValue: retailerStockValue,
            systemStockValue: systemStockValue,
            totalStockValue: totalStockValue,
            lowStockItems: totalLowStockItems,
            totalStockItems: totalStockItems,
            originalStockValue: totalStockValue,
            stockUtilization: stockUtilization,
            totalReceipts: 0,
            totalReceiptsValue: 0
          },
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(`Backend connection failed: ${err.message}. Using placeholder data.`);
      
      // Fallback to cached metrics
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('metrics_data');
        if (cachedData.success && cachedData.value?.data) {
          setMetrics(cachedData.value.data);
          setOfflineMode(true);
        } else {
          setMetrics({
            totalOrders: 0,
            totalSalesCount: 0,
            totalSalesValue: 0,
            todaySalesCount: 0,
            todaySalesValue: 0,
            todayProfit: 0,
            totalProfit: 0,
            retailerStockValue: 0,
            systemStockValue: 0,
            totalStockValue: 0,
            lowStockItems: 0,
            totalReceipts: 0,
            totalReceiptsValue: 0,
            totalStockItems: 0,
            originalStockValue: 0,
            stockUtilization: 0
          });
        }
      } else {
        setMetrics({
          totalOrders: 0,
          totalSalesCount: 0,
          totalSalesValue: 0,
          todaySalesCount: 0,
          todaySalesValue: 0,
          todayProfit: 0,
          totalProfit: 0,
          retailerStockValue: 0,
          systemStockValue: 0,
          totalStockValue: 0,
          lowStockItems: 0,
          totalReceipts: 0,
          totalReceiptsValue: 0,
          totalStockItems: 0,
          originalStockValue: 0,
          stockUtilization: 0
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to normalize category names
  const normalizeCategory = (category) => {
    if (!category) return '';
    
    const normalized = category.toLowerCase().trim();
    
    // Handle common category variations
    const categoryMap = {
      'electronics': 'electronic',
      'electronic': 'electronic',
      'electrical': 'electronic',
      'elect': 'electronic',
    };
    
    return categoryMap[normalized] || normalized;
  };

  const fetchTrendingProducts = async () => {
    try {
      setProductsLoading(true);
      
      const userCategory = user?.productCategory;
      console.log('Fetching products for user category:', userCategory);
      
      // Normalize the user's category for matching
      const normalizedUserCategory = normalizeCategory(userCategory);
      console.log('Normalized user category:', normalizedUserCategory);

      // First, fetch all available products without category filter
      const productsData = await apiRequest('/api/products/retailer/all?limit=50');
      
      console.log('All products fetched:', productsData.products?.length || 0);
      
      if (productsData.success && productsData.products) {
        // Get all unique categories from the products
        const allCategories = [...new Set(productsData.products.map(p => p.category).filter(Boolean))];
        console.log('Available categories in database:', allCategories);
        
        // Enhanced category matching logic
        const filteredProducts = productsData.products.filter(product => {
          const productCategory = product.category?.toLowerCase().trim();
          const normalizedProductCategory = normalizeCategory(product.category);
          
          console.log(`Comparing: "${normalizedUserCategory}" vs "${normalizedProductCategory}" (original: "${productCategory}")`);
          
          // Multiple matching strategies
          const matches = 
            // Exact match after normalization
            normalizedProductCategory === normalizedUserCategory ||
            // Partial match
            (normalizedProductCategory && normalizedUserCategory && 
             (normalizedProductCategory.includes(normalizedUserCategory) || 
              normalizedUserCategory.includes(normalizedProductCategory))) ||
            // Handle singular/plural variations
            (normalizedUserCategory === 'electronic' && normalizedProductCategory === 'electronics') ||
            (normalizedUserCategory === 'electronics' && normalizedProductCategory === 'electronic');
          
          return matches;
        });
        
        console.log('Filtered products count:', filteredProducts.length);
        
        // If no products found with category matching, show some products anyway
        let productsToShow = filteredProducts;
        if (filteredProducts.length === 0 && productsData.products.length > 0) {
          console.log('No category matches found, showing first 6 products');
          productsToShow = productsData.products.slice(0, 6);
        }
        
        setTrendingProducts(productsToShow);

        // Cache products for offline use
        if (isElectron && !offlineMode) {
          await window.electronAPI.storage.setPersistent('products_data', {
            data: productsToShow,
            lastUpdated: new Date().toISOString()
          });
        }
      } else {
        console.log('No products in response or success false');
        setTrendingProducts([]);
      }
    } catch (err) {
      console.error('Error fetching trending products:', err);
      
      // Fallback to cached products
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('products_data');
        if (cachedData.success && cachedData.value?.data) {
          setTrendingProducts(cachedData.value.data);
          setOfflineMode(true);
        } else {
          setTrendingProducts([]);
        }
      } else {
        setTrendingProducts([]);
      }
    } finally {
      setProductsLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
    fetchTrendingProducts();
  };

  // Order Now functionality
  const handleOrderNow = (product) => {
    console.log('🔄 Order Now clicked for product:', product.name);
    setSelectedProduct(product);
    setShowOrderForm(true);
  };

  const handleOrderSubmit = (order) => {
    console.log('Order placed successfully:', order);
    setShowOrderForm(false);
    setSelectedProduct(null);
    
    // Optional: Show success message
    alert('Success: Your order has been placed successfully!');
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      metrics: metrics,
      products: trendingProducts,
      user: {
        name: user?.firstName,
        category: user?.productCategory
      }
    };

    if (isElectron) {
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `overview-export-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          'Dashboard data exported successfully'
        );
      }
    } else {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `overview-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend, isPercentage = false }) => {
    const formatValue = (val) => {
      if (isPercentage) return `${val}%`;
      
      if (typeof val === 'number') {
        if (title.includes('Sales') || title.includes('Profit') || title.includes('Value') || title.includes('Receipts Value') || title.includes('Stock')) {
          return `UGX ${val.toLocaleString()}`;
        }
        return val.toLocaleString();
      }
      
      return val;
    };

    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 p-6 transition-all duration-200 hover:shadow-md ${
          isDarkMode ? 'dark' : ''
        }`}
        style={{ borderLeftColor: color }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
              {title}
            </h3>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatValue(value)}
                </p>
                {subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {subtitle}
                  </p>
                )}
                {trend && (
                  <p className={`text-xs font-medium ${
                    trend.includes('+') || trend === 'Active' || trend === 'Good' || trend === 'All good' ? 'text-green-600 dark:text-green-400' : 
                    trend.includes('Attention') || trend.includes('Low') || trend === 'No profit' ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {trend}
                  </p>
                )}
              </>
            )}
          </div>
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={24} color={color} />
          </div>
        </div>
      </div>
    );
  };

  // Calculate trends based on real data
  const getProfitTrend = () => {
    if (metrics.todayProfit === 0) return "No sales today";
    return metrics.todayProfit > 0 ? "Active" : "No profit";
  };

  const getStockTrend = (utilization) => {
    if (utilization === 0) return "No data";
    return utilization >= 70 ? "Excellent" : utilization >= 50 ? "Good" : "Low";
  };

  const getLowStockTrend = (lowStockCount) => {
    if (lowStockCount === 0) return "All good";
    return lowStockCount > 5 ? "Critical" : lowStockCount > 0 ? "Attention needed" : "Good";
  };

  const ProductCard = ({ product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = product.images || [];
    const mainImage = images.length > 0 ? images[0].url : null;
    const wholesalerName = product.wholesaler?.businessName || 
                          `${product.wholesaler?.firstName || ''} ${product.wholesaler?.lastName || ''}`.trim() || 
                          'Unknown Wholesaler';
    
    const isLowStock = product.quantity <= 10;
    const currentImage = images[currentImageIndex]?.url || mainImage;
    
    const nextImage = () => {
      if (images.length > 1) {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
      }
    };
    
    const prevImage = () => {
      if (images.length > 1) {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === 0 ? images.length - 1 : prevIndex - 1
        );
      }
    };
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 w-80 flex-shrink-0 transition-all duration-200 hover:shadow-md">
        {/* Product Image with Navigation */}
        <div className="relative mb-4">
          {currentImage ? (
            <img 
              src={currentImage} 
              alt={product.name}
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center ${
            currentImage ? 'hidden' : 'flex'
          }`}>
            <FaImage size={32} className="text-gray-400" />
          </div>
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-colors"
              >
                <FaChevronLeft size={16} />
              </button>
              
              <button 
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-colors"
              >
                <FaChevronRight size={16} />
              </button>
              
              {/* Image Indicator Dots */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
                {images.map((_, index) => (
                  <div 
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentImageIndex 
                        ? 'bg-white' 
                        : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Stock Badge */}
          <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${
            isLowStock 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {isLowStock ? 'Low Stock' : 'In Stock'}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg line-clamp-2">
            {product.name}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
            {product.description || 'No description available'}
          </p>
          
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            By {wholesalerName}
          </p>
          
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              UGX {product.price?.toLocaleString() || '0'}
            </span>
            
            <div className="flex space-x-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <FaBoxOpen size={10} />
                <span>{product.quantity || 0}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <FaTags size={10} />
                <span>{product.category || 'Uncategorized'}</span>
              </div>
            </div>
          </div>
          
          {/* Order Button */}
          <button 
            onClick={() => handleOrderNow(product)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <span>Order Now</span>
            <FaShoppingCart size={16} />
          </button>
        </div>
      </div>
    );
  };

  const ErrorBanner = () => (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6 ${
      isDarkMode ? 'dark' : ''
    }`}>
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
            Connection Issue
          </h4>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            {error}
          </p>
        </div>
        <button 
          onClick={onRefresh}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
        >
          <FaRedo size={14} />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-6 ${
        isDarkMode ? 'dark' : ''
      }`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome, {user?.firstName || 'Retailer'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {user?.productCategory ? `${user.productCategory} Dashboard` : 'Retailer Dashboard Overview'}
                {isElectron && ' • Desktop Mode'}
                {offlineMode && (
                  <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    <FaBell className="w-2.5 h-2.5 mr-1" />
                    Offline
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              {isElectron && (
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                  title="Export dashboard data to JSON file"
                >
                  <FaDownload className="w-4 h-4 mr-2" />
                  Export
                </button>
              )}
              
              <button 
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
              >
                <FaRedo className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && !loading && <ErrorBanner />}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Profit Overview */}
            <MetricCard
              title="Today's Profit"
              value={metrics.todayProfit}
              icon={FaMoneyBillWave}
              color="#16a34a"
              subtitle="Profit from today's sales"
              trend={getProfitTrend()}
            />
            
            <MetricCard
              title="Total Profit"
              value={metrics.totalProfit}
              icon={FaChartLine}
              color="#9333ea"
              subtitle="All time profit"
            />
            
            <MetricCard
              title="Today's Sales"
              value={metrics.todaySalesValue}
              icon={FaDollarSign}
              color="#2563eb"
              subtitle="Revenue today"
            />
            
            <MetricCard
              title="Total Sales"
              value={metrics.totalSalesValue}
              icon={FaChartBar}
              color="#4f46e5"
              subtitle="All time revenue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Sales & Orders */}
            <MetricCard
              title="Today's Transactions"
              value={metrics.todaySalesCount}
              icon={FaCalendarDay}
              color="#ea580c"
              subtitle="Sales today"
            />
            
            <MetricCard
              title="Total Transactions"
              value={metrics.totalSalesCount}
              icon={FaShoppingCart}
              color="#0d9488"
              subtitle="All time sales"
            />
            
            <MetricCard
              title="Total Orders"
              value={metrics.totalOrders}
              icon={FaClipboardList}
              color="#db2777"
              subtitle="Orders placed"
            />
            
            <MetricCard
              title="Stock Utilization"
              value={metrics.stockUtilization}
              icon={FaChartPie}
              color="#9333ea"
              subtitle="Sales performance"
              isPercentage={true}
              trend={getStockTrend(metrics.stockUtilization)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stock Value */}
            <MetricCard
              title="Retailer Stock"
              value={metrics.retailerStockValue}
              icon={FaStore}
              color="#ea580c"
              subtitle="Your managed stock value"
            />
            
            <MetricCard
              title="System Stock"
              value={metrics.systemStockValue}
              icon={FaDatabase}
              color="#0d9488"
              subtitle="System managed stock value"
            />
            
            <MetricCard
              title="Total Stock Value"
              value={metrics.totalStockValue}
              icon={FaBox}
              color="#2563eb"
              subtitle="Combined inventory value"
            />
            
            <MetricCard
              title="Product Types"
              value={metrics.totalStockItems}
              icon={FaLayerGroup}
              color="#4f46e5"
              subtitle="Different products"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Additional Metrics */}
            <MetricCard
              title="Low Stock Items"
              value={metrics.lowStockItems}
              icon={FaExclamationTriangle}
              color="#dc2626"
              subtitle="Need restocking"
              trend={getLowStockTrend(metrics.lowStockItems)}
            />
            
            <MetricCard
              title="Today's Revenue"
              value={metrics.todaySalesValue}
              icon={FaDollarSign}
              color="#16a34a"
              subtitle="Sales today"
            />
            
            <MetricCard
              title="Total Revenue"
              value={metrics.totalSalesValue}
              icon={FaChartBar}
              color="#9333ea"
              subtitle="All sales"
            />
            
            <MetricCard
              title="Stock Performance"
              value={metrics.stockUtilization}
              icon={FaChartPie}
              color="#4f46e5"
              subtitle="Utilization rate"
              isPercentage={true}
            />
          </div>

          {/* Trending Products Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Available Products
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {user?.productCategory ? `Products in ${user.productCategory}` : 'Browse available products'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2 mt-4 lg:mt-0">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {trendingProducts.length} products available
                </span>
              </div>
            </div>

            {productsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading products...</span>
              </div>
            ) : trendingProducts.length > 0 ? (
              <div className="flex space-x-6 overflow-x-auto pb-4 -mx-2 px-2">
                {trendingProducts.map((product, index) => (
                  <ProductCard key={product._id || `product-${index}`} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FaCube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No products available
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Check your connection or try refreshing
                </p>
                <button 
                  onClick={onRefresh}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FaRedo className="w-4 h-4 mr-2" />
                  Refresh Products
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order Form Modal */}
        <OrderForm
          visible={showOrderForm}
          product={selectedProduct}
          onClose={() => {
            setShowOrderForm(false);
            setSelectedProduct(null);
          }}
          onSubmit={handleOrderSubmit}
        />
      </div>
    </ErrorBoundary>
  );
};

export default OverviewOrderForm;