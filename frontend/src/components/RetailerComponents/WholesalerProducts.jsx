import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import OrderForm from './OrderForm';

const WholesalerProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wholesaler, setWholesaler] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState({});
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { user } = useAuth();
  const { wholesalerId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWholesalerProducts();
    fetchWholesalerInfo();
  }, [wholesalerId]);

  const fetchWholesalerInfo = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/wholesalers/${wholesalerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWholesaler(data.wholesaler || data.user);
        }
      } else {
        console.warn('Failed to fetch wholesaler info, using fallback data');
        setWholesaler({
          _id: wholesalerId,
          businessName: 'Wholesaler',
          contactPerson: 'Contact Person',
          email: 'email@example.com',
        });
      }
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

      const response = await fetch(`http://localhost:5000/api/wholesalers/${wholesalerId}/products`);

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching wholesaler products:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContactWholesaler = () => {
    console.log('Contacting wholesaler:', wholesaler);
  };

  const handleAddToCart = (product) => {
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

  const handleOrderSubmission = (orderDetails) => {
    console.log('Order details received from form:', orderDetails);
    alert('Order placed successfully!');
  };

  const handlePrevImage = (productId, imagesLength) => {
    setActiveImageIndex(prev => {
      const current = prev[productId] || 0;
      return {
        ...prev,
        [productId]: (current - 1 + imagesLength) % imagesLength,
      };
    });
  };

  const handleNextImage = (productId, imagesLength) => {
    setActiveImageIndex(prev => {
      const current = prev[productId] || 0;
      return {
        ...prev,
        [productId]: (current + 1) % imagesLength,
      };
    });
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Loading Products...</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-300">Loading wholesaler products...</span>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mt-2">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <div className="flex-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-2 text-xs"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Wholesalers
            </button>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
              {wholesaler ? `${wholesaler.businessName}'s Products` : 'Wholesaler Products'}
            </h2>
            {wholesaler && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                Contact: {wholesaler.contactPerson} • {wholesaler.email}
                {wholesaler.phone && ` • ${wholesaler.phone}`}
              </p>
            )}
          </div>

          {wholesaler && (
            <button
              onClick={handleContactWholesaler}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200 mt-2 sm:mt-0 flex items-center whitespace-nowrap"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Contact
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-xs dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Controls Section */}
        {products.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 p-2 bg-gray-50 rounded dark:bg-gray-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              {/* Search Input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="border border-gray-300 rounded pl-7 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-full"
                />
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Category:</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-28"
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

        {/* Products Grid */}
        <div className="max-h-[320px] overflow-y-auto">
          {products.length === 0 ? (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No products available</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                This wholesaler hasn't added any products yet.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No matching products</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                No products match your current filters.
              </p>
              <button
                onClick={() => {setFilterCategory(''); setSearchTerm('');}}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards Layout */}
              <div className="space-y-3 md:hidden">
                {filteredProducts.map(product => {
                  const images = product.images || [];
                  const currentImageIndex = activeImageIndex[product._id] || 0;
                  const currentImage = images[currentImageIndex]?.url;
                  const hasMultipleImages = images.length > 1;

                  return (
                    <div key={product._id} className="border border-gray-200 rounded-lg p-3 transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50">
                      {/* Product Image Section */}
                      <div className="relative w-full h-32 mb-3">
                        {currentImage ? (
                          <img
                            src={currentImage}
                            alt={product.name}
                            className="w-full h-full object-contain rounded bg-gray-100 dark:bg-gray-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Image Navigation */}
                        {hasMultipleImages && (
                          <>
                            <button
                              onClick={() => handlePrevImage(product._id, images.length)}
                              className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200 focus:outline-none"
                              aria-label="Previous image"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleNextImage(product._id, images.length)}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200 focus:outline-none"
                              aria-label="Next image"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>

                            {/* Image navigation dots */}
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

                      {/* Product Info */}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {product.name}
                      </h3>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Price:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
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
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {product.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Actions */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex space-x-1">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => handlePlaceOrder(product)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Grid Layout */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const images = product.images || [];
                  const currentImageIndex = activeImageIndex[product._id] || 0;
                  const currentImage = images[currentImageIndex]?.url;
                  const hasMultipleImages = images.length > 1;

                  return (
                    <div key={product._id} className="border border-gray-200 rounded-lg p-3 transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50">
                      {/* Product Image Section */}
                      <div className="relative w-full h-40 mb-3">
                        {currentImage ? (
                          <img
                            src={currentImage}
                            alt={product.name}
                            className="w-full h-full object-contain rounded bg-gray-100 dark:bg-gray-700"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Image Navigation */}
                        {hasMultipleImages && (
                          <>
                            <button
                              onClick={() => handlePrevImage(product._id, images.length)}
                              className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200 focus:outline-none"
                              aria-label="Previous image"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleNextImage(product._id, images.length)}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity duration-200 focus:outline-none"
                              aria-label="Next image"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>

                            {/* Image navigation dots */}
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

                      {/* Product Info */}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                        {product.name}
                      </h3>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Price:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
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

                        {product.minOrderQuantity > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Min Order:</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {product.minOrderQuantity} {product.measurementUnit}
                            </span>
                          </div>
                        )}

                        {product.category && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Category:</span>
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {product.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Actions */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex space-x-1">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => handlePlaceOrder(product)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Order Form Popup */}
      {showOrderForm && selectedProduct && (
        <OrderForm
          product={selectedProduct}
          onClose={handleCloseOrderForm}
          onSubmit={handleOrderSubmission}
        />
      )}
    </ErrorBoundary>
  );
};

export default WholesalerProducts;