/// <reference path="./types/express.d.ts" />
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';

// Import database connections
import { connectToMongoDB } from './utils/mongodb';
import { connectToRedis } from './utils/redis';

// Import routes
import authRoutes from './routes/auth';
import mongoAuthRoutes from './routes/mongoAuth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import cartRoutes from './routes/cart';
import paymentRoutes from './routes/payments';
import advisoryRoutes from './routes/advisory';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';

// Import middleware
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/errorHandler';

// Load environment variables

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';

// Define allowed origins
const allowedOrigins = isProduction 
  ? [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://your-production-domain.com' // Replace with your production domain
    ].filter(Boolean)
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

// Enhanced CORS middleware with detailed logging
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin || 'no-origin';
  const requestMethod = req.method;
  const requestPath = req.originalUrl;
  
  console.log(`\n[${new Date().toISOString()}] Incoming ${requestMethod} ${requestPath}`);
  console.log('Request Origin:', requestOrigin);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  // Always set CORS headers for all responses
  if (requestOrigin && (allowedOrigins.includes(requestOrigin) || !isProduction)) {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (requestMethod === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
      return res.status(204).send();
    }
    
    console.log('CORS headers set for origin:', requestOrigin);
    return next();
  }
  
  // In development, allow all origins
  if (!isProduction) {
    console.warn('Development mode: Allowing request from any origin');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    
    if (requestMethod === 'OPTIONS') {
      console.log('Development: Handling OPTIONS preflight request');
      return res.status(204).send();
    }
    
    return next();
  }
  
  // In production, block requests from unauthorized origins
  console.error(`Blocked request from unauthorized origin: ${requestOrigin}`);
  console.log('Allowed origins:', allowedOrigins);
  
  return res.status(403).json({ 
    success: false,
    error: 'CORS_ERROR',
    message: `Origin '${requestOrigin}' is not allowed by CORS policy`,
    allowedOrigins: isProduction ? undefined : allowedOrigins // Only expose in non-production
  });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Ensure we always return a string for the IP
    return req.ip || 'unknown-ip';
  }
});

// Middleware
app.use(helmet());

app.use(compression());

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mongo-auth', mongoAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`User ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize database connections and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Connect to Redis
    await connectToRedis();
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Socket.IO server ready`);
      console.log(`✅ MongoDB connected`);
      console.log(`✅ Redis connected`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
