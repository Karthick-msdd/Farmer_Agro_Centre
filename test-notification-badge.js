const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function testNotificationBadge() {
  let client;
  
  try {
    console.log('🔍 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB - farming_agro_center database');
    
    // Check queries collection
    const queriesCollection = db.collection('queries');
    const queryCount = await queriesCollection.countDocuments();
    console.log(`\n❓ Found ${queryCount} queries in database`);
    
    if (queryCount > 0) {
      const queries = await queriesCollection.find({}).toArray();
      console.log('\n📋 Query details:');
      queries.forEach((query, index) => {
        console.log(`\n${index + 1}. Query ID: ${query._id}`);
        console.log(`   Subject: ${query.subject}`);
        console.log(`   Status: ${query.status}`);
        console.log(`   Messages: ${query.messages ? query.messages.length : 0}`);
        if (query.messages && query.messages.length > 0) {
          query.messages.forEach((msg, msgIndex) => {
            console.log(`     Message ${msgIndex + 1}: ${msg.senderType} - "${msg.message}"`);
          });
        }
      });
    } else {
      console.log('No queries found. Creating a test query...');
      
      // Create a test query with messages
      const testQuery = {
        subject: 'Test Query for Notifications',
        message: 'This is a test query to check notification badges',
        category: 'general',
        status: 'open',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [
          {
            senderId: 'test-user-id',
            senderType: 'user',
            message: 'Hello, I need help with my crops',
            timestamp: new Date().toISOString()
          },
          {
            senderId: 'admin-id',
            senderType: 'admin',
            message: 'Hello! I can help you with your crops. What specific issue are you facing?',
            timestamp: new Date().toISOString()
          }
        ]
      };
      
      const result = await queriesCollection.insertOne(testQuery);
      console.log(`✅ Created test query with ID: ${result.insertedId}`);
    }
    
    console.log('\n🎯 Notification Badge Logic Test:');
    console.log('   - User should see badge when admin replies (admin messages exist)');
    console.log('   - Admin should see badge when user sends messages (user messages exist)');
    console.log('   - Badge should appear on navigation tabs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

testNotificationBadge();
