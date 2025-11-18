// preload.js
const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose enhanced desktop functionality with user isolation
contextBridge.exposeInMainWorld('electronAPI', {
  // === WINDOW CONTROLS ===
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // === APP INFO ===
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => process.platform,
  
  // === API & ORDER MANAGEMENT ===
  checkAPIConnection: () => ipcRenderer.invoke('api:check-connection'),
  submitOrder: (orderData) => ipcRenderer.invoke('api:submit-order', orderData),
  getPendingOrders: () => ipcRenderer.invoke('api:get-pending-orders'),
  retryPendingOrders: () => ipcRenderer.invoke('api:retry-pending-orders'),
  deletePendingOrder: (orderId) => ipcRenderer.invoke('api:delete-pending-order', orderId),
  
  // === AUTH MANAGEMENT ===
  setAuthToken: (token) => ipcRenderer.invoke('auth:set-token', token),
  
  // === FILE OPERATIONS ===
  saveRegistrationData: (data, filename) => ipcRenderer.invoke('file:save-data', data, filename),
  loadRegistrationData: () => ipcRenderer.invoke('file:load-data'),
  uploadImage: (options) => ipcRenderer.invoke('file:upload-image', options),
  
  // === REGISTRATION MANAGEMENT ===
  saveRegistrationDraft: (formData) => ipcRenderer.invoke('registration:save-draft', formData),
  loadRegistrationDrafts: () => ipcRenderer.invoke('registration:load-drafts'),
  printRegistration: (formData) => ipcRenderer.invoke('registration:print', formData),
  
  // === DESKTOP NOTIFICATIONS ===
  showNotification: (title, body, icon = '/assets/icon.png') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { 
        body, 
        icon,
        silent: false
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon });
        }
      });
    }
  },
  
  // === ENHANCED STORAGE WITH USER ISOLATION ===
  storage: {
    // Local storage fallback
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.error('localStorage setItem failed:', e);
        return false;
      }
    },
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('localStorage getItem failed:', e);
        return null;
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('localStorage removeItem failed:', e);
        return false;
      }
    },
    clear: () => {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.error('localStorage clear failed:', e);
        return false;
      }
    },
    
    // Desktop-specific persistent storage
    setPersistent: async (key, value) => {
      return await ipcRenderer.invoke('storage:set-persistent', key, value);
    },
    getPersistent: async (key) => {
      return await ipcRenderer.invoke('storage:get-persistent', key);
    },
    
    // NEW: User-specific storage
    setUserData: async (key, value, userId) => {
      if (!userId) {
        console.error('User ID required for setUserData');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:set-user-data', key, value, userId);
    },
    
    getUserData: async (key, userId) => {
      if (!userId) {
        console.error('User ID required for getUserData');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:get-user-data', key, userId);
    },

    // Order-specific storage with user context
    setOrderData: async (key, value, userId) => {
      if (!userId) {
        console.error('User ID required for order data');
        return { success: false, error: 'User ID required' };
      }
      const userKey = `order_${userId}_${key}`;
      return await ipcRenderer.invoke('storage:set-user-data', userKey, value, userId);
    },
    
    getOrderData: async (key, userId) => {
      if (!userId) {
        console.error('User ID required for order data');
        return { success: false, error: 'User ID required' };
      }
      const userKey = `order_${userId}_${key}`;
      return await ipcRenderer.invoke('storage:get-user-data', userKey, userId);
    },

    // Clear all user data
    clearUserData: async (userId) => {
      return await ipcRenderer.invoke('storage:clear-user-data', userId);
    },

    // Get all user data keys
    getUserDataKeys: async (userId) => {
      if (!userId) {
        console.error('User ID required for getUserDataKeys');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:get-user-data-keys', userId);
    },

    // Delete specific user data
    deleteUserData: async (key, userId) => {
      if (!userId) {
        console.error('User ID required for deleteUserData');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:delete-user-data', key, userId);
    },

    // User order management
    setUserOrder: async (orderId, orderData, userId) => {
      if (!userId) {
        console.error('User ID required for setUserOrder');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:set-user-order', orderId, orderData, userId);
    },

    getUserOrder: async (orderId, userId) => {
      if (!userId) {
        console.error('User ID required for getUserOrder');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:get-user-order', orderId, userId);
    },

    getUserOrders: async (userId) => {
      if (!userId) {
        console.error('User ID required for getUserOrders');
        return { success: false, error: 'User ID required' };
      }
      return await ipcRenderer.invoke('storage:get-user-orders', userId);
    },

    // Security maintenance
    cleanupForeignData: async (currentUserId) => {
      if (!currentUserId) {
        console.error('Current user ID required for cleanupForeignData');
        return { success: false, error: 'Current user ID required' };
      }
      return await ipcRenderer.invoke('storage:cleanup-foreign-data', currentUserId);
    }
  },
  
  // === MENU EVENT LISTENERS ===
  onMenuNewOrder: (callback) => ipcRenderer.on('menu-new-order', callback),
  onMenuNewRegistration: (callback) => ipcRenderer.on('menu-new-registration', callback),
  onMenuBackToRole: (callback) => ipcRenderer.on('menu-back-to-role', callback),
  onMenuSyncOrders: (callback) => ipcRenderer.on('menu-sync-orders', callback),
  onMenuViewPending: (callback) => ipcRenderer.on('menu-view-pending', callback),
  onMenuExportOrders: (callback) => ipcRenderer.on('menu-export-orders', callback),
  
  // === NETWORK MONITORING ===
  onOnlineStatusChange: (callback) => {
    const handleOnline = () => callback({ online: true });
    const handleOffline = () => callback({ online: false });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
  
  getNetworkStatus: () => navigator.onLine,
  
  // === UTILITIES ===
  openExternal: (url) => shell.openExternal(url),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

console.log('Trade Uganda Desktop API loaded successfully');