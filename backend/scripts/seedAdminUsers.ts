import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUsers() {
  try {
    console.log('🌱 Creating admin users...');

    // Create Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@agrocenter.com',
        password: await bcrypt.hash('SuperAdmin123!', 12),
        role: 'SUPER_ADMIN',
        isAdmin: true,
        adminLevel: 5,
        isActive: true
      }
    });

    await prisma.adminProfile.create({
      data: {
        userId: superAdmin.id,
        department: 'IT',
        designation: 'Super Administrator',
        permissions: [
          'USER_MANAGEMENT',
          'SYSTEM_SETTINGS',
          'ANALYTICS_READ',
          'ANALYTICS_WRITE',
          'REPORTS_READ',
          'REPORTS_WRITE',
          'AUDIT_LOGS',
          'ADMIN_MANAGEMENT'
        ],
        accessLevel: 5,
        isSuperAdmin: true
      }
    });

    console.log('✅ Super Admin created:', superAdmin.email);

    // Create Agricultural Officer
    const agriOfficer = await prisma.user.create({
      data: {
        name: 'Dr. Rajesh Kumar',
        email: 'agriofficer@agrocenter.com',
        password: await bcrypt.hash('AgriOfficer123!', 12),
        role: 'AGRI_OFFICER',
        isAdmin: true,
        adminLevel: 3,
        isActive: true
      }
    });

    await prisma.adminProfile.create({
      data: {
        userId: agriOfficer.id,
        department: 'Agricultural Services',
        designation: 'Senior Agricultural Officer',
        permissions: [
          'FARMER_MANAGEMENT',
          'CROP_ADVISORY',
          'REPORTS_READ',
          'ANALYTICS_READ'
        ],
        accessLevel: 3,
        isSuperAdmin: false
      }
    });

    console.log('✅ Agricultural Officer created:', agriOfficer.email);

    // Create Market Analyst
    const marketAnalyst = await prisma.user.create({
      data: {
        name: 'Priya Sharma',
        email: 'marketanalyst@agrocenter.com',
        password: await bcrypt.hash('MarketAnalyst123!', 12),
        role: 'MARKET_ANALYST',
        isAdmin: true,
        adminLevel: 2,
        isActive: true
      }
    });

    await prisma.adminProfile.create({
      data: {
        userId: marketAnalyst.id,
        department: 'Market Research',
        designation: 'Market Research Analyst',
        permissions: [
          'MARKET_ANALYSIS',
          'ANALYTICS_READ',
          'ANALYTICS_WRITE',
          'REPORTS_READ',
          'REPORTS_WRITE'
        ],
        accessLevel: 2,
        isSuperAdmin: false
      }
    });

    console.log('✅ Market Analyst created:', marketAnalyst.email);

    // Create Support Staff
    const supportStaff = await prisma.user.create({
      data: {
        name: 'Amit Singh',
        email: 'support@agrocenter.com',
        password: await bcrypt.hash('SupportStaff123!', 12),
        role: 'SUPPORT_STAFF',
        isAdmin: true,
        adminLevel: 1,
        isActive: true
      }
    });

    await prisma.adminProfile.create({
      data: {
        userId: supportStaff.id,
        department: 'Customer Support',
        designation: 'Support Specialist',
        permissions: [
          'CUSTOMER_SUPPORT',
          'ORDER_MANAGEMENT',
          'REPORTS_READ'
        ],
        accessLevel: 1,
        isSuperAdmin: false
      }
    });

    console.log('✅ Support Staff created:', supportStaff.email);

    // Create Regular Admin
    const regularAdmin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@agrocenter.com',
        password: await bcrypt.hash('Admin123!', 12),
        role: 'ADMIN',
        isAdmin: true,
        adminLevel: 4,
        isActive: true
      }
    });

    await prisma.adminProfile.create({
      data: {
        userId: regularAdmin.id,
        department: 'Administration',
        designation: 'System Administrator',
        permissions: [
          'USER_MANAGEMENT',
          'SYSTEM_SETTINGS',
          'ANALYTICS_READ',
          'REPORTS_READ',
          'REPORTS_WRITE',
          'AUDIT_LOGS'
        ],
        accessLevel: 4,
        isSuperAdmin: false
      }
    });

    console.log('✅ Regular Admin created:', regularAdmin.email);

    // Create Karthick Admin
    const karthickAdmin = await prisma.user.create({
      data: {
        name: 'Karthick Admin',
        email: 'karthick1226@gmail.com',
        password: await bcrypt.hash('Karthick2002@', 12),
        role: 'SUPER_ADMIN',
        isAdmin: true,
        adminLevel: 5,
        isActive: true
      }
    });

    await prisma.adminProfile.create({
      data: {
        userId: karthickAdmin.id,
        department: 'IT',
        designation: 'Super Administrator',
        permissions: [
          'USER_MANAGEMENT',
          'SYSTEM_SETTINGS',
          'ANALYTICS_READ',
          'ANALYTICS_WRITE',
          'REPORTS_READ',
          'REPORTS_WRITE',
          'AUDIT_LOGS',
          'ADMIN_MANAGEMENT'
        ],
        accessLevel: 5,
        isSuperAdmin: true
      }
    });

    console.log('✅ Karthick Admin created:', karthickAdmin.email);

    console.log('\n🎉 All admin users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Super Admin: superadmin@agrocenter.com / SuperAdmin123!');
    console.log('Agricultural Officer: agriofficer@agrocenter.com / AgriOfficer123!');
    console.log('Market Analyst: marketanalyst@agrocenter.com / MarketAnalyst123!');
    console.log('Support Staff: support@agrocenter.com / SupportStaff123!');
    console.log('Regular Admin: admin@agrocenter.com / Admin123!');
    console.log('Karthick Admin: karthick1226@gmail.com / Karthick2002@');

  } catch (error) {
    console.error('❌ Error creating admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
createAdminUsers();
