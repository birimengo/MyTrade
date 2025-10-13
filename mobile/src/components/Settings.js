// src/components/Settings.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

const { width } = Dimensions.get('window');

// Simple SVG Icons using the same approach as Overview.js
const ExclamationTriangleIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.triangle, { borderBottomColor: color }]} />
    <View style={[styles.exclamation, { backgroundColor: color }]} />
    <View style={[styles.exclamationDot, { backgroundColor: color }]} />
  </View>
);

const CheckCircleIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.circle, { borderColor: color }]} />
    <View style={[styles.check, { borderColor: color }]} />
  </View>
);

const InfoCircleIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.circle, { borderColor: color }]} />
    <View style={[styles.infoDot, { backgroundColor: color }]} />
    <View style={[styles.infoLine, { backgroundColor: color }]} />
  </View>
);

const EyeIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.eye, { borderColor: color }]} />
    <View style={[styles.eyePupil, { backgroundColor: color }]} />
  </View>
);

const EyeSlashIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.eye, { borderColor: color }]} />
    <View style={[styles.eyePupil, { backgroundColor: color }]} />
    <View style={[styles.eyeSlash, { backgroundColor: color }]} />
  </View>
);

const ChevronDownIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.chevron, { borderColor: color }]} />
  </View>
);

const UndoIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.undoArrow, { borderColor: color }]} />
    <View style={[styles.undoLine, { backgroundColor: color }]} />
  </View>
);

const SaveIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.save, { borderColor: color }]} />
    <View style={[styles.saveLine, { backgroundColor: color }]} />
  </View>
);

const TruckIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.truckBody, { backgroundColor: color }]} />
    <View style={[styles.truckCab, { backgroundColor: color }]} />
    <View style={[styles.truckWindow, { backgroundColor: '#FFFFFF' }]} />
  </View>
);

const StoreIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.store, { borderColor: color }]} />
    <View style={[styles.storeRoof, { backgroundColor: color }]} />
    <View style={[styles.storeDoor, { backgroundColor: color }]} />
  </View>
);

const BuildingIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.building, { borderColor: color }]} />
    <View style={[styles.buildingWindow, { backgroundColor: color }]} />
    <View style={[styles.buildingWindow, { backgroundColor: color, top: 8 }]} />
  </View>
);

const UserIcon = ({ size = 24, color = "#000000" }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.userHead, { backgroundColor: color }]} />
    <View style={[styles.userBody, { backgroundColor: color }]} />
  </View>
);

const Settings = () => {
  const { user, updateUser, getAuthHeaders, API_BASE_URL } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', details: '' });

  // Profile form state
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

  // Password form state
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

  const validateField = useCallback((name, value) => {
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
  }, [user, formData.companyType]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const handleInputChange = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field in real-time if it's been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, formData[name]);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [formData, validateField]);

  const handlePasswordChange = useCallback((name, value) => {
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  const handleProfileUpdate = async () => {
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

    // Filter out unchanged fields
    const payload = Object.keys(formData).reduce((acc, key) => {
      if (formData[key] !== user[key]) {
        acc[key] = formData[key];
      }
      return acc;
    }, {});

    // If no changes
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

  const handlePasswordUpdate = async () => {
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

  const resetForm = useCallback(() => {
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
    setErrors({});
    setTouched({});
    setMessage({ type: '', text: '', details: '' });
    setIsDirty(false);
  }, [user]);

  const getRoleIcon = useCallback(() => {
    switch(user.role) {
      case 'transporter':
        return <TruckIcon size={24} color="#FFFFFF" />;
      case 'retailer':
        return <StoreIcon size={24} color="#FFFFFF" />;
      case 'wholesaler':
      case 'supplier':
        return <BuildingIcon size={24} color="#FFFFFF" />;
      default:
        return <UserIcon size={24} color="#FFFFFF" />;
    }
  }, [user]);

  const getRoleLabel = useCallback(() => {
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
  }, [user]);

  const getRoleColor = useCallback(() => {
    switch(user.role) {
      case 'transporter':
        return '#3B82F6';
      case 'retailer':
        return '#10B981';
      case 'wholesaler':
        return '#8B5CF6';
      case 'supplier':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  }, [user]);

  // Memoized InputField component
  const InputField = useCallback(({ label, name, value, onChange, onBlur, error, touched, secureTextEntry, keyboardType = 'default', placeholder, ...props }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, isDarkMode && styles.darkInputLabel]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          isDarkMode && styles.darkInput,
          error && touched && styles.inputError
        ]}
        value={value}
        onChangeText={(text) => onChange(name, text)}
        onBlur={() => onBlur(name)}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
        placeholder={placeholder}
        {...props}
      />
      {error && touched && (
        <View style={styles.errorContainer}>
          <ExclamationTriangleIcon size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  ), [isDarkMode]);

  // Memoized PasswordField component
  const PasswordField = useCallback(({ label, name, value, onChange, showPassword, onToggle, placeholder, ...props }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, isDarkMode && styles.darkInputLabel]}>
        {label}
      </Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.input,
            styles.passwordInput,
            isDarkMode && styles.darkInput,
          ]}
          value={value}
          onChangeText={(text) => onChange(name, text)}
          secureTextEntry={!showPassword}
          placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          placeholder={placeholder}
          {...props}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={onToggle}
        >
          {showPassword ? (
            <EyeSlashIcon size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          ) : (
            <EyeIcon size={20} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  ), [isDarkMode]);

  const SelectField = useCallback(({ label, name, value, onChange, onBlur, error, touched, options, ...props }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, isDarkMode && styles.darkInputLabel]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.selectContainer,
          isDarkMode && styles.darkSelectContainer,
          error && touched && styles.inputError
        ]}
        onPress={() => {}} // You can implement dropdown functionality here
      >
        <Text style={[
          styles.selectText,
          !value && styles.placeholderText,
          isDarkMode && styles.darkSelectText
        ]}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
        <ChevronDownIcon size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
      {error && touched && (
        <View style={styles.errorContainer}>
          <ExclamationTriangleIcon size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  ), [isDarkMode]);

  const MessageAlert = useCallback(() => {
    if (!message.text) return null;
    
    const alertConfig = {
      success: {
        bg: '#D1FAE5',
        text: '#065F46',
        border: '#10B981',
        icon: <CheckCircleIcon size={24} color="#10B981" />,
      },
      error: {
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#EF4444',
        icon: <ExclamationTriangleIcon size={24} color="#EF4444" />,
      },
      warning: {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#F59E0B',
        icon: <ExclamationTriangleIcon size={24} color="#F59E0B" />,
      },
      info: {
        bg: '#DBEAFE',
        text: '#1E40AF',
        border: '#3B82F6',
        icon: <InfoCircleIcon size={24} color="#3B82F6" />,
      }
    };
    
    const config = alertConfig[message.type] || alertConfig.info;
    
    return (
      <View style={[
        styles.alertContainer,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        }
      ]}>
        {config.icon}
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: config.text }]}>
            {message.text}
          </Text>
          {message.details && (
            <Text style={[styles.alertDetails, { color: config.text }]}>
              {message.details}
            </Text>
          )}
        </View>
      </View>
    );
  }, [message]);

  const renderProfileForm = useMemo(() => (
    <ScrollView 
      style={styles.formContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
          Personal Information
        </Text>
        
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <InputField
              label="First Name *"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.firstName}
              touched={touched.firstName}
              placeholder="Enter your first name"
            />
          </View>
          <View style={styles.halfInput}>
            <InputField
              label="Last Name *"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.lastName}
              touched={touched.lastName}
              placeholder="Enter your last name"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <InputField
              label="Email *"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.email}
              touched={touched.email}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="your.email@example.com"
            />
          </View>
          <View style={styles.halfInput}>
            <InputField
              label="Phone *"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.phone}
              touched={touched.phone}
              keyboardType="phone-pad"
              placeholder="+1 (555) 123-4567"
            />
          </View>
        </View>

        {user.role !== 'transporter' && (
          <InputField
            label="Business Name *"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            error={errors.businessName}
            touched={touched.businessName}
            placeholder="Your business name"
          />
        )}

        <InputField
          label="Address *"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          onBlur={handleBlur}
          error={errors.address}
          touched={touched.address}
          placeholder="Street address, P.O. box, company name"
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <InputField
              label="City *"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.city}
              touched={touched.city}
              placeholder="City name"
            />
          </View>
          <View style={styles.halfInput}>
            <InputField
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Country name"
            />
          </View>
        </View>

        <InputField
          label="Tax ID"
          name="taxId"
          value={formData.taxId}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Tax identification number"
        />

        {['retailer', 'wholesaler', 'supplier'].includes(user.role) && (
          <InputField
            label="Product Category *"
            name="productCategory"
            value={formData.productCategory}
            onChange={handleInputChange}
            onBlur={handleBlur}
            error={errors.productCategory}
            touched={touched.productCategory}
            placeholder="e.g., Electronics, Clothing, Food"
          />
        )}

        {user.role === 'transporter' && (
          <>
            <InputField
              label="Plate Number *"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleInputChange}
              onBlur={handleBlur}
              error={errors.plateNumber}
              touched={touched.plateNumber}
              placeholder="Vehicle license plate"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <SelectField
                  label="Company Type *"
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  error={errors.companyType}
                  touched={touched.companyType}
                  options={[
                    { label: 'Individual', value: 'individual' },
                    { label: 'Company', value: 'company' }
                  ]}
                />
              </View>
              <View style={styles.halfInput}>
                <SelectField
                  label="Vehicle Type *"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  error={errors.vehicleType}
                  touched={touched.vehicleType}
                  options={[
                    { label: 'Truck', value: 'truck' },
                    { label: 'Motorcycle', value: 'motorcycle' },
                    { label: 'Van', value: 'van' },
                    { label: 'Car', value: 'car' },
                    { label: 'Bicycle', value: 'bicycle' }
                  ]}
                />
              </View>
            </View>

            {formData.companyType === 'company' && (
              <InputField
                label="Company Name *"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                onBlur={handleBlur}
                error={errors.companyName}
                touched={touched.companyName}
                placeholder="Your company name"
              />
            )}
          </>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, !isDirty && styles.buttonDisabled]}
          onPress={resetForm}
          disabled={!isDirty || loading}
        >
          <UndoIcon size={18} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.buttonText, styles.secondaryButtonText]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Reset</Text></Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, (!isDirty || loading) && styles.buttonDisabled]}
          onPress={handleProfileUpdate}
          disabled={!isDirty || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <SaveIcon size={18} color="#FFFFFF" />
          )}
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  ), [formData, errors, touched, isDirty, loading, isDarkMode, user, handleInputChange, handleBlur, resetForm, handleProfileUpdate]);

  const renderPasswordForm = useMemo(() => (
    <ScrollView 
      style={styles.formContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.darkSectionTitle]}>
          Change Password
        </Text>

        <PasswordField
          label="Current Password *"
          name="currentPassword"
          value={passwordData.currentPassword}
          onChange={handlePasswordChange}
          showPassword={showPassword.current}
          onToggle={() => togglePasswordVisibility('current')}
          placeholder="Enter your current password"
        />

        <PasswordField
          label="New Password *"
          name="newPassword"
          value={passwordData.newPassword}
          onChange={handlePasswordChange}
          showPassword={showPassword.new}
          onToggle={() => togglePasswordVisibility('new')}
          placeholder="At least 8 characters"
        />

        <PasswordField
          label="Confirm New Password *"
          name="confirmPassword"
          value={passwordData.confirmPassword}
          onChange={handlePasswordChange}
          showPassword={showPassword.confirm}
          onToggle={() => togglePasswordVisibility('confirm')}
          placeholder="Confirm your new password"
        />

        <View style={[styles.passwordHint, isDarkMode && styles.darkPasswordHint]}>
          <InfoCircleIcon size={16} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.hintText, isDarkMode && styles.darkHintText]}>
            Use at least 8 characters with a mix of letters, numbers & symbols
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handlePasswordUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <SaveIcon size={18} color="#FFFFFF" />
          )}
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            {loading ? 'Updating...' : 'Update Password'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  ), [passwordData, showPassword, loading, isDarkMode, handlePasswordChange, togglePasswordVisibility, handlePasswordUpdate]);

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: getRoleColor() }]}>
          {getRoleIcon()}
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, isDarkMode && styles.darkTitle]}>
            Account Settings
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.darkSubtitle]}>
            Manage your {getRoleLabel().toLowerCase()} account information and security
          </Text>
        </View>
      </View>

      <MessageAlert />

      {/* Tabs */}
      <View style={[styles.tabContainer, isDarkMode && styles.darkTabContainer]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[
            styles.tabText,
            isDarkMode && styles.darkTabText,
            activeTab === 'profile' && styles.activeTabText
          ]}>
            Profile Information
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'password' && styles.activeTab]}
          onPress={() => setActiveTab('password')}
        >
          <Text style={[
            styles.tabText,
            isDarkMode && styles.darkTabText,
            activeTab === 'password' && styles.activeTabText
          ]}>
            Change Password
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'profile' ? renderProfileForm : renderPasswordForm}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 8,
  },
  darkContainer: {
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  darkTitle: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  darkSubtitle: {
    color: '#9CA3AF',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkTabContainer: {
    borderBottomColor: '#374151',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  darkTabText: {
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  formSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  darkSectionTitle: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  darkInputLabel: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  selectContainer: {
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
  darkSelectContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  selectText: {
    fontSize: 16,
    color: '#374151',
  },
  darkSelectText: {
    color: '#FFFFFF',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  darkPasswordHint: {
    backgroundColor: '#374151',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  darkHintText: {
    color: '#9CA3AF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#374151',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    margin: 20,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDetails: {
    fontSize: 12,
    opacity: 0.9,
  },
  // SVG Icon Styles - Using the same simple approach as Overview.js
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
  },
  exclamation: {
    width: 2,
    height: 6,
    position: 'absolute',
    top: 4,
  },
  exclamationDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    top: 12,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    position: 'absolute',
  },
  check: {
    width: 6,
    height: 10,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    top: 3,
    left: 6,
  },
  infoDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    top: 7,
  },
  infoLine: {
    width: 2,
    height: 8,
    position: 'absolute',
    top: 12,
  },
  eye: {
    width: 16,
    height: 10,
    borderRadius: 8,
    borderWidth: 2,
    position: 'absolute',
  },
  eyePupil: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 3,
    left: 4,
  },
  eyeSlash: {
    width: 16,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    top: 4,
    transform: [{ rotate: '45deg' }],
  },
  chevron: {
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    marginTop: -2,
  },
  undoArrow: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRadius: 1,
    position: 'absolute',
  },
  undoLine: {
    width: 10,
    height: 2,
    position: 'absolute',
    right: 0,
    top: 7,
  },
  save: {
    width: 12,
    height: 14,
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
  },
  saveLine: {
    width: 6,
    height: 2,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  truckBody: {
    width: 16,
    height: 8,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  },
  truckCab: {
    width: 8,
    height: 6,
    borderRadius: 2,
    position: 'absolute',
    left: 8,
    bottom: 4,
  },
  truckWindow: {
    width: 4,
    height: 3,
    borderRadius: 1,
    position: 'absolute',
    left: 9,
    bottom: 6,
  },
  store: {
    width: 16,
    height: 12,
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
  },
  storeRoof: {
    width: 12,
    height: 4,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  storeDoor: {
    width: 4,
    height: 6,
    borderRadius: 1,
    position: 'absolute',
    bottom: 2,
    left: 6,
  },
  building: {
    width: 14,
    height: 16,
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
  },
  buildingWindow: {
    width: 2,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    left: 4,
  },
  userHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 2,
  },
  userBody: {
    width: 12,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    bottom: 2,
  },
});

export default Settings;