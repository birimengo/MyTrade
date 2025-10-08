import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaSearch, FaComments, FaFilter, FaTimes, FaUser } from 'react-icons/fa';
import UserList from './UserList';

const ChatSidebar = ({ 
  onSelectConversation, 
  isEmbedded = false, 
  socket,
  autoOpen = false,
  initialFilter = '',
  specificUserId = ''
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [specificUserFilter, setSpecificUserFilter] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    fetchCommunicableUsers();
    
    if (socket) {
      socket.on('onlineUsers', (onlineUserIds) => {
        setOnlineUsers(onlineUserIds);
      });
    }

    return () => {
      if (socket) {
        socket.off('onlineUsers');
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [socket]);

  useEffect(() => {
    if (autoOpen) {
      if (initialFilter) {
        setRoleFilter(initialFilter);
      }
      if (specificUserId) {
        setSpecificUserFilter(specificUserId);
      }
    }
  }, [autoOpen, initialFilter, specificUserId]);

  const fetchCommunicableUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/communicable?userId=${user._id}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users:', data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([
        {
          _id: '1',
          firstName: 'John',
          lastName: 'Wholesaler',
          businessName: 'Kalibu Wholesalers',
          role: 'wholesaler',
          email: 'john@kalibu.com',
          lastSeen: new Date().toISOString(),
          contactPerson: 'John Manager'
        },
        {
          _id: '2',
          firstName: 'Sarah',
          lastName: 'Distributor',
          businessName: 'City Distributors',
          role: 'wholesaler',
          email: 'sarah@citydist.com',
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          contactPerson: 'Sarah Owner'
        },
        {
          _id: '3',
          firstName: 'Mike',
          lastName: 'Supplier',
          businessName: 'Metro Suppliers',
          role: 'supplier',
          email: 'mike@metrosuppliers.com',
          lastSeen: new Date().toISOString(),
          contactPerson: 'Mike Director'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setRoleFilter('');
    setSpecificUserFilter('');
    setSearchTerm('');
  };

  const clearSpecificUserFilter = () => {
    setSpecificUserFilter('');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.businessName && user.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.contactPerson && user.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter ? 
      (user.role === roleFilter || 
       user.userType === roleFilter || 
       user.type === roleFilter ||
       (user.businessType && user.businessType.toLowerCase().includes(roleFilter.toLowerCase()))) 
      : true;
    
    const matchesSpecificUser = specificUserFilter ? 
      user._id === specificUserFilter : true;
    
    return matchesSearch && matchesRole && matchesSpecificUser;
  });

  const getFilterDisplayName = () => {
    if (specificUserFilter) {
      const specificUser = users.find(u => u._id === specificUserFilter);
      return specificUser ? specificUser.businessName || `${specificUser.firstName} ${specificUser.lastName}` : 'Specific User';
    }
    
    if (roleFilter) {
      const filterMap = {
        'wholesaler': 'Wholesalers',
        'supplier': 'Suppliers',
        'retailer': 'Retailers',
        'transporter': 'Transporters',
        'admin': 'Admins'
      };
      return filterMap[roleFilter] || `${roleFilter}s`;
    }
    
    return '';
  };

  const getFilteredOnlineCount = () => {
    return filteredUsers.filter(user => onlineUsers.includes(user._id)).length;
  };

  const getSpecificUserInfo = () => {
    if (!specificUserFilter) return null;
    return users.find(u => u._id === specificUserFilter);
  };

  const specificUser = getSpecificUserInfo();

  // Mobile-responsive heights
  const sidebarHeight = isMobile ? 'min-h-[80vh] h-[80vh]' : 'h-[600px]';
  const userListHeight = isMobile ? 'h-[calc(80vh-80px)]' : 'h-[calc(100%-60px)]';

  return (
    <div className={`flex flex-col ${isEmbedded ? '' : 'bg-white dark:bg-gray-800 rounded-lg shadow'} ${sidebarHeight}`}>
      {isEmbedded && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
          {!specificUserFilter && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400 text-sm" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {(roleFilter || specificUserFilter) && (
            <div className="space-y-2">
              {specificUserFilter && specificUser && (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                  <span className="text-sm text-green-700 dark:text-green-300 flex items-center">
                    <FaUser className="mr-2" />
                    Chat with: {specificUser.businessName || `${specificUser.firstName} ${specificUser.lastName}`}
                  </span>
                  <button 
                    onClick={clearSpecificUserFilter}
                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 flex items-center"
                  >
                    <FaTimes className="mr-1" />
                    Show All
                  </button>
                </div>
              )}
              
              {roleFilter && !specificUserFilter && (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  <span className="text-sm text-blue-700 dark:text-blue-300 flex items-center">
                    <FaFilter className="mr-2" />
                    Showing: {getFilterDisplayName()}
                  </span>
                  <button 
                    onClick={clearFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center"
                  >
                    <FaTimes className="mr-1" />
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {specificUserFilter ? 'Direct Chat' : 'Online Users'}
          </span>
          <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
            {specificUserFilter && specificUser ? (
              onlineUsers.includes(specificUser._id) ? '🟢 Online' : '⚫ Offline'
            ) : (
              `${getFilteredOnlineCount()} of ${filteredUsers.length} online`
            )}
          </span>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${userListHeight}`}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <FaComments className="text-3xl text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No users available to chat with</p>
            {roleFilter && !specificUserFilter && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                No {getFilterDisplayName().toLowerCase()} found
              </p>
            )}
            {specificUserFilter && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">User not found</p>
            )}
            {!roleFilter && !specificUserFilter && (
              <button 
                onClick={fetchCommunicableUsers}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Loading
              </button>
            )}
          </div>
        ) : (
          <UserList 
            users={filteredUsers} 
            onSelectUser={onSelectConversation}
            onlineUsers={onlineUsers}
            highlightUser={specificUserFilter}
            isMobile={isMobile}
          />
        )}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/30">
          <div className="grid grid-cols-2 gap-1">
            <span>Total Users:</span>
            <span className="text-right">{users.length}</span>
            <span>Filtered:</span>
            <span className="text-right">{filteredUsers.length}</span>
            <span>Role Filter:</span>
            <span className="text-right">{roleFilter || 'None'}</span>
            <span>Specific User:</span>
            <span className="text-right">{specificUserFilter || 'None'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;