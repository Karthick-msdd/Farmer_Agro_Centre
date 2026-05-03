// Script to create fake accounts for testing
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const fakeAccounts = [
  {
    name: 'John Farmer',
    email: 'john.farmer@example.com',
    phone: '+919876543210',
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
    phone: '+919876543211',
    role: 'AGROCENTER',
    agroCenterData: {
      name: 'Green Valley Agro Center',
      address: 'Main Market, Agricultural District',
      phone: '+919876543211',
      email: 'sarah.agro@example.com',
      licenseNo: 'AGRO-2024-001',
      isActive: true
    }
  }
];

async function createFakeAccounts() {
  try {
    console.log('🚀 Starting to create fake accounts...');

    for (const account of fakeAccounts) {
      console.log(`\n📝 Creating account for ${account.name}...`);

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: account.email },
            { phone: account.phone }
          ]
        }
      });

      if (existingUser) {
        console.log(`⚠️  User ${account.name} already exists, skipping...`);
        continue;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          phone: account.phone,
          role: account.role,
          isActive: true,
          lastLogin: new Date()
        }
      });

      console.log(`✅ User created: ${user.name} (ID: ${user.id})`);

      // Create role-specific profile
      if (account.role === 'FARMER' && account.farmerData) {
        const farmer = await prisma.farmer.create({
          data: {
            userId: user.id,
            ...account.farmerData
          }
        });
        console.log(`✅ Farmer profile created for ${user.name}`);
      }

      if (account.role === 'AGROCENTER' && account.agroCenterData) {
        const agroCenter = await prisma.agroCenter.create({
          data: {
            userId: user.id,
            ...account.agroCenterData
          }
        });
        console.log(`✅ AgroCenter profile created for ${user.name}`);
      }

      // Create a default address
      const address = await prisma.address.create({
        data: {
          userId: user.id,
          type: 'HOME',
          name: account.name,
          phone: account.phone,
          address: account.role === 'FARMER' ? account.farmerData.address : account.agroCenterData.address,
          city: account.role === 'FARMER' ? account.farmerData.district : 'Agricultural District',
          state: account.role === 'FARMER' ? account.farmerData.state : 'Maharashtra',
          pincode: '400001',
          isDefault: true
        }
      });
      console.log(`✅ Default address created for ${user.name}`);
    }

    console.log('\n🎉 All fake accounts created successfully!');
    console.log('\n📋 Account Details:');
    console.log('='.repeat(50));
    
    for (const account of fakeAccounts) {
      console.log(`\n👤 ${account.name}`);
      console.log(`   📧 Email: ${account.email}`);
      console.log(`   📱 Phone: ${account.phone}`);
      console.log(`   🏷️  Role: ${account.role}`);
      console.log(`   🔑 Login: Use phone number for OTP authentication`);
    }

    console.log('\n💡 To login:');
    console.log('1. Go to the frontend application');
    console.log('2. Use the phone numbers above');
    console.log('3. The OTP will be displayed in the backend console');
    console.log('4. Enter the OTP to login');

  } catch (error) {
    console.error('❌ Error creating fake accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createFakeAccounts();
