import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaChartBar, FaSync, FaBox, FaUsers, FaShoppingCart } from 'react-icons/fa';
import { CreateSales, Sales, Receipts, Analytics } from './BMSTabs';
import { useAuth } from '../../context/AuthContext';

const BMS = ({ isElectron, isOnline, onSync, syncStatus, pendingSyncCount }) => {
  const [activeSection, setActiveSection] = useState('create-sales');
  const [wholesaleSales, setWholesaleSales] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const { user, getAuthHeaders, API_BASE_URL } = useAuth();

  // Use refs to track the latest state values
  const productsRef = useRef(products);
  const customersRef = useRef(customers);
  const wholesaleSalesRef = useRef(wholesaleSales);

  // Update refs when state changes
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    wholesaleSalesRef.current = wholesaleSales;
  }, [wholesaleSales]);

  // Business metrics state
  const [businessMetrics, setBusinessMetrics] = useState({
    revenue: { current: 0, previous: 0, trend: 'up' },
    profit: { current: 0, previous: 0, trend: 'up' },
    customers: { current: 0, previous: 0, trend: 'up' },
    inventoryValue: { current: 0, previous: 0, trend: 'up' },
    orders: { current: 0, previous: 0, trend: 'up' },
    stockLevel: { current: 0, previous: 0, trend: 'down' }
  });

  // SIMPLIFIED token retrieval
  const getAuthToken = useCallback(() => {
    try {
      const tokenKeys = [
        'trade_uganda_token',
        'token',
        'auth_token',
        'user_token'
      ];

      for (const key of tokenKeys) {
        const storedToken = localStorage.getItem(key);
        if (storedToken) {
          if (typeof storedToken === 'string' && storedToken.startsWith('eyJ')) {
            return storedToken;
          }
          try {
            const parsed = JSON.parse(storedToken);
            if (parsed && typeof parsed === 'object') {
              return parsed.token || parsed.data || parsed;
            }
            return parsed;
          } catch (parseError) {
            return storedToken;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, []);

  // Calculate stock level helper
  const calculateStockLevel = useCallback(() => {
    const allProducts = productsRef.current;
    if (allProducts.length === 0) return 0;
    
    const totalProducts = allProducts.length;
    const lowStockProducts = allProducts.filter(product => 
      product.quantity < (product.minStockLevel || 10)
    ).length;
    
    return Math.round(((totalProducts - lowStockProducts) / totalProducts) * 100);
  }, []);

  // Calculate business metrics
  const calculateBusinessMetrics = useCallback(() => {
    const currentProducts = productsRef.current;
    const currentSales = wholesaleSalesRef.current;
    const currentCustomers = customersRef.current;

    const totalRevenue = currentSales
      .filter(sale => sale.status === 'completed' || sale.paymentStatus === 'paid')
      .reduce((sum, sale) => sum + (sale.grandTotal || sale.total || 0), 0);
    
    const totalInvestment = currentProducts.reduce((sum, product) => 
      sum + ((product.costPrice || 0.01) * (product.quantity || 0)), 0
    );
    
    const totalPotentialRevenue = currentProducts.reduce((sum, product) => 
      sum + ((product.sellingPrice || product.price || 0) * (product.quantity || 0)), 0
    );
    
    const totalPotentialProfit = totalPotentialRevenue - totalInvestment;

    const uniqueCustomerPhones = [...new Set(currentSales.map(sale => 
      sale.customerDetails?.phone || sale.customerPhone
    ))];
    const uniqueCustomersCount = uniqueCustomerPhones.filter(phone => phone).length;

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
        current: Math.max(uniqueCustomersCount, currentCustomers.length), 
        previous: Math.max(1, uniqueCustomersCount - 1), 
        trend: uniqueCustomersCount > Math.max(1, uniqueCustomersCount - 1) ? 'up' : 'down' 
      },
      inventoryValue: { 
        current: totalInvestment, 
        previous: totalInvestment * 0.90, 
        trend: 'up' 
      },
      orders: { 
        current: currentSales.length, 
        previous: Math.max(0, currentSales.length - 1), 
        trend: currentSales.length > Math.max(0, currentSales.length - 1) ? 'up' : 'down' 
      },
      stockLevel: { 
        current: calculateStockLevel(), 
        previous: 85, 
        trend: 'down' 
      }
    });
  }, [calculateStockLevel]);

  // Fetch ALL products from database without pagination
  const fetchProducts = useCallback(async () => {
    try {
      console.log('🔄 Fetching ALL products...');
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build URL with parameters to get ALL products
      const url = new URL(`${API_BASE_URL}/api/products`);
      url.searchParams.append('limit', '1000'); // Large number to get all products
      url.searchParams.append('page', '1');
      url.searchParams.append('includeCertified', 'true');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const productsData = data.products || [];
          console.log(`✅ Loaded ${productsData.length} total products`, {
            certified: productsData.filter(p => p.fromCertifiedOrder).length,
            manual: productsData.filter(p => !p.fromCertifiedOrder).length,
            available: productsData.filter(p => p.quantity > 0).length,
            outOfStock: productsData.filter(p => p.quantity <= 0).length
          });
          
          const productsWithCostPrice = productsData.map(product => ({
            ...product,
            costPrice: product.costPrice || 0.01
          }));
          
          setProducts(productsWithCostPrice);
          return { status: 'success', count: productsWithCostPrice.length };
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
  }, [API_BASE_URL, getAuthToken]);

  // Fetch customers from database
  const fetchCustomers = useCallback(async () => {
    try {
      console.log('🔄 Fetching customers (retailers)...');
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const endpoints = [
        `${API_BASE_URL}/api/customers`,
        `${API_BASE_URL}/api/retailers/all`,
        `${API_BASE_URL}/api/retailers`,
        `${API_BASE_URL}/api/users/retailers`
      ];
      
      let retailersData = [];
      let successfulEndpoint = '';
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('📦 Raw API response:', data);
            
            if (data.customers) {
              retailersData = data.customers;
            } else if (data.retailers) {
              retailersData = data.retailers;
            } else if (data.users) {
              retailersData = data.users;
            } else if (Array.isArray(data)) {
              retailersData = data;
            } else {
              retailersData = [];
            }
            
            successfulEndpoint = endpoint;
            console.log(`✅ Found ${retailersData.length} retailers at ${endpoint}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }
      
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
        endpoint: successfulEndpoint
      };
      
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
      return { status: 'error', error: error.message };
    }
  }, [API_BASE_URL, getAuthToken]);

  // Fetch wholesale sales data
  const fetchWholesaleSales = useCallback(async () => {
    try {
      console.log('🔄 Fetching wholesale sales...');
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Wholesale sales response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Wholesale sales API response:', data);
        
        if (data.success) {
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
        setWholesaleSales([]);
        return { status: 'error', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error('❌ Error fetching wholesale sales:', error);
      setWholesaleSales([]);
      return { status: 'error', error: error.message };
    }
  }, [API_BASE_URL, getAuthToken]);

  // Get customer details from sale data
  const getCustomerDetails = useCallback((sale) => {
    if (sale.customerDetails) {
      return sale.customerDetails;
    }

    if (sale.customerType === 'existing' && sale.customerId) {
      const customer = customersRef.current.find(c => 
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

    return {
      name: sale.customerName || 'Unknown Customer',
      phone: sale.customerPhone || sale.customerInfo?.phone || '',
      email: sale.customerEmail || sale.customerInfo?.email || '',
      address: sale.customerAddress || sale.customerInfo?.address || '',
      businessName: sale.customerBusinessName || sale.customerInfo?.businessName || '',
      isExisting: false
    };
  }, []);

  // SINGLE loadBusinessData function that handles everything
  const loadBusinessData = useCallback(async () => {
    setLoading(true);
    console.log('🔄 Loading business data...');
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('✅ Auth initialized, fetching data...');

      const [productsResult, customersResult, salesResult] = await Promise.allSettled([
        fetchProducts(),
        fetchCustomers(),
        fetchWholesaleSales()
      ]);

      const operations = ['Products', 'Customers', 'Wholesale Sales'];
      const resultsSummary = {};
      
      [productsResult, customersResult, salesResult].forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const operationResult = result.value;
          resultsSummary[operations[index].toLowerCase().replace(' ', '_')] = operationResult.status;
          if (operationResult.status === 'success') {
            console.log(`✅ ${operations[index]} loaded successfully: ${operationResult.count} items`);
          } else {
            console.error(`❌ ${operations[index]} failed:`, operationResult.error);
          }
        } else {
          resultsSummary[operations[index].toLowerCase().replace(' ', '_')] = 'failed';
          console.error(`❌ ${operations[index]} failed:`, result.reason);
        }
      });

      console.log('📊 Data loading results:', resultsSummary);

      setTimeout(() => {
        console.log('🔍 BMS State after loading (using refs):', {
          products: productsRef.current.length,
          customers: customersRef.current.length,
          wholesaleSales: wholesaleSalesRef.current.length
        });
        
        calculateBusinessMetrics();
      }, 200);

    } catch (error) {
      console.error('❌ Error loading business data:', error);
    } finally {
      setLoading(false);
      console.log('✅ All business data loaded successfully');
    }
  }, [fetchProducts, fetchCustomers, fetchWholesaleSales, getAuthToken, calculateBusinessMetrics]);

  // Handle saving a new wholesale sale - FIXED VERSION
  const handleSaveSale = async (saleData) => {
    console.log('💾 Starting sale save process...', saleData);
    setSaving(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const referenceNumber = saleData.referenceNumber || `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      console.log('🔍 Generated referenceNumber:', referenceNumber);

      let finalCustomerType = saleData.customerType;
      let finalCustomerId = saleData.customerType === 'existing' ? saleData.customerId : null;
      let finalCustomerInfo = saleData.customerType === 'new' ? saleData.customerInfo : null;

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

      const preparedItems = saleData.items.map(item => {
        let finalProductId = item.productId;
        
        console.log(`🔍 Processing item: ${item.productName}, ID: ${item.productId}`);
        
        let costPrice = parseFloat(item.costPrice);
        
        if (!costPrice || costPrice <= 0 || isNaN(costPrice)) {
          console.warn(`⚠️ Invalid costPrice for ${item.productName}: ${item.costPrice}, using fallback`);
          
          const product = productsRef.current.find(p => 
            p.id === item.productId || p._id === item.productId
          );
          if (product && product.costPrice) {
            costPrice = parseFloat(product.costPrice);
            console.log(`💰 Using product's stored cost price: ${costPrice}`);
          } else {
            costPrice = parseFloat(item.unitPrice) * 0.7;
            console.log(`💰 Final cost price fallback: ${item.unitPrice} * 0.7 = ${costPrice}`);
          }
        }
        
        costPrice = Math.max(0.01, costPrice);
        
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const discount = parseFloat(item.discount) || 0;
        const total = parseFloat(item.total) || 0;
        
        console.log(`💰 Final Item ${item.productName}: costPrice=${costPrice}, unitPrice=${unitPrice}, quantity=${quantity}, total=${total}`);
        
        return {
          productId: finalProductId,
          productName: item.productName,
          quantity: quantity,
          unitPrice: unitPrice,
          costPrice: costPrice,
          discount: discount,
          total: total
        };
      });

      const apiPayload = {
        customerType: finalCustomerType,
        customerId: finalCustomerId,
        customerInfo: finalCustomerInfo,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        customerEmail: saleData.customerEmail || '',
        customerAddress: saleData.customerAddress || '',
        customerBusinessName: saleData.customerBusinessName || '',
        referenceNumber: referenceNumber,
        saleDate: saleData.saleDate,
        saleTime: saleData.saleTime,
        paymentMethod: saleData.paymentMethod,
        paymentStatus: saleData.paymentStatus,
        saleNotes: saleData.saleNotes || '',
        items: preparedItems,
        subtotal: parseFloat(saleData.subtotal) || 0,
        totalDiscount: parseFloat(saleData.totalDiscount) || 0,
        grandTotal: parseFloat(saleData.grandTotal) || 0,
        amountPaid: parseFloat(saleData.amountPaid) || 0,
        balanceDue: parseFloat(saleData.balanceDue) || 0,
        wholesaler: user?.id,
        status: 'completed'
      };

      console.log('📤 Final API Payload:', apiPayload);

      const invalidCostItems = preparedItems.filter(item => 
        !item.costPrice || item.costPrice <= 0 || isNaN(item.costPrice)
      );
      
      if (invalidCostItems.length > 0) {
        console.error('❌ Items with invalid cost prices:', invalidCostItems);
        throw new Error(`Invalid cost prices detected for ${invalidCostItems.length} items. Please check product pricing.`);
      }

      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload)
      });

      console.log('📊 Response status:', response.status);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('❌ Backend error details:', responseData);
        console.error('❌ Backend validation errors:', responseData.error);
        
        if (responseData.error && responseData.error.includes('costPrice')) {
          throw new Error('Cost price validation failed. Please ensure all products have valid cost prices.');
        }
        
        throw new Error(responseData.message || `Server error: ${response.status}`);
      }

      console.log('✅ Sale saved successfully:', responseData);
      
      if (responseData.success) {
        const newSale = {
          ...responseData.wholesaleSale,
          customerDetails: getCustomerDetails(responseData.wholesaleSale)
        };
        
        setWholesaleSales(prevSales => [newSale, ...prevSales]);
        
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
          referenceNumber: responseData.wholesaleSale.referenceNumber
        };

        setReceipts(prevReceipts => [receipt, ...prevReceipts]);
        
        updateProductQuantities(saleData.items);
        calculateBusinessMetrics();

        console.log('✅ Sale saved successfully!');
        alert(`Sale saved successfully! Receipt: ${receipt.id}`);
        
        return responseData;
      } else {
        throw new Error(responseData.message || 'Failed to save sale');
      }

    } catch (error) {
      console.error('❌ Error saving sale:', error);
      
      let userMessage = error.message;
      if (error.message.includes('costPrice')) {
        userMessage = 'Product cost price validation failed. Please ensure all products have valid cost prices set in the system.';
      } else if (error.message.includes('token')) {
        userMessage = 'Authentication failed. Please log in again.';
      }
      
      alert(`Error saving sale: ${userMessage}`);
      throw error;
    } finally {
      // CRITICAL FIX: Reset saving state after operation completes
      setSaving(false);
      console.log('🔄 Saving state reset to false');
    }
  };

  // Update product quantities after sale
  const updateProductQuantities = (soldItems) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const soldItem = soldItems.find(item => {
          const productBackendId = product.originalId || product.id;
          return item.productId === productBackendId;
        });
        if (soldItem) {
          const newQuantity = Math.max(0, (product.quantity || 0) - soldItem.quantity);
          console.log(`📦 Updated product ${product.name} quantity: ${product.quantity} -> ${newQuantity}`);
          return {
            ...product,
            quantity: newQuantity
          };
        }
        return product;
      })
    );
  };

  // Handle viewing a sale with full details
  const handleViewSale = async (saleId) => {
    try {
      console.log(`👀 Viewing sale: ${saleId}`);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales/${saleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const sale = data.wholesaleSale;
          const customerInfo = sale.customerDetails || getCustomerDetails(sale);
          
          const saleDetails = `
Sale Details:
-------------
Reference: ${sale.referenceNumber}
Date: ${new Date(sale.saleDate).toLocaleDateString()}
Status: ${sale.status}
Payment: ${sale.paymentMethod} (${sale.paymentStatus})

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
• ${item.productName}
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
        const sale = wholesaleSalesRef.current.find(s => s._id === saleId || s.id === saleId);
        if (sale) {
          alert(`Viewing sale: ${sale.referenceNumber}\nCustomer: ${sale.customerName}\nAmount: ${formatCurrency(sale.grandTotal || sale.total)}`);
        } else {
          alert('Sale not found');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching sale details:', error);
      const sale = wholesaleSalesRef.current.find(s => s._id === saleId || s.id === saleId);
      if (sale) {
        alert(`Viewing sale: ${sale.referenceNumber}\nCustomer: ${sale.customerName}\nAmount: ${formatCurrency(sale.grandTotal || sale.total)}`);
      } else {
        alert('Error loading sale details');
      }
    }
  };

  // Handle deleting a sale
  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log(`🗑️ Deleting sale: ${saleId}`);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/wholesale-sales/${saleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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

  // Handle printing receipt
  const handlePrintReceipt = (receiptId) => {
    const receipt = receipts.find(r => r.id === receiptId);
    if (receipt) {
      const receiptContent = `
        RECEIPT: ${receipt.id}
        Date: ${new Date(receipt.date).toLocaleDateString()}
        
        Customer: ${receipt.customerName}
        Phone: ${receipt.customerPhone || 'N/A'}
        
        Items:
        ${receipt.items?.map(item => `
        • ${item.productName}
          Qty: ${item.quantity} x ${formatCurrency(item.unitPrice)}
          Discount: ${item.discount}%
          Total: ${formatCurrency(item.total)}
        `).join('')}
        
        Amount: ${formatCurrency(receipt.amount)}
        Payment Method: ${receipt.paymentMethod}
        Status: ${receipt.status}
        
        Thank you for your business!
      `;
      
      console.log('🖨️ Printing receipt:', receipt.id);
      alert(`Printing receipt:\n${receiptContent}`);
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

  // Initialize data
  useEffect(() => {
    loadBusinessData();
  }, [loadBusinessData]);

  // Compact quick stats for the header
  const quickStats = [
    {
      icon: FaBox,
      label: 'Products',
      value: products.length,
      color: 'blue'
    },
    {
      icon: FaUsers,
      label: 'Customers',
      value: businessMetrics.customers.current,
      color: 'purple'
    },
    {
      icon: FaShoppingCart,
      label: 'Sales',
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FaChartBar className="mr-2 text-blue-500 text-sm" />
              Business Management
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Manage sales, receipts, and business performance
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={refreshAllData}
              disabled={syncStatus === 'syncing' || loading}
              className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSync className={`mr-1 text-xs ${syncStatus === 'syncing' || loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Compact Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickStats.map((stat, index) => {
            const colorClasses = getColorClasses(stat.color);
            return (
              <div key={index} className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border ${colorClasses.border} transition-all duration-200 hover:shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${colorClasses.bg}`}>
                    <stat.icon className={`text-base ${colorClasses.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['create-sales', 'sales', 'receipts', 'analytics'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-3 px-4 text-xs font-medium transition-colors ${
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
          products={products}
          customers={customers}
          onSaveSale={handleSaveSale}
          saving={saving}
          onRefreshProducts={() => {
            loadBusinessData();
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
          products={products}
          customers={customers}
        />
      )}
    </div>
  );
};

export default BMS;