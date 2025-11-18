// src/components/SupplierComponents/MyStock.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../context/DarkModeContext';
import { 
  FaBox,
  FaChartBar,
  FaReceipt,
  FaHistory,
  FaFileAlt,
  FaSync,
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa';

// Import all tab components
import StockTab from './Stock';
import AnalyticsTab from './Analytics';
import SalesTab from './Sales';
import SalesHistoryTab from './SalesHistory';
import ReceiptsTab from './Receipts';

const MyStock = ({ isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [error, setError] = useState(null);

  const { user, token, API_BASE_URL, logout } = useAuth();
  const { isDarkMode } = useDarkMode();

  // API call function
  const apiCall = async (endpoint, options = {}) => {
    try {
      const authToken = token;
      
      if (!authToken) {
        alert('Authentication Required. Please log in again to continue.');
        logout();
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/api${endpoint}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);

      if (response.status === 401) {
        alert('Session Expired. Please log in again.');
        logout();
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  };

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // You can still fetch data for the tabs when they're implemented
      await Promise.all([
        // Add your API calls here when needed
      ]);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Tab Navigation Component
  const TabNavigation = () => (
    <div className={`border-b ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    } px-3`}>
      <div className="flex -mb-px">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center justify-center flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'stock'
              ? isDarkMode
                ? 'border-blue-500 text-blue-400'
                : 'border-blue-600 text-blue-600'
              : isDarkMode
                ? 'border-transparent text-gray-400 hover:text-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaBox className={`w-4 h-4 mr-2 ${
            activeTab === 'stock' 
              ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          Stock
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center justify-center flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? isDarkMode
                ? 'border-blue-500 text-blue-400'
                : 'border-blue-600 text-blue-600'
              : isDarkMode
                ? 'border-transparent text-gray-400 hover:text-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaChartBar className={`w-4 h-4 mr-2 ${
            activeTab === 'analytics' 
              ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          Analytics
        </button>

        <button
          onClick={() => setActiveTab('create-sale')}
          className={`flex items-center justify-center flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'create-sale'
              ? isDarkMode
                ? 'border-blue-500 text-blue-400'
                : 'border-blue-600 text-blue-600'
              : isDarkMode
                ? 'border-transparent text-gray-400 hover:text-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaReceipt className={`w-4 h-4 mr-2 ${
            activeTab === 'create-sale' 
              ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          Sales
        </button>

        <button
          onClick={() => setActiveTab('sales-history')}
          className={`flex items-center justify-center flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sales-history'
              ? isDarkMode
                ? 'border-blue-500 text-blue-400'
                : 'border-blue-600 text-blue-600'
              : isDarkMode
                ? 'border-transparent text-gray-400 hover:text-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaHistory className={`w-4 h-4 mr-2 ${
            activeTab === 'sales-history' 
              ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          History
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center justify-center flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'receipts'
              ? isDarkMode
                ? 'border-blue-500 text-blue-400'
                : 'border-blue-600 text-blue-600'
              : isDarkMode
                ? 'border-transparent text-gray-400 hover:text-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaFileAlt className={`w-4 h-4 mr-2 ${
            activeTab === 'receipts' 
              ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          Receipts
        </button>
      </div>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    const commonProps = {
      apiCall,
      isDarkMode,
      isElectron,
      isOnline,
      onSync,
      syncStatus,
      pendingSyncCount
    };

    switch (activeTab) {
      case 'stock':
        return <StockTab {...commonProps} />;
      case 'analytics':
        return <AnalyticsTab {...commonProps} />;
      case 'create-sale':
        return <SalesTab {...commonProps} />;
      case 'sales-history':
        return <SalesHistoryTab {...commonProps} />;
      case 'receipts':
        return <ReceiptsTab {...commonProps} />;
      default:
        return <StockTab {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className={`rounded-xl shadow-sm border ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center px-6 py-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <FaBox className={`w-5 h-5 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <h2 className={`text-lg font-semibold ml-3 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            My Stock & Sales
          </h2>
        </div>

        {/* Loading State */}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl shadow-sm border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center px-6 py-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <FaBox className={`w-5 h-5 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`} />
        <h2 className={`text-lg font-semibold ml-3 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          My Stock & Sales
        </h2>
        
        <div className="flex-1"></div>
        
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-gray-700 disabled:opacity-50' 
              : 'hover:bg-gray-100 disabled:opacity-50'
          }`}
        >
          {refreshing ? (
            <FaSync className="w-4 h-4 animate-spin text-gray-500" />
          ) : (
            <FaSync className={`w-4 h-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mx-6 mt-4 p-4 rounded-lg border-l-4 border-red-500 ${
          isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaExclamationTriangle className="w-4 h-4 text-red-500 mr-3" />
              <p className={`text-sm ${
                isDarkMode ? 'text-red-200' : 'text-red-800'
              }`}>
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className={`p-1 rounded ${
                isDarkMode 
                  ? 'hover:bg-red-800 hover:bg-opacity-20' 
                  : 'hover:bg-red-100'
              }`}
            >
              <FaTimes className="w-3 h-3 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MyStock;