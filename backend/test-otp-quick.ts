import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const API_BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

// Test data
const testPhone = '9876543210';

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

async function testBasicOTPFlow() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TESTING BASIC OTP FUNCTIONALITY', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    // 1. Test server connectivity
    logInfo('Testing server connectivity...');
    try {
      await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      logSuccess('Server is running');
    } catch (error) {
      logWarning('Health endpoint not available, but server might be running');
    }

    // 2. Send OTP
    logInfo(`Sending OTP to ${testPhone}...`);
    const sendOtpRes = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    logSuccess('OTP sent successfully');
    logInfo(`Response: ${JSON.stringify(sendOtpRes.data, null, 2)}`);

    const otp = sendOtpRes.data.otp;
    if (!otp) {
      logError('OTP not returned in development mode. Cannot proceed with verification.');
      return false;
    }

    // 3. Verify OTP
    logInfo(`Verifying OTP ${otp} for ${testPhone}...`);
    const verifyOtpRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: otp,
      type: 'LOGIN'
    });

    logSuccess('OTP verified successfully');
    logInfo(`Response: ${JSON.stringify(verifyOtpRes.data, null, 2)}`);

    if (verifyOtpRes.data.isNewUser) {
      logInfo('User is new, testing registration...');
      const registerRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
        phone: testPhone,
        otp: otp,
        type: 'REGISTER',
        userData: {
          name: 'Test User',
          role: 'FARMER',
          age: 30,
          gender: 'Male',
          address: '123 Test Street',
          district: 'Test District',
          state: 'Test State',
        },
      });
      logSuccess('User registration completed');
      logInfo(`Registration Response: ${JSON.stringify(registerRes.data, null, 2)}`);
    }

    return true;
  } catch (error: any) {
    logError(`OTP test failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      logError(`Server response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testTOTPFlow() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TESTING TOTP FUNCTIONALITY', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    // First login with SMS to get token
    logInfo('Step 1: Getting access token via SMS login...');
    const smsRes = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    if (!smsRes.data.otp) {
      logError('Cannot get SMS OTP for TOTP test');
      return false;
    }

    const loginRes = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: smsRes.data.otp,
      type: 'LOGIN'
    });

    const accessToken = loginRes.data.tokens?.accessToken;
    if (!accessToken) {
      logError('No access token received');
      return false;
    }

    logSuccess('Access token obtained');

    // Setup TOTP
    logInfo('Step 2: Setting up TOTP...');
    const setupRes = await axios.post(`${API_BASE_URL}/auth/totp/setup`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    logSuccess('TOTP setup initiated');
    logInfo(`Setup Response: ${JSON.stringify(setupRes.data, null, 2)}`);

    // Generate test TOTP token
    logInfo('Step 3: Generating test TOTP token...');
    const speakeasy = require('speakeasy');
    const testToken = speakeasy.totp({
      secret: setupRes.data.totpSecret,
      encoding: 'base32'
    });

    logInfo(`Generated TOTP token: ${testToken}`);

    // Verify TOTP setup
    logInfo('Step 4: Verifying TOTP setup...');
    const verifySetupRes = await axios.post(`${API_BASE_URL}/auth/totp/verify-setup`, {
      token: testToken
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    logSuccess('TOTP setup verified');
    logInfo(`Setup Verification: ${JSON.stringify(verifySetupRes.data, null, 2)}`);

    // Test TOTP login
    logInfo('Step 5: Testing TOTP login...');
    const totpLoginRes = await axios.post(`${API_BASE_URL}/auth/totp/login`, {
      phone: testPhone,
      token: testToken
    });

    logSuccess('TOTP login successful');
    logInfo(`TOTP Login Response: ${JSON.stringify(totpLoginRes.data, null, 2)}`);

    return true;
  } catch (error: any) {
    logError(`TOTP test failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      logError(`Server response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testAdminOTPFlow() {
  log('\n' + '='.repeat(50), colors.bold);
  log('TESTING ADMIN OTP FUNCTIONALITY', colors.bold);
  log('='.repeat(50), colors.bold);

  try {
    const adminUsername = 'admin@example.com';
    const adminPassword = 'password123';

    logInfo(`Testing admin login for ${adminUsername}...`);
    const adminLoginRes = await axios.post(`${API_BASE_URL}/admin/login`, {
      username: adminUsername,
      password: adminPassword,
    });

    logInfo(`Admin Login Response: ${JSON.stringify(adminLoginRes.data, null, 2)}`);

    if (adminLoginRes.data.requiresOTP) {
      const otp = adminLoginRes.data.otp;
      if (!otp) {
        logError('Admin OTP not returned in development mode');
        return false;
      }

      logInfo(`Verifying admin OTP: ${otp}`);
      const verifyAdminRes = await axios.post(`${API_BASE_URL}/admin/otp/verify`, {
        username: adminUsername,
        phone: adminLoginRes.data.phone || '9988776655',
        otp: otp,
      });

      logSuccess('Admin OTP verified successfully');
      logInfo(`Admin Verification: ${JSON.stringify(verifyAdminRes.data, null, 2)}`);
    } else {
      logSuccess('Admin login completed without OTP');
    }

    return true;
  } catch (error: any) {
    logError(`Admin OTP test failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      logError(`Server response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function runQuickTests() {
  log('\n' + '🚀'.repeat(15), colors.bold);
  log('QUICK OTP FUNCTIONALITY TEST', colors.bold);
  log('🚀'.repeat(15), colors.bold);

  const results = {
    basicOTP: false,
    totp: false,
    adminOTP: false
  };

  try {
    results.basicOTP = await testBasicOTPFlow();
    results.totp = await testTOTPFlow();
    results.adminOTP = await testAdminOTPFlow();

    // Summary
    log('\n' + '📊'.repeat(15), colors.bold);
    log('TEST RESULTS SUMMARY', colors.bold);
    log('📊'.repeat(15), colors.bold);

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
      logSuccess('🎉 All OTP functionality is working perfectly!');
    } else {
      logWarning('⚠️  Some tests failed. Check the server logs for details.');
    }

  } catch (error) {
    logError(`Test suite failed: ${error}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runQuickTests().catch(console.error);
}

export { testBasicOTPFlow, testTOTPFlow, testAdminOTPFlow, runQuickTests };
