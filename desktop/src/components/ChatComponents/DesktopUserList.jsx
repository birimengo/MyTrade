// src/components/ChatComponents/DesktopUserList.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaComment, FaSearch, FaTimes, FaCheckCircle, FaRegClock, FaRegUser } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const DesktopUserList = ({ 
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
  
  const previousUsersRef = useRef([]);
  const hasSentInitialDataRef = useRef(false);

  // Get communicable roles based on current user role
  const getCommunicableRoles = (currentUserRole) => {
    switch (currentUserRole) {
      case 'retailer':
        return ['wholesaler', 'transporter'];
      case 'wholesaler':
        return ['retailer', 'supplier', 'transporter'];
      case 'supplier':
        return ['wholesaler', 'transporter'];
      case 'transporter':
        return ['retailer', 'wholesaler', 'supplier', 'transporter'];
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

  // Fetch last message for a conversation
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
        return response.data.messages[0];
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
      const otherParticipant = conversation.participants.find(
        participant => participant._id !== currentUserId
      );
      
      if (otherParticipant) {
        if (conversation.lastMessage) {
          messagesMap[otherParticipant._id] = {
            content: conversation.lastMessage,
            createdAt: conversation.lastMessageAt || conversation.updatedAt,
            isMyMessage: conversation.lastMessageSender === currentUserId
          };
        } else {
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

  // Fetch suppliers with category matching
  const fetchSuppliers = async () => {
    try {
      if (user?.role === 'transporter') {
        const response = await axios.get(`${API_BASE_URL}/api/users/communicable`, {
          params: { userId: currentUserId },
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.success) {
          const suppliers = response.data.users.filter(u => u.role === 'supplier') || [];
          return suppliers.map(supplier => ({
            ...supplier,
            role: 'supplier',
            lastSeen: supplier.lastSeen || supplier.lastActive || supplier.updatedAt
          }));
        }
        return [];
      }

      if (user?.role === 'wholesaler' && user?.productCategory) {
        const response = await axios.get(`${API_BASE_URL}/api/users/suppliers`, {
          params: { category: user.productCategory },
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.success) {
          const suppliers = response.data.suppliers || [];
          return suppliers.map(supplier => ({
            ...supplier,
            role: 'supplier',
            isCategoryMatch: true,
            lastSeen: supplier.lastSeen || supplier.lastActive || supplier.updatedAt
          }));
        }
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/users/suppliers`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const suppliers = response.data.suppliers || [];
        return suppliers.map(supplier => ({
          ...supplier,
          role: 'supplier',
          isCategoryMatch: user?.productCategory ? supplier.productCategory === user.productCategory : false,
          lastSeen: supplier.lastSeen || supplier.lastActive || supplier.updatedAt
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  };

  // Fetch users by role from API
  const fetchUsersByRole = async (targetRole) => {
    try {
      if (user?.role === 'transporter') {
        const response = await axios.get(`${API_BASE_URL}/api/users/communicable`, {
          params: { userId: currentUserId },
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.success) {
          const roleUsers = response.data.users.filter(u => u.role === targetRole) || [];
          return roleUsers.map(userData => ({
            ...userData,
            role: userData.role || targetRole,
            lastSeen: userData.lastSeen || userData.lastActive || userData.updatedAt
          }));
        }
        return [];
      }

      if (targetRole === 'supplier') {
        return await fetchSuppliers();
      }

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
        default:
          endpoint = '/api/users/communicable';
          dataKey = 'users';
      }

      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        let usersData = [];
        
        if (response.data[dataKey]) {
          usersData = response.data[dataKey];
        } else if (response.data.users) {
          usersData = response.data.users;
        } else if (Array.isArray(response.data)) {
          usersData = response.data;
        }
        
        return usersData.map(userData => ({
          ...userData,
          role: userData.role || targetRole,
          lastSeen: userData.lastSeen || userData.lastActive || userData.updatedAt
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching ${targetRole}s:`, error);
      return [];
    }
  };

  // Main fetch users function
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

      // Fetch conversations first
      const userConversations = await fetchConversations();
      setConversations(userConversations);

      const targetRoles = role ? [role] : allowedRoles;
      let allUsers = [];

      // Fetch users for each allowed role
      for (const targetRole of targetRoles) {
        try {
          const roleUsers = await fetchUsersByRole(targetRole);
          allUsers = [...allUsers, ...roleUsers];
        } catch (roleError) {
          console.warn(`Failed to fetch ${targetRole}s:`, roleError);
        }
      }

      // Filter out current user and ensure roles are allowed
      const filteredUsers = allUsers.filter(u => {
        const isNotCurrentUser = u._id !== currentUserId;
        const isAllowedRole = allowedRoles.includes(u.role);
        return isNotCurrentUser && isAllowedRole;
      });

      setUsers(filteredUsers);
      setFilteredUsers(filteredUsers);
      
      // Process last messages from conversations
      await processLastMessages(userConversations, filteredUsers);
      
      // Pass data to parent
      if (onUsersLoaded && JSON.stringify(previousUsersRef.current) !== JSON.stringify(filteredUsers)) {
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

  useEffect(() => {
    if (!showSearchOnly && users.length > 0 && onUsersLoaded && !hasSentInitialDataRef.current) {
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
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
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

      if (diffMins < 1) return 'Now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (error) {
      return '';
    }
  };

  const truncateMessage = (message, maxLength = 20) => {
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

  const renderUserItem = (item) => {
    const lastMessage = lastMessages[item._id];
    const isOnline = item.isOnline || 
                    (item.lastSeen && (new Date() - new Date(item.lastSeen)) < 5 * 60 * 1000);
    
    const isCategoryMatch = item.isCategoryMatch || 
                           (user?.role === 'wholesaler' && user?.productCategory && 
                            item.role === 'supplier' && item.productCategory === user.productCategory);
    
    return (
      <div
        key={item._id}
        className={`p-1 rounded border cursor-pointer transition-colors mb-0.5 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
            : 'bg-white border-gray-200 hover:bg-gray-50'
        } ${isCategoryMatch ? 'border-l-2 border-l-green-500' : ''}`}
        onClick={() => onSelectUser(item)}
      >
        <div className="flex items-center gap-1.5">
          <div className="relative flex-shrink-0">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs ${
              isCategoryMatch 
                ? 'bg-green-500' 
                : (isDarkMode ? 'bg-blue-600' : 'bg-blue-500')
            }`}>
              {getAvatarText(item)}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border ${
              isDarkMode ? 'border-gray-800' : 'border-white'
            } ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className={`font-semibold truncate text-xs ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {item.firstName} {item.lastName}
                {isCategoryMatch && (
                  <FaCheckCircle className="inline ml-0.5 text-green-500 text-xs" title="Same category" />
                )}
              </h4>
              {lastMessage ? (
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-600'
                }`}>
                  {formatMessageTime(lastMessage.createdAt)}
                </span>
              ) : (
                <span className={`text-xs ${
                  isOnline 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {isOnline ? 'Online' : formatLastSeen(item.lastSeen)}
                </span>
              )}
            </div>

            <p className={`text-xs truncate ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {item.businessName}
            </p>

            {lastMessage ? (
              <p className={`text-xs truncate ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
                <span className={lastMessage.isMyMessage ? "font-medium text-blue-500 dark:text-blue-400" : ""}>
                  {lastMessage.isMyMessage ? 'You: ' : ''}
                </span>
                {truncateMessage(lastMessage.content)}
              </p>
            ) : (
              <div className="flex items-center gap-0.5 flex-wrap">
                <span className={`px-1 py-0.5 rounded text-xs ${
                  isDarkMode 
                    ? 'bg-blue-900/50 text-blue-300' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.role}
                </span>
                {isCategoryMatch && (
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    isDarkMode 
                      ? 'bg-green-900/50 text-green-300' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    Match
                  </span>
                )}
              </div>
            )}
          </div>

          <button className={`p-0.5 rounded ${
            isDarkMode 
              ? 'text-blue-400 hover:bg-gray-700' 
              : 'text-blue-600 hover:bg-gray-100'
          }`}>
            <FaComment className="text-xs" />
          </button>
        </div>
      </div>
    );
  };

  // Show only search bar if prop is set
  if (showSearchOnly) {
    return (
      <div className={`relative rounded border transition-colors ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700 focus-within:border-blue-500' 
          : 'bg-white border-gray-300 focus-within:border-blue-500'
      }`}>
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <FaSearch className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery || localSearchQuery}
          onChange={(e) => handleLocalSearchChange(e.target.value)}
          className={`w-full pl-6 pr-6 py-1.5 rounded focus:outline-none text-xs ${
            isDarkMode 
              ? 'bg-gray-800 text-white placeholder-gray-500' 
              : 'bg-white text-gray-900 placeholder-gray-400'
          }`}
        />
        {(searchQuery || localSearchQuery).length > 0 && (
          <button
            onClick={() => handleLocalSearchChange('')}
            className="absolute inset-y-0 right-0 pr-2 flex items-center"
          >
            <FaTimes className={`text-xs ${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`} />
          </button>
        )}
      </div>
    );
  }

  if (loading && !showUsersOnly) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mx-auto mb-1"></div>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading {role ? `${role}s` : 'users'}...
          </p>
        </div>
      </div>
    );
  }

  if (error && !showUsersOnly) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-center max-w-xs mx-3">
          <div className="w-6 h-6 mx-auto mb-1 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <FaTimes className="text-red-500 text-xs" />
          </div>
          <h3 className={`text-xs font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Connection Issue
          </h3>
          <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={fetchUsers}
            className={`px-2 py-1 rounded text-xs font-medium ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {filteredUsers.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <div className="text-center max-w-xs mx-3">
            <div className="w-8 h-8 mx-auto mb-1 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <FaRegUser className={`text-sm ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-xs font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {(searchQuery || localSearchQuery) ? 'No users found' : 'No contacts'}
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {(searchQuery || localSearchQuery) 
                ? 'Try different search terms' 
                : 'No users available'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredUsers.map(renderUserItem)}
        </div>
      )}
    </div>
  );
};

export default DesktopUserList;