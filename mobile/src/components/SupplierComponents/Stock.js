// src/components/SupplierComponents/Stock.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useDarkMode } from '../../context/DarkModeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const StockTab = ({ apiCall }) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  // Get stock status
  const getStockStatus = (quantity, lowStockThreshold = 10) => {
    if (quantity === 0) return { status: 'out-of-stock', color: '#EF4444', text: 'Out of Stock' };
    if (quantity <= lowStockThreshold) return { status: 'low-stock', color: '#F59E0B', text: 'Low Stock' };
    return { status: 'in-stock', color: '#10B981', text: 'In Stock' };
  };

  // Calculate profit per unit
  const calculateProfit = (product) => {
    const profitPerUnit = (product.sellingPrice || 0) - (product.productionPrice || 0);
    const totalPotentialProfit = profitPerUnit * (product.quantity || 0);
    const profitMargin = product.sellingPrice > 0 ? 
      ((profitPerUnit / product.sellingPrice) * 100) : 0;
    
    return {
      profitPerUnit,
      totalPotentialProfit,
      profitMargin
    };
  };

  // Get profit color
  const getProfitColor = (profit) => {
    return profit > 0 ? '#10B981' : profit < 0 ? '#EF4444' : '#6B7280';
  };

  // Fetch real products data
  const loadStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiCall('/supplier-products');
      
      if (data && data.success) {
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
      
    } catch (error) {
      console.error('Error loading stock data:', error);
      setError('Failed to load products: ' + error.message);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStockData();
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setEditingProduct({ ...product });
    setEditModalVisible(true);
  };

  // Handle save product
  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      setSaving(true);
      
      // Validate required fields
      if (!editingProduct.name || !editingProduct.sellingPrice || !editingProduct.productionPrice) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Update product via API
      const response = await apiCall(`/supplier-products/${editingProduct._id}`, 'PUT', editingProduct);
      
      if (response && response.success) {
        // Update local state
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p._id === editingProduct._id ? { ...editingProduct } : p
          )
        );
        setEditModalVisible(false);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiCall(`/supplier-products/${product._id}`, 'DELETE');
              
              if (response && response.success) {
                // Remove from local state
                setProducts(prevProducts => 
                  prevProducts.filter(p => p._id !== product._id)
                );
                Alert.alert('Success', 'Product deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product: ' + error.message);
            }
          }
        }
      ]
    );
  };

  // Update product field
  const updateProductField = (field, value) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Image Carousel Component
  const ImageCarousel = ({ images, productName }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
      return (
        <View style={[styles.imageContainer, styles.noImageContainer]}>
          <MaterialCommunityIcons name="image-off" size={32} color="#9CA3AF" />
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      );
    }

    const goToNext = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    };

    const goToPrevious = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
    };

    return (
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: images[currentIndex].url }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        
        {/* Image counter */}
        {images.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        )}

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <TouchableOpacity 
              style={[styles.navArrow, styles.leftArrow]}
              onPress={goToPrevious}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navArrow, styles.rightArrow]}
              onPress={goToNext}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  // Edit Product Modal
  const EditProductModal = () => {
    if (!editingProduct) return null;

    return (
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                Edit Product
              </Text>
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={20} color={isDarkMode ? "#FFFFFF" : "#374151"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Product Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                  Product Name *
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={editingProduct.name}
                  onChangeText={(text) => updateProductField('name', text)}
                  placeholder="Enter product name"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                  Description
                </Text>
                <TextInput
                  style={[styles.textArea, isDarkMode && styles.darkTextInput]}
                  value={editingProduct.description}
                  onChangeText={(text) => updateProductField('description', text)}
                  placeholder="Enter product description"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                  Category
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={editingProduct.category}
                  onChangeText={(text) => updateProductField('category', text)}
                  placeholder="Enter category"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
              </View>

              {/* Prices Row */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.flex1]}>
                  <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                    Selling Price (UGX) *
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={editingProduct.sellingPrice?.toString()}
                    onChangeText={(text) => updateProductField('sellingPrice', parseFloat(text) || 0)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, styles.flex1]}>
                  <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                    Cost Price (UGX) *
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={editingProduct.productionPrice?.toString()}
                    onChangeText={(text) => updateProductField('productionPrice', parseFloat(text) || 0)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Stock Information */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.flex1]}>
                  <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                    Quantity in Stock
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={editingProduct.quantity?.toString()}
                    onChangeText={(text) => updateProductField('quantity', parseInt(text) || 0)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, styles.flex1]}>
                  <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                    Measurement Unit
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                    value={editingProduct.measurementUnit}
                    onChangeText={(text) => updateProductField('measurementUnit', text)}
                    placeholder="kg, pieces, etc."
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  />
                </View>
              </View>

              {/* Low Stock Threshold */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkSubtitle]}>
                  Low Stock Threshold
                </Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={editingProduct.lowStockThreshold?.toString()}
                  onChangeText={(text) => updateProductField('lowStockThreshold', parseInt(text) || 10)}
                  placeholder="10"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  keyboardType="numeric"
                />
                <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                  Alert when stock falls below this number
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // Product Card Component - Single Column
  const ProductCard = ({ product }) => {
    const stockStatus = getStockStatus(product.quantity, product.lowStockThreshold);
    const profitInfo = calculateProfit(product);

    return (
      <View style={[styles.productCard, isDarkMode && styles.darkCard]}>
        {/* Image Carousel */}
        <ImageCarousel images={product.images} productName={product.name} />

        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          </View>
        </View>

        {/* Product Description */}
        {product.description && (
          <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        {/* Stock and Price Information */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Quantity</Text>
            <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
              {product.quantity} {product.measurementUnit}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: stockStatus.color + '20' }]}>
              <MaterialCommunityIcons 
                name={
                  stockStatus.status === 'out-of-stock' ? 'cancel' :
                  stockStatus.status === 'low-stock' ? 'alert' : 'check'
                } 
                size={12} 
                color={stockStatus.color} 
              />
              <Text style={[styles.statusText, { color: stockStatus.color }]}>
                {stockStatus.text}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Selling Price</Text>
            <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
              UGX {formatCurrency(product.sellingPrice)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Cost Price</Text>
            <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
              UGX {formatCurrency(product.productionPrice)}
            </Text>
          </View>
        </View>

        {/* Profit Information */}
        <View style={styles.profitSection}>
          <View style={styles.profitItem}>
            <Text style={[styles.profitLabel, isDarkMode && styles.darkSubtitle]}>Profit/Unit:</Text>
            <Text style={[styles.profitValue, { color: getProfitColor(profitInfo.profitPerUnit) }]}>
              UGX {formatCurrency(profitInfo.profitPerUnit)}
            </Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={[styles.profitLabel, isDarkMode && styles.darkSubtitle]}>Margin:</Text>
            <Text style={[styles.marginValue, { color: getProfitColor(profitInfo.profitMargin) }]}>
              {profitInfo.profitMargin > 0 ? '+' : ''}{profitInfo.profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Product Actions */}
        <View style={styles.productActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditProduct(product)}
          >
            <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(product)}
          >
            <MaterialCommunityIcons name="trash-can" size={14} color="#FFFFFF" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading Products...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <MaterialCommunityIcons 
              name="package-variant" 
              size={20} 
              color={isDarkMode ? "#3B82F6" : "#2563EB"} 
            />
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              Stock Management
            </Text>
          </View>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            {products.length} products • Manage inventory
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, isDarkMode && styles.darkErrorCard]}>
            <View style={styles.errorContent}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        {/* Compact Stock Summary */}
        <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, isDarkMode && styles.darkText]}>
              {products.length}
            </Text>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
              Total
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#EF4444' }]}>
              {products.filter(p => p.quantity === 0).length}
            </Text>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
              Out of Stock
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#F59E0B' }]}>
              {products.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 10)).length}
            </Text>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
              Low Stock
            </Text>
          </View>
        </View>

        {/* Products List - Single Column */}
        <View style={styles.productsSection}>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name="package-variant" 
                size={40} 
                color={isDarkMode ? "#4B5563" : "#9CA3AF"} 
              />
              <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
                No Products Found
              </Text>
              <Text style={[styles.emptySubtitle, isDarkMode && styles.darkSubtitle]}>
                {error ? 'Failed to load products' : 'Start by adding your first product'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsList}>
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Product Modal */}
      <EditProductModal />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  darkErrorCard: {
    backgroundColor: '#451A1A',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  productsSection: {
    paddingHorizontal: 16,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  // Image Carousel Styles
  imageContainer: {
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  noImageContainer: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImageText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  imageCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  productHeader: {
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  productDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 12,
  },
  detailItem: {
    width: '48%',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  profitSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  profitItem: {
    flex: 1,
  },
  profitLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  profitValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  marginValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  darkModalContent: {
    backgroundColor: '#1F2937',
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
    fontWeight: 'bold',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StockTab;