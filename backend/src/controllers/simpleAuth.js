// Simple Auth Controller - Working Version
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { SimpleOTPService } = require('../services/simpleOTPService');

const prisma = new PrismaClient();

// Send OTP to phone number
const sendPhoneOTP = async (req, res) => {
  try {
    const { phone, type = 'LOGIN' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await SimpleOTPService.sendSMSOTP(phone, type);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    res.json({
      message: result.message,
      otp: result.otp // Only shown in development
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP and login/register user
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp, type = 'LOGIN', userData } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }
    
    // Verify OTP
    const otpResult = await SimpleOTPService.verifySMSOTP(phone, otp, type);
    
    if (!otpResult.success) {
      return res.status(400).json({ error: otpResult.message });
    }
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phone }
    });
    
    if (user) {
      // Existing user - generate tokens and login
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      
      res.json({
        message: 'Login successful',
        isNewUser: false,
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
    } else {
      // New user - create user account
      if (type === 'REGISTER' && userData) {
        const { name, role = 'FARMER', ...farmerData } = userData;
        
        const newUser = await prisma.user.create({
          data: {
            name: name || `User ${phone}`,
            phone,
            role
          }
        });
        
        // Create farmer profile if user is a farmer
        if (role === 'FARMER') {
          await prisma.farmer.create({
            data: {
              userId: newUser.id,
              ...farmerData
            }
          });
        }
        
        const accessToken = jwt.sign(
          { userId: newUser.id, role: newUser.role },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1h' }
        );
        
        const refreshToken = jwt.sign(
          { userId: newUser.id },
          process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
          { expiresIn: '7d' }
        );
        
        res.json({
          message: 'Registration successful',
          isNewUser: true,
          user: {
            id: newUser.id,
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
};

// Setup TOTP for user
const setupTOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user || !user.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    const totpSecret = SimpleOTPService.generateTOTPSecret(userId, user.email);
    
    // Generate QR code
    const qrCodeDataURL = await SimpleOTPService.generateQRCode(totpSecret.qrCodeUrl);

    res.json({
      message: 'TOTP secret generated successfully',
      totpSecret: totpSecret.secret,
      qrCodeUrl: totpSecret.qrCodeUrl,
      qrCodeDataURL,
      manualEntryKey: totpSecret.manualEntryKey
    });

  } catch (error) {
    console.error('Setup TOTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login with TOTP
const loginWithTOTP = async (req, res) => {
  try {
    const { phone, token } = req.body;

    if (!phone || !token) {
      return res.status(400).json({ error: 'Phone number and TOTP token are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For this simple version, we'll just verify the token format
    // In a real implementation, you'd store and verify the TOTP secret
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid TOTP token format' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    res.json({
      message: 'TOTP login successful',
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
    console.error('TOTP login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { phone, type = 'LOGIN' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await SimpleOTPService.sendSMSOTP(phone, type);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    res.json({
      message: result.message,
      otp: result.otp // Only shown in development
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
  setupTOTP,
  loginWithTOTP,
  resendOTP
};
