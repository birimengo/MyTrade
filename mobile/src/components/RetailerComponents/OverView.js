// src/components/RetailerComponents/OverviewOrderForm.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FontAwesome5, 
  MaterialCommunityIcons, 
  Ionicons,
  Feather,
  FontAwesome,
  MaterialIcons,
  Entypo
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// Use your live backend URL directly
const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

// Order Form Component
const OrderForm = ({ visible, product, onClose, onSubmit }) => {
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity: '',
    deliveryPlace: '',
    deliveryCoordinates: {
      lat: '',
      lng: ''
    },
    orderNotes: '',
    paymentMethod: 'cash_on_delivery'
  });

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        quantity: product.minOrderQuantity?.toString() || '1',
        deliveryPlace: '',
        deliveryCoordinates: {
          lat: '',
          lng: ''
        },
        orderNotes: '',
        paymentMethod: 'cash_on_delivery'
      });
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.quantity || parseInt(formData.quantity) < 1) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return false;
    }

    if (parseInt(formData.quantity) < (product.minOrderQuantity || 1)) {
      Alert.alert('Error', `Minimum order quantity is ${product.minOrderQuantity || 1}`);
      return false;
    }

    if (parseInt(formData.quantity) > product.quantity) {
      Alert.alert('Error', `Only ${product.quantity} units available in stock`);
      return false;
    }

    if (!formData.deliveryPlace.trim()) {
      Alert.alert('Error', 'Please enter delivery place');
      return false;
    }

    if (!formData.deliveryCoordinates.lat || !formData.deliveryCoordinates.lng) {
      Alert.alert('Error', 'Please enter delivery coordinates');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const orderData = {
        product: product._id,
        quantity: parseInt(formData.quantity),
        deliveryPlace: formData.deliveryPlace.trim(),
        deliveryCoordinates: {
          lat: parseFloat(formData.deliveryCoordinates.lat),
          lng: parseFloat(formData.deliveryCoordinates.lng)
        },
        orderNotes: formData.orderNotes.trim(),
        paymentMethod: formData.paymentMethod
      };

      console.log('Submitting order:', orderData);

      const response = await fetch(`${API_BASE_URL}/api/retailer-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your order has been placed successfully!',
          [{ text: 'OK', onPress: onClose }]
        );
        onSubmit?.(result.order);
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const unitPrice = product?.price || 0;
    return quantity * unitPrice;
  };

  const getCurrentLocation = () => {
    // Mock location for demo - in real app, use Geolocation API
    Alert.alert(
      'Use Current Location',
      'Would you like to use your current location for delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Use Location', 
          onPress: () => {
            // Mock Kampala coordinates
            setFormData(prev => ({
              ...prev,
              deliveryCoordinates: {
                lat: '0.3476',
                lng: '32.5825'
              }
            }));
            Alert.alert('Success', 'Location set to Kampala coordinates');
          }
        }
      ]
    );
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, isDarkMode && styles.darkContainer]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Place Order
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Product Summary */}
          <View style={[styles.productCard, isDarkMode && styles.darkProductCard]}>
            <Text style={[styles.productName, isDarkMode && styles.darkText]}>
              {product.name}
            </Text>
            <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]}>
              {product.description}
            </Text>
            <View style={styles.productDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Price:</Text></Text>
                <Text style={styles.priceText}>
                  UGX {product.price?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Available Stock:</Text></Text>
                <Text style={[
                  styles.stockText,
                  product.quantity > 10 ? styles.highStock :
                  product.quantity > 0 ? styles.mediumStock :
                  styles.lowStock
                ]}>
                  {product.quantity} {product.measurementUnit}
                </Text>
              </View>
              {product.minOrderQuantity > 1 && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Min Order:</Text></Text>
                  <Text style={[styles.detailValue, isDarkMode && styles.darkSubtitle]}>
                    {product.minOrderQuantity} {product.measurementUnit}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Order Form */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Order Details
            </Text>

            {/* Quantity */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Quantity *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder={`Enter quantity (min: ${product.minOrderQuantity || 1})`}
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={formData.quantity}
                onChangeText={(value) => handleInputChange('quantity', value.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
              {formData.quantity && (
                <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                  Total: UGX {calculateTotal().toLocaleString()}
                </Text>
              )}
            </View>

            {/* Delivery Place */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Delivery Place *
              </Text>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder="Enter delivery address or location"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={formData.deliveryPlace}
                onChangeText={(value) => handleInputChange('deliveryPlace', value)}
                multiline
              />
            </View>

            {/* Delivery Coordinates */}
            <View style={styles.inputGroup}>
              <View style={styles.coordinatesHeader}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>
                  Delivery Coordinates *
                </Text>
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                >
                  <Feather name="map-pin" size={14} color="#3B82F6" />
                  <Text style={styles.locationButtonText}><Text style={styles.locationButtonText}>Use Current</Text></Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.coordinatesRow}>
                <View style={styles.coordinateInput}>
                  <Text style={[styles.coordinateLabel, isDarkMode && styles.darkSubtitle]}>
                    Latitude
                  </Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    placeholder="0.0000"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={formData.deliveryCoordinates.lat}
                    onChangeText={(value) => handleInputChange('deliveryCoordinates.lat', value)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.coordinateInput}>
                  <Text style={[styles.coordinateLabel, isDarkMode && styles.darkSubtitle]}>
                    Longitude
                  </Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    placeholder="0.0000"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    value={formData.deliveryCoordinates.lng}
                    onChangeText={(value) => handleInputChange('deliveryCoordinates.lng', value)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                Example: 0.3476, 32.5825 (Kampala)
              </Text>
            </View>

            {/* Order Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Order Notes (Optional)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                placeholder="Any special instructions for delivery..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={formData.orderNotes}
                onChangeText={(value) => handleInputChange('orderNotes', value)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Payment Method */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>
                Payment Method
              </Text>
              <View style={styles.paymentOptions}>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    formData.paymentMethod === 'cash_on_delivery' && styles.selectedPaymentOption,
                    isDarkMode && styles.darkPaymentOption
                  ]}
                  onPress={() => handleInputChange('paymentMethod', 'cash_on_delivery')}
                >
                  <MaterialCommunityIcons 
                    name="cash" 
                    size={20} 
                    color={formData.paymentMethod === 'cash_on_delivery' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    formData.paymentMethod === 'cash_on_delivery' && styles.selectedPaymentText,
                    isDarkMode && styles.darkText
                  ]}>
                    Cash on Delivery
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    formData.paymentMethod === 'mobile_money' && styles.selectedPaymentOption,
                    isDarkMode && styles.darkPaymentOption
                  ]}
                  onPress={() => handleInputChange('paymentMethod', 'mobile_money')}
                >
                  <FontAwesome5 
                    name="mobile-alt" 
                    size={18} 
                    color={formData.paymentMethod === 'mobile_money' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    formData.paymentMethod === 'mobile_money' && styles.selectedPaymentText,
                    isDarkMode && styles.darkText
                  ]}>
                    Mobile Money
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Summary */}
            <View style={[styles.summaryCard, isDarkMode && styles.darkSummaryCard]}>
              <Text style={[styles.summaryTitle, isDarkMode && styles.darkText]}>
                Order Summary
              </Text>
              
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                  Unit Price:
                </Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                  UGX {product.price?.toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                  Quantity:
                </Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                  {formData.quantity || '0'} {product.measurementUnit}
                </Text>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>
                  Total Amount:
                </Text>
                <Text style={styles.totalValue}>
                  UGX {calculateTotal().toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, isDarkMode && styles.darkFooter]}>
          <TouchableOpacity
            style={[styles.cancelButton, isDarkMode && styles.darkCancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, isDarkMode && styles.darkCancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!formData.quantity || !formData.deliveryPlace || !formData.deliveryCoordinates.lat || !formData.deliveryCoordinates.lng) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={loading || !formData.quantity || !formData.deliveryPlace || !formData.deliveryCoordinates.lat || !formData.deliveryCoordinates.lng}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome5 name="shopping-bag" size={16} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  Place Order
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Main Overview Component
const OverviewOrderForm = ({ navigation }) => {
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalSalesCount: 0,
    totalSalesValue: 0,
    todaySalesCount: 0,
    todaySalesValue: 0,
    todayProfit: 0,
    totalProfit: 0,
    retailerStockValue: 0,
    systemStockValue: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    totalReceipts: 0,
    totalReceiptsValue: 0,
    totalStockItems: 0,
    originalStockValue: 0,
    stockUtilization: 0
  });
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    console.log('User product category:', user?.productCategory);
    console.log('User token available:', !!token);
    fetchMetrics();
    fetchTrendingProducts();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get today's date range
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // 1. Fetch ALL sales records to calculate profits and sales data
      const allSalesResponse = await fetch(
        `${API_BASE_URL}/api/retailer-sales?limit=1000`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!allSalesResponse.ok) {
        throw new Error(`Sales data failed: ${allSalesResponse.status}`);
      }

      const salesData = await allSalesResponse.json();

      if (!salesData.success || !salesData.sales) {
        throw new Error('Invalid sales data format');
      }

      // Calculate profits and sales data manually
      let todayProfit = 0;
      let totalProfit = 0;
      let todaySalesCount = 0;
      let totalSalesCount = salesData.total || salesData.sales.length;
      let todaySalesValue = 0;
      let totalSalesValue = 0;

      salesData.sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate);
        const isToday = saleDate >= startOfToday && saleDate < endOfToday;
        
        // Calculate sales value (quantity * sellingPrice)
        const saleValue = (sale.quantity || 0) * (sale.sellingPrice || 0);
        
        // Sum up profits
        const profit = sale.profit || 0;
        
        if (isToday) {
          todayProfit += profit;
          todaySalesCount += 1;
          todaySalesValue += saleValue;
        }
        
        totalProfit += profit;
        totalSalesValue += saleValue;
      });

      // 2. Fetch ALL Retailer Stocks and calculate total value manually
      let retailerStockValue = 0;
      let retailerLowStockCount = 0;
      let retailerTotalItems = 0;

      try {
        const retailerStocksResponse = await fetch(
          `${API_BASE_URL}/api/retailer-stocks?limit=1000`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (retailerStocksResponse.ok) {
          const retailerStocksData = await retailerStocksResponse.json();
          if (retailerStocksData.success && retailerStocksData.stocks) {
            retailerStockValue = retailerStocksData.stocks.reduce((total, stock) => {
              return total + (stock.totalValue || 0);
            }, 0);
            
            retailerLowStockCount = retailerStocksData.stocks.filter(stock => stock.lowStockAlert === true).length;
            retailerTotalItems = retailerStocksData.total || retailerStocksData.stocks.length;
          }
        }
      } catch (retailerError) {
        console.log('Retailer stocks fetch failed:', retailerError.message);
      }

      // 3. Fetch ALL System Stocks and calculate total value manually
      let systemStockValue = 0;
      let systemLowStockCount = 0;
      let systemTotalItems = 0;

      try {
        const systemStocksResponse = await fetch(
          `${API_BASE_URL}/api/system-stocks?limit=1000`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (systemStocksResponse.ok) {
          const systemStocksData = await systemStocksResponse.json();
          if (systemStocksData.success && systemStocksData.stocks) {
            systemStockValue = systemStocksData.stocks.reduce((total, stock) => {
              return total + (stock.totalValue || 0);
            }, 0);
            
            systemLowStockCount = systemStocksData.stocks.filter(stock => {
              return stock.quantity <= (stock.minStockLevel || 0);
            }).length;
            
            systemTotalItems = systemStocksData.total || systemStocksData.stocks.length;
          }
        }
      } catch (systemError) {
        console.log('System stocks fetch failed:', systemError.message);
      }

      // 4. Calculate combined stock metrics
      const totalStockValue = retailerStockValue + systemStockValue;
      const totalLowStockItems = retailerLowStockCount + systemLowStockCount;
      const totalStockItems = retailerTotalItems + systemTotalItems;

      // 5. Calculate stock utilization
      const stockUtilization = totalSalesValue > 0 
        ? Math.min(100, Math.round((totalSalesValue / (totalSalesValue + totalStockValue)) * 100))
        : 0;

      // Get total orders count
      let totalOrders = totalSalesCount;

      // Update metrics with all calculated data
      setMetrics({
        todayProfit: todayProfit,
        totalProfit: totalProfit,
        todaySalesCount: todaySalesCount,
        totalSalesCount: totalSalesCount,
        todaySalesValue: todaySalesValue,
        totalSalesValue: totalSalesValue,
        totalOrders: totalOrders,
        retailerStockValue: retailerStockValue,
        systemStockValue: systemStockValue,
        totalStockValue: totalStockValue,
        lowStockItems: totalLowStockItems,
        totalStockItems: totalStockItems,
        originalStockValue: totalStockValue,
        stockUtilization: stockUtilization,
        totalReceipts: 0,
        totalReceiptsValue: 0
      });

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(`Backend connection failed: ${err.message}. Using placeholder data.`);
      
      setMetrics({
        totalOrders: 0,
        totalSalesCount: 0,
        totalSalesValue: 0,
        todaySalesCount: 0,
        todaySalesValue: 0,
        todayProfit: 0,
        totalProfit: 0,
        retailerStockValue: 0,
        systemStockValue: 0,
        totalStockValue: 0,
        lowStockItems: 0,
        totalReceipts: 0,
        totalReceiptsValue: 0,
        totalStockItems: 0,
        originalStockValue: 0,
        stockUtilization: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to normalize category names
  const normalizeCategory = (category) => {
    if (!category) return '';
    
    const normalized = category.toLowerCase().trim();
    
    // Handle common category variations
    const categoryMap = {
      'electronics': 'electronic',
      'electronic': 'electronic',
      'electrical': 'electronic',
      'elect': 'electronic',
    };
    
    return categoryMap[normalized] || normalized;
  };

  const fetchTrendingProducts = async () => {
    try {
      setProductsLoading(true);
      
      if (!token) {
        console.log('No token found');
        setTrendingProducts([]);
        return;
      }

      const userCategory = user?.productCategory;
      console.log('Fetching products for user category:', userCategory);
      
      // Normalize the user's category for matching
      const normalizedUserCategory = normalizeCategory(userCategory);
      console.log('Normalized user category:', normalizedUserCategory);

      // First, fetch all available products without category filter
      const productsResponse = await fetch(
        `${API_BASE_URL}/api/products/retailer/all?limit=50`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Products response status:', productsResponse.status);

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        console.log('All products fetched:', productsData.products?.length || 0);
        
        if (productsData.success && productsData.products) {
          // Get all unique categories from the products
          const allCategories = [...new Set(productsData.products.map(p => p.category).filter(Boolean))];
          console.log('Available categories in database:', allCategories);
          
          // Enhanced category matching logic
          const filteredProducts = productsData.products.filter(product => {
            const productCategory = product.category?.toLowerCase().trim();
            const normalizedProductCategory = normalizeCategory(product.category);
            
            console.log(`Comparing: "${normalizedUserCategory}" vs "${normalizedProductCategory}" (original: "${productCategory}")`);
            
            // Multiple matching strategies
            const matches = 
              // Exact match after normalization
              normalizedProductCategory === normalizedUserCategory ||
              // Partial match
              (normalizedProductCategory && normalizedUserCategory && 
               (normalizedProductCategory.includes(normalizedUserCategory) || 
                normalizedUserCategory.includes(normalizedProductCategory))) ||
              // Handle singular/plural variations
              (normalizedUserCategory === 'electronic' && normalizedProductCategory === 'electronics') ||
              (normalizedUserCategory === 'electronics' && normalizedProductCategory === 'electronic');
            
            return matches;
          });
          
          console.log('Filtered products count:', filteredProducts.length);
          
          // If no products found with category matching, show some products anyway
          let productsToShow = filteredProducts;
          if (filteredProducts.length === 0 && productsData.products.length > 0) {
            console.log('No category matches found, showing first 6 products');
            productsToShow = productsData.products.slice(0, 6);
          }
          
          setTrendingProducts(productsToShow);
        } else {
          console.log('No products in response or success false');
          setTrendingProducts([]);
        }
      } else {
        const errorText = await productsResponse.text();
        console.log('Failed to fetch products:', productsResponse.status, errorText);
        setTrendingProducts([]);
      }
    } catch (err) {
      console.error('Error fetching trending products:', err);
      setTrendingProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
    fetchTrendingProducts();
  };

  // Order Now functionality
  const handleOrderNow = (product) => {
    console.log('🔄 Order Now clicked for product:', product.name);
    setSelectedProduct(product);
    setShowOrderForm(true);
  };

  const handleOrderSubmit = (order) => {
    console.log('Order placed successfully:', order);
    setShowOrderForm(false);
    setSelectedProduct(null);
    
    // Optional: Show success message
    Alert.alert('Success', 'Your order has been placed successfully!');
  };

  const MetricCard = ({ title, value, iconName, iconType = 'FontAwesome5', color, subtitle, trend, isPercentage = false }) => {
    const cardSize = isMobile ? styles.mobileCard : styles.desktopCard;

    const renderIcon = () => {
      const iconProps = { size: isMobile ? 20 : 24, color };
      
      switch (iconType) {
        case 'MaterialCommunityIcons':
          return <MaterialCommunityIcons name={iconName} {...iconProps} />;
        case 'Ionicons':
          return <Ionicons name={iconName} {...iconProps} />;
        case 'Feather':
          return <Feather name={iconName} {...iconProps} />;
        case 'FontAwesome':
          return <FontAwesome name={iconName} {...iconProps} />;
        case 'FontAwesome5':
        default:
          return <FontAwesome5 name={iconName} {...iconProps} />;
      }
    };

    const formatValue = (val) => {
      if (isPercentage) return `${val}%`;
      
      if (typeof val === 'number') {
        if (title.includes('Sales') || title.includes('Profit') || title.includes('Value') || title.includes('Receipts Value') || title.includes('Stock')) {
          return `UGX ${val.toLocaleString()}`;
        }
        return val.toLocaleString();
      }
      
      return val;
    };

    return (
      <View style={[
        styles.metricCard,
        cardSize,
        isDarkMode && styles.darkMetricCard,
        { borderLeftColor: color }
      ]}>
        <View style={styles.metricContent}>
          <View style={styles.metricTextContainer}>
            <Text style={[styles.metricTitle, isDarkMode && styles.darkText]}>
              {title}
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color={color} style={styles.loadingIndicator} />
            ) : (
              <>
                <Text style={[styles.metricValue, isDarkMode && styles.darkText]}>
                  {formatValue(value)}
                </Text>
                {subtitle && (
                  <Text style={[styles.metricSubtitle, isDarkMode && styles.darkSubtitle]}>
                    {subtitle}
                  </Text>
                )}
                {trend && (
                  <Text style={[
                    styles.metricTrend,
                    trend.includes('+') || trend === 'Active' || trend === 'Good' || trend === 'All good' ? styles.positiveTrend : 
                    trend.includes('Attention') || trend.includes('Low') || trend === 'No profit' ? styles.negativeTrend : 
                    styles.neutralTrend
                  ]}>
                    {trend}
                  </Text>
                )}
              </>
            )}
          </View>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            {renderIcon()}
          </View>
        </View>
      </View>
    );
  };

 // In the ProductCard component, update the product image section:

const ProductCard = ({ product }) => {
  const mainImage = product.images && product.images.length > 0 ? product.images[0].url : null;
  const wholesalerName = product.wholesaler?.businessName || 
                        `${product.wholesaler?.firstName || ''} ${product.wholesaler?.lastName || ''}`.trim() || 
                        'Unknown Wholesaler';
  
  const isLowStock = product.quantity <= 10;
  
  // Add state for current image index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.images || [];
  
  // Navigation functions
  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };
  
  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
    }
  };
  
  const currentImage = images[currentImageIndex]?.url || mainImage;
  
  return (
    <View style={[styles.productCard, isDarkMode && styles.darkProductCard]}>
      {/* Product Image with Navigation Arrows */}
      <View style={styles.productImageContainer}>
        {currentImage ? (
          <Image 
            source={{ uri: currentImage }} 
            style={styles.productImage}
            resizeMode="cover"
            onError={() => console.log('Image failed to load:', currentImage)}
          />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Feather name="image" size={32} color="#9CA3AF" />
          </View>
        )}
        
        {/* Navigation Arrows - Only show if multiple images */}
        {images.length > 1 && (
          <>
            <TouchableOpacity 
              style={[styles.arrowButton, styles.leftArrow]}
              onPress={prevImage}
            >
              <Feather name="chevron-left" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.arrowButton, styles.rightArrow]}
              onPress={nextImage}
            >
              <Feather name="chevron-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Image Indicator Dots */}
            <View style={styles.imageIndicator}>
              {images.map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.indicatorDot,
                    index === currentImageIndex ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>
          </>
        )}
        
        {/* Stock Badge */}
        <View style={[
          styles.stockBadge,
          isLowStock ? styles.lowStock : styles.inStock
        ]}>
          <Text style={styles.stockText}>
            {isLowStock ? 'Low Stock' : 'In Stock'}
          </Text>
        </View>
      </View>

      {/* Rest of the ProductCard component remains exactly the same */}
      <View style={styles.productDetails}>
        <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={2}>
          {product.name}
        </Text>
        
        <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
          {product.description || 'No description available'}
        </Text>
        
        <Text style={[styles.wholesalerName, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
          By {wholesalerName}
        </Text>
        
        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, isDarkMode && styles.darkText]}>
            UGX {product.price?.toLocaleString() || '0'}
          </Text>
          
          <View style={styles.productMeta}>
            <View style={styles.metaItem}>
              <Feather name="package" size={12} color="#6B7280" />
              <Text style={[styles.metaText, isDarkMode && styles.darkSubtitle]}>
                {product.quantity || 0}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Feather name="tag" size={12} color="#6B7280" />
              <Text style={[styles.metaText, isDarkMode && styles.darkSubtitle]}>
                {product.category || 'Uncategorized'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Action Button */}
        <TouchableOpacity 
          style={styles.orderButton}
          onPress={() => handleOrderNow(product)}
        >
          <Text style={styles.orderButtonText}><Text style={styles.orderButtonText}>Order Now</Text></Text>
          <Feather name="shopping-cart" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};


  const ErrorBanner = () => (
    <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
      <View style={styles.errorContent}>
        <View style={styles.errorTextContainer}>
          <Text style={[styles.errorTitle, isDarkMode && styles.darkErrorTitle]}>
            Connection Issue
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkErrorMessage]}>
            {error}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={onRefresh}
          style={styles.retryButton}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}><Text style={styles.retryButtonText}>Retry</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getGridStyle = () => {
    return isMobile ? styles.mobileGrid : styles.desktopGrid;
  };

  // Calculate trends based on real data
  const getProfitTrend = () => {
    if (metrics.todayProfit === 0) return "No sales today";
    return metrics.todayProfit > 0 ? "Active" : "No profit";
  };

  const getStockTrend = (utilization) => {
    if (utilization === 0) return "No data";
    return utilization >= 70 ? "Excellent" : utilization >= 50 ? "Good" : "Low";
  };

  const getLowStockTrend = (lowStockCount) => {
    if (lowStockCount === 0) return "All good";
    return lowStockCount > 5 ? "Critical" : lowStockCount > 0 ? "Attention needed" : "Good";
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor={isDarkMode ? '#2563eb' : '#2563eb'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && !loading && <ErrorBanner />}

        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <Text style={[styles.welcomeText, isDarkMode && styles.darkText]}>
            Welcome, {user?.firstName || 'Retailer'}!
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            {user?.productCategory ? `${user.productCategory} Dashboard` : 'Retailer Dashboard Overview'}
          </Text>
        </View>

        {/* Profit Overview - REAL DATA */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Today's Profit"
            value={metrics.todayProfit}
            iconName="money-bill-wave"
            color="#16a34a"
            subtitle="Profit from today's sales"
            trend={getProfitTrend()}
          />
          
          <MetricCard
            title="Total Profit"
            value={metrics.totalProfit}
            iconName="trending-up"
            iconType="Feather"
            color="#9333ea"
            subtitle="All time profit"
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Today's Sales"
                value={metrics.todaySalesValue}
                iconName="dollar-sign"
                iconType="Feather"
                color="#2563eb"
                subtitle="Revenue today"
              />
              
              <MetricCard
                title="Total Sales"
                value={metrics.totalSalesValue}
                iconName="bar-chart"
                iconType="Feather"
                color="#4f46e5"
                subtitle="All time revenue"
              />
            </>
          )}
        </View>

        {/* Sales & Orders - REAL DATA */}
        <View style={getGridStyle()}>
          <MetricCard
            title={isMobile ? "Today's Sales" : "Today's Transactions"}
            value={metrics.todaySalesCount}
            iconName="calendar-day"
            iconType="FontAwesome5"
            color="#ea580c"
            subtitle={isMobile ? "Sales today" : "Sales today"}
          />
          
          <MetricCard
            title={isMobile ? "Total Sales" : "Total Transactions"}
            value={metrics.totalSalesCount}
            iconName="shopping-cart"
            color="#0d9488"
            subtitle={isMobile ? "All sales" : "All time sales"}
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Total Orders"
                value={metrics.totalOrders}
                iconName="clipboard-list"
                iconType="FontAwesome5"
                color="#db2777"
                subtitle="Orders placed"
              />
              
              <MetricCard
                title="Stock Utilization"
                value={metrics.stockUtilization}
                iconName="pie-chart"
                iconType="Feather"
                color="#9333ea"
                subtitle="Sales performance"
                isPercentage={true}
                trend={getStockTrend(metrics.stockUtilization)}
              />
            </>
          )}
        </View>

        {/* Stock Value Breakdown - REAL DATA */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Retailer Stock"
            value={metrics.retailerStockValue}
            iconName="store"
            color="#ea580c"
            subtitle="Your managed stock value"
          />
          
          <MetricCard
            title="System Stock"
            value={metrics.systemStockValue}
            iconName="database"
            iconType="Feather"
            color="#0d9488"
            subtitle="System managed stock value"
          />
          
          {!isMobile && (
            <>
              <MetricCard
                title="Total Stock Value"
                value={metrics.totalStockValue}
                iconName="boxes"
                iconType="FontAwesome5"
                color="#2563eb"
                subtitle="Combined inventory value"
              />
              
              <MetricCard
                title="Product Types"
                value={metrics.totalStockItems}
                iconName="layers"
                iconType="Feather"
                color="#4f46e5"
                subtitle="Different products"
              />
            </>
          )}
        </View>

        {/* Stock Details - REAL DATA */}
        <View style={getGridStyle()}>
          <MetricCard
            title="Low Stock Items"
            value={metrics.lowStockItems}
            iconName="exclamation-triangle"
            color="#dc2626"
            subtitle="Need restocking"
            trend={getLowStockTrend(metrics.lowStockItems)}
          />
          
          {isMobile ? (
            <MetricCard
              title="Stock Value"
              value={metrics.totalStockValue}
              iconName="dollar-sign"
              iconType="Feather"
              color="#16a34a"
              subtitle="Total inventory"
            />
          ) : (
            <>
              <MetricCard
                title="Today's Revenue"
                value={metrics.todaySalesValue}
                iconName="dollar-sign"
                iconType="Feather"
                color="#16a34a"
                subtitle="Sales today"
              />
              
              <MetricCard
                title="Total Revenue"
                value={metrics.totalSalesValue}
                iconName="bar-chart"
                iconType="Feather"
                color="#9333ea"
                subtitle="All sales"
              />
            </>
          )}
        </View>

        {/* Additional metrics for mobile */}
        {isMobile && (
          <>
            <View style={styles.mobileGrid}>
              <MetricCard
                title="Stock Utilization"
                value={metrics.stockUtilization}
                iconName="pie-chart"
                iconType="Feather"
                color="#9333ea"
                subtitle="Sales performance"
                isPercentage={true}
                trend={getStockTrend(metrics.stockUtilization)}
              />
              
              <MetricCard
                title="Product Types"
                value={metrics.totalStockItems}
                iconName="layers"
                iconType="Feather"
                color="#4f46e5"
                subtitle="Different products"
              />
            </View>
          </>
        )}

        {/* Trending Products Section */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Available Products
            </Text>
            <Text style={[styles.sectionSubtitle, isDarkMode && styles.darkSubtitle]}>
              {user?.productCategory ? `Products in ${user.productCategory}` : 'Browse available products'}
            </Text>
          </View>

          {productsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
                Loading products...
              </Text>
            </View>
          ) : trendingProducts.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.productsScrollView}
              contentContainerStyle={styles.productsContainer}
            >
              {trendingProducts.map((product, index) => (
                <ProductCard key={product._id || `product-${index}`} product={product} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noProducts}>
              <Feather name="package" size={48} color="#9CA3AF" />
              <Text style={[styles.noProductsText, isDarkMode && styles.darkSubtitle]}>
                No products available
              </Text>
              <Text style={[styles.noProductsHelp, isDarkMode && styles.darkSubtitle]}>
                Check your connection or try refreshing
              </Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Feather name="refresh-cw" size={16} color="#2563eb" />
                <Text style={styles.refreshButtonText}><Text style={styles.refreshButtonText}>Refresh Products</Text></Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

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

// Combined Styles
const styles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },

  // Header Styles
  welcomeHeader: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },

  // Grid Styles
  mobileGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },

  // Metric Card Styles
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkMetricCard: {
    backgroundColor: '#1F2937',
  },
  mobileCard: {
    flex: 1,
    minHeight: 100,
  },
  desktopCard: {
    width: '48%',
    minHeight: 120,
    marginBottom: 12,
  },
  metricContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 10,
    fontWeight: '500',
  },
  positiveTrend: {
    color: '#16a34a',
  },
  negativeTrend: {
    color: '#dc2626',
  },
  neutralTrend: {
    color: '#6B7280',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  loadingIndicator: {
    marginVertical: 8,
  },

  // Error Banner Styles
  errorBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  darkErrorBanner: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
  },
  errorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  errorTitle: {
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    fontSize: 14,
  },
  darkErrorTitle: {
    color: '#FEF3C7',
  },
  errorMessage: {
    color: '#92400E',
    fontSize: 12,
  },
  darkErrorMessage: {
    color: '#FEF3C7',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Trending Products Section
  trendingSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  productsScrollView: {
    marginHorizontal: -16,
  },
  productsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  noProducts: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noProductsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  noProductsHelp: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },

  // Product Card Styles
  productCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkProductCard: {
    backgroundColor: '#1F2937',
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inStock: {
    backgroundColor: '#DCFCE7',
  },
  lowStock: {
    backgroundColor: '#FEF3C7',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 16,
  },
  wholesalerName: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  productMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: '#6B7280',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Order Form Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkHeader: {
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  darkProductCard: {
    backgroundColor: '#374151',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  productDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
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
  formSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#6B7280',
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  coordinatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  locationButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentOptions: {
    gap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  darkPaymentOption: {
    backgroundColor: '#374151',
  },
  selectedPaymentOption: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedPaymentText: {
    color: '#3B82F6',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  darkSummaryCard: {
    backgroundColor: '#374151',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  darkFooter: {
    borderTopColor: '#374151',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  darkCancelButtonText: {
    color: '#D1D5DB',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },


  // New styles for image navigation
  arrowButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },


});

export default OverviewOrderForm;