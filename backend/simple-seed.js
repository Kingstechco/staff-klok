#!/usr/bin/env node

// Simple seed script that creates minimal valid documents
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oklok';

async function seedSimpleData() {
  console.log('🌱 Seeding simple test data...\n');

  try {
    // Connect without authentication requirements
    await mongoose.connect(MONGODB_URI, {
      authSource: 'admin',
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Create a simple tenant/organization
    const tenantId = new mongoose.Types.ObjectId();
    const simpleTenant = {
      _id: tenantId,
      name: 'Test Company',
      subdomain: 'test',
      businessType: 'office',
      isActive: true,
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Simple user documents that match the minimal schema requirements
    const simpleUsers = [
      {
        tenantId: tenantId,
        name: 'Admin User',
        email: 'admin@test.com',
        pin: await bcrypt.hash('1234', 12),
        role: 'admin',
        permissions: [],
        employmentType: 'full_time',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            clockInReminder: false,
            timesheetReminder: true,
            approvalNotification: true
          },
          dashboard: {
            showWeekends: false,
            timeFormat: '12h'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: tenantId,
        name: 'Manager User',
        email: 'manager@test.com',
        pin: await bcrypt.hash('2345', 12),
        role: 'manager',
        permissions: [],
        employmentType: 'full_time',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            clockInReminder: false,
            timesheetReminder: true,
            approvalNotification: true
          },
          dashboard: {
            showWeekends: false,
            timeFormat: '12h'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tenantId: tenantId,
        name: 'Staff User',
        email: 'staff@test.com',
        pin: await bcrypt.hash('3456', 12),
        role: 'staff',
        permissions: [],
        employmentType: 'full_time',
        employmentStatus: 'active',
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            clockInReminder: true,
            timesheetReminder: true,
            approvalNotification: false
          },
          dashboard: {
            showWeekends: false,
            timeFormat: '12h'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Try to insert data
    console.log('📝 Creating tenant...');
    await db.collection('tenants').deleteMany({ name: 'Test Company' });
    await db.collection('tenants').insertOne(simpleTenant);
    console.log('✅ Created test tenant');

    console.log('👤 Creating users...');
    await db.collection('users').deleteMany({ tenantId: tenantId });
    const userResult = await db.collection('users').insertMany(simpleUsers);
    console.log(`✅ Created ${userResult.insertedCount} test users`);

    console.log('\n🎯 Test Users Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    simpleUsers.forEach(user => {
      const pin = user.name.includes('Admin') ? '1234' : 
                  user.name.includes('Manager') ? '2345' : '3456';
      console.log(`👤 ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 PIN: ${pin}`);
      console.log(`   👥 Role: ${user.role}`);
      console.log('');
    });

    console.log('🚀 Ready to test! Try logging in with PINs: 1234, 2345, or 3456');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    if (error.name === 'MongoServerError' && error.code === 13) {
      console.log('\n💡 MongoDB authentication is required.');
      console.log('The backend server is running, so test data may already exist.');
      console.log('Try the web interface or API endpoints directly.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedSimpleData();