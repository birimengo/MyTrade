import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const OrderForm = ({ product, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState(product.minOrderQuantity || 1);
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState('pending');

  // calculate total price (with bulk discount if applicable)
  useEffect(() => {
    let price = product.price * quantity;
    if (product.bulkDiscount && quantity >= product.bulkDiscount.minQuantity) {
      price = price * (1 - product.bulkDiscount.discountPercentage / 100);
    }
    setTotalPrice(price);
  }, [quantity, product]);

  // auto-detect coordinates
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lng: longitude });
          setLocationStatus('success');
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationStatus('error');
          setError('Could not detect your location. Please provide a valid delivery place.');
        }
      );
    } else {
      setLocationStatus('error');
      setError('Geolocation is not supported by this browser. Please provide a valid delivery place.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      setLoading(false);
      return;
    }

    if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
      setError(`Minimum order quantity is ${product.minOrderQuantity} ${product.measurementUnit}.`);
      setLoading(false);
      return;
    }

    if (!deliveryPlace && (!coordinates.lat || !coordinates.lng)) {
      setError('Please provide a delivery place or allow location access.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please log in.');
      }

      // normalize measurement unit for backend
      const normalizedUnit =
        product.measurementUnit === 'l' ? 'liters' : product.measurementUnit;

      const orderDetails = {
        product: product._id,
        quantity: parseInt(quantity, 10),
        unitPrice: product.price,
        totalPrice: totalPrice,
        measurementUnit: normalizedUnit,
        deliveryPlace,
        deliveryCoordinates: coordinates,
        orderNotes: orderNotes || '',
        paymentMethod: 'cash_on_delivery',
      };

      const response = await fetch('http://localhost:5000/api/retailer-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderDetails),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order.');
      }

      const data = await response.json();
      console.log('Order placed successfully:', data);

      onSubmit(data.order);
      onClose();
    } catch (apiError) {
      console.error('API Error:', apiError);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-start sm:items-center z-50 p-3">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Order {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Product details */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Product
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {product.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Price: UGX {product.price.toLocaleString()} per{' '}
              {product.measurementUnit}
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label
              htmlFor="quantity"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Quantity ({product.measurementUnit})
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={product.minOrderQuantity || 1}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
              required
            />
            {product.minOrderQuantity && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum order: {product.minOrderQuantity}{' '}
                {product.measurementUnit}
              </p>
            )}
            {product.bulkDiscount &&
              quantity >= product.bulkDiscount.minQuantity && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Bulk discount: {product.bulkDiscount.discountPercentage}% off!
                </p>
              )}
          </div>

          {/* Delivery Place */}
          <div className="relative">
            <label
              htmlFor="deliveryPlace"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Delivery Place *
            </label>
            <input
              type="text"
              id="deliveryPlace"
              name="deliveryPlace"
              value={deliveryPlace}
              onChange={(e) => setDeliveryPlace(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
              placeholder="Enter your delivery address..."
              required
            />
          </div>

          {/* Order Notes */}
          <div>
            <label
              htmlFor="orderNotes"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Order Notes (Optional)
            </label>
            <textarea
              id="orderNotes"
              name="orderNotes"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2"
              placeholder="Any special instructions for delivery..."
            />
          </div>

          {/* Coordinates */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Detected Coordinates
            </label>
            {locationStatus === 'pending' && (
              <p className="text-xs text-blue-500">Detecting your location...</p>
            )}
            {locationStatus === 'success' && (
              <p className="text-xs text-green-500">
                Location detected automatically.
              </p>
            )}
            {locationStatus === 'error' && (
              <p className="text-xs text-yellow-500">
                Location detection failed. Please enter address manually.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="text"
                name="latitude"
                value={coordinates.lat || ''}
                readOnly
                className="block w-full rounded border-gray-300 shadow-sm text-xs text-gray-500 bg-gray-100 cursor-not-allowed p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                placeholder="Latitude"
              />
              <input
                type="text"
                name="longitude"
                value={coordinates.lng || ''}
                readOnly
                className="block w-full rounded border-gray-300 shadow-sm text-xs text-gray-500 bg-gray-100 cursor-not-allowed p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                placeholder="Longitude"
              />
            </div>
            {(coordinates.lat || coordinates.lng) && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Coordinates detected for delivery tracking.
              </p>
            )}
          </div>

          {/* Total Price */}
          <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-base font-bold text-gray-800 dark:text-gray-200">
              Total Price:
            </span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              UGX {totalPrice.toLocaleString()}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

OrderForm.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    quantity: PropTypes.number,
    measurementUnit: PropTypes.string.isRequired,
    minOrderQuantity: PropTypes.number,
    bulkDiscount: PropTypes.shape({
      minQuantity: PropTypes.number,
      discountPercentage: PropTypes.number,
    }),
    wholesaler: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default OrderForm;