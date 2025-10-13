// src/components/RetailerComponents/WholesalerProducts.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Alert,
  Image,
  FlatList,
  RefreshControl,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OrderForm from './OrderForm';
import { 
  Ionicons, 
  FontAwesome, 
  FontAwesome5, 
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
  Entypo,
  AntDesign
} from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

// Enhanced Product Card Component
const ProductCard = React.memo(({ product, isMobile, isDarkMode, onAddToCart, onPlaceOrder, activeImageIndex, onImageNavigate, onImageDotPress }) => {
  const images = product.images || [];
  const currentImageIndex = activeImageIndex[product._id] || 0;
  const currentImage = images[currentImageIndex]?.url;
  const hasMultipleImages = images.length > 1;

  return (
    <View style={[
      styles.productCard, 
      isDarkMode && styles.darkProductCard
    ]}>
      {/* Product Image Section */}
      <View style={styles.imageContainer}>
        {currentImage ? (
          <Image
            source={{ uri: currentImage }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => console.log(`Image failed to load for: ${product.name}`)}
          />
        ) : (
          <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
            <MaterialCommunityIcons name="package-variant" size={40} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </View>
        )}

        {/* Image Navigation */}
        {hasMultipleImages && (
          <>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => onImageNavigate(product._id, images.length, 'prev')}
            >
              <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => onImageNavigate(product._id, images.length, 'next')}
            >
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Image navigation dots */}
            <View style={styles.imageDots}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => onImageDotPress(product._id, index)}
                  style={[
                    styles.imageDot,
                    currentImageIndex === index ? styles.activeImageDot : styles.inactiveImageDot
                  ]}
                />
              ))}
            </View>
          </>
        )}

        {/* Bulk Discount Badge */}
        {product.bulkDiscount && (
          <View style={styles.discountBadge}>
            <FontAwesome5 name="tags" size={12} color="#FFFFFF" />
            <Text style={styles.discountText}>
              Bulk {product.bulkDiscount.discountPercentage}% off
            </Text>
          </View>
        )}

        {/* Stock Status Badge */}
        {product.quantity <= 5 && (
          <View style={[
            styles.stockBadge,
            product.quantity === 0 ? styles.outOfStockBadge : styles.lowStockBadge
          ]}>
            <MaterialIcons 
              name={product.quantity === 0 ? "error-outline" : "warning"} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.stockBadgeText}>
              {product.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
            </Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={2}>
          {product.name}
        </Text>

        <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
          {product.description}
        </Text>

        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Price:</Text></Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>
                UGX {product.price?.toLocaleString()}
              </Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={styles.originalPriceText}>
                  UGX {product.originalPrice?.toLocaleString()}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Stock:</Text></Text>
            <View style={styles.stockContainer}>
              <Text style={[
                styles.stockText,
                product.quantity > 10 ? styles.highStock :
                product.quantity > 0 ? styles.mediumStock :
                styles.lowStock
              ]}>
                {product.quantity} {product.measurementUnit}
              </Text>
              {product.quantity > 0 && (
                <View style={[
                  styles.stockIndicator,
                  product.quantity > 10 ? styles.highStockIndicator :
                  product.quantity > 5 ? styles.mediumStockIndicator :
                  styles.lowStockIndicator
                ]} />
              )}
            </View>
          </View>

          {product.minOrderQuantity > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Min Order:</Text></Text>
              <View style={styles.minOrderContainer}>
                <FontAwesome5 name="shopping-bag" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                <Text style={[styles.detailValue, isDarkMode && styles.darkSubtitle]}>
                  {product.minOrderQuantity} {product.measurementUnit}
                </Text>
              </View>
            </View>
          )}

          {product.category && (
            <TouchableOpacity style={styles.categoryBadge}>
              <FontAwesome5 name="tag" size={10} color="#1D4ED8" />
              <Text style={styles.categoryText}>
                {product.category}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Actions */}
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cartButton]}
            onPress={() => onAddToCart(product)}
            disabled={product.quantity === 0}
          >
            <FontAwesome5 
              name="shopping-cart" 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.orderButton,
              product.quantity === 0 && styles.disabledButton
            ]}
            onPress={() => onPlaceOrder(product)}
            disabled={product.quantity === 0}
          >
            <Feather name="shopping-bag" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {product.quantity === 0 ? 'Unavailable' : 'Order Now'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <Feather name="heart" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <Feather name="share-2" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <MaterialCommunityIcons name="chart-bar" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const WholesalerProducts = ({ navigation, route, onBack }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wholesaler, setWholesaler] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [activeImageIndex, setActiveImageIndex] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  const wholesalerData = route?.params?.wholesaler;
  const wholesalerId = wholesalerData?._id;

  useEffect(() => {
    if (wholesalerId) {
      console.log('🔄 Starting data fetch for wholesaler:', wholesalerId);
      fetchWholesalerProducts();
      fetchWholesalerInfo();
    } else {
      console.log('⚠️ No wholesalerId provided');
      setWholesaler(wholesalerData);
      setLoading(false);
    }
  }, [wholesalerId]);

  const getAuthToken = async () => {
    try {
      const tokenKeys = ['userToken', 'token', 'authToken', 'accessToken'];
      
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) {
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const fetchWholesalerInfo = async () => {
    try {
      const token = await getAuthToken();
      
      if (!wholesalerId) {
        setWholesaler(wholesalerData);
        return;
      }

      const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';
      const headers = { 'Content-Type': 'application/json' };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/wholesalers/${wholesalerId}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWholesaler(data.wholesaler || data.user);
        } else {
          throw new Error(data.message || 'Failed to fetch wholesaler info');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching wholesaler info:', error);
      setWholesaler(wholesalerData || {
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

      if (!wholesalerId) {
        throw new Error('No wholesaler ID provided');
      }

      const token = await getAuthToken();
      const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';
      const headers = { 'Content-Type': 'application/json' };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/wholesalers/${wholesalerId}/products`,
        { headers }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          if (errorText && errorText.length < 100) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const productsData = data.products || data.data || [];
      
      if (data.success && Array.isArray(productsData)) {
        setProducts(productsData);
      } else {
        throw new Error(data.message || 'Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setError(`Failed to load products: ${error.message}`);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWholesalerProducts();
  };

  const loadMockData = () => {
    const mockProducts = [
      {
        _id: '1',
        name: 'Wireless Bluetooth Headphones Premium Quality',
        description: 'High-quality wireless headphones with noise cancellation and long battery life perfect for daily use',
        price: 45000,
        originalPrice: 50000,
        quantity: 25,
        measurementUnit: 'pcs',
        category: 'Electronics',
        minOrderQuantity: 2,
        bulkDiscount: {
          minQuantity: 5,
          discountPercentage: 10
        },
        images: [
          { url: 'https://picsum.photos/300/300?random=1' },
          { url: 'https://picsum.photos/300/300?random=2' }
        ]
      },
      {
        _id: '2',
        name: 'Smartphone Case - Premium Protection',
        description: 'Durable smartphone case with premium protection and stylish design for all models',
        price: 15000,
        quantity: 100,
        measurementUnit: 'pcs',
        category: 'Accessories',
        minOrderQuantity: 5,
        images: [
          { url: 'https://picsum.photos/300/300?random=3' }
        ]
      },
      {
        _id: '3',
        name: 'USB-C Fast Charging Cable 2m',
        description: '2m length fast charging USB-C cable with durable construction and high-speed data transfer',
        price: 8000,
        quantity: 50,
        measurementUnit: 'pcs',
        category: 'Electronics',
        minOrderQuantity: 10,
        bulkDiscount: {
          minQuantity: 20,
          discountPercentage: 15
        },
        images: [
          { url: 'https://picsum.photos/300/300?random=4' }
        ]
      },
      {
        _id: '4',
        name: 'Portable Power Bank 10000mAh',
        description: 'Compact and powerful power bank with fast charging capability for all devices',
        price: 35000,
        quantity: 0,
        measurementUnit: 'pcs',
        category: 'Electronics',
        minOrderQuantity: 3,
        images: [
          { url: 'https://picsum.photos/300/300?random=5' }
        ]
      }
    ];
    setProducts(mockProducts);
    setLoading(false);
    setError(null);
  };

  const handleContactWholesaler = () => {
    Alert.alert(
      'Contact Wholesaler',
      `Contact ${wholesaler?.contactPerson} at ${wholesaler?.email}${wholesaler?.phone ? ` or call ${wholesaler.phone}` : ''}`,
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleAddToCart = (product) => {
    Alert.alert(
      'Add to Cart',
      `Added ${product.name} to cart`,
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handlePlaceOrder = (product) => {
    setSelectedProduct(product);
    setShowOrderForm(true);
  };

  const handleOrderSubmit = (order) => {
    console.log('Order placed successfully:', order);
    Alert.alert('Success', 'Your order has been placed successfully!');
    setShowOrderForm(false);
    setSelectedProduct(null);
  };

  const handleImageNavigate = (productId, imagesLength, direction) => {
    setActiveImageIndex(prev => {
      const current = prev[productId] || 0;
      const newIndex = direction === 'next' 
        ? (current + 1) % imagesLength
        : (current - 1 + imagesLength) % imagesLength;
      
      return {
        ...prev,
        [productId]: newIndex,
      };
    });
  };

  const handleImageDotPress = (productId, index) => {
    setActiveImageIndex(prev => ({
      ...prev,
      [productId]: index,
    }));
  };

  const categories = [...new Set(products.map(product => product.category))].filter(Boolean);

  const filteredProducts = products
    .filter(product =>
      (filterCategory ? product.category === filterCategory : true) &&
      (searchTerm ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'stock':
          return b.quantity - a.quantity;
        case 'category':
          return a.category?.localeCompare(b.category);
        default:
          return 0;
      }
    });

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkModalContainer]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}><Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>Filter by Category</Text></Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              !filterCategory && styles.selectedFilterOption,
              isDarkMode && styles.darkFilterOption
            ]}
            onPress={() => {
              setFilterCategory('');
              setShowFilterModal(false);
            }}
          >
            <FontAwesome5 name="layer-group" size={16} color={!filterCategory ? "#1D4ED8" : (isDarkMode ? "#D1D5DB" : "#374151")} />
            <Text style={[
              styles.filterOptionText,
              !filterCategory && styles.selectedFilterOptionText,
              isDarkMode && styles.darkText
            ]}><Text style={[styles.categoryText, isDarkMode && styles.darkText]}>All Categories</Text></Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterOption,
                filterCategory === category && styles.selectedFilterOption,
                isDarkMode && styles.darkFilterOption
              ]}
              onPress={() => {
                setFilterCategory(category);
                setShowFilterModal(false);
              }}
            >
              <FontAwesome5 name="tag" size={14} color={filterCategory === category ? "#1D4ED8" : (isDarkMode ? "#D1D5DB" : "#374151")} />
              <Text style={[
                styles.filterOptionText,
                filterCategory === category && styles.selectedFilterOptionText,
                isDarkMode && styles.darkText
              ]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSortModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkModalContainer]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}><Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>Sort Products</Text></Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowSortModal(false)}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {[
            { key: 'name', label: 'Name (A-Z)', icon: 'sort-alpha-down' },
            { key: 'price-low', label: 'Price (Low to High)', icon: 'sort-amount-down' },
            { key: 'price-high', label: 'Price (High to Low)', icon: 'sort-amount-up' },
            { key: 'stock', label: 'Stock (High to Low)', icon: 'boxes' },
            { key: 'category', label: 'Category', icon: 'tags' }
          ].map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterOption,
                sortBy === option.key && styles.selectedFilterOption,
                isDarkMode && styles.darkFilterOption
              ]}
              onPress={() => {
                setSortBy(option.key);
                setShowSortModal(false);
              }}
            >
              <FontAwesome5 
                name={option.icon} 
                size={14} 
                color={sortBy === option.key ? "#1D4ED8" : (isDarkMode ? "#D1D5DB" : "#374151")} 
              />
              <Text style={[
                styles.filterOptionText,
                sortBy === option.key && styles.selectedFilterOptionText,
                isDarkMode && styles.darkText
              ]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={22} color="#3B82F6" />
            <Text style={styles.backButtonText}><Text style={styles.backButtonText}>Back</Text></Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, isDarkMode && styles.darkText]} numberOfLines={1}>
              {wholesaler ? `${wholesaler.businessName}'s Products` : 'Products'}
            </Text>
            {wholesaler && (
              <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
                Contact: {wholesaler.contactPerson}
              </Text>
            )}
          </View>
        </View>

        {wholesaler && (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactWholesaler}
          >
            <FontAwesome5 name="headset" size={14} color="#FFFFFF" />
            <Text style={styles.contactButtonText}><Text style={styles.contactButtonText}>Contact</Text></Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Overview */}
      <View style={[styles.statsOverview, isDarkMode && styles.darkStatsOverview]}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="package-variant" size={16} color="#3B82F6" />
          <Text style={[styles.statValue, isDarkMode && styles.darkText]}>{products.length}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>Products</Text></Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="tag-multiple" size={16} color="#10B981" />
          <Text style={[styles.statValue, isDarkMode && styles.darkText]}>{categories.length}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>Categories</Text></Text>
        </View>
        <View style={styles.statItem}>
          <Feather name="shopping-cart" size={16} color="#F59E0B" />
          <Text style={[styles.statValue, isDarkMode && styles.darkText]}>
            {products.filter(p => p.quantity > 0).length}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>In Stock</Text></Text>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
          <View style={styles.errorContent}>
            <MaterialIcons name="error-outline" size={24} color="#DC2626" />
            <View style={styles.errorTextContainer}>
              <Text style={[styles.errorTitle, isDarkMode && styles.darkErrorTitle]}>
                Connection Issue
              </Text>
              <Text style={[styles.errorMessage, isDarkMode && styles.darkErrorMessage]}>
                {error}
              </Text>
            </View>
          </View>
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchWholesalerProducts}
            >
              <Feather name="refresh-cw" size={14} color="#FFFFFF" />
              <Text style={styles.retryButtonText}><Text style={styles.retryButtonText}>Try Again</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.retryButton, styles.mockDataButton]}
              onPress={loadMockData}
            >
              <MaterialIcons name="developer-mode" size={14} color="#FFFFFF" />
              <Text style={styles.retryButtonText}><Text style={styles.retryButtonText}>Use Test Data</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Controls Section */}
      {products.length > 0 && (
        <View style={[styles.controls, isDarkMode && styles.darkControls]}>
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
              <Feather name="search" size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              <TextInput
                style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
                placeholder="Search products..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterButtons}>
              {categories.length > 0 && (
                <TouchableOpacity 
                  style={[styles.filterButton, isDarkMode && styles.darkFilterButton]}
                  onPress={() => setShowFilterModal(true)}
                >
                  <Feather name="filter" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  {filterCategory && <View style={styles.filterActiveDot} />}
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.filterButton, isDarkMode && styles.darkFilterButton]}
                onPress={() => setShowSortModal(true)}
              >
                <Feather name="arrow-up-down" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.resultsRow}>
            <Text style={[styles.resultsCount, isDarkMode && styles.darkSubtitle]}>
              {filteredProducts.length} of {products.length} products
              {sortBy !== 'name' && ` • Sorted by ${sortBy.replace('-', ' ')}`}
            </Text>
            {(filterCategory || searchTerm) && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {setFilterCategory(''); setSearchTerm('');}}
              >
                <Feather name="x" size={14} color="#6B7280" />
                <Text style={styles.clearFiltersText}><Text style={styles.clearFiltersText}>Clear</Text></Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const renderProductItem = ({ item, index }) => (
    <ProductCard
      product={item}
      isMobile={isMobile}
      isDarkMode={isDarkMode}
      onAddToCart={handleAddToCart}
      onPlaceOrder={handlePlaceOrder}
      activeImageIndex={activeImageIndex}
      onImageNavigate={handleImageNavigate}
      onImageDotPress={handleImageDotPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {products.length === 0 && !loading ? (
        <>
          <MaterialCommunityIcons name="package-variant" size={80} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
            No products available
          </Text>
          <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtitle]}>
            {error ? 'Failed to load products from server' : 'This wholesaler has no products yet'}
          </Text>
          {error && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={loadMockData}
            >
              <MaterialIcons name="developer-mode" size={16} color="#FFFFFF" />
              <Text style={styles.clearButtonText}><Text style={styles.clearButtonText}>Use Test Data</Text></Text>
            </TouchableOpacity>
          )}
        </>
      ) : filteredProducts.length === 0 && products.length > 0 ? (
        <>
          <Feather name="search" size={80} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
            No matching products
          </Text>
          <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtitle]}>
            No products match your current filters.
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {setFilterCategory(''); setSearchTerm('');}}
          >
            <Feather name="x" size={16} color="#FFFFFF" />
            <Text style={styles.clearButtonText}><Text style={styles.clearButtonText}>Clear Filters</Text></Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={onBack}
              >
                <Ionicons name="arrow-back" size={22} color="#3B82F6" />
                <Text style={styles.backButtonText}><Text style={styles.backButtonText}>Back</Text></Text>
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>
                  Loading Products...
                </Text>
                <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
                  Fetching data from server...
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading wholesaler products...
          </Text>
          <TouchableOpacity 
            style={styles.mockDataButton}
            onPress={loadMockData}
          >
            <MaterialIcons name="developer-mode" size={16} color="#FFFFFF" />
            <Text style={styles.mockDataButtonText}><Text style={styles.mockDataButtonText}>Use Test Data Instead</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor={isDarkMode ? '#FFFFFF' : '#3B82F6'}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={1}
        key={'mobile'}
        removeClippedSubviews={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={10}
        style={styles.flatList}
      />
      
      {/* Filter Modal */}
      {renderFilterModal()}
      
      {/* Sort Modal */}
      {renderSortModal()}
      
      {/* Order Form Modal */}
      <OrderForm
        visible={showOrderForm}
        product={selectedProduct}
        onClose={() => {
          setShowOrderForm(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleOrderSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  darkStatsOverview: {
    backgroundColor: '#374151',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  darkErrorBanner: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  darkErrorTitle: {
    color: '#FCA5A5',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 18,
  },
  darkErrorMessage: {
    color: '#FCA5A5',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  mockDataButton: {
    backgroundColor: '#6B7280',
  },
  mockDataButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  controls: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  darkControls: {
    backgroundColor: '#374151',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  darkSearchContainer: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#374151',
    padding: 0,
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  darkFilterButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkProductCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkPlaceholderImage: {
    backgroundColor: '#374151',
  },
  navButton: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonRight: {
    left: 'auto',
    right: 8,
  },
  imageDots: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 6,
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeImageDot: {
    backgroundColor: '#FFFFFF',
  },
  inactiveImageDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lowStockBadge: {
    backgroundColor: '#F59E0B',
  },
  outOfStockBadge: {
    backgroundColor: '#DC2626',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    lineHeight: 22,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  productDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  highStock: {
    color: '#059669',
  },
  mediumStock: {
    color: '#D97706',
  },
  lowStock: {
    color: '#DC2626',
  },
  stockIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  highStockIndicator: {
    backgroundColor: '#10B981',
  },
  mediumStockIndicator: {
    backgroundColor: '#F59E0B',
  },
  lowStockIndicator: {
    backgroundColor: '#DC2626',
  },
  minOrderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  productActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  cartButton: {
    backgroundColor: '#3B82F6',
  },
  orderButton: {
    backgroundColor: '#059669',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickAction: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4B5563',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkModalContainer: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  darkFilterOption: {
    borderBottomColor: '#374151',
  },
  selectedFilterOption: {
    backgroundColor: '#EFF6FF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedFilterOptionText: {
    color: '#1D4ED8',
    fontWeight: '500',
  },
});

export default WholesalerProducts;