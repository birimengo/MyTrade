// src/components/ChatComponents/UserList.js
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  Alert,
  Dimensions,
  TextInput
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const UserList = ({ 
  role, 
  onSelectUser, 
  isDarkMode, 
  currentUserId, 
  showSearchOnly = false, 
  showUsersOnly = false,
  searchQuery = '',
  onSearchChange,
  onUsersLoaded
}) => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [lastMessages, setLastMessages] = useState({});
  const [conversations, setConversations] = useState([]);
  
  // Use refs to prevent infinite loops
  const previousUsersRef = useRef([]);
  const hasSentInitialDataRef = useRef(false);

  const getCommunicableRoles = (currentUserRole) => {
    switch (currentUserRole) {
      case 'retailer':
        return ['wholesaler', 'transporter'];
      case 'wholesaler':
        return ['retailer', 'supplier', 'transporter'];
      case 'supplier':
        return ['wholesaler', 'transporter'];
      case 'transporter':
        return ['retailer', 'wholesaler', 'supplier'];
      case 'admin':
        return ['retailer', 'wholesaler', 'supplier', 'transporter'];
      default:
        return [];
    }
  };

  // Fetch user conversations to get last messages
  const fetchConversations = async () => {
    try {
      if (!currentUserId || !token) return [];

      const response = await axios.get(`${API_BASE_URL}/api/conversations`, {
        params: { userId: currentUserId },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        return response.data.conversations || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  };

  // Fetch messages for a specific conversation to get the last message
  const fetchLastMessageForConversation = async (conversationId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
        params: { 
          userId: currentUserId,
          page: 1,
          limit: 1
        },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success && response.data.messages.length > 0) {
        return response.data.messages[0]; // Last message (most recent)
      }
      return null;
    } catch (error) {
      console.error('Error fetching last message:', error);
      return null;
    }
  };

  // Process conversations to extract last messages
  const processLastMessages = async (conversationsList, usersList) => {
    const messagesMap = {};
    
    for (const conversation of conversationsList) {
      // Get the other participant (not current user)
      const otherParticipant = conversation.participants.find(
        participant => participant._id !== currentUserId
      );
      
      if (otherParticipant) {
        // Use conversation's last message or fetch the most recent one
        if (conversation.lastMessage) {
          messagesMap[otherParticipant._id] = {
            content: conversation.lastMessage,
            createdAt: conversation.lastMessageAt || conversation.updatedAt,
            isMyMessage: conversation.lastMessageSender === currentUserId
          };
        } else {
          // Fetch the actual last message if not available in conversation
          const lastMessage = await fetchLastMessageForConversation(conversation._id);
          if (lastMessage) {
            messagesMap[otherParticipant._id] = {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              isMyMessage: lastMessage.senderId === currentUserId
            };
          }
        }
      }
    }
    
    setLastMessages(messagesMap);
  };

  const fetchUsersByRole = async (targetRole) => {
    try {
      let endpoint = '';
      let dataKey = '';
      
      switch (targetRole) {
        case 'wholesaler':
          endpoint = '/api/wholesalers/all';
          dataKey = 'wholesalers';
          break;
        case 'retailer':
          endpoint = '/api/retailers/all';
          dataKey = 'retailers';
          break;
        case 'transporter':
          endpoint = '/api/transporters/active';
          dataKey = 'transporters';
          break;
        case 'supplier':
          endpoint = '/api/users/suppliers';
          dataKey = 'users';
          break;
        default:
          endpoint = '/api/users';
          dataKey = 'users';
      }

      console.log(`Fetching ${targetRole}s from: ${endpoint}`);
      
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`API Response for ${targetRole}:`, response.data);

      if (response.data && response.data.success) {
        if (response.data[dataKey]) return response.data[dataKey];
        else if (response.data.users) return response.data.users;
        else if (Array.isArray(response.data)) return response.data;
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching ${targetRole}s:`, error);
      // Return empty array instead of throwing to continue with other roles
      return [];
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allowedRoles = getCommunicableRoles(user?.role);
      
      if (role && !allowedRoles.includes(role)) {
        const emptyUsers = [];
        setUsers(emptyUsers);
        setFilteredUsers(emptyUsers);
        
        if (onUsersLoaded && JSON.stringify(previousUsersRef.current) !== JSON.stringify(emptyUsers)) {
          previousUsersRef.current = emptyUsers;
          onUsersLoaded(emptyUsers);
        }
        
        setLoading(false);
        return;
      }

      // Fetch conversations first to get last messages
      const userConversations = await fetchConversations();
      setConversations(userConversations);

      const targetRoles = role ? [role] : allowedRoles;
      let allUsers = [];

      // Fetch users for each allowed role
      for (const targetRole of targetRoles) {
        try {
          const roleUsers = await fetchUsersByRole(targetRole);
          console.log(`Fetched ${roleUsers.length} ${targetRole}s`);
          
          const usersWithRole = roleUsers.map(userData => ({
            ...userData,
            role: userData.role || targetRole,
            lastSeen: userData.lastSeen || userData.lastActive || userData.updatedAt
          }));
          
          allUsers = [...allUsers, ...usersWithRole];
        } catch (roleError) {
          console.warn(`Failed to fetch ${targetRole}s:`, roleError);
        }
      }

      console.log('Total users fetched:', allUsers.length);

      // Filter out current user and ensure roles are allowed
      const filteredUsers = allUsers.filter(u => {
        const isNotCurrentUser = u._id !== currentUserId;
        const isAllowedRole = allowedRoles.includes(u.role);
        return isNotCurrentUser && isAllowedRole;
      });

      console.log('Filtered users after processing:', filteredUsers.length);

      setUsers(filteredUsers);
      setFilteredUsers(filteredUsers);
      
      // Process last messages from conversations
      await processLastMessages(userConversations, filteredUsers);
      
      // PASS DATA TO PARENT - Only if data has changed
      if (onUsersLoaded && JSON.stringify(previousUsersRef.current) !== JSON.stringify(filteredUsers)) {
        console.log('Sending new user data to parent:', filteredUsers.length);
        previousUsersRef.current = filteredUsers;
        onUsersLoaded(filteredUsers);
        hasSentInitialDataRef.current = true;
      }
      
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setError(error.message);
      
      // Even in error case, try to fetch conversations for last messages
      try {
        const userConversations = await fetchConversations();
        await processLastMessages(userConversations, []);
      } catch (convError) {
        console.error('Error fetching conversations in fallback:', convError);
      }
      
      Alert.alert(
        'Connection Issue',
        'Some data may not load properly. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showSearchOnly) return;
    fetchUsers();
  }, [role, token, currentUserId, user?.role, showSearchOnly]);

  // Handle search filtering
  useEffect(() => {
    const query = searchQuery || localSearchQuery;
    
    if (query.trim() === '') {
      setFilteredUsers(users);
    } else {
      const searchTerm = query.toLowerCase().trim();
      const filtered = users.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm) ||
        user.lastName?.toLowerCase().includes(searchTerm) ||
        user.businessName?.toLowerCase().includes(searchTerm) ||
        user.role?.toLowerCase().includes(searchTerm) ||
        user.city?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, localSearchQuery, users]);

  // Send initial data only once when component mounts
  useEffect(() => {
    if (!showSearchOnly && users.length > 0 && onUsersLoaded && !hasSentInitialDataRef.current) {
      console.log('Sending initial user data to parent:', users.length);
      previousUsersRef.current = users;
      onUsersLoaded(users);
      hasSentInitialDataRef.current = true;
    }
  }, [users, showSearchOnly, onUsersLoaded]);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    try {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffMs = now - lastSeenDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return lastSeenDate.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const messageDate = new Date(timestamp);
      const now = new Date();
      const diffMs = now - messageDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (error) {
      return '';
    }
  };

  const truncateMessage = (message, maxLength = 35) => {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getAvatarText = (user) => {
    if (!user) return '??';
    
    try {
      if (user.businessName) {
        const words = user.businessName.split(' ').filter(word => word.length > 0);
        if (words.length >= 2) {
          return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
        } else if (words.length === 1) {
          return words[0].substring(0, 2).toUpperCase();
        }
      }
      
      const firstNameChar = user.firstName ? user.firstName.charAt(0) : '?';
      const lastNameChar = user.lastName ? user.lastName.charAt(0) : '?';
      return (firstNameChar + lastNameChar).toUpperCase();
    } catch (error) {
      console.error('Error generating avatar text:', error);
      return '??';
    }
  };

  const handleLocalSearchChange = (query) => {
    setLocalSearchQuery(query);
    if (onSearchChange) {
      onSearchChange(query);
    }
  };

  const renderUserItem = ({ item }) => {
    const lastMessage = lastMessages[item._id];
    const isOnline = item.isOnline || 
                    (item.lastSeen && (new Date() - new Date(item.lastSeen)) < 5 * 60 * 1000); // Online if last seen < 5 min ago
    
    return (
      <TouchableOpacity 
        style={[
          styles.userCard, 
          isDarkMode && styles.darkUserCard
        ]}
        onPress={() => onSelectUser(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getAvatarText(item)}
            </Text>
          </View>
          <View style={[
            styles.onlineIndicator,
            { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }
          ]} />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[
              styles.userName, 
              isDarkMode && styles.darkText
            ]} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            {lastMessage ? (
              <Text style={[
                styles.messageTime,
                isDarkMode && styles.darkSubtext
              ]}>
                {formatMessageTime(lastMessage.createdAt)}
              </Text>
            ) : (
              <Text style={[
                styles.statusText,
                isOnline ? styles.onlineStatus : styles.offlineStatus
              ]}>
                {isOnline ? 'Online' : formatLastSeen(item.lastSeen)}
              </Text>
            )}
          </View>
          
          <Text style={[
            styles.businessName, 
            isDarkMode && styles.darkSubtext
          ]} numberOfLines={1}>
            {item.businessName}
          </Text>
          
          {lastMessage ? (
            <View style={styles.messageRow}>
              <Text style={[
                styles.lastMessage,
                isDarkMode && styles.darkSubtext
              ]} numberOfLines={1}>
                {lastMessage.isMyMessage ? 'You: ' : ''}
                {truncateMessage(lastMessage.content)}
              </Text>
            </View>
          ) : (
            <View style={styles.detailsRow}>
              <Text style={[
                styles.userRole, 
                isDarkMode && styles.darkSubtext
              ]} numberOfLines={1}>
                {item.role}
              </Text>
              {item.city && (
                <Text style={[
                  styles.userLocation, 
                  isDarkMode && styles.darkSubtext
                ]} numberOfLines={1}>
                  {item.city}
                </Text>
              )}
            </View>
          )}
        </View>

        <Ionicons 
          name="chatbubble-ellipses-outline" 
          size={width * 0.055} 
          color={isDarkMode ? '#60A5FA' : '#3B82F6'} 
        />
      </TouchableOpacity>
    );
  };

  // Show only search bar if prop is set
  if (showSearchOnly) {
    return (
      <View style={[
        styles.searchContainer,
        isDarkMode && styles.darkSearchContainer
      ]}>
        <Ionicons 
          name="search" 
          size={width * 0.045} 
          color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.searchInput,
            isDarkMode && styles.darkSearchInput
          ]}
          placeholder="Search users..."
          placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
          value={searchQuery || localSearchQuery}
          onChangeText={handleLocalSearchChange}
          clearButtonMode="while-editing"
        />
        {(searchQuery || localSearchQuery).length > 0 && (
          <TouchableOpacity 
            onPress={() => handleLocalSearchChange('')}
            style={styles.clearButton}
          >
            <Ionicons 
              name="close-circle" 
              size={width * 0.045} 
              color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (loading && !showUsersOnly) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={isDarkMode ? '#60A5FA' : '#3B82F6'} />
        <Text style={[
          styles.loadingText, 
          isDarkMode && styles.darkText
        ]}>
          Loading {role ? `${role}s` : 'users'}...
        </Text>
      </View>
    );
  }

  if (error && !showUsersOnly) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={width * 0.18} color="#EF4444" />
        <Text style={[
          styles.errorText, 
          isDarkMode && styles.darkText
        ]}>
          Connection Issue
        </Text>
        <Text style={[
          styles.errorSubtext, 
          isDarkMode && styles.darkSubtext
        ]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[
            styles.retryButton, 
            isDarkMode && styles.darkRetryButton
          ]}
          onPress={fetchUsers}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredUsers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons 
            name="search-outline" 
            size={width * 0.18} 
            color={isDarkMode ? '#6B7280' : '#9CA3AF'} 
          />
          <Text style={[
            styles.emptyText, 
            isDarkMode && styles.darkText
          ]}>
            {(searchQuery || localSearchQuery) ? 'No users found' : 'No users available'}
          </Text>
          <Text style={[
            styles.emptySubtext, 
            isDarkMode && styles.darkSubtext
          ]}>
            {(searchQuery || localSearchQuery) 
              ? 'Try adjusting your search terms' 
              : 'No users available to chat with at the moment'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.08,
    paddingVertical: height * 0.08,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.01,
    borderRadius: width * 0.035,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: height * 0.05,
  },
  darkSearchContainer: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: width * 0.025,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallDevice ? width * 0.035 : width * 0.038,
    color: '#374151',
    padding: 0,
  },
  darkSearchInput: {
    color: '#FFFFFF',
  },
  clearButton: {
    padding: width * 0.008,
    marginLeft: width * 0.015,
  },
  loadingText: {
    marginTop: height * 0.015,
    fontSize: isSmallDevice ? width * 0.036 : width * 0.04,
    color: '#374151',
    textAlign: 'center',
  },
  errorText: {
    marginTop: height * 0.015,
    fontSize: isSmallDevice ? width * 0.04 : width * 0.044,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: height * 0.008,
    fontSize: isSmallDevice ? width * 0.032 : width * 0.035,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: height * 0.025,
  },
  emptyText: {
    marginTop: height * 0.015,
    fontSize: isSmallDevice ? width * 0.04 : width * 0.044,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: height * 0.008,
    fontSize: isSmallDevice ? width * 0.032 : width * 0.035,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: width * 0.045,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.012,
    borderRadius: width * 0.025,
    minWidth: width * 0.25,
  },
  darkRetryButton: {
    backgroundColor: '#2563EB',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: isSmallDevice ? width * 0.034 : width * 0.037,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: height * 0.015,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.035,
    marginHorizontal: width * 0.035,
    marginVertical: height * 0.004,
    borderRadius: width * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    minHeight: height * 0.085,
  },
  darkUserCard: {
    backgroundColor: '#1F2937',
    shadowOpacity: 0.15,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: width * 0.03,
  },
  avatar: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: isSmallDevice ? width * 0.035 : width * 0.038,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -width * 0.004,
    right: -width * 0.004,
    width: width * 0.025,
    height: width * 0.025,
    borderRadius: width * 0.0125,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.002,
  },
  userName: {
    fontSize: isSmallDevice ? width * 0.035 : width * 0.038,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: width * 0.015,
  },
  messageTime: {
    fontSize: isSmallDevice ? width * 0.028 : width * 0.03,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusText: {
    fontSize: isSmallDevice ? width * 0.028 : width * 0.03,
    fontWeight: '500',
  },
  onlineStatus: {
    color: '#10B981',
  },
  offlineStatus: {
    color: '#6B7280',
  },
  businessName: {
    fontSize: isSmallDevice ? width * 0.032 : width * 0.034,
    color: '#374151',
    marginBottom: height * 0.001,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: isSmallDevice ? width * 0.03 : width * 0.032,
    color: '#6B7280',
    flex: 1,
    marginRight: width * 0.015,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRole: {
    fontSize: isSmallDevice ? width * 0.028 : width * 0.03,
    color: '#6B7280',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  userLocation: {
    fontSize: isSmallDevice ? width * 0.028 : width * 0.03,
    color: '#6B7280',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#D1D5DB',
  },
});

export default UserList;