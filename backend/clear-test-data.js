const { MongoClient } = require('mongodb');

async function clearTestData() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('farming_agro_center');
    
    // Clear users collection
    const usersResult = await db.collection('users').deleteMany({});
    console.log(`✅ Deleted ${usersResult.deletedCount} users from users collection`);
    
    // Clear farmers collection
    const farmersResult = await db.collection('farmers').deleteMany({});
    console.log(`✅ Deleted ${farmersResult.deletedCount} farmers from farmers collection`);
    
    // Clear any other test collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Clear test collection if it exists
    const testResult = await db.collection('test').deleteMany({});
    if (testResult.deletedCount > 0) {
      console.log(`✅ Deleted ${testResult.deletedCount} test documents`);
    }
    
    console.log('🎉 All test data cleared successfully!');
    console.log('Database is now clean and ready for real users.');
    
  } catch (error) {
    console.error('Error clearing test data:', error);
  } finally {
    await client.close();
  }
}

clearTestData();
