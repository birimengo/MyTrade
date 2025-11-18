// src/components/ChatComponents/DesktopChatContainer.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaUsers, 
  FaTruck, 
  FaStore, 
  FaCube, 
  FaUserTie, 
  FaComment,
  FaArrowLeft,
  FaSearch,
  FaTimes,
  FaWifi,
  FaCloud,
  FaExclamationTriangle,
  FaRegCommentDots
} from 'react-icons/fa';
import DesktopUserList from './DesktopUserList';
import DesktopChatScreen from './DesktopChatScreen';

const DesktopChatContainer = ({ connectionStatus, onReconnect, userRole }) => {
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
    { id: '', label: 'All', icon: FaUsers, color: 'blue' },
    { id: 'wholesaler', label: 'Wholesalers', icon: FaStore, color: 'green' },
    { id: 'transporter', label: 'Transporters', icon: FaTruck, color: 'orange' },
    { id: 'retailer', label: 'Retailers', icon: FaUserTie, color: 'purple' },
    { id: 'supplier', label: 'Suppliers', icon: FaCube, color: 'red' }
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
    
    const counts = {
      '': users.length,
      wholesaler: users.filter(user => user.role === 'wholesaler').length,
      transporter: users.filter(user => user.role === 'transporter').length,
      retailer: users.filter(user => user.role === 'retailer').length,
      supplier: users.filter(user => user.role === 'supplier').length,
    };
    
    setUserCounts(counts);
  };

  const handleSelectUser = async (selectedUser) => {
    try {
      setIsLoading(true);
      
      if (!socketService?.getIsConnected()) {
        console.log('Offline mode - messages will be queued');
      }

      setSelectedUser(selectedUser);
    } catch (error) {
      console.error('Failed to start conversation:', error);
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
      <div className="flex flex-wrap gap-1 mb-3">
        {availableFilters.map((filter) => {
          const IconComponent = filter.icon;
          const isActive = selectedRole === filter.id;
          const colorClasses = {
            blue: isActive 
              ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
              : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20',
            green: isActive 
              ? 'bg-green-500 text-white border-green-500 shadow-sm' 
              : 'bg-white text-green-600 border-green-200 hover:bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20',
            orange: isActive 
              ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
              : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50 dark:bg-gray-800 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20',
            purple: isActive 
              ? 'bg-purple-500 text-white border-purple-500 shadow-sm' 
              : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50 dark:bg-gray-800 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/20',
            red: isActive 
              ? 'bg-red-500 text-white border-red-500 shadow-sm' 
              : 'bg-white text-red-600 border-red-200 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20'
          };

          return (
            <button
              key={filter.id}
              className={`flex items-center px-2 py-1.5 rounded-md border text-xs transition-all duration-150 hover:scale-105 active:scale-95 ${
                colorClasses[filter.color]
              }`}
              onClick={() => handleFilterPress(filter.id)}
            >
              <IconComponent className="mr-1 text-xs" />
              <span className="font-medium whitespace-nowrap">{filter.label}</span>
              <span className={`ml-1 px-1 py-0.5 rounded text-xs font-bold min-w-4 flex items-center justify-center ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : `bg-${filter.color}-100 text-${filter.color}-800 dark:bg-${filter.color}-900/50 dark:text-${filter.color}-300`
              }`}>
                {userCounts[filter.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 dark:text-green-400';
      case 'connecting': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <FaWifi className="text-green-500 text-xs" />;
      case 'connecting': return <FaCloud className="text-yellow-500 text-xs animate-pulse" />;
      case 'error': return <FaExclamationTriangle className="text-red-500 text-xs" />;
      default: return <FaWifi className="text-gray-500 text-xs" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
          <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
            Starting conversation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {!selectedUser ? (
        // User List View - Ultra Compact Layout
        <div className="flex-1 flex flex-col p-3 max-w-4xl mx-auto w-full">
          {/* Header - Ultra Compact */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`p-1.5 rounded-lg ${
                  isDarkMode ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600 shadow-sm'
                }`}>
                  <FaRegCommentDots className="text-sm" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    Messages
                  </h2>
                  <p className={`text-xs mt-0.5 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Business partners
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center px-2 py-1 rounded-full ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
              } border text-xs`}>
                <div className="flex items-center gap-1">
                  {getConnectionStatusIcon()}
                  <span className={`font-medium ${getConnectionStatusColor()}`}>
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 
                     connectionStatus === 'error' ? 'Failed' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="mb-2">
            <h3 className={`text-xs font-medium mb-1.5 uppercase tracking-wide ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Filter by Role
            </h3>
            {renderFilterButtons()}
          </div>

          {/* Search Bar */}
          <div className="mb-2">
            <DesktopUserList
              role={selectedRole}
              onSelectUser={handleSelectUser}
              isDarkMode={isDarkMode}
              currentUserId={user?._id}
              showSearchOnly={true}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onUsersLoaded={calculateUserCounts}
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-hidden rounded-md">
            <div className={`h-full rounded-md border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`font-semibold text-xs ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {selectedRole ? `${filterButtons.find(f => f.id === selectedRole)?.label}` : 'All Contacts'} 
                  <span className={`ml-1 text-xs font-normal ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    ({userCounts[selectedRole] || 0})
                  </span>
                </h3>
              </div>
              <div className="h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar p-2">
                <DesktopUserList
                  role={selectedRole}
                  onSelectUser={handleSelectUser}
                  isDarkMode={isDarkMode}
                  currentUserId={user?._id}
                  showUsersOnly={true}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  onUsersLoaded={calculateUserCounts}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Chat Screen View - FIXED: Remove overflow-hidden from parent
        <div className="flex-1 flex flex-col min-h-0"> {/* Changed to min-h-0 for proper flexbox containment */}
          {/* Chat Header - Ultra Compact */}
          <div className={`px-3 py-2 border-b ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToUsers}
                className={`p-1.5 rounded-md transition-colors ${
                  isDarkMode 
                    ? 'text-blue-400 hover:bg-gray-700' 
                    : 'text-blue-600 hover:bg-gray-100'
                }`}
              >
                <FaArrowLeft className="text-xs" />
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </h3>
                <p className={`text-xs truncate flex items-center gap-1 mt-0.5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="font-medium">{selectedUser?.businessName}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-current opacity-60"></span>
                  <span className="capitalize">{selectedUser?.role}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Chat Screen - FIXED: Remove overflow-hidden and let DesktopChatScreen handle its own scrolling */}
          <div className="flex-1"> {/* Removed overflow-hidden */}
            <DesktopChatScreen 
              selectedUser={selectedUser}
              isDarkMode={isDarkMode}
              connectionStatus={connectionStatus}
              onReconnect={onReconnect}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopChatContainer;