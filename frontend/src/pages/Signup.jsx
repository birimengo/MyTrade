import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaUser, FaEnvelope, FaPhone, FaLock, FaMapMarkerAlt, 
  FaChevronRight, FaArrowLeft, FaBox, FaTruck, FaMotorcycle, 
  FaShuttleVan, FaBuilding, FaIdCard, FaStore, FaExclamationTriangle,
  FaEye, FaEyeSlash, FaCheck, FaTimes, FaUpload, FaCamera
} from 'react-icons/fa';

// API base URL - use a relative path for API calls in production
const API_BASE_URL = 'http://localhost:5000';

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
    businessDescription: '',
    // New fields for enhanced functionality
    profileImage: null,
    businessLogo: null,
    idDocument: null,
    termsAccepted: false,
    marketingEmails: false,
    emergencyContact: '',
    website: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    },
    operatingHours: {
      opening: '08:00',
      closing: '18:00',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    serviceAreas: [],
    deliveryRadius: '',
    paymentMethods: [],
    certifications: []
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(4);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [availableCities, setAvailableCities] = useState([]);

  // Enhanced product categories with subcategories
  const productCategories = {
    retailer: [
      { 
        name: 'Clothing & Fashion',
        subcategories: ['Men\'s Fashion', 'Women\'s Fashion', 'Children\'s Clothing', 'Shoes & Footwear', 'Accessories']
      },
      { 
        name: 'Electronics',
        subcategories: ['Mobile Phones', 'Computers & Laptops', 'Home Appliances', 'Audio & Video', 'Gaming']
      },
      { 
        name: 'Food & Beverages',
        subcategories: ['Groceries', 'Fresh Produce', 'Beverages', 'Snacks', 'Dairy Products']
      },
      { 
        name: 'Home & Garden',
        subcategories: ['Furniture', 'Home Decor', 'Gardening Tools', 'Kitchenware', 'Bed & Bath']
      },
      { 
        name: 'Health & Beauty',
        subcategories: ['Skincare', 'Haircare', 'Makeup', 'Personal Care', 'Vitamins & Supplements']
      }
    ],
    wholesaler: [
      { 
        name: 'Clothing & Fashion',
        subcategories: ['Bulk Clothing', 'Textiles', 'Footwear Wholesale', 'Accessories Bulk']
      },
      { 
        name: 'Electronics',
        subcategories: ['Electronics Bulk', 'Components', 'Gadgets Wholesale', 'Accessories']
      },
      { 
        name: 'Food & Beverages',
        subcategories: ['Food Wholesale', 'Beverage Distribution', 'Fresh Produce Bulk', 'Packaged Foods']
      },
      { 
        name: 'Home & Garden',
        subcategories: ['Furniture Wholesale', 'Home Goods Bulk', 'Building Materials', 'Garden Supplies']
      }
    ],
    supplier: [
      { 
        name: 'Raw Materials',
        subcategories: ['Agricultural Products', 'Metals & Minerals', 'Chemicals', 'Textile Raw Materials']
      },
      { 
        name: 'Manufactured Goods',
        subcategories: ['Electronic Components', 'Auto Parts', 'Machinery', 'Packaging Materials']
      },
      { 
        name: 'Agricultural Products',
        subcategories: ['Grains & Cereals', 'Fresh Produce', 'Livestock', 'Dairy Products']
      }
    ]
  };

  // Enhanced vehicle types with capacities
  const vehicleTypes = [
    { 
      id: 'truck', 
      label: 'Truck', 
      icon: <FaTruck className="text-sm" />, 
      description: 'Heavy goods transportation',
      capacities: ['1-5 tons', '5-10 tons', '10-20 tons', '20+ tons'],
      features: ['Refrigerated', 'Flatbed', 'Container', 'Tanker']
    },
    { 
      id: 'motorcycle', 
      label: 'Motorcycle', 
      icon: <FaMotorcycle className="text-sm" />, 
      description: 'Quick deliveries and small packages',
      capacities: ['Up to 50kg', '50-100kg', '100-150kg'],
      features: ['Delivery Box', 'Passenger Seat', 'Rain Cover']
    },
    { 
      id: 'van', 
      label: 'Van', 
      icon: <FaShuttleVan className="text-sm" />, 
      description: 'Medium-sized goods and parcels',
      capacities: ['500kg-1ton', '1-2 tons', '2-3 tons'],
      features: ['Refrigerated', 'Sliding Doors', 'Loading Ramp']
    }
  ];

  // Enhanced business types
  const businessTypes = [
    { id: 'individual', label: 'Individual', description: 'Sole proprietor or freelancer' },
    { id: 'partnership', label: 'Partnership', description: 'Business partnership' },
    { id: 'company', label: 'Company', description: 'Registered company' },
    { id: 'cooperative', label: 'Cooperative', description: 'Business cooperative' }
  ];

  // Payment methods
  const paymentOptions = [
    { id: 'cash', label: 'Cash' },
    { id: 'mobile_money', label: 'Mobile Money' },
    { id: 'bank_transfer', label: 'Bank Transfer' },
    { id: 'credit_card', label: 'Credit Card' },
    { id: 'debit_card', label: 'Debit Card' }
  ];

  // Working days options
  const workingDaysOptions = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' }
  ];

  // Set the preselected role from navigation state
  useEffect(() => {
    if (location.state?.preSelectedRole) {
      setPreSelectedRole(location.state.preSelectedRole);
      setFormData(prev => ({ ...prev, role: location.state.preSelectedRole }));
    } else {
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  // Update total steps based on role
  useEffect(() => {
    setTotalSteps(preSelectedRole === 'transporter' ? 4 : 4);
  }, [preSelectedRole]);

  // Load available cities (could be from API)
  useEffect(() => {
    const cities = [
      'Kampala', 'Entebbe', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara', 
      'Fort Portal', 'Masaka', 'Soroti', 'Arua', 'Kabale', 'Tororo'
    ];
    setAvailableCities(cities);
  }, []);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'Weak';
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    if (strength === 4) return 'Very Strong';
    if (strength === 3) return 'Strong';
    if (strength === 2) return 'Medium';
    return 'Weak';
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
      
      // Simulate upload progress
      if (files[0]) {
        setUploadProgress(prev => ({
          ...prev,
          [name]: 0
        }));
        
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = (prev[name] || 0) + 10;
            if (newProgress >= 100) {
              clearInterval(interval);
              return { ...prev, [name]: 100 };
            }
            return { ...prev, [name]: newProgress };
          });
        }, 100);
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Check password strength
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle nested object changes (social media, operating hours, etc.)
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Handle array fields (service areas, payment methods, etc.)
  const handleArrayChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
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

  // File upload handler with drag and drop support
  const handleFileDrop = (field, files) => {
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [field]: files[0]
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
    }
    
    if (step === 2) {
      if (preSelectedRole !== 'transporter') {
        if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.businessRegistration.trim()) newErrors.businessRegistration = 'Business registration is required';
      }
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      
      if (['retailer', 'wholesaler', 'supplier'].includes(preSelectedRole) && !formData.productCategory) {
        newErrors.productCategory = 'Product category is required';
      }
      
      if (preSelectedRole === 'transporter') {
        if (!formData.plateNumber.trim()) newErrors.plateNumber = 'Plate number is required';
        if (formData.companyType === 'company' && !formData.companyName.trim()) {
          newErrors.companyName = 'Company name is required';
        }
        if (!formData.vehicleType) newErrors.vehicleType = 'Vehicle type is required';
      }
    }
    
    if (step === 3) {
      if (preSelectedRole !== 'transporter') {
        if (!formData.yearsInBusiness) newErrors.yearsInBusiness = 'Years in business is required';
        if (!formData.businessDescription.trim()) newErrors.businessDescription = 'Business description is required';
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
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
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
      businessDescription: '',
      profileImage: null,
      businessLogo: null,
      idDocument: null,
      termsAccepted: false,
      marketingEmails: false,
      emergencyContact: '',
      website: '',
      socialMedia: {
        facebook: '',
        twitter: '',
        linkedin: '',
        instagram: ''
      },
      operatingHours: {
        opening: '08:00',
        closing: '18:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      serviceAreas: [],
      deliveryRadius: '',
      paymentMethods: [],
      certifications: []
    });
    setCurrentStep(1);
    setPasswordStrength('');
    setUploadProgress({});
  };

  // Debug function to check form data
  const debugFormData = () => {
    console.log('=== FORM DATA DEBUG ===');
    console.log('Role:', formData.role);
    console.log('First Name:', formData.firstName);
    console.log('Last Name:', formData.lastName);
    console.log('Email:', formData.email);
    console.log('Phone:', formData.phone);
    console.log('Password:', formData.password ? '***' : 'empty');
    console.log('Address:', formData.address);
    console.log('City:', formData.city);
    console.log('Business Name:', formData.businessName);
    console.log('Product Category:', formData.productCategory);
    console.log('Plate Number:', formData.plateNumber);
    console.log('Vehicle Type:', formData.vehicleType);
    console.log('=== END DEBUG ===');
  };

  // Test function for minimal registration
  const testMinimalRegistration = async () => {
    const testData = {
      role: 'retailer',
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      phone: '+256712345678',
      password: 'password123',
      businessName: 'Test Business',
      address: 'Test Address 123',
      city: 'Kampala',
      country: 'Uganda',
      productCategory: 'Electronics',
      termsAccepted: true
    };

    console.log('🧪 Testing with minimal data:', testData);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      const data = await response.json();
      console.log('🧪 Test response:', data);
      
      if (response.ok) {
        alert('✅ Test registration successful! Check console for details.');
      } else {
        alert(`❌ Test failed: ${data.message}`);
      }
    } catch (error) {
      console.error('🧪 Test error:', error);
      alert('❌ Test failed: ' + error.message);
    }
  };

  // CORRECTED handleSubmit function using JSON instead of FormData
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
      // Debug: Check what's in formData
      console.log('🔍 Current formData:', formData);
      
      // Prepare data for API call - USE JSON, NOT FormData
      const userData = {
        role: formData.role || preSelectedRole,
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        password: formData.password || '',
        address: formData.address || '',
        city: formData.city || '',
        country: formData.country || 'Uganda',
        taxId: formData.taxId || '',
        termsAccepted: formData.termsAccepted || false,
        marketingEmails: formData.marketingEmails || false,
        emergencyContact: formData.emergencyContact || '',
        website: formData.website || '',
        businessDescription: formData.businessDescription || '',
        yearsInBusiness: formData.yearsInBusiness || '',
        deliveryRadius: formData.deliveryRadius || ''
      };
      
      // Add role-specific required fields
      if (formData.role !== 'transporter') {
        userData.businessName = formData.businessName || '';
        userData.productCategory = formData.productCategory || '';
        userData.businessRegistration = formData.businessRegistration || '';
      } else {
        userData.plateNumber = formData.plateNumber || '';
        userData.companyType = formData.companyType || 'individual';
        userData.vehicleType = formData.vehicleType || '';
        if (formData.companyName) {
          userData.companyName = formData.companyName;
        }
      }

      console.log('📤 Sending registration data to backend:', userData);
      
      // Make API call to register user - USE JSON, NOT FormData
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      console.log('📥 Server response:', data);
      
      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          console.log('❌ Validation errors from server:', data.errors);
          const backendErrors = {};
          data.errors.forEach(error => {
            backendErrors[error.path] = error.msg;
          });
          setErrors(backendErrors);
          throw new Error('Please fix the validation errors');
        }
        throw new Error(data.message || `Registration failed: ${response.status}`);
      }
      
      // Registration successful
      console.log('✅ Registration successful:', data);
      
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
      console.error('❌ Registration error:', error);
      
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-3">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <h2 className="text-base font-semibold text-gray-900">Loading registration form...</h2>
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

  // Password strength indicator component
  const PasswordStrengthIndicator = ({ strength }) => {
    if (!strength) return null;
    
    const strengthConfig = {
      'Weak': { color: 'bg-red-500', text: 'text-red-700' },
      'Medium': { color: 'bg-yellow-500', text: 'text-yellow-700' },
      'Strong': { color: 'bg-blue-500', text: 'text-blue-700' },
      'Very Strong': { color: 'bg-green-500', text: 'text-green-700' }
    };
    
    const config = strengthConfig[strength] || strengthConfig.Weak;
    
    return (
      <div className="mt-1">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${config.text}`}>Password Strength: {strength}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
          <div 
            className={`h-1 rounded-full ${config.color} transition-all duration-300`}
            style={{ 
              width: strength === 'Weak' ? '25%' : 
                     strength === 'Medium' ? '50%' : 
                     strength === 'Strong' ? '75%' : '100%' 
            }}
          ></div>
        </div>
      </div>
    );
  };

  // File upload component
  const FileUpload = ({ label, name, accept, currentFile, progress }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      handleFileDrop(name, files);
    };

    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <div
          className={`border-2 border-dashed rounded-md p-3 text-center transition-all duration-200 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : currentFile 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentFile ? (
            <div className="flex items-center justify-center space-x-2">
              <FaCheck className="text-green-500 text-sm" />
              <span className="text-xs text-gray-700 truncate">{currentFile.name}</span>
              {progress !== undefined && progress < 100 && (
                <div className="w-16 bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <FaUpload className="mx-auto text-gray-400 text-base mb-1" />
              <p className="text-xs text-gray-600">
                Drag and drop or{' '}
                <label htmlFor={name} className="text-blue-600 hover:text-blue-800 cursor-pointer">
                  browse
                </label>
              </p>
              <input
                type="file"
                id={name}
                name={name}
                accept={accept}
                onChange={handleChange}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3 sm:px-4 lg:px-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800 mb-3 transition-colors"
          >
            <FaArrowLeft className="mr-1" size={10} />
            Back to role selection
          </button>
          <h1 className="text-xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-600 text-xs mt-1 capitalize">Registering as {preSelectedRole}</p>
          
          {/* Enhanced Progress Steps */}
          <div className="flex justify-center mt-4 mb-3">
            {[...Array(totalSteps)].map((_, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  currentStep > i + 1 ? 'bg-green-500 text-white shadow transform scale-105' :
                  currentStep === i + 1 ? 'bg-blue-600 text-white shadow transform scale-105' : 
                  'bg-gray-300 text-gray-600 hover:bg-gray-400 hover:text-white'
                }`}>
                  {currentStep > i + 1 ? <FaCheck size={10} /> : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`w-8 h-0.5 mx-1 transition-all duration-300 ${
                    currentStep > i + 1 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
            <span className="text-center">Personal</span>
            <span className="text-center">Business</span>
            <span className="text-center">Profile</span>
            <span className="text-center">Security</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-gray-600 text-xs mt-0.5">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Server Connection Warning */}
          {API_BASE_URL.includes('localhost') && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="ml-2">
                  <p className="text-xs text-yellow-700">
                    <strong>Development Mode:</strong> Connecting to {API_BASE_URL}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Enhanced Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Profile Image Upload */}
                <FileUpload
                  label="Profile Photo (Optional)"
                  name="profileImage"
                  accept="image/*"
                  currentFile={formData.profileImage}
                  progress={uploadProgress.profileImage}
                />

                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-400"><FaUser size={12} /></span>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            errors.firstName ? 'border-red-500' : 'border-gray-300'
                          } text-gray-900`}
                          placeholder="First name"
                        />
                      </div>
                      {errors.firstName && <p className="text-red-500 text-xs mt-0.5">{errors.firstName}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-400"><FaUser size={12} /></span>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            errors.lastName ? 'border-red-500' : 'border-gray-300'
                          } text-gray-900`}
                          placeholder="Last name"
                        />
                      </div>
                      {errors.lastName && <p className="text-red-500 text-xs mt-0.5">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400"><FaEnvelope size={12} /></span>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                        placeholder="email@example.com"
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400"><FaPhone size={12} /></span>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                        placeholder="+256 XXX XXX XXX"
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Emergency Contact (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400"><FaPhone size={12} /></span>
                      <input
                        type="tel"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleChange}
                        className="pl-8 w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
                        placeholder="Emergency contact number"
                      />
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleChange}
                      className="mt-0.5 w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-xs text-gray-700">
                      I agree to the{' '}
                      <button type="button" className="text-blue-600 hover:text-blue-800 font-medium">
                        Terms and Conditions
                      </button>{' '}
                      and{' '}
                      <button type="button" className="text-blue-600 hover:text-blue-800 font-medium">
                        Privacy Policy
                      </button>
                      *
                    </label>
                  </div>
                  {errors.termsAccepted && <p className="text-red-500 text-xs">{errors.termsAccepted}</p>}

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      name="marketingEmails"
                      checked={formData.marketingEmails}
                      onChange={handleChange}
                      className="mt-0.5 w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-xs text-gray-700">
                      I would like to receive marketing emails and updates
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Enhanced Business/Transport Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {preSelectedRole !== 'transporter' ? (
                  <>
                    {/* Business Logo Upload */}
                    <FileUpload
                      label="Business Logo (Optional)"
                      name="businessLogo"
                      accept="image/*"
                      currentFile={formData.businessLogo}
                      progress={uploadProgress.businessLogo}
                    />

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Business Name *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-400"><FaStore size={12} /></span>
                        <input
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            errors.businessName ? 'border-red-500' : 'border-gray-300'
                          } text-gray-900`}
                          placeholder="Business name"
                        />
                      </div>
                      {errors.businessName && <p className="text-red-500 text-xs mt-0.5">{errors.businessName}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Business Registration Number *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-400"><FaIdCard size={12} /></span>
                        <input
                          type="text"
                          name="businessRegistration"
                          value={formData.businessRegistration}
                          onChange={handleChange}
                          className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            errors.businessRegistration ? 'border-red-500' : 'border-gray-300'
                          } text-gray-900`}
                          placeholder="Registration number"
                        />
                      </div>
                      {errors.businessRegistration && <p className="text-red-500 text-xs mt-0.5">{errors.businessRegistration}</p>}
                    </div>

                    {['retailer', 'wholesaler', 'supplier'].includes(preSelectedRole) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Product Category *</label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-gray-400"><FaBox size={12} /></span>
                          <select
                            name="productCategory"
                            value={formData.productCategory}
                            onChange={handleChange}
                            className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              errors.productCategory ? 'border-red-500' : 'border-gray-300'
                            } text-gray-900`}
                          >
                            <option value="" className="text-gray-900">Select product category</option>
                            {productCategories[preSelectedRole]?.map(category => (
                              <option key={category.name} value={category.name} className="text-gray-900">
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {errors.productCategory && <p className="text-red-500 text-xs mt-0.5">{errors.productCategory}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Enhanced Business Type Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Business Type *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {businessTypes.map((type) => {
                          const isSelected = formData.companyType === type.id;
                          return (
                            <div
                              key={type.id}
                              onClick={() => handleBusinessTypeSelect(type.id)}
                              className={`p-2 border rounded-md cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <div className={`p-1 rounded-full ${
                                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <FaBuilding className="text-sm" />
                                </div>
                                <span className={`text-xs font-medium mt-1 ${
                                  isSelected ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  {type.label}
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5">{type.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {formData.companyType === 'company' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-gray-400"><FaBuilding size={12} /></span>
                          <input
                            type="text"
                            name="companyName"
                            value={formData.companyName}
                            onChange={handleChange}
                            className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              errors.companyName ? 'border-red-500' : 'border-gray-300'
                            } text-gray-900`}
                            placeholder="Transport company name"
                          />
                        </div>
                        {errors.companyName && <p className="text-red-500 text-xs mt-0.5">{errors.companyName}</p>}
                      </div>
                    )}

                    {/* Enhanced Vehicle Type Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Select Vehicle Type *</label>
                      <div className="grid grid-cols-1 gap-2">
                        {vehicleTypes.map((vehicle) => {
                          const isSelected = formData.vehicleType === vehicle.id;
                          return (
                            <div
                              key={vehicle.id}
                              onClick={() => handleVehicleTypeSelect(vehicle.id)}
                              className={`p-2 border rounded-md cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`p-1 rounded-full ${
                                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {vehicle.icon}
                                </div>
                                <div className="flex-1">
                                  <span className={`text-xs font-medium ${
                                    isSelected ? 'text-blue-700' : 'text-gray-700'
                                  }`}>
                                    {vehicle.label}
                                  </span>
                                  <span className="text-xs text-gray-500 block">{vehicle.description}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {errors.vehicleType && <p className="text-red-500 text-xs mt-0.5">{errors.vehicleType}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Plate Number *</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-400"><FaTruck size={12} /></span>
                        <input
                          type="text"
                          name="plateNumber"
                          value={formData.plateNumber}
                          onChange={handleChange}
                          className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                            errors.plateNumber ? 'border-red-500' : 'border-gray-300'
                          } text-gray-900`}
                          placeholder="e.g., UAA 123A"
                        />
                      </div>
                      {errors.plateNumber && <p className="text-red-500 text-xs mt-0.5">{errors.plateNumber}</p>}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-gray-400"><FaMapMarkerAlt size={12} /></span>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className={`pl-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.address ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                        placeholder="Street address"
                      />
                    </div>
                    {errors.address && <p className="text-red-500 text-xs mt-0.5">{errors.address}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      } text-gray-900`}
                    >
                      <option value="" className="text-gray-900">Select your city</option>
                      {availableCities.map(city => (
                        <option key={city} value={city} className="text-gray-900">{city}</option>
                      ))}
                    </select>
                    {errors.city && <p className="text-red-500 text-xs mt-0.5">{errors.city}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900 transition-colors"
                      disabled
                    />
                  </div>

                  {preSelectedRole !== 'transporter' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tax ID (Optional)</label>
                      <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleChange}
                        className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
                        placeholder="Tax identification number"
                      />
                    </div>
                  )}
                </div>

                {/* Website and Social Media */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Website (Optional)</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
                    placeholder="https://example.com"
                  />
                </div>

                {/* Service Areas for Transporters */}
                {preSelectedRole === 'transporter' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Service Areas</label>
                    <div className="grid grid-cols-2 gap-1">
                      {availableCities.map(city => (
                        <div key={city} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`city-${city}`}
                            checked={formData.serviceAreas.includes(city)}
                            onChange={(e) => handleArrayChange('serviceAreas', city, e.target.checked)}
                            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`city-${city}`} className="ml-1 text-xs text-gray-700">
                            {city}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Enhanced Business Profile */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* ID Document Upload */}
                <FileUpload
                  label="ID Document (Required for Verification)"
                  name="idDocument"
                  accept=".pdf,.jpg,.jpeg,.png"
                  currentFile={formData.idDocument}
                  progress={uploadProgress.idDocument}
                />

                {preSelectedRole !== 'transporter' ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Years in Business *</label>
                      <select
                        name="yearsInBusiness"
                        value={formData.yearsInBusiness}
                        onChange={handleChange}
                        className={`w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.yearsInBusiness ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                      >
                        <option value="" className="text-gray-900">Select years in business</option>
                        <option value="0-1" className="text-gray-900">Less than 1 year</option>
                        <option value="1-3" className="text-gray-900">1-3 years</option>
                        <option value="3-5" className="text-gray-900">3-5 years</option>
                        <option value="5-10" className="text-gray-900">5-10 years</option>
                        <option value="10+" className="text-gray-900">More than 10 years</option>
                      </select>
                      {errors.yearsInBusiness && <p className="text-red-500 text-xs mt-0.5">{errors.yearsInBusiness}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Business Description *</label>
                      <textarea
                        name="businessDescription"
                        value={formData.businessDescription}
                        onChange={handleChange}
                        rows={3}
                        className={`w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.businessDescription ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                        placeholder="Describe your business, products, services, and what makes you unique..."
                      />
                      {errors.businessDescription && <p className="text-red-500 text-xs mt-0.5">{errors.businessDescription}</p>}
                    </div>

                    {/* Operating Hours */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Opening Time</label>
                        <input
                          type="time"
                          value={formData.operatingHours.opening}
                          onChange={(e) => handleNestedChange('operatingHours', 'opening', e.target.value)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Closing Time</label>
                        <input
                          type="time"
                          value={formData.operatingHours.closing}
                          onChange={(e) => handleNestedChange('operatingHours', 'closing', e.target.value)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Working Days</label>
                      <div className="grid grid-cols-4 gap-1">
                        {workingDaysOptions.map(day => (
                          <div key={day.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`day-${day.id}`}
                              checked={formData.operatingHours.workingDays.includes(day.id)}
                              onChange={(e) => {
                                const newWorkingDays = e.target.checked
                                  ? [...formData.operatingHours.workingDays, day.id]
                                  : formData.operatingHours.workingDays.filter(d => d !== day.id);
                                handleNestedChange('operatingHours', 'workingDays', newWorkingDays);
                              }}
                              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`day-${day.id}`} className="ml-1 text-xs text-gray-700">
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Accepted Payment Methods</label>
                      <div className="grid grid-cols-2 gap-1">
                        {paymentOptions.map(method => (
                          <div key={method.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`payment-${method.id}`}
                              checked={formData.paymentMethods.includes(method.id)}
                              onChange={(e) => handleArrayChange('paymentMethods', method.id, e.target.checked)}
                              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`payment-${method.id}`} className="ml-1 text-xs text-gray-700">
                              {method.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Years in Transport Business</label>
                      <select
                        name="yearsInBusiness"
                        value={formData.yearsInBusiness}
                        onChange={handleChange}
                        className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Services Description</label>
                      <textarea
                        name="businessDescription"
                        value={formData.businessDescription}
                        onChange={handleChange}
                        rows={3}
                        className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
                        placeholder="Describe your transport services, areas covered, specialties, and any additional services you offer..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Radius (km)</label>
                      <input
                        type="number"
                        name="deliveryRadius"
                        value={formData.deliveryRadius}
                        onChange={handleChange}
                        className="w-full p-2 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-colors"
                        placeholder="Maximum delivery distance in kilometers"
                        min="0"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Enhanced Security Information */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-gray-400"><FaLock size={12} /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`pl-8 pr-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      } text-gray-900`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-0.5">{errors.password}</p>}
                  <PasswordStrengthIndicator strength={passwordStrength} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-gray-400"><FaLock size={12} /></span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`pl-8 pr-8 w-full p-2 text-xs border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      } text-gray-900`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-0.5">{errors.confirmPassword}</p>}
                </div>

                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <h3 className="text-xs font-medium text-blue-800 mb-1">Account Security Tips</h3>
                  <ul className="text-xs text-blue-600 space-y-0.5">
                    <li className="flex items-center">
                      <FaCheck className="mr-1 text-green-500" size={10} />
                      Use uppercase, lowercase, numbers, and symbols
                    </li>
                    <li className="flex items-center">
                      <FaCheck className="mr-1 text-green-500" size={10} />
                      Avoid personal information
                    </li>
                    <li className="flex items-center">
                      <FaCheck className="mr-1 text-green-500" size={10} />
                      Minimum 6 characters
                    </li>
                  </ul>
                </div>

                {/* Final Review Section */}
                <div className="bg-gray-50 p-3 rounded-md border">
                  <h3 className="text-xs font-medium text-gray-800 mb-2">Review Your Information</h3>
                  <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                    <div><strong>Name:</strong> {formData.firstName} {formData.lastName}</div>
                    <div><strong>Email:</strong> {formData.email}</div>
                    <div><strong>Phone:</strong> {formData.phone}</div>
                    <div><strong>Role:</strong> {formData.role}</div>
                    {formData.businessName && <div><strong>Business:</strong> {formData.businessName}</div>}
                    {formData.city && <div><strong>Location:</strong> {formData.city}, {formData.country}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Error Display */}
            {errors.submit && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-red-400 mr-2" size={12} />
                  <p className="text-red-700 text-xs font-medium">{errors.submit}</p>
                </div>
                {errors.submit.includes('Cannot connect') && (
                  <div className="mt-1 text-red-600 text-xs">
                    <p><strong>Troubleshooting:</strong></p>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                      <li>Check if backend is running on {API_BASE_URL}</li>
                      <li>Verify server configuration</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Debug Tools Section */}
            <div className="mt-4 p-4 border-t border-gray-200 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 mb-2 font-medium">Debug Tools:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={debugFormData}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-xs"
                >
                  Debug Form Data
                </button>
                <button
                  type="button"
                  onClick={testMinimalRegistration}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                >
                  Test Registration
                </button>
              </div>
            </div>

            {/* Enhanced Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between pt-4 border-t border-gray-200 space-y-2 sm:space-y-0">
              <button
                type="button"
                onClick={currentStep === 1 ? () => navigate('/') : prevStep}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200 text-xs font-medium flex items-center justify-center order-2 sm:order-1"
              >
                {currentStep === 1 ? 'Cancel Registration' : 'Back'}
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-xs font-medium shadow hover:shadow-md order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Processing...
                  </>
                ) : currentStep === totalSteps ? (
                  <>
                    Create Account
                    <FaCheck className="ml-1" size={12} />
                  </>
                ) : (
                  <>
                    Continue
                    <FaChevronRight className="ml-1" size={10} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Enhanced Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-600">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            By creating an account, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;