// Simple MongoDB Connection
const mongoose = require('mongoose');

const connectToMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farming_agro_center';
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = { connectToMongoDB };
