// src/components/Sidebar.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { 
  Ionicons, 
  FontAwesome, 
  FontAwesome5, 
  MaterialCommunityIcons,
  MaterialIcons,
  Feather 
} from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

const Sidebar = ({ activeTab, setActiveTab, roleSpecificItems, isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const commonItems = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'settings', label: 'Settings', icon: 'cog' },
  ];

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  const handleNavigation = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const getIconComponent = (iconName, size = 16, isActive = false) => {
    const activeColor = isDarkMode ? '#93C5FD' : '#2563EB';
    const inactiveColor = isDarkMode ? '#D1D5DB' : '#6B7280';
    const color = isActive ? activeColor : inactiveColor;

    const iconProps = { size, color };

    // Comprehensive icon mapping for all roles
    switch (iconName) {
      // Common icons
      case 'home':
        return <Ionicons name="home-outline" {...iconProps} />;
      case 'cog':
        return <Ionicons name="settings-outline" {...iconProps} />;
      case 'comments':
        return <FontAwesome5 name="comments" {...iconProps} />;
      case 'chatbubbles':
        return <Ionicons name="chatbubble-ellipses-outline" {...iconProps} />;
      
      // Retailer/Wholesaler icons
      case 'shopping-cart':
        return <FontAwesome5 name="shopping-cart" {...iconProps} />;
      case 'box-open':
        return <FontAwesome5 name="box-open" {...iconProps} />;
      case 'users':
        return <FontAwesome5 name="users" {...iconProps} />;
      case 'dollar-sign':
        return <FontAwesome5 name="dollar-sign" {...iconProps} />;
      case 'file-invoice':
        return <FontAwesome5 name="file-invoice" {...iconProps} />;
      case 'chart-pie':
        return <FontAwesome5 name="chart-pie" {...iconProps} />;
      
      // Transporter icons
      case 'map-marker-alt':
        return <FontAwesome5 name="map-marker-alt" {...iconProps} />;
      case 'truck':
        return <FontAwesome5 name="truck" {...iconProps} />;
      case 'car':
        return <FontAwesome5 name="car" {...iconProps} />;
      case 'route':
        return <FontAwesome5 name="route" {...iconProps} />;
      case 'calendar':
        return <FontAwesome5 name="calendar" {...iconProps} />;
      case 'clipboard':
        return <FontAwesome5 name="clipboard" {...iconProps} />;
      case 'cube':
        return <FontAwesome5 name="cube" {...iconProps} />;
      
      // UI icons
      case 'sun':
        return <Feather name="sun" {...iconProps} />;
      case 'moon':
        return <Feather name="moon" {...iconProps} />;
      case 'sign-out-alt':
        return <MaterialIcons name="logout" {...iconProps} />;
      case 'times':
        return <Ionicons name="close" {...iconProps} />;
      
      // Fallback icon
      default:
        return <Ionicons name="help-circle-outline" {...iconProps} />;
    }
  };

  const renderNavItem = (item, index) => {
    const isActive = activeTab === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => handleNavigation(item.id)}
        style={[
          styles.navItem,
          isActive && styles.activeNavItem,
          isDarkMode && isActive && styles.darkActiveNavItem,
        ]}
      >
        {getIconComponent(item.icon, 16, isActive)}
        <Text style={[
          styles.navText,
          isActive && styles.activeNavText,
          isDarkMode && styles.darkNavText,
          isDarkMode && isActive && styles.darkActiveNavText,
        ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Get role-specific section title
  const getRoleSectionTitle = () => {
    const role = user?.role?.toLowerCase();
    const roleTitles = {
      retailer: 'Retailer',
      wholesaler: 'Wholesaler', 
      supplier: 'Supplier',
      transporter: 'Transporter',
      admin: 'Admin'
    };
    return roleTitles[role] || 'Business';
  };

  // Filter out duplicates between common items and role-specific items
  const getFilteredRoleItems = () => {
    const commonIds = commonItems.map(item => item.id);
    return roleSpecificItems.items.filter(item => !commonIds.includes(item.id));
  };

  const filteredRoleItems = getFilteredRoleItems();
  const roleSectionTitle = getRoleSectionTitle();

  return (
    <>
      {/* Sidebar */}
      <View style={[
        styles.sidebar,
        { transform: [{ translateX: isOpen ? 0 : -SIDEBAR_WIDTH }] },
        isDarkMode && styles.darkSidebar,
      ]}>
        {/* Header */}
        <View style={[styles.sidebarHeader, isDarkMode && styles.darkSidebarHeader]}>
          <Text style={[styles.sidebarTitle, isDarkMode && styles.darkText]}>
            {roleSpecificItems.title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            {getIconComponent('times', 24, false)}
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.navSection}>
            <Text style={[styles.sectionLabel, isDarkMode && styles.darkSectionLabel]}>
              Main
            </Text>
            {commonItems.map(renderNavItem)}
          </View>

          <View style={styles.divider} />

          <View style={styles.navSection}>
            <Text style={[styles.sectionLabel, isDarkMode && styles.darkSectionLabel]}>
              {roleSectionTitle}
            </Text>
            {filteredRoleItems.map(renderNavItem)}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.sidebarFooter, isDarkMode && styles.darkSidebarFooter]}>
          <TouchableOpacity 
            onPress={toggleDarkMode}
            style={[styles.footerButton, isDarkMode && styles.darkFooterButton]}
          >
            {getIconComponent(isDarkMode ? 'sun' : 'moon', 16, false)}
            <Text style={[styles.footerButtonText, isDarkMode && styles.darkText]}>
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLogout}
            style={[styles.footerButton, styles.logoutButton]}
          >
            {getIconComponent('sign-out-alt', 16, false)}
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  darkSidebar: {
    backgroundColor: '#1F2937',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkSidebarHeader: {
    borderBottomColor: '#374151',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  darkText: {
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  navScroll: {
    flex: 1,
  },
  navSection: {
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  darkSectionLabel: {
    color: '#6B7280',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  activeNavItem: {
    backgroundColor: '#EFF6FF',
  },
  darkActiveNavItem: {
    backgroundColor: '#374151',
  },
  navText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    fontWeight: '500',
  },
  darkNavText: {
    color: '#D1D5DB',
  },
  activeNavText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  darkActiveNavText: {
    color: '#93C5FD',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  darkSidebarFooter: {
    borderTopColor: '#374151',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  darkFooterButton: {
    backgroundColor: '#374151',
  },
  footerButtonText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default Sidebar; 