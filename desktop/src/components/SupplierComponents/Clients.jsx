// components/SupplierComponents/Clients.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ViewOrderDetails from './ViewOrderDetails';
import { 
  FaComments, 
  FaShoppingCart, 
  FaSearch, 
  FaSyncAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaTag,
  FaDownload,
  FaPrint,
  FaExclamationTriangle,
  FaWifi,
  FaSignal
} from 'react-icons/fa';

const Clients = ({ onMessageWholesaler }) => {
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Check if we're in Electron
  const isElectron = window.electronAPI;

  // Safe Electron API access with fallbacks
  const safeElectronAPI = {
    showNotification: (title, message) => {
      if (isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
      } else {
        console.log(`Notification: ${title} - ${message}`);
      }
    },
    
    storage: {
      getPersistent: async (key) => {
        if (isElectron && typeof window.electronAPI?.storage?.getPersistent === 'function') {
          return await window.electronAPI.storage.getPersistent(key);
        }
        // Fallback to localStorage
        try {
          const value = localStorage.getItem(`electron_${key}`);
          return { success: true, value: value ? JSON.parse(value) : null };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      setPersistent: async (key, value) => {
        if (isElectron && typeof window.electronAPI?.storage?.setPersistent === 'function') {
          return await window.electronAPI.storage.setPersistent(key, value);
        }
        // Fallback to localStorage
        try {
          localStorage.setItem(`electron_${key}`, JSON.stringify(value));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    
    saveRegistrationData: async (data, filename) => {
      if (isElectron && typeof window.electronAPI?.saveRegistrationData === 'function') {
        return await window.electronAPI.saveRegistrationData(data, filename);
      }
      // Fallback: download as JSON file
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

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
    }
  ];

  // Connection monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      safeElectronAPI.showNotification('Back Online', 'Connection restored');
      if (wholesalers.length === 0) {
        fetchWholesalers();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      safeElectronAPI.showNotification('Offline Mode', 'Working with cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wholesalers.length]);

  // Fetch wholesalers with improved error handling, retry logic, and offline support
  const fetchWholesalers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSyncStatus('syncing');

      // Try to fetch from cache first for faster loading
      if (isElectron) {
        const cachedData = await safeElectronAPI.storage.getPersistent('supplier_clients_data');
        if (cachedData.success && cachedData.value?.data) {
          setWholesalers(cachedData.value.data);
        }
      }

      const categoryParam = selectedCategory || user?.productCategory || '';
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/wholesalers?category=${categoryParam}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setWholesalers(data.wholesalers);
          setRetryCount(0);
          setSyncStatus('success');
          
          // Cache data for offline use
          if (isElectron) {
            await safeElectronAPI.storage.setPersistent('supplier_clients_data', {
              data: data.wholesalers,
              lastUpdated: new Date().toISOString(),
              category: categoryParam
            });
          }
        } else {
          throw new Error(data.message || 'Failed to fetch wholesalers');
        }
      } catch (networkError) {
        console.log('Network unavailable, using cached data');
        throw new Error('Network unavailable');
      }
    } catch (err) {
      console.error('Error fetching wholesalers:', err);
      
      // Try to use cached data
      if (isElectron) {
        const cachedData = await safeElectronAPI.storage.getPersistent('supplier_clients_data');
        if (cachedData.success && cachedData.value?.data) {
          setWholesalers(cachedData.value.data);
          setError('Using cached data - No network connection');
          setSyncStatus('idle');
          return;
        }
      }
      
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setError(`Connection issue. Retrying... (${retryCount + 1}/3)`);
        setSyncStatus('syncing');
        setTimeout(() => fetchWholesalers(), 2000);
        return;
      }
      
      setError('Using demo data. Server connection failed.');
      setWholesalers(MOCK_WHOLESALERS);
      setSyncStatus('error');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [user, selectedCategory, retryCount, isElectron]);

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
    setError('');
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
    if (isElectron) {
      safeElectronAPI.showNotification(
        'Open Chat',
        `Opening chat with ${wholesaler.businessName}`
      );
    }
    
    // Navigate to chat or open chat sidebar
    if (onMessageWholesaler) {
      onMessageWholesaler('wholesaler', wholesaler._id);
    } else {
      // Fallback: open email client
      const subject = `Business Inquiry - ${wholesaler.businessName}`;
      const body = `Hello ${wholesaler.contactPerson},\n\nI would like to discuss potential business opportunities with ${wholesaler.businessName}.\n\nBest regards,\n${user?.firstName} ${user?.lastName}\n${user?.businessName || ''}`;
      window.open(`mailto:${wholesaler.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  };

  const handleOpenChatSidebar = (wholesaler) => {
    if (onMessageWholesaler) {
      onMessageWholesaler('wholesaler', wholesaler._id);
    } else {
      handleMessageWholesaler(wholesaler);
    }
  };

  // Export functionality
  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      supplier: {
        name: `${user?.firstName} ${user?.lastName}`,
        business: user?.businessName,
        category: user?.productCategory
      },
      clients: {
        total: filteredWholesalers.length,
        online: filteredWholesalers.filter(w => w.isOnline).length,
        category: selectedCategory || 'all'
      },
      wholesalers: filteredWholesalers.map(wholesaler => ({
        businessName: wholesaler.businessName,
        contactPerson: wholesaler.contactPerson,
        email: wholesaler.email,
        phone: wholesaler.phone,
        address: wholesaler.address,
        city: wholesaler.city,
        productCategory: wholesaler.productCategory,
        isOnline: wholesaler.isOnline,
        lastSeen: wholesaler.lastSeen
      }))
    };

    const result = await safeElectronAPI.saveRegistrationData(
      exportData,
      `supplier-clients-${selectedCategory || 'all'}-${new Date().getTime()}.json`
    );

    if (result.success) {
      safeElectronAPI.showNotification(
        'Export Successful',
        `Clients data exported successfully (${filteredWholesalers.length} wholesalers)`
      );
    } else {
      safeElectronAPI.showNotification('Export Failed', 'Could not export clients data');
    }
  };

  // Print functionality
  const handlePrintDirectory = () => {
    window.print();
  };

  // Quick contact functionality
  const handleQuickContact = (wholesaler) => {
    if (isElectron) {
      safeElectronAPI.showNotification(
        'Contact Client',
        `Opening contact options for ${wholesaler.businessName}`
      );
    }
    
    // Open default email client
    const subject = `Business Inquiry - ${wholesaler.businessName}`;
    const body = `Hello ${wholesaler.contactPerson},\n\nI would like to discuss potential business opportunities with ${wholesaler.businessName}.\n\nBest regards,\n${user?.firstName} ${user?.lastName}\n${user?.businessName || ''}`;
    
    window.open(`mailto:${wholesaler.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleCallWholesaler = (wholesaler) => {
    if (isElectron) {
      safeElectronAPI.showNotification(
        'Call Client',
        `Ready to call ${wholesaler.businessName} at ${wholesaler.phone}`
      );
    }
    window.open(`tel:${wholesaler.phone}`);
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Client Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Loading from local cache and network...' : 'Managing your wholesaler clients'}
            </p>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading clients (offline capable)...' : 'Loading clients...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Client Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your wholesaler clients and business relationships
            {isElectron && ' • Desktop Mode'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {user?.productCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300">
              <FaTag className="w-4 h-4 mr-1" />
              {user.productCategory}
            </span>
          )}
          
          {isElectron && (
            <div className="flex space-x-2">
              <button
                onClick={handleExportData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export clients data to JSON file"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={handlePrintDirectory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Print clients directory"
              >
                <FaPrint className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls Section */}
      {wholesalers.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search clients by name, contact person, email, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Category:</span>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-40"
              >
                {PRODUCT_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sync Status */}
            {isElectron && (
              <div className="flex items-center space-x-2">
                {syncStatus === 'syncing' ? (
                  <FaSyncAlt className="h-4 w-4 animate-spin text-yellow-500" />
                ) : isOnline ? (
                  <FaWifi className="h-4 w-4 text-green-500" />
                ) : (
                  <FaSignal className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${
                  syncStatus === 'syncing' ? 'text-yellow-600' :
                  isOnline ? 'text-green-600' : 'text-red-600'
                }`}>
                  {syncStatus === 'syncing' ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center">
            <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
              {error.includes('cached') && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  Last updated: {new Date().toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="ml-4 flex items-center px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            <FaSyncAlt className="mr-2" />
            Retry
          </button>
        </div>
      )}

      {/* Content Section */}
      <div className="overflow-y-auto">
        {!user?.productCategory ? (
          <div className="text-center py-8">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-blue-900/20">
              <FaExclamationTriangle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Product Category Required</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              Your account doesn't have a product category set. Please update your profile to see relevant clients.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
              Update Profile
            </button>
          </div>
        ) : filteredWholesalers.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
              <FaSearch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No matching clients' : 'No clients found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              {searchTerm
                ? `No clients match "${searchTerm}" in your category. Try a different search term.`
                : 'No clients are currently available in your product category. Try broadening your category or check back later.'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-medium">{filteredWholesalers.length}</span> of{' '}
                <span className="font-medium">{wholesalers.length}</span> clients
                {isElectron && ' • Offline Capable'}
              </p>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {wholesalers.filter(w => w.isOnline).length} online
                </span>
                {onMessageWholesaler && (
                  <button
                    onClick={() => onMessageWholesaler('wholesaler')}
                    className="flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 text-sm"
                  >
                    <FaComments className="mr-2" />
                    Chat with All
                  </button>
                )}
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWholesalers.map(wholesaler => (
                <div key={wholesaler._id} className="border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group">
                  {/* Header with status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {wholesaler.businessName}
                      </h3>
                      <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <FaUser className="mr-2" />
                        <span className="truncate">{wholesaler.contactPerson}</span>
                      </div>
                    </div>
                    {getStatusBadge(wholesaler)}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <FaEnvelope className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate" title={wholesaler.email}>{wholesaler.email}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <FaPhone className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{wholesaler.phone}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <FaMapMarkerAlt className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {wholesaler.address && `${wholesaler.address}, `}
                        {wholesaler.city}
                      </span>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <FaTag className="w-4 h-4 mr-2" />
                      Specialization
                    </div>
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg capitalize">
                      {wholesaler.productCategory}
                    </span>
                  </div>

                  {/* Last Seen */}
                  {!wholesaler.isOnline && wholesaler.lastSeen && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last active: {new Date(wholesaler.lastSeen).toLocaleDateString()} at {new Date(wholesaler.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col gap-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewOrderDetails(wholesaler)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                        >
                          <FaShoppingCart className="w-4 h-4 mr-2" />
                          Orders
                        </button>
                        <button
                          onClick={() => handleOpenChatSidebar(wholesaler)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                        >
                          <FaComments className="w-4 h-4 mr-2" />
                          Message
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleQuickContact(wholesaler)}
                          className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 flex items-center justify-center"
                        >
                          <FaEnvelope className="w-4 h-4 mr-2" />
                          Email
                        </button>
                        <button
                          onClick={() => handleCallWholesaler(wholesaler)}
                          className="flex-1 border border-green-600 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20 flex items-center justify-center"
                        >
                          <FaPhone className="w-4 h-4 mr-2" />
                          Call
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
};

export default Clients;