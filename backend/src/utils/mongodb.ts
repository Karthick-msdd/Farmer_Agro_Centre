import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export const connectToMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/farming_agro_center';
    
    client = new MongoClient(mongoUri);
    await client.connect();
    
    db = client.db();
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Test the connection
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

export const getMongoDB = (): Db => {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectToMongoDB() first.');
  }
  return db;
};

export const closeMongoDBConnection = async (): Promise<void> => {
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeMongoDBConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongoDBConnection();
  process.exit(0);
});
