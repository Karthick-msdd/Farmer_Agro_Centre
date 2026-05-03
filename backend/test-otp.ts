import { OTPService } from './src/services/otpService';
import { connectToRedis } from './src/utils/redis';

// Test script for OTP authentication
async function testOTPAuthentication() {
  try {
    console.log('🧪 Testing OTP Authentication System...\n');
    
    // Connect to Redis
    await connectToRedis();
    console.log('✅ Redis connected successfully\n');
    
    // Test phone number
    const testPhone = '9876543210';
    
    // Test 1: Send OTP
    console.log('📱 Test 1: Sending OTP...');
    const sendResult = await OTPService.sendOTP(testPhone, 'LOGIN');
    console.log('Send Result:', sendResult);
    
    if (!sendResult.success) {
      console.error('❌ Failed to send OTP');
      return;
    }
    
    console.log('✅ OTP sent successfully\n');
    
    // Test 2: Verify OTP (using the OTP from development mode)
    if (sendResult.otp) {
      console.log('🔐 Test 2: Verifying OTP...');
      const verifyResult = await OTPService.verifyOTP(testPhone, sendResult.otp, 'LOGIN');
      console.log('Verify Result:', verifyResult);
      
      if (verifyResult.success) {
        console.log('✅ OTP verified successfully\n');
      } else {
        console.error('❌ Failed to verify OTP');
      }
    }
    
    // Test 3: Test invalid OTP
    console.log('🚫 Test 3: Testing invalid OTP...');
    const invalidResult = await OTPService.verifyOTP(testPhone, '000000', 'LOGIN');
    console.log('Invalid OTP Result:', invalidResult);
    
    if (!invalidResult.success) {
      console.log('✅ Invalid OTP correctly rejected\n');
    }
    
    // Test 4: Test resend OTP
    console.log('🔄 Test 4: Testing resend OTP...');
    const resendResult = await OTPService.resendOTP(testPhone, 'LOGIN');
    console.log('Resend Result:', resendResult);
    
    if (resendResult.success) {
      console.log('✅ OTP resent successfully\n');
    }
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testOTPAuthentication();

