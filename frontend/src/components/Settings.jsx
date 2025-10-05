// Settings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FaUser, 
  FaSave, 
  FaUndo, 
  FaEye, 
  FaEyeSlash, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaInfoCircle,
  FaBuilding,
  FaTruck,
  FaStore
} from 'react-icons/fa';

const Settings = () => {
  const { user, updateUser, getAuthHeaders, API_BASE_URL } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    productCategory: '',
    plateNumber: '',
    companyType: '',
    companyName: '',
    vehicleType: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', details: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data from user context
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        businessName: user.businessName || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        taxId: user.taxId || '',
        productCategory: user.productCategory || '',
        plateNumber: user.plateNumber || '',
        companyType: user.companyType || '',
        companyName: user.companyName || '',
        vehicleType: user.vehicleType || ''
      });
    }
  }, [user]);

  // Check if form is dirty
  useEffect(() => {
    if (user) {
      const hasChanges = Object.keys(formData).some(key => {
        return formData[key] !== (user[key] || '');
      });
      setIsDirty(hasChanges);
    }
  }, [formData, user]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[+]?[0-9\s\-()]{10,20}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Role-specific validations
    if (user.role !== 'transporter' && !formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (['retailer', 'wholesaler', 'supplier'].includes(user.role) && !formData.productCategory.trim()) {
      newErrors.productCategory = 'Product category is required';
    }

    if (user.role === 'transporter') {
      if (!formData.plateNumber.trim()) newErrors.plateNumber = 'Plate number is required';
      if (!formData.companyType) newErrors.companyType = 'Company type is required';
      if (!formData.vehicleType) newErrors.vehicleType = 'Vehicle type is required';
      if (formData.companyType === 'company' && !formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) error = 'This field is required';
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!/^[+]?[0-9\s\-()]{10,20}$/.test(value)) {
          error = 'Please enter a valid phone number';
        }
        break;
      case 'businessName':
        if (user.role !== 'transporter' && !value.trim()) {
          error = 'Business name is required';
        }
        break;
      case 'productCategory':
        if (['retailer', 'wholesaler', 'supplier'].includes(user.role) && !value.trim()) {
          error = 'Product category is required';
        }
        break;
      case 'plateNumber':
        if (user.role === 'transporter' && !value.trim()) {
          error = 'Plate number is required';
        }
        break;
      case 'companyType':
        if (user.role === 'transporter' && !value) {
          error = 'Company type is required';
        }
        break;
      case 'vehicleType':
        if (user.role === 'transporter' && !value) {
          error = 'Vehicle type is required';
        }
        break;
      case 'companyName':
        if (user.role === 'transporter' && formData.companyType === 'company' && !value.trim()) {
          error = 'Company name is required';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Validate field in real-time if it's been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({
        ...errors,
        [name]: error
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({
      ...touched,
      [name]: true
    });

    // Validate field on blur
    const error = validateField(name, value);
    setErrors({
      ...errors,
      [name]: error
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field]
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    // Mark all fields as touched to show all errors
    const allTouched = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validateForm()) {
      setMessage({ 
        type: 'error', 
        text: 'Please fix the errors in the form',
        details: 'Some fields require your attention.'
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '', details: '' });

    // Filter out unchanged fields to create a lean update payload
    const payload = Object.keys(formData).reduce((acc, key) => {
      // Check if the form value is different from the original user value
      if (formData[key] !== user[key]) {
        acc[key] = formData[key];
      }
      return acc;
    }, {});

    // If no changes, show message and return
    if (Object.keys(payload).length === 0) {
      setMessage({ 
        type: 'info', 
        text: 'No changes detected',
        details: 'Your profile information is up to date.'
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        updateUser(data.user);
        setMessage({ 
          type: 'success', 
          text: 'Profile updated successfully!',
          details: 'Your changes have been saved.'
        });
        setIsDirty(false);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Failed to update profile',
          details: data.errors ? Object.values(data.errors).join(', ') : 'Please try again.'
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'An error occurred', 
        details: 'Please check your connection and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '', details: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ 
        type: 'error', 
        text: 'Passwords do not match',
        details: 'Please make sure your new passwords match.' 
      });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ 
        type: 'error', 
        text: 'Password too short',
        details: 'New password must be at least 8 characters long.' 
      });
      setLoading(false);
      return;
    }

    // Check password strength
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!strongRegex.test(passwordData.newPassword)) {
      setMessage({
        type: 'warning',
        text: 'Weak password',
        details: 'For better security, use uppercase, lowercase, numbers, and special characters.'
      });
      // Continue despite warning
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Password updated successfully!',
          details: 'You can now use your new password to sign in.'
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPassword({
          current: false,
          new: false,
          confirm: false
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message || 'Failed to update password',
          details: 'Please check your current password and try again.'
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'An error occurred', 
        details: 'Please check your connection and try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      businessName: user.businessName || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
      taxId: user.taxId || '',
      productCategory: user.productCategory || '',
      plateNumber: user.plateNumber || '',
      companyType: user.companyType || '',
      companyName: user.companyName || '',
      vehicleType: user.vehicleType || ''
    });
    setErrors({});
    setTouched({});
    setMessage({ type: '', text: '', details: '' });
    setIsDirty(false);
  };

  const getRoleIcon = () => {
    switch(user.role) {
      case 'transporter':
        return <FaTruck className="text-blue-500" />;
      case 'retailer':
        return <FaStore className="text-green-500" />;
      case 'wholesaler':
      case 'supplier':
        return <FaBuilding className="text-purple-500" />;
      default:
        return <FaUser className="text-gray-500" />;
    }
  };

  const getRoleLabel = () => {
    switch(user.role) {
      case 'transporter':
        return 'Transporter';
      case 'retailer':
        return 'Retailer';
      case 'wholesaler':
        return 'Wholesaler';
      case 'supplier':
        return 'Supplier';
      default:
        return 'User';
    }
  };

  const renderProfileForm = () => (
    <form onSubmit={handleProfileUpdate} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            First Name *
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.firstName && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.firstName}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Last Name *
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.lastName && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.lastName}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.email}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Phone *
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.phone && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.phone}
            </p>
          )}
        </div>
      </div>

      {user.role !== 'transporter' && (
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Business Name *
          </label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.businessName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.businessName && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.businessName}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
          Address *
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
            errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.address && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
            <FaExclamationTriangle className="mr-1" /> {errors.address}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.city && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.city}
            </p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Country
          </label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
          Tax ID
        </label>
        <input
          type="text"
          name="taxId"
          value={formData.taxId}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
        />
      </div>

      {['retailer', 'wholesaler', 'supplier'].includes(user.role) && (
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            Product Category *
          </label>
          <input
            type="text"
            name="productCategory"
            value={formData.productCategory}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
              errors.productCategory ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.productCategory && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
              <FaExclamationTriangle className="mr-1" /> {errors.productCategory}
            </p>
          )}
        </div>
      )}

      {user.role === 'transporter' && (
        <>
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
              Plate Number *
            </label>
            <input
              type="text"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                errors.plateNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.plateNumber && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
                <FaExclamationTriangle className="mr-1" /> {errors.plateNumber}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                Company Type *
              </label>
              <select
                name="companyType"
                value={formData.companyType}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  errors.companyType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Type</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
              {errors.companyType && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
                  <FaExclamationTriangle className="mr-1" /> {errors.companyType}
                </p>
              )}
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                Vehicle Type *
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  errors.vehicleType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Vehicle</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="van">Van</option>
                <option value="car">Car</option>
                <option value="bicycle">Bicycle</option>
              </select>
              {errors.vehicleType && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
                  <FaExclamationTriangle className="mr-1" /> {errors.vehicleType}
                </p>
              )}
            </div>
          </div>

          {formData.companyType === 'company' && (
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                  errors.companyName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.companyName && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center justify-center">
                  <FaExclamationTriangle className="mr-1" /> {errors.companyName}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex justify-center space-x-4 pt-4">
        <button
          type="button"
          onClick={resetForm}
          disabled={!isDirty}
          className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaUndo className="mr-2" />
          Reset
        </button>
        <button
          type="submit"
          disabled={loading || !isDirty}
          className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaSave className="mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );

  const renderPasswordForm = () => (
    <form onSubmit={handlePasswordUpdate} className="space-y-6">
      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
          Current Password *
        </label>
        <div className="relative">
          <input
            type={showPassword.current ? "text" : "password"}
            name="currentPassword"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10 transition-colors"
            placeholder="Enter your current password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => togglePasswordVisibility('current')}
          >
            {showPassword.current ? (
              <FaEyeSlash className="h-5 w-5" />
            ) : (
              <FaEye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
          New Password *
        </label>
        <div className="relative">
          <input
            type={showPassword.new ? "text" : "password"}
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            required
            minLength="8"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10 transition-colors"
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => togglePasswordVisibility('new')}
          >
            {showPassword.new ? (
              <FaEyeSlash className="h-5 w-5" />
            ) : (
              <FaEye className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          Use at least 8 characters with a mix of letters, numbers & symbols
        </p>
      </div>

      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
          Confirm New Password *
        </label>
        <div className="relative">
          <input
            type={showPassword.confirm ? "text" : "password"}
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            required
            minLength="8"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10 transition-colors"
            placeholder="Confirm your new password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => togglePasswordVisibility('confirm')}
          >
            {showPassword.confirm ? (
              <FaEyeSlash className="h-5 w-5" />
            ) : (
              <FaEye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaSave className="mr-2" />
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  );

  const MessageAlert = () => {
    if (!message.text) return null;
    
    const alertConfig = {
      success: {
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        icon: <FaCheckCircle className="h-5 w-5 text-green-400" />
      },
      error: {
        bg: 'bg-red-50 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        icon: <FaExclamationTriangle className="h-5 w-5 text-red-400" />
      },
      warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
      },
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <FaInfoCircle className="h-5 w-5 text-blue-400" />
      }
    };
    
    const config = alertConfig[message.type] || alertConfig.info;
    
    return (
      <div className={`mb-6 p-4 rounded-lg border ${config.bg} ${config.border} ${config.text} text-center`}>
        <div className="flex items-center justify-center">
          <div className="flex-shrink-0 mr-3">
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-medium">{message.text}</h3>
            {message.details && (
              <p className="mt-1 text-sm opacity-90">{message.details}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 h-[calc(100vh-95px)] overflow-y-auto">
      <div className="flex flex-col items-center mb-6">
        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <div className="flex items-center justify-center">
            {getRoleIcon()}
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Account Settings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your {getRoleLabel().toLowerCase()} account information and security
          </p>
        </div>
      </div>

      <MessageAlert />

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 flex justify-center">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Change Password
          </button>
        </nav>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          {activeTab === 'profile' ? renderProfileForm() : renderPasswordForm()}
        </div>
      </div>
    </div>
  );
};

export default Settings;