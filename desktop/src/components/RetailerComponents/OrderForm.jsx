import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const OrderForm = ({ product, onClose, onSubmit, offlineMode = false }) => {
  const [quantity, setQuantity] = useState(product.minOrderQuantity || 1);
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

  const isElectron = window.electronAPI;

  // Default coordinates for Kampala, Uganda
  const DEFAULT_COORDINATES = {
    lat: 0.3476,
    lng: 32.5825
  };

  // Store auth token in Electron when component mounts
  useEffect(() => {
    if (isElectron) {
      const storeAuthToken = async () => {
        try {
          const headers = getAuthHeaders();
          const authToken = headers['Authorization'] || headers['authorization'];
          if (authToken) {
            // Extract just the token part (remove 'Bearer ')
            const token = authToken.replace('Bearer ', '');
            await window.electronAPI.setAuthToken(token);
            console.log('Auth token stored in Electron');
          } else {
            console.log('No auth token found in headers');
          }
        } catch (error) {
          console.log('Error storing auth token in Electron:', error);
        }
      };
      storeAuthToken();
    }
  }, [isElectron, getAuthHeaders]);

  // Calculate total price with bulk discount
  useEffect(() => {
    let price = product.price * quantity;
    if (product.bulkDiscount && quantity >= product.bulkDiscount.minQuantity) {
      price = price * (1 - product.bulkDiscount.discountPercentage / 100);
    }
    setTotalPrice(price);
  }, [quantity, product]);

  // Set default delivery date (3 days from now)
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setDeliveryDate(defaultDate.toISOString().split('T')[0]);
  }, []);

  // Auto-detect coordinates with enhanced fallback logic
  useEffect(() => {
    const detectLocation = async () => {
      setLocationStatus('detecting');
      
      // Enhanced location detection for desktop
      if (isElectron) {
        await detectLocationWithElectron();
      } else {
        await detectLocationWithBrowser();
      }
    };

    detectLocation();
  }, [deliveryPlace, isElectron]);

  const detectLocationWithElectron = async () => {
    try {
      // Try to get location from desktop storage first
      const storedLocation = await window.electronAPI.storage.getPersistent('user_location');
      if (storedLocation.success && storedLocation.value) {
        setCoordinates(storedLocation.value.coordinates);
        if (!deliveryPlace && storedLocation.value.address) {
          setDeliveryPlace(storedLocation.value.address);
        }
        setLocationStatus('success');
        return;
      }

      // Fallback to browser geolocation
      await detectLocationWithBrowser();
      
      // Save successful location to desktop storage
      if (coordinates.lat && coordinates.lng) {
        await window.electronAPI.storage.setPersistent('user_location', {
          coordinates,
          address: deliveryPlace,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log('Electron location detection failed:', error);
      setCoordinates(DEFAULT_COORDINATES);
      setLocationStatus('success');
    }
  };

  const detectLocationWithBrowser = async () => {
    if (!navigator.geolocation) {
      setCoordinates(DEFAULT_COORDINATES);
      setLocationStatus('success');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 600000 // 10 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      setCoordinates({ lat: latitude, lng: longitude });
      setLocationStatus('success');
      
      // Auto-fill approximate location
      if (!deliveryPlace) {
        await getAddressFromCoordinates(latitude, longitude);
      }
    } catch (locationError) {
      console.log('Browser geolocation failed:', locationError);
      setCoordinates(DEFAULT_COORDINATES);
      setLocationStatus('success');
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Location Service',
          'Using default coordinates. Please verify your delivery address.'
        );
      }
    }
  };

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const locationData = await response.json();
      if (locationData.locality) {
        const address = `${locationData.locality}, ${locationData.city || locationData.principalSubdivision}`;
        setDeliveryPlace(address);
        
        // Save to desktop storage
        if (isElectron) {
          await window.electronAPI.storage.setPersistent('user_location', {
            coordinates: { lat, lng },
            address: address,
            lastUpdated: new Date().toISOString()
          });
        }
      }
    } catch (geoError) {
      console.log('Could not get address from coordinates:', geoError);
    }
  };

  const handleRetryLocation = async () => {
    setLocationStatus('detecting');
    
    if (isElectron) {
      // Clear stored location and retry
      await window.electronAPI.storage.setPersistent('user_location', null);
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setLocationStatus('success');
          
          // Auto-fill address
          getAddressFromCoordinates(latitude, longitude);
        },
        (error) => {
          console.log('Location retry failed:', error);
          setCoordinates(DEFAULT_COORDINATES);
          setLocationStatus('success');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setCoordinates(DEFAULT_COORDINATES);
      setLocationStatus('success');
    }
  };

  const handleUseCurrentLocation = async () => {
    if (navigator.geolocation) {
      setLocationStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setLocationStatus('success');
          getAddressFromCoordinates(latitude, longitude);
        },
        (error) => {
          console.log('Current location failed:', error);
          setLocationStatus('success');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Enhanced validation
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      setLoading(false);
      return;
    }

    if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
      setError(`Minimum order quantity is ${product.minOrderQuantity} ${product.measurementUnit}.`);
      setLoading(false);
      return;
    }

    if (!deliveryPlace.trim()) {
      setError('Please provide a delivery place.');
      setLoading(false);
      return;
    }

    if (deliveryPlace.trim().length < 5) {
      setError('Please provide a more specific delivery address (minimum 5 characters).');
      setLoading(false);
      return;
    }

    if (!contactPhone.trim()) {
      setError('Please provide a contact phone number for delivery.');
      setLoading(false);
      return;
    }

    if (!deliveryDate) {
      setError('Please select a preferred delivery date.');
      setLoading(false);
      return;
    }

    try {
      // Ensure we always have coordinates
      const finalCoordinates = coordinates.lat && coordinates.lng 
        ? coordinates 
        : DEFAULT_COORDINATES;

      // Create the order data structure that matches backend expectations
      const orderData = {
        product: product._id,
        quantity: parseInt(quantity, 10),
        deliveryPlace: deliveryPlace.trim(),
        deliveryCoordinates: finalCoordinates,
        orderNotes: orderNotes.trim() || '',
        paymentMethod: paymentMethod
      };

      console.log('Submitting order data:', orderData);

      // Enhanced offline mode with Electron
      if (offlineMode) {
        await handleOfflineOrder(orderData);
        return;
      }

      // Online order submission with Electron enhancement
      await handleOnlineOrder(orderData);

    } catch (apiError) {
      console.error('Order submission error:', apiError);
      setError(apiError.message || 'Failed to place order. Please try again.');
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Order Failed',
          apiError.message || 'Could not place order. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineOrder = async (orderData) => {
    if (isElectron) {
      // Use Electron's enhanced offline storage
      const result = await window.electronAPI.submitOrder(orderData);
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Order Saved Successfully',
          'Your order has been saved and will sync when you are back online'
        );
        onSubmit(orderData);
        onClose();
      } else if (result.savedLocally) {
        window.electronAPI.showNotification(
          'Order Saved Offline',
          'Your order has been saved locally and will sync when you are back online'
        );
        onSubmit(orderData);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to save order offline');
      }
    } else {
      // Fallback to localStorage for web
      const pendingOrders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
      pendingOrders.push(orderData);
      localStorage.setItem('pending_orders', JSON.stringify(pendingOrders));
      
      onSubmit(orderData);
      onClose();
    }
  };

  const handleOnlineOrder = async (orderData) => {
    try {
      if (isElectron) {
        // Use Electron's enhanced API - ONLY Electron should submit in Electron environment
        const result = await window.electronAPI.submitOrder(orderData);
        
        if (result.success) {
          console.log('Order submitted successfully via Electron:', result);
          window.electronAPI.showNotification(
            'Order Placed Successfully',
            `Your order for ${product.name} has been placed`
          );
          // Pass the successful result to the parent component
          onSubmit(result.data || orderData);
          onClose();
          return; // IMPORTANT: Return here to prevent further execution
        } else {
          // If Electron fails, throw error to be caught below
          throw new Error(result.error || 'Failed to place order via Electron');
        }
      } else {
        // Direct API call for web (non-Electron environment)
        const response = await fetch(`${API_BASE_URL}/api/retailer-orders`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to place order.');
        }

        const data = await response.json();
        onSubmit(data.order || orderData);
        onClose();
      }
    } catch (error) {
      console.error('Online order submission failed:', error);
      
      // If we're in Electron and the error is a network error, fallback to offline
      const isNetworkError = error.message.includes('Failed to fetch') || 
                            error.message.includes('Network') ||
                            error.message.includes('network');
      
      if (isElectron && isNetworkError) {
        console.log('Network error in Electron, falling back to offline storage');
        await handleOfflineOrder(orderData);
      } else {
        // For server errors (400, 500, etc.), show the error to user
        throw error;
      }
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case 'detecting':
        return 'Detecting your location...';
      case 'success':
        return coordinates.lat === DEFAULT_COORDINATES.lat ? 
          'Using default coordinates' : 
          'Location detected successfully';
      case 'error':
        return 'Location detection failed';
      default:
        return 'Location services';
    }
  };

  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'detecting':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return coordinates.lat === DEFAULT_COORDINATES.lat ?
          'text-yellow-600 dark:text-yellow-400' :
          'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getMinDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDeliveryDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days max
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Order {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Offline Mode Warning */}
          {offlineMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                  {isElectron 
                    ? 'Offline mode: Order will be saved locally and synced automatically when online.'
                    : 'You are offline. Order will be saved locally.'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Product Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Product Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Product:</span>
                <span className="text-gray-900 dark:text-white font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
                <span className="text-gray-900 dark:text-white">UGX {product.price?.toLocaleString()}</span>
              </div>
              {product.minOrderQuantity && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Min Order:</span>
                  <span className="text-gray-900 dark:text-white">{product.minOrderQuantity} {product.measurementUnit}</span>
                </div>
              )}
              {product.bulkDiscount && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Bulk Discount:</span>
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    {product.bulkDiscount.minQuantity}+ units: {product.bulkDiscount.discountPercentage}% off
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity ({product.measurementUnit}) *
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={product.minOrderQuantity || 1}
              step="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              required
            />
            {product.bulkDiscount && quantity >= product.bulkDiscount.minQuantity && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                🎉 Bulk discount applied! You save {product.bulkDiscount.discountPercentage}%
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Phone Number *
            </label>
            <input
              type="tel"
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              placeholder="+256 XXX XXX XXX"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              For delivery coordination and updates
            </p>
          </div>

          {/* Delivery Address */}
          <div>
            <label htmlFor="deliveryPlace" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delivery Address *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="deliveryPlace"
                value={deliveryPlace}
                onChange={(e) => setDeliveryPlace(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                placeholder="Enter your complete delivery address..."
                required
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200"
                title="Use current location"
              >
                📍
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Include street, area, city, and any landmarks
            </p>
          </div>

          {/* Delivery Date */}
          <div>
            <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Delivery Date *
            </label>
            <input
              type="date"
              id="deliveryDate"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={getMinDeliveryDate()}
              max={getMaxDeliveryDate()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Delivery typically within 3-5 business days
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method *
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="cash_on_delivery">Cash on Delivery</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          {/* Order Notes */}
          <div>
            <label htmlFor="orderNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order Notes (Optional)
            </label>
            <textarea
              id="orderNotes"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              placeholder="Any special instructions, delivery preferences, access codes, or additional notes..."
            />
          </div>

          {/* Location Detection Status */}
          <div className={`rounded-lg p-4 ${
            coordinates.lat === DEFAULT_COORDINATES.lat ?
            'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
            'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                coordinates.lat === DEFAULT_COORDINATES.lat ?
                'text-yellow-800 dark:text-yellow-300' :
                'text-blue-800 dark:text-blue-300'
              }`}>
                {getLocationStatusText()}
              </span>
              {locationStatus === 'detecting' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
              {locationStatus === 'success' && coordinates.lat !== DEFAULT_COORDINATES.lat && (
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {locationStatus === 'success' && coordinates.lat === DEFAULT_COORDINATES.lat && (
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                <div className="text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-600 p-1 rounded">
                  {coordinates.lat ? coordinates.lat.toFixed(6) : '--'}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                <div className="text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-600 p-1 rounded">
                  {coordinates.lng ? coordinates.lng.toFixed(6) : '--'}
                </div>
              </div>
            </div>

            {coordinates.lat === DEFAULT_COORDINATES.lat && (
              <div className="mt-2">
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                  Using default coordinates. Your order will still be processed normally.
                </p>
                <button
                  type="button"
                  onClick={handleRetryLocation}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors duration-200"
                >
                  Retry Location Detection
                </button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 text-sm">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700 dark:text-green-400">Subtotal:</span>
                <span className="text-green-700 dark:text-green-400">
                  UGX {(product.price * quantity).toLocaleString()}
                </span>
              </div>
              {product.bulkDiscount && quantity >= product.bulkDiscount.minQuantity && (
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Bulk Discount:</span>
                  <span className="text-green-600 dark:text-green-400">
                    -UGX {((product.price * quantity) - totalPrice).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="border-t border-green-200 dark:border-green-700 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-800 dark:text-green-300">Total Amount:</span>
                  <span className="text-lg font-bold text-green-800 dark:text-green-300">
                    UGX {totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !deliveryPlace.trim() || !contactPhone.trim() || !deliveryDate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {offlineMode ? 'Saving Locally...' : 'Placing Order...'}
                </>
              ) : (
                offlineMode ? 'Save Order Offline' : 'Place Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;