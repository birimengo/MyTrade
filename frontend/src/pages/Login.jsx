import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaLock, FaExclamationTriangle, FaServer, FaKey } from 'react-icons/fa';

const Login = () => {
  const navigate = useNavigate();
  const { login, serverStatus, checkServerStatus } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Check server status on component mount
  useEffect(() => {
    const checkServer = async () => {
      setIsCheckingServer(true);
      await checkServerStatus();
      setIsCheckingServer(false);
    };
    
    checkServer();
  }, [checkServerStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        const userRole = result.user?.role;
        
        switch(userRole) {
          case 'retailer':
            navigate('/dashboard/retailer');
            break;
          case 'wholesaler':
            navigate('/dashboard/wholesaler');
            break;
          case 'supplier':
            navigate('/dashboard/supplier');
            break;
          case 'transporter':
            navigate('/dashboard/transporter');
            break;
          case 'admin':
            navigate('/admin-dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        setErrors({ submit: result.message });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const retryServerConnection = async () => {
    setIsCheckingServer(true);
    await checkServerStatus();
    setIsCheckingServer(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#F9A52B] to-[#ED1C24] flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">T</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">TRADE UGANDA</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Uganda&apos;s Premier B2B E-Commerce Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Server Status Indicator */}
        {serverStatus === 'offline' && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaServer className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Server offline</strong> - Cannot connect to backend server
                </p>
                <div className="mt-2">
                  <button
                    onClick={retryServerConnection}
                    disabled={isCheckingServer}
                    className="text-sm text-red-700 underline hover:text-red-600 disabled:opacity-50"
                  >
                    {isCheckingServer ? 'Checking...' : 'Retry connection'}
                  </button>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Make sure your backend server is running on port 5000
                </p>
              </div>
            </div>
          </div>
        )}

        {isCheckingServer && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
              <p className="text-sm text-blue-700">Checking server connection...</p>
            </div>
          </div>
        )}

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaEnvelope size={14} /></span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={serverStatus === 'offline' || isLoading}
                  className={`pl-10 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm 
                    focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm 
                    ${errors.email ? 'border-red-500' : 'border-gray-300'} 
                    disabled:opacity-50 disabled:cursor-not-allowed text-gray-900`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-3 text-gray-400"><FaLock size={14} /></span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}   
                  onChange={handleChange}
                  disabled={serverStatus === 'offline' || isLoading}
                  className={`pl-10 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm 
                    focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm 
                    ${errors.password ? 'border-red-500' : 'border-gray-300'} 
                    disabled:opacity-50 disabled:cursor-not-allowed text-gray-900`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500 flex items-center"
                >
                  <FaKey className="mr-1" size={12} />
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Submit errors */}
            {errors.submit && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{errors.submit}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={serverStatus === 'offline' || isLoading || isCheckingServer}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm 
                  text-sm font-medium text-white bg-gradient-to-r from-[#F9A52B] to-[#ED1C24] 
                  hover:from-[#FFB347] hover:to-[#F44336] focus:outline-none focus:ring-2 
                  focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to Trade Uganda?</span>
              </div>
            </div>

            {/* Register button */}
            <div className="mt-6">
              <button
                onClick={() => navigate('/register')}
                disabled={serverStatus === 'offline'}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md 
                  shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaUser className="mr-2" size={14} />
                Create a new account
              </button>
            </div>

            {/* Demo Accounts Info */}
           
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;