// src/components/SupplierComponents/SalesHistory.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  Alert,
  TextInput
} from 'react-native';
import { useDarkMode } from '../../context/DarkModeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SalesHistoryTab = ({ apiCall }) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [existingReceipts, setExistingReceipts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showCreateReceiptModal, setShowCreateReceiptModal] = useState(false);
  const [receiptNotes, setReceiptNotes] = useState('');

  const loadSalesHistory = async () => {
    try {
      setLoading(true);
      
      // Load both sales and receipts to cross-reference
      const [salesResponse, receiptsResponse] = await Promise.all([
        apiCall('/supplier-sales?limit=100'),
        apiCall('/supplier-receipts?limit=100&status=active')
      ]);

      if (salesResponse && salesResponse.success) {
        setAllSales(salesResponse.sales || []);
        
        if (receiptsResponse && receiptsResponse.success) {
          setExistingReceipts(receiptsResponse.receipts || []);
          
          // Extract all sale IDs that are already in receipts
          const salesInReceipts = new Set();
          receiptsResponse.receipts.forEach(receipt => {
            if (receipt.sales && Array.isArray(receipt.sales)) {
              receipt.sales.forEach(sale => {
                if (sale._id) salesInReceipts.add(sale._id);
                if (typeof sale === 'string') salesInReceipts.add(sale);
              });
            }
          });

          console.log('Sales in receipts:', Array.from(salesInReceipts));
          console.log('Total sales from API:', salesResponse.sales.length);

          // Filter out sales that are in receipts and only show completed sales
          const availableSales = salesResponse.sales.filter(sale => 
            !salesInReceipts.has(sale._id) && 
            sale.status === 'completed'
          );
          
          console.log('Available sales for receipts:', availableSales.length);
          setSalesHistory(availableSales);
        } else {
          // Fallback: only show completed sales if receipts API fails
          const completedSales = salesResponse.sales.filter(sale => 
            sale.status === 'completed'
          );
          setSalesHistory(completedSales);
        }
      } else {
        // Mock data fallback
        const mockData = [
          { 
            _id: '1',
            saleNumber: 'SALE-1737456000000-ABC123', 
            customerDetails: { 
              name: 'John Doe',
              email: 'john.doe@email.com',
              phone: '+256712345678',
              address: '123 Main Street, Kampala',
              customerType: 'regular'
            }, 
            totalAmount: 250000, 
            totalProfit: 75000,
            totalProfitMargin: 30,
            saleDate: '2024-01-15T10:30:00.000Z',
            status: 'completed',
            paymentMethod: 'cash',
            paymentStatus: 'paid',
            notes: 'Regular customer, paid in full',
            items: [
              { 
                productName: 'Tomatoes', 
                quantity: 10, 
                unitPrice: 5000, 
                productionPrice: 3500,
                totalPrice: 50000,
                profit: 15000,
                profitMargin: 30
              },
              { 
                productName: 'Onions', 
                quantity: 5, 
                unitPrice: 40000, 
                productionPrice: 28000,
                totalPrice: 200000,
                profit: 60000,
                profitMargin: 30
              }
            ],
            discountAmount: 0,
            discountPercentage: 0,
            taxAmount: 0,
            shippingDetails: { shippingCost: 0 },
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z'
          }
        ];
        setSalesHistory(mockData);
        setAllSales(mockData);
      }
    } catch (error) {
      console.error('Error loading sales history:', error);
      // Fallback mock data
      const mockData = [
        { 
          _id: '1',
          saleNumber: 'SALE-001', 
          customerDetails: { name: 'John Doe' }, 
          totalAmount: 250000, 
          saleDate: '2024-01-15T10:30:00.000Z',
          status: 'completed',
          items: [{ productName: 'Product A', quantity: 3, unitPrice: 83333 }],
          paymentMethod: 'cash'
        },
      ];
      setSalesHistory(mockData);
      setAllSales(mockData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if a sale is already in any receipt
  const isSaleInReceipt = (saleId) => {
    return existingReceipts.some(receipt => {
      if (!receipt.sales || !Array.isArray(receipt.sales)) return false;
      
      return receipt.sales.some(sale => {
        if (typeof sale === 'string') return sale === saleId;
        if (sale && sale._id) return sale._id === saleId;
        return false;
      });
    });
  };

  useEffect(() => {
    loadSalesHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSalesHistory();
  };

  // Selection functions
  const toggleSaleSelection = (sale) => {
    // Don't allow selection if sale is already in a receipt
    if (isSaleInReceipt(sale._id)) {
      Alert.alert(
        'Sale Already Processed',
        'This sale is already included in an existing receipt and cannot be selected.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (selectedSales.some(selected => selected._id === sale._id)) {
      setSelectedSales(selectedSales.filter(selected => selected._id !== sale._id));
    } else {
      setSelectedSales([...selectedSales, sale]);
    }
  };

  const startSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedSales([]);
    setReceiptNotes('');
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedSales([]);
    setReceiptNotes('');
  };

  const handleCreateReceipt = async () => {
    if (selectedSales.length === 0) {
      Alert.alert('No Sales Selected', 'Please select at least one sale to create a receipt.');
      return;
    }

    // Double-check that none of the selected sales are already in receipts
    const alreadyProcessedSales = selectedSales.filter(sale => isSaleInReceipt(sale._id));
    if (alreadyProcessedSales.length > 0) {
      const saleNumbers = alreadyProcessedSales.map(sale => sale.saleNumber).join(', ');
      Alert.alert(
        'Sales Already Processed',
        `The following sales are already in receipts and cannot be processed again: ${saleNumbers}. Please refresh the list.`,
        [
          {
            text: 'Refresh List',
            onPress: () => {
              loadSalesHistory();
              cancelSelectionMode();
              setShowCreateReceiptModal(false);
            }
          },
          { text: 'OK' }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      const saleIds = selectedSales.map(sale => sale._id);
      
      const receiptData = {
        saleIds: saleIds,
        notes: receiptNotes || `Receipt for ${selectedSales.length} sale(s) totaling UGX ${formatCurrency(getSelectedTotalAmount())}`,
        receiptDate: new Date().toISOString().split('T')[0]
      };

      console.log('Creating receipt with data:', receiptData);

      const response = await apiCall('/supplier-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData)
      });

      if (response && response.success) {
        Alert.alert(
          'Success', 
          `Receipt ${response.receipt?.receiptNumber} created successfully for ${selectedSales.length} sale(s)`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowCreateReceiptModal(false);
                cancelSelectionMode();
                loadSalesHistory(); // Refresh to remove created receipts
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response?.message || 'Failed to create receipt');
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      if (error.message.includes('already included in receipts')) {
        // Extract receipt numbers from error message
        const receiptMatch = error.message.match(/receipts: ([^)]+)/);
        const receiptNumbers = receiptMatch ? receiptMatch[1].split(', ') : [];
        
        Alert.alert(
          'Sales Already Processed', 
          `Some selected sales are already included in existing receipts: ${receiptNumbers.join(', ')}.\n\nPlease refresh the list to see current available sales.`,
          [
            {
              text: 'Refresh List',
              onPress: () => {
                loadSalesHistory();
                cancelSelectionMode();
                setShowCreateReceiptModal(false);
              }
            },
            { text: 'OK' }
          ]
        );
      } else if (error.message.includes('Authentication failed')) {
        Alert.alert(
          'Authentication Error', 
          'Please check your login credentials and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to create receipt. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#8B5CF6';
      case 'partially_refunded': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return 'cash';
      case 'card': return 'credit-card';
      case 'mobile_money': return 'cellphone';
      case 'bank_transfer': return 'bank';
      default: return 'cash';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTotalItems = (sale) => {
    return sale.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
  };

  const getTotalRevenue = () => {
    return salesHistory.reduce((total, sale) => total + (sale.totalAmount || 0), 0);
  };

  const getTotalItemsSold = () => {
    return salesHistory.reduce((total, sale) => total + getTotalItems(sale), 0);
  };

  const handleViewDetails = (sale) => {
    if (isSelectionMode) {
      toggleSaleSelection(sale);
    } else {
      setSelectedSale(sale);
      setShowDetailsModal(true);
    }
  };

  const getSelectedTotalAmount = () => {
    return selectedSales.reduce((total, sale) => total + (sale.totalAmount || 0), 0);
  };

  const getSelectedTotalProfit = () => {
    return selectedSales.reduce((total, sale) => total + (sale.totalProfit || 0), 0);
  };

  const getSelectedTotalItems = () => {
    return selectedSales.reduce((total, sale) => total + getTotalItems(sale), 0);
  };

  const renderSaleItem = ({ item }) => {
    const isSelected = selectedSales.some(selected => selected._id === item._id);
    const isInReceipt = isSaleInReceipt(item._id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.saleItem, 
          isDarkMode && styles.darkCard,
          isSelected && styles.selectedSaleItem,
          isInReceipt && styles.processedSaleItem
        ]}
        onPress={() => handleViewDetails(item)}
        onLongPress={() => {
          if (!isSelectionMode && !isInReceipt) {
            startSelectionMode();
            toggleSaleSelection(item);
          }
        }}
        delayLongPress={500}
        disabled={isInReceipt}
      >
        {/* Receipt Badge for processed sales */}
        {isInReceipt && (
          <View style={styles.receiptBadge}>
            <MaterialCommunityIcons name="receipt" size={10} color="#FFFFFF" />
            <Text style={styles.receiptBadgeText}>Receipt Created</Text>
          </View>
        )}
        
        {/* Selection Indicator (only for available sales) */}
        {isSelectionMode && !isInReceipt && (
          <View style={[
            styles.selectionIndicator,
            isSelected && styles.selectedIndicator
          ]}>
            {isSelected && (
              <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
            )}
          </View>
        )}
        
        <View style={styles.saleHeader}>
          <View style={styles.saleMainInfo}>
            <Text style={[
              styles.saleNumber, 
              isDarkMode && styles.darkText,
              isInReceipt && styles.processedText
            ]} numberOfLines={1}>
              {item.saleNumber}
            </Text>
            <View style={[styles.statusBadge, { 
              backgroundColor: isInReceipt ? '#6B728020' : getStatusColor(item.status) + '20' 
            }]}>
              <Text style={[styles.statusText, { 
                color: isInReceipt ? '#6B7280' : getStatusColor(item.status)
              }]}>
                {isInReceipt ? 'Receipted' : item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.saleAmount, 
            isDarkMode && styles.darkText,
            isInReceipt && styles.processedText
          ]}>
            UGX {formatCurrency(item.totalAmount)}
          </Text>
        </View>

        <View style={styles.saleDetails}>
          <View style={styles.customerRow}>
            <MaterialCommunityIcons 
              name="account" 
              size={12} 
              color={isInReceipt ? "#9CA3AF80" : (isDarkMode ? "#9CA3AF" : "#6B7280")} 
            />
            <Text style={[
              styles.customerName, 
              isDarkMode && styles.darkSubtitle,
              isInReceipt && styles.processedSubtitle
            ]} numberOfLines={1}>
              {item.customerDetails?.name || 'Walk-in Customer'}
            </Text>
          </View>
          
          <View style={styles.saleMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons 
                name="calendar" 
                size={10} 
                color={isInReceipt ? "#9CA3AF80" : (isDarkMode ? "#9CA3AF" : "#6B7280")} 
              />
              <Text style={[
                styles.metaText, 
                isDarkMode && styles.darkSubtitle,
                isInReceipt && styles.processedSubtitle
              ]}>
                {formatDate(item.saleDate)}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <MaterialCommunityIcons 
                name="package-variant" 
                size={10} 
                color={isInReceipt ? "#9CA3AF80" : (isDarkMode ? "#9CA3AF" : "#6B7280")} 
              />
              <Text style={[
                styles.metaText, 
                isDarkMode && styles.darkSubtitle,
                isInReceipt && styles.processedSubtitle
              ]}>
                {getTotalItems(item)} items
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.saleFooter}>
          <View style={styles.paymentMethod}>
            <MaterialCommunityIcons 
              name={getPaymentIcon(item.paymentMethod)} 
              size={12} 
              color={isInReceipt ? "#9CA3AF80" : (isDarkMode ? "#9CA3AF" : "#6B7280")} 
            />
            <Text style={[
              styles.paymentText, 
              isDarkMode && styles.darkSubtitle,
              isInReceipt && styles.processedSubtitle
            ]}>
              {item.paymentMethod?.replace('_', ' ')}
            </Text>
          </View>
          
          <View style={styles.actionButtons}>
            {item.totalProfit && !isInReceipt && (
              <Text style={[styles.profitText, { color: (item.totalProfit || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                UGX {formatCurrency(item.totalProfit || 0)}
              </Text>
            )}
            {!isSelectionMode && !isInReceipt && (
              <TouchableOpacity 
                style={[styles.viewButton, isDarkMode && styles.darkViewButton]}
                onPress={() => handleViewDetails(item)}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            )}
            {isInReceipt && (
              <Text style={styles.processedLabel}>Already Receipted</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateReceiptModal = () => (
    <Modal
      visible={showCreateReceiptModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreateReceiptModal(false)}
    >
      <View style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
            Create Receipt
          </Text>
          <TouchableOpacity 
            onPress={() => setShowCreateReceiptModal(false)}
            disabled={loading}
          >
            <MaterialCommunityIcons name="close" size={20} color={isDarkMode ? '#FFFFFF' : '#374151'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
            <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
              Receipt Summary
            </Text>
            
            <View style={styles.receiptSummary}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                  Number of Sales
                </Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                  {selectedSales.length}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                  Total Items
                </Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                  {getSelectedTotalItems()}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                  Total Amount
                </Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                  UGX {formatCurrency(getSelectedTotalAmount())}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                  Total Profit
                </Text>
                <Text style={[styles.profitValue, isDarkMode && styles.darkText]}>
                  UGX {formatCurrency(getSelectedTotalProfit())}
                </Text>
              </View>
            </View>

            {/* Notes Input */}
            <View style={styles.notesSection}>
              <Text style={[styles.notesLabel, isDarkMode && styles.darkSubtitle]}>
                Receipt Notes (Optional)
              </Text>
              <TextInput
                style={[styles.notesInput, isDarkMode && styles.darkNotesInput]}
                value={receiptNotes}
                onChangeText={setReceiptNotes}
                placeholder="Add notes for this receipt..."
                placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.selectedSalesList}>
              <Text style={[styles.selectedSalesTitle, isDarkMode && styles.darkSubtitle]}>
                Selected Sales ({selectedSales.length}):
              </Text>
              {selectedSales.map((sale, index) => (
                <View key={sale._id} style={styles.selectedSaleRow}>
                  <View style={styles.selectedSaleInfo}>
                    <Text style={[styles.selectedSaleText, isDarkMode && styles.darkText]}>
                      {sale.saleNumber}
                    </Text>
                    <Text style={[styles.selectedSaleAmount, isDarkMode && styles.darkSubtitle]}>
                      UGX {formatCurrency(sale.totalAmount)}
                    </Text>
                  </View>
                  <Text style={[styles.selectedSaleCustomer, isDarkMode && styles.darkSubtitle]}>
                    {sale.customerDetails?.name || 'Walk-in Customer'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.cancelButton, isDarkMode && styles.darkCancelButton]}
              onPress={() => setShowCreateReceiptModal(false)}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, isDarkMode && styles.darkText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.createButton, loading && styles.disabledButton]}
              onPress={handleCreateReceipt}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="receipt" size={16} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>
                    Create Receipt
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // Sale Details Modal (same as before)
  const renderSaleDetailsModal = () => {
    if (!selectedSale) return null;

    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
              Sale Details
            </Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <MaterialCommunityIcons name="close" size={20} color={isDarkMode ? '#FFFFFF' : '#374151'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Sale Header */}
            <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailSaleNumber, isDarkMode && styles.darkText]}>
                  {selectedSale.saleNumber}
                </Text>
                <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedSale.status) + '20' }]}>
                  <Text style={[styles.detailStatusText, { color: getStatusColor(selectedSale.status) }]}>
                    {selectedSale.status.charAt(0).toUpperCase() + selectedSale.status.slice(1).replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.detailDateTime, isDarkMode && styles.darkSubtitle]}>
                {formatDateTime(selectedSale.saleDate)}
              </Text>
            </View>

            {/* Customer Details */}
            <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
              <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                Customer Information
              </Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Name</Text>
                  <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                    {selectedSale.customerDetails?.name || 'Walk-in Customer'}
                  </Text>
                </View>
                {selectedSale.customerDetails?.email && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Email</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                      {selectedSale.customerDetails.email}
                    </Text>
                  </View>
                )}
                {selectedSale.customerDetails?.phone && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Phone</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                      {selectedSale.customerDetails.phone}
                    </Text>
                  </View>
                )}
                {selectedSale.customerDetails?.customerType && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>Customer Type</Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                      {selectedSale.customerDetails.customerType.charAt(0).toUpperCase() + selectedSale.customerDetails.customerType.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Items List */}
            <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
              <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                Items ({getTotalItems(selectedSale)})
              </Text>
              {selectedSale.items?.map((item, index) => (
                <View key={index} style={styles.detailItemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, isDarkMode && styles.darkText]}>
                      {item.productName}
                    </Text>
                    <Text style={[styles.itemDetails, isDarkMode && styles.darkSubtitle]}>
                      {item.quantity} × UGX {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <View style={styles.itemTotals}>
                    <Text style={[styles.itemTotal, isDarkMode && styles.darkText]}>
                      UGX {formatCurrency(item.totalPrice)}
                    </Text>
                    <Text style={[styles.itemProfit, { color: (item.profit || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                      Profit: UGX {formatCurrency(item.profit || 0)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Payment & Totals */}
            <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
              <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                Payment & Totals
              </Text>
              <View style={styles.totalsGrid}>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Subtotal</Text>
                  <Text style={[styles.totalValue, isDarkMode && styles.darkText]}>
                    UGX {formatCurrency(selectedSale.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0)}
                  </Text>
                </View>
                {selectedSale.discountAmount > 0 && (
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Discount</Text>
                    <Text style={[styles.discountValue, isDarkMode && styles.darkText]}>
                      -UGX {formatCurrency(selectedSale.discountAmount)}
                    </Text>
                  </View>
                )}
                {selectedSale.taxAmount > 0 && (
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Tax</Text>
                    <Text style={[styles.totalValue, isDarkMode && styles.darkText]}>
                      UGX {formatCurrency(selectedSale.taxAmount)}
                    </Text>
                  </View>
                )}
                {selectedSale.shippingDetails?.shippingCost > 0 && (
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Shipping</Text>
                    <Text style={[styles.totalValue, isDarkMode && styles.darkText]}>
                      UGX {formatCurrency(selectedSale.shippingDetails.shippingCost)}
                    </Text>
                  </View>
                )}
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Payment Method</Text>
                  <View style={styles.paymentMethodDetail}>
                    <MaterialCommunityIcons 
                      name={getPaymentIcon(selectedSale.paymentMethod)} 
                      size={14} 
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                    />
                    <Text style={[styles.paymentMethodText, isDarkMode && styles.darkText]}>
                      {selectedSale.paymentMethod?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={[styles.totalItem, styles.grandTotal]}>
                  <Text style={[styles.grandTotalLabel, isDarkMode && styles.darkText]}>Total Amount</Text>
                  <Text style={[styles.grandTotalValue, isDarkMode && styles.darkText]}>
                    UGX {formatCurrency(selectedSale.totalAmount)}
                  </Text>
                </View>
                {selectedSale.totalProfit && (
                  <View style={[styles.totalItem, styles.profitTotal]}>
                    <Text style={[styles.totalLabel, isDarkMode && styles.darkSubtitle]}>Total Profit</Text>
                    <Text style={[styles.profitTotalValue, { color: (selectedSale.totalProfit || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                      UGX {formatCurrency(selectedSale.totalProfit)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Notes */}
            {selectedSale.notes && (
              <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                  Notes
                </Text>
                <Text style={[styles.notesText, isDarkMode && styles.darkSubtitle]}>
                  {selectedSale.notes}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading Sales History...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header with Selection Mode */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons 
              name="history" 
              size={18} 
              color={isDarkMode ? "#8B5CF6" : "#7C3AED"} 
            />
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              {isSelectionMode ? `Select Sales (${selectedSales.length})` : 'Sales History'}
            </Text>
          </View>
          
          {isSelectionMode ? (
            <View style={styles.selectionActions}>
              <TouchableOpacity 
                style={[styles.selectionButton, styles.cancelSelectionButton]}
                onPress={cancelSelectionMode}
              >
                <MaterialCommunityIcons name="close" size={14} color="#EF4444" />
                <Text style={styles.cancelSelectionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.selectionButton, styles.createReceiptButton, selectedSales.length === 0 && styles.disabledButton]}
                onPress={() => setShowCreateReceiptModal(true)}
                disabled={selectedSales.length === 0}
              >
                <MaterialCommunityIcons name="receipt" size={14} color="#FFFFFF" />
                <Text style={styles.createReceiptText}>
                  Receipt ({selectedSales.length})
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.exportButton, isDarkMode && styles.darkExportButton]}
              onPress={startSelectionMode}
            >
              <MaterialCommunityIcons name="receipt-text-plus" size={14} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Create Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
          {isSelectionMode 
            ? 'Tap to select available sales for receipt • Grayed out sales are already receipted' 
            : 'Sales available for receipt creation • Grayed out sales are already receipted'
          }
        </Text>
      </View>

      {/* Filter Tabs - Hide during selection */}
      {!isSelectionMode && (
        <View style={styles.filterContainer}>
          {['all', 'today', 'week', 'month'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterTab,
                filter === period && styles.activeFilterTab,
                filter === period && isDarkMode && styles.darkActiveFilterTab
              ]}
              onPress={() => setFilter(period)}
            >
              <Text style={[
                styles.filterText,
                filter === period ? styles.activeFilterText : (isDarkMode ? styles.darkFilterText : styles.inactiveFilterText),
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Summary Cards - Hide during selection */}
      {!isSelectionMode && (
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
            <MaterialCommunityIcons 
              name="receipt" 
              size={14} 
              color={isDarkMode ? "#8B5CF6" : "#7C3AED"} 
            />
            <Text style={[styles.summaryNumber, isDarkMode && styles.darkText]}>
              {salesHistory.length}
            </Text>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
              Available Sales
            </Text>
          </View>

          <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
            <MaterialCommunityIcons 
              name="currency-usd" 
              size={14} 
              color={isDarkMode ? "#10B981" : "#059669"} 
            />
            <Text style={[styles.summaryNumber, isDarkMode && styles.darkText]}>
              UGX {formatCurrency(getTotalRevenue())}
            </Text>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
              Total Revenue
            </Text>
          </View>

          <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
            <MaterialCommunityIcons 
              name="package-variant" 
              size={14} 
              color={isDarkMode ? "#F59E0B" : "#D97706"} 
            />
            <Text style={[styles.summaryNumber, isDarkMode && styles.darkText]}>
              {getTotalItemsSold()}
            </Text>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
              Items Available
            </Text>
          </View>
        </View>
      )}

      {/* Sales List */}
      <View style={styles.salesSection}>
        {!isSelectionMode && (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              Recent Sales • {salesHistory.length} Available
            </Text>
          </View>
        )}

        {salesHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="receipt-outline" 
              size={32} 
              color={isDarkMode ? "#4B5563" : "#9CA3AF"} 
            />
            <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
              No sales available for receipts
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.darkSubtitle]}>
              All completed sales have been receipted or no sales available
            </Text>
          </View>
        ) : (
          <FlatList
            data={salesHistory}
            renderItem={renderSaleItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Selection Mode Footer */}
      {isSelectionMode && selectedSales.length > 0 && (
        <View style={[styles.selectionFooter, isDarkMode && styles.darkSelectionFooter]}>
          <Text style={[styles.selectionFooterText, isDarkMode && styles.darkText]}>
            {selectedSales.length} sales selected • UGX {formatCurrency(getSelectedTotalAmount())}
          </Text>
          <TouchableOpacity 
            style={styles.footerCreateButton}
            onPress={() => setShowCreateReceiptModal(true)}
          >
            <MaterialCommunityIcons name="receipt" size={16} color="#FFFFFF" />
            <Text style={styles.footerCreateButtonText}>Create Receipt</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      {renderSaleDetailsModal()}
      {renderCreateReceiptModal()}
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
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  cancelSelectionButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelSelectionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  createReceiptButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createReceiptText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#9CA3AF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#8B5CF6',
  },
  darkActiveFilterTab: {
    backgroundColor: '#7C3AED',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  inactiveFilterText: {
    color: '#6B7280',
  },
  darkFilterText: {
    color: '#9CA3AF',
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 60,
    justifyContent: 'center',
  },
  darkCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  summaryNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 4,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  salesSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  darkExportButton: {
    backgroundColor: '#7C3AED',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  saleItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
  },
  selectedSaleItem: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: '#F8FAFF',
  },
  processedSaleItem: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  receiptBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  receiptBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  selectedIndicator: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  saleMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  saleNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  processedText: {
    opacity: 0.6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '500',
  },
  saleAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },
  saleDetails: {
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  customerName: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  processedSubtitle: {
    opacity: 0.5,
  },
  saleMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 10,
    color: '#6B7280',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentText: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profitText: {
    fontSize: 10,
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkViewButton: {
    backgroundColor: '#7C3AED',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  processedLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  // Selection Footer
  selectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  darkSelectionFooter: {
    backgroundColor: '#1F2937',
    borderTopColor: '#374151',
  },
  selectionFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  footerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  footerCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Styles (same as before)
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  modalContent: {
    flex: 1,
  },
  detailSection: {
    backgroundColor: '#F8FAFC',
    margin: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  detailSaleNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  detailStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  detailDateTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailGrid: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 10,
    color: '#6B7280',
  },
  itemTotals: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  itemProfit: {
    fontSize: 9,
    fontWeight: '500',
  },
  totalsGrid: {
    gap: 6,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  discountValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EF4444',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  profitTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    marginTop: 2,
  },
  profitTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentMethodDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  // Receipt Creation Modal Styles
  receiptSummary: {
    gap: 8,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  profitValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  notesSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  darkNotesInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  selectedSalesList: {
    marginTop: 8,
  },
  selectedSalesTitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  selectedSaleRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedSaleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  selectedSaleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  selectedSaleAmount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedSaleCustomer: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SalesHistoryTab;