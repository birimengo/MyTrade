// src/components/RetailerComponents/OrderForm.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Ionicons, 
  FontAwesome, 
  FontAwesome5, 
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
  Entypo
} from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

const OrderForm = ({ visible, product, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState('');
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [urgentDelivery, setUrgentDelivery] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    if (product && visible) {
      const minQty = product.minOrderQuantity || 1;
      setQuantity(minQty.toString());
      setTotalPrice(product.price * minQty);
      setContactPhone(user?.phone || '');
      
      // Set default delivery date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeliveryDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [product, visible, user]);

  useEffect(() => {
    if (product && quantity) {
      const qty = parseInt(quantity, 10) || 0;
      let price = product.price * qty;
      
      // Apply bulk discount if applicable
      if (product.bulkDiscount && qty >= product.bulkDiscount.minQuantity) {
        const discountAmount = price * (product.bulkDiscount.discountPercentage / 100);
        price = price - discountAmount;
      }
      
      // Apply urgent delivery fee if selected
      if (urgentDelivery) {
        price += price * 0.1; // 10% urgent delivery fee
      }
      
      setTotalPrice(Math.round(price));
    }
  }, [quantity, product, urgentDelivery]);

  const getCurrentLocation = async () => {
    try {
      setLocationStatus('loading');
      
      // Mock coordinates for demonstration
      // In production, you would use expo-location here
      const mockCoordinates = {
        lat: 0.3476 + (Math.random() * 0.01), // Kampala approximate coordinates
        lng: 32.5825 + (Math.random() * 0.01)
      };
      
      // Simulate API call delay
      setTimeout(() => {
        setCoordinates(mockCoordinates);
        setLocationStatus('success');
        Alert.alert(
          'Location Detected',
          'Demo coordinates have been set. In production, this would use real GPS location.',
          [{ text: 'OK' }]
        );
      }, 1500);
      
    } catch (error) {
      console.error('Location error:', error);
      setLocationStatus('error');
      Alert.alert(
        'Location Service',
        'Location detection is in demo mode. Using mock coordinates.',
        [{ text: 'OK' }]
      );
    }
  };

  const getAuthToken = async () => {
    try {
      const tokenKeys = ['userToken', 'token', 'authToken', 'accessToken'];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const validateForm = () => {
    if (!quantity || parseInt(quantity, 10) <= 0) {
      return 'Quantity must be greater than zero.';
    }

    if (product.minOrderQuantity && parseInt(quantity, 10) < product.minOrderQuantity) {
      return `Minimum order quantity is ${product.minOrderQuantity} ${product.measurementUnit}.`;
    }

    if (product.quantity && parseInt(quantity, 10) > product.quantity) {
      return `Only ${product.quantity} ${product.measurementUnit} available in stock.`;
    }

    if (!deliveryPlace.trim()) {
      return 'Please provide a delivery address.';
    }

    if (!contactPhone.trim()) {
      return 'Please provide a contact phone number.';
    }

    if (!deliveryDate) {
      return 'Please select a delivery date.';
    }

    return null;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('User not authenticated. Please log in.');
      }

      const normalizedUnit = product.measurementUnit === 'l' ? 'liters' : product.measurementUnit;

      const orderDetails = {
        product: product._id,
        quantity: parseInt(quantity, 10),
        unitPrice: product.price,
        totalPrice: totalPrice,
        measurementUnit: normalizedUnit,
        deliveryPlace: deliveryPlace.trim(),
        deliveryCoordinates: coordinates.lat && coordinates.lng ? coordinates : null,
        orderNotes: orderNotes.trim() || '',
        paymentMethod: paymentMethod,
        deliveryDate: deliveryDate,
        urgentDelivery: urgentDelivery,
        contactPhone: contactPhone.trim(),
        retailerId: user?._id,
        wholesalerId: product.wholesalerId || product.wholesaler?._id,
      };

      const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';
      const response = await fetch(`${API_BASE_URL}/api/retailer-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderDetails),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order.');
      }

      const data = await response.json();
      console.log('Order placed successfully:', data);

      Alert.alert(
        'Order Placed Successfully!', 
        `Your order for ${quantity} ${product.measurementUnit} of ${product.name} has been placed. Total: UGX ${totalPrice.toLocaleString()}`,
        [{ text: 'OK' }]
      );
      
      onSubmit(data.order);
      handleClose();
    } catch (apiError) {
      console.error('API Error:', apiError);
      setError(apiError.message);
      Alert.alert('Order Failed', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuantity(product?.minOrderQuantity?.toString() || '1');
    setDeliveryPlace('');
    setOrderNotes('');
    setError('');
    setLocationStatus('idle');
    setCoordinates({ lat: null, lng: null });
    setPaymentMethod('cash_on_delivery');
    setUrgentDelivery(false);
    setContactPhone(user?.phone || '');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDeliveryDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const incrementQuantity = () => {
    const currentQty = parseInt(quantity, 10) || 0;
    setQuantity((currentQty + 1).toString());
  };

  const decrementQuantity = () => {
    const currentQty = parseInt(quantity, 10) || 0;
    const minQty = product.minOrderQuantity || 1;
    if (currentQty > minQty) {
      setQuantity((currentQty - 1).toString());
    }
  };

  const getBulkDiscountInfo = () => {
    if (!product.bulkDiscount) return null;
    
    const currentQty = parseInt(quantity, 10) || 0;
    const neededForDiscount = product.bulkDiscount.minQuantity - currentQty;
    
    if (currentQty >= product.bulkDiscount.minQuantity) {
      return {
        type: 'active',
        message: `You're getting ${product.bulkDiscount.discountPercentage}% bulk discount!`,
        savings: (product.price * currentQty) * (product.bulkDiscount.discountPercentage / 100)
      };
    } else if (neededForDiscount > 0) {
      return {
        type: 'available',
        message: `Add ${neededForDiscount} more ${product.measurementUnit} to get ${product.bulkDiscount.discountPercentage}% bulk discount`,
        needed: neededForDiscount
      };
    }
    
    return null;
  };

  if (!product) return null;

  const bulkDiscountInfo = getBulkDiscountInfo();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              Order {product.name}
            </Text>
            <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
              Complete your order details
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {error ? (
            <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
              <MaterialIcons name="error-outline" size={20} color="#DC2626" />
              <Text style={[styles.errorText, isDarkMode && styles.darkErrorText]}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Product Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Product Details
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <Text style={[styles.productName, isDarkMode && styles.darkText]}>
                {product.name}
              </Text>
              <View style={styles.productDetails}>
                <View style={styles.detailRow}>
                  <Feather name="dollar-sign" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <Text style={[styles.productPrice, isDarkMode && styles.darkSubtitle]}>
                    UGX {product.price?.toLocaleString()} per {product.measurementUnit}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="cube-outline" size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <Text style={[styles.productStock, isDarkMode && styles.darkSubtitle]}>
                    {product.quantity || 'N/A'} in stock
                  </Text>
                </View>
              </View>
              {product.description && (
                <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]}>
                  {product.description}
                </Text>
              )}
            </View>
          </View>

          {/* Quantity Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="hash" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Quantity ({product.measurementUnit}) *
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <View style={styles.quantityContainer}>
                <TouchableOpacity 
                  style={[styles.quantityButton, isDarkMode && styles.darkQuantityButton]}
                  onPress={decrementQuantity}
                  disabled={parseInt(quantity, 10) <= (product.minOrderQuantity || 1)}
                >
                  <Feather name="minus" size={18} color={isDarkMode ? "#D1D5DB" : "#374151"} />
                </TouchableOpacity>
                
                <TextInput
                  style={[styles.quantityInput, isDarkMode && styles.darkInput]}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
                
                <TouchableOpacity 
                  style={[styles.quantityButton, isDarkMode && styles.darkQuantityButton]}
                  onPress={incrementQuantity}
                  disabled={product.quantity && parseInt(quantity, 10) >= product.quantity}
                >
                  <Feather name="plus" size={18} color={isDarkMode ? "#D1D5DB" : "#374151"} />
                </TouchableOpacity>
              </View>
              
              {product.minOrderQuantity && (
                <Text style={[styles.hintText, isDarkMode && styles.darkSubtitle]}>
                  <Feather name="info" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  Minimum order: {product.minOrderQuantity} {product.measurementUnit}
                </Text>
              )}
              
              {bulkDiscountInfo && (
                <View style={[
                  styles.discountBanner,
                  bulkDiscountInfo.type === 'active' ? styles.activeDiscount : styles.availableDiscount
                ]}>
                  <FontAwesome5 
                    name={bulkDiscountInfo.type === 'active' ? "award" : "tags"} 
                    size={14} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.discountText}>
                    {bulkDiscountInfo.message}
                    {bulkDiscountInfo.savings && ` (Save UGX ${bulkDiscountInfo.savings.toLocaleString()})`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="phone" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Contact Information *
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Your phone number for delivery updates"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Delivery Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="map-pin" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Delivery Address *
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                value={deliveryPlace}
                onChangeText={setDeliveryPlace}
                placeholder="Enter your complete delivery address with landmarks..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Delivery Date */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="calendar" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Preferred Delivery Date *
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                value={deliveryDate}
                onChangeText={setDeliveryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <Text style={[styles.hintText, isDarkMode && styles.darkSubtitle]}>
                Format: Year-Month-Day (e.g., 2024-01-15)
              </Text>
            </View>
          </View>

          {/* Urgent Delivery Option */}
          <View style={styles.section}>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TouchableOpacity
                style={styles.urgentDeliveryOption}
                onPress={() => setUrgentDelivery(!urgentDelivery)}
              >
                <View style={styles.urgentDeliveryLeft}>
                  <MaterialCommunityIcons 
                    name={urgentDelivery ? "clock-fast" : "clock-outline"} 
                    size={20} 
                    color={urgentDelivery ? "#F59E0B" : (isDarkMode ? "#9CA3AF" : "#6B7280")} 
                  />
                  <View style={styles.urgentDeliveryText}>
                    <Text style={[styles.urgentDeliveryTitle, isDarkMode && styles.darkText]}>
                      Urgent Delivery
                    </Text>
                    <Text style={[styles.urgentDeliverySubtitle, isDarkMode && styles.darkSubtitle]}>
                      Get your order faster (10% additional fee)
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  urgentDelivery && styles.checkboxChecked,
                  isDarkMode && styles.darkCheckbox
                ]}>
                  {urgentDelivery && <Feather name="check" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Services */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="navigation" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Location Services (Optional)
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TouchableOpacity
                style={[styles.locationButton, isDarkMode && styles.darkLocationButton]}
                onPress={getCurrentLocation}
                disabled={locationStatus === 'loading'}
              >
                {locationStatus === 'loading' ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Feather name="map-pin" size={18} color="#3B82F6" />
                )}
                <Text style={[styles.locationButtonText, isDarkMode && styles.darkText]}>
                  {locationStatus === 'loading' ? 'Detecting Location...' : 
                   locationStatus === 'success' ? 'Location Detected' : 'Detect My Location'}
                </Text>
              </TouchableOpacity>

              {coordinates.lat && coordinates.lng && (
                <View style={styles.coordinatesContainer}>
                  <Text style={[styles.coordinateLabel, isDarkMode && styles.darkSubtitle]}>
                    Detected Coordinates:
                  </Text>
                  <Text style={[styles.coordinateValue, isDarkMode && styles.darkSubtitle]}>
                    Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
                  </Text>
                  <Text style={[styles.hintText, isDarkMode && styles.darkSubtitle]}>
                    Coordinates will be used for delivery tracking
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="credit-card" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Payment Method
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'cash_on_delivery' && styles.selectedPaymentOption]}
                onPress={() => setPaymentMethod('cash_on_delivery')}
              >
                <MaterialCommunityIcons 
                  name="cash" 
                  size={20} 
                  color={paymentMethod === 'cash_on_delivery' ? "#059669" : (isDarkMode ? "#9CA3AF" : "#6B7280")} 
                />
                <View style={styles.paymentText}>
                  <Text style={[styles.paymentTitle, isDarkMode && styles.darkText]}>
                    Cash on Delivery
                  </Text>
                  <Text style={[styles.paymentSubtitle, isDarkMode && styles.darkSubtitle]}>
                    Pay when you receive your order
                  </Text>
                </View>
                <View style={[
                  styles.radio,
                  paymentMethod === 'cash_on_delivery' && styles.radioSelected,
                  isDarkMode && styles.darkRadio
                ]}>
                  {paymentMethod === 'cash_on_delivery' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="edit-3" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Order Notes (Optional)
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <TextInput
                style={[styles.input, styles.textArea, isDarkMode && styles.darkInput]}
                value={orderNotes}
                onChangeText={setOrderNotes}
                placeholder="Any special instructions, delivery preferences, or notes for the wholesaler..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="file-text" size={20} color={isDarkMode ? "#3B82F6" : "#3B82F6"} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Order Summary
              </Text>
            </View>
            <View style={[styles.card, isDarkMode && styles.darkCard]}>
              <View style={styles.totalPriceContainer}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, isDarkMode && styles.darkText]}>
                    Unit Price:
                  </Text>
                  <Text style={[styles.priceValue, isDarkMode && styles.darkSubtitle]}>
                    UGX {product.price?.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, isDarkMode && styles.darkText]}>
                    Quantity:
                  </Text>
                  <Text style={[styles.priceValue, isDarkMode && styles.darkSubtitle]}>
                    {quantity} {product.measurementUnit}
                  </Text>
                </View>
                
                {product.bulkDiscount && parseInt(quantity, 10) >= product.bulkDiscount.minQuantity && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, isDarkMode && styles.darkText]}>
                      Bulk Discount:
                    </Text>
                    <Text style={styles.discountValue}>
                      -{product.bulkDiscount.discountPercentage}%
                    </Text>
                  </View>
                )}
                
                {urgentDelivery && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, isDarkMode && styles.darkText]}>
                      Urgent Delivery:
                    </Text>
                    <Text style={styles.urgentFeeValue}>
                      +10%
                    </Text>
                  </View>
                )}
                
                <View style={[styles.divider, isDarkMode && styles.darkDivider]} />
                <View style={styles.priceRow}>
                  <Text style={[styles.totalPriceLabel, isDarkMode && styles.darkText]}>
                    Total Amount:
                  </Text>
                  <Text style={styles.totalPriceValue}>
                    UGX {totalPrice.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, isDarkMode && styles.darkCancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Feather name="x" size={18} color={isDarkMode ? "#D1D5DB" : "#374151"} />
              <Text style={[styles.cancelButtonText, isDarkMode && styles.darkText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="shopping-bag" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Place Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkHeader: {
    borderBottomColor: '#374151',
  },
  headerLeft: {
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
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  darkErrorBanner: {
    backgroundColor: '#7F1D1D',
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  darkErrorText: {
    color: '#FCA5A5',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkCard: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  productDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  productStock: {
    fontSize: 14,
    color: '#6B7280',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkQuantityButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  quantityInput: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
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
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  activeDiscount: {
    backgroundColor: '#059669',
  },
  availableDiscount: {
    backgroundColor: '#F59E0B',
  },
  discountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  urgentDeliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
  },
  urgentDeliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  urgentDeliveryText: {
    flex: 1,
  },
  urgentDeliveryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  urgentDeliverySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCheckbox: {
    borderColor: '#6B7280',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  darkLocationButton: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
  },
  coordinatesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  coordinateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  coordinateValue: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  selectedPaymentOption: {
    backgroundColor: '#EFF6FF',
  },
  paymentText: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  paymentSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkRadio: {
    borderColor: '#6B7280',
  },
  radioSelected: {
    borderColor: '#3B82F6',
  },
  radioDot: {
    width: 10,
    height: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  totalPriceContainer: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#374151',
  },
  priceValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  discountValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  urgentFeeValue: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  darkDivider: {
    backgroundColor: '#4B5563',
  },
  totalPriceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OrderForm;