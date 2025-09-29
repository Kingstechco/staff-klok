import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Tenant, { ITenant, BusinessType, SubscriptionPlan } from '../models/Tenant';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';

export class TenantController {
  
  /**
   * Create a new tenant (Public endpoint for registration)
   */
  static async createTenant(req: Request, res: Response): Promise<void> {
    try {
      const {
        // Tenant basic info
        name,
        subdomain,
        businessType,
        industry,
        timezone = 'America/New_York',
        currency = 'USD',
        
        // Admin user info
        adminUser: {
          name: adminName,
          email: adminEmail,
          pin: adminPin,
          phone
        },
        
        // Contact info
        contactInfo,
        
        // Plan selection
        subscriptionPlan = 'basic'
      } = req.body;

      // Validate subdomain availability
      const existingTenant = await Tenant.findOne({ 
        $or: [
          { subdomain: subdomain.toLowerCase() },
          { 'contactInfo.primaryContactEmail': adminEmail }
        ]
      });

      if (existingTenant) {
        res.status(409).json({ 
          error: 'Tenant already exists',
          message: 'A tenant with this subdomain or email already exists.'
        });
        return;
      }

      // Get business type defaults
      const businessDefaults = (Tenant as any).getBusinessTypeDefaults(businessType);
      
      // Create tenant
      const tenant = new Tenant({
        name: name.trim(),
        subdomain: subdomain.toLowerCase().trim(),
        businessType,
        industry,
        timezone,
        currency: currency.toUpperCase(),
        
        contactInfo: {
          primaryContactName: adminName,
          primaryContactEmail: adminEmail,
          phone,
          ...contactInfo
        },
        
        subscription: {
          plan: subscriptionPlan,
          status: 'trial',
          maxUsers: TenantController.getSubscriptionLimits(subscriptionPlan).maxUsers,
          maxProjects: TenantController.getSubscriptionLimits(subscriptionPlan).maxProjects,
          maxLocations: TenantController.getSubscriptionLimits(subscriptionPlan).maxLocations,
          features: [],
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          subscriptionStartDate: new Date()
        },
        
        settings: {
          ...businessDefaults,
          workHours: {
            standardDaily: 8,
            standardWeekly: 40,
            overtimeThreshold: 8,
            workweekStart: 'monday',
            ...businessDefaults.workHours
          },
          breaks: {
            requireBreaks: true,
            minimumShiftForBreak: 4,
            breakDuration: 15,
            lunchThreshold: 6,
            lunchDuration: 30,
            ...businessDefaults.breaks
          },
          location: {
            enforceGeofencing: false,
            allowMobileClocking: true,
            requireLocationForClocking: false,
            allowedLocations: []
          },
          approvals: {
            requireManagerApproval: false,
            allowSelfEdit: true,
            ...businessDefaults.approvals
          },
          overtime: {
            dailyOvertimeRule: true,
            weeklyOvertimeRule: true,
            doubleTimeEnabled: false,
            overtimeRate: 1.5
          }
        }
      });

      // Set features based on subscription plan
      tenant.subscription.features = (tenant as any).getDefaultFeatures();
      
      await tenant.save();

      // Create admin user for the tenant
      const adminUser = new User({
        tenantId: tenant._id as mongoose.Types.ObjectId,
        name: adminName,
        email: adminEmail,
        phone,
        pin: await bcrypt.hash(adminPin, 12),
        role: 'admin',
        employmentType: 'full_time',
        permissions: (User as any).getDefaultPermissions('admin'),
        isActive: true,
        createdBy: null, // Self-created
        preferences: {
          timezone,
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
        }
      });

      await adminUser.save();

      // Update tenant with created by reference
      tenant.createdBy = adminUser._id as mongoose.Types.ObjectId;
      await tenant.save();

      logger.info('New tenant created', {
        tenantId: tenant._id as mongoose.Types.ObjectId,
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        businessType: tenant.businessType,
        adminEmail: adminEmail,
        subscriptionPlan
      });

      res.status(201).json({
        tenant: {
          id: tenant._id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          businessType: tenant.businessType,
          subscriptionPlan: tenant.subscription.plan,
          trialEndsAt: tenant.subscription.trialEndsAt,
          fullDomain: (tenant as any).fullDomain
        },
        adminUser: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role
        },
        setupInstructions: {
          loginUrl: `https://${tenant.subdomain}.staffclock.com/login`,
          adminPin: adminPin, // Return plain PIN for initial setup
          trialPeriod: '14 days'
        }
      });
    } catch (error) {
      logger.error('Create tenant error:', error);
      
      if (error.code === 11000) {
        res.status(409).json({
          error: 'Duplicate data',
          message: 'Subdomain or email already exists.'
        });
      } else {
        res.status(500).json({
          error: 'Failed to create tenant',
          message: 'An error occurred during tenant creation.'
        });
      }
    }
  }

  /**
   * Update tenant settings (Admin only)
   */
  static async updateTenantSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        businessType,
        timezone,
        currency,
        settings,
        contactInfo
      } = req.body;

      const tenant = await Tenant.findById(req.user?.tenantId);
      
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Update basic information
      if (name) tenant.name = name;
      if (businessType) tenant.businessType = businessType;
      if (timezone) tenant.timezone = timezone;
      if (currency) tenant.currency = currency.toUpperCase();
      
      // Update contact information
      if (contactInfo) {
        tenant.contactInfo = { ...tenant.contactInfo, ...contactInfo };
      }

      // Update settings
      if (settings) {
        tenant.settings = {
          ...tenant.settings,
          ...settings,
          // Ensure nested objects are properly merged
          workHours: { ...tenant.settings.workHours, ...settings.workHours },
          breaks: { ...tenant.settings.breaks, ...settings.breaks },
          location: { ...tenant.settings.location, ...settings.location },
          approvals: { ...tenant.settings.approvals, ...settings.approvals },
          overtime: { ...tenant.settings.overtime, ...settings.overtime }
        };
      }

      tenant.lastModifiedBy = req.user?._id as mongoose.Types.ObjectId;
      await tenant.save();

      logger.info('Tenant settings updated', {
        tenantId: tenant._id as mongoose.Types.ObjectId,
        updatedBy: req.user?._id,
        updatedFields: Object.keys(req.body)
      });

      res.json({
        message: 'Tenant settings updated successfully',
        tenant: tenant.toObject()
      });
    } catch (error) {
      logger.error('Update tenant settings error:', error);
      res.status(500).json({ error: 'Failed to update tenant settings' });
    }
  }

  /**
   * Get tenant information
   */
  static async getTenantInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenant = await Tenant.findById(req.user?.tenantId)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Get additional statistics
      const userCount = await User.countDocuments({ 
        tenantId: tenant._id as mongoose.Types.ObjectId, 
        isActive: true 
      });

      const usersByRole = await User.aggregate([
        { $match: { tenantId: tenant._id, isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      const roleStats = usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      res.json({
        tenant: tenant.toObject(),
        statistics: {
          totalUsers: userCount,
          usersByRole: roleStats,
          subscriptionUtilization: {
            users: {
              current: userCount,
              limit: tenant.subscription.maxUsers,
              percentage: (userCount / tenant.subscription.maxUsers) * 100
            }
          }
        }
      });
    } catch (error) {
      logger.error('Get tenant info error:', error);
      res.status(500).json({ error: 'Failed to fetch tenant information' });
    }
  }

  /**
   * Upgrade/Downgrade subscription
   */
  static async updateSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { plan, billingCycle = 'monthly' } = req.body;

      const tenant = await Tenant.findById(req.user?.tenantId);
      
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      const oldPlan = tenant.subscription.plan;
      const limits = TenantController.getSubscriptionLimits(plan);

      // Check if downgrade is possible (user count within new limits)
      const userCount = await User.countDocuments({ 
        tenantId: tenant._id as mongoose.Types.ObjectId, 
        isActive: true 
      });

      if (userCount > limits.maxUsers) {
        res.status(400).json({
          error: 'Cannot downgrade',
          message: `Current user count (${userCount}) exceeds the limit for ${plan} plan (${limits.maxUsers}). Please deactivate some users first.`
        });
        return;
      }

      // Update subscription
      tenant.subscription.plan = plan;
      tenant.subscription.billingCycle = billingCycle;
      tenant.subscription.maxUsers = limits.maxUsers;
      tenant.subscription.maxProjects = limits.maxProjects;
      tenant.subscription.maxLocations = limits.maxLocations;
      tenant.subscription.features = (tenant as any).getDefaultFeatures();

      // If upgrading from trial, activate subscription
      if (tenant.subscription.status === 'trial' && plan !== 'basic') {
        tenant.subscription.status = 'active';
        tenant.subscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }

      tenant.lastModifiedBy = req.user?._id as mongoose.Types.ObjectId;
      await tenant.save();

      logger.info('Subscription updated', {
        tenantId: tenant._id as mongoose.Types.ObjectId,
        oldPlan,
        newPlan: plan,
        updatedBy: req.user?._id
      });

      res.json({
        message: 'Subscription updated successfully',
        subscription: tenant.subscription,
        changes: {
          from: oldPlan,
          to: plan,
          newFeatures: tenant.subscription.features,
          newLimits: limits
        }
      });
    } catch (error) {
      logger.error('Update subscription error:', error);
      res.status(500).json({ error: 'Failed to update subscription' });
    }
  }

  /**
   * Get subscription plans and pricing
   */
  static getSubscriptionPlans(req: Request, res: Response): void {
    const plans = {
      basic: {
        name: 'Basic',
        price: { monthly: 8, annual: 80 },
        limits: { users: 25, projects: 10, locations: 5 },
        features: [
          'Time Tracking',
          'Basic Reports',
          'Mobile App',
          'Email Support'
        ]
      },
      professional: {
        name: 'Professional',
        price: { monthly: 15, annual: 150 },
        limits: { users: 100, projects: 50, locations: 20 },
        features: [
          'All Basic Features',
          'Advanced Reports',
          'Scheduling',
          'API Access',
          'Integrations',
          'Custom Fields',
          'Priority Support'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        price: { monthly: 25, annual: 250 },
        limits: { users: 'unlimited', projects: 'unlimited', locations: 'unlimited' },
        features: [
          'All Professional Features',
          'SSO Integration',
          'Advanced Analytics',
          'Audit Logs',
          'White Label',
          'Dedicated Support',
          'Custom Integrations'
        ]
      },
      contractor: {
        name: 'Contractor',
        price: { monthly: 12, annual: 120 },
        limits: { users: 'unlimited', projects: 'unlimited', locations: 'unlimited' },
        features: [
          'Project Management',
          'Client Portal',
          'Invoice Generation',
          'Approval Workflows',
          'Advanced Reports',
          'API Access',
          'Priority Support'
        ],
        additionalFees: {
          clientContact: { monthly: 5, annual: 50 }
        }
      }
    };

    res.json({ plans });
  }

  /**
   * Suspend/Activate tenant
   */
  static async toggleTenantStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { action, reason } = req.body; // action: 'suspend' | 'activate'

      // This would typically be a super-admin only function
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const tenant = await Tenant.findById(tenantId);
      
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      if (action === 'suspend') {
        tenant.isSuspended = true;
        tenant.suspensionReason = reason;
        tenant.subscription.status = 'suspended';
      } else if (action === 'activate') {
        tenant.isSuspended = false;
        tenant.suspensionReason = undefined;
        tenant.subscription.status = 'active';
      }

      tenant.lastModifiedBy = req.user?._id as mongoose.Types.ObjectId;
      await tenant.save();

      logger.warn(`Tenant ${action}d`, {
        tenantId: tenant._id as mongoose.Types.ObjectId,
        tenantName: tenant.name,
        action,
        reason,
        actionBy: req.user?._id
      });

      res.json({
        message: `Tenant ${action}d successfully`,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          status: tenant.subscription.status,
          isSuspended: tenant.isSuspended,
          suspensionReason: tenant.suspensionReason
        }
      });
    } catch (error) {
      logger.error('Toggle tenant status error:', error);
      res.status(500).json({ error: 'Failed to update tenant status' });
    }
  }

  // Helper methods

  private static getSubscriptionLimits(plan: SubscriptionPlan): {
    maxUsers: number;
    maxProjects: number;
    maxLocations: number;
  } {
    const limits = {
      basic: { maxUsers: 25, maxProjects: 10, maxLocations: 5 },
      professional: { maxUsers: 100, maxProjects: 50, maxLocations: 20 },
      enterprise: { maxUsers: 999999, maxProjects: 999999, maxLocations: 999999 },
      contractor: { maxUsers: 999999, maxProjects: 999999, maxLocations: 999999 }
    };

    return limits[plan] || limits.basic;
  }

  /**
   * Get available business types and their configurations
   */
  static getBusinessTypes(req: Request, res: Response): void {
    const businessTypes = {
      retail: {
        name: 'Retail',
        description: 'Stores, shops, and retail operations',
        features: ['Shift patterns', 'Peak hour premiums', 'Location-based clocking'],
        defaultSettings: {
          shiftPatterns: ['Opening', 'Mid-Day', 'Closing'],
          requiresBreaks: true,
          geofencingRecommended: true
        }
      },
      restaurant: {
        name: 'Restaurant & Food Service',
        description: 'Restaurants, cafes, and food service businesses',
        features: ['Tip tracking', 'Service charges', 'Kitchen/Front of house roles'],
        defaultSettings: {
          shiftPatterns: ['Prep', 'Lunch', 'Dinner', 'Cleanup'],
          tipTracking: true,
          flexibleBreaks: true
        }
      },
      office: {
        name: 'Office & Corporate',
        description: 'Traditional office environments',
        features: ['Standard work hours', 'Flexible schedules', 'Remote work support'],
        defaultSettings: {
          standardHours: { daily: 8, weekly: 40 },
          flexibleScheduling: true,
          geofencingOptional: true
        }
      },
      healthcare: {
        name: 'Healthcare',
        description: 'Hospitals, clinics, and healthcare facilities',
        features: ['Long shifts', '24/7 operations', 'Critical compliance'],
        defaultSettings: {
          extendedShifts: true,
          mandatoryBreaks: true,
          complianceTracking: true
        }
      },
      manufacturing: {
        name: 'Manufacturing',
        description: 'Factories and manufacturing facilities',
        features: ['Shift work', 'Safety compliance', 'Equipment-based clocking'],
        defaultSettings: {
          shiftWork: true,
          safetyCompliance: true,
          preciseTimekeeping: true
        }
      },
      contractors: {
        name: 'Contractors & Consultants',
        description: 'Independent contractors and consulting firms',
        features: ['Project-based tracking', 'Client billing', 'Invoice generation'],
        defaultSettings: {
          projectTracking: true,
          clientApproval: true,
          invoiceGeneration: true
        }
      }
    };

    res.json({ businessTypes });
  }
}