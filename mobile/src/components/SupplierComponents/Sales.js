// src/components/SupplierComponents/Sales.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList
} from 'react-native';
import { useDarkMode } from '../../context/DarkModeContext';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const SalesTab = ({ apiCall }) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingSale, setProcessingSale] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Simplified form state - customer details are optional
  const [formData, setFormData] = useState({
    customerDetails: {
      name: '',
      email: '',
      phone: '',
      address: ''
    },
    saleDate: new Date(),
    notes: '',
    paymentMethod: 'cash',
    discountAmount: 0,
    discountPercentage: 0,
    taxAmount: 0,
    shippingDetails: {
      shippingCost: 0
    }
  });

  // Calculations state
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    shippingCost: 0,
    grandTotal: 0,
    totalProfit: 0
  });

  // Load products from database
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/supplier-products?limit=1000');
      
      if (response && response.success) {
        setProducts(response.products || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Update calculations when cart or form data changes
  useEffect(() => {
    calculateTotals();
  }, [cart, formData.discountAmount, formData.discountPercentage, formData.taxAmount, formData.shippingDetails.shippingCost]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
    
    let totalDiscount = 0;
    if (formData.discountPercentage > 0) {
      totalDiscount = (subtotal * formData.discountPercentage) / 100;
    } else {
      totalDiscount = formData.discountAmount;
    }

    const totalTax = formData.taxAmount;
    const shippingCost = formData.shippingDetails.shippingCost || 0;
    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax + shippingCost);
    
    const totalProfit = cart.reduce((total, item) => {
      const profitPerUnit = (item.unitPrice || 0) - (item.productionPrice || 0);
      return total + (profitPerUnit * item.quantity);
    }, 0);

    setCalculations({
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost,
      grandTotal,
      totalProfit
    });
  };

  const addToCart = (product) => {
    // Check if product is in stock
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }

    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
      // Check if we're exceeding available stock
      if (existingItem.quantity + 1 > product.quantity) {
        Alert.alert('Insufficient Stock', `Only ${product.quantity} units of ${product.name} are available.`);
        return;
      }
      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        quantity: 1,
        unitPrice: product.sellingPrice,
        productionPrice: product.productionPrice || 0
      }]);
    }
    
    // Close modal immediately after adding product
    setShowProductModal(false);
    setSearchQuery('');
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p._id === productId);
    if (product && newQuantity > product.quantity) {
      Alert.alert('Insufficient Stock', `Only ${product.quantity} units of ${product.name} are available.`);
      return;
    }

    setCart(cart.map(item =>
      item._id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateItemPrice = (productId, newPrice) => {
    setCart(cart.map(item =>
      item._id === productId
        ? { ...item, unitPrice: parseFloat(newPrice) || 0 }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setFormData({
      customerDetails: {
        name: '',
        email: '',
        phone: '',
        address: ''
      },
      saleDate: new Date(),
      notes: '',
      paymentMethod: 'cash',
      discountAmount: 0,
      discountPercentage: 0,
      taxAmount: 0,
      shippingDetails: {
        shippingCost: 0
      }
    });
  };

  // Simple date selection
  const showDateSelection = () => {
    Alert.alert(
      'Select Sale Date',
      'Choose sale date option',
      [
        {
          text: 'Today',
          onPress: () => setFormData(prev => ({ ...prev, saleDate: new Date() }))
        },
        {
          text: 'Yesterday',
          onPress: () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setFormData(prev => ({ ...prev, saleDate: yesterday }));
          }
        },
        {
          text: 'Custom Date',
          onPress: () => {
            Alert.prompt(
              'Enter Date',
              'Enter date in format YYYY-MM-DD',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'OK',
                  onPress: (dateString) => {
                    if (dateString) {
                      const customDate = new Date(dateString);
                      if (!isNaN(customDate.getTime())) {
                        setFormData(prev => ({ ...prev, saleDate: customDate }));
                      } else {
                        Alert.alert('Error', 'Invalid date format. Please use YYYY-MM-DD');
                      }
                    }
                  }
                }
              ],
              'plain-text',
              new Date().toISOString().split('T')[0]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const validateForm = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to the cart before processing sale.');
      return false;
    }

    for (const item of cart) {
      const product = products.find(p => p._id === item._id);
      if (product && item.quantity > product.quantity) {
        Alert.alert(
          'Insufficient Stock',
          `Not enough stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
        );
        return false;
      }
    }

    return true;
  };

  const processSale = async () => {
    if (!validateForm()) return;

    try {
      setProcessingSale(true);

      const saleItems = cart.map(item => ({
        productId: item._id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        productionPrice: item.productionPrice || 0,
        totalPrice: item.unitPrice * item.quantity,
        profit: (item.unitPrice - (item.productionPrice || 0)) * item.quantity,
        profitMargin: item.unitPrice > 0 ? 
          ((item.unitPrice - (item.productionPrice || 0)) / item.unitPrice) * 100 : 0
      }));

      const customerName = formData.customerDetails.name?.trim();
      const customerType = customerName ? 'regular' : 'walk-in';

      const saleData = {
        customerDetails: {
          name: customerName || 'Walk-in Customer',
          email: formData.customerDetails.email,
          phone: formData.customerDetails.phone,
          address: formData.customerDetails.address,
          customerType: customerType
        },
        items: saleItems,
        saleDate: formData.saleDate.toISOString(),
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        discountAmount: calculations.totalDiscount,
        discountPercentage: formData.discountPercentage,
        taxAmount: formData.taxAmount,
        shippingDetails: formData.shippingDetails,
        totalAmount: calculations.grandTotal,
        totalProfit: calculations.totalProfit
      };

      const response = await apiCall('/supplier-sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });

      if (response && response.success) {
        Alert.alert(
          'Sale Processed', 
          `Sale #${response.sale?.saleNumber || ''} has been processed successfully!`,
          [{ text: 'OK', onPress: clearCart }]
        );
      } else {
        throw new Error(response?.message || 'Failed to process sale');
      }

    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Error', `Failed to process sale: ${error.message}`);
    } finally {
      setProcessingSale(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render product item in modal
  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.productModalItem, isDarkMode && styles.darkCard]}
      onPress={() => addToCart(item)}
      disabled={item.quantity <= 0}
    >
      <View style={styles.productModalInfo}>
        <Text style={[styles.productModalName, isDarkMode && styles.darkText]}>
          {item.name}
        </Text>
        <Text style={[styles.productModalCategory, isDarkMode && styles.darkSubtitle]}>
          {item.category} • {item.measurementUnit}
        </Text>
        <View style={styles.productModalDetails}>
          <Text style={[styles.productModalPrice, isDarkMode && styles.darkSubtitle]}>
            UGX {formatCurrency(item.sellingPrice)}
          </Text>
          <Text style={[
            styles.productModalStock,
            item.quantity <= 0 ? styles.outOfStock : 
            item.quantity <= (item.lowStockThreshold || 10) ? styles.lowStock : styles.inStock
          ]}>
            {item.quantity <= 0 ? 'Out of Stock' : `${item.quantity} in stock`}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons 
        name={item.quantity <= 0 ? "cancel" : "plus-circle"} 
        size={18} 
        color={item.quantity <= 0 ? "#EF4444" : "#10B981"} 
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading Products...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDarkMode && styles.darkContainer]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons 
              name="receipt" 
              size={20} 
              color={isDarkMode ? "#8B5CF6" : "#7C3AED"} 
            />
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              Create Sale
            </Text>
          </View>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            Process new customer sales
          </Text>
        </View>

        {/* Compact Customer Information */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Customer
              </Text>
              <Text style={[styles.optionalLabel, isDarkMode && styles.darkSubtitle]}>
                Optional
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.dateButton, isDarkMode && styles.darkDateButton]}
              onPress={showDateSelection}
            >
              <MaterialCommunityIcons name="calendar" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              <Text style={[styles.dateButtonText, isDarkMode && styles.darkSubtitle]}>
                {formatDate(formData.saleDate)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.compactForm}>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              placeholder="Customer name"
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
              value={formData.customerDetails.name}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                customerDetails: { ...prev.customerDetails, name: text }
              }))}
            />
            
            <View style={styles.compactRow}>
              <TextInput
                style={[styles.compactInput, isDarkMode && styles.darkInput]}
                placeholder="Phone"
                placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                value={formData.customerDetails.phone}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  customerDetails: { ...prev.customerDetails, phone: text }
                }))}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.compactInput, isDarkMode && styles.darkInput]}
                placeholder="Email"
                placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                value={formData.customerDetails.email}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  customerDetails: { ...prev.customerDetails, email: text }
                }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Compact Product Selection */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Products • {cart.length}
            </Text>
            <TouchableOpacity
              style={[styles.addButton, isDarkMode && styles.darkAddButton]}
              onPress={() => setShowProductModal(true)}
            >
              <MaterialIcons name="add" size={14} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cart-outline" size={28} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
              <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
                No products in cart
              </Text>
            </View>
          ) : (
            <View style={styles.cartItemsContainer}>
              {cart.map((item) => (
                <View key={item._id} style={[styles.cartItem, isDarkMode && styles.darkCartItem]}>
                  <View style={styles.cartItemMain}>
                    <Text style={[styles.cartItemName, isDarkMode && styles.darkText]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.cartItemRow}>
                      <TextInput
                        style={[styles.priceInput, isDarkMode && styles.darkInput]}
                        value={item.unitPrice.toString()}
                        onChangeText={(text) => updateItemPrice(item._id, text)}
                        keyboardType="numeric"
                      />
                      <Text style={[styles.cartItemDetails, isDarkMode && styles.darkSubtitle]}>
                        UGX × {item.quantity}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cartItemControls}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[styles.quantityButton, isDarkMode && styles.darkQuantityButton]}
                        onPress={() => updateQuantity(item._id, item.quantity - 1)}
                      >
                        <MaterialCommunityIcons name="minus" size={12} color="#EF4444" />
                      </TouchableOpacity>
                      
                      <Text style={[styles.quantityText, isDarkMode && styles.darkText]}>
                        {item.quantity}
                      </Text>
                      
                      <TouchableOpacity
                        style={[styles.quantityButton, isDarkMode && styles.darkQuantityButton]}
                        onPress={() => updateQuantity(item._id, item.quantity + 1)}
                      >
                        <MaterialCommunityIcons name="plus" size={12} color="#10B981" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item._id)}
                    >
                      <MaterialCommunityIcons name="close" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Compact Pricing & Payment */}
        {cart.length > 0 && (
          <View style={[styles.section, isDarkMode && styles.darkSection]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Payment & Totals
            </Text>

            {/* Compact Pricing Inputs */}
            <View style={styles.pricingGrid}>
              <View style={styles.pricingItem}>
                <Text style={[styles.pricingLabel, isDarkMode && styles.darkSubtitle]}>Discount %</Text>
                <TextInput
                  style={[styles.pricingInput, isDarkMode && styles.darkInput]}
                  value={formData.discountPercentage.toString()}
                  onChangeText={(text) => {
                    const percentage = parseFloat(text) || 0;
                    setFormData(prev => ({ 
                      ...prev, 
                      discountPercentage: Math.min(100, Math.max(0, percentage)),
                      discountAmount: 0
                    }));
                  }}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.pricingItem}>
                <Text style={[styles.pricingLabel, isDarkMode && styles.darkSubtitle]}>Discount UGX</Text>
                <TextInput
                  style={[styles.pricingInput, isDarkMode && styles.darkInput]}
                  value={formData.discountAmount.toString()}
                  onChangeText={(text) => {
                    const amount = parseFloat(text) || 0;
                    setFormData(prev => ({ 
                      ...prev, 
                      discountAmount: amount,
                      discountPercentage: 0
                    }));
                  }}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.pricingItem}>
                <Text style={[styles.pricingLabel, isDarkMode && styles.darkSubtitle]}>Tax UGX</Text>
                <TextInput
                  style={[styles.pricingInput, isDarkMode && styles.darkInput]}
                  value={formData.taxAmount.toString()}
                  onChangeText={(text) => {
                    const tax = parseFloat(text) || 0;
                    setFormData(prev => ({ ...prev, taxAmount: tax }));
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Compact Payment Method */}
            <View style={styles.paymentSection}>
              <Text style={[styles.paymentLabel, isDarkMode && styles.darkText]}>Payment</Text>
              <View style={styles.paymentGrid}>
                {['cash', 'mobile_money', 'bank_transfer', 'card'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentOption,
                      formData.paymentMethod === method && styles.paymentOptionSelected,
                      isDarkMode && formData.paymentMethod === method && styles.darkPaymentOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                  >
                    <Text style={[
                      styles.paymentOptionText,
                      formData.paymentMethod === method && styles.paymentOptionTextSelected,
                      isDarkMode && styles.darkPaymentOptionText
                    ]}>
                      {method.charAt(0).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Compact Notes */}
            <TextInput
              style={[styles.notesInput, isDarkMode && styles.darkInput]}
              placeholder="Notes (optional)"
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={2}
            />
            
            {/* Compact Totals */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Subtotal</Text>
                <Text style={[styles.totalValue, isDarkMode && styles.darkText]}>
                  UGX {formatCurrency(calculations.subtotal)}
                </Text>
              </View>
              
              {calculations.totalDiscount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Discount</Text>
                  <Text style={[styles.discountValue, isDarkMode && styles.darkText]}>
                    -UGX {formatCurrency(calculations.totalDiscount)}
                  </Text>
                </View>
              )}
              
              {calculations.totalTax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Tax</Text>
                  <Text style={[styles.totalValue, isDarkMode && styles.darkText]}>
                    UGX {formatCurrency(calculations.totalTax)}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Profit</Text>
                <Text style={[styles.profitValue, { color: calculations.totalProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                  UGX {formatCurrency(calculations.totalProfit)}
                </Text>
              </View>
              
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={[styles.grandTotalLabel, isDarkMode && styles.darkText]}>Total</Text>
                <Text style={[styles.grandTotalValue, isDarkMode && styles.darkText]}>
                  UGX {formatCurrency(calculations.grandTotal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Compact Action Buttons */}
        <View style={styles.actionsContainer}>
          {cart.length > 0 && (
            <TouchableOpacity 
              style={[styles.clearButton, isDarkMode && styles.darkClearButton]}
              onPress={clearCart}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.processButton, 
              cart.length === 0 && styles.disabledButton,
              processingSale && styles.processingButton
            ]}
            onPress={processSale}
            disabled={cart.length === 0 || processingSale}
          >
            {processingSale ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.processButtonText}>
              {processingSale ? 'Processing...' : 'Process Sale'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Compact Product Selection Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Products • {filteredProducts.length}
            </Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <MaterialIcons name="close" size={20} color={isDarkMode ? '#FFFFFF' : '#374151'} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={16} 
              color={isDarkMode ? "#6B7280" : "#9CA3AF"} 
            />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.darkText]}
              placeholder="Search products..."
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="package-variant" size={28} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
                  {searchQuery ? 'No products found' : 'No products available'}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: 12,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  darkSection: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  optionalLabel: {
    fontSize: 10,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  darkDateButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  dateButtonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  compactForm: {
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#374151',
  },
  compactInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#374151',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 12,
    color: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  // Cart Items
  cartItemsContainer: {
    gap: 6,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    padding: 8,
  },
  darkCartItem: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  cartItemMain: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartItemDetails: {
    fontSize: 10,
    color: '#6B7280',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkQuantityButton: {
    backgroundColor: '#374151',
  },
  quantityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    minWidth: 16,
    textAlign: 'center',
  },
  priceInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    width: 60,
    height: 20,
    paddingHorizontal: 4,
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
  },
  removeButton: {
    padding: 2,
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  darkAddButton: {
    backgroundColor: '#7C3AED',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Pricing Section
  pricingGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pricingItem: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  pricingInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
  },
  // Payment Section
  paymentSection: {
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  paymentOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  darkPaymentOptionSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  paymentOptionText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  paymentOptionTextSelected: {
    color: '#FFFFFF',
  },
  darkPaymentOptionText: {
    color: '#D1D5DB',
  },
  // Notes
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    color: '#374151',
    marginBottom: 12,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  // Totals
  totalsContainer: {
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  discountValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  profitValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  darkClearButton: {
    backgroundColor: '#451A1A',
    borderColor: '#7F1D1D',
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  processButton: {
    flex: 2,
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  processingButton: {
    backgroundColor: '#7C3AED',
  },
  processButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalList: {
    paddingBottom: 20,
  },
  productModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  productModalInfo: {
    flex: 1,
  },
  productModalName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  productModalCategory: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  productModalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productModalPrice: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  productModalStock: {
    fontSize: 10,
    fontWeight: '500',
  },
  inStock: {
    color: '#10B981',
  },
  lowStock: {
    color: '#F59E0B',
  },
  outOfStock: {
    color: '#EF4444',
  },
  darkCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
});

export default SalesTab; 