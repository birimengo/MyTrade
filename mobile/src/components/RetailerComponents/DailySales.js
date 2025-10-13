import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
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
  MaterialCommunityIcons,
  Ionicons,
} from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const DailySales = () => {
  const [activeTab, setActiveTab] = useState('selectProduct');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [salesRecords, setSalesRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stockType, setStockType] = useState('all');
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [showLowStockPanel, setShowLowStockPanel] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showReceiptPanel, setShowReceiptPanel] = useState(false);
  const [receiptCustomerName, setReceiptCustomerName] = useState('');
  const [receiptCustomerPhone, setReceiptCustomerPhone] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(Math.floor(100000 + Math.random() * 900000));
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState(null);

  const { user, token, getAuthHeaders, API_BASE_URL, logout } = useAuth();
  const { isDarkMode } = useDarkMode();

  // Enhanced auth token function
  const getAuthToken = () => {
    return token;
  };

  // Enhanced API call with better error handling
  const apiCall = async (endpoint, options = {}) => {
    try {
      const authToken = getAuthToken();
      
      if (!authToken) {
        Alert.alert(
          'Authentication Required',
          'Please log in again to continue.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/api${endpoint}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);

      if (response.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        // Don't throw error for 404 - just return empty array
        if (response.status === 404) {
          console.log(`⚠️ Endpoint not found: ${endpoint}, returning empty data`);
          return { data: [] };
        }
        
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  };

  // API call functions
  const fetchProducts = async () => {
    try {
      const [retailerData, systemData] = await Promise.all([
        apiCall('/retailer-stocks'),
        apiCall('/system-stocks')
      ]);

      const retailerProducts = (retailerData.stocks || retailerData || []).map(stock => ({ 
        ...stock, 
        stockType: 'retailer',
        lowStockAlert: stock.quantity <= (stock.minStockLevel || 5)
      }));
      
      const systemProducts = (systemData.stocks || systemData || []).map(stock => ({ 
        ...stock, 
        stockType: 'system',
        lowStockAlert: stock.quantity <= 5
      }));

      const allProducts = [...retailerProducts, ...systemProducts];
      return allProducts;
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.message !== 'No authentication token found' && 
          error.message !== 'Authentication failed') {
        return getDemoProducts();
      }
      return [];
    }
  };

  const fetchSalesRecords = async () => {
    try {
      const data = await apiCall('/retailer-sales');
      const sales = data.sales || data || [];
      return sales;
    } catch (error) {
      console.error('Error fetching sales records:', error);
      if (error.message !== 'No authentication token found' && 
          error.message !== 'Authentication failed') {
        return getDemoSales();
      }
      return [];
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const data = await apiCall('/retailer-sales/low-stock-alerts');
      return data.lowStockItems || data || [];
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      // Return empty array instead of throwing for 404 errors
      return [];
    }
  };

  const recordSale = async (saleData) => {
    try {
      const data = await apiCall('/retailer-sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });
      return data;
    } catch (error) {
      console.error('Error recording sale:', error);
      throw error;
    }
  };

  // Demo data functions (fallback)
  const getDemoProducts = () => {
    return [
      {
        _id: '1',
        name: 'Wireless Headphones',
        category: 'Electronics',
        quantity: 15,
        measurementUnit: 'pcs',
        unitPrice: 49000,
        stockType: 'retailer',
        lowStockAlert: false
      },
      {
        _id: '2', 
        name: 'Smartphone Case',
        category: 'Accessories',
        quantity: 3,
        measurementUnit: 'pcs',
        unitPrice: 12000,
        stockType: 'retailer',
        lowStockAlert: true
      },
      {
        _id: '3',
        name: 'Laptop',
        category: 'Electronics',
        quantity: 8,
        measurementUnit: 'pcs',
        unitPrice: 1200000,
        stockType: 'system',
        lowStockAlert: false
      }
    ];
  };

  const getDemoSales = () => {
    return [
      {
        _id: 's1',
        productName: 'Wireless Headphones',
        quantity: 2,
        measurementUnit: 'pcs',
        sellingPrice: 59000,
        profit: 20000,
        saleDate: new Date().toISOString(),
        customerName: 'John Doe'
      },
      {
        _id: 's2',
        productName: 'Smartphone Case',
        quantity: 1,
        measurementUnit: 'pcs',
        sellingPrice: 15000,
        profit: 3000,
        saleDate: new Date(Date.now() - 86400000).toISOString(),
        customerName: 'Jane Smith'
      }
    ];
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [productsData, salesData, alertsData] = await Promise.all([
        fetchProducts(),
        fetchSalesRecords(),
        fetchLowStockAlerts()
      ]);
      
      setProducts(productsData);
      setFilteredProducts(productsData);
      setSalesRecords(salesData);
      setLowStockAlerts(alertsData);
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // Only use demo data for network errors, not auth errors
      if (error.message !== 'No authentication token found' && 
          error.message !== 'Authentication failed') {
        const demoProducts = getDemoProducts();
        const demoAlerts = demoProducts.filter(product => product.lowStockAlert);
        setProducts(demoProducts);
        setFilteredProducts(demoProducts);
        setSalesRecords(getDemoSales());
        setLowStockAlerts(demoAlerts);
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

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    let filtered = products;
    
    if (stockType !== 'all') {
      filtered = filtered.filter(product => product.stockType === stockType);
    }
    
    if (query) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) || 
        product.category.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  };

  const handleStockTypeChange = (value) => {
    setStockType(value);
    handleSearch(searchQuery);
  };

  const toggleLowStockPanel = () => {
    setShowLowStockPanel(!showLowStockPanel);
  };

  const toggleReceiptPanel = () => {
    setShowReceiptPanel(!showReceiptPanel);
    if (!showReceiptPanel) {
      setReceiptNumber(Math.floor(100000 + Math.random() * 900000));
    }
  };

  const handleSalesSelection = (saleId) => {
    setSelectedSales(prev => {
      const isSelected = prev.includes(saleId);
      if (isSelected) {
        return prev.filter(id => id !== saleId);
      } else {
        return [...prev, saleId];
      }
    });
  };

  const selectAllSales = () => {
    setSelectedSales(prev => {
      if (prev.length === salesRecords.length) {
        return [];
      } else {
        return salesRecords.map(sale => sale._id);
      }
    });
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSellingPrice(product.unitPrice ? product.unitPrice.toString() : '');
    // Auto-switch to record sale tab
    setActiveTab('recordSale');
  };

  const calculateProfit = () => {
    if (!selectedProduct || !saleQuantity || !sellingPrice) return 0;
    
    const cost = (selectedProduct.unitPrice || 0) * parseFloat(saleQuantity);
    const revenue = parseFloat(sellingPrice) * parseFloat(saleQuantity);
    
    return revenue - cost;
  };

  const calculateReceiptTotals = () => {
    const selectedSalesData = salesRecords.filter(sale => selectedSales.includes(sale._id));
    
    const subtotal = selectedSalesData.reduce((total, sale) => {
      return total + (sale.quantity * (sale.sellingPrice || 0));
    }, 0);
    
    const totalQuantity = selectedSalesData.reduce((total, sale) => total + sale.quantity, 0);
    
    return { subtotal, totalQuantity, items: selectedSalesData.length, salesData: selectedSalesData };
  };

  const handleSale = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }
    
    if (!saleQuantity || parseFloat(saleQuantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    
    if (parseFloat(saleQuantity) > selectedProduct.quantity) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }
    
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid selling price');
      return;
    }
    
    try {
      const saleData = {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        quantity: parseFloat(saleQuantity),
        measurementUnit: selectedProduct.measurementUnit,
        unitCost: selectedProduct.unitPrice,
        sellingPrice: parseFloat(sellingPrice),
        profit: calculateProfit(),
        customerName,
        customerPhone,
        stockType: selectedProduct.stockType
      };
      
      await recordSale(saleData);
      
      Alert.alert('Success', 'Sale recorded successfully');
      
      // Reset form and switch to recent sales tab
      setSelectedProduct(null);
      setSaleQuantity('');
      setSellingPrice('');
      setCustomerName('');
      setCustomerPhone('');
      setActiveTab('recentSales');
      
      // Refresh data
      loadData();
      
    } catch (error) {
      console.error('Error recording sale:', error);
      Alert.alert('Error', 'Failed to record sale. Please try again.');
    }
  };

  const saveReceipt = async () => {
    if (selectedSales.length === 0) {
      Alert.alert('Error', 'Please select sales items for the receipt');
      return;
    }

    setSavingReceipt(true);

    try {
      // Simulate receipt saving since we don't have a receipts endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const receipt = {
        receiptNumber: receiptNumber,
        receiptDate: new Date().toISOString(),
        customerName: receiptCustomerName,
        customerPhone: receiptCustomerPhone,
        items: salesRecords.filter(sale => selectedSales.includes(sale._id)).map(sale => ({
          productName: sale.productName,
          quantity: sale.quantity,
          measurementUnit: sale.measurementUnit,
          unitPrice: sale.sellingPrice,
          totalPrice: sale.quantity * sale.sellingPrice
        })),
        subtotal: calculateReceiptTotals().subtotal,
        grandTotal: calculateReceiptTotals().subtotal
      };

      setReceiptDetails(receipt);
      setSavingReceipt(false);
      return receipt;
    } catch (error) {
      console.error('Error saving receipt:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
      setSavingReceipt(false);
      throw error;
    }
  };

  const printReceipt = async () => {
    try {
      const savedReceipt = await saveReceipt();
      
      Alert.alert(
        'Receipt Ready', 
        `Receipt #${savedReceipt.receiptNumber} has been saved successfully!\n\nTotal: UGX ${savedReceipt.grandTotal?.toLocaleString() || calculateReceiptTotals().subtotal.toLocaleString()}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedSales([]);
              setShowReceiptPanel(false);
              setReceiptCustomerName('');
              setReceiptCustomerPhone('');
              setReceiptNumber(Math.floor(100000 + Math.random() * 900000));
              setReceiptDetails(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in print process:', error);
    }
  };

  const saveReceiptOnly = async () => {
    try {
      const savedReceipt = await saveReceipt();
      Alert.alert('Success', `Receipt #${savedReceipt.receiptNumber} saved successfully!`);
      
      // Don't reset the form - keep the receipt visible for user to see
    } catch (error) {
      console.error('Error saving receipt:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Format UGX currency
  const formatUGX = (amount) => {
    return `UGX ${amount?.toLocaleString() || '0'}`;
  };

  // Render receipt preview
  const renderReceiptPreview = () => {
    if (!receiptDetails) return null;

    return (
      <View style={[styles.receiptPreview, isDarkMode && styles.darkReceiptPreview]}>
        <Text style={[styles.receiptPreviewTitle, isDarkMode && styles.darkText]}>
          Receipt Preview
        </Text>
        
        <View style={styles.receiptHeaderPreview}>
          <Text style={[styles.receiptBusinessName, isDarkMode && styles.darkText]}>
            YOUR BUSINESS NAME
          </Text>
          <Text style={[styles.receiptNumber, isDarkMode && styles.darkSubtitle]}>
            Receipt #: {receiptDetails.receiptNumber}
          </Text>
          <Text style={[styles.receiptDate, isDarkMode && styles.darkSubtitle]}>
            Date: {new Date(receiptDetails.receiptDate).toLocaleDateString()}
          </Text>
          <Text style={[styles.receiptTime, isDarkMode && styles.darkSubtitle]}>
            Time: {new Date(receiptDetails.receiptDate).toLocaleTimeString()}
          </Text>
        </View>

        {(receiptDetails.customerName || receiptDetails.customerPhone) && (
          <View style={styles.customerSectionPreview}>
            {receiptDetails.customerName && (
              <Text style={[styles.customerDetail, isDarkMode && styles.darkText]}>
                Customer: {receiptDetails.customerName}
              </Text>
            )}
            {receiptDetails.customerPhone && (
              <Text style={[styles.customerDetail, isDarkMode && styles.darkSubtitle]}>
                Phone: {receiptDetails.customerPhone}
              </Text>
            )}
          </View>
        )}

        <View style={styles.itemsHeader}>
          <Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}><Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}>Item</Text></Text>
          <Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}><Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}>Qty</Text></Text>
          <Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}><Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}>Price</Text></Text>
          <Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}><Text style={[styles.itemsHeaderText, isDarkMode && styles.darkText]}>Total</Text></Text>
        </View>

        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {receiptDetails.items.map((item, index) => (
            <View key={index} style={styles.receiptItem}>
              <View style={styles.itemNameColumn}>
                <Text style={[styles.itemName, isDarkMode && styles.darkText]} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={[styles.itemUnit, isDarkMode && styles.darkSubtitle]}>
                  {item.measurementUnit}
                </Text>
              </View>
              <Text style={[styles.itemQuantity, isDarkMode && styles.darkText]}>
                {item.quantity}
              </Text>
              <Text style={[styles.itemPrice, isDarkMode && styles.darkText]}>
                {formatUGX(item.unitPrice)}
              </Text>
              <Text style={[styles.itemTotal, isDarkMode && styles.darkText]}>
                {formatUGX(item.totalPrice)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.receiptTotal}>
          <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}><Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>TOTAL:</Text></Text>
          <Text style={[styles.totalAmount, isDarkMode && styles.darkText]}>
            {formatUGX(receiptDetails.grandTotal)}
          </Text>
        </View>

        <View style={styles.receiptFooter}>
          <Text style={[styles.footerText, isDarkMode && styles.darkSubtitle]}>
            Thank you for your business!
          </Text>
        </View>
      </View>
    );
  };

  // Product Item Component
  const ProductItem = ({ item }) => {
    const isSelected = selectedProduct && selectedProduct._id === item._id;
    
    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          isSelected ? styles.selectedProduct : styles.normalProduct,
          isDarkMode && (isSelected ? styles.darkSelectedProduct : styles.darkNormalProduct)
        ]}
        onPress={() => selectProduct(item)}
      >
        <View style={styles.productHeader}>
          <Text style={[styles.productName, isDarkMode && styles.darkText]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[
            styles.stockTypeBadge,
            item.stockType === 'retailer' ? styles.retailerBadge : styles.systemBadge,
            isDarkMode && (item.stockType === 'retailer' ? styles.darkRetailerBadge : styles.darkSystemBadge)
          ]}>
            <Text style={[
              styles.stockTypeText,
              item.stockType === 'retailer' ? styles.retailerText : styles.systemText
            ]}>
              {item.stockType}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.productDetails, isDarkMode && styles.darkSubtitle]}>
          {item.category} • {item.quantity} {item.measurementUnit}
        </Text>
        
        <Text style={[styles.productCost, isDarkMode && styles.darkText]}>
          Cost: {formatUGX(item.unitPrice)}
        </Text>
        
        {item.lowStockAlert && (
          <View style={styles.lowStockWarning}>
            <Ionicons name="warning" size={12} color="#dc2626" />
            <Text style={styles.lowStockText}><Text style={styles.lowStockText}>Low Stock!</Text></Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Sale Item Component
  const SaleItem = ({ item }) => {
    const isSelected = selectedSales.includes(item._id);
    const profit = item.profit || 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.saleItem,
          isSelected ? styles.selectedSale : styles.normalSale,
          isDarkMode && (isSelected ? styles.darkSelectedSale : styles.darkNormalSale)
        ]}
        onPress={() => handleSalesSelection(item._id)}
      >
        <View style={styles.saleHeader}>
          <Text style={[styles.saleProductName, isDarkMode && styles.darkText]} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={[
            styles.saleProfit,
            profit >= 0 ? styles.positiveProfit : styles.negativeProfit
          ]}>
            {profit >= 0 ? '+' : ''}{formatUGX(profit)}
          </Text>
        </View>
        
        <Text style={[styles.saleDetails, isDarkMode && styles.darkSubtitle]}>
          {item.quantity} {item.measurementUnit} • {formatUGX(item.sellingPrice)} each
        </Text>
        
        <Text style={[styles.saleDate, isDarkMode && styles.darkSubtitle]}>
          {new Date(item.saleDate).toLocaleDateString()} • {new Date(item.saleDate).toLocaleTimeString()}
        </Text>
        
        {item.customerName && (
          <View style={styles.customerInfo}>
            <Feather name="user" size={12} color="#2563eb" />
            <Text style={styles.customerName}>{item.customerName}</Text>
          </View>
        )}
        
        {isSelected && (
          <View style={styles.selectedInfo}>
            <Feather name="file-text" size={12} color="#2563eb" />
            <Text style={styles.selectedText}><Text style={styles.selectedText}>Selected for receipt</Text></Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const profit = calculateProfit();
  const receiptTotals = calculateReceiptTotals();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'selectProduct':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
              <Feather name="search" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              <TextInput
                style={[styles.searchInput, isDarkMode && styles.darkInput]}
                placeholder="Search products..."
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, isDarkMode && styles.darkText]}>
                Stock Type:
              </Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    stockType === 'all' && styles.filterButtonActive,
                    isDarkMode && styles.darkFilterButton
                  ]}
                  onPress={() => handleStockTypeChange('all')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    stockType === 'all' && styles.filterButtonTextActive
                  ]}>
                    All Stock
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    stockType === 'retailer' && styles.filterButtonActive,
                    isDarkMode && styles.darkFilterButton
                  ]}
                  onPress={() => handleStockTypeChange('retailer')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    stockType === 'retailer' && styles.filterButtonTextActive
                  ]}>
                    Retailer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    stockType === 'system' && styles.filterButtonActive,
                    isDarkMode && styles.darkFilterButton
                  ]}
                  onPress={() => handleStockTypeChange('system')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    stockType === 'system' && styles.filterButtonTextActive
                  ]}>
                    System
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => <ProductItem item={item} />}
              keyExtractor={(item) => `${item.stockType}-${item._id}`}
              style={styles.productList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor={isDarkMode ? '#3B82F6' : '#3B82F6'}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="package" size={32} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                  <Text style={[styles.emptyStateText, isDarkMode && styles.darkSubtitle]}>
                    No products found
                  </Text>
                  <Text style={[styles.emptyStateSubtext, isDarkMode && styles.darkSubtitle]}>
                    Try a different search term
                  </Text>
                </View>
              }
            />
          </View>
        );

      case 'recordSale':
        return (
          <View style={styles.tabContent}>
            {selectedProduct ? (
              <ScrollView style={styles.salesForm} showsVerticalScrollIndicator={false}>
                <View style={[styles.selectedProductCard, isDarkMode && styles.darkSelectedProductCard]}>
                  <Text style={[styles.productCardName, isDarkMode && styles.darkText]}>
                    {selectedProduct.name}
                  </Text>
                  <Text style={[styles.productCardDetails, isDarkMode && styles.darkSubtitle]}>
                    Category: {selectedProduct.category}
                  </Text>
                  <Text style={[styles.productCardDetails, isDarkMode && styles.darkSubtitle]}>
                    Available: {selectedProduct.quantity} {selectedProduct.measurementUnit}
                  </Text>
                  <Text style={[styles.productCardDetails, isDarkMode && styles.darkSubtitle]}>
                    Cost Price: {formatUGX(selectedProduct.unitPrice)}
                  </Text>
                  {selectedProduct.lowStockAlert && (
                    <View style={styles.productAlert}>
                      <Ionicons name="warning" size={12} color="#dc2626" />
                      <Text style={styles.productAlertText}><Text style={styles.productAlertText}>Low Stock Warning!</Text></Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                    Quantity:
                  </Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.darkInput]}
                    value={saleQuantity}
                    onChangeText={setSaleQuantity}
                    placeholder={`Enter quantity in ${selectedProduct.measurementUnit}`}
                    placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.inputHelp, isDarkMode && styles.darkSubtitle]}>
                    Max: {selectedProduct.quantity} {selectedProduct.measurementUnit}
                  </Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.darkText]}>
                    Selling Price:
                  </Text>
                  <View style={styles.priceInput}>
                    <Feather name="dollar-sign" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                    <TextInput
                      style={[styles.input, styles.priceInputField, isDarkMode && styles.darkInput]}
                      value={sellingPrice}
                      onChangeText={setSellingPrice}
                      placeholder="Enter selling price per unit"
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                
                <View style={[styles.profitCard, isDarkMode && styles.darkProfitCard]}>
                  <Text style={[styles.profitLabel, isDarkMode && styles.darkText]}>
                    Profit:
                  </Text>
                  <Text style={[
                    styles.profitValue,
                    profit >= 0 ? styles.positiveProfit : styles.negativeProfit
                  ]}>
                    {profit >= 0 ? '+' : ''}{formatUGX(profit)}
                  </Text>
                  {profit < 0 && (
                    <View style={styles.profitWarning}>
                      <Ionicons name="warning" size={12} color="#dc2626" />
                      <Text style={styles.profitWarningText}>
                        Warning: Selling below cost price
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.customerSection}>
                  <View style={styles.sectionTitleRow}>
                    <Feather name="user" size={16} color={isDarkMode ? "#9CA3AF" : "#374151"} />
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                      Customer Details (Optional)
                    </Text>
                  </View>
                  <View style={styles.customerInputs}>
                    <TextInput
                      style={[styles.input, isDarkMode && styles.darkInput]}
                      placeholder="Customer Name"
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                    <TextInput
                      style={[styles.input, isDarkMode && styles.darkInput]}
                      placeholder="Phone Number"
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.saleButton}
                  onPress={handleSale}
                  disabled={loading}
                >
                  <Feather name="shopping-cart" size={16} color="#ffffff" />
                  <Text style={styles.saleButtonText}>
                    {loading ? 'Processing...' : 'Record Sale'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.emptySelection}>
                <Feather name="package" size={48} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                <Text style={[styles.emptySelectionText, isDarkMode && styles.darkSubtitle]}>
                  No product selected
                </Text>
                <Text style={[styles.emptySelectionSubtext, isDarkMode && styles.darkSubtitle]}>
                  Select a product from the "Select Product" tab to record a sale
                </Text>
                <TouchableOpacity
                  style={styles.backToProductsButton}
                  onPress={() => setActiveTab('selectProduct')}
                >
                  <Text style={styles.backToProductsText}><Text style={styles.backToProductsText}>Browse Products</Text></Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'recentSales':
        return (
          <View style={styles.tabContent}>
            <View style={styles.salesHeader}>
              {salesRecords.length > 0 && (
                <TouchableOpacity 
                  style={[styles.createReceiptButton, isDarkMode && styles.darkCreateReceiptButton]}
                  onPress={toggleReceiptPanel}
                >
                  <Feather name="file-text" size={16} color="#ffffff" />
                  <Text style={styles.createReceiptButtonText}>
                    Create Receipt ({selectedSales.length})
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
                <Feather name="refresh-cw" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            {salesRecords.length > 0 && (
              <TouchableOpacity onPress={selectAllSales} style={styles.selectAllButton}>
                <Text style={[styles.selectAllText, isDarkMode && styles.darkSelectAllText]}>
                  {selectedSales.length === salesRecords.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={salesRecords}
              renderItem={({ item }) => <SaleItem item={item} />}
              keyExtractor={(item) => item._id}
              style={styles.salesList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor={isDarkMode ? '#3B82F6' : '#3B82F6'}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="dollar-sign" size={32} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                  <Text style={[styles.emptyStateText, isDarkMode && styles.darkSubtitle]}>
                    No sales recorded yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, isDarkMode && styles.darkSubtitle]}>
                    Sales will appear here once recorded
                  </Text>
                </View>
              }
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading sales data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons 
            name="point-of-sale" 
            size={24} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>Daily Sales</Text></Text>
        </View>
        
        {/* Low Stock Alerts Button */}
        {lowStockAlerts.length > 0 && (
          <TouchableOpacity
            onPress={toggleLowStockPanel}
            style={[styles.alertButton, isDarkMode && styles.darkAlertButton]}
          >
            <Ionicons name="warning" size={14} color={isDarkMode ? "#FCA5A5" : "#dc2626"} />
            <Text style={[styles.alertButtonText, isDarkMode && styles.darkAlertButtonText]}>
              Low Stock ({lowStockAlerts.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Low Stock Alerts Panel */}
      {showLowStockPanel && (
        <View style={[styles.alertPanel, isDarkMode && styles.darkAlertPanel]}>
          <View style={styles.alertHeader}>
            <View style={styles.alertTitle}>
              <Ionicons name="warning" size={16} color="#dc2626" />
              <Text style={[styles.alertTitleText, isDarkMode && styles.darkText]}><Text style={[styles.alertTitleText, isDarkMode && styles.darkText]}>Low Stock Alerts</Text></Text>
            </View>
            <TouchableOpacity onPress={toggleLowStockPanel}>
              <Text style={[styles.closeButton, isDarkMode && styles.darkText]}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.alertList}>
            {lowStockAlerts.map(item => (
              <View key={item._id} style={[styles.alertItem, isDarkMode && styles.darkAlertItem]}>
                <Text style={[styles.alertProductName, isDarkMode && styles.darkText]}>
                  {item.name}
                </Text>
                <Text style={[styles.alertDetails, isDarkMode && styles.darkSubtitle]}>
                  Only {item.quantity} {item.measurementUnit} left • {item.category}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'selectProduct' && styles.activeTab,
            activeTab === 'selectProduct' && isDarkMode && styles.darkActiveTab
          ]}
          onPress={() => setActiveTab('selectProduct')}
        >
          <Feather 
            name="package" 
            size={16} 
            color={activeTab === 'selectProduct' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'selectProduct' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
            activeTab === 'selectProduct' && isDarkMode && styles.darkActiveTabText
          ]}>
            Select Product
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'recordSale' && styles.activeTab,
            activeTab === 'recordSale' && isDarkMode && styles.darkActiveTab
          ]}
          onPress={() => setActiveTab('recordSale')}
        >
          <Feather 
            name="shopping-cart" 
            size={16} 
            color={activeTab === 'recordSale' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'recordSale' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
            activeTab === 'recordSale' && isDarkMode && styles.darkActiveTabText
          ]}>
            Record Sale
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'recentSales' && styles.activeTab,
            activeTab === 'recentSales' && isDarkMode && styles.darkActiveTab
          ]}
          onPress={() => setActiveTab('recentSales')}
        >
          <Feather 
            name="dollar-sign" 
            size={16} 
            color={activeTab === 'recentSales' ? (isDarkMode ? '#3B82F6' : '#2563EB') : (isDarkMode ? '#9CA3AF' : '#6B7280')} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'recentSales' ? styles.activeTabText : (isDarkMode ? styles.darkTabText : styles.inactiveTabText),
            activeTab === 'recentSales' && isDarkMode && styles.darkActiveTabText
          ]}>
            Recent Sales
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Receipt Panel Modal - Increased Height */}
      <Modal
        visible={showReceiptPanel}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleReceiptPanel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptPanel, isDarkMode && styles.darkReceiptPanel]}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptTitle}>
                <Feather name="file-text" size={18} color={isDarkMode ? "#60A5FA" : "#1d4ed8"} />
                <Text style={[styles.receiptTitleText, isDarkMode && styles.darkText]}>
                  Create Receipt
                </Text>
              </View>
              <TouchableOpacity onPress={toggleReceiptPanel}>
                <Text style={[styles.closeButton, isDarkMode && styles.darkText]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.receiptContent} showsVerticalScrollIndicator={false}>
              {selectedSales.length > 0 ? (
                <>
                  {!receiptDetails ? (
                    <>
                      <View style={styles.receiptSection}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                          Customer Details (Optional):
                        </Text>
                        <View style={styles.customerInputs}>
                          <TextInput
                            style={[styles.input, isDarkMode && styles.darkInput]}
                            placeholder="Customer Name"
                            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                            value={receiptCustomerName}
                            onChangeText={setReceiptCustomerName}
                          />
                          <TextInput
                            style={[styles.input, isDarkMode && styles.darkInput]}
                            placeholder="Phone Number"
                            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                            value={receiptCustomerPhone}
                            onChangeText={setReceiptCustomerPhone}
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>
                      
                      <View style={[styles.receiptSummary, isDarkMode && styles.darkReceiptSummary]}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                          Receipt Summary:
                        </Text>
                        <View style={styles.summaryGrid}>
                          <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                            Receipt #:
                          </Text>
                          <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                            {receiptNumber}
                          </Text>
                          
                          <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                            Items:
                          </Text>
                          <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                            {receiptTotals.items}
                          </Text>
                          
                          <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                            Total Quantity:
                          </Text>
                          <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                            {receiptTotals.totalQuantity}
                          </Text>
                          
                          <Text style={[styles.summaryLabel, styles.totalLabel, isDarkMode && styles.darkText]}>
                            Total Amount:
                          </Text>
                          <Text style={[styles.summaryValue, styles.totalValue]}>
                            {formatUGX(receiptTotals.subtotal)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.receiptActions}>
                        <TouchableOpacity
                          onPress={saveReceiptOnly}
                          disabled={savingReceipt}
                          style={[styles.actionButton, styles.saveButton, savingReceipt && styles.disabledButton]}
                        >
                          {savingReceipt ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Feather name="save" size={16} color="#ffffff" />
                          )}
                          <Text style={styles.actionButtonText}>
                            {savingReceipt ? 'Saving...' : 'Save Receipt'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={printReceipt}
                          disabled={savingReceipt}
                          style={[styles.actionButton, styles.printButton, savingReceipt && styles.disabledButton]}
                        >
                          {savingReceipt ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Feather name="printer" size={16} color="#ffffff" />
                          )}
                          <Text style={styles.actionButtonText}>
                            {savingReceipt ? 'Saving...' : 'Save & Print'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      {renderReceiptPreview()}
                      <View style={styles.receiptActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedSales([]);
                            setShowReceiptPanel(false);
                            setReceiptCustomerName('');
                            setReceiptCustomerPhone('');
                            setReceiptNumber(Math.floor(100000 + Math.random() * 900000));
                            setReceiptDetails(null);
                          }}
                          style={[styles.actionButton, styles.doneButton]}
                        >
                          <Feather name="check" size={16} color="#ffffff" />
                          <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Done</Text></Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={printReceipt}
                          style={[styles.actionButton, styles.printButton]}
                        >
                          <Feather name="printer" size={16} color="#ffffff" />
                          <Text style={styles.actionButtonText}><Text style={styles.actionButtonText}>Print Receipt</Text></Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.emptyReceipt}>
                  <Feather name="file-text" size={48} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
                  <Text style={[styles.emptyReceiptText, isDarkMode && styles.darkSubtitle]}>
                    Select sales items from Recent Sales to create a receipt
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  darkAlertButton: {
    backgroundColor: '#7F1D1D',
  },
  alertButtonText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  darkAlertButtonText: {
    color: '#FCA5A5',
  },
  alertPanel: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    padding: 12,
    maxHeight: 200,
  },
  darkAlertPanel: {
    backgroundColor: '#1F2937',
    borderColor: '#DC2626',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  alertList: {
    flex: 1,
  },
  alertItem: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  darkAlertItem: {
    backgroundColor: '#374151',
  },
  alertProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  alertDetails: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 2,
  },
  closeButton: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
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
    flex: 1,
    justifyContent: 'center',
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
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 12,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#374151',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    alignItems: 'center',
  },
  darkFilterButton: {
    backgroundColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    flex: 1,
  },
  productItem: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  normalProduct: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  darkNormalProduct: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  selectedProduct: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  darkSelectedProduct: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  stockTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  retailerBadge: {
    backgroundColor: '#DCFCE7',
  },
  darkRetailerBadge: {
    backgroundColor: '#166534',
  },
  systemBadge: {
    backgroundColor: '#F3E8FF',
  },
  darkSystemBadge: {
    backgroundColor: '#7E22CE',
  },
  stockTypeText: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  retailerText: {
    color: '#16A34A',
  },
  systemText: {
    color: '#9333EA',
  },
  productDetails: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  productCost: {
    fontSize: 10,
    color: '#374151',
    marginTop: 2,
  },
  lowStockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  lowStockText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  salesForm: {
    flex: 1,
  },
  selectedProductCard: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 6,
    borderColor: '#3B82F6',
    borderWidth: 1,
    marginBottom: 12,
  },
  darkSelectedProductCard: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  productCardDetails: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  productAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  productAlertText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#6B7280',
    color: '#FFFFFF',
  },
  inputHelp: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputField: {
    flex: 1,
    marginLeft: 8,
  },
  profitCard: {
    backgroundColor: '#FEFCE8',
    padding: 12,
    borderRadius: 6,
    borderColor: '#F59E0B',
    borderWidth: 1,
    marginBottom: 12,
  },
  darkProfitCard: {
    backgroundColor: '#713F12',
    borderColor: '#F59E0B',
  },
  profitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  positiveProfit: {
    color: '#16A34A',
  },
  negativeProfit: {
    color: '#DC2626',
  },
  profitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  profitWarningText: {
    fontSize: 10,
    color: '#DC2626',
  },
  customerSection: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  customerInputs: {
    gap: 8,
  },
  saleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  saleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptySelection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptySelectionText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emptySelectionSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
  backToProductsButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  backToProductsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  darkCreateReceiptButton: {
    backgroundColor: '#1E3A8A',
  },
  createReceiptButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 4,
  },
  selectAllButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  darkSelectAllText: {
    color: '#60A5FA',
  },
  salesList: {
    flex: 1,
  },
  saleItem: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  normalSale: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  darkNormalSale: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  selectedSale: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  darkSelectedSale: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  saleDetails: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  saleDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  saleProfit: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  customerName: {
    fontSize: 10,
    color: '#2563EB',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  selectedText: {
    fontSize: 10,
    color: '#2563EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  receiptPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: height * 0.85,
    minHeight: height * 0.7,
  },
  darkReceiptPanel: {
    backgroundColor: '#1F2937',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  receiptContent: {
    flex: 1,
  },
  receiptSection: {
    marginBottom: 16,
  },
  receiptSummary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  darkReceiptSummary: {
    backgroundColor: '#374151',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryLabel: {
    width: '50%',
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 2,
  },
  summaryValue: {
    width: '50%',
    fontSize: 12,
    color: '#374151',
    textAlign: 'right',
    paddingVertical: 2,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#16A34A',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  saveButton: {
    backgroundColor: '#2563EB',
  },
  printButton: {
    backgroundColor: '#16A34A',
  },
  doneButton: {
    backgroundColor: '#6B7280',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyReceipt: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyReceiptText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  receiptPreview: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  darkReceiptPreview: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  receiptPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  receiptHeaderPreview: {
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  receiptBusinessName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 12,
    color: '#6B7280',
  },
  receiptDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  receiptTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  customerSectionPreview: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  customerDetail: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  itemsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  itemsList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemNameColumn: {
    flex: 2,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 12,
    color: '#374151',
  },
  itemUnit: {
    fontSize: 10,
    color: '#6B7280',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#374151',
    paddingTop: 12,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
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
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  positiveProfit: {
    color: '#16A34A',
  },
  negativeProfit: {
    color: '#DC2626',
  },
});

export default DailySales;