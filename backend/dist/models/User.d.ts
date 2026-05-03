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
    farmSize?: number;
    cropTypes?: string[];
    location?: {
        village?: string;
        district?: string;
        state?: string;
        pincode?: string;
    };
    adminLevel?: number;
    department?: string;
    designation?: string;
    permissions?: string[];
}
export declare class UserModel {
    private static collection;
    static create(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<User>;
    static findByEmail(email: string): Promise<User | null>;
    static findById(id: string): Promise<User | null>;
    static update(id: string, updateData: Partial<User>): Promise<User | null>;
    static delete(id: string): Promise<boolean>;
    static getAll(): Promise<User[]>;
    static findByRole(role: User['role']): Promise<User[]>;
    static updateLastLogin(id: string): Promise<void>;
}
//# sourceMappingURL=User.d.ts.map