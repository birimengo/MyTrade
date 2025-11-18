const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    icon: path.join(__dirname, 'assets/icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    resizable: true,
    backgroundColor: '#f9fafb',
    title: 'Trade Uganda Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: isDev ? false : true,
      allowRunningInsecureContent: isDev,
      experimentalFeatures: false
    }
  });

  // FIXED: Enhanced Content Security Policy with proper WebSocket support
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev 
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 http://localhost:5000 https://mytrade-cx5z.onrender.com https://api.cloudinary.com data:; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 https://mytrade-cx5z.onrender.com; " +
              "style-src 'self' 'unsafe-inline' http://localhost:3000 https://fonts.googleapis.com; " +
              "connect-src 'self' 'unsafe-inline' http://localhost:3000 http://localhost:5000 https://mytrade-cx5z.onrender.com ws://localhost:5000 wss://localhost:5000 ws://127.0.0.1:5000 wss://127.0.0.1:5000 ws://localhost:3000 wss://localhost:3000 wss://mytrade-cx5z.onrender.com https://api.cloudinary.com https://tradeuganda.com http://127.0.0.1:5000 https://127.0.0.1:5000 blob:; " +
              "img-src 'self' data: blob: http: https:; " +
              "font-src 'self' data: https://fonts.gstatic.com; " +
              "media-src 'self' blob: http: https:; " +
              "frame-src 'self'"
            : 
            "default-src 'self' https://mytrade-cx5z.onrender.com; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "connect-src 'self' https://mytrade-cx5z.onrender.com wss://mytrade-cx5z.onrender.com https://api.cloudinary.com; " +
            "img-src 'self' data: blob: https: http:; " +
            "font-src 'self' data: https://fonts.gstatic.com; " +
            "media-src 'self' blob:;"
        ]
      }
    });
  });

  // Application Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Order',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-order')
        },
        {
          label: 'New Registration',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => mainWindow.webContents.send('menu-new-registration')
        },
        { type: 'separator' },
        {
          label: 'Back to Role Selection',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu-back-to-role')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit Trade Uganda' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Orders',
      submenu: [
        {
          label: 'Sync Pending Orders',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-sync-orders')
        },
        {
          label: 'View Pending Orders',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow.webContents.send('menu-view-pending')
        },
        { type: 'separator' },
        {
          label: 'Export Orders',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-export-orders')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => await shell.openExternal('https://docs.tradeuganda.com')
        },
        {
          label: 'Support',
          click: async () => await shell.openExternal('https://support.tradeuganda.com')
        },
        { type: 'separator' },
        {
          label: 'About Trade Uganda',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Trade Uganda Desktop',
              detail: `Version ${app.getVersion()}\nUganda's Premier B2B Platform`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
      console.log('🚀 Electron App Started in Development Mode');
      console.log('🔧 WebSecurity disabled for development');
    }
  });

  mainWindow.on('closed', () => (mainWindow = null));

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// === WINDOW CONTROL HANDLERS ===
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('app:getVersion', () => app.getVersion());

// === API & ORDER MANAGEMENT HANDLERS ===

// Check backend connectivity - UPDATED TO INCLUDE YOUR RENDER URL
ipcMain.handle('api:check-connection', async () => {
  try {
    const fetch = require('node-fetch');
    const endpoints = [
      'http://localhost:5000/api/health',
      'http://127.0.0.1:5000/api/health',
      'https://mytrade-cx5z.onrender.com/api/health'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Checking endpoint: ${endpoint}`);
        const response = await fetch(endpoint, { timeout: 5000 });
        if (response.ok) {
          console.log(`✅ Endpoint ${endpoint} is reachable`);
          return { 
            success: true, 
            status: response.status,
            endpoint: endpoint,
            online: true 
          };
        }
      } catch (e) {
        console.log(`❌ Endpoint ${endpoint} failed:`, e.message);
        continue;
      }
    }
    
    throw new Error('All endpoints failed');
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      online: false 
    };
  }
});

// Get auth token from storage
const getAuthToken = async () => {
  try {
    const appDataPath = app.getPath('userData');
    const storagePath = path.join(appDataPath, 'storage.json');
    const existingData = await fs.readFile(storagePath, 'utf8').catch(() => '{}');
    const storage = JSON.parse(existingData);
    return storage.authToken || null;
  } catch (error) {
    console.log('Error getting auth token:', error.message);
    return null;
  }
};

// Submit order with enhanced error handling
ipcMain.handle('api:submit-order', async (event, orderData) => {
  try {
    const fetch = require('node-fetch');
    
    console.log('Electron: Submitting order to backend:', {
      product: orderData.product,
      quantity: orderData.quantity,
      deliveryPlace: orderData.deliveryPlace,
      userId: orderData.userId // Log user context
    });

    const authToken = await getAuthToken();
    console.log('Electron: Auth token available:', !!authToken);

    const endpoints = [
      'http://localhost:5000/api/retailer-orders',
      'http://127.0.0.1:5000/api/retailer-orders',
      'https://mytrade-cx5z.onrender.com/api/retailer-orders'
    ];

    let lastError;
    for (const endpoint of endpoints) {
      try {
        console.log(`Electron: Trying endpoint: ${endpoint}`);
        
        const headers = {
          'Content-Type': 'application/json',
        };

        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(orderData),
          timeout: 10000
        });

        console.log(`Electron: Response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Electron: Order submitted successfully:', result);
          return { 
            success: true, 
            data: result,
            endpoint: endpoint 
          };
        } else {
          const errorText = await response.text();
          console.log(`Electron: API error ${response.status}:`, errorText);
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.log(`Electron: Network error for ${endpoint}:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw lastError;

  } catch (error) {
    console.log('Electron: Order submission failed, saving locally:', error.message);
    
    try {
      const appDataPath = app.getPath('userData');
      const pendingPath = path.join(appDataPath, 'pending-orders');
      await fs.mkdir(pendingPath, { recursive: true });
      
      const orderWithError = {
        ...orderData,
        id: orderData.id || `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        attemptedAt: new Date().toISOString(),
        error: error.message,
        status: 'pending',
        retryCount: 0
      };
      
      const pendingFile = path.join(pendingPath, `${orderWithError.id}.json`);
      await fs.writeFile(pendingFile, JSON.stringify(orderWithError, null, 2));
      
      console.log('Electron: Order saved locally:', pendingFile);
      
      return { 
        success: false, 
        error: error.message,
        savedLocally: true,
        localPath: pendingFile,
        orderId: orderWithError.id
      };
    } catch (saveError) {
      console.log('Electron: Failed to save order locally:', saveError.message);
      return { 
        success: false, 
        error: `API: ${error.message}, Local Save: ${saveError.message}` 
      };
    }
  }
});

// Store auth token from renderer
ipcMain.handle('auth:set-token', async (event, token) => {
  try {
    const appDataPath = app.getPath('userData');
    const storagePath = path.join(appDataPath, 'storage.json');
    let storage = {};
    try {
      const existingData = await fs.readFile(storagePath, 'utf8');
      storage = JSON.parse(existingData);
    } catch {}
    storage.authToken = token;
    await fs.writeFile(storagePath, JSON.stringify(storage, null, 2));
    console.log('Electron: Auth token stored successfully');
    return { success: true };
  } catch (error) {
    console.log('Electron: Error storing auth token:', error.message);
    return { success: false, error: error.message };
  }
});

// Get pending orders for sync
const getPendingOrdersInternal = async () => {
  try {
    const appDataPath = app.getPath('userData');
    const pendingPath = path.join(appDataPath, 'pending-orders');
    
    try {
      await fs.access(pendingPath);
    } catch {
      return { success: true, orders: [] };
    }
    
    const files = await fs.readdir(pendingPath);
    const pendingOrders = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(pendingPath, file), 'utf8');
          const orderData = JSON.parse(content);
          pendingOrders.push({
            ...orderData,
            filePath: path.join(pendingPath, file),
            fileName: file
          });
        } catch (parseError) {
          console.error(`Error parsing ${file}:`, parseError);
        }
      }
    }
    
    return { success: true, orders: pendingOrders };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

ipcMain.handle('api:get-pending-orders', getPendingOrdersInternal);

// Retry failed orders
ipcMain.handle('api:retry-pending-orders', async () => {
  try {
    const pendingResult = await getPendingOrdersInternal();
    if (!pendingResult.success) throw new Error(pendingResult.error);
    
    const results = [];
    const connectionResult = await ipcMain.invoke('api:check-connection');
    
    if (!connectionResult.online) {
      throw new Error('No network connection available');
    }
    
    for (const order of pendingResult.orders) {
      try {
        const updatedOrder = {
          ...order,
          retryCount: (order.retryCount || 0) + 1,
          lastRetryAttempt: new Date().toISOString()
        };

        const submitResult = await ipcMain.invoke('api:submit-order', updatedOrder);
        
        if (submitResult.success) {
          await fs.unlink(order.filePath);
          results.push({ 
            orderId: order.id, 
            success: true,
            endpoint: submitResult.endpoint 
          });
        } else {
          await fs.writeFile(order.filePath, JSON.stringify(updatedOrder, null, 2));
          results.push({ 
            orderId: order.id, 
            success: false, 
            error: submitResult.error 
          });
        }
      } catch (error) {
        results.push({ orderId: order.id, success: false, error: error.message });
      }
    }
    
    return { success: true, results, total: pendingResult.orders.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete pending order
ipcMain.handle('api:delete-pending-order', async (event, orderId) => {
  try {
    const pendingResult = await getPendingOrdersInternal();
    if (!pendingResult.success) throw new Error(pendingResult.error);
    
    const order = pendingResult.orders.find(o => o.id === orderId);
    if (order && order.filePath) {
      await fs.unlink(order.filePath);
      return { success: true, orderId };
    }
    
    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === FILE OPERATIONS ===
ipcMain.handle('file:save-data', async (event, data, filename = 'trade-uganda-data.json') => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (filePath) {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return { success: true, path: filePath };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:load-data', async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (filePaths.length > 0) {
      const data = await fs.readFile(filePaths[0], 'utf8');
      return { success: true, data: JSON.parse(data), path: filePaths[0] };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:upload-image', async (event, options = {}) => {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile'],
      ...options
    });
    if (filePaths.length > 0) {
      const fileBuffer = await fs.readFile(filePaths[0]);
      return {
        success: true,
        filePath: filePaths[0],
        fileName: path.basename(filePaths[0]),
        fileBuffer: fileBuffer.toString('base64'),
        size: fileBuffer.length
      };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === REGISTRATION MANAGEMENT ===
ipcMain.handle('registration:save-draft', async (event, formData) => {
  try {
    const appDataPath = app.getPath('userData');
    const draftsPath = path.join(appDataPath, 'drafts');
    await fs.mkdir(draftsPath, { recursive: true });
    const draftFile = path.join(draftsPath, `registration-draft-${Date.now()}.json`);
    await fs.writeFile(draftFile, JSON.stringify({
      ...formData,
      savedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2));
    return { success: true, path: draftFile };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('registration:load-drafts', async () => {
  try {
    const appDataPath = app.getPath('userData');
    const draftsPath = path.join(appDataPath, 'drafts');
    try {
      await fs.access(draftsPath);
    } catch {
      return { success: true, drafts: [] };
    }
    const files = await fs.readdir(draftsPath);
    const drafts = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(draftsPath, file), 'utf8');
        drafts.push(JSON.parse(content));
      }
    }
    return { success: true, drafts: drafts.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('registration:print', async (event, formData) => {
  try {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Save as PDF', 'Print', 'Cancel'],
      defaultId: 0,
      message: 'How would you like to export your registration?',
      detail: 'You can save as PDF for digital records or print directly.'
    });
    if (response === 0) {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `trade-uganda-registration-${formData.firstName}-${formData.lastName}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });
      if (filePath) {
        return { success: true, type: 'pdf', path: filePath };
      }
    } else if (response === 1) {
      mainWindow.webContents.print({ silent: false, printBackground: true });
      return { success: true, type: 'print' };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === PERSISTENT STORAGE ===
ipcMain.handle('storage:set-persistent', async (event, key, value) => {
  try {
    const appDataPath = app.getPath('userData');
    const storagePath = path.join(appDataPath, 'storage.json');
    let storage = {};
    try {
      const existingData = await fs.readFile(storagePath, 'utf8');
      storage = JSON.parse(existingData);
    } catch {}
    storage[key] = value;
    await fs.writeFile(storagePath, JSON.stringify(storage, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:get-persistent', async (event, key) => {
  try {
    const appDataPath = app.getPath('userData');
    const storagePath = path.join(appDataPath, 'storage.json');
    const existingData = await fs.readFile(storagePath, 'utf8').catch(() => '{}');
    const storage = JSON.parse(existingData);
    return { success: true, value: storage[key] || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === USER-SPECIFIC STORAGE HANDLERS ===
// NEW: User-specific file storage with isolation
ipcMain.handle('storage:set-user-data', async (event, key, value, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const userStoragePath = path.join(appDataPath, 'user_data', userId);
    await fs.mkdir(userStoragePath, { recursive: true });
    
    const filePath = path.join(userStoragePath, `${key}.json`);
    const userData = {
      data: value,
      userId: userId,
      storedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:get-user-data', async (event, key, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const filePath = path.join(appDataPath, 'user_data', userId, `${key}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const userData = JSON.parse(data);
      
      // Verify ownership - critical security check
      if (userData.userId !== userId) {
        console.warn(`Data ownership mismatch for user ${userId}, deleting foreign data`);
        await fs.unlink(filePath);
        return { success: false, error: 'Data ownership mismatch' };
      }
      
      return { success: true, value: userData.data, metadata: userData };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, value: null };
      }
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Clear all user data
ipcMain.handle('storage:clear-user-data', async (event, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const userStoragePath = path.join(appDataPath, 'user_data', userId);
    
    try {
      await fs.rm(userStoragePath, { recursive: true, force: true });
      console.log(`Cleared all user data for user: ${userId}`);
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true }; // Already deleted
      }
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Get all user data keys
ipcMain.handle('storage:get-user-data-keys', async (event, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const userStoragePath = path.join(appDataPath, 'user_data', userId);
    
    try {
      await fs.access(userStoragePath);
    } catch {
      return { success: true, keys: [] };
    }
    
    const files = await fs.readdir(userStoragePath);
    const keys = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    return { success: true, keys };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Delete specific user data
ipcMain.handle('storage:delete-user-data', async (event, key, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const filePath = path.join(appDataPath, 'user_data', userId, `${key}.json`);
    
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true }; // Already deleted
      }
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Enhanced order storage with user isolation
ipcMain.handle('storage:set-user-order', async (event, orderId, orderData, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const userOrdersPath = path.join(appDataPath, 'user_orders', userId);
    await fs.mkdir(userOrdersPath, { recursive: true });
    
    const orderWithUser = {
      ...orderData,
      userId: userId,
      storedAt: new Date().toISOString()
    };
    
    const filePath = path.join(userOrdersPath, `${orderId}.json`);
    await fs.writeFile(filePath, JSON.stringify(orderWithUser, null, 2));
    
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:get-user-order', async (event, orderId, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const filePath = path.join(appDataPath, 'user_orders', userId, `${orderId}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const orderData = JSON.parse(data);
      
      // Verify ownership
      if (orderData.userId !== userId) {
        await fs.unlink(filePath);
        return { success: false, error: 'Order ownership mismatch' };
      }
      
      return { success: true, value: orderData };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, value: null };
      }
      throw error;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Get all user orders
ipcMain.handle('storage:get-user-orders', async (event, userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const userOrdersPath = path.join(appDataPath, 'user_orders', userId);
    
    try {
      await fs.access(userOrdersPath);
    } catch {
      return { success: true, orders: [] };
    }
    
    const files = await fs.readdir(userOrdersPath);
    const orders = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(userOrdersPath, file), 'utf8');
          const orderData = JSON.parse(content);
          
          // Verify ownership for each order
          if (orderData.userId === userId) {
            orders.push(orderData);
          } else {
            // Clean up foreign data
            await fs.unlink(path.join(userOrdersPath, file));
          }
        } catch (parseError) {
          console.error(`Error parsing order file ${file}:`, parseError);
        }
      }
    }
    
    return { success: true, orders };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NEW: Clean up all foreign user data (security maintenance)
ipcMain.handle('storage:cleanup-foreign-data', async (event, currentUserId) => {
  try {
    if (!currentUserId) {
      return { success: false, error: 'Current user ID required' };
    }
    
    const appDataPath = app.getPath('userData');
    const userDataPath = path.join(appDataPath, 'user_data');
    const userOrdersPath = path.join(appDataPath, 'user_orders');
    
    let cleanedCount = 0;
    
    // Clean user_data directory
    try {
      await fs.access(userDataPath);
      const userDirs = await fs.readdir(userDataPath);
      
      for (const userDir of userDirs) {
        if (userDir !== currentUserId) {
          const foreignPath = path.join(userDataPath, userDir);
          await fs.rm(foreignPath, { recursive: true, force: true });
          cleanedCount++;
          console.log(`Cleaned foreign user data: ${userDir}`);
        }
      }
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
    
    // Clean user_orders directory
    try {
      await fs.access(userOrdersPath);
      const userDirs = await fs.readdir(userOrdersPath);
      
      for (const userDir of userDirs) {
        if (userDir !== currentUserId) {
          const foreignPath = path.join(userOrdersPath, userDir);
          await fs.rm(foreignPath, { recursive: true, force: true });
          cleanedCount++;
          console.log(`Cleaned foreign user orders: ${userDir}`);
        }
      }
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
    
    console.log(`Cleaned ${cleanedCount} foreign user data directories`);
    return { success: true, cleanedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === APP EVENTS ===
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('ready', () => {
  console.log('Trade Uganda Desktop App started successfully');
  console.log('User data isolation features enabled');
});

// Global error handler for better debugging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});