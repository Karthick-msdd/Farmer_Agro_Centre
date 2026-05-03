const { MongoClient } = require('mongodb');
require('dotenv').config();

const clearAllUsers = async () => {
  let client;
  
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farming_agro_center';
    client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db();
    console.log('✅ Connected to MongoDB successfully');
    
    // Get the users collection
    const usersCollection = db.collection('users');
    
    // Count users before deletion
    const userCount = await usersCollection.countDocuments();
    console.log(`📊 Found ${userCount} users in the database`);
    
    if (userCount === 0) {
      console.log('ℹ️  No users found in the database');
      return;
    }
    
    // Delete all users
    const result = await usersCollection.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} users from the database`);
    
    // Verify deletion
    const remainingCount = await usersCollection.countDocuments();
    console.log(`✅ Verification: ${remainingCount} users remaining in the database`);
    
    if (remainingCount === 0) {
      console.log('🎉 All users have been successfully removed from the database');
    } else {
      console.log('⚠️  Some users may still remain in the database');
    }
    
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
};

// Run the script
clearAllUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
