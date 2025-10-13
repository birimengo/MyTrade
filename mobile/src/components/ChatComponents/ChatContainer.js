// src/components/ChatComponents/ChatContainer.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView
} from 'react-native';
import UserList from './UserList';
import ChatScreen from './ChatScreen';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const ChatContainer = ({ connectionStatus, onReconnect }) => {
  const { user } = useAuth();
  const { socketService } = useSocket();
  const { isDarkMode } = useDarkMode();
  
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCounts, setUserCounts] = useState({ 
    '': 0, 
    wholesaler: 0, 
    transporter: 0, 
    retailer: 0, 
    supplier: 0 
  });

  // Filter buttons configuration
  const filterButtons = [
    { id: '', label: 'All', icon: 'people' },
    { id: 'wholesaler', label: 'W', icon: 'business' },
    { id: 'transporter', label: 'T', icon: 'car' },
    { id: 'retailer', label: 'R', icon: 'cart' },
    { id: 'supplier', label: 'S', icon: 'cube' }
  ];

  // Get available filters based on user role
  const getAvailableFilters = () => {
    if (!user?.role) return filterButtons.filter(btn => btn.id === '');

    const roleSpecificFilters = {
      retailer: ['', 'wholesaler', 'transporter'],
      wholesaler: ['', 'retailer', 'supplier', 'transporter'],
      supplier: ['', 'wholesaler', 'transporter'],
      transporter: ['', 'retailer', 'wholesaler', 'supplier'],
      admin: ['', 'retailer', 'wholesaler', 'supplier', 'transporter']
    };

    const availableRoles = roleSpecificFilters[user.role] || [''];
    return filterButtons.filter(btn => availableRoles.includes(btn.id));
  };

  // Function to calculate user counts for each filter
  const calculateUserCounts = (users) => {
    if (!users || !Array.isArray(users)) {
      console.log('No users data received for counting');
      return;
    }
    
    console.log('Calculating counts for real users:', users.length);
    
    const counts = {
      '': users.length, // All count
      wholesaler: users.filter(user => user.role === 'wholesaler').length,
      transporter: users.filter(user => user.role === 'transporter').length,
      retailer: users.filter(user => user.role === 'retailer').length,
      supplier: users.filter(user => user.role === 'supplier').length,
    };
    
    console.log('Real calculated counts:', counts);
    setUserCounts(counts);
  };

  const handleSelectUser = async (selectedUser) => {
    try {
      setIsLoading(true);
      
      if (!socketService?.getIsConnected()) {
        Alert.alert(
          'Offline Mode',
          'You are currently offline. Messages will be sent when connection is restored.',
          [{ text: 'OK' }]
        );
      }

      setSelectedUser(selectedUser);
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  const handleFilterPress = (role) => {
    setSelectedRole(role);
  };

  const renderFilterButtons = () => {
    const availableFilters = getAvailableFilters();
    
    return (
      <View style={styles.filtersRow}>
        {availableFilters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedRole === filter.id && styles.filterButtonActive,
              isDarkMode && styles.darkFilterButton,
              selectedRole === filter.id && isDarkMode && styles.darkFilterButtonActive
            ]}
            onPress={() => handleFilterPress(filter.id)}
          >
            <View style={styles.filterButtonContent}>
              <Ionicons
                name={filter.icon}
                size={isSmallDevice ? width * 0.04 : width * 0.045}
                color={
                  selectedRole === filter.id 
                    ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                    : (isDarkMode ? '#D1D5DB' : '#6B7280')
                }
              />
              <View style={styles.labelCountContainer}>
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedRole === filter.id && styles.filterButtonTextActive,
                    isDarkMode && styles.darkFilterButtonText,
                    selectedRole === filter.id && isDarkMode && styles.darkFilterButtonTextActive
                  ]}
                  numberOfLines={1}
                >
                  {filter.label}
                </Text>
                <Text
                  style={[
                    styles.userCount,
                    selectedRole === filter.id && styles.userCountActive,
                    isDarkMode && styles.darkUserCount,
                    selectedRole === filter.id && isDarkMode && styles.darkUserCountActive
                  ]}
                >
                  {userCounts[filter.id] ?? 0}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[
        styles.container,
        isDarkMode && styles.darkContainer
      ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#60A5FA' : '#3B82F6'} />
          <Text style={[
            styles.loadingText,
            isDarkMode && styles.darkText
          ]}>
            Starting conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode && styles.darkContainer
    ]}>
      {!selectedUser ? (
        <View style={styles.userListContainer}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[
                styles.headerTitle,
                isDarkMode && styles.darkText
              ]}>
                Messages
              </Text>
              <View style={[
                styles.connectionStatus,
                isDarkMode && styles.darkConnectionStatus
              ]}>
                <View 
                  style={[
                    styles.statusDot,
                    { 
                      backgroundColor: connectionStatus === 'connected' 
                        ? '#10B981' 
                        : '#EF4444' 
                    }
                  ]} 
                />
                <Text style={[
                  styles.statusText,
                  isDarkMode && styles.darkSubtext
                ]}>
                  {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>

          {/* Filter Buttons Section */}
          <View style={styles.filtersSection}>
            {renderFilterButtons()}
          </View>

          {/* Search Bar Section */}
          <View style={styles.searchSection}>
            <UserList
              role={selectedRole}
              onSelectUser={handleSelectUser}
              isDarkMode={isDarkMode}
              currentUserId={user?._id}
              showSearchOnly={true}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onUsersLoaded={calculateUserCounts}
            />
          </View>

          {/* User List */}
          <View style={styles.userListWrapper}>
            <UserList
              role={selectedRole}
              onSelectUser={handleSelectUser}
              isDarkMode={isDarkMode}
              currentUserId={user?._id}
              showUsersOnly={true}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onUsersLoaded={calculateUserCounts}
            />
          </View>
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <View style={[
            styles.chatHeader,
            isDarkMode && styles.darkChatHeader
          ]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToUsers}
            >
              <Ionicons 
                name="chevron-back" 
                size={width * 0.06} 
                color={isDarkMode ? '#60A5FA' : '#3B82F6'} 
              />
            </TouchableOpacity>
            
            <View style={styles.chatHeaderInfo}>
              <Text style={[
                styles.chatPartnerName,
                isDarkMode && styles.darkText
              ]} numberOfLines={1}>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </Text>
              <Text style={[
                styles.chatPartnerDetails,
                isDarkMode && styles.darkSubtext
              ]} numberOfLines={1}>
                {selectedUser?.businessName} • {selectedUser?.role}
              </Text>
            </View>
            
            <View style={styles.headerSpacer} />
          </View>

          <ChatScreen 
            selectedUser={selectedUser}
            isDarkMode={isDarkMode}
            connectionStatus={connectionStatus}
            onReconnect={onReconnect}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  userListContainer: {
    flex: 1,
    paddingTop: height * 0.005,
  },
  header: {
    paddingHorizontal: width * 0.04,
    paddingBottom: height * 0.005,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.003,
  },
  headerTitle: {
    fontSize: isSmallDevice ? width * 0.05 : width * 0.055,
    fontWeight: '700',
    color: '#111827',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.02,
    paddingVertical: height * 0.004,
    borderRadius: width * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkConnectionStatus: {
    backgroundColor: '#1F2937',
  },
  statusDot: {
    width: width * 0.02,
    height: width * 0.02,
    borderRadius: width * 0.01,
    marginRight: width * 0.01,
  },
  statusText: {
    fontSize: isSmallDevice ? width * 0.025 : width * 0.028,
    fontWeight: '500',
    color: '#4B5563',
  },
  filtersSection: {
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.015,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: width * 0.02,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: height * 0.005,
    borderRadius: width * 0.025,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: height * 0.04,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginHorizontal: width * 0.005,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: width * 0.01,
  },
  labelCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.008,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  darkFilterButton: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  darkFilterButtonActive: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  filterButtonText: {
    fontSize: isSmallDevice ? width * 0.032 : width * 0.035,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  darkFilterButtonText: {
    color: '#D1D5DB',
  },
  darkFilterButtonTextActive: {
    color: '#1F2937',
  },
  userCount: {
    fontSize: isSmallDevice ? width * 0.028 : width * 0.032,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  userCountActive: {
    color: '#FFFFFF',
  },
  darkUserCount: {
    color: '#9CA3AF',
  },
  darkUserCountActive: {
    color: '#1F2937',
  },
  searchSection: {
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.02,
  },
  userListWrapper: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    minHeight: height * 0.07,
  },
  darkChatHeader: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: width * 0.012,
    marginRight: width * 0.01,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatPartnerName: {
    fontSize: isSmallDevice ? width * 0.04 : width * 0.044,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  chatPartnerDetails: {
    fontSize: isSmallDevice ? width * 0.03 : width * 0.033,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: height * 0.001,
  },
  headerSpacer: {
    width: width * 0.07,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.1,
  },
  loadingText: {
    marginTop: height * 0.02,
    fontSize: isSmallDevice ? width * 0.036 : width * 0.04,
    color: '#6B7280',
    textAlign: 'center',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
});

export default ChatContainer;