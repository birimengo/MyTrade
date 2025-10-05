// components/WholesalerComponents/SupplierWholesalersProducts.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import SupplierOrderForm from './SupplierOrderForm';

const SupplierWholesalersProducts = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isSupplierOnline, setIsSupplierOnline] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [productImageIndices, setProductImageIndices] = useState({});

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        newSocket.emit('authenticate', user.id);
      });

      newSocket.on('userStatusChanged', (data) => {
        if (data.userId === supplierId) {
          setIsSupplierOnline(data.isOnline);
        }
      });

      newSocket.on('onlineUsers', (userIds) => {
        setIsSupplierOnline(userIds.includes(supplierId));
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) {
          newSocket.close();
        }
      };
    }
  }, [supplierId]);

  useEffect(() => {
    fetchSupplierAndProducts();
  }, [supplierId]);

  const fetchSupplierAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please log in to view products');
        setLoading(false);
        return;
      }

      // Fetch supplier details
      const supplierResponse = await fetch(`http://localhost:5000/api/supplier-products/supplier/${supplierId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (supplierResponse.ok) {
        const supplierData = await supplierResponse.json();
        if (supplierData.success) {
          setSupplier(supplierData.supplier);
        } else {
          setSupplier({
            _id: supplierId,
            businessName: 'Demo Supplier',
            firstName: 'John',
            lastName: 'Doe',
            productCategory: 'Electronic Components',
            email: 'supplier@example.com',
            phone: '0785123456',
            city: 'Kampala',
            country: 'Uganda'
          });
        }
      } else {
        setSupplier({
          _id: supplierId,
          businessName: 'Demo Supplier',
          firstName: 'John',
          lastName: 'Doe',
          productCategory: 'Electronic Components',
          email: 'supplier@example.com',
          phone: '0785123456',
          city: 'Kampala',
          country: 'Uganda'
        });
      }

      // Fetch supplier's products
      const productsResponse = await fetch(`http://localhost:5000/api/supplier-products/supplier/${supplierId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.success) {
          const productsWithImages = productsData.products.map(product => ({
            ...product,
            images: product.images?.length > 0 ? product.images : [
              { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' },
              { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&h=200&fit=crop' },
              { url: 'https://images.unsplash.com/photo-1557804483-efd2960ffc0e?w=300&h=200&fit=crop' }
            ]
          }));
          
          setProducts(productsWithImages);
          setFilteredProducts(productsWithImages);
          
          // Initialize image indices
          const initialIndices = {};
          productsWithImages.forEach(product => {
            initialIndices[product._id] = 0;
          });
          setProductImageIndices(initialIndices);
        } else {
          throw new Error(productsData.message || 'Failed to fetch products');
        }
      } else {
        throw new Error('Failed to fetch products from API');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      // Fallback mock data
      const mockProducts = [
        {
          _id: '1',
          name: 'Electronic Component A',
          description: 'High-quality electronic component with advanced features',
          sellingPrice: 25.99,
          productionPrice: 15.50,
          profitMargin: 67.68,
          quantity: 100,
          category: 'Electronic Components',
          measurementUnit: 'pieces',
          productionTime: 5,
          minOrderQuantity: 10,
          images: [
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' },
            { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&h=200&fit=crop' },
            { url: 'https://images.unsplash.com/photo-1557804483-efd2960ffc0e?w=300&h=200&fit=crop' }
          ],
          productionStatus: 'ready',
          tags: ['electronics', 'components', 'circuit'],
        },
        {
          _id: '2',
          name: 'Premium Electronic Component B',
          description: 'Premium electronic component with superior performance',
          sellingPrice: 35.99,
          productionPrice: 20.00,
          profitMargin: 79.95,
          quantity: 50,
          category: 'Electronic Components',
          measurementUnit: 'pieces',
          productionTime: 7,
          minOrderQuantity: 5,
          images: [
            { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&h=200&fit=crop' },
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' },
            { url: 'https://images.unsplash.com/photo-1557804483-efd2960ffc0e?w=300&h=200&fit=crop' }
          ],
          productionStatus: 'in_production',
          tags: ['premium', 'electronics', 'high-performance'],
        }
      ];
      
      setProducts(mockProducts);
      setFilteredProducts(mockProducts);
      
      const initialIndices = {};
      mockProducts.forEach(product => {
        initialIndices[product._id] = 0;
      });
      setProductImageIndices(initialIndices);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  useEffect(() => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  // Image navigation
  const nextImage = (productId, event) => {
    event.stopPropagation();
    setProductImageIndices(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p._id === productId);
      const maxIndex = product?.images?.length ? product.images.length - 1 : 0;
      return {
        ...prev,
        [productId]: currentIndex < maxIndex ? currentIndex + 1 : 0
      };
    });
  };

  const prevImage = (productId, event) => {
    event.stopPropagation();
    setProductImageIndices(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p._id === productId);
      const maxIndex = product?.images?.length ? product.images.length - 1 : 0;
      return {
        ...prev,
        [productId]: currentIndex > 0 ? currentIndex - 1 : maxIndex
      };
    });
  };

  const handleBackToSuppliers = () => {
    navigate('/dashboard/wholesaler/suppliers');
  };

  const handleContactSupplier = () => {
    if (isSupplierOnline) {
      alert(`Opening chat with ${supplier?.businessName || supplier?.firstName + ' ' + supplier?.lastName}`);
    } else {
      alert(`${supplier?.businessName || supplier?.firstName + ' ' + supplier?.lastName} is currently offline. Try again later.`);
    }
  };

  const handleAddToCart = (product) => {
    alert(`Added ${product.name} to cart`);
  };

  const handleOrderNow = (product) => {
    setSelectedProduct(product);
    setShowOrderModal(true);
  };

  const handleOrderPlaced = () => {
    fetchSupplierAndProducts(); // Refresh products
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setSelectedProduct(null);
  };

  const getCategories = () => {
    return [...new Set(products.map(product => product.category))];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_production': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'discontinued': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-3"></div>
              <div className="text-gray-700 dark:text-gray-300 text-base font-medium">Loading products...</div>
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">Fetching supplier's product catalog</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToSuppliers}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Suppliers
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {supplier?.businessName || `${supplier?.firstName} ${supplier?.lastName}`}'s Products
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Category: <span className="font-semibold text-blue-600 dark:text-blue-400">{supplier?.productCategory}</span>
                </p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                  isSupplierOnline 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${isSupplierOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                  {isSupplierOnline ? 'Supplier Online' : 'Supplier Offline'}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleContactSupplier}
              disabled={!isSupplierOnline}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium ${
                isSupplierOnline
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Contact Supplier</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 transition-colors duration-300">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 mb-6 transition-colors duration-300">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search products by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                <option value="all">All Categories</option>
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="max-w-md mx-auto">
              <svg className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search terms or category filter' 
                  : 'This supplier hasn\'t added any products yet.'}
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 text-sm font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const currentImageIndex = productImageIndices[product._id] || 0;
              const currentImage = product.images?.[currentImageIndex] || { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' };
              const hasMultipleImages = product.images && product.images.length > 1;

              return (
                <div key={product._id} className="group bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 overflow-hidden">
                  {/* Product Image with Navigation */}
                  <div className="relative aspect-w-16 aspect-h-12 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <img
                      src={currentImage.url}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Image Navigation Arrows */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={(e) => prevImage(product._id, e)}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={(e) => nextImage(product._id, e)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {/* Image Indicator Dots */}
                    {hasMultipleImages && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                        {product.images.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductImageIndices(prev => ({
                                ...prev,
                                [product._id]: index
                              }));
                            }}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${
                              index === currentImageIndex 
                                ? 'bg-white' 
                                : 'bg-white bg-opacity-50 hover:bg-opacity-70'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Image Counter */}
                    {hasMultipleImages && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                        {currentImageIndex + 1} / {product.images.length}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 text-sm">
                        {product.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.productionStatus)}`}>
                        {product.productionStatus.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-xs mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ${product.sellingPrice}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {product.profitMargin?.toFixed(1)}% margin
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Min order: {product.minOrderQuantity} {product.measurementUnit}</span>
                        <span>Production: {product.productionTime} days</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.quantity > 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {product.category}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAddToCart(product)}
                        disabled={product.quantity === 0}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                          product.quantity > 0
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add to Cart</span>
                      </button>
                      
                      <button 
                        onClick={() => handleOrderNow(product)}
                        disabled={product.quantity === 0}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                          product.quantity > 0
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span>Order Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedProduct && (
        <SupplierOrderForm
          product={selectedProduct}
          supplier={supplier}
          onClose={handleCloseOrderModal}
          onOrderPlaced={handleOrderPlaced}
        />
      )}
    </div>
  );
};

export default SupplierWholesalersProducts;