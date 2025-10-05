require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

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
const transporterRoutes = require('./routes/transporters'); // ADDED
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

// Connect to database with better error handling
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    
    if (error.name === 'MongoNetworkError') {
      console.log('Network error. Please check your internet connection.');
    } else if (error.name === 'MongooseServerSelectionError') {
      console.log('Cannot connect to MongoDB server. Check your connection string.');
    }
    
    return false;
  }
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Increase payload size limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authControllerRoutes); // Add password reset routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/wholesalers', wholesalerRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/retailer-orders', retailerOrderRoutes);
app.use('/api/transporters', transporterRoutes); // ADDED
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

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    let databaseInfo = {
      status: 'disconnected',
      name: 'unknown',
      collections: []
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
          collections: collectionNames
        };
      } catch (dbError) {
        databaseInfo = {
          status: 'connected but error accessing collections',
          name: mongoose.connection.name,
          error: dbError.message
        };
      }
    }
    
    res.json({
      success: true,
      message: 'TradeHub API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: databaseInfo,
      cloudinary: cloudinaryStatus,
      routes: [
        '/api/auth',
        '/api/conversations',
        '/api/users',
        '/api/messages',
        '/api/wholesalers',
        '/api/retailers',
        '/api/products',
        '/api/retailer-orders',
        '/api/transporters' // ADDED
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Test MongoDB connection endpoint
app.get('/api/test-mongodb', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const usersCount = await User.countDocuments();
      
      res.json({
        success: true,
        message: 'MongoDB is connected',
        connectionState: mongoose.connection.readyState,
        usersCount: usersCount
      });
    } else {
      res.json({
        success: false,
        message: 'MongoDB is not connected',
        connectionState: mongoose.connection.readyState,
        error: 'Database connection not established'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'MongoDB test failed',
      error: error.message
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
        error: 'Cannot perform database operations without connection'
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
      counts: {
        users: usersCount,
        conversations: conversationsCount,
        messages: messagesCount,
        orders: ordersCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
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

// Test transporter status endpoint - ADDED
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
      '/api/transporters/*', // ADDED
      '/api/health',
      '/api/test-db',
      '/api/test-message',
      '/api/test-cloudinary',
      '/api/test-products',
      '/api/test-wholesalers',
      '/api/test-retailers',
      '/api/test-transporter-status', // ADDED
      '/api/test-orders',
      '/api/test-password-reset'
    ]
  });
});

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Request not allowed'
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
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
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

// Start the server with database connection
const startServer = async () => {
  const isConnected = await connectDB();
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`API base URL: http://localhost:${PORT}/api`);
    console.log(`Socket.IO server running`);
    console.log(`Cloudinary configured for file uploads`);
    
    if (isConnected) {
      console.log(`MongoDB connected: ${mongoose.connection.name}`);
    } else {
      console.log(`MongoDB: NOT CONNECTED (running in limited mode)`);
    }
    
    console.log(`Wholesalers API available at: http://localhost:${PORT}/api/wholesalers`);
    console.log(`Retailers API available at: http://localhost:${PORT}/api/retailers`);
    console.log(`Products API available at: http://localhost:${PORT}/api/products`);
    console.log(`Retailer Orders API available at: http://localhost:${PORT}/api/retailer-orders`);
    console.log(`Transporter API available at: http://localhost:${PORT}/api/transporters`); // ADDED
    console.log(`Password Reset API available at: http://localhost:${PORT}/api/auth/forgot-password`);
  });
};

// Start the application
startServer();