import React, { createContext, useContext, useState, useEffect } from 'react';

// Use Vite environment variables for API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'

  // NEW FUNCTION: Update user data in context and localStorage
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Check server status
  const checkServerStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

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
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));

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
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }

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
      localStorage.setItem('token', newAuthToken);
      localStorage.setItem('user', JSON.stringify(newUserData));

      return { success: true, user: newUserData };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken || !storedUser) {
        setLoading(false);
        return;
      }

      try {
        // Check server status first
        const isServerOnline = await checkServerStatus();
        if (!isServerOnline) {
          // If server is offline but we have stored user data, use it
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setToken(storedToken);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
          setLoading(false);
          return;
        }

        // Verify token with server
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        // If server is unreachable but we have stored data, use it temporarily
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setToken(storedToken);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
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
        updateUser, // NEW: Added updateUser function
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