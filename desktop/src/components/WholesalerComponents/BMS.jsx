// src/components/WholesalerComponents/BMS.jsx
import React, { useState, useEffect } from 'react';
import { FaChartBar, FaSync, FaBox, FaUsers, FaShoppingCart, FaCertificate } from 'react-icons/fa';
import { CreateSales, Sales, Receipts, Analytics } from './BMSTabs';
import { useAuth } from '../../context/AuthContext';

const BMS = ({ isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const [activeSection, setActiveSection] = useState('create-sales');
  const [wholesaleSales, setWholesaleSales] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [certifiedProducts, setCertifiedProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

  // Business metrics state
  const [businessMetrics, setBusinessMetrics] = useState({
    revenue: { current: 0, previous: 0, trend: 'up' },
    profit: { current: 0, previous: 0, trend: 'up' },
    customers: { current: 0, previous: 0, trend: 'up' },
    inventoryValue: { current: 0, previous: 0, trend: 'up' },
    orders: { current: 0, previous: 0, trend: 'up' },
    stockLevel: { current: 0, previous: 0, trend: 'down' },
    certifiedProducts: { current: 0, previous: 0, trend: 'up' }
  });

  // Fetch products from database
  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products...');
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Loaded ${data.products?.length || 0} products`);
          setProducts(data.products || []);
          return { status: 'success', count: data.products?.length || 0 };
        } else {
          console.warn('⚠️ Products API returned success:false');
          return { status: 'error', error: data.message };
        }
      } else {
        console.warn('⚠️ Products API returned non-OK response:', response.status);
        return { status: 'error', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return { status: 'error', error: error.message };
    }
  };

  // Fetch certified products
  const fetchCertifiedProducts = async () => {
    try {
      console.log('🔄 Fetching certified products...');
      const response = await fetch(`${API_BASE_URL}/api/certified-orders/products`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Loaded ${data.products?.length || 0} certified products`);
          setCertifiedProducts(data.products || []);
          return { status: 'success', count: data.products?.length || 0 };
        } else {
          console.warn('⚠️ Certified products API returned success:false');
          return { status: 'error', error: data.message };
        }
      } else {
        console.warn('⚠️ Certified products API returned non-OK response:', response.status);
        // Return empty array for certified products if endpoint not available
        setCertifiedProducts([]);
        return { status: 'success', count: 0 };
      }
    } catch (error) {
      console.warn('⚠️ Error fetching certified products:', error);
      // Return empty array for certified products if endpoint fails
      setCertifiedProducts([]);
      return { status: 'success', count: 0 };
    }
  };

  // Get all products (regular + certified)
  const getAllProducts = () => {
    return [...products, ...certifiedProducts];
  };

  // Fetch customers from database - Use retailers as customers
  const fetchCustomers = async () => {
    try {
      console.log('🔄 Fetching customers (retailers)...');
      
      // Try endpoints in order of reliability
      const endpoints = [
        `${API_BASE_URL}/api/customers`,           // Dedicated customers endpoint
        `${API_BASE_URL}/api/retailers/all`,       // Retailers endpoint that works
        `${API_BASE_URL}/api/retailers`,           // Basic retailers endpoint
        `${API_BASE_URL}/api/users/retailers`      // Will work after we add it
      ];
      
      let retailersData = [];
      let successfulEndpoint = '';
      let lastError = '';
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: getAuthHeaders()
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 Raw API response:', data);
            
            // Handle different response structures
            if (data.customers) {
              // From /api/customers endpoint
              retailersData = data.customers;
            } else if (data.retailers) {
              // From /api/retailers/all endpoint
              retailersData = data.retailers;
            } else if (data.users) {
              // From /api/users/retailers endpoint
              retailersData = data.users;
            } else if (Array.isArray(data)) {
              // Direct array response
              retailersData = data;
            } else {
              console.warn('⚠️ Unexpected API response structure:', data);
              retailersData = [];
            }
            
            successfulEndpoint = endpoint;
            console.log(`✅ Found ${retailersData.length} retailers at ${endpoint}`);
            break;
          } else {
            console.warn(`⚠️ Endpoint ${endpoint} returned status: ${response.status}`);
            lastError = `HTTP ${response.status}`;
            // Try to get error details
            try {
              const errorData = await response.json();
              console.warn(`⚠️ Error details:`, errorData);
              lastError = errorData.message || `HTTP ${response.status}`;
            } catch (e) {
              console.warn(`⚠️ No error details available`);
            }
          }
        } catch (error) {
          console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
          lastError = error.message;
          continue;
        }
      }
      
      // Format retailers as customers
      const formattedCustomers = retailersData.map(retailer => ({
        _id: retailer._id || retailer.id,
        id: retailer._id || retailer.id,
        name: retailer.businessName || `${retailer.firstName || ''} ${retailer.lastName || ''}`.trim() || 'Unknown Retailer',
        email: retailer.email || '',
        phone: retailer.phone || '',
        address: retailer.address || '',
        businessName: retailer.businessName || '',
        type: 'retailer',
        createdAt: retailer.createdAt || new Date().toISOString()
      }));
      
      console.log(`✅ Loaded ${formattedCustomers.length} customers from ${successfulEndpoint || 'multiple endpoints'}`);
      setCustomers(formattedCustomers);
      
      return { 
        status: successfulEndpoint ? 'success' : 'error', 
        count: formattedCustomers.length,
        endpoint: successfulEndpoint,
        error: successfulEndpoint ? null : lastError
      };
      
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
      return { status: 'error', error: error.message };
    }
  };

  // Fetch wholesale sales data
  const fetchWholesaleSales = async () => {
    try {
      console.log('🔄 Fetching wholesale sales...');
      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales`, {
        headers: getAuthHeaders()
      });
      
      console.log(`📊 Wholesale sales response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Wholesale sales API response:', data);
        
        if (data.success) {
          // Enhance sales with customer details
          const salesWithCustomerDetails = data.wholesaleSales.map(sale => ({
            ...sale,
            customerDetails: getCustomerDetails(sale)
          }));
          console.log(`✅ Loaded ${salesWithCustomerDetails.length} wholesale sales`);
          setWholesaleSales(salesWithCustomerDetails);
          return { status: 'success', count: salesWithCustomerDetails.length };
        } else {
          console.warn('⚠️ Wholesale sales API returned success:false', data.message);
          setWholesaleSales([]);
          return { status: 'error', error: data.message };
        }
      } else {
        console.warn(`⚠️ Wholesale sales API returned non-OK response: ${response.status}`);
        // Try to get error message
        try {
          const errorData = await response.json();
          console.warn(`⚠️ Error details:`, errorData);
          setWholesaleSales([]);
          return { status: 'error', error: errorData.message || `HTTP ${response.status}` };
        } catch (e) {
          console.warn(`⚠️ No error details available`);
          setWholesaleSales([]);
          return { status: 'error', error: `HTTP ${response.status}` };
        }
      }
    } catch (error) {
      console.error('❌ Error fetching wholesale sales:', error);
      setWholesaleSales([]);
      return { status: 'error', error: error.message };
    }
  };

  // Get customer details from sale data
  const getCustomerDetails = (sale) => {
    if (sale.customerDetails) {
      return sale.customerDetails;
    }

    if (sale.customerType === 'existing' && sale.customerId) {
      const customer = customers.find(c => 
        c._id === sale.customerId || c.id === sale.customerId
      );
      if (customer) {
        return {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          businessName: customer.businessName,
          isExisting: true,
          customerId: customer._id || customer.id
        };
      }
    }

    // For new customers or fallback
    return {
      name: sale.customerName || 'Unknown Customer',
      phone: sale.customerPhone || sale.customerInfo?.phone || '',
      email: sale.customerEmail || sale.customerInfo?.email || '',
      address: sale.customerAddress || sale.customerInfo?.address || '',
      businessName: sale.customerBusinessName || sale.customerInfo?.businessName || '',
      isExisting: false
    };
  };

  // Initialize data
  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    setLoading(true);
    console.log('🚀 Loading business data...');
    
    try {
      // Use Promise.allSettled to handle individual failures
      const results = await Promise.allSettled([
        fetchProducts(),
        fetchCertifiedProducts(),
        fetchCustomers(),
        fetchWholesaleSales()
      ]);

      // Log results for debugging
      const operations = ['Products', 'Certified Products', 'Customers', 'Wholesale Sales'];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const operationResult = result.value;
          if (operationResult.status === 'success') {
            console.log(`✅ ${operations[index]} loaded successfully: ${operationResult.count} items`);
          } else {
            console.error(`❌ ${operations[index]} failed:`, operationResult.error);
          }
        } else {
          console.error(`❌ ${operations[index]} failed:`, result.reason);
        }
      });

      calculateBusinessMetrics();

    } catch (error) {
      console.error('❌ Error loading business data:', error);
    } finally {
      setLoading(false);
      console.log('🏁 Business data loading complete');
    }
  };

  const calculateBusinessMetrics = () => {
    const allProducts = getAllProducts();
    const totalRevenue = wholesaleSales
      .filter(sale => sale.status === 'completed' || sale.paymentStatus === 'paid')
      .reduce((sum, sale) => sum + (sale.grandTotal || sale.total || 0), 0);
    
    const totalInvestment = allProducts.reduce((sum, product) => 
      sum + ((product.costPrice || 0) * (product.quantity || 0)), 0
    );
    
    const totalPotentialRevenue = allProducts.reduce((sum, product) => 
      sum + (product.price * (product.quantity || 0)), 0
    );
    
    const totalPotentialProfit = totalPotentialRevenue - totalInvestment;

    // Calculate unique customers from sales
    const uniqueCustomerPhones = [...new Set(wholesaleSales.map(sale => 
      sale.customerDetails?.phone || sale.customerPhone
    ))];
    const uniqueCustomersCount = uniqueCustomerPhones.filter(phone => phone).length;

    // Calculate certified products metrics
    const certifiedProductsCount = certifiedProducts.length;
    const certifiedProductsRevenue = wholesaleSales
      .filter(sale => sale.status === 'completed' || sale.paymentStatus === 'paid')
      .reduce((sum, sale) => {
        const certifiedItems = sale.items?.filter(item => item.isCertifiedProduct) || [];
        return sum + certifiedItems.reduce((itemSum, item) => itemSum + (item.total || 0), 0);
      }, 0);

    setBusinessMetrics({
      revenue: { 
        current: totalRevenue, 
        previous: totalRevenue * 0.85, 
        trend: totalRevenue > (totalRevenue * 0.85) ? 'up' : 'down' 
      },
      profit: { 
        current: totalPotentialProfit, 
        previous: totalPotentialProfit * 0.80, 
        trend: totalPotentialProfit > (totalPotentialProfit * 0.80) ? 'up' : 'down' 
      },
      customers: { 
        current: Math.max(uniqueCustomersCount, customers.length), 
        previous: Math.max(1, uniqueCustomersCount - 1), 
        trend: uniqueCustomersCount > Math.max(1, uniqueCustomersCount - 1) ? 'up' : 'down' 
      },
      inventoryValue: { 
        current: totalInvestment, 
        previous: totalInvestment * 0.90, 
        trend: 'up' 
      },
      orders: { 
        current: wholesaleSales.length, 
        previous: Math.max(0, wholesaleSales.length - 1), 
        trend: wholesaleSales.length > Math.max(0, wholesaleSales.length - 1) ? 'up' : 'down' 
      },
      stockLevel: { 
        current: calculateStockLevel(), 
        previous: 85, 
        trend: 'down' 
      },
      certifiedProducts: {
        current: certifiedProductsCount,
        previous: Math.max(0, certifiedProductsCount - 1),
        trend: certifiedProductsCount > Math.max(0, certifiedProductsCount - 1) ? 'up' : 'down',
        revenue: certifiedProductsRevenue
      }
    });
  };

  const calculateStockLevel = () => {
    const allProducts = getAllProducts();
    if (allProducts.length === 0) return 0;
    
    const totalProducts = allProducts.length;
    const lowStockProducts = allProducts.filter(product => 
      product.quantity < (product.minStockLevel || 10)
    ).length;
    
    return Math.round(((totalProducts - lowStockProducts) / totalProducts) * 100);
  };

  // Handle saving a new wholesale sale - UPDATED FOR CERTIFIED PRODUCTS
  const handleSaveSale = async (saleData) => {
    setSaving(true);
    console.log('💾 Saving sale...', saleData);
    
    try {
      // ✅ CRITICAL FIX: Generate referenceNumber FIRST and ensure it's included
      const referenceNumber = saleData.referenceNumber || `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      console.log('🔍 Generated referenceNumber:', referenceNumber);

      // Handle customer data based on type
      let finalCustomerType = saleData.customerType;
      let finalCustomerId = saleData.customerType === 'existing' ? saleData.customerId : null;
      let finalCustomerInfo = saleData.customerType === 'new' ? saleData.customerInfo : null;

      // Handle walk-in customer transformation
      if (saleData.isWalkInCustomer) {
        finalCustomerType = 'new';
        finalCustomerInfo = {
          name: 'Walk-in Customer',
          phone: '0000000000',
          email: '',
          address: '',
          businessName: 'Walk-in Customer'
        };
      }

      // ✅ CRITICAL FIX: Build the data object in the EXACT format expected by backend
      const apiPayload = {
        // Customer Information - match backend schema exactly
        customerType: finalCustomerType,
        customerId: finalCustomerId,
        customerInfo: finalCustomerInfo,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        customerEmail: saleData.customerEmail || '',
        customerAddress: saleData.customerAddress || '',
        customerBusinessName: saleData.customerBusinessName || '',

        // ✅ FIXED: Include referenceNumber at the root level
        referenceNumber: referenceNumber,
        
        // Sale Details
        saleDate: saleData.saleDate,
        saleTime: saleData.saleTime,
        paymentMethod: saleData.paymentMethod,
        paymentStatus: saleData.paymentStatus,
        saleNotes: saleData.saleNotes || '',

        // Sale Items - Include certified product flag
        items: saleData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          costPrice: parseFloat(item.costPrice) || 0,
          discount: parseFloat(item.discount) || 0,
          total: parseFloat(item.total) || 0,
          isCertifiedProduct: item.isCertifiedProduct || false
        })),

        // Financial Summary
        subtotal: parseFloat(saleData.subtotal) || 0,
        totalDiscount: parseFloat(saleData.totalDiscount) || 0,
        grandTotal: parseFloat(saleData.grandTotal) || 0,
        amountPaid: parseFloat(saleData.amountPaid) || 0,
        balanceDue: parseFloat(saleData.balanceDue) || 0,

        // Metadata
        wholesaler: user?.id,
        status: 'completed'
      };

      // ✅ CRITICAL: Validate the payload before sending
      console.log('📤 Final API Payload:', apiPayload);
      console.log('🔍 Validation Check:', {
        hasReferenceNumber: !!apiPayload.referenceNumber,
        referenceNumber: apiPayload.referenceNumber,
        customerType: apiPayload.customerType,
        itemsCount: apiPayload.items.length,
        grandTotal: apiPayload.grandTotal,
        wholesaler: apiPayload.wholesaler,
        certifiedItems: apiPayload.items.filter(item => item.isCertifiedProduct).length
      });

      // Validate required fields
      const requiredFields = ['referenceNumber', 'customerName', 'customerPhone', 'items', 'grandTotal'];
      const missingFields = requiredFields.filter(field => !apiPayload[field]);
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate items
      if (!apiPayload.items || apiPayload.items.length === 0) {
        throw new Error('At least one sale item is required');
      }

      const invalidItems = apiPayload.items.filter(item => 
        !item.productId || item.quantity <= 0 || item.unitPrice <= 0
      );
      
      if (invalidItems.length > 0) {
        throw new Error('Some items have invalid data (missing product, quantity, or price)');
      }

      // Make API request
      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(apiPayload)
      });

      console.log('📊 Response status:', response.status);
      
      // Handle response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('❌ Backend error details:', responseData);
        
        // Provide more specific error messages
        if (responseData.error && responseData.error.includes('referenceNumber')) {
          throw new Error('Reference number validation failed. Please try again.');
        } else if (responseData.error && responseData.error.includes('validation failed')) {
          throw new Error(`Validation error: ${responseData.error}`);
        } else {
          throw new Error(responseData.message || `Server error: ${response.status}`);
        }
      }

      console.log('✅ Sale saved successfully:', responseData);
      
      if (responseData.success) {
        // Enhance the new sale with customer details
        const newSale = {
          ...responseData.wholesaleSale,
          customerDetails: getCustomerDetails(responseData.wholesaleSale)
        };
        
        setWholesaleSales(prevSales => [newSale, ...prevSales]);
        
        // Create receipt
        const receipt = {
          id: responseData.wholesaleSale.referenceNumber || `RCP${String(receipts.length + 1).padStart(3, '0')}`,
          saleId: responseData.wholesaleSale._id || responseData.wholesaleSale.id,
          customerName: saleData.customerName,
          customerPhone: saleData.customerPhone,
          customerEmail: saleData.customerEmail,
          customerAddress: saleData.customerAddress,
          amount: saleData.grandTotal,
          date: saleData.saleDate,
          status: saleData.paymentStatus,
          paymentMethod: saleData.paymentMethod,
          items: saleData.items,
          referenceNumber: responseData.wholesaleSale.referenceNumber,
          hasCertifiedProducts: saleData.items.some(item => item.isCertifiedProduct)
        };

        setReceipts(prevReceipts => [receipt, ...prevReceipts]);
        
        // Update product quantities (both regular and certified)
        updateProductQuantities(saleData.items);
        
        // Refresh business metrics
        calculateBusinessMetrics();

        console.log('✅ Sale saved successfully!');
        const certifiedCount = saleData.items.filter(item => item.isCertifiedProduct).length;
        const message = certifiedCount > 0 
          ? `Sale saved successfully! Includes ${certifiedCount} certified product(s). Receipt: ${receipt.id}`
          : `Sale saved successfully! Receipt: ${receipt.id}`;
        
        alert(message);
        
        return responseData;
      } else {
        throw new Error(responseData.message || 'Failed to save sale');
      }

    } catch (error) {
      console.error('❌ Error saving sale:', error);
      alert(`Error saving sale: ${error.message}`);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Update product quantities after sale - UPDATED FOR CERTIFIED PRODUCTS
  const updateProductQuantities = (soldItems) => {
    // Update regular products
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const soldItem = soldItems.find(item => 
          item.productId === product._id || item.productId === product.id
        );
        if (soldItem && !soldItem.isCertifiedProduct) {
          const newQuantity = Math.max(0, (product.quantity || 0) - soldItem.quantity);
          console.log(`📦 Updated regular product ${product.name} quantity: ${product.quantity} -> ${newQuantity}`);
          return {
            ...product,
            quantity: newQuantity
          };
        }
        return product;
      })
    );

    // Update certified products
    setCertifiedProducts(prevCertifiedProducts => 
      prevCertifiedProducts.map(product => {
        const soldItem = soldItems.find(item => 
          (item.productId === product._id || item.productId === product.id) && item.isCertifiedProduct
        );
        if (soldItem) {
          const newQuantity = Math.max(0, (product.quantity || 0) - soldItem.quantity);
          console.log(`📦 Updated certified product ${product.name} quantity: ${product.quantity} -> ${newQuantity}`);
          return {
            ...product,
            quantity: newQuantity
          };
        }
        return product;
      })
    );
  };

  // Handle viewing a sale with full details - UPDATED FOR CERTIFIED PRODUCTS
  const handleViewSale = async (saleId) => {
    try {
      console.log(`👀 Viewing sale: ${saleId}`);
      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales/${saleId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const sale = data.wholesaleSale;
          const customerInfo = sale.customerDetails || getCustomerDetails(sale);
          
          const certifiedItems = sale.items?.filter(item => item.isCertifiedProduct) || [];
          const regularItems = sale.items?.filter(item => !item.isCertifiedProduct) || [];
          
          const saleDetails = `
Sale Details:
-------------
Reference: ${sale.referenceNumber}
Date: ${new Date(sale.saleDate).toLocaleDateString()}
Status: ${sale.status}
Payment: ${sale.paymentMethod} (${sale.paymentStatus})
${certifiedItems.length > 0 ? `Certified Products: ${certifiedItems.length} items` : ''}

Customer Information:
--------------------
Name: ${customerInfo.name}
Phone: ${customerInfo.phone}
Email: ${customerInfo.email || 'N/A'}
Address: ${customerInfo.address || 'N/A'}
Business: ${customerInfo.businessName || 'N/A'}
Type: ${customerInfo.isExisting ? 'Existing Customer' : 'New Customer'}

Items:
------
${sale.items?.map(item => `
• ${item.productName} ${item.isCertifiedProduct ? '🔒 CERTIFIED' : ''}
  Quantity: ${item.quantity} ${item.productId?.measurementUnit || 'units'}
  Price: ${formatCurrency(item.unitPrice)} each
  Discount: ${item.discount}%
  Total: ${formatCurrency(item.total)}
`).join('')}

Financial Summary:
-----------------
Subtotal: ${formatCurrency(sale.subtotal)}
Discount: ${formatCurrency(sale.totalDiscount)}
Grand Total: ${formatCurrency(sale.grandTotal)}
Amount Paid: ${formatCurrency(sale.amountPaid)}
Balance Due: ${formatCurrency(sale.balanceDue)}

Notes: ${sale.saleNotes || 'None'}
          `;
          
          alert(saleDetails);
        }
      } else {
        // Fallback to basic sale info
        const sale = wholesaleSales.find(s => s._id === saleId || s.id === saleId);
        if (sale) {
          const certifiedCount = sale.items?.filter(item => item.isCertifiedProduct).length || 0;
          const certifiedInfo = certifiedCount > 0 ? ` (${certifiedCount} certified items)` : '';
          alert(`Viewing sale: ${sale.referenceNumber}${certifiedInfo}\nCustomer: ${sale.customerName}\nAmount: ${formatCurrency(sale.grandTotal || sale.total)}`);
        } else {
          alert('Sale not found');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching sale details:', error);
      const sale = wholesaleSales.find(s => s._id === saleId || s.id === saleId);
      if (sale) {
        const certifiedCount = sale.items?.filter(item => item.isCertifiedProduct).length || 0;
        const certifiedInfo = certifiedCount > 0 ? ` (${certifiedCount} certified items)` : '';
        alert(`Viewing sale: ${sale.referenceNumber}${certifiedInfo}\nCustomer: ${sale.customerName}\nAmount: ${formatCurrency(sale.grandTotal || sale.total)}`);
      } else {
        alert('Error loading sale details');
      }
    }
  };

  // Handle deleting a sale - UPDATED FOR CERTIFIED PRODUCTS
  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log(`🗑️ Deleting sale: ${saleId}`);
      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales/${saleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWholesaleSales(prevSales => 
            prevSales.filter(sale => sale._id !== saleId && sale.id !== saleId)
          );
          setReceipts(prevReceipts => 
            prevReceipts.filter(receipt => receipt.saleId !== saleId)
          );
          calculateBusinessMetrics();
          console.log('✅ Sale deleted successfully');
          alert('Sale deleted successfully!');
        } else {
          throw new Error(data.message || 'Failed to delete sale');
        }
      } else {
        throw new Error('Failed to delete sale from server');
      }
    } catch (error) {
      console.error('❌ Error deleting sale:', error);
      alert('Error deleting sale. Please try again.');
    }
  };

  // Handle printing receipt - UPDATED FOR CERTIFIED PRODUCTS
  const handlePrintReceipt = (receiptId) => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (receipt) {
      const certifiedItems = receipt.items?.filter(item => item.isCertifiedProduct) || [];
      const certifiedNotice = certifiedItems.length > 0 ? 
        `\n\n🔒 This receipt contains ${certifiedItems.length} certified product(s)` : '';
      
      const receiptContent = `
        RECEIPT: ${receipt.id}
        Date: ${new Date(receipt.date).toLocaleDateString()}
        
        Customer: ${receipt.customerName}
        Phone: ${receipt.customerPhone || 'N/A'}
        
        Items:
        ${receipt.items?.map(item => `
        • ${item.productName} ${item.isCertifiedProduct ? '🔒' : ''}
          Qty: ${item.quantity} x ${formatCurrency(item.unitPrice)}
          Discount: ${item.discount}%
          Total: ${formatCurrency(item.total)}
        `).join('')}
        
        Amount: ${formatCurrency(receipt.amount)}
        Payment Method: ${receipt.paymentMethod}
        Status: ${receipt.status}
        ${certifiedNotice}
        
        Thank you for your business!
      `;
      
      console.log('🖨️ Printing receipt:', receipt.id);
      alert(`Printing receipt:\n${receiptContent}`);
      // In a real app, you would open a print dialog here
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    setLoading(true);
    try {
      await loadBusinessData();
      console.log('✅ All data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  // Quick stats for the header - UPDATED WITH CERTIFIED PRODUCTS
  const quickStats = [
    {
      icon: FaBox,
      label: 'Total Products',
      value: products.length + certifiedProducts.length,
      color: 'blue',
      subtext: `${products.length} regular, ${certifiedProducts.length} certified`
    },
    {
      icon: FaCertificate,
      label: 'Certified Products',
      value: certifiedProducts.length,
      color: 'green',
      subtext: `${businessMetrics.certifiedProducts.revenue > 0 ? formatCurrency(businessMetrics.certifiedProducts.revenue) + ' revenue' : 'No sales yet'}`
    },
    {
      icon: FaUsers,
      label: 'Customers',
      value: businessMetrics.customers.current,
      color: 'purple'
    },
    {
      icon: FaShoppingCart,
      label: 'Total Sales',
      value: wholesaleSales.length,
      color: 'orange'
    },
    {
      icon: FaChartBar,
      label: 'Revenue',
      value: formatCurrency(businessMetrics.revenue.current),
      color: 'indigo'
    }
  ];

  // Fixed color classes for Tailwind
  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800'
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800'
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800'
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800'
      },
      indigo: {
        bg: 'bg-indigo-100 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <FaChartBar className="mr-3 text-blue-500" />
              Business Management System
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage sales, receipts, and business performance with certified products
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={refreshAllData}
              disabled={syncStatus === 'syncing' || loading}
              className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSync className={`mr-2 ${syncStatus === 'syncing' || loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickStats.map((stat, index) => {
            const colorClasses = getColorClasses(stat.color);
            return (
              <div key={index} className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border ${colorClasses.border} transition-all duration-200 hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </p>
                    {stat.subtext && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {stat.subtext}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${colorClasses.bg}`}>
                    <stat.icon className={`text-xl ${colorClasses.text}`} />
                  </div>
                </div>
                {stat.color === 'green' && certifiedProducts.length > 0 && (
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                    ↗ {businessMetrics.certifiedProducts.trend === 'up' ? 'Growing' : 'Stable'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['create-sales', 'sales', 'receipts', 'analytics'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeSection === section
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {section === 'create-sales' ? 'Create Sales' :
               section === 'sales' ? 'Sales History' :
               section === 'receipts' ? 'Receipts' :
               'Analytics'}
            </button>
          ))}
        </div>
      </div>

      {/* Render Active Tab */}
      {activeSection === 'create-sales' && (
        <CreateSales
          products={getAllProducts()}
          customers={customers}
          onSaveSale={handleSaveSale}
          saving={saving}
          onRefreshProducts={() => {
            fetchProducts();
            fetchCertifiedProducts();
          }}
        />
      )}

      {activeSection === 'sales' && (
        <Sales
          wholesaleSales={wholesaleSales}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onViewSale={handleViewSale}
          onDeleteSale={handleDeleteSale}
          onCreateNewSale={() => setActiveSection('create-sales')}
        />
      )}

      {activeSection === 'receipts' && (
        <Receipts
          receipts={receipts}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onPrintReceipt={handlePrintReceipt}
        />
      )}

      {activeSection === 'analytics' && (
        <Analytics
          businessMetrics={businessMetrics}
          wholesaleSales={wholesaleSales}
          receipts={receipts}
          products={getAllProducts()}
          customers={customers}
          certifiedProducts={certifiedProducts}
        />
      )}
    </div>
  );
};

export default BMS;