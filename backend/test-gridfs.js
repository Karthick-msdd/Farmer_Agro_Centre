const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function testGridFS() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('farming_agro_center');
    
    // Initialize GridFS
    const gfs = new GridFSBucket(db, {
      bucketName: 'profile_photos'
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('✅ GridFS initialized');
    
    // Test 1: List all files in GridFS
    console.log('\n📁 Listing files in GridFS...');
    const files = await gfs.find({}).toArray();
    console.log(`Found ${files.length} files in GridFS:`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.filename} (${file.length} bytes) - ${file.uploadDate}`);
    });
    
    // Test 2: Check GridFS collections
    console.log('\n🗂️ Checking GridFS collections...');
    const collections = await db.listCollections().toArray();
    const gridfsCollections = collections.filter(col => 
      col.name.includes('profile_photos') || col.name.includes('fs')
    );
    console.log('GridFS related collections:');
    gridfsCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Test 3: Check if any users have profile photos
    console.log('\n👤 Checking users with profile photos...');
    const users = await db.collection('users').find({ profilePhotoId: { $exists: true } }).toArray();
    console.log(`Found ${users.length} users with profile photos:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (ID: ${user.profilePhotoId})`);
    });
    
    console.log('\n✅ GridFS test completed successfully!');
    
    await client.close();
  } catch (error) {
    console.error('❌ GridFS test failed:', error);
  }
}

testGridFS();
