import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../context/AuthContext';
import ErrorBoundary from '../ErrorBoundary';
import { FaSearch, FaSync, FaDollarSign, FaBox, FaUser, FaPhone, FaShoppingCart, FaExclamationTriangle, FaReceipt, FaPrint, FaSave } from 'react-icons/fa';

const DailySales = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [salesRecords, setSalesRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stockType, setStockType] = useState('all');
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [showLowStockPanel, setShowLowStockPanel] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showReceiptPanel, setShowReceiptPanel] = useState(false);
  const [receiptCustomerName, setReceiptCustomerName] = useState('');
  const [receiptCustomerPhone, setReceiptCustomerPhone] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(Math.floor(100000 + Math.random() * 900000));
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const { user, getAuthHeaders, API_BASE_URL } = useAuth();
  const isElectron = window.electronAPI;

  useEffect(() => {
    fetchProducts();
    fetchSalesRecords();
    // Remove the direct API call for low stock alerts - we'll calculate it client-side
    calculateLowStockAlerts();
  }, []);

  // Calculate low stock alerts from products data
  const calculateLowStockAlerts = () => {
    const lowStockItems = products.filter(product => {
      // Consider stock low if quantity is less than or equal to 10% of typical stock level
      // or if there's a minStockLevel defined and current quantity is at or below it
      const isLowStock = product.minStockLevel 
        ? product.quantity <= product.minStockLevel
        : product.quantity <= 5; // Default threshold
      
      return isLowStock && product.quantity > 0; // Only show items that still have some stock
    });
    
    setLowStockAlerts(lowStockItems);
  };

  // Update low stock alerts when products change
  useEffect(() => {
    if (products.length > 0) {
      calculateLowStockAlerts();
    }
  }, [products]);

  // Helper function to handle API requests with offline support
  const apiRequest = async (url, options = {}) => {
    try {
      setOfflineMode(false);
      
      const token = localStorage.getItem('token');
      const defaultOptions = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
          ...getAuthHeaders()
        },
        ...options
      };

      const response = await fetch(`${API_BASE_URL}${url}`, defaultOptions);
      
      if (!response.ok) {
        // Don't throw error for 404 on low-stock-alerts endpoint
        if (url === '/api/retailer-sales/low-stock-alerts' && response.status === 404) {
          return { lowStockItems: [] }; // Return empty array for missing endpoint
        }
        
        const errorText = await response.text();
        let errorMessage = `Request failed: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          if (errorText && errorText.length < 100) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      
      // For low-stock-alerts endpoint, just return empty array instead of throwing
      if (url === '/api/retailer-sales/low-stock-alerts') {
        return { lowStockItems: [] };
      }
      
      // Fallback to cached data for Electron offline mode
      if (isElectron) {
        const cacheKey = `cache_${url.replace(/\//g, '_')}`;
        const cachedData = await window.electronAPI.storage.getPersistent(cacheKey);
        if (cachedData.success && cachedData.value) {
          setOfflineMode(true);
          toast.warning('Using cached data - No network connection');
          return cachedData.value;
        }
      }
      
      throw error;
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const [retailerData, systemData] = await Promise.all([
        apiRequest('/api/retailer-stocks'),
        apiRequest('/api/system-stocks')
      ]);

      const allProducts = [
        ...(retailerData.stocks || retailerData || []).map(stock => ({ ...stock, stockType: 'retailer' })),
        ...(systemData.stocks || systemData || []).map(stock => ({ ...stock, stockType: 'system' }))
      ];

      setProducts(allProducts);
      setFilteredProducts(allProducts);

      // Cache data for offline use
      if (isElectron && !offlineMode) {
        await window.electronAPI.storage.setPersistent('products_data', {
          data: allProducts,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Fallback to cached products
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('products_data');
        if (cachedData.success && cachedData.value?.data) {
          setProducts(cachedData.value.data);
          setFilteredProducts(cachedData.value.data);
          setOfflineMode(true);
          toast.warning('Using cached products data - No network connection');
        } else {
          toast.error('Failed to load products');
        }
      } else {
        toast.error('Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesRecords = async () => {
    try {
      const data = await apiRequest('/api/retailer-sales');
      setSalesRecords(data.sales || data || []);
      setSelectedSales([]);

      // Cache data for offline use
      if (isElectron && !offlineMode) {
        await window.electronAPI.storage.setPersistent('sales_data', {
          data: data.sales || data || [],
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching sales records:', error);
      
      // Fallback to cached sales
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('sales_data');
        if (cachedData.success && cachedData.value?.data) {
          setSalesRecords(cachedData.value.data);
          setOfflineMode(true);
        } else {
          toast.error('Failed to load sales records');
        }
      } else {
        toast.error('Failed to load sales records');
      }
    }
  };

  // Updated fetchLowStockAlerts to handle missing endpoint gracefully
  const fetchLowStockAlerts = async () => {
    try {
      const data = await apiRequest('/api/retailer-sales/low-stock-alerts');
      // If endpoint doesn't exist, data.lowStockItems will be undefined, so use empty array
      const alerts = data.lowStockItems || [];
      setLowStockAlerts(alerts);

      // Cache data for offline use
      if (isElectron && !offlineMode && alerts.length > 0) {
        await window.electronAPI.storage.setPersistent('low_stock_alerts', {
          data: alerts,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      // Don't show error toast for this - we'll use client-side calculation
      
      // Fallback to cached alerts or client-side calculation
      if (isElectron) {
        const cachedData = await window.electronAPI.storage.getPersistent('low_stock_alerts');
        if (cachedData.success && cachedData.value?.data) {
          setLowStockAlerts(cachedData.value.data);
        } else {
          // Use client-side calculation as fallback
          calculateLowStockAlerts();
        }
      } else {
        // Use client-side calculation as fallback
        calculateLowStockAlerts();
      }
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    let filtered = products;
    
    if (stockType !== 'all') {
      filtered = filtered.filter(product => product.stockType === stockType);
    }
    
    if (query) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.category.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  };

  const handleStockTypeChange = (e) => {
    setStockType(e.target.value);
  };

  useEffect(() => {
    handleSearch({ target: { value: searchQuery } });
  }, [stockType]);

  const toggleLowStockPanel = () => {
    setShowLowStockPanel(prev => !prev);
  };

  const toggleReceiptPanel = () => {
    setShowReceiptPanel(prev => !prev);
    if (!showReceiptPanel) {
      setReceiptNumber(Math.floor(100000 + Math.random() * 900000));
    }
  };

  const handleSalesSelection = (saleId) => {
    setSelectedSales(prev => {
      const isSelected = prev.includes(saleId);
      if (isSelected) {
        return prev.filter(id => id !== saleId);
      } else {
        return [...prev, saleId];
      }
    });
  };

  const selectAllSales = () => {
    setSelectedSales(prev => {
      if (prev.length === salesRecords.length) {
        return [];
      } else {
        return salesRecords.map(sale => sale._id);
      }
    });
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSellingPrice(product.unitPrice);
  };

  const calculateProfit = () => {
    if (!selectedProduct || !saleQuantity || !sellingPrice) return 0;
    
    const cost = selectedProduct.unitPrice * saleQuantity;
    const revenue = sellingPrice * saleQuantity;
    
    return revenue - cost;
  };

  const calculateReceiptTotals = () => {
    const selectedSalesData = salesRecords.filter(sale => selectedSales.includes(sale._id));
    
    const subtotal = selectedSalesData.reduce((total, sale) => {
      return total + (sale.quantity * sale.sellingPrice);
    }, 0);
    
    const totalQuantity = selectedSalesData.reduce((total, sale) => total + sale.quantity, 0);
    
    return { subtotal, totalQuantity, items: selectedSalesData.length, salesData: selectedSalesData };
  };

  const handleSale = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    
    if (!saleQuantity || saleQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    if (saleQuantity > selectedProduct.quantity) {
      toast.error('Insufficient stock');
      return;
    }
    
    if (!sellingPrice || sellingPrice <= 0) {
      toast.error('Please enter a valid selling price');
      return;
    }
    
    try {
      const saleData = {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        quantity: parseFloat(saleQuantity),
        measurementUnit: selectedProduct.measurementUnit,
        unitCost: selectedProduct.unitPrice,
        sellingPrice: parseFloat(sellingPrice),
        profit: calculateProfit(),
        customerName,
        customerPhone,
        stockType: selectedProduct.stockType
      };
      
      // For Electron offline mode
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_sales_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        const tempId = `temp_sale_${Date.now()}`;
        actions.push({
          type: 'create',
          data: { ...saleData, tempId },
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_sales_actions', actions);
        
        // Update local state optimistically
        const newSale = {
          ...saleData,
          _id: tempId,
          saleDate: new Date().toISOString()
        };
        setSalesRecords(prev => [newSale, ...prev]);
        
        // Update product quantity locally
        setProducts(prev => prev.map(product => 
          product._id === selectedProduct._id && product.stockType === selectedProduct.stockType
            ? { ...product, quantity: product.quantity - saleQuantity }
            : product
        ));
        
        window.electronAPI.showNotification(
          'Sale Saved Offline',
          'Sale recorded and will sync when online'
        );
        
        toast.success('Sale recorded offline and will sync when connected.');
        
        resetForm();
        return;
      }

      // Online mode
      const data = await apiRequest('/api/retailer-sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });
      
      if (data.success) {
        if (isElectron) {
          window.electronAPI.showNotification(
            'Sale Recorded',
            'Sale recorded successfully'
          );
        }
        
        toast.success('Sale recorded successfully');
        resetForm();
        fetchProducts();
        fetchSalesRecords();
        // Recalculate low stock alerts after sale
        calculateLowStockAlerts();
      }
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Failed to record sale');
      
      if (isElectron) {
        window.electronAPI.showNotification(
          'Sale Failed',
          error.message || 'Failed to record sale'
        );
      }
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSaleQuantity('');
    setSellingPrice('');
    setCustomerName('');
    setCustomerPhone('');
  };

  const saveReceipt = async () => {
    if (selectedSales.length === 0) {
      toast.error('Please select sales items for the receipt');
      return;
    }

    setSavingReceipt(true);

    try {
      const receiptData = {
        saleIds: selectedSales,
        customerName: receiptCustomerName,
        customerPhone: receiptCustomerPhone
      };
      
      // For Electron offline mode
      if (isElectron && offlineMode) {
        const pendingActions = await window.electronAPI.storage.getPersistent('pending_receipt_actions') || { value: [] };
        const actions = pendingActions.value || [];
        
        actions.push({
          type: 'create',
          data: { ...receiptData, receiptNumber, tempId: `temp_receipt_${Date.now()}` },
          timestamp: new Date().toISOString()
        });
        
        await window.electronAPI.storage.setPersistent('pending_receipt_actions', actions);
        
        window.electronAPI.showNotification(
          'Receipt Saved Offline',
          'Receipt saved and will sync when online'
        );
        
        setSavingReceipt(false);
        return { receiptNumber, success: true, offline: true };
      }

      // Online mode
      const data = await apiRequest('/api/retailer-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData)
      });
      
      if (data.success) {
        setReceiptNumber(data.receipt.receiptNumber);
        setSavingReceipt(false);
        return data.receipt;
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error('Failed to save receipt');
      setSavingReceipt(false);
      throw error;
    }
  };

  const printReceipt = async () => {
    try {
      // First save the receipt
      const savedReceipt = await saveReceipt();
      
      // Generate receipt content
      const receiptContent = generateReceiptContent(savedReceipt);

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Sales Receipt #${savedReceipt.receiptNumber}</title>
            <style>
              body { margin: 0; padding: 20px; }
              @media print {
                body { padding: 0; }
                @page { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${receiptContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          resetReceiptForm();
        }, 500);
      }, 250);
    } catch (error) {
      console.error('Error in print process:', error);
    }
  };

  const generateReceiptContent = (receipt) => {
    const items = receipt.items || calculateReceiptTotals().salesData.map(sale => ({
      productName: sale.productName,
      quantity: sale.quantity,
      measurementUnit: sale.measurementUnit,
      unitPrice: sale.sellingPrice,
      totalPrice: sale.quantity * sale.sellingPrice
    }));

    const subtotal = receipt.subtotal || calculateReceiptTotals().subtotal;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto;">
        <h2 style="text-align: center; margin-bottom: 5px; font-size: 18px;">SALES RECEIPT</h2>
        <p style="text-align: center; margin: 0; font-size: 12px; color: #666;">Receipt #: ${receipt.receiptNumber}</p>
        <p style="text-align: center; margin: 0; font-size: 12px; color: #666;">Date: ${new Date(receipt.receiptDate || new Date()).toLocaleDateString()}</p>
        <p style="text-align: center; margin: 0; font-size: 12px; color: #666;">Time: ${new Date(receipt.receiptDate || new Date()).toLocaleTimeString()}</p>
        
        <hr style="border-top: 1px dashed #000; margin: 10px 0;">
        
        ${receipt.customerName ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Customer:</strong> ${receipt.customerName}</p>` : ''}
        ${receipt.customerPhone ? `<p style="margin: 5px 0; font-size: 12px;"><strong>Phone:</strong> ${receipt.customerPhone}</p>` : ''}
        
        <hr style="border-top: 1px dashed #000; margin: 10px 0;">
        
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;">
          <thead>
            <tr>
              <th style="text-align: left; border-bottom: 1px solid #000; padding: 5px;">Item</th>
              <th style="text-align: center; border-bottom: 1px solid #000; padding: 5px;">Qty</th>
              <th style="text-align: right; border-bottom: 1px solid #000; padding: 5px;">Price</th>
              <th style="text-align: right; border-bottom: 1px solid #000; padding: 5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  ${item.productName}<br>
                  <small style="color: #666;">${item.measurementUnit}</small>
                </td>
                <td style="text-align: center; padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  ${item.quantity}
                </td>
                <td style="text-align: right; padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  UGX ${item.unitPrice?.toFixed(2) || item.sellingPrice?.toFixed(2)}
                </td>
                <td style="text-align: right; padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  UGX ${item.totalPrice?.toFixed(2) || (item.quantity * item.sellingPrice)?.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <hr style="border-top: 1px dashed #000; margin: 10px 0;">
        
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin: 10px 0; font-size: 14px;">
          <span>TOTAL:</span>
          <span>UGX ${subtotal.toFixed(2)}</span>
        </div>
        
        <hr style="border-top: 1px dashed #000; margin: 10px 0;">
        
        <p style="text-align: center; font-style: italic; margin-top: 15px; font-size: 11px; color: #666;">
          Thank you for your business!
        </p>
        ${receipt.offline && `<p style="text-align: center; color: orange; font-size: 10px; margin-top: 5px;">OFFLINE MODE - Will sync when connected</p>`}
      </div>
    `;
  };

  const saveReceiptOnly = async () => {
    try {
      const savedReceipt = await saveReceipt();
      toast.success(`Receipt #${savedReceipt.receiptNumber} saved successfully!`);
      
      resetReceiptForm();
    } catch (error) {
      console.error('Error saving receipt:', error);
    }
  };

  const resetReceiptForm = () => {
    setSelectedSales([]);
    setReceiptCustomerName('');
    setReceiptCustomerPhone('');
    setReceiptNumber(Math.floor(100000 + Math.random() * 900000));
    setShowReceiptPanel(false);
  };

  const handleExportSales = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalSales: salesRecords.length,
      totalAmount: salesRecords.reduce((sum, sale) => sum + (sale.quantity * sale.sellingPrice), 0),
      sales: salesRecords
    };

    if (isElectron) {
      const result = await window.electronAPI.saveRegistrationData(
        exportData, 
        `sales-export-${new Date().getTime()}.json`
      );
      
      if (result.success) {
        window.electronAPI.showNotification(
          'Export Successful',
          `${salesRecords.length} sales exported successfully`
        );
      }
    } else {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const profit = calculateProfit();
  const receiptTotals = calculateReceiptTotals();

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Daily Sales</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your sales and track inventory
              {isElectron && ' • Desktop Mode'}
              {offlineMode && (
                <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  Offline
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            {isElectron && (
              <button
                onClick={handleExportSales}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Export sales data to JSON file"
              >
                <FaSave className="w-4 h-4 mr-2" />
                Export
              </button>
            )}
            
            {/* Receipt Button */}
            {salesRecords.length > 0 && (
              <button
                onClick={toggleReceiptPanel}
                className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
              >
                <FaReceipt className="w-4 h-4 mr-2" />
                Receipt ({selectedSales.length})
              </button>
            )}
            
            {/* Low Stock Alerts Button - Only show if there are alerts */}
            {lowStockAlerts.length > 0 && (
              <button
                onClick={toggleLowStockPanel}
                className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
              >
                <FaExclamationTriangle className="w-4 h-4 mr-2" />
                Low Stock ({lowStockAlerts.length})
              </button>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Panel */}
        {showLowStockPanel && lowStockAlerts.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-red-800 dark:text-red-300 flex items-center">
                <FaExclamationTriangle className="w-4 h-4 mr-2" />
                Low Stock Alerts
              </h3>
              <button
                onClick={toggleLowStockPanel}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockAlerts.map(item => (
                <div key={item._id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-red-200 dark:border-red-700">
                  <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Only {item.quantity} {item.measurementUnit} left
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {item.category} • {item.stockType}
                  </div>
                  {item.minStockLevel && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Min stock: {item.minStockLevel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Receipt Panel */}
        {showReceiptPanel && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center">
                <FaReceipt className="w-4 h-4 mr-2" />
                Create Receipt
              </h3>
              <button
                onClick={toggleReceiptPanel}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xl"
              >
                ×
              </button>
            </div>
            
            {selectedSales.length > 0 ? (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Details (Optional):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={receiptCustomerName}
                      onChange={(e) => setReceiptCustomerName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={receiptCustomerPhone}
                      onChange={(e) => setReceiptCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Receipt Summary:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Receipt #:</div>
                    <div className="text-right font-mono">{receiptNumber}</div>
                    <div>Items:</div>
                    <div className="text-right">{receiptTotals.items}</div>
                    <div>Total Quantity:</div>
                    <div className="text-right">{receiptTotals.totalQuantity}</div>
                    <div className="font-semibold">Total Amount:</div>
                    <div className="text-right font-semibold text-green-600 dark:text-green-400">
                      UGX {receiptTotals.subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={saveReceiptOnly}
                    disabled={savingReceipt}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaSave className="w-4 h-4 mr-2" />
                    {savingReceipt ? 'Saving...' : 'Save Only'}
                  </button>
                  <button
                    onClick={printReceipt}
                    disabled={savingReceipt}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaPrint className="w-4 h-4 mr-2" />
                    {savingReceipt ? 'Saving...' : 'Save & Print'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                Select sales items from the Recent Sales column to create a receipt
              </p>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Product</h2>
              <button 
                onClick={fetchProducts}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                title="Refresh products"
              >
                <FaSync className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mb-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Stock Type:</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={stockType}
                onChange={handleStockTypeChange}
              >
                <option value="all">All Stock</option>
                <option value="retailer">Retailer Stock</option>
                <option value="system">System Stock</option>
              </select>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <FaBox className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No products found</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProducts.map(product => {
                      const isLowStock = lowStockAlerts.some(alert => alert._id === product._id);
                      return (
                        <div 
                          key={`${product.stockType}-${product._id}`}
                          className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                            selectedProduct && selectedProduct._id === product._id && selectedProduct.stockType === product.stockType
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                              : isLowStock
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => selectProduct(product)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              product.stockType === 'retailer' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {product.stockType}
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                            {product.category} • {product.quantity} {product.measurementUnit}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                            Cost: UGX {product.unitPrice?.toFixed(2)}
                          </div>
                          {isLowStock && (
                            <div className="text-red-600 dark:text-red-400 mt-2 font-semibold flex items-center text-sm">
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              Low Stock!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Sales Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Record Sale</h2>
            
            {selectedProduct ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  lowStockAlerts.some(alert => alert._id === selectedProduct._id)
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                }`}>
                  <h3 className="font-medium text-gray-900 dark:text-white">{selectedProduct.name}</h3>
                  <div className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                    Category: {selectedProduct.category}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                    Available: {selectedProduct.quantity} {selectedProduct.measurementUnit}
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                    Cost Price: UGX {selectedProduct.unitPrice?.toFixed(2)}
                  </div>
                  {lowStockAlerts.some(alert => alert._id === selectedProduct._id) && (
                    <div className="text-red-600 dark:text-red-400 mt-2 font-semibold flex items-center text-sm">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Low Stock Warning!
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Quantity:</label>
                  <input
                    type="number"
                    min="0.01"
                    max={selectedProduct.quantity}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(e.target.value)}
                    placeholder={`Enter quantity in ${selectedProduct.measurementUnit}`}
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Max: {selectedProduct.quantity} {selectedProduct.measurementUnit}
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Selling Price:</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaDollarSign className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="Enter selling price per unit"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white">Profit:</span>
                    <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}UGX {profit.toFixed(2)}
                    </span>
                  </div>
                  {profit < 0 && (
                    <div className="text-red-600 dark:text-red-400 mt-2 flex items-center text-sm">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Warning: Selling below cost price
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <FaUser className="w-4 h-4 mr-2" />
                    Customer Details (Optional)
                  </h3>
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUser className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Customer Name"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaPhone className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Phone Number"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  onClick={handleSale}
                  disabled={loading}
                >
                  <FaShoppingCart className="w-4 h-4 mr-2" />
                  {loading ? 'Processing...' : 'Record Sale'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="text-gray-400 mb-4">
                  <FaBox className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">No product selected</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Select a product from the list to record a sale</p>
              </div>
            )}
          </div>
          
          {/* Recent Sales */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sales</h2>
              <div className="flex space-x-2">
                {salesRecords.length > 0 && (
                  <button 
                    onClick={selectAllSales}
                    className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Select all sales"
                  >
                    {selectedSales.length === salesRecords.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                <button 
                  onClick={fetchSalesRecords}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  title="Refresh sales"
                  disabled={loading}
                >
                  <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="h-96 overflow-y-auto">
              {salesRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <FaDollarSign className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No sales recorded yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sales will appear here once recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesRecords.map(sale => {
                    const isSelected = selectedSales.includes(sale._id);
                    return (
                      <div 
                        key={sale._id} 
                        className={`p-4 rounded-lg border transition-colors duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-600'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleSalesSelection(sale._id)}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-gray-900 dark:text-white">{sale.productName}</span>
                          <span className={`font-semibold ${sale.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {sale.profit >= 0 ? '+' : ''}UGX {sale.profit?.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                          {sale.quantity} {sale.measurementUnit} • UGX {sale.sellingPrice?.toFixed(2)} each
                        </div>
                        <div className="text-gray-500 dark:text-gray-500 mt-1 text-sm">
                          {new Date(sale.saleDate).toLocaleDateString()} • {new Date(sale.saleDate).toLocaleTimeString()}
                        </div>
                        {sale.customerName && (
                          <div className="text-blue-600 dark:text-blue-400 mt-2 flex items-center text-sm">
                            <FaUser className="w-3 h-3 mr-1" />
                            {sale.customerName}
                          </div>
                        )}
                        {isSelected && (
                          <div className="text-blue-600 dark:text-blue-400 mt-2 flex items-center text-sm">
                            <FaReceipt className="w-3 h-3 mr-1" />
                            Selected for receipt
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DailySales;