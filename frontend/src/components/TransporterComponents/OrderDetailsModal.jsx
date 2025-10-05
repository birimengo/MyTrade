// components/TransporterComponents/OrderDetailsModal.jsx
import React, { useState } from 'react';
import { 
  FaBox, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTruck,
  FaUndo,
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa';

const OrderDetailsModal = ({ 
  order, 
  onClose, 
  getStatusIcon, 
  getStatusColor, 
  formatDate, 
  updateOrderStatus,
  getOrderType,
  acceptReturnOrder,
  availableReturnOrders
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getAllProductImages = (order) => {
    const images = [];
    order.items.forEach(item => {
      if (item.product?.images) {
        images.push(...item.product.images);
      }
    });
    return images;
  };

  const images = getAllProductImages(order);

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

  const orderType = getOrderType(order);
  const isAvailableReturn = availableReturnOrders?.some(ro => ro._id === order._id);

  const renderStatusActions = () => {
    if (orderType === 'delivery') {
      return (
        <div className="flex flex-wrap gap-2">
          {order.status === 'assigned_to_transporter' && (
            <>
              <button 
                onClick={() => updateOrderStatus(order._id, 'accepted_by_transporter')}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Accept Order
              </button>
              <button 
                onClick={() => updateOrderStatus(order._id, 'cancelled', 'Transporter declined the assignment')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Decline
              </button>
            </>
          )}
          
          {order.status === 'accepted_by_transporter' && (
            <>
              <button 
                onClick={() => updateOrderStatus(order._id, 'in_transit')}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Start Delivery
              </button>
              <button 
                onClick={() => updateOrderStatus(order._id, 'cancelled', 'Delivery cancelled by transporter')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Delivery
              </button>
            </>
          )}
          
          {order.status === 'in_transit' && (
            <>
              <button 
                onClick={() => updateOrderStatus(order._id, 'delivered')}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark as Delivered
              </button>
              <button 
                onClick={() => updateOrderStatus(order._id, 'cancelled', 'Delivery cancelled by transporter')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Delivery
              </button>
            </>
          )}

          {order.status === 'delivered' && (
            <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-lg">
              Delivery Completed
            </span>
          )}
        </div>
      );
    } else if (orderType === 'return') {
      return (
        <div className="flex flex-wrap gap-2">
          {order.status === 'return_requested' && !order.returnTransporter && (
            <button 
              onClick={() => acceptReturnOrder(order._id)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Accept Return Order
            </button>
          )}
          
          {order.status === 'return_requested' && order.returnTransporter && (
            <button 
              onClick={() => updateOrderStatus(order._id, 'return_accepted')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Return Process
            </button>
          )}
          
          {order.status === 'return_accepted' && (
            <>
              <button 
                onClick={() => updateOrderStatus(order._id, 'return_in_transit')}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Pickup Return
              </button>
              <button 
                onClick={() => updateOrderStatus(order._id, 'cancelled', 'Return cancelled by transporter')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Return
              </button>
            </>
          )}
          
          {order.status === 'return_in_transit' && (
            <>
              <button 
                onClick={() => updateOrderStatus(order._id, 'returned_to_supplier')}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Complete Return
              </button>
              <button 
                onClick={() => updateOrderStatus(order._id, 'cancelled', 'Return cancelled by transporter')}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Return
              </button>
            </>
          )}

          {order.status === 'returned_to_supplier' && (
            <span className="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-lg">
              Return Completed
            </span>
          )}
        </div>
      );
    }

    if (order.status === 'cancelled') {
      return (
        <span className="px-4 py-2 bg-red-100 text-red-800 text-sm font-medium rounded-lg">
          Order Cancelled
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Order Details - {order.orderNumber}
              </h3>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  orderType === 'return' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {orderType === 'return' ? <FaUndo className="mr-1.5" /> : <FaTruck className="mr-1.5" />}
                  {orderType === 'return' ? 'Return Order' : 'Delivery Order'}
                </span>
                {isAvailableReturn && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                    <FaExclamationTriangle className="mr-1.5" />
                    Available for Acceptance
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Large Image Display */}
          {images.length > 0 && (
            <div className="mb-6">
              <div className="relative h-64 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={images[currentImageIndex]?.url}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateImage('prev')}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-all"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigateImage('next')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-all"
                    >
                      <FaChevronRight className="w-4 h-4" />
                    </button>
                    
                    <div className="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="flex space-x-3 mt-3 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-blue-500 shadow-md' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order Status and Actions */}
          <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2 capitalize">{order.status.replace(/_/g, ' ')}</span>
              </span>
              <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                Ordered on {formatDate(order.createdAt)}
              </span>
              {order.transporterAssignedAt && (
                <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                  Assigned on {formatDate(order.transporterAssignedAt)}
                </span>
              )}
              {order.returnRequestedAt && (
                <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                  Return requested on {formatDate(order.returnRequestedAt)}
                </span>
              )}
            </div>
            
            {/* Status Action Buttons */}
            <div className="flex space-x-3">
              {renderStatusActions()}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Order Items */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Order Items</h4>
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const product = item.product;
                  const imageUrl = product?.images?.[0]?.url;
                  
                  return (
                    <div key={index} className="flex items-center p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-sm transition-all">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product?.name}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                          <FaBox className="text-gray-400 text-xl" />
                        </div>
                      )}
                      <div className="ml-4 flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm">{product?.name}</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{product?.description}</p>
                        <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Qty: {item.quantity}</span>
                          <span>Price: ${item.unitPrice}</span>
                          {product?.measurementUnit && (
                            <span className="capitalize">{product.measurementUnit}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">${order.totalAmount?.toFixed(2)}</span>
                  </div>
                  {order.discounts > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="text-red-600 dark:text-red-400">-${order.discounts.toFixed(2)}</span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                      <span className="text-gray-900 dark:text-white">${order.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      ${order.finalAmount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Supplier, Wholesaler and Shipping Info */}
            <div>
              {/* Supplier Information */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Supplier Information</h4>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <FaUser className="text-blue-600 dark:text-blue-300 text-lg" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {getSupplierName(order.supplier)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Supplier
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {order.supplier?.email && (
                      <div className="flex items-center">
                        <FaEnvelope className="text-gray-400 mr-3" />
                        <span className="text-gray-600 dark:text-gray-400">{order.supplier.email}</span>
                      </div>
                    )}
                    {order.supplier?.phone && (
                      <div className="flex items-center">
                        <FaPhone className="text-gray-400 mr-3" />
                        <span className="text-gray-600 dark:text-gray-400">{order.supplier.phone}</span>
                      </div>
                    )}
                    {(order.supplier?.city || order.supplier?.country) && (
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="text-gray-400 mr-3" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {[order.supplier.city, order.supplier.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Wholesaler Information */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">
                  {orderType === 'return' ? 'Return From (Wholesaler)' : 'Delivery To (Wholesaler)'}
                </h4>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <FaUser className="text-green-600 dark:text-green-300 text-lg" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {getWholesalerName(order.wholesaler)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Wholesaler
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {order.wholesaler?.email && (
                      <div className="flex items-center">
                        <FaEnvelope className="text-gray-400 mr-3" />
                        <span className="text-gray-600 dark:text-gray-400">{order.wholesaler.email}</span>
                      </div>
                    )}
                    {order.wholesaler?.phone && (
                      <div className="flex items-center">
                        <FaPhone className="text-gray-400 mr-3" />
                        <span className="text-gray-600 dark:text-gray-400">{order.wholesaler.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">
                  {orderType === 'return' ? 'Return To Address' : 'Shipping Address'}
                </h4>
                <div className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center mb-3">
                    <FaMapMarkerAlt className="text-blue-500 text-lg" />
                    <span className="ml-2 font-medium text-gray-900 dark:text-white text-sm">
                      {orderType === 'return' ? 'Return Address' : 'Delivery Address'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>{order.shippingAddress?.street}</p>
                    <p>
                      {order.shippingAddress?.city}
                      {order.shippingAddress?.state && `, ${order.shippingAddress.state}`}
                      {order.shippingAddress?.postalCode && ` ${order.shippingAddress.postalCode}`}
                    </p>
                    <p>{order.shippingAddress?.country}</p>
                  </div>
                </div>
              </div>

              {/* Return Reason (for return orders) */}
              {orderType === 'return' && order.returnReason && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Return Reason</h4>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">{order.returnReason}</p>
                  </div>
                </div>
              )}

              {/* Transporter Notes */}
              {order.transporterNotes && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Transporter Notes</h4>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{order.transporterNotes}</p>
                  </div>
                </div>
              )}

              {/* Return Notes */}
              {orderType === 'return' && order.returnNotes && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Return Notes</h4>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-200">{order.returnNotes}</p>
                  </div>
                </div>
              )}

              {/* Order Notes */}
              {order.orderNotes && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">Order Notes</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{order.orderNotes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;