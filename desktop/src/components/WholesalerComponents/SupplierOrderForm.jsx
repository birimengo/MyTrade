import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaMinus, 
  FaPlus, 
  FaCheck, 
  FaSync,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaExclamationTriangle,
  FaWifi,
  FaSignal
} from 'react-icons/fa';

const SupplierOrderForm = ({ 
  product, 
  supplier, 
  onClose, 
  onOrderPlaced,
  isElectron,
  isOnline
}) => {
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Uganda',
    postalCode: ''
  });

  const ugandanLocations = [
    'Kampala', 'Jinja', 'Entebbe', 'Mbarara', 'Gulu', 'Lira', 'Mbale', 'Soroti', 
    'Fort Portal', 'Masaka', 'Mityana', 'Wakiso', 'Mukono', 'Busia', 'Tororo'
  ];

  // Safe Electron API access
  const safeElectronAPI = {
    showNotification: (title, message) => {
      if (isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    }
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('trade_uganda_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Use a fixed API base URL - adjust this to match your backend URL
  const API_BASE_URL = 'http://localhost:5000'; // Change this to your actual backend URL

  useEffect(() => {
    if (product) {
      setOrderQuantity(product.minOrderQuantity || 1);
    }
    
    // Try to get saved address from localStorage
    const savedAddress = localStorage.getItem('wholesalerShippingAddress');
    if (savedAddress) {
      setShippingAddress(JSON.parse(savedAddress));
    }
  }, [product]);

  const calculateTotalPrice = () => {
    if (!product) return 0;
    return product.sellingPrice * orderQuantity;
  };

  const calculateDeliveryEstimate = () => {
    if (!product) return 'N/A';
    const productionDays = product.productionStatus === 'ready' ? 0 : product.productionTime;
    const shippingDays = 2; // Standard shipping within Uganda
    return productionDays + shippingDays;
  };

  const handleAddressChange = (field, value) => {
    const newAddress = {
      ...shippingAddress,
      [field]: value
    };
    setShippingAddress(newAddress);
    
    // Save to localStorage for future orders
    localStorage.setItem('wholesalerShippingAddress', JSON.stringify(newAddress));
  };

  const validateAddress = () => {
    if (!shippingAddress.street.trim()) {
      return 'Street address is required';
    }
    if (!shippingAddress.city.trim()) {
      return 'City is required';
    }
    if (!shippingAddress.country.trim()) {
      return 'Country is required';
    }
    return null;
  };

  const validateOrder = () => {
    if (orderQuantity < (product.minOrderQuantity || 1)) {
      return `Minimum order quantity is ${product.minOrderQuantity}`;
    }
    if (orderQuantity > product.quantity) {
      return `Only ${product.quantity} units available in stock`;
    }
    return validateAddress();
  };

  const handlePlaceOrder = async () => {
    if (!product) return;

    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isOnline && isElectron) {
      setError('Cannot place orders while offline. Please check your internet connection.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('trade_uganda_token') || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Please log in to place an order');
      }

      // Enhanced order data for database
      const orderData = {
        supplierId: supplier?._id,
        items: [
          {
            productId: product._id,
            productName: product.name,
            quantity: orderQuantity,
            unitPrice: product.sellingPrice,
            totalPrice: calculateTotalPrice(),
            measurementUnit: product.measurementUnit,
            productImage: product.images?.[0]?.url
          }
        ],
        orderNotes: orderNotes,
        shippingAddress: shippingAddress,
        totalAmount: calculateTotalPrice(),
        deliveryEstimate: calculateDeliveryEstimate(),
        orderType: 'supplier_order'
      };

      // Real API call to save order to database
      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      const result = await response.json();

      if (result.success) {
        const orderNumber = result.order?.orderNumber || `ORD-${Date.now()}`;
        
        safeElectronAPI.showNotification(
          'Order Placed Successfully!',
          `Order #${orderNumber} has been placed with ${supplier?.businessName}`
        );

        // Enhanced success message
        const successMessage = `✅ Order Placed Successfully!\n\nOrder Number: ${orderNumber}\nDelivery to: ${shippingAddress.street}, ${shippingAddress.city}\nTotal Amount: $${result.order?.totalAmount || calculateTotalPrice().toFixed(2)}`;
        
        if (isElectron && window.electronAPI?.showDialog) {
          window.electronAPI.showDialog('success', 'Order Successful', successMessage);
        } else {
          alert(successMessage);
        }

        // Call the success callback
        onOrderPlaced();
        onClose();

      } else {
        throw new Error(result.message || 'Failed to place order');
      }

    } catch (error) {
      console.error('Error placing order:', error);
      setError(error.message || 'Failed to place order. Please try again.');
      
      safeElectronAPI.showNotification(
        'Order Failed', 
        error.message || 'Could not place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAddress = () => {
    // Auto-fill with common Ugandan address
    setShippingAddress({
      street: 'Plot 123, Main Street',
      city: 'Kampala',
      state: 'Central',
      country: 'Uganda',
      postalCode: '256'
    });
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Place Order</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Order from {supplier?.businessName}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>

          {/* Connection Status */}
          {isElectron && (
            <div className={`flex items-center justify-between mb-4 p-3 rounded-lg ${
              isOnline 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <FaWifi className="text-green-600 dark:text-green-400" />
                ) : (
                  <FaSignal className="text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  isOnline 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {isOnline ? 'Online - Real-time order processing' : 'Offline - Orders unavailable'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <FaExclamationTriangle className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <h4 className="text-red-800 dark:text-red-200 font-medium text-sm">Order Error</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Product Info */}
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Product Details</h4>
                
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop'}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">${product.sellingPrice} per {product.measurementUnit}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{product.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <p className="font-medium text-green-600 dark:text-green-400 capitalize">
                      {product.productionStatus.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Available:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.quantity} {product.measurementUnit}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Delivery Est.:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {calculateDeliveryEstimate()} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <FaEnvelope className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  Supplier Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Business:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{supplier?.businessName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{supplier?.firstName} {supplier?.lastName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      <FaPhone className="w-3 h-3 inline mr-1" />
                      Phone:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{supplier?.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      <FaEnvelope className="w-3 h-3 inline mr-1" />
                      Email:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white text-xs">{supplier?.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Order Form */}
            <div className="space-y-4">
              {/* Quantity Section */}
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Order Quantity
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setOrderQuantity(Math.max(product.minOrderQuantity || 1, orderQuantity - 1))}
                      disabled={orderQuantity <= (product.minOrderQuantity || 1) || loading}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FaMinus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(product.minOrderQuantity || 1, parseInt(e.target.value) || 1))}
                      min={product.minOrderQuantity || 1}
                      max={product.quantity}
                      disabled={loading}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-600 text-gray-900 dark:text-white font-semibold disabled:opacity-50"
                    />
                    <button
                      onClick={() => setOrderQuantity(Math.min(product.quantity, orderQuantity + 1))}
                      disabled={orderQuantity >= product.quantity || loading}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FaPlus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Min: {product.minOrderQuantity}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {product.quantity > 0 
                    ? `${product.quantity} units available in stock` 
                    : 'This product is currently out of stock'
                  }
                </p>
              </div>

              {/* Delivery Address Section */}
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    <FaMapMarkerAlt className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Delivery Address
                  </label>
                  <button
                    onClick={handleQuickFillAddress}
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Quick Fill
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      placeholder="Enter street address"
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        placeholder="City"
                        list="ugandanCities"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 text-sm"
                        required
                      />
                      <datalist id="ugandanCities">
                        {ugandanLocations.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State/District
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        placeholder="State or district"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Country *
                      </label>
                      <select
                        value={shippingAddress.country}
                        onChange={(e) => handleAddressChange('country', e.target.value)}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white disabled:opacity-50 text-sm"
                        required
                      >
                        <option value="Uganda">Uganda</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Rwanda">Rwanda</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                        placeholder="Postal code"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special requirements, delivery instructions, or notes for this order..."
                  rows={3}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 text-sm resize-none"
                />
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
                    <span className="font-semibold">${product.sellingPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span>{orderQuantity} {product.measurementUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Estimate:</span>
                    <span>{calculateDeliveryEstimate()} days</span>
                  </div>
                  <div className="border-t dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">Total Amount:</span>
                      <span className="text-blue-600 dark:text-blue-400">${calculateTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-6 border-t dark:border-gray-700 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel Order
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || product.quantity === 0 || (!isOnline && isElectron)}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <FaSync className="w-4 h-4 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <FaCheck className="w-4 h-4" />
                  <span>Place Order - ${calculateTotalPrice().toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierOrderForm;