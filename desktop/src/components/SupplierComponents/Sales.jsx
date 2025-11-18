// src/components/SupplierComponents/Sales.jsx
import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaReceipt, 
  FaCalendar, 
  FaPlus, 
  FaTimes, 
  FaMinus, 
  FaSearch,
  FaCheckCircle,
  FaTrash,
  FaShoppingCart,
  FaBox
} from 'react-icons/fa';

const SalesTab = ({ apiCall, isDarkMode, isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingSale, setProcessingSale] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Simplified form state - customer details are optional
  const [formData, setFormData] = useState({
    customerDetails: {
      name: '',
      email: '',
      phone: '',
      address: ''
    },
    saleDate: new Date(),
    notes: '',
    paymentMethod: 'cash',
    discountAmount: 0,
    discountPercentage: 0,
    taxAmount: 0,
    shippingDetails: {
      shippingCost: 0
    }
  });

  // Calculations state
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    shippingCost: 0,
    grandTotal: 0,
    totalProfit: 0
  });

  // Load products from database
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/supplier-products?limit=1000');
      
      if (response && response.success) {
        setProducts(response.products || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Error: Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Update calculations when cart or form data changes
  useEffect(() => {
    calculateTotals();
  }, [cart, formData.discountAmount, formData.discountPercentage, formData.taxAmount, formData.shippingDetails.shippingCost]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
    
    let totalDiscount = 0;
    if (formData.discountPercentage > 0) {
      totalDiscount = (subtotal * formData.discountPercentage) / 100;
    } else {
      totalDiscount = formData.discountAmount;
    }

    const totalTax = formData.taxAmount;
    const shippingCost = formData.shippingDetails.shippingCost || 0;
    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax + shippingCost);
    
    const totalProfit = cart.reduce((total, item) => {
      const profitPerUnit = (item.unitPrice || 0) - (item.productionPrice || 0);
      return total + (profitPerUnit * item.quantity);
    }, 0);

    setCalculations({
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost,
      grandTotal,
      totalProfit
    });
  };

  const addToCart = (product) => {
    // Check if product is in stock
    if (product.quantity <= 0) {
      alert(`Out of Stock: ${product.name} is currently out of stock.`);
      return;
    }

    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
      // Check if we're exceeding available stock
      if (existingItem.quantity + 1 > product.quantity) {
        alert(`Insufficient Stock: Only ${product.quantity} units of ${product.name} are available.`);
        return;
      }
      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        quantity: 1,
        unitPrice: product.sellingPrice,
        productionPrice: product.productionPrice || 0
      }]);
    }
    
    // Close modal immediately after adding product
    setShowProductModal(false);
    setSearchQuery('');
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p._id === productId);
    if (product && newQuantity > product.quantity) {
      alert(`Insufficient Stock: Only ${product.quantity} units of ${product.name} are available.`);
      return;
    }

    setCart(cart.map(item =>
      item._id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateItemPrice = (productId, newPrice) => {
    setCart(cart.map(item =>
      item._id === productId
        ? { ...item, unitPrice: parseFloat(newPrice) || 0 }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setFormData({
      customerDetails: {
        name: '',
        email: '',
        phone: '',
        address: ''
      },
      saleDate: new Date(),
      notes: '',
      paymentMethod: 'cash',
      discountAmount: 0,
      discountPercentage: 0,
      taxAmount: 0,
      shippingDetails: {
        shippingCost: 0
      }
    });
  };

  // Simple date selection
  const showDateSelection = () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const useToday = confirm('Use today\'s date? Click OK for today, Cancel for yesterday.');
    
    if (useToday) {
      setFormData(prev => ({ ...prev, saleDate: today }));
    } else {
      setFormData(prev => ({ ...prev, saleDate: yesterday }));
    }
  };

  const validateForm = () => {
    if (cart.length === 0) {
      alert('Empty Cart: Please add products to the cart before processing sale.');
      return false;
    }

    for (const item of cart) {
      const product = products.find(p => p._id === item._id);
      if (product && item.quantity > product.quantity) {
        alert(
          `Insufficient Stock: Not enough stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        );
        return false;
      }
    }

    return true;
  };

  const processSale = async () => {
    if (!validateForm()) return;

    try {
      setProcessingSale(true);

      const saleItems = cart.map(item => ({
        productId: item._id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        productionPrice: item.productionPrice || 0,
        totalPrice: item.unitPrice * item.quantity,
        profit: (item.unitPrice - (item.productionPrice || 0)) * item.quantity,
        profitMargin: item.unitPrice > 0 ? 
          ((item.unitPrice - (item.productionPrice || 0)) / item.unitPrice) * 100 : 0
      }));

      const customerName = formData.customerDetails.name?.trim();
      const customerType = customerName ? 'regular' : 'walk-in';

      const saleData = {
        customerDetails: {
          name: customerName || 'Walk-in Customer',
          email: formData.customerDetails.email,
          phone: formData.customerDetails.phone,
          address: formData.customerDetails.address,
          customerType: customerType
        },
        items: saleItems,
        saleDate: formData.saleDate.toISOString(),
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        discountAmount: calculations.totalDiscount,
        discountPercentage: formData.discountPercentage,
        taxAmount: formData.taxAmount,
        shippingDetails: formData.shippingDetails,
        totalAmount: calculations.grandTotal,
        totalProfit: calculations.totalProfit
      };

      const response = await apiCall('/supplier-sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });

      if (response && response.success) {
        alert(
          `Sale Processed: Sale #${response.sale?.saleNumber || ''} has been processed successfully!`
        );
        clearCart();
      } else {
        throw new Error(response?.message || 'Failed to process sale');
      }

    } catch (error) {
      console.error('Error processing sale:', error);
      alert(`Error: Failed to process sale: ${error.message}`);
    } finally {
      setProcessingSale(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render product item in modal
  const ProductModalItem = ({ item }) => {
    const getStockColor = () => {
      if (item.quantity <= 0) return 'text-red-500';
      if (item.quantity <= (item.lowStockThreshold || 10)) return 'text-yellow-500';
      return 'text-green-500';
    };

    const getStockText = () => {
      if (item.quantity <= 0) return 'Out of Stock';
      return `${item.quantity} in stock`;
    };

    return (
      <button
        onClick={() => addToCart(item)}
        disabled={item.quantity <= 0}
        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 disabled:opacity-50' 
            : 'bg-white border-gray-200 hover:bg-gray-50 disabled:opacity-50'
        }`}
      >
        <div className="flex-1 text-left">
          <p className={`font-medium text-sm mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {item.name}
          </p>
          <p className={`text-xs mb-2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {item.category} • {item.measurementUnit}
          </p>
          <div className="flex justify-between items-center">
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              UGX {formatCurrency(item.sellingPrice)}
            </p>
            <p className={`text-xs font-medium ${getStockColor()}`}>
              {getStockText()}
            </p>
          </div>
        </div>
        <FaPlus className={`w-4 h-4 ${
          item.quantity <= 0 ? 'text-red-500' : 'text-green-500'
        }`} />
      </button>
    );
  };

  if (loading) {
    return (
      <div className={`rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } p-6`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Loading Products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FaReceipt className={`w-5 h-5 ${
            isDarkMode ? 'text-purple-400' : 'text-purple-600'
          }`} />
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Create Sale
          </h2>
        </div>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Process new customer sales
        </p>
      </div>

      {/* Customer Information */}
      <div className={`rounded-xl border p-4 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Customer
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${
              isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
            }`}>
              Optional
            </span>
          </div>
          <button
            onClick={showDateSelection}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-sm transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FaCalendar className="w-3 h-3" />
            {formatDate(formData.saleDate)}
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Customer name"
            value={formData.customerDetails.name}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customerDetails: { ...prev.customerDetails, name: e.target.value }
            }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          
          <div className="grid grid-cols-2 gap-3">
            <input
              type="tel"
              placeholder="Phone"
              value={formData.customerDetails.phone}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                customerDetails: { ...prev.customerDetails, phone: e.target.value }
              }))}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.customerDetails.email}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                customerDetails: { ...prev.customerDetails, email: e.target.value }
              }))}
              className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div className={`rounded-xl border p-4 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Products • {cart.length}
          </h3>
          <button
            onClick={() => setShowProductModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <FaPlus className="w-3 h-3" />
            Add Product
          </button>
        </div>

        {cart.length === 0 ? (
          <div className={`border-2 border-dashed rounded-lg py-8 text-center ${
            isDarkMode ? 'border-gray-700' : 'border-gray-300'
          }`}>
            <FaShoppingCart className={`mx-auto w-8 h-8 mb-3 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              No products in cart
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item._id} className={`flex items-center justify-between p-3 rounded-lg border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex-1">
                  <p className={`font-medium text-sm mb-1 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItemPrice(item._id, e.target.value)}
                      className={`w-20 px-2 py-1 border rounded text-sm ${
                        isDarkMode 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      UGX × {item.quantity}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-600 hover:bg-gray-500' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <FaMinus className="w-2 h-2 text-red-500" />
                    </button>
                    
                    <span className={`text-sm font-medium w-6 text-center ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-600 hover:bg-gray-500' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <FaPlus className="w-2 h-2 text-green-500" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="p-1 text-red-500 hover:text-red-600 transition-colors"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing & Payment */}
      {cart.length > 0 && (
        <div className={`rounded-xl border p-4 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`font-semibold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Payment & Totals
          </h3>

          {/* Pricing Inputs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Discount %
              </label>
              <input
                type="number"
                value={formData.discountPercentage}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ 
                    ...prev, 
                    discountPercentage: Math.min(100, Math.max(0, percentage)),
                    discountAmount: 0
                  }));
                }}
                className={`w-full px-2 py-1 border rounded text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Discount UGX
              </label>
              <input
                type="number"
                value={formData.discountAmount}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ 
                    ...prev, 
                    discountAmount: amount,
                    discountPercentage: 0
                  }));
                }}
                className={`w-full px-2 py-1 border rounded text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Tax UGX
              </label>
              <input
                type="number"
                value={formData.taxAmount}
                onChange={(e) => {
                  const tax = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, taxAmount: tax }));
                }}
                className={`w-full px-2 py-1 border rounded text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'cash', label: 'Cash' },
                { value: 'mobile_money', label: 'Mobile' },
                { value: 'bank_transfer', label: 'Bank' },
                { value: 'card', label: 'Card' }
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value }))}
                  className={`py-2 rounded-lg border transition-colors text-sm font-medium ${
                    formData.paymentMethod === method.value
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          
          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                UGX {formatCurrency(calculations.subtotal)}
              </span>
            </div>
            
            {calculations.totalDiscount > 0 && (
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Discount</span>
                <span className="text-red-500">
                  -UGX {formatCurrency(calculations.totalDiscount)}
                </span>
              </div>
            )}
            
            {calculations.totalTax > 0 && (
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Tax</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  UGX {formatCurrency(calculations.totalTax)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Profit</span>
              <span className={calculations.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
                UGX {formatCurrency(calculations.totalProfit)}
              </span>
            </div>
            
            <div className="flex justify-between border-t pt-2">
              <span className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Total
              </span>
              <span className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                UGX {formatCurrency(calculations.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors flex-1 justify-center ${
              isDarkMode 
                ? 'bg-red-900 bg-opacity-20 border-red-800 text-red-400 hover:bg-red-800 hover:bg-opacity-30' 
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            }`}
          >
            <FaTrash className="w-4 h-4" />
            Clear Cart
          </button>
        )}
        
        <button
          onClick={processSale}
          disabled={cart.length === 0 || processingSale}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors flex-2 justify-center ${
            cart.length === 0 || processingSale
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white font-medium`}
        >
          {processingSale ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <FaCheckCircle className="w-4 h-4" />
          )}
          {processingSale ? 'Processing...' : 'Process Sale'}
        </button>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
          isDarkMode ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'
        }`}>
          <div className={`w-full max-w-2xl rounded-xl shadow-2xl max-h-[80vh] flex flex-col ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Products • {filteredProducts.length}
              </h3>
              <button 
                onClick={() => setShowProductModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <FaTimes className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>

            {/* Search */}
            <div className={`p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                <FaSearch className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 bg-transparent outline-none ${
                    isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <FaBox className={`mx-auto w-8 h-8 mb-3 ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {searchQuery ? 'No products found' : 'No products available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <ProductModalItem key={product._id} item={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTab;