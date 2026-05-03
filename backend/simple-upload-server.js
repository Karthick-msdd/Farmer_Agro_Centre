const express = require('express');
const multer = require('multer');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for memory storage
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
      cb(new Error('Only image files are allowed'));
    }
  }
});

// MongoDB connection
let db;
const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user in database
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password using bcrypt
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      accessToken: token,
      refreshToken: token, // For demo purposes, using same token
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/mongo-auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user in database
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password using bcrypt
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      accessToken: token,
      refreshToken: token, // For demo purposes, using same token
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'FARMER' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const usersCollection = db.collection('users');
    const existingUserByEmail = await usersCollection.findOne({ email });
    const existingUserByPhone = phone ? await usersCollection.findOne({ phone }) : null;
    
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    if (existingUserByPhone) {
      return res.status(400).json({
        success: false,
        error: 'User with this phone number already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: result.insertedId.toString(),
        email: newUser.email,
        role: newUser.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: result.insertedId,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `User with this ${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        projection: { 
          password: 0, // Exclude password
          loginAttempts: 0,
          lockedUntil: 0
        }
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticate, upload.single('profileImage'), async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const {
      name,
      email,
      phone,
      age,
      gender,
      address,
      village,
      district,
      state,
      farmSize,
      farmLocation,
      cropTypes,
      preferredLanguage,
      department,
      designation,
      bio
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Get current user to check for existing profile image
    const currentUser = await usersCollection.findOne({ 
      _id: new ObjectId(req.user.userId) 
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let profileImageUrl = currentUser.profileImage; // Keep existing image by default
    
    // Handle image upload if provided
    if (req.file) {
      try {
        const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });
        
        // Delete old image if it exists
        if (currentUser.profileImage) {
          try {
            const oldImageId = currentUser.profileImage.split('/').pop();
            if (oldImageId && ObjectId.isValid(oldImageId)) {
              await bucket.delete(new ObjectId(oldImageId));
              console.log('Old profile image deleted:', oldImageId);
            }
          } catch (deleteError) {
            console.error('Error deleting old profile image:', deleteError);
            // Continue even if old image deletion fails
          }
        }
        
        // Upload new image
        const filename = `profile_${Date.now()}_${req.file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            userId: req.user.userId,
            uploadedAt: new Date()
          }
        });

        uploadStream.end(req.file.buffer);
        
        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });
        
        profileImageUrl = `/api/upload/profile-image/${uploadStream.id}`;
        console.log('New profile image uploaded:', uploadStream.id);
      } catch (uploadError) {
        console.error('Profile image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }

    const updateData = {
      name,
      email,
      phone: phone || '',
      age: age || '',
      gender: gender || '',
      address: address || '',
      village: village || '',
      district: district || '',
      state: state || '',
      farmSize: farmSize || '',
      farmLocation: farmLocation || '',
      cropTypes: cropTypes ? JSON.parse(cropTypes) : [],
      preferredLanguage: preferredLanguage || 'English',
      department: department || '',
      designation: designation || '',
      bio: bio || '',
      profileImage: profileImageUrl,
      updatedAt: new Date()
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          ...updateData
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Upload profile image
app.post('/api/upload/profile-image', authenticate, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });

    // Generate unique filename
    const filename = `profile_${req.user.userId}_${Date.now()}`;
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        userId: req.user.userId,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        uploadedAt: new Date()
      }
    });

    // Handle upload events
    uploadStream.on('error', (error) => {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      });
    });

    uploadStream.on('finish', async () => {
      try {
        const fileId = uploadStream.id.toString();
        
        // Update user document with image reference
        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.userId) },
          { 
            $set: { 
              profileImage: fileId,
              updatedAt: new Date()
            }
          }
        );

        res.json({
          success: true,
          message: 'Profile image uploaded successfully',
          data: {
            fileId: fileId,
            filename: filename
          }
        });
      } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update user profile'
        });
      }
    });

    // Write file to GridFS
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get profile image
app.get('/api/upload/profile-image', authenticate, async (req, res) => {
  try {
    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });

    // Get user's profile image ID
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { profileImage: 1 } }
    );

    if (!user || !user.profileImage) {
      return res.status(404).json({
        success: false,
        error: 'Profile image not found'
      });
    }

    // Find the image file
    const files = await bucket.find({ _id: new ObjectId(user.profileImage) }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }

    const file = files[0];
    
    // Set appropriate headers
    res.set({
      'Content-Type': file.metadata?.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });

    // Stream the image
    const downloadStream = bucket.openDownloadStream(new ObjectId(user.profileImage));
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }
    });

  } catch (error) {
    console.error('Get profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get profile image by ID (for serving images)
app.get('/api/upload/profile-image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image ID'
      });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });
    
    // Find the image file
    const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }

    const file = files[0];
    
    // Set appropriate headers
    res.set({
      'Content-Type': file.metadata?.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });

    // Stream the image
    const downloadStream = bucket.openDownloadStream(new ObjectId(id));
    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }
    });

  } catch (error) {
    console.error('Get image by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete profile image
app.delete('/api/upload/profile-image', authenticate, async (req, res) => {
  try {
    const bucket = new GridFSBucket(db, { bucketName: 'profileImages' });

    // Get user's profile image ID
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { profileImage: 1 } }
    );

    if (!user || !user.profileImage) {
      return res.status(404).json({
        success: false,
        error: 'Profile image not found'
      });
    }

    // Extract ObjectId from URL
    const imageId = user.profileImage.split('/').pop();
    if (!imageId || !ObjectId.isValid(imageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid profile image ID'
      });
    }

    // Delete from GridFS
    await bucket.delete(new ObjectId(imageId));

    // Remove reference from user document
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        $unset: { profileImage: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({
      success: true,
      message: 'Profile image deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user profile
app.get('/api/upload/profile', authenticate, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { 
        projection: { 
          password: 0, // Exclude password
          loginAttempts: 0,
          lockedUntil: 0
        }
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get farmer profile if exists
    const farmerCollection = db.collection('farmers');
    const farmerProfile = await farmerCollection.findOne(
      { userId: new ObjectId(req.user.userId) }
    );

    // Construct profile image URL if exists
    let profileImageUrl = null;
    if (user.profileImage) {
      profileImageUrl = `/api/upload/profile-image/${user.profileImage}`;
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          profileImageUrl
        },
        farmerProfile
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Product Management Endpoints
// Create a new product with image upload
app.post('/api/products', authenticate, upload.single('productImage'), async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      stockQuantity,
      unit,
      description,
      brand,
      model,
      weight,
      dimensions
    } = req.body;

    // Validate required fields
    if (!name || !category || !price || !stockQuantity || !unit || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const productsCollection = db.collection('products');
    let imageUrl = null;
    
    // Handle image upload if provided
    if (req.file) {
      try {
        const bucket = new GridFSBucket(db, { bucketName: 'productImages' });
        const filename = `product_${Date.now()}_${req.file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            productName: name,
            uploadedBy: req.user.userId,
            uploadedAt: new Date()
          }
        });

        uploadStream.end(req.file.buffer);
        
        uploadStream.on('finish', async () => {
          imageUrl = `/api/products/image/${uploadStream.id}`;
        });

        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });
        
        imageUrl = `/api/products/image/${uploadStream.id}`;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }
    
    const product = {
      name,
      category,
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity),
      unit,
      description,
      brand: brand || '',
      model: model || '',
      weight: weight || '',
      dimensions: dimensions || '',
      imageUrl,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.userId
    };

    const result = await productsCollection.insertOne(product);
    
    res.status(201).json({
      success: true,
      data: {
        product: {
          id: result.insertedId,
          ...product
        }
      }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const products = await productsCollection.find({ isActive: true }).toArray();
    
    res.json({
      success: true,
      data: {
        products: products.map(product => ({
          id: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          stockQuantity: product.stockQuantity,
          unit: product.unit,
          description: product.description,
          brand: product.brand,
          model: product.model,
          weight: product.weight,
          dimensions: product.dimensions,
          imageUrl: product.imageUrl,
          createdAt: product.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Serve product images
app.get('/api/products/image/:id', async (req, res) => {
  try {
    const bucket = new GridFSBucket(db, { bucketName: 'productImages' });
    const fileId = new ObjectId(req.params.id);
    
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });
    
    downloadStream.on('end', () => {
      res.end();
    });
    
    downloadStream.on('error', (error) => {
      console.error('Image download error:', error);
      res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    });
    
  } catch (error) {
    console.error('Get product image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get a single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const product = await productsCollection.findOne({ 
      _id: new ObjectId(req.params.id),
      isActive: true 
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          stockQuantity: product.stockQuantity,
          unit: product.unit,
          description: product.description,
          brand: product.brand,
          model: product.model,
          weight: product.weight,
          dimensions: product.dimensions,
          imageUrl: product.imageUrl,
          createdAt: product.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update a product
app.put('/api/products/:id', authenticate, upload.single('productImage'), async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    const {
      name,
      category,
      price,
      stockQuantity,
      unit,
      description,
      brand,
      model,
      weight,
      dimensions,
      removeImage
    } = req.body;

    // Validate required fields
    if (!name || !category || !price || !stockQuantity || !unit || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get the current product to check for existing image
    const currentProduct = await productsCollection.findOne({ 
      _id: new ObjectId(req.params.id) 
    });

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    let imageUrl = currentProduct.imageUrl; // Keep existing image by default
    
    // Handle image removal if requested
    if (removeImage === 'true' && currentProduct.imageUrl) {
      try {
        const bucket = new GridFSBucket(db, { bucketName: 'productImages' });
        const oldImageId = currentProduct.imageUrl.split('/').pop();
        if (oldImageId && ObjectId.isValid(oldImageId)) {
          await bucket.delete(new ObjectId(oldImageId));
          console.log('Product image removed:', oldImageId);
          imageUrl = null; // Remove image URL
        }
      } catch (deleteError) {
        console.error('Error deleting product image:', deleteError);
        // Continue even if image deletion fails
      }
    }
    
    // Handle image upload if provided
    if (req.file) {
      try {
        const bucket = new GridFSBucket(db, { bucketName: 'productImages' });
        
        // Delete old image if it exists and we're uploading a new one
        if (currentProduct.imageUrl && removeImage !== 'true') {
          try {
            const oldImageId = currentProduct.imageUrl.split('/').pop();
            if (oldImageId && ObjectId.isValid(oldImageId)) {
              await bucket.delete(new ObjectId(oldImageId));
              console.log('Old product image deleted:', oldImageId);
            }
          } catch (deleteError) {
            console.error('Error deleting old image:', deleteError);
            // Continue even if old image deletion fails
          }
        }
        
        // Upload new image
        const filename = `product_${Date.now()}_${req.file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: {
            productName: name,
            uploadedBy: req.user.userId,
            uploadedAt: new Date()
          }
        });

        uploadStream.end(req.file.buffer);
        
        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });
        
        imageUrl = `/api/products/image/${uploadStream.id}`;
        console.log('New product image uploaded:', uploadStream.id);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }

    const updateData = {
      name,
      category,
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity),
      unit,
      description,
      brand: brand || '',
      model: model || '',
      weight: weight || '',
      dimensions: dimensions || '',
      imageUrl,
      updatedAt: new Date()
    };

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        product: {
          id: req.params.id,
          ...updateData
        }
      }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete a product (soft delete)
app.delete('/api/products/:id', authenticate, async (req, res) => {
  try {
    const productsCollection = db.collection('products');
    
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Query/Chat System Endpoints

// Create a new query
app.post('/api/queries', authenticate, async (req, res) => {
  try {
    const { subject, message, category } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Subject and message are required'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const query = {
      userId: new ObjectId(req.user.userId),
      subject,
      message,
      category: category || 'general',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [{
        senderId: new ObjectId(req.user.userId),
        senderType: 'user',
        message,
        timestamp: new Date()
      }]
    };

    const result = await queriesCollection.insertOne(query);
    
    res.json({
      success: true,
      data: {
        queryId: result.insertedId,
        message: 'Query submitted successfully'
      }
    });

  } catch (error) {
    console.error('Create query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user's queries
app.get('/api/queries', authenticate, async (req, res) => {
  try {
    const queriesCollection = db.collection('queries');
    
    const queries = await queriesCollection.find(
      { userId: new ObjectId(req.user.userId) },
      { sort: { updatedAt: -1 } }
    ).toArray();

    res.json({
      success: true,
      data: { queries }
    });

  } catch (error) {
    console.error('Get queries error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get specific query with messages
app.get('/api/queries/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query ID'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const query = await queriesCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: { query }
    });

  } catch (error) {
    console.error('Get query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Add message to query (user)
app.post('/api/queries/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query ID'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const newMessage = {
      senderId: new ObjectId(req.user.userId),
      senderType: 'user',
      message,
      timestamp: new Date()
    };

    const result = await queriesCollection.updateOne(
      { 
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.userId)
      },
      { 
        $push: { messages: newMessage },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: { message: 'Message sent successfully' }
    });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin endpoints

// Get all queries for admin
app.get('/api/admin/queries', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { role: 1 } }
    );

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const queries = await queriesCollection.aggregate([
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
        $project: {
          _id: 1,
          subject: 1,
          category: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          'user.name': 1,
          'user.email': 1,
          messageCount: { $size: '$messages' }
        }
      },
      {
        $sort: { updatedAt: -1 }
      }
    ]).toArray();

    res.json({
      success: true,
      data: { queries }
    });

  } catch (error) {
    console.error('Get admin queries error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get specific query for admin
app.get('/api/admin/queries/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query ID'
      });
    }

    // Check if user is admin
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { role: 1 } }
    );

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const query = await queriesCollection.aggregate([
      {
        $match: { _id: new ObjectId(id) }
      },
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
        $project: {
          _id: 1,
          subject: 1,
          category: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          messages: 1,
          'user.name': 1,
          'user.email': 1
        }
      }
    ]).toArray();

    if (query.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: { query: query[0] }
    });

  } catch (error) {
    console.error('Get admin query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin reply to query
app.post('/api/admin/queries/:id/reply', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query ID'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Check if user is admin
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { role: 1 } }
    );

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const newMessage = {
      senderId: new ObjectId(req.user.userId),
      senderType: 'admin',
      message,
      timestamp: new Date()
    };

    const result = await queriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $push: { messages: newMessage },
        $set: { 
          updatedAt: new Date(),
          status: 'replied'
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: { message: 'Reply sent successfully' }
    });

  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update query status (admin)
app.put('/api/admin/queries/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query ID'
      });
    }

    if (!['open', 'replied', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be open, replied, or closed'
      });
    }

    // Check if user is admin
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { role: 1 } }
    );

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const queriesCollection = db.collection('queries');
    
    const result = await queriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    res.json({
      success: true,
      data: { message: 'Status updated successfully' }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Start server
const startServer = async () => {
  try {
    await connectToMongoDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Upload server running on port ${PORT}`);
      console.log(`📸 Image upload endpoints available:`);
      console.log(`   POST /api/upload/profile-image`);
      console.log(`   GET  /api/upload/profile-image`);
      console.log(`   DELETE /api/upload/profile-image`);
      console.log(`   GET  /api/upload/profile`);
      console.log(`📦 Product endpoints available:`);
      console.log(`   POST /api/products`);
      console.log(`   GET  /api/products`);
      console.log(`   GET  /api/products/:id`);
      console.log(`   PUT  /api/products/:id`);
      console.log(`   DELETE /api/products/:id`);
      console.log(`💬 Query/Chat endpoints available:`);
      console.log(`   POST /api/queries`);
      console.log(`   GET  /api/queries`);
      console.log(`   GET  /api/queries/:id`);
      console.log(`   POST /api/queries/:id/messages`);
      console.log(`   GET  /api/admin/queries`);
      console.log(`   GET  /api/admin/queries/:id`);
      console.log(`   POST /api/admin/queries/:id/reply`);
      console.log(`   PUT  /api/admin/queries/:id/status`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
