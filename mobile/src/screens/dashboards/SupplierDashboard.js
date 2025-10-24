// src/screens/dashboards/SupplierDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDarkMode } from '../../context/DarkModeContext';

// Components
import Sidebar from '../../components/Sidebar';
import Settings from '../../components/Settings';
import Overview from '../../components/SupplierComponents/Overview';
import Materials from '../../components/SupplierComponents/Materials';
import Production from '../../components/SupplierComponents/Production';
import MyStock from '../../components/SupplierComponents/MyStock';
import Shipments from '../../components/SupplierComponents/Shipments';
import Clients from '../../components/SupplierComponents/Clients';
import Orders from '../../components/SupplierComponents/Orders';
import ChatContainer from '../../components/ChatComponents/ChatContainer';

// Icons
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const SupplierDashboard = ({ navigation }) => {
  /** --------------------- CONTEXTS --------------------- **/
  const { user, logout } = useAuth();
  const { socket, isConnected, socketService, connectionStatus, reconnect } = useSocket();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /** --------------------- STATES --------------------- **/
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatFilter, setChatFilter] = useState('');
  const [autoOpenChat, setAutoOpenChat] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  /** --------------------- EFFECTS --------------------- **/
  // Reconnect automatically when user navigates to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && !isConnected && connectionStatus === 'error') {
      reconnect();
    }
  }, [activeTab, isConnected, connectionStatus]);

  // Reset auto-open after first render
  useEffect(() => {
    if (autoOpenChat) {
      setAutoOpenChat(false);
    }
  }, [autoOpenChat]);

  /** --------------------- HANDLERS --------------------- **/

  // Logout handler
  const handleLogout = async () => {
    setShowLogoutModal(false);
    
    try {
      // Disconnect socket if connected
      if (socket && isConnected) {
        socket.disconnect();
      }
      
      await logout();
      // Navigation will be handled by the auth context or navigation container
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Error', 'There was an issue logging out. Please try again.');
    }
  };

  // Confirm logout
  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  // Cancel logout
  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

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

  // Tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
    
    if (tabId !== 'chat') {
      setChatFilter('');
    }

    // Navigate to the appropriate route
    const basePath = '/dashboard/supplier';
    let path = basePath;

    switch (tabId) {
      case 'overview':
        path = `${basePath}`;
        break;
      case 'production':
        path = `${basePath}/production`;
        break;
      case 'mystock':
        path = `${basePath}/mystock`;
        break;
      case 'clients':
        path = `${basePath}/clients`;
        break;
      case 'orders':
        path = `${basePath}/orders`;
        break;
      case 'chat':
        path = `${basePath}/chat`;
        break;
      case 'settings':
        path = `${basePath}/settings`;
        break;
      default:
        path = basePath;
    }

    // In React Native, we'll handle navigation differently
    // For now, we'll just set the active tab
    console.log('Navigating to:', path);
  };

  // Function to trigger chat opening with filter (from Clients component)
  const openChatWithFilter = (roleFilter = '') => {
    setChatFilter(roleFilter);
    setAutoOpenChat(true);
    setActiveTab('chat');
  };

  /** --------------------- RENDER FUNCTIONS --------------------- **/

  const renderLogoutModal = () => (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, isDarkMode && styles.darkModalContent]}>
        <View style={styles.modalHeader}>
          <Ionicons 
            name="log-out-outline" 
            size={24} 
            color={isDarkMode ? '#EF4444' : '#DC2626'} 
          />
          <Text style={[styles.modalTitle, isDarkMode && styles.darkModalTitle]}>
            Confirm Logout
          </Text>
        </View>
        
        <Text style={[styles.modalMessage, isDarkMode && styles.darkModalMessage]}>
          Are you sure you want to logout? You'll need to sign in again to access your account.
        </Text>
        
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.cancelButton]} 
            onPress={cancelLogout}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalButton, styles.logoutButton]} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
        initialFilter={chatFilter}
        autoOpen={autoOpenChat}
      />
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <Settings isDarkMode={isDarkMode} />;
      case 'production':
        return <Production isDarkMode={isDarkMode} />;
      case 'mystock':
        return <MyStock isDarkMode={isDarkMode} />;
      case 'clients':
        return (
          <Clients 
            onMessageWholesaler={openChatWithFilter} 
            isDarkMode={isDarkMode}
          />
        );
      case 'orders':
        return <Orders isDarkMode={isDarkMode} />;
      case 'chat':
        return renderChatContent();
      case 'overview':
      default:
        return <Overview isDarkMode={isDarkMode} />;
    }
  };

  /** --------------------- HEADER HELPERS --------------------- **/
  const getHeaderTitle = () => 'Supplier Dashboard';

  const getHeaderSubtitle = () => {
    const subtitles = {
      overview: 'Business Overview',
      production: 'Production Tracking',
      mystock: 'Inventory Management',
      clients: 'Client Management',
      orders: 'Order Management',
      chat: isConnected ? 'Real-time Chat' : 'Chat (Offline)',
      settings: 'Account Settings',
    };
    return subtitles[activeTab] || activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
  };

  const getConnectionColor = () => (isConnected ? '#10B981' : '#EF4444');

  /** --------------------- ROLE SPECIFIC ITEMS --------------------- **/
  const roleSpecificItems = {
    title: 'Supplier Portal',
    items: [
      { 
        id: 'overview', 
        label: 'Overview', 
        icon: 'bar-chart',
        iconType: 'feather'
      },
      { 
        id: 'production', 
        label: 'Production', 
        icon: 'settings',
        iconType: 'feather'
      },
      { 
        id: 'mystock', 
        label: 'My Stock', 
        icon: 'archive',
        iconType: 'feather'
      },
      { 
        id: 'clients', 
        label: 'Clients', 
        icon: 'users',
        iconType: 'feather'
      },
      { 
        id: 'orders', 
        label: 'Orders', 
        icon: 'shopping-cart',
        iconType: 'feather'
      },
      { 
        id: 'chat', 
        label: 'Chat', 
        icon: 'message-circle',
        iconType: 'feather'
      },
      { 
        id: 'settings', 
        label: 'Settings', 
        icon: 'settings',
        iconType: 'feather'
      },
    ],
  };

  /** --------------------- RENDER ICON --------------------- **/
  const renderIcon = (iconType, iconName, size = 20, color) => {
    switch (iconType) {
      case 'material':
        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      case 'fontawesome':
        return <FontAwesome5 name={iconName} size={size} color={color} />;
      case 'feather':
      default:
        return <Feather name={iconName} size={size} color={color} />;
    }
  };

  /** --------------------- CUSTOM SIDEBAR COMPONENT --------------------- **/
  const CustomSidebar = ({ activeTab, setActiveTab, roleSpecificItems, isOpen, onClose, isDarkMode }) => {
    if (!isOpen && isMobile) return null;

    return (
      <>
        {/* Overlay for mobile */}
        {isMobile && isOpen && (
          <TouchableOpacity 
            style={styles.overlay} 
            onPress={onClose} 
            activeOpacity={1} 
          />
        )}

        {/* Sidebar */}
        <View style={[
          styles.sidebar,
          isMobile ? styles.sidebarMobile : styles.sidebarDesktop,
          isDarkMode && styles.darkSidebar,
          isMobile && !isOpen && { transform: [{ translateX: -300 }] }
        ]}>
          {/* Sidebar Header */}
          <View style={[styles.sidebarHeader, isDarkMode && styles.darkSidebarHeader]}>
            <View style={styles.sidebarLogo}>
              <MaterialCommunityIcons 
                name="factory" 
                size={28} 
                color={isDarkMode ? '#60A5FA' : '#3B82F6'} 
              />
              <Text style={[styles.sidebarTitle, isDarkMode && styles.darkSidebarTitle]}>
                {roleSpecificItems.title}
              </Text>
            </View>
            {isMobile && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sidebar Items */}
          <ScrollView style={styles.sidebarItems} showsVerticalScrollIndicator={false}>
            {roleSpecificItems.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sidebarItem,
                    isActive && styles.activeSidebarItem,
                    isDarkMode && isActive && styles.darkActiveSidebarItem,
                  ]}
                  onPress={() => setActiveTab(item.id)}
                >
                  <View style={styles.sidebarItemContent}>
                    {renderIcon(
                      item.iconType || 'feather',
                      item.icon,
                      20,
                      isActive 
                        ? (isDarkMode ? '#60A5FA' : '#3B82F6')
                        : (isDarkMode ? '#9CA3AF' : '#6B7280')
                    )}
                    <Text style={[
                      styles.sidebarItemText,
                      isActive && styles.activeSidebarItemText,
                      isDarkMode && styles.darkSidebarItemText,
                      isActive && isDarkMode && styles.darkActiveSidebarItemText,
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={[
                      styles.activeIndicator,
                      isDarkMode && styles.darkActiveIndicator
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sidebar Footer */}
          <View style={[styles.sidebarFooter, isDarkMode && styles.darkSidebarFooter]}>
            <View style={styles.userInfoSidebar}>
              <View style={[styles.avatarSidebar, isDarkMode && styles.darkAvatarSidebar]}>
                <Text style={styles.avatarTextSidebar}>
                  {(user?.businessName?.charAt(0) || user?.firstName?.charAt(0))?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, isDarkMode && styles.darkUserName]}>
                  {user?.businessName || user?.firstName}
                </Text>
                <Text style={[styles.userRole, isDarkMode && styles.darkUserRole]}>
                  Supplier
                </Text>
              </View>
            </View>
            
            {/* Logout Button in Sidebar */}
            <TouchableOpacity 
              style={[styles.logoutButtonSidebar, isDarkMode && styles.darkLogoutButtonSidebar]}
              onPress={confirmLogout}
            >
              <Ionicons 
                name="log-out-outline" 
                size={20} 
                color={isDarkMode ? '#EF4444' : '#DC2626'} 
              />
              <Text style={[
                styles.logoutTextSidebar,
                isDarkMode && styles.darkLogoutTextSidebar
              ]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  /** --------------------- RENDER --------------------- **/
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={isDarkMode ? '#FFFFFF' : '#374151'} />
          </TouchableOpacity>
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
              Hi, {user?.businessName || user?.firstName}
            </Text>
            <View style={[styles.avatar, isDarkMode && styles.darkAvatar]}>
              <Text style={styles.avatarText}>
                {(user?.businessName?.charAt(0) || user?.firstName?.charAt(0))?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        <CustomSidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          roleSpecificItems={roleSpecificItems}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          isDarkMode={isDarkMode}
        />
        <View style={[styles.content, isDarkMode && styles.darkContent]}>
          {renderContent()}
        </View>
      </View>

      {/* LOGOUT MODAL */}
      {showLogoutModal && renderLogoutModal()}
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
  headerTitleContainer: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 15,
    fontWeight: 'bold', 
    color: '#374151', 
    lineHeight: 22
  },
  headerSubtitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  headerSubtitle: { 
    fontSize: 13,
    color: '#6B7280', 
    lineHeight: 15
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
    fontSize: 11,
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
    fontSize: 13,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  darkAvatar: { 
    backgroundColor: '#D97706' 
  },
  avatarText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
    fontSize: 14
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

  /** SIDEBAR */
  sidebar: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarDesktop: {
    width: 280,
  },
  sidebarMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 1000,
    transform: [{ translateX: 0 }],
  },
  darkSidebar: {
    backgroundColor: '#1F2937',
    shadowOpacity: 0.3,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  darkSidebarHeader: {
    borderBottomColor: '#374151',
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 12,
  },
  darkSidebarTitle: {
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  sidebarItems: {
    flex: 1,
    paddingVertical: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  activeSidebarItem: {
    backgroundColor: '#EFF6FF',
  },
  darkActiveSidebarItem: {
    backgroundColor: '#374151',
  },
  sidebarItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 12,
  },
  activeSidebarItemText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  darkSidebarItemText: {
    color: '#9CA3AF',
  },
  darkActiveSidebarItemText: {
    color: '#60A5FA',
  },
  activeIndicator: {
    width: 3,
    height: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  darkActiveIndicator: {
    backgroundColor: '#60A5FA',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  darkSidebarFooter: {
    borderTopColor: '#374151',
  },
  userInfoSidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarSidebar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  darkAvatarSidebar: {
    backgroundColor: '#D97706',
  },
  avatarTextSidebar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  darkUserName: {
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  darkUserRole: {
    color: '#9CA3AF',
  },
  logoutButtonSidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  darkLogoutButtonSidebar: {
    backgroundColor: '#1F2937',
    borderColor: '#7F1D1D',
  },
  logoutTextSidebar: {
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  darkLogoutTextSidebar: {
    color: '#EF4444',
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

  /** MODAL */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  darkModalContent: {
    backgroundColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginLeft: 12,
  },
  darkModalTitle: {
    color: '#FFFFFF',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  darkModalMessage: {
    color: '#D1D5DB',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /** OVERLAY */
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
});

export default SupplierDashboard;