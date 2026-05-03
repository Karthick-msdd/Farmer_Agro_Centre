import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const API_BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN_API_BASE_URL = `${API_BASE_URL}/admin`;

// Test data
const testPhone = '9876543210';
const testAdminUsername = 'admin@example.com';
const testAdminPassword = 'password123';
const testAdminPhone = '9988776655';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function testUserSMSOTPFlow() {
  log('\n' + '='.repeat(60), colors.bold);
  log('TESTING USER SMS OTP FLOW', colors.bold);
  log('='.repeat(60), colors.bold);

  try {
    // 1. Send OTP for user login
    logInfo(`Sending SMS OTP to ${testPhone}...`);
    const sendOtpRes = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    logSuccess('SMS OTP sent successfully');
    logInfo(`Response: ${JSON.stringify(sendOtpRes.data, null, 2)}`);

    const otp = sendOtpRes.data.otp;
    if (!otp) {
      logError('OTP not returned in development mode. Cannot proceed with verification.');
      return false;
    }

    // 2. Verify OTP
    logInfo(`Verifying SMS OTP ${otp} for ${testPhone}...`);
    const verifyOtpRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: otp,
      type: 'LOGIN'
    });

    logSuccess('SMS OTP verified successfully');
    logInfo(`Response: ${JSON.stringify(verifyOtpRes.data, null, 2)}`);

    if (verifyOtpRes.data.isNewUser) {
      logWarning('User is new, testing registration with OTP...');
      const registerOtpRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
        phone: testPhone,
        otp: otp,
        type: 'REGISTER',
        userData: {
          name: 'Test User SMS',
          role: 'FARMER',
          age: 30,
          gender: 'Male',
          address: '123 SMS Street',
          district: 'Test District',
          state: 'Test State',
        },
      });
      logSuccess('User registration with SMS OTP completed');
      logInfo(`Registration Response: ${JSON.stringify(registerOtpRes.data, null, 2)}`);
    }

    return true;
  } catch (error: any) {
    logError(`SMS OTP flow failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testUserTOTPFlow() {
  log('\n' + '='.repeat(60), colors.bold);
  log('TESTING USER TOTP FLOW', colors.bold);
  log('='.repeat(60), colors.bold);

  try {
    // First, we need to login with SMS to get a token for TOTP setup
    logInfo('Step 1: Login with SMS to get access token...');
    const smsLoginRes = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    if (!smsLoginRes.data.otp) {
      logError('Cannot proceed without SMS OTP in development mode');
      return false;
    }

    const loginRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: smsLoginRes.data.otp,
      type: 'LOGIN'
    });

    const accessToken = loginRes.data.tokens?.accessToken;
    if (!accessToken) {
      logError('No access token received from SMS login');
      return false;
    }

    logSuccess('SMS login successful, access token obtained');

    // 2. Setup TOTP
    logInfo('Step 2: Setting up TOTP...');
    const setupTotpRes = await axios.post(`${API_BASE_URL}/auth/totp/setup`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    logSuccess('TOTP setup initiated');
    logInfo(`Setup Response: ${JSON.stringify(setupTotpRes.data, null, 2)}`);

    // 3. Generate a test TOTP token (in real scenario, this would come from authenticator app)
    logInfo('Step 3: Generating test TOTP token...');
    const speakeasy = require('speakeasy');
    const testTotpToken = speakeasy.totp({
      secret: setupTotpRes.data.totpSecret,
      encoding: 'base32'
    });

    logInfo(`Generated test TOTP token: ${testTotpToken}`);

    // 4. Verify TOTP setup
    logInfo('Step 4: Verifying TOTP setup...');
    const verifySetupRes = await axios.post(`${API_BASE_URL}/auth/totp/verify-setup`, {
      token: testTotpToken
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    logSuccess('TOTP setup verified successfully');
    logInfo(`Setup Verification Response: ${JSON.stringify(verifySetupRes.data, null, 2)}`);

    // 5. Test TOTP login
    logInfo('Step 5: Testing TOTP login...');
    const totpLoginRes = await axios.post(`${API_BASE_URL}/auth/totp/login`, {
      phone: testPhone,
      token: testTotpToken
    });

    logSuccess('TOTP login successful');
    logInfo(`TOTP Login Response: ${JSON.stringify(totpLoginRes.data, null, 2)}`);

    return true;
  } catch (error: any) {
    logError(`TOTP flow failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testAdminSMSOTPFlow() {
  log('\n' + '='.repeat(60), colors.bold);
  log('TESTING ADMIN SMS OTP FLOW', colors.bold);
  log('='.repeat(60), colors.bold);

  try {
    // 1. Admin Login (should trigger OTP send if phone is registered)
    logInfo(`Attempting admin login for ${testAdminUsername}...`);
    const adminLoginRes = await axios.post(`${ADMIN_API_BASE_URL}/login`, {
      username: testAdminUsername,
      password: testAdminPassword,
    });

    logInfo(`Admin Login Response: ${JSON.stringify(adminLoginRes.data, null, 2)}`);

    if (adminLoginRes.data.requiresOTP) {
      const otp = adminLoginRes.data.otp;
      if (!otp) {
        logError('Admin OTP not returned in development mode. Cannot proceed with verification.');
        return false;
      }

      logInfo(`OTP received for admin: ${otp}`);

      // 2. Verify Admin OTP
      logInfo(`Verifying admin OTP ${otp} for ${testAdminUsername} with phone ${testAdminPhone}...`);
      const verifyAdminOtpRes = await axios.post(`${ADMIN_API_BASE_URL}/otp/verify`, {
        username: testAdminUsername,
        phone: testAdminPhone,
        otp: otp,
      });

      logSuccess('Admin SMS OTP verified successfully');
      logInfo(`Verify Admin OTP Response: ${JSON.stringify(verifyAdminOtpRes.data, null, 2)}`);
    } else {
      logSuccess('Admin login completed directly without OTP');
    }

    return true;
  } catch (error: any) {
    logError(`Admin SMS OTP flow failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testAdminTOTPFlow() {
  log('\n' + '='.repeat(60), colors.bold);
  log('TESTING ADMIN TOTP FLOW', colors.bold);
  log('='.repeat(60), colors.bold);

  try {
    // 1. Setup TOTP for admin
    logInfo(`Setting up TOTP for admin ${testAdminUsername}...`);
    const setupAdminTotpRes = await axios.post(`${ADMIN_API_BASE_URL}/totp/setup`, {
      username: testAdminUsername
    });

    logSuccess('Admin TOTP setup initiated');
    logInfo(`Setup Response: ${JSON.stringify(setupAdminTotpRes.data, null, 2)}`);

    // 2. Generate test TOTP token
    logInfo('Generating test TOTP token for admin...');
    const speakeasy = require('speakeasy');
    const testTotpToken = speakeasy.totp({
      secret: setupAdminTotpRes.data.data.totpSecret,
      encoding: 'base32'
    });

    logInfo(`Generated admin test TOTP token: ${testTotpToken}`);

    // 3. Verify admin TOTP setup
    logInfo('Verifying admin TOTP setup...');
    const verifyAdminSetupRes = await axios.post(`${ADMIN_API_BASE_URL}/totp/verify-setup`, {
      username: testAdminUsername,
      token: testTotpToken
    });

    logSuccess('Admin TOTP setup verified successfully');
    logInfo(`Setup Verification Response: ${JSON.stringify(verifyAdminSetupRes.data, null, 2)}`);

    // 4. Test admin login with TOTP
    logInfo('Testing admin login with TOTP...');
    const adminTotpLoginRes = await axios.post(`${ADMIN_API_BASE_URL}/login`, {
      username: testAdminUsername,
      password: testAdminPassword,
      totpToken: testTotpToken
    });

    logSuccess('Admin TOTP login successful');
    logInfo(`Admin TOTP Login Response: ${JSON.stringify(adminTotpLoginRes.data, null, 2)}`);

    return true;
  } catch (error: any) {
    logError(`Admin TOTP flow failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testOTPPreferences() {
  log('\n' + '='.repeat(60), colors.bold);
  log('TESTING OTP PREFERENCES', colors.bold);
  log('='.repeat(60), colors.bold);

  try {
    // First login to get token
    const smsLoginRes = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    const loginRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: smsLoginRes.data.otp,
      type: 'LOGIN'
    });

    const accessToken = loginRes.data.tokens?.accessToken;
    if (!accessToken) {
      logError('No access token received');
      return false;
    }

    // Get OTP preferences
    logInfo('Getting OTP preferences...');
    const getPrefsRes = await axios.get(`${API_BASE_URL}/auth/otp/preferences`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    logSuccess('OTP preferences retrieved');
    logInfo(`Preferences: ${JSON.stringify(getPrefsRes.data, null, 2)}`);

    // Update OTP preferences
    logInfo('Updating OTP preferences to TOTP...');
    const updatePrefsRes = await axios.put(`${API_BASE_URL}/auth/otp/preferences`, {
      preferredMethod: 'TOTP'
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    logSuccess('OTP preferences updated');
    logInfo(`Update Response: ${JSON.stringify(updatePrefsRes.data, null, 2)}`);

    return true;
  } catch (error: any) {
    logError(`OTP preferences test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testBackupCodes() {
  log('\n' + '='.repeat(60), colors.bold);
  log('TESTING BACKUP CODES', colors.bold);
  log('='.repeat(60), colors.bold);

  try {
    // First setup TOTP to get backup codes
    const smsLoginRes = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    const loginRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: smsLoginRes.data.otp,
      type: 'LOGIN'
    });

    const accessToken = loginRes.data.tokens?.accessToken;
    if (!accessToken) {
      logError('No access token received');
      return false;
    }

    // Setup TOTP
    const setupTotpRes = await axios.post(`${API_BASE_URL}/auth/totp/setup`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const speakeasy = require('speakeasy');
    const testTotpToken = speakeasy.totp({
      secret: setupTotpRes.data.totpSecret,
      encoding: 'base32'
    });

    const verifySetupRes = await axios.post(`${API_BASE_URL}/auth/totp/verify-setup`, {
      token: testTotpToken
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const backupCodes = verifySetupRes.data.backupCodes;
    logSuccess(`Backup codes generated: ${backupCodes.length} codes`);
    logInfo(`Backup codes: ${backupCodes.join(', ')}`);

    // Test backup code login
    logInfo('Testing login with backup code...');
    const backupLoginRes = await axios.post(`${API_BASE_URL}/auth/totp/login`, {
      phone: testPhone,
      backupCode: backupCodes[0]
    });

    logSuccess('Backup code login successful');
    logInfo(`Backup Login Response: ${JSON.stringify(backupLoginRes.data, null, 2)}`);

    return true;
  } catch (error: any) {
    logError(`Backup codes test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '🚀'.repeat(20), colors.bold);
  log('STARTING COMPREHENSIVE OTP AUTHENTICATION TESTS', colors.bold);
  log('🚀'.repeat(20), colors.bold);

  const results = {
    userSMS: false,
    userTOTP: false,
    adminSMS: false,
    adminTOTP: false,
    preferences: false,
    backupCodes: false
  };

  try {
    results.userSMS = await testUserSMSOTPFlow();
    results.userTOTP = await testUserTOTPFlow();
    results.adminSMS = await testAdminSMSOTPFlow();
    results.adminTOTP = await testAdminTOTPFlow();
    results.preferences = await testOTPPreferences();
    results.backupCodes = await testBackupCodes();

    // Summary
    log('\n' + '📊'.repeat(20), colors.bold);
    log('TEST RESULTS SUMMARY', colors.bold);
    log('📊'.repeat(20), colors.bold);

    Object.entries(results).forEach(([test, passed]) => {
      if (passed) {
        logSuccess(`${test.toUpperCase()}: PASSED`);
      } else {
        logError(`${test.toUpperCase()}: FAILED`);
      }
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    log(`\nOverall: ${passedTests}/${totalTests} tests passed`, 
        passedTests === totalTests ? colors.green : colors.yellow);

    if (passedTests === totalTests) {
      logSuccess('🎉 All tests passed! OTP authentication system is working correctly.');
    } else {
      logWarning('⚠️  Some tests failed. Please check the implementation.');
    }

  } catch (error) {
    logError(`Test suite failed: ${error}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  testUserSMSOTPFlow,
  testUserTOTPFlow,
  testAdminSMSOTPFlow,
  testAdminTOTPFlow,
  testOTPPreferences,
  testBackupCodes,
  runAllTests
};

