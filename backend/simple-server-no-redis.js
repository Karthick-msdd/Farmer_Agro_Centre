// Simple server without Redis dependency
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Load environment variables
dotenv.config();

// In-memory OTP storage (for development)
const otpStorage = new Map();

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: { type: String, unique: true },
  password: { type: String },
  role: { type: String, default: 'FARMER' },
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for health checks and auth endpoints during development
    return req.path === '/health' || req.path.startsWith('/api/auth/');
  }
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Send OTP endpoint
app.post('/api/auth/otp/send', async (req, res) => {
  try {
    const { phone, type = 'LOGIN' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `${phone}:${type}`;
    
    // Store OTP for 5 minutes
    otpStorage.set(otpKey, {
      otp,
      phone,
      type,
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false
    });

    // Mock SMS sending
    console.log(`📱 Mock SMS OTP for ${phone}: ${otp} (Type: ${type})`);

    res.json({
      success: true,
      message: 'OTP sent successfully (Mock SMS)',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP endpoint
app.post('/api/auth/otp/verify', async (req, res) => {
  try {
    const { phone, otp, type = 'LOGIN', userData } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const otpKey = `${phone}:${type}`;
    const otpData = otpStorage.get(otpKey);
    
    if (!otpData) {
      return res.status(400).json({ error: 'OTP not found. Please request a new OTP.' });
    }
    
    if (new Date() > new Date(otpData.expiresAt)) {
      otpStorage.delete(otpKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }
    
    if (otpData.attempts >= 3) {
      otpStorage.delete(otpKey);
      return res.status(400).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
    }
    
    if (otpData.otp !== otp) {
      otpData.attempts++;
      otpStorage.set(otpKey, otpData);
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // OTP is valid, remove it
    otpStorage.delete(otpKey);
    
    // Check if user exists
    let user = await User.findOne({ phone });
    
    if (user) {
      // Existing user - generate tokens and login
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );
      
      // Update last login
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
      
      res.json({
        message: 'Login successful',
        isNewUser: false,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } else {
      // New user - create user account
      if (type === 'REGISTER' && userData) {
        const { name, role = 'FARMER' } = userData;
        
        const newUser = new User({
          name: name || `User ${phone}`,
          phone,
          role
        });
        
        await newUser.save();
        
        const accessToken = jwt.sign(
          { userId: newUser._id, role: newUser.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1h' }
        );
        
        const refreshToken = jwt.sign(
          { userId: newUser._id },
          process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
          { expiresIn: '7d' }
        );
        
        res.json({
          message: 'Registration successful',
          isNewUser: true,
          user: {
            id: newUser._id,
            name: newUser.name,
            phone: newUser.phone,
            role: newUser.role
          },
          tokens: {
            accessToken,
            refreshToken
          }
        });
      } else {
        // OTP verified but user doesn't exist and no registration data provided
        res.json({
          message: 'OTP verified successfully',
          isNewUser: true,
          phone,
          requiresRegistration: true
        });
      }
    }
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'FARMER' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email or phone' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role
    });

    await user.save();

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email/Password login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile endpoint
app.get('/api/auth/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current user profile endpoint
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile photo upload endpoint
app.post('/api/user/upload-photo', authenticate, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    
    // Convert image to base64 for storage
    const base64Image = req.file.buffer.toString('base64');
    const imageData = {
      data: base64Image,
      contentType: req.file.mimetype,
      size: req.file.size,
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };

    // Update user document with profile photo
    const result = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          profileImage: `data:${req.file.mimetype};base64,${base64Image}`,
          updatedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      profilePhoto: {
        data: base64Image,
        contentType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Get user profile photo endpoint
app.get('/api/user/profile-photo', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId, 'profileImage');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.profileImage) {
      return res.status(404).json({ error: 'No profile photo found' });
    }

    // Set appropriate headers for image response
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Send the base64 image
    res.send(user.profileImage);

  } catch (error) {
    console.error('Get profile photo error:', error);
    res.status(500).json({ error: 'Failed to get profile photo' });
  }
});

// Delete user profile photo endpoint
app.delete('/api/user/profile-photo', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await User.findByIdAndUpdate(
      userId,
      { 
        $unset: { profileImage: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile photo error:', error);
    res.status(500).json({ error: 'Failed to delete profile photo' });
  }
});

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
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farming_agro_center';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Authentication API ready`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\n📋 Available Endpoints:');
      console.log('   POST /api/auth/otp/send - Send OTP');
      console.log('   POST /api/auth/otp/verify - Verify OTP');
      console.log('   POST /api/auth/login - Email/Password login');
      console.log('   GET /api/auth/profile - Get user profile');
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

// Start the server
startServer();
