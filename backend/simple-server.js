// Enhanced Security Server - OTP Authentication
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('compression');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Import security middleware
const {
  securityHeaders,
  apiRateLimit,
  otpRateLimit,
  loginRateLimit,
  sanitizeInput,
  detectSuspiciousActivity,
  securityLogger,
  corsOptions
} = require('./src/middlewares/security');

// Import services
const { connectToRedis } = require('./src/services/simpleOTPService');
const { connectToMongoDB } = require('./src/utils/simpleMongoDB');
const { sendPhoneOTP, verifyPhoneOTP, setupTOTP, loginWithTOTP, resendOTP } = require('./src/controllers/simpleAuth');

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Enhanced Security Middleware
app.use(securityHeaders);
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(detectSuspiciousActivity);
app.use(securityLogger);

// Rate limiting
app.use(apiRateLimit);

// Socket.IO middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// OTP Routes with enhanced security
app.post('/api/auth/otp/send', otpRateLimit, sendPhoneOTP);
app.post('/api/auth/otp/verify', loginRateLimit, verifyPhoneOTP);
app.post('/api/auth/otp/resend', otpRateLimit, resendOTP);
app.post('/api/auth/totp/setup', loginRateLimit, setupTOTP);
app.post('/api/auth/totp/login', loginRateLimit, loginWithTOTP);

// Admin Dashboard Routes
app.use('/api/admin', require('./src/routes/adminDashboard'));

// Farmer Dashboard Routes
app.use('/api/farmer', require('./src/routes/farmerDashboard'));

// Legacy routes for backward compatibility
app.post('/api/auth/phone/send-otp', sendPhoneOTP);
app.post('/api/auth/phone/verify-otp', verifyPhoneOTP);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server function
const startServer = async () => {
  try {
    // Connect to databases
    await connectToMongoDB();
    await connectToRedis();
    
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 OTP Authentication API ready`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
