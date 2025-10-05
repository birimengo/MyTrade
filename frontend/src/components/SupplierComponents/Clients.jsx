// components/SupplierComponents/Clients.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ViewOrderDetails from './ViewOrderDetails';
import ChatWindow from '../ChatComponents/ChatWindow';
import { 
  FaComments, 
  FaShoppingCart, 
  FaSearch, 
  FaSyncAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaTag
} from 'react-icons/fa';

const Clients = ({ onMessageWholesaler }) => {
  const { user } = useAuth();
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Categories configuration for consistent usage
  const PRODUCT_CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'food', label: 'Food & Beverages' },
    { value: 'construction', label: 'Construction Materials' },
    { value: 'agriculture', label: 'Agricultural Products' },
    { value: 'automotive', label: 'Automotive Parts' },
    { value: 'pharmaceuticals', label: 'Pharmaceuticals' },
    { value: 'textiles', label: 'Textiles' }
  ];

  // Mock data for fallback
  const MOCK_WHOLESALERS = [
    {
      _id: '1',
      firstName: 'John',
      lastName: 'Wholesaler',
      businessName: 'Kalibu Wholesalers',
      role: 'wholesaler',
      email: 'john@kalibu.com',
      phone: '+255 123 456 789',
      contactPerson: 'John Manager',
      address: '123 Business Street',
      city: 'Dar es Salaam',
      productCategory: 'electronics',
      isOnline: true,
      lastSeen: new Date().toISOString()
    },
    {
      _id: '2',
      firstName: 'Sarah',
      lastName: 'Distributor',
      businessName: 'City Distributors',
      role: 'wholesaler',
      email: 'sarah@citydist.com',
      phone: '+255 987 654 321',
      contactPerson: 'Sarah Owner',
      address: '456 Market Avenue',
      city: 'Nairobi',
      productCategory: 'clothing',
      isOnline: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: '3',
      firstName: 'Mike',
      lastName: 'Merchant',
      businessName: 'Global Traders',
      role: 'wholesaler',
      email: 'mike@globaltraders.com',
      phone: '+255 555 123 456',
      contactPerson: 'Mike Director',
      address: '789 Trade Road',
      city: 'Kampala',
      productCategory: 'food',
      isOnline: true,
      lastSeen: new Date().toISOString()
    },
    {
      _id: '4',
      firstName: 'Anna',
      lastName: 'Traders',
      businessName: 'Premium Distributors',
      role: 'wholesaler',
      email: 'anna@premium.com',
      phone: '+255 444 333 222',
      contactPerson: 'Anna CEO',
      address: '101 Trade Center',
      city: 'Mombasa',
      productCategory: 'electronics',
      isOnline: true,
      lastSeen: new Date().toISOString()
    },
    {
      _id: '5',
      firstName: 'David',
      lastName: 'Supplies',
      businessName: 'Quick Mart Suppliers',
      role: 'wholesaler',
      email: 'david@quickmart.com',
      phone: '+255 777 888 999',
      contactPerson: 'David Owner',
      address: '202 Market Lane',
      city: 'Arusha',
      productCategory: 'food',
      isOnline: false,
      lastSeen: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: '6',
      firstName: 'Lisa',
      lastName: 'Exporters',
      businessName: 'Global Export Ltd',
      role: 'wholesaler',
      email: 'lisa@globalexport.com',
      phone: '+255 666 555 444',
      contactPerson: 'Lisa Director',
      address: '303 Export Street',
      city: 'Dar es Salaam',
      productCategory: 'textiles',
      isOnline: true,
      lastSeen: new Date().toISOString()
    },
    {
      _id: '7',
      firstName: 'Robert',
      lastName: 'Imports',
      businessName: 'Royal Importers',
      role: 'wholesaler',
      email: 'robert@royal.com',
      phone: '+255 111 222 333',
      contactPerson: 'Robert Manager',
      address: '404 Royal Avenue',
      city: 'Nairobi',
      productCategory: 'automotive',
      isOnline: true,
      lastSeen: new Date().toISOString()
    },
    {
      _id: '8',
      firstName: 'Maria',
      lastName: 'Trading',
      businessName: 'Maria Trading Co',
      role: 'wholesaler',
      email: 'maria@trading.com',
      phone: '+255 999 888 777',
      contactPerson: 'Maria Owner',
      address: '505 Business Road',
      city: 'Kampala',
      productCategory: 'pharmaceuticals',
      isOnline: false,
      lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: '9',
      firstName: 'James',
      lastName: 'Suppliers',
      businessName: 'James Wholesale',
      role: 'wholesaler',
      email: 'james@wholesale.com',
      phone: '+255 333 444 555',
      contactPerson: 'James Director',
      address: '606 Supply Street',
      city: 'Dar es Salaam',
      productCategory: 'construction',
      isOnline: true,
      lastSeen: new Date().toISOString()
    }
  ];

  // Initialize socket connection with error handling
  useEffect(() => {
    let newSocket;
    try {
      newSocket = new WebSocket('ws://localhost:5000');
      newSocket.onerror = (error) => {
        console.warn('WebSocket connection failed:', error);
      };
      setSocket(newSocket);
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
    }

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  // Fetch wholesalers with improved error handling and retry logic
  const fetchWholesalers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const categoryParam = selectedCategory || user?.productCategory || '';
      const response = await fetch(
        `http://localhost:5000/api/wholesalers?category=${categoryParam}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setWholesalers(data.wholesalers);
        setRetryCount(0);
      } else {
        throw new Error(data.message || 'Failed to fetch wholesalers');
      }
    } catch (err) {
      console.error('Error fetching wholesalers:', err);
      
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setError(`Connection issue. Retrying... (${retryCount + 1}/3)`);
        setTimeout(() => fetchWholesalers(), 2000);
        return;
      }
      
      setError('Using demo data. Server connection failed.');
      setWholesalers(MOCK_WHOLESALERS);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCategory, retryCount]);

  useEffect(() => {
    if (user) {
      fetchWholesalers();
    }
  }, [user, fetchWholesalers]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchWholesalers();
  };

  const handleViewOrderDetails = (wholesaler) => {
    setSelectedWholesaler(wholesaler);
    setShowOrdersModal(true);
  };

  const handleCloseOrdersModal = () => {
    setShowOrdersModal(false);
    setSelectedWholesaler(null);
  };

  const handleMessageWholesaler = async (wholesaler) => {
    try {
      setSelectedWholesaler(wholesaler);
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: wholesaler._id,
          userId: user._id
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSelectedConversation(data.conversation);
        setShowChatModal(true);
      } else {
        throw new Error(data.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Create mock conversation as fallback
      const mockConversation = {
        _id: `temp-${Date.now()}`,
        participants: [
          {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            businessName: user.businessName,
            role: user.role
          },
          {
            _id: wholesaler._id,
            firstName: wholesaler.firstName,
            lastName: wholesaler.lastName,
            businessName: wholesaler.businessName,
            role: 'wholesaler'
          }
        ],
        messages: [],
        createdAt: new Date()
      };
      setSelectedConversation(mockConversation);
      setShowChatModal(true);
    }
  };

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setSelectedConversation(null);
    setSelectedWholesaler(null);
  };

  const handleOpenChatSidebar = (wholesaler) => {
    if (onMessageWholesaler) {
      onMessageWholesaler('wholesaler', wholesaler._id);
    } else {
      handleMessageWholesaler(wholesaler);
    }
  };

  const getStatusBadge = (wholesaler) => {
    if (wholesaler.isOnline) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800">
          <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>
          Online
        </span>
      );
    }
    
    const lastSeen = new Date(wholesaler.lastSeen);
    const now = new Date();
    const diffHours = (now - lastSeen) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
          <span className="w-1 h-1 bg-yellow-500 rounded-full mr-1"></span>
          Recent
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
        <span className="w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
        Offline
      </span>
    );
  };

  // Memoized filtered wholesalers for performance
  const filteredWholesalers = useMemo(() => {
    return wholesalers.filter(wholesaler =>
      wholesaler.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.productCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [wholesalers, searchTerm]);

  // Loading state component
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mt-2 h-[calc(100vh-140px)] flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">Clients</h2>
          <div className="w-full sm:w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 overflow-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
            <div key={item} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
              <div className="flex space-x-2 mt-3">
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mt-2 h-[calc(100vh-140px)] flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-white truncate">
            Wholesaler Clients
          </h2>
          {!loading && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {filteredWholesalers.length}
            </span>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative min-w-0 flex-1 sm:flex-initial">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400 text-[10px]" />
            </div>
            <input
              type="text"
              placeholder="Search wholesalers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 w-full sm:w-40 text-[11px] p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-1 min-w-0">
            <label htmlFor="category" className="text-[11px] font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0">
              Category:
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-[11px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0 flex-1"
            >
              {PRODUCT_CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-center justify-between flex-shrink-0">
          <p className="text-red-700 dark:text-red-300 text-[11px] flex-1">{error}</p>
          <button
            onClick={handleRetry}
            className="ml-2 flex items-center px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded text-[10px] hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            <FaSyncAlt className="mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Content Section with Proper Scroll */}
      <div className="flex-1 min-h-0 flex flex-col">
        {filteredWholesalers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xs mx-auto">
              <div className="text-gray-400 dark:text-gray-500 text-3xl mb-2">🏪</div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {wholesalers.length === 0 ? 'No Wholesalers Found' : 'No Matching Wholesalers'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] mb-3">
                {selectedCategory || searchTerm
                  ? `Try adjusting your search or filter criteria.`
                  : "No wholesalers are currently available in your network."
                }
              </p>
              {(selectedCategory || searchTerm || error.includes('demo')) && (
                <div className="flex gap-1 justify-center">
                  {(selectedCategory || searchTerm) && (
                    <button 
                      onClick={() => {
                        setSelectedCategory('');
                        setSearchTerm('');
                      }}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                  {error.includes('demo') && (
                    <button 
                      onClick={handleRetry}
                      className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-[11px] transition-colors flex items-center"
                    >
                      <FaSyncAlt className="mr-1" />
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2 flex-shrink-0">
              <p className="text-[11px] text-gray-600 dark:text-gray-400">
                Showing {filteredWholesalers.length} of {wholesalers.length} wholesaler{wholesalers.length !== 1 ? 's' : ''} 
                {selectedCategory && ` in ${selectedCategory}`}
                {searchTerm && ` matching "${searchTerm}"`}
              </p>
              
              {/* Quick Chat Button */}
              {onMessageWholesaler && (
                <button
                  onClick={() => onMessageWholesaler('wholesaler')}
                  className="flex items-center px-2 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded transition-colors duration-200 text-[11px] w-full sm:w-auto justify-center"
                >
                  <FaComments className="mr-1 text-[10px]" />
                  Chat with All
                </button>
              )}
            </div>

            {/* Scrollable Cards Container */}
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-2 pb-4">
                {filteredWholesalers.map((wholesaler) => (
                  <div
                    key={wholesaler._id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 group flex flex-col min-h-[180px]"
                  >
                    {/* Header with Business Name and Status */}
                    <div className="flex justify-between items-start mb-2 flex-shrink-0">
                      <div className="min-w-0 flex-1 mr-2">
                        <h3 className="text-[12px] font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {wholesaler.businessName}
                        </h3>
                        <div className="flex items-center mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                          <FaUser className="mr-1 text-[8px]" />
                          <span className="truncate">{wholesaler.contactPerson}</span>
                        </div>
                      </div>
                      {getStatusBadge(wholesaler)}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-1.5 mb-2 flex-1">
                      <div className="flex items-center text-[10px] text-gray-600 dark:text-gray-400">
                        <FaEnvelope className="mr-1 text-[8px] flex-shrink-0" />
                        <span className="truncate" title={wholesaler.email}>{wholesaler.email}</span>
                      </div>
                      <div className="flex items-center text-[10px] text-gray-600 dark:text-gray-400">
                        <FaPhone className="mr-1 text-[8px] flex-shrink-0" />
                        <span className="truncate">{wholesaler.phone}</span>
                      </div>
                      <div className="flex items-center text-[10px] text-gray-600 dark:text-gray-400">
                        <FaMapMarkerAlt className="mr-1 text-[8px] flex-shrink-0" />
                        <span className="truncate">
                          {wholesaler.address && `${wholesaler.address}, `}
                          {wholesaler.city}
                        </span>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="mb-2 flex-shrink-0">
                      <div className="flex items-center text-[10px] text-gray-600 dark:text-gray-400 mb-0.5">
                        <FaTag className="mr-0.5 text-[8px]" />
                        Specialization
                      </div>
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded capitalize">
                        {wholesaler.productCategory}
                      </span>
                    </div>

                    {/* Last Seen */}
                    {!wholesaler.isOnline && wholesaler.lastSeen && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Last active: {new Date(wholesaler.lastSeen).toLocaleDateString()} at {new Date(wholesaler.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-1.5 mt-2 flex-shrink-0">
                      <button 
                        onClick={() => handleViewOrderDetails(wholesaler)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium py-1.5 px-2 rounded transition-colors duration-200 flex items-center justify-center"
                      >
                        <FaShoppingCart className="mr-1 text-[8px]" />
                        <span className="truncate">Orders</span>
                      </button>
                      <button 
                        onClick={() => handleOpenChatSidebar(wholesaler)}
                        className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-[10px] font-medium py-1.5 px-2 rounded transition-colors duration-200 flex items-center justify-center"
                      >
                        <FaComments className="mr-1 text-[8px]" />
                        <span className="truncate">Message</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrdersModal && selectedWholesaler && (
        <ViewOrderDetails 
          wholesaler={selectedWholesaler}
          onClose={handleCloseOrdersModal}
        />
      )}

      {/* Chat Modal - Fallback when sidebar is not available */}
      {showChatModal && selectedConversation && selectedWholesaler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center min-w-0">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] mr-2 flex-shrink-0">
                  {selectedWholesaler.businessName?.charAt(0) || selectedWholesaler.firstName?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {selectedWholesaler.businessName}
                  </h3>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                    {selectedWholesaler.contactPerson}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseChatModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 ml-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Window */}
            <div className="flex-1 min-h-0">
              <ChatWindow
                conversation={selectedConversation}
                onClose={handleCloseChatModal}
                socket={socket}
                isEmbedded={true}
                customHeader={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;