import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import AddProducts from './AddProducts';
import MyProducts from './MyProducts';

const Products = ({ isDarkMode }) => {
  const { user, getAuthToken, API_BASE_URL } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('myProducts');
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [highlightedProduct, setHighlightedProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    measurementUnit: 'units',
    category: '',
    images: [],
    minOrderQuantity: '1',
    bulkDiscount: false,
    discountPercentage: '',
    tags: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Products API endpoint not found. Please check server configuration.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/products/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (files) => {
    setFormData(prev => ({
      ...prev,
      images: files
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'images') {
          formData.images.forEach(file => {
            formDataToSend.append('images', file);
          });
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const url = editingProduct 
        ? `${API_BASE_URL}/api/products/${editingProduct._id}`
        : `${API_BASE_URL}/api/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActiveTab('myProducts');
        setEditingProduct(null);
        resetForm();
        fetchProducts(); // Refresh the products list
        Alert.alert('Success', editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
      } else {
        throw new Error(data.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message);
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      quantity: '',
      measurementUnit: 'units',
      category: '',
      images: [],
      minOrderQuantity: '1',
      bulkDiscount: false,
      discountPercentage: '',
      tags: ''
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      measurementUnit: product.measurementUnit,
      category: product.category,
      images: [],
      minOrderQuantity: product.minOrderQuantity.toString(),
      bulkDiscount: product.bulkDiscount,
      discountPercentage: product.discountPercentage?.toString() || '',
      tags: product.tags?.join(', ') || ''
    });
    setActiveTab('addProduct');
  };

  const handleDelete = async (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) {
                throw new Error('No authentication token found');
              }
              
              const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              const data = await response.json();
              
              if (data.success) {
                fetchProducts(); // Refresh the products list
                Alert.alert('Success', 'Product deleted successfully!');
              } else {
                throw new Error(data.message || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const cancelForm = () => {
    setEditingProduct(null);
    resetForm();
    setActiveTab('myProducts');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading products...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDarkMode && styles.darkContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor={isDarkMode ? '#3B82F6' : '#3B82F6'}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              Product Management
            </Text>
            <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>
              Manage your product catalog and inventory
            </Text>
            {editingProduct && (
              <View style={[styles.editingBanner, isDarkMode && styles.darkEditingBanner]}>
                <Text style={styles.editingText}>
                  <Text style={styles.editingLabel}>Editing:</Text> {editingProduct.name}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingProduct(null);
              resetForm();
              setActiveTab('addProduct');
            }}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New Product</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={[styles.errorBanner, isDarkMode && styles.darkErrorBanner]}>
            <Feather name="alert-triangle" size={14} color="#DC2626" />
            <Text style={[styles.errorText, isDarkMode && styles.darkErrorText]}>
              {error}
            </Text>
          </View>
        )}

        {/* Tabs Navigation */}
        <View style={[styles.tabContainer, isDarkMode && styles.darkTabContainer]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'myProducts' && styles.activeTabButton,
              activeTab === 'myProducts' && isDarkMode && styles.darkActiveTabButton
            ]}
            onPress={() => {
              setActiveTab('myProducts');
              setEditingProduct(null);
            }}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'myProducts' ? styles.activeTabText : styles.inactiveTabText,
              isDarkMode && (activeTab === 'myProducts' ? styles.darkActiveTabText : styles.darkInactiveTabText)
            ]}>
              My Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'addProduct' && styles.activeTabButton,
              activeTab === 'addProduct' && isDarkMode && styles.darkActiveTabButton
            ]}
            onPress={() => setActiveTab('addProduct')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'addProduct' ? styles.activeTabText : styles.inactiveTabText,
              isDarkMode && (activeTab === 'addProduct' ? styles.darkActiveTabText : styles.darkInactiveTabText)
            ]}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'myProducts' ? (
            <MyProducts
              products={products}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              setShowCreateForm={() => setActiveTab('addProduct')}
              highlightedProduct={highlightedProduct}
              isDarkMode={isDarkMode}
            />
          ) : (
            <AddProducts
              formData={formData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              handleInputChange={handleInputChange}
              handleFileChange={handleFileChange}
              categories={categories}
              editingProduct={editingProduct}
              cancelForm={cancelForm}
              isDarkMode={isDarkMode}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150, // Increased padding for better keyboard avoidance
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  headerContent: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  editingBanner: {
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginTop: 6,
  },
  darkEditingBanner: {
    backgroundColor: '#1E3A8A',
  },
  editingText: {
    fontSize: 11,
    color: '#1E40AF',
  },
  editingLabel: {
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 6,
    gap: 6,
  },
  darkErrorBanner: {
    backgroundColor: '#7F1D1D',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  darkErrorText: {
    color: '#FCA5A5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  darkTabContainer: {
    backgroundColor: '#1F2937',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#3B82F6',
  },
  darkActiveTabButton: {
    backgroundColor: '#1D4ED8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inactiveTabText: {
    color: '#6B7280',
  },
  darkActiveTabText: {
    color: '#FFFFFF',
  },
  darkInactiveTabText: {
    color: '#9CA3AF',
  },
  tabContent: {
    minHeight: 400,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
});

export default Products;