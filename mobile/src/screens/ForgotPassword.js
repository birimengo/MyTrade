// src/screens/ForgotPassword.js
import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// SVG Icons
const EmailIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ArrowLeftIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M12 19L5 12L12 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const CheckIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const WarningIcon = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ForgotPassword = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async () => {
    // Validate email
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo, generate a fake token
      const fakeToken = Math.random().toString(36).substring(2, 15);
      setResetToken(fakeToken);
      setSuccess(true);
      
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ submit: 'Failed to send reset email' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWithToken = () => {
    if (resetToken) {
      navigation.navigate('ResetPassword', { 
        token: resetToken, 
        email: email 
      });
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@tradeuganda.com');
  };

  if (success) {
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
            <View style={[styles.logo, { backgroundColor: '#10B981' }]}>
              <CheckIcon color="#FFFFFF" size={24} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a password reset link to your email address
            </Text>
          </View>

          {/* Success Message */}
          <View style={styles.formContainer}>
            <View style={styles.successContainer}>
              <CheckIcon color="#10B981" size={20} />
              <View style={styles.successText}>
                <Text style={styles.successTitle}>Password reset email sent!</Text>
                <Text style={styles.successMessage}>
                  If an account exists with {email}, you will receive an email with instructions to reset your password.
                </Text>
              </View>
            </View>

            {/* Development mode - show token for testing */}
            {__DEV__ && resetToken && (
              <View style={styles.devContainer}>
                <WarningIcon color="#3B82F6" size={20} />
                <View style={styles.devText}>
                  <Text style={styles.devTitle}>Development Mode</Text>
                  <Text style={styles.devMessage}>
                    Reset Token: {resetToken}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResetWithToken}
                    style={styles.devButton}
                  >
                    <Text style={styles.devButtonText}>Use this token to reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <ArrowLeftIcon color="#FFFFFF" size={16} />
              <Text style={styles.primaryButtonText}>Back to Login</Text>
            </TouchableOpacity>

            {/* Try Again */}
            <View style={styles.tryAgainContainer}>
              <Text style={styles.tryAgainText}>
                Didn't receive the email?{' '}
              </Text>
              <TouchableOpacity onPress={() => setSuccess(false)}>
                <Text style={styles.tryAgainLink}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <View style={styles.logo}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password
          </Text>
        </View>

        {/* Reset Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputWrapper}>
              <EmailIcon color="#9CA3AF" size={16} />
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.inputError
                ]}
                placeholder="Enter your email address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errors.email) setErrors({});
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

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
              styles.primaryButton,
              isLoading && styles.primaryButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Remember your password?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <ArrowLeftIcon color="#374151" size={16} />
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>

          {/* Help Section */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Need help?</Text>
            <Text style={styles.helpText}>
              If you're having trouble accessing your account, please contact our support team
            </Text>
            <TouchableOpacity onPress={handleContactSupport}>
              <Text style={styles.helpLink}>support@tradeuganda.com</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 16,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
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
    fontSize: 14,
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9A52B',
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#F9A52B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  successContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  successText: {
    marginLeft: 12,
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 12,
    color: '#065F46',
  },
  devContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    padding: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  devText: {
    marginLeft: 12,
    flex: 1,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  devMessage: {
    fontSize: 12,
    color: '#1E40AF',
    marginBottom: 8,
  },
  devButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  devButtonText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  tryAgainContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tryAgainText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tryAgainLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  helpContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 8,
  },
  helpLink: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default ForgotPassword;