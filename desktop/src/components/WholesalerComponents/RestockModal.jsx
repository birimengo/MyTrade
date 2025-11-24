// components/WholesalerComponents/RestockModal.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaTimes, 
  FaPlusCircle, 
  FaDollarSign, 
  FaBox, 
  FaInfoCircle,
  FaChartLine
} from 'react-icons/fa';

const RestockModal = ({ product, isOpen, onClose, onRestock }) => {
  const { getAuthHeaders, API_BASE_URL } = useAuth();
  const [formData, setFormData] = useState({
    quantityToAdd: '',
    newPrice: '',
    newMinOrderQuantity: '',
    costPrice: '',
    reason: 'Restock',
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculations, setCalculations] = useState(null);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        quantityToAdd: '',
        newPrice: product.price,
        newMinOrderQuantity: product.minOrderQuantity,
        costPrice: product.costPrice || '',
        reason: 'Restock',
        note: ''
      });
      setError('');
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (formData.quantityToAdd && formData.costPrice) {
      const quantity = parseInt(formData.quantityToAdd) || 0;
      const cost = parseFloat(formData.costPrice) || 0;
      const investment = quantity * cost;
      
      setCalculations({
        investment,
        newTotalQuantity: (product?.quantity || 0) + quantity,
        newTotalValue: ((product?.quantity || 0) + quantity) * cost
      });
    } else {
      setCalculations(null);
    }
  }, [formData.quantityToAdd, formData.costPrice, product]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.quantityToAdd || formData.quantityToAdd <= 0) {
        throw new Error('Please enter a valid quantity to add');
      }

      const response = await fetch(`${API_BASE_URL}/api/products/${product._id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onRestock(data.product);
        onClose();
      } else {
        throw new Error(data.message || 'Failed to restock product');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <FaPlusCircle className="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Restock Product
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Current Product Info */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <FaInfoCircle className="text-blue-500" />
            <span>Current Stock Info</span>
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Current Quantity:</span>
              <p className="font-semibold text-gray-900 dark:text-white">{product.quantity} {product.measurementUnit}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
              <p className="font-semibold text-green-600 dark:text-green-400">UGX {product.price?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Min Order Qty:</span>
              <p className="font-semibold text-gray-900 dark:text-white">{product.minOrderQuantity}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Cost Price:</span>
              <p className="font-semibold text-gray-900 dark:text-white">UGX {product.costPrice?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Quantity to Add */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
              <FaBox className="text-gray-400" />
              <span>Quantity to Add *</span>
            </label>
            <input
              type="number"
              name="quantityToAdd"
              value={formData.quantityToAdd}
              onChange={handleInputChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter quantity to add"
            />
          </div>

          {/* New Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
              <FaDollarSign className="text-gray-400" />
              <span>New Selling Price (UGX)</span>
            </label>
            <input
              type="number"
              name="newPrice"
              value={formData.newPrice}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Leave empty to keep current price"
            />
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cost Price (UGX) *
            </label>
            <input
              type="number"
              name="costPrice"
              value={formData.costPrice}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Cost per unit"
            />
          </div>

          {/* Min Order Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Order Quantity
            </label>
            <input
              type="number"
              name="newMinOrderQuantity"
              value={formData.newMinOrderQuantity}
              onChange={handleInputChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Minimum order quantity"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Restock
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="Restock">Regular Restock</option>
              <option value="Seasonal Demand">Seasonal Demand</option>
              <option value="Price Adjustment">Price Adjustment</option>
              <option value="Supplier Order">Supplier Order</option>
              <option value="Inventory Correction">Inventory Correction</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              placeholder="Any additional information about this restock..."
            />
          </div>

          {/* Calculations Preview */}
          {calculations && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center space-x-2">
                <FaChartLine className="text-green-600" />
                <span>Restock Preview</span>
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Investment for this restock:</span>
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    UGX {calculations.investment.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">New total quantity:</span>
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    {calculations.newTotalQuantity} {product.measurementUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">New total stock value:</span>
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    UGX {calculations.newTotalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-lg disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaPlusCircle className="w-4 h-4" />
                  <span>Confirm Restock</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 dark:disabled:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockModal;