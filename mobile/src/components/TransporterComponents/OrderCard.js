// C:\Users\ham\Desktop\trade\mobile\src\components\TransporterComponents\OrderCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const OrderCard = ({
  order,
  orderType,
  isAvailableReturn = false,
  currentImage,
  currentIndex,
  images,
  onImageNavigate,
  onOpenDetails,
  onAcceptReturn,
  getStatusIcon,
  getStatusColor,
  getStatusText,
  formatDate,
  getSupplierName,
  getWholesalerName,
  getSupplierLocation,
  renderActionButtons,
  isDarkMode
}) => {
  const statusColor = getStatusColor(order.status);
  const statusIcon = getStatusIcon(order.status);

  return (
    <View style={[
      styles.container,
      isDarkMode && styles.darkContainer,
      isAvailableReturn && styles.availableReturnContainer
    ]}>
      
      {/* Available Return Badge */}
      {isAvailableReturn && (
        <View style={styles.availableReturnBadge}>
          <Ionicons name="warning" size={12} color="#ffffff" />
          <Text style={styles.availableReturnText}>AVAILABLE RETURN</Text>
        </View>
      )}

      {/* Image Section */}
      <View style={styles.imageContainer}>
        {currentImage ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: currentImage.url }}
              style={styles.image}
              resizeMode="cover"
            />
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonLeft]}
                  onPress={() => onImageNavigate(order._id, 'prev')}
                >
                  <Ionicons name="chevron-back" size={16} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonRight]}
                  onPress={() => onImageNavigate(order._id, 'next')}
                >
                  <Ionicons name="chevron-forward" size={16} color="#ffffff" />
                </TouchableOpacity>
              </>
            )}
            
            {/* Image Counter */}
            {images.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.placeholderImage, isDarkMode && styles.darkPlaceholderImage]}>
            <Ionicons name="cube-outline" size={24} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderNumber, isDarkMode && styles.darkText]} numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={12} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
              <Text style={[styles.date, isDarkMode && styles.darkSubtext]}>
                {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>
          
          <View style={styles.badges}>
            {/* Order Type Badge */}
            <View style={[
              styles.typeBadge,
              orderType === 'return' ? styles.returnBadge : styles.deliveryBadge,
              isDarkMode && (orderType === 'return' ? styles.darkReturnBadge : styles.darkDeliveryBadge)
            ]}>
              <Ionicons 
                name={orderType === 'return' ? 'return-up-back' : 'truck'} 
                size={12} 
                color={orderType === 'return' ? '#7e22ce' : '#1e40af'} 
              />
              <Text style={[
                styles.typeBadgeText,
                orderType === 'return' ? styles.returnBadgeText : styles.deliveryBadgeText
              ]}>
                {orderType === 'return' ? 'Return' : 'Delivery'}
              </Text>
            </View>
            
            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: statusColor.bg }
            ]}>
              <Ionicons name={statusIcon} size={12} color={statusColor.text} />
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Return Reason */}
        {orderType === 'return' && order.returnReason && (
          <View style={[
            styles.returnReasonContainer,
            isDarkMode && styles.darkReturnReasonContainer
          ]}>
            <Text style={[
              styles.returnReasonLabel,
              isDarkMode && styles.darkReturnReasonLabel
            ]}>
              Return Reason:
            </Text>
            <Text style={[
              styles.returnReasonText,
              isDarkMode && styles.darkReturnReasonText
            ]} numberOfLines={2}>
              {order.returnReason}
            </Text>
          </View>
        )}

        {/* Parties Information */}
        <View style={styles.partiesContainer}>
          {/* Supplier */}
          <View style={styles.partyRow}>
            <View style={[styles.partyIcon, styles.supplierIcon]}>
              <Ionicons name="business-outline" size={14} color="#3b82f6" />
            </View>
            <View style={styles.partyInfo}>
              <Text style={[styles.partyName, isDarkMode && styles.darkText]} numberOfLines={1}>
                {getSupplierName(order.supplier)}
              </Text>
              <Text style={[styles.partyRole, isDarkMode && styles.darkSubtext]}>
                Supplier
              </Text>
            </View>
          </View>

          {/* Wholesaler */}
          <View style={styles.partyRow}>
            <View style={[styles.partyIcon, styles.wholesalerIcon]}>
              <Ionicons name="storefront-outline" size={14} color="#16a34a" />
            </View>
            <View style={styles.partyInfo}>
              <Text style={[styles.partyName, isDarkMode && styles.darkText]} numberOfLines={1}>
                {getWholesalerName(order.wholesaler)}
              </Text>
              <Text style={[styles.partyRole, isDarkMode && styles.darkSubtext]} numberOfLines={1}>
                {getSupplierLocation(order.wholesaler)}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <View style={styles.itemsCount}>
              <Ionicons name="cube-outline" size={12} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
              <Text style={[styles.itemsCountText, isDarkMode && styles.darkSubtext]}>
                Items ({order.items?.length || 0})
              </Text>
            </View>
            <Text style={[styles.quantityText, isDarkMode && styles.darkSubtext]}>
              Qty: {order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
            </Text>
          </View>

          {/* Items List */}
          <View style={styles.itemsList}>
            {order.items?.slice(0, 2).map((item, index) => (
              <View key={index} style={[
                styles.itemRow,
                isDarkMode && styles.darkItemRow
              ]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, isDarkMode && styles.darkText]} numberOfLines={1}>
                    {item.product?.name || 'Product'}
                  </Text>
                  <Text style={[styles.itemSku, isDarkMode && styles.darkSubtext]}>
                    {item.product?.sku || 'N/A'}
                  </Text>
                </View>
                <View style={styles.itemPrice}>
                  <Text style={[styles.itemPriceText, isDarkMode && styles.darkText]}>
                    ${item.unitPrice || 0}
                  </Text>
                  <Text style={[styles.itemQuantity, isDarkMode && styles.darkSubtext]}>
                    ×{item.quantity || 0}
                  </Text>
                </View>
              </View>
            ))}
            
            {order.items?.length > 2 && (
              <View style={styles.moreItems}>
                <Text style={[styles.moreItemsText, isDarkMode && styles.darkSubtext]}>
                  +{order.items.length - 2} more
                </Text>
              </View>
            )}
          </View>

          {/* Total */}
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, isDarkMode && styles.darkText]}>
              Total
            </Text>
            <Text style={styles.totalAmount}>
              ${order.finalAmount?.toFixed(2) || order.totalAmount?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={[
        styles.actionsContainer,
        isAvailableReturn && styles.availableReturnActions
      ]}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.detailsButton,
              isDarkMode && styles.darkDetailsButton,
              isAvailableReturn && styles.availableReturnDetailsButton
            ]}
            onPress={() => onOpenDetails(order)}
          >
            <Ionicons 
              name="eye-outline" 
              size={14} 
              color={isAvailableReturn ? '#92400e' : (isDarkMode ? '#d1d5db' : '#374151')} 
            />
            <Text style={[
              styles.detailsButtonText,
              isDarkMode && styles.darkDetailsButtonText,
              isAvailableReturn && styles.availableReturnDetailsButtonText
            ]}>
              Details
            </Text>
          </TouchableOpacity>
          
          {isAvailableReturn ? (
            <TouchableOpacity
              style={styles.acceptReturnButton}
              onPress={() => onAcceptReturn(order._id)}
            >
              <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
              <Text style={styles.acceptReturnButtonText}>
                Accept
              </Text>
            </TouchableOpacity>
          ) : (
            renderActionButtons(order)
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  darkContainer: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  availableReturnContainer: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  availableReturnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableReturnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  imageContainer: {
    height: 120,
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkPlaceholderImage: {
    backgroundColor: '#374151',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -8 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageCounterText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
  content: {
    padding: 12,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  darkText: {
    color: '#ffffff',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  darkSubtext: {
    color: '#9ca3af',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deliveryBadge: {
    backgroundColor: '#dbeafe',
  },
  returnBadge: {
    backgroundColor: '#f3e8ff',
  },
  darkDeliveryBadge: {
    backgroundColor: '#1e40af',
  },
  darkReturnBadge: {
    backgroundColor: '#7e22ce',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  deliveryBadgeText: {
    color: '#1e40af',
  },
  returnBadgeText: {
    color: '#7e22ce',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
    textTransform: 'capitalize',
  },
  returnReasonContainer: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 8,
  },
  darkReturnReasonContainer: {
    backgroundColor: '#92400e',
    borderColor: '#d97706',
  },
  returnReasonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  darkReturnReasonLabel: {
    color: '#fef3c7',
  },
  returnReasonText: {
    fontSize: 10,
    color: '#92400e',
    lineHeight: 12,
  },
  darkReturnReasonText: {
    color: '#fef3c7',
  },
  partiesContainer: {
    marginBottom: 8,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  partyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  supplierIcon: {
    backgroundColor: '#dbeafe',
  },
  wholesalerIcon: {
    backgroundColor: '#dcfce7',
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 1,
  },
  partyRole: {
    fontSize: 10,
    color: '#6b7280',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemsCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsCountText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  quantityText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemsList: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  darkItemRow: {
    backgroundColor: '#374151',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 1,
  },
  itemSku: {
    fontSize: 10,
    color: '#6b7280',
  },
  itemPrice: {
    alignItems: 'flex-end',
  },
  itemPriceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 1,
  },
  itemQuantity: {
    fontSize: 10,
    color: '#6b7280',
  },
  moreItems: {
    alignItems: 'center',
    marginTop: 2,
  },
  moreItemsText: {
    fontSize: 10,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  actionsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  availableReturnActions: {
    backgroundColor: '#fef3c7',
    borderTopColor: '#fbbf24',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  darkDetailsButton: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  availableReturnDetailsButton: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  darkDetailsButtonText: {
    color: '#d1d5db',
  },
  availableReturnDetailsButtonText: {
    color: '#92400e',
  },
  acceptReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  acceptReturnButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 4,
  },
});

export default OrderCard;