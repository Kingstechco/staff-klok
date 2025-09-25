/**
 * Migration Script: Single-Tenant to Multi-Tenant Conversion
 * 
 * This script converts existing single-tenant data to the new multi-tenant architecture.
 * It creates a default tenant for existing data and updates all records with tenant references.
 * 
 * IMPORTANT: 
 * - Backup your database before running this migration
 * - This migration is irreversible 
 * - Test thoroughly in development environment first
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Tenant from '../models/Tenant';
import User from '../models/User';
import TimeEntry from '../models/TimeEntry';
import Project from '../models/Project';
import { config } from 'dotenv';

config();

interface MigrationStats {
  tenantsCreated: number;
  usersUpdated: number;
  timeEntriesUpdated: number;
  projectsUpdated: number;
  errors: string[];
}

class SingleToMultiTenantMigration {
  private stats: MigrationStats = {
    tenantsCreated: 0,
    usersUpdated: 0,
    timeEntriesUpdated: 0,
    projectsUpdated: 0,
    errors: []
  };

  async connect(): Promise<void> {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/staff-clocking-app');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }

  async createDefaultTenant(): Promise<mongoose.Types.ObjectId> {
    try {
      console.log('🏢 Creating default tenant...');

      // Check if a tenant already exists
      const existingTenant = await Tenant.findOne({});
      if (existingTenant) {
        console.log('📋 Found existing tenant:', existingTenant.name);
        return existingTenant._id;
      }

      // Create default tenant based on existing data
      const defaultTenant = new Tenant({
        name: 'Default Organization',
        subdomain: 'default',
        businessType: 'office',
        industry: 'General Business',
        timezone: 'America/New_York',
        currency: 'USD',
        
        contactInfo: {
          primaryContactName: 'System Administrator',
          primaryContactEmail: 'admin@example.com',
          phone: '+1-000-000-0000'
        },
        
        subscription: {
          plan: 'professional',
          status: 'active',
          maxUsers: 100,
          maxProjects: 50,
          maxLocations: 20,
          features: [
            'time_tracking', 'reporting', 'user_management', 'scheduling',
            'contractor_management', 'approval_workflows', 'mobile_app'
          ],
          subscriptionStartDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        
        settings: {
          workHours: {
            standardDaily: 8,
            standardWeekly: 40,
            overtimeThreshold: 8,
            workweekStart: 'monday'
          },
          breaks: {
            requireBreaks: true,
            minimumShiftForBreak: 4,
            breakDuration: 15,
            lunchThreshold: 6,
            lunchDuration: 30
          },
          location: {
            enforceGeofencing: false,
            allowMobileClocking: true,
            requireLocationForClocking: false,
            allowedLocations: []
          },
          approvals: {
            requireManagerApproval: false,
            allowSelfEdit: true
          },
          overtime: {
            dailyOvertimeRule: true,
            weeklyOvertimeRule: true,
            doubleTimeEnabled: false,
            overtimeRate: 1.5
          }
        },
        
        isActive: true,
        isSuspended: false
      });

      await defaultTenant.save();
      this.stats.tenantsCreated++;
      
      console.log('✅ Default tenant created:', defaultTenant._id);
      return defaultTenant._id;
    } catch (error) {
      const errorMsg = `Failed to create default tenant: ${error.message}`;
      this.stats.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async migrateUsers(tenantId: mongoose.Types.ObjectId): Promise<void> {
    try {
      console.log('👥 Migrating users...');

      // Find users that don't have tenantId set
      const usersToMigrate = await User.find({ tenantId: { $exists: false } });
      console.log(`Found ${usersToMigrate.length} users to migrate`);

      let adminUserId: mongoose.Types.ObjectId | null = null;

      for (const user of usersToMigrate) {
        try {
          // Update user with tenant reference
          user.tenantId = tenantId;
          
          // Ensure permissions are set based on role
          if (!user.permissions || user.permissions.length === 0) {
            user.permissions = User.getDefaultPermissions(user.role);
          }
          
          // Set default preferences if not exist
          if (!user.preferences) {
            user.preferences = {
              timezone: 'America/New_York',
              language: 'en',
              notifications: {
                email: true,
                push: true,
                clockInReminder: false,
                timesheetReminder: false,
                approvalNotification: true
              },
              dashboard: {
                showWeekends: false,
                timeFormat: '12h'
              }
            };
          }
          
          await user.save();
          this.stats.usersUpdated++;
          
          // Remember first admin for tenant reference
          if (user.role === 'admin' && !adminUserId) {
            adminUserId = user._id;
          }
          
        } catch (error) {
          const errorMsg = `Failed to migrate user ${user._id}: ${error.message}`;
          this.stats.errors.push(errorMsg);
          console.warn('⚠️', errorMsg);
        }
      }

      // Update tenant with created by reference
      if (adminUserId) {
        await Tenant.findByIdAndUpdate(tenantId, { createdBy: adminUserId });
      }

      console.log(`✅ Migrated ${this.stats.usersUpdated} users`);
    } catch (error) {
      const errorMsg = `User migration failed: ${error.message}`;
      this.stats.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async migrateTimeEntries(tenantId: mongoose.Types.ObjectId): Promise<void> {
    try {
      console.log('⏰ Migrating time entries...');

      // Get all users for the tenant
      const tenantUsers = await User.find({ tenantId });
      const userIds = tenantUsers.map(u => u._id);

      // Find time entries that belong to tenant users but don't have tenantId
      const timeEntriesToMigrate = await TimeEntry.find({ 
        userId: { $in: userIds },
        tenantId: { $exists: false } 
      });
      
      console.log(`Found ${timeEntriesToMigrate.length} time entries to migrate`);

      const batchSize = 100;
      for (let i = 0; i < timeEntriesToMigrate.length; i += batchSize) {
        const batch = timeEntriesToMigrate.slice(i, i + batchSize);
        
        try {
          const bulkOps = batch.map(entry => ({
            updateOne: {
              filter: { _id: entry._id },
              update: {
                $set: {
                  tenantId: tenantId,
                  // Convert old approval fields to new format
                  approvalStatus: entry.isApproved ? 'approved' : 'pending',
                  approvals: entry.isApproved && entry.approvedBy ? [{
                    approverId: entry.approvedBy,
                    approverType: 'manager',
                    status: 'approved',
                    timestamp: entry.approvedAt || entry.updatedAt,
                    notes: 'Migrated from legacy approval'
                  }] : [],
                  requiresApproval: !entry.isApproved,
                  // Set billable hours for contractor entries
                  billableHours: entry.totalHours || 0,
                  nonBillableHours: 0
                }
              }
            }
          }));

          const result = await TimeEntry.bulkWrite(bulkOps);
          this.stats.timeEntriesUpdated += result.modifiedCount;
          
          console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(timeEntriesToMigrate.length/batchSize)}`);
        } catch (error) {
          const errorMsg = `Failed to migrate time entries batch starting at ${i}: ${error.message}`;
          this.stats.errors.push(errorMsg);
          console.warn('⚠️', errorMsg);
        }
      }

      console.log(`✅ Migrated ${this.stats.timeEntriesUpdated} time entries`);
    } catch (error) {
      const errorMsg = `Time entries migration failed: ${error.message}`;
      this.stats.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async createSampleProjects(tenantId: mongoose.Types.ObjectId): Promise<void> {
    try {
      console.log('📁 Creating sample projects for contractors...');

      // Find contractors in the tenant
      const contractors = await User.find({ 
        tenantId, 
        role: 'contractor' 
      });

      if (contractors.length === 0) {
        console.log('ℹ️ No contractors found, skipping project creation');
        return;
      }

      // Create a sample client contact if none exists
      let clientContact = await User.findOne({ 
        tenantId, 
        role: 'client_contact' 
      });

      if (!clientContact) {
        clientContact = new User({
          tenantId,
          name: 'Sample Client Contact',
          email: 'client@example.com',
          pin: await bcrypt.hash('1234', 12),
          role: 'client_contact',
          employmentType: 'contractor',
          permissions: User.getDefaultPermissions('client_contact'),
          clientContactInfo: {
            companyName: 'Sample Client Company',
            approvalAuthority: true,
            contractorsManaged: contractors.map(c => c._id)
          },
          preferences: {
            timezone: 'America/New_York',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              clockInReminder: false,
              timesheetReminder: false,
              approvalNotification: true
            },
            dashboard: {
              showWeekends: false,
              timeFormat: '12h'
            }
          },
          isActive: true
        });

        await clientContact.save();
        console.log('✅ Created sample client contact');
      }

      // Create sample projects
      const sampleProjects = [
        {
          name: 'Website Development',
          code: 'WEB-001',
          description: 'Client website development project',
          clientName: clientContact.clientContactInfo?.companyName || 'Sample Client'
        },
        {
          name: 'Mobile App Development',
          code: 'MOB-001', 
          description: 'iOS and Android mobile application',
          clientName: clientContact.clientContactInfo?.companyName || 'Sample Client'
        }
      ];

      for (const projectData of sampleProjects) {
        try {
          const project = new Project({
            tenantId,
            name: projectData.name,
            code: projectData.code,
            description: projectData.description,
            clientId: clientContact._id,
            clientName: projectData.clientName,
            
            assignedContractors: contractors.map(contractor => ({
              contractorId: contractor._id,
              hourlyRate: contractor.contractorInfo?.defaultProjectRate || 50,
              isActive: true
            })),
            
            status: 'active',
            startDate: new Date(),
            
            billing: {
              type: 'hourly',
              defaultRate: 50,
              currency: 'USD'
            },
            
            approvalWorkflow: {
              levels: [{
                approverId: clientContact._id,
                approverType: 'client'
              }]
            }
          });

          await project.save();
          this.stats.projectsUpdated++;
        } catch (error) {
          const errorMsg = `Failed to create project ${projectData.name}: ${error.message}`;
          this.stats.errors.push(errorMsg);
        }
      }

      console.log(`✅ Created ${this.stats.projectsUpdated} sample projects`);
    } catch (error) {
      const errorMsg = `Project creation failed: ${error.message}`;
      this.stats.errors.push(errorMsg);
      console.warn('⚠️', errorMsg);
    }
  }

  async validateMigration(tenantId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      console.log('🔍 Validating migration...');

      const [tenant, users, timeEntries, projects] = await Promise.all([
        Tenant.findById(tenantId),
        User.find({ tenantId }),
        TimeEntry.find({ tenantId }),
        Project.find({ tenantId })
      ]);

      const issues: string[] = [];

      if (!tenant) {
        issues.push('Tenant not found');
      }

      // Check if all users have tenantId
      const usersWithoutTenant = await User.countDocuments({ tenantId: { $exists: false } });
      if (usersWithoutTenant > 0) {
        issues.push(`${usersWithoutTenant} users still missing tenantId`);
      }

      // Check if all time entries have tenantId
      const entriesWithoutTenant = await TimeEntry.countDocuments({ tenantId: { $exists: false } });
      if (entriesWithoutTenant > 0) {
        issues.push(`${entriesWithoutTenant} time entries still missing tenantId`);
      }

      if (issues.length > 0) {
        console.error('❌ Validation failed:');
        issues.forEach(issue => console.error(`  - ${issue}`));
        return false;
      }

      console.log('✅ Migration validation passed');
      console.log(`  - Tenant: ${tenant?.name}`);
      console.log(`  - Users: ${users.length}`);
      console.log(`  - Time Entries: ${timeEntries.length}`);
      console.log(`  - Projects: ${projects.length}`);
      
      return true;
    } catch (error) {
      console.error('❌ Validation error:', error);
      return false;
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Single-Tenant to Multi-Tenant Migration');
    console.log('================================================\n');

    try {
      await this.connect();

      // Step 1: Create default tenant
      const tenantId = await this.createDefaultTenant();

      // Step 2: Migrate users
      await this.migrateUsers(tenantId);

      // Step 3: Migrate time entries
      await this.migrateTimeEntries(tenantId);

      // Step 4: Create sample projects for contractors
      await this.createSampleProjects(tenantId);

      // Step 5: Validate migration
      const isValid = await this.validateMigration(tenantId);

      // Print final statistics
      console.log('\n📊 Migration Statistics:');
      console.log('========================');
      console.log(`Tenants created: ${this.stats.tenantsCreated}`);
      console.log(`Users updated: ${this.stats.usersUpdated}`);
      console.log(`Time entries updated: ${this.stats.timeEntriesUpdated}`);
      console.log(`Projects created: ${this.stats.projectsUpdated}`);
      console.log(`Errors: ${this.stats.errors.length}`);

      if (this.stats.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        this.stats.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      if (isValid) {
        console.log('\n🎉 Migration completed successfully!');
      } else {
        console.log('\n⚠️ Migration completed with validation issues');
      }

    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution
if (require.main === module) {
  const migration = new SingleToMultiTenantMigration();
  
  migration.run()
    .then(() => {
      console.log('\n✅ Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration process failed:', error);
      process.exit(1);
    });
}

export default SingleToMultiTenantMigration;