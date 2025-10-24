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
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const withAuth = (WrappedComponent) => {
  return (props) => {
    const auth = useAuth();
    return <WrappedComponent {...props} auth={auth} />;
  };
};

class SystemStock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      certifiedOrders: [],
      loading: true,
      error: null,
      searchTerm: '',
      categoryFilter: 'all',
      currentPage: 1,
      itemsPerPage: 12,
      categories: [],
      total: 0,
      totalPages: 0,
      statistics: {
        totalOrders: 0,
        totalValue: 0
      },
      syncing: false,
      productImages: {},
      imageLoading: {},
      orderImageIndices: {},
      refreshing: false
    };
  }

  componentDidMount() {
    this.fetchCertifiedOrders();
  }

  fetchCertifiedOrders = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const { auth } = this.props;
      const token = await auth.getAuthToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const { searchTerm, categoryFilter, currentPage, itemsPerPage } = this.state;
      
      const response = await axios.get(`${auth.API_BASE_URL}/api/wholesaler-orders`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          status: 'certified',
          search: searchTerm || undefined
        }
      });

      if (response.data.success) {
        const orders = response.data.orders || [];
        const categories = this.extractCategories(orders);
        const orderImageIndices = {};
        
        orders.forEach(order => {
          orderImageIndices[order._id] = 0;
        });
        
        this.setState({
          certifiedOrders: orders,
          categories,
          totalPages: response.data.pagination?.totalPages || 0,
          total: response.data.pagination?.totalOrders || 0,
          loading: false,
          refreshing: false,
          orderImageIndices,
          statistics: {
            totalOrders: response.data.pagination?.totalOrders || 0,
            totalValue: this.calculateTotalValue(orders)
          }
        });

        this.fetchAllProductImages(orders);
      } else {
        throw new Error(response.data.message || 'Failed to fetch certified orders');
      }
    } catch (error) {
      console.error('Error fetching certified orders:', error);
      this.setState({
        error: error.response?.data?.message || error.message || 'Failed to fetch certified orders',
        loading: false,
        refreshing: false,
        certifiedOrders: []
      });
    }
  };

  extractCategories = (orders) => {
    const categories = new Set();
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.product?.category) {
          categories.add(item.product.category);
        }
      });
    });
    return Array.from(categories);
  };

  calculateTotalValue = (orders) => {
    return orders.reduce((total, order) => total + (order.finalAmount || 0), 0);
  };

  fetchAllProductImages = async (orders) => {
    const productIds = new Set();
    const productImages = { ...this.state.productImages };
    const imageLoading = { ...this.state.imageLoading };

    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.product?._id) {
          productIds.add(item.product._id);
        }
      });
    });

    for (const productId of productIds) {
      if (productImages[productId] || imageLoading[productId]) continue;

      imageLoading[productId] = true;
      this.setState({ imageLoading });

      try {
        const orderWithProduct = orders.find(order => 
          order.items?.some(item => item.product?._id === productId)
        );
        
        const productFromOrder = orderWithProduct?.items?.find(item => 
          item.product?._id === productId
        )?.product;

        if (productFromOrder?.images?.length > 0) {
          productImages[productId] = {
            images: productFromOrder.images,
            name: productFromOrder.name,
            category: productFromOrder.category
          };
          continue;
        }

        const { auth } = this.props;
        const token = await auth.getAuthToken();
        
        try {
          const response = await axios.get(`${auth.API_BASE_URL}/api/supplier/products/${productId}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data.success && response.data.product) {
            const product = response.data.product;
            productImages[productId] = {
              images: product.images || [],
              name: product.name,
              category: product.category
            };
            continue;
          }
        } catch (supplierError) {
          console.log(`Supplier API failed for product ${productId}`);
        }

        try {
          const response = await axios.get(`${auth.API_BASE_URL}/api/products/${productId}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.data.success && response.data.product) {
            const product = response.data.product;
            productImages[productId] = {
              images: product.images || [],
              name: product.name,
              category: product.category
            };
            continue;
          }
        } catch (productError) {
          console.log(`Products API also failed for product ${productId}`);
        }

        if (productFromOrder) {
          productImages[productId] = {
            images: [],
            name: productFromOrder.name || 'Unknown Product',
            category: productFromOrder.category || 'Unknown'
          };
        } else {
          productImages[productId] = {
            images: [],
            name: 'Unknown Product',
            category: 'Unknown'
          };
        }

      } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
        productImages[productId] = {
          images: [],
          name: 'Error Loading Product',
          category: 'Unknown'
        };
      } finally {
        delete imageLoading[productId];
      }
    }

    this.setState({ productImages, imageLoading });
  };

  getProductData = (productId) => {
    return this.state.productImages[productId] || {
      images: [],
      name: 'Loading...',
      category: 'Unknown'
    };
  };

  getProductImage = (productId, index = 0) => {
    const productData = this.getProductData(productId);
    if (productData.images && productData.images.length > 0) {
      const imageIndex = Math.min(index, productData.images.length - 1);
      const image = productData.images[imageIndex];
      return typeof image === 'string' ? image : image.url;
    }
    return null;
  };

  getProductName = (productId) => {
    return this.getProductData(productId).name;
  };

  getProductCategory = (productId) => {
    return this.getProductData(productId).category;
  };

  nextImage = (orderId) => {
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) return;

    const productData = this.getProductData(firstProductId);
    if (productData.images.length <= 1) return;

    this.setState(prevState => {
      const currentIndex = prevState.orderImageIndices[orderId] || 0;
      const nextIndex = (currentIndex + 1) % productData.images.length;
      
      return {
        orderImageIndices: {
          ...prevState.orderImageIndices,
          [orderId]: nextIndex
        }
      };
    });
  };

  prevImage = (orderId) => {
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) return;

    const productData = this.getProductData(firstProductId);
    if (productData.images.length <= 1) return;

    this.setState(prevState => {
      const currentIndex = prevState.orderImageIndices[orderId] || 0;
      const prevIndex = currentIndex === 0 ? productData.images.length - 1 : currentIndex - 1;
      
      return {
        orderImageIndices: {
          ...prevState.orderImageIndices,
          [orderId]: prevIndex
        }
      };
    });
  };

  getCurrentImageIndex = (orderId) => {
    return this.state.orderImageIndices[orderId] || 0;
  };

  getTotalImages = (orderId) => {
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return 0;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) return 0;

    const productData = this.getProductData(firstProductId);
    return productData.images ? productData.images.length : 0;
  };

  renderProductImage = (orderId) => {
    const order = this.state.certifiedOrders.find(o => o._id === orderId);
    if (!order) return null;

    const firstProductId = order.items?.[0]?.product?._id;
    if (!firstProductId) {
      return (
        <View style={[styles.placeholderImage, this.props.isDarkMode && styles.darkPlaceholderImage]}>
          <Ionicons name="image-outline" size={20} color="#9CA3AF" />
        </View>
      );
    }

    const productData = this.getProductData(firstProductId);
    const currentIndex = this.getCurrentImageIndex(orderId);
    const totalImages = this.getTotalImages(orderId);
    const imageUrl = this.getProductImage(firstProductId, currentIndex);
    
    if (imageUrl) {
      return (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {totalImages > 1 && (
            <>
              <TouchableOpacity
                onPress={() => this.prevImage(orderId)}
                style={styles.navButton}
              >
                <Ionicons name="chevron-back" size={12} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => this.nextImage(orderId)}
                style={[styles.navButton, styles.navButtonRight]}
              >
                <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
          
          {totalImages > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentIndex + 1} / {totalImages}
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    return (
      <View style={[styles.placeholderImage, this.props.isDarkMode && styles.darkPlaceholderImage]}>
        <Ionicons name="image-outline" size={20} color="#9CA3AF" />
      </View>
    );
  };

  syncToSystemStock = async () => {
    try {
      this.setState({ syncing: true });
      const { auth } = this.props;
      const token = await auth.getAuthToken();
      
      const response = await axios.post(`${auth.API_BASE_URL}/api/system-stocks/sync`, {}, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        Alert.alert(
          'Sync Completed', 
          `Created: ${response.data.created}, Skipped: ${response.data.skipped}`
        );
        this.fetchCertifiedOrders();
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing to system stock:', error);
      Alert.alert('Sync Failed', error.response?.data?.message || error.message);
    } finally {
      this.setState({ syncing: false });
    }
  };

  handleSearch = (text) => {
    this.setState({ searchTerm: text }, () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.setState({ currentPage: 1 }, this.fetchCertifiedOrders);
      }, 500);
    });
  };

  handleCategoryFilter = (value) => {
    this.setState({ 
      categoryFilter: value,
      currentPage: 1 
    }, this.fetchCertifiedOrders);
  };

  handlePageChange = (page) => {
    this.setState({ currentPage: page }, this.fetchCertifiedOrders);
  };

  handleRetry = () => {
    this.fetchCertifiedOrders();
  };

  onRefresh = () => {
    this.setState({ refreshing: true }, this.fetchCertifiedOrders);
  };

  getPrimaryProduct = (order) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return { name: 'No Products', category: 'Unknown' };
    
    const productId = firstItem.product?._id;
    return {
      name: this.getProductName(productId),
      category: this.getProductCategory(productId)
    };
  };

  calculateTotalQuantity = (order) => {
    return order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
  };

  render() {
    const { 
      certifiedOrders,
      loading, 
      error,
      searchTerm, 
      categoryFilter, 
      categories,
      currentPage, 
      totalPages,
      total,
      statistics,
      syncing,
      refreshing
    } = this.state;

    const { isDarkMode } = this.props;

    if (loading) {
      return (
        <View style={[styles.loadingContainer, isDarkMode && styles.darkLoadingContainer]}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading certified orders...
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
                System Stock
              </Text>
              <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
                {total} certified orders
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={this.syncToSystemStock}
                disabled={syncing}
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              >
                <Ionicons 
                  name={syncing ? "sync" : "sync-outline"} 
                  size={14} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Compact Summary Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#3B82F6" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                {total}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Orders</Text>
            </View>

            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="bar-chart-outline" size={12} color="#10B981" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                UGX {(statistics.totalValue / 1000).toFixed(0)}K
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Value</Text>
            </View>

            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="cube-outline" size={12} color="#8B5CF6" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                {certifiedOrders.reduce((total, order) => total + this.calculateTotalQuantity(order), 0)}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Items</Text>
            </View>

            <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
              <Ionicons name="server-outline" size={12} color="#F59E0B" />
              <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
                {total}
              </Text>
              <Text style={[styles.statLabel, isDarkMode && styles.darkSubtext]}>Ready</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
            <Ionicons name="search" size={12} color={isDarkMode ? "#9CA3AF" : "#6B7280"} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
              placeholder="Search certified orders..."
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

          {/* Orders Grid */}
          {certifiedOrders.length > 0 ? (
            <View style={styles.ordersGrid}>
              {certifiedOrders.map(order => {
                const primaryProduct = this.getPrimaryProduct(order);
                const totalQuantity = this.calculateTotalQuantity(order);
                
                return (
                  <View 
                    key={order._id} 
                    style={[styles.orderCard, isDarkMode && styles.darkOrderCard]}
                  >
                    {/* Product Image */}
                    <View style={styles.imageSection}>
                      {this.renderProductImage(order._id)}
                      <View style={styles.certifiedBadge}>
                        <Text style={styles.certifiedBadgeText}>Certified</Text>
                      </View>
                      {primaryProduct.category && primaryProduct.category !== 'Unknown' && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{primaryProduct.category}</Text>
                        </View>
                      )}
                    </View>

                    {/* Order Details */}
                    <View style={styles.orderInfo}>
                      <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
                        {primaryProduct.name}
                      </Text>
                      <Text style={[styles.orderNumber, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
                        Order: {order.orderNumber}
                      </Text>

                      {/* Order Information */}
                      <View style={styles.orderDetails}>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Supplier:</Text>
                          <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={1}>
                            {order.supplier?.businessName || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Items:</Text>
                          <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                            {totalQuantity}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Value:</Text>
                          <Text style={[styles.orderValue, isDarkMode && styles.darkText]}>
                            UGX {(order.finalAmount || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Products List */}
                      <View style={[styles.productsSection, isDarkMode && styles.darkProductsSection]}>
                        <Text style={[styles.productsTitle, isDarkMode && styles.darkText]}>
                          Products:
                        </Text>
                        <ScrollView style={styles.productsList} nestedScrollEnabled>
                          {order.items?.slice(0, 3).map((item, index) => {
                            const productId = item.product?._id;
                            return (
                              <View key={index} style={styles.productItem}>
                                <Text style={[styles.productItemName, isDarkMode && styles.darkText]} numberOfLines={1}>
                                  {this.getProductName(productId)}
                                </Text>
                                <Text style={[styles.productItemQuantity, isDarkMode && styles.darkText]}>
                                  {item.quantity} {item.product?.measurementUnit || 'units'}
                                </Text>
                              </View>
                            );
                          })}
                          {order.items && order.items.length > 3 && (
                            <Text style={[styles.moreItems, isDarkMode && styles.darkSubtext]}>
                              +{order.items.length - 3} more
                            </Text>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyState, isDarkMode && styles.darkEmptyState]}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#9CA3AF" />
              <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
                No certified orders
              </Text>
              <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtext]}>
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try adjusting your search' 
                  : 'No certified orders yet'
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#6B7280',
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

  // Orders Grid
  ordersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  orderCard: {
    width: (width - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  darkOrderCard: {
    backgroundColor: '#1F2937',
  },
  imageSection: {
    position: 'relative',
    height: 80,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
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
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -6 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 2,
    left: 4,
  },
  navButtonRight: {
    left: 'auto',
    right: 4,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '500',
  },
  certifiedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  certifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
  },
  orderInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 6,
  },
  orderDetails: {
    gap: 3,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginLeft: 4,
    textAlign: 'right',
  },
  orderValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  productsSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  darkProductsSection: {
    borderTopColor: '#374151',
  },
  productsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 3,
  },
  productsList: {
    maxHeight: 48,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  productItemName: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  productItemQuantity: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  moreItems: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 1,
  },

  // Empty State
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

  // Text Styles
  darkText: {
    color: '#F9FAFB',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
});

export default withAuth(SystemStock);