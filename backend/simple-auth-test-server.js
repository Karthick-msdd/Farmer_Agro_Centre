const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// In-memory user storage for testing
let users = [];

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token or user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Simple Auth Test Server is running!'
  });
});

// Register user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      name, email, phone, password, role = 'FARMER',
      age, gender, address, village, district, state,
      farmSize, farmLocation
    } = req.body;

    console.log('Registration attempt for:', { name, email, phone, role });

    // Validate required fields
    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Name and either email or phone are required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => 
      (email && u.email === email) || (phone && u.phone === phone)
    );

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create user
    const userId = users.length + 1;
    const user = {
      id: userId,
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', user.email);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt
      },
      tokens: {
        accessToken,
        refreshToken
      }
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

    console.log('Login attempt for:', { email, phone });

    if (!email && !phone) {
      return res.status(400).json({ error: 'Em ail or phone is required' });
    }

    // Find user
    const user = users.find(u => 
      (email && u.email === email) || (phone && u.phone === phone)
    );

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password if user has one
    if (user.password && password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('❌ Invalid password');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (user.password && !password) {
      return res.status(401).json({ error: 'Password required' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', user.email);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
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

// Get user profile
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    res.json({ 
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, 'your-refresh-secret-key');
    const user = users.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    res.json({
      accessToken: newAccessToken
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Sample products endpoint
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
    }
  ];
  
  res.json({ products });
});

// Debug endpoint to see all users
app.get('/api/debug/users', (req, res) => {
  res.json({ 
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role
    }))
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Simple Auth Test Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: http://localhost:3000`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`✅ Ready to handle registration and login requests!`);
});


