#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oklok';

async function checkTestSetup() {
  console.log('🔍 Checking Oklok test setup...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Try to check existing users
    try {
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      const orgCount = await mongoose.connection.db.collection('organizations').countDocuments();
      
      console.log(`📊 Found ${userCount} users and ${orgCount} organizations in database`);
      
      if (userCount > 0) {
        // Try to get some user info (without sensitive data)
        const users = await mongoose.connection.db.collection('users').find({}, {
          projection: { name: 1, role: 1, department: 1, isActive: 1 }
        }).limit(10).toArray();
        
        console.log('\n👥 Existing users:');
        users.forEach(user => {
          console.log(`   - ${user.name} (${user.role}) - ${user.isActive ? 'Active' : 'Inactive'}`);
        });
      }

      if (orgCount > 0) {
        const orgs = await mongoose.connection.db.collection('organizations').find({}, {
          projection: { legalName: 1, status: 1, isActive: 1 }
        }).limit(5).toArray();
        
        console.log('\n🏢 Existing organizations:');
        orgs.forEach(org => {
          console.log(`   - ${org.legalName} (${org.status}) - ${org.isActive ? 'Active' : 'Inactive'}`);
        });
      }

      if (userCount === 0 && orgCount === 0) {
        console.log('\n⚠️ No test data found. Database appears to be empty.');
        console.log('\n🔧 To create test users, you have several options:');
        console.log('1. Use MongoDB Compass or similar tool to directly insert test data');
        console.log('2. Temporarily disable MongoDB authentication');
        console.log('3. Configure proper MongoDB credentials');
        console.log('4. Use the application\'s admin interface to create users');
      } else {
        console.log('\n✅ Test data exists! You can test the application.');
      }

    } catch (error) {
      if (error.name === 'MongoServerError' && error.code === 13) {
        console.log('⚠️ Database requires authentication - cannot check existing data');
        console.log('\n💡 However, the backend server is running, so you can:');
      } else {
        console.log('⚠️ Error checking database:', error.message);
      }
    }

    console.log('\n🎯 Testing Instructions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Backend API: http://localhost:3001');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('📋 Health Check: http://localhost:3001/health');
    console.log('');
    console.log('🔑 If you have test users with these PINs, try:');
    console.log('   - 1234 (Admin) - Full dashboard access');
    console.log('   - 2345 (Manager) - Team management');
    console.log('   - 3456 (Staff) - Personal dashboard');
    console.log('   - 4567 (Contractor) - Contractor features');
    console.log('');
    console.log('🚀 Quick test: curl -X POST http://localhost:3001/api/auth/quick-login \\');
    console.log('             -H "Content-Type: application/json" -d \'{"pin":"1234"}\'');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkTestSetup();