import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaMapMarkerAlt, FaChevronRight, FaArrowLeft, FaBox, FaTruck, FaMotorcycle, FaShuttleVan, FaBuilding, FaIdCard, FaStore, FaExclamationTriangle } from 'react-icons/fa';

// API base URL - use a relative path for API calls in production
const API_BASE_URL = 'http://localhost:5000'; // Directly set the API URL

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [preSelectedRole, setPreSelectedRole] = useState('');
  
  const [formData, setFormData] = useState({
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    address: '',
    city: '',
    country: 'Uganda',
    taxId: '',
    productCategory: '',
    plateNumber: '',
    companyType: 'individual',
    companyName: '',
    vehicleType: '',
    businessRegistration: '',
    yearsInBusiness: '',
    businessDescription: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(4);

  // Set the preselected role from navigation state
  useEffect(() => {
    if (location.state?.preSelectedRole) {
      setPreSelectedRole(location.state.preSelectedRole);
      setFormData(prev => ({ ...prev, role: location.state.preSelectedRole }));
    } else {
      // If no role selected, redirect back to role selection
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  // Update total steps based on role
  useEffect(() => {
    setTotalSteps(preSelectedRole === 'transporter' ? 4 : 4);
  }, [preSelectedRole]);

  // Product categories for different roles
  const productCategories = {
    retailer: [
      'Clothing & Fashion',
      'Electronics',
      'Food & Beverages',
      'Home & Garden',
      'Health & Beauty',
      'Sports & Outdoors',
      'Toys & Games',
      'Automotive',
      'Books & Stationery',
      'Jewelry & Accessories',
      
    ],
    wholesaler: [
      'Clothing & Fashion',
      'Electronics',
      'Food & Beverages',
      'Home & Garden',
      'Health & Beauty',
      'Sports & Outdoors',
      'Toys & Games',
      'Automotive',
      'Books & Stationery',
      'Jewelry & Accessories',

    ],
    supplier: [
      'Clothing & Fashion',
      'Electronics',
      'Food & Beverages',
      'Home & Garden',
      'Health & Beauty',
      'Sports & Outdoors',
      'Toys & Games',
      'Automotive',
      'Books & Stationery',
      'Jewelry & Accessories',
    ]
  };

  // Vehicle types for transporters
  const vehicleTypes = [
    { id: 'truck', label: 'Truck', icon: <FaTruck className="text-lg" />, description: 'Heavy goods transportation' },
    { id: 'motorcycle', label: 'Motorcycle', icon: <FaMotorcycle className="text-lg" />, description: 'Quick deliveries and small packages' },
    { id: 'van', label: 'Van', icon: <FaShuttleVan className="text-lg" />, description: 'Medium-sized goods and parcels' }
  ];

  // Business types - MUST MATCH BACKEND ENUM VALUES
  const businessTypes = [
    { id: 'individual', label: 'Individual', description: 'Sole proprietor or freelancer' },
    { id: 'company', label: 'Company', description: 'Registered company' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleVehicleTypeSelect = (vehicleType) => {
    setFormData(prev => ({
      ...prev,
      vehicleType
    }));
    
    if (errors.vehicleType) {
      setErrors(prev => ({
        ...prev,
        vehicleType: ''
      }));
    }
  };

  const handleBusinessTypeSelect = (companyType) => {
    setFormData(prev => ({
      ...prev,
      companyType
    }));
    
    // Clear company name if switching to individual
    if (companyType === 'individual') {
      setFormData(prev => ({
        ...prev,
        companyName: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
    }
    
    if (step === 2) {
      if (preSelectedRole !== 'transporter') {
        if (!formData.businessName) newErrors.businessName = 'Business name is required';
        if (!formData.businessRegistration) newErrors.businessRegistration = 'Business registration is required';
      }
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      
      // Role-specific validations
      if (['retailer', 'wholesaler', 'supplier'].includes(preSelectedRole) && !formData.productCategory) {
        newErrors.productCategory = 'Product category is required';
      }
      
      if (preSelectedRole === 'transporter') {
        if (!formData.plateNumber) newErrors.plateNumber = 'Plate number is required';
        if (formData.companyType === 'company' && !formData.companyName) {
          newErrors.companyName = 'Company name is required';
        }
        if (!formData.vehicleType) newErrors.vehicleType = 'Vehicle type is required';
      }
    }
    
    if (step === 3) {
      if (preSelectedRole !== 'transporter') {
        if (!formData.yearsInBusiness) newErrors.yearsInBusiness = 'Years in business is required';
        if (!formData.businessDescription) newErrors.businessDescription = 'Business description is required';
      }
    }
    
    if (step === 4) {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const resetForm = () => {
    setFormData({
      role: preSelectedRole,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      address: '',
      city: '',
      country: 'Uganda',
      taxId: '',
      productCategory: '',
      plateNumber: '',
      companyType: 'individual',
      companyName: '',
      vehicleType: '',
      businessRegistration: '',
      yearsInBusiness: '',
      businessDescription: ''
    });
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    if (currentStep < totalSteps) {
      nextStep();
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Prepare data for API call
      const userData = {
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        taxId: formData.taxId || '',
      };
      
      // Add role-specific fields
      if (formData.role !== 'transporter') {
        userData.businessName = formData.businessName;
        userData.productCategory = formData.productCategory;
        // Map businessRegistration to an appropriate field if needed
      } else {
        userData.plateNumber = formData.plateNumber;
        userData.companyType = formData.companyType;
        userData.companyName = formData.companyName || '';
        userData.vehicleType = formData.vehicleType;
      }
      
      // Make API call to register user
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const backendErrors = {};
          data.errors.forEach(error => {
            backendErrors[error.path] = error.msg;
          });
          setErrors(backendErrors);
          throw new Error('Please fix the validation errors');
        }
        throw new Error(data.message || `Registration failed: ${response.status} ${response.statusText}`);
      }
      
      // Registration successful
      console.log('Registration successful:', data);
      
      // Reset form
      resetForm();
      
      // Redirect to login after successful registration
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please log in.',
          registeredEmail: formData.email 
        } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // More specific error messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to the server. Please check if the backend is running.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else {
        errorMessage = error.message || 'Registration failed. Please try again.';
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while role is being determined
  if (!preSelectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">Loading registration form...</h2>
        </div>
      </div>
    );
  }

  const getStepTitle = () => {
    switch(currentStep) {
      case 1: return "Personal Information";
      case 2: 
        return preSelectedRole === 'transporter' 
          ? "Transport Details" 
          : "Business Information";
      case 3: 
        return preSelectedRole === 'transporter' 
          ? "Additional Information" 
          : "Business Profile";
      case 4: return "Security Information";
      default: return "Registration";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4"
          >
            <FaArrowLeft className="mr-2" size={12} />
            Back to role selection
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-600 text-sm mt-2 capitalize">Registering as {preSelectedRole}</p>
          
          {/* Progress Steps */}
          <div className="flex justify-center mt-6 mb-4">
            {[...Array(totalSteps)].map((_, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  currentStep > i + 1 ? 'bg-green-500 text-white' :
                  currentStep === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > i + 1 ? '✓' : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${currentStep > i + 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Personal</span>
            <span>Business</span>
            <span>Profile</span>
            <span>Security</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-gray-600 text-sm mt-1">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Server Connection Warning */}
          {API_BASE_URL.includes('localhost') && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Development Mode:</strong> Connecting to {API_BASE_URL}. Make sure your backend server is running.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400"><FaUser size={14} /></span>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                        placeholder="First name"
                      />
                    </div>
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400"><FaUser size={14} /></span>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                        placeholder="Last name"
                      />
                    </div>
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><FaEnvelope size={14} /></span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      placeholder="email@example.com"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><FaPhone size={14} /></span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      placeholder="+256 XXX XXX XXX"
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Business/Transport Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {preSelectedRole !== 'transporter' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaStore size={14} /></span>
                        <input
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.businessName ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                          placeholder="Business name"
                        />
                      </div>
                      {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration Number *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaIdCard size={14} /></span>
                        <input
                          type="text"
                          name="businessRegistration"
                          value={formData.businessRegistration}
                          onChange={handleChange}
                          className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.businessRegistration ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                          placeholder="Registration number"
                        />
                      </div>
                      {errors.businessRegistration && <p className="text-red-500 text-xs mt-1">{errors.businessRegistration}</p>}
                    </div>

                    {['retailer', 'wholesaler', 'supplier'].includes(preSelectedRole) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Category *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-400"><FaBox size={14} /></span>
                          <select
                            name="productCategory"
                            value={formData.productCategory}
                            onChange={handleChange}
                            className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.productCategory ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                          >
                            <option value="" className="text-gray-900">Select product category</option>
                            {productCategories[preSelectedRole]?.map(category => (
                              <option key={category} value={category} className="text-gray-900">{category}</option>
                            ))}
                          </select>
                        </div>
                        {errors.productCategory && <p className="text-red-500 text-xs mt-1">{errors.productCategory}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Business Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {businessTypes.map((type) => {
                          const isSelected = formData.companyType === type.id;
                          return (
                            <div
                              key={type.id}
                              onClick={() => handleBusinessTypeSelect(type.id)}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-opacity-50' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className={`p-2 rounded-full ${
                                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <FaBuilding className="text-lg" />
                                </div>
                                <span className={`text-sm font-medium mt-2 ${
                                  isSelected ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  {type.label}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">{type.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {formData.companyType === 'company' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-400"><FaBuilding size={14} /></span>
                          <input
                            type="text"
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleChange}
                            className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.companyName ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                            placeholder="Transport company name"
                          />
                        </div>
                        {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
                      </div>
                    )}

                    {/* Vehicle Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Vehicle Type *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {vehicleTypes.map((vehicle) => {
                          const isSelected = formData.vehicleType === vehicle.id;
                          return (
                            <div
                              key={vehicle.id}
                              onClick={() => handleVehicleTypeSelect(vehicle.id)}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-opacity-50' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className={`p-2 rounded-full ${
                                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {vehicle.icon}
                                </div>
                                <span className={`text-sm font-medium mt-2 ${
                                  isSelected ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  {vehicle.label}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">{vehicle.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {errors.vehicleType && <p className="text-red-500 text-xs mt-1">{errors.vehicleType}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaTruck size={14} /></span>
                        <input
                          type="text"
                          name="plateNumber"
                          value={formData.plateNumber}
                          onChange={handleChange}
                          className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.plateNumber ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                          placeholder="e.g., UAA 123A"
                        />
                      </div>
                      {errors.plateNumber && <p className="text-red-500 text-xs mt-1">{errors.plateNumber}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><FaMapMarkerAlt size={14} /></span>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.address ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      placeholder="Street address"
                    />
                  </div>
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.city ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      placeholder="City"
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
                      disabled
                    />
                  </div>
                </div>

                {preSelectedRole !== 'transporter' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (Optional)</label>
                    <input
                      type="text"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Tax identification number"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Business Profile */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {preSelectedRole !== 'transporter' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business *</label>
                      <select
                        name="yearsInBusiness"
                        value={formData.yearsInBusiness}
                        onChange={handleChange}
                        className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.yearsInBusiness ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      >
                        <option value="" className="text-gray-900">Select years in business</option>
                        <option value="0-1" className="text-gray-900">Less than 1 year</option>
                        <option value="1-3" className="text-gray-900">1-3 years</option>
                        <option value="3-5" className="text-gray-900">3-5 years</option>
                        <option value="5-10" className="text-gray-900">5-10 years</option>
                        <option value="10+" className="text-gray-900">More than 10 years</option>
                      </select>
                      {errors.yearsInBusiness && <p className="text-red-500 text-xs mt-1">{errors.yearsInBusiness}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Description *</label>
                      <textarea
                        name="businessDescription"
                        value={formData.businessDescription}
                        onChange={handleChange}
                        rows={4}
                        className={`w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.businessDescription ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                        placeholder="Describe your business, products, and services..."
                      />
                      {errors.businessDescription && <p className="text-red-500 text-xs mt-1">{errors.businessDescription}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years in Transport Business</label>
                      <select
                        name="yearsInBusiness"
                        value={formData.yearsInBusiness}
                        onChange={handleChange}
                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      >
                        <option value="" className="text-gray-900">Select years in business</option>
                        <option value="0-1" className="text-gray-900">Less than 1 year</option>
                        <option value="1-3" className="text-gray-900">1-3 years</option>
                        <option value="3-5" className="text-gray-900">3-5 years</option>
                        <option value="5-10" className="text-gray-900">5-10 years</option>
                        <option value="10+" className="text-gray-900">More than 10 years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Services Description</label>
                      <textarea
                        name="businessDescription"
                        value={formData.businessDescription}
                        onChange={handleChange}
                        rows={4}
                        className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Describe your transport services, areas covered, and specialties..."
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Security Information */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><FaLock size={14} /></span>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      placeholder="Create a strong password"
                    />
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><FaLock size={14} /></span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`pl-10 w-full p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} text-gray-900`}
                      placeholder="Confirm your password"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Account Security</h3>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• Use a combination of letters, numbers, and symbols</li>
                    <li>• Avoid using personal information in your password</li>
                    <li>• Your password is encrypted and securely stored</li>
                  </ul>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-red-400 mr-2" />
                  <p className="text-red-700 text-sm">{errors.submit}</p>
                </div>
                {errors.submit.includes('Cannot connect') && (
                  <p className="text-red-600 text-xs mt-2">
                    Troubleshooting: Check if your backend server is running on {API_BASE_URL}
                  </p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={currentStep === 1 ? () => navigate('/') : prevStep}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-medium"
              >
                {isLoading ? 'Processing...' : currentStep === totalSteps ? 'Create Account' : 'Continue'}
                {!isLoading && <FaChevronRight className="ml-2" size={12} />}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;