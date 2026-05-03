// Simple OTP Test - Minimal Working Version
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const testPhone = '9876543210';

async function testOTP() {
  console.log('🚀 Testing OTP Functionality...\n');

  try {
    // Test 1: Send OTP
    console.log('📱 Step 1: Sending OTP...');
    const sendResponse = await axios.post(`${API_BASE_URL}/auth/otp/send`, {
      phone: testPhone,
      type: 'LOGIN'
    });

    console.log('✅ OTP sent successfully');
    console.log('Response:', JSON.stringify(sendResponse.data, null, 2));

    const otp = sendResponse.data.otp;
    if (!otp) {
      console.log('❌ No OTP returned in development mode');
      return;
    }

    // Test 2: Verify OTP
    console.log('\n🔐 Step 2: Verifying OTP...');
    const verifyResponse = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
      phone: testPhone,
      otp: otp,
      type: 'LOGIN'
    });

    console.log('✅ OTP verified successfully');
    console.log('Response:', JSON.stringify(verifyResponse.data, null, 2));

    if (verifyResponse.data.isNewUser) {
      console.log('\n👤 Step 3: Testing user registration...');
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/otp/verify`, {
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

      console.log('✅ User registration completed');
      console.log('Response:', JSON.stringify(registerResponse.data, null, 2));
    }

    console.log('\n🎉 All OTP tests passed successfully!');

  } catch (error) {
    console.error('❌ OTP test failed:', error.response?.data || error.message);
  }
}

// Run the test
testOTP();
