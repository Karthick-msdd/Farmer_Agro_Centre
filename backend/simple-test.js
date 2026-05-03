// Simple test to create fake accounts
const axios = require('axios');

async function testServer() {
  const ports = [5000, 3001, 8000, 8080];
  
  for (const port of ports) {
    try {
      console.log(`Testing port ${port}...`);
      const response = await axios.get(`http://localhost:${port}/health`, { timeout: 2000 });
      console.log(`✅ Server found on port ${port}:`, response.data);
      return port;
    } catch (error) {
      console.log(`❌ Port ${port} not responding`);
    }
  }
  
  return null;
}

async function createFakeAccount(port, account) {
  try {
    console.log(`\n🚀 Creating account for ${account.name} on port ${port}...`);
    
    // Send OTP
    const otpResponse = await axios.post(`http://localhost:${port}/api/auth/otp/send`, {
      phone: account.phone,
      type: 'REGISTER'
    });
    
    console.log('OTP Response:', otpResponse.data);
    
    if (otpResponse.data.otp) {
      console.log(`✅ OTP: ${otpResponse.data.otp}`);
      
      // Verify OTP and register
      const verifyResponse = await axios.post(`http://localhost:${port}/api/auth/otp/verify`, {
        phone: account.phone,
        otp: otpResponse.data.otp,
        type: 'REGISTER',
        userData: account.userData
      });
      
      console.log('Registration Response:', verifyResponse.data);
      return verifyResponse.data;
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error.response?.data || error.message);
  }
}

async function main() {
  console.log('🔍 Looking for running server...');
  
  const port = await testServer();
  
  if (!port) {
    console.log('❌ No server found. Please start the server first.');
    console.log('Run: npm run simple');
    return;
  }
  
  const fakeAccounts = [
    {
      name: 'John Farmer',
      phone: '9876543210',
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
        farmLocation: 'Green Valley Farm'
      }
    },
    {
      name: 'Sarah AgroCenter',
      phone: '9876543211',
      userData: {
        name: 'Sarah AgroCenter',
        role: 'AGROCENTER',
        name: 'Green Valley Agro Center',
        address: 'Main Market, Agricultural District',
        phone: '9876543211',
        email: 'sarah.agro@example.com'
      }
    }
  ];
  
  console.log('\n📝 Creating fake accounts...');
  
  for (const account of fakeAccounts) {
    await createFakeAccount(port, account);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Test completed!');
  console.log('\n📋 Fake Accounts:');
  console.log('👤 John Farmer - Phone: 9876543210 - Role: FARMER');
  console.log('👤 Sarah AgroCenter - Phone: 9876543211 - Role: AGROCENTER');
  console.log('\n💡 To login: Use these phone numbers in the frontend app');
}

main().catch(console.error);
