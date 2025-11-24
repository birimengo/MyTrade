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
  FaShoppingCart,
  FaPlusCircle, // NEW: Restock icon
  FaHistory, // NEW: History icon
  FaWarehouse, // NEW: Warehouse icon
  FaMoneyBillWave // NEW: Money icon
} from 'react-icons/fa';

const MyProducts = ({ 
  products, 
  handleEdit, 
  handleDelete, 
  handleRestock, // NEW: Restock handler
  setShowCreateForm, 
  highlightedProduct,
  isElectron,
  isOnline
}) => {
  const [visibleProducts, setVisibleProducts] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [expandedProduct, setExpandedProduct] = useState(null); // NEW: For expanded view
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

  // NEW: Toggle expanded view
  const toggleExpandedView = (productId, event) => {
    event?.stopPropagation();
    setExpandedProduct(prev => prev === productId ? null : productId);
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

  const getStockStatus = (quantity, lowStockThreshold = 0.5, originalStockQuantity = 0) => {
    if (quantity === 0) {
      return { 
        text: 'Out of Stock', 
        color: 'text-red-600 dark:text-red-400', 
        bg: 'bg-red-100 dark:bg-red-900/20',
        level: 'out'
      };
    }
    
    if (originalStockQuantity > 0) {
      const stockPercentage = quantity / originalStockQuantity;
      if (stockPercentage <= lowStockThreshold) {
        return { 
          text: 'Low Stock', 
          color: 'text-yellow-600 dark:text-yellow-400', 
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          level: 'low'
        };
      }
    } else {
      // Fallback for products without original stock quantity
      if (quantity <= 10) {
        return { 
          text: 'Low Stock', 
          color: 'text-yellow-600 dark:text-yellow-400', 
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          level: 'low'
        };
      }
    }
    
    return { 
      text: 'In Stock', 
      color: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-100 dark:bg-green-900/20',
      level: 'good'
    };
  };

  // NEW: Calculate profit metrics
  const calculateProfitMetrics = (product) => {
    const costPrice = product.costPrice || 0;
    const sellingPrice = product.price || 0;
    const quantity = product.quantity || 0;
    
    const profitPerUnit = sellingPrice - costPrice;
    const profitMargin = costPrice > 0 ? (profitPerUnit / costPrice) * 100 : 0;
    const totalProfitPotential = profitPerUnit * quantity;
    const stockValue = costPrice * quantity;
    
    return {
      profitPerUnit,
      profitMargin,
      totalProfitPotential,
      stockValue,
      hasProfit: profitPerUnit > 0
    };
  };

  // NEW: Format restock statistics
  const formatRestockStats = (product) => {
    const stats = product.restockStatistics || {};
    return {
      totalRestocks: stats.totalRestocks || 0,
      totalQuantityAdded: stats.totalQuantityAdded || 0,
      totalInvestment: stats.totalInvestment || 0,
      lastRestockDate: stats.lastRestockDate,
      averageRestockQuantity: stats.averageRestockQuantity || 0
    };
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
          const isExpanded = expandedProduct === product._id; // NEW: Expanded state
          const stockStatus = getStockStatus(
            product.quantity, 
            product.lowStockThreshold, 
            product.originalStockQuantity
          );
          const profitMetrics = calculateProfitMetrics(product); // NEW: Profit metrics
          const restockStats = formatRestockStats(product); // NEW: Restock stats

          return (
            <div 
              key={product._id} 
              ref={isHighlighted ? highlightedRef : null}
              className={`
                border rounded-xl p-4 transition-all duration-300 hover:shadow-lg flex flex-col
                ${isExpanded ? 'h-auto' : 'h-[420px]'}
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

                {/* NEW: Expand/Collapse Button */}
                <button
                  onClick={(e) => toggleExpandedView(product._id, e)}
                  className="absolute bottom-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  <FaHistory className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
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

                  {/* NEW: Cost Price Display */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Cost Price:</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      UGX {product.costPrice?.toLocaleString()}
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

                  {/* NEW: Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3">
                      {/* Profit Metrics */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-1">
                          <FaMoneyBillWave className="text-green-500" />
                          <span>Profit Analysis</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Profit/Unit:</span>
                            <div className={`font-semibold ${profitMetrics.hasProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              UGX {profitMetrics.profitPerUnit.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Margin:</span>
                            <div className={`font-semibold ${profitMetrics.hasProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {profitMetrics.profitMargin.toFixed(2)}%
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600 dark:text-gray-400">Total Profit Potential:</span>
                            <div className={`font-semibold ${profitMetrics.hasProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              UGX {profitMetrics.totalProfitPotential.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Restock Statistics */}
                      {restockStats.totalRestocks > 0 && (
                        <div className="bg-gradient-to-r from-orange-50 to-purple-50 dark:from-orange-900/10 dark:to-purple-900/10 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-1">
                            <FaWarehouse className="text-orange-500" />
                            <span>Restock History</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Total Restocks:</span>
                              <div className="font-semibold text-orange-600 dark:text-orange-400">
                                {restockStats.totalRestocks}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Quantity Added:</span>
                              <div className="font-semibold text-purple-600 dark:text-purple-400">
                                {restockStats.totalQuantityAdded.toLocaleString()}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600 dark:text-gray-400">Total Investment:</span>
                              <div className="font-semibold text-orange-600 dark:text-orange-400">
                                UGX {restockStats.totalInvestment.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Product Metadata */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>SKU:</span>
                          <span className="font-mono">{product.sku || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Category:</span>
                          <span>{product.category}</span>
                        </div>
                        {product.fromCertifiedOrder && (
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="text-blue-600 dark:text-blue-400">Certified</span>
                          </div>
                        )}
                      </div>
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
                  title="Edit product details"
                >
                  <FaEdit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                
                {/* NEW: Restock Button */}
                <button
                  onClick={() => handleRestock(product)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-md"
                  title="Restock product inventory"
                >
                  <FaPlusCircle className="w-3 h-3" />
                  <span>Restock</span>
                </button>
                
                <button
                  onClick={() => handleDelete(product._id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-md"
                  title="Delete product"
                >
                  <FaTrash className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>

              {/* NEW: Quick Action Bar for Expanded View */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                  {restockStats.lastRestockDate && (
                    <div className="text-xs text-green-500 dark:text-green-400">
                      Last restock: {new Date(restockStats.lastRestockDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default MyProducts;