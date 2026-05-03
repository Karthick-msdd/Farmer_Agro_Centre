// Test script to create fake accounts using the OTP API
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

const fakeAccounts = [
  {
    name: 'John Farmer',
    phone: '9876543210',
    role: 'FARMER',
    userData: {
      name: 'John Farmer',
      role: 'FARMER',
      age: 35,
      gender: 'Male',
      address: 'Village Road, Block A',
      village: 'Green Valley',
      district: 'Agricultural District',
      state: 'Maharashtra',
      farmSize: 5.5,
      farmLocation: 'Green Valley Farm',
      farmLatitude: 19.0760,
      farmLongitude: 72.8777,
      cropTypes: '["Wheat", "Rice", "Cotton"]',
      preferredLanguage: 'English',
      soilType: 'Black Soil'
    }
  },
  {
    name: 'Sarah AgroCenter',
    phone: '9876543211',
    role: 'AGROCENTER',
    userData: {
      name: 'Sarah AgroCenter',
      role: 'AGROCENTER',
      name: 'Green Valley Agro Center',
      address: 'Main Market, Agricultural District',
      phone: '9876543211',
      email: 'sarah.agro@example.com',
      licenseNo: 'AGRO-2024-001',
      isActive: true
    }
  }
];

async function createFakeAccount(account) {
  try {
    console.log(`\n🚀 Creating account for ${account.name}...`);
    
    // Step 1: Send OTP
    console.log(`📱 Sending OTP to ${account.phone}...`);
    const otpResponse = await axios.post(`${BASE_URL}/api/auth/otp/send`, {
      phone: account.phone,
      type: 'REGISTER'
    });
    
    console.log('OTP Response:', otpResponse.data);
    
    if (!otpResponse.data.success && !otpResponse.data.otp) {
      console.log('❌ Failed to send OTP');
      return;
    }
    
    const otp = otpResponse.data.otp;
    console.log(`✅ OTP sent: ${otp}`);
    
    // Step 2: Verify OTP and register
    console.log(`🔐 Verifying OTP and registering user...`);
    const verifyResponse = await axios.post(`${BASE_URL}/api/auth/otp/verify`, {
      phone: account.phone,
      otp: otp,
      type: 'REGISTER',
      userData: account.userData
    });
    
    console.log('Registration Response:', verifyResponse.data);
    
    if (verifyResponse.data.message === 'Registration successful') {
      console.log(`✅ Account created successfully for ${account.name}`);
      console.log(`   📧 User ID: ${verifyResponse.data.user.id}`);
      console.log(`   🏷️  Role: ${verifyResponse.data.user.role}`);
      console.log(`   🔑 Access Token: ${verifyResponse.data.tokens.accessToken.substring(0, 20)}...`);
    } else {
      console.log(`⚠️  Registration response: ${verifyResponse.data.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Error creating account for ${account.name}:`, error.response?.data || error.message);
  }
}

async function testFakeAccounts() {
  try {
    console.log('🧪 Testing fake account creation...');
    console.log('=' .repeat(50));
    
    // Check if server is running
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Server is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('Run: npm run simple');
      return;
    }
    
    // Create fake accounts
    for (const account of fakeAccounts) {
      await createFakeAccount(account);
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Fake account creation test completed!');
    console.log('\n📋 Test Accounts Created:');
    console.log('=' .repeat(50));
    
    for (const account of fakeAccounts) {
      console.log(`\n👤 ${account.name}`);
      console.log(`   📱 Phone: ${account.phone}`);
      console.log(`   🏷️  Role: ${account.role}`);
      console.log(`   🔑 Login: Use phone number for OTP authentication`);
    }
    
    console.log('\n💡 To login with these accounts:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Use the phone numbers above');
    console.log('3. The OTP will be displayed in the backend console');
    console.log('4. Enter the OTP to login');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFakeAccounts();
