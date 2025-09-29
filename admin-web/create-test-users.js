#!/usr/bin/env node

const fetch = require('node-fetch');
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/oklok';

async function createTestUsers() {
  console.log('🔧 Creating test users for Oklok dashboard testing...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional)
    await mongoose.connection.db.collection('users').deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Create test users
    const testUsers = [
      {
        name: 'Admin User',
        email: 'admin@oklok.com',
        pin: '1234',
        role: 'admin',
        department: 'Management',
        isActive: true,
        tenantId: 'test-tenant-123'
      },
      {
        name: 'Manager User', 
        email: 'manager@oklok.com',
        pin: '2345',
        role: 'manager',
        department: 'Operations',
        isActive: true,
        tenantId: 'test-tenant-123'
      },
      {
        name: 'Staff User',
        email: 'staff@oklok.com', 
        pin: '3456',
        role: 'staff',
        department: 'Floor',
        isActive: true,
        tenantId: 'test-tenant-123'
      },
      {
        name: 'Contractor User',
        email: 'contractor@oklok.com',
        pin: '4567', 
        role: 'contractor',
        department: 'External',
        contractorInfo: {
          registrationStatus: 'approved',
          contractingAgency: 'Tech Solutions Inc'
        },
        isActive: true,
        tenantId: 'test-tenant-123'
      }
    ];

    // Insert test users
    const result = await mongoose.connection.db.collection('users').insertMany(testUsers);
    console.log(`✅ Created ${result.insertedCount} test users:`);
    
    testUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.role}) - PIN: ${user.pin}`);
    });

    // Create test organization
    const testOrganization = {
      name: 'Test Oklok Company',
      subdomain: 'test',
      businessType: 'office',
      isActive: true,
      _id: 'test-tenant-123'
    };

    await mongoose.connection.db.collection('organizations').deleteMany({});
    await mongoose.connection.db.collection('organizations').insertOne(testOrganization);
    console.log('✅ Created test organization');

    console.log('\n🎯 Manual Testing Instructions:');
    console.log('1. Go to: http://localhost:3000/clockin');
    console.log('2. Enter one of these PINs:');
    console.log('   - 1234 (Admin) - Will see organization dashboard');
    console.log('   - 2345 (Manager) - Will see organization dashboard'); 
    console.log('   - 3456 (Staff) - Will see personal dashboard only');
    console.log('   - 4567 (Contractor) - Will see contractor features');
    console.log('3. After login, click "Dashboard" to see role-based views');
    console.log('\n✨ Enhanced features to test:');
    console.log('   ✅ Role-based dashboard (admin vs staff views)');
    console.log('   ✅ PIN authentication required');
    console.log('   ✅ Modern UI with Inter fonts and glassmorphism');
    console.log('   ✅ Clock-out confirmation dialog');
    console.log('   ✅ Oklok branding throughout');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createTestUsers();