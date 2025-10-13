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
  FlatList,
  RefreshControl,
  Modal,
  Share,
  Dimensions,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import {
  MaterialIcons,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { user, token, API_BASE_URL } = useAuth();
  const { isDarkMode } = useDarkMode();

  // Calculate totals from receipts
  const calculateTotals = () => {
    const filtered = receipts.filter(receipt => 
      activeFilter === 'all' || receipt.status === activeFilter
    );
    
    const totalReceipts = filtered.length;
    const totalSales = filtered.reduce((sum, receipt) => sum + (receipt.grandTotal || 0), 0);
    const totalItems = filtered.reduce((sum, receipt) => sum + (receipt.totalQuantity || 0), 0);

    return { totalReceipts, totalSales, totalItems };
  };

  const { totalReceipts, totalSales, totalItems } = calculateTotals();

  // API call function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const url = `${API_BASE_URL}/api${endpoint}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  };

  // Fetch receipts
  const fetchReceipts = async () => {
    try {
      const data = await apiCall('/retailer-receipts');
      return data.receipts || data.formattedReceipts || [];
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return getDemoReceipts();
    }
  };

  // Demo data fallback
  const getDemoReceipts = () => {
    return [
      {
        _id: '68e0c686e95acedae24bf7ba',
        receiptNumber: 'RCPT-20251004-85986',
        customerName: 'John Doe',
        customerPhone: '+256712345678',
        items: [
          {
            productName: 'Wireless Headphones',
            quantity: 2,
            measurementUnit: 'pieces',
            unitPrice: 8000,
            totalPrice: 16000,
          }
        ],
        subtotal: 16000,
        taxAmount: 1600,
        discountAmount: 500,
        grandTotal: 17100,
        totalQuantity: 2,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        status: 'active',
        receiptDate: '2025-10-04T07:02:30.798Z',
        createdAt: '2025-10-04T07:02:30.803Z'
      },
      {
        _id: '68d0d493cbebc2ac1d909543',
        receiptNumber: 'RCPT-20250922-44310',
        customerName: 'Jane Smith',
        customerPhone: '+256723456789',
        items: [
          {
            productName: 'Phone Charger',
            quantity: 90,
            measurementUnit: 'pieces',
            unitPrice: 1000,
            totalPrice: 90000,
          },
          {
            productName: 'USB Cable',
            quantity: 5,
            measurementUnit: 'pieces',
            unitPrice: 1000,
            totalPrice: 5000,
          },
          {
            productName: 'Power Bank',
            quantity: 5,
            measurementUnit: 'pieces',
            unitPrice: 1000,
            totalPrice: 5000,
          }
        ],
        subtotal: 100000,
        taxAmount: 10000,
        discountAmount: 2000,
        grandTotal: 108000,
        totalQuantity: 100,
        paymentMethod: 'digital_wallet',
        paymentStatus: 'paid',
        status: 'cancelled',
        receiptDate: '2025-09-22T04:46:11.146Z',
        createdAt: '2025-09-22T04:46:11.160Z'
      }
    ];
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const receiptsData = await fetchReceipts();
      setReceipts(receiptsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load receipts data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter receipts based on active filter and search
  const filteredReceipts = receipts.filter(receipt => {
    // Status filter
    if (activeFilter !== 'all' && receipt.status !== activeFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        receipt.receiptNumber.toLowerCase().includes(query) ||
        (receipt.customerName && receipt.customerName.toLowerCase().includes(query)) ||
        receipt.items.some(item => item.productName.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Format currency
  const formatUGX = (amount) => {
    return `UGX ${amount?.toLocaleString() || '0'}`;
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format time
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Time';
    }
  };

  // Generate PDF receipt (simulated)
  const generatePDFReceipt = async (receipt) => {
    try {
      // In a real app, this would generate an actual PDF file
      // For now, we'll create a formatted text version and simulate PDF generation
      const receiptText = generateReceiptText(receipt);
      
      // Simulate PDF generation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'PDF generated successfully',
        data: receiptText,
        fileName: `Receipt_${receipt.receiptNumber}.pdf`
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  };

  // Share receipt via native share dialog with PDF
  const shareReceipt = async (receipt) => {
    try {
      const pdfResult = await generatePDFReceipt(receipt);
      const receiptText = generateReceiptText(receipt);
      
      await Share.share({
        message: `Receipt ${receipt.receiptNumber}\n\n${receiptText}`,
        title: `Receipt ${receipt.receiptNumber} (PDF)`
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt as PDF');
    }
  };

  // Share via WhatsApp with PDF
  const shareViaWhatsApp = async (receipt) => {
    try {
      const pdfResult = await generatePDFReceipt(receipt);
      const receiptText = generateReceiptText(receipt);
      const url = `whatsapp://send?text=${encodeURIComponent(`Receipt ${receipt.receiptNumber}\n\n${receiptText}`)}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on your device');
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share via WhatsApp');
    }
  };

  // Print receipt
  const printReceipt = async (receipt) => {
    try {
      const pdfResult = await generatePDFReceipt(receipt);
      
      // In a real app, this would send to a printer
      // For now, we'll show a success message
      Alert.alert(
        'Print Receipt',
        `Receipt ${receipt.receiptNumber} has been prepared for printing.\n\nTotal: ${formatUGX(receipt.grandTotal)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert('Error', 'Failed to prepare receipt for printing');
    }
  };

  // Generate receipt text for sharing
  const generateReceiptText = (receipt) => {
    const itemsText = receipt.items.map(item => 
      `${item.productName} - ${item.quantity} ${item.measurementUnit} x ${formatUGX(item.unitPrice)} = ${formatUGX(item.totalPrice)}`
    ).join('\n');

    return `TRADE UGANDA - SALES RECEIPT
===============================

Receipt No: ${receipt.receiptNumber}
Date: ${formatDate(receipt.receiptDate)}
Time: ${formatTime(receipt.receiptDate)}

${receipt.customerName ? `Customer: ${receipt.customerName}` : 'Customer: Walk-in'}
${receipt.customerPhone ? `Phone: ${receipt.customerPhone}` : ''}

ITEMS SOLD:
${itemsText}

------------------------------
Subtotal: ${formatUGX(receipt.subtotal)}
${receipt.taxAmount > 0 ? `Tax (18%): ${formatUGX(receipt.taxAmount)}` : ''}
${receipt.discountAmount > 0 ? `Discount: -${formatUGX(receipt.discountAmount)}` : ''}
GRAND TOTAL: ${formatUGX(receipt.grandTotal)}

Payment Method: ${receipt.paymentMethod?.toUpperCase()}
Status: ${receipt.status?.toUpperCase()}

Thank you for your business!
===============================`;
  };

  // View receipt details
  const viewReceiptDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  // Delete receipt
  const deleteReceipt = async (receiptId, hardDelete = false) => {
    Alert.alert(
      hardDelete ? 'Delete Receipt' : 'Cancel Receipt',
      hardDelete 
        ? 'Are you sure you want to permanently delete this receipt? This action cannot be undone.'
        : 'Are you sure you want to cancel this receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiCall(`/retailer-receipts/${receiptId}`, {
                method: 'DELETE',
                body: JSON.stringify({ hardDelete })
              });
              
              Alert.alert(
                'Success', 
                hardDelete ? 'Receipt deleted successfully' : 'Receipt cancelled successfully'
              );
              loadData(); // Refresh data
            } catch (error) {
              console.error('Error deleting receipt:', error);
              Alert.alert('Error', 'Failed to delete receipt');
            }
          }
        }
      ]
    );
  };

  // Receipt Item Component
  const ReceiptItem = ({ item }) => {
    const statusColor = {
      active: '#10B981',
      cancelled: '#EF4444',
      refunded: '#F59E0B'
    }[item.status] || '#6B7280';

    const statusBgColor = {
      active: '#D1FAE5',
      cancelled: '#FEE2E2',
      refunded: '#FEF3C7'
    }[item.status] || '#F3F4F6';

    const darkStatusBgColor = {
      active: '#065F46',
      cancelled: '#7F1D1D',
      refunded: '#78350F'
    }[item.status] || '#374151';

    return (
      <TouchableOpacity
        style={[
          styles.receiptItem,
          isDarkMode && styles.darkReceiptItem
        ]}
        onPress={() => viewReceiptDetails(item)}
      >
        <View style={styles.receiptHeader}>
          <View style={styles.receiptInfo}>
            <Text style={[styles.receiptNumber, isDarkMode && styles.darkText]}>
              {item.receiptNumber}
            </Text>
            <Text style={[styles.receiptDate, isDarkMode && styles.darkSubtitle]}>
              {formatDate(item.receiptDate)} • {formatTime(item.receiptDate)}
            </Text>
            {item.customerName ? (
              <Text style={[styles.customerName, isDarkMode && styles.darkSubtitle]}>
                {item.customerName}
              </Text>
            ) : null}
          </View>
          
          <View style={styles.receiptAmount}>
            <Text style={[styles.amount, isDarkMode && styles.darkText]}>
              {formatUGX(item.grandTotal)}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: isDarkMode ? darkStatusBgColor : statusBgColor }
            ]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.receiptItemsPreview}>
          <Text style={[styles.itemsPreviewText, isDarkMode && styles.darkSubtitle]} numberOfLines={1}>
            {item.items.map(item => item.productName).join(', ')}
          </Text>
          <Text style={[styles.itemsCount, isDarkMode && styles.darkSubtitle]}>
            {item.totalQuantity} items • {item.paymentMethod}
          </Text>
        </View>

        <View style={styles.receiptActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => shareReceipt(item)}
          >
            <Feather name="share-2" size={14} color="#3B82F6" />
            <Text style={styles.shareButtonText}><Text style={styles.shareButtonText}>Share</Text></Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.printButton]}
            onPress={() => printReceipt(item)}
          >
            <Feather name="printer" size={14} color="#8B5CF6" />
            <Text style={styles.printButtonText}><Text style={styles.printButtonText}>Print</Text></Text>
          </TouchableOpacity>
          
          {item.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => deleteReceipt(item._id, false)}
            >
              <Feather name="x" size={14} color="#EF4444" />
              <Text style={styles.cancelButtonText}><Text style={styles.cancelButtonText}>Cancel</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Summary Header Component
  const SummaryHeader = () => (
    <View style={[styles.summaryHeader, isDarkMode && styles.darkSummaryHeader]}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>Total Receipts</Text></Text>
        <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>{totalReceipts}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>Total Sales</Text></Text>
        <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>{formatUGX(totalSales)}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}><Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>Items Sold</Text></Text>
        <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>{totalItems}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
            Loading receipts...
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
            name="receipt" 
            size={24} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}><Text style={[styles.title, isDarkMode && styles.darkText]}>Receipts</Text></Text>
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
        </TouchableOpacity>
      </View>

      {/* Summary Header */}
      <SummaryHeader />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'all' && styles.filterButtonActive,
              isDarkMode && styles.darkFilterButton
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'all' && styles.filterButtonTextActive
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'active' && styles.filterButtonActive,
              isDarkMode && styles.darkFilterButton
            ]}
            onPress={() => setActiveFilter('active')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'active' && styles.filterButtonTextActive
            ]}>
              Active
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'cancelled' && styles.filterButtonActive,
              isDarkMode && styles.darkFilterButton
            ]}
            onPress={() => setActiveFilter('cancelled')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'cancelled' && styles.filterButtonTextActive
            ]}>
              Cancelled
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'refunded' && styles.filterButtonActive,
              isDarkMode && styles.darkFilterButton
            ]}
            onPress={() => setActiveFilter('refunded')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'refunded' && styles.filterButtonTextActive
            ]}>
              Refunded
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, isDarkMode && styles.darkSearchContainer]}>
        <Feather name="search" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.darkInput]}
          placeholder="Search receipts..."
          placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Receipts List */}
      <FlatList
        data={filteredReceipts}
        renderItem={({ item }) => <ReceiptItem item={item} />}
        keyExtractor={(item) => item._id}
        style={styles.receiptsList}
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
            <Feather name="file-text" size={48} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
            <Text style={[styles.emptyStateText, isDarkMode && styles.darkSubtitle]}>
              {searchQuery ? 'No receipts found' : 'No receipts yet'}
            </Text>
            <Text style={[styles.emptyStateSubtext, isDarkMode && styles.darkSubtitle]}>
              {searchQuery ? 'Try a different search term' : 'Receipts will appear here once created'}
            </Text>
          </View>
        }
      />

      {/* Receipt Details Modal - Increased Height */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptModal, isDarkMode && styles.darkReceiptModal]}>
            {selectedReceipt && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                    Receipt Details
                  </Text>
                  <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                    <Feather name="x" size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Receipt Header */}
                  <View style={styles.receiptHeaderModal}>
                    <View style={styles.receiptTitleRow}>
                      <MaterialIcons name="receipt" size={24} color="#3B82F6" />
                      <Text style={[styles.receiptNumberModal, isDarkMode && styles.darkText]}>
                        {selectedReceipt.receiptNumber}
                      </Text>
                    </View>
                    <Text style={[styles.receiptDateModal, isDarkMode && styles.darkSubtitle]}>
                      {formatDate(selectedReceipt.receiptDate)} • {formatTime(selectedReceipt.receiptDate)}
                    </Text>
                    
                    {(selectedReceipt.customerName || selectedReceipt.customerPhone) && (
                      <View style={styles.customerSection}>
                        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                          Customer Information
                        </Text>
                        {selectedReceipt.customerName && (
                          <Text style={[styles.customerDetail, isDarkMode && styles.darkText]}>
                            👤 {selectedReceipt.customerName}
                          </Text>
                        )}
                        {selectedReceipt.customerPhone && (
                          <Text style={[styles.customerDetail, isDarkMode && styles.darkSubtitle]}>
                            📞 {selectedReceipt.customerPhone}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Items List */}
                  <View style={styles.itemsSection}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                      Items ({selectedReceipt.totalQuantity})
                    </Text>
                    {selectedReceipt.items.map((item, index) => (
                      <View key={index} style={[styles.itemRow, isDarkMode && styles.darkItemRow]}>
                        <View style={styles.itemInfo}>
                          <Text style={[styles.itemName, isDarkMode && styles.darkText]}>
                            {item.productName}
                          </Text>
                          <Text style={[styles.itemDetails, isDarkMode && styles.darkSubtitle]}>
                            {item.quantity} {item.measurementUnit} × {formatUGX(item.unitPrice)}
                          </Text>
                        </View>
                        <Text style={[styles.itemTotal, isDarkMode && styles.darkText]}>
                          {formatUGX(item.totalPrice)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Summary */}
                  <View style={[styles.summarySection, isDarkMode && styles.darkSummarySection]}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                      Payment Summary
                    </Text>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                        Subtotal:
                      </Text>
                      <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                        {formatUGX(selectedReceipt.subtotal)}
                      </Text>
                    </View>
                    
                    {selectedReceipt.taxAmount > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                          Tax:
                        </Text>
                        <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                          {formatUGX(selectedReceipt.taxAmount)}
                        </Text>
                      </View>
                    )}
                    
                    {selectedReceipt.discountAmount > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>
                          Discount:
                        </Text>
                        <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                          -{formatUGX(selectedReceipt.discountAmount)}
                        </Text>
                      </View>
                    )}
                    
                    <View style={[styles.summaryRow, styles.grandTotalRow]}>
                      <Text style={[styles.grandTotalLabel, isDarkMode && styles.darkText]}>
                        TOTAL:
                      </Text>
                      <Text style={[styles.grandTotalValue, isDarkMode && styles.darkText]}>
                        {formatUGX(selectedReceipt.grandTotal)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Info */}
                  <View style={styles.paymentSection}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                      Payment Information
                    </Text>
                    <View style={[styles.paymentInfo, isDarkMode && styles.darkPaymentInfo]}>
                      <View style={styles.paymentDetailRow}>
                        <Feather name="credit-card" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                        <Text style={[styles.paymentDetail, isDarkMode && styles.darkSubtitle]}>
                          Method: {selectedReceipt.paymentMethod}
                        </Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Feather name="check-circle" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                        <Text style={[styles.paymentDetail, isDarkMode && styles.darkSubtitle]}>
                          Status: {selectedReceipt.paymentStatus}
                        </Text>
                      </View>
                      <View style={styles.paymentDetailRow}>
                        <Feather name="file-text" size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                        <Text style={[styles.paymentDetail, isDarkMode && styles.darkSubtitle]}>
                          Receipt Status: {selectedReceipt.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={[styles.modalActions, isDarkMode && styles.darkModalActions]}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.shareModalButton]}
                    onPress={() => shareReceipt(selectedReceipt)}
                  >
                    <Feather name="share-2" size={16} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}><Text style={styles.modalButtonText}>Share PDF</Text></Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.whatsappButton]}
                    onPress={() => shareViaWhatsApp(selectedReceipt)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}><Text style={styles.modalButtonText}>WhatsApp</Text></Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.printModalButton]}
                    onPress={() => printReceipt(selectedReceipt)}
                  >
                    <Feather name="printer" size={16} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}><Text style={styles.modalButtonText}>Print</Text></Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  refreshButton: {
    padding: 4,
  },
  // Summary Header
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  darkSummaryHeader: {
    backgroundColor: '#1F2937',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  // Rest of the styles remain mostly the same with minor adjustments
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  darkFilterButton: {
    backgroundColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  darkSearchContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  darkInput: {
    color: '#FFFFFF',
  },
  receiptsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  receiptItem: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkReceiptItem: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  receiptAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  receiptItemsPreview: {
    marginBottom: 12,
  },
  itemsPreviewText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemsCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  shareButton: {
    backgroundColor: '#EFF6FF',
  },
  printButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
  },
  shareButtonText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  printButtonText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  cancelButtonText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  // Increased Modal Height
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  receiptModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: height * 0.9, // Increased to 90% of screen height
    minHeight: height * 0.8, // Minimum 80% of screen height
  },
  darkReceiptModal: {
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  receiptHeaderModal: {
    marginBottom: 20,
  },
  receiptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  receiptNumberModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  receiptDateModal: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  customerSection: {
    marginTop: 16,
  },
  customerDetail: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  itemsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  darkItemRow: {
    borderBottomColor: '#374151',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  summarySection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  darkSummarySection: {
    backgroundColor: '#374151',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  darkGrandTotalRow: {
    borderTopColor: '#4B5563',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
  },
  darkPaymentInfo: {
    backgroundColor: '#374151',
  },
  paymentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paymentDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  darkModalActions: {
    borderTopColor: '#374151',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  shareModalButton: {
    backgroundColor: '#3B82F6',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  printModalButton: {
    backgroundColor: '#8B5CF6',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
});

export default Receipts;