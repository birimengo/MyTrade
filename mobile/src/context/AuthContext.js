// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your live backend URL directly for mobile
const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  // NEW FUNCTION: Update user data in context and AsyncStorage
  const updateUser = (userData) => {
    setUser(userData);
    AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  // Check server status
  const checkServerStatus = async () => {
    try {
      console.log(`Checking server status at: ${API_BASE_URL}/api/health`);
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Server response status:', response.status);
      
      if (response.ok) {
        setServerStatus('online');
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      console.error('Server status check failed:', error);
      setServerStatus('offline');
      return false;
    }
  };

  const login = async (email, password) => {
    try {
      // Check server status first
      const isServerOnline = await checkServerStatus();
      if (!isServerOnline) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }

      console.log(`Attempting login to: ${API_BASE_URL}/api/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid response. Please try again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const { user: userData, token: authToken } = data;

      setUser(userData);
      setToken(authToken);
      await AsyncStorage.setItem('token', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // Check server status first
      const isServerOnline = await checkServerStatus();
      if (!isServerOnline) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }

      console.log(`Attempting registration to: ${API_BASE_URL}/api/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid response. Please try again.');
      }

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          message: data.message || 'Registration failed',
          errors: data.errors || []
        };
      }

      const { user: newUserData, token: newAuthToken } = data;

      setUser(newUserData);
      setToken(newAuthToken);
      await AsyncStorage.setItem('token', newAuthToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUserData));

      return { success: true, user: newUserData };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Clear local state
      setUser(null);
      setToken(null);
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to get auth headers for API calls
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Token verification error:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        register,
        updateUser,
        isAuthenticated: !!user && !!token,
        loading,
        serverStatus,
        checkServerStatus,
        getAuthHeaders,
        API_BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};