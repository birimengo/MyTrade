// src/components/RetailerComponents/MyStock.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  MaterialIcons, 
  Feather,
  MaterialCommunityIcons 
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const MyStock = () => {
  const [systemStocks, setSystemStocks] = useState([]);
  const [manualStocks, setManualStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('system');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    measurementUnit: 'kg',
    unitPrice: '',
    minStockLevel: '',
    notes: ''
  });

  const { user, token, getAuthHeaders, API_BASE_URL, logout } = useAuth();
  const { isDarkMode } = useDarkMode();

  // Enhanced auth token function using the correct AuthContext
  const getAuthToken = () => {
    console.log('🔐 Auth token check:', { 
      hasUser: !!user, 
      hasToken: !!token,
      tokenLength: token?.length 
    });
    return token;
  };

  // Enhanced API call with better error handling and token management
  const apiCall = async (endpoint, options = {}) => {
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to continue.',
          [
            {
              text: 'OK',
              onPress: () => logout()
            }
          ]
        );
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/api${endpoint}`;
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
      
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);
      console.log(`📡 Response status: ${response.status} for ${endpoint}`);

      if (response.status === 401) {
        // Token expired or invalid
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => logout()
            }
          ]
        );
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`✅ Success: ${endpoint}`, data);
      return data;

    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  };

  // API call functions
  const fetchSystemStocks = async () => {
    try {
      const data = await apiCall('/system-stocks');
      return data.stocks || data || [];
    } catch (error) {
      console.error('Error fetching system stocks:', error);
      if (error.message !== 'No authentication token found' && 
          error.message !== 'Authentication failed') {
        return getDemoSystemStocks();
      }
      return [];
    }
  };

  const fetchRetailerStocks = async () => {
    try {
      const data = await apiCall('/retailer-stocks');
      return data.stocks || data || [];
    } catch (error) {
      console.error('Error fetching retailer stocks:', error);
      if (error.message !== 'No authentication token found' && 
          error.message !== 'Authentication failed') {
        return getDemoManualStocks();
      }
      return [];
    }
  };

  const createRetailerStock = async (stockData) => {
    return await apiCall('/retailer-stocks', {
      method: 'POST',
      body: JSON.stringify(stockData)
    });
  };

  const updateRetailerStock = async (id, stockData) => {
    return await apiCall(`/retailer-stocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stockData)
    });
  };

  const deleteRetailerStock = async (id) => {
    return await apiCall(`/retailer-stocks/${id}`, {
      method: 'DELETE'
    });
  };

  const syncSystemStocks = async () => {
    try {
      setSyncing(true);
      const result = await apiCall('/system-stocks/sync', {
        method: 'POST'
      });
      Alert.alert('Success', result.message || 'System stocks synced successfully');
      return result;
    } catch (error) {
      console.error('Error syncing system stocks:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  // Demo data functions
  const getDemoSystemStocks = () => {
    console.log('📦 Loading demo system stocks (fallback)');
    return [
      {
        _id: '1',
        name: 'Wireless Headphones',
        category: 'Electronics',
        quantity: 25,
        measurementUnit: 'pcs',
        unitPrice: 45000,
        notes: 'Premium quality with noise cancellation',
        totalValue: 1125000
      },
      {
        _id: '2',
        name: 'USB-C Cables',
        category: 'Accessories',
        quantity: 100,
        measurementUnit: 'pcs',
        unitPrice: 8000,
        notes: 'Fast charging 2m length',
        totalValue: 800000
      }
    ];
  };

  const getDemoManualStocks = () => {
    console.log('📦 Loading demo manual stocks (fallback)');
    return [
      {
        _id: '3',
        name: 'Phone Cases',
        category: 'Accessories',
        quantity: 50,
        measurementUnit: 'pcs',
        unitPrice: 15000,
        minStockLevel: 10,
        notes: 'Various models available',
        totalValue: 750000
      },
      {
        _id: '4',
        name: 'Power Banks',
        category: 'Electronics',
        quantity: 15,
        measurementUnit: 'pcs',
        unitPrice: 35000,
        minStockLevel: 5,
        notes: '10000mAh capacity',
        totalValue: 525000
      }
    ];
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading stocks...');
      
      const [systemData, manualData] = await Promise.all([
        fetchSystemStocks(),
        fetchRetailerStocks()
      ]);
      
      console.log('✅ Stocks loaded:', {
        system: systemData.length,
        manual: manualData.length
      });
      
      setSystemStocks(systemData);
      setManualStocks(manualData);
    } catch (error) {
      console.error('❌ Error loading stocks:', error);
      // Only use demo data for network errors, not auth errors
      if (error.message !== 'No authentication token found' && 
          error.message !== 'Authentication failed') {
        setSystemStocks(getDemoSystemStocks());
        setManualStocks(getDemoManualStocks());
        Alert.alert(
          'Demo Mode', 
          'Using demo data. Check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStocks();
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.category || !formData.quantity || !formData.unitPrice) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      let result;
      if (editingStock) {
        result = await updateRetailerStock(editingStock._id, formData);
        Alert.alert('Success', 'Stock item updated successfully');
      } else {
        result = await createRetailerStock(formData);
        Alert.alert('Success', 'Stock item added successfully');
      }
      
      setShowAddForm(false);
      setEditingStock(null);
      setFormData({
        name: '',
        category: '',
        quantity: '',
        measurementUnit: 'kg',
        unitPrice: '',
        minStockLevel: '',
        notes: ''
      });
      
      loadStocks();
    } catch (error) {
      console.error('Error saving stock:', error);
      Alert.alert('Error', 'Failed to save stock. Please try again.');
    }
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setFormData({
      name: stock.name,
      category: stock.category,
      quantity: stock.quantity.toString(),
      measurementUnit: stock.measurementUnit,
      unitPrice: stock.unitPrice.toString(),
      minStockLevel: stock.minStockLevel?.toString() || '',
      notes: stock.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Stock Item',
      'Are you sure you want to delete this stock item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRetailerStock(id);
              Alert.alert('Success', 'Stock item deleted successfully');
              loadStocks();
            } catch (error) {
              console.error('Error deleting stock:', error);
              Alert.alert('Error', 'Failed to delete stock. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSync = async () => {
    try {
      await syncSystemStocks();
      loadStocks();
    } catch (error) {
      Alert.alert('Sync Failed', 'Failed to sync system stocks. Please try again.');
    }
  };

  // Stock Card Component
  const StockCard = ({ stock, isSystemStock = false }) => {
    const totalValue = stock.quantity * stock.unitPrice;

    return (
      <View style={[styles.stockCard, isDarkMode && styles.darkStockCard]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.stockName, isDarkMode && styles.darkText]} numberOfLines={1}>
            {stock.name}
          </Text>
          <View style={[styles.categoryBadge, isDarkMode && styles.darkCategoryBadge]}>
            <Text style={[styles.categoryText, isDarkMode && styles.darkCategoryText]}>
              {stock.category}
            </Text>
          </View>
        </View>

        {stock.notes ? (
          <Text style={[styles.stockNotes, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
            {stock.notes}
          </Text>
        ) : null}

        <View style={styles.stockDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                Quantity:
              </Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                {stock.quantity} {stock.measurementUnit}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                Unit Price:
              </Text>
              <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                UGX {stock.unitPrice?.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.totalValueContainer}>
            <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
              Total Value:
            </Text>
            <Text style={styles.totalValueText}>
              UGX {totalValue?.toLocaleString()}
            </Text>
          </View>
        </View>

        {!isSystemStock && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEdit(stock)}
            >
              <Feather name="edit" size={14} color="#FFFFFF" />
              <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Edit</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(stock._id)}
            >
              <Feather name="trash-2" size={14} color="#FFFFFF" />
              <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Delete</Text></Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Measurement Unit Picker
  const MeasurementUnitPicker = () => {
    const units = [
      { label: 'Kilograms (kg)', value: 'kg' },
      { label: 'Grams (g)', value: 'g' },
      { label: 'Liters', value: 'liters' },
      { label: 'Milliliters (ml)', value: 'ml' },
      { label: 'Pieces', value: 'pieces' },
      { label: 'Bags', value: 'bags' },
      { label: 'Crates', value: 'crates' },
      { label: 'Boxes', value: 'boxes' },
      { label: 'Units', value: 'units' },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.unitPicker}
      >
        {units.map((unit) => (
          <TouchableOpacity
            key={unit.value}
            style={[
              styles.unitOption,
              formData.measurementUnit === unit.value && styles.selectedUnitOption,
              isDarkMode && styles.darkUnitOption
            ]}
            onPress={() => setFormData({...formData, measurementUnit: unit.value})}
          >
            <Text style={[
              styles.unitOptionText,
              formData.measurementUnit === unit.value && styles.selectedUnitOptionText,
              isDarkMode && styles.darkText
            ]}>
              {unit.value}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.header}>
          <MaterialIcons 
            name="inventory" 
            size={24} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>My Stock</Text></Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading stock data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons 
          name="inventory" 
          size={24} 
          color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
        />
        <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>My Stock</Text></Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'system' && styles.activeTab,
            activeTab === 'system' && isDarkMode && styles.darkActiveTab
          ]}
          onPress={() => setActiveTab('system')}
        >
          <MaterialCommunityIcons 
            name="package-variant" 
            size={16} 
            color={activeTab === 'system' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'system' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
            activeTab === 'system' && isDarkMode && styles.darkActiveTabText
          ]}>
            System ({systemStocks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'manual' && styles.activeTab,
            activeTab === 'manual' && isDarkMode && styles.darkActiveTab
          ]}
          onPress={() => setActiveTab('manual')}
        >
          <MaterialCommunityIcons 
            name="package-variant-plus" 
            size={16} 
            color={activeTab === 'manual' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'manual' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
            activeTab === 'manual' && isDarkMode && styles.darkActiveTabText
          ]}>
            Manual ({manualStocks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'system' ? (
          <View style={styles.tabContent}>
            {/* System Stock Info */}
            <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
              <View style={styles.infoContent}>
                <Text style={[styles.infoText, isDarkMode && styles.darkSubtitle]}>
                  System stock is automatically updated when you receive and certify orders from wholesalers.
                </Text>
                <TouchableOpacity
                  style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                  onPress={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.syncButtonText}>
                    {syncing ? 'Syncing...' : 'Sync Stock'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* System Stock Content */}
            {systemStocks.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="package-variant" 
                  size={48} 
                  color={isDarkMode ? "#6B7280" : "#9CA3AF"} 
                />
                <Text style={[styles.emptyStateTitle, isDarkMode && styles.darkText]}>
                  No System Stock Items
                </Text>
                <Text style={[styles.emptyStateSubtitle, isDarkMode && styles.darkSubtitle]}>
                  Your stock will appear here after you receive and certify orders from wholesalers.
                </Text>
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleSync}
                >
                  <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                  <Text style={styles.syncButtonText}><Text style={styles.syncButtonText}>Sync Existing Orders</Text></Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsGrid}>
                {systemStocks.map((stock) => (
                  <StockCard 
                    key={stock._id} 
                    stock={stock} 
                    isSystemStock={true} 
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* Manual Stock Header */}
            <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
              <View style={styles.infoContent}>
                <Text style={[styles.infoText, isDarkMode && styles.darkSubtitle]}>
                  Add and manage your manual stock items here.
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setShowAddForm(true);
                    setEditingStock(null);
                    setFormData({
                      name: '',
                      category: '',
                      quantity: '',
                      measurementUnit: 'kg',
                      unitPrice: '',
                      minStockLevel: '',
                      notes: ''
                    });
                  }}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.addButtonText}><Text style={styles.addButtonText}>Add Stock</Text></Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Add/Edit Form */}
            {showAddForm && (
              <View style={[styles.formCard, isDarkMode && styles.darkFormCard]}>
                <Text style={[styles.formTitle, isDarkMode && styles.darkText]}>
                  {editingStock ? 'Edit Stock Item' : 'Add New Stock Item'}
                </Text>
                
                <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                  {/* Product Name */}
                  <View style={styles.formField}>
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                      Product Name *
                    </Text>
                    <TextInput
                      style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                      value={formData.name}
                      onChangeText={(text) => setFormData({...formData, name: text})}
                      placeholder="Enter product name"
                      placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    />
                  </View>

                  {/* Category */}
                  <View style={styles.formField}>
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                      Category *
                    </Text>
                    <TextInput
                      style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                      value={formData.category}
                      onChangeText={(text) => setFormData({...formData, category: text})}
                      placeholder="Enter category"
                      placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    />
                  </View>

                  {/* Measurement Unit */}
                  <View style={styles.formField}>
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                      Measurement Unit *
                    </Text>
                    <MeasurementUnitPicker />
                  </View>

                  {/* Quantity & Unit Price Row */}
                  <View style={styles.formRow}>
                    <View style={[styles.formField, styles.halfWidth]}>
                      <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Quantity *
                      </Text>
                      <TextInput
                        style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                        value={formData.quantity}
                        onChangeText={(text) => setFormData({...formData, quantity: text})}
                        placeholder="0.00"
                        placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={[styles.formField, styles.halfWidth]}>
                      <Text style={[styles.label, isDarkMode && styles.darkText]}>
                        Unit Price (UGX) *
                      </Text>
                      <TextInput
                        style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                        value={formData.unitPrice}
                        onChangeText={(text) => setFormData({...formData, unitPrice: text})}
                        placeholder="0.00"
                        placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* Minimum Stock Level */}
                  <View style={styles.formField}>
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                      Minimum Stock Level
                    </Text>
                    <TextInput
                      style={[styles.textInput, isDarkMode && styles.darkTextInput]}
                      value={formData.minStockLevel}
                      onChangeText={(text) => setFormData({...formData, minStockLevel: text})}
                      placeholder="0.00"
                      placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {/* Notes */}
                  <View style={styles.formField}>
                    <Text style={[styles.label, isDarkMode && styles.darkText]}>
                      Notes
                    </Text>
                    <TextInput
                      style={[styles.textArea, isDarkMode && styles.darkTextInput]}
                      value={formData.notes}
                      onChangeText={(text) => setFormData({...formData, notes: text})}
                      placeholder="Additional notes (optional)"
                      placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>

                {/* Form Actions */}
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddForm(false);
                      setEditingStock(null);
                      setFormData({
                        name: '',
                        category: '',
                        quantity: '',
                        measurementUnit: 'kg',
                        unitPrice: '',
                        minStockLevel: '',
                        notes: ''
                      });
                    }}
                  >
                    <Text style={styles.cancelButtonText}><Text style={styles.cancelButtonText}>Cancel</Text></Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formButton, styles.submitButton]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>
                      {editingStock ? 'Update' : 'Add'} Stock Item
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Manual Stock Content */}
            {manualStocks.length === 0 && !showAddForm ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="package-variant-plus" 
                  size={48} 
                  color={isDarkMode ? "#6B7280" : "#9CA3AF"} 
                />
                <Text style={[styles.emptyStateTitle, isDarkMode && styles.darkText]}>
                  No Manual Stock Items
                </Text>
                <Text style={[styles.emptyStateSubtitle, isDarkMode && styles.darkSubtitle]}>
                  Click "Add Stock" to start managing your inventory.
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddForm(true)}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.addButtonText}><Text style={styles.addButtonText}>Add Stock Item</Text></Text>
                </TouchableOpacity>
              </View>
            ) : manualStocks.length > 0 && (
              <View style={styles.cardsGrid}>
                {manualStocks.map((stock) => (
                  <StockCard 
                    key={stock._id} 
                    stock={stock} 
                    isSystemStock={false}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ... (Keep the same styles object from the previous version)

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
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 12,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  darkTabsContainer: {
    borderBottomColor: '#374151',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  darkActiveTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563EB',
  },
  darkActiveTabText: {
    color: '#3B82F6',
  },
  inactiveTabText: {
    color: '#6B7280',
  },
  darkTabText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkInfoCard: {
    backgroundColor: '#374151',
  },
  infoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  cardsGrid: {
    gap: 12,
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  darkStockCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  cardHeader: {
    marginBottom: 8,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  darkCategoryBadge: {
    backgroundColor: '#1E3A8A',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  darkCategoryText: {
    color: '#60A5FA',
  },
  stockNotes: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  stockDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  darkFormCard: {
    backgroundColor: '#374151',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  formContent: {
    maxHeight: 400,
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
  },
  darkTextInput: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  unitPicker: {
    marginTop: 8,
  },
  unitOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  darkUnitOption: {
    backgroundColor: '#374151',
  },
  selectedUnitOption: {
    backgroundColor: '#3B82F6',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedUnitOptionText: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default MyStock;