"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongodb_1 = require("../utils/mongodb");
class UserModel {
    static async create(userData) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        const user = {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };
        const result = await collection.insertOne(user);
        return { ...user, _id: result.insertedId.toString() };
    }
    static async findByEmail(email) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        return await collection.findOne({ email });
    }
    static async findById(id) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        return await collection.findOne({ _id: id });
    }
    static async update(id, updateData) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        const result = await collection.findOneAndUpdate({ _id: id }, {
            $set: {
                ...updateData,
                updatedAt: new Date()
            }
        }, { returnDocument: 'after' });
        return result;
    }
    static async delete(id) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        const result = await collection.deleteOne({ _id: id });
        return result.deletedCount > 0;
    }
    static async getAll() {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        return await collection.find({}).toArray();
    }
    static async findByRole(role) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        return await collection.find({ role }).toArray();
    }
    static async updateLastLogin(id) {
        const db = (0, mongodb_1.getMongoDB)();
        const collection = db.collection(this.collection);
        await collection.updateOne({ _id: id }, {
            $set: {
                lastLogin: new Date(),
                updatedAt: new Date()
            }
        });
    }
}
exports.UserModel = UserModel;
UserModel.collection = 'users';
//# sourceMappingURL=User.js.map