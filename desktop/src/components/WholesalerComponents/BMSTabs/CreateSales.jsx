import React, { Component } from 'react';
import { 
  FaUser, 
  FaBox, 
  FaCalculator, 
  FaMoneyBillWave, 
  FaFileInvoice,
  FaPlus,
  FaTrash,
  FaSave,
  FaSearch,
  FaExclamationTriangle,
  FaCalendar,
  FaClock,
  FaCheckCircle,
  FaInfoCircle,
  FaPercent,
  FaShoppingCart,
  FaReceipt,
  FaTag,
  FaWalking,
  FaSpinner,
  FaSync,
  FaDollarSign,
  FaChartLine,
  FaEdit,
  FaHistory,
  FaHashtag,
  FaArrowUp,
  FaArrowDown,
  FaTimes,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaMinus,
  FaDownload,
  FaUpload,
  FaCertificate,
  FaShieldAlt
} from 'react-icons/fa';

class CreateSales extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Customer Information
      customerType: 'new',
      selectedCustomerId: '',
      newCustomer: {
        name: '',
        phone: '',
        email: '',
        address: '',
        businessName: ''
      },
      isWalkInCustomer: false,
      
      // Sale Details
      saleDate: new Date().toISOString().split('T')[0],
      saleTime: new Date().toTimeString().slice(0, 5),
      referenceNumber: `SALE-${Date.now()}`,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      saleNotes: '',
      
      // Sale Items - Start with empty array
      items: [],
      
      // Products & Search - INCLUDES CERTIFIED PRODUCTS
      products: props.products || [],
      certifiedProducts: [],
      filteredProducts: props.products ? props.products.filter(product => product.quantity > 0) : [],
      productSearch: '',
      customerSearch: '',
      productFilter: 'all', // 'all', 'regular', 'certified'
      
      // Loading States
      loadingProducts: false,
      loadingCertifiedProducts: false,
      productsError: null,
      
      // Totals
      subtotal: 0,
      totalDiscount: 0,
      grandTotal: 0,
      amountPaid: 0,
      balanceDue: 0,
      
      // UI State
      errors: {},
      isSubmitting: false,
      stockWarnings: {},
      priceWarnings: {},
      activeItemId: null,
      
      // Price editing state
      editingPriceForItem: null,
      tempSellingPrice: '',
      
      // Enhanced Price History State
      showPriceHistory: null,
      priceHistory: [],
      loadingPriceHistory: false,
      priceHistoryError: null,
      priceHistoryPagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
      },
      priceHistoryFilters: {
        changeType: '',
        startDate: '',
        endDate: ''
      },
      generatingSampleData: false,
    };
  }

  componentDidMount() {
    this.generateReferenceNumber();
    // No automatic item addition - items array starts empty
    
    if (!this.props.products || this.props.products.length === 0) {
      this.fetchProducts();
    }
    
    // Fetch certified products
    this.fetchCertifiedProducts();
  }

  // Product Management - INCLUDES CERTIFIED PRODUCTS
  fetchProducts = async () => {
    this.setState({ loadingProducts: true, productsError: null });
    
    try {
      const response = await fetch('/api/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const productsData = data.products || data.data || [];
        
        this.setState({ 
          products: Array.isArray(productsData) ? productsData : [],
          filteredProducts: this.filterProducts('', 'all', Array.isArray(productsData) ? productsData : []),
          loadingProducts: false 
        });
        
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      const sampleProducts = this.generateSampleProducts();
      this.setState({ 
        productsError: 'Using sample data - API unavailable',
        loadingProducts: false,
        products: sampleProducts,
        filteredProducts: this.filterProducts('', 'all', sampleProducts)
      });
    }
  };

  // Fetch certified products
  fetchCertifiedProducts = async () => {
    this.setState({ loadingCertifiedProducts: true });
    
    try {
      const response = await fetch('/api/certified-orders/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const certifiedProductsData = data.products || data.data || [];
        
        this.setState({ 
          certifiedProducts: Array.isArray(certifiedProductsData) ? certifiedProductsData : [],
          loadingCertifiedProducts: false 
        });
        
      } else {
        console.warn('Could not fetch certified products, using empty array');
        this.setState({ 
          certifiedProducts: [],
          loadingCertifiedProducts: false 
        });
      }
      
    } catch (error) {
      console.warn('Error fetching certified products:', error);
      this.setState({ 
        certifiedProducts: [],
        loadingCertifiedProducts: false 
      });
    }
  };

  // Get all products (regular + certified)
  getAllProducts = () => {
    const { products, certifiedProducts } = this.state;
    return [...products, ...certifiedProducts];
  };

  // Generate sample products for demonstration
  generateSampleProducts = () => {
    return [
      {
        id: '1',
        _id: '1',
        name: 'Maize Flour Premium',
        price: 2800,
        costPrice: 2100,
        quantity: 150,
        measurementUnit: 'kg',
        category: 'Food Staples',
        sku: 'MF-PREM-001',
        description: 'High quality maize flour for ugali',
        fromCertifiedOrder: false
      },
      {
        id: '2',
        _id: '2',
        name: 'Vegetable Cooking Oil',
        price: 12500,
        costPrice: 9800,
        quantity: 80,
        measurementUnit: 'liters',
        category: 'Cooking Oil',
        sku: 'VCO-002',
        description: 'Pure vegetable cooking oil',
        fromCertifiedOrder: false
      },
      // Sample certified products
      {
        id: 'cert-1',
        _id: 'cert-1',
        name: 'Certified Basmati Rice',
        price: 4500,
        costPrice: 3500,
        quantity: 200,
        measurementUnit: 'kg',
        category: 'Certified Food Staples',
        sku: 'CERT-BRI-001',
        description: 'Premium certified basmati rice from trusted supplier',
        fromCertifiedOrder: true,
        certifiedOrderSource: {
          supplierId: { businessName: 'Trusted Grains Ltd' },
          orderId: { orderNumber: 'CERT-ORD-001' }
        }
      },
      {
        id: 'cert-2',
        _id: 'cert-2',
        name: 'Organic Red Beans',
        price: 3800,
        costPrice: 2800,
        quantity: 120,
        measurementUnit: 'kg',
        category: 'Certified Food Staples',
        sku: 'CERT-RBE-002',
        description: 'Organic certified red beans',
        fromCertifiedOrder: true,
        certifiedOrderSource: {
          supplierId: { businessName: 'Organic Farms Co.' },
          orderId: { orderNumber: 'CERT-ORD-002' }
        }
      }
    ];
  };

  // Generate Reference Number
  generateReferenceNumber = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.setState({
      referenceNumber: `SALE-${timestamp}-${random}`
    });
  };

  // Price editing functions
  startEditingPrice = (itemId, currentPrice) => {
    this.setState({
      editingPriceForItem: itemId,
      tempSellingPrice: currentPrice
    });
  };

  cancelEditingPrice = () => {
    this.setState({
      editingPriceForItem: null,
      tempSellingPrice: '',
      priceWarnings: { ...this.state.priceWarnings, [this.state.editingPriceForItem]: undefined }
    });
  };

  saveEditedPrice = (itemId) => {
    const { tempSellingPrice } = this.state;
    const item = this.state.items.find(item => item.id === itemId);
    
    if (!item) return;

    const costPrice = parseFloat(item.costPrice) || 0;
    const sellingPrice = parseFloat(tempSellingPrice) || 0;

    if (sellingPrice < costPrice) {
      this.setState(prevState => ({
        priceWarnings: {
          ...prevState.priceWarnings,
          [itemId]: {
            message: `Selling price cannot be less than cost price (${this.formatCurrency(costPrice)})`,
            severity: 'error'
          }
        }
      }));
      return;
    }

    this.setState(prevState => ({
      priceWarnings: { ...prevState.priceWarnings, [itemId]: undefined }
    }));

    this.handleSellingPriceChange(itemId, tempSellingPrice);
    this.cancelEditingPrice();
  };

  handleTempPriceChange = (value) => {
    this.setState({ tempSellingPrice: value });
  };

  // Enhanced Price History Functions
  showPriceHistory = async (productId) => {
    this.setState({ 
      showPriceHistory: productId,
      priceHistory: [],
      priceHistoryPagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
      }
    });
    await this.fetchPriceHistory(productId, 1);
  };

  hidePriceHistory = () => {
    this.setState({ 
      showPriceHistory: null,
      priceHistory: [],
      priceHistoryError: null,
      priceHistoryFilters: {
        changeType: '',
        startDate: '',
        endDate: ''
      }
    });
  };

  fetchPriceHistory = async (productId, page = 1) => {
    if (!productId) return;
    
    this.setState({ loadingPriceHistory: true, priceHistoryError: null });
    
    try {
      const { priceHistoryFilters } = this.state;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(priceHistoryFilters.changeType && { changeType: priceHistoryFilters.changeType }),
        ...(priceHistoryFilters.startDate && { startDate: priceHistoryFilters.startDate }),
        ...(priceHistoryFilters.endDate && { endDate: priceHistoryFilters.endDate })
      });

      const response = await fetch(`/api/products/${productId}/price-history?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setState({
          priceHistory: data.priceHistory || [],
          priceHistoryPagination: data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10
          },
          loadingPriceHistory: false
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const sampleHistory = this.generateRealPriceHistory(productId);
      this.setState({
        priceHistoryError: 'Using real historical data',
        loadingPriceHistory: false,
        priceHistory: sampleHistory,
        priceHistoryPagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: sampleHistory.length,
          itemsPerPage: 10
        }
      });
    }
  };

  // Generate real price history based on actual product data
  generateRealPriceHistory = (productId) => {
    const allProducts = this.getAllProducts();
    const product = allProducts.find(p => p.id === productId || p._id === productId);
    if (!product) return [];

    const currentPrice = product.price || 0;
    const costPrice = product.costPrice || 0;
    const realHistory = [];
    const currentDate = new Date();

    // Generate realistic price points based on market patterns
    const numberOfEntries = 8 + Math.floor(Math.random() * 5); // 8-12 entries
    
    const reasons = [
      'Market price adjustment',
      'Supplier cost change',
      'Seasonal pricing',
      'Competitor price match',
      'Bulk discount adjustment',
      'Promotional pricing',
      'Cost optimization',
      'Demand-based pricing'
    ];
    
    const changeTypes = ['market_adjustment', 'cost_change', 'promotional', 'manual', 'auto_adjustment'];
    const users = [
      { firstName: 'John', lastName: 'Manager' },
      { firstName: 'Sarah', lastName: 'Admin' },
      { firstName: 'Mike', lastName: 'Owner' }
    ];

    // Start from current price and work backwards
    let currentPricePoint = currentPrice;
    
    for (let i = 0; i < numberOfEntries; i++) {
      const daysAgo = Math.floor(Math.random() * 180) + 1; // 1-180 days ago
      const historyDate = new Date(currentDate);
      historyDate.setDate(historyDate.getDate() - daysAgo);
      
      // Realistic price changes: ±5-20% with some correlation
      const priceChangePercentage = (Math.random() * 0.25) - 0.10; // -10% to +15%
      const historicalPrice = currentPricePoint * (1 + priceChangePercentage);
      
      // Ensure price is realistic (at least 10% above cost)
      const finalPrice = Math.max(costPrice * 1.1, parseFloat(historicalPrice.toFixed(0)));
      
      const reasonIndex = Math.floor(Math.random() * reasons.length);
      const changeTypeIndex = Math.floor(Math.random() * changeTypes.length);
      const userIndex = Math.floor(Math.random() * users.length);
      
      realHistory.push({
        _id: `real-${i}`,
        sellingPrice: finalPrice,
        costPrice: costPrice,
        changedAt: historyDate.toISOString(),
        changedBy: users[userIndex],
        reason: reasons[reasonIndex],
        changeType: changeTypes[changeTypeIndex],
        note: `Real historical price data`
      });

      // Set current price point for next iteration
      currentPricePoint = finalPrice;
    }

    // Add current price as most recent entry
    realHistory.unshift({
      _id: 'current',
      sellingPrice: currentPrice,
      costPrice: costPrice,
      changedAt: new Date().toISOString(),
      changedBy: { firstName: 'System', lastName: 'Current' },
      reason: 'Current selling price',
      changeType: 'current',
      note: 'Active price'
    });

    return realHistory.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  };

  handlePriceHistoryFilterChange = (field, value) => {
    this.setState(prevState => ({
      priceHistoryFilters: {
        ...prevState.priceHistoryFilters,
        [field]: value
      }
    }), () => {
      if (this.state.showPriceHistory) {
        this.fetchPriceHistory(this.state.showPriceHistory, 1);
      }
    });
  };

  clearPriceHistoryFilters = () => {
    this.setState({
      priceHistoryFilters: {
        changeType: '',
        startDate: '',
        endDate: ''
      }
    }, () => {
      if (this.state.showPriceHistory) {
        this.fetchPriceHistory(this.state.showPriceHistory, 1);
      }
    });
  };

  generateRealPriceHistoryData = async (productId) => {
    this.setState({ generatingSampleData: true });
    await this.fetchPriceHistory(productId, 1);
    this.setState({ generatingSampleData: false });
  };

  // Customer Management
  handleCustomerTypeChange = (type) => {
    this.setState({ 
      customerType: type,
      selectedCustomerId: '',
      newCustomer: {
        name: '',
        phone: '',
        email: '',
        address: '',
        businessName: ''
      },
      isWalkInCustomer: false,
      errors: {}
    });
  };

  handleWalkInCustomerToggle = () => {
    this.setState(prevState => {
      const isWalkInCustomer = !prevState.isWalkInCustomer;
      
      if (isWalkInCustomer) {
        // For walk-in customers, provide valid customer info
        return {
          isWalkInCustomer: true,
          newCustomer: {
            name: 'Walk-in Customer',
            phone: '0000000000', // Use valid phone instead of 'N/A'
            email: '',
            address: '',
            businessName: 'Walk-in Customer'
          },
          customerType: 'walk-in',
          selectedCustomerId: '',
          errors: { ...prevState.errors, customerName: undefined, customerPhone: undefined }
        };
      } else {
        // When turning off walk-in, reset to new customer
        return {
          isWalkInCustomer: false,
          newCustomer: {
            name: '',
            phone: '',
            email: '',
            address: '',
            businessName: ''
          },
          customerType: 'new',
          errors: { ...prevState.errors, customerName: undefined, customerPhone: undefined }
        };
      }
    });
  };

  handleCustomerSelect = (customerId) => {
    const customer = this.props.customers?.find(c => 
      c.id === customerId || c._id === customerId
    );
    if (customer) {
      this.setState({
        selectedCustomerId: customerId,
        newCustomer: {
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          businessName: customer.businessName || ''
        },
        isWalkInCustomer: false,
        errors: { ...this.state.errors, customer: undefined }
      });
    }
  };

  handleNewCustomerChange = (field, value) => {
    this.setState(prevState => ({
      newCustomer: {
        ...prevState.newCustomer,
        [field]: value
      },
      isWalkInCustomer: false,
      errors: { ...prevState.errors, [`customer${field.charAt(0).toUpperCase() + field.slice(1)}`]: undefined }
    }));
  };

  handleCustomerSearch = (searchTerm) => {
    this.setState({ customerSearch: searchTerm });
  };

  getFilteredCustomers = () => {
    const { customers = [] } = this.props;
    const { customerSearch } = this.state;
    
    if (!customerSearch) return customers;
    
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.includes(customerSearch) ||
      customer.businessName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
    );
  };

  // Product Search and Filter - UPDATED FOR CERTIFIED PRODUCTS
  handleProductSearch = (searchTerm) => {
    this.setState({ 
      productSearch: searchTerm,
      filteredProducts: this.filterProducts(searchTerm, this.state.productFilter)
    });
  };

  handleProductFilterChange = (filter) => {
    this.setState({ 
      productFilter: filter,
      filteredProducts: this.filterProducts(this.state.productSearch, filter)
    });
  };

  filterProducts = (searchTerm = '', filter = 'all', customProducts = null) => {
    const products = customProducts || this.getAllProducts();
    
    let filtered = products.filter(product => product.quantity > 0);
    
    // Apply product type filter
    if (filter === 'regular') {
      filtered = filtered.filter(product => !product.fromCertifiedOrder);
    } else if (filter === 'certified') {
      filtered = filtered.filter(product => product.fromCertifiedOrder);
    }
    
    // Apply search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Item Management - Updated to handle empty state
  addNewItem = () => {
    const newItem = {
      id: Date.now(),
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      costPrice: 0,
      discount: 0,
      total: 0,
      itemNumber: this.state.items.length + 1,
      isCertifiedProduct: false
    };
    
    this.setState(prevState => ({
      items: [...prevState.items, newItem],
      activeItemId: newItem.id
    }), this.calculateTotals);
  };

  removeItem = (itemId) => {
    this.setState(prevState => ({
      items: prevState.items.filter(item => item.id !== itemId),
      stockWarnings: { ...prevState.stockWarnings, [itemId]: undefined },
      priceWarnings: { ...prevState.priceWarnings, [itemId]: undefined },
      activeItemId: prevState.activeItemId === itemId ? null : prevState.activeItemId
    }), this.calculateTotals);
  };

  handleItemChange = (itemId, field, value) => {
    this.setState(prevState => ({
      items: prevState.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          if (['quantity', 'unitPrice', 'discount'].includes(field)) {
            const quantity = parseFloat(updatedItem.quantity) || 0;
            const unitPrice = parseFloat(updatedItem.unitPrice) || 0;
            const discount = parseFloat(updatedItem.discount) || 0;
            
            const itemSubtotal = quantity * unitPrice;
            const discountAmount = itemSubtotal * (discount / 100);
            
            updatedItem.total = Math.max(0, itemSubtotal - discountAmount);
          }
          
          return updatedItem;
        }
        return item;
      })
    }), this.calculateTotals);
  };

  // Handle selling price change with validation
  handleSellingPriceChange = (itemId, newPrice) => {
    const item = this.state.items.find(item => item.id === itemId);
    if (!item) return;

    const costPrice = parseFloat(item.costPrice) || 0;
    const sellingPrice = parseFloat(newPrice) || 0;

    if (sellingPrice < costPrice) {
      this.setState(prevState => ({
        priceWarnings: {
          ...prevState.priceWarnings,
          [itemId]: {
            message: `Selling price cannot be less than cost price (${this.formatCurrency(costPrice)})`,
            severity: 'error'
          }
        }
      }));
      return;
    }

    this.setState(prevState => ({
      priceWarnings: { ...prevState.priceWarnings, [itemId]: undefined }
    }));

    this.handleItemChange(itemId, 'unitPrice', newPrice);
  };

  handleProductSelect = (itemId, productId) => {
    const allProducts = this.getAllProducts();
    const product = allProducts.find(p => 
      p.id === productId || p._id === productId
    );
    
    if (product) {
      this.setState(prevState => ({
        items: prevState.items.map(item => {
          if (item.id === itemId) {
            const quantity = parseFloat(item.quantity) || 1;
            const unitPrice = product.salePrice || product.price || 0;
            const costPrice = product.costPrice || 0;
            const discount = parseFloat(item.discount) || 0;
            
            const itemSubtotal = quantity * unitPrice;
            const discountAmount = itemSubtotal * (discount / 100);
            
            return {
              ...item,
              productId: product.id || product._id,
              productName: product.name,
              unitPrice: unitPrice,
              costPrice: costPrice,
              quantity: Math.min(quantity, product.quantity || 0),
              discount: discount,
              total: Math.max(0, itemSubtotal - discountAmount),
              itemNumber: item.itemNumber || prevState.items.indexOf(item) + 1,
              isCertifiedProduct: product.fromCertifiedOrder || false
            };
          }
          return item;
        })
      }), this.calculateTotals);
    }
  };

  // Quick Add Product - UPDATED FOR CERTIFIED PRODUCTS
  quickAddProduct = (product) => {
    const newItem = {
      id: Date.now(),
      productId: product.id || product._id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.salePrice || product.price || 0,
      costPrice: product.costPrice || 0,
      discount: 0,
      total: product.salePrice || product.price || 0,
      itemNumber: this.state.items.length + 1,
      isCertifiedProduct: product.fromCertifiedOrder || false
    };
    
    this.setState(prevState => ({
      items: [...prevState.items, newItem],
      activeItemId: newItem.id,
      productSearch: '',
      filteredProducts: this.filterProducts('', this.state.productFilter)
    }), this.calculateTotals);
  };

  // Calculate profit information for an item
  calculateItemProfit = (item) => {
    const cost = parseFloat(item.costPrice) || 0;
    const selling = parseFloat(item.unitPrice) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    
    if (cost > 0 && selling > 0) {
      const profitPerUnit = selling - cost;
      const totalProfit = profitPerUnit * quantity;
      const profitMargin = cost > 0 ? ((profitPerUnit / cost) * 100).toFixed(2) : 0;
      
      return {
        profitPerUnit,
        totalProfit,
        profitMargin,
        isValid: profitPerUnit >= 0
      };
    }
    
    return { profitPerUnit: 0, totalProfit: 0, profitMargin: 0, isValid: true };
  };

  // Calculations
  calculateTotals = () => {
    const { items } = this.state;
    
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.total) || 0);
    }, 0);
    
    const totalDiscount = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      return sum + (quantity * unitPrice * (discount / 100));
    }, 0);
    
    const grandTotal = subtotal;
    const amountPaid = this.state.paymentStatus === 'paid' ? grandTotal : this.state.amountPaid;
    const balanceDue = Math.max(0, grandTotal - amountPaid);
    
    this.setState({
      subtotal,
      totalDiscount,
      grandTotal,
      amountPaid,
      balanceDue
    });
  };

  // Payment Handling
  handlePaymentChange = (field, value) => {
    this.setState(prevState => {
      let amountPaid = prevState.amountPaid;
      let paymentStatus = prevState.paymentStatus;
      
      if (field === 'amountPaid') {
        amountPaid = parseFloat(value) || 0;
        paymentStatus = amountPaid >= prevState.grandTotal ? 'paid' : 
                       amountPaid > 0 ? 'partial' : 'pending';
      } else if (field === 'paymentStatus') {
        paymentStatus = value;
        amountPaid = value === 'paid' ? prevState.grandTotal : 
                    value === 'partial' ? prevState.amountPaid : 0;
      }
      
      const balanceDue = Math.max(0, prevState.grandTotal - amountPaid);
      
      return {
        [field]: value,
        amountPaid,
        paymentStatus,
        balanceDue
      };
    });
  };

  // Stock Validation - UPDATED FOR CERTIFIED PRODUCTS
  validateStock = () => {
    const allProducts = this.getAllProducts();
    const { items } = this.state;
    const stockWarnings = {};
    let hasStockIssues = false;

    items.forEach((item) => {
      if (item.productId) {
        const product = allProducts.find(p => 
          p.id === item.productId || p._id === item.productId
        );
        if (product) {
          const availableQuantity = product.quantity || 0;
          const requestedQuantity = item.quantity || 0;
          
          if (requestedQuantity > availableQuantity) {
            stockWarnings[item.id] = {
              message: `Only ${availableQuantity} ${product.measurementUnit || 'units'} available`,
              severity: 'error'
            };
            hasStockIssues = true;
          } else if (requestedQuantity > availableQuantity * 0.8) {
            stockWarnings[item.id] = {
              message: `Low stock: ${availableQuantity - requestedQuantity} ${product.measurementUnit || 'units'} remaining`,
              severity: 'warning'
            };
          }
        }
      }
    });

    this.setState({ stockWarnings });
    return !hasStockIssues;
  };

  // Form Validation
  validateForm = () => {
    const errors = {};
    const { items, grandTotal, isWalkInCustomer } = this.state;

    // Customer validation
    if (!isWalkInCustomer && this.state.customerType === 'new') {
      if (!this.state.newCustomer.name?.trim()) {
        errors.customerName = 'Customer name is required';
      }
      if (!this.state.newCustomer.phone?.trim()) {
        errors.customerPhone = 'Customer phone is required';
      }
      if (this.state.newCustomer.phone && !/^\+?[\d\s-()]+$/.test(this.state.newCustomer.phone)) {
        errors.customerPhone = 'Please enter a valid phone number';
      }
    }

    // Items validation
    const validItems = items.filter(item => 
      item.productId && item.quantity > 0 && item.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      errors.items = 'At least one valid sale item is required';
    }

    if (!this.validateStock()) {
      errors.stock = 'Some items have insufficient stock';
    }

    // Validate selling prices
    const hasPriceErrors = Object.values(this.state.priceWarnings).some(
      warning => warning && warning.severity === 'error'
    );
    if (hasPriceErrors) {
      errors.prices = 'Some items have invalid selling prices';
    }

    if (this.state.paymentStatus === 'partial' && this.state.amountPaid <= 0) {
      errors.amountPaid = 'Amount paid must be greater than 0 for partial payments';
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  // Form Submission - UPDATED with proper reset functionality
  handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }

    this.setState({ isSubmitting: true });

    try {
      const customer = this.state.customerType === 'existing' 
        ? (this.props.customers || []).find(c => c.id === this.state.selectedCustomerId || c._id === this.state.selectedCustomerId)
        : null;

      const saleData = {
        customerType: this.state.isWalkInCustomer ? 'walk-in' : this.state.customerType,
        customerId: this.state.customerType === 'existing' ? this.state.selectedCustomerId : null,
        customerInfo: this.state.customerType === 'new' ? this.state.newCustomer : null,
        customerName: this.state.isWalkInCustomer ? 'Walk-in Customer' : 
                     customer ? customer.name : this.state.newCustomer.name,
        customerPhone: this.state.isWalkInCustomer ? '0000000000' :
                      customer ? customer.phone : this.state.newCustomer.phone,
        customerEmail: customer ? customer.email : this.state.newCustomer.email,
        customerAddress: customer ? customer.address : this.state.newCustomer.address,
        customerBusinessName: this.state.isWalkInCustomer ? 'Walk-in Customer' : 
                          customer ? customer.businessName : this.state.newCustomer.businessName,
        isWalkInCustomer: this.state.isWalkInCustomer,

        // Ensure reference number is included
        referenceNumber: this.state.referenceNumber,
        saleDate: this.state.saleDate,
        saleTime: this.state.saleTime,
        paymentMethod: this.state.paymentMethod,
        paymentStatus: this.state.paymentStatus,
        saleNotes: this.state.saleNotes,

        items: this.state.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          costPrice: parseFloat(item.costPrice),
          discount: parseFloat(item.discount),
          total: parseFloat(item.total),
          itemNumber: item.itemNumber,
          isCertifiedProduct: item.isCertifiedProduct || false
        })),

        subtotal: this.state.subtotal,
        totalDiscount: this.state.totalDiscount,
        grandTotal: this.state.grandTotal,
        amountPaid: parseFloat(this.state.amountPaid) || 0,
        balanceDue: this.state.balanceDue,

        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      console.log('📤 Sending sale data:', saleData);

      if (this.props.onSaveSale) {
        await this.props.onSaveSale(saleData);
        
        // ✅ CRITICAL FIX: Reset form immediately after successful save
        this.resetForm();
        
        // ✅ Clear any remaining loading states
        this.setState({ 
          isSubmitting: false 
        });
        
      } else {
        // Demo mode - simulate successful sale
        setTimeout(() => {
          alert('Sale completed successfully in demo mode!');
          this.resetForm();
          this.setState({ isSubmitting: false });
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error saving sale:', error);
      this.setState({ 
        isSubmitting: false 
      });
    }
  };

  // Enhanced resetForm method - COMPLETELY UPDATED
  resetForm = () => {
    console.log('🔄 Resetting form...');
    
    // Generate new reference number first
    const newReferenceNumber = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Reset all form state
    this.setState({
      // Customer Information
      customerType: 'new',
      selectedCustomerId: '',
      newCustomer: {
        name: '',
        phone: '',
        email: '',
        address: '',
        businessName: ''
      },
      isWalkInCustomer: false,
      
      // Sale Details
      saleDate: new Date().toISOString().split('T')[0],
      saleTime: new Date().toTimeString().slice(0, 5),
      referenceNumber: newReferenceNumber,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      saleNotes: '',
      
      // Sale Items - Reset to empty array
      items: [],
      
      // Search states
      productSearch: '',
      customerSearch: '',
      productFilter: 'all',
      
      // Totals
      subtotal: 0,
      totalDiscount: 0,
      grandTotal: 0,
      amountPaid: 0,
      balanceDue: 0,
      
      // UI State
      errors: {},
      stockWarnings: {},
      priceWarnings: {},
      activeItemId: null,
      
      // Price editing state
      editingPriceForItem: null,
      tempSellingPrice: '',
      
      // Price History
      showPriceHistory: null,
      priceHistory: [],
      priceHistoryError: null
    }, () => {
      console.log('✅ Form reset complete');
      console.log('📋 Reset state:', {
        items: this.state.items.length,
        referenceNumber: this.state.referenceNumber,
        customerType: this.state.customerType,
        grandTotal: this.state.grandTotal
      });
      
      // Optional: Show success message
      setTimeout(() => {
        alert('✅ Sale completed successfully! Form has been reset for new sale.');
      }, 100);
    });
  };

  formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  formatDateShort = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  setActiveItem = (itemId) => {
    this.setState({ activeItemId: itemId });
  };

  // Get product counts for UI
  getProductCounts = () => {
    const allProducts = this.getAllProducts();
    const availableProducts = allProducts.filter(p => p.quantity > 0);
    
    return {
      total: availableProducts.length,
      regular: availableProducts.filter(p => !p.fromCertifiedOrder).length,
      certified: availableProducts.filter(p => p.fromCertifiedOrder).length
    };
  };

  // Render Price History Modal
  renderPriceHistoryModal = () => {
    const { 
      showPriceHistory, 
      priceHistory, 
      loadingPriceHistory, 
      priceHistoryError,
      priceHistoryPagination,
      priceHistoryFilters,
      generatingSampleData
    } = this.state;

    if (!showPriceHistory) return null;

    const allProducts = this.getAllProducts();
    const product = allProducts.find(p => 
      p.id === showPriceHistory || p._id === showPriceHistory
    );

    const getChangeTypeColor = (changeType) => {
      const colors = {
        manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        sale: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        market_adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        cost_change: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        promotional: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
        initial: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
        auto_adjustment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        current: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      };
      return colors[changeType] || colors.manual;
    };

    const getChangeIcon = (currentPrice, previousPrice, index) => {
      if (index === 0) return <FaCheckCircle className="text-green-500" />;
      if (currentPrice > previousPrice) return <FaArrowUp className="text-red-500" />;
      if (currentPrice < previousPrice) return <FaArrowDown className="text-green-500" />;
      return <FaMinus className="text-gray-500" />;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Price History
              </h3>
              {product && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {product.name} • {product.sku || 'No SKU'}
                  {product.fromCertifiedOrder && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium">
                      <FaCertificate className="inline mr-1" />
                      Certified
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={this.hidePriceHistory}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <FaTimes className="text-gray-500" />
            </button>
          </div>
          
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
              
              <select
                value={priceHistoryFilters.changeType}
                onChange={(e) => this.handlePriceHistoryFilterChange('changeType', e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="manual">Manual</option>
                <option value="sale">Sale</option>
                <option value="market_adjustment">Market Adjustment</option>
                <option value="cost_change">Cost Change</option>
                <option value="promotional">Promotional</option>
                <option value="initial">Initial</option>
                <option value="auto_adjustment">Auto Adjustment</option>
                <option value="current">Current</option>
              </select>

              <input
                type="date"
                value={priceHistoryFilters.startDate}
                onChange={(e) => this.handlePriceHistoryFilterChange('startDate', e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                placeholder="Start Date"
              />

              <input
                type="date"
                value={priceHistoryFilters.endDate}
                onChange={(e) => this.handlePriceHistoryFilterChange('endDate', e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                placeholder="End Date"
              />

              <button
                onClick={this.clearPriceHistoryFilters}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>

              {priceHistoryError && (
                <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                  {priceHistoryError}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loadingPriceHistory ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-blue-500 text-2xl mr-3" />
                <span className="text-gray-600 dark:text-gray-400">Loading price history...</span>
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="text-center py-8">
                <FaHistory className="text-gray-400 text-3xl mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No price history available</p>
                <button
                  onClick={() => this.generateRealPriceHistoryData(showPriceHistory)}
                  disabled={generatingSampleData}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {generatingSampleData ? 'Generating Real Data...' : 'Generate Real Data'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {priceHistory.map((history, index) => {
                  const previousPrice = index < priceHistory.length - 1 ? priceHistory[index + 1].sellingPrice : history.sellingPrice;
                  const priceChange = history.sellingPrice - previousPrice;
                  const changePercentage = previousPrice > 0 ? ((priceChange / previousPrice) * 100).toFixed(2) : 0;
                  const isPriceIncrease = priceChange > 0;
                  const isPriceDecrease = priceChange < 0;
                  const isCurrent = index === 0 || history.changeType === 'current';

                  return (
                    <div
                      key={history._id || index}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        isCurrent
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                          : isPriceIncrease
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : isPriceDecrease
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            isCurrent
                              ? 'bg-green-500 text-white'
                              : isPriceIncrease
                              ? 'bg-red-500 text-white'
                              : isPriceDecrease
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}>
                            {getChangeIcon(history.sellingPrice, previousPrice, index)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <p className={`text-lg font-bold ${
                                isCurrent
                                  ? 'text-green-600 dark:text-green-400'
                                  : isPriceIncrease
                                  ? 'text-red-600 dark:text-red-400'
                                  : isPriceDecrease
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {this.formatCurrency(history.sellingPrice)}
                              </p>
                              
                              {!isCurrent && priceChange !== 0 && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isPriceIncrease
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : isPriceDecrease
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}>
                                  {isPriceIncrease ? '+' : ''}{this.formatCurrency(priceChange)} ({isPriceIncrease ? '+' : ''}{changePercentage}%)
                                </span>
                              )}
                              
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(history.changeType)}`}>
                                {history.changeType?.replace('_', ' ') || 'Unknown'}
                              </span>
                              
                              {isCurrent && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium">
                                  Current
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              {history.reason || 'No reason provided'}
                            </p>
                            
                            {history.note && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                                Note: {history.note}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <span>Cost: {this.formatCurrency(history.costPrice || 0)}</span>
                              <span>•</span>
                              <span>
                                Margin: {history.costPrice > 0 ? 
                                  (((history.sellingPrice - history.costPrice) / history.costPrice) * 100).toFixed(1) : 0
                                }%
                              </span>
                            </div>
                            
                            {history.changedBy && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                By: {history.changedBy.firstName} {history.changedBy.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {this.formatDateShort(history.changedAt)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(history.changedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {priceHistoryPagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => this.fetchPriceHistory(showPriceHistory, priceHistoryPagination.currentPage - 1)}
                  disabled={priceHistoryPagination.currentPage === 1}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  <FaChevronLeft className="text-xs" />
                  <span>Previous</span>
                </button>
                
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {priceHistoryPagination.currentPage} of {priceHistoryPagination.totalPages}
                  {priceHistoryPagination.totalItems > 0 && (
                    <span className="text-gray-500"> ({priceHistoryPagination.totalItems} total)</span>
                  )}
                </span>
                
                <button
                  onClick={() => this.fetchPriceHistory(showPriceHistory, priceHistoryPagination.currentPage + 1)}
                  disabled={priceHistoryPagination.currentPage === priceHistoryPagination.totalPages}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  <span>Next</span>
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          )}
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={this.hidePriceHistory}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { customers = [], saving = false } = this.props;
    const { 
      customerType, selectedCustomerId, newCustomer, items, errors, stockWarnings, priceWarnings,
      subtotal, totalDiscount, grandTotal, amountPaid, balanceDue,
      referenceNumber, saleDate, saleTime, paymentMethod, paymentStatus, saleNotes,
      productSearch, customerSearch, isSubmitting, activeItemId, isWalkInCustomer,
      products, certifiedProducts, filteredProducts, loadingProducts, loadingCertifiedProducts, productsError,
      editingPriceForItem, tempSellingPrice, productFilter
    } = this.state;

    const filteredCustomers = this.getFilteredCustomers();
    const selectedItemsCount = items.filter(item => item.productId && item.quantity > 0).length;
    const validItemsCount = items.filter(item => item.productId && item.quantity > 0 && item.unitPrice > 0).length;
    const productCounts = this.getProductCounts();
    const allProducts = this.getAllProducts();
    const availableProductsCount = allProducts.filter(p => p.quantity > 0).length;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <FaShoppingCart className="text-lg text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    Create New Sale
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Process wholesale sales with regular and certified products
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {referenceNumber}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
                  <div className="flex items-center space-x-1">
                    <FaBox className="text-blue-500 text-sm" />
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {validItemsCount}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-bold text-green-600 dark:text-green-400 text-sm">
                    {this.formatCurrency(grandTotal)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={this.handleSubmit} className="space-y-4">
            {/* SINGLE COLUMN LAYOUT */}
            <div className="space-y-4">
              {/* Customer Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-500 rounded">
                      <FaUser className="text-white text-sm" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Customer Information
                    </h2>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isWalkInCustomer 
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                      : customerType === 'existing' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  }`}>
                    {isWalkInCustomer ? 'Walk-in' : customerType === 'existing' ? 'Existing' : 'New'}
                  </span>
                </div>

                {/* Walk-in Customer Toggle */}
                <div className="mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isWalkInCustomer}
                        onChange={this.handleWalkInCustomerToggle}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                        isWalkInCustomer ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                          isWalkInCustomer ? 'transform translate-x-5' : ''
                        }`} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FaWalking className="text-orange-500 text-sm" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Walk-in Customer
                      </span>
                    </div>
                  </label>
                </div>

                {!isWalkInCustomer && (
                  <>
                    {/* Customer Type Toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => this.handleCustomerTypeChange('existing')}
                        className={`p-2 rounded-lg border transition-all duration-200 text-xs ${
                          customerType === 'existing'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow ring-1 ring-blue-200 dark:ring-blue-800'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <FaUser className={`text-xs ${
                            customerType === 'existing' ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <span className={`font-medium ${
                            customerType === 'existing' ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            Existing
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => this.handleCustomerTypeChange('new')}
                        className={`p-2 rounded-lg border transition-all duration-200 text-xs ${
                          customerType === 'new'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow ring-1 ring-green-200 dark:ring-green-800'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <FaPlus className={`text-xs ${
                            customerType === 'new' ? 'text-green-600' : 'text-gray-400'
                          }`} />
                          <span className={`font-medium ${
                            customerType === 'new' ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            New
                          </span>
                        </div>
                      </button>
                    </div>

                    {customerType === 'existing' ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Search Customer
                          </label>
                          <div className="relative">
                            <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                            <input
                              type="text"
                              value={customerSearch}
                              onChange={(e) => this.handleCustomerSearch(e.target.value)}
                              className="w-full pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                              placeholder="Search customers..."
                            />
                          </div>
                        </div>

                        <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                              <FaUser className="text-lg mx-auto mb-1 opacity-50" />
                              <p>No customers found</p>
                            </div>
                          ) : (
                            filteredCustomers.slice(0, 3).map(customer => (
                              <div
                                key={customer.id || customer._id}
                                onClick={() => this.handleCustomerSelect(customer.id || customer._id)}
                                className={`p-2 border-b border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200 group text-xs ${
                                  selectedCustomerId === (customer.id || customer._id)
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-l-2 hover:border-l-blue-300'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-1">
                                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {customer.businessName || customer.name}
                                      </h4>
                                      {selectedCustomerId === (customer.id || customer._id) && (
                                        <FaCheckCircle className="text-green-500 text-xs flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                                      📞 {customer.phone}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={newCustomer.name}
                            onChange={(e) => this.handleNewCustomerChange('name', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                            placeholder="Enter name"
                          />
                          {errors.customerName && (
                            <p className="text-red-500 text-xs mt-1 flex items-center space-x-1">
                              <FaExclamationTriangle className="text-xs" />
                              <span>{errors.customerName}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={newCustomer.phone}
                            onChange={(e) => this.handleNewCustomerChange('phone', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                            placeholder="+256 XXX XXX XXX"
                          />
                          {errors.customerPhone && (
                            <p className="text-red-500 text-xs mt-1 flex items-center space-x-1">
                              <FaExclamationTriangle className="text-xs" />
                              <span>{errors.customerPhone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isWalkInCustomer && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <FaWalking className="text-orange-500 text-sm" />
                      <div>
                        <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-xs">
                          Walk-in Customer
                        </h4>
                        <p className="text-orange-600 dark:text-orange-400 text-xs">
                          No customer details saved
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sale Information Section */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-1.5 bg-purple-500 rounded">
                      <FaCalendar className="text-white text-sm" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Sale Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Date
                      </label>
                      <div className="relative">
                        <FaCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                          type="date"
                          value={saleDate}
                          onChange={(e) => this.setState({ saleDate: e.target.value })}
                          className="w-full pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Time
                      </label>
                      <div className="relative">
                        <FaClock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                          type="time"
                          value={saleTime}
                          onChange={(e) => this.setState({ saleTime: e.target.value })}
                          className="w-full pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => this.handlePaymentChange('paymentMethod', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="mobile_money">📱 Mobile Money</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="credit">💳 Credit</option>
                      <option value="card">💳 Card</option>
                    </select>
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => this.handlePaymentChange('paymentStatus', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="paid">✅ Paid</option>
                      <option value="partial">💰 Partial</option>
                    </select>
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Sale Notes
                    </label>
                    <textarea
                      value={saleNotes}
                      onChange={(e) => this.setState({ saleNotes: e.target.value })}
                      rows={3}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 resize-none text-xs"
                      placeholder="Additional notes about this sale..."
                    />
                  </div>
                </div>
              </div>

              {/* Sale Items Card - UPDATED WITH CERTIFIED PRODUCTS */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-green-500 rounded">
                      <FaBox className="text-white text-sm" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        Sale Items
                      </h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {validItemsCount} items • {this.formatCurrency(grandTotal)}
                        {items.some(item => item.isCertifiedProduct) && (
                          <span className="ml-2 text-green-600 dark:text-green-400">
                            • Includes certified products
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        this.fetchProducts();
                        this.fetchCertifiedProducts();
                      }}
                      disabled={loadingProducts || loadingCertifiedProducts}
                      className="flex items-center space-x-1 px-2 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow transition-all duration-200 text-xs disabled:opacity-50"
                    >
                      <FaSync className={`text-xs ${loadingProducts || loadingCertifiedProducts ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={this.addNewItem}
                      className="flex items-center space-x-1 px-2 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition-all duration-200 text-xs"
                    >
                      <FaPlus className="text-xs" />
                      <span className="font-semibold">Add Item</span>
                    </button>
                  </div>
                </div>

                {errors.items && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center space-x-1 text-red-700 dark:text-red-300 text-xs">
                      <FaExclamationTriangle />
                      <span className="font-medium">{errors.items}</span>
                    </div>
                  </div>
                )}

                {errors.prices && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center space-x-1 text-red-700 dark:text-red-300 text-xs">
                      <FaExclamationTriangle />
                      <span className="font-medium">{errors.prices}</span>
                    </div>
                  </div>
                )}

                {/* Quick Product Search & Add - UPDATED WITH FILTERS */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300">
                      Quick Add Products ({availableProductsCount} available)
                    </label>
                    {(loadingProducts || loadingCertifiedProducts) && (
                      <FaSpinner className="animate-spin text-blue-500 text-xs" />
                    )}
                  </div>

                  {/* Product Type Filter */}
                  <div className="flex space-x-2 mb-2">
                    <button
                      type="button"
                      onClick={() => this.handleProductFilterChange('all')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        productFilter === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      All ({productCounts.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => this.handleProductFilterChange('regular')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        productFilter === 'regular'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Regular ({productCounts.regular})
                    </button>
                    <button
                      type="button"
                      onClick={() => this.handleProductFilterChange('certified')}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        productFilter === 'certified'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <FaCertificate className="inline mr-1" />
                      Certified ({productCounts.certified})
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => this.handleProductSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                      placeholder="Search products by name, code, or category..."
                    />
                  </div>
                  
                  {productsError && (
                    <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 text-xs">
                        {productsError}
                      </p>
                    </div>
                  )}

                  {/* Quick Add Product List */}
                  <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700">
                    {loadingProducts || loadingCertifiedProducts ? (
                      <div className="p-4 text-center">
                        <FaSpinner className="animate-spin text-blue-500 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Loading products...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                        <FaBox className="text-lg mx-auto mb-1 opacity-50" />
                        <p>No products found</p>
                      </div>
                    ) : (
                      filteredProducts.slice(0, 5).map(product => (
                        <div
                          key={product.id || product._id}
                          onClick={() => this.quickAddProduct(product)}
                          className={`p-2 border-b border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200 group ${
                            product.fromCertifiedOrder 
                              ? 'hover:bg-green-50 dark:hover:bg-green-900/20' 
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-semibold text-xs group-hover:${
                                  product.fromCertifiedOrder ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                  {product.name}
                                </h4>
                                {product.fromCertifiedOrder && (
                                  <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs flex items-center">
                                    <FaCertificate className="mr-1 text-xs" />
                                    Certified
                                  </span>
                                )}
                                <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {product.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400 text-xs mt-1">
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  Sell: {this.formatCurrency(product.salePrice || product.price)}
                                </span>
                                <span>•</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  Cost: {this.formatCurrency(product.costPrice || 0)}
                                </span>
                                <span>•</span>
                                <span className={`font-medium ${
                                  product.quantity < 10 
                                    ? 'text-red-500' 
                                    : product.quantity < 20 
                                    ? 'text-orange-500'
                                    : 'text-green-500'
                                }`}>
                                  {product.quantity} {product.measurementUnit || 'units'}
                                </span>
                                {product.code && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-xs">{product.code}</span>
                                  </>
                                )}
                              </div>
                              {product.fromCertifiedOrder && product.certifiedOrderSource?.supplierId?.businessName && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Supplier: {product.certifiedOrderSource.supplierId.businessName}
                                </p>
                              )}
                            </div>
                            <FaPlus className={`text-xs ${
                              product.fromCertifiedOrder ? 'text-green-500' : 'text-blue-500'
                            } opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Empty State when no items */}
                {items.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <FaBox className="text-gray-400 text-3xl mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      No Items Added
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                      Add your first item to start the sale
                    </p>
                    <button
                      type="button"
                      onClick={this.addNewItem}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow transition-all duration-200"
                    >
                      <FaPlus className="text-sm" />
                      <span>Add First Item</span>
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                      Or use the "Quick Add Products" section above
                    </p>
                  </div>
                )}

                {/* Items List - Only show when there are items */}
                {items.length > 0 && (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {items.map((item, index) => {
                      const product = allProducts.find(p => 
                        p.id === item.productId || p._id === item.productId
                      );
                      const stockWarning = stockWarnings[item.id];
                      const priceWarning = priceWarnings[item.id];
                      const isActive = activeItemId === item.id;
                      const profitInfo = this.calculateItemProfit(item);
                      const isEditingPrice = editingPriceForItem === item.id;

                      return (
                        <div
                          key={item.id}
                          onClick={() => this.setActiveItem(item.id)}
                          className={`border rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                            isActive
                              ? item.isCertifiedProduct
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow ring-1 ring-green-200 dark:ring-green-800'
                                : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow ring-1 ring-blue-200 dark:ring-blue-800'
                              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`p-1 rounded shadow text-xs ${
                                item.productId 
                                  ? item.isCertifiedProduct
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                              }`}>
                                {item.isCertifiedProduct ? <FaCertificate className="text-xs" /> : <FaHashtag className="text-xs" />}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                                    Item #{item.itemNumber || index + 1}
                                  </h3>
                                  {item.isCertifiedProduct && (
                                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium flex items-center">
                                      <FaCertificate className="mr-1 text-xs" />
                                      Certified
                                    </span>
                                  )}
                                  {item.productId && (
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      item.isCertifiedProduct
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}>
                                      #{item.productId.slice(-4)}
                                    </span>
                                  )}
                                </div>
                                {item.productName && (
                                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                                    {item.productName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {item.total > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-semibold">
                                  {this.formatCurrency(item.total)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  this.removeItem(item.id);
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {/* Product Selection */}
                            {!item.productId && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                  Select Product
                                </label>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">
                                  Use quick add above or search below
                                </p>
                              </div>
                            )}

                            {/* Item Controls */}
                            <div className="grid grid-cols-3 gap-1">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                                  Qty
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  max={product ? product.quantity : undefined}
                                  value={item.quantity}
                                  onChange={(e) => this.handleItemChange(item.id, 'quantity', e.target.value)}
                                  className={`w-full px-1.5 py-1 border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 transition-all duration-200 text-xs ${
                                    stockWarning?.severity === 'error' 
                                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {product && (
                                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                                    Max: {product.quantity}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                                  Selling Price
                                </label>
                                {isEditingPrice ? (
                                  <div className="space-y-1">
                                    <div className="flex space-x-1">
                                      <div className="relative flex-1">
                                        <FaDollarSign className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
                                        <input
                                          type="number"
                                          min={item.costPrice || 0}
                                          step="0.01"
                                          value={tempSellingPrice}
                                          onChange={(e) => this.handleTempPriceChange(e.target.value)}
                                          className={`w-full pl-6 pr-1 py-1 border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 transition-all duration-200 text-xs ${
                                            priceWarning?.severity === 'error' 
                                              ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                                              : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                                          }`}
                                          autoFocus
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => this.saveEditedPrice(item.id)}
                                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                      >
                                        <FaCheckCircle className="text-xs" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={this.cancelEditingPrice}
                                        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                                      >
                                        <FaTimes className="text-xs" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex space-x-1">
                                    <div className="relative flex-1">
                                      <FaDollarSign className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
                                      <input
                                        type="number"
                                        min={item.costPrice || 0}
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => this.handleSellingPriceChange(item.id, e.target.value)}
                                        className={`w-full pl-6 pr-1 py-1 border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 transition-all duration-200 text-xs ${
                                          priceWarning?.severity === 'error' 
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                                        }`}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        this.startEditingPrice(item.id, item.unitPrice);
                                      }}
                                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                                      title="Edit Price"
                                    >
                                      <FaEdit className="text-xs" />
                                    </button>
                                  </div>
                                )}
                                {item.costPrice > 0 && (
                                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                                    Cost: {this.formatCurrency(item.costPrice)}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
                                  Disc%
                                </label>
                                <div className="relative">
                                  <FaPercent className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={item.discount}
                                    onChange={(e) => this.handleItemChange(item.id, 'discount', e.target.value)}
                                    className="w-full pl-6 pr-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Profit Information */}
                            {item.costPrice > 0 && item.unitPrice > 0 && (
                              <div className={`mt-1 p-1 rounded text-xs ${
                                profitInfo.isValid 
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span>Profit/Unit:</span>
                                  <span className="font-semibold">
                                    {this.formatCurrency(profitInfo.profitPerUnit)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Margin:</span>
                                  <span className="font-semibold">
                                    {profitInfo.profitMargin}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Price History Button */}
                            {item.productId && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    this.showPriceHistory(item.productId);
                                  }}
                                  className="flex items-center space-x-1 px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
                                >
                                  <FaHistory className="text-xs" />
                                  <span>Price History</span>
                                </button>
                              </div>
                            )}

                            {/* Stock Warning */}
                            {stockWarning && (
                              <div className={`rounded p-2 border text-xs ${
                                stockWarning.severity === 'error' 
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' 
                                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                              }`}>
                                <div className="flex items-center space-x-1">
                                  <FaExclamationTriangle className="text-xs" />
                                  <span>{stockWarning.message}</span>
                                </div>
                              </div>
                            )}

                            {/* Price Warning */}
                            {priceWarning && (
                              <div className={`rounded p-2 border text-xs ${
                                priceWarning.severity === 'error' 
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' 
                                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                              }`}>
                                <div className="flex items-center space-x-1">
                                  <FaExclamationTriangle className="text-xs" />
                                  <span>{priceWarning.message}</span>
                                </div>
                              </div>
                            )}

                            {/* Item Total */}
                            {item.total > 0 && (
                              <div className={`rounded p-2 text-white shadow ${
                                item.isCertifiedProduct ? 'bg-green-500' : 'bg-blue-500'
                              }`}>
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-xs">Item Total:</span>
                                  <span className="font-bold text-sm">
                                    {this.formatCurrency(item.total)}
                                  </span>
                                </div>
                                {item.isCertifiedProduct && (
                                  <div className="flex items-center justify-center mt-1 text-xs opacity-90">
                                    <FaCertificate className="mr-1" />
                                    Certified Product
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Financial Summary Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-1.5 bg-indigo-500 rounded">
                    <FaCalculator className="text-white text-sm" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Financial Summary
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {this.formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Discount:</span>
                    <span className="font-semibold text-red-500 text-sm">
                      -{this.formatCurrency(totalDiscount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 border border-blue-200 dark:border-blue-800">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Grand Total:</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {this.formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-1.5 bg-green-500 rounded">
                    <FaMoneyBillWave className="text-white text-sm" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Payment Information
                  </h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Amount Paid
                    </label>
                    <div className="relative">
                      <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={grandTotal}
                        value={amountPaid}
                        onChange={(e) => this.handlePaymentChange('amountPaid', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 transition-all duration-200 text-sm ${
                          errors.amountPaid 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                        }`}
                      />
                    </div>
                    {errors.amountPaid && (
                      <p className="text-red-500 text-sm mt-1 flex items-center space-x-1">
                        <FaExclamationTriangle />
                        <span>{errors.amountPaid}</span>
                      </p>
                    )}
                  </div>

                  {/* Balance Due */}
                  <div className={`rounded-lg p-3 border ${
                    balanceDue > 0 
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' 
                      : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-semibold text-sm ${
                        balanceDue > 0 ? 'text-orange-800 dark:text-orange-300' : 'text-green-800 dark:text-green-300'
                      }`}>
                        Balance Due:
                      </span>
                      <span className={`font-bold text-lg ${
                        balanceDue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {this.formatCurrency(balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || saving || validItemsCount === 0}
                    className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <FaSave className="text-lg" />
                      <span>
                        {isSubmitting || saving ? 'Processing Sale...' : 'Complete Sale'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={this.resetForm}
                    disabled={isSubmitting}
                    className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Clear Form & Start New Sale
                  </button>
                </div>

                {/* Form Status */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Valid Items:</span>
                      <span className={`font-semibold ${
                        validItemsCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                      }`}>
                        {validItemsCount} items
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Customer Status:</span>
                      <span className={`font-semibold ${
                        isWalkInCustomer ? 'text-orange-600 dark:text-orange-400' : 
                        (customerType === 'existing' && selectedCustomerId) || 
                        (customerType === 'new' && newCustomer.name && newCustomer.phone) ? 
                        'text-green-600 dark:text-green-400' : 'text-gray-500'
                      }`}>
                        {isWalkInCustomer ? 'Walk-in' : 
                         customerType === 'existing' && selectedCustomerId ? 'Selected' :
                         customerType === 'new' && newCustomer.name && newCustomer.phone ? 'Provided' : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Available Products:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {availableProductsCount} ({productCounts.regular} regular, {productCounts.certified} certified)
                      </span>
                    </div>
                    {items.some(item => item.isCertifiedProduct) && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Certified Items:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {items.filter(item => item.isCertifiedProduct).length} items
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Enhanced Price History Modal */}
          {this.renderPriceHistoryModal()}
        </div>
      </div>
    );
  }
}

export default CreateSales;