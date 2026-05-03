require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createDefaultUsers() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not defined in .env file');
        process.exit(1);
    }

    const client = new MongoClient(mongoUri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db();
        const usersCollection = db.collection('users');
        
        // Delete existing users if any
        await usersCollection.deleteMany({});
        console.log('Cleared existing users');
        
        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 12);
        const adminUser = {
            name: 'Admin User',
            email: 'admin@example.com',
            password: adminPassword,
            role: 'admin',
            isActive: true,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Create regular user
        const userPassword = await bcrypt.hash('user123', 12);
        const regularUser = {
            name: 'Regular User',
            email: 'user@example.com',
            password: userPassword,
            role: 'user',
            isActive: true,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Insert users
        const result = await usersCollection.insertMany([adminUser, regularUser]);
        console.log('Created default users:');
        console.log(`- Admin: admin@example.com / admin123`);
        console.log(`- User: user@example.com / user123`);
        
    } catch (error) {
        console.error('Error creating default users:', error);
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

createDefaultUsers();
