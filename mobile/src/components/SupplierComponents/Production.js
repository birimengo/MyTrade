// src/components/SupplierComponents/Production.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import * as ImagePicker from 'expo-image-picker';
import { 
  Ionicons, 
  Feather, 
  MaterialIcons,
  FontAwesome5 
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const Production = ({ isDarkMode }) => {
  const { user, token } = useAuth();
  
  // States
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    totalStockValue: 0,
    inProductionCount: 0,
    readyCount: 0,
    lowStockCount: 0,
    averageProfitMargin: 0,
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [profitMargin, setProfitMargin] = useState(0);
  const [profitAmount, setProfitAmount] = useState(0);
  const [currentImageIndexes, setCurrentImageIndexes] = useState({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sellingPrice: '',
    productionPrice: '',
    quantity: '',
    productionTime: '',
    measurementUnit: 'pieces',
    minOrderQuantity: '1',
    materials: [],
    tags: '',
    bulkDiscount: false,
    bulkDiscountMinQuantity: '',
    bulkDiscountPercentage: '',
    productionStatus: 'ready',
    images: [],
    lowStockThreshold: '10'
  });

  const measurementUnits = [
    'pieces', 'boxes', 'cartons', 'crates', 'kg', 'g', 'l', 'ml', 'packs', 'units', 'dozens'
  ];

  const productionStatuses = [
    { value: 'ready', label: 'Ready' },
    { value: 'in_production', label: 'In Production' },
    { value: 'discontinued', label: 'Discontinued' }
  ];

  const tabs = ['basic', 'pricing', 'materials', 'settings'];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStatistics();
    checkImagePickerPermissions();
  }, []);

  useEffect(() => {
    calculateProfit();
  }, [formData.sellingPrice, formData.productionPrice]);

  // Check and request permissions on component mount
  const checkImagePickerPermissions = async () => {
    try {
      console.log('🔐 Checking image picker permissions...');
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('📋 Current permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔄 Requesting media library permissions...');
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('✅ New permission status:', newStatus);
      }
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
    }
  };

  // Image validation helper
  const validateImages = (images) => {
    const validImages = images.filter(image => {
      return image && (image.uri || image.url);
    });
    console.log('🖼️ Validated images:', validImages.length, 'out of', images.length);
    return validImages;
  };

  // Image navigation functions
  const nextImage = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.images || product.images.length <= 1) return;
    
    setCurrentImageIndexes(prev => ({
      ...prev,
      [productId]: (prev[productId] + 1) % product.images.length
    }));
  };

  const prevImage = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.images || product.images.length <= 1) return;
    
    setCurrentImageIndexes(prev => ({
      ...prev,
      [productId]: prev[productId] === 0 ? product.images.length - 1 : prev[productId] - 1
    }));
  };

  const calculateProfit = () => {
    const sellingPrice = parseFloat(formData.sellingPrice) || 0;
    const productionPrice = parseFloat(formData.productionPrice) || 0;
    
    let margin = 0;
    let amount = 0;
    
    if (productionPrice > 0) {
      margin = ((sellingPrice - productionPrice) / productionPrice) * 100;
      amount = sellingPrice - productionPrice;
    }
    
    setProfitMargin(margin);
    setProfitAmount(amount);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/supplier-products`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        // Initialize image indexes
        const indexes = {};
        data.products?.forEach(product => {
          indexes[product._id] = 0;
        });
        setCurrentImageIndexes(indexes);
      } else {
        throw new Error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/supplier-products/categories`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(['Electronics', 'Clothing', 'Food', 'Furniture', 'Toys']);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/supplier-products/stats`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics || {
          totalProducts: 0,
          totalStockValue: 0,
          inProductionCount: 0,
          readyCount: 0,
          lowStockCount: 0,
          averageProfitMargin: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // FIXED: Simplified image picker that works
  const pickImages = async () => {
    try {
      console.log('🚀 Starting image picker process...');
      console.log('📱 Platform:', Platform.OS);
      console.log('📊 Current images in form:', formData.images.length);
      
      // Check permissions
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('📋 Permission status:', status);

      if (status !== 'granted') {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permission Required', 
            'Sorry, we need camera roll permissions to upload images. Please enable it in your device settings.'
          );
          return;
        }
      }

      // Use the working configuration
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - formData.images.length,
      });

      console.log('✅ Image picker completed successfully');
      console.log('❌ Canceled:', result.canceled);
      console.log('🖼️ Assets available:', !!result.assets);
      console.log('🔢 Assets count:', result.assets ? result.assets.length : 0);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('🎉 Images selected successfully');
        
        const maxImages = 5 - formData.images.length;
        const newImages = result.assets.slice(0, maxImages);
        const validImages = validateImages(newImages);
        
        console.log(`📏 Max images allowed: ${maxImages}`);
        console.log(`🔄 Adding ${validImages.length} valid images`);

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...validImages]
        }));

        console.log('✅ Images added to form successfully');
        console.log('📊 New total images:', formData.images.length + validImages.length);

      } else if (result.canceled) {
        console.log('👤 User cancelled image selection');
      } else {
        console.log('⚠️ No valid images selected');
        Alert.alert('No Images', 'No images were selected or there was an issue loading them.');
      }

    } catch (error) {
      console.error('❌ Error in image picker:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
      });

      Alert.alert(
        'Error', 
        'Failed to pick images. Please try again.'
      );
    }
  };

  const removeImage = (index) => {
    console.log('🗑️ Removing image at index:', index);
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData(prev => ({ ...prev, images: newImages }));
    console.log('✅ Image removed, new count:', newImages.length);
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { material: '', quantity: '', unit: '', cost: '' }]
    }));
  };

  const updateMaterial = (index, field, value) => {
    const updatedMaterials = [...formData.materials];
    updatedMaterials[index][field] = value;
    setFormData(prev => ({ ...prev, materials: updatedMaterials }));
  };

  const removeMaterial = (index) => {
    const updatedMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, materials: updatedMaterials }));
  };

  const handleSubmit = async () => {
    try {
      console.log('📤 Starting form submission...');
      
      // Validate required fields
      const requiredFields = [
        { field: 'name', label: 'Product Name' },
        { field: 'category', label: 'Category' },
        { field: 'description', label: 'Description' },
        { field: 'sellingPrice', label: 'Selling Price' },
        { field: 'productionPrice', label: 'Production Cost' },
        { field: 'quantity', label: 'Quantity' },
        { field: 'productionTime', label: 'Production Time' }
      ];

      const missingFields = requiredFields.filter(({ field }) => !formData[field]);
      
      if (missingFields.length > 0) {
        Alert.alert(
          'Missing Information',
          `Please fill in the following required fields:\n${missingFields.map(f => `• ${f.label}`).join('\n')}`
        );
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      console.log('📝 Preparing form data with images:', formData.images.length);

      // Add all text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('sellingPrice', parseFloat(formData.sellingPrice));
      formDataToSend.append('productionPrice', parseFloat(formData.productionPrice));
      formDataToSend.append('quantity', parseInt(formData.quantity));
      formDataToSend.append('productionTime', parseInt(formData.productionTime));
      formDataToSend.append('measurementUnit', formData.measurementUnit);
      formDataToSend.append('minOrderQuantity', parseInt(formData.minOrderQuantity || '1'));
      formDataToSend.append('lowStockThreshold', parseInt(formData.lowStockThreshold || '10'));
      formDataToSend.append('productionStatus', formData.productionStatus);
      formDataToSend.append('tags', formData.tags || '');

      // Add materials if any
      if (formData.materials && formData.materials.length > 0) {
        formDataToSend.append('materials', JSON.stringify(formData.materials));
      }

      // Add bulk discount if enabled
      if (formData.bulkDiscount && formData.bulkDiscountMinQuantity && formData.bulkDiscountPercentage) {
        formDataToSend.append('bulkDiscount', 'true');
        formDataToSend.append('bulkDiscountMinQuantity', formData.bulkDiscountMinQuantity);
        formDataToSend.append('bulkDiscountPercentage', formData.bulkDiscountPercentage);
      }

      // Add images if any
      if (formData.images && formData.images.length > 0) {
        const validImages = validateImages(formData.images);
        console.log('🖼️ Uploading images:', validImages.length);
        
        validImages.forEach((image, index) => {
          if (image.uri) {
            const file = {
              uri: image.uri,
              type: 'image/jpeg',
              name: `image_${Date.now()}_${index}.jpg`
            };
            formDataToSend.append('images', file);
            console.log(`📎 Appended image ${index}:`, file.name);
          }
        });
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      let response;
      if (editingProduct) {
        console.log('✏️ Updating product:', editingProduct._id);
        response = await fetch(`${API_BASE_URL}/api/supplier-products/${editingProduct._id}`, {
          method: 'PUT',
          headers,
          body: formDataToSend
        });
      } else {
        console.log('🆕 Creating new product');
        response = await fetch(`${API_BASE_URL}/api/supplier-products`, {
          method: 'POST',
          headers,
          body: formDataToSend
        });
      }

      const responseData = await response.json();
      console.log('📨 Server response:', responseData);
      
      if (response.ok) {
        Alert.alert(
          'Success', 
          editingProduct ? 'Product updated successfully' : 'Product created successfully'
        );
        setShowAddForm(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
        fetchStatistics();
      } else {
        throw new Error(responseData.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    }
  };

  const handleDelete = async (productId) => {
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
              const response = await fetch(`${API_BASE_URL}/api/supplier-products/${productId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                Alert.alert('Success', 'Product deleted successfully');
                fetchProducts();
                fetchStatistics();
              } else {
                throw new Error('Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleStatusUpdate = async (productId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/supplier-products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        Alert.alert('Success', 'Production status updated successfully');
        fetchProducts();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update production status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      sellingPrice: '',
      productionPrice: '',
      quantity: '',
      productionTime: '',
      measurementUnit: 'pieces',
      minOrderQuantity: '1',
      materials: [],
      tags: '',
      bulkDiscount: false,
      bulkDiscountMinQuantity: '',
      bulkDiscountPercentage: '',
      productionStatus: 'ready',
      images: [],
      lowStockThreshold: '10'
    });
    setProfitMargin(0);
    setProfitAmount(0);
    setActiveTab('basic');
    setShowCategoryDropdown(false);
    setShowStatusDropdown(false);
    setShowUnitDropdown(false);
  };

  const startEditing = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      sellingPrice: product.sellingPrice?.toString() || '',
      productionPrice: product.productionPrice?.toString() || '',
      quantity: product.quantity?.toString() || '',
      productionTime: product.productionTime?.toString() || '',
      measurementUnit: product.measurementUnit || 'pieces',
      minOrderQuantity: product.minOrderQuantity?.toString() || '1',
      materials: product.materials || [],
      tags: product.tags ? product.tags.join(', ') : '',
      bulkDiscount: !!product.bulkDiscount,
      bulkDiscountMinQuantity: product.bulkDiscount?.minQuantity?.toString() || '',
      bulkDiscountPercentage: product.bulkDiscount?.discountPercentage?.toString() || '',
      productionStatus: product.productionStatus || 'ready',
      images: [],
      lowStockThreshold: product.lowStockThreshold?.toString() || '10'
    });
    setShowAddForm(true);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.tags && product.tags.some(tag => 
                           tag.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.productionStatus === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderStatistics = () => (
    <View style={styles.statisticsContainer}>
      <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
        <View style={styles.statContent}>
          <View style={styles.statTextContainer}>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>Total Products</Text>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>{statistics.totalProducts}</Text>
          </View>
          <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
            <FontAwesome5 name="box" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
        <View style={styles.statContent}>
          <View style={styles.statTextContainer}>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>Stock Value</Text>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>
              UGX {(statistics.totalStockValue || 0).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
            <FontAwesome5 name="dollar-sign" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
        <View style={styles.statContent}>
          <View style={styles.statTextContainer}>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>In Production</Text>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>{statistics.inProductionCount}</Text>
          </View>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
            <FontAwesome5 name="industry" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>

      <View style={[styles.statCard, isDarkMode && styles.darkStatCard]}>
        <View style={styles.statContent}>
          <View style={styles.statTextContainer}>
            <Text style={[styles.statLabel, isDarkMode && styles.darkStatLabel]}>Low Stock</Text>
            <Text style={[styles.statValue, isDarkMode && styles.darkStatValue]}>{statistics.lowStockCount}</Text>
          </View>
          <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
            <FontAwesome5 name="exclamation-triangle" size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </View>
  );

  const renderProductCard = ({ item: product }) => {
    const currentImageIndex = currentImageIndexes[product._id] || 0;
    const currentImage = product.images && product.images.length > 0 
      ? product.images[currentImageIndex] 
      : null;
    const totalImages = product.images ? product.images.length : 0;

    return (
      <View style={[styles.productCard, isDarkMode && styles.darkProductCard]}>
        {/* Product Image with Navigation */}
        <View style={styles.imageContainer}>
          {currentImage ? (
            <>
              <Image 
                source={{ uri: currentImage.url || currentImage.uri }}
                style={styles.productImage}
                resizeMode="cover"
              />
              
              {totalImages > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.prevButton]}
                    onPress={() => prevImage(product._id)}
                  >
                    <Feather name="chevron-left" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.nextButton]}
                    onPress={() => nextImage(product._id)}
                  >
                    <Feather name="chevron-right" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {currentImageIndex + 1}/{totalImages}
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={[styles.noImage, isDarkMode && styles.darkNoImage]}>
              <Feather name="image" size={24} color={isDarkMode ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.noImageText, isDarkMode && styles.darkNoImageText]}>
                No Image
              </Text>
            </View>
          )}
        </View>

        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productTitleContainer}>
            <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={[styles.categoryBadge, isDarkMode && styles.darkCategoryBadge]}>
              <Text style={[styles.categoryText, isDarkMode && styles.darkCategoryText]}>
                {product.category}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, 
            product.productionStatus === 'ready' && styles.readyStatus,
            product.productionStatus === 'in_production' && styles.productionStatus,
            product.productionStatus === 'discontinued' && styles.discontinuedStatus
          ]}>
            <Text style={styles.statusText}>
              {product.productionStatus.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Product Description */}
        <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
          {product.description}
        </Text>

        {/* Pricing Info */}
        <View style={styles.pricingContainer}>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, isDarkMode && styles.darkSubtitle]}>Selling Price</Text>
            <Text style={[styles.priceValue, isDarkMode && styles.darkText]}>
              UGX {product.sellingPrice?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, isDarkMode && styles.darkSubtitle]}>Profit Margin</Text>
            <Text style={[styles.profitMargin, 
              (product.profitMargin || 0) > 0 ? styles.positiveProfit : styles.negativeProfit
            ]}>
              {product.profitMargin?.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Stock Info */}
        <View style={styles.stockContainer}>
          <View style={styles.stockItem}>
            <Feather name="package" size={12} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.stockText, isDarkMode && styles.darkSubtitle]}>
              {product.quantity} {product.measurementUnit}
            </Text>
          </View>
          <View style={styles.stockItem}>
            <Feather name="clock" size={12} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.stockText, isDarkMode && styles.darkSubtitle]}>
              {product.productionTime} days
            </Text>
          </View>
          <View style={styles.stockItem}>
            <Feather name="shopping-cart" size={12} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.stockText, isDarkMode && styles.darkSubtitle]}>
              Min: {product.minOrderQuantity}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => startEditing(product)}
          >
            <Feather name="edit" size={12} color="#3B82F6" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(product._id)}
          >
            <Feather name="trash" size={12} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

          {product.productionStatus === 'in_production' ? (
            <TouchableOpacity 
              style={[styles.actionButton, styles.readyButton]}
              onPress={() => handleStatusUpdate(product._id, 'ready')}
            >
              <Feather name="check" size={12} color="#10B981" />
              <Text style={styles.readyButtonText}>Ready</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.produceButton]}
              onPress={() => handleStatusUpdate(product._id, 'in_production')}
            >
              <Feather name="play" size={12} color="#F59E0B" />
              <Text style={styles.produceButtonText}>Produce</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderDropdown = (items, selectedValue, onSelect, isVisible, onClose, placeholder) => (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.dropdownContainer, isDarkMode && styles.darkDropdownContainer]}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  selectedValue === item && styles.dropdownItemSelected,
                  isDarkMode && styles.darkDropdownItem
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedValue === item && styles.dropdownItemTextSelected,
                  isDarkMode && styles.darkDropdownItemText
                ]}>
                  {item}
                </Text>
                {selectedValue === item && (
                  <Feather name="check" size={14} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderFormTab = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.formSectionTitle, isDarkMode && styles.darkText]}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Product Name *</Text>
              <TextInput
                style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                placeholder="Enter product name"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Category *</Text>
              <TouchableOpacity
                style={[styles.pickerContainer, isDarkMode && styles.darkPickerContainer]}
                onPress={() => setShowCategoryDropdown(true)}
              >
                <Text style={[
                  styles.pickerText, 
                  isDarkMode && styles.darkText,
                  !formData.category && styles.placeholderText
                ]}>
                  {formData.category || 'Select category'}
                </Text>
                <Feather name="chevron-down" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
              {renderDropdown(
                categories,
                formData.category,
                (value) => updateFormData('category', value),
                showCategoryDropdown,
                () => setShowCategoryDropdown(false),
                'Select category'
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Description *</Text>
              <TextInput
                style={[styles.textArea, isDarkMode && styles.darkTextInput]}
                value={formData.description}
                onChangeText={(text) => updateFormData('description', text)}
                placeholder="Detailed product description..."
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Tags</Text>
              <TextInput
                style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                value={formData.tags}
                onChangeText={(text) => updateFormData('tags', text)}
                placeholder="electronics, audio, wireless"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              />
              <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                Separate tags with commas
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Production Status</Text>
              <View style={styles.radioGroup}>
                {productionStatuses.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={styles.radioOption}
                    onPress={() => updateFormData('productionStatus', status.value)}
                  >
                    <View style={[
                      styles.radioCircle,
                      formData.productionStatus === status.value && styles.radioCircleSelected
                    ]}>
                      {formData.productionStatus === status.value && <View style={styles.radioInnerCircle} />}
                    </View>
                    <Text style={[styles.radioLabel, isDarkMode && styles.darkText]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        );

      case 'pricing':
        return (
          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.formSectionTitle, isDarkMode && styles.darkText]}>Pricing & Stock</Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Selling Price (UGX) *</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.sellingPrice}
                  onChangeText={(text) => updateFormData('sellingPrice', text)}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Production Cost (UGX) *</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.productionPrice}
                  onChangeText={(text) => updateFormData('productionPrice', text)}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>
            </View>

            {/* Profit Display */}
            <View style={[
              styles.profitContainer,
              profitMargin > 0 ? styles.positiveProfitBg : profitMargin < 0 ? styles.negativeProfitBg : styles.neutralProfitBg
            ]}>
              <View style={styles.profitHeader}>
                <Feather name="trending-up" size={14} color={profitMargin > 0 ? '#065F46' : profitMargin < 0 ? '#991B1B' : '#1E40AF'} />
                <Text style={[
                  styles.profitTitle,
                  profitMargin > 0 ? styles.positiveProfitText : profitMargin < 0 ? styles.negativeProfitText : styles.neutralProfitText
                ]}>
                  Profit Analysis
                </Text>
              </View>
              <View style={styles.profitDetails}>
                <View>
                  <Text style={[
                    styles.profitMargin,
                    profitMargin > 0 ? styles.positiveProfitText : profitMargin < 0 ? styles.negativeProfitText : styles.neutralProfitText
                  ]}>
                    Margin: {profitMargin.toFixed(1)}%
                  </Text>
                  <Text style={[
                    styles.profitAmount,
                    profitAmount > 0 ? styles.positiveProfitText : profitAmount < 0 ? styles.negativeProfitText : styles.neutralProfitText
                  ]}>
                    Profit: UGX {profitAmount.toFixed(2)} per unit
                  </Text>
                </View>
              </View>
              {profitMargin < 0 && (
                <View style={styles.profitWarning}>
                  <Feather name="alert-triangle" size={12} color="#991B1B" />
                  <Text style={styles.profitWarningText}>Warning: Selling below production cost</Text>
                </View>
              )}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Quantity in Stock *</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.quantity}
                  onChangeText={(text) => updateFormData('quantity', text)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Measurement Unit *</Text>
                <TouchableOpacity
                  style={[styles.pickerContainer, isDarkMode && styles.darkPickerContainer]}
                  onPress={() => setShowUnitDropdown(true)}
                >
                  <Text style={[styles.pickerText, isDarkMode && styles.darkText]}>
                    {formData.measurementUnit}
                  </Text>
                  <Feather name="chevron-down" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
                {renderDropdown(
                  measurementUnits,
                  formData.measurementUnit,
                  (value) => updateFormData('measurementUnit', value),
                  showUnitDropdown,
                  () => setShowUnitDropdown(false),
                  'Select unit'
                )}
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Production Time (days) *</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.productionTime}
                  onChangeText={(text) => updateFormData('productionTime', text)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.inputGroupHalf}>
                <Text style={[styles.label, isDarkMode && styles.darkText]}>Minimum Order Quantity</Text>
                <TextInput
                  style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                  value={formData.minOrderQuantity}
                  onChangeText={(text) => updateFormData('minOrderQuantity', text)}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>
            </View>
          </ScrollView>
        );

      case 'materials':
        return (
          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.formSectionTitle, isDarkMode && styles.darkText]}>Production Materials</Text>
            
            <TouchableOpacity style={styles.addMaterialButton} onPress={addMaterial}>
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addMaterialText}>Add Material</Text>
            </TouchableOpacity>

            {formData.materials.length === 0 ? (
              <View style={styles.emptyMaterials}>
                <Feather name="package" size={32} color={isDarkMode ? '#4B5563' : '#9CA3AF'} />
                <Text style={[styles.emptyMaterialsText, isDarkMode && styles.darkSubtitle]}>
                  No materials added yet
                </Text>
                <Text style={[styles.emptyMaterialsSubtext, isDarkMode && styles.darkSubtitle]}>
                  Add materials used in production
                </Text>
              </View>
            ) : (
              formData.materials.map((material, index) => (
                <View key={index} style={[styles.materialItem, isDarkMode && styles.darkMaterialItem]}>
                  <View style={styles.materialHeader}>
                    <Text style={[styles.materialTitle, isDarkMode && styles.darkText]}>
                      Material #{index + 1}
                    </Text>
                    <TouchableOpacity 
                      style={styles.removeMaterialButton}
                      onPress={() => removeMaterial(index)}
                    >
                      <Feather name="trash" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.materialRow}>
                    <View style={styles.materialInput}>
                      <Text style={[styles.materialLabel, isDarkMode && styles.darkSubtitle]}>Material Name *</Text>
                      <TextInput
                        style={[styles.materialTextInput, isDarkMode && styles.darkTextInput]}
                        value={material.material}
                        onChangeText={(text) => updateMaterial(index, 'material', text)}
                        placeholder="e.g., Plastic, Electronics"
                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                      />
                    </View>
                  </View>

                  <View style={styles.materialDetails}>
                    <View style={styles.materialDetail}>
                      <Text style={[styles.materialLabel, isDarkMode && styles.darkSubtitle]}>Quantity *</Text>
                      <TextInput
                        style={[styles.materialTextInput, isDarkMode && styles.darkTextInput]}
                        value={material.quantity}
                        onChangeText={(text) => updateMaterial(index, 'quantity', text)}
                        keyboardType="numeric"
                        placeholder="0.0"
                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                      />
                    </View>

                    <View style={styles.materialDetail}>
                      <Text style={[styles.materialLabel, isDarkMode && styles.darkSubtitle]}>Unit *</Text>
                      <TextInput
                        style={[styles.materialTextInput, isDarkMode && styles.darkTextInput]}
                        value={material.unit}
                        onChangeText={(text) => updateMaterial(index, 'unit', text)}
                        placeholder="kg, pieces, etc."
                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                      />
                    </View>

                    <View style={styles.materialDetail}>
                      <Text style={[styles.materialLabel, isDarkMode && styles.darkSubtitle]}>Cost (UGX) *</Text>
                      <TextInput
                        style={[styles.materialTextInput, isDarkMode && styles.darkTextInput]}
                        value={material.cost}
                        onChangeText={(text) => updateMaterial(index, 'cost', text)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'settings':
        return (
          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.formSectionTitle, isDarkMode && styles.darkText]}>Additional Settings</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isDarkMode && styles.darkText]}>Low Stock Threshold</Text>
              <TextInput
                style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                value={formData.lowStockThreshold}
                onChangeText={(text) => updateFormData('lowStockThreshold', text)}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              />
              <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                Alert when stock falls below this quantity
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => updateFormData('bulkDiscount', !formData.bulkDiscount)}
              >
                <View style={[
                  styles.checkbox,
                  formData.bulkDiscount && styles.checkboxChecked
                ]}>
                  {formData.bulkDiscount && <Feather name="check" size={12} color="#FFFFFF" />}
                </View>
                <Text style={[styles.checkboxLabel, isDarkMode && styles.darkText]}>
                  Enable Bulk Discount
                </Text>
              </TouchableOpacity>

              {formData.bulkDiscount && (
                <View style={[styles.bulkDiscountContainer, isDarkMode && styles.darkBulkDiscountContainer]}>
                  <Text style={[styles.bulkDiscountTitle, isDarkMode && styles.darkText]}>
                    Bulk Discount Settings
                  </Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputGroupHalf}>
                      <Text style={[styles.label, isDarkMode && styles.darkText]}>Minimum Quantity</Text>
                      <TextInput
                        style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                        value={formData.bulkDiscountMinQuantity}
                        onChangeText={(text) => updateFormData('bulkDiscountMinQuantity', text)}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                      />
                    </View>

                    <View style={styles.inputGroupHalf}>
                      <Text style={[styles.label, isDarkMode && styles.darkText]}>Discount %</Text>
                      <TextInput
                        style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                        value={formData.bulkDiscountPercentage}
                        onChangeText={(text) => updateFormData('bulkDiscountPercentage', text)}
                        keyboardType="numeric"
                        placeholder="10.0"
                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                      />
                    </View>
                  </View>
                  <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                    Apply discount when order quantity meets minimum requirement
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.formSectionTitle, isDarkMode && styles.darkText]}>Product Images</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
                <Feather name="upload" size={16} color="#3B82F6" />
                <Text style={styles.uploadButtonText}>Upload Images</Text>
              </TouchableOpacity>
              
              <Text style={[styles.helperText, isDarkMode && styles.darkSubtitle]}>
                Maximum 5 images allowed ({formData.images.length}/5 uploaded)
              </Text>

              {formData.images.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                  <Text style={[styles.imagePreviewTitle, isDarkMode && styles.darkText]}>
                    Selected Images:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.imagePreviewList}>
                      {formData.images.map((image, index) => (
                        <View key={index} style={styles.imagePreviewItem}>
                          <Image 
                            source={{ uri: image.uri }} 
                            style={styles.imagePreview}
                          />
                          <TouchableOpacity 
                            style={styles.removePreviewButton}
                            onPress={() => removeImage(index)}
                          >
                            <Feather name="x" size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.darkContainer]}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
          Loading products...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, isDarkMode && styles.darkText]}>Production</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            Manage products & production
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowAddForm(true);
          }}
        >
          <Feather name="plus" size={14} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      {renderStatistics()}

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, isDarkMode && styles.darkFiltersContainer]}>
        <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
          <Feather name="search" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkSearchInput]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search products by name, description, or tags..."
            placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Feather name="x" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterSelect, isDarkMode && styles.darkFilterSelect]}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Text style={[styles.filterText, isDarkMode && styles.darkText]}>
              {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
            </Text>
            <Feather name="chevron-down" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterSelect, isDarkMode && styles.darkFilterSelect]}
            onPress={() => setShowStatusDropdown(true)}
          >
            <Text style={[styles.filterText, isDarkMode && styles.darkText]}>
              {statusFilter === 'all' ? 'All Status' : statusFilter.replace('_', ' ')}
            </Text>
            <Feather name="chevron-down" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.refreshButton, isDarkMode && styles.darkRefreshButton]}
            onPress={fetchProducts}
          >
            <Feather name="refresh-cw" size={14} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        </View>

        {/* Category Dropdown */}
        {renderDropdown(
          ['all', ...categories],
          categoryFilter,
          setCategoryFilter,
          showCategoryDropdown,
          () => setShowCategoryDropdown(false),
          'All Categories'
        )}

        {/* Status Dropdown */}
        {renderDropdown(
          ['all', 'ready', 'in_production', 'discontinued'],
          statusFilter,
          setStatusFilter,
          showStatusDropdown,
          () => setShowStatusDropdown(false),
          'All Status'
        )}
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts();
            }}
            colors={['#3B82F6']}
            tintColor={isDarkMode ? '#3B82F6' : '#3B82F6'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color={isDarkMode ? '#4B5563' : '#9CA3AF'} />
            <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No products match your search criteria'
                : 'No products found'
              }
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.darkSubtitle]}>
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start by adding your first product'
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => {
                resetForm();
                setShowAddForm(true);
              }}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Your First Product</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.productsList}
      />

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddForm(false);
          setEditingProduct(null);
          resetForm();
        }}
      >
        <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={[styles.modalHeader, isDarkMode && styles.darkModalHeader]}>
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                {editingProduct ? `Edit Product` : 'Add New Product'}
              </Text>
              {editingProduct && (
                <Text style={[styles.modalSubtitle, isDarkMode && styles.darkSubtitle]}>
                  {formData.name}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowAddForm(false);
                setEditingProduct(null);
                resetForm();
              }}
            >
              <Feather name="x" size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          {/* Compact Tabs */}
          <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && styles.activeTab,
                    isDarkMode && activeTab === tab && styles.darkActiveTab
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                    isDarkMode && styles.darkText,
                    isDarkMode && activeTab === tab && styles.darkActiveTabText
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Form Content */}
          {renderFormTab()}

          {/* Compact Form Navigation */}
          <View style={[styles.formNavigation, isDarkMode && styles.darkFormNavigation]}>
            <View style={styles.navButtons}>
              {activeTab !== 'basic' && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton, isDarkMode && styles.darkNavButton]}
                  onPress={() => setActiveTab(tabs[tabs.indexOf(activeTab) - 1])}
                >
                  <Feather name="chevron-left" size={12} color={isDarkMode ? '#FFFFFF' : '#374151'} />
                  <Text style={[styles.navButtonText, isDarkMode && styles.darkNavButtonText]}>
                    Previous
                  </Text>
                </TouchableOpacity>
              )}
              
              {activeTab !== 'settings' && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={() => setActiveTab(tabs[tabs.indexOf(activeTab) + 1])}
                >
                  <Text style={styles.navButtonText}>Next</Text>
                  <Feather name="chevron-right" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.submitButtons}>
              <TouchableOpacity
                style={[styles.navButton, styles.cancelButton, isDarkMode && styles.darkNavButton]}
                onPress={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                <Text style={[styles.navButtonText, isDarkMode && styles.darkNavButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.navButton, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Feather name="save" size={12} color="#FFFFFF" />
                <Text style={styles.navButtonText}>
                  {editingProduct ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 6,
    fontSize: 11,
    color: '#374151',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    gap: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },

  // Statistics - Reduced sizes
  statisticsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    padding: 6,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
  darkStatCard: {
    backgroundColor: '#1F2937',
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 1,
  },
  darkStatLabel: {
    color: '#9CA3AF',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  darkStatValue: {
    color: '#FFFFFF',
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filters - Reduced sizes
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
  darkFiltersContainer: {
    backgroundColor: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 5,
    fontSize: 11,
    color: '#374151',
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 4,
  },
  filterSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 5,
  },
  darkFilterSelect: {
    backgroundColor: '#374151',
  },
  filterText: {
    fontSize: 11,
    color: '#374151',
  },
  refreshButton: {
    padding: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
  },
  darkRefreshButton: {
    backgroundColor: '#374151',
  },

  // Dropdown Styles - Reduced sizes
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 6,
    maxHeight: 180,
    width: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  darkDropdownContainer: {
    backgroundColor: '#1F2937',
  },
  dropdownScroll: {
    maxHeight: 168,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 1,
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  darkDropdownItem: {
    backgroundColor: 'transparent',
  },
  dropdownItemText: {
    fontSize: 12,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  darkDropdownItemText: {
    color: '#FFFFFF',
  },

  // Products List - Increased image height
  productsList: {
    padding: 10,
    paddingBottom: 70,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  darkProductCard: {
    backgroundColor: '#1F2937',
  },
  // Image Styles - Increased height
  imageContainer: {
    position: 'relative',
    height: 200, // Increased from 120 to 160
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  darkNoImage: {
    backgroundColor: '#374151',
  },
  noImageText: {
    marginTop: 3,
    fontSize: 11,
    color: '#6B7280',
  },
  darkNoImageText: {
    color: '#9CA3AF',
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 4,
  },
  nextButton: {
    right: 4,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productTitleContainer: {
    flex: 1,
    marginRight: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  darkCategoryBadge: {
    backgroundColor: '#374151',
  },
  categoryText: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: '500',
  },
  darkCategoryText: {
    color: '#60A5FA',
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  readyStatus: {
    backgroundColor: '#D1FAE5',
  },
  productionStatus: {
    backgroundColor: '#FEF3C7',
  },
  discontinuedStatus: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '500',
  },
  productDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 14,
  },
  pricingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 1,
  },
  priceValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  profitMargin: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  positiveProfit: {
    color: '#059669',
  },
  negativeProfit: {
    color: '#DC2626',
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stockText: {
    fontSize: 9,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 3,
    gap: 3,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  readyButton: {
    backgroundColor: '#F0FDF4',
  },
  produceButton: {
    backgroundColor: '#FFFBEB',
  },
  editButtonText: {
    fontSize: 9,
    color: '#3B82F6',
    fontWeight: '500',
  },
  deleteButtonText: {
    fontSize: 9,
    color: '#EF4444',
    fontWeight: '500',
  },
  readyButtonText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '500',
  },
  produceButtonText: {
    fontSize: 9,
    color: '#F59E0B',
    fontWeight: '500',
  },

  // Empty State - Reduced sizes
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    gap: 4,
    marginTop: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },

  // Modal Styles - Reduced sizes
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkModalHeader: {
    borderBottomColor: '#374151',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  closeButton: {
    padding: 3,
  },

  // Compact Tabs - Reduced sizes
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 38,
  },
  darkTabsContainer: {
    borderBottomColor: '#374151',
  },
  tabsContent: {
    paddingHorizontal: 6,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 60,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  darkActiveTab: {
    borderBottomColor: '#60A5FA',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  darkActiveTabText: {
    color: '#60A5FA',
  },

  // Form Content - Reduced sizes
  formContent: {
    flex: 1,
    padding: 12,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  inputGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkTextInput: {
    borderColor: '#4B5563',
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },

  // Picker - Reduced sizes
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  darkPickerContainer: {
    borderColor: '#4B5563',
    backgroundColor: '#1F2937',
  },
  pickerText: {
    fontSize: 11,
    color: '#374151',
  },

  // Radio Group - Reduced sizes
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radioCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  radioInnerCircle: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  radioLabel: {
    fontSize: 11,
    color: '#374151',
  },

  // Profit Display - Reduced sizes
  profitContainer: {
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
  },
  positiveProfitBg: {
    backgroundColor: '#D1FAE5',
  },
  negativeProfitBg: {
    backgroundColor: '#FEE2E2',
  },
  neutralProfitBg: {
    backgroundColor: '#EFF6FF',
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  profitTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  positiveProfitText: {
    color: '#065F46',
  },
  negativeProfitText: {
    color: '#991B1B',
  },
  neutralProfitText: {
    color: '#1E40AF',
  },
  profitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profitMargin: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  profitAmount: {
    fontSize: 9,
    marginTop: 1,
  },
  profitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  profitWarningText: {
    fontSize: 9,
    color: '#991B1B',
  },

  // Materials - Reduced sizes
  addMaterialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 6,
    borderRadius: 5,
    gap: 3,
    marginBottom: 8,
  },
  addMaterialText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
  emptyMaterials: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyMaterialsText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  emptyMaterialsSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  materialItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    padding: 8,
    marginBottom: 6,
  },
  darkMaterialItem: {
    backgroundColor: '#374151',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  materialTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  materialRow: {
    marginBottom: 4,
  },
  materialInput: {
    flex: 1,
  },
  materialLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 1,
  },
  materialTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 11,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkMaterialTextInput: {
    borderColor: '#4B5563',
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
  },
  removeMaterialButton: {
    padding: 3,
  },
  materialDetails: {
    flexDirection: 'row',
    gap: 4,
  },
  materialDetail: {
    flex: 1,
  },

  // Checkbox - Reduced sizes
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 2.5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },

  // Bulk Discount - Reduced sizes
  bulkDiscountContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 5,
    marginTop: 4,
  },
  darkBulkDiscountContainer: {
    backgroundColor: '#374151',
  },
  bulkDiscountTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },

  // Image Upload - Reduced sizes
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 5,
    paddingVertical: 8,
    gap: 4,
    marginBottom: 4,
  },
  uploadButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 11,
  },
  imagePreviewContainer: {
    marginTop: 6,
  },
  imagePreviewTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  imagePreviewList: {
    flexDirection: 'row',
    gap: 4,
  },
  imagePreviewItem: {
    position: 'relative',
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 3,
  },
  removePreviewButton: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Compact Form Navigation - Reduced sizes
  formNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
    minHeight: 50,
  },
  darkFormNavigation: {
    borderTopColor: '#374151',
  },
  navButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  submitButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 5,
    gap: 3,
    minHeight: 32,
  },
  prevButton: {
    backgroundColor: '#F3F4F6',
  },
  nextButton: {
    backgroundColor: '#374151',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  darkNavButton: {
    backgroundColor: '#374151',
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  prevButtonText: {
    color: '#374151',
  },
  nextButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#374151',
  },
  submitButtonText: {
    color: '#FFFFFF',
  },
  darkNavButtonText: {
    color: '#FFFFFF',
  },

  // Debug Button - Reduced sizes
  debugButton: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 3,
  },
  darkDebugButton: {
    backgroundColor: '#DC2626',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
});

export default Production;