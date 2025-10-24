// components/WholesalerComponents/SupplierProducts.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { Feather } from '@expo/vector-icons';
import SupplierOrderForm from './SupplierOrderForm';

const SupplierProducts = ({ isDarkMode, supplier, onClose, isEmbedded }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, getAuthToken, API_BASE_URL } = useAuth();
  const { socket, isConnected } = useSocket();
  const { isDarkMode: contextDarkMode } = useDarkMode();
  
  const darkMode = isDarkMode !== undefined ? isDarkMode : contextDarkMode;
  
  const { supplierId, supplierName } = isEmbedded ? 
    { supplierId: supplier?._id, supplierName: supplier?.businessName } : 
    route.params || {};
  
  const [supplierData, setSupplierData] = useState(supplier || null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [productImageIndices, setProductImageIndices] = useState({});
  const [isSupplierOnline, setIsSupplierOnline] = useState(false);

  useEffect(() => {
    if (socket && supplierId) {
      socket.on('userStatusChanged', (data) => {
        if (data.userId === supplierId) {
          setIsSupplierOnline(data.isOnline);
        }
      });

      socket.on('onlineUsers', (userIds) => {
        setIsSupplierOnline(userIds.includes(supplierId));
      });

      return () => {
        socket.off('userStatusChanged');
        socket.off('onlineUsers');
      };
    }
  }, [socket, supplierId]);

  useEffect(() => {
    if (supplierId) {
      fetchSupplierAndProducts();
    }
  }, [supplierId]);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const fetchSupplierAndProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAuthToken();
      
      if (!token) {
        setError('Please log in to view products');
        setLoading(false);
        return;
      }

      if (!supplierData && supplierId) {
        try {
          const supplierResponse = await fetch(
            `${API_BASE_URL}/api/supplier-products/supplier/${supplierId}/details`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              } 
            }
          );

          if (supplierResponse.ok) {
            const supplierData = await supplierResponse.json();
            if (supplierData.success && supplierData.supplier) {
              setSupplierData(supplierData.supplier);
            } else if (supplierData.supplier) {
              setSupplierData(supplierData.supplier);
            } else {
              setSupplierData(getMockSupplier());
            }
          } else {
            setSupplierData(getMockSupplier());
          }
        } catch (supplierError) {
          console.error('Error fetching supplier details:', supplierError);
          setSupplierData(getMockSupplier());
        }
      }

      if (supplierId) {
        try {
          const productsResponse = await fetch(
            `${API_BASE_URL}/api/supplier-products/supplier/${supplierId}`,
            { 
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              } 
            }
          );

          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            
            if (productsData.success && productsData.products) {
              const productsWithImages = productsData.products.map(product => ({
                ...product,
                images: product.images?.length > 0 ? product.images : getDefaultImages()
              }));
              
              setProducts(productsWithImages);
              
              const initialIndices = {};
              productsWithImages.forEach(product => {
                initialIndices[product._id] = 0;
              });
              setProductImageIndices(initialIndices);
            } else if (productsData.products) {
              const productsWithImages = productsData.products.map(product => ({
                ...product,
                images: product.images?.length > 0 ? product.images : getDefaultImages()
              }));
              setProducts(productsWithImages);
              
              const initialIndices = {};
              productsWithImages.forEach(product => {
                initialIndices[product._id] = 0;
              });
              setProductImageIndices(initialIndices);
            } else {
              throw new Error(productsData.message || 'No products data received');
            }
          } else {
            await tryAlternativeEndpoints(token);
          }
        } catch (productsError) {
          console.error('Error fetching products:', productsError);
          const token = await getAuthToken();
          await tryAlternativeEndpoints(token);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      if (!supplierData) {
        setSupplierData(getMockSupplier());
      }
      setProducts(getMockProducts());
      
      const initialIndices = {};
      getMockProducts().forEach(product => {
        initialIndices[product._id] = 0;
      });
      setProductImageIndices(initialIndices);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const tryAlternativeEndpoints = async (token) => {
    const endpoints = [
      `${API_BASE_URL}/api/products/supplier/${supplierId}`,
      `${API_BASE_URL}/api/products?supplierId=${supplierId}`,
      `${API_BASE_URL}/api/suppliers/${supplierId}/products`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const productsArray = data.products || data.data || data.items || [];
          if (productsArray.length > 0) {
            const productsWithImages = productsArray.map(product => ({
              ...product,
              images: product.images?.length > 0 ? product.images : getDefaultImages()
            }));
            
            setProducts(productsWithImages);
            
            const initialIndices = {};
            productsWithImages.forEach(product => {
              initialIndices[product._id] = 0;
            });
            setProductImageIndices(initialIndices);
            return;
          }
        }
      } catch (endpointError) {
        console.log(`Endpoint ${endpoint} failed:`, endpointError);
      }
    }
    
    throw new Error('All product endpoints failed, using mock data');
  };

  const getMockSupplier = () => ({
    _id: supplierId,
    businessName: supplierName || 'Demo Supplier',
    firstName: 'John',
    lastName: 'Doe',
    productCategory: 'Electronic Components',
    email: 'supplier@example.com',
    phone: '0785123456',
    city: 'Kampala',
    country: 'Uganda'
  });

  const getMockProducts = () => [
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
      images: getDefaultImages(),
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
      images: getDefaultImages(),
      productionStatus: 'in_production',
      tags: ['premium', 'electronics', 'high-performance'],
    }
  ];

  const getDefaultImages = () => [
    { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=300&h=200&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1557804483-efd2960ffc0e?w=300&h=200&fit=crop' }
  ];

  const filterProducts = () => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  };

  const nextImage = (productId) => {
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

  const prevImage = (productId) => {
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
    if (isEmbedded && onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  const handleContactSupplier = () => {
    if (isSupplierOnline) {
      navigation.navigate('Chat', { 
        recipientId: supplierId,
        recipientName: supplierData?.businessName || supplierName
      });
    } else {
      Alert.alert(
        'Supplier Offline',
        `${supplierData?.businessName || supplierName} is currently offline. Try again later.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddToCart = (product) => {
    Alert.alert('Success', `Added ${product.name} to cart`);
  };

  const handleOrderNow = (product) => {
    setSelectedProduct(product);
    setShowOrderModal(true);
  };

  const handleOrderPlaced = () => {
    fetchSupplierAndProducts();
  };

  const handleCloseOrderModal = () => {
    setShowOrderModal(false);
    setSelectedProduct(null);
  };

  const getCategories = () => {
    const categories = ['all', ...new Set(products.map(product => product.category).filter(Boolean))];
    return categories;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return { bg: '#D1FAE5', text: '#065F46', darkBg: '#064E3B', darkText: '#A7F3D0' };
      case 'in_production': return { bg: '#FEF3C7', text: '#92400E', darkBg: '#78350F', darkText: '#FCD34D' };
      case 'discontinued': return { bg: '#FEE2E2', text: '#991B1B', darkBg: '#7F1D1D', darkText: '#FCA5A5' };
      default: return { bg: '#F3F4F6', text: '#374151', darkBg: '#4B5563', darkText: '#D1D5DB' };
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupplierAndProducts();
  };

  const ProductCard = ({ product }) => {
    const currentImageIndex = productImageIndices[product._id] || 0;
    const currentImage = product.images?.[currentImageIndex] || { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop' };
    const hasMultipleImages = product.images && product.images.length > 1;
    const statusColors = getStatusColor(product.productionStatus);

    return (
      <View style={[styles.productCard, darkMode && styles.darkProductCard]}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentImage.url }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {hasMultipleImages && (
            <>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => prevImage(product._id)}
              >
                <Feather name="chevron-left" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navButton, styles.navButtonRight]}
                onPress={() => nextImage(product._id)}
              >
                <Feather name="chevron-right" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View style={styles.imageIndicator}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentImageIndex && styles.activeIndicatorDot
                    ]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={[styles.productName, darkMode && styles.darkText]} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: darkMode ? statusColors.darkBg : statusColors.bg }
            ]}>
              <Text style={[
                styles.statusText,
                { color: darkMode ? statusColors.darkText : statusColors.text }
              ]}>
                {product.productionStatus?.replace('_', ' ') || 'Available'}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.productDescription, darkMode && styles.darkSubtext]} numberOfLines={2}>
            {product.description}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${product.sellingPrice || product.price}</Text>
            <Text style={styles.profitMargin}>
              {product.profitMargin ? `${product.profitMargin?.toFixed(1)}% margin` : 'Good value'}
            </Text>
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Feather name="package" size={12} color={darkMode ? "#9CA3AF" : "#6B7280"} />
              <Text style={[styles.detail, darkMode && styles.darkSubtext]}>
                Min: {product.minOrderQuantity || 1}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="clock" size={12} color={darkMode ? "#9CA3AF" : "#6B7280"} />
              <Text style={[styles.detail, darkMode && styles.darkSubtext]}>
                {product.productionTime || 3}d
              </Text>
            </View>
          </View>
          
          <View style={styles.footerRow}>
            <Text style={[
              styles.stockStatus,
              (product.quantity > 0 || product.inStock) ? styles.inStock : styles.outOfStock
            ]}>
              {product.quantity > 0 ? `${product.quantity} in stock` : (product.inStock ? 'In stock' : 'Out of stock')}
            </Text>
            <Text style={[styles.category, darkMode && styles.darkSubtext]}>
              {product.category || 'General'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.cartButton,
                (product.quantity === 0 && !product.inStock) && styles.disabledButton,
                darkMode && styles.darkCartButton
              ]}
              onPress={() => handleAddToCart(product)}
              disabled={product.quantity === 0 && !product.inStock}
            >
              <Feather name="shopping-cart" size={14} color={(product.quantity > 0 || product.inStock) ? "#FFFFFF" : "#9CA3AF"} />
              <Text style={[
                styles.buttonText,
                (product.quantity === 0 && !product.inStock) && styles.disabledButtonText
              ]}>
                Add to Cart
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.orderButton,
                (product.quantity === 0 && !product.inStock) && styles.disabledButton,
                darkMode && styles.darkOrderButton
              ]}
              onPress={() => handleOrderNow(product)}
              disabled={product.quantity === 0 && !product.inStock}
            >
              <Feather name="credit-card" size={14} color={(product.quantity > 0 || product.inStock) ? "#FFFFFF" : "#9CA3AF"} />
              <Text style={[
                styles.buttonText,
                (product.quantity === 0 && !product.inStock) && styles.disabledButtonText
              ]}>
                Order Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, darkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToSuppliers}
          >
            <Feather name="arrow-left" size={20} color={darkMode ? "#FFFFFF" : "#374151"} />
            <Text style={[styles.backButtonText, darkMode && styles.darkText]}>
              {isEmbedded ? 'Close' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.loadingText, darkMode && styles.darkText]}>
            Loading products...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToSuppliers}
        >
          <Feather name="arrow-left" size={20} color={darkMode ? "#FFFFFF" : "#374151"} />
          <Text style={[styles.backButtonText, darkMode && styles.darkText]}>
            {isEmbedded ? 'Close' : 'Back to Suppliers'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.contactButton,
            !isSupplierOnline && styles.disabledButton,
            darkMode && styles.darkContactButton
          ]}
          onPress={handleContactSupplier}
          disabled={!isSupplierOnline}
        >
          <Feather name="message-circle" size={14} color={isSupplierOnline ? "#FFFFFF" : "#9CA3AF"} />
          <Text style={[
            styles.contactButtonText,
            !isSupplierOnline && styles.disabledButtonText
          ]}>
            Contact
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleSection}>
        <Text style={[styles.title, darkMode && styles.darkText]}>
          {supplierData?.businessName || supplierName}'s Products
        </Text>
        <View style={styles.subtitleRow}>
          <View style={[styles.categoryBadge, darkMode && styles.darkCategoryBadge]}>
            <Feather name="tag" size={12} color={darkMode ? "#DBEAFE" : "#1E40AF"} />
            <Text style={[styles.categoryText, darkMode && styles.darkCategoryText]}>
              {supplierData?.productCategory || 'Various'}
            </Text>
          </View>
          <View style={[
            styles.supplierStatus,
            isSupplierOnline ? styles.onlineStatus : styles.offlineStatus,
            darkMode && (isSupplierOnline ? styles.darkOnlineStatus : styles.darkOfflineStatus)
          ]}>
            <View style={[
              styles.statusDot,
              isSupplierOnline ? styles.onlineDot : styles.offlineDot
            ]} />
            <Text style={styles.statusText}>
              {isSupplierOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={[styles.errorContainer, darkMode && styles.darkErrorContainer]}>
          <Feather name="alert-triangle" size={16} color="#DC2626" />
          <View style={styles.errorTextContainer}>
            <Text style={styles.errorTitle}>Notice</Text>
            <Text style={styles.errorMessage}>
              {error.includes('mock data') ? 'Using sample data for demonstration' : error}
            </Text>
          </View>
        </View>
      )}

      {/* Search and Filter */}
      <View style={[styles.searchContainer, darkMode && styles.darkSearchContainer]}>
        <Feather name="search" size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, darkMode && styles.darkSearchInput]}
          placeholder="Search products..."
          placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Feather name="x" size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {getCategories().map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.activeFilterChip,
                darkMode && styles.darkFilterChip,
                darkMode && selectedCategory === category && styles.darkActiveFilterChip
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === category && styles.activeFilterText,
                darkMode && styles.darkFilterText,
                darkMode && selectedCategory === category && styles.darkActiveFilterText
              ]}>
                {category === 'all' ? 'All' : category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <Text style={[styles.resultCount, darkMode && styles.darkSubtext]}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        </Text>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item._id || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor={darkMode ? '#3B82F6' : '#3B82F6'}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, darkMode && styles.darkEmptyContainer]}>
            <Feather name="package" size={48} color="#9CA3AF" />
            <Text style={[styles.emptyTitle, darkMode && styles.darkText]}>
              No products found
            </Text>
            <Text style={[styles.emptyMessage, darkMode && styles.darkSubtext]}>
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search terms' 
                : 'This supplier hasn\'t added any products yet.'}
            </Text>
            {(searchTerm || selectedCategory !== 'all') && (
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                <Text style={styles.clearFilterText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Order Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseOrderModal}
      >
        <SupplierOrderForm
          product={selectedProduct}
          supplier={supplierData}
          onClose={handleCloseOrderModal}
          onOrderPlaced={handleOrderPlaced}
          isDarkMode={darkMode}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  darkContactButton: {
    backgroundColor: '#2563EB',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },

  // Title Section
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  darkText: {
    color: '#FFFFFF',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  darkCategoryBadge: {
    backgroundColor: '#1E40AF',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  darkCategoryText: {
    color: '#DBEAFE',
  },
  supplierStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  onlineStatus: {
    backgroundColor: '#D1FAE5',
  },
  darkOnlineStatus: {
    backgroundColor: '#064E3B',
  },
  offlineStatus: {
    backgroundColor: '#F3F4F6',
  },
  darkOfflineStatus: {
    backgroundColor: '#4B5563',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  darkErrorContainer: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  errorTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  errorTitle: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  errorMessage: {
    color: '#DC2626',
    fontSize: 11,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  darkSearchContainer: {
    backgroundColor: '#1F2937',
    borderColor: '#4B5563',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    padding: 0,
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },

  // Filter Section
  filterSection: {
    marginBottom: 12,
  },
  filterScrollContent: {
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 6,
  },
  darkFilterChip: {
    backgroundColor: '#1F2937',
    borderColor: '#4B5563',
  },
  activeFilterChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  darkActiveFilterChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  darkFilterText: {
    color: '#D1D5DB',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  darkActiveFilterText: {
    color: '#FFFFFF',
  },
  resultCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  // List
  listContainer: {
    paddingBottom: 16,
  },

  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  darkProductCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -8 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  navButtonRight: {
    right: 8,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 4,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeIndicatorDot: {
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    padding: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  productDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  profitMargin: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detail: {
    fontSize: 11,
    color: '#6B7280',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inStock: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  outOfStock: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  category: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  darkCartButton: {
    backgroundColor: '#059669',
  },
  orderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  darkOrderButton: {
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  darkEmptyContainer: {
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyMessage: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 200,
  },
  clearFilterButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SupplierProducts;