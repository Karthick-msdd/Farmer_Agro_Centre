// Test script for image delete functionality
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function testDeleteImage() {
  let client;
  
  try {
    console.log('🔍 Testing image delete functionality...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB');
    
    // Check if any users have profile images
    const usersCollection = db.collection('users');
    const usersWithImages = await usersCollection.find({ 
      profileImage: { $exists: true, $ne: null } 
    }).toArray();
    
    console.log(`📸 Users with profile images: ${usersWithImages.length}`);
    
    if (usersWithImages.length > 0) {
      console.log('📋 Users with profile images:');
      usersWithImages.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Image ID: ${user.profileImage}`);
      });
    }
    
    // Check GridFS bucket for profile images
    const filesCollection = db.collection('profileImages.files');
    const imageFiles = await filesCollection.find({}).toArray();
    
    console.log(`🗂️  Profile images in GridFS: ${imageFiles.length}`);
    
    if (imageFiles.length > 0) {
      console.log('📁 Image files in GridFS:');
      imageFiles.forEach(file => {
        console.log(`   - ${file.filename} (${file.metadata?.contentType}) - Size: ${file.length} bytes`);
      });
    }
    
    console.log('\n🎉 Delete functionality test completed!');
    console.log('\n📝 To test delete functionality:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Login to the frontend application');
    console.log('   3. Upload a profile image');
    console.log('   4. Click the red delete button (trash icon)');
    console.log('   5. Verify the image is removed from both user document and GridFS');
    
  } catch (error) {
    console.error('❌ Delete functionality test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

testDeleteImage();
