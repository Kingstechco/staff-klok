#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

// Import the actual models
const User = require('./dist/models/User').default;
const Organization = require('./dist/models/Organization').default;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oklok';

async function createTestUsers() {
  console.log('🔧 Creating test users for Oklok dashboard testing...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create test organization first
    const testOrgId = new mongoose.Types.ObjectId();
    const creatorId = new mongoose.Types.ObjectId();
    
    const testOrg = {
      _id: testOrgId,
      legalName: 'Test Oklok Company',
      organizationType: 'corporation',
      industryCode: 'TECH',
      industryDescription: 'Technology Services',
      registrationNumber: 'TEST-REG-123456',
      businessAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'United States',
        isVerified: false
      },
      phone: '+1-555-123-4567',
      email: 'admin@testorg.com',
      beneficialOwners: [],
      authorizedSignatories: [],
      subsidiaries: [],
      financialInfo: {
        estimatedAnnualRevenue: 1000000,
        numberOfEmployees: 10,
        payrollFrequency: 'bi_weekly',
        currency: 'USD',
        bankAccount: {
          accountHolderName: 'Test Oklok Company',
          bankName: 'Test Bank',
          accountNumber: 'encrypted_account_123',
          routingNumber: 'encrypted_routing_456',
          verified: false
        },
        taxInformation: {
          taxId: 'encrypted_tax_789',
          taxIdType: 'ein',
          taxJurisdiction: 'United States',
          taxExempt: false
        }
      },
      documents: [],
      complianceChecks: [],
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: {
          industryRisk: 3,
          geographicRisk: 2,
          ownershipRisk: 2,
          transactionRisk: 3,
          complianceRisk: 2
        },
        calculatedAt: new Date(),
        reviewRequiredAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      status: 'approved',
      verificationLevel: 'basic',
      verificationStartedAt: new Date(),
      verificationCompletedAt: new Date(),
      requiredDocuments: [],
      submittedDocuments: [],
      verifiedDocuments: [],
      subscriptionPlan: 'professional',
      billingCycle: 'monthly',
      maxEmployees: 100,
      maxContractors: 20,
      features: ['time_tracking', 'reporting', 'multi_tenant'],
      timezone: 'America/New_York',
      locale: 'en-US',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      workweekStart: 1,
      twoFactorRequired: false,
      ipWhitelist: [],
      ssoEnabled: false,
      dataRetentionPolicy: 7,
      suspiciousActivityFlags: [],
      isActive: true,
      isSuspended: false,
      createdBy: creatorId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Try to clear and create organization
    try {
      await mongoose.connection.db.collection('organizations').deleteMany({});
      await mongoose.connection.db.collection('organizations').insertOne(testOrg);
      console.log('✅ Created test organization');
    } catch (error) {
      console.log('⚠️ Organization creation failed, continuing with existing:', error.message);
    }

    // Create test users
    const testUsers = [
      {
        tenantId: testOrgId,
        name: 'Admin User',
        email: 'admin@oklok.com',
        pin: '1234',
        role: 'admin',
        permissions: ['user_management', 'tenant_settings', 'billing_management', 'analytics_access'],
        department: 'Management',
        position: 'System Administrator',
        employmentType: 'full_time',
        employmentStatus: 'active',
        hireDate: new Date(),
        hourlyRate: 75,
        overtimeRate: 1.5,
        currency: 'USD',
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
        tenantId: testOrgId,
        name: 'Manager User',
        email: 'manager@oklok.com',
        pin: '2345',
        role: 'manager',
        permissions: ['team_management', 'schedule_management', 'approval_workflows', 'team_reports'],
        department: 'Operations',
        position: 'Operations Manager',
        employmentType: 'full_time',
        employmentStatus: 'active',
        hireDate: new Date(),
        hourlyRate: 65,
        overtimeRate: 1.5,
        currency: 'USD',
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
        tenantId: testOrgId,
        name: 'Staff User',
        email: 'staff@oklok.com',
        pin: '3456',
        role: 'staff',
        permissions: ['time_tracking', 'view_own_data', 'edit_own_profile', 'view_schedule'],
        department: 'General',
        position: 'Staff Member',
        employmentType: 'full_time',
        employmentStatus: 'active',
        hireDate: new Date(),
        hourlyRate: 25,
        overtimeRate: 1.5,
        currency: 'USD',
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
      },
      {
        tenantId: testOrgId,
        name: 'Contractor User',
        email: 'contractor@oklok.com',
        pin: '4567',
        role: 'contractor',
        permissions: ['time_tracking', 'project_assignment', 'invoice_generation', 'client_interaction'],
        department: 'External',
        position: 'Independent Contractor',
        employmentType: 'contractor',
        employmentStatus: 'active',
        hireDate: new Date(),
        hourlyRate: 85,
        overtimeRate: 1.0, // Contractors typically don't get overtime
        currency: 'USD',
        contractorInfo: {
          businessName: 'Tech Solutions Inc',
          contractingAgency: 'Freelance Platform',
          registrationStatus: 'active',
          clients: [],
          specializations: ['Software Development', 'System Integration'],
          availableHours: 40,
          autoClocking: {
            enabled: false,
            processingMode: 'reactive',
            workSchedule: {
              startTime: '09:00',
              endTime: '17:00',
              workDays: [1, 2, 3, 4, 5],
              hoursPerDay: 8,
              timezone: 'America/New_York'
            },
            requiresApproval: true,
            exceptionNotificationMethod: 'email'
          }
        },
        isActive: true,
        loginAttempts: 0,
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          notifications: {
            email: true,
            push: false,
            clockInReminder: false,
            timesheetReminder: true,
            approvalNotification: true
          },
          dashboard: {
            showWeekends: false,
            timeFormat: '24h'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Try to clear existing users (skip if authentication required)
    try {
      await mongoose.connection.db.collection('users').deleteMany({ tenantId: testOrgId });
      console.log('🗑️ Cleared existing test users');
    } catch (error) {
      console.log('⚠️ Skipping user cleanup (no auth permissions)');
    }

    // Insert test users
    const result = await mongoose.connection.db.collection('users').insertMany(testUsers);
    console.log(`✅ Created ${result.insertedCount} test users:`);
    
    testUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.role}) - PIN: ${user.pin}`);
    });

    console.log('\n🎯 Manual Testing Instructions:');
    console.log('1. Go to: http://localhost:3000/clockin');
    console.log('2. Enter one of these PINs:');
    console.log('   - 1234 (Admin) - Full dashboard access');
    console.log('   - 2345 (Manager) - Team management dashboard'); 
    console.log('   - 3456 (Staff) - Personal dashboard only');
    console.log('   - 4567 (Contractor) - Contractor features');
    console.log('3. After login, click "Dashboard" to see role-based views');
    console.log('\n✨ Enhanced features to test:');
    console.log('   ✅ Role-based dashboard (admin vs staff views)');
    console.log('   ✅ PIN authentication required');
    console.log('   ✅ Multi-tenant organization support');
    console.log('   ✅ Modern UI with Inter fonts');
    console.log('   ✅ Clock-out confirmation dialog');
    console.log('   ✅ Oklok branding throughout');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    if (error.name === 'MongoServerError' && error.code === 13) {
      console.log('\n💡 MongoDB requires authentication. Please:');
      console.log('1. Start MongoDB without authentication, or');
      console.log('2. Configure authentication credentials in .env file');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createTestUsers();