// components/WholesalerComponents/Suppliers.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaEnvelope, 
  FaPhone, 
  FaTag, 
  FaMapMarkerAlt, 
  FaComments,
  FaClock,
  FaBox,
  FaWifi,
  FaSignal,
  FaExclamationTriangle,
  FaSync,
  FaStore,
  FaUser,
  FaDownload,
  FaPrint,
  FaIndustry,
  FaStar,
  FaRegStar,
  FaShippingFast
} from 'react-icons/fa';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const Suppliers = ({ isElectron, isOnline, onSync, syncStatus }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  
  // Use SocketContext instead of direct Socket.IO
  const { 
    isConnected, 
    onlineUsers, 
    connectionStatus,
    connectionHealth 
  } = useSocket();

  const { getAuthHeaders, API_BASE_URL } = useAuth();

  // Safe Electron API access following RetailerDashboard pattern
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
      // Fallback for web
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

  // Connection monitoring following RetailerDashboard pattern
  useEffect(() => {
    const handleOnline = () => {
      if (isElectron) {
        safeElectronAPI.showNotification('Back Online', 'Connection restored. Syncing data...');
      }
    };

    const handleOffline = () => {
      if (isElectron) {
        safeElectronAPI.showNotification('Offline Mode', 'Working with cached data');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isElectron]);

  // Extract available categories from suppliers
  useEffect(() => {
    if (suppliers.length > 0) {
      const categories = [...new Set(suppliers.map(s => s.productCategory).filter(Boolean))];
      setAvailableCategories(categories);
    }
  }, [suppliers]);

  // Filter and sort suppliers
  useEffect(() => {
    if (suppliers.length > 0) {
      let filtered = suppliers.filter(supplier => {
        const matchesSearch = 
          supplier.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.productCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.country?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategories.length === 0 || 
          selectedCategories.includes(supplier.productCategory);

        return matchesSearch && matchesCategory;
      });

      // Apply sorting
      filtered = filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.businessName?.localeCompare(b.businessName);
          case 'online':
            return (isUserOnline(b._id) ? 1 : 0) - (isUserOnline(a._id) ? 1 : 0);
          case 'recent':
            return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });

      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers, sortBy, onlineUsers, selectedCategories]);

  // Check if user is online using SocketContext
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

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

  const getSupplierRating = (supplier) => {
    return supplier.rating || Math.random() * 2 + 3; // Random rating between 3-5 for demo
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="w-3 h-3 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="w-3 h-3 text-yellow-400" />);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="w-3 h-3 text-gray-300" />);
    }

    return stars;
  };

  // Cache suppliers data for offline use
  const cacheSuppliers = async (data) => {
    try {
      await safeElectronAPI.storage.setPersistent('cached_suppliers', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching suppliers:', error);
    }
  };

  // Get cached suppliers
  const getCachedSuppliers = async () => {
    try {
      let cachedData = null;
      
      if (isElectron) {
        const result = await safeElectronAPI.storage.getPersistent('cached_suppliers');
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem('wholesaler_suppliers_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedData = parsed.data;
        }
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error getting cached suppliers:', error);
      return null;
    }
  };

  // Enhanced fetch data with offline support
  const fetchUserAndSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('trade_uganda_token');
      
      if (!token) {
        setError('Please log in to view suppliers');
        setLoading(false);
        return;
      }

      // Try to get cached data first
      const cachedData = await getCachedSuppliers();
      if (cachedData && !isOnline) {
        console.log('📦 Using cached suppliers data (offline mode)');
        setSuppliers(cachedData);
        setFilteredSuppliers(cachedData);
        setLoading(false);
        return;
      }

      if (cachedData && isOnline) {
        // Show cached data immediately while fetching fresh data
        setSuppliers(cachedData);
        setFilteredSuppliers(cachedData);
      }

      const userResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
        headers: getAuthHeaders()
      });

      if (!userResponse.ok) throw new Error('Failed to fetch user profile');
      const userData = await userResponse.json();
      if (!userData.success) throw new Error(userData.message);

      setCurrentUser(userData.user);

      const suppliersResponse = await fetch(
        `${API_BASE_URL}/api/users/suppliers?category=${encodeURIComponent(userData.user.productCategory)}`,
        { headers: getAuthHeaders() }
      );

      if (!suppliersResponse.ok) throw new Error('Failed to fetch suppliers');
      const suppliersData = await suppliersResponse.json();
      
      if (suppliersData.success) {
        const suppliersList = suppliersData.suppliers || [];
        // Add demo ratings and product counts
        const enhancedSuppliers = suppliersList.map(supplier => ({
          ...supplier,
          rating: getSupplierRating(supplier),
          productCount: Math.floor(Math.random() * 50) + 10, // Random product count for demo
          responseTime: `${Math.floor(Math.random() * 24) + 1}h`, // Random response time
          minOrder: `$${Math.floor(Math.random() * 500) + 50}` // Random min order
        }));
        
        setSuppliers(enhancedSuppliers);
        setFilteredSuppliers(enhancedSuppliers);
        
        // Cache the data for offline use
        await cacheSuppliers(enhancedSuppliers);
        setLastSync(new Date().toLocaleTimeString());

        // Show desktop notification
        safeElectronAPI.showNotification(
          'Suppliers Updated',
          `Loaded ${enhancedSuppliers.length} suppliers in your category`
        );
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError(error.message);
      
      // Try to use cached data as fallback
      const cachedData = await getCachedSuppliers();
      if (cachedData) {
        console.log('🔄 Using cached data due to fetch error');
        setSuppliers(cachedData);
        setFilteredSuppliers(cachedData);
        setError('Using cached data - ' + error.message);
      } else {
        // Enhanced fallback mock data
        const mockSuppliers = [
          { 
            _id: '1', firstName: 'Tech', lastName: 'Manufacturer', 
            businessName: 'Tech Manufacturers Ltd', email: 'tech@example.com', 
            phone: '0785123456', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda', lastSeen: new Date(),
            rating: 4.5,
            productCount: 45,
            responseTime: '2h',
            minOrder: '$100'
          },
          { 
            _id: '2', firstName: 'Fashion', lastName: 'Supplier', 
            businessName: 'Fashion Wholesalers Inc', email: 'fashion@example.com', 
            phone: '0785654321', productCategory: 'Electronic Components',
            city: 'Kampala', country: 'Uganda',
            lastSeen: new Date(Date.now() - 30 * 60 * 1000),
            rating: 4.2,
            productCount: 32,
            responseTime: '4h',
            minOrder: '$150'
          },
          { 
            _id: '3', firstName: 'Global', lastName: 'Electronics', 
            businessName: 'Global Electronics Corp', email: 'global@example.com', 
            phone: '0785789456', productCategory: 'Mobile Accessories',
            city: 'Kampala', country: 'Uganda',
            lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
            rating: 4.8,
            productCount: 67,
            responseTime: '1h',
            minOrder: '$75'
          },
          { 
            _id: '4', firstName: 'Premium', lastName: 'Gadgets', 
            businessName: 'Premium Gadgets Ltd', email: 'premium@example.com', 
            phone: '0785123789', productCategory: 'Computer Parts',
            city: 'Kampala', country: 'Uganda',
            lastSeen: new Date(),
            rating: 4.0,
            productCount: 28,
            responseTime: '6h',
            minOrder: '$200'
          }
        ];
        setSuppliers(mockSuppliers);
        setFilteredSuppliers(mockSuppliers);
        setError('Network error - Showing demo data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndSuppliers();
  }, [isOnline, isElectron]);

  const handleContactSupplier = (supplier) => {
    const isSupplierOnline = isUserOnline(supplier._id);
    if (isSupplierOnline) {
      safeElectronAPI.showNotification(
        'Chat Started', 
        `Opening chat with ${supplier.businessName || supplier.firstName + ' ' + supplier.lastName}`
      );
      // Navigate to chat
      window.dispatchEvent(new CustomEvent('navigateToChat', { 
        detail: { targetUser: supplier } 
      }));
    } else {
      safeElectronAPI.showNotification(
        'Supplier Offline', 
        `${supplier.businessName || supplier.firstName + ' ' + supplier.lastName} is currently offline. Try again later.`
      );
    }
  };

  const handleViewProducts = (supplier) => {
    safeElectronAPI.showNotification(
      'Viewing Products',
      `Loading products from ${supplier.businessName || supplier.firstName + ' ' + supplier.lastName}`
    );
    
    // Store supplier data in localStorage for the products component
    localStorage.setItem('selectedSupplier', JSON.stringify(supplier));
    
    // Set global variable for immediate access
    window.selectedSupplier = supplier;
    
    // Navigate to supplier products view using both events for reliability
    window.dispatchEvent(new CustomEvent('navigateToSupplierProducts', { 
      detail: { supplier: supplier } 
    }));
    
    window.dispatchEvent(new CustomEvent('navigateToTab', { 
      detail: { tab: 'supplier-products' } 
    }));
  };

  const handleManualRefresh = () => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    if (onSync) {
      onSync();
    }
    // Re-fetch data
    fetchUserAndSuppliers();
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        name: `${currentUser?.firstName} ${currentUser?.lastName}`,
        business: currentUser?.businessName,
        productCategory: currentUser?.productCategory
      },
      suppliersData: {
        totalSuppliers: filteredSuppliers.length,
        onlineSuppliers: filteredSuppliers.filter(s => isUserOnline(s._id)).length,
        lastSync: lastSync,
        searchTerm: searchTerm,
        socketStatus: connectionStatus,
        connectionHealth: connectionHealth
      },
      suppliers: filteredSuppliers.map(supplier => ({
        businessName: supplier.businessName,
        contactPerson: `${supplier.firstName} ${supplier.lastName}`,
        email: supplier.email,
        phone: supplier.phone,
        productCategory: supplier.productCategory,
        location: `${supplier.city}, ${supplier.country}`,
        isOnline: isUserOnline(supplier._id),
        lastSeen: supplier.lastSeen,
        rating: supplier.rating,
        productCount: supplier.productCount
      }))
    };

    const result = await safeElectronAPI.saveRegistrationData(
      exportData,
      `suppliers-${currentUser?.productCategory || 'export'}-${new Date().getTime()}.json`
    );

    if (result.success) {
      safeElectronAPI.showNotification(
        'Export Successful',
        `Suppliers data exported successfully`
      );
    } else {
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  const handlePrintDirectory = () => {
    window.print();
  };

  const handleQuickContact = (supplier) => {
    safeElectronAPI.showNotification(
      'Contact Supplier',
      `Opening contact options for ${supplier.businessName}`
    );
    
    // Open default email client
    const subject = `Business Inquiry - ${supplier.businessName}`;
    const body = `Hello ${supplier.firstName},\n\nI would like to discuss potential business opportunities with ${supplier.businessName}.\n\nBest regards,\n${currentUser?.firstName} ${currentUser?.lastName}\n${currentUser?.businessName || ''}`;
    
    window.open(`mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleCallSupplier = (supplier) => {
    safeElectronAPI.showNotification(
      'Call Supplier',
      `Ready to call ${supplier.businessName} at ${supplier.phone}`
    );
    window.open(`tel:${supplier.phone}`);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSortBy('name');
  };

  const getConnectionStatus = () => {
    if (syncStatus === 'syncing') return 'syncing';
    if (!isOnline) return 'offline';
    if (!isConnected) return 'disconnected';
    return 'connected';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <FaWifi className="h-3 w-3" />;
      case 'disconnected': return <FaSignal className="h-3 w-3" />;
      case 'syncing': return <FaSync className="h-3 w-3 animate-spin" />;
      case 'offline': return <FaExclamationTriangle className="h-3 w-3" />;
      default: return <FaSignal className="h-3 w-3" />;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <FaStore className="inline mr-2 text-blue-600" />
              Suppliers Directory
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Loading from local cache and network...' : 'Finding suppliers in your network'}
            </p>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading suppliers (offline capable)...' : 'Loading suppliers...'}
          </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !suppliers.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Suppliers Directory</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Desktop Mode - Offline Capable' : 'Connect with suppliers in your network'}
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-3 rounded-full dark:bg-red-900/30 mb-4">
              <FaExclamationTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Unable to load suppliers</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-md">{error}</p>
            <div className="flex space-x-3 flex-wrap justify-center gap-2">
              <button
                onClick={handleManualRefresh}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
              >
                <FaSync className="w-4 h-4 mr-2" />
                Try Again
              </button>
              {isElectron && (
                <button
                  onClick={handleExportData}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center"
                >
                  <FaDownload className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            <FaStore className="inline mr-2 text-blue-600" />
            Suppliers Directory
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect with suppliers in your product category
            {isElectron && ' • Desktop Mode'}
          </p>
          {lastSync && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Last synced: {lastSync}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {/* Connection Status */}
          <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            getConnectionStatus() === 'connected' 
              ? 'bg-green-500 text-white shadow' 
              : getConnectionStatus() === 'syncing'
              ? 'bg-yellow-500 text-white shadow'
              : 'bg-red-500 text-white shadow'
          }`}>
            <div className="mr-1.5">
              {getStatusIcon(getConnectionStatus())}
            </div>
            {getConnectionStatus() === 'syncing' ? 'Syncing...' : 
             getConnectionStatus() === 'connected' ? 'Live' : 
             getConnectionStatus() === 'disconnected' ? 'Offline' : 'No Connection'}
          </div>

          {/* Online Users Count */}
          <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow border border-gray-200 dark:border-gray-700">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              {onlineUsers.length} Online
            </span>
          </div>

          {/* Desktop Actions */}
          {isElectron && (
            <div className="flex space-x-2">
              <button
                onClick={handleManualRefresh}
                disabled={!isOnline || syncStatus === 'syncing'}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isOnline && syncStatus !== 'syncing'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FaSync className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export suppliers data to JSON file"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={handlePrintDirectory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Print suppliers directory"
              >
                <FaPrint className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="ml-2">
                <h3 className="text-yellow-800 dark:text-yellow-200 font-medium text-xs">
                  {isOnline ? 'Sync Issue' : 'Offline Mode'}
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">{error}</p>
              </div>
            </div>
            {isOnline && (
              <button 
                onClick={handleManualRefresh}
                className="flex items-center px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors"
              >
                <FaSync className="mr-1" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Features Banner */}
      {isElectron && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaWifi className="text-blue-600 dark:text-blue-400 text-lg" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  Desktop Mode Active
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {isOnline ? 'Real-time updates enabled' : 'Working with cached data - some features limited'}
                </p>
              </div>
            </div>
            {!isOnline && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                Offline Mode
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls Section */}
      {suppliers.length > 0 && (
        <div className="space-y-4 mb-6">
          {/* Search and Sort Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search suppliers by name, category, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-40"
              >
                <option value="name">Business Name</option>
                <option value="online">Online Status</option>
                <option value="recent">Recently Active</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Category Filters */}
          {availableCategories.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Category:</span>
                {(searchTerm || selectedCategories.length > 0) && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryFilter(category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="overflow-y-auto">
        {!currentUser?.productCategory ? (
          <div className="text-center py-8">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-blue-900/20">
              <FaUser className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Product Category Required</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              Your account doesn't have a product category set. Please update your profile to see relevant suppliers.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
              Update Profile
            </button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
              <FaSearch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || selectedCategories.length > 0 ? 'No matching suppliers' : 'No suppliers found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              {searchTerm || selectedCategories.length > 0
                ? 'No suppliers match your current filters. Try adjusting your search criteria.'
                : 'No suppliers are currently available in your product category. Try broadening your category or check back later.'
              }
            </p>
            {(searchTerm || selectedCategories.length > 0) && (
              <button
                onClick={clearAllFilters}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-medium">{filteredSuppliers.length}</span> of{' '}
                <span className="font-medium">{suppliers.length}</span> suppliers
                {isElectron && ' • Offline Capable'}
              </p>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {suppliers.filter(s => isUserOnline(s._id)).length} online
                </span>
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSuppliers.map(supplier => {
                const isSupplierOnline = isUserOnline(supplier._id);
                const rating = getSupplierRating(supplier);
                
                return (
                  <div key={supplier._id} className="border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group">
                    {/* Header with status and rating */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 mr-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {supplier.businessName || `${supplier.firstName} ${supplier.lastName}`}
                        </h3>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <FaTag className="w-3 h-3 mr-1" />
                            {supplier.productCategory}
                          </span>
                          <div className="flex items-center space-x-1">
                            {renderStars(rating)}
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              {rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isSupplierOnline ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                            Offline
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Supplier Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg dark:bg-gray-700/50">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {supplier.productCount || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Products</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {supplier.responseTime || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Response</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                          {supplier.minOrder || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Min Order</div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FaUser className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{supplier.firstName} {supplier.lastName}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FaEnvelope className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FaPhone className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span>{supplier.phone}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FaMapMarkerAlt className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                        <span>{supplier.city}, {supplier.country}</span>
                      </div>

                      {!isSupplierOnline && supplier.lastSeen && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <FaClock className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                          <span>{formatLastSeen(supplier.lastSeen)}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer with actions */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col gap-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleContactSupplier(supplier)}
                            disabled={!isSupplierOnline}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center ${
                              isSupplierOnline
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            <FaComments className="w-4 h-4 mr-2" />
                            Chat
                          </button>
                          <button
                            onClick={() => handleViewProducts(supplier)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                          >
                            <FaBox className="w-4 h-4 mr-2" />
                            Products
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleQuickContact(supplier)}
                            className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 flex items-center justify-center"
                          >
                            <FaEnvelope className="w-4 h-4 mr-2" />
                            Email
                          </button>
                          <button
                            onClick={() => handleCallSupplier(supplier)}
                            className="flex-1 border border-green-600 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20 flex items-center justify-center"
                          >
                            <FaPhone className="w-4 h-4 mr-2" />
                            Call
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Suppliers;