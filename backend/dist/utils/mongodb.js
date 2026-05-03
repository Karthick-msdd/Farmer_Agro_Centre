"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeMongoDBConnection = exports.getMongoDB = exports.connectToMongoDB = void 0;
const mongodb_1 = require("mongodb");
let client;
let db;
const connectToMongoDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/farming_agro_center';
        client = new mongodb_1.MongoClient(mongoUri);
        await client.connect();
        db = client.db();
        console.log('✅ Connected to MongoDB successfully');
        await db.admin().ping();
        console.log('✅ MongoDB ping successful');
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
};
exports.connectToMongoDB = connectToMongoDB;
const getMongoDB = () => {
    if (!db) {
        throw new Error('MongoDB not connected. Call connectToMongoDB() first.');
    }
    return db;
};
exports.getMongoDB = getMongoDB;
const closeMongoDBConnection = async () => {
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
};
exports.closeMongoDBConnection = closeMongoDBConnection;
process.on('SIGINT', async () => {
    await (0, exports.closeMongoDBConnection)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await (0, exports.closeMongoDBConnection)();
    process.exit(0);
});
//# sourceMappingURL=mongodb.js.map