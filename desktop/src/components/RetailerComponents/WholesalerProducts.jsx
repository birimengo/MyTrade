import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import OrderForm from './OrderForm';

const WholesalerProducts = ({ wholesalerId, onBack }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wholesaler, setWholesaler] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState({});
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

  const isElectron = window.electronAPI;

  useEffect(() => {
    fetchWholesalerProducts();
    fetchWholesalerInfo();
  }, [wholesalerId]);

  const fetchWholesalerInfo = async () => {
    try {
      try {
        const response = await fetch(`${API_BASE_URL}/api/wholesalers/${wholesalerId}`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setWholesaler(data.wholesaler || data.user);
            if (isElectron) {
              await window.electronAPI.storage.setPersistent(`wholesaler_${wholesalerId}`, data.wholesaler || data.user);
            }
            return;
          }
        }
      } catch (networkError) {
        console.log('Network unavailable for wholesaler info, trying cached data');
      }

      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent(`wholesaler_${wholesalerId}`);
        if (cachedData.success && cachedData.value) {
          setWholesaler(cachedData.value);
          setOfflineMode(true);
          return;
        }
      }

      setWholesaler({
        _id: wholesalerId,
        businessName: 'Wholesaler',
        contactPerson: 'Contact Person',
        email: 'email@example.com',
      });
    } catch (error) {
      console.error('Error fetching wholesaler info:', error);
      setWholesaler({
        _id: wholesalerId,
        businessName: 'Wholesaler',
        contactPerson: 'Contact Person',
        email: 'email@example.com',
      });
    }
  };

  const fetchWholesalerProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      setOfflineMode(false);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/wholesalers/${wholesalerId}/products`,
          { headers: getAuthHeaders() }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setProducts(data.products || []);
            if (isElectron) {
              await window.electronAPI.storage.setPersistent(`products_${wholesalerId}`, {
                data: data.products || [],
                lastUpdated: new Date().toISOString()
              });
            }
            return;
          }
        }
      } catch (networkError) {
        console.log('Network unavailable, trying cached products');
      }

      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent(`products_${wholesalerId}`);
        if (cachedData.success && cachedData.value?.data) {
          setProducts(cachedData.value.data);
          setOfflineMode(true);
          setError('Using cached data - No network connection');
          return;
        }
      }

      throw new Error('No network connection and no cached data available');
    } catch (error) {
      console.error('Error fetching wholesaler products:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContactWholesaler = () => {
    if (!wholesaler) return;

    if (isElectron) {
      window.electronAPI.showNotification(
        'Contact Wholesaler',
        `Opening contact options for ${wholesaler.businessName}`
      );
    }

    const subject = `Business Inquiry - ${wholesaler.businessName}`;
    const body = `Hello ${wholesaler.contactPerson},\n\nI would like to discuss potential business opportunities and products from ${wholesaler.businessName}.\n\nBest regards,\n${user?.firstName} ${user?.lastName}\n${user?.businessName || ''}`;
    
    window.open(`mailto:${wholesaler.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleCallWholesaler = () => {
    if (!wholesaler?.phone) return;

    if (isElectron) {
      window.electronAPI.showNotification(
        'Call Wholesaler',
        `Ready to call ${wholesaler.businessName} at ${wholesaler.phone}`
      );
    }
    
    window.open(`tel:${wholesaler.phone}`);
  };

  const handleAddToCart = (product) => {
    if (isElectron) {
      window.electronAPI.showNotification(
        'Added to Cart',
        `${product.name} added to your cart`
      );
    }
    console.log('Adding to cart:', product);
  };

  const handlePlaceOrder = (product) => {
    setSelectedProduct(product);
    setShowOrderForm(true);
  };
  
  const handleCloseOrderForm = () => {
    setShowOrderForm(false);
    setSelectedProduct(null);
  };

  const handleOrderSubmission = async (orderDetails) => {
    console.log('🔄 handleOrderSubmission called - isElectron:', isElectron);
    
    // If we're in Electron and this is a successful Electron submission, skip the API call
    if (isElectron && orderDetails.success) {
      console.log('Skipping frontend API call - order already submitted via Electron');
      handleCloseOrderForm();
      return { success: true, submittedViaElectron: true };
    }

    // If we're in Electron and this is an offline order, just close the form
    if (isElectron && orderDetails.offline) {
      console.log('Offline order processed via Electron - closing form');
      handleCloseOrderForm();
      return { success: true, offline: true };
    }

    try {
      console.log('Submitting order to backend via frontend:', orderDetails);
      
      const response = await fetch(`${API_BASE_URL}/api/retailer-orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderDetails)
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // Get the actual error message from server
        let errorMessage = 'Failed to place order';
        try {
          const errorData = await response.json();
          console.error('Server error details:', errorData);
          errorMessage = errorData.message || `Server error: ${response.status}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: Failed to parse error response`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Order submitted successfully:', data);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Order Placed Successfully',
          `Your order for ${selectedProduct.name} has been placed`
        );
      }
      
      handleCloseOrderForm();
      return data;

    } catch (error) {
      console.error('Error submitting order:', error);
      
      // Only save offline for actual network errors, not server errors
      const isNetworkError = error.message.includes('Failed to fetch') || 
                            error.message.includes('Network') ||
                            error.message.includes('network');
      
      if (isNetworkError && isElectron) {
        console.log('Network unavailable, saving order locally');
        
        // Use Electron's offline storage
        const pendingOrders = await window.electronAPI.storage.getPersistent('pending_orders');
        const orders = pendingOrders.success ? pendingOrders.value || [] : [];
        
        const offlineOrder = {
          ...orderDetails,
          id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          productName: selectedProduct.name,
          wholesalerId: wholesalerId,
          offline: true
        };
        
        orders.push(offlineOrder);
        await window.electronAPI.storage.setPersistent('pending_orders', orders);
        
        window.electronAPI.showNotification(
          'Order Saved Offline',
          'Order saved locally and will sync when online'
        );
        
        handleCloseOrderForm();
        return { success: true, offline: true, order: offlineOrder };
      }
      
      // Re-throw server validation errors so they can be displayed to the user
      if (isElectron) {
        window.electronAPI.showNotification(
          'Order Failed',
          error.message || 'Could not place order. Please try again.'
        );
      }
      throw error;
    }
  };

  const handleExportProducts = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      wholesaler: wholesaler?.businessName,
      productCount: filteredProducts.length,
      products: filteredProducts
    };

    if (isElectron) {
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `products-${wholesaler?.businessName || 'export'}-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          `Products data exported successfully`
        );
      }
    } else {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${wholesaler?.businessName || 'export'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrevImage = (productId, imagesLength) => {
    setActiveImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0 - 1 + imagesLength) % imagesLength,
    }));
  };

  const handleNextImage = (productId, imagesLength) => {
    setActiveImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0 + 1) % imagesLength,
    }));
  };

  const categories = [...new Set(products.map(product => product.category))].filter(Boolean);

  const filteredProducts = products
    .filter(product =>
      (filterCategory ? product.category === filterCategory : true) &&
      (searchTerm ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    );

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Loading Products...</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {isElectron ? 'Loading from local cache and network...' : 'Loading wholesaler products...'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {isElectron ? 'Loading products (offline capable)...' : 'Loading products...'}
            </span>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        {/* Compact Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <button
                onClick={onBack}
                className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              
              {offlineMode && isElectron && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  Offline
                </span>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                {wholesaler ? `${wholesaler.businessName}'s Products` : 'Products'}
              </h2>
              {wholesaler && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1">
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    Contact: {wholesaler.contactPerson} • {wholesaler.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-3 lg:mt-0">
            {isElectron && (
              <button
                onClick={handleExportProducts}
                className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export products data"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            )}

            {wholesaler && (
              <div className="flex space-x-1">
                {wholesaler.phone && (
                  <button
                    onClick={handleCallWholesaler}
                    className="inline-flex items-center px-2 py-1 border border-green-600 text-green-600 hover:bg-green-50 rounded text-xs font-medium transition-colors duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9.5 10.5M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                    </svg>
                    Call
                  </button>
                )}
                <button
                  onClick={handleContactWholesaler}
                  className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors duration-200"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                {offlineMode && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    You can still browse products and place orders that will sync when you're back online.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compact Controls */}
        {products.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 p-3 bg-gray-50 rounded dark:bg-gray-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="border border-gray-300 rounded pl-7 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-full"
                />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Category:</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-32"
                  >
                    <option value="">All</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {filteredProducts.length} of {products.length} products
            </div>
          </div>
        )}

        {/* Compact Products Grid */}
        <div className="overflow-y-auto">
          {products.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1 mt-3">No products available</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto mb-3">
                {offlineMode 
                  ? "No cached products available. Please check your internet connection."
                  : "This wholesaler hasn't added any products yet."
                }
              </p>
              {offlineMode && (
                <button
                  onClick={fetchWholesalerProducts}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200"
                >
                  Retry Connection
                </button>
              )}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1 mt-3">No matching products</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto mb-3">
                No products match your current search and filter criteria.
              </p>
              <button
                onClick={() => {setFilterCategory(''); setSearchTerm('');}}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const images = product.images || [];
                const currentImageIndex = activeImageIndex[product._id] || 0;
                const currentImage = images[currentImageIndex]?.url;
                const hasMultipleImages = images.length > 1;

                return (
                  <div key={product._id} className="border border-gray-200 rounded-lg p-3 transition-all duration-200 hover:shadow-md hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group">
                    {/* Optimized Image Section */}
                    <div className="relative w-full h-32 mb-3">
                      {currentImage ? (
                        <img
                          src={currentImage}
                          alt={product.name}
                          className="w-full h-full object-cover rounded bg-gray-100 dark:bg-gray-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {hasMultipleImages && (
                        <>
                          <button
                            onClick={() => handlePrevImage(product._id, images.length)}
                            className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-75 transition-opacity duration-200"
                            aria-label="Previous image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleNextImage(product._id, images.length)}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded hover:bg-opacity-75 transition-opacity duration-200"
                            aria-label="Next image"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>

                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            {images.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveImageIndex(prev => ({ ...prev, [product._id]: index }))}
                                className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                  currentImageIndex === index ? 'bg-white' : 'bg-gray-400 opacity-50'
                                }`}
                                aria-label={`View image ${index + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Compact Product Info */}
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {product.name}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Price:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                          UGX {product.price?.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Stock:</span>
                        <span className={`font-medium text-xs ${
                          product.quantity > 10 ? 'text-green-600 dark:text-green-400' :
                          product.quantity > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {product.quantity} {product.measurementUnit}
                        </span>
                      </div>

                      {product.category && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Category:</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {product.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Compact Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Cart
                        </button>
                        <button
                          onClick={() => handlePlaceOrder(product)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                          </svg>
                          Order
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Order Form Popup */}
      {showOrderForm && selectedProduct && (
        <OrderForm
          product={selectedProduct}
          onClose={handleCloseOrderForm}
          onSubmit={handleOrderSubmission}
          offlineMode={offlineMode}
        />
      )}
    </ErrorBoundary>
  );
};

export default WholesalerProducts;