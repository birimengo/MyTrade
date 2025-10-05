// components/TransporterComponents/OrderCard.jsx
import React from 'react';
import { 
  FaBox, 
  FaUser, 
  FaEye, 
  FaChevronLeft, 
  FaChevronRight,
  FaTruck,
  FaCheckCircle,
  FaRoad,
  FaHome,
  FaUndo,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaDollarSign
} from 'react-icons/fa';

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
  onUpdateStatus,
  getOrderTypeBadge,
  getStatusIcon,
  getStatusColor,
  formatDate,
  getSupplierName,
  getWholesalerName,
  getSupplierLocation,
  getAllProductImages,
  renderActionButtons
}) => {
  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 overflow-hidden h-auto min-h-[380px] flex flex-col ${
      isAvailableReturn ? 'border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20' : ''
    }`}>
      
      {/* Available Return Badge */}
      {isAvailableReturn && (
        <div className="bg-amber-500 text-white text-xs font-bold py-1 px-2 text-center">
          <FaExclamationTriangle className="inline mr-1" />
          AVAILABLE RETURN
        </div>
      )}

      {/* Image Section */}
      <div className="relative h-28 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        {currentImage ? (
          <>
            <img
              src={currentImage.url}
              alt="Product"
              className="w-full h-full object-cover"
            />
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageNavigate(order._id, 'prev');
                  }}
                  className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-90 transition-all shadow"
                >
                  <FaChevronLeft className="w-2 h-2" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageNavigate(order._id, 'next');
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-1 rounded-full hover:bg-opacity-90 transition-all shadow"
                >
                  <FaChevronRight className="w-2 h-2" />
                </button>
              </>
            )}
            
            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1.5 py-0.5 rounded-full text-xs">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700">
            <FaBox className="text-gray-400 dark:text-gray-500 text-xl" />
          </div>
        )}
      </div>

      {/* Order Content */}
      <div className="flex-1 p-3 flex flex-col">
        {/* Order Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {order.orderNumber}
            </h3>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <FaCalendarAlt className="mr-1 w-3 h-3" />
              {formatDate(order.createdAt)}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1 ml-2">
            {getOrderTypeBadge(order)}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="ml-1 capitalize">
                {order.status.replace(/_/g, ' ')}
              </span>
            </span>
          </div>
        </div>
        
        {/* Return Reason for return orders */}
        {orderType === 'return' && order.returnReason && (
          <div className="mb-2 p-2 bg-amber-100 dark:bg-amber-800/30 rounded border border-amber-200 dark:border-amber-700">
            <p className="text-amber-700 dark:text-amber-300 font-medium text-xs mb-0.5">Return Reason:</p>
            <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed line-clamp-2">
              {order.returnReason}
            </p>
          </div>
        )}

        {/* Parties Information */}
        <div className="space-y-2 mb-3">
          {/* Supplier Info */}
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <FaUser className="text-blue-600 dark:text-blue-300 text-xs" />
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {getSupplierName(order.supplier)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                <FaMapMarkerAlt className="mr-0.5 w-3 h-3" />
                Supplier
              </p>
            </div>
          </div>

          {/* Wholesaler Info */}
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
              <FaUser className="text-green-600 dark:text-green-300 text-xs" />
            </div>
            <div className="ml-2 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {getWholesalerName(order.wholesaler)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                <FaMapMarkerAlt className="mr-0.5 w-3 h-3" />
                <span className="truncate">{getSupplierLocation(order.wholesaler)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Order Items Summary */}
        <div className="mb-2 flex-1 overflow-hidden">
          <div className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300 mb-1.5">
            <span className="font-medium flex items-center">
              <FaBox className="mr-1 text-gray-400 w-3 h-3" />
              Items ({order.items.length})
            </span>
            <span className="font-medium">
              Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          <div className="space-y-1.5 max-h-16 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700">
            {order.items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded px-1.5 py-1">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-900 dark:text-white font-medium truncate block">
                    {item.product?.name || 'Product'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.product?.sku || 'N/A'}
                  </span>
                </div>
                <div className="text-right ml-1">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                    ${item.unitPrice}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ×{item.quantity}
                  </span>
                </div>
              </div>
            ))}
            {order.items.length > 3 && (
              <div className="text-center pt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  +{order.items.length - 3} more
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Order Total */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center">
            <FaDollarSign className="mr-0.5 text-green-500 w-3 h-3" />
            Total
          </span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            ${order.finalAmount?.toFixed(2) || order.totalAmount?.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions Section */}
      <div className={`p-3 border-t ${
        isAvailableReturn 
          ? 'border-amber-200 dark:border-amber-700 bg-amber-100 dark:bg-amber-800/30' 
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
      }`}>
        <div className="flex flex-col sm:flex-row gap-1.5">
          <button
            onClick={() => onOpenDetails(order)}
            className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex-1 ${
              isAvailableReturn
                ? 'border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-800/40'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <FaEye className="mr-1.5 w-3 h-3" />
            Details
          </button>
          
          {isAvailableReturn ? (
            <button 
              onClick={() => onAcceptReturn(order._id)}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-all duration-200 flex-1 flex items-center justify-center"
            >
              <FaCheckCircle className="mr-1.5 w-3 h-3" />
              Accept
            </button>
          ) : (
            <div className="flex-1">
              {renderActionButtons(order)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;