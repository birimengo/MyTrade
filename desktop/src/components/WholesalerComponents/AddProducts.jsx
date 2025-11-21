// components/WholesalerComponents/AddProducts.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaSave, 
  FaTimes, 
  FaUpload, 
  FaTag, 
  FaBox,
  FaDollarSign,
  FaWeight,
  FaList,
  FaInfoCircle,
  FaExclamationTriangle,
  FaExpand,
  FaChevronLeft,
  FaChevronRight,
  FaChartLine,
  FaPercentage
} from 'react-icons/fa';

const AddProducts = ({ 
  formData: propFormData, 
  setFormData: propSetFormData, 
  handleSubmit: propHandleSubmit, 
  handleInputChange: propHandleInputChange, 
  categories = [], 
  editingProduct = null, 
  cancelForm,
  isElectron = false,
  isOnline = true
}) => {
  const { user } = useAuth();
  const [imagePreviews, setImagePreviews] = useState([]);
  const [localFormData, setLocalFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  // Initialize form data
  useEffect(() => {
    const initialFormData = {
      name: '',
      category: '',
      price: '',
      costPrice: '', // ADDED: Cost price field
      quantity: '',
      measurementUnit: 'units',
      minOrderQuantity: 1,
      description: '',
      images: [],
      bulkDiscount: false,
      discountPercentage: 0,
      tags: '',
      ...propFormData
    };
    
    if (!propFormData && !localFormData) {
      setLocalFormData(initialFormData);
    }
  }, [editingProduct, propFormData]);

  // Use local state if parent state management fails
  const effectiveFormData = propFormData || localFormData;
  const effectiveSetFormData = propSetFormData || setLocalFormData;

  // Calculate profit metrics
  const calculateProfitMetrics = () => {
    if (!effectiveFormData?.price || !effectiveFormData?.costPrice) {
      return null;
    }

    const sellingPrice = parseFloat(effectiveFormData.price) || 0;
    const costPrice = parseFloat(effectiveFormData.costPrice) || 0;
    const quantity = parseFloat(effectiveFormData.quantity) || 0;

    if (costPrice >= sellingPrice) {
      return {
        profitPerUnit: 0,
        profitMargin: 0,
        totalProfitPotential: 0,
        hasProfit: false
      };
    }

    const profitPerUnit = sellingPrice - costPrice;
    const profitMargin = (profitPerUnit / costPrice) * 100;
    const totalProfitPotential = profitPerUnit * quantity;

    return {
      profitPerUnit,
      profitMargin,
      totalProfitPotential,
      hasProfit: true
    };
  };

  const profitMetrics = calculateProfitMetrics();

  // Enhanced input change handler
  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    let processedValue = value;

    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'file') {
      handleImageChange(files); // Handle images separately
      return;
    } else if (type === 'number') {
      processedValue = value === '' ? '' : parseFloat(value);
    }

    // Use parent handler if available, otherwise use local
    if (propHandleInputChange) {
      propHandleInputChange(e);
    } else {
      effectiveSetFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  // Enhanced image handling
  const handleImageChange = (files) => {
    const fileList = Array.from(files);
    
    console.log('Files selected:', fileList.length);
    
    // Validate file count
    if (fileList.length + imagePreviews.length > 5) {
      setErrors(prev => ({
        ...prev,
        images: 'Maximum 5 images allowed'
      }));
      return;
    }

    // Validate file types and sizes
    const validFiles = fileList.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      
      if (!isValidType) {
        setErrors(prev => ({
          ...prev,
          images: 'Only image files are allowed'
        }));
        return false;
      }
      
      if (!isValidSize) {
        setErrors(prev => ({
          ...prev,
          images: 'File size must be less than 5MB'
        }));
        return false;
      }
      
      return true;
    });

    console.log('Valid files:', validFiles.length);

    if (validFiles.length === 0) {
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    console.log('New previews created:', newPreviews.length);
    
    setImagePreviews(prev => {
      const updatedPreviews = [...prev, ...newPreviews];
      console.log('Total previews now:', updatedPreviews.length);
      return updatedPreviews;
    });

    // Update form data with the actual File objects
    const currentImages = effectiveFormData?.images || [];
    effectiveSetFormData(prev => ({
      ...prev,
      images: [...currentImages, ...validFiles]
    }));

    // Clear any previous image errors
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageChange(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImagePreview = (index) => {
    console.log('Removing image at index:', index);
    
    // Revoke the object URL to prevent memory leaks
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    
    // Update form data
    const newFiles = (effectiveFormData?.images || []).filter((_, i) => i !== index);
    effectiveSetFormData(prev => ({
      ...prev,
      images: newFiles
    }));

    // Reset selected image if it was removed
    if (selectedImageIndex === index) {
      setSelectedImageIndex(null);
    } else if (selectedImageIndex > index) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const openImageModal = (index) => {
    console.log('Opening image modal for index:', index, 'Preview URL:', imagePreviews[index]);
    setSelectedImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction) => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(prev => 
        prev === 0 ? imagePreviews.length - 1 : prev - 1
      );
    } else {
      setSelectedImageIndex(prev => 
        prev === imagePreviews.length - 1 ? 0 : prev + 1
      );
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedImageIndex === null) return;
      
      if (e.key === 'Escape') {
        closeImageModal();
      } else if (e.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateImage('next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, []);

  // Enhanced form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validate form
    const validationErrors = validateForm(effectiveFormData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (propHandleSubmit) {
        await propHandleSubmit(e);
      } else {
        // Fallback local submission
        console.log('Form submitted locally:', effectiveFormData);
        console.log('Images to upload:', effectiveFormData.images);
        // Add your local submission logic here
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to submit form. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form validation
  const validateForm = (data) => {
    const errors = {};

    if (!data.name?.trim()) {
      errors.name = 'Product name is required';
    }

    if (!data.category?.trim()) {
      errors.category = 'Category is required';
    }

    if (!data.price || data.price <= 0) {
      errors.price = 'Valid selling price is required';
    }

    // ADDED: Cost price validation
    if (!data.costPrice || data.costPrice <= 0) {
      errors.costPrice = 'Valid cost price is required';
    }

    // ADDED: Validate cost price is less than selling price
    if (data.costPrice && data.price && parseFloat(data.costPrice) >= parseFloat(data.price)) {
      errors.costPrice = 'Cost price must be less than selling price';
    }

    if (!data.quantity || data.quantity < 0) {
      errors.quantity = 'Valid quantity is required';
    }

    if (!data.description?.trim()) {
      errors.description = 'Description is required';
    }

    if (data.bulkDiscount && (!data.discountPercentage || data.discountPercentage < 0 || data.discountPercentage > 100)) {
      errors.discountPercentage = 'Valid discount percentage (0-100) is required';
    }

    return errors;
  };

  const measurementUnits = [
    { value: 'units', label: 'Units', icon: '📦' },
    { value: 'kg', label: 'Kilograms', icon: '⚖️' },
    { value: 'g', label: 'Grams', icon: '⚖️' },
    { value: 'l', label: 'Liters', icon: '💧' },
    { value: 'ml', label: 'Milliliters', icon: '💧' },
    { value: 'pack', label: 'Packs', icon: '📦' },
    { value: 'box', label: 'Boxes', icon: '📦' },
    { value: 'carton', label: 'Cartons', icon: '📦' },
    { value: 'dozen', label: 'Dozens', icon: '🥚' }
  ];

  // Show loading state if form data isn't ready
  if (!effectiveFormData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6 max-h-[800px] overflow-y-auto">
      {/* Desktop Mode Info */}
      {isElectron && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <FaInfoCircle className="text-blue-600 dark:text-blue-400 text-lg" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Desktop Product Management
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {isOnline 
                  ? 'Your product data will be synced with the server automatically.' 
                  : 'Working offline - product data will be cached and synced when connection is restored.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submission Error */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-3">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-lg" />
            <span className="text-sm text-red-700 dark:text-red-300">{errors.submit}</span>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
          <FaBox className="text-blue-600 dark:text-blue-400 text-xl" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            {editingProduct ? 'Edit Product' : 'Create New Product'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {editingProduct 
              ? `Update details for "${editingProduct.name}"`
              : 'Add a new product to your catalog'
            }
          </p>
        </div>
      </div>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <FaInfoCircle className="text-blue-600" />
            <span>Basic Information</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FaTag className="text-gray-400" />
                <span>Product Name *</span>
              </label>
              <input
                type="text"
                name="name"
                value={effectiveFormData.name}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.name 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FaList className="text-gray-400" />
                <span>Category *</span>
              </label>
              <input
                type="text"
                name="category"
                value={effectiveFormData.category}
                onChange={handleInputChange}
                list="categories"
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.category 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Select or enter category"
              />
              <datalist id="categories">
                {categories.map((cat, index) => (
                  <option key={index} value={cat} />
                ))}
              </datalist>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FaDollarSign className="text-gray-400" />
                <span>Selling Price (UGX) *</span>
              </label>
              <input
                type="number"
                name="price"
                value={effectiveFormData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.price 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
              )}
            </div>

            {/* Cost Price - ADDED */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FaDollarSign className="text-gray-400" />
                <span>Cost Price (UGX) *</span>
              </label>
              <input
                type="number"
                name="costPrice"
                value={effectiveFormData.costPrice}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.costPrice 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0.00"
              />
              {errors.costPrice && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.costPrice}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                What you paid for this product
              </p>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity in Stock *
              </label>
              <input
                type="number"
                name="quantity"
                value={effectiveFormData.quantity}
                onChange={handleInputChange}
                required
                min="0"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.quantity 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0"
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
              )}
            </div>

            {/* Measurement Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FaWeight className="text-gray-400" />
                <span>Measurement Unit *</span>
              </label>
              <select
                name="measurementUnit"
                value={effectiveFormData.measurementUnit}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
              >
                {measurementUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.icon} {unit.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Order Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Order Quantity
              </label>
              <input
                type="number"
                name="minOrderQuantity"
                value={effectiveFormData.minOrderQuantity}
                onChange={handleInputChange}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                placeholder="1"
              />
            </div>
          </div>

          {/* Profit Analysis - ADDED */}
          {profitMetrics && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h5 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center space-x-2">
                <FaChartLine className="text-green-600" />
                <span>Profit Analysis</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-green-600 dark:text-green-400 font-semibold">
                    UGX {profitMetrics.profitPerUnit.toFixed(2)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    Profit per Unit
                  </div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="text-blue-600 dark:text-blue-400 font-semibold">
                    {profitMetrics.profitMargin.toFixed(2)}%
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    Profit Margin
                  </div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="text-purple-600 dark:text-purple-400 font-semibold">
                    UGX {profitMetrics.totalProfitPotential.toFixed(2)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    Total Profit Potential
                  </div>
                </div>
              </div>
              {!profitMetrics.hasProfit && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">
                    ⚠️ Cost price should be less than selling price to make a profit
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Description *
            </label>
            <textarea
              name="description"
              value={effectiveFormData.description}
              onChange={handleInputChange}
              required
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                errors.description 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Describe your product in detail..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <FaUpload className="text-blue-600" />
            <span>Product Images</span>
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Upload Product Images
            </label>
            <div 
              className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center transition-colors duration-200 hover:border-blue-400 dark:hover:border-blue-500"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <FaUpload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <input
                type="file"
                name="images"
                onChange={(e) => handleImageChange(e.target.files)}
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={imagePreviews.length >= 5}
              />
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF up to 5MB each (Max 5 images)
                </p>
                {imagePreviews.length >= 5 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Maximum 5 images reached
                  </p>
                )}
              </div>
            </div>
            
            {errors.images && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.images}</p>
            )}
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Selected Images ({imagePreviews.length}/5)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-blue-400"
                        onClick={() => openImageModal(index)}
                        onError={(e) => {
                          console.error('Image failed to load:', preview);
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImagePreview(index);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 z-10"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openImageModal(index);
                        }}
                        className="absolute -top-2 -left-2 bg-blue-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-600 z-10"
                      >
                        <FaExpand className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Click on images to preview, click the × to remove
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Settings Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Additional Settings
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bulk Discount Toggle */}
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <input
                type="checkbox"
                name="bulkDiscount"
                checked={effectiveFormData.bulkDiscount}
                onChange={handleInputChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                id="bulkDiscount"
              />
              <label htmlFor="bulkDiscount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Offer bulk discount
              </label>
            </div>

            {/* Discount Percentage */}
            {effectiveFormData.bulkDiscount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                  <FaPercentage className="text-gray-400" />
                  <span>Discount Percentage *</span>
                </label>
                <input
                  type="number"
                  name="discountPercentage"
                  value={effectiveFormData.discountPercentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                    errors.discountPercentage 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0-100%"
                />
                {errors.discountPercentage && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.discountPercentage}</p>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={effectiveFormData.tags}
                onChange={handleInputChange}
                placeholder="e.g., organic, fresh, local, premium"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add tags to help customers find your product
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 hover:shadow-lg disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FaSave className="w-4 h-4" />
                <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={cancelForm}
            disabled={isSubmitting}
            className="border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 dark:disabled:bg-gray-800"
          >
            <FaTimes className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full max-h-full">
            {/* Close button */}
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10 p-2"
            >
              <FaTimes className="w-6 h-6" />
            </button>
            
            {/* Image container */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img
                src={imagePreviews[selectedImageIndex]}
                alt={`Preview ${selectedImageIndex + 1}`}
                className="w-full max-h-[80vh] object-contain mx-auto"
                onError={(e) => {
                  console.error('Modal image failed to load:', imagePreviews[selectedImageIndex]);
                  e.target.alt = 'Failed to load image';
                }}
              />
              
              {/* Navigation arrows */}
              {imagePreviews.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImage('prev')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm"
                  >
                    <FaChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigateImage('next')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm"
                  >
                    <FaChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            
            {/* Image counter */}
            <div className="text-white text-center mt-4 text-lg">
              {selectedImageIndex + 1} / {imagePreviews.length}
            </div>

            {/* Keyboard hint */}
            <div className="text-gray-400 text-center mt-2 text-sm">
              Use ← → arrows to navigate, ESC to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProducts;