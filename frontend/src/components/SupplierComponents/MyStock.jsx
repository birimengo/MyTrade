import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBox,
  FaFilter,
  FaDownload,
  FaDollarSign,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaRedo,
  FaChartLine,
  FaWarehouse,
  FaShoppingCart,
  FaIndustry,
  FaEye,
  FaEyeSlash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCalendarAlt,
  FaTag,
  FaCube,
  FaPercentage,
  FaMoneyBillWave,
  FaTruck,
  FaChartBar,
  FaMoneyBillAlt,
  FaStore,
  FaUser,
  FaShoppingBasket,
  FaReceipt,
  FaList,
  FaFileAlt,
  FaPrint,
  FaFileInvoiceDollar
} from 'react-icons/fa';

const MyStock = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categories, setCategories] = useState([]);
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    totalStockValue: 0,
    totalOriginalStockValue: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    averageProfitMargin: 0,
    totalItemsInStock: 0
  });
  const [salesStatistics, setSalesStatistics] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalItemsSold: 0,
    totalOrders: 0,
    averageOrderValue: 0
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');

  // Create Sale Form State
  const [saleForm, setSaleForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    saleDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: ''
  });
  const [selectedProductForSale, setSelectedProductForSale] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleSellingPrice, setSaleSellingPrice] = useState(0);
  const [creatingSale, setCreatingSale] = useState(false);

  // Sales History State
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);

  // Receipt State
  const [selectedSales, setSelectedSales] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [creatingReceipt, setCreatingReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);

  // Enhanced Sorting State
  const [salesSortBy, setSalesSortBy] = useState('saleDate');
  const [salesSortOrder, setSalesSortOrder] = useState('desc');
  const [receiptsSortBy, setReceiptsSortBy] = useState('receiptDate');
  const [receiptsSortOrder, setReceiptsSortOrder] = useState('desc');

  // Fetch data on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSalesStatistics();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-products', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setProducts(response.data.products);
        calculateStatistics(response.data.products);
      }
    } catch (error) {
      setError('Failed to fetch products: ' + error.message);
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-products/sales/statistics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSalesStatistics(response.data.statistics.sales);
        setStatistics(prev => ({
          ...prev,
          totalOriginalStockValue: response.data.statistics.stock.totalOriginalStockValue
        }));
      }
    } catch (error) {
      console.error('Error fetching sales statistics:', error);
    }
  };

  // Fetch Sales History with enhanced sorting
  const fetchSalesHistory = async () => {
    try {
      setSalesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-sales', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: salesDateFilter.startDate,
          endDate: salesDateFilter.endDate,
          customerName: salesSearchTerm,
          sortBy: salesSortBy,
          sortOrder: salesSortOrder,
          limit: 100
        }
      });

      if (response.data.success) {
        const sortedSales = response.data.sales.sort((a, b) => {
          if (salesSortBy === 'saleDate') {
            return salesSortOrder === 'desc' ? 
              new Date(b.saleDate) - new Date(a.saleDate) : 
              new Date(a.saleDate) - new Date(b.saleDate);
          }
          if (salesSortBy === 'totalAmount') {
            return salesSortOrder === 'desc' ? 
              b.totalAmount - a.totalAmount : 
              a.totalAmount - b.totalAmount;
          }
          if (salesSortBy === 'customerName') {
            return salesSortOrder === 'desc' ? 
              b.customerDetails.name.localeCompare(a.customerDetails.name) : 
              a.customerDetails.name.localeCompare(b.customerDetails.name);
          }
          return new Date(b.saleDate) - new Date(a.saleDate);
        });
        
        setSales(sortedSales);
        setSelectedSales([]);
      }
    } catch (error) {
      setError('Failed to fetch sales history: ' + error.message);
      console.error('Error fetching sales history:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  // UPDATED: Fetch Receipts with enhanced sorting and error handling
  const fetchReceipts = async () => {
    try {
      setReceiptsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-receipts', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          sortBy: receiptsSortBy,
          sortOrder: receiptsSortOrder,
          limit: 100
        }
      });

      if (response.data.success) {
        const sortedReceipts = response.data.receipts.sort((a, b) => {
          if (receiptsSortBy === 'receiptDate') {
            return receiptsSortOrder === 'desc' ? 
              new Date(b.receiptDate) - new Date(a.receiptDate) : 
              new Date(a.receiptDate) - new Date(b.receiptDate);
          }
          if (receiptsSortBy === 'totalAmount') {
            return receiptsSortOrder === 'desc' ? 
              b.totalAmount - a.totalAmount : 
              a.totalAmount - b.totalAmount;
          }
          if (receiptsSortBy === 'receiptNumber') {
            return receiptsSortOrder === 'desc' ? 
              b.receiptNumber.localeCompare(a.receiptNumber) : 
              a.receiptNumber.localeCompare(b.receiptNumber);
          }
          if (receiptsSortBy === 'status') {
            return receiptsSortOrder === 'desc' ? 
              b.status.localeCompare(a.status) : 
              a.status.localeCompare(b.status);
          }
          return new Date(b.receiptDate) - new Date(a.receiptDate);
        });
        
        setReceipts(sortedReceipts);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      if (error.response?.status !== 404) {
        setError('Failed to fetch receipts: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setReceiptsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/supplier-products/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const calculateStatistics = (products) => {
    const stats = {
      totalProducts: products.length,
      totalStockValue: 0,
      totalOriginalStockValue: 0,
      inStockCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      averageProfitMargin: 0,
      totalItemsInStock: 0
    };

    let totalProfitMargin = 0;
    let productsWithMargin = 0;

    products.forEach(product => {
      const stockValue = product.quantity * product.productionPrice;
      stats.totalStockValue += stockValue;
      stats.totalItemsInStock += product.quantity;

      if (product.quantity === 0) {
        stats.outOfStockCount++;
      } else if (product.quantity <= (product.lowStockThreshold || 10)) {
        stats.lowStockCount++;
      } else {
        stats.inStockCount++;
      }

      if (product.profitMargin !== undefined && product.profitMargin !== null) {
        totalProfitMargin += product.profitMargin;
        productsWithMargin++;
      }
    });

    stats.averageProfitMargin = productsWithMargin > 0 ? totalProfitMargin / productsWithMargin : 0;
    setStatistics(stats);
  };

  // Helper functions
  const getStockStatus = (quantity, lowStockThreshold = 10) => {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'out-of-stock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  const getStockStatusText = (status) => {
    switch (status) {
      case 'out-of-stock': return 'Out of Stock';
      case 'low-stock': return 'Low Stock';
      default: return 'In Stock';
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-gray-400 text-xs" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="text-blue-600 text-xs" /> : 
      <FaSortDown className="text-blue-600 text-xs" />;
  };

  // Receipt sorting functions
  const handleReceiptSort = (key) => {
    if (receiptsSortBy === key) {
      setReceiptsSortOrder(receiptsSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setReceiptsSortBy(key);
      setReceiptsSortOrder('desc');
    }
  };

  const getReceiptSortIcon = (key) => {
    if (receiptsSortBy !== key) return <FaSort className="text-gray-400 text-xs" />;
    return receiptsSortOrder === 'desc' ? 
      <FaSortDown className="text-blue-600 text-xs" /> : 
      <FaSortUp className="text-blue-600 text-xs" />;
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (sortConfig.key === 'name') {
      return sortConfig.direction === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortConfig.key === 'quantity') {
      return sortConfig.direction === 'asc' 
        ? a.quantity - b.quantity
        : b.quantity - a.quantity;
    }
    if (sortConfig.key === 'sellingPrice') {
      return sortConfig.direction === 'asc' 
        ? a.sellingPrice - b.sellingPrice
        : b.sellingPrice - a.sellingPrice;
    }
    if (sortConfig.key === 'profitMargin') {
      return sortConfig.direction === 'asc' 
        ? (a.profitMargin || 0) - (b.profitMargin || 0)
        : (b.profitMargin || 0) - (a.profitMargin || 0);
    }
    return 0;
  });

  const filteredProducts = sortedProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.productionStatus === filterStatus;
    const matchesLowStock = !showLowStockOnly || getStockStatus(product.quantity, product.lowStockThreshold) === 'low-stock';
    
    return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
  });

  // UPDATED: Check if sale is already in any receipt
  const isSaleInReceipt = (saleId) => {
    return receipts.some(receipt => 
      receipt.sales.some(sale => sale._id === saleId)
    );
  };

  // UPDATED: Handle sale selection with validation
  const handleSaleSelection = (saleId) => {
    if (isSaleInReceipt(saleId)) {
      setError('This sale is already included in a receipt and cannot be selected');
      return;
    }
    
    setSelectedSales(prev => {
      if (prev.includes(saleId)) {
        return prev.filter(id => id !== saleId);
      } else {
        return [...prev, saleId];
      }
    });
  };

  // UPDATED: Handle select all sales (only non-receipted ones)
  const handleSelectAllSales = () => {
    const availableSales = sales.filter(sale => !isSaleInReceipt(sale._id));
    
    if (selectedSales.length === availableSales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(availableSales.map(sale => sale._id));
    }
  };

  // UPDATED: Create Receipt function with pre-validation
  const createReceipt = async () => {
    if (selectedSales.length === 0) {
      setError('Please select at least one sale to create a receipt');
      return;
    }

    // Pre-validate: Check if any selected sales are already in receipts
    const alreadyReceiptedSales = selectedSales.filter(saleId => isSaleInReceipt(saleId));
    if (alreadyReceiptedSales.length > 0) {
      setError(`Cannot create receipt: ${alreadyReceiptedSales.length} selected sale(s) are already in existing receipts. Please refresh and try again.`);
      return;
    }

    setCreatingReceipt(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const receiptData = {
        saleIds: selectedSales,
        receiptDate: new Date().toISOString().split('T')[0],
        notes: `Receipt for ${selectedSales.length} sale(s)`,
        paymentMethod: 'cash'
      };

      console.log('Creating receipt with data:', receiptData);

      const response = await axios.post('http://localhost:5000/api/supplier-receipts', receiptData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSelectedSales([]);
        fetchReceipts();
        fetchSalesHistory();
        setError(null);
        alert('Receipt created successfully!');
      }
    } catch (error) {
      console.error('Error creating receipt:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.message) {
        setError('Failed to create receipt: ' + error.response.data.message);
      } else if (error.code === 'ERR_NETWORK') {
        setError('Network error: Cannot connect to server');
      } else {
        setError('Failed to create receipt: ' + error.message);
      }
    } finally {
      setCreatingReceipt(false);
    }
  };

  // NEW: Refresh sales and receipts data
  const refreshSalesData = () => {
    fetchSalesHistory();
    fetchReceipts();
    setSelectedSales([]);
    setError(null);
  };

  // Print receipt function
  const printReceipt = (receipt) => {
    const printWindow = window.open('', '_blank');
    
    const allItems = receipt.sales.flatMap(sale => 
      sale.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        date: sale.saleDate
      }))
    );

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt ${receipt.receiptNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            font-size: 14px;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
          }
          .receipt-info { 
            margin-bottom: 20px; 
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .sales-list { 
            margin: 20px 0; 
          }
          .sale-item { 
            border-bottom: 1px solid #ddd; 
            padding: 10px 0; 
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .totals { 
            margin-top: 20px; 
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
          }
          .no-print { display: none; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>OFFICIAL RECEIPT</h1>
          <h2>${receipt.receiptNumber}</h2>
        </div>
        
        <div class="receipt-info">
          <div>
            <p><strong>Receipt Date:</strong> ${formatDate(receipt.receiptDate)}</p>
            <p><strong>Total Sales Included:</strong> ${receipt.sales.length}</p>
          </div>
          <div>
            <p><strong>Payment Method:</strong> ${receipt.paymentMethod}</p>
            <p><strong>Status:</strong> ${receipt.status}</p>
          </div>
        </div>

        <div class="sales-list">
          <h3>Sales Summary:</h3>
          ${receipt.sales.map(sale => `
            <div class="sale-item">
              <p><strong>Sale:</strong> ${sale.saleNumber}</p>
              <p><strong>Customer:</strong> ${sale.customerDetails.name}</p>
              <p><strong>Date:</strong> ${formatDate(sale.saleDate)}</p>
              <p><strong>Amount:</strong> ${formatCurrency(sale.totalAmount)}</p>
            </div>
          `).join('')}
        </div>

        <div class="items-section">
          <h3>All Items:</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${allItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.totalPrice)}</td>
                  <td>${formatDate(item.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <p>Grand Total: ${formatCurrency(receipt.totalAmount)}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const viewReceiptDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetails(true);
  };

  const handleManualStockUpdate = async (productId, newQuantity) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/supplier-products/${productId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        fetchProducts();
      }
    } catch (error) {
      setError('Failed to update stock: ' + error.message);
      console.error('Error updating stock:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/supplier-products/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchProducts();
      } catch (error) {
        setError('Failed to delete product: ' + error.message);
        console.error('Error deleting product:', error);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Unit', 'Selling Price', 'Production Price', 'Profit/Unit', 'Total Potential Profit', 'Stock Status', 'Remaining Stock'];
    const csvData = filteredProducts.map(product => {
      const profitPerUnit = product.sellingPrice - product.productionPrice;
      const totalPotentialProfit = profitPerUnit * product.quantity;
      const stockStatus = getStockStatus(product.quantity, product.lowStockThreshold);
      
      return [
        product.name,
        product.sku || 'N/A',
        product.category,
        product.quantity,
        product.measurementUnit,
        `$${product.sellingPrice?.toFixed(2)}`,
        `$${product.productionPrice?.toFixed(2)}`,
        `$${profitPerUnit.toFixed(2)}`,
        `$${totalPotentialProfit.toFixed(2)}`,
        getStockStatusText(stockStatus),
        product.quantity
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportSalesToCSV = () => {
    const headers = ['Sale Number', 'Sale Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Total Amount', 'Total Profit', 'Items Count', 'Payment Method', 'Status'];
    const csvData = sales.map(sale => [
      sale.saleNumber,
      new Date(sale.saleDate).toLocaleDateString(),
      sale.customerDetails.name,
      sale.customerDetails.email || '',
      sale.customerDetails.phone || '',
      `$${sale.totalAmount?.toFixed(2)}`,
      `$${sale.totalProfit?.toFixed(2)}`,
      sale.items.length,
      sale.paymentMethod,
      sale.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewProductDetails = (product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const viewSaleDetails = (sale) => {
    setSelectedSale(sale);
    setShowSaleDetails(true);
  };

  // Sale Functions
  const handleProductSelect = (productId) => {
    setSelectedProductForSale(productId);
    const product = products.find(p => p._id === productId);
    if (product) {
      setSaleSellingPrice(product.sellingPrice);
      setSaleQuantity(1);
    }
  };

  const addProductToSale = () => {
    if (!selectedProductForSale) {
      setError('Please select a product');
      return;
    }

    const product = products.find(p => p._id === selectedProductForSale);
    if (!product) {
      setError('Product not found');
      return;
    }

    if (saleQuantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (saleQuantity > product.quantity) {
      setError(`Insufficient stock. Available: ${product.quantity}`);
      return;
    }

    if (saleSellingPrice <= 0) {
      setError('Selling price must be greater than 0');
      return;
    }

    const existingItemIndex = saleForm.items.findIndex(item => item.productId === selectedProductForSale);
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...saleForm.items];
      updatedItems[existingItemIndex].quantity += saleQuantity;
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * saleSellingPrice;
      updatedItems[existingItemIndex].profit = (saleSellingPrice - product.productionPrice) * updatedItems[existingItemIndex].quantity;
      setSaleForm(prev => ({ ...prev, items: updatedItems }));
    } else {
      const newItem = {
        productId: selectedProductForSale,
        productName: product.name,
        quantity: saleQuantity,
        unitPrice: saleSellingPrice,
        productionPrice: product.productionPrice,
        totalPrice: saleQuantity * saleSellingPrice,
        profit: (saleSellingPrice - product.productionPrice) * saleQuantity
      };
      setSaleForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }

    setSelectedProductForSale('');
    setSaleQuantity(1);
    setSaleSellingPrice(0);
  };

  const removeProductFromSale = (index) => {
    const updatedItems = saleForm.items.filter((_, i) => i !== index);
    setSaleForm(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateSaleTotal = () => {
    return saleForm.items.reduce((total, item) => total + item.totalPrice, 0);
  };

  const calculateSaleProfit = () => {
    return saleForm.items.reduce((total, item) => total + item.profit, 0);
  };

  const createSale = async () => {
    if (saleForm.items.length === 0) {
      setError('Please add at least one product to the sale');
      return;
    }

    setCreatingSale(true);
    try {
      const token = localStorage.getItem('token');
      const saleData = {
        customerDetails: {
          name: saleForm.customerName || 'Walk-in Customer',
          email: saleForm.customerEmail,
          phone: saleForm.customerPhone,
          address: saleForm.customerAddress
        },
        items: saleForm.items,
        saleDate: saleForm.saleDate,
        notes: saleForm.notes,
        totalAmount: calculateSaleTotal(),
        totalProfit: calculateSaleProfit()
      };

      const response = await axios.post('http://localhost:5000/api/supplier-sales', saleData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const newSale = response.data.sale;
        setSales(prev => [newSale, ...prev]);
        
        setSaleForm({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerAddress: '',
          saleDate: new Date().toISOString().split('T')[0],
          items: [],
          notes: ''
        });
        
        fetchProducts();
        fetchSalesStatistics();
        
        setError(null);
        alert('Sale recorded successfully!');
      }
    } catch (error) {
      setError('Failed to create sale: ' + error.message);
      console.error('Error creating sale:', error);
    } finally {
      setCreatingSale(false);
    }
  };

  const calculateProductProfit = (product) => {
    const profitPerUnit = product.sellingPrice - product.productionPrice;
    const totalPotentialProfit = profitPerUnit * product.quantity;
    return {
      profitPerUnit,
      totalPotentialProfit,
      profitMargin: product.profitMargin || 0
    };
  };

  const getProfitColor = (profit) => {
    if (profit > 0) return 'text-green-600 dark:text-green-400';
    if (profit < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading State
  if (loading && activeTab === 'stock') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Statistics Cards
  const renderStatisticsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <FaWarehouse className="text-blue-600 dark:text-blue-400 text-xs" />
          </div>
          <div className="ml-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Stock Value</p>
            <p className="text-xs font-bold dark:text-white">${statistics.totalStockValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <FaMoneyBillAlt className="text-green-600 dark:text-green-400 text-xs" />
          </div>
          <div className="ml-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total Sales</p>
            <p className="text-xs font-bold dark:text-white">${salesStatistics.totalSales.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <FaChartLine className="text-purple-600 dark:text-purple-400 text-xs" />
          </div>
          <div className="ml-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total Profit</p>
            <p className={`text-xs font-bold ${getProfitColor(salesStatistics.totalProfit)}`}>
              ${salesStatistics.totalProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center">
          <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
            <FaBox className="text-orange-600 dark:text-orange-400 text-xs" />
          </div>
          <div className="ml-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Stock Status</p>
            <p className="text-xs font-bold dark:text-white">{statistics.totalItemsInStock} Items</p>
            <p className="text-[10px] text-gray-400">
              {statistics.inStockCount} In Stock, {statistics.lowStockCount} Low, {statistics.outOfStockCount} Out
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Product Row
  const renderProductRow = (product) => {
    const stockStatus = getStockStatus(product.quantity, product.lowStockThreshold);
    const profitInfo = calculateProductProfit(product);

    return (
      <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 text-[11px]">
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-[11px] truncate max-w-[120px]">{product.name}</div>
            <div className="text-gray-500 dark:text-gray-400 text-[10px]">{product.sku || 'No SKU'}</div>
          </div>
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {product.category}
          </span>
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div className="text-gray-900 dark:text-white text-[11px] font-medium">
            {product.quantity} {product.measurementUnit}
          </div>
          {product.lowStockThreshold && (
            <div className="text-gray-500 dark:text-gray-400 text-[10px]">
              Threshold: {product.lowStockThreshold}
            </div>
          )}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap text-gray-900 dark:text-white text-[11px] font-medium">
          ${product.sellingPrice?.toFixed(2)}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap text-gray-900 dark:text-white text-[11px]">
          ${product.productionPrice?.toFixed(2)}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div className={`font-semibold text-[11px] ${getProfitColor(profitInfo.profitPerUnit)}`}>
            ${profitInfo.profitPerUnit.toFixed(2)}
          </div>
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${getStockStatusColor(stockStatus)}`}>
              {getStockStatusText(stockStatus)}
            </span>
            <div className="text-[9px] text-gray-500 dark:text-gray-400">
              {product.quantity} remaining
            </div>
          </div>
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap text-[11px] font-medium">
          <div className="flex space-x-1">
            <button
              onClick={() => viewProductDetails(product)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
              title="View Details"
            >
              <FaEye className="text-[10px]" />
            </button>
            <button
              onClick={() => handleManualStockUpdate(product._id, product.quantity + 1)}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30"
              title="Add Stock"
            >
              <FaPlus className="text-[10px]" />
            </button>
            <button
              onClick={() => handleDeleteProduct(product._id)}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
              title="Delete Product"
            >
              <FaTrash className="text-[10px]" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // UPDATED: Sale Card Component with receipt status
  const renderSaleCard = (sale) => {
    const totalItemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const isSelected = selectedSales.includes(sale._id);
    const isAlreadyReceipted = isSaleInReceipt(sale._id);
    const saleDate = new Date(sale.saleDate);
    const now = new Date();
    const diffTime = Math.abs(now - saleDate);
    const diffHours = diffTime / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isNewSale = diffHours < 24;
    
    let timeAgo = '';
    if (diffHours < 1) {
      timeAgo = 'Just now';
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      timeAgo = 'Yesterday';
    } else if (diffDays < 7) {
      timeAgo = `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = formatDate(sale.saleDate);
    }

    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 hover:shadow-md relative ${
          isSelected 
            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20' 
            : isAlreadyReceipted
            ? 'border-gray-300 dark:border-gray-600 opacity-70'
            : 'border-gray-200 dark:border-gray-700'
        } ${isNewSale && !isAlreadyReceipted ? 'ring-1 ring-green-500/20' : ''}`}
      >
        {isNewSale && !isAlreadyReceipted && (
          <div className="absolute -top-2 -right-2">
            <span className="bg-green-500 text-white text-[8px] font-bold px-2 py-1 rounded-full shadow-sm">
              NEW
            </span>
          </div>
        )}

        {isAlreadyReceipted && (
          <div className="absolute -top-2 -right-2">
            <span className="bg-purple-500 text-white text-[8px] font-bold px-2 py-1 rounded-full shadow-sm">
              RECEIPTED
            </span>
          </div>
        )}

        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSaleSelection(sale._id)}
                disabled={isAlreadyReceipted}
                className={`h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                  isAlreadyReceipted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <div>
                <h4 className={`font-semibold text-[11px] ${
                  isAlreadyReceipted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {sale.saleNumber}
                </h4>
                <p className={`text-[10px] flex items-center gap-1 ${
                  isNewSale && !isAlreadyReceipted 
                    ? 'text-green-600 dark:text-green-400 font-medium' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <FaCalendarAlt className="text-[8px]" />
                  {timeAgo}
                </p>
              </div>
            </div>
            <span className="inline-flex px-2 py-1 rounded text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              {sale.status}
            </span>
          </div>

          <div className="mb-2">
            <p className={`font-medium text-[11px] ${
              isAlreadyReceipted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
            }`}>
              {sale.customerDetails.name}
            </p>
            {sale.customerDetails.email && (
              <p className="text-gray-600 dark:text-gray-400 text-[10px] truncate">
                {sale.customerDetails.email}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500 dark:text-gray-400">Payment:</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {sale.paymentMethod}
            </span>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2 text-[10px]">
              <span className="text-gray-500 dark:text-gray-400">Items ({totalItemsCount})</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {sale.items.length} product(s)
              </span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {sale.items.slice(0, 3).map((item, index) => (
                <div key={`${sale._id}-item-${index}`} className="flex justify-between text-[10px]">
                  <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                    {item.productName}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                    {item.quantity} × ${item.unitPrice.toFixed(2)}
                  </span>
                </div>
              ))}
              {sale.items.length > 3 && (
                <div className="text-center text-[10px] text-gray-500 dark:text-gray-400 pt-1">
                  +{sale.items.length - 3} more items
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600 dark:text-gray-400">Profit:</span>
              <span className={`font-semibold ${getProfitColor(sale.totalProfit)}`}>
                {formatCurrency(sale.totalProfit)}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-lg">
          <div className="flex justify-between items-center">
            <button
              onClick={() => viewSaleDetails(sale)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-[10px] font-medium flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
            >
              <FaEye className="text-[9px]" />
              Details
            </button>
            
            <div className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <FaCalendarAlt className="text-[8px]" />
              {formatDate(sale.saleDate)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // UPDATED: Receipt Card Component
  const renderReceiptCard = (receipt) => {
    const allItemNames = receipt.sales.flatMap(sale => 
      sale.items.map(item => item.productName)
    );
    const uniqueItemNames = [...new Set(allItemNames)];
    const displayItems = uniqueItemNames.slice(0, 2);
    const totalItemsCount = allItemNames.length;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-[11px]">
                {receipt.receiptNumber}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-[10px]">
                {formatDate(receipt.receiptDate)}
              </p>
            </div>
            <span className="inline-flex px-2 py-1 rounded text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              {receipt.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Sales:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {receipt.sales.length} included
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Items:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {totalItemsCount} total
              </p>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white text-[11px] mb-2">Items Summary</h4>
            <div className="space-y-1 max-h-16 overflow-y-auto">
              {displayItems.map((itemName, index) => (
                <div key={index} className="flex justify-between text-[10px]">
                  <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                    {itemName}
                  </span>
                </div>
              ))}
              {uniqueItemNames.length > 2 && (
                <div className="text-center text-[10px] text-gray-500 dark:text-gray-400 pt-1">
                  +{uniqueItemNames.length - 2} more items
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(receipt.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600 dark:text-gray-400">Total Profit:</span>
              <span className={`font-semibold ${getProfitColor(receipt.totalProfit)}`}>
                {formatCurrency(receipt.totalProfit)}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-lg">
          <div className="flex justify-between items-center">
            <button
              onClick={() => viewReceiptDetails(receipt)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-[10px] font-medium flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
            >
              <FaEye className="text-[9px]" />
              Details
            </button>
            
            <button
              onClick={() => printReceipt(receipt)}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-[10px] font-medium flex items-center gap-1 hover:bg-green-50 dark:hover:bg-green-900/30 px-2 py-1 rounded transition-colors"
            >
              <FaPrint className="text-[9px]" />
              Print
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Create Sale Tab
  const renderCreateSaleTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 p-2 max-h-[50vh] overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
        <FaReceipt className="text-xs" />
        Create New Sale
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white text-xs">Customer Details (Optional)</h4>
          
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
            <input
              type="text"
              value={saleForm.customerName}
              onChange={(e) => setSaleForm(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Walk-in Customer"
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={saleForm.customerEmail}
                onChange={(e) => setSaleForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="customer@example.com"
                className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={saleForm.customerPhone}
                onChange={(e) => setSaleForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="+1234567890"
                className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Sale Date</label>
            <input
              type="date"
              value={saleForm.saleDate}
              onChange={(e) => setSaleForm(prev => ({ ...prev, saleDate: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white text-xs">Add Products</h4>
          
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Select Product</label>
            <select
              value={selectedProductForSale}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
            >
              <option value="">Choose a product...</option>
              {products.filter(p => p.quantity > 0).map(product => (
                <option key={product._id} value={product._id}>
                  {product.name} - {product.quantity} in stock - ${product.sellingPrice}
                </option>
              ))}
            </select>
          </div>

          {selectedProductForSale && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={products.find(p => p._id === selectedProductForSale)?.quantity || 1}
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={saleSellingPrice}
                    onChange={(e) => setSaleSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
                  />
                </div>
              </div>

              {selectedProductForSale && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded text-[11px]">
                  <p className="text-blue-800 dark:text-blue-300">
                    Cost: ${products.find(p => p._id === selectedProductForSale)?.productionPrice?.toFixed(2)} | 
                    Profit: ${((saleSellingPrice - (products.find(p => p._id === selectedProductForSale)?.productionPrice || 0)) * saleQuantity).toFixed(2)}
                  </p>
                </div>
              )}

              <button
                onClick={addProductToSale}
                className="w-full bg-green-600 text-white py-1.5 px-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-[11px] font-medium"
              >
                <FaPlus className="text-[10px]" />
                Add to Sale
              </button>
            </>
          )}
        </div>
      </div>

      {saleForm.items.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-gray-900 dark:text-white text-xs mb-2">Sale Items</h4>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600">
            {saleForm.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-600 last:border-b-0 text-[11px]">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {item.quantity} × ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">${item.totalPrice.toFixed(2)}</span>
                  <button
                    onClick={() => removeProductFromSale(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    <FaTrash className="text-[10px]" />
                  </button>
                </div>
              </div>
            ))}
            
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between font-semibold text-[11px]">
                <span>Total:</span>
                <span>${calculateSaleTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Profit:</span>
                <span className={getProfitColor(calculateSaleProfit())}>
                  ${calculateSaleProfit().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Sale Notes</label>
            <textarea
              value={saleForm.notes}
              onChange={(e) => setSaleForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this sale..."
              rows="2"
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
            />
          </div>

          <button
            onClick={createSale}
            disabled={creatingSale}
            className="w-full mt-2 bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-[11px] font-semibold"
          >
            {creatingSale ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <FaReceipt className="text-[10px]" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Sales Analytics Tab
  const renderSalesAnalyticsTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 p-3 max-h-[60vh] overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
        <FaChartBar className="text-xs" />
        Sales Analytics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
          <h4 className="font-medium text-gray-900 dark:text-white text-xs mb-2">Sales Summary</h4>
          <dl className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Total Orders:</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{salesStatistics.totalOrders}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Items Sold:</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{salesStatistics.totalItemsSold}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Total Revenue:</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">${salesStatistics.totalSales.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Total Profit:</dt>
              <dd className={`font-semibold ${getProfitColor(salesStatistics.totalProfit)}`}>
                ${salesStatistics.totalProfit.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Avg Order Value:</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">${salesStatistics.averageOrderValue.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
          <h4 className="font-medium text-gray-900 dark:text-white text-xs mb-2">Stock Analysis</h4>
          <dl className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Total Products:</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{statistics.totalProducts}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Total Items in Stock:</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{statistics.totalItemsInStock}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">In Stock:</dt>
              <dd className="font-semibold text-green-600 dark:text-green-400">{statistics.inStockCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Low Stock:</dt>
              <dd className="font-semibold text-yellow-600 dark:text-yellow-400">{statistics.lowStockCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Out of Stock:</dt>
              <dd className="font-semibold text-red-600 dark:text-red-400">{statistics.outOfStockCount}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Detailed analytics and charts coming soon...
        </p>
      </div>
    </div>
  );

  // Sales History Tab
  const renderSalesHistoryTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <FaList className="text-xs" />
            Sales History
            {sales.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full">
                {sales.length} total
              </span>
            )}
          </h3>

          <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[140px]">
                <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={salesSearchTerm}
                  onChange={(e) => setSalesSearchTerm(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
                />
              </div>

              <button
                onClick={fetchSalesHistory}
                className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors text-[11px] font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <FaSearch className="text-[10px]" />
                Search
              </button>
            </div>

            <div className="flex gap-2 w-full lg:w-auto justify-end lg:justify-start">
              <button
                onClick={exportSalesToCSV}
                className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors text-[11px] font-medium flex items-center gap-1 whitespace-nowrap flex-1 lg:flex-none justify-center"
              >
                <FaDownload className="text-[10px]" />
                Export
              </button>

              <button
                onClick={createReceipt}
                disabled={selectedSales.length === 0 || creatingReceipt}
                className="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-medium flex items-center gap-1 whitespace-nowrap flex-1 lg:flex-none justify-center"
              >
                {creatingReceipt ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <FaFileInvoiceDollar className="text-[10px]" />
                    Receipt ({selectedSales.length})
                  </>
                )}
              </button>

              <button
                onClick={refreshSalesData}
                className="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors text-[11px] font-medium flex items-center gap-1 whitespace-nowrap flex-1 lg:flex-none justify-center"
              >
                <FaRedo className="text-[10px]" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {selectedSales.length > 0 && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                {selectedSales.length} sale(s) selected for receipt
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllSales}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-[10px] font-medium"
                >
                  {selectedSales.length === sales.filter(s => !isSaleInReceipt(s._id)).length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={() => setSelectedSales([])}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-[10px] font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={salesDateFilter.startDate}
              onChange={(e) => setSalesDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={salesDateFilter.endDate}
              onChange={(e) => setSalesDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={fetchSalesHistory}
              className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors text-[11px] font-medium"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setSalesDateFilter({ startDate: '', endDate: '' });
                setSalesSearchTerm('');
                fetchSalesHistory();
              }}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-[11px] font-medium"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px]">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Sort by:</span>
          <select
            value={salesSortBy}
            onChange={(e) => setSalesSortBy(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 text-[11px]"
          >
            <option value="saleDate">Sale Date (Newest First)</option>
            <option value="totalAmount">Total Amount (High to Low)</option>
            <option value="customerName">Customer Name</option>
          </select>
          <button
            onClick={() => setSalesSortOrder(salesSortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            title={salesSortOrder === 'desc' ? 'Descending' : 'Ascending'}
          >
            {salesSortOrder === 'desc' ? <FaSortDown className="text-[10px]" /> : <FaSortUp className="text-[10px]" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-3">
          {salesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400 text-[11px]">Loading sales...</span>
            </div>
          ) : sales.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const newSales = sales.filter(sale => {
                  const saleDate = new Date(sale.saleDate);
                  const now = new Date();
                  const diffTime = now - saleDate;
                  const diffHours = diffTime / (1000 * 60 * 60);
                  return diffHours < 24;
                });
                
                return newSales.length > 0 ? (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <h4 className="text-xs font-semibold text-green-700 dark:text-green-400">New Sales (Last 24 Hours)</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {newSales.map(sale => (
                        <div key={sale._id}>
                          {renderSaleCard(sale)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">All Sales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sales
                    .filter(sale => {
                      const saleDate = new Date(sale.saleDate);
                      const now = new Date();
                      const diffTime = now - saleDate;
                      const diffHours = diffTime / (1000 * 60 * 60);
                      return diffHours >= 24;
                    })
                    .map(sale => (
                      <div key={sale._id}>
                        {renderSaleCard(sale)}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-[11px]">
              <FaFileAlt className="mx-auto text-3xl mb-3 text-gray-400" />
              No sales found
              {salesSearchTerm || salesDateFilter.startDate || salesDateFilter.endDate ? (
                <p className="text-[10px] mt-1">Try adjusting your search criteria</p>
              ) : (
                <p className="text-[10px] mt-1">Create your first sale to see it here</p>
              )}
              <button
                onClick={() => setActiveTab('create-sale')}
                className="mt-3 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors text-[11px] font-medium flex items-center gap-1 mx-auto"
              >
                <FaPlus className="text-[10px]" />
                Create First Sale
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // UPDATED: Receipts Tab Component with Cards
  const renderReceiptsTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <FaFileInvoiceDollar className="text-xs" />
            Receipts
            {receipts.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full">
                {receipts.length} total
              </span>
            )}
          </h3>

          <div className="flex gap-2 w-full lg:w-auto">
            <button
              onClick={fetchReceipts}
              className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors text-[11px] font-medium flex items-center gap-1 whitespace-nowrap flex-1 lg:flex-none justify-center"
            >
              <FaRedo className="text-[10px]" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px]">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Sort by:</span>
          <select
            value={receiptsSortBy}
            onChange={(e) => handleReceiptSort(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 text-[11px]"
          >
            <option value="receiptDate">Receipt Date (Newest First)</option>
            <option value="totalAmount">Total Amount (High to Low)</option>
            <option value="receiptNumber">Receipt Number</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setReceiptsSortOrder(receiptsSortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            title={receiptsSortOrder === 'desc' ? 'Descending' : 'Ascending'}
          >
            {receiptsSortOrder === 'desc' ? <FaSortDown className="text-[10px]" /> : <FaSortUp className="text-[10px]" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-3">
          {receiptsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400 text-[11px]">Loading receipts...</span>
            </div>
          ) : receipts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {receipts.map(receipt => (
                <div key={receipt._id}>
                  {renderReceiptCard(receipt)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-[11px]">
              <FaFileInvoiceDollar className="mx-auto text-3xl mb-3 text-gray-400" />
              No receipts found
              <p className="text-[10px] mt-1">Receipts will appear here after you create them from sales</p>
              <button
                onClick={() => setActiveTab('sales-history')}
                className="mt-3 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors text-[11px] font-medium flex items-center gap-1 mx-auto"
              >
                <FaList className="text-[10px]" />
                Go to Sales History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Product Details Modal
  const renderProductDetailsModal = () => {
    if (!showProductDetails || !selectedProduct) return null;

    const profitInfo = calculateProductProfit(selectedProduct);
    const stockStatus = getStockStatus(selectedProduct.quantity, selectedProduct.lowStockThreshold);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Product Details</h3>
              <button
                onClick={() => setShowProductDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-[11px]">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Basic Information</h4>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="text-gray-900 dark:text-white text-right">{selectedProduct.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">SKU</dt>
                    <dd className="text-gray-900 dark:text-white text-right">{selectedProduct.sku || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Category</dt>
                    <dd className="text-gray-900 dark:text-white text-right">{selectedProduct.category}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Stock Information</h4>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Current Stock</dt>
                    <dd className="text-gray-900 dark:text-white font-semibold">
                      {selectedProduct.quantity} {selectedProduct.measurementUnit}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Low Stock Threshold</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedProduct.lowStockThreshold || 10}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Stock Status</dt>
                    <dd className="text-gray-900 dark:text-white">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${getStockStatusColor(stockStatus)}`}>
                        {getStockStatusText(stockStatus)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Profit Analysis</h4>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Profit per Unit</dt>
                    <dd className={`font-semibold ${getProfitColor(profitInfo.profitPerUnit)}`}>
                      ${profitInfo.profitPerUnit.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Total Potential Profit</dt>
                    <dd className={`font-semibold ${getProfitColor(profitInfo.totalPotentialProfit)}`}>
                      ${profitInfo.totalPotentialProfit.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Profit Margin</dt>
                    <dd className="text-gray-900 dark:text-white font-semibold">{profitInfo.profitMargin.toFixed(1)}%</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Pricing</h4>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Selling Price</dt>
                    <dd className="text-gray-900 dark:text-white font-semibold">${selectedProduct.sellingPrice?.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Production Price</dt>
                    <dd className="text-gray-900 dark:text-white">${selectedProduct.productionPrice?.toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowProductDetails(false)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-[11px] font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Sale Details Modal
  const renderSaleDetailsModal = () => {
    if (!showSaleDetails || !selectedSale) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sale Details</h3>
              <button
                onClick={() => setShowSaleDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-[11px]">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Sale Information</h4>
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Sale Number</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedSale.saleNumber}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Sale Date</dt>
                    <dd className="text-gray-900 dark:text-white">{formatDate(selectedSale.saleDate)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="text-gray-900 dark:text-white">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {selectedSale.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Payment Method</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedSale.paymentMethod}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Customer Information</h4>
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedSale.customerDetails.name}</dd>
                  </div>
                  {selectedSale.customerDetails.email && (
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Email</dt>
                      <dd className="text-gray-900 dark:text-white">{selectedSale.customerDetails.email}</dd>
                    </div>
                  )}
                  {selectedSale.customerDetails.phone && (
                    <div className="flex justify-between">
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                      <dd className="text-gray-900 dark:text-white">{selectedSale.customerDetails.phone}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Sale Items</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                  {selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.totalPrice)}</p>
                        <p className={`text-[10px] ${getProfitColor(item.profit)}`}>
                          Profit: {formatCurrency(item.profit)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Total Profit:</span>
                  <span className={getProfitColor(selectedSale.totalProfit)}>
                    {formatCurrency(selectedSale.totalProfit)}
                  </span>
                </div>
              </div>

              {selectedSale.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Notes</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2">
                    {selectedSale.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSaleDetails(false)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-[11px] font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Receipt Details Modal
  const renderReceiptDetailsModal = () => {
    if (!showReceiptDetails || !selectedReceipt) return null;

    const allItems = selectedReceipt.sales.flatMap(sale => 
      sale.items.map(item => ({
        ...item,
        saleNumber: sale.saleNumber,
        saleDate: sale.saleDate,
        customerName: sale.customerDetails.name
      }))
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Receipt Details</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => printReceipt(selectedReceipt)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[11px] font-medium flex items-center gap-1"
                >
                  <FaPrint className="text-[10px]" />
                  Print
                </button>
                <button
                  onClick={() => setShowReceiptDetails(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 text-[11px]">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Receipt Information</h4>
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Receipt Number</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedReceipt.receiptNumber}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Receipt Date</dt>
                    <dd className="text-gray-900 dark:text-white">{formatDate(selectedReceipt.receiptDate)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Total Sales</dt>
                    <dd className="text-gray-900 dark:text-white">{selectedReceipt.sales.length}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="text-gray-900 dark:text-white">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {selectedReceipt.status}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">All Items ({allItems.length})</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 max-h-64 overflow-y-auto">
                  <table className="min-w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-1 font-medium">Item Name</th>
                        <th className="text-left py-1 font-medium">Qty</th>
                        <th className="text-left py-1 font-medium">Price</th>
                        <th className="text-left py-1 font-medium">Total</th>
                        <th className="text-left py-1 font-medium">Sale</th>
                        <th className="text-left py-1 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                          <td className="py-1">{item.productName}</td>
                          <td className="py-1">{item.quantity}</td>
                          <td className="py-1">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-1">{formatCurrency(item.totalPrice)}</td>
                          <td className="py-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {item.saleNumber}
                          </td>
                          <td className="py-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {formatDate(item.saleDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Sales Summary</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                  {selectedReceipt.sales.map((sale, index) => (
                    <div key={index} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{sale.saleNumber}</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {sale.customerDetails.name} - {formatDate(sale.saleDate)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-[10px]">
                          {sale.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.totalAmount)}</p>
                        <p className={`text-[10px] ${getProfitColor(sale.totalProfit)}`}>
                          Profit: {formatCurrency(sale.totalProfit)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedReceipt.totalAmount)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Total Profit:</span>
                  <span className={getProfitColor(selectedReceipt.totalProfit)}>
                    {formatCurrency(selectedReceipt.totalProfit)}
                  </span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs">Notes</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2">
                    {selectedReceipt.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowReceiptDetails(false)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-[11px] font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 flex flex-col">
      {error && (
        <div className="mb-2 bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FaExclamationTriangle className="text-[10px]" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-800 hover:text-red-900 text-sm">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3">
        <div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white">My Stock & Sales</h1>
          <p className="text-gray-600 dark:text-gray-400 text-[11px]">Manage inventory and track sales</p>
        </div>
        <div className="flex gap-1.5 mt-2 lg:mt-0">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-[11px] font-medium"
          >
            <FaDownload className="text-[10px]" />
            Export Stock
          </button>
          <button
            onClick={() => {
              fetchProducts();
              fetchSalesStatistics();
              if (activeTab === 'sales-history') {
                fetchSalesHistory();
              }
              if (activeTab === 'receipts') {
                fetchReceipts();
              }
            }}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[11px] font-medium"
          >
            <FaRedo className="text-[10px]" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-3 border border-gray-100 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 min-w-0 py-2 px-3 text-center font-medium text-[11px] ${
              activeTab === 'stock'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaBox className="inline mr-1 text-[10px]" />
            Stock
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 min-w-0 py-2 px-3 text-center font-medium text-[11px] ${
              activeTab === 'sales'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaChartBar className="inline mr-1 text-[10px]" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('create-sale')}
            className={`flex-1 min-w-0 py-2 px-3 text-center font-medium text-[11px] ${
              activeTab === 'create-sale'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaReceipt className="inline mr-1 text-[10px]" />
            Create Sale
          </button>
          <button
            onClick={() => {
              setActiveTab('sales-history');
              fetchSalesHistory();
            }}
            className={`flex-1 min-w-0 py-2 px-3 text-center font-medium text-[11px] ${
              activeTab === 'sales-history'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaList className="inline mr-1 text-[10px]" />
            Sales History
          </button>
          <button
            onClick={() => {
              setActiveTab('receipts');
              fetchReceipts();
            }}
            className={`flex-1 min-w-0 py-2 px-3 text-center font-medium text-[11px] ${
              activeTab === 'receipts'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaFileInvoiceDollar className="inline mr-1 text-[10px]" />
            Receipts
          </button>
        </div>
      </div>

      {activeTab !== 'sales-history' && activeTab !== 'receipts' && renderStatisticsCards()}

      <div className="flex-1 overflow-hidden">
        {activeTab === 'stock' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 mb-2 border border-gray-100 dark:border-gray-700">
              <div className="flex flex-col lg:flex-row gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-[10px]" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px]"
                    />
                  </div>
                </div>
                
                <div className="flex gap-1.5">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px] min-w-[120px]"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>{category}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px] min-w-[100px]"
                  >
                    <option value="all">All Status</option>
                    <option value="ready">Ready</option>
                    <option value="in_production">In Production</option>
                    <option value="discontinued">Discontinued</option>
                  </select>

                  <label className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded cursor-pointer text-[11px] hover:bg-gray-200 dark:hover:bg-gray-600">
                    <input
                      type="checkbox"
                      checked={showLowStockOnly}
                      onChange={(e) => setShowLowStockOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-90"
                    />
                    <FaExclamationTriangle className="text-yellow-600 text-[10px]" />
                    <span className="text-gray-700 dark:text-gray-300">Low Stock</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700 h-full flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th 
                        className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Product
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th 
                        className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('quantity')}
                      >
                        <div className="flex items-center gap-1">
                          Stock Qty
                          {getSortIcon('quantity')}
                        </div>
                      </th>
                      <th 
                        className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('sellingPrice')}
                      >
                        <div className="flex items-center gap-1">
                          Price
                          {getSortIcon('sellingPrice')}
                        </div>
                      </th>
                      <th className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Stock Status
                      </th>
                      <th className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredProducts.map(renderProductRow)}
                  </tbody>
                </table>
                
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8">
                    <FaBox className="mx-auto text-2xl text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-[11px]">No stock items found</p>
                    {(searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || showLowStockOnly) && (
                      <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">
                        Try adjusting your search or filters
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'sales' && renderSalesAnalyticsTab()}

        {activeTab === 'create-sale' && renderCreateSaleTab()}

        {activeTab === 'sales-history' && renderSalesHistoryTab()}

        {activeTab === 'receipts' && renderReceiptsTab()}
      </div>

      {renderProductDetailsModal()}
      {renderSaleDetailsModal()}
      {renderReceiptDetailsModal()}
    </div>
  );
};

export default MyStock;