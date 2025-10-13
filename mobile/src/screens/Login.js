// src/screens/Login.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import Svg, { Path, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// SVG Icons (keep the same icons as before)
const EmailIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const LockIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2"/>
    <Path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const KeyIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2L19 4M11.3891 11.6109C12.3844 12.6062 12.3844 14.2238 11.3891 15.2191C10.3938 16.2144 8.7762 16.2144 7.7809 15.2191C6.7856 14.2238 6.7856 12.6062 7.7809 11.6109C8.7762 10.6156 10.3938 10.6156 11.3891 11.6109ZM11.3891 11.6109L15.5 7.5M15.5 7.5L18.5 4.5L22 2L19.5 4.5L15.5 7.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const UserIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ServerIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2"/>
    <Rect x="6" y="8" width="4" height="4" rx="1" stroke={color} strokeWidth="2"/>
    <Path d="M12 8H18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Path d="M12 12H18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Path d="M12 16H18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
);

const WarningIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const Login = () => {
  const navigation = useNavigation();
  const { login, serverStatus, checkServerStatus } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Check server status on component mount
  useEffect(() => {
    const checkServer = async () => {
      setIsCheckingServer(true);
      await checkServerStatus();
      setIsCheckingServer(false);
    };
    
    checkServer();
  }, [checkServerStatus]);

  const handleChange = (name, value) => {
    console.log(`Changing ${name} to:`, value);
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('Submit button pressed');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      console.log('Starting login process...');
      
      // Use the actual login function from AuthContext
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        console.log('Login successful, navigating to dashboard...');
        
        // Navigate to DashboardRedirect which will handle role-based routing
        navigation.navigate('DashboardRedirect');
        
      } else {
        console.log('Login failed:', result.message);
        setErrors({ submit: result.message });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const retryServerConnection = async () => {
    console.log('Retrying server connection...');
    setIsCheckingServer(true);
    await checkServerStatus();
    setIsCheckingServer(false);
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed');
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    console.log('Register pressed - navigating to RoleSelection');
    navigation.navigate('RoleSelection');
  };

  const handleShowPassword = () => {
    console.log('Toggle password visibility');
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>T</Text>
            </View>
          </View>
          <Text style={styles.title}>TRADE UGANDA</Text>
          <Text style={styles.subtitle}>
            Uganda's Premier B2B E-Commerce Platform
          </Text>
        </View>

        {/* Server Status */}
        {serverStatus === 'offline' && (
          <TouchableOpacity 
            style={styles.serverOfflineContainer}
            onPress={retryServerConnection}
            activeOpacity={0.7}
          >
            <ServerIcon color="#EF4444" size={20} />
            <View style={styles.serverOfflineText}>
              <Text style={styles.serverOfflineTitle}>Server offline</Text>
              <Text style={styles.serverOfflineMessage}>
                Cannot connect to backend server
              </Text>
              <Text style={styles.retryLink}>Tap to retry connection</Text>
            </View>
          </TouchableOpacity>
        )}

        {isCheckingServer && (
          <View style={styles.serverCheckingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.serverCheckingText}>Checking server connection...</Text>
          </View>
        )}

        {/* Login Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email address</Text>
            <View style={[
              styles.inputWrapper,
              errors.email && styles.inputError
            ]}>
              <EmailIcon color="#9CA3AF" size={16} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={serverStatus !== 'offline' && !isLoading}
                returnKeyType="next"
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputWrapper,
              errors.password && styles.inputError
            ]}>
              <LockIcon color="#9CA3AF" size={16} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                secureTextEntry={!showPassword}
                editable={serverStatus !== 'offline' && !isLoading}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleShowPassword}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeButtonText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPasswordLink}
            onPress={handleForgotPassword}
            activeOpacity={0.7}
          >
            <KeyIcon color="#3B82F6" size={14} />
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Submit Error */}
          {errors.submit && (
            <View style={styles.errorContainer}>
              <WarningIcon color="#EF4444" size={16} />
              <Text style={styles.submitErrorText}>{errors.submit}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (serverStatus === 'offline' || isLoading) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={serverStatus === 'offline' || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New to Trade Uganda?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              serverStatus === 'offline' && styles.registerButtonDisabled
            ]}
            onPress={handleRegister}
            disabled={serverStatus === 'offline'}
            activeOpacity={0.7}
          >
            <UserIcon color="#374151" size={16} />
            <Text style={styles.registerButtonText}>Create a new account</Text>
          </TouchableOpacity>
        </View>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Server: {serverStatus}</Text>
          <Text style={styles.debugText}>Loading: {isLoading ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Checking Server: {isCheckingServer ? 'Yes' : 'No'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Keep the same styles as before
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F9A52B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F9A52B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  serverOfflineContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  serverOfflineText: {
    marginLeft: 12,
    flex: 1,
  },
  serverOfflineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  serverOfflineMessage: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 8,
  },
  retryLink: {
    fontSize: 12,
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
  serverCheckingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  serverCheckingText: {
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
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
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 4,
  },
  eyeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  forgotPasswordLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 20,
    padding: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 6,
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
    marginBottom: 16,
  },
  submitErrorText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#F9A52B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#F9A52B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 50,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 12,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 50,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  debugContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default Login;