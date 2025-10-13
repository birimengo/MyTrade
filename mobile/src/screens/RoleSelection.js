// src/screens/RoleSelection.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, Polygon, Line } from 'react-native-svg';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isTablet = width > 768;
const isVerySmallDevice = width < 350;

// Optimized SVG Icons with memoization
const StoreIcon = React.memo(({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9 22V12H15V22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const BoxesIcon = React.memo(({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 5H5V10H10V5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M19 5H14V10H19V5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M10 14H5V19H10V14Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M19 14H14V19H19V14Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const IndustryIcon = React.memo(({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 7V21H5V7M19 7L21 5H3L5 7M19 7H5M10 11H14M10 15H14M10 19H14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const TruckIcon = React.memo(({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 17V7C10 6.46957 10.2107 5.96086 10.5858 5.58579C10.9609 5.21071 11.4696 5 12 5H19C19.5304 5 20.0391 5.21071 20.4142 5.58579C20.7893 5.96086 21 6.46957 21 7V17H10Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M10 17H3V13H10M21 17V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21C18.4696 21 17.9609 20.7893 17.5858 20.4142C17.2107 20.0391 17 19.5304 17 19M7 21C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const InfoIcon = React.memo(({ color, size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Path d="M12 16V12M12 8H12.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
));

const ArrowRightIcon = React.memo(({ color, size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19M12 5L19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const LoginIcon = React.memo(({ color, size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M10 17L15 12L10 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M15 12H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const GlobeIcon = React.memo(({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Path d="M2 12H22M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke={color} strokeWidth="2"/>
  </Svg>
));

const CloseIcon = React.memo(({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
));

const RoleSelection = () => {
  const navigation = useNavigation();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleDetails, setShowRoleDetails] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const roles = [
    {
      id: 'retailer',
      label: 'Retailer',
      description: 'Manage storefront, inventory, and orders',
      icon: (color, size) => <StoreIcon color={color} size={size} />,
      color: '#3B82F6',
      lightColor: '#EFF6FF',
      gradient: ['#3B82F6', '#1D4ED8'],
      details: {
        title: "Retailer Account",
        features: [
          "Sell products directly to consumers",
          "Manage inventory and orders",
          "Access to wholesale pricing",
          "Customer management tools",
          "Sales analytics and reports"
        ],
        benefits: [
          "Wide product selection from wholesalers",
          "Competitive pricing",
          "Easy order management",
          "Business growth opportunities"
        ]
      }
    },
    {
      id: 'wholesaler',
      label: 'Wholesaler',
      description: 'Supply products in bulk to retailers',
      icon: (color, size) => <BoxesIcon color={color} size={size} />,
      color: '#10B981',
      lightColor: '#ECFDF5',
      gradient: ['#10B981', '#047857'],
      details: {
        title: "Wholesaler Account",
        features: [
          "Sell products in bulk to retailers",
          "Manage product catalog",
          "Order fulfillment tools",
          "Retailer network access",
          "Business analytics dashboard"
        ],
        benefits: [
          "Access to verified retailers",
          "Bulk order management",
          "Market expansion opportunities",
          "Streamlined logistics support"
        ]
      }
    },
    {
      id: 'supplier',
      label: 'Supplier',
      description: 'Provide raw materials and manufacturing',
      icon: (color, size) => <IndustryIcon color={color} size={size} />,
      color: '#F59E0B',
      lightColor: '#FFFBEB',
      gradient: ['#F59E0B', '#D97706'],
      details: {
        title: "Supplier Account",
        features: [
          "Supply raw materials to manufacturers",
          "Manage production orders",
          "Quality control tracking",
          "Supply chain management",
          "Business partnership opportunities"
        ],
        benefits: [
          "Direct access to manufacturers",
          "Large volume orders",
          "Long-term contracts",
          "Supply chain integration"
        ]
      }
    },
    {
      id: 'transporter',
      label: 'Transporter',
      description: 'Handle logistics and delivery services',
      icon: (color, size) => <TruckIcon color={color} size={size} />,
      color: '#8B5CF6',
      lightColor: '#F5F3FF',
      gradient: ['#8B5CF6', '#7C3AED'],
      details: {
        title: "Transporter Account",
        features: [
          "Delivery service management",
          "Route optimization tools",
          "Fleet management",
          "Real-time tracking",
          "Payment processing"
        ],
        benefits: [
          "Access to business clients",
          "Regular delivery contracts",
          "Efficient route planning",
          "Secure payment system"
        ]
      }
    }
  ];

  const handleRoleSelect = useCallback((roleId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedRole(roleId);
    setShowRoleDetails(null);
  }, []);

  const handleRoleInfo = useCallback((role) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRoleDetails(role);
    setModalVisible(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedRole) return;
    
    // Add button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Signup', { preSelectedRole: selectedRole });
    });
  }, [selectedRole, navigation, scaleAnim]);

  const handleSignIn = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const closeModal = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setModalVisible(false);
    setTimeout(() => setShowRoleDetails(null), 300);
  }, []);

  const RoleCard = React.memo(({ role, isSelected, onSelect, onInfo }) => {
    const cardScale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(cardScale, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const handleInfoPress = (e) => {
      e.stopPropagation();
      onInfo(role);
    };

    return (
      <Pressable
        onPress={() => onSelect(role.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.roleCard,
            isSelected && [
              styles.roleCardSelected, 
              { 
                borderColor: role.color, 
                backgroundColor: role.lightColor,
                shadowColor: role.color,
              }
            ],
            { transform: [{ scale: cardScale }] }
          ]}
        >
          <View style={styles.roleCardHeader}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: isSelected ? role.color : '#F8FAFC' }
            ]}>
              {role.icon(isSelected ? '#FFFFFF' : '#64748B', isSmallDevice ? 20 : 22)}
            </View>
            
            <TouchableOpacity
              onPress={handleInfoPress}
              style={styles.infoButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <InfoIcon color={isSelected ? role.color : '#94A3B8'} size={isSmallDevice ? 16 : 18} />
            </TouchableOpacity>
          </View>
          
          <Text style={[
            styles.roleLabel,
            isSelected && { color: role.color },
          ]}>
            {role.label}
          </Text>
          <Text style={styles.roleDescription}>{role.description}</Text>

          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: role.color }]}>
              <Text style={styles.selectedBadgeText}>Selected</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    );
  });

  const RoleDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          isSmallDevice && styles.modalContentSmall,
          isVerySmallDevice && styles.modalContentVerySmall
        ]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={[styles.modalIconContainer, { backgroundColor: showRoleDetails?.lightColor }]}>
                {showRoleDetails?.icon(showRoleDetails?.color, isSmallDevice ? 24 : 28)}
              </View>
              <Text style={[
                styles.modalTitle,
                isSmallDevice && styles.modalTitleSmall
              ]} numberOfLines={2}>
                {showRoleDetails?.details.title}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={closeModal}
              style={styles.closeModalButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CloseIcon color="#64748B" size={isSmallDevice ? 20 : 22} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScroll} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.modalScrollContent,
              isSmallDevice && styles.modalScrollContentSmall
            ]}
          >
            {showRoleDetails && (
              <>
                <View style={styles.section}>
                  <Text style={[
                    styles.sectionTitle,
                    isSmallDevice && styles.sectionTitleSmall
                  ]}>Key Features</Text>
                  {showRoleDetails.details.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <View style={[styles.featureBullet, { backgroundColor: showRoleDetails.color }]} />
                      <Text style={[
                        styles.featureText,
                        isSmallDevice && styles.featureTextSmall
                      ]}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={[
                    styles.sectionTitle,
                    isSmallDevice && styles.sectionTitleSmall
                  ]}>Benefits</Text>
                  {showRoleDetails.details.benefits.map((benefit, index) => (
                    <View key={index} style={styles.featureItem}>
                      <View style={[styles.featureBullet, { backgroundColor: '#10B981' }]} />
                      <Text style={[
                        styles.featureText,
                        isSmallDevice && styles.featureTextSmall
                      ]}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: showRoleDetails?.lightColor }]} 
            onPress={closeModal}
          >
            <Text style={[styles.closeButtonText, { color: showRoleDetails?.color }]}>
              Got It
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <GlobeIcon color="#FFFFFF" size={isSmallDevice ? 18 : 20} />
            </View>
            <Text style={styles.title}>TRADE UGANDA</Text>
          </View>
          <Text style={styles.subtitle}>
            Uganda's premier B2B e-commerce platform connecting businesses across the supply chain
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Left Panel - Information */}
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Join Uganda's Business Network</Text>
            <Text style={styles.infoSubtitle}>
              Select your role to access tailored features designed for your business needs
            </Text>

            <View style={styles.stepsContainer}>
              {[
                { step: 1, title: 'Select Your Role', desc: 'Identify how you will use the platform' },
                { step: 2, title: 'Create Account', desc: 'Set up your business profile with relevant details' },
                { step: 3, title: 'Access Dashboard', desc: 'Start managing your business operations' }
              ].map((item, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={[
                    styles.stepNumber,
                    item.step === 1 && { backgroundColor: '#F9A52B' }
                  ]}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{item.title}</Text>
                    <Text style={styles.stepDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.signInPrompt}>
              <Text style={styles.signInText}>
                Already have an account?{' '}
                <Text style={styles.signInLink} onPress={handleSignIn}>
                  Sign In
                </Text>
              </Text>
            </View>
          </View>

          {/* Right Panel - Role Selection */}
          <View style={styles.rolesPanel}>
            <View style={styles.rolesHeader}>
              <Text style={styles.rolesTitle}>Select Your Role</Text>
              <Text style={styles.rolesSubtitle}>Choose your function in the supply chain to get started</Text>
            </View>

            {/* Role Grid */}
            <View style={styles.rolesGrid}>
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  isSelected={selectedRole === role.id}
                  onSelect={handleRoleSelect}
                  onInfo={handleRoleInfo}
                />
              ))}
            </View>

            {/* Action Buttons - FIXED LAYOUT */}
            <View style={styles.actionContainer}>
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  style={styles.signInButton} 
                  onPress={handleSignIn}
                >
                  <LoginIcon color="#FFFFFF" size={16} />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>

                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      !selectedRole && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!selectedRole}
                  >
                    <Text style={styles.continueButtonText}>
                      {isVerySmallDevice ? 'Continue' : 'Continue to Registration'}
                    </Text>
                    <ArrowRightIcon color="#FFFFFF" size={16} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.copyright}>
          © {new Date().getFullYear()} TRADE UGANDA. Uganda's Premier B2B Platform. All rights reserved.
        </Text>
      </ScrollView>

      <RoleDetailsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Math.max(12, width * 0.03),
    paddingVertical: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: isSmallDevice ? 40 : 48,
    height: isSmallDevice ? 40 : 48,
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
  title: {
    fontSize: isSmallDevice ? 22 : 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: isSmallDevice ? 13 : 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: isSmallDevice ? 18 : 22,
    paddingHorizontal: isSmallDevice ? 6 : 20,
  },
  mainContent: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 16,
    marginBottom: 16,
  },
  infoPanel: {
    flex: isTablet ? 2 : 1,
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  infoTitle: {
    fontSize: isSmallDevice ? 16 : 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  infoSubtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#CBD5E1',
    lineHeight: isSmallDevice ? 16 : 20,
  },
  stepsContainer: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: isSmallDevice ? 26 : 32,
    height: isSmallDevice ? 26 : 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 11 : 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: isSmallDevice ? 10 : 12,
    color: '#94A3B8',
    lineHeight: isSmallDevice ? 13 : 16,
  },
  signInPrompt: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 14,
  },
  signInText: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#94A3B8',
  },
  signInLink: {
    color: '#F9A52B',
    fontWeight: '600',
  },
  rolesPanel: {
    flex: isTablet ? 3 : 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  rolesHeader: {
    marginBottom: 20,
  },
  rolesTitle: {
    fontSize: isSmallDevice ? 16 : 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  rolesSubtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#64748B',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleCard: {
    width: isVerySmallDevice ? (width - 60) / 2 : isSmallDevice ? (width - 72) / 2 : (width - 96) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: isSmallDevice ? 10 : 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardSelected: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconContainer: {
    width: isSmallDevice ? 36 : 44,
    height: isSmallDevice ? 36 : 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    padding: 4,
  },
  roleLabel: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: isSmallDevice ? 10 : 12,
    color: '#64748B',
    lineHeight: isSmallDevice ? 13 : 16,
  },
  selectedBadge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  selectedBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // FIXED ACTION BUTTONS LAYOUT
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: isVerySmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 10 : 12,
    borderRadius: 10,
    gap: 6,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: isVerySmallDevice ? 13 : 14,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9A52B',
    paddingHorizontal: isVerySmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 10 : 12,
    borderRadius: 10,
    gap: 6,
    flex: isVerySmallDevice ? 1.2 : 1.5,
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#F9A52B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowColor: '#94A3B8',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: isVerySmallDevice ? 13 : 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  copyright: {
    textAlign: 'center',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  // Modal Styles - UPDATED FOR MOBILE HEIGHT
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.75, // Increased from 0.8 to 0.75 for better mobile viewing
    minHeight: height * 0.6, // Added minimum height for very small devices
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalContentSmall: {
    maxHeight: height * 0.8, // Even taller for small devices
    minHeight: height * 0.65,
    padding: 16,
  },
  modalContentVerySmall: {
    maxHeight: height * 0.85, // Tallest for very small devices
    minHeight: height * 0.7,
    padding: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  modalIconContainer: {
    width: isSmallDevice ? 40 : 44,
    height: isSmallDevice ? 40 : 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
    lineHeight: 22,
  },
  modalTitleSmall: {
    fontSize: 15,
    lineHeight: 20,
  },
  closeModalButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalScrollContentSmall: {
    paddingBottom: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 10,
  },
  sectionTitleSmall: {
    fontSize: 14,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  featureTextSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RoleSelection;