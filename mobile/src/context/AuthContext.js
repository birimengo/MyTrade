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

  // NEW FUNCTION: Safe storage getter to handle JSON parsing errors
  const getStoredItem = async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      
      try {
        return JSON.parse(value);
      } catch (parseError) {
        console.warn(`Failed to parse stored value for key "${key}". Returning raw value.`);
        return value;
      }
    } catch (error) {
      console.error(`Error getting item "${key}" from storage:`, error);
      return null;
    }
  };

  // NEW FUNCTION: Safe storage setter
  const setStoredItem = async (key, value) => {
    try {
      const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error(`Error setting item "${key}" in storage:`, error);
    }
  };

  // NEW FUNCTION: Clear corrupted storage data
  const clearCorruptedStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const corruptedKeys = [];
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            JSON.parse(value); // Test parsing
          }
        } catch (error) {
          console.log(`Found corrupted data for key: ${key}, clearing it.`);
          corruptedKeys.push(key);
        }
      }
      
      if (corruptedKeys.length > 0) {
        await AsyncStorage.multiRemove(corruptedKeys);
        console.log(`Cleared ${corruptedKeys.length} corrupted keys`);
      }
    } catch (error) {
      console.error('Error clearing corrupted storage:', error);
    }
  };

  // NEW FUNCTION: Debug storage contents
  const debugStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      console.log('=== Storage Contents ===');
      stores.forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.log('=== End Storage Contents ===');
    } catch (error) {
      console.error('Error debugging storage:', error);
    }
  };

  // EXPANDED FUNCTION: Update user data in context and AsyncStorage with safe storage
  const updateUser = async (userData) => {
    setUser(userData);
    await setStoredItem('user', userData);
  };

  // EXPANDED FUNCTION: Check server status with better error handling
  const checkServerStatus = async () => {
    try {
      console.log(`Checking server status at: ${API_BASE_URL}/api/health`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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

  // EXPANDED FUNCTION: Login with safe storage handling
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
      await setStoredItem('token', authToken);
      await setStoredItem('user', userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  // EXPANDED FUNCTION: Register with safe storage handling
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
      await setStoredItem('token', newAuthToken);
      await setStoredItem('user', newUserData);

      return { success: true, user: newUserData };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please try again.' 
      };
    }
  };

  // EXPANDED FUNCTION: Logout with safe storage handling
  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Store user data temporarily for API call if needed
      const currentUser = user;
      const currentToken = token;
      
      // Make API call to logout on server if user is authenticated
      if (currentUser && currentToken) {
        try {
          console.log('Making server logout request...');
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            },
          });
          console.log('Server logout request completed');
        } catch (serverError) {
          console.log('Server logout failed, continuing with local logout:', serverError);
          // Continue with local logout even if server logout fails
        }
      } else {
        console.log('No user token found, performing local logout only');
      }
      
      // Clear local state AFTER API call
      setUser(null);
      setToken(null);
      
      // Clear AsyncStorage safely
      await AsyncStorage.multiRemove(['token', 'user']);
      
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, ensure user is logged out locally
      setUser(null);
      setToken(null);
      await AsyncStorage.multiRemove(['token', 'user']).catch(() => {});
      return { success: false, message: 'Logout completed with warnings' };
    }
  };

  // EXPANDED FUNCTION: Silent logout with safe storage handling
  const silentLogout = async () => {
    try {
      console.log('Performing silent logout...');
      setUser(null);
      setToken(null);
      await AsyncStorage.multiRemove(['token', 'user']);
      console.log('Silent logout completed');
    } catch (error) {
      console.error('Silent logout error:', error);
    }
  };

  // EXPANDED FUNCTION: Refresh token with safe storage handling
  const refreshToken = async () => {
    try {
      const currentToken = await getStoredItem('token');
      if (!currentToken) {
        throw new Error('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { token: newToken, user: userData } = data;

      setToken(newToken);
      setUser(userData);
      await setStoredItem('token', newToken);
      await setStoredItem('user', userData);

      return { success: true, token: newToken };
    } catch (error) {
      console.error('Token refresh error:', error);
      // If token refresh fails, logout user
      await silentLogout();
      return { success: false, message: 'Session expired. Please login again.' };
    }
  };

  // NEW FUNCTION: Get auth token for API calls
  const getAuthToken = async () => {
    if (token) return token;
    const storedToken = await getStoredItem('token');
    return storedToken;
  };

  // EXPANDED FUNCTION: Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Password change failed');
      }

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: error.message };
    }
  };

  // EXPANDED FUNCTION: Update profile with safe storage handling
  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Profile update failed');
      }

      const data = await response.json();
      const updatedUser = data.user;

      // Update user in context and storage
      await updateUser(updatedUser);

      return { success: true, user: updatedUser, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message };
    }
  };

  // EXPANDED FUNCTION: Check if token is valid with safe storage handling
  const checkTokenValidity = async () => {
    try {
      const currentToken = await getStoredItem('token');
      if (!currentToken) {
        return { isValid: false, message: 'No token found' };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { isValid: true };
      } else {
        // Token is invalid, logout user
        await silentLogout();
        return { isValid: false, message: 'Token expired' };
      }
    } catch (error) {
      console.error('Token validity check error:', error);
      return { isValid: false, message: 'Token check failed' };
    }
  };

  // Function to get auth headers for API calls
  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  };

  // NEW FUNCTION: Get user role
  const getUserRole = () => {
    return user?.role || null;
  };

  // NEW FUNCTION: Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // NEW FUNCTION: Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // NEW FUNCTION: Clear all storage (for debugging)
  const clearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
      setToken(null);
      console.log('All storage cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('Error clearing storage:', error);
      return { success: false, message: error.message };
    }
  };

  // EXPANDED FUNCTION: Initialize auth state with safe storage handling
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Clear any corrupted data first
        await clearCorruptedStorage();
        
        // Debug storage contents
        await debugStorage();
        
        const [storedToken, storedUser] = await Promise.all([
          getStoredItem('token'),
          getStoredItem('user'),
        ]);
        
        console.log('Loaded from storage - Token exists:', !!storedToken, 'User exists:', !!storedUser);
        
        if (storedToken && storedUser) {
          setUser(storedUser);
          setToken(storedToken);
          
          // Verify token is still valid
          const tokenCheck = await checkTokenValidity();
          if (!tokenCheck.isValid) {
            console.log('Token is no longer valid, logging out...');
            await silentLogout();
          } else {
            console.log('Token is valid, user authenticated successfully');
          }
        } else {
          console.log('No stored auth data found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // If there's any error during initialization, clear auth state
        await silentLogout();
      } finally {
        setLoading(false);
        console.log('Auth initialization complete');
      }
    };

    initializeAuth();
  }, []);

  // Periodically check server status when online
  useEffect(() => {
    if (serverStatus === 'online') {
      const interval = setInterval(() => {
        checkServerStatus();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [serverStatus]);

  return (
    <AuthContext.Provider
      value={{
        // Existing values - preserved exactly as they were
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
        
        // Existing new functions - preserved exactly as they were
        silentLogout,
        refreshToken,
        changePassword,
        updateProfile,
        checkTokenValidity,
        getUserRole,
        hasRole,
        hasAnyRole,
        
        // NEW ADDITIONAL FUNCTIONS - expanded functionality
        getAuthToken, // Get auth token for API calls
        clearAllStorage, // Clear all storage for debugging
        debugStorage, // Debug storage contents
        clearCorruptedStorage, // Clear corrupted storage data
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};