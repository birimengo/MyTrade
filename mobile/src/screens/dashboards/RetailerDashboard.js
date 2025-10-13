// src/screens/RetailerDashboard.js
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
import Overview from '../../components/RetailerComponents/OverView';
import DailySales from '../../components/RetailerComponents/DailySales';
import Wholesaler from '../../components/RetailerComponents/Wholesaler';
import WholesalerProducts from '../../components/RetailerComponents/WholesalerProducts';
import MyStock from '../../components/RetailerComponents/MyStock';
import Orders from '../../components/RetailerComponents/Orders';
import Receipts from '../../components/RetailerComponents/Receipts';
import ChatContainer from '../../components/ChatComponents/ChatContainer';

// Icons
import { Ionicons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const RetailerDashboard = ({ navigation }) => {
  /** --------------------- CONTEXTS --------------------- **/
  const { user } = useAuth();
  const { socket, isConnected, socketService, connectionStatus, reconnect } = useSocket();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /** --------------------- STATES --------------------- **/
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [wholesalerProductsParams, setWholesalerProductsParams] = useState(null);

  /** --------------------- EFFECTS --------------------- **/
  // Reconnect automatically when user navigates to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && !isConnected && connectionStatus === 'error') {
      reconnect();
    }
  }, [activeTab, isConnected, connectionStatus]);

  /** --------------------- HANDLERS --------------------- **/

  // Reconnect manually
  const handleReconnect = async () => {
    const success = await reconnect();
    if (success) {
      Alert.alert('Success', 'Connection restored!');
    } else {
      Alert.alert('Connection Failed', 'Unable to connect to chat server. Using offline mode.');
    }
  };

  // Sidebar toggle
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleCloseSidebar = () => setIsSidebarOpen(false);

  // Navigation between wholesaler and their products
  const handleNavigateToProducts = (wholesaler) => {
    setWholesalerProductsParams({ wholesaler });
    setCurrentScreen('wholesaler-products');
    setIsSidebarOpen(false);
  };

  const handleBackToWholesaler = () => {
    setCurrentScreen('dashboard');
    setActiveTab('Wholesaler');
    setWholesalerProductsParams(null);
  };

  // Tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    setCurrentScreen('dashboard');
    setWholesalerProductsParams(null);
  };

  // Enhanced navigation for Wholesaler component
  const getEnhancedNavigation = () => ({
    ...navigation,
    navigate: (screenName, params) => {
      if (screenName === 'WholesalerProducts' && params?.wholesaler) {
        handleNavigateToProducts(params.wholesaler);
      } else {
        navigation.navigate(screenName, params);
      }
    },
  });

  /** --------------------- RENDER FUNCTIONS --------------------- **/

  const renderChatContent = () => (
    <View style={[styles.chatWrapper, isDarkMode && styles.darkChatWrapper]}>
      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <View
          style={[
            styles.connectionBanner,
            connectionStatus === 'connecting'
              ? styles.connectingBanner
              : connectionStatus === 'error'
              ? styles.errorBanner
              : styles.disconnectedBanner,
            isDarkMode && styles.darkConnectionBanner,
          ]}
        >
          <Ionicons
            name={
              connectionStatus === 'connecting'
                ? 'sync'
                : connectionStatus === 'error'
                ? 'warning'
                : 'cloud-offline'
            }
            size={16}
            color={
              connectionStatus === 'connecting'
                ? '#F59E0B'
                : connectionStatus === 'error'
                ? '#EF4444'
                : '#6B7280'
            }
          />
          <Text style={[styles.connectionText, isDarkMode && styles.darkConnectionText]}>
            {connectionStatus === 'connecting'
              ? 'Connecting to chat service...'
              : connectionStatus === 'error'
              ? 'Failed to connect to chat service'
              : 'You are currently offline'}
          </Text>
          {connectionStatus === 'error' && (
            <TouchableOpacity onPress={handleReconnect} style={styles.reconnectButton}>
              <Text style={styles.reconnectText}>Retry Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Chat Container */}
      <ChatContainer 
        isDarkMode={isDarkMode}
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />
    </View>
  );

  const renderContent = () => {
    if (currentScreen === 'wholesaler-products') {
      return (
        <WholesalerProducts
          navigation={getEnhancedNavigation()}
          route={{ params: wholesalerProductsParams }}
          onBack={handleBackToWholesaler}
          isDarkMode={isDarkMode}
        />
      );
    }

    switch (activeTab) {
      case 'settings':
        return <Settings isDarkMode={isDarkMode} />;
      case 'daily-sales':
        return <DailySales isDarkMode={isDarkMode} />;
      case 'Wholesaler':
        return (
          <Wholesaler
            navigation={getEnhancedNavigation()}
            socketService={socketService}
            isConnected={isConnected}
            isDarkMode={isDarkMode}
          />
        );
      case 'MyStock':
        return <MyStock isDarkMode={isDarkMode} />;
      case 'orders':
        return <Orders isDarkMode={isDarkMode} />;
      case 'receipts':
        return <Receipts isDarkMode={isDarkMode} />;
      case 'chat':
        return renderChatContent();
      case 'overview':
      default:
        return <Overview isDarkMode={isDarkMode} />;
    }
  };

  /** --------------------- HEADER HELPERS --------------------- **/
  const getHeaderTitle = () =>
    currentScreen === 'wholesaler-products'
      ? wholesalerProductsParams?.wholesaler?.businessName || 'Products'
      : 'Retailer Dashboard';

  const getHeaderSubtitle = () => {
    if (currentScreen === 'wholesaler-products') return 'Browse Products';
    const subtitles = {
      overview: 'Business Overview',
      'daily-sales': 'Sales Analytics',
      Wholesaler: 'Supplier Directory',
      MyStock: 'Inventory Management',
      orders: 'Order History',
      receipts: 'Transaction Records',
      chat: isConnected ? 'Real-time Chat' : 'Chat (Offline)',
      settings: 'Account Settings',
    };
    return subtitles[activeTab] || activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  };

  const getConnectionColor = () => (isConnected ? '#10B981' : '#EF4444');

  /** --------------------- ROLE SPECIFIC ITEMS --------------------- **/
  const roleSpecificItems = {
    title: 'Retailer Portal',
    items: [
      { id: 'overview', label: 'Overview', icon: 'chart-pie' },
      { id: 'orders', label: 'Orders', icon: 'shopping-cart' },
      { id: 'MyStock', label: 'My Stock', icon: 'box-open' },
      { id: 'Wholesaler', label: 'Wholesaler', icon: 'users' },
      { id: 'daily-sales', label: 'Daily Sales', icon: 'dollar-sign' },
      { id: 'receipts', label: 'Receipts', icon: 'file-invoice' },
      { id: 'chat', label: 'Chat', icon: 'comments' },
      { id: 'settings', label: 'Settings', icon: 'cog' },
    ],
  };

  /** --------------------- RENDER --------------------- **/
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View style={styles.headerLeft}>
          {currentScreen === 'wholesaler-products' ? (
            <TouchableOpacity onPress={handleBackToWholesaler} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#374151'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
              <Ionicons name="menu" size={24} color={isDarkMode ? '#FFFFFF' : '#374151'} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>
              {getHeaderTitle()}
            </Text>
            <View style={styles.headerSubtitleContainer}>
              <Text style={[styles.headerSubtitle, isDarkMode && styles.darkSubtitle]}>
                {getHeaderSubtitle()}
              </Text>
              {activeTab === 'chat' && (
                <View style={[styles.connectionIndicator, isDarkMode && styles.darkConnectionIndicator]}>
                  <View style={[styles.connectionDot, { backgroundColor: getConnectionColor() }]} />
                  <Text style={[styles.connectionStatusText, { color: getConnectionColor() }]}>
                    {isConnected ? 'Live' : 'Offline'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleDarkMode} style={styles.iconButton}>
            {isDarkMode ? (
              <Feather name="sun" size={20} color="#FFFFFF" />
            ) : (
              <Feather name="moon" size={20} color="#374151" />
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
        <View
          style={[
            styles.content,
            currentScreen === 'wholesaler-products' && styles.fullWidthContent,
            isDarkMode && styles.darkContent,
          ]}
        >
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

  /** HEADER */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minHeight: 64,
  },
  darkHeader: { 
    backgroundColor: '#1F2937', 
    shadowOpacity: 0.3 
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  menuButton: { 
    padding: 8, 
    marginRight: 12 
  },
  backButton: { 
    padding: 8, 
    marginRight: 12 
  },
  headerTitleContainer: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 15, // Reduced from 20
    fontWeight: 'bold', 
    color: '#374151', 
    lineHeight: 22 // Reduced from 24
  },
  headerSubtitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  headerSubtitle: { 
    fontSize: 13, // Reduced from 14
    color: '#6B7280', 
    lineHeight: 15 // Reduced from 16
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  darkConnectionIndicator: { 
    backgroundColor: '#374151' 
  },
  connectionDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    marginRight: 6 
  },
  connectionStatusText: { 
    fontSize: 11, // Reduced from 12
    fontWeight: '500' 
  },

  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconButton: { 
    padding: 8, 
    marginRight: 6 
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  welcomeText: { 
    fontSize: 13, // Reduced from 14
    color: '#374151', 
    marginRight: 8 
  },
  darkText: { 
    color: '#FFFFFF' 
  },
  darkSubtitle: { 
    color: '#D1D5DB' 
  },
  avatar: { 
    width: 32, // Reduced from 36
    height: 32, // Reduced from 36
    borderRadius: 16, // Reduced from 18
    backgroundColor: '#3B82F6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  darkAvatar: { 
    backgroundColor: '#2563EB' 
  },
  avatarText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
    fontSize: 14 // Reduced from 16
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

  /** CHAT */
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
    padding: 12,
    gap: 8,
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
    fontSize: 14, 
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  darkConnectionText: { 
    color: '#D1D5DB' 
  },
  reconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  reconnectText: {
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

export default RetailerDashboard;