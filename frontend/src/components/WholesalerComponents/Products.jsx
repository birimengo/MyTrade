import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../ErrorBoundary';
import AddProducts from './AddProducts';
import MyProducts from './MyProducts';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('myProducts');
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    measurementUnit: 'units',
    category: '',
    images: [],
    minOrderQuantity: '1',
    bulkDiscount: false,
    discountPercentage: '',
    tags: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Handle navigation state from ManualStock
  useEffect(() => {
    if (location.state) {
      const { action, productId, productData } = location.state;
      
      if (action === 'edit' && productData) {
        // Set the product to edit and switch to add product tab
        handleEdit(productData);
        // Clear the navigation state
        navigate(location.pathname, { replace: true, state: {} });
      }
      
      if (action === 'delete' && productId) {
        // Set the product to be highlighted for deletion confirmation
        setHighlightedProduct(productId);
        // Clear the navigation state
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, navigate, location.pathname]);

  // Handle deletion when highlightedProduct is set
  useEffect(() => {
    if (highlightedProduct && products.length > 0) {
      const productToDelete = products.find(p => p._id === highlightedProduct);
      if (productToDelete) {
        if (window.confirm(`Are you sure you want to delete "${productToDelete.name}"?`)) {
          handleDelete(highlightedProduct);
        }
        setHighlightedProduct(null);
      }
    }
  }, [highlightedProduct, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Products API endpoint not found. Please check server configuration.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.products || []);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('http://localhost:5000/api/products/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        images: Array.from(files)
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'images') {
          formData.images.forEach(file => {
            formDataToSend.append('images', file);
          });
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const url = editingProduct 
        ? `http://localhost:5000/api/products/${editingProduct._id}`
        : 'http://localhost:5000/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActiveTab('myProducts');
        setEditingProduct(null);
        resetForm();
        fetchProducts(); // Refresh the products list
      } else {
        throw new Error(data.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      quantity: '',
      measurementUnit: 'units',
      category: '',
      images: [],
      minOrderQuantity: '1',
      bulkDiscount: false,
      discountPercentage: '',
      tags: ''
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      measurementUnit: product.measurementUnit,
      category: product.category,
      images: [],
      minOrderQuantity: product.minOrderQuantity,
      bulkDiscount: product.bulkDiscount,
      discountPercentage: product.discountPercentage || '',
      tags: product.tags?.join(', ') || ''
    });
    setActiveTab('addProduct');
    
    // Scroll to the top of the form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchProducts(); // Refresh the products list
      } else {
        throw new Error(data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error.message);
    }
  };

  const cancelForm = () => {
    setEditingProduct(null);
    resetForm();
    setActiveTab('myProducts');
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Products</h2>
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">Loading products...</span>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 mt-1">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Product Management</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your product catalog and inventory
            </p>
            {editingProduct && (
              <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Editing:</strong> {editingProduct.name}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setActiveTab('addProduct');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 mt-2 lg:mt-0"
          >
            + Add New Product
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-2">
          <nav className="flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('myProducts');
                setEditingProduct(null);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'myProducts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              My Products
            </button>
            <button
              onClick={() => setActiveTab('addProduct')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'addProduct'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'myProducts' ? (
            <MyProducts
              products={products}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              setShowCreateForm={() => setActiveTab('addProduct')}
              highlightedProduct={highlightedProduct}
            />
          ) : (
            <AddProducts
              formData={formData}
              setFormData={setFormData}
              handleSubmit={handleSubmit}
              handleInputChange={handleInputChange}
              categories={categories}
              editingProduct={editingProduct}
              cancelForm={cancelForm}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Products;