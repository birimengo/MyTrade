import React, { useState, useEffect } from 'react';

const MyStock = () => {
  const [systemStocks, setSystemStocks] = useState([]);
  const [manualStocks, setManualStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('system');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    measurementUnit: 'kg',
    unitPrice: '',
    minStockLevel: '',
    notes: ''
  });

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // API call functions
  const fetchSystemStocks = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/system-stocks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch system stocks');
      }
      
      const data = await response.json();
      return data.stocks || data; // Handle both formats
    } catch (error) {
      console.error('Error fetching system stocks:', error);
      return []; // Return empty array instead of throwing
    }
  };

  const fetchRetailerStocks = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/retailer-stocks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch retailer stocks');
      }
      
      const data = await response.json();
      return data.stocks || data; // Handle both formats
    } catch (error) {
      console.error('Error fetching retailer stocks:', error);
      return []; // Return empty array instead of throwing
    }
  };

  const createRetailerStock = async (stockData) => {
    try {
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/retailer-stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stockData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create stock');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating retailer stock:', error);
      throw error;
    }
  };

  const updateRetailerStock = async (id, stockData) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:5000/api/retailer-stocks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stockData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update stock');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating retailer stock:', error);
      throw error;
    }
  };

  const deleteRetailerStock = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock item?')) {
      try {
        const token = getAuthToken();
        const response = await fetch(`http://localhost:5000/api/retailer-stocks/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete stock');
        }
        
        loadStocks(); // Reload stocks after successful deletion
      } catch (error) {
        console.error('Error deleting retailer stock:', error);
        alert('Failed to delete stock. Please try again.');
      }
    }
  };

  const syncSystemStocks = async () => {
    try {
      setSyncing(true);
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/system-stocks/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync system stocks');
      }
      
      const result = await response.json();
      alert(result.message || 'System stocks synced successfully');
      loadStocks(); // Reload stocks after sync
    } catch (error) {
      console.error('Error syncing system stocks:', error);
      alert('Failed to sync system stocks. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const [systemData, manualData] = await Promise.all([
        fetchSystemStocks(),
        fetchRetailerStocks()
      ]);
      
      setSystemStocks(systemData);
      setManualStocks(manualData);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStock) {
        await updateRetailerStock(editingStock._id, formData);
      } else {
        await createRetailerStock(formData);
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
      loadStocks();
    } catch (error) {
      console.error('Error saving stock:', error);
      alert('Failed to save stock. Please try again.');
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
        loadStocks();
      } catch (error) {
        console.error('Error deleting stock:', error);
        alert('Failed to delete stock. Please try again.');
      }
    }
  };

  const renderStockTable = (stocks, isSystemStock = false) => (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Product
            </th>
            <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Category
            </th>
            <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Total Value
            </th>
            {!isSystemStock && (
              <th className="px-2 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          {stocks.map((stock) => (
            <tr key={stock._id}>
              <td className="px-2 py-4">
                <div className="font-medium text-gray-900 dark:text-white">
                  {stock.name}
                </div>
                {stock.notes && (
                  <div className="text-gray-500 dark:text-gray-400">
                    {stock.notes}
                  </div>
                )}
              </td>
              <td className="px-2 py-4 text-gray-500 dark:text-gray-400">
                {stock.category}
              </td>
              <td className="px-2 py-4 text-gray-500 dark:text-gray-400">
                {stock.quantity} {stock.measurementUnit}
              </td>
              <td className="px-2 py-4 text-gray-500 dark:text-gray-400">
                UGX {stock.unitPrice?.toLocaleString()}
              </td>
              <td className="px-2 py-4 font-medium text-gray-900 dark:text-white">
                UGX {stock.totalValue?.toLocaleString()}
              </td>
              {!isSystemStock && (
                <td className="px-2 py-4 font-medium">
                  <button
                    onClick={() => handleEdit(stock)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(stock._id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-2">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-2">
      <h2 className="text-lg font-semibold mb-4 dark:text-white">MyStock</h2>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            System Stock ({systemStocks.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manual'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Manual Stock ({manualStocks.length})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'system' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              System stock is automatically updated when you receive and certify orders from wholesalers.
            </p>
            <button
              onClick={syncSystemStocks}
              disabled={syncing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync System Stock'}
            </button>
          </div>
          {systemStocks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-4">
                No system stock items yet. Your stock will appear here after you receive and certify orders.
              </p>
              <button
                onClick={syncSystemStocks}
                disabled={syncing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Existing Orders'}
              </button>
            </div>
          ) : (
            <div className="h-72 overflow-y-scroll">
              {renderStockTable(systemStocks, true)}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Add and manage your manual stock items here.
            </p>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Stock Item
            </button>
          </div>

          {showAddForm && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
              <h3 className="text-lg font-medium mb-3 dark:text-white">
                {editingStock ? 'Edit Stock Item' : 'Add New Stock Item'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Measurement Unit *
                    </label>
                    <select
                      value={formData.measurementUnit}
                      onChange={(e) => setFormData({...formData, measurementUnit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price (UGX) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({...formData, minStockLevel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
                  >
                    {editingStock ? 'Update' : 'Add'} Stock Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {manualStocks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No manual stock items yet. Click "Add Stock Item" to get started.
            </p>
          ) : (
            <div className="h-75 overflow-y-scroll">
              {renderStockTable(manualStocks)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyStock;