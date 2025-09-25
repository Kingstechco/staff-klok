import mongoose, { Document, Schema } from 'mongoose';

// Business type enum
export type BusinessType = 'retail' | 'restaurant' | 'office' | 'healthcare' | 'manufacturing' | 'contractors';
export type SubscriptionPlan = 'basic' | 'professional' | 'enterprise' | 'contractor';
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface ITenant extends Document {
  // Basic Information
  name: string;
  subdomain: string;
  customDomain?: string;
  logo?: string;
  
  // Business Configuration
  businessType: BusinessType;
  industry?: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  
  // Contact Information
  contactInfo: {
    primaryContactName: string;
    primaryContactEmail: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  
  // Subscription Management
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    maxUsers: number;
    maxProjects: number;
    maxLocations: number;
    features: string[];
    billingCycle: 'monthly' | 'annual';
    trialEndsAt?: Date;
    nextBillingDate?: Date;
    subscriptionStartDate: Date;
  };
  
  // Business Rules and Settings
  settings: {
    // Work Hours Configuration
    workHours: {
      standardDaily: number; // Standard daily hours (e.g., 8)
      standardWeekly: number; // Standard weekly hours (e.g., 40)
      overtimeThreshold: number; // When overtime starts (e.g., 8 hours daily)
      doubleTimeThreshold?: number; // When double-time starts (optional)
      workweekStart: 'sunday' | 'monday'; // First day of work week
    };
    
    // Break and Lunch Rules
    breaks: {
      requireBreaks: boolean;
      minimumShiftForBreak: number; // Minimum hours to require a break
      breakDuration: number; // Standard break duration in minutes
      lunchThreshold: number; // Minimum hours to require lunch
      lunchDuration: number; // Standard lunch duration in minutes
      maxBreaksPerDay?: number;
    };
    
    // Location and Geofencing
    location: {
      enforceGeofencing: boolean;
      allowMobileClocking: boolean;
      requireLocationForClocking: boolean;
      allowedLocations: Array<{
        name: string;
        type: 'wifi' | 'gps' | 'ip' | 'manual';
        value: string; // SSID, coordinates, IP address, etc.
        radius?: number; // For GPS locations
        isActive: boolean;
      }>;
    };
    
    // Approval Workflows
    approvals: {
      requireManagerApproval: boolean;
      requireClientApproval?: boolean; // For contractors
      autoApprovalThreshold?: number; // Auto-approve entries under X hours
      allowSelfEdit: boolean; // Can employees edit their own entries
      editTimeLimit?: number; // Hours after which entries cannot be edited
    };
    
    // Overtime Rules
    overtime: {
      dailyOvertimeRule: boolean; // Apply overtime after daily threshold
      weeklyOvertimeRule: boolean; // Apply overtime after weekly threshold
      doubleTimeEnabled: boolean;
      overtimeRate: number; // Multiplier (e.g., 1.5)
      doubleTimeRate?: number; // Multiplier (e.g., 2.0)
    };
    
    // Business-Type Specific Settings
    retail?: {
      peakHours: Array<{ start: string; end: string; premium: number }>;
      shiftPatterns: string[];
    };
    
    restaurant?: {
      tipTracking: boolean;
      serviceCharges: boolean;
      minimumWage: number;
    };
    
    contractors?: {
      requireProjectAssignment: boolean;
      allowMultipleProjects: boolean;
      invoiceGeneration: boolean;
      clientApprovalRequired: boolean;
    };
  };
  
  // Integration Settings
  integrations: {
    payroll?: {
      provider: string;
      settings: Record<string, any>;
      isActive: boolean;
    };
    
    accounting?: {
      provider: string;
      settings: Record<string, any>;
      isActive: boolean;
    };
    
    hr?: {
      provider: string;
      settings: Record<string, any>;
      isActive: boolean;
    };
    
    webhooks?: Array<{
      name: string;
      url: string;
      events: string[];
      isActive: boolean;
    }>;
  };
  
  // Analytics and Reporting
  analytics: {
    enableAdvancedReporting: boolean;
    dataRetentionPeriod: number; // Days to retain data
    allowDataExport: boolean;
  };
  
  // System Fields
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
}

const TenantSchema = new Schema<ITenant>({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/,
    maxlength: 63
  },
  customDomain: {
    type: String,
    sparse: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  logo: String,
  
  // Business Configuration
  businessType: {
    type: String,
    enum: ['retail', 'restaurant', 'office', 'healthcare', 'manufacturing', 'contractors'],
    required: true
  },
  industry: String,
  timezone: {
    type: String,
    required: true,
    default: 'America/New_York'
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  dateFormat: {
    type: String,
    required: true,
    default: 'MM/DD/YYYY',
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
  },
  
  // Contact Information
  contactInfo: {
    primaryContactName: { type: String, required: true, trim: true },
    primaryContactEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'United States' }
    }
  },
  
  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise', 'contractor'],
      required: true,
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled'],
      required: true,
      default: 'trial'
    },
    maxUsers: { type: Number, required: true, default: 25 },
    maxProjects: { type: Number, default: 10 },
    maxLocations: { type: Number, default: 5 },
    features: [{ type: String }],
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },
    trialEndsAt: Date,
    nextBillingDate: Date,
    subscriptionStartDate: { type: Date, default: Date.now }
  },
  
  // Settings
  settings: {
    workHours: {
      standardDaily: { type: Number, default: 8, min: 1, max: 24 },
      standardWeekly: { type: Number, default: 40, min: 1, max: 168 },
      overtimeThreshold: { type: Number, default: 8, min: 1 },
      doubleTimeThreshold: { type: Number, min: 1 },
      workweekStart: { type: String, enum: ['sunday', 'monday'], default: 'monday' }
    },
    
    breaks: {
      requireBreaks: { type: Boolean, default: true },
      minimumShiftForBreak: { type: Number, default: 4, min: 1 },
      breakDuration: { type: Number, default: 15, min: 5 },
      lunchThreshold: { type: Number, default: 6, min: 1 },
      lunchDuration: { type: Number, default: 30, min: 15 },
      maxBreaksPerDay: { type: Number, min: 1 }
    },
    
    location: {
      enforceGeofencing: { type: Boolean, default: false },
      allowMobileClocking: { type: Boolean, default: true },
      requireLocationForClocking: { type: Boolean, default: false },
      allowedLocations: [{
        name: { type: String, required: true },
        type: { type: String, enum: ['wifi', 'gps', 'ip', 'manual'], required: true },
        value: { type: String, required: true },
        radius: { type: Number, min: 1 },
        isActive: { type: Boolean, default: true }
      }]
    },
    
    approvals: {
      requireManagerApproval: { type: Boolean, default: false },
      requireClientApproval: Boolean,
      autoApprovalThreshold: { type: Number, min: 0 },
      allowSelfEdit: { type: Boolean, default: true },
      editTimeLimit: { type: Number, min: 1 } // Hours
    },
    
    overtime: {
      dailyOvertimeRule: { type: Boolean, default: true },
      weeklyOvertimeRule: { type: Boolean, default: true },
      doubleTimeEnabled: { type: Boolean, default: false },
      overtimeRate: { type: Number, default: 1.5, min: 1 },
      doubleTimeRate: { type: Number, min: 1 }
    },
    
    retail: {
      peakHours: [{
        start: String,
        end: String,
        premium: { type: Number, min: 0 }
      }],
      shiftPatterns: [String]
    },
    
    restaurant: {
      tipTracking: { type: Boolean, default: false },
      serviceCharges: { type: Boolean, default: false },
      minimumWage: { type: Number, min: 0 }
    },
    
    contractors: {
      requireProjectAssignment: { type: Boolean, default: true },
      allowMultipleProjects: { type: Boolean, default: true },
      invoiceGeneration: { type: Boolean, default: false },
      clientApprovalRequired: { type: Boolean, default: true }
    }
  },
  
  // Integrations
  integrations: {
    payroll: {
      provider: String,
      settings: Schema.Types.Mixed,
      isActive: { type: Boolean, default: false }
    },
    accounting: {
      provider: String,
      settings: Schema.Types.Mixed,
      isActive: { type: Boolean, default: false }
    },
    hr: {
      provider: String,
      settings: Schema.Types.Mixed,
      isActive: { type: Boolean, default: false }
    },
    webhooks: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      events: [{ type: String }],
      isActive: { type: Boolean, default: true }
    }]
  },
  
  // Analytics
  analytics: {
    enableAdvancedReporting: { type: Boolean, default: false },
    dataRetentionPeriod: { type: Number, default: 2555, min: 90 }, // ~7 years default
    allowDataExport: { type: Boolean, default: true }
  },
  
  // System fields
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: String,
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient querying
TenantSchema.index({ subdomain: 1 }, { unique: true });
TenantSchema.index({ customDomain: 1 }, { sparse: true, unique: true });
TenantSchema.index({ businessType: 1 });
TenantSchema.index({ 'subscription.status': 1 });
TenantSchema.index({ 'subscription.plan': 1 });
TenantSchema.index({ isActive: 1, isSuspended: 1 });
TenantSchema.index({ createdAt: 1 });

// Virtual for full domain
TenantSchema.virtual('fullDomain').get(function() {
  if (this.customDomain) {
    return this.customDomain;
  }
  return `${this.subdomain}.staffclock.com`;
});

// Pre-save hook to set default features based on plan
TenantSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('subscription.plan')) {
    this.subscription.features = this.getDefaultFeatures();
  }
  next();
});

// Instance method to get default features based on subscription plan
TenantSchema.methods.getDefaultFeatures = function(): string[] {
  const plan = this.subscription.plan;
  
  const features: Record<SubscriptionPlan, string[]> = {
    basic: [
      'time_tracking', 'basic_reports', 'mobile_app', 'email_support'
    ],
    professional: [
      'time_tracking', 'advanced_reports', 'scheduling', 'mobile_app', 
      'api_access', 'integrations', 'priority_support', 'custom_fields'
    ],
    enterprise: [
      'time_tracking', 'advanced_reports', 'scheduling', 'mobile_app',
      'api_access', 'integrations', 'sso', 'advanced_analytics',
      'custom_fields', 'audit_logs', 'dedicated_support', 'white_label'
    ],
    contractor: [
      'time_tracking', 'project_management', 'client_portal', 'invoice_generation',
      'approval_workflows', 'advanced_reports', 'api_access', 'priority_support'
    ]
  };
  
  return features[plan] || features.basic;
};

// Instance method to check if a feature is enabled
TenantSchema.methods.hasFeature = function(featureName: string): boolean {
  return this.subscription.features.includes(featureName);
};

// Static method to get business type defaults
TenantSchema.statics.getBusinessTypeDefaults = function(businessType: BusinessType) {
  const defaults: Record<BusinessType, Partial<ITenant['settings']>> = {
    retail: {
      workHours: { standardDaily: 8, overtimeThreshold: 8 },
      breaks: { requireBreaks: true, minimumShiftForBreak: 4 },
      retail: {
        shiftPatterns: ['Opening', 'Mid-Day', 'Closing'],
        peakHours: [
          { start: '11:00', end: '13:00', premium: 0.1 },
          { start: '17:00', end: '19:00', premium: 0.1 }
        ]
      }
    },
    restaurant: {
      workHours: { standardDaily: 8, overtimeThreshold: 8 },
      breaks: { requireBreaks: true, minimumShiftForBreak: 6 },
      restaurant: {
        tipTracking: true,
        serviceCharges: false
      }
    },
    contractors: {
      workHours: { standardDaily: 8, overtimeThreshold: 8 },
      approvals: { requireClientApproval: true },
      contractors: {
        requireProjectAssignment: true,
        clientApprovalRequired: true,
        invoiceGeneration: true
      }
    },
    office: {
      workHours: { standardDaily: 8, standardWeekly: 40 },
      breaks: { requireBreaks: false }
    },
    healthcare: {
      workHours: { standardDaily: 12, overtimeThreshold: 12 },
      breaks: { requireBreaks: true, minimumShiftForBreak: 6 }
    },
    manufacturing: {
      workHours: { standardDaily: 8, overtimeThreshold: 8 },
      breaks: { requireBreaks: true, minimumShiftForBreak: 4 }
    }
  };
  
  return defaults[businessType] || defaults.office;
};

export default mongoose.model<ITenant>('Tenant', TenantSchema);