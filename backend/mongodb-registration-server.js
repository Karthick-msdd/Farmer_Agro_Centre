const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5000;

// MongoDB connection
let db;
const connectToMongoDB = async () => {
  try {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB - farming_agro_center database');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
};

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: db ? 'Connected' : 'Disconnected'
  });
});

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      name, email, phone, password, role = 'FARMER',
      age, gender, address, village, district, state,
      farmSize, farmLocation, farmLatitude, farmLongitude,
      cropTypes, preferredLanguage
    } = req.body;

    console.log('Registration attempt:', { name, email, phone, role });

    // Validate required fields
    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Name and either email or phone are required' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        email ? { email } : {},
        phone ? { phone } : {}
      ]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create user document
    const userDoc = {
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert user into database
    const result = await db.collection('users').insertOne(userDoc);
    const userId = result.insertedId.toString();

    // Create farmer profile if user is a farmer
    if (role === 'FARMER') {
      await db.collection('farmers').insertOne({
        userId: result.insertedId,
        age: age ? parseInt(age) : null,
        gender,
        address,
        village,
        district,
        state,
        farmSize: farmSize ? parseFloat(farmSize) : null,
        farmLocation,
        farmLatitude: farmLatitude ? parseFloat(farmLatitude) : null,
        farmLongitude: farmLongitude ? parseFloat(farmLongitude) : null,
        cropTypes: cropTypes ? JSON.stringify(cropTypes) : null,
        preferredLanguage: preferredLanguage || 'English',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        name,
        email,
        phone,
        role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

    console.log('✅ User registered successfully:', { userId, name, email, role });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    // Find user
    const user = await db.collection('users').findOne({
      $or: [
        email ? { email } : {},
        phone ? { phone } : {}
      ],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password if user has one
    if (user.password && password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (user.password && !password) {
      return res.status(401).json({ error: 'Password required' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user._id.toString(),
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

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (for testing)
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users').find({}).toArray();
    res.json({ users: users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    })) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sample products for testing
app.get('/api/products', (req, res) => {
  const products = [
    {
      id: '1',
      name: 'Organic Fertilizer',
      price: 299,
      description: 'High-quality organic fertilizer for healthy crop growth',
      image: 'https://via.placeholder.com/300x200',
      category: 'Farm Supplies',
      stock: 100
    },
    {
      id: '2',
      name: 'Water Pump',
      price: 2500,
      description: 'Efficient water pump for irrigation',
      image: 'https://via.placeholder.com/300x200',
      category: 'Equipment',
      stock: 20
    },
    {
      id: '3',
      name: 'Seeds - Wheat',
      price: 150,
      description: 'High-yield wheat seeds for better harvest',
      image: 'https://via.placeholder.com/300x200',
      category: 'Seeds',
      stock: 50
    }
  ];

  res.json({ products });
});

// Farmer profile endpoint
app.get('/api/farmer/profile', authenticate, async (req, res) => {
  try {
    const farmersCollection = db.collection('farmers');
    const farmer = await farmersCollection.findOne({ userId: req.user.userId });
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }
    
    res.json({
      success: true,
      data: { farmer }
    });
  } catch (error) {
    console.error('Get farmer profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Crop advisory endpoint
app.get('/api/farmer/crop-advisory', authenticate, (req, res) => {
  // Mock weather data for demonstration
  const weatherData = {
    temperature: 28,
    humidity: 65,
    rainfall: 15,
    windSpeed: 12,
    condition: 'Partly Cloudy',
    advisory: 'Good weather for crop growth. Consider light irrigation.',
    recommendations: [
      'Monitor soil moisture levels',
      'Apply organic fertilizer if needed',
      'Check for pest activity'
    ]
  };
  
  res.json({
    success: true,
    data: { weatherData }
  });
});

// Farmer queries endpoint
app.get('/api/farmer/queries', authenticate, async (req, res) => {
  try {
    const queriesCollection = db.collection('farmer_queries');
    const queries = await queriesCollection.find({ userId: req.user.userId }).toArray();
    
    res.json({
      success: true,
      data: { queries }
    });
  } catch (error) {
    console.error('Get farmer queries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Farming tips endpoint
app.get('/api/farmer/farming-tips', authenticate, (req, res) => {
  // Mock farming tips for demonstration
  const tips = [
    {
      id: '1',
      title: 'Soil Preparation',
      content: 'Proper soil preparation is essential for good crop yield. Ensure adequate drainage and organic matter.',
      category: 'Soil Management',
      image: 'https://via.placeholder.com/300x200'
    },
    {
      id: '2', 
      title: 'Water Management',
      content: 'Efficient water usage can increase crop yield by 20-30%. Use drip irrigation for better results.',
      category: 'Irrigation',
      image: 'https://via.placeholder.com/300x200'
    },
    {
      id: '3',
      title: 'Pest Control',
      content: 'Regular monitoring and early pest detection can prevent major crop losses.',
      category: 'Pest Management', 
      image: 'https://via.placeholder.com/300x200'
    }
  ];
  
  res.json({
    success: true,
    data: { tips }
  });
});

// Profile photo upload endpoint
app.post('/api/user/upload-photo', authenticate, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const usersCollection = db.collection('users');
    
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
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          profilePhoto: imageData,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
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
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { profilePhoto: 1 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.profilePhoto) {
      return res.status(404).json({ error: 'No profile photo found' });
    }

    // Set appropriate headers for image response
    res.set({
      'Content-Type': user.profilePhoto.contentType,
      'Content-Length': user.profilePhoto.data.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Convert base64 back to buffer and send
    const imageBuffer = Buffer.from(user.profilePhoto.data, 'base64');
    res.send(imageBuffer);

  } catch (error) {
    console.error('Get profile photo error:', error);
    res.status(500).json({ error: 'Failed to get profile photo' });
  }
});

// Delete user profile photo endpoint
app.delete('/api/user/profile-photo', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const usersCollection = db.collection('users');
    
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $unset: { profilePhoto: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
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

// Start server
const startServer = async () => {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 MongoDB Registration Server running on port ${PORT}`);
    console.log(`✅ Registration endpoint: POST /api/auth/register`);
    console.log(`✅ Login endpoint: POST /api/auth/login`);
    console.log(`✅ Users endpoint: GET /api/users`);
    console.log(`✅ Products endpoint: GET /api/products`);
    console.log(`✅ Health check: GET /api/health`);
  });
};

startServer();
