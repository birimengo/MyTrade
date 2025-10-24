import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MyProducts = ({ 
  products, 
  handleEdit, 
  handleDelete, 
  setShowCreateForm, 
  highlightedProduct,
  isDarkMode 
}) => {
  const [visibleProducts, setVisibleProducts] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const highlightedRef = useRef(null);

  useEffect(() => {
    if (highlightedProduct && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current.measure((x, y, width, height, pageX, pageY) => {
          // Scroll to the highlighted product
          // This would need to be implemented with a ScrollView ref
        });
      }, 300);
    }
  }, [highlightedProduct]);

  const toggleVisibility = (productId) => {
    setVisibleProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const navigateImage = (productId, direction) => {
    setCurrentImageIndex(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p._id === productId);
      const totalImages = product?.images?.length || 0;
      
      if (totalImages <= 1) return prev;
      
      let newIndex;
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % totalImages;
      } else {
        newIndex = (currentIndex - 1 + totalImages) % totalImages;
      }
      
      return {
        ...prev,
        [productId]: newIndex
      };
    });
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(productId)
        }
      ]
    );
  };

  if (products.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && styles.darkEmptyContainer]}>
        <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
        <Text style={[styles.emptyTitle, isDarkMode && styles.darkText]}>
          No products yet
        </Text>
        <Text style={[styles.emptyMessage, isDarkMode && styles.darkSubtext]}>
          Get started by adding your first product to your catalog.
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreateForm(true)}
          style={styles.addProductButton}
        >
          <Text style={styles.addProductButtonText}>Add Your First Product</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.productCount, isDarkMode && styles.darkSubtext]}>
          Showing {products.length} product{products.length !== 1 ? 's' : ''}
        </Text>
        {highlightedProduct && (
          <View style={styles.highlightedBadge}>
            <Text style={styles.highlightedBadgeText}>
              Product selected for action
            </Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.productsGrid}
        contentContainerStyle={styles.productsGridContent}
        showsVerticalScrollIndicator={false}
      >
        {products.map(product => {
          const isVisible = visibleProducts[product._id] !== false;
          const currentIndex = currentImageIndex[product._id] || 0;
          const totalImages = product.images?.length || 0;
          const currentImage = product.images?.[currentIndex]?.url;
          const isHighlighted = product._id === highlightedProduct;

          return (
            <View 
              key={product._id} 
              ref={isHighlighted ? highlightedRef : null}
              style={[
                styles.productCard,
                isDarkMode && styles.darkProductCard,
                isHighlighted && styles.highlightedCard
              ]}
            >
              {/* Product Image with Navigation */}
              <View style={styles.imageContainer}>
                {isVisible ? (
                  <>
                    {currentImage ? (
                      <View style={styles.imageWrapper}>
                        <Image
                          source={{ uri: currentImage }}
                          style={styles.productImage}
                          resizeMode="contain"
                        />
                        
                        {/* Image Navigation Arrows */}
                        {totalImages > 1 && (
                          <>
                            <TouchableOpacity
                              onPress={() => navigateImage(product._id, 'prev')}
                              style={styles.navButton}
                            >
                              <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              onPress={() => navigateImage(product._id, 'next')}
                              style={[styles.navButton, styles.navButtonRight]}
                            >
                              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </>
                        )}
                        
                        {/* Image Counter */}
                        {totalImages > 1 && (
                          <View style={styles.imageCounter}>
                            <Text style={styles.imageCounterText}>
                              {currentIndex + 1} / {totalImages}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
                    <Ionicons name="eye-off-outline" size={32} color="#9CA3AF" />
                  </View>
                )}
                
                {/* Visibility Toggle Button */}
                <TouchableOpacity
                  onPress={() => toggleVisibility(product._id)}
                  style={[styles.visibilityButton, isDarkMode && styles.darkVisibilityButton]}
                >
                  <Ionicons 
                    name={isVisible ? "eye-outline" : "eye-off-outline"} 
                    size={16} 
                    color={isVisible ? (isDarkMode ? "#D1D5DB" : "#374151") : "#6B7280"} 
                  />
                </TouchableOpacity>

                {/* Highlight Indicator */}
                {isHighlighted && (
                  <View style={styles.highlightIndicator}>
                    <Text style={styles.highlightIndicatorText}>Selected</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View style={styles.productInfo}>
                <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
                  {product.name}
                </Text>
                
                <Text style={[styles.productDescription, isDarkMode && styles.darkSubtext]} numberOfLines={2}>
                  {product.description}
                </Text>

                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Price:</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                      UGX {product.price?.toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Stock:</Text>
                    <Text style={[
                      styles.stockQuantity,
                      product.quantity > 10 ? styles.goodStock : 
                      product.quantity > 0 ? styles.lowStock : 
                      styles.criticalStock
                    ]}>
                      {product.quantity} {product.measurementUnit}
                    </Text>
                  </View>

                  {product.minOrderQuantity > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Min Order:</Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.darkSubtext]}>
                        {product.minOrderQuantity} {product.measurementUnit}
                      </Text>
                    </View>
                  )}

                  {product.bulkDiscount && product.discountPercentage > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtext]}>Bulk Discount:</Text>
                      <Text style={styles.discountValue}>
                        {product.discountPercentage}% off
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Product Actions */}
              <View style={[styles.actions, isDarkMode && styles.darkActions]}>
                <TouchableOpacity
                  onPress={() => handleEdit(product)}
                  style={[styles.actionButton, styles.editButton]}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteProduct(product._id)}
                  style={[styles.actionButton, styles.deleteButton]}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  productCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  highlightedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  highlightedBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  productsGrid: {
    flex: 1,
  },
  productsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  productCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkProductCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    height: 120,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -8 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
    left: 8,
  },
  navButtonRight: {
    left: 'auto',
    right: 8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  placeholderImage: {
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkPlaceholderImage: {
    backgroundColor: '#374151',
  },
  visibilityButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  darkVisibilityButton: {
    backgroundColor: 'rgba(31,41,55,0.9)',
  },
  highlightIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  highlightIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  stockQuantity: {
    fontSize: 11,
    fontWeight: '600',
  },
  goodStock: {
    color: '#10B981',
  },
  lowStock: {
    color: '#F59E0B',
  },
  criticalStock: {
    color: '#EF4444',
  },
  discountValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  darkActions: {
    borderTopColor: '#374151',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  darkEmptyContainer: {
    backgroundColor: '#1F2937',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  addProductButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addProductButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
});

export default MyProducts;