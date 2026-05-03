const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function checkDatabase() {
  let client;
  
  try {
    console.log('🔍 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB - farming_agro_center database');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    if (collections.length === 0) {
      console.log('   No collections found');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Check users collection
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`\n👥 Users collection: ${userCount} documents`);
    
    if (userCount > 0) {
      const users = await usersCollection.find({}).limit(3).toArray();
      console.log('   Sample users:');
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }
    
    // Check profiles collection
    const profilesCollection = db.collection('profiles');
    const profileCount = await profilesCollection.countDocuments();
    console.log(`\n👤 Profiles collection: ${profileCount} documents`);
    
    // Check queries collection
    const queriesCollection = db.collection('queries');
    const queryCount = await queriesCollection.countDocuments();
    console.log(`\n❓ Queries collection: ${queryCount} documents`);
    
    // Create sample data if database is empty
    if (userCount === 0) {
      console.log('\n🌱 Creating sample data...');
      
      // Create sample users
      const sampleUsers = [
        {
          name: 'John Farmer',
          email: 'john@example.com',
          phone: '1234567890',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          role: 'FARMER',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Admin User',
          email: 'admin@example.com',
          phone: '0987654321',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const userResult = await usersCollection.insertMany(sampleUsers);
      console.log(`   ✅ Created ${userResult.insertedCount} sample users`);
      
      // Create sample profile for first user
      const firstUserId = userResult.insertedIds[0];
      const sampleProfile = {
        userId: firstUserId,
        firstName: 'John',
        lastName: 'Farmer',
        bio: 'Experienced farmer with 10 years of agriculture expertise',
        location: 'California, USA',
        farmSize: 50.5,
        cropTypes: ['Wheat', 'Corn', 'Soybeans'],
        experience: 10,
        phone: '1234567890',
        address: '123 Farm Road, California',
        socialLinks: {
          website: 'https://johnfarm.com',
          twitter: '@johnfarmer'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const profileResult = await profilesCollection.insertOne(sampleProfile);
      console.log(`   ✅ Created sample profile: ${profileResult.insertedId}`);
      
      // Create sample query
      const sampleQuery = {
        userId: firstUserId,
        cropType: 'Wheat',
        issueType: 'pest',
        urgency: 'HIGH',
        description: 'My wheat crop is showing signs of pest infestation. Need expert advice on treatment.',
        location: 'California',
        images: [],
        voiceRecording: null,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const queryResult = await queriesCollection.insertOne(sampleQuery);
      console.log(`   ✅ Created sample query: ${queryResult.insertedId}`);
    }
    
    console.log('\n🎉 Database check completed successfully!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

checkDatabase();

