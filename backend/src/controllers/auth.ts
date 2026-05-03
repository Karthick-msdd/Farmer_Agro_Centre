import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { AdvancedOTPService } from '../services/advancedOTPService';

export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      name, email, phone, password, role = 'FARMER',
      // Enhanced farmer fields
      age, gender, address, village, district, state,
      farmSize, farmLocation, farmLatitude, farmLongitude,
      cropTypes, preferredLanguage
    } = req.body;

    // Validate required fields
    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Name and either email or phone are required' });
    }

    // Check if user already exists
    const orExisting: any[] = [];
    if (email) orExisting.push({ email });
    if (phone) orExisting.push({ phone });
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: orExisting
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    // Create farmer profile if user is a farmer
    if (role === 'FARMER') {
      await prisma.farmer.create({
        data: {
          userId: user.id,
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
          preferredLanguage: preferredLanguage || 'English'
        }
      });
    }

    // Check for required environment variables
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('JWT secrets are not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'JWT secrets are not properly configured'
      });
    }

    try {
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Store refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.status(201).json({
        message: 'User registered successfully',
        user,
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return res.status(500).json({ 
        error: 'Failed to generate authentication tokens',
        details: 'Please try again later'
      });
    }
  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    // More specific error handling for Prisma errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return res.status(409).json({
        error: 'User with this email or phone already exists',
        details: 'Please use a different email or phone number'
      });
    }
    
    // Handle other types of errors
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred';
    
    return res.status(500).json({ 
      error: 'Failed to register user',
      details: process.env.NODE_ENV === 'development' 
        ? errorMessage 
        : 'Internal server error'
    });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('Login attempt with data:', { email: req.body.email, phone: req.body.phone });
    
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      console.log('Login failed: Email or phone is required');
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    // Find user
    const orLogin: any[] = [];
    if (email) orLogin.push({ email });
    if (phone) orLogin.push({ phone });
    
    console.log('Searching for user with:', orLogin);
    
    const user = await prisma.user.findFirst({
      where: {
        OR: orLogin,
        isActive: true
      }
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password if user has one
    if (user.password && password) {
      console.log('Validating password...');
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('Login failed: Invalid password');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (user.password && !password) {
      console.log('Login failed: Password required');
      return res.status(401).json({ error: 'Password required' });
    }

    console.log('Generating tokens...');
    
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

    console.log('Login successful for user:', user.email || user.phone);
    
    return res.json({
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Error';
    
    console.error('Login error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    ) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    return res.json({
      accessToken: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Send OTP to phone number for login/registration (SMS method)
export const sendPhoneOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, type = 'LOGIN' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await AdvancedOTPService.sendSMSOTP(phone, type as any);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({
      message: result.message,
      otp: result.otp // Only shown in development
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP and login/register user (SMS method)
export const verifyPhoneOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, otp, type = 'LOGIN', userData } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }
    
    // Verify OTP
    const otpResult = await AdvancedOTPService.verifySMSOTP(phone, otp, type as any);
    
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
      
      return res.json({
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
        
        return res.json({
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
        return res.json({
          message: 'OTP verified successfully',
          isNewUser: true,
          phone,
          requiresRegistration: true
        });
      }
    }
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Setup TOTP for user (generate secret and QR code)
export const setupTOTP = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user || !user.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    const result = await AdvancedOTPService.setupTOTP(userId, user.email);
    
    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    // Generate QR code
    const qrCodeDataURL = await AdvancedOTPService.generateQRCode(result.data!.qrCodeUrl);

    return res.json({
      message: result.message,
      totpSecret: result.data!.secret,
      qrCodeUrl: result.data!.qrCodeUrl,
      qrCodeDataURL,
      manualEntryKey: result.data!.manualEntryKey
    });

  } catch (error) {
    console.error('Setup TOTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify TOTP setup
export const verifyTOTPSetup = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'TOTP token is required' });
    }

    const result = await AdvancedOTPService.verifyTOTPSetup(userId, token);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({
      message: result.message,
      backupCodes: result.backupCodes
    });

  } catch (error) {
    console.error('Verify TOTP setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Login with TOTP
export const loginWithTOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, token, backupCode } = req.body;

    if (!phone || (!token && !backupCode)) {
      return res.status(400).json({ error: 'Phone number and TOTP token or backup code are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let verificationResult;

    if (backupCode) {
      // Verify backup code
      verificationResult = await AdvancedOTPService.verifyBackupCode(user.id, backupCode);
    } else {
      // Verify TOTP token
      verificationResult = await AdvancedOTPService.verifyTOTPCode(user.id, token);
    }

    if (!verificationResult.success) {
      return res.status(400).json({ error: verificationResult.message });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return res.json({
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
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user OTP preferences
export const getOTPPreferences = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const preferences = await AdvancedOTPService.getUserOTPPreferences(userId);

    return res.json({
      preferences: preferences || {
        userId,
        totpEnabled: false,
        preferredMethod: 'SMS'
      }
    });

  } catch (error) {
    console.error('Get OTP preferences error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user OTP preferences
export const updateOTPPreferences = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const { preferredMethod } = req.body;

    const result = await AdvancedOTPService.updateUserOTPPreferences(userId, {
      preferredMethod: preferredMethod as 'SMS' | 'TOTP' | 'BOTH'
    });

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    return res.json({
      message: result.message
    });

  } catch (error) {
    console.error('Update OTP preferences error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Disable TOTP
export const disableTOTP = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const result = await AdvancedOTPService.disableTOTP(userId);

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    return res.json({
      message: result.message
    });

  } catch (error) {
    console.error('Disable TOTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, type = 'LOGIN' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await AdvancedOTPService.sendSMSOTP(phone, type as any);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({
      message: result.message,
      otp: result.otp // Only shown in development
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        farmer: true,
        agroCenter: true,
        supplier: true,
        agronomist: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user!.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        updatedAt: true
      }
    });

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};