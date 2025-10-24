// src/screens/TransporterDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDarkMode } from '../../context/DarkModeContext';

// Components
import Sidebar from '../../components/Sidebar';
import Settings from '../../components/Settings';
import OverView from '../../components/TransporterComponents/OverView';
import Deliveries from '../../components/TransporterComponents/Deliveries';
import Vehicles from '../../components/TransporterComponents/Vehicles';
import RoutesComponent from '../../components/TransporterComponents/Routes';
import Schedule from '../../components/TransporterComponents/Schedule';
import Earnings from '../../components/TransporterComponents/Earnings';
import TransporterOrders from '../../components/TransporterComponents/TransporterOrders';
import SupplierOrders from '../../components/TransporterComponents/SupplierOrders';
import ChatContainer from '../../components/ChatComponents/ChatContainer';

// Icons
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const TransporterDashboard = ({ navigation }) => {
  /** --------------------- CONTEXTS --------------------- **/
  const { user } = useAuth();
  const { socket, isConnected, connectionStatus, reconnect } = useSocket();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /** --------------------- STATES --------------------- **/
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [isActive, setIsActive] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  /** --------------------- CONSTANTS --------------------- **/
  const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

  /** --------------------- EFFECTS --------------------- **/
  useEffect(() => {
    if (activeTab === 'chat' && !isConnected && connectionStatus === 'error') {
      reconnect();
    }
  }, [activeTab, isConnected, connectionStatus]);

  useEffect(() => {
    const fetchTransporterStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/transporters/status/${user?._id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsActive(data.isActive);
          }
        }
      } catch (error) {
        console.error('Error fetching transporter status:', error);
      }
    };

    if (user?._id) {
      fetchTransporterStatus();
    }
  }, [user]);

  /** --------------------- HANDLERS --------------------- **/
  const toggleActiveStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transporters/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporterId: user._id,
          isActive: !isActive
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsActive(!isActive);
          socket?.emit('transporterStatusUpdate', {
            transporterId: user._id,
            isActive: !isActive,
            transporterName: `${user.firstName} ${user.lastName}`
          });
          Alert.alert('Success', `You are now ${!isActive ? 'active' : 'inactive'}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleReconnect = async () => {
    const success = await reconnect();
    if (success) {
      Alert.alert('Success', 'Connection restored!');
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleCloseSidebar = () => setIsSidebarOpen(false);
  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setActiveTab('overview');
  };
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    setCurrentScreen('dashboard');
  };

  /** --------------------- RENDER FUNCTIONS --------------------- **/
  const renderChatContent = () => (
    <View style={[styles.chatWrapper, isDarkMode && styles.darkChatWrapper]}>
      {connectionStatus !== 'connected' && (
        <View style={[
          styles.connectionBanner,
          connectionStatus === 'connecting' ? styles.connectingBanner :
          connectionStatus === 'error' ? styles.errorBanner : styles.disconnectedBanner,
          isDarkMode && styles.darkConnectionBanner,
        ]}>
          <Ionicons
            name={connectionStatus === 'connecting' ? 'sync' : connectionStatus === 'error' ? 'warning' : 'cloud-offline'}
            size={14}
            color={connectionStatus === 'connecting' ? '#F59E0B' : connectionStatus === 'error' ? '#EF4444' : '#6B7280'}
          />
          <Text style={[styles.connectionText, isDarkMode && styles.darkConnectionText]}>
            {connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Connection failed' : 'You are offline'}
          </Text>
          {connectionStatus === 'error' && (
            <TouchableOpacity onPress={handleReconnect} style={styles.reconnectButton}>
              <Text style={styles.reconnectText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <ChatContainer 
        isDarkMode={isDarkMode}
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />
    </View>
  );

  const renderContent = () => {
    if (currentScreen === 'delivery-detail') {
      return (
        <View style={[styles.placeholder, isDarkMode && styles.darkPlaceholder]}>
          <Text style={[styles.placeholderText, isDarkMode && styles.darkText]}>
            Delivery Detail Screen
          </Text>
          <TouchableOpacity onPress={handleBackToDashboard} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const components = {
      settings: <Settings isDarkMode={isDarkMode} />,
      deliveries: <Deliveries isDarkMode={isDarkMode} />,
      vehicles: <Vehicles isDarkMode={isDarkMode} />,
      routes: <RoutesComponent isDarkMode={isDarkMode} />,
      schedule: <Schedule isDarkMode={isDarkMode} />,
      earnings: <Earnings isDarkMode={isDarkMode} />,
      'w-orders': <TransporterOrders isDarkMode={isDarkMode} />,
      's-orders': <SupplierOrders isDarkMode={isDarkMode} />,
      chat: renderChatContent(),
      overview: <OverView isDarkMode={isDarkMode} />,
    };

    return components[activeTab] || components.overview;
  };

  /** --------------------- HEADER HELPERS --------------------- **/
  const getHeaderTitle = () => currentScreen !== 'dashboard' ? 'Delivery Details' : 'Transporter Dashboard';
  
  const getHeaderSubtitle = () => {
    if (currentScreen !== 'dashboard') return 'Manage Delivery';
    const subtitles = {
      overview: 'Business Overview',
      deliveries: 'Delivery Management',
      vehicles: 'Vehicle Fleet',
      routes: 'Route Planning',
      schedule: 'Delivery Schedule',
      earnings: 'Earnings & Analytics',
      'w-orders': 'Wholesaler Orders',
      's-orders': 'Supplier Orders',
      chat: isConnected ? 'Real-time Chat' : 'Chat (Offline)',
      settings: 'Account Settings',
    };
    return subtitles[activeTab] || 'Dashboard';
  };

  const roleSpecificItems = {
    title: 'Transporter Portal',
    items: [
      { id: 'overview', label: 'Overview', icon: 'map-marker-alt' },
      { id: 'deliveries', label: 'Deliveries', icon: 'truck' },
      { id: 'vehicles', label: 'Vehicles', icon: 'car' },
      { id: 'routes', label: 'Routes', icon: 'route' },
      { id: 'schedule', label: 'Schedule', icon: 'calendar' },
      { id: 'earnings', label: 'Earnings', icon: 'dollar-sign' },
      { id: 'w-orders', label: 'W-Orders', icon: 'clipboard' },
      { id: 's-orders', label: 'S-Orders', icon: 'cube' },
      { id: 'chat', label: 'Chat', icon: 'chatbubbles' },
      { id: 'settings', label: 'Settings', icon: 'cog' },
    ],
  };

  /** --------------------- RENDER --------------------- **/
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* COMPACT HEADER */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View style={styles.headerMain}>
          {/* Left Section */}
          <View style={styles.headerLeft}>
            {currentScreen !== 'dashboard' ? (
              <TouchableOpacity onPress={handleBackToDashboard} style={styles.navButton}>
                <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#FFFFFF' : '#374151'} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={toggleSidebar} style={styles.navButton}>
                <Ionicons name="menu" size={20} color={isDarkMode ? '#FFFFFF' : '#374151'} />
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
                {getHeaderTitle()}
              </Text>
              <Text style={[styles.headerSubtitle, isDarkMode && styles.darkSubtitle]}>
                {getHeaderSubtitle()}
              </Text>
            </View>
          </View>

          {/* Right Section */}
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleDarkMode} style={styles.iconButton}>
              {isDarkMode ? (
                <Feather name="sun" size={16} color="#FFFFFF" />
              ) : (
                <Feather name="moon" size={16} color="#374151" />
              )}
            </TouchableOpacity>
            
            <View style={styles.userInfo}>
              <Text style={[styles.welcomeText, isDarkMode && styles.darkText]}>
                Hi, {user?.firstName}
              </Text>
              <View style={[styles.avatar, isDarkMode && styles.darkAvatar]}>
                <Text style={styles.avatarText}>
                  {user?.firstName?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Compact Status Row */}
        <View style={styles.statusRow}>
          <TouchableOpacity 
            onPress={toggleActiveStatus}
            disabled={loadingStatus}
            style={[
              styles.statusButton,
              isActive ? styles.activeButton : styles.inactiveButton,
              isDarkMode && (isActive ? styles.darkActiveButton : styles.darkInactiveButton)
            ]}
          >
            {loadingStatus ? (
              <Ionicons name="sync" size={12} color={isDarkMode ? '#D1D5DB' : '#6B7280'} />
            ) : (
              <MaterialIcons 
                name={isActive ? 'toggle-on' : 'toggle-off'} 
                size={14} 
                color={isActive ? '#10B981' : '#9CA3AF'} 
              />
            )}
            <Text style={[
              styles.statusText,
              isDarkMode && styles.darkStatusText
            ]}>
              {loadingStatus ? '...' : (isActive ? 'Active' : 'Inactive')}
            </Text>
          </TouchableOpacity>

          {activeTab === 'chat' && (
            <View style={[styles.connectionIndicator, isDarkMode && styles.darkConnectionIndicator]}>
              <View style={[
                styles.connectionDot, 
                { backgroundColor: isConnected ? '#10B981' : '#EF4444' }
              ]} />
              <Text style={[
                styles.connectionText,
                { color: isConnected ? '#10B981' : '#EF4444' }
              ]}>
                {isConnected ? 'Live' : 'Offline'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        {currentScreen === 'dashboard' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            roleSpecificItems={roleSpecificItems}
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
            isDarkMode={isDarkMode}
          />
        )}
        <View style={[
          styles.content,
          currentScreen !== 'dashboard' && styles.fullWidthContent,
          isDarkMode && styles.darkContent,
        ]}>
          {renderContent()}
        </View>
      </View>

      {/* OVERLAY */}
      {isSidebarOpen && currentScreen === 'dashboard' && (
        <TouchableOpacity style={styles.overlay} onPress={handleCloseSidebar} activeOpacity={1} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F3F4F6' 
  },
  darkContainer: { 
    backgroundColor: '#111827' 
  },

  /** COMPACT HEADER STYLES */
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  darkHeader: { 
    backgroundColor: '#1F2937', 
    shadowOpacity: 0.3 
  },
  
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },

  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  navButton: { 
    padding: 6, 
    marginRight: 8 
  },
  headerTitleContainer: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 16,
    fontWeight: '700', 
    color: '#374151', 
    lineHeight: 20
  },
  headerSubtitle: { 
    fontSize: 12,
    color: '#6B7280', 
    lineHeight: 14,
    marginTop: 1
  },

  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 4
  },
  iconButton: { 
    padding: 6
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 6
  },
  welcomeText: { 
    fontSize: 12,
    color: '#374151', 
  },
  darkText: { 
    color: '#FFFFFF' 
  },
  darkSubtitle: { 
    color: '#D1D5DB' 
  },
  avatar: { 
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  darkAvatar: { 
    backgroundColor: '#7C3AED' 
  },
  avatarText: { 
    color: '#FFFFFF', 
    fontWeight: '600', 
    fontSize: 12
  },

  /** COMPACT STATUS ROW */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeButton: {
    backgroundColor: '#D1FAE5',
  },
  inactiveButton: {
    backgroundColor: '#F3F4F6',
  },
  darkActiveButton: {
    backgroundColor: '#065F46',
  },
  darkInactiveButton: {
    backgroundColor: '#374151',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  darkStatusText: {
    color: '#D1D5DB',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  darkConnectionIndicator: { 
    backgroundColor: '#374151' 
  },
  connectionDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3,
  },

  /** MAIN CONTENT */
  mainContent: { 
    flex: 1, 
    flexDirection: 'row' 
  },
  content: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  darkContent: { 
    backgroundColor: '#111827' 
  },
  fullWidthContent: { 
    flex: 1, 
    marginLeft: 0 
  },

  /** CHAT COMPONENTS */
  chatWrapper: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  darkChatWrapper: { 
    backgroundColor: '#111827' 
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  connectingBanner: { 
    backgroundColor: '#FFFBEB' 
  },
  errorBanner: { 
    backgroundColor: '#FEF2F2' 
  },
  disconnectedBanner: { 
    backgroundColor: '#F3F4F6' 
  },
  darkConnectionBanner: { 
    backgroundColor: '#374151' 
  },
  connectionText: { 
    fontSize: 12, 
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  darkConnectionText: { 
    color: '#D1D5DB' 
  },
  reconnectButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  reconnectText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 11,
  },

  /** PLACEHOLDER */
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  darkPlaceholder: {
    backgroundColor: '#111827',
  },
  placeholderText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 12,
  },

  /** OVERLAY */
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.2)' 
  },
});

export default TransporterDashboard;