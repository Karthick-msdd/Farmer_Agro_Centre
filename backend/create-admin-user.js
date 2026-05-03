const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/farming_agro_center";

async function createAdminUser() {
  let client;
  
  try {
    console.log('🔍 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('farming_agro_center');
    console.log('✅ Connected to MongoDB');
    
    const usersCollection = db.collection('users');
    
    // Check if admin user already exists
    const existingUser = await usersCollection.findOne({ email: 'm.suman2205@gmail.com' });
    
    if (existingUser) {
      console.log('👤 Admin user already exists, updating role...');
      
      // Update existing user to admin role
      await usersCollection.updateOne(
        { email: 'm.suman2205@gmail.com' },
        { 
          $set: { 
            role: 'ADMIN',
            isAdmin: true,
            adminLevel: 5,
            password: await bcrypt.hash('admin123', 12),
            updatedAt: new Date()
          }
        }
      );
      
      console.log('✅ Updated existing user to admin role');
    } else {
      console.log('👤 Creating new admin user...');
      
      // Create new admin user
      const adminUser = {
        name: 'Admin User',
        email: 'm.suman2205@gmail.com',
        password: await bcrypt.hash('admin123', 12),
        role: 'ADMIN',
        isActive: true,
        isAdmin: true,
        adminLevel: 5,
        permissions: ['all'],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await usersCollection.insertOne(adminUser);
      console.log('✅ Created new admin user:', result.insertedId);
    }
    
    // Verify the admin user
    const adminUser = await usersCollection.findOne({ email: 'm.suman2205@gmail.com' });
    console.log('\n📋 Admin User Details:');
    console.log('   Email:', adminUser.email);
    console.log('   Name:', adminUser.name);
    console.log('   Role:', adminUser.role);
    console.log('   Admin Level:', adminUser.adminLevel);
    console.log('   Is Admin:', adminUser.isAdmin);
    console.log('   Created At:', adminUser.createdAt);
    
    console.log('\n🎉 Admin user setup completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Email: m.suman2205@gmail.com');
    console.log('   Password: admin123');
    console.log('   Role: ADMIN');
    
  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

createAdminUser();
