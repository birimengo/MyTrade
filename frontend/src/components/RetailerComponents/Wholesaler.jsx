// components/RetailerComponents/Wholesaler.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Wholesaler = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWholesalers = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user?.productCategory) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `http://localhost:5000/api/wholesalers?category=${encodeURIComponent(user.productCategory)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Server returned ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setWholesalers(data.wholesalers);
        } else {
          throw new Error(data.message || 'Failed to fetch wholesalers');
        }
      } catch (error) {
        console.error('Error fetching wholesalers:', error);
        setError(error.message || 'An error occurred while fetching wholesalers');
      } finally {
        setLoading(false);
      }
    };

    fetchWholesalers();
  }, [user?.productCategory]);

  const filteredWholesalers = wholesalers
    .filter(wholesaler =>
      wholesaler.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wholesaler.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.businessName.localeCompare(b.businessName);
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
    setLoading(true);
    window.location.reload();
  };

  const handleContact = (wholesaler) => {
    // This would typically open a chat or contact modal
    console.log('Contacting wholesaler:', wholesaler);
    // Implement contact functionality here
  };

  const handleViewProducts = (wholesaler) => {
    // Navigate to the wholesaler's products page within the retailer dashboard
    navigate(`/dashboard/retailer/wholesalers/${wholesaler._id}/products`);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Wholesaler Directory</h2>
          <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
          <span className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-300">Loading wholesalers...</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Finding the best matches for your business</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Wholesaler Directory</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-2 rounded-full dark:bg-red-900/30 mb-3">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-red-800 dark:text-red-300 mb-1">Unable to load wholesalers</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mb-3">{error}</p>
            <div className="flex space-x-2">
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              <button
                onClick={() => setError(null)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-2 flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Wholesaler Directory</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Connect with wholesalers in your product category
          </p>
        </div>
        {user?.productCategory && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300 mt-2 sm:mt-0">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {user.productCategory}
          </span>
        )}
      </div>

      {/* Controls Section */}
      {wholesalers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 p-3 bg-gray-50 rounded dark:bg-gray-700/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search wholesalers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 py-1.5 w-full border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white w-28"
            >
              <option value="name">Name</option>
              <option value="online">Online Status</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto">
        {!user?.productCategory ? (
          <div className="text-center py-6">
            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 dark:bg-blue-900/20">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Product Category Required</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-3">
              Your account doesn't have a product category set. Please update your profile to see relevant wholesalers.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200">
              Update Profile
            </button>
          </div>
        ) : filteredWholesalers.length === 0 ? (
          <div className="text-center py-6">
            <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 dark:bg-gray-700">
              <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {searchTerm ? 'No matching wholesalers' : 'No wholesalers found'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-3">
              {searchTerm
                ? `No wholesalers match "${searchTerm}" in your category. Try a different search term.`
                : 'No wholesalers are currently available in your product category. Try broadening your category or check back later.'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Showing <span className="font-medium">{filteredWholesalers.length}</span> of{' '}
                <span className="font-medium">{wholesalers.length}</span> wholesalers
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                  {wholesalers.filter(w => w.isOnline).length} online
                </span>
              </div>
            </div>

            {/* Mobile Cards Layout */}
            <div className="space-y-3 md:hidden">
              {filteredWholesalers.map(wholesaler => (
                <div key={wholesaler._id} className="border border-gray-200 rounded-lg p-3 transition-all duration-300 hover:shadow-md hover:border-blue-100 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50">
                  {/* Header with status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {wholesaler.businessName}
                      </h3>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 mt-1">
                        <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {wholesaler.productCategory}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {wholesaler.isOnline ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{wholesaler.contactPerson}</span>
                    </div>

                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{wholesaler.email}</span>
                    </div>

                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9.5 10.5M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                      </svg>
                      <span>{wholesaler.phone}</span>
                    </div>
                  </div>

                  {/* Footer with actions */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleContact(wholesaler)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Contact
                      </button>
                      <button
                        onClick={() => handleViewProducts(wholesaler)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                        </svg>
                        Products
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Grid Layout */}
            <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredWholesalers.map(wholesaler => (
                <div key={wholesaler._id} className="border border-gray-200 rounded-lg p-4 transition-all duration-300 hover:shadow-md hover:border-blue-100 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50">
                  {/* Header with status */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate flex-1 mr-2">
                      {wholesaler.businessName}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {wholesaler.isOnline ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{wholesaler.contactPerson}</span>
                    </div>

                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{wholesaler.email}</span>
                    </div>

                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L9.5 10.5M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                      </svg>
                      <span>{wholesaler.phone}</span>
                    </div>
                  </div>

                  {/* Footer with actions */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {wholesaler.productCategory}
                    </span>

                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleContact(wholesaler)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Contact
                      </button>
                      <button
                        onClick={() => handleViewProducts(wholesaler)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9" />
                        </svg>
                        Products
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wholesaler;