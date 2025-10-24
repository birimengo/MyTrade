// src/components/SupplierComponents/Receipts.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
  Share,
  Platform
} from 'react-native';
import { useDarkMode } from '../../context/DarkModeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const ReceiptsTab = ({ apiCall }) => {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailedReceipt, setDetailedReceipt] = useState(null);
  const [sharing, setSharing] = useState(false);
  const viewShotRef = useRef();

  const loadReceipts = async () => {
    try {
      setLoading(true);
      
      const response = await apiCall('/supplier-receipts?limit=100');
      
      if (response && response.success) {
        const transformedReceipts = response.receipts.map(receipt => ({
          id: receipt._id,
          receiptId: receipt.receiptNumber,
          orderId: receipt.sales && receipt.sales.length > 0 ? 
                   `SALE-${receipt.sales[0]?.saleNumber || receipt.sales[0]?._id?.slice(-6) || 'N/A'}` : 
                   'NO-SALES',
          customer: receipt.customerDetails?.name || 'Walk-in Customer',
          customerDetails: receipt.customerDetails || {},
          amount: receipt.totalAmount || 0,
          profit: receipt.totalProfit || 0,
          taxAmount: receipt.totalTax || 0,
          discountAmount: receipt.totalDiscount || 0,
          date: new Date(receipt.receiptDate || receipt.createdAt).toISOString().split('T')[0],
          datetime: receipt.receiptDate || receipt.createdAt,
          type: receipt.status === 'refunded' ? 'refund' : 'sale',
          status: receipt.status || 'active',
          paymentMethod: receipt.paymentMethod || 'cash',
          notes: receipt.notes || '',
          salesCount: receipt.sales?.length || 0,
          itemsCount: receipt.sales?.reduce((total, sale) => 
            total + (sale.items?.length || 0), 0) || 0,
          totalItemsQuantity: receipt.sales?.reduce((total, sale) => 
            total + (sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0), 0) || 0,
          sales: receipt.sales || [],
          originalData: receipt
        }));
        
        setReceipts(transformedReceipts);
      } else {
        throw new Error(response?.message || 'Failed to load receipts');
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert(
        'Error', 
        'Failed to load receipts. Please check your connection and try again.',
        [{ text: 'OK', onPress: () => setLoading(false) }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetailedReceipt = async (receiptId) => {
    try {
      const response = await apiCall(`/supplier-receipts/${receiptId}`);
      if (response && response.success) {
        setDetailedReceipt(response.receipt);
      }
    } catch (error) {
      console.error('Error loading detailed receipt:', error);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReceipts();
  };

  const viewReceiptDetails = async (receipt) => {
    setSelectedReceipt(receipt);
    setModalVisible(true);
    await loadDetailedReceipt(receipt.id);
  };

  const printReceipt = async (receipt) => {
    try {
      const receiptText = generateReceiptText(receipt, false);
      Alert.alert(
        'Print Receipt',
        `Would you like to print receipt ${receipt.receiptId}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Print', 
            onPress: () => {
              console.log('Printing receipt:', receiptText);
              Alert.alert('Success', 'Print command sent to printer!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error preparing print:', error);
      Alert.alert('Error', 'Failed to prepare receipt for printing');
    }
  };

  const captureAndShareReceipt = async (receipt) => {
    try {
      setSharing(true);
      
      if (!viewShotRef.current) {
        throw new Error('Receipt view not ready');
      }

      // Capture the receipt as image
      const uri = await viewShotRef.current.capture();
      
      // Request permissions for iOS
      if (Platform.OS === 'ios') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please grant photo library permissions to save receipts.');
          return;
        }
      }

      // Share the image directly using the captured URI
      // The captured image is already saved to a temporary file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Share Receipt ${receipt.receiptId}`,
          UTI: 'public.image'
        });
      } else {
        // Fallback to regular share
        await Share.share({
          message: `Receipt ${receipt.receiptId}`,
          url: uri,
          title: `Receipt ${receipt.receiptId}`
        });
      }

      console.log('Receipt shared successfully as image');

    } catch (error) {
      console.error('Error sharing receipt as image:', error);
      Alert.alert('Error', 'Failed to share receipt as image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const shareReceiptAsText = async (receipt) => {
    try {
      const receiptText = generateReceiptText(receipt, false);
      
      const shareOptions = {
        message: receiptText,
        title: `Receipt ${receipt.receiptId}`,
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        console.log('Receipt shared successfully as text');
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const shareReceipt = async (receipt) => {
    Alert.alert(
      'Share Receipt',
      'How would you like to share this receipt?',
      [
        {
          text: 'As Image',
          onPress: () => captureAndShareReceipt(receipt)
        },
        {
          text: 'As Text',
          onPress: () => shareReceiptAsText(receipt)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const generateReceiptText = (receipt, includeProfit = false) => {
    const allItems = getAllItemsFromReceipt();
    const totalItemsQuantity = allItems.reduce((total, item) => total + (item.quantity || 0), 0);
    const totalAmount = allItems.reduce((total, item) => total + (item.totalPrice || (item.quantity * item.unitPrice)), 0);

    let receiptText = `
🛒 RECEIPT ${receipt.receiptId}
==============================

Customer: ${receipt.customerDetails?.name || 'Walk-in Customer'}
Date: ${formatDateTime(receipt.datetime)}
Payment: ${getPaymentMethodText(receipt.paymentMethod)}
Status: ${getStatusText(receipt.status)}

ITEMS SOLD:
==============================
${allItems.map((item, index) => 
  `${index + 1}. ${item.productName || 'Product'}
   Qty: ${item.quantity} × UGX ${formatCurrency(item.unitPrice)}
   Total: UGX ${formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}
   ${item.saleNumber ? `Sale: ${item.saleNumber}` : ''}
  `
).join('\n')}

SUMMARY:
==============================
Total Items: ${totalItemsQuantity}
Subtotal: UGX ${formatCurrency(totalAmount)}
${receipt.taxAmount > 0 ? `Tax: UGX ${formatCurrency(receipt.taxAmount)}\n` : ''}
${receipt.discountAmount > 0 ? `Discount: -UGX ${formatCurrency(receipt.discountAmount)}\n` : ''}
GRAND TOTAL: UGX ${formatCurrency(receipt.amount)}

${receipt.notes ? `Notes: ${receipt.notes}` : ''}

Thank you for your business! 🎉
    `.trim();

    return receiptText;
  };

  const deleteReceipt = async (receipt) => {
    if (receipt.type !== 'refund') {
      Alert.alert(
        'Cannot Delete',
        'Only refund receipts can be deleted. For other receipts, please cancel them instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Receipt',
      `Are you sure you want to delete receipt ${receipt.receiptId}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const response = await apiCall(`/supplier-receipts/${receipt.id}`, {
                method: 'DELETE',
                body: JSON.stringify({
                  reason: 'User requested deletion'
                })
              });

              if (response && response.success) {
                Alert.alert('Success', 'Receipt deleted successfully');
                loadReceipts();
              } else {
                throw new Error(response?.message || 'Failed to delete receipt');
              }
            } catch (error) {
              console.error('Error deleting receipt:', error);
              Alert.alert('Error', 'Failed to delete receipt. Please try again.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const cancelReceipt = async (receipt) => {
    if (receipt.status === 'cancelled') {
      Alert.alert('Already Cancelled', 'This receipt is already cancelled.');
      return;
    }

    Alert.alert(
      'Cancel Receipt',
      `Are you sure you want to cancel receipt ${receipt.receiptId}?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiCall(`/supplier-receipts/${receipt.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  status: 'cancelled'
                })
              });

              if (response && response.success) {
                Alert.alert('Success', 'Receipt cancelled successfully');
                loadReceipts();
              } else {
                throw new Error(response?.message || 'Failed to cancel receipt');
              }
            } catch (error) {
              console.error('Error cancelling receipt:', error);
              Alert.alert('Error', 'Failed to cancel receipt. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getTypeColor = (type) => {
    return type === 'sale' ? '#10B981' : '#EF4444';
  };

  const getTypeIcon = (type) => {
    return type === 'sale' ? 'receipt' : 'receipt-refund';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#F59E0B';
      case 'void': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      case 'void': return 'Void';
      default: return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US').format(Math.round(amount || 0));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'mobile_money': return 'Mobile Money';
      case 'bank_transfer': return 'Bank Transfer';
      case 'credit': return 'Credit';
      case 'multiple': return 'Multiple Methods';
      default: return method?.replace('_', ' ') || 'Cash';
    }
  };

  const getAllItemsFromReceipt = () => {
    if (!detailedReceipt || !detailedReceipt.sales) return [];
    
    const allItems = [];
    detailedReceipt.sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          allItems.push({
            ...item,
            saleNumber: sale.saleNumber,
            saleDate: sale.saleDate
          });
        });
      }
    });
    return allItems;
  };

  const getTotalItemsQuantity = () => {
    const allItems = getAllItemsFromReceipt();
    return allItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  const getTotalAmountSold = () => {
    const allItems = getAllItemsFromReceipt();
    return allItems.reduce((total, item) => total + (item.totalPrice || (item.quantity * item.unitPrice)), 0);
  };

  // Calculate metrics
  const totalReceipts = receipts.length;
  const salesReceipts = receipts.filter(r => r.type === 'sale').length;
  const cancelledReceipts = receipts.filter(r => r.status === 'cancelled').length;
  const printedReceipts = receipts.filter(r => r.status === 'active').length;

  const renderReceiptItem = ({ item }) => (
    <View style={[styles.receiptItem, isDarkMode && styles.darkCard]}>
      {/* Header Section */}
      <View style={styles.receiptHeader}>
        <View style={styles.receiptInfo}>
          <MaterialCommunityIcons 
            name={getTypeIcon(item.type)} 
            size={20} 
            color={getTypeColor(item.type)} 
          />
          <View style={styles.receiptIds}>
            <Text style={[styles.receiptId, isDarkMode && styles.darkText]} numberOfLines={1} ellipsizeMode="tail">
              {item.receiptId}
            </Text>
            <Text style={[styles.orderId, isDarkMode && styles.darkSubtitle]}>
              {item.salesCount} sales • {item.itemsCount} items
            </Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      {/* Details Section */}
      <View style={styles.receiptDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons 
            name="account" 
            size={14} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]} numberOfLines={1} ellipsizeMode="tail">
            {item.customer}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons 
            name="calendar" 
            size={14} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
            {formatDate(item.date)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons 
            name="credit-card" 
            size={14} 
            color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
          />
          <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
            {getPaymentMethodText(item.paymentMethod)}
          </Text>
        </View>
      </View>
      
      {/* Amount Section */}
      <View style={styles.amountSection}>
        <View style={styles.amountMain}>
          <Text style={[styles.amount, isDarkMode && styles.darkText]}>
            UGX {formatCurrency(item.amount)}
          </Text>
          <Text style={[styles.profit, isDarkMode && styles.darkSubtitle]}>
            Profit: UGX {formatCurrency(item.profit)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
          onPress={() => viewReceiptDetails(item)}
        >
          <MaterialCommunityIcons name="eye-outline" size={14} color="#3B82F6" />
          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
            View
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
          onPress={() => printReceipt(item)}
        >
          <MaterialCommunityIcons name="printer-outline" size={14} color="#6B7280" />
          <Text style={[styles.actionButtonText, isDarkMode && styles.darkSubtitle]}>
            Print
          </Text>
        </TouchableOpacity>

        {item.type === 'refund' ? (
          <TouchableOpacity 
            style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
            onPress={() => deleteReceipt(item)}
            disabled={deleting}
          >
            <MaterialCommunityIcons name="delete-outline" size={14} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
              {deleting ? '...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, isDarkMode && styles.darkActionButton]}
            onPress={() => cancelReceipt(item)}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={14} color="#F59E0B" />
            <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const ReceiptImageTemplate = ({ receipt }) => {
    const allItems = getAllItemsFromReceipt();
    const customer = detailedReceipt?.customerDetails || receipt.customerDetails;
    const totalItemsQuantity = getTotalItemsQuantity();
    
    return (
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
        <View style={styles.receiptImageContainer}>
          {/* Receipt Header */}
          <View style={styles.receiptImageHeader}>
            <Text style={styles.receiptImageTitle}>OFFICIAL RECEIPT</Text>
            <Text style={styles.receiptImageId}>#{receipt.receiptId}</Text>
          </View>

          {/* Business Info */}
          <View style={styles.receiptImageBusiness}>
            <Text style={styles.receiptImageBusinessName}>Your Business Name</Text>
            <Text style={styles.receiptImageBusinessAddress}>Business Address, City</Text>
            <Text style={styles.receiptImageBusinessPhone}>Phone: +256 XXX XXX XXX</Text>
          </View>

          {/* Receipt Details */}
          <View style={styles.receiptImageDetails}>
            <View style={styles.receiptImageRow}>
              <Text style={styles.receiptImageLabel}>Date:</Text>
              <Text style={styles.receiptImageValue}>{formatDateTime(receipt.datetime)}</Text>
            </View>
            <View style={styles.receiptImageRow}>
              <Text style={styles.receiptImageLabel}>Customer:</Text>
              <Text style={styles.receiptImageValue}>{customer?.name || 'Walk-in Customer'}</Text>
            </View>
            <View style={styles.receiptImageRow}>
              <Text style={styles.receiptImageLabel}>Payment Method:</Text>
              <Text style={styles.receiptImageValue}>{getPaymentMethodText(receipt.paymentMethod)}</Text>
            </View>
          </View>

          {/* Items Table Header */}
          <View style={styles.receiptImageTableHeader}>
            <Text style={styles.receiptImageTableHeaderText}>ITEM</Text>
            <Text style={styles.receiptImageTableHeaderText}>QTY</Text>
            <Text style={styles.receiptImageTableHeaderText}>PRICE</Text>
            <Text style={styles.receiptImageTableHeaderText}>TOTAL</Text>
          </View>

          {/* Items List */}
          {allItems.map((item, index) => (
            <View key={index} style={styles.receiptImageTableRow}>
              <Text style={styles.receiptImageTableItem}>{item.productName || 'Product'}</Text>
              <Text style={styles.receiptImageTableQty}>{item.quantity}</Text>
              <Text style={styles.receiptImageTablePrice}>UGX {formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.receiptImageTableTotal}>UGX {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}</Text>
            </View>
          ))}

          {/* Summary */}
          <View style={styles.receiptImageSummary}>
            <View style={styles.receiptImageSummaryRow}>
              <Text style={styles.receiptImageSummaryLabel}>Subtotal:</Text>
              <Text style={styles.receiptImageSummaryValue}>UGX {formatCurrency(receipt.amount)}</Text>
            </View>
            {receipt.taxAmount > 0 && (
              <View style={styles.receiptImageSummaryRow}>
                <Text style={styles.receiptImageSummaryLabel}>Tax:</Text>
                <Text style={styles.receiptImageSummaryValue}>UGX {formatCurrency(receipt.taxAmount)}</Text>
              </View>
            )}
            {receipt.discountAmount > 0 && (
              <View style={styles.receiptImageSummaryRow}>
                <Text style={styles.receiptImageSummaryLabel}>Discount:</Text>
                <Text style={styles.receiptImageSummaryValue}>-UGX {formatCurrency(receipt.discountAmount)}</Text>
              </View>
            )}
            <View style={[styles.receiptImageSummaryRow, styles.receiptImageTotalRow]}>
              <Text style={styles.receiptImageTotalLabel}>TOTAL:</Text>
              <Text style={styles.receiptImageTotalValue}>UGX {formatCurrency(receipt.amount)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.receiptImageFooter}>
            <Text style={styles.receiptImageThankYou}>Thank you for your business!</Text>
            <Text style={styles.receiptImageFooterText}>Items: {totalItemsQuantity} | Receipt: {receipt.receiptId}</Text>
            {receipt.notes && (
              <Text style={styles.receiptImageNotes}>Notes: {receipt.notes}</Text>
            )}
          </View>
        </View>
      </ViewShot>
    );
  };

  const renderReceiptDetailsModal = () => {
    if (!selectedReceipt) return null;

    const allItems = getAllItemsFromReceipt();
    const customer = detailedReceipt?.customerDetails || selectedReceipt.customerDetails;
    const totalItemsQuantity = getTotalItemsQuantity();
    const totalAmountSold = getTotalAmountSold();

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleSection}>
                <MaterialCommunityIcons 
                  name={getTypeIcon(selectedReceipt.type)} 
                  size={24} 
                  color={getTypeColor(selectedReceipt.type)} 
                />
                <View style={styles.modalTitleContainer}>
                  <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                    Receipt Details
                  </Text>
                  <Text style={[styles.receiptNumber, isDarkMode && styles.darkSubtitle]} numberOfLines={1} ellipsizeMode="tail">
                    {selectedReceipt.receiptId}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={24} 
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"} 
                />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <View style={styles.modalBodyContainer}>
              <ScrollView 
                style={styles.modalBody}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalBodyContent}
              >
                {/* Hidden receipt image template for sharing */}
                <View style={styles.hiddenReceiptContainer}>
                  <ReceiptImageTemplate receipt={selectedReceipt} />
                </View>

                {/* Receipt Basic Info */}
                <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                  <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                    Receipt Information
                  </Text>
                  
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                        Receipt Number
                      </Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={1} ellipsizeMode="tail">
                        {selectedReceipt.receiptId}
                      </Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                        Date & Time
                      </Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                        {formatDateTime(selectedReceipt.datetime)}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                        Status
                      </Text>
                      <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedReceipt.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(selectedReceipt.status) }]}>
                          {getStatusText(selectedReceipt.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                        Payment Method
                      </Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                        {getPaymentMethodText(selectedReceipt.paymentMethod)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Customer Information */}
                <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                  <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                    Customer Information
                  </Text>
                  
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                        Name
                      </Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={1} ellipsizeMode="tail">
                        {customer?.name || 'Walk-in Customer'}
                      </Text>
                    </View>
                    
                    {customer?.email && (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                          Email
                        </Text>
                        <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={1} ellipsizeMode="tail">
                          {customer.email}
                        </Text>
                      </View>
                    )}
                    
                    {customer?.phone && (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                          Phone
                        </Text>
                        <Text style={[styles.detailValue, isDarkMode && styles.darkText]}>
                          {customer.phone}
                        </Text>
                      </View>
                    )}
                    
                    {customer?.address && (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, isDarkMode && styles.darkSubtitle]}>
                          Address
                        </Text>
                        <Text style={[styles.detailValue, isDarkMode && styles.darkText]} numberOfLines={2} ellipsizeMode="tail">
                          {customer.address}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Items List */}
                {allItems.length > 0 ? (
                  <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                    <View style={styles.itemsHeader}>
                      <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                        Items Sold ({allItems.length})
                      </Text>
                      <View style={styles.itemsSummary}>
                        <Text style={[styles.itemsSummaryText, isDarkMode && styles.darkSubtitle]}>
                          Total Quantity: {totalItemsQuantity}
                        </Text>
                        <Text style={[styles.itemsSummaryText, isDarkMode && styles.darkSubtitle]}>
                          Total Amount: UGX {formatCurrency(totalAmountSold)}
                        </Text>
                      </View>
                    </View>
                    
                    {allItems.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={[styles.itemName, isDarkMode && styles.darkText]} numberOfLines={2} ellipsizeMode="tail">
                            {item.productName || 'Product'}
                          </Text>
                          <Text style={[styles.itemDetails, isDarkMode && styles.darkSubtitle]}>
                            {item.quantity} × UGX {formatCurrency(item.unitPrice)}
                          </Text>
                          {item.saleNumber && (
                            <Text style={[styles.saleReference, isDarkMode && styles.darkSubtitle]}>
                              Sale: {item.saleNumber}
                            </Text>
                          )}
                        </View>
                        <View style={styles.itemTotals}>
                          <Text style={[styles.itemTotal, isDarkMode && styles.darkText]}>
                            UGX {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice))}
                          </Text>
                          {item.profit !== undefined && (
                            <Text style={[styles.itemProfit, { color: (item.profit || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                              Profit: UGX {formatCurrency(item.profit)}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                    <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                      Items Sold
                    </Text>
                    <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
                      No items found for this receipt
                    </Text>
                  </View>
                )}

                {/* Sales Summary */}
                {detailedReceipt?.sales && detailedReceipt.sales.length > 0 && (
                  <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                    <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                      Sales Summary ({detailedReceipt.sales.length} Sales)
                    </Text>
                    
                    {detailedReceipt.sales.map((sale, index) => (
                      <View key={sale._id || index} style={styles.saleSummary}>
                        <View style={styles.saleHeader}>
                          <Text style={[styles.saleNumber, isDarkMode && styles.darkText]} numberOfLines={1} ellipsizeMode="tail">
                            {sale.saleNumber || `Sale ${index + 1}`}
                          </Text>
                          <Text style={[styles.saleAmount, isDarkMode && styles.darkText]}>
                            UGX {formatCurrency(sale.totalAmount)}
                          </Text>
                        </View>
                        <Text style={[styles.saleDate, isDarkMode && styles.darkSubtitle]}>
                          {formatDateTime(sale.saleDate)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Financial Summary */}
                <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                  <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                    Financial Summary
                  </Text>
                  
                  <View style={styles.financialGrid}>
                    <View style={styles.financialItem}>
                      <Text style={[styles.financialLabel, isDarkMode && styles.darkSubtitle]}>
                        Subtotal
                      </Text>
                      <Text style={[styles.financialValue, isDarkMode && styles.darkText]}>
                        UGX {formatCurrency(selectedReceipt.amount)}
                      </Text>
                    </View>
                    
                    {selectedReceipt.taxAmount > 0 && (
                      <View style={styles.financialItem}>
                        <Text style={[styles.financialLabel, isDarkMode && styles.darkSubtitle]}>
                          Tax
                        </Text>
                        <Text style={[styles.financialValue, isDarkMode && styles.darkText]}>
                          UGX {formatCurrency(selectedReceipt.taxAmount)}
                        </Text>
                      </View>
                    )}
                    
                    {selectedReceipt.discountAmount > 0 && (
                      <View style={styles.financialItem}>
                        <Text style={[styles.financialLabel, isDarkMode && styles.darkSubtitle]}>
                          Discount
                        </Text>
                        <Text style={[styles.discountValue, isDarkMode && styles.darkText]}>
                          -UGX {formatCurrency(selectedReceipt.discountAmount)}
                        </Text>
                      </View>
                    )}
                    
                    <View style={[styles.financialItem, styles.grandTotal]}>
                      <Text style={[styles.grandTotalLabel, isDarkMode && styles.darkText]}>
                        Total Amount
                      </Text>
                      <Text style={[styles.grandTotalValue, isDarkMode && styles.darkText]}>
                        UGX {formatCurrency(selectedReceipt.amount)}
                      </Text>
                    </View>
                    
                    <View style={[styles.financialItem, styles.profitTotal]}>
                      <Text style={[styles.financialLabel, isDarkMode && styles.darkSubtitle]}>
                        Total Profit
                      </Text>
                      <Text style={[styles.profitTotalValue, { color: (selectedReceipt.profit || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                        UGX {formatCurrency(selectedReceipt.profit)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Notes */}
                {selectedReceipt.notes && (
                  <View style={[styles.detailSection, isDarkMode && styles.darkCard]}>
                    <Text style={[styles.detailSectionTitle, isDarkMode && styles.darkText]}>
                      Notes
                    </Text>
                    <Text style={[styles.notesText, isDarkMode && styles.darkSubtitle]}>
                      {selectedReceipt.notes}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.secondaryModalButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.secondaryModalButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.shareModalButton]}
                onPress={() => shareReceipt(selectedReceipt)}
                disabled={sharing}
              >
                <MaterialCommunityIcons name="share-variant" size={18} color="#FFFFFF" />
                <Text style={styles.shareModalButtonText}>
                  {sharing ? 'Sharing...' : 'Share'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryModalButton]}
                onPress={() => {
                  setModalVisible(false);
                  printReceipt(selectedReceipt);
                }}
              >
                <MaterialCommunityIcons name="printer" size={18} color="#FFFFFF" />
                <Text style={styles.primaryModalButtonText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
            Loading Receipts...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons 
            name="file-document" 
            size={20} 
            color={isDarkMode ? "#EC4899" : "#DB2777"} 
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Receipts Management
          </Text>
        </View>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
          Manage and view all transaction receipts
        </Text>
      </View>

      {/* Compact Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, isDarkMode && styles.darkCard]}>
          <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
            {totalReceipts}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>
            Total
          </Text>
        </View>
        <View style={[styles.statCard, isDarkMode && styles.darkCard]}>
          <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
            {salesReceipts}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>
            Sales
          </Text>
        </View>
        <View style={[styles.statCard, isDarkMode && styles.darkCard]}>
          <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
            {cancelledReceipts}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>
            Cancelled
          </Text>
        </View>
        <View style={[styles.statCard, isDarkMode && styles.darkCard]}>
          <Text style={[styles.statNumber, isDarkMode && styles.darkText]}>
            {printedReceipts}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.darkSubtitle]}>
            Printed
          </Text>
        </View>
      </View>

      {/* Receipts List */}
      <View style={styles.receiptsSection}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          Recent Receipts • {receipts.length}
        </Text>
        
        {receipts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="receipt-outline" 
              size={32} 
              color={isDarkMode ? "#6B7280" : "#9CA3AF"} 
            />
            <Text style={[styles.emptyText, isDarkMode && styles.darkSubtitle]}>
              No receipts found
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.darkSubtitle]}>
              {loading ? 'Loading receipts...' : 'Your receipts will appear here once created'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={receipts}
            renderItem={renderReceiptItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Receipt Details Modal */}
      {renderReceiptDetailsModal()}
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 55,
  },
  darkCard: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  receiptsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  receiptItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  receiptIds: {
    marginLeft: 12,
    flex: 1,
  },
  receiptId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
    flexShrink: 1,
  },
  orderId: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  receiptDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    flexShrink: 1,
  },
  amountSection: {
    marginBottom: 12,
  },
  amountMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  profit: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  darkActionButton: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
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
    maxHeight: '95%',
    minHeight: 500,
  },
  darkModalContent: {
    backgroundColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  receiptNumber: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flexShrink: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalBodyContainer: {
    flex: 1,
    minHeight: 400,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    flexGrow: 1,
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  primaryModalButton: {
    backgroundColor: '#EC4899',
  },
  secondaryModalButton: {
    backgroundColor: '#F3F4F6',
  },
  shareModalButton: {
    backgroundColor: '#10B981',
  },
  primaryModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryModalButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  shareModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Hidden receipt image styles
  hiddenReceiptContainer: {
    position: 'absolute',
    left: -1000, // Move off-screen
    opacity: 0,
  },
  // Receipt Image Template Styles
  receiptImageContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    width: 350,
    borderWidth: 2,
    borderColor: '#000000',
  },
  receiptImageHeader: {
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 8,
  },
  receiptImageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  receiptImageId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptImageBusiness: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptImageBusinessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  receiptImageBusinessAddress: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 2,
  },
  receiptImageBusinessPhone: {
    fontSize: 12,
    color: '#000000',
  },
  receiptImageDetails: {
    marginBottom: 16,
  },
  receiptImageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptImageLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptImageValue: {
    fontSize: 12,
    color: '#000000',
  },
  receiptImageTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    marginBottom: 8,
  },
  receiptImageTableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  receiptImageTableRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  receiptImageTableItem: {
    fontSize: 10,
    color: '#000000',
    flex: 2,
    textAlign: 'left',
  },
  receiptImageTableQty: {
    fontSize: 10,
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  receiptImageTablePrice: {
    fontSize: 10,
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  receiptImageTableTotal: {
    fontSize: 10,
    color: '#000000',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  receiptImageSummary: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 8,
  },
  receiptImageSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptImageSummaryLabel: {
    fontSize: 12,
    color: '#000000',
  },
  receiptImageSummaryValue: {
    fontSize: 12,
    color: '#000000',
  },
  receiptImageTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 8,
    marginTop: 4,
  },
  receiptImageTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptImageTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  receiptImageFooter: {
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 8,
  },
  receiptImageThankYou: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  receiptImageFooterText: {
    fontSize: 10,
    color: '#000000',
    marginBottom: 4,
  },
  receiptImageNotes: {
    fontSize: 10,
    color: '#000000',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Detail Section Styles
  detailSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  detailGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 8,
  },
  // Items Section Styles
  itemsHeader: {
    marginBottom: 12,
  },
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemsSummaryText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Item Row Styles
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
    flexShrink: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
    flexShrink: 1,
  },
  itemDetails: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  saleReference: {
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  itemTotals: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  itemProfit: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Sale Summary Styles
  saleSummary: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  saleNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  saleAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  saleDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  // Financial Summary Styles
  financialGrid: {
    gap: 8,
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  financialLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  financialValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },
  grandTotalValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
  },
  profitTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  profitTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});

export default ReceiptsTab;