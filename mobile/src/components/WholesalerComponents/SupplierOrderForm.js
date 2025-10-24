import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const SupplierOrderForm = ({ 
  product, 
  supplier, 
  onClose, 
  onOrderPlaced,
  isDarkMode 
}) => {
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    country: 'Uganda',
    postalCode: ''
  });

  const { user, getAuthToken, API_BASE_URL } = useAuth();

  const ugandanLocations = [
    'Kampala', 'Jinja', 'Entebbe', 'Mbarara', 'Gulu', 'Lira', 'Mbale', 'Soroti', 
    'Fort Portal', 'Masaka', 'Mityana', 'Wakiso', 'Mukono', 'Busia', 'Tororo'
  ];

  useEffect(() => {
    if (product) {
      setOrderQuantity(product.minOrderQuantity || 1);
    }
    
    // Try to get saved address from AsyncStorage (you'll need to implement this)
    loadSavedAddress();
  }, [product]);

  const loadSavedAddress = async () => {
    try {
      // You'll need to implement AsyncStorage or similar for mobile
      // For now, we'll use a placeholder
      const defaultAddress = {
        street: '',
        city: '',
        state: '',
        country: 'Uganda',
        postalCode: ''
      };
      setShippingAddress(defaultAddress);
    } catch (error) {
      console.log('Error loading saved address:', error);
    }
  };

  const saveAddress = async (address) => {
    try {
      // Implement AsyncStorage saving here
      // await AsyncStorage.setItem('wholesalerShippingAddress', JSON.stringify(address));
    } catch (error) {
      console.log('Error saving address:', error);
    }
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    return (product.sellingPrice * orderQuantity).toFixed(2);
  };

  const handleAddressChange = (field, value) => {
    const newAddress = {
      ...shippingAddress,
      [field]: value
    };
    setShippingAddress(newAddress);
    
    // Save to storage for future orders
    saveAddress(newAddress);
  };

  const validateAddress = () => {
    if (!shippingAddress.street.trim()) {
      return 'Street address is required';
    }
    if (!shippingAddress.city.trim()) {
      return 'City is required';
    }
    if (!shippingAddress.country.trim()) {
      return 'Country is required';
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    if (!product) return;

    const addressError = validateAddress();
    if (addressError) {
      setError(addressError);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = await getAuthToken();
      
      if (!token) {
        setError('Please log in to place an order');
        return;
      }

      const orderData = {
        supplierId: supplier?._id,
        items: [
          {
            productId: product._id,
            quantity: orderQuantity
          }
        ],
        orderNotes: orderNotes,
        shippingAddress: shippingAddress
      };

      const response = await fetch(`${API_BASE_URL}/api/wholesaler-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          '✅ Order Placed Successfully!',
          `Order Number: ${result.order.orderNumber}\nDelivery to: ${shippingAddress.street}, ${shippingAddress.city}\nTotal Amount: $${result.order.totalAmount}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onOrderPlaced();
                onClose();
              }
            }
          ]
        );
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setError(error.message);
      Alert.alert('Order Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (product.quantity && orderQuantity >= product.quantity) return;
    setOrderQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    const minQty = product.minOrderQuantity || 1;
    if (orderQuantity <= minQty) return;
    setOrderQuantity(prev => prev - 1);
  };

  const handleQuantityChange = (value) => {
    const numValue = parseInt(value) || 1;
    const minQty = product.minOrderQuantity || 1;
    const maxQty = product.quantity || Infinity;
    
    if (numValue < minQty) {
      setOrderQuantity(minQty);
    } else if (product.quantity && numValue > maxQty) {
      setOrderQuantity(maxQty);
    } else {
      setOrderQuantity(numValue);
    }
  };

  if (!product) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
          </TouchableOpacity>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>Order Product</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isDarkMode && styles.darkSubtext]}>
            Product information not available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDarkMode && styles.darkContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
          <Text style={[styles.backText, isDarkMode && styles.darkText]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>Place Order</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
            <Feather name="alert-triangle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Product Summary */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <View style={styles.productHeader}>
            <Image
              source={{ uri: product.images?.[0]?.url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop' }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.productInfo}>
              <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.productPrice, isDarkMode && styles.darkSubtext]}>
                ${product.sellingPrice} per {product.measurementUnit}
              </Text>
              <Text style={[styles.supplierText, isDarkMode && styles.darkSubtext]}>
                Supplier: {supplier?.businessName || `${supplier?.firstName} ${supplier?.lastName}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity Section */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Quantity</Text>
          <View style={styles.quantityContainer}>
            <View style={styles.quantitySelector}>
              <TouchableOpacity 
                style={[
                  styles.quantityButton, 
                  isDarkMode && styles.darkQuantityButton,
                  orderQuantity <= (product.minOrderQuantity || 1) && styles.disabledButton
                ]}
                onPress={decrementQuantity}
                disabled={orderQuantity <= (product.minOrderQuantity || 1) || loading}
              >
                <Feather name="minus" size={16} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.quantityInput, isDarkMode && styles.darkQuantityInput]}
                value={orderQuantity.toString()}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                editable={!loading}
                selectTextOnFocus
              />
              
              <TouchableOpacity 
                style={[
                  styles.quantityButton, 
                  isDarkMode && styles.darkQuantityButton,
                  (product.quantity && orderQuantity >= product.quantity) && styles.disabledButton
                ]}
                onPress={incrementQuantity}
                disabled={(product.quantity && orderQuantity >= product.quantity) || loading}
              >
                <Feather name="plus" size={16} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.quantityInfo, isDarkMode && styles.darkSubtext]}>
              Minimum order: {product.minOrderQuantity} {product.measurementUnit}
              {product.quantity > 0 && ` • Available: ${product.quantity} ${product.measurementUnit}`}
            </Text>
          </View>
        </View>

        {/* Delivery Address Section */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Delivery Address</Text>
          
          <View style={styles.addressForm}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Street Address *</Text>
              <TextInput
                style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                placeholder="Enter street address"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={shippingAddress.street}
                onChangeText={(value) => handleAddressChange('street', value)}
                editable={!loading}
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>City *</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  placeholder="City"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  value={shippingAddress.city}
                  onChangeText={(value) => handleAddressChange('city', value)}
                  editable={!loading}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>State/District</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  placeholder="State or district"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  value={shippingAddress.state}
                  onChangeText={(value) => handleAddressChange('state', value)}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Country *</Text>
                <View style={[styles.pickerContainer, isDarkMode && styles.darkPickerContainer]}>
                  <Text style={[styles.pickerText, isDarkMode && styles.darkText]}>
                    {shippingAddress.country}
                  </Text>
                  <Feather name="chevron-down" size={16} color={isDarkMode ? "#D1D5DB" : "#374151"} />
                </View>
                {/* Note: For country selection, you might want to use a proper picker component */}
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Postal Code</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  placeholder="Postal code"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  value={shippingAddress.postalCode}
                  onChangeText={(value) => handleAddressChange('postalCode', value)}
                  editable={!loading}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Order Notes Section */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.label, isDarkMode && styles.darkText]}>Order Notes (Optional)</Text>
          <TextInput
            style={[styles.textArea, isDarkMode && styles.darkTextInput]}
            placeholder="Any special requirements or notes for this order..."
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            value={orderNotes}
            onChangeText={setOrderNotes}
            editable={!loading}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Order Summary */}
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtext]}>Unit Price:</Text>
            <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
              ${product.sellingPrice}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtext]}>Quantity:</Text>
            <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
              {orderQuantity} {product.measurementUnit}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>Total:</Text>
            <Text style={styles.totalValue}>${calculateTotalPrice()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer with Action Buttons */}
      <View style={[styles.footer, isDarkMode && styles.darkFooter]}>
        <View style={styles.buttonRow}>
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
              styles.orderButton,
              (loading || product.quantity === 0) && styles.disabledButton,
              isDarkMode && styles.darkOrderButton
            ]}
            onPress={handlePlaceOrder}
            disabled={loading || product.quantity === 0}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#FFFFFF" />
                <Text style={styles.orderButtonText}>Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
    color: '#374151',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkSection: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  
  // Error Styles
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  darkErrorBanner: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Product Header
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  supplierText: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Quantity Section
  quantityContainer: {
    marginBottom: 8,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  darkQuantityButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  quantityInput: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkQuantityInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  quantityInfo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Address Form
  addressForm: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkTextInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  darkPickerContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  pickerText: {
    fontSize: 14,
    color: '#374151',
  },

  // Order Summary
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
    fontWeight: '500',
    color: '#374151',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
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
    color: '#3B82F6',
  },

  // Footer & Buttons
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  darkFooter: {
    backgroundColor: '#1F2937',
    borderTopColor: '#374151',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  darkCancelButtonText: {
    color: '#D1D5DB',
  },
  orderButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  darkOrderButton: {
    backgroundColor: '#2563EB',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
});

export default SupplierOrderForm;