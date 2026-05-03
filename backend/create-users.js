// Create users directly in database
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: { type: String, unique: true },
  password: { type: String },
  role: { type: String, default: 'FARMER' },
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Farmer Schema
const farmerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age: { type: Number },
  gender: { type: String },
  address: { type: String },
  village: { type: String },
  district: { type: String },
  state: { type: String },
  farmSize: { type: Number },
  farmLocation: { type: String },
  farmLatitude: { type: Number },
  farmLongitude: { type: Number },
  cropTypes: { type: String },
  preferredLanguage: { type: String, default: 'English' },
  soilType: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Farmer = mongoose.model('Farmer', farmerSchema);

// AgroCenter Schema
const agroCenterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  licenseNo: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AgroCenter = mongoose.model('AgroCenter', agroCenterSchema);

async function createUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/farming_agro_center';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional)
    await User.deleteMany({});
    await Farmer.deleteMany({});
    await AgroCenter.deleteMany({});
    console.log('🧹 Cleared existing users');

    // Create users
    const users = [
      {
        name: 'John Farmer',
        email: 'john.farmer@example.com',
        phone: '9876543210',
        password: 'farmer123',
        role: 'FARMER',
        farmerData: {
          age: 35,
          gender: 'Male',
          address: 'Village Road, Block A',
          village: 'Green Valley',
          district: 'Agricultural District',
          state: 'Maharashtra',
          farmSize: 5.5,
          farmLocation: 'Green Valley Farm',
          farmLatitude: 19.0760,
          farmLongitude: 72.8777,
          cropTypes: '["Wheat", "Rice", "Cotton"]',
          preferredLanguage: 'English',
          soilType: 'Black Soil'
        }
      },
      {
        name: 'Sarah AgroCenter',
        email: 'sarah.agro@example.com',
        phone: '9876543211',
        password: 'agro123',
        role: 'AGROCENTER',
        agroCenterData: {
          name: 'Green Valley Agro Center',
          address: 'Main Market, Agricultural District',
          phone: '9876543211',
          email: 'sarah.agro@example.com',
          licenseNo: 'AGRO-2024-001',
          isActive: true
        }
      }
    ];

    console.log('\n🚀 Creating users...');

    for (const userData of users) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = new User({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        role: userData.role,
        isActive: true,
        lastLogin: new Date()
      });

      const savedUser = await user.save();
      console.log(`✅ User created: ${savedUser.name} (ID: ${savedUser._id})`);

      // Create role-specific profile
      if (userData.role === 'FARMER' && userData.farmerData) {
        const farmer = new Farmer({
          userId: savedUser._id,
          ...userData.farmerData
        });
        await farmer.save();
        console.log(`✅ Farmer profile created for ${savedUser.name}`);
      }

      if (userData.role === 'AGROCENTER' && userData.agroCenterData) {
        const agroCenter = new AgroCenter({
          userId: savedUser._id,
          ...userData.agroCenterData
        });
        await agroCenter.save();
        console.log(`✅ AgroCenter profile created for ${savedUser.name}`);
      }
    }

    console.log('\n🎉 Users created successfully!');
    console.log('\n📋 User Credentials:');
    console.log('='.repeat(60));
    
    console.log('\n👤 User 1 - John Farmer');
    console.log('   📧 Email: john.farmer@example.com');
    console.log('   📱 Phone: 9876543210');
    console.log('   🔑 Password: farmer123');
    console.log('   🏷️  Role: FARMER');
    
    console.log('\n👤 User 2 - Sarah AgroCenter');
    console.log('   📧 Email: sarah.agro@example.com');
    console.log('   📱 Phone: 9876543211');
    console.log('   🔑 Password: agro123');
    console.log('   🏷️  Role: AGROCENTER');

    console.log('\n💡 Login Instructions:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Use either email/password or phone number');
    console.log('3. For OTP login, use the phone numbers above');
    console.log('4. The OTP will be displayed in backend console');

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createUsers();
