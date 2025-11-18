import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';

const MyStock = () => {
  const [systemStocks, setSystemStocks] = useState([]);
  const [manualStocks, setManualStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('system');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    measurementUnit: 'kg',
    unitPrice: '',
    minStockLevel: '',
    notes: ''
  });

  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const isElectron = window.electronAPI;

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      setError('');
      setOfflineMode(false);

      // Try to fetch fresh data first
      try {
        const [systemData, manualData] = await Promise.all([
          fetchSystemStocks(),
          fetchRetailerStocks()
        ]);
        
        setSystemStocks(systemData);
        setManualStocks(manualData);
        
        // Cache data for offline use
        if (isElectron) {
          await window.electronAPI.storage.setPersistent('stocks_data', {
            systemStocks: systemData,
            manualStocks: manualData,
            lastUpdated: new Date().toISOString()
          });
        }
        return;
      } catch (networkError) {
        console.log('Network unavailable, trying cached stocks data');
      }

      // Fallback to cached data
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('stocks_data');
        if (cachedData.success && cachedData.value) {
          setSystemStocks(cachedData.value.systemStocks || []);
          setManualStocks(cachedData.value.manualStocks || []);
          setOfflineMode(true);
          setError('Using cached data - No network connection');
          return;
        }
      }

      throw new Error('No network connection and no cached data available');
    } catch (err) {
      console.error('Error loading stocks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // API call functions with Electron enhancement
  const fetchSystemStocks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/system-stocks`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.stocks || data || [];
      }
      throw new Error('Failed to fetch system stocks');
    } catch (error) {
      console.error('Error fetching system stocks:', error);
      return [];
    }
  };

  const fetchRetailerStocks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/retailer-stocks`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.stocks || data || [];
      }
      throw new Error('Failed to fetch retailer stocks');
    } catch (error) {
      console.error('Error fetching retailer stocks:', error);
      return [];
    }
  };

  const createRetailerStock = async (stockData) => {
    try {
      // For Electron offline mode
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_stock_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        const tempId = `temp_${Date.now()}`;
        actions.push({
          type: 'create',
          data: { ...stockData, tempId },
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_stock_actions', actions);
        
        // Update local state optimistically
        const newStock = {
          ...stockData,
          _id: tempId,
          totalValue: (parseFloat(stockData.quantity) || 0) * (parseFloat(stockData.unitPrice) || 0)
        };
        setManualStocks(prev => [...prev, newStock]);
        
        window.electronAPI.showNotification(
          'Stock Saved Offline',
          'Stock item saved and will sync when online'
        );
        
        setSuccessMessage('Stock item saved offline and will sync when connected.');
        setTimeout(() => setSuccessMessage(''), 5000);
        return { success: true, offline: true };
      }

      // Online mode
      const response = await fetch(`${API_BASE_URL}/api/retailer-stocks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(stockData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create stock');
      }
      
      const result = await response.json();
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Stock Created',
          'Stock item created successfully'
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error creating retailer stock:', error);
      throw error;
    }
  };

  const updateRetailerStock = async (id, stockData) => {
    try {
      // For Electron offline mode
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_stock_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        actions.push({
          type: 'update',
          id,
          data: stockData,
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_stock_actions', actions);
        
        // Update local state optimistically
        setManualStocks(prev => prev.map(stock => 
          stock._id === id 
            ? { ...stock, ...stockData, totalValue: (parseFloat(stockData.quantity) || 0) * (parseFloat(stockData.unitPrice) || 0) }
            : stock
        ));
        
        window.electronAPI.showNotification(
          'Update Saved Offline',
          'Stock item update saved and will sync when online'
        );
        
        setSuccessMessage('Stock update saved offline and will sync when connected.');
        setTimeout(() => setSuccessMessage(''), 5000);
        return { success: true, offline: true };
      }

      // Online mode
      const response = await fetch(`${API_BASE_URL}/api/retailer-stocks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(stockData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update stock');
      }
      
      const result = await response.json();
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Stock Updated',
          'Stock item updated successfully'
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error updating retailer stock:', error);
      throw error;
    }
  };

  const deleteRetailerStock = async (id) => {
    try {
      // For Electron offline mode
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_stock_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        actions.push({
          type: 'delete',
          id,
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_stock_actions', actions);
        
        // Update local state optimistically
        setManualStocks(prev => prev.filter(stock => stock._id !== id));
        
        window.electronAPI.showNotification(
          'Delete Saved Offline',
          'Stock item deletion saved and will sync when online'
        );
        
        setSuccessMessage('Stock deletion saved offline and will sync when connected.');
        setTimeout(() => setSuccessMessage(''), 5000);
        return { success: true, offline: true };
      }

      // Online mode
      const response = await fetch(`${API_BASE_URL}/api/retailer-stocks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete stock');
      }
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Stock Deleted',
          'Stock item deleted successfully'
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting retailer stock:', error);
      throw error;
    }
  };

  const syncSystemStocks = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`${API_BASE_URL}/api/system-stocks/sync`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync system stocks');
      }
      
      const result = await response.json();
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Sync Successful',
          result.message || 'System stocks synced successfully'
        );
      }
      
      setSuccessMessage(result.message || 'System stocks synced successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      loadStocks();
    } catch (error) {
      console.error('Error syncing system stocks:', error);
      setError(error.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Sync Failed',
          error.message || 'Failed to sync system stocks'
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleExportStocks = async () => {
    const stocksToExport = activeTab === 'system' ? systemStocks : manualStocks;
    const exportData = {
      exportedAt: new Date().toISOString(),
      type: activeTab === 'system' ? 'system_stocks' : 'manual_stocks',
      totalItems: stocksToExport.length,
      totalValue: stocksToExport.reduce((sum, stock) => sum + (stock.totalValue || 0), 0),
      stocks: stocksToExport
    };

    if (isElectron) {
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `stocks-${activeTab}-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          `${stocksToExport.length} stock items exported successfully`
        );
      }
    } else {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stocks-${activeTab}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const stockData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        minStockLevel: formData.minStockLevel ? parseFloat(formData.minStockLevel) : undefined
      };

      if (editingStock) {
        await updateRetailerStock(editingStock._id, stockData);
      } else {
        await createRetailerStock(stockData);
      }
      
      setShowAddForm(false);
      setEditingStock(null);
      setFormData({
        name: '',
        category: '',
        quantity: '',
        measurementUnit: 'kg',
        unitPrice: '',
        minStockLevel: '',
        notes: ''
      });
      
      // Only reload if not in offline mode (optimistic updates already done)
      if (!offlineMode) {
        loadStocks();
      }
    } catch (error) {
      console.error('Error saving stock:', error);
      setError(error.message);
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Save Failed',
          error.message || 'Failed to save stock item'
        );
      }
    }
  };

  const handleEdit = (stock) => {
    setEditingStock(stock);
    setFormData({
      name: stock.name,
      category: stock.category,
      quantity: stock.quantity,
      measurementUnit: stock.measurementUnit,
      unitPrice: stock.unitPrice,
      minStockLevel: stock.minStockLevel,
      notes: stock.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock item?')) {
      try {
        await deleteRetailerStock(id);
        // Only reload if not in offline mode (optimistic updates already done)
        if (!offlineMode) {
          loadStocks();
        }
      } catch (error) {
        console.error('Error deleting stock:', error);
        setError(error.message);
        
        if (isElectron) {
          window.electronAPI.showNotification(
            'Delete Failed',
            error.message || 'Failed to delete stock item'
          );
        }
      }
    }
  };

  const getStockStatus = (stock) => {
    if (stock.minStockLevel && stock.quantity <= stock.minStockLevel) {
      return { status: 'low', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
    }
    if (stock.quantity === 0) {
      return { status: 'out', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    }
    return { status: 'normal', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Stock</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isElectron ? 'Loading from local cache and network...' : 'Loading your stock inventory...'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
              {isElectron ? 'Loading stock data (offline capable)...' : 'Loading stock data...'}
            </span>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Stock</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your inventory and track stock levels
              {isElectron && ' • Desktop Mode'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            {isElectron && (
              <button
                onClick={handleExportStocks}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export stock data to JSON file"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                {offlineMode && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                    You can still manage stocks. Changes will sync when you're back online.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 dark:text-green-300 text-sm font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('system')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>System Stock</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                  {systemStocks.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Manual Stock</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                  {manualStocks.length}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'system' ? (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  System stock is automatically updated when you receive and certify orders from wholesalers.
                  {offlineMode && isElectron && (
                    <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      Offline
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={syncSystemStocks}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync System Stock
                  </>
                )}
              </button>
            </div>

            {systemStocks.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No System Stock</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                  Your system stock will appear here after you receive and certify orders from wholesalers.
                </p>
                <button
                  onClick={syncSystemStocks}
                  disabled={syncing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync Existing Orders'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {systemStocks.map((stock) => {
                  const stockStatus = getStockStatus(stock);
                  return (
                    <div key={stock._id} className="border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {stock.name}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-2">
                            {stock.category}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.status === 'low' ? 'Low Stock' : stockStatus.status === 'out' ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>

                      {stock.notes && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {stock.notes}
                        </p>
                      )}

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {stock.quantity} {stock.measurementUnit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Unit Price:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            UGX {stock.unitPrice?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Total Value:</span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            UGX {stock.totalValue?.toLocaleString()}
                          </span>
                        </div>
                        {stock.minStockLevel && (
                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>Min Stock Level:</span>
                            <span>{stock.minStockLevel} {stock.measurementUnit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-700/50">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Add and manage your manual stock items here.
                  {offlineMode && isElectron && (
                    <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      Offline
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingStock(null);
                  setFormData({
                    name: '',
                    category: '',
                    quantity: '',
                    measurementUnit: 'kg',
                    unitPrice: '',
                    minStockLevel: '',
                    notes: ''
                  });
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Stock Item
              </button>
            </div>

            {showAddForm && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">
                  {editingStock ? 'Edit Stock Item' : 'Add New Stock Item'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Enter category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Measurement Unit *
                      </label>
                      <select
                        value={formData.measurementUnit}
                        onChange={(e) => setFormData({...formData, measurementUnit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                      >
                        <option value="kg">Kilograms (kg)</option>
                        <option value="g">Grams (g)</option>
                        <option value="liters">Liters</option>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="pieces">Pieces</option>
                        <option value="bags">Bags</option>
                        <option value="crates">Crates</option>
                        <option value="boxes">Boxes</option>
                        <option value="units">Units</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Unit Price (UGX) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.unitPrice}
                        onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Stock Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.minStockLevel}
                        onChange={(e) => setFormData({...formData, minStockLevel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                      placeholder="Additional notes about this stock item..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingStock(null);
                        setFormData({
                          name: '',
                          category: '',
                          quantity: '',
                          measurementUnit: 'kg',
                          unitPrice: '',
                          minStockLevel: '',
                          notes: ''
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                    >
                      {editingStock ? 'Update' : 'Add'} Stock Item
                    </button>
                  </div>
                </form>
              </div>
            )}

            {manualStocks.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-700">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Manual Stock Items</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                  Get started by adding your first manual stock item to track your inventory.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Add Your First Stock Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {manualStocks.map((stock) => {
                  const stockStatus = getStockStatus(stock);
                  return (
                    <div key={stock._id} className="border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-800/50 dark:bg-gray-800/50 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {stock.name}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-2">
                            {stock.category}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.status === 'low' ? 'Low Stock' : stockStatus.status === 'out' ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>

                      {stock.notes && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {stock.notes}
                        </p>
                      )}

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {stock.quantity} {stock.measurementUnit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Unit Price:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            UGX {stock.unitPrice?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Total Value:</span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            UGX {stock.totalValue?.toLocaleString()}
                          </span>
                        </div>
                        {stock.minStockLevel && (
                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>Min Stock Level:</span>
                            <span>{stock.minStockLevel} {stock.measurementUnit}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => handleEdit(stock)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(stock._id)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default MyStock;