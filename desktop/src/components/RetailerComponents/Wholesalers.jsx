// components/RetailerComponents/Wholesalers.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import WholesalerProducts from './WholesalerProducts';

const Wholesalers = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedWholesaler, setSelectedWholesaler] = useState(null);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [viewingProducts, setViewingProducts] = useState(false);
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

  // Check if we're in Electron
  const isElectron = window.electronAPI;

  useEffect(() => {
    fetchWholesalers();
  }, [user?.productCategory]);

  const fetchWholesalers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.productCategory) {
        setLoading(false);
        return;
      }

      // Try to fetch fresh data first
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/wholesalers?category=${encodeURIComponent(user.productCategory)}`,
          {
            headers: getAuthHeaders()
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setWholesalers(data.wholesalers);
            // Cache data for offline use using existing Electron storage
            if (isElectron) {
              await window.electronAPI.storage.setPersistent('wholesalers_data', {
                data: data.wholesalers,
                lastUpdated: new Date().toISOString()
              });
            }
            return;
          }
        }
      } catch (networkError) {
        console.log('Network unavailable, trying cached data');
      }

      // Fallback to cached data using existing Electron storage
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('wholesalers_data');
        if (cachedData.success && cachedData.value?.data) {
          setWholesalers(cachedData.value.data);
          setError('Using cached data - No network connection');
          return;
        }
      }

      throw new Error('No network connection and no cached data available');
    } catch (error) {
      console.error('Error fetching wholesalers:', error);
      setError(error.message || 'An error occurred while fetching wholesalers');
    } finally {
      setLoading(false);
    }
  };

  const filteredWholesalers = wholesalers
    .filter(wholesaler =>
      wholesaler.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.businessName?.localeCompare(b.businessName);
        case 'online':
          return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
        case 'recent':
          return new Date(b.lastSeen) - new Date(a.lastSeen);
        default:
          return 0;
      }
    });

  const handleRetry = () => {
    setError(null);
    fetchWholesalers();
  };

  const handleContact = (wholesaler) => {
    setSelectedWholesaler(wholesaler);
    setShowContactModal(true);
  };

  const handleViewProducts = (wholesaler) => {
    setSelectedWholesaler(wholesaler);
    setViewingProducts(true);
  };

  const handleBackToWholesalers = () => {
    setViewingProducts(false);
    setSelectedWholesaler(null);
  };

  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      productCategory: user?.productCategory,
      totalWholesalers: filteredWholesalers.length,
      wholesalers: filteredWholesalers
    };

    if (isElectron) {
      // Use existing Electron file save functionality
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `wholesalers-${user?.productCategory || 'export'}-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          `Wholesalers data exported successfully`
        );
      }
    } else {
      // Web fallback
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wholesalers-${user?.productCategory || 'export'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrintDirectory = () => {
    window.print();
  };

  const handleQuickContact = (wholesaler) => {
    if (isElectron) {
      window.electronAPI.showNotification(
        'Contact Wholesaler',
        `Opening contact options for ${wholesaler.businessName}`
      );
    }
    
    // Open default email client
    const subject = `Business Inquiry - ${wholesaler.businessName}`;
    const body = `Hello ${wholesaler.contactPerson},\n\nI would like to discuss potential business opportunities with ${wholesaler.businessName}.\n\nBest regards,\n${user?.firstName} ${user?.lastName}\n${user?.businessName || ''}`;
    
    window.open(`mailto:${wholesaler.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const sendMessage = async (message) => {
    if (!selectedWholesaler) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          to: selectedWholesaler._id,
          message: message,
          type: 'text'
        })
      });

      if (response.ok) {
        setShowContactModal(false);
        if (isElectron) {
          window.electronAPI.showNotification(
            'Message Sent',
            `Message sent to ${selectedWholesaler.businessName}`
          );
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (isElectron) {
        window.electronAPI.showNotification(
          'Message Failed',
          `Could not send message to ${selectedWholesaler.businessName}`
        );
      }
    }
  };

  const handleCallWholesaler = (wholesaler) => {
    if (isElectron) {
      window.electronAPI.showNotification(
        'Call Wholesaler',
        `Ready to call ${wholesaler.businessName} at ${wholesaler.phone}`
      );
    }
    window.open(`tel:${wholesaler.phone}`);
  };

  // If we're viewing products, show the WholesalerProducts component
  if (viewingProducts && selectedWholesaler) {
    return (
      <WholesalerProducts 
        wholesalerId={selectedWholesaler._id}
        onBack={handleBackToWholesalers}
      />
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Wholesaler Directory</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Loading from local cache and network...' : 'Finding the best matches for your business'}
            </p>
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {isElectron ? 'Loading wholesalers (offline capable)...' : 'Loading wholesalers...'}
          </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !wholesalers.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Wholesaler Directory</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isElectron ? 'Desktop Mode - Offline Capable' : 'Connect with wholesalers in your network'}
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-3 rounded-full dark:bg-red-900/30 mb-4">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Unable to load wholesalers</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-md">{error}</p>
            <div className="flex space-x-3 flex-wrap justify-center gap-2">
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              {isElectron && (
                <button
                  onClick={handleExportData}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Wholesaler Directory</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect with wholesalers in your product category
            {isElectron && ' • Desktop Mode'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          {user?.productCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {user.productCategory}
            </span>
          )}
          
          {isElectron && (
            <div className="flex space-x-2">
              <button
                onClick={handleExportData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export wholesalers data to JSON file"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              <button
                onClick={handlePrintDirectory}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Print wholesalers directory"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
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
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search wholesalers by name, contact person, or email..."
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
            </select>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="overflow-y-auto">
        {!user?.productCategory ? (
          <div className="text-center py-8">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-blue-900/20">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Product Category Required</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              Your account doesn't have a product category set. Please update your profile to see relevant wholesalers.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
              Update Profile
            </button>
          </div>
        ) : filteredWholesalers.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No matching wholesalers' : 'No wholesalers found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
              {searchTerm
                ? `No wholesalers match "${searchTerm}" in your category. Try a different search term.`
                : 'No wholesalers are currently available in your product category. Try broadening your category or check back later.'
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
                <span className="font-medium">{wholesalers.length}</span> wholesalers
                {isElectron && ' • Offline Capable'}
              </p>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {wholesalers.filter(w => w.isOnline).length} online
                </span>
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
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-2">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {wholesaler.productCategory}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {wholesaler.isOnline ? (
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

                  {/* Contact Information */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{wholesaler.contactPerson}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{wholesaler.email}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9.5 10.5M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                      </svg>
                      <span>{wholesaler.phone}</span>
                    </div>
                  </div>

                  {/* Footer with actions */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col gap-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleContact(wholesaler)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Message
                        </button>
                        <button
                          onClick={() => handleViewProducts(wholesaler)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                          </svg>
                          Products
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleQuickContact(wholesaler)}
                          className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </button>
                        <button
                          onClick={() => handleCallWholesaler(wholesaler)}
                          className="flex-1 border border-green-600 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9.5 10.5M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                          </svg>
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

      {/* Contact Modal */}
      {showContactModal && selectedWholesaler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contact {selectedWholesaler.businessName}
            </h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9.5 10.5M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                </svg>
                {selectedWholesaler.phone}
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {selectedWholesaler.email}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => sendMessage(`Hello ${selectedWholesaler.contactPerson}, I would like to discuss business opportunities.`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wholesalers;