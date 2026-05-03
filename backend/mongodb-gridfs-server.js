const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';

let db;
let gfs;

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Connect to MongoDB
const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('farming_agro_center');
    
    // Initialize GridFS
    gfs = new GridFSBucket(db, {
      bucketName: 'profile_photos'
    });
    
    console.log('✅ Connected to MongoDB - farming_agro_center database');
    console.log('✅ GridFS initialized for profile photos');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

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
    database: db ? 'Connected' : 'Disconnected',
    gridfs: gfs ? 'Initialized' : 'Not initialized'
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

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        email ? { email } : {},
        { phone }
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

    console.log('✅ User registered successfully:', { userId, name, email, role });

    res.json({
      message: 'User registered successfully',
      user: { userId, name, email, role },
      accessToken,
      refreshToken
    });

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
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products
app.get('/api/products', (req, res) => {
  const products = [
    {
      id: 1,
      name: 'Premium Wheat Seeds',
      description: 'High-yield wheat seeds for optimal harvest',
      price: 250,
      category: 'Seeds',
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
      stock: 100
    },
    {
      id: 2,
      name: 'Organic Fertilizer',
      description: 'Natural organic fertilizer for healthy crops',
      price: 180,
      category: 'Fertilizers',
      image: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ce?w=400',
      stock: 50
    }
  ];

  res.json({ products });
});

// Upload profile photo using GridFS
app.post('/api/user/upload-photo', authenticate, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert file to base64
    const base64String = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Update user with base64 profile image
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          profileImage: base64String,
          updatedAt: new Date()
        } 
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      photoUrl: base64String
    });

  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Get user profile photo as base64
app.get('/api/user/profile-photo', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { profileImage: 1 } }
    );

    if (!user || !user.profileImage) {
      return res.status(404).json({ error: 'No profile photo found' });
    }

    // Return the base64 image string
    res.json({
      success: true,
      profileImage: user.profileImage
    });

  } catch (error) {
    console.error('Get profile photo error:', error);
    res.status(500).json({ error: 'Failed to get profile photo' });
  }
});

// Delete user profile photo
app.delete('/api/user/profile-photo', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { profileImage: 1 } }
    );

    if (!user || !user.profileImage) {
      return res.status(404).json({ error: 'No profile photo found' });
    }

    // Update user to remove profile image
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $unset: { profileImage: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile photo error:', error);
    res.status(500).json({ error: 'Failed to delete profile photo' });
  }
});

// Create or update user profile with binary image storage
app.post('/api/user/profile', authenticate, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      firstName, 
      lastName, 
      bio, 
      location, 
      farmSize, 
      cropTypes, 
      experience,
      phone,
      address,
      socialLinks
    } = req.body;

    const usersCollection = db.collection('users');
    const profilesCollection = db.collection('profiles');

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare profile data
    const profileData = {
      userId: new ObjectId(userId),
      firstName: firstName || user.name?.split(' ')[0] || '',
      lastName: lastName || user.name?.split(' ').slice(1).join(' ') || '',
      bio: bio || '',
      location: location || '',
      farmSize: farmSize ? parseFloat(farmSize) : null,
      cropTypes: cropTypes ? cropTypes.split(',').map(crop => crop.trim()) : [],
      experience: experience ? parseInt(experience) : null,
      phone: phone || user.phone || '',
      address: address || '',
      socialLinks: socialLinks ? JSON.parse(socialLinks) : {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Handle profile picture if uploaded
    if (req.file) {
      // Convert image to binary format
      const binaryImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
        uploadedAt: new Date()
      };
      
      profileData.profilePicture = binaryImage;
    }

    // Check if profile already exists
    const existingProfile = await profilesCollection.findOne({ userId: new ObjectId(userId) });

    let result;
    if (existingProfile) {
      // Update existing profile
      result = await profilesCollection.updateOne(
        { userId: new ObjectId(userId) },
        { 
          $set: {
            ...profileData,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Create new profile
      result = await profilesCollection.insertOne(profileData);
    }

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    res.json({
      success: true,
      message: 'Profile saved successfully',
      profileId: result.upsertedId || existingProfile?._id
    });

  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Get user profile with binary image
app.get('/api/user/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profilesCollection = db.collection('profiles');
    
    const profile = await profilesCollection.findOne({ userId: new ObjectId(userId) });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Convert binary image to base64 for frontend
    let profilePictureBase64 = null;
    if (profile.profilePicture && profile.profilePicture.data) {
      profilePictureBase64 = `data:${profile.profilePicture.contentType};base64,${profile.profilePicture.data.toString('base64')}`;
    }

    // Return profile data with base64 image
    const profileResponse = {
      ...profile,
      profilePicture: profilePictureBase64,
      _id: profile._id.toString()
    };

    // Remove binary data from response to reduce payload size
    delete profileResponse.profilePicture?.data;

    res.json({
      success: true,
      profile: profileResponse
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get profile picture as binary data
app.get('/api/user/profile/picture', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profilesCollection = db.collection('profiles');
    
    const profile = await profilesCollection.findOne(
      { userId: new ObjectId(userId) },
      { projection: { profilePicture: 1 } }
    );

    if (!profile || !profile.profilePicture) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }

    // Set appropriate headers for binary data
    res.set({
      'Content-Type': profile.profilePicture.contentType,
      'Content-Length': profile.profilePicture.size,
      'Content-Disposition': `inline; filename="${profile.profilePicture.originalName}"`
    });

    // Send binary data
    res.send(profile.profilePicture.data);

  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({ error: 'Failed to get profile picture' });
  }
});

// Update profile picture only
app.post('/api/user/profile/picture', authenticate, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId = req.user.userId;
    const profilesCollection = db.collection('profiles');

    // Prepare binary image data
    const binaryImage = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
      size: req.file.size,
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };

    // Update or create profile with picture
    const result = await profilesCollection.updateOne(
      { userId: new ObjectId(userId) },
      { 
        $set: { 
          profilePicture: binaryImage,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      return res.status(500).json({ error: 'Failed to update profile picture' });
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully'
    });

  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

// Delete profile picture
app.delete('/api/user/profile/picture', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const profilesCollection = db.collection('profiles');

    const result = await profilesCollection.updateOne(
      { userId: new ObjectId(userId) },
      { 
        $unset: { profilePicture: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
});

// Query submission endpoint
app.post('/api/queries/submit', authenticate, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'voiceRecording', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cropType, issueType, urgency, description, location } = req.body;
    
    if (!cropType || !issueType || !urgency || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process uploaded images
    const imageUrls = [];
    if (req.files && req.files.images) {
      for (const file of req.files.images) {
        const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        imageUrls.push(base64String);
      }
    }

    // Process voice recording
    let voiceRecording = null;
    if (req.files && req.files.voiceRecording) {
      const voiceFile = req.files.voiceRecording[0];
      voiceRecording = `data:${voiceFile.mimetype};base64,${voiceFile.buffer.toString('base64')}`;
    }

    // Create query document
    const queryDoc = {
      userId: new ObjectId(userId),
      cropType,
      issueType,
      urgency,
      description,
      location: location || null,
      images: imageUrls,
      voiceRecording,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert query into database
    const result = await db.collection('queries').insertOne(queryDoc);

    res.json({
      success: true,
      message: 'Query submitted successfully',
      queryId: result.insertedId.toString()
    });

  } catch (error) {
    console.error('Query submission error:', error);
    res.status(500).json({ error: 'Failed to submit query' });
  }
});

// Get user queries
app.get('/api/queries/my-queries', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const queries = await db.collection('queries')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ queries });
  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// Get all queries for admin
app.get('/api/admin/queries', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const queries = await db.collection('queries')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $sort: { createdAt: -1 }
        }
      ])
      .toArray();

    res.json({ queries });
  } catch (error) {
    console.error('Get admin queries error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

// Admin reply to query
app.post('/api/admin/queries/:queryId/reply', authenticate, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { reply, assignedAdmin } = req.body;
    const adminId = req.user.userId;

    // Check if user is admin
    const user = await db.collection('users').findOne({ _id: new ObjectId(adminId) });
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!reply || !assignedAdmin) {
      return res.status(400).json({ error: 'Reply and assigned admin are required' });
    }

    // Update query with reply
    const result = await db.collection('queries').updateOne(
      { _id: new ObjectId(queryId) },
      {
        $set: {
          status: 'REPLIED',
          reply: {
            message: reply,
            adminId: new ObjectId(adminId),
            adminName: user.name,
            assignedAdmin,
            repliedAt: new Date()
          },
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({
      success: true,
      message: 'Reply sent successfully'
    });

  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Dashboard endpoints (mock data)
app.get('/api/farmer/profile', authenticate, async (req, res) => {
  try {
    const farmersCollection = db.collection('farmers');
    const farmer = await farmersCollection.findOne({ userId: new ObjectId(req.user.userId) });
    
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
    console.log(`🚀 MongoDB GridFS Server running on port ${PORT}`);
    console.log('✅ Registration endpoint: POST /api/auth/register');
    console.log('✅ Login endpoint: POST /api/auth/login');
    console.log('✅ Users endpoint: GET /api/users');
    console.log('✅ Products endpoint: GET /api/products');
    console.log('✅ Health check: GET /api/health');
    console.log('✅ Profile photo upload: POST /api/user/upload-photo');
    console.log('✅ Profile photo get: GET /api/user/profile-photo');
    console.log('✅ Profile photo delete: DELETE /api/user/profile-photo');
  });
};

startServer().catch(console.error);
