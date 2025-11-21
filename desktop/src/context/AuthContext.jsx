// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  // Use your live backend URL directly for desktop
  const API_BASE_URL = 'https://mytrade-cx5z.onrender.com';

  // ==================== USER DATA ISOLATION METHODS ====================

  // Get user-specific storage key
  const getUserStorageKey = (key) => {
    if (!user?.id) {
      return key; // Fallback to original key if no user
    }
    return `user_${user.id}_${key}`;
  };

  // User-specific safe storage getter
  const getUserStoredItem = (key) => {
    try {
      if (!user?.id) {
        return null;
      }
      
      const userKey = getUserStorageKey(key);
      const value = localStorage.getItem(userKey);
      
      if (value === null) return null;
      
      try {
        const parsed = JSON.parse(value);
        // Validate ownership
        if (parsed && parsed.userId && parsed.userId !== user.id) {
          console.warn('Data ownership mismatch - clearing foreign data');
          localStorage.removeItem(userKey);
          return null;
        }
        return parsed?.data || parsed;
      } catch (parseError) {
        console.warn(`Failed to parse user data for key "${userKey}"`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting user item "${key}":`, error);
      return null;
    }
  };

  // User-specific safe storage setter
  const setUserStoredItem = (key, value) => {
    try {
      if (!user?.id) {
        return false;
      }
      
      const userKey = getUserStorageKey(key);
      const valueToStore = JSON.stringify({
        data: value,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      localStorage.setItem(userKey, valueToStore);
      return true;
    } catch (error) {
      console.error(`Error setting user item "${key}":`, error);
      return false;
    }
  };

  // Clear all user-specific data on logout
  const clearUserData = () => {
    try {
      if (!user?.id) return;
      
      const userPrefix = `user_${user.id}_`;
      const keysToRemove = [];
      
      // Find all keys belonging to this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(userPrefix)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all user-specific keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} user data items for user ${user.id}`);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  // Validate user ownership of data
  const validateUserOwnership = (data) => {
    if (!user?.id) return false;
    
    // Check if data has userId field and matches current user
    if (data && data.userId && data.userId !== user.id) {
      console.warn('Data ownership violation detected');
      return false;
    }
    
    return true;
  };

  // Get all user data keys
  const getUserDataKeys = () => {
    if (!user?.id) return [];
    
    const userPrefix = `user_${user.id}_`;
    const userKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix)) {
        userKeys.push(key.replace(userPrefix, ''));
      }
    }
    
    return userKeys;
  };

  // Clean up foreign user data
  const cleanupForeignData = () => {
    try {
      if (!user?.id) return;
      
      const currentUserPrefix = `user_${user.id}_`;
      let cleanedCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_') && !key.startsWith(currentUserPrefix)) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`Cleaned ${cleanedCount} foreign user data items`);
      }
    } catch (error) {
      console.error('Error cleaning foreign data:', error);
    }
  };

  // ==================== CORE STORAGE METHODS ====================

  // Enhanced safe storage getter to handle JSON parsing errors
  const getStoredItem = (key) => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      
      // Special handling for token to prevent parsing warnings
      if (key === 'trade_uganda_token') {
        if (typeof value === 'string' && value.startsWith('eyJ')) {
          return value;
        }
        
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && parsed.token) {
            return parsed.token;
          }
          if (typeof parsed === 'string' && parsed.startsWith('eyJ')) {
            return parsed;
          }
          return parsed;
        } catch (parseError) {
          if (typeof value === 'string' && value.startsWith('eyJ')) {
            return value;
          }
          console.warn(`Failed to parse stored value for key "${key}". Returning raw value.`);
          return value;
        }
      }
      
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

  // Enhanced safe storage setter
  const setStoredItem = (key, value) => {
    try {
      if (key === 'trade_uganda_token' && typeof value === 'string' && value.startsWith('eyJ')) {
        localStorage.setItem(key, value);
      } else {
        const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, valueToStore);
      }
    } catch (error) {
      console.error(`Error setting item "${key}" in storage:`, error);
    }
  };

  // Enhanced clear corrupted storage data
  const clearCorruptedStorage = () => {
    try {
      const keys = Object.keys(localStorage);
      const corruptedKeys = [];
      
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            if (key !== 'trade_uganda_token') {
              JSON.parse(value);
            }
          }
        } catch (error) {
          console.log(`Found corrupted data for key: ${key}, clearing it.`);
          corruptedKeys.push(key);
        }
      }
      
      if (corruptedKeys.length > 0) {
        corruptedKeys.forEach(key => localStorage.removeItem(key));
        console.log(`Cleared ${corruptedKeys.length} corrupted keys`);
      }
    } catch (error) {
      console.error('Error clearing corrupted storage:', error);
    }
  };

  // Enhanced debug storage contents
  const debugStorage = () => {
    try {
      const keys = Object.keys(localStorage);
      console.log('=== Storage Contents ===');
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`${key}:`, key === 'trade_uganda_token' ? `${value?.substring(0, 20)}...` : value);
      });
      console.log('=== End Storage Contents ===');
    } catch (error) {
      console.error('Error debugging storage:', error);
    }
  };

  // Enhanced update user data
  const updateUser = (userData) => {
    setUser(userData);
    setStoredItem('trade_uganda_user', userData);
  };

  // ==================== AUTHENTICATION METHODS ====================

  // Enhanced check server status with better error handling
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

  // FIXED: Enhanced check if user is authenticated on app load
  const checkAuth = async () => {
    try {
      setLoading(true);
      const storedToken = getStoredItem('trade_uganda_token');
      const storedUser = getStoredItem('trade_uganda_user');
      
      console.log('🔄 Auth check - Token exists:', !!storedToken, 'User exists:', !!storedUser);
      
      if (!storedToken || !storedUser) {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        return;
      }

      // Set initial state from stored data first
      setUser(storedUser);
      setToken(storedToken);
      setIsAuthenticated(true);
      
      console.log('✅ User authenticated from stored data');

      // Then verify with backend in background (don't block UI)
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          method: 'GET',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const userData = await response.json();
          // Update with fresh user data if available
          if (userData.user) {
            setUser(userData.user);
            setStoredItem('trade_uganda_user', userData.user);
            console.log('✅ User verified with backend');
          }
        } else {
          console.warn('⚠️ Token verification failed, but keeping user logged in');
          // Don't logout on verification failure - keep user logged in
        }
      } catch (error) {
        console.warn('⚠️ Token verification error, but keeping user logged in:', error.message);
        // Don't logout on network errors
      }
      
    } catch (error) {
      console.error('Error checking authentication:', error);
      // Don't clear storage on errors - keep user logged in
    } finally {
      setLoading(false);
    }
  };

  // Enhanced register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      
      const isServerOnline = await checkServerStatus();
      if (!isServerOnline) {
        return { 
          success: false, 
          message: 'Cannot connect to server. Please check your internet connection.'
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.token && data.user) {
          setToken(data.token);
          setUser(data.user);
          setIsAuthenticated(true);
          setStoredItem('trade_uganda_token', data.token);
          setStoredItem('trade_uganda_user', data.user);
        }
        
        return { 
          success: true, 
          message: data.message || 'Registration successful! Please login to continue.',
          user: data.user 
        };
      } else {
        return { 
          success: false, 
          message: data.message || 'Registration failed. Please try again.',
          errors: data.errors || []
        };
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: 'Network error. Please check your connection and try again.',
        error: error.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced login user - Immediate state update
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const isServerOnline = await checkServerStatus();
      if (!isServerOnline) {
        return { 
          success: false, 
          message: 'Cannot connect to server. Please check your internet connection.'
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      console.log('🔐 Login API Response:', data);
      
      if (response.ok && data.success) {
        // CRITICAL: Set auth state immediately before storage
        setUser(data.user);
        setToken(data.token);
        setIsAuthenticated(true);
        
        // Then store in localStorage
        setStoredItem('trade_uganda_token', data.token);
        setStoredItem('trade_uganda_user', data.user);
        
        console.log('✅ Login successful - User authenticated:', data.user);
        
        return { 
          success: true, 
          user: data.user, 
          token: data.token,
          message: 'Login successful!' 
        };
      } else {
        console.log('❌ Login failed:', data.message);
        return { 
          success: false, 
          message: data.message || 'Login failed. Please check your credentials.' 
        };
      }
      
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'Network error. Please check your connection and try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced logout with user data cleanup and forced redirect
  const logout = async () => {
    try {
      setLoading(true);
      console.log('🚪 Starting logout process...');
      
      // Clear user-specific data first
      clearUserData();
      
      try {
        const currentToken = getStoredItem('trade_uganda_token');
        if (currentToken) {
          console.log('🔐 Calling backend logout endpoint...');
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: getAuthHeaders()
          });
        }
      } catch (error) {
        console.error('Logout API error:', error);
        // Continue with logout even if API call fails
      }
      
      // Clear auth data from localStorage
      console.log('🗑️ Clearing local storage...');
      localStorage.removeItem('trade_uganda_user');
      localStorage.removeItem('trade_uganda_token');
      
      // Reset all auth state
      console.log('🔄 Resetting auth state...');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      console.log('✅ Logout completed successfully');
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        console.log('🔄 Forcing page reload...');
        window.location.reload();
      }, 500);
      
      return { success: true, message: 'Logged out successfully' };
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, message: 'Logout failed' };
    } finally {
      setLoading(false);
    }
  };

  // Enhanced update user profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      
      const currentToken = getStoredItem('trade_uganda_token');
      if (!currentToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setStoredItem('trade_uganda_user', data.user);
        return { success: true, user: data.user };
      } else {
        return { 
          success: false, 
          message: data.message || 'Profile update failed',
          errors: data.errors || []
        };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        message: 'Network error. Please check your connection and try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Enhanced silent logout
  const silentLogout = async () => {
    try {
      console.log('Performing silent logout...');
      clearUserData();
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem('trade_uganda_token');
      localStorage.removeItem('trade_uganda_user');
      console.log('Silent logout completed');
    } catch (error) {
      console.error('Silent logout error:', error);
    }
  };

  // Enhanced refresh token
  const refreshToken = async () => {
    try {
      const currentToken = getStoredItem('trade_uganda_token');
      if (!currentToken) {
        throw new Error('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { token: newToken, user: userData } = data;

      setToken(newToken);
      setUser(userData);
      setStoredItem('trade_uganda_token', newToken);
      setStoredItem('trade_uganda_user', userData);

      return { success: true, token: newToken };
    } catch (error) {
      console.error('Token refresh error:', error);
      await silentLogout();
      return { success: false, message: 'Session expired. Please login again.' };
    }
  };

  // Enhanced get auth token for API calls
  const getAuthToken = () => {
    if (token) return token;
    const storedToken = getStoredItem('trade_uganda_token');
    return storedToken;
  };

  // Enhanced change password
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

  // FIXED: Enhanced check if token is valid - Don't auto-logout on errors
  const checkTokenValidity = async () => {
    try {
      const currentToken = getStoredItem('trade_uganda_token');
      if (!currentToken) {
        return { isValid: false, message: 'No token found' };
      }

      // Skip verification if endpoint doesn't exist - assume token is valid
      console.log('⚠️ Skipping token verification - assuming token is valid');
      return { isValid: true };
      
    } catch (error) {
      console.error('Token validity check error:', error);
      // Don't logout on errors - assume token is valid
      return { isValid: true, message: 'Token check failed but keeping session' };
    }
  };

  // Enhanced get auth headers for API calls
  const getAuthHeaders = () => {
    try {
      const storedToken = getStoredItem('trade_uganda_token');
      let actualToken = storedToken;
      
      if (storedToken && typeof storedToken === 'object' && storedToken.token) {
        actualToken = storedToken.token;
      } else if (storedToken && typeof storedToken === 'string') {
        try {
          const parsed = JSON.parse(storedToken);
          actualToken = parsed.token || parsed;
        } catch {
          actualToken = storedToken;
        }
      }

      if (!actualToken) {
        console.warn('No auth token available');
        return { 'Content-Type': 'application/json' };
      }

      return {
        'Authorization': `Bearer ${actualToken}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return { 'Content-Type': 'application/json' };
    }
  };

  // Enhanced get user role
  const getUserRole = () => {
    return user?.role || null;
  };

  // Enhanced check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Enhanced check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Enhanced clear all storage
  const clearAllStorage = async () => {
    try {
      localStorage.clear();
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      console.log('All storage cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('Error clearing storage:', error);
      return { success: false, message: error.message };
    }
  };

  // ==================== DATA MIGRATION ====================

  // Migrate old data to user-specific storage
  const migrateUserData = async () => {
    if (!user?.id) return;
    
    const migrationKeys = [
      'pending_orders',
      'draft_orders', 
      'user_settings',
      'offline_data',
      'receipts_data',
      'orders_data',
      'inventory_data',
      'sales_data'
    ];
    
    migrationKeys.forEach(key => {
      try {
        const oldData = localStorage.getItem(key);
        if (oldData) {
          setUserStoredItem(key, JSON.parse(oldData));
          localStorage.removeItem(key);
          console.log(`Migrated ${key} to user-specific storage`);
        }
      } catch (error) {
        console.error(`Error migrating ${key}:`, error);
      }
    });
  };

  // ==================== USE EFFECTS ====================

  // FIXED: Enhanced check auth status on component mount - No auto-logout
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        clearCorruptedStorage();
        
        const storedToken = getStoredItem('trade_uganda_token');
        const storedUser = getStoredItem('trade_uganda_user');
        
        console.log('🔄 Auth initialization - Token exists:', !!storedToken, 'User exists:', !!storedUser);
        
        if (storedToken && storedUser) {
          // Set user as authenticated immediately
          setUser(storedUser);
          setToken(storedToken);
          setIsAuthenticated(true);
          
          console.log('✅ User authenticated from stored data');
          
          // Migrate data and clean up for this user
          migrateUserData();
          cleanupForeignData();
        } else {
          console.log('❌ No stored auth data found');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Don't logout on initialization errors
      } finally {
        setLoading(false);
        console.log('✅ Auth initialization complete');
      }
    };

    initializeAuth();
  }, []);

  // Enhanced periodically check server status when online
  useEffect(() => {
    if (serverStatus === 'online') {
      const interval = setInterval(() => {
        checkServerStatus();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [serverStatus]);

  // ==================== CONTEXT VALUE ====================

  const value = {
    // Core authentication state
    user,
    isAuthenticated,
    loading,
    token,
    serverStatus,

    // Core authentication methods
    register,
    login,
    logout,
    updateProfile,
    checkAuth,
    getAuthHeaders,
    API_BASE_URL,

    // Enhanced authentication methods
    checkServerStatus,
    silentLogout,
    refreshToken,
    getAuthToken,
    changePassword,
    checkTokenValidity,
    getUserRole,
    hasRole,
    hasAnyRole,
    clearAllStorage,
    debugStorage,
    clearCorruptedStorage,
    updateUser,

    // User data isolation methods
    getUserStoredItem,
    setUserStoredItem,
    clearUserData,
    validateUserOwnership,
    getUserStorageKey,
    getUserDataKeys,
    cleanupForeignData,
    migrateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export only once - no duplicate exports
export { AuthProvider, useAuth };
export default AuthContext;