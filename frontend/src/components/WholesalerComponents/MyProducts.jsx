import React, { useState, useEffect, useRef } from 'react';

const MyProducts = ({ products, handleEdit, handleDelete, setShowCreateForm, highlightedProduct }) => {
  const [visibleProducts, setVisibleProducts] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const highlightedRef = useRef(null);

  // Scroll to highlighted product when it changes
  useEffect(() => {
    if (highlightedProduct && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add pulsing animation
        highlightedRef.current.classList.add('animate-pulse');
        setTimeout(() => {
          if (highlightedRef.current) {
            highlightedRef.current.classList.remove('animate-pulse');
          }
        }, 2000);
      }, 300);
    }
  }, [highlightedProduct]);

  const toggleVisibility = (productId) => {
    setVisibleProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const navigateImage = (productId, direction) => {
    setCurrentImageIndex(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p._id === productId);
      const totalImages = product?.images?.length || 0;
      
      if (totalImages <= 1) return prev;
      
      let newIndex;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % totalImages;
      } else {
        newIndex = (currentIndex - 1 + totalImages) % totalImages;
      }
      
      return {
        ...prev,
        [productId]: newIndex
      };
    });
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products yet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Get started by adding your first product to your catalog.
        </p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Add Your First Product
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
        {highlightedProduct && (
          <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-full">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
              Product selected for action
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto pr-2">
        {products.map(product => {
          const isVisible = visibleProducts[product._id] !== false;
          const currentIndex = currentImageIndex[product._id] || 0;
          const totalImages = product.images?.length || 0;
          const currentImage = product.images?.[currentIndex]?.url;
          const isHighlighted = product._id === highlightedProduct;

          return (
            <div 
              key={product._id} 
              ref={isHighlighted ? highlightedRef : null}
              className={`
                border rounded-xl p-4 transition-all duration-300 hover:shadow-lg h-[360px] flex flex-col
                ${isHighlighted 
                  ? 'border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-700 dark:bg-gray-800/50'
                }
              `}
            >
              {/* Product Image with Navigation */}
              <div className="relative mb-3 flex-shrink-0">
                {isVisible ? (
                  <>
                    {currentImage ? (
                      <div className="relative">
                        <img
                          src={currentImage}
                          alt={product.name}
                          className="w-full h-32 object-contain rounded-lg bg-gray-100 dark:bg-gray-700"
                        />
                        
                        {/* Image Navigation Arrows */}
                        {totalImages > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateImage(product._id, 'prev');
                              }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateImage(product._id, 'next');
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </>
                        )}
                        
                        {/* Image Counter */}
                        {totalImages > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {currentIndex + 1} / {totalImages}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  </div>
                )}
                
                {/* Visibility Toggle Button */}
                <button
                  onClick={() => toggleVisibility(product._id)}
                  className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-1.5 rounded-full shadow-md transition-colors"
                  title={isVisible ? 'Hide product' : 'Show product'}
                >
                  <svg 
                    className={`w-4 h-4 ${isVisible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    {isVisible ? (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </>
                    )}
                  </svg>
                </button>

                {/* Highlight Indicator */}
                {isHighlighted && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Selected
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate text-sm">
                  {product.name}
                </h3>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {product.description}
                </p>

                <div className="space-y-1.5 mb-3">
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

                  {product.minOrderQuantity > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Min Order:</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {product.minOrderQuantity} {product.measurementUnit}
                      </span>
                    </div>
                  )}

                  {product.bulkDiscount && product.discountPercentage > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Bulk Discount:</span>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {product.discountPercentage}% off
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Actions */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex space-x-2 mt-auto">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product._id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MyProducts;