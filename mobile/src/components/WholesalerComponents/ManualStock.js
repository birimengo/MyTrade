import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Wrap class component with auth context
const withAuth = (WrappedComponent) => {
  return (props) => {
    const auth = useAuth();
    return <WrappedComponent {...props} auth={auth} />;
  };
};

class ManualStock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      products: [],
      loading: true,
      error: null,
      searchTerm: '',
      categoryFilter: 'all',
      currentPage: 1,
      itemsPerPage: 12,
      categories: [],
      total: 0,
      totalPages: 0,
      refreshing: false,
      
      // Edit modal state
      showEditModal: false,
      editingProduct: null,
      editFormData: {
        name: '',
        price: '',
        quantity: '',
        measurementUnit: 'units',
        category: '',
        description: '',
        minOrderQuantity: '1',
        bulkDiscount: false,
        discountPercentage: '',
        tags: ''
      },
      saving: false,
      
      // Image management
      uploadingImages: false,
      newImages: []
    };
  }

  componentDidMount() {
    this.fetchProducts();
    this.fetchCategories();
  }

  fetchProducts = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const { auth } = this.props;
      const token = await auth.getAuthToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const { searchTerm, categoryFilter, currentPage, itemsPerPage } = this.state;
      
      const response = await axios.get(`${auth.API_BASE_URL}/api/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: searchTerm || undefined,
          includeCertified: false // Only show manually created products
        }
      });

      if (response.data.success) {
        this.setState({
          products: response.data.products || [],
          totalPages: response.data.totalPages || 0,
          total: response.data.total || 0,
          loading: false,
          refreshing: false
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      this.setState({
        error: error.response?.data?.message || error.message || 'Failed to fetch products',
        loading: false,
        refreshing: false,
        products: []
      });
    }
  };

  fetchCategories = async () => {
    try {
      const { auth } = this.props;
      const token = await auth.getAuthToken();
      const response = await axios.get(`${auth.API_BASE_URL}/api/products/categories`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        this.setState({ categories: response.data.categories || [] });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      this.setState({ categories: [] });
    }
  };

  // Edit Product Functions
  handleEditProduct = (product) => {
    this.setState({
      editingProduct: product,
      showEditModal: true,
      editFormData: {
        name: product.name || '',
        price: product.price?.toString() || '',
        quantity: product.quantity?.toString() || '',
        measurementUnit: product.measurementUnit || 'units',
        category: product.category || '',
        description: product.description || '',
        minOrderQuantity: product.minOrderQuantity?.toString() || '1',
        bulkDiscount: product.bulkDiscount || false,
        discountPercentage: product.discountPercentage?.toString() || '',
        tags: product.tags?.join(', ') || ''
      },
      newImages: []
    });
  };

  handleEditInputChange = (field, value) => {
    this.setState(prevState => ({
      editFormData: {
        ...prevState.editFormData,
        [field]: value
      }
    }));
  };

  handleSaveProduct = async () => {
    const { editingProduct, editFormData } = this.state;
    
    if (!editingProduct) return;

    // Basic validation
    if (!editFormData.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    if (!editFormData.price || parseFloat(editFormData.price) <= 0) {
      Alert.alert('Error', 'Valid price is required');
      return;
    }

    if (!editFormData.quantity || parseInt(editFormData.quantity) < 0) {
      Alert.alert('Error', 'Valid quantity is required');
      return;
    }

    try {
      this.setState({ saving: true });
      
      const { auth } = this.props;
      const token = await auth.getAuthToken();
      
      const formData = new FormData();
      
      // Append all form fields
      Object.keys(editFormData).forEach(key => {
        if (key === 'images') {
          // Handle image uploads if any
          this.state.newImages.forEach(file => {
            formData.append('images', file);
          });
        } else {
          formData.append(key, editFormData[key]);
        }
      });

      const response = await axios.put(
        `${auth.API_BASE_URL}/api/products/${editingProduct._id}`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Product updated successfully!');
        this.setState({ 
          showEditModal: false, 
          editingProduct: null,
          saving: false,
          newImages: []
        });
        this.fetchProducts(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update product');
      this.setState({ saving: false });
    }
  };

  closeEditModal = () => {
    this.setState({
      showEditModal: false,
      editingProduct: null,
      saving: false,
      newImages: []
    });
  };

  // Delete product
  handleDeleteProduct = async (product) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { auth } = this.props;
              const token = await auth.getAuthToken();
              
              const response = await axios.delete(`${auth.API_BASE_URL}/api/products/${product._id}`, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.data.success) {
                Alert.alert('Success', 'Product deleted successfully!');
                this.fetchProducts();
              } else {
                throw new Error(response.data.message || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  // Stock calculation functions
  calculateStockValue = () => {
    const { products } = this.state;
    if (!products || !Array.isArray(products)) {
      return 0;
    }
    return products.reduce((total, product) => {
      const price = Number(product.price) || 0;
      const quantity = Number(product.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  };

  getLowStockProducts = () => {
    const { products } = this.state;
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return products.filter(product => {
      const quantity = Number(product.quantity) || 0;
      const originalQuantity = Number(product.originalStockQuantity) || quantity;
      return (quantity / originalQuantity) <= 0.5; // 50% or less stock remaining
    });
  };

  getCriticallyLowStockProducts = () => {
    const { products } = this.state;
    if (!products || !Array.isArray(products)) {
      return [];
    }
    return products.filter(product => {
      const quantity = Number(product.quantity) || 0;
      const originalQuantity = Number(product.originalStockQuantity) || quantity;
      return (quantity / originalQuantity) <= 0.1 || quantity <= 10; // 10% or less stock remaining or quantity <= 10
    });
  };

  // Search and filter functions
  handleSearch = (text) => {
    this.setState({ searchTerm: text }, () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.setState({ currentPage: 1 }, this.fetchProducts);
      }, 500);
    });
  };

  handleCategoryFilter = (value) => {
    this.setState({ 
      categoryFilter: value,
      currentPage: 1 
    }, this.fetchProducts);
  };

  handlePageChange = (page) => {
    this.setState({ currentPage: page }, this.fetchProducts);
  };

  handleRetry = () => {
    this.fetchProducts();
  };

  onRefresh = () => {
    this.setState({ refreshing: true }, this.fetchProducts);
  };

  // Stock status functions
  calculateStockPercentage = (product) => {
    if (!product.originalStockQuantity || product.originalStockQuantity === 0) {
      return 100;
    }
    return (product.quantity / product.originalStockQuantity) * 100;
  };

  getStockStatusColor = (percentage) => {
    if (percentage <= 10) return '#EF4444';
    if (percentage <= 50) return '#F59E0B';
    return '#10B981';
  };

  getStockStatusText = (percentage) => {
    if (percentage <= 10) return 'Critical';
    if (percentage <= 50) return 'Low';
    return 'Good';
  };

  // Render Edit Modal
  renderEditModal = () => {
    const { showEditModal, editingProduct, editFormData, saving } = this.state;
    const { categories } = this.state;
    const { isDarkMode } = this.props; // Get from props

    if (!showEditModal || !editingProduct) return null;

    return (
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={this.closeEditModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                Edit Product
              </Text>
              <TouchableOpacity 
                onPress={this.closeEditModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Product Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Product Name</Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.darkInput]}
                  value={editFormData.name}
                  onChangeText={(text) => this.handleEditInputChange('name', text)}
                  placeholder="Enter product name"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>

              {/* Price and Quantity */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>Price (UGX)</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    value={editFormData.price}
                    onChangeText={(text) => this.handleEditInputChange('price', text)}
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>Quantity</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    value={editFormData.quantity}
                    onChangeText={(text) => this.handleEditInputChange('quantity', text)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Category and Unit */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>Category</Text>
                  <View style={[styles.pickerContainer, isDarkMode && styles.darkPickerContainer]}>
                    <TextInput
                      style={[styles.pickerInput, isDarkMode && styles.darkText]}
                      value={editFormData.category}
                      onChangeText={(text) => this.handleEditInputChange('category', text)}
                      placeholder="Select category"
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>Unit</Text>
                  <View style={[styles.pickerContainer, isDarkMode && styles.darkPickerContainer]}>
                    <TextInput
                      style={[styles.pickerInput, isDarkMode && styles.darkText]}
                      value={editFormData.measurementUnit}
                      onChangeText={(text) => this.handleEditInputChange('measurementUnit', text)}
                      placeholder="units"
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Description</Text>
                <TextInput
                  style={[styles.textArea, isDarkMode && styles.darkInput]}
                  value={editFormData.description}
                  onChangeText={(text) => this.handleEditInputChange('description', text)}
                  placeholder="Product description..."
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Additional Fields */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>Min Order Qty</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    value={editFormData.minOrderQuantity}
                    onChangeText={(text) => this.handleEditInputChange('minOrderQuantity', text)}
                    placeholder="1"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, isDarkMode && styles.darkText]}>Discount %</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    value={editFormData.discountPercentage}
                    onChangeText={(text) => this.handleEditInputChange('discountPercentage', text)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Tags */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Tags (comma separated)</Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.darkInput]}
                  value={editFormData.tags}
                  onChangeText={(text) => this.handleEditInputChange('tags', text)}
                  placeholder="tag1, tag2, tag3"
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalActions, isDarkMode && styles.darkModalActions]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, isDarkMode && styles.darkCancelButton]}
                onPress={this.closeEditModal}
                disabled={saving}
              >
                <Text style={[styles.cancelButtonText, isDarkMode && styles.darkCancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={this.handleSaveProduct}
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

  render() {
    const { 
      products,
      loading, 
      error,
      searchTerm, 
      categoryFilter, 
      categories,
      currentPage, 
      totalPages,
      total,
      refreshing
    } = this.state;

    const { isDarkMode } = this.props; // Get from props

    if (loading) {
      return (
        <View style={[styles.loadingContainer, isDarkMode && styles.darkLoadingContainer]}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading products...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.errorContainer, isDarkMode && styles.darkErrorContainer]}>
          <Ionicons name="warning-outline" size={32} color="#EF4444" />
          <Text style={[styles.errorTitle, isDarkMode && styles.darkText]}>
            Failed to Load
          </Text>
          <Text style={[styles.errorMessage, isDarkMode && styles.darkSubtext]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={this.handleRetry}
          >
            <Ionicons name="refresh" size={14} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const stockValue = this.calculateStockValue();
    const lowStockCount = this.getLowStockProducts().length;
    const criticallyLowCount = this.getCriticallyLowStockProducts().length;

    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={this.onRefresh}
              colors={['#3B82F6']}
              tintColor={isDarkMode ? '#3B82F6' : '#3B82F6'}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, isDarkMode && styles.darkText]}>
                Stock Management
              </Text>
              <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
                {total} products
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={this.handleRetry}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Compact Summary Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="cube-outline" size={12} color="#3B82F6" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                {total}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Products</Text>
            </View>

            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="bar-chart-outline" size={12} color="#10B981" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                UGX {(stockValue / 1000).toFixed(0)}K
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Value</Text>
            </View>

            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="notifications-outline" size={12} color="#F59E0B" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                {lowStockCount}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Low</Text>
            </View>

            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="warning-outline" size={12} color="#EF4444" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                {criticallyLowCount}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Critical</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
            <Ionicons name="search" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
              placeholder="Search products..."
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              value={searchTerm}
              onChangeText={this.handleSearch}
            />
          </View>

          {/* Category Filter Buttons */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                categoryFilter === 'all' && styles.activeFilterChip,
                isDarkMode && styles.darkFilterChip,
                categoryFilter === 'all' && isDarkMode && styles.darkActiveFilterChip
              ]}
              onPress={() => this.handleCategoryFilter('all')}
            >
              <Text style={[
                styles.filterChipText,
                categoryFilter === 'all' && styles.activeFilterChipText,
                isDarkMode && styles.darkFilterChipText,
                categoryFilter === 'all' && isDarkMode && styles.darkActiveFilterChipText
              ]}>
                All
              </Text>
            </TouchableOpacity>
            
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  categoryFilter === category && styles.activeFilterChip,
                  isDarkMode && styles.darkFilterChip,
                  categoryFilter === category && isDarkMode && styles.darkActiveFilterChip
                ]}
                onPress={() => this.handleCategoryFilter(category)}
              >
                <Text style={[
                  styles.filterChipText,
                  categoryFilter === category && styles.activeFilterChipText,
                  isDarkMode && styles.darkFilterChipText,
                  categoryFilter === category && isDarkMode && styles.darkActiveFilterChipText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Products Grid */}
          {products.length > 0 ? (
            <View style={styles.productsGrid}>
              {products.map(product => {
                const stockPercentage = this.calculateStockPercentage(product);
                const statusColor = this.getStockStatusColor(stockPercentage);
                const statusText = this.getStockStatusText(stockPercentage);
                const isLowStock = stockPercentage <= 50;
                const isCriticallyLow = stockPercentage <= 10;

                return (
                  <View 
                    key={product._id} 
                    style={[
                      styles.productCard, 
                      isDarkMode && styles.darkProductCard,
                      isCriticallyLow && styles.criticalCard,
                      isLowStock && styles.lowStockCard
                    ]}
                  >
                    {/* Product Image */}
                    <View style={styles.imageContainer}>
                      {product.images && product.images.length > 0 ? (
                        <Image 
                          source={{ uri: product.images[0].url }} 
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
                          <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                        </View>
                      )}
                      
                      {/* Status Badge */}
                      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusBadgeText}>{statusText}</Text>
                      </View>
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
                        {product.name}
                      </Text>
                      
                      {/* Price and Quantity */}
                      <View style={styles.priceQuantityRow}>
                        <Text style={[styles.productPrice, isDarkMode && styles.darkText]}>
                          UGX {(product.price || 0).toLocaleString()}
                        </Text>
                        <Text style={[
                          styles.productQuantity,
                          isCriticallyLow ? styles.criticalQuantity : 
                          isLowStock ? styles.lowQuantity : 
                          styles.normalQuantity
                        ]}>
                          {product.quantity || 0}
                        </Text>
                      </View>

                      {/* Stock Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { 
                                width: `${Math.max(stockPercentage, 5)}%`,
                                backgroundColor: statusColor
                              }
                            ]} 
                          />
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => this.handleEditProduct(product)}
                          style={[styles.actionButton, styles.editButton]}
                        >
                          <Ionicons name="create-outline" size={12} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => this.handleDeleteProduct(product)}
                          style={[styles.actionButton, styles.deleteButton]}
                        >
                          <Ionicons name="trash-outline" size={12} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyState, isDarkMode && styles.darkEmptyState]}>
              <Ionicons name="cube-outline" size={40} color="#9CA3AF" />
              <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
                No products found
              </Text>
              <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtext]}>
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Add your first product'
                }
              </Text>
            </View>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <View style={styles.paginationButtons}>
                <TouchableOpacity
                  onPress={() => this.handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={[
                    styles.paginationButton,
                    currentPage === 1 && styles.disabledButton
                  ]}
                >
                  <Text style={styles.paginationButtonText}>
                    Prev
                  </Text>
                </TouchableOpacity>
                
                <Text style={[styles.paginationInfo, isDarkMode && styles.darkSubtext]}>
                  Page {currentPage} of {totalPages}
                </Text>
                
                <TouchableOpacity
                  onPress={() => this.handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={[
                    styles.paginationButton,
                    currentPage === totalPages && styles.disabledButton
                  ]}
                >
                  <Text style={styles.paginationButtonText}>
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Edit Product Modal */}
        {this.renderEditModal()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  scrollContent: {
    paddingBottom: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 8,
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 48,
  },
  darkStatCard: {
    backgroundColor: '#1F2937',
  },
  statNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 2,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 32,
  },
  darkSearchContainer: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    color: '#374151',
    padding: 0,
    height: '100%',
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },

  // Filter Chips
  filterScroll: {
    marginBottom: 12,
    height: 28,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
    height: 24,
    justifyContent: 'center',
  },
  darkFilterChip: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  activeFilterChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  darkActiveFilterChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  darkFilterChipText: {
    color: '#D1D5DB',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  darkActiveFilterChipText: {
    color: '#FFFFFF',
  },

  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  productCard: {
    width: (width - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkProductCard: {
    backgroundColor: '#1F2937',
  },
  criticalCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  lowStockCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  imageContainer: {
    position: 'relative',
    height: 80,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkPlaceholderImage: {
    backgroundColor: '#374151',
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  productInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  priceQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  productQuantity: {
    fontSize: 11,
    fontWeight: '600',
  },
  normalQuantity: {
    color: '#10B981',
  },
  lowQuantity: {
    color: '#F59E0B',
  },
  criticalQuantity: {
    color: '#EF4444',
  },
  progressContainer: {
    marginBottom: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: '#DBEAFE',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  darkEmptyState: {
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Pagination
  pagination: {
    marginTop: 8,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  paginationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  paginationInfo: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  darkLoadingContainer: {
    backgroundColor: '#111827',
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  darkErrorContainer: {
    backgroundColor: '#111827',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 12,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
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
  darkModalHeader: {
    borderBottomColor: '#374151',
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
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  darkModalActions: {
    borderTopColor: '#374151',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  darkCancelButtonText: {
    color: '#D1D5DB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Form Styles
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  darkPickerContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  pickerInput: {
    padding: 10,
    fontSize: 14,
    color: '#374151',
  },

  // Text Styles
  darkText: {
    color: '#F9FAFB',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
});

export default withAuth(ManualStock);