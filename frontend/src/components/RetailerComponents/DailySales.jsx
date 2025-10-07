import React, { Component } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSearch, FaSync, FaDollarSign, FaBox, FaUser, FaPhone, FaShoppingCart, FaExclamationTriangle, FaReceipt, FaPrint, FaSave } from 'react-icons/fa';

class DailySales extends Component {
  constructor(props) {
    super(props);
    this.state = {
      products: [],
      filteredProducts: [],
      selectedProduct: null,
      saleQuantity: '',
      sellingPrice: '',
      customerName: '',
      customerPhone: '',
      salesRecords: [],
      searchQuery: '',
      loading: false,
      stockType: 'all',
      lowStockAlerts: [],
      showLowStockPanel: false,
      selectedSales: [],
      showReceiptPanel: false,
      receiptCustomerName: '',
      receiptCustomerPhone: '',
      receiptNumber: Math.floor(100000 + Math.random() * 900000),
      savingReceipt: false,
      isMobile: window.innerWidth < 768 // NEW: Mobile detection state
    };
  }

  componentDidMount() {
    this.fetchProducts();
    this.fetchSalesRecords();
    this.fetchLowStockAlerts();
    
    // NEW: Add resize listener for responsive behavior
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    // NEW: Cleanup resize listener
    window.removeEventListener('resize', this.handleResize);
  }

  // NEW: Handle window resize for responsive behavior
  handleResize = () => {
    this.setState({ isMobile: window.innerWidth < 768 });
  };

  // Helper function to handle API requests
  apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  fetchProducts = async () => {
    try {
      this.setState({ loading: true });
      
      const [retailerData, systemData] = await Promise.all([
        this.apiRequest('http://localhost:5000/api/retailer-stocks'),
        this.apiRequest('http://localhost:5000/api/system-stocks')
      ]);

      const allProducts = [
        ...retailerData.stocks.map(stock => ({ ...stock, stockType: 'retailer' })),
        ...systemData.stocks.map(stock => ({ ...stock, stockType: 'system' }))
      ];

      this.setState({
        products: allProducts,
        filteredProducts: allProducts,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      this.setState({ loading: false });
    }
  };

  fetchSalesRecords = async () => {
    try {
      const data = await this.apiRequest('http://localhost:5000/api/retailer-sales');
      this.setState({ 
        salesRecords: data.sales,
        selectedSales: [] // Reset selected sales when refreshing
      });
    } catch (error) {
      console.error('Error fetching sales records:', error);
      toast.error('Failed to load sales records');
    }
  };

  fetchLowStockAlerts = async () => {
    try {
      const data = await this.apiRequest('http://localhost:5000/api/retailer-sales/low-stock-alerts');
      this.setState({ lowStockAlerts: data.lowStockItems });
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
    }
  };

  handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    this.setState({ searchQuery: query });
    
    const { products, stockType } = this.state;
    
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
    
    this.setState({ filteredProducts: filtered });
  };

  handleStockTypeChange = (e) => {
    this.setState({ stockType: e.target.value }, () => {
      this.handleSearch({ target: { value: this.state.searchQuery } });
    });
  };

  toggleLowStockPanel = () => {
    this.setState(prevState => ({ 
      showLowStockPanel: !prevState.showLowStockPanel 
    }));
  };

  toggleReceiptPanel = () => {
    this.setState(prevState => ({ 
      showReceiptPanel: !prevState.showReceiptPanel,
      selectedSales: prevState.showReceiptPanel ? [] : prevState.selectedSales,
      receiptNumber: Math.floor(100000 + Math.random() * 900000) // Generate new receipt number
    }));
  };

  handleSalesSelection = (saleId) => {
    this.setState(prevState => {
      const isSelected = prevState.selectedSales.includes(saleId);
      if (isSelected) {
        return {
          selectedSales: prevState.selectedSales.filter(id => id !== saleId)
        };
      } else {
        return {
          selectedSales: [...prevState.selectedSales, saleId]
        };
      }
    });
  };

  selectAllSales = () => {
    this.setState(prevState => {
      if (prevState.selectedSales.length === prevState.salesRecords.length) {
        return { selectedSales: [] };
      } else {
        return { selectedSales: prevState.salesRecords.map(sale => sale._id) };
      }
    });
  };

  selectProduct = (product) => {
    this.setState({ 
      selectedProduct: product,
      sellingPrice: product.unitPrice
    });
  };

  handleInputChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleReceiptInputChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  calculateProfit = () => {
    const { selectedProduct, saleQuantity, sellingPrice } = this.state;
    
    if (!selectedProduct || !saleQuantity || !sellingPrice) return 0;
    
    const cost = selectedProduct.unitPrice * saleQuantity;
    const revenue = sellingPrice * saleQuantity;
    
    return revenue - cost;
  };

  calculateReceiptTotals = () => {
    const { selectedSales, salesRecords } = this.state;
    const selectedSalesData = salesRecords.filter(sale => selectedSales.includes(sale._id));
    
    const subtotal = selectedSalesData.reduce((total, sale) => {
      return total + (sale.quantity * sale.sellingPrice);
    }, 0);
    
    const totalQuantity = selectedSalesData.reduce((total, sale) => total + sale.quantity, 0);
    
    return { subtotal, totalQuantity, items: selectedSalesData.length, salesData: selectedSalesData };
  };

  handleSale = async () => {
    const { selectedProduct, saleQuantity, sellingPrice, customerName, customerPhone } = this.state;
    
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
        profit: this.calculateProfit(),
        customerName,
        customerPhone,
        stockType: selectedProduct.stockType
      };
      
      const data = await this.apiRequest('http://localhost:5000/api/retailer-sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });
      
      if (data.success) {
        toast.success('Sale recorded successfully');
        
        this.setState({
          selectedProduct: null,
          saleQuantity: '',
          sellingPrice: '',
          customerName: '',
          customerPhone: ''
        });
        
        this.fetchProducts();
        this.fetchSalesRecords();
        this.fetchLowStockAlerts();
      }
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error('Failed to record sale');
    }
  };

  // NEW: Save receipt to database
  saveReceipt = async () => {
    const { selectedSales, receiptCustomerName, receiptCustomerPhone } = this.state;
    
    if (selectedSales.length === 0) {
      toast.error('Please select sales items for the receipt');
      return;
    }

    this.setState({ savingReceipt: true });

    try {
      const receiptData = {
        saleIds: selectedSales,
        customerName: receiptCustomerName,
        customerPhone: receiptCustomerPhone
      };
      
      const data = await this.apiRequest('http://localhost:5000/api/retailer-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData)
      });
      
      if (data.success) {
        toast.success('Receipt saved successfully');
        // Update receipt number with the one from server
        this.setState({ 
          receiptNumber: data.receipt.receiptNumber,
          savingReceipt: false 
        });
        return data.receipt;
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error('Failed to save receipt');
      this.setState({ savingReceipt: false });
      throw error;
    }
  };

  // UPDATED: Print receipt (now saves to database first)
  printReceipt = async () => {
    try {
      // First save the receipt to database
      const savedReceipt = await this.saveReceipt();
      
      // Generate receipt content from saved receipt data
      const receiptContent = this.generateReceiptContent(savedReceipt);

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
          this.setState({
            selectedSales: [],
            showReceiptPanel: false,
            receiptCustomerName: '',
            receiptCustomerPhone: '',
            receiptNumber: Math.floor(100000 + Math.random() * 900000)
          });
        }, 500);
      }, 250);
    } catch (error) {
      console.error('Error in print process:', error);
    }
  };

  // NEW: Generate receipt content from saved receipt data
  generateReceiptContent = (receipt) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto;">
        <h2 style="text-align: center; margin-bottom: 5px; font-size: 18px;">SALES RECEIPT</h2>
        <p style="text-align: center; margin: 0; font-size: 12px; color: #666;">Receipt #: ${receipt.receiptNumber}</p>
        <p style="text-align: center; margin: 0; font-size: 12px; color: #666;">Date: ${new Date(receipt.receiptDate).toLocaleDateString()}</p>
        <p style="text-align: center; margin: 0; font-size: 12px; color: #666;">Time: ${new Date(receipt.receiptDate).toLocaleTimeString()}</p>
        
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
            ${receipt.items.map(item => `
              <tr>
                <td style="padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  ${item.productName}<br>
                  <small style="color: #666;">${item.measurementUnit}</small>
                </td>
                <td style="text-align: center; padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  ${item.quantity}
                </td>
                <td style="text-align: right; padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  $${item.unitPrice.toFixed(2)}
                </td>
                <td style="text-align: right; padding: 5px; border-bottom: 1px dotted #ccc; vertical-align: top;">
                  $${item.totalPrice.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <hr style="border-top: 1px dashed #000; margin: 10px 0;">
        
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin: 10px 0; font-size: 14px;">
          <span>TOTAL:</span>
          <span>$${receipt.subtotal.toFixed(2)}</span>
        </div>
        
        <hr style="border-top: 1px dashed #000; margin: 10px 0;">
        
        <p style="text-align: center; font-style: italic; margin-top: 15px; font-size: 11px; color: #666;">
          Thank you for your business!
        </p>
      </div>
    `;
  };

  // NEW: Save receipt without printing
  saveReceiptOnly = async () => {
    try {
      const savedReceipt = await this.saveReceipt();
      toast.success(`Receipt #${savedReceipt.receiptNumber} saved successfully!`);
      
      // Reset the form but keep the panel open
      this.setState({
        selectedSales: [],
        receiptCustomerName: '',
        receiptCustomerPhone: '',
        receiptNumber: Math.floor(100000 + Math.random() * 900000)
      });
    } catch (error) {
      console.error('Error saving receipt:', error);
    }
  };

  render() {
    const { 
      filteredProducts, 
      selectedProduct, 
      saleQuantity, 
      sellingPrice, 
      customerName, 
      customerPhone, 
      salesRecords, 
      searchQuery, 
      loading,
      stockType,
      lowStockAlerts,
      showLowStockPanel,
      selectedSales,
      showReceiptPanel,
      receiptCustomerName,
      receiptCustomerPhone,
      receiptNumber,
      savingReceipt,
      isMobile // NEW: Mobile state
    } = this.state;
    
    const profit = this.calculateProfit();
    const receiptTotals = this.calculateReceiptTotals();

    // NEW: Responsive text sizes and spacing
    const headerTextSize = isMobile ? 'text-lg' : 'text-xl';
    const subTextSize = isMobile ? 'text-xs' : 'text-xs';
    const buttonTextSize = isMobile ? 'text-xs' : 'text-sm';
    const inputTextSize = isMobile ? 'text-xs' : 'text-sm';
    const labelTextSize = isMobile ? 'text-xs' : 'text-xs';
    const productTextSize = isMobile ? 'text-xs' : 'text-sm';
    const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
    const smallIconSize = isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3';
    
    // NEW: Responsive padding and margins
    const containerPadding = isMobile ? 'p-1' : 'p-1';
    const panelPadding = isMobile ? 'p-2' : 'p-3';
    const elementSpacing = isMobile ? 'space-y-2' : 'space-y-3';
    const buttonPadding = isMobile ? 'px-2 py-1' : 'px-3 py-1.5';
    
    // NEW: Responsive grid layout
    const gridLayout = isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3';
    const gridGap = isMobile ? 'gap-2' : 'gap-4';

    // NEW: Responsive height - increased on mobile
    const containerHeight = isMobile ? 'h-[600px]' : 'h-[500px]'; // Increased from 500px to 600px on mobile
    const panelHeight = isMobile ? 'h-[600px]' : 'h-[500px]'; // Increased from 500px to 600px on mobile

    return (
      <div className={`${containerHeight} overflow-y-auto bg-gray-50 dark:bg-gray-900 ${containerPadding}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className={`mb-2 flex justify-between items-center ${isMobile ? 'flex-col space-y-2 items-start' : ''}`}>
            <div>
              <h1 className={`${headerTextSize} font-bold text-gray-900 dark:text-white`}>Daily Sales</h1>
              <p className={`${subTextSize} text-gray-600 dark:text-gray-400`}>Manage your sales and track inventory</p>
            </div>
            
            <div className={`flex ${isMobile ? 'space-x-1 self-end' : 'space-x-2'}`}>
              {/* Receipt Button */}
              {salesRecords.length > 0 && (
                <button
                  onClick={this.toggleReceiptPanel}
                  className={`flex items-center ${buttonPadding} ${buttonTextSize} bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-md transition-colors duration-200`}
                >
                  <FaReceipt className={`${iconSize} mr-1`} />
                  Receipt ({selectedSales.length})
                </button>
              )}
              
              {/* Low Stock Alerts Button */}
              {lowStockAlerts.length > 0 && (
                <button
                  onClick={this.toggleLowStockPanel}
                  className={`flex items-center ${buttonPadding} ${buttonTextSize} bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 rounded-md transition-colors duration-200`}
                >
                  <FaExclamationTriangle className={`${iconSize} mr-1`} />
                  Low Stock ({lowStockAlerts.length})
                </button>
              )}
            </div>
          </div>
          
          {/* Low Stock Alerts Panel */}
          {showLowStockPanel && (
            <div className={`mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md ${panelPadding}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`font-semibold text-red-800 dark:text-red-300 flex items-center ${isMobile ? 'text-sm' : ''}`}>
                  <FaExclamationTriangle className={`${iconSize} mr-1`} />
                  Low Stock Alerts
                </h3>
                <button
                  onClick={this.toggleLowStockPanel}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  ×
                </button>
              </div>
              <div className={`space-y-2 max-h-40 overflow-y-auto ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {lowStockAlerts.map(item => (
                  <div key={item._id} className="text-red-700 dark:text-red-300 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs">
                      Only {item.quantity} {item.measurementUnit} left • {item.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Receipt Panel */}
          {showReceiptPanel && (
            <div className={`mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md ${panelPadding}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`font-semibold text-blue-800 dark:text-blue-300 flex items-center ${isMobile ? 'text-sm' : ''}`}>
                  <FaReceipt className={`${iconSize} mr-1`} />
                  Create Receipt
                </h3>
                <button
                  onClick={this.toggleReceiptPanel}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ×
                </button>
              </div>
              
              {selectedSales.length > 0 ? (
                <>
                  <div className="mb-3">
                    <h4 className={`${labelTextSize} font-medium text-gray-700 dark:text-gray-300 mb-2`}>Customer Details (Optional):</h4>
                    <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-1 md:grid-cols-2 gap-2'}`}>
                      <input
                        type="text"
                        name="receiptCustomerName"
                        placeholder="Customer Name"
                        className={`p-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                        value={receiptCustomerName}
                        onChange={this.handleReceiptInputChange}
                      />
                      <input
                        type="text"
                        name="receiptCustomerPhone"
                        placeholder="Phone Number"
                        className={`p-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                        value={receiptCustomerPhone}
                        onChange={this.handleReceiptInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md mb-3">
                    <h4 className={`${labelTextSize} font-medium text-gray-700 dark:text-gray-300 mb-2`}>Receipt Summary:</h4>
                    <div className={`grid grid-cols-2 gap-2 ${inputTextSize}`}>
                      <div>Receipt #:</div>
                      <div className="text-right font-mono">{receiptNumber}</div>
                      <div>Items:</div>
                      <div className="text-right">{receiptTotals.items}</div>
                      <div>Total Quantity:</div>
                      <div className="text-right">{receiptTotals.totalQuantity}</div>
                      <div className="font-semibold">Total Amount:</div>
                      <div className="text-right font-semibold text-green-600 dark:text-green-400">
                        $${receiptTotals.subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'}`}>
                    <button
                      onClick={this.saveReceiptOnly}
                      disabled={savingReceipt}
                      className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 ${buttonTextSize} rounded-md font-medium transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FaSave className={`${smallIconSize} mr-1`} />
                      {savingReceipt ? 'Saving...' : 'Save Only'}
                    </button>
                    <button
                      onClick={this.printReceipt}
                      disabled={savingReceipt}
                      className={`bg-green-600 hover:bg-green-700 text-white py-2 px-3 ${buttonTextSize} rounded-md font-medium transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FaPrint className={`${smallIconSize} mr-1`} />
                      {savingReceipt ? 'Saving...' : 'Save & Print'}
                    </button>
                  </div>
                </>
              ) : (
                <p className={`${inputTextSize} text-gray-600 dark:text-gray-400 text-center py-4`}>
                  Select sales items from the Recent Sales column to create a receipt
                </p>
              )}
            </div>
          )}
          
          <div className={`grid ${gridLayout} ${gridGap}`}>
            {/* Product Selection Panel */}
            <div className={`flex flex-col ${panelHeight} bg-white dark:bg-gray-800 ${panelPadding} rounded-lg shadow-md`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-white`}>Select Product</h2>
                <button 
                  onClick={this.fetchProducts}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                  title="Refresh products"
                >
                  <FaSync className={`${smallIconSize}`} />
                </button>
              </div>
              
              <div className="mb-3 relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <FaSearch className={`${smallIconSize} text-gray-400`} />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  className={`w-full pl-7 pr-2 py-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  value={searchQuery}
                  onChange={this.handleSearch}
                />
              </div>
              
              <div className="mb-3">
                <label className={`block mb-1 ${labelTextSize} font-medium text-gray-700 dark:text-gray-300`}>Stock Type:</label>
                <select 
                  className={`w-full p-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  value={stockType}
                  onChange={this.handleStockTypeChange}
                >
                  <option value="all">All Stock</option>
                  <option value="retailer">Retailer Stock</option>
                  <option value="system">System Stock</option>
                </select>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                      <FaBox className="w-8 h-8 text-gray-400 mb-2" />
                      <p className={`${inputTextSize} text-gray-500 dark:text-gray-400`}>No products found</p>
                      <p className={`${labelTextSize} text-gray-400 mt-1`}>Try a different search term</p>
                    </div>
                  ) : (
                    <div className={`space-y-1 pr-1 ${isMobile ? 'text-xs' : ''}`}>
                      {filteredProducts.map(product => (
                        <div 
                          key={`${product.stockType}-${product._id}`}
                          className={`p-2 ${productTextSize} rounded-md cursor-pointer transition-all duration-200 ${
                            selectedProduct && selectedProduct._id === product._id && selectedProduct.stockType === product.stockType
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => this.selectProduct(product)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                            <span className={`text-xs px-1 py-0.5 rounded-full ${
                              product.stockType === 'retailer' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {product.stockType}
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1">
                            {product.category} • {product.quantity} {product.measurementUnit}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300 mt-1">
                            Cost: ${product.unitPrice.toFixed(2)}
                          </div>
                          {product.lowStockAlert && (
                            <div className="text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
                              Low Stock!
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Sales Form */}
            <div className={`flex flex-col ${panelHeight} bg-white dark:bg-gray-800 ${panelPadding} rounded-lg shadow-md`}>
              <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-white mb-3`}>Record Sale</h2>
              
              {selectedProduct ? (
                <div className="flex-1 overflow-y-auto">
                  <div className={`mb-3 p-2 ${productTextSize} bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700`}>
                    <h3 className="font-medium text-gray-900 dark:text-white">{selectedProduct.name}</h3>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      Category: {selectedProduct.category}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 mt-1">
                      Available: {selectedProduct.quantity} {selectedProduct.measurementUnit}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 mt-1">
                      Cost Price: ${selectedProduct.unitPrice.toFixed(2)}
                    </div>
                    {selectedProduct.lowStockAlert && (
                      <div className="text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
                        Low Stock Warning!
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label className={`block mb-1 ${labelTextSize} font-medium text-gray-700 dark:text-gray-300`}>Quantity:</label>
                    <input
                      type="number"
                      name="saleQuantity"
                      min="0.01"
                      max={selectedProduct.quantity}
                      step="0.01"
                      className={`w-full p-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                      value={saleQuantity}
                      onChange={this.handleInputChange}
                      placeholder={`Enter quantity in ${selectedProduct.measurementUnit}`}
                    />
                    <div className={`${labelTextSize} text-gray-500 dark:text-gray-400 mt-1`}>
                      Max: {selectedProduct.quantity} {selectedProduct.measurementUnit}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className={`block mb-1 ${labelTextSize} font-medium text-gray-700 dark:text-gray-300`}>Selling Price:</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <FaDollarSign className={`${smallIconSize} text-gray-400`} />
                      </div>
                      <input
                        type="number"
                        name="sellingPrice"
                        min="0.01"
                        step="0.01"
                        className={`w-full pl-6 pr-2 py-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                        value={sellingPrice}
                        onChange={this.handleInputChange}
                        placeholder="Enter selling price per unit"
                      />
                    </div>
                  </div>
                  
                  <div className={`mb-3 p-2 ${productTextSize} bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-700`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">Profit:</span>
                      <span className={`font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </span>
                    </div>
                    {profit < 0 && (
                      <div className="text-red-600 dark:text-red-400 mt-1 flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
                        Warning: Selling below cost price
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h3 className={`font-medium ${labelTextSize} text-gray-900 dark:text-white mb-2 flex items-center`}>
                      <FaUser className={`${smallIconSize} mr-1`} />
                      Customer Details (Optional)
                    </h3>
                    <div className="mb-2 relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <FaUser className={`${smallIconSize} text-gray-400`} />
                      </div>
                      <input
                        type="text"
                        name="customerName"
                        placeholder="Customer Name"
                        className={`w-full pl-6 pr-2 py-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                        value={customerName}
                        onChange={this.handleInputChange}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <FaPhone className={`${smallIconSize} text-gray-400`} />
                      </div>
                      <input
                        type="text"
                        name="customerPhone"
                        placeholder="Phone Number"
                        className={`w-full pl-6 pr-2 py-1.5 ${inputTextSize} border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                        value={customerPhone}
                        onChange={this.handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <button
                    className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 ${buttonTextSize} rounded-md font-medium transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={this.handleSale}
                    disabled={loading}
                  >
                    <FaShoppingCart className={`${smallIconSize} mr-1`} />
                    {loading ? 'Processing...' : 'Record Sale'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center flex-1">
                  <div className="text-gray-400 mb-3">
                    <FaBox className="w-12 h-12 mx-auto" />
                  </div>
                  <p className={`${inputTextSize} text-gray-500 dark:text-gray-400 mb-1`}>No product selected</p>
                  <p className={`${labelTextSize} text-gray-400 dark:text-gray-500`}>Select a product from the list to record a sale</p>
                </div>
              )}
            </div>
            
            {/* Recent Sales */}
            <div className={`flex flex-col ${panelHeight} bg-white dark:bg-gray-800 ${panelPadding} rounded-lg shadow-md`}>
              <div className="flex justify-between items-center mb-3">
                <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-white`}>Recent Sales</h2>
                <div className="flex space-x-1">
                  {salesRecords.length > 0 && (
                    <button 
                      onClick={this.selectAllSales}
                      className={`p-1 ${labelTextSize} text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300`}
                      title="Select all sales"
                    >
                      {selectedSales.length === salesRecords.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <button 
                    onClick={this.fetchSalesRecords}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
                    title="Refresh sales"
                    disabled={loading}
                  >
                    <FaSync className={`${smallIconSize} ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {salesRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6">
                    <FaDollarSign className="w-8 h-8 text-gray-400 mb-2" />
                    <p className={`${inputTextSize} text-gray-500 dark:text-gray-400`}>No sales recorded yet</p>
                    <p className={`${labelTextSize} text-gray-400 dark:text-gray-500 mt-1`}>Sales will appear here once recorded</p>
                  </div>
                ) : (
                  <div className={`space-y-2 pr-1 ${isMobile ? 'text-xs' : ''}`}>
                    {salesRecords.map(sale => {
                      const isSelected = selectedSales.includes(sale._id);
                      return (
                        <div 
                          key={sale._id} 
                          className={`p-2 ${productTextSize} rounded-md border transition-colors duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-600'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => this.handleSalesSelection(sale._id)}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-900 dark:text-white">{sale.productName}</span>
                            <span className={`font-semibold ${sale.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {sale.profit >= 0 ? '+' : ''}${sale.profit.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1">
                            {sale.quantity} {sale.measurementUnit} • ${sale.sellingPrice.toFixed(2)} each
                          </div>
                          <div className="text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(sale.saleDate).toLocaleDateString()} • {new Date(sale.saleDate).toLocaleTimeString()}
                          </div>
                          {sale.customerName && (
                            <div className="text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                              <FaUser className={`${smallIconSize} mr-1`} />
                              {sale.customerName}
                            </div>
                          )}
                          {isSelected && (
                            <div className="text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                              <FaReceipt className={`${smallIconSize} mr-1`} />
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
      </div>
    );
  }
}

export default DailySales;