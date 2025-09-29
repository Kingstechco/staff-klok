#!/usr/bin/env node

// This script uses the same connection approach as the backend server
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import the actual models from the compiled backend
async function loadModels() {
  try {
    const User = require('./dist/models/User.js').default;
    const Organization = require('./dist/models/Organization.js').default;
    return { User, Organization };
  } catch (error) {
    console.log('Compiled models not found, using schemas directly');
    return null;
  }
}

async function createTestData() {
  console.log('🚀 Creating test data using backend connection approach...\n');

  try {
    // Use the same connection string as the backend
    await mongoose.connect('mongodb://localhost:27017/oklok', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB using backend approach');

    // Create a test tenant
    const tenantId = new mongoose.Types.ObjectId();
    const testTenant = {
      _id: tenantId,
      name: 'Test Oklok Company',
      subdomain: 'test',
      businessType: 'office',
      isActive: true,
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        workweekStart: 1
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Hash PINs
    const pins = {
      admin: await bcrypt.hash('1234', 12),
      manager: await bcrypt.hash('2345', 12),
      staff: await bcrypt.hash('3456', 12),
      contractor: await bcrypt.hash('4567', 12)
    };

    // Create test users with minimal required fields
    const testUsers = [
      {
        tenantId: tenantId,
        name: 'Admin User',
        email: 'admin@oklok.com',
        pin: pins.admin,
        role: 'admin',
        permissions: ['user_management', 'tenant_settings', 'analytics_access'],
        employmentType: 'full_time',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: { email: true, push: true, clockInReminder: false, timesheetReminder: true, approvalNotification: true },
          dashboard: { showWeekends: false, timeFormat: '12h' }
        }
      },
      {
        tenantId: tenantId,
        name: 'Manager User',
        email: 'manager@oklok.com',
        pin: pins.manager,
        role: 'manager',
        permissions: ['team_management', 'schedule_management', 'team_reports'],
        employmentType: 'full_time',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: { email: true, push: true, clockInReminder: false, timesheetReminder: true, approvalNotification: true },
          dashboard: { showWeekends: false, timeFormat: '12h' }
        }
      },
      {
        tenantId: tenantId,
        name: 'Staff User',
        email: 'staff@oklok.com',
        pin: pins.staff,
        role: 'staff',
        permissions: ['time_tracking', 'view_own_data', 'edit_own_profile'],
        employmentType: 'full_time',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: { email: true, push: true, clockInReminder: true, timesheetReminder: true, approvalNotification: false },
          dashboard: { showWeekends: false, timeFormat: '12h' }
        }
      },
      {
        tenantId: tenantId,
        name: 'Contractor User',
        email: 'contractor@oklok.com',
        pin: pins.contractor,
        role: 'contractor',
        permissions: ['time_tracking', 'project_assignment', 'invoice_generation'],
        employmentType: 'contractor',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        contractorInfo: {
          businessName: 'Tech Solutions Inc',
          contractingAgency: 'Freelance',
          registrationStatus: 'active',
          clients: [],
          specializations: ['Development'],
          availableHours: 40
        },
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: { email: true, push: false, clockInReminder: false, timesheetReminder: true, approvalNotification: true },
          dashboard: { showWeekends: false, timeFormat: '24h' }
        }
      }
    ];

    const db = mongoose.connection.db;

    // Insert tenant
    console.log('📝 Creating tenant...');
    await db.collection('tenants').deleteMany({ name: 'Test Oklok Company' });
    await db.collection('tenants').insertOne(testTenant);
    console.log('✅ Created tenant');

    // Insert users
    console.log('👥 Creating users...');
    await db.collection('users').deleteMany({ tenantId: tenantId });
    await db.collection('users').insertMany(testUsers);
    console.log('✅ Created test users');

    console.log('\n🎉 SUCCESS! Test users created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 PIN: 1234 → Admin User (full access)');
    console.log('🔑 PIN: 2345 → Manager User (team management)');
    console.log('🔑 PIN: 3456 → Staff User (personal dashboard)');
    console.log('🔑 PIN: 4567 → Contractor User (contractor features)');
    console.log('');
    console.log('🌐 Test at: http://localhost:3000/clockin');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'MongoServerError' && error.code === 13) {
      console.log('\n💡 MongoDB requires authentication.');
      console.log('Backend server is running - users might already exist.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestData();