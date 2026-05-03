const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testRegistration() {
  console.log('🧪 Testing Registration Flow...');
  
  const testUser = {
    name: 'Test Farmer',
    email: 'test@example.com',
    phone: '9876543210',
    password: 'testpassword123',
    role: 'FARMER',
    age: 35,
    gender: 'Male',
    address: 'Test Address',
    village: 'Test Village',
    district: 'Test District',
    state: 'Test State',
    farmSize: 5.5,
    farmLocation: 'Test Farm Location'
  };

  try {
    let accessToken;
    let refreshToken;

    // Test Registration
    console.log('1. Testing user registration...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
    
    if (registerResponse.status === 201) {
      console.log('✅ Registration successful');
      console.log('User created:', registerResponse.data.user);
      accessToken = registerResponse.data.tokens.accessToken;
      refreshToken = registerResponse.data.tokens.refreshToken;
      console.log('Tokens received:', !!accessToken && !!refreshToken);
    } else {
      console.log('❌ Registration failed with status:', registerResponse.status);
      return;
    }

    // Test Login
    console.log('2. Testing user login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (loginResponse.status === 200) {
      console.log('✅ Login successful');
      console.log('User logged in:', loginResponse.data.user);
      console.log('Login tokens valid:', !!loginResponse.data.tokens.accessToken);
    } else {
      console.log('❌ Login failed with status:', loginResponse.status);
    }

    // Test Protected Route
    console.log('3. Testing protected route (GET /auth/me)...');
    const profileResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (profileResponse.status === 200) {
      console.log('✅ Protected route accessible');
      console.log('Profile data received:', !!profileResponse.data.user);
    } else {
      console.log('❌ Protected route failed with status:', profileResponse.status);
    }

    console.log('🎉 All auth tests completed!');

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Connection Error:', error.message);
    }
  }
}

// Test server health first
async function testServerHealth() {
  console.log('🏥 Testing Server Health...');
  try {
    const healthResponse = await axios.get(`${API_BASE}/health`);
    if (healthResponse.status === 200) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running on localhost:5000');
    console.log('Please start the server with: node working-auth-server.js');
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Authentication Flow Tests');
  console.log();
  
  const serverHealthy = await testServerHealth();
  
  if (serverHealthy) {
    console.log();
    await testRegistration();
  }
  
  console.log();
  console.log('✨ Test Suite Complete');
}

runTests();
