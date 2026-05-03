const { MongoClient } = require('mongodb');
require('dotenv').config();

const testConnection = async () => {
  let client;
  
  try {
    console.log('🔄 Testing MongoDB connection...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farming_agro_center';
    console.log('📡 Connecting to:', mongoUri);
    
    client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db();
    console.log('✅ Connected to MongoDB successfully');
    
    // Test the connection
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
    // Test collection access
    const usersCollection = db.collection('users');
    const count = await usersCollection.countDocuments();
    console.log(`📊 Users in database: ${count}`);
    
    console.log('🎉 MongoDB connection test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
};

testConnection()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
