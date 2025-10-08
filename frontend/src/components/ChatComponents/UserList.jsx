import React, { useState, useEffect } from 'react';
import { FaStore, FaIndustry, FaShippingFast, FaBoxes, FaUser, FaCircle, FaStar } from 'react-icons/fa';

const UserList = ({ users, onSelectUser, onlineUsers = [], highlightUser = '', isMobile = false }) => {
  const [onlineUsersSet, setOnlineUsersSet] = useState(new Set(onlineUsers));

  useEffect(() => {
    setOnlineUsersSet(new Set(onlineUsers));
  }, [onlineUsers]);

  const getRoleIcon = (role) => {
    switch(role) {
      case 'retailer': return <FaStore className="text-blue-500 text-sm" />;
      case 'wholesaler': return <FaBoxes className="text-green-500 text-sm" />;
      case 'supplier': return <FaIndustry className="text-amber-500 text-sm" />;
      case 'transporter': return <FaShippingFast className="text-indigo-500 text-sm" />;
      default: return <FaUser className="text-gray-500 text-sm" />;
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'retailer': 'Retailer',
      'wholesaler': 'Wholesaler',
      'supplier': 'Supplier',
      'transporter': 'Transporter',
      'admin': 'Admin'
    };
    return roleMap[role] || role;
  };

  const getUserDisplayName = (user) => {
    return user.businessName || `${user.firstName} ${user.lastName}`;
  };

  const getUserInitials = (user) => {
    if (user.businessName) {
      return user.businessName.charAt(0).toUpperCase();
    }
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const isUserOnline = (userId) => {
    return onlineUsersSet.has(userId);
  };

  const isHighlighted = (userId) => {
    return highlightUser === userId;
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getStatusColor = (userId) => {
    return isUserOnline(userId) ? 'text-green-500' : 'text-gray-400';
  };

  const getHighlightClass = (userId) => {
    return isHighlighted(userId) 
      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
      : 'hover:bg-gray-50 dark:hover:bg-gray-700';
  };

  const userItemPadding = isMobile ? 'p-2' : 'p-3';
  const avatarSize = isMobile ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = isMobile ? 'text-xs' : 'text-sm';

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {users.map(user => (
        <div
          key={user._id}
          onClick={() => onSelectUser(user)}
          className={`${userItemPadding} flex items-center space-x-3 rounded-lg cursor-pointer transition-all duration-200 group ${getHighlightClass(user._id)}`}
        >
          <div className="relative flex-shrink-0">
            <div className={`${avatarSize} rounded-full flex items-center justify-center text-white font-semibold ${isMobile ? 'text-xs' : 'text-sm'} ${
              isHighlighted(user._id) 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}>
              {getUserInitials(user)}
            </div>
            <div className={`absolute -bottom-1 -right-1 ${getStatusColor(user._id)}`}>
              <FaCircle className={`${isMobile ? 'text-[8px]' : 'text-xs'} bg-white dark:bg-gray-800 rounded-full`} />
            </div>
            {isHighlighted(user._id) && (
              <div className="absolute -top-1 -left-1 text-yellow-500">
                <FaStar className="text-xs" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className={`${textSize} font-medium truncate ${
                  isHighlighted(user._id) 
                    ? 'text-blue-900 dark:text-blue-100' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {getUserDisplayName(user)}
                </p>
                <div className="flex items-center space-x-1">
                  {getRoleIcon(user.role)}
                  <span className={`${textSize} text-gray-500 dark:text-gray-400 capitalize`}>
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
              </div>
              
              {isUserOnline(user._id) ? (
                <span className={`${textSize} text-green-500 font-medium`}>Online</span>
              ) : (
                <span className={`${textSize} text-gray-400`}>
                  {formatLastSeen(user.lastSeen)}
                </span>
              )}
            </div>
            
            {!isMobile && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
                {user.contactPerson && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2">
                    {user.contactPerson}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserList;