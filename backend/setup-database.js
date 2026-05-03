const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function setupDatabase() {
  let client;
  
  try {
    console.log('🔍 Setting up MongoDB database...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB - farming_agro_center database');
    
    // Create collections with proper indexes
    console.log('\n📁 Creating collections and indexes...');
    
    // Users collection
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ phone: 1 }, { unique: true, sparse: true });
    await usersCollection.createIndex({ role: 1 });
    console.log('   ✅ Users collection with indexes');
    
    // Profiles collection
    const profilesCollection = db.collection('profiles');
    await profilesCollection.createIndex({ userId: 1 }, { unique: true });
    await profilesCollection.createIndex({ location: 1 });
    await profilesCollection.createIndex({ cropTypes: 1 });
    console.log('   ✅ Profiles collection with indexes');
    
    // Queries collection
    const queriesCollection = db.collection('queries');
    await queriesCollection.createIndex({ userId: 1 });
    await queriesCollection.createIndex({ status: 1 });
    await queriesCollection.createIndex({ createdAt: -1 });
    await queriesCollection.createIndex({ cropType: 1 });
    await queriesCollection.createIndex({ urgency: 1 });
    console.log('   ✅ Queries collection with indexes');
    
    // Products collection
    const productsCollection = db.collection('products');
    await productsCollection.createIndex({ title: 'text', description: 'text' });
    await productsCollection.createIndex({ category: 1 });
    await productsCollection.createIndex({ price: 1 });
    await productsCollection.createIndex({ createdAt: -1 });
    console.log('   ✅ Products collection with indexes');
    
    // Orders collection
    const ordersCollection = db.collection('orders');
    await ordersCollection.createIndex({ userId: 1 });
    await ordersCollection.createIndex({ status: 1 });
    await ordersCollection.createIndex({ createdAt: -1 });
    console.log('   ✅ Orders collection with indexes');
    
    // Check if we need to create sample data
    const userCount = await usersCollection.countDocuments();
    
    if (userCount === 0) {
      console.log('\n🌱 Creating comprehensive sample data...');
      
      // Hash password for sample users
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Create sample users
      const sampleUsers = [
        {
          name: 'John Farmer',
          email: 'john@example.com',
          phone: '1234567890',
          password: hashedPassword,
          role: 'FARMER',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Admin User',
          email: 'admin@example.com',
          phone: '0987654321',
          password: hashedPassword,
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Agro Center Manager',
          email: 'agro@example.com',
          phone: '1122334455',
          password: hashedPassword,
          role: 'AGROCENTER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const userResult = await usersCollection.insertMany(sampleUsers);
      console.log(`   ✅ Created ${userResult.insertedCount} sample users`);
      
      // Create sample profiles with binary image structure
      const firstUserId = userResult.insertedIds[0];
      const sampleProfile = {
        userId: firstUserId,
        firstName: 'John',
        lastName: 'Farmer',
        bio: 'Experienced farmer with 10 years of agriculture expertise. Specializing in organic farming and sustainable practices.',
        location: 'California, USA',
        farmSize: 50.5,
        cropTypes: ['Wheat', 'Corn', 'Soybeans', 'Tomatoes'],
        experience: 10,
        phone: '1234567890',
        address: '123 Farm Road, California, USA',
        socialLinks: {
          website: 'https://johnfarm.com',
          twitter: '@johnfarmer',
          linkedin: 'linkedin.com/in/johnfarmer'
        },
        // Profile picture structure (empty for now, will be filled when user uploads)
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const profileResult = await profilesCollection.insertOne(sampleProfile);
      console.log(`   ✅ Created sample profile: ${profileResult.insertedId}`);
      
      // Create sample queries
      const sampleQueries = [
        {
          userId: firstUserId,
          cropType: 'Wheat',
          issueType: 'pest',
          urgency: 'HIGH',
          description: 'My wheat crop is showing signs of pest infestation. Need expert advice on treatment options.',
          location: 'California',
          images: [],
          voiceRecording: null,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: firstUserId,
          cropType: 'Corn',
          issueType: 'disease',
          urgency: 'MEDIUM',
          description: 'Corn leaves are turning yellow. Suspecting nutrient deficiency.',
          location: 'California',
          images: [],
          voiceRecording: null,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const queryResult = await queriesCollection.insertMany(sampleQueries);
      console.log(`   ✅ Created ${queryResult.insertedCount} sample queries`);
      
      // Create sample products
      const sampleProducts = [
        {
          title: 'Organic Wheat Seeds',
          description: 'High-quality organic wheat seeds for sustainable farming',
          price: 25.99,
          unit: 'kg',
          category: 'Seeds',
          images: ['/images/wheat-seeds.jpg'],
          inventory: [{ quantity: 100, location: 'Warehouse A' }],
          rating: 4.5,
          reviews: 23,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          title: 'Natural Fertilizer',
          description: 'Organic fertilizer for healthy crop growth',
          price: 45.50,
          unit: 'bag',
          category: 'Fertilizers',
          images: ['/images/fertilizer.jpg'],
          inventory: [{ quantity: 50, location: 'Warehouse B' }],
          rating: 4.2,
          reviews: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          title: 'Pest Control Spray',
          description: 'Eco-friendly pest control solution',
          price: 32.75,
          unit: 'bottle',
          category: 'Pest Control',
          images: ['/images/pest-spray.jpg'],
          inventory: [{ quantity: 75, location: 'Warehouse A' }],
          rating: 4.7,
          reviews: 31,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const productResult = await productsCollection.insertMany(sampleProducts);
      console.log(`   ✅ Created ${productResult.insertedCount} sample products`);
      
    } else {
      console.log(`\n📊 Database already has ${userCount} users. Skipping sample data creation.`);
    }
    
    // Display final database status
    console.log('\n📊 Final Database Status:');
    console.log(`   👥 Users: ${await usersCollection.countDocuments()}`);
    console.log(`   👤 Profiles: ${await profilesCollection.countDocuments()}`);
    console.log(`   ❓ Queries: ${await queriesCollection.countDocuments()}`);
    console.log(`   📦 Products: ${await productsCollection.countDocuments()}`);
    console.log(`   📋 Orders: ${await ordersCollection.countDocuments()}`);
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Database Structure:');
    console.log('   - users: User accounts with authentication');
    console.log('   - profiles: User profiles with binary image storage');
    console.log('   - queries: Farmer queries and expert replies');
    console.log('   - products: Agricultural products catalog');
    console.log('   - orders: Order management');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

setupDatabase();

