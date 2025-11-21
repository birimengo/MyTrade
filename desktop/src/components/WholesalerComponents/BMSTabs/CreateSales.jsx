import React, { Component } from 'react';
import { 
  FaUser, FaBox, FaCalculator, FaMoneyBillWave, FaFileInvoice,
  FaPlus, FaTrash, FaSave, FaSearch, FaExclamationTriangle,
  FaCalendar, FaClock, FaCheckCircle, FaInfoCircle, FaPercent,
  FaShoppingCart, FaReceipt, FaTag, FaWalking, FaSpinner,
  FaSync, FaDollarSign, FaEdit, FaHistory, FaHashtag,
  FaArrowUp, FaArrowDown, FaTimes, FaFilter, FaChevronLeft,
  FaChevronRight, FaMinus, FaDatabase, FaExclamationCircle,
  FaLayerGroup, FaEye, FaEyeSlash, FaChevronDown
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
      
      // Sale Items
      items: [],
      
      // Products & Search
      products: [],
      filteredProducts: [],
      productSearch: '',
      customerSearch: '',
      
      // Loading States
      loadingProducts: false,
      productsError: null,
      
      // Financials
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
      
      // Price Editing
      editingPriceForItem: null,
      tempSellingPrice: '',

      // Enhanced product management
      allProducts: [],
      availableProducts: [],
      showOutOfStock: true,
      productsDebugInfo: {
        total: 0,
        available: 0,
        outOfStock: 0,
        certified: 0,
        manual: 0
      },

      // New states for better UX
      showProductPanel: true,
      productSearchFocus: false,
      customerPanelExpanded: true,
      itemsPanelExpanded: true,

      // Fix: Add submission timeout tracker
      submissionTimeout: null,
      lastSubmissionTime: null
    };
  }

  // ==================== LIFECYCLE METHODS ====================

  componentDidMount() {
    this.generateReferenceNumber();
    this.initializeProductsFromProps();
    
    // Fix: Add event listener for beforeunload to clean up timeouts
    window.addEventListener('beforeunload', this.cleanupTimeouts);
  }

  componentWillUnmount() {
    // Fix: Clean up any pending timeouts
    this.cleanupTimeouts();
    window.removeEventListener('beforeunload', this.cleanupTimeouts);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.products !== this.props.products) {
      this.initializeProductsFromProps();
    }

    // Fix: Auto-reset if stuck in submitting state for too long
    if (this.state.isSubmitting && this.state.lastSubmissionTime) {
      const timeSinceSubmission = Date.now() - this.state.lastSubmissionTime;
      if (timeSinceSubmission > 30000) { // 30 seconds timeout
        console.warn('🔄 Auto-resetting stuck submission state after 30 seconds');
        this.setState({ 
          isSubmitting: false,
          submissionTimeout: null,
          lastSubmissionTime: null 
        });
      }
    }
  }

  // ==================== UTILITY METHODS ====================

  cleanupTimeouts = () => {
    if (this.state.submissionTimeout) {
      clearTimeout(this.state.submissionTimeout);
    }
  }

  generateReferenceNumber = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const referenceNumber = `SALE-${timestamp}-${random}`;
    this.setState({ referenceNumber });
  };

  formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  // Fix: Force enable editing method
  forceEnableEditing = () => {
    console.log('🔄 Manually forcing edit mode enabled');
    this.setState({
      isSubmitting: false,
      submissionTimeout: null,
      lastSubmissionTime: null
    });
  }

  // ==================== PRODUCT MANAGEMENT ====================

  initializeProductsFromProps = () => {
    const { products = [] } = this.props;
    
    const allProducts = products;
    const availableProducts = allProducts.filter(product => (product.quantity || 0) > 0);
    
    const productsDebugInfo = {
      total: allProducts.length,
      available: availableProducts.length,
      outOfStock: allProducts.length - availableProducts.length,
      certified: allProducts.filter(p => p.fromCertifiedOrder).length,
      manual: allProducts.filter(p => !p.fromCertifiedOrder).length
    };

    const filteredProducts = this.filterProducts('', allProducts);

    this.setState({
      allProducts: allProducts,
      products: allProducts,
      filteredProducts: filteredProducts,
      productsDebugInfo: productsDebugInfo
    });
  };

  toggleShowOutOfStock = () => {
    this.setState(prevState => {
      const showOutOfStock = !prevState.showOutOfStock;
      const productsToUse = showOutOfStock ? prevState.allProducts : prevState.allProducts.filter(p => p.quantity > 0);
      const filteredProducts = this.filterProducts(prevState.productSearch, productsToUse);
      
      return {
        showOutOfStock,
        products: productsToUse,
        filteredProducts: filteredProducts
      };
    });
  };

  filterProducts = (searchTerm = '', customProducts = null) => {
    const products = customProducts || this.state.products;
    
    let filtered = products;

    if (searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm, 'i');
      filtered = filtered.filter(product => 
        product.name?.match(searchRegex) ||
        product.category?.match(searchRegex) ||
        product.code?.match(searchRegex) ||
        product.sku?.match(searchRegex) ||
        product.description?.match(searchRegex)
      );
    }
    
    return filtered;
  };

  getProductCounts = () => {
    const availableProducts = this.state.allProducts.filter(p => p.quantity > 0);
    const outOfStockProducts = this.state.allProducts.filter(p => p.quantity <= 0);
    
    return {
      total: this.state.allProducts.length,
      available: availableProducts.length,
      outOfStock: outOfStockProducts.length,
      certified: this.state.allProducts.filter(p => p.fromCertifiedOrder).length,
      manual: this.state.allProducts.filter(p => !p.fromCertifiedOrder).length
    };
  };

  quickAddProduct = (product) => {
    const productId = product.id || product._id;
    
    const initialUnitPrice = product.salePrice || product.price || product.sellingPrice || 0;
    
    let costPrice = product.costPrice || 0.01;
    costPrice = Math.max(0.01, costPrice);
    
    const newItem = {
      id: Date.now() + Math.random(),
      productId: productId,
      productName: product.name,
      quantity: 1,
      unitPrice: initialUnitPrice,
      costPrice: costPrice,
      discount: 0,
      total: initialUnitPrice,
      itemNumber: this.state.items.length + 1,
      isCertified: product.fromCertifiedOrder || false
    };
    
    this.setState(prevState => ({
      items: [...prevState.items, newItem],
      activeItemId: newItem.id,
      productSearch: '',
      filteredProducts: this.filterProducts('')
    }), this.calculateTotals);
  };

  // ==================== CUSTOMER MANAGEMENT ====================

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
        return {
          isWalkInCustomer: true,
          newCustomer: {
            name: 'Walk-in Customer',
            phone: '0000000000',
            email: '',
            address: '',
            businessName: 'Walk-in Customer'
          },
          customerType: 'walk-in',
          selectedCustomerId: '',
          errors: { ...prevState.errors, customerName: undefined, customerPhone: undefined }
        };
      } else {
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

  // ==================== PRODUCT SEARCH & FILTER ====================

  handleProductSearch = (searchTerm) => {
    this.setState({ 
      productSearch: searchTerm,
      filteredProducts: this.filterProducts(searchTerm)
    });
  }

  // ==================== ITEM MANAGEMENT ====================

  addNewItem = () => {
    const newItem = {
      id: Date.now() + Math.random(),
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      costPrice: 0.01,
      discount: 0,
      total: 0,
      itemNumber: this.state.items.length + 1,
      isCertified: false
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

  handleProductSelect = (itemId, productId) => {
    const product = this.state.allProducts.find(p => p.id === productId || p._id === productId);
    
    if (product) {
      const productId = product.id || product._id;
      
      const initialUnitPrice = product.salePrice || product.price || product.sellingPrice || 0;
      
      let costPrice = product.costPrice || 0.01;
      costPrice = Math.max(0.01, costPrice);
      
      this.setState(prevState => ({
        items: prevState.items.map(item => {
          if (item.id === itemId) {
            const quantity = parseFloat(item.quantity) || 1;
            const unitPrice = initialUnitPrice;
            const discount = parseFloat(item.discount) || 0;
            
            const itemSubtotal = quantity * unitPrice;
            const discountAmount = itemSubtotal * (discount / 100);
            
            return {
              ...item,
              productId: productId,
              productName: product.name,
              unitPrice: unitPrice,
              costPrice: costPrice,
              quantity: Math.min(quantity, product.quantity || 0),
              discount: discount,
              total: Math.max(0, itemSubtotal - discountAmount),
              itemNumber: item.itemNumber || prevState.items.indexOf(item) + 1,
              isCertified: product.fromCertifiedOrder || false
            };
          }
          return item;
        })
      }), this.calculateTotals);
    }
  };

  setActiveItem = (itemId) => {
    this.setState({ activeItemId: itemId });
  };

  // ==================== PRICE MANAGEMENT ====================

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

    const costPrice = parseFloat(item.costPrice) || 0.01;
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

    this.handleItemChange(itemId, 'unitPrice', tempSellingPrice);
    this.cancelEditingPrice();
  };

  handleTempPriceChange = (value) => {
    this.setState({ tempSellingPrice: value });
  };

  handleSellingPriceChange = (itemId, newPrice) => {
    const item = this.state.items.find(item => item.id === itemId);
    if (!item) return;

    const costPrice = parseFloat(item.costPrice) || 0.01;
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

  // ==================== FINANCIAL CALCULATIONS ====================

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

  calculateItemProfit = (item) => {
    const cost = parseFloat(item.costPrice) || 0.01;
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

  // ==================== PAYMENT HANDLING ====================

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

  // ==================== VALIDATION METHODS ====================

  validateStock = () => {
    const { items } = this.state;
    const stockWarnings = {};
    let hasStockIssues = false;

    items.forEach((item) => {
      if (item.productId) {
        const product = this.state.allProducts.find(p => 
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

  validateSellingPrices = () => {
    const { items } = this.state;
    const priceWarnings = {};
    let hasPriceErrors = false;

    items.forEach((item) => {
      if (item.costPrice && item.unitPrice < item.costPrice) {
        priceWarnings[item.id] = {
          message: `Selling price cannot be less than cost price (${this.formatCurrency(item.costPrice)})`,
          severity: 'error'
        };
        hasPriceErrors = true;
      }
    });

    this.setState({ priceWarnings });
    return !hasPriceErrors;
  };

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
    const validItems = items.filter(item => {
      const hasProduct = item.productId && item.quantity > 0;
      return hasProduct && item.unitPrice > 0;
    });
    
    if (validItems.length === 0) {
      errors.items = 'At least one valid sale item is required';
    }

    if (!this.validateStock()) {
      errors.stock = 'Some items have insufficient stock';
    }

    if (!this.validateSellingPrices()) {
      errors.prices = 'Some items have invalid selling prices';
    }

    if (this.state.paymentStatus === 'partial' && this.state.amountPaid <= 0) {
      errors.amountPaid = 'Amount paid must be greater than 0 for partial payments';
    }

    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  // ==================== FORM SUBMISSION ====================

  handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }

    console.log('🚀 Starting sale submission...');
    
    // Fix: Set submission time for timeout tracking
    this.setState({ 
      isSubmitting: true,
      lastSubmissionTime: Date.now()
    });

    // Fix: Set a safety timeout to auto-reset if submission hangs
    const submissionTimeout = setTimeout(() => {
      console.warn('⏰ Submission timeout - resetting form state');
      this.setState({ 
        isSubmitting: false,
        submissionTimeout: null,
        lastSubmissionTime: null
      });
      alert('Sale submission timed out. The form is now editable again.');
    }, 45000); // 45 second timeout

    this.setState({ submissionTimeout });

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
          isCertified: item.isCertified || false
        })),

        subtotal: this.state.subtotal,
        totalDiscount: this.state.totalDiscount,
        grandTotal: this.state.grandTotal,
        amountPaid: parseFloat(this.state.amountPaid) || 0,
        balanceDue: this.state.balanceDue,

        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      console.log('📤 Sending sale data to parent...');

      if (this.props.onSaveSale) {
        // Fix: Add timeout to the parent call
        const savePromise = this.props.onSaveSale(saleData);
        
        // Wait for the save with timeout
        await Promise.race([
          savePromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Save operation timeout')), 40000)
          )
        ]);

        console.log('✅ Sale saved successfully, resetting form...');
        this.resetForm();
      } else {
        // Demo mode with shorter timeout
        setTimeout(() => {
          alert('Sale completed successfully in demo mode!');
          this.resetForm();
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ Error saving sale:', error);
      this.setState({ 
        isSubmitting: false,
        submissionTimeout: null,
        lastSubmissionTime: null,
        errors: { 
          ...this.state.errors, 
          submit: 'Failed to save sale. Please try again.' 
        }
      });
      
      // Fix: Show specific error message
      if (error.message === 'Save operation timeout') {
        alert('Sale submission timed out. Please check your connection and try again.');
      } else {
        alert(`Error saving sale: ${error.message}`);
      }
    } finally {
      // Fix: Always clear timeout and reset state
      clearTimeout(this.state.submissionTimeout);
      if (this.state.isSubmitting) {
        this.setState({ 
          isSubmitting: false,
          submissionTimeout: null,
          lastSubmissionTime: null
        });
      }
    }
  };

  resetForm = () => {
    console.log('🔄 Resetting form...');
    this.setState({
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
      saleDate: new Date().toISOString().split('T')[0],
      saleTime: new Date().toTimeString().slice(0, 5),
      referenceNumber: `SALE-${Date.now()}`,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      saleNotes: '',
      items: [],
      productSearch: '',
      customerSearch: '',
      subtotal: 0,
      totalDiscount: 0,
      grandTotal: 0,
      amountPaid: 0,
      balanceDue: 0,
      errors: {},
      isSubmitting: false,
      stockWarnings: {},
      priceWarnings: {},
      activeItemId: null,
      editingPriceForItem: null,
      tempSellingPrice: '',
      submissionTimeout: null,
      lastSubmissionTime: null
    });
  };

  // ==================== UI TOGGLE METHODS ====================

  toggleProductPanel = () => {
    this.setState(prevState => ({
      showProductPanel: !prevState.showProductPanel
    }));
  };

  toggleCustomerPanel = () => {
    this.setState(prevState => ({
      customerPanelExpanded: !prevState.customerPanelExpanded
    }));
  };

  toggleItemsPanel = () => {
    this.setState(prevState => ({
      itemsPanelExpanded: !prevState.itemsPanelExpanded
    }));
  };

  // ==================== EMERGENCY FIX BUTTON ====================

  renderEmergencyFixButton = () => {
    if (this.state.isSubmitting) {
      return (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaExclamationTriangle className="text-red-500" />
              <span className="text-sm font-medium text-red-800 dark:text-red-300">
                Form seems to be stuck submitting
              </span>
            </div>
            <button
              type="button"
              onClick={this.forceEnableEditing}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
            >
              Force Enable Editing
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // ==================== RENDER METHODS ====================

  renderCustomerSection = () => {
    const { 
      customerType, 
      selectedCustomerId, 
      newCustomer, 
      isWalkInCustomer, 
      customerSearch,
      errors,
      customerPanelExpanded
    } = this.state;

    const filteredCustomers = this.getFilteredCustomers();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={this.toggleCustomerPanel}>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500 rounded">
              <FaUser className="text-white text-sm" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Customer Information
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isWalkInCustomer 
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                : customerType === 'existing' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {isWalkInCustomer ? 'Walk-in' : customerType === 'existing' ? 'Existing' : 'New'}
            </span>
            {customerPanelExpanded ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
          </div>
        </div>

        {customerPanelExpanded && (
          <>
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
                        filteredCustomers.slice(0, 5).map(customer => (
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

            {this.renderSaleInformationSection()}
          </>
        )}
      </div>
    );
  };

  renderSaleInformationSection = () => {
    const { saleDate, saleTime, paymentMethod, paymentStatus, saleNotes } = this.state;

    return (
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
    );
  };

  renderProductSearchSection = () => {
    const { 
      productSearch, 
      filteredProducts, 
      loadingProducts,
      showOutOfStock,
      showProductPanel
    } = this.state;

    const productCounts = this.getProductCounts();

    return (
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={this.toggleProductPanel}>
          <div>
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300">
              Quick Add Products 
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {productCounts.available} available • {productCounts.total} total
              </span>
              {productCounts.outOfStock > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.toggleShowOutOfStock();
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    showOutOfStock
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                  }`}
                >
                  {showOutOfStock ? 'Hide' : 'Show'} Out of Stock ({productCounts.outOfStock})
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {loadingProducts && (
              <FaSpinner className="animate-spin text-blue-500 text-xs" />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (this.props.onRefreshProducts) {
                  this.props.onRefreshProducts();
                }
              }}
              className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
              title="Refresh Products"
            >
              <FaSync className="text-xs" />
            </button>
            {showProductPanel ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
          </div>
        </div>

        {showProductPanel && (
          <>
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

            {/* Products Debug Info */}
            <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-semibold">{productCounts.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Available:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{productCounts.available}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Certified:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{productCounts.certified}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Manual:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">{productCounts.manual}</span>
                </div>
              </div>
            </div>

            {/* Enhanced Product List with Scroll */}
            <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700">
              {loadingProducts ? (
                <div className="p-4 text-center">
                  <FaSpinner className="animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                  <FaBox className="text-lg mx-auto mb-1 opacity-50" />
                  <p>No products found</p>
                  {productSearch && (
                    <p className="mt-1">Try a different search term</p>
                  )}
                </div>
              ) : (
                filteredProducts.map((product, index) => {
                  const isOutOfStock = product.quantity <= 0;
                  const isCertified = product.fromCertifiedOrder;
                  
                  return (
                    <div
                      key={product.id || product._id}
                      className={`p-2 border-b border-gray-200 dark:border-gray-600 transition-all duration-200 group ${
                        isOutOfStock
                          ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      {/* Make the entire product item clickable but don't interfere with other interactions */}
                      <div 
                        onClick={() => !isOutOfStock && this.quickAddProduct(product)}
                        className="w-full h-full"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`font-semibold text-xs ${
                                isOutOfStock
                                  ? 'text-gray-500'
                                  : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              }`}>
                                {product.name}
                              </h4>
                              <div className="flex items-center space-x-1">
                                {isCertified && (
                                  <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                    Certified
                                  </span>
                                )}
                                <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {product.category}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400 text-xs mt-1">
                              <span className="font-medium text-green-600 dark:text-green-400">
                                Sell: {this.formatCurrency(product.salePrice || product.price)}
                              </span>
                              <span>•</span>
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                Cost: {this.formatCurrency(product.costPrice || 0.01)}
                              </span>
                              <span>•</span>
                              <span className={`font-medium ${
                                isOutOfStock
                                  ? 'text-red-500'
                                  : product.quantity < 10 
                                  ? 'text-orange-500' 
                                  : product.quantity < 20 
                                  ? 'text-yellow-500'
                                  : 'text-green-500'
                              }`}>
                                {product.quantity} {product.measurementUnit || 'units'}
                                {isOutOfStock && ' (Out of Stock)'}
                              </span>
                            </div>
                          </div>
                          {!isOutOfStock && (
                            <FaPlus className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Show more products indicator */}
            {filteredProducts.length > 0 && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {filteredProducts.length} products
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  renderItemsSection = () => {
    const { 
      items, 
      errors, 
      stockWarnings, 
      priceWarnings, 
      activeItemId,
      editingPriceForItem,
      tempSellingPrice,
      itemsPanelExpanded
    } = this.state;

    const validItemsCount = items.filter(item => item.productId && item.quantity > 0 && item.unitPrice > 0).length;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={this.toggleItemsPanel}>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-500 rounded">
              <FaBox className="text-white text-sm" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Sale Items
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {validItemsCount} items • {this.formatCurrency(this.state.grandTotal)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {itemsPanelExpanded ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
          </div>
        </div>

        {itemsPanelExpanded && (
          <>
            {errors.items && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-1 text-red-700 dark:text-red-300 text-xs">
                  <FaExclamationTriangle />
                  <span className="font-medium">{errors.items}</span>
                </div>
              </div>
            )}

            {this.renderProductSearchSection()}

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
              </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {items.map((item, index) => this.renderItem(item, index))}
              </div>
            )}

            {/* Add Item Button */}
            {items.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={this.addNewItem}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-green-500 hover:text-green-500 transition-all duration-200"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <FaPlus className="text-sm" />
                    <span>Add Another Item</span>
                  </div>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  renderItem = (item, index) => {
    const product = this.state.allProducts.find(p => 
      p.id === item.productId || p._id === item.productId
    );
    const stockWarning = this.state.stockWarnings[item.id];
    const priceWarning = this.state.priceWarnings[item.id];
    const isActive = this.state.activeItemId === item.id;
    const profitInfo = this.calculateItemProfit(item);
    const isEditingPrice = this.state.editingPriceForItem === item.id;

    return (
      <div
        key={item.id}
        className={`border rounded-lg p-3 transition-all duration-200 ${
          isActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow ring-1 ring-blue-200 dark:ring-blue-800'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
        }`}
      >
        {/* Item Header - Clickable area for activation */}
        <div
          onClick={() => this.setActiveItem(item.id)}
          className="flex items-start justify-between mb-2 cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded shadow text-xs ${
              item.productId 
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
            }`}>
              <FaHashtag className="text-xs" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Item #{item.itemNumber || index + 1}
              </h3>
              {item.productName && (
                <div className="flex items-center space-x-2">
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    {item.productName}
                  </p>
                  {item.isCertified && (
                    <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                      Certified
                    </span>
                  )}
                </div>
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

        <div className="space-y-3">
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

          {/* Item Controls - NO CLICK HANDLERS on inputs */}
          <div className="space-y-3">
            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                step="1"
                max={product ? product.quantity : undefined}
                value={item.quantity}
                onChange={(e) => this.handleItemChange(item.id, 'quantity', e.target.value)}
                onFocus={() => this.setActiveItem(item.id)}
                className={`w-full px-2 py-1.5 border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 transition-all duration-200 text-xs ${
                  stockWarning?.severity === 'error' 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                }`}
              />
              {product && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Maximum available: {product.quantity} {product.measurementUnit || 'units'}
                </p>
              )}
            </div>

            {/* Selling Price Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Selling Price
              </label>
              {isEditingPrice ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <FaDollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
                      <input
                        type="number"
                        min={item.costPrice || 0.01}
                        step="0.01"
                        value={this.state.tempSellingPrice}
                        onChange={(e) => this.handleTempPriceChange(e.target.value)}
                        onFocus={() => this.setActiveItem(item.id)}
                        className={`w-full pl-7 pr-2 py-1.5 border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 transition-all duration-200 text-xs ${
                          priceWarning?.severity === 'error' 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                        }`}
                        autoFocus
                      />
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => this.saveEditedPrice(item.id)}
                        className="px-2 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors flex items-center"
                      >
                        <FaCheckCircle className="text-xs mr-1" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={this.cancelEditingPrice}
                        className="px-2 py-1.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors flex items-center"
                      >
                        <FaTimes className="text-xs mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                  {priceWarning && (
                    <div className={`rounded p-2 text-xs ${
                      priceWarning.severity === 'error' 
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' 
                        : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                    }`}>
                      <div className="flex items-center space-x-1">
                        <FaExclamationTriangle className="text-xs" />
                        <span>{priceWarning.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <FaDollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
                    <input
                      type="number"
                      min={item.costPrice || 0.01}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => this.handleSellingPriceChange(item.id, e.target.value)}
                      onFocus={() => this.setActiveItem(item.id)}
                      className={`w-full pl-7 pr-2 py-1.5 border rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-1 transition-all duration-200 text-xs ${
                        priceWarning?.severity === 'error' 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30' 
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/30'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      this.startEditingPrice(item.id, item.unitPrice);
                    }}
                    className="px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center"
                    title="Edit Price"
                  >
                    <FaEdit className="text-xs mr-1" />
                    Edit
                  </button>
                </div>
              )}
              {item.costPrice > 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Cost price: {this.formatCurrency(item.costPrice)}
                </p>
              )}
            </div>

            {/* Discount Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Discount (%)
              </label>
              <div className="relative">
                <FaPercent className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={item.discount}
                  onChange={(e) => this.handleItemChange(item.id, 'discount', e.target.value)}
                  onFocus={() => this.setActiveItem(item.id)}
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all duration-200 text-xs"
                />
              </div>
              {item.discount > 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Discount amount: {this.formatCurrency((item.quantity * item.unitPrice * item.discount) / 100)}
                </p>
              )}
            </div>
          </div>

          {/* Profit Information */}
          {item.costPrice > 0 && item.unitPrice > 0 && (
            <div className={`mt-2 p-2 rounded text-xs ${
              profitInfo.isValid 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Profit per Unit:</span>
                  <span className="font-semibold ml-1">
                    {this.formatCurrency(profitInfo.profitPerUnit)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total Profit:</span>
                  <span className="font-semibold ml-1">
                    {this.formatCurrency(profitInfo.totalProfit)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Profit Margin:</span>
                  <span className="font-semibold ml-1">
                    {profitInfo.profitMargin}%
                  </span>
                </div>
              </div>
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

          {/* Item Total */}
          {item.total > 0 && (
            <div className="rounded p-2 bg-blue-500 text-white shadow">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs">Item Total:</span>
                <span className="font-bold text-sm">
                  {this.formatCurrency(item.total)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  renderFinancialSummary = () => {
    const { subtotal, totalDiscount, grandTotal } = this.state;

    return (
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
    );
  };

  renderPaymentSection = () => {
    const { amountPaid, balanceDue, paymentStatus, errors } = this.state;

    return (
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
                max={this.state.grandTotal}
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
    );
  };

  renderActionButtons = () => {
    const { isSubmitting } = this.state;
    const validItemsCount = this.state.items.filter(item => item.productId && item.quantity > 0 && item.unitPrice > 0).length;
    const productCounts = this.getProductCounts();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting || validItemsCount === 0}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
          >
            <div className="flex items-center justify-center space-x-2">
              <FaSave className="text-lg" />
              <span>
                {isSubmitting ? 'Processing Sale...' : 'Complete Sale'}
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
              <span className="text-gray-600 dark:text-gray-400">Available Products:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {productCounts.available}/{productCounts.total} products
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Certified Products:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {productCounts.certified}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const productCounts = this.getProductCounts();

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header Section */}
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
                    Process wholesale sales efficiently
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Products</p>
                  <div className="flex items-center space-x-1">
                    <FaLayerGroup className="text-blue-500 text-sm" />
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {productCounts.available}/{productCounts.total}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reference</p>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {this.state.referenceNumber}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
                  <div className="flex items-center space-x-1">
                    <FaBox className="text-blue-500 text-sm" />
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {this.state.items.filter(item => item.productId && item.quantity > 0 && item.unitPrice > 0).length}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-bold text-green-600 dark:text-green-400 text-sm">
                    {this.formatCurrency(this.state.grandTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Products Summary */}
            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Products:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{productCounts.total}</p>
                </div>
                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">Available:</span>
                  <p className="font-semibold text-green-600 dark:text-green-400">{productCounts.available}</p>
                </div>
                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">Certified:</span>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">{productCounts.certified}</p>
                </div>
                <div className="text-center">
                  <span className="text-gray-600 dark:text-gray-400">Manual:</span>
                  <p className="font-semibold text-purple-600 dark:text-purple-400">{productCounts.manual}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Fix Button */}
          {this.renderEmergencyFixButton()}

          <form onSubmit={this.handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column - Customer & Sale Info */}
              <div className="lg:col-span-1 space-y-4">
                {this.renderCustomerSection()}
              </div>

              {/* Middle Column - Items & Products */}
              <div className="lg:col-span-1 space-y-4">
                {this.renderItemsSection()}
              </div>

              {/* Right Column - Financial Summary & Actions */}
              <div className="lg:col-span-1 space-y-4">
                {this.renderFinancialSummary()}
                {this.renderPaymentSection()}
                {this.renderActionButtons()}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default CreateSales;