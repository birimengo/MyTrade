import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FaSearch, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaUser,
  FaStore,
  FaTag,
  FaComments,
  FaShoppingCart,
  FaSync,
  FaDownload,
  FaPrint,
  FaWifi,
  FaSignal,
  FaExclamationTriangle,
  FaRedo
} from 'react-icons/fa';

const Retailers = ({ user: propUser, onContactRetailer, onViewRetailerOrders, isElectron, isOnline, onSync, syncStatus }) => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [lastSync, setLastSync] = useState(null);

  const { user: contextUser, getAuthHeaders, API_BASE_URL } = useAuth();
  const user = propUser || contextUser;

  const safeElectronAPI = {
    showNotification: (title, message) => {
      if (isElectron && typeof window.electronAPI?.showNotification === 'function') {
        window.electronAPI.showNotification(title, message);
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

  const cacheRetailers = async (data) => {
    try {
      await safeElectronAPI.storage.setPersistent('cached_retailers', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error caching retailers:', error);
    }
  };

  const getCachedRetailers = async () => {
    try {
      let cachedData = null;
      
      if (isElectron) {
        const result = await safeElectronAPI.storage.getPersistent('cached_retailers');
        if (result.success && result.value) {
          cachedData = result.value.data;
        }
      } else {
        const stored = localStorage.getItem('wholesaler_retailers_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedData = parsed.data;
        }
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error getting cached retailers:', error);
      return null;
    }
  };

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.productCategory) {
        setLoading(false);
        return;
      }

      const cachedData = await getCachedRetailers();
      if (cachedData && !isOnline) {
        setRetailers(cachedData);
        setLoading(false);
        return;
      }

      if (cachedData && isOnline) {
        setRetailers(cachedData);
      }

      let authHeaders = {};
      try {
        authHeaders = getAuthHeaders ? getAuthHeaders() : {};
      } catch (error) {
        console.warn('Error getting auth headers:', error);
      }

      const apiUrl = API_BASE_URL || 'http://localhost:5000';
      const url = `${apiUrl}/api/retailers?category=${encodeURIComponent(user.productCategory)}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `Server returned ${response.status}` };
        }
        throw new Error(errorData.message || `Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const retailersData = data.retailers || [];
        setRetailers(retailersData);
        
        await cacheRetailers(retailersData);
        setLastSync(new Date().toLocaleTimeString());

        if (isElectron) {
          safeElectronAPI.showNotification(
            'Retailers Updated',
            `Loaded ${retailersData.length} retailers in your category`
          );
        }
      } else {
        throw new Error(data.message || 'Failed to fetch retailers');
      }
    } catch (error) {
      console.error('Error fetching retailers:', error);
      setError(error.message || 'An error occurred while fetching retailers');
      
      const cachedData = await getCachedRetailers();
      if (cachedData) {
        setRetailers(cachedData);
        setError('Using cached data - ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [user?.productCategory]);

  useEffect(() => {
    if (!isElectron) return;

    const handleOnline = () => {
      safeElectronAPI.showNotification('Back Online', 'Connection restored. Syncing data...');
      fetchRetailers();
    };

    const handleOffline = () => {
      safeElectronAPI.showNotification('Offline Mode', 'Working with cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isElectron]);

  const filteredRetailers = retailers
    .filter(retailer =>
      retailer.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.businessName || '').localeCompare(b.businessName || '');
        case 'online':
          return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
        case 'recent':
          return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
        default:
          return 0;
      }
    });

  const handleRetry = () => {
    setError(null);
    fetchRetailers();
  };

  const handleManualRefresh = () => {
    if (!isOnline) {
      safeElectronAPI.showNotification('Offline', 'Cannot refresh without internet connection');
      return;
    }
    if (onSync) {
      onSync();
    }
    fetchRetailers();
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        name: `${user?.firstName} ${user?.lastName}`,
        business: user?.businessName,
        productCategory: user?.productCategory
      },
      retailersData: {
        totalRetailers: filteredRetailers.length,
        onlineRetailers: filteredRetailers.filter(r => r.isOnline).length,
        lastSync: lastSync,
        searchTerm: searchTerm
      },
      retailers: filteredRetailers.map(retailer => ({
        businessName: retailer.businessName,
        contactPerson: retailer.contactPerson,
        email: retailer.email,
        phone: retailer.phone,
        address: retailer.address,
        city: retailer.city,
        isOnline: retailer.isOnline,
        lastSeen: retailer.lastSeen
      }))
    };

    const result = await safeElectronAPI.saveRegistrationData(
      exportData,
      `retailers-${user?.productCategory || 'export'}-${new Date().getTime()}.json`
    );

    if (result.success) {
      safeElectronAPI.showNotification(
        'Export Successful',
        'Retailers data exported successfully'
      );
    } else {
      safeElectronAPI.showNotification('Export Failed', 'Could not export data');
    }
  };

  const handlePrintDirectory = () => {
    window.print();
  };

  const getConnectionStatus = () => {
    if (syncStatus === 'syncing') return 'syncing';
    if (!isOnline) return 'offline';
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

  const handleEmailRetailer = (retailer) => {
    if (isElectron) {
      safeElectronAPI.showNotification(
        'Email Retailer',
        `Opening email client for ${retailer.businessName}`
      );
    }
    window.open(`mailto:${retailer.email}`);
  };

  const handleCallRetailer = (retailer) => {
    if (isElectron) {
      safeElectronAPI.showNotification(
        'Call Retailer',
        `Ready to call ${retailer.businessName} at ${retailer.phone}`
      );
    }
    window.open(`tel:${retailer.phone}`);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              <FaStore className="inline mr-2 text-green-600" />
              Retailer Network
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Loading from local cache and network...' : 'Finding the best matches for your business'}
            </p>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading retailers (offline capable)...' : 'Loading retailers...'}
          </span>
          {isElectron && (
            <button 
              onClick={handleRetry}
              className="mt-4 text-sm text-green-600 hover:text-green-700 flex items-center"
            >
              <FaRedo className="w-4 h-4 mr-1" />
              Retry Loading
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Retailer Network</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Desktop Mode - Offline Capable' : 'Connect with retailers in your product category'}
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-3 rounded-full dark:bg-red-900/30 mb-4">
              <FaExclamationTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Unable to load retailers</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mb-4">{error}</p>
            <div className="flex space-x-3 flex-wrap justify-center gap-2">
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <FaRedo className="w-4 h-4 mr-2" />
                Try Again
              </button>
              {isElectron && (
                <button
                  onClick={handleExportData}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center"
                >
                  <FaDownload className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shouldShowRetailers = user?.productCategory && retailers.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            <FaStore className="inline mr-2 text-green-600" />
            Retailer Network
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect with retailers in your product category
            {isElectron && ' • Desktop Mode'}
          </p>
          {lastSync && isElectron && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Last synced: {lastSync}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {isElectron && (
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
               getConnectionStatus() === 'connected' ? 'Live' : 'Offline'}
            </div>
          )}

          {user?.productCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-50 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300">
              <FaTag className="w-4 h-4 mr-1" />
              {user.productCategory}
            </span>
          )}

          {isElectron && (
            <div className="flex space-x-2">
              <button
                onClick={handleManualRefresh}
                disabled={!isOnline || syncStatus === 'syncing'}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isOnline && syncStatus !== 'syncing'
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <FaSync className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export retailers data to JSON file"
              >
                <FaDownload className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={handlePrintDirectory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Print retailers directory"
              >
                <FaPrint className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          )}
        </div>
      </div>

      {isElectron && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaStore className="text-green-600 dark:text-green-400 text-lg" />
              <div>
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Desktop Mode Active
                </h4>
                <p className="text-xs text-green-700 dark:text-green-300">
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

      {retailers.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search retailers by name, contact person, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="name">Name</option>
              <option value="online">Online Status</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>
      )}

      {!user?.productCategory ? (
        <div className="text-center py-12">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-green-900/20">
            <FaUser className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Product Category Required</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Your account doesn't have a product category set. Please update your profile to see relevant retailers.
          </p>
          <button className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
            Update Profile
          </button>
        </div>
      ) : filteredRetailers.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
            <FaSearch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No matching retailers' : 'No retailers found'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {searchTerm
              ? `No retailers match "${searchTerm}" in your category. Try a different search term.`
              : 'No retailers are currently available in your product category. Try broadening your category or check back later.'
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{filteredRetailers.length}</span> of{' '}
              <span className="font-medium">{retailers.length}</span> retailers
              {isElectron && ' • Offline Capable'}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                {retailers.filter(r => r.isOnline).length} online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRetailers.map(retailer => (
              <div key={retailer._id} className="border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-green-100 dark:border-gray-700 dark:hover:border-green-800/50 dark:bg-gray-800/50 group">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                    {retailer.businessName || `${retailer.firstName} ${retailer.lastName}`}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {retailer.isOnline ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {retailer.contactPerson && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <FaUser className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{retailer.contactPerson}</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <FaEnvelope className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{retailer.email}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <FaPhone className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                    <span>{retailer.phone}</span>
                  </div>

                  {retailer.address && (
                    <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                      <FaMapMarkerAlt className="w-4 h-4 mr-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="flex-1">{retailer.address}, {retailer.city}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col gap-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onContactRetailer(retailer)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        <FaComments className="w-4 h-4 mr-2" />
                        Contact
                      </button>
                      <button
                        onClick={() => onViewRetailerOrders(retailer)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        <FaShoppingCart className="w-4 h-4 mr-2" />
                        Orders
                      </button>
                    </div>

                    {isElectron && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEmailRetailer(retailer)}
                          className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 flex items-center justify-center"
                        >
                          <FaEnvelope className="w-4 h-4 mr-2" />
                          Email
                        </button>
                        <button
                          onClick={() => handleCallRetailer(retailer)}
                          className="flex-1 border border-green-600 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20 flex items-center justify-center"
                        >
                          <FaPhone className="w-4 h-4 mr-2" />
                          Call
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <FaTag className="w-3 h-3 mr-1" />
                      {user.productCategory}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Retailers;