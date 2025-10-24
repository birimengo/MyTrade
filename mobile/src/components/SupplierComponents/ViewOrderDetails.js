import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { 
  FontAwesome5, 
  Ionicons,
  Feather,
  MaterialIcons
} from '@expo/vector-icons';

const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const ViewOrderDetails = ({ route, navigation }) => {
  const { order } = route.params;
  const { user, token } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState(order);

  useEffect(() => {
    if (order._id) {
      fetchOrderDetails();
    }
  }, [order._id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/supplier/orders/${order._id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrderDetails(data.order || data.data || order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: '#EA580C', icon: 'clock' };
      case 'confirmed':
        return { label: 'Confirmed', color: '#2563EB', icon: 'check-circle' };
      case 'in_production':
        return { label: 'In Production', color: '#9333EA', icon: 'settings' };
      case 'ready_for_delivery':
        return { label: 'Ready for Delivery', color: '#16A34A', icon: 'package' };
      case 'assigned_to_transporter':
        return { label: 'Assigned to Transporter', color: '#0D9488', icon: 'truck' };
      case 'shipped':
        return { label: 'Shipped', color: '#7C3AED', icon: 'shipping-fast' };
      case 'delivered':
        return { label: 'Delivered', color: '#059669', icon: 'check-circle' };
      default:
        return { label: 'Pending', color: '#6B7280', icon: 'clock' };
    }
  };

  const openMaps = () => {
    if (orderDetails.deliveryCoordinates) {
      const { lat, lng } = orderDetails.deliveryCoordinates;
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url).catch(err => 
        Alert.alert('Error', 'Could not open maps application')
      );
    } else {
      Alert.alert('Info', 'Delivery coordinates not available');
    }
  };

  const callClient = () => {
    if (orderDetails.client?.phone) {
      Linking.openURL(`tel:${orderDetails.client.phone}`).catch(err =>
        Alert.alert('Error', 'Could not make phone call')
      );
    } else {
      Alert.alert('Info', 'Client phone number not available');
    }
  };

  const StatusTimeline = () => {
    const statuses = [
      'pending',
      'confirmed', 
      'in_production',
      'ready_for_delivery',
      'assigned_to_transporter',
      'shipped',
      'delivered'
    ];

    const currentStatusIndex = statuses.indexOf(orderDetails.status);

    return (
      <View style={styles.timelineContainer}>
        <Text style={[styles.timelineTitle, isDarkMode && styles.darkText]}>
          Order Status Timeline
        </Text>
        <View style={styles.timeline}>
          {statuses.map((status, index) => {
            const statusInfo = getStatusInfo(status);
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;

            return (
              <View key={status} style={styles.timelineItem}>
                <View style={styles.timelineDotContainer}>
                  <View 
                    style={[
                      styles.timelineDot,
                      isCompleted ? styles.completedDot : styles.pendingDot,
                      isCurrent && styles.currentDot
                    ]}
                  >
                    {isCompleted && (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  {index < statuses.length - 1 && (
                    <View 
                      style={[
                        styles.timelineLine,
                        isCompleted ? styles.completedLine : styles.pendingLine
                      ]} 
                    />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineStatus,
                    isDarkMode && styles.darkText,
                    isCompleted && styles.completedText
                  ]}>
                    {statusInfo.label}
                  </Text>
                  {isCurrent && (
                    <Text style={[styles.currentStatus, isDarkMode && styles.darkSubtitle]}>
                      Current Status
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, isDarkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={[styles.loadingText, isDarkMode && styles.darkSubtitle]}>
          Loading order details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, isDarkMode && styles.darkContainer]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFFFFF" : "#374151"} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.orderNumber, isDarkMode && styles.darkText]}>
            {orderDetails.orderNumber}
          </Text>
          <Text style={[styles.orderDate, isDarkMode && styles.darkSubtitle]}>
            Ordered on {new Date(orderDetails.orderDate).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, isDarkMode && styles.darkStatusCard]}>
        <View style={styles.statusHeader}>
          <View style={styles.statusInfo}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusInfo(orderDetails.status).color}20` }]}>
              <Feather 
                name={getStatusInfo(orderDetails.status).icon} 
                size={20} 
                color={getStatusInfo(orderDetails.status).color} 
              />
              <Text style={[styles.statusText, { color: getStatusInfo(orderDetails.status).color }]}>
                {getStatusInfo(orderDetails.status).label}
              </Text>
            </View>
            <Text style={[styles.deliveryDate, isDarkMode && styles.darkSubtitle]}>
              Delivery due: {new Date(orderDetails.deliveryDate).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.totalAmount, isDarkMode && styles.darkText]}>
            UGX {orderDetails.totalAmount?.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Client Information */}
      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          Client Information
        </Text>
        <View style={styles.clientCard}>
          <View style={styles.clientHeader}>
            <View style={styles.clientAvatar}>
              <Text style={styles.avatarText}>
                {orderDetails.client?.businessName?.charAt(0) || 'C'}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={[styles.businessName, isDarkMode && styles.darkText]}>
                {orderDetails.client?.businessName}
              </Text>
              <Text style={[styles.contactPerson, isDarkMode && styles.darkSubtitle]}>
                {orderDetails.client?.contactPerson}
              </Text>
            </View>
          </View>
          
          <View style={styles.clientDetails}>
            <View style={styles.detailRow}>
              <Feather name="phone" size={16} color="#6B7280" />
              <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
                {orderDetails.client?.phone}
              </Text>
              <TouchableOpacity onPress={callClient} style={styles.callButton}>
                <Feather name="phone-call" size={14} color="#2563EB" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.detailRow}>
              <Feather name="mail" size={16} color="#6B7280" />
              <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]}>
                {orderDetails.client?.email}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={16} color="#6B7280" />
              <Text style={[styles.detailText, isDarkMode && styles.darkSubtitle]} numberOfLines={2}>
                {orderDetails.client?.deliveryAddress || 'Address not specified'}
              </Text>
              {orderDetails.deliveryCoordinates && (
                <TouchableOpacity onPress={openMaps} style={styles.mapButton}>
                  <Feather name="map" size={14} color="#16A34A" />
                  <Text style={styles.mapButtonText}>Map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Products List */}
      <View style={[styles.section, isDarkMode && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
          Order Items ({orderDetails.products?.length || 0})
        </Text>
        <View style={styles.productsList}>
          {orderDetails.products?.map((item, index) => (
            <View key={index} style={[styles.productItem, isDarkMode && styles.darkProductItem]}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, isDarkMode && styles.darkText]}>
                  {item.product?.name}
                </Text>
                <Text style={[styles.productDescription, isDarkMode && styles.darkSubtitle]}>
                  {item.product?.description}
                </Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={[styles.productQuantity, isDarkMode && styles.darkText]}>
                  {item.quantity} units
                </Text>
                <Text style={[styles.productPrice, isDarkMode && styles.darkText]}>
                  UGX {item.unitPrice?.toLocaleString()} each
                </Text>
                <Text style={styles.productTotal}>
                  UGX {(item.quantity * item.unitPrice)?.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>Subtotal</Text>
            <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
              UGX {orderDetails.totalAmount?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtitle]}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
              UGX {0}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>Total</Text>
            <Text style={styles.totalValue}>
              UGX {orderDetails.totalAmount?.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Status Timeline */}
      <StatusTimeline />

      {/* Transporter Information */}
      {orderDetails.transporter && (
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Transporter Information
          </Text>
          <View style={styles.transporterCard}>
            <View style={styles.transporterHeader}>
              <Feather name="truck" size={24} color="#2563EB" />
              <View style={styles.transporterInfo}>
                <Text style={[styles.transporterName, isDarkMode && styles.darkText]}>
                  {orderDetails.transporter.name}
                </Text>
                <Text style={[styles.transporterContact, isDarkMode && styles.darkSubtitle]}>
                  {orderDetails.transporter.contact}
                </Text>
              </View>
            </View>
            {orderDetails.trackingNumber && (
              <View style={styles.trackingInfo}>
                <Text style={[styles.trackingLabel, isDarkMode && styles.darkSubtitle]}>
                  Tracking Number:
                </Text>
                <Text style={[styles.trackingNumber, isDarkMode && styles.darkText]}>
                  {orderDetails.trackingNumber}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Order Notes */}
      {orderDetails.orderNotes && (
        <View style={[styles.section, isDarkMode && styles.darkSection]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Order Notes
          </Text>
          <View style={[styles.notesCard, isDarkMode && styles.darkNotesCard]}>
            <Text style={[styles.notesText, isDarkMode && styles.darkText]}>
              {orderDetails.orderNotes}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#D1D5DB',
  },
  statusCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  darkStatusCard: {
    backgroundColor: '#1F2937',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkSection: {
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  clientCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  contactPerson: {
    fontSize: 14,
    color: '#6B7280',
  },
  clientDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  callButtonText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  mapButtonText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  productsList: {
    gap: 8,
    marginBottom: 16,
  },
  productItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  darkProductItem: {
    backgroundColor: '#1F2937',
  },
  productInfo: {
    flex: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  productDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  productTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  orderSummary: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  timelineContainer: {
    padding: 16,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  timeline: {
    gap: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDotContainer: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedDot: {
    backgroundColor: '#16A34A',
  },
  pendingDot: {
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  currentDot: {
    backgroundColor: '#2563EB',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  completedLine: {
    backgroundColor: '#16A34A',
  },
  pendingLine: {
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  completedText: {
    color: '#16A34A',
  },
  currentStatus: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  transporterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  transporterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  transporterInfo: {
    flex: 1,
  },
  transporterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  transporterContact: {
    fontSize: 14,
    color: '#6B7280',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  notesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  darkNotesCard: {
    backgroundColor: '#1F2937',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default ViewOrderDetails;