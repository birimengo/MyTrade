// src/screens/Signup.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { 
  Path, Circle, Rect, Line 
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// API Configuration
const API_BASE_URL = 'https://mytrade-cx5z.onrender.com'; // Your backend URL

// SVG Icons (all existing SVG icons remain the same)
const UserIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const EmailIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const PhoneIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92V19.92C22 20.52 21.49 21.03 20.89 21.05C20.39 21.07 19.89 21.09 19.39 21.11C16.15 21.23 13.01 20.44 10.42 18.88C8.47 17.69 6.87 16.09 5.68 14.14C4.12 11.55 3.33 8.41 3.45 5.17C3.47 4.67 3.49 4.17 3.51 3.67C3.53 3.07 4.04 2.56 4.64 2.56H7.64C8.24 2.56 8.73 3.05 8.81 3.64C8.93 4.59 9.12 5.53 9.38 6.45C9.5 6.94 9.32 7.46 8.92 7.76L7.5 8.89C8.91 11.73 11.27 14.09 14.11 15.5L15.24 14.08C15.54 13.68 16.06 13.5 16.55 13.62C17.47 13.88 18.41 14.07 19.36 14.19C19.95 14.27 20.44 14.76 20.44 15.36L20.44 15.36Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const LockIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2"/>
    <Path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const MapIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 6V22L8 18L16 22L23 18V2L16 6L8 2L1 6Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M8 2V18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M16 6V22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const StoreIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9 22V12H15V22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const BoxIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M3.27002 6.96002L12 12L20.73 6.96002" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 22.08V12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const TruckIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 17V7C10 6.46957 10.2107 5.96086 10.5858 5.58579C10.9609 5.21071 11.4696 5 12 5H19C19.5304 5 20.0391 5.21071 20.4142 5.58579C20.7893 5.96086 21 6.46957 21 7V17H10Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M10 17H3V13H10M21 17V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21C18.4696 21 17.9609 20.7893 17.5858 20.4142C17.2107 20.0391 17 19.5304 17 19M7 21C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const BuildingIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21V5C19 4.46957 18.7893 3.96086 18.4142 3.58579C18.0391 3.21071 17.5304 3 17 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M3 21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9 8H10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9 12H10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9 16H10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M14 8H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M14 12H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M14 16H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const IdCardIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2"/>
    <Path d="M8 12H16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Path d="M8 8H12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Path d="M8 16H14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
);

const EyeIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const EyeSlashIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.12 14.12C13.8454 14.4147 13.5141 14.6511 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.481 9.80385 14.1961C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34885 10.4858 9.58525 10.1546 9.88 9.88" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68189 3.96914 7.65661 6.06 6.06" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M19 5L5 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2047 20.84 15.19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const CheckIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ArrowLeftIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 19L5 12L12 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ArrowRightIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 5L19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const WarningIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const Signup = () => {
  const navigation = useNavigation();
  const route = useRoute();
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
    termsAccepted: false,
    marketingEmails: false,
    emergencyContact: '',
    website: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(4);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [debugInfo, setDebugInfo] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showYearsModal, setShowYearsModal] = useState(false);

  // Updated Data structures with improved categories and years in business
  const yearsInBusinessOptions = [
    { value: 'less_than_1', label: 'Less than 1 year' },
    { value: '1_2', label: '1 - 2 years' },
    { value: '2_3', label: '2 - 3 years' },
    { value: '3_5', label: '3 - 5 years' },
    { value: 'more_than_5', label: 'More than 5 years' }
  ];

  // Unified product categories for all business roles
  const productCategories = [
    'Electronics',
    'Electronics & Gadgets',
    'Food & Groceries',
    'Clothing & Fashion',
    'Home & Kitchen',
    'Health & Beauty',
    'Sports & Outdoors',
    'Books & Stationery',
    'Automotive Parts',
    'Baby & Kids Products',
    'Jewelry & Accessories',
    'Furniture & Decor',
    'Pet Supplies',
    'Office Supplies',
    'Electrical Appliances',
    'Building Materials',
    'Agricultural Supplies',
    'Pharmaceuticals',
    'Industrial Equipment',
    'Textiles & Fabrics',
    'Beauty & Personal Care',
    'Other'
  ];

  const vehicleTypes = [
    { id: 'truck', label: 'Truck', description: 'Heavy goods transportation' },
    { id: 'motorcycle', label: 'Motorcycle', description: 'Quick deliveries and small packages' },
    { id: 'van', label: 'Van', description: 'Medium-sized goods and parcels' }
  ];

  const businessTypes = [
    { id: 'individual', label: 'Individual', description: 'Sole proprietor or freelancer' },
    { id: 'partnership', label: 'Partnership', description: 'Business partnership' },
    { id: 'company', label: 'Company', description: 'Registered company' },
    { id: 'cooperative', label: 'Cooperative', description: 'Business cooperative' }
  ];

  // Set preselected role
  useEffect(() => {
    if (route.params?.preSelectedRole) {
      setPreSelectedRole(route.params.preSelectedRole);
      setFormData(prev => ({ ...prev, role: route.params.preSelectedRole }));
    } else {
      navigation.navigate('RoleSelection');
    }
  }, [route.params, navigation]);

  useEffect(() => {
    setTotalSteps(preSelectedRole === 'transporter' ? 4 : 4);
  }, [preSelectedRole]);

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

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
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
    
    if (companyType === 'individual') {
      setFormData(prev => ({
        ...prev,
        companyName: ''
      }));
    }
  };

  const handleCategorySelect = (category) => {
    setFormData(prev => ({
      ...prev,
      productCategory: category
    }));
    setShowCategoryModal(false);
    
    if (errors.productCategory) {
      setErrors(prev => ({
        ...prev,
        productCategory: ''
      }));
    }
  };

  const handleYearsSelect = (years) => {
    setFormData(prev => ({
      ...prev,
      yearsInBusiness: years
    }));
    setShowYearsModal(false);
    
    if (errors.yearsInBusiness) {
      setErrors(prev => ({
        ...prev,
        yearsInBusiness: ''
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
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Enhanced API call with debugging
  const registerUser = async (userData) => {
    try {
      console.log('🔄 Starting registration process...');
      console.log('📤 Sending data to:', `${API_BASE_URL}/api/auth/register`);
      console.log('📦 Request payload:', JSON.stringify(userData, null, 2));

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('📨 Response status:', response.status);
      console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📨 Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Response: ${responseText}`);
      }

      console.log('📨 Parsed response data:', data);

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors = {};
          data.errors.forEach(error => {
            if (error.path) {
              fieldErrors[error.path] = error.msg || error.message;
            }
          });
          setErrors(fieldErrors);
          throw new Error('Please fix the validation errors above');
        }
        throw new Error(data.message || `Registration failed with status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Registration API error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    if (currentStep < totalSteps) {
      nextStep();
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    setDebugInfo('');

    try {
      console.log('🚀 Starting final registration...');
      
      // Prepare registration data - only send what backend expects
      const registrationData = {
        role: formData.role,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country,
        termsAccepted: formData.termsAccepted,
      };

      // Add role-specific fields
      if (formData.role !== 'transporter') {
        registrationData.businessName = formData.businessName?.trim() || '';
        registrationData.taxId = formData.taxId?.trim() || '';
        registrationData.productCategory = formData.productCategory || '';
        registrationData.businessRegistration = formData.businessRegistration?.trim() || '';
        registrationData.yearsInBusiness = formData.yearsInBusiness || '';
        registrationData.businessDescription = formData.businessDescription?.trim() || '';
      } else {
        registrationData.plateNumber = formData.plateNumber?.trim() || '';
        registrationData.companyType = formData.companyType;
        registrationData.vehicleType = formData.vehicleType || '';
        if (formData.companyName && formData.companyName.trim() !== '') {
          registrationData.companyName = formData.companyName.trim();
        }
      }

      // Add optional fields
      if (formData.emergencyContact?.trim()) {
        registrationData.emergencyContact = formData.emergencyContact.trim();
      }
      if (formData.website?.trim()) {
        registrationData.website = formData.website.trim();
      }

      console.log('📤 Final registration data:', registrationData);

      // Call the API
      const result = await registerUser(registrationData);

      console.log('✅ Registration successful:', result);

      // Success - navigate to login
      navigation.navigate('Login', {
        message: 'Registration successful! Please log in.',
        registeredEmail: formData.email
      });
      
    } catch (error) {
      console.error('💥 Registration failed:', error);
      setDebugInfo(`Error: ${error.message}`);
      
      if (error.message.includes('validation errors')) {
        // Validation errors are already set in the state
        setErrors(prev => ({
          ...prev,
          submit: 'Please fix the validation errors above'
        }));
      } else if (error.message.includes('User already exists')) {
        setErrors({ 
          submit: 'An account with this email already exists. Please use a different email or login.'
        });
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        setErrors({ 
          submit: 'Network error. Please check your internet connection and try again.'
        });
      } else {
        setErrors({ 
          submit: error.message || 'Registration failed. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!preSelectedRole) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading registration form...</Text>
      </SafeAreaView>
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

  // Password Strength Indicator
  const PasswordStrengthIndicator = ({ strength }) => {
    if (!strength) return null;
    
    const strengthConfig = {
      'Weak': { color: '#EF4444', width: '25%' },
      'Medium': { color: '#F59E0B', width: '50%' },
      'Strong': { color: '#3B82F6', width: '75%' },
      'Very Strong': { color: '#10B981', width: '100%' }
    };
    
    const config = strengthConfig[strength] || strengthConfig.Weak;
    
    return (
      <View style={styles.passwordStrengthContainer}>
        <Text style={[styles.passwordStrengthText, { color: config.color }]}>
          Password Strength: {strength}
        </Text>
        <View style={styles.passwordStrengthBar}>
          <View 
            style={[
              styles.passwordStrengthFill,
              { backgroundColor: config.color, width: config.width }
            ]} 
          />
        </View>
      </View>
    );
  };

  // Selection Modal Component
  const SelectionModal = ({ visible, title, items, selectedValue, onSelect, onClose }) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {items.map((item, index) => {
              const value = typeof item === 'string' ? item : item.value;
              const label = typeof item === 'string' ? item : item.label;
              const isSelected = selectedValue === value;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected
                  ]}
                  onPress={() => onSelect(value)}
                >
                  <Text style={[
                    styles.modalItemText,
                    isSelected && styles.modalItemTextSelected
                  ]}>
                    {label}
                  </Text>
                  {isSelected && (
                    <CheckIcon color="#3B82F6" size={16} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeftIcon color="#6B7280" size={16} />
            <Text style={styles.backButtonText}>Back to role selection</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Registering as {preSelectedRole}</Text>
          
          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.progressSteps}>
              {[...Array(totalSteps)].map((_, i) => (
                <View key={i} style={styles.stepContainer}>
                  <View style={[
                    styles.stepCircle,
                    currentStep > i + 1 && styles.stepCircleCompleted,
                    currentStep === i + 1 && styles.stepCircleActive,
                  ]}>
                    {currentStep > i + 1 ? (
                      <CheckIcon color="#FFFFFF" size={12} />
                    ) : (
                      <Text style={styles.stepNumber}>{i + 1}</Text>
                    )}
                  </View>
                  {i < totalSteps - 1 && (
                    <View style={[
                      styles.stepLine,
                      currentStep > i + 1 && styles.stepLineCompleted
                    ]} />
                  )}
                </View>
              ))}
            </View>
            <View style={styles.stepLabels}>
              <Text style={styles.stepLabel}>Personal</Text>
              <Text style={styles.stepLabel}>Business</Text>
              <Text style={styles.stepLabel}>Profile</Text>
              <Text style={styles.stepLabel}>Security</Text>
            </View>
          </View>
        </View>

        {/* Debug Info - Only show in development */}
        {__DEV__ && debugInfo ? (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Debug: {debugInfo}</Text>
          </View>
        ) : null}

        {/* Form Container */}
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{getStepTitle()}</Text>
            <Text style={styles.formSubtitle}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.row}>
                <View style={styles.inputContainerHalf}>
                  <Text style={styles.label}>First Name *</Text>
                  <View style={styles.inputWrapper}>
                    <UserIcon color="#9CA3AF" size={16} />
                    <TextInput
                      style={[
                        styles.input,
                        errors.firstName && styles.inputError
                      ]}
                      placeholder="First name"
                      value={formData.firstName}
                      onChangeText={(value) => handleChange('firstName', value)}
                    />
                  </View>
                  {errors.firstName && (
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  )}
                </View>

                <View style={styles.inputContainerHalf}>
                  <Text style={styles.label}>Last Name *</Text>
                  <View style={styles.inputWrapper}>
                    <UserIcon color="#9CA3AF" size={16} />
                    <TextInput
                      style={[
                        styles.input,
                        errors.lastName && styles.inputError
                      ]}
                      placeholder="Last name"
                      value={formData.lastName}
                      onChangeText={(value) => handleChange('lastName', value)}
                    />
                  </View>
                  {errors.lastName && (
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  )}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={styles.inputWrapper}>
                  <EmailIcon color="#9CA3AF" size={16} />
                  <TextInput
                    style={[
                      styles.input,
                      errors.email && styles.inputError
                    ]}
                    placeholder="email@example.com"
                    value={formData.email}
                    onChangeText={(value) => handleChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.inputWrapper}>
                  <PhoneIcon color="#9CA3AF" size={16} />
                  <TextInput
                    style={[
                      styles.input,
                      errors.phone && styles.inputError
                    ]}
                    placeholder="+256 XXX XXX XXX"
                    value={formData.phone}
                    onChangeText={(value) => handleChange('phone', value)}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Emergency Contact (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <PhoneIcon color="#9CA3AF" size={16} />
                  <TextInput
                    style={styles.input}
                    placeholder="Emergency contact number"
                    value={formData.emergencyContact}
                    onChangeText={(value) => handleChange('emergencyContact', value)}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Terms and Conditions */}
              <View style={styles.termsContainer}>
                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.termsAccepted}
                    onValueChange={(value) => handleChange('termsAccepted', value)}
                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={formData.termsAccepted ? '#FFFFFF' : '#FFFFFF'}
                  />
                  <Text style={styles.termsText}>
                    I agree to the Terms and Conditions and Privacy Policy *
                  </Text>
                </View>
                {errors.termsAccepted && (
                  <Text style={styles.errorText}>{errors.termsAccepted}</Text>
                )}

                <View style={styles.checkboxRow}>
                  <Switch
                    value={formData.marketingEmails}
                    onValueChange={(value) => handleChange('marketingEmails', value)}
                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={formData.marketingEmails ? '#FFFFFF' : '#FFFFFF'}
                  />
                  <Text style={styles.termsText}>
                    I would like to receive marketing emails and updates
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Business/Transport Information */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              {preSelectedRole !== 'transporter' ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Business Name *</Text>
                    <View style={styles.inputWrapper}>
                      <StoreIcon color="#9CA3AF" size={16} />
                      <TextInput
                        style={[
                          styles.input,
                          errors.businessName && styles.inputError
                        ]}
                        placeholder="Business name"
                        value={formData.businessName}
                        onChangeText={(value) => handleChange('businessName', value)}
                      />
                    </View>
                    {errors.businessName && (
                      <Text style={styles.errorText}>{errors.businessName}</Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Business Registration Number *</Text>
                    <View style={styles.inputWrapper}>
                      <IdCardIcon color="#9CA3AF" size={16} />
                      <TextInput
                        style={[
                          styles.input,
                          errors.businessRegistration && styles.inputError
                        ]}
                        placeholder="Registration number"
                        value={formData.businessRegistration}
                        onChangeText={(value) => handleChange('businessRegistration', value)}
                      />
                    </View>
                    {errors.businessRegistration && (
                      <Text style={styles.errorText}>{errors.businessRegistration}</Text>
                    )}
                  </View>

                  {['retailer', 'wholesaler', 'supplier'].includes(preSelectedRole) && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Product Category *</Text>
                      <TouchableOpacity
                        style={[
                          styles.selectorButton,
                          errors.productCategory && styles.inputError
                        ]}
                        onPress={() => setShowCategoryModal(true)}
                      >
                        <View style={styles.selectorButtonContent}>
                          <BoxIcon color="#9CA3AF" size={16} />
                          <Text style={[
                            styles.selectorButtonText,
                            !formData.productCategory && styles.selectorButtonPlaceholder
                          ]}>
                            {formData.productCategory || 'Select product category'}
                          </Text>
                        </View>
                        <ArrowRightIcon color="#9CA3AF" size={16} />
                      </TouchableOpacity>
                      {errors.productCategory && (
                        <Text style={styles.errorText}>{errors.productCategory}</Text>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* Business Type Selection */}
                  <Text style={styles.label}>Business Type *</Text>
                  <View style={styles.gridContainer}>
                    {businessTypes.map((type) => {
                      const isSelected = formData.companyType === type.id;
                      return (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.businessTypeCard,
                            isSelected && styles.businessTypeCardSelected
                          ]}
                          onPress={() => handleBusinessTypeSelect(type.id)}
                        >
                          <View style={[
                            styles.businessTypeIcon,
                            isSelected && styles.businessTypeIconSelected
                          ]}>
                            <BuildingIcon 
                              color={isSelected ? '#3B82F6' : '#6B7280'} 
                              size={20} 
                            />
                          </View>
                          <Text style={[
                            styles.businessTypeLabel,
                            isSelected && styles.businessTypeLabelSelected
                          ]}>
                            {type.label}
                          </Text>
                          <Text style={styles.businessTypeDescription}>
                            {type.description}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {formData.companyType === 'company' && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Company Name *</Text>
                      <View style={styles.inputWrapper}>
                        <BuildingIcon color="#9CA3AF" size={16} />
                        <TextInput
                          style={[
                            styles.input,
                            errors.companyName && styles.inputError
                          ]}
                          placeholder="Transport company name"
                          value={formData.companyName}
                          onChangeText={(value) => handleChange('companyName', value)}
                        />
                      </View>
                      {errors.companyName && (
                        <Text style={styles.errorText}>{errors.companyName}</Text>
                      )}
                    </View>
                  )}

                  {/* Vehicle Type Selection */}
                  <Text style={styles.label}>Select Vehicle Type *</Text>
                  <View style={styles.vehicleTypeContainer}>
                    {vehicleTypes.map((vehicle) => {
                      const isSelected = formData.vehicleType === vehicle.id;
                      return (
                        <TouchableOpacity
                          key={vehicle.id}
                          style={[
                            styles.vehicleTypeCard,
                            isSelected && styles.vehicleTypeCardSelected
                          ]}
                          onPress={() => handleVehicleTypeSelect(vehicle.id)}
                        >
                          <View style={[
                            styles.vehicleTypeIcon,
                            isSelected && styles.vehicleTypeIconSelected
                          ]}>
                            <TruckIcon 
                              color={isSelected ? '#3B82F6' : '#6B7280'} 
                              size={20} 
                            />
                          </View>
                          <View style={styles.vehicleTypeInfo}>
                            <Text style={[
                              styles.vehicleTypeLabel,
                              isSelected && styles.vehicleTypeLabelSelected
                            ]}>
                              {vehicle.label}
                            </Text>
                            <Text style={styles.vehicleTypeDescription}>
                              {vehicle.description}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.vehicleType && (
                    <Text style={styles.errorText}>{errors.vehicleType}</Text>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Plate Number *</Text>
                    <View style={styles.inputWrapper}>
                      <TruckIcon color="#9CA3AF" size={16} />
                      <TextInput
                        style={[
                          styles.input,
                          errors.plateNumber && styles.inputError
                        ]}
                        placeholder="e.g., UAA 123A"
                        value={formData.plateNumber}
                        onChangeText={(value) => handleChange('plateNumber', value)}
                      />
                    </View>
                    {errors.plateNumber && (
                      <Text style={styles.errorText}>{errors.plateNumber}</Text>
                    )}
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Address *</Text>
                <View style={styles.inputWrapper}>
                  <MapIcon color="#9CA3AF" size={16} />
                  <TextInput
                    style={[
                      styles.input,
                      errors.address && styles.inputError
                    ]}
                    placeholder="Street address"
                    value={formData.address}
                    onChangeText={(value) => handleChange('address', value)}
                  />
                </View>
                {errors.address && (
                  <Text style={styles.errorText}>{errors.address}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>City *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.city && styles.inputError
                    ]}
                    placeholder="Select your city"
                    value={formData.city}
                    onChangeText={(value) => handleChange('city', value)}
                  />
                </View>
                {errors.city && (
                  <Text style={styles.errorText}>{errors.city}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.country}
                  editable={false}
                />
              </View>

              {preSelectedRole !== 'transporter' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tax ID (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tax identification number"
                    value={formData.taxId}
                    onChangeText={(value) => handleChange('taxId', value)}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Website (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com"
                  value={formData.website}
                  onChangeText={(value) => handleChange('website', value)}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {/* Step 3: Business Profile */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              {preSelectedRole !== 'transporter' ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Years in Business *</Text>
                    <TouchableOpacity
                      style={[
                        styles.selectorButton,
                        errors.yearsInBusiness && styles.inputError
                      ]}
                      onPress={() => setShowYearsModal(true)}
                    >
                      <View style={styles.selectorButtonContent}>
                        <Text style={[
                          styles.selectorButtonText,
                          !formData.yearsInBusiness && styles.selectorButtonPlaceholder
                        ]}>
                          {formData.yearsInBusiness 
                            ? yearsInBusinessOptions.find(opt => opt.value === formData.yearsInBusiness)?.label 
                            : 'Select years in business'
                          }
                        </Text>
                      </View>
                      <ArrowRightIcon color="#9CA3AF" size={16} />
                    </TouchableOpacity>
                    {errors.yearsInBusiness && (
                      <Text style={styles.errorText}>{errors.yearsInBusiness}</Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Business Description *</Text>
                    <TextInput
                      style={[
                        styles.textArea,
                        errors.businessDescription && styles.inputError
                      ]}
                      placeholder="Describe your business, products, services..."
                      value={formData.businessDescription}
                      onChangeText={(value) => handleChange('businessDescription', value)}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    {errors.businessDescription && (
                      <Text style={styles.errorText}>{errors.businessDescription}</Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Years in Transport Business</Text>
                    <TouchableOpacity
                      style={styles.selectorButton}
                      onPress={() => setShowYearsModal(true)}
                    >
                      <View style={styles.selectorButtonContent}>
                        <Text style={[
                          styles.selectorButtonText,
                          !formData.yearsInBusiness && styles.selectorButtonPlaceholder
                        ]}>
                          {formData.yearsInBusiness 
                            ? yearsInBusinessOptions.find(opt => opt.value === formData.yearsInBusiness)?.label 
                            : 'Select years in business'
                          }
                        </Text>
                      </View>
                      <ArrowRightIcon color="#9CA3AF" size={16} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Services Description</Text>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Describe your transport services..."
                      value={formData.businessDescription}
                      onChangeText={(value) => handleChange('businessDescription', value)}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              )}
            </View>
          )}

          {/* Step 4: Security Information */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.inputWrapper}>
                  <LockIcon color="#9CA3AF" size={16} />
                  <TextInput
                    style={[
                      styles.input,
                      errors.password && styles.inputError
                    ]}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChangeText={(value) => handleChange('password', value)}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeSlashIcon color="#6B7280" size={16} />
                    ) : (
                      <EyeIcon color="#6B7280" size={16} />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
                <PasswordStrengthIndicator strength={passwordStrength} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password *</Text>
                <View style={styles.inputWrapper}>
                  <LockIcon color="#9CA3AF" size={16} />
                  <TextInput
                    style={[
                      styles.input,
                      errors.confirmPassword && styles.inputError
                    ]}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleChange('confirmPassword', value)}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon color="#6B7280" size={16} />
                    ) : (
                      <EyeIcon color="#6B7280" size={16} />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Security Tips */}
              <View style={styles.securityTips}>
                <Text style={styles.securityTipsTitle}>Account Security Tips</Text>
                <View style={styles.securityTip}>
                  <CheckIcon color="#10B981" size={14} />
                  <Text style={styles.securityTipText}>
                    Use uppercase, lowercase, numbers, and symbols
                  </Text>
                </View>
                <View style={styles.securityTip}>
                  <CheckIcon color="#10B981" size={14} />
                  <Text style={styles.securityTipText}>
                    Avoid personal information
                  </Text>
                </View>
                <View style={styles.securityTip}>
                  <CheckIcon color="#10B981" size={14} />
                  <Text style={styles.securityTipText}>
                    Minimum 6 characters
                  </Text>
                </View>
              </View>

              {/* Final Review */}
              <View style={styles.reviewContainer}>
                <Text style={styles.reviewTitle}>Review Your Information</Text>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Name:</Text>
                  <Text style={styles.reviewValue}>
                    {formData.firstName} {formData.lastName}
                  </Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Email:</Text>
                  <Text style={styles.reviewValue}>{formData.email}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Phone:</Text>
                  <Text style={styles.reviewValue}>{formData.phone}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Role:</Text>
                  <Text style={styles.reviewValue}>{formData.role}</Text>
                </View>
                {formData.businessName && (
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Business:</Text>
                    <Text style={styles.reviewValue}>{formData.businessName}</Text>
                  </View>
                )}
                {formData.productCategory && (
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Category:</Text>
                    <Text style={styles.reviewValue}>{formData.productCategory}</Text>
                  </View>
                )}
                {formData.city && (
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Location:</Text>
                    <Text style={styles.reviewValue}>
                      {formData.city}, {formData.country}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Error Display */}
          {errors.submit && (
            <View style={styles.errorContainer}>
              <WarningIcon color="#EF4444" size={16} />
              <Text style={styles.submitErrorText}>{errors.submit}</Text>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.backNavigationButton}
              onPress={currentStep === 1 ? () => navigation.goBack() : prevStep}
            >
              <Text style={styles.backNavigationButtonText}>
                {currentStep === 1 ? 'Cancel Registration' : 'Back'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.continueButton,
                isLoading && styles.continueButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {currentStep === totalSteps ? 'Create Account' : 'Continue'}
                  </Text>
                  {currentStep === totalSteps ? (
                    <CheckIcon color="#FFFFFF" size={16} />
                  ) : (
                    <ArrowRightIcon color="#FFFFFF" size={16} />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text 
              style={styles.footerLink}
              onPress={() => navigation.navigate('Login')}
            >
              Sign in
            </Text>
          </Text>
          <Text style={styles.footerNote}>
            By creating an account, you agree to our Terms and Privacy Policy
          </Text>
        </View>
      </ScrollView>

      {/* Product Category Modal */}
      <SelectionModal
        visible={showCategoryModal}
        title="Select Product Category"
        items={productCategories}
        selectedValue={formData.productCategory}
        onSelect={handleCategorySelect}
        onClose={() => setShowCategoryModal(false)}
      />

      {/* Years in Business Modal */}
      <SelectionModal
        visible={showYearsModal}
        title="Select Years in Business"
        items={yearsInBusinessOptions}
        selectedValue={formData.yearsInBusiness}
        onSelect={handleYearsSelect}
        onClose={() => setShowYearsModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  progressContainer: {
    marginTop: 20,
    width: '100%',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#3B82F6',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    flex: 1,
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  debugText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepContent: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputContainerHalf: {
    flex: 1,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  termsContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  businessTypeCard: {
    flex: 1,
    minWidth: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  businessTypeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  businessTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessTypeIconSelected: {
    backgroundColor: '#DBEAFE',
  },
  businessTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  businessTypeLabelSelected: {
    color: '#1E40AF',
  },
  businessTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  vehicleTypeContainer: {
    gap: 8,
  },
  vehicleTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  vehicleTypeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  vehicleTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleTypeIconSelected: {
    backgroundColor: '#DBEAFE',
  },
  vehicleTypeInfo: {
    flex: 1,
  },
  vehicleTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  vehicleTypeLabelSelected: {
    color: '#1E40AF',
  },
  vehicleTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  eyeButton: {
    padding: 4,
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  securityTips: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 12,
  },
  securityTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  securityTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  securityTipText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  reviewContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  reviewValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  submitErrorText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    marginTop: 16,
  },
  backNavigationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backNavigationButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  continueButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  // New styles for selector buttons
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 12,
  },
  selectorButtonPlaceholder: {
    color: '#9CA3AF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#1E40AF',
    fontWeight: '500',
  },
});

export default Signup;