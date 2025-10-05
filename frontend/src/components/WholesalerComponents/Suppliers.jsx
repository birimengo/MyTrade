// components/WholesalerComponents/Suppliers.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        setIsConnected(true);
        newSocket.emit('authenticate', user.id);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('onlineUsers', (userIds) => {
        setOnlineUsers(new Set(userIds));
      });

      newSocket.on('userStatusChanged', (data) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          if (data.isOnline) {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) {
          newSocket.emit('userOffline');
          newSocket.close();
        }
      };
    }
  }, []);

  // Handle user status management
  useEffect(() => {
    if (socket) {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      socket.emit('authenticate', currentUser.id);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          socket.emit('userOnline');
        } else {
          socket.emit('userOffline');
        }
      };

      const handleBeforeUnload = () => {
        socket.emit('userOffline');
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (socket) {
          socket.emit('userOffline');
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [socket]);

  // Filter suppliers based on search term
  useEffect(() => {
    if (suppliers.length > 0) {
      const filtered = suppliers.filter(supplier => 
        supplier.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.productCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  const isUserOnline = (userId) => onlineUsers.has(userId);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never online';
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Fetch data
  useEffect(() => {
    const fetchUserAndSuppliers = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Please log in to view suppliers');
          setLoading(false);
          return;
        }

        const userResponse = await fetch('http://localhost:5000/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) throw new Error('Failed to fetch user profile');
        const userData = await userResponse.json();
        if (!userData.success) throw new Error(userData.message);

        setCurrentUser(userData.user);

        const suppliersResponse = await fetch(
          `http://localhost:5000/api/users/suppliers?category=${encodeURIComponent(userData.user.productCategory)}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!suppliersResponse.ok) throw new Error('Failed to fetch suppliers');
        const suppliersData = await suppliersResponse.json();
        
        if (suppliersData.success) {
          setSuppliers(suppliersData.suppliers || []);
          setFilteredSuppliers(suppliersData.suppliers || []);
        }
      } catch (error) {
        setError(error.message);
        // Fallback mock data
        setSuppliers([
          { 
            _id: '1', firstName: 'Tech', lastName: 'Manufacturer', 
            businessName: 'Tech Manufacturers Ltd', email: 'tech@example.com', 
            phone: '0785123456', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', isOnline: true, lastSeen: new Date()
          },
          { 
            _id: '2', firstName: 'Fashion', lastName: 'Supplier', 
            businessName: 'Fashion Wholesalers Inc', email: 'fashion@example.com', 
            phone: '0785654321', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', isOnline: false, 
            lastSeen: new Date(Date.now() - 30 * 60 * 1000)
          },
          { 
            _id: '3', firstName: 'Electro', lastName: 'Supplies', 
            businessName: 'Electro Supplies UG', email: 'electro@example.com', 
            phone: '0785123457', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', isOnline: true, 
            lastSeen: new Date()
          }
        ]);
        setFilteredSuppliers([
          { 
            _id: '1', firstName: 'Tech', lastName: 'Manufacturer', 
            businessName: 'Tech Manufacturers Ltd', email: 'tech@example.com', 
            phone: '0785123456', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', isOnline: true, lastSeen: new Date()
          },
          { 
            _id: '2', firstName: 'Fashion', lastName: 'Supplier', 
            businessName: 'Fashion Wholesalers Inc', email: 'fashion@example.com', 
            phone: '0785654321', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', isOnline: false, 
            lastSeen: new Date(Date.now() - 30 * 60 * 1000)
          },
          { 
            _id: '3', firstName: 'Electro', lastName: 'Supplies', 
            businessName: 'Electro Supplies UG', email: 'electro@example.com', 
            phone: '0785123457', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', isOnline: true, 
            lastSeen: new Date()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSuppliers();
  }, []);

  const handleContactSupplier = (supplier) => {
    const isOnline = isUserOnline(supplier._id);
    if (isOnline) {
      alert(`Opening chat with ${supplier.businessName || supplier.firstName + ' ' + supplier.lastName}`);
    } else {
      alert(`${supplier.businessName || supplier.firstName + ' ' + supplier.lastName} is currently offline. Try again later.`);
    }
  };

  const handleViewProducts = (supplier) => {
    navigate(`/wholesaler/supplier/${supplier._id}/products`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-3"></div>
              <div className="text-gray-700 dark:text-gray-300 text-base font-medium">Loading suppliers...</div>
              <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">Finding the best suppliers for you</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Suppliers
              </h1>
              {currentUser && (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Matching suppliers in <span className="font-semibold text-blue-600 dark:text-blue-400">{currentUser.productCategory}</span>
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                isConnected 
                  ? 'bg-green-500 text-white shadow' 
                  : 'bg-red-500 text-white shadow'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-1.5 bg-white ${isConnected ? 'animate-pulse' : ''}`}></div>
                {isConnected ? 'Live' : 'Offline'}
              </div>
              <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow border border-gray-200 dark:border-gray-700">
                <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  {onlineUsers.size} Online
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex-1 w-full">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search suppliers by name, category, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'supplier' : 'suppliers'} found
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 transition-colors duration-300">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-2">
                <h3 className="text-red-800 dark:text-red-200 font-medium text-xs">Error loading suppliers</h3>
                <p className="text-red-700 dark:text-red-300 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Suppliers Grid */}
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="max-w-md mx-auto">
              <svg className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">No suppliers found</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                {searchTerm ? 'Try adjusting your search terms' : 'No suppliers available in your category yet'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 text-xs font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => {
              const isOnline = isUserOnline(supplier._id);
              
              return (
                <div key={supplier._id} className="group bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 overflow-hidden">
                  {/* Supplier Card Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm">
                            {supplier.firstName?.charAt(0)}{supplier.lastName?.charAt(0)}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white dark:border-gray-800 ${
                            isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                            {supplier.businessName || `${supplier.firstName} ${supplier.lastName}`}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isOnline 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                      {!isOnline && supplier.lastSeen && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatLastSeen(supplier.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Supplier Details */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center text-xs">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-gray-900 dark:text-white truncate text-xs">{supplier.email}</span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-gray-900 dark:text-white text-xs">{supplier.phone}</span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                        {supplier.productCategory}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-900 dark:text-white text-xs">{supplier.city}, {supplier.country}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleContactSupplier(supplier)}
                        disabled={!isOnline}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1 ${
                          isOnline
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isOnline ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Chat</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Offline</span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => handleViewProducts(supplier)}
                        className="flex-1 py-1.5 px-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow-sm hover:shadow"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>Products</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Suppliers;