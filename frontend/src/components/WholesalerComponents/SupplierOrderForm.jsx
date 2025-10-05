// components/WholesalerComponents/SupplierOrderForm.jsx
import React, { useState, useEffect } from 'react';

const SupplierOrderForm = ({ 
  product, 
  supplier, 
  onClose, 
  onOrderPlaced 
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

  const handlePlaceOrder = async () => {
    if (!product) return;

    const addressError = validateAddress();
    if (addressError) {
      setError(addressError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const orderData = {
        supplierId: supplier?._id,
        items: [
          {
            productId: product._id,
            quantity: orderQuantity
          }
        ],
        orderNotes: orderNotes,
        shippingAddress: shippingAddress
      };

      const response = await fetch('http://localhost:5000/api/wholesaler-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      const result = await response.json();

      if (result.success) {
        alert(`✅ Order Placed Successfully!\n\nOrder Number: ${result.order.orderNumber}\nDelivery to: ${shippingAddress.street}, ${shippingAddress.city}\nTotal Amount: $${result.order.totalAmount}`);
        onOrderPlaced();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Place Order</h3>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <img
                src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop'}
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">${product.sellingPrice} per {product.measurementUnit}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supplier: {supplier?.businessName || `${supplier?.firstName} ${supplier?.lastName}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Quantity Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setOrderQuantity(Math.max(product.minOrderQuantity || 1, orderQuantity - 1))}
                    disabled={orderQuantity <= (product.minOrderQuantity || 1) || loading}
                    className="p-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(product.minOrderQuantity || 1, parseInt(e.target.value) || 1))}
                    min={product.minOrderQuantity || 1}
                    max={product.quantity}
                    disabled={loading}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <button
                    onClick={() => setOrderQuantity(Math.min(product.quantity, orderQuantity + 1))}
                    disabled={orderQuantity >= product.quantity || loading}
                    className="p-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum order: {product.minOrderQuantity} {product.measurementUnit}
                  {product.quantity > 0 && ` • Available: ${product.quantity} ${product.measurementUnit}`}
                </p>
              </div>

              {/* Delivery Address Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Delivery Address</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      placeholder="Enter street address"
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        placeholder="City"
                        list="ugandanCities"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                        required
                      />
                      <datalist id="ugandanCities">
                        {ugandanLocations.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        State/District
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        placeholder="State or district"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Country *
                      </label>
                      <select
                        value={shippingAddress.country}
                        onChange={(e) => handleAddressChange('country', e.target.value)}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                        placeholder="Postal code"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special requirements or notes for this order..."
                  rows={2}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                />
              </div>

              {/* Order Summary */}
              <div className="border-t dark:border-gray-600 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Unit Price:</span>
                  <span className="font-semibold">${product.sellingPrice}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Quantity:</span>
                  <span>{orderQuantity} {product.measurementUnit}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t dark:border-gray-600 pt-2">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">${calculateTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || product.quantity === 0}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Place Order</span>
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