require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// Debug environment variables
console.log('Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Loaded' : '✗ NOT LOADED');
console.log('PORT:', process.env.PORT);
console.log('CLOUDINARY_URL:', process.env.CLOUDINARY_URL ? '✓ Loaded' : '✗ NOT LOADED');

// Import models FIRST to ensure they're registered
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const RetailerOrder = require('./models/RetailerOrder');

// Import routes
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const wholesalerRoutes = require('./routes/wholesalers');
const retailerRoutes = require('./routes/retailers');
const productRoutes = require('./routes/products');
const transporterRoutes = require('./routes/transporters');
const retailerSalesRoutes = require('./routes/retailerSales');
const retailerReceiptRoutes = require('./routes/retailerReceipt');
const supplierOrdersRoutes = require('./routes/supplierOrdersRoute');
const supplierSalesRoutes = require('./routes/supplierSales');
const systemStockRoutes = require('./routes/systemStock');
const retailerStockRoutes = require('./routes/retailerStock');
const supplierProductsRoutes = require('./routes/supplierProducts');
const wholesalerOrdersRoutes = require('./routes/wholesalerOrdersToSupplierRoute');
const supplierReceiptRoutes = require('./routes/supplierReceiptRoute');
const certifiedProductsRoutes = require('./routes/certifiedProducts');

const wholesaleSalesRoutes = require('./routes/wholesaleSales');
const customerRoutes = require('./routes/customers');
const certifiedOrdersRoutes = require('./routes/certifiedOrders');
const certifiedStockRoutes = require('./routes/certifiedStock');


// Import password reset routes
const authControllerRoutes = require('./routes/authController');

// SAFE IMPORT FOR RETAILER ORDERS (prevents crash if file doesn't exist)
let retailerOrderRoutes;
try {
  retailerOrderRoutes = require('./routes/retailerOrders');
  console.log('Retailer orders routes loaded successfully');
} catch (error) {
  console.log('Retailer orders route not available yet, using empty router');
  retailerOrderRoutes = express.Router();
}

// Import socket handler
const { handleSocketConnection } = require('./socket/socketHandler');

// Import Cloudinary configuration
require('./config/cloudinary');

// Enhanced database connection with better error handling and debugging
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Validate MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables. Please check your .env file or Render environment variables.');
    }
    
    console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials in logs
    
    // Updated connection options for Mongoose 7+ - removed deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // Increased timeout
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`🎯 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    if (error.name === 'MongoNetworkError') {
      console.log('🔌 Network error. Please check your internet connection and MongoDB Atlas whitelist settings.');
    } else if (error.name === 'MongooseServerSelectionError') {
      console.log('🌐 Cannot connect to MongoDB server. Check your connection string and network access.');
    } else if (error.name === 'MongoParseError') {
      console.log('🔗 MongoDB connection string is malformed. Please check your MONGODB_URI.');
    }
    
    console.log('💡 Troubleshooting tips:');
    console.log('1. Check if MONGODB_URI is correctly set in Render environment variables');
    console.log('2. Verify your MongoDB Atlas cluster is running');
    console.log('3. Check if your IP is whitelisted in MongoDB Atlas');
    console.log('4. Verify network connectivity to MongoDB servers');
    console.log('5. Remove deprecated Mongoose connection options (useNewUrlParser, useUnifiedTopology, bufferMaxEntries)');
    
    return false;
  }
};

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration for production - EXPANDED FOR ALL PLATFORMS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', 
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://192.168.86.3:8081',
  'exp://192.168.86.3:8081',
  'exp://*',
  'https://my-trade.vercel.app',
  'https://mytrade-cx5z.onrender.com',
  'https://mytradeug.netlify.app',
  'https://mytradeuganda.netlify.app'
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    transports: ['websocket', 'polling']
  }
});

const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration with production support - EXPANDED FOR ALL PLATFORMS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches patterns
    if (allowedOrigins.includes(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.') ||
        origin.includes('exp://') ||
        origin.includes('netlify.app') ||
        origin.includes('vercel.app')) {
      return callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Platform', 'X-Device-Id']
}));

// Handle preflight requests
app.options('*', cors());

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Increase payload size limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authControllerRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/wholesalers', wholesalerRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/retailer-orders', retailerOrderRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/retailer-sales', retailerSalesRoutes);
app.use('/api/retailer-receipts', retailerReceiptRoutes);
app.use('/api/supplier-products', supplierProductsRoutes);
app.use('/api/wholesaler-orders', wholesalerOrdersRoutes);
app.use('/api/supplier/orders', supplierOrdersRoutes);
app.use('/api/supplier-sales', supplierSalesRoutes);
app.use('/api/supplier-receipts', supplierReceiptRoutes);
app.use('/api/certified-products', certifiedProductsRoutes);
app.use('/api/system-stocks', systemStockRoutes);
app.use('/api/retailer-stocks', retailerStockRoutes);
app.use('/api/wholesale-sales', wholesaleSalesRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/certified-orders', certifiedOrdersRoutes);
app.use('/api/certified-stock', certifiedStockRoutes);
// NEW: React Native specific endpoints

app.get('/api/react-native-test', (req, res) => {
  const clientInfo = {
    userAgent: req.headers['user-agent'],
    origin: req.headers['origin'],
    platform: req.headers['x-platform'] || 'unknown',
    deviceId: req.headers['x-device-id'] || 'unknown',
    appVersion: req.headers['x-app-version'] || 'unknown'
  };

  console.log('📱 React Native Test Request:', clientInfo);

  res.json({
    success: true,
    message: 'React Native connection successful!',
    serverTime: new Date().toISOString(),
    clientInfo: clientInfo,
    environment: process.env.NODE_ENV,
    socketUrl: process.env.SOCKET_SERVER_URL || `https://mytrade-cx5z.onrender.com`
  });
});

// NEW: Environment variables check (safe - no sensitive data)
app.get('/api/env-check', (req, res) => {
  res.json({
    success: true,
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    cloudinary: process.env.CLOUDINARY_URL ? 'configured' : 'not configured',
    googleApis: {
      places: process.env.GOOGLE_PLACES_API_KEY ? 'configured' : 'not configured',
      geocoding: process.env.GOOGLE_GEOCODING_API_KEY ? 'configured' : 'not configured',
      maps: process.env.GOOGLE_MAPS_JAVASCRIPT_API_KEY ? 'configured' : 'not configured'
    },
    features: {
      socket: true,
      fileUpload: true,
      realTimeChat: true,
      notifications: true
    }
  });
});

// NEW: Mobile connection diagnostics
app.get('/api/mobile-diagnostics', async (req, res) => {
  try {
    const diagnostics = {
      server: {
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        state: getMongooseReadyState(mongoose.connection.readyState),
        collections: []
      },
      services: {
        cloudinary: process.env.CLOUDINARY_URL ? 'available' : 'unavailable',
        socket: 'available'
      },
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        conversations: '/api/conversations',
        messages: '/api/messages',
        health: '/api/health'
      }
    };

    // Get collection info if database is connected
    if (mongoose.connection.readyState === 1) {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        diagnostics.database.collections = collections.map(c => c.name);
      } catch (error) {
        diagnostics.database.collectionsError = error.message;
      }
    }

    res.json({
      success: true,
      message: 'Mobile diagnostics completed',
      ...diagnostics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Diagnostics failed',
      error: error.message
    });
  }
});

// NEW: Socket connection test endpoint
app.get('/api/socket-test', (req, res) => {
  res.json({
    success: true,
    message: 'Socket.IO server is running',
    socketUrl: `https://mytrade-cx5z.onrender.com`,
    supportedTransports: ['websocket', 'polling'],
    features: ['real-time messaging', 'typing indicators', 'online status', 'file sharing']
  });
});

// Enhanced health check endpoint with detailed diagnostics
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    let databaseInfo = {
      status: 'disconnected',
      name: 'unknown',
      collections: [],
      connectionState: mongoose.connection.readyState,
      readyStateDescription: getMongooseReadyState(mongoose.connection.readyState)
    };
    
    let cloudinaryStatus = process.env.CLOUDINARY_URL ? 'configured' : 'not configured';
    
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        databaseInfo = {
          status: 'connected',
          name: mongoose.connection.name,
          collections: collectionNames,
          connectionState: mongoose.connection.readyState,
          readyStateDescription: 'Connected',
          host: mongoose.connection.host,
          port: mongoose.connection.port
        };
      } catch (dbError) {
        databaseInfo = {
          status: 'connected but error accessing collections',
          name: mongoose.connection.name,
          error: dbError.message,
          connectionState: mongoose.connection.readyState,
          readyStateDescription: 'Connected with errors'
        };
      }
    }
    
    // Test basic database operation
    let dbTest = { success: false, message: 'Not connected' };
    if (mongoose.connection.readyState === 1) {
      try {
        const usersCount = await require('./models/User').countDocuments();
        dbTest = { success: true, message: 'Operational', usersCount };
      } catch (dbOpError) {
        dbTest = { success: false, message: dbOpError.message };
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'TradeHub API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      responseTime: `${responseTime}ms`,
      server: {
        port: PORT,
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      database: databaseInfo,
      databaseTest: dbTest,
      cloudinary: cloudinaryStatus,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      },
      cors: {
        enabled: true,
        allowedOrigins: allowedOrigins,
        netlifyFrontend: 'https://mytradeug.netlify.app',
        vercelFrontend: 'https://my-trade.vercel.app',
        reactNative: 'exp://192.168.86.3:8081'
      },
      features: {
        realTimeChat: true,
        fileUpload: true,
        notifications: true,
        multiPlatform: true
      },
      routes: [
        '/api/auth',
        '/api/conversations',
        '/api/users',
        '/api/messages',
        '/api/wholesalers',
        '/api/retailers',
        '/api/products',
        '/api/retailer-orders',
        '/api/transporters',
        '/api/health',
        '/api/test-db',
        '/api/test-mongodb',
        '/api/react-native-test',
        '/api/mobile-diagnostics',
        '/api/socket-test'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function for mongoose ready state
function getMongooseReadyState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected', 
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

// Enhanced MongoDB connection test endpoint
app.get('/api/test-mongodb', async (req, res) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const stateDescription = getMongooseReadyState(connectionState);
    
    if (connectionState === 1) {
      const usersCount = await User.countDocuments();
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      res.json({
        success: true,
        message: 'MongoDB is connected and operational',
        connectionState: connectionState,
        stateDescription: stateDescription,
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        collections: collectionNames,
        usersCount: usersCount,
        performance: {
          collectionCount: collections.length,
          userCount: usersCount
        }
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB is not connected',
        connectionState: connectionState,
        stateDescription: stateDescription,
        error: 'Database connection not established',
        troubleshooting: [
          'Check MONGODB_URI environment variable',
          'Verify MongoDB Atlas cluster is running',
          'Check network connectivity',
          'Verify IP whitelist in MongoDB Atlas'
        ]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'MongoDB test failed',
      error: error.message,
      connectionState: mongoose.connection.readyState,
      stateDescription: getMongooseReadyState(mongoose.connection.readyState)
    });
  }
});

// Test database operations endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Cannot perform database operations without connection',
        connectionState: mongoose.connection.readyState,
        stateDescription: getMongooseReadyState(mongoose.connection.readyState)
      });
    }

    const usersCount = await User.countDocuments();
    const conversationsCount = await Conversation.countDocuments();
    const messagesCount = await Message.countDocuments();
    
    let ordersCount = 0;
    try {
      ordersCount = await RetailerOrder.countDocuments();
    } catch (orderError) {
      console.log('RetailerOrder collection not available yet');
    }
    
    res.json({
      success: true,
      message: 'Database test successful',
      connectionState: mongoose.connection.readyState,
      stateDescription: 'Connected',
      counts: {
        users: usersCount,
        conversations: conversationsCount,
        messages: messagesCount,
        orders: ordersCount
      },
      performance: {
        totalRecords: usersCount + conversationsCount + messagesCount + ordersCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message,
      connectionState: mongoose.connection.readyState,
      stateDescription: getMongooseReadyState(mongoose.connection.readyState)
    });
  }
});

// Test message creation endpoint
app.post('/api/test-message', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Cannot create test message without database connection'
      });
    }

    const { conversationId, senderId, content } = req.body;
    
    console.log('Testing message creation:', { conversationId, senderId, content });
    
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    if (!conversation.participants.includes(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'Sender is not a participant in this conversation'
      });
    }
    
    const message = await Message.create({
      conversationId,
      senderId,
      content: content || 'Test message from API',
      type: 'text'
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message.content,
      lastMessageAt: new Date()
    });

    console.log('Test message created:', message._id);

    res.json({
      success: true,
      message: 'Test message created successfully',
      data: message
    });
  } catch (error) {
    console.error('Test message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test message',
      error: error.message
    });
  }
});

// Test Cloudinary endpoint
app.get('/api/test-cloudinary', async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    
    const testResult = await cloudinary.uploader.upload(
      'data:text/plain;base64,SGVsbG8gVHJhZGVIdWIgVGVzdA==',
      {
        folder: 'trade-uganda-test',
        public_id: 'test-file'
      }
    );

    res.json({
      success: true,
      message: 'Cloudinary test successful!',
      result: {
        url: testResult.secure_url,
        public_id: testResult.public_id
      }
    });
  } catch (error) {
    console.error('Cloudinary test error:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary test failed',
      error: error.message
    });
  }
});

// Test products endpoint
app.get('/api/test-products', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }
    
    console.log('Testing products endpoint');
    
    res.json({
      success: true,
      message: 'Products endpoint is available',
      note: 'Use /api/products with proper authentication to access products'
    });
  } catch (error) {
    console.error('Test products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test products endpoint',
      error: error.message
    });
  }
});

// Test wholesalers endpoint
app.get('/api/test-wholesalers', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Cannot fetch wholesalers without database connection'
      });
    }

    const { category } = req.query;
    
    console.log('Testing wholesalers endpoint for category:', category);
    
    let filter = { 
      role: 'wholesaler',
      isActive: true 
    };
    
    if (category && category !== 'undefined') {
      filter.productCategory = category;
    }
    
    const wholesalers = await User.find(filter).select(
      'businessName contactPerson email phone productCategory isOnline lastSeen address city'
    );
    
    console.log('Found wholesalers:', wholesalers.length);
    
    res.json({
      success: true,
      message: 'Wholesalers test successful',
      count: wholesalers.length,
      wholesalers: wholesalers.slice(0, 5)
    });
  } catch (error) {
    console.error('Test wholesalers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test wholesalers',
      error: error.message
    });
  }
});

// Test retailers endpoint
app.get('/api/test-retailers', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Cannot fetch retailers without database connection'
      });
    }

    const { category } = req.query;
    
    console.log('Testing retailers endpoint for category:', category);
    
    let filter = { 
      role: 'retailer',
      isActive: true 
    };
    
    if (category && category !== 'undefined') {
      filter.productCategory = category;
    }
    
    const retailers = await User.find(filter).select(
      'firstName lastName businessName contactPerson email phone productCategory isOnline lastSeen address city'
    );
    
    console.log('Found retailers:', retailers.length);
    
    res.json({
      success: true,
      message: 'Retailers test successful',
      count: retailers.length,
      retailers: retailers.slice(0, 5)
    });
  } catch (error) {
    console.error('Test retailers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test retailers',
      error: error.message
    });
  }
});

// Test transporter status endpoint
app.get('/api/test-transporter-status', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        error: 'Cannot test transporter status without database connection'
      });
    }

    const { transporterId } = req.query;
    
    if (!transporterId) {
      return res.status(400).json({
        success: false,
        message: 'Transporter ID is required'
      });
    }
    
    console.log('Testing transporter status endpoint for ID:', transporterId);
    
    const transporter = await User.findById(transporterId);
    
    if (!transporter || transporter.role !== 'transporter') {
      return res.status(404).json({
        success: false,
        message: 'Transporter not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Transporter status test successful',
      transporter: {
        id: transporter._id,
        name: `${transporter.firstName} ${transporter.lastName}`,
        isActive: transporter.isActive || false,
        role: transporter.role
      }
    });
  } catch (error) {
    console.error('Test transporter status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test transporter status',
      error: error.message
    });
  }
});

// Test retailer orders endpoint
app.get('/api/test-orders', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }
    
    console.log('Testing retailer orders endpoint');
    
    res.json({
      success: true,
      message: 'Retailer orders endpoint is available',
      note: 'Use /api/retailer-orders with proper authentication to access orders'
    });
  } catch (error) {
    console.error('Test orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test orders endpoint',
      error: error.message
    });
  }
});

// Test password reset endpoint
app.get('/api/test-password-reset', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Password reset endpoints are available',
      endpoints: {
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        validateToken: 'GET /api/auth/validate-reset-token'
      }
    });
  } catch (error) {
    console.error('Test password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test password reset endpoints',
      error: error.message
    });
  }
});

// Use the enhanced socket handler
handleSocketConnection(io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    availableRoutes: [
      '/api/auth/*',
      '/api/conversations/*',
      '/api/users/*',
      '/api/messages/*',
      '/api/wholesalers/*',
      '/api/retailers/*',
      '/api/products/*',
      '/api/retailer-orders/*',
      '/api/transporters/*',
      '/api/health',
      '/api/test-db',
      '/api/test-message',
      '/api/test-cloudinary',
      '/api/test-products',
      '/api/test-wholesalers',
      '/api/test-retailers',
      '/api/test-transporter-status',
      '/api/test-orders',
      '/api/test-password-reset',
      '/api/react-native-test',
      '/api/mobile-diagnostics',
      '/api/socket-test',
      '/api/env-check'
    ]
  });
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Request not allowed',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 15MB.'
    });
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(415).json({
      success: false,
      message: 'File type not supported. Please upload images, documents, or audio files.'
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      error: 'This record already exists'
    });
  }
  
  if (error.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection lost',
      error: 'Please try again later'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    mongoose.connection.close();
    console.log('Server shut down successfully');
    process.exit(0);
  });
});

// Start the server with enhanced database connection
const startServer = async () => {
  console.log('🚀 Starting TradeHub Server...');
  console.log('📁 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔧 Port:', PORT);
  
  const isConnected = await connectDB();
  
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🏥 Health check available at: https://mytrade-cx5z.onrender.com/api/health`);
    console.log(`🌐 API base URL: https://mytrade-cx5z.onrender.com/api`);
    console.log(`🔌 Socket.IO server running`);
    console.log(`☁️  Cloudinary configured for file uploads`);
    console.log(`🌍 CORS enabled for ${allowedOrigins.length} origins`);
    console.log(`📱 React Native support: Enabled`);
    
    if (isConnected) {
      console.log(`🗄️  MongoDB connected: ${mongoose.connection.name}`);
      console.log(`🔗 Connection State: ${getMongooseReadyState(mongoose.connection.readyState)}`);
    } else {
      console.log(`⚠️  MongoDB: NOT CONNECTED (running in limited mode)`);
      console.log(`💡 Some features requiring database access will not work`);
    }
    
    console.log(`📊 Available APIs:`);
    console.log(`   - Wholesalers: /api/wholesalers`);
    console.log(`   - Retailers: /api/retailers`);
    console.log(`   - Products: /api/products`);
    console.log(`   - Retailer Orders: /api/retailer-orders`);
    console.log(`   - Transporters: /api/transporters`);
    console.log(`   - Password Reset: /api/auth/forgot-password`);
    console.log(`   - System Health: /api/health`);
    console.log(`   - React Native Test: /api/react-native-test`);
    console.log(`   - Mobile Diagnostics: /api/mobile-diagnostics`);
  });
};

// Start the application
startServer();