// components/WholesalerComponents/MyProducts.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FaEye, 
  FaEyeSlash, 
  FaEdit, 
  FaTrash, 
  FaChevronLeft, 
  FaChevronRight,
  FaImage,
  FaBox,
  FaTag,
  FaShoppingCart
} from 'react-icons/fa';

const MyProducts = ({ 
  products, 
  handleEdit, 
  handleDelete, 
  setShowCreateForm, 
  highlightedProduct,
  isElectron,
  isOnline
}) => {
  const [visibleProducts, setVisibleProducts] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const highlightedRef = useRef(null);

  // Initialize visibility state for all products
  useEffect(() => {
    const initialVisibility = {};
    products.forEach(product => {
      initialVisibility[product._id] = true; // Default to visible
    });
    setVisibleProducts(initialVisibility);
  }, [products]);

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

  const navigateImage = (productId, direction, event) => {
    event?.stopPropagation();
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

  const getStockStatus = (quantity) => {
    if (quantity > 10) return { text: 'In Stock', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' };
    if (quantity > 0) return { text: 'Low Stock', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20' };
    return { text: 'Out of Stock', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20' };
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
          <FaBox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products yet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Get started by adding your first product to your catalog.
        </p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
        >
          <FaBox className="w-4 h-4" />
          <span>Add Your First Product</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
          {isElectron && (
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>•</span>
              <span>{isOnline ? 'Online' : 'Offline'} Mode</span>
            </div>
          )}
        </div>
        
        {highlightedProduct && (
          <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-full">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
              Product selected for action
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2">
        {products.map(product => {
          const isVisible = visibleProducts[product._id] !== false;
          const currentIndex = currentImageIndex[product._id] || 0;
          const totalImages = product.images?.length || 0;
          const currentImage = product.images?.[currentIndex]?.url;
          const isHighlighted = product._id === highlightedProduct;
          const stockStatus = getStockStatus(product.quantity);

          return (
            <div 
              key={product._id} 
              ref={isHighlighted ? highlightedRef : null}
              className={`
                border rounded-xl p-4 transition-all duration-300 hover:shadow-lg h-[420px] flex flex-col
                ${isHighlighted 
                  ? 'border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-700 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {/* Product Image with Navigation */}
              <div className="relative mb-4 flex-shrink-0">
                {isVisible ? (
                  <>
                    {currentImage ? (
                      <div className="relative group">
                        <img
                          src={currentImage}
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-lg bg-gray-100 dark:bg-gray-700 transition-all duration-300 group-hover:opacity-90"
                        />
                        
                        {/* Image Navigation Arrows */}
                        {totalImages > 1 && (
                          <>
                            <button
                              onClick={(e) => navigateImage(product._id, 'prev', e)}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                            >
                              <FaChevronLeft className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => navigateImage(product._id, 'next', e)}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                            >
                              <FaChevronRight className="w-3 h-3" />
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
                      <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center group">
                        <FaImage className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center group">
                    <FaEyeSlash className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  </div>
                )}
                
                {/* Visibility Toggle Button */}
                <button
                  onClick={() => toggleVisibility(product._id)}
                  className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                  title={isVisible ? 'Hide product' : 'Show product'}
                >
                  {isVisible ? (
                    <FaEye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <FaEyeSlash className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {/* Highlight Indicator */}
                {isHighlighted && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                      <FaTag className="w-3 h-3" />
                      <span>Selected</span>
                    </div>
                  </div>
                )}

                {/* Stock Status Badge */}
                <div className="absolute bottom-2 left-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                    {stockStatus.text}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-grow space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm line-clamp-2 leading-tight">
                    {product.name}
                  </h3>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                      <FaShoppingCart className="w-3 h-3" />
                      <span>Price:</span>
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                      UGX {product.price?.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Stock Quantity:</span>
                    <span className={`font-medium text-xs ${stockStatus.color}`}>
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
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {product.discountPercentage}% off
                      </span>
                    </div>
                  )}

                  {product.tags && product.tags.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {product.tags.length > 3 && (
                          <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded">
                            +{product.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex space-x-2 mt-auto">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-md"
                >
                  <FaEdit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(product._id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-md"
                >
                  <FaTrash className="w-3 h-3" />
                  <span>Delete</span>
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