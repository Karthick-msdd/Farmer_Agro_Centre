import { getMongoDB } from '../utils/mongodb';

export interface User {
  _id?: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'FARMER' | 'AGROCENTER' | 'ADMIN' | 'SUPPLIER';
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  // Farmer specific fields
  farmSize?: number;
  cropTypes?: string[];
  location?: {
    village?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  // Admin specific fields
  adminLevel?: number;
  department?: string;
  designation?: string;
  permissions?: string[];
}

export class UserModel {
  private static collection = 'users';

  static async create(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<User> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    
    const user: User = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    const result = await collection.insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    return await collection.findOne({ email });
  }

  static async findById(id: string): Promise<User | null> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    return await collection.findOne({ _id: id });
  }

  static async update(id: string, updateData: Partial<User>): Promise<User | null> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    
    const result = await collection.findOneAndUpdate(
      { _id: id },
      { 
        $set: { 
          ...updateData, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result;
  }

  static async delete(id: string): Promise<boolean> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    
    const result = await collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  static async getAll(): Promise<User[]> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    return await collection.find({}).toArray();
  }

  static async findByRole(role: User['role']): Promise<User[]> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    return await collection.find({ role }).toArray();
  }

  static async updateLastLogin(id: string): Promise<void> {
    const db = getMongoDB();
    const collection = db.collection<User>(this.collection);
    
    await collection.updateOne(
      { _id: id },
      { 
        $set: { 
          lastLogin: new Date(),
          updatedAt: new Date()
        } 
      }
    );
  }
}
