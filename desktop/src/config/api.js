// src/config/api.js

// Determine environment
const isDevelopment = import.meta.env.DEV;
const isElectron = window.electronAPI;

// API Configuration
let API_BASE_URL;
let SOCKET_SERVER;

if (isDevelopment) {
  // Development - local backend
  API_BASE_URL = 'http://localhost:5000';
  SOCKET_SERVER = 'http://localhost:5000';
  
  console.log('🔧 Development mode - Using local backend:', API_BASE_URL);
} else {
  // Production - your deployed backend
  API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.tradeuganda.com';
  SOCKET_SERVER = import.meta.env.VITE_SOCKET_SERVER || 'https://api.tradeuganda.com';
  
  console.log('🚀 Production mode - Using backend:', API_BASE_URL);
}

// Special handling for Electron
if (isElectron) {
  console.log('💻 Electron environment detected');
  
  // In Electron, we might need to handle different protocols
  if (isDevelopment) {
    // For Electron dev, ensure we're using the correct protocol
    if (window.location.protocol === 'http:' && API_BASE_URL.startsWith('http://')) {
      console.log('✅ HTTP protocol compatible with Electron');
    }
  }
}

export { API_BASE_URL, SOCKET_SERVER };