// Test script for image upload functionality
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function testUploadSetup() {
  let client;
  
  try {
    console.log('🔍 Testing upload setup...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB');
    
    // Check if GridFS bucket exists
    const collections = await db.listCollections().toArray();
    const profileImagesExists = collections.some(col => col.name === 'profileImages.files');
    
    if (profileImagesExists) {
      console.log('✅ Profile images GridFS bucket exists');
    } else {
      console.log('ℹ️  Profile images GridFS bucket will be created on first upload');
    }
    
    // Check users collection
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount > 0) {
      const sampleUser = await usersCollection.findOne({});
      console.log('📋 Sample user structure:');
      console.log(`   - ID: ${sampleUser._id}`);
      console.log(`   - Name: ${sampleUser.name}`);
      console.log(`   - Email: ${sampleUser.email}`);
      console.log(`   - Profile Image: ${sampleUser.profileImage || 'None'}`);
    }
    
    console.log('\n🎉 Upload setup test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Test image upload via frontend or API');
    console.log('   3. Check GridFS bucket for uploaded images');
    
  } catch (error) {
    console.error('❌ Upload setup test failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

testUploadSetup();
