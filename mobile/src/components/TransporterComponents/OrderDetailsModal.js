// C:\Users\ham\Desktop\trade\mobile\src\components\TransporterComponents\OrderDetailsModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const OrderDetailsModal = ({
  order,
  isVisible,
  onClose,
  getStatusIcon,
  getStatusColor,
  getStatusText,
  formatDate,
  updateOrderStatus,
  getOrderType,
  acceptReturnOrder,
  availableReturnOrders,
  isDarkMode
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!order) return null;

  const getAllProductImages = (order) => {
    const images = [];
    order.items?.forEach(item => {
      if (item.product?.images) {
        images.push(...item.product.images);
      }
    });
    return images;
  };

  const images = getAllProductImages(order);
  const orderType = getOrderType(order);
  const isAvailableReturn = availableReturnOrders?.some(ro => ro._id === order._id);
  const statusColor = getStatusColor(order.status);

  const navigateImage = (direction) => {
    if (images.length <= 1) return;

    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const getSupplierName = (supplier) => {
    if (!supplier) return 'Unknown Supplier';
    return supplier.businessName || `${supplier.firstName} ${supplier.lastName}`;
  };

  const getWholesalerName = (wholesaler) => {
    if (!wholesaler) return 'Unknown Wholesaler';
    return wholesaler.businessName || `${wholesaler.firstName} ${wholesaler.lastName}`;
  };

  const renderStatusActions = () => {
    if (orderType === 'delivery') {
      return (
        <View style={styles.actionsContainer}>
          {order.status === 'assigned_to_transporter' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => updateOrderStatus(order._id, 'accepted_by_transporter')}
              >
                <Text style={styles.actionButtonText}>Accept Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => updateOrderStatus(order._id, 'cancelled', 'Transporter declined the assignment')}
              >
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
          
          {order.status === 'accepted_by_transporter' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => updateOrderStatus(order._id, 'in_transit')}
              >
                <Text style={styles.actionButtonText}>Start Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => updateOrderStatus(order._id, 'cancelled', 'Delivery cancelled by transporter')}
              >
                <Text style={styles.actionButtonText}>Cancel Delivery</Text>
              </TouchableOpacity>
            </>
          )}
          
          {order.status === 'in_transit' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.deliverButton]}
                onPress={() => updateOrderStatus(order._id, 'delivered')}
              >
                <Text style={styles.actionButtonText}>Mark as Delivered</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => updateOrderStatus(order._id, 'cancelled', 'Delivery cancelled by transporter')}
              >
                <Text style={styles.actionButtonText}>Cancel Delivery</Text>
              </TouchableOpacity>
            </>
          )}

          {order.status === 'delivered' && (
            <View style={[styles.actionButton, styles.completedButton]}>
              <Text style={[styles.actionButtonText, styles.completedText]}>Delivery Completed</Text>
            </View>
          )}
        </View>
      );
    } else if (orderType === 'return') {
      return (
        <View style={styles.actionsContainer}>
          {order.status === 'return_requested' && !order.returnTransporter && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => acceptReturnOrder(order._id)}
            >
              <Text style={styles.actionButtonText}>Accept Return Order</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'return_requested' && order.returnTransporter && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => updateOrderStatus(order._id, 'return_accepted')}
            >
              <Text style={styles.actionButtonText}>Start Return Process</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'return_accepted' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.pickupButton]}
                onPress={() => updateOrderStatus(order._id, 'return_in_transit')}
              >
                <Text style={styles.actionButtonText}>Pickup Return</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => updateOrderStatus(order._id, 'cancelled', 'Return cancelled by transporter')}
              >
                <Text style={styles.actionButtonText}>Cancel Return</Text>
              </TouchableOpacity>
            </>
          )}
          
          {order.status === 'return_in_transit' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => updateOrderStatus(order._id, 'returned_to_supplier')}
              >
                <Text style={styles.actionButtonText}>Complete Return</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => updateOrderStatus(order._id, 'cancelled', 'Return cancelled by transporter')}
              >
                <Text style={styles.actionButtonText}>Cancel Return</Text>
              </TouchableOpacity>
            </>
          )}

          {order.status === 'returned_to_supplier' && (
            <View style={[styles.actionButton, styles.completedButton]}>
              <Text style={[styles.actionButtonText, styles.completedText]}>Return Completed</Text>
            </View>
          )}
        </View>
      );
    }

    if (order.status === 'cancelled') {
      return (
        <View style={[styles.actionButton, styles.cancelledButton]}>
          <Text style={[styles.actionButtonText, styles.cancelledText]}>Order Cancelled</Text>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.darkHeader]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, isDarkMode && styles.darkText]}>
              Order Details
            </Text>
            <Text style={[styles.orderNumber, isDarkMode && styles.darkText]}>
              {order.orderNumber}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDarkMode ? "#d1d5db" : "#374151"} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Type and Status */}
          <View style={[styles.statusSection, isDarkMode && styles.darkStatusSection]}>
            <View style={styles.typeStatusRow}>
              <View style={[
                styles.typeBadge,
                orderType === 'return' ? styles.returnTypeBadge : styles.deliveryTypeBadge,
                isDarkMode && (orderType === 'return' ? styles.darkReturnTypeBadge : styles.darkDeliveryTypeBadge)
              ]}>
                <Ionicons 
                  name={orderType === 'return' ? 'return-up-back' : 'truck'} 
                  size={16} 
                  color={orderType === 'return' ? '#7e22ce' : '#1e40af'} 
                />
                <Text style={[
                  styles.typeBadgeText,
                  orderType === 'return' ? styles.returnTypeText : styles.deliveryTypeText
                ]}>
                  {orderType === 'return' ? 'Return Order' : 'Delivery Order'}
                </Text>
              </View>
              
              {isAvailableReturn && (
                <View style={styles.availableReturnBadge}>
                  <Ionicons name="warning" size={14} color="#ffffff" />
                  <Text style={styles.availableReturnText}>Available for Acceptance</Text>
                </View>
              )}
            </View>

            <View style={styles.statusInfo}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Ionicons name={getStatusIcon(order.status)} size={16} color={statusColor.text} />
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {getStatusText(order.status)}
                </Text>
              </View>
              
              <View style={styles.dateInfo}>
                <Text style={[styles.dateLabel, isDarkMode && styles.darkSubtext]}>
                  Ordered: {formatDate(order.createdAt)}
                </Text>
                {order.transporterAssignedAt && (
                  <Text style={[styles.dateLabel, isDarkMode && styles.darkSubtext]}>
                    Assigned: {formatDate(order.transporterAssignedAt)}
                  </Text>
                )}
                {order.returnRequestedAt && (
                  <Text style={[styles.dateLabel, isDarkMode && styles.darkSubtext]}>
                    Return Requested: {formatDate(order.returnRequestedAt)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Image Gallery */}
          {images.length > 0 && (
            <View style={styles.imageSection}>
              <View style={styles.mainImageContainer}>
                <Image
                  source={{ uri: images[currentImageIndex]?.url }}
                  style={styles.mainImage}
                  resizeMode="cover"
                />
                
                {images.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonLeft]}
                      onPress={() => navigateImage('prev')}
                    >
                      <Ionicons name="chevron-back" size={20} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonRight]}
                      onPress={() => navigateImage('next')}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                    </TouchableOpacity>
                    
                    <View style={styles.imageCounter}>
                      <Text style={styles.imageCounterText}>
                        {currentImageIndex + 1} / {images.length}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnailsScroll}
                  contentContainerStyle={styles.thumbnailsContent}
                >
                  {images.map((image, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.thumbnail,
                        index === currentImageIndex && styles.thumbnailActive
                      ]}
                      onPress={() => setCurrentImageIndex(index)}
                    >
                      <Image
                        source={{ uri: image.url }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Status Actions */}
          <View style={[styles.actionsSection, isDarkMode && styles.darkActionsSection]}>
            {renderStatusActions()}
          </View>

          {/* Two Column Layout for larger screens */}
          <View style={styles.contentGrid}>
            {/* Left Column - Order Items */}
            <View style={styles.column}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                Order Items
              </Text>
              
              <View style={styles.itemsList}>
                {order.items?.map((item, index) => {
                  const product = item.product;
                  const imageUrl = product?.images?.[0]?.url;
                  
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.itemCard,
                        isDarkMode && styles.darkItemCard
                      ]}
                    >
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.itemPlaceholder, isDarkMode && styles.darkItemPlaceholder]}>
                          <Ionicons name="cube-outline" size={20} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
                        </View>
                      )}
                      
                      <View style={styles.itemDetails}>
                        <Text style={[styles.itemName, isDarkMode && styles.darkText]} numberOfLines={2}>
                          {product?.name}
                        </Text>
                        <Text style={[styles.itemDescription, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
                          {product?.description}
                        </Text>
                        <View style={styles.itemMeta}>
                          <Text style={[styles.itemMetaText, isDarkMode && styles.darkSubtext]}>
                            Qty: {item.quantity}
                          </Text>
                          <Text style={[styles.itemMetaText, isDarkMode && styles.darkSubtext]}>
                            Price: ${item.unitPrice}
                          </Text>
                          {product?.measurementUnit && (
                            <Text style={[styles.itemMetaText, isDarkMode && styles.darkSubtext]}>
                              {product.measurementUnit}
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.itemTotal}>
                        <Text style={[styles.itemTotalText, isDarkMode && styles.darkText]}>
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Order Summary */}
              <View style={[styles.summaryCard, isDarkMode && styles.darkSummaryCard]}>
                <Text style={[styles.summaryTitle, isDarkMode && styles.darkText]}>
                  Order Summary
                </Text>
                
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtext]}>
                    Subtotal:
                  </Text>
                  <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                    ${order.totalAmount?.toFixed(2)}
                  </Text>
                </View>
                
                {order.discounts > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtext]}>
                      Discount:
                    </Text>
                    <Text style={styles.discountValue}>
                      -${order.discounts.toFixed(2)}
                    </Text>
                  </View>
                )}
                
                {order.taxAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, isDarkMode && styles.darkSubtext]}>
                      Tax:
                    </Text>
                    <Text style={[styles.summaryValue, isDarkMode && styles.darkText]}>
                      ${order.taxAmount.toFixed(2)}
                    </Text>
                  </View>
                )}
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>
                    Total:
                  </Text>
                  <Text style={styles.totalValue}>
                    ${order.finalAmount?.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Column - Contact Information */}
            <View style={styles.column}>
              {/* Supplier Information */}
              <View style={[styles.contactCard, isDarkMode && styles.darkContactCard]}>
                <Text style={[styles.contactTitle, isDarkMode && styles.darkText]}>
                  Supplier Information
                </Text>
                
                <View style={styles.contactHeader}>
                  <View style={[styles.contactIcon, styles.supplierIcon]}>
                    <Ionicons name="business-outline" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, isDarkMode && styles.darkText]}>
                      {getSupplierName(order.supplier)}
                    </Text>
                    <Text style={[styles.contactRole, isDarkMode && styles.darkSubtext]}>
                      Supplier
                    </Text>
                  </View>
                </View>
                
                <View style={styles.contactDetails}>
                  {order.supplier?.email && (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={16} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                      <Text style={[styles.contactDetail, isDarkMode && styles.darkSubtext]}>
                        {order.supplier.email}
                      </Text>
                    </View>
                  )}
                  
                  {order.supplier?.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={16} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                      <Text style={[styles.contactDetail, isDarkMode && styles.darkSubtext]}>
                        {order.supplier.phone}
                      </Text>
                    </View>
                  )}
                  
                  {(order.supplier?.city || order.supplier?.country) && (
                    <View style={styles.contactRow}>
                      <Ionicons name="location-outline" size={16} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                      <Text style={[styles.contactDetail, isDarkMode && styles.darkSubtext]}>
                        {[order.supplier.city, order.supplier.country].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Wholesaler Information */}
              <View style={[styles.contactCard, isDarkMode && styles.darkContactCard]}>
                <Text style={[styles.contactTitle, isDarkMode && styles.darkText]}>
                  {orderType === 'return' ? 'Return From (Wholesaler)' : 'Delivery To (Wholesaler)'}
                </Text>
                
                <View style={styles.contactHeader}>
                  <View style={[styles.contactIcon, styles.wholesalerIcon]}>
                    <Ionicons name="storefront-outline" size={20} color="#16a34a" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, isDarkMode && styles.darkText]}>
                      {getWholesalerName(order.wholesaler)}
                    </Text>
                    <Text style={[styles.contactRole, isDarkMode && styles.darkSubtext]}>
                      Wholesaler
                    </Text>
                  </View>
                </View>
                
                <View style={styles.contactDetails}>
                  {order.wholesaler?.email && (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={16} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                      <Text style={[styles.contactDetail, isDarkMode && styles.darkSubtext]}>
                        {order.wholesaler.email}
                      </Text>
                    </View>
                  )}
                  
                  {order.wholesaler?.phone && (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={16} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                      <Text style={[styles.contactDetail, isDarkMode && styles.darkSubtext]}>
                        {order.wholesaler.phone}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Shipping Information */}
              <View style={[styles.contactCard, isDarkMode && styles.darkContactCard]}>
                <Text style={[styles.contactTitle, isDarkMode && styles.darkText]}>
                  {orderType === 'return' ? 'Return To Address' : 'Shipping Address'}
                </Text>
                
                <View style={styles.contactRow}>
                  <Ionicons name="location-outline" size={16} color="#3b82f6" />
                  <Text style={[styles.addressTitle, isDarkMode && styles.darkText]}>
                    {orderType === 'return' ? 'Return Address' : 'Delivery Address'}
                  </Text>
                </View>
                
                <View style={styles.addressDetails}>
                  <Text style={[styles.addressLine, isDarkMode && styles.darkSubtext]}>
                    {order.shippingAddress?.street}
                  </Text>
                  <Text style={[styles.addressLine, isDarkMode && styles.darkSubtext]}>
                    {order.shippingAddress?.city}
                    {order.shippingAddress?.state && `, ${order.shippingAddress.state}`}
                    {order.shippingAddress?.postalCode && ` ${order.shippingAddress.postalCode}`}
                  </Text>
                  <Text style={[styles.addressLine, isDarkMode && styles.darkSubtext]}>
                    {order.shippingAddress?.country}
                  </Text>
                </View>
              </View>

              {/* Return Reason */}
              {orderType === 'return' && order.returnReason && (
                <View style={[styles.noteCard, styles.returnReasonCard]}>
                  <Text style={[styles.noteTitle, styles.returnReasonTitle]}>
                    Return Reason
                  </Text>
                  <Text style={styles.returnReasonText}>
                    {order.returnReason}
                  </Text>
                </View>
              )}

              {/* Transporter Notes */}
              {order.transporterNotes && (
                <View style={[styles.noteCard, styles.transporterNotesCard]}>
                  <Text style={[styles.noteTitle, styles.transporterNotesTitle]}>
                    Transporter Notes
                  </Text>
                  <Text style={styles.transporterNotesText}>
                    {order.transporterNotes}
                  </Text>
                </View>
              )}

              {/* Return Notes */}
              {orderType === 'return' && order.returnNotes && (
                <View style={[styles.noteCard, styles.returnNotesCard]}>
                  <Text style={[styles.noteTitle, styles.returnNotesTitle]}>
                    Return Notes
                  </Text>
                  <Text style={styles.returnNotesText}>
                    {order.returnNotes}
                  </Text>
                </View>
              )}

              {/* Order Notes */}
              {order.orderNotes && (
                <View style={[styles.noteCard, isDarkMode && styles.darkNoteCard]}>
                  <Text style={[styles.noteTitle, isDarkMode && styles.darkText]}>
                    Order Notes
                  </Text>
                  <Text style={[styles.noteText, isDarkMode && styles.darkSubtext]}>
                    {order.orderNotes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkHeader: {
    borderBottomColor: '#374151',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  darkText: {
    color: '#ffffff',
  },
  orderNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  darkSubtext: {
    color: '#9ca3af',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  statusSection: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkStatusSection: {
    backgroundColor: '#374151',
    borderBottomColor: '#4b5563',
  },
  typeStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deliveryTypeBadge: {
    backgroundColor: '#dbeafe',
  },
  returnTypeBadge: {
    backgroundColor: '#f3e8ff',
  },
  darkDeliveryTypeBadge: {
    backgroundColor: '#1e40af',
  },
  darkReturnTypeBadge: {
    backgroundColor: '#7e22ce',
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  deliveryTypeText: {
    color: '#1e40af',
  },
  returnTypeText: {
    color: '#7e22ce',
  },
  availableReturnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availableReturnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  dateInfo: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  imageSection: {
    padding: 16,
  },
  mainImageContainer: {
    position: 'relative',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  thumbnailsScroll: {
    marginHorizontal: -16,
  },
  thumbnailsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  actionsSection: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkActionsSection: {
    backgroundColor: '#374151',
    borderBottomColor: '#4b5563',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#16a34a',
  },
  declineButton: {
    backgroundColor: '#dc2626',
  },
  startButton: {
    backgroundColor: '#ea580c',
  },
  deliverButton: {
    backgroundColor: '#16a34a',
  },
  pickupButton: {
    backgroundColor: '#ea580c',
  },
  completeButton: {
    backgroundColor: '#16a34a',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
  },
  completedButton: {
    backgroundColor: '#f3f4f6',
  },
  completedText: {
    color: '#374151',
  },
  cancelledButton: {
    backgroundColor: '#fef2f2',
  },
  cancelledText: {
    color: '#991b1b',
  },
  contentGrid: {
    flexDirection: 'column',
    padding: 16,
    gap: 16,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  itemsList: {
    gap: 8,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkItemCard: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  itemPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  darkItemPlaceholder: {
    backgroundColor: '#374151',
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  itemMetaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkSummaryCard: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  contactCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  darkContactCard: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierIcon: {
    backgroundColor: '#dbeafe',
  },
  wholesalerIcon: {
    backgroundColor: '#dcfce7',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactDetails: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  addressDetails: {
    marginTop: 8,
    gap: 2,
  },
  addressLine: {
    fontSize: 14,
    color: '#6b7280',
  },
  noteCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  darkNoteCard: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  returnReasonCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  transporterNotesCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  returnNotesCard: {
    backgroundColor: '#f3e8ff',
    borderColor: '#c084fc',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  returnReasonTitle: {
    color: '#92400e',
  },
  transporterNotesTitle: {
    color: '#92400e',
  },
  returnNotesTitle: {
    color: '#7e22ce',
  },
  noteText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  returnReasonText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  transporterNotesText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  returnNotesText: {
    fontSize: 14,
    color: '#7e22ce',
    lineHeight: 20,
  },
});

export default OrderDetailsModal;