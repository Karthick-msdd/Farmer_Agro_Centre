const fs = require('fs');
const FormData = require('form-data');

// Test if we can create a simple test image and test the upload endpoint
async function testUploadAuth() {
  try {
    console.log('Testing upload endpoint authentication...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    // Create form data
    const formData = new FormData();
    formData.append('profilePhoto', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    console.log('Form data created successfully');
    console.log('Test image size:', testImageBuffer.length, 'bytes');
    
    // Test the endpoint without authentication (should fail)
    const response = await fetch('http://localhost:5000/api/user/upload-photo', {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status (no auth):', response.status);
    const responseText = await response.text();
    console.log('Response body (no auth):', responseText);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUploadAuth();
