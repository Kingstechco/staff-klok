import mongoose, { Document, Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'manager' | 'staff' | 'contractor' | 'client_contact';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  
  // Basic Information
  employeeId?: string;
  name: string;
  email?: string;
  phone?: string;
  pin: string;
  
  // Role and Permissions
  role: UserRole;
  permissions: string[];
  
  // Organizational Structure
  department?: string;
  position?: string;
  manager?: mongoose.Types.ObjectId;
  locations?: string[];
  
  // Employment Details
  employmentType: EmploymentType;
  hireDate?: Date;
  terminationDate?: Date;
  
  // Compensation
  hourlyRate?: number;
  salaryAmount?: number;
  overtimeRate?: number;
  currency?: string;
  
  // Contractor-Specific Information
  contractorInfo?: {
    businessName?: string;
    taxId?: string;
    invoiceEmail?: string;
    defaultProjectRate?: number;
    clients: mongoose.Types.ObjectId[];
    specializations: string[];
    availableHours?: number;
  };
  
  // Client Contact Information (for contractor approval)
  clientContactInfo?: {
    companyName: string;
    approvalAuthority: boolean;
    contractorsManaged: mongoose.Types.ObjectId[];
    billingAddress?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  
  // System Fields
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockoutUntil?: Date;
  
  // User Preferences
  preferences: {
    timezone?: string;
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      clockInReminder: boolean;
      timesheetReminder: boolean;
      approvalNotification: boolean;
    };
    dashboard: {
      defaultView?: string;
      showWeekends: boolean;
      timeFormat: '12h' | '24h';
    };
  };
  
  // Security
  twoFactorAuth?: {
    enabled: boolean;
    secret?: string;
    backupCodes?: string[];
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Methods
  comparePin(pin: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  hasPermission(permission: string): boolean;
  canManage(userId: string): boolean;
}

const UserSchema: Schema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  
  // Basic Information
  employeeId: {
    type: String,
    trim: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  pin: {
    type: String,
    required: true
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff', 'contractor', 'client_contact'],
    required: true,
    default: 'staff'
  },
  permissions: [{
    type: String,
    trim: true
  }],
  
  // Organizational Structure
  department: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  locations: [{
    type: String,
    trim: true
  }],
  
  // Employment Details
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contractor', 'intern'],
    default: 'full_time'
  },
  hireDate: {
    type: Date
  },
  terminationDate: {
    type: Date
  },
  
  // Compensation
  hourlyRate: {
    type: Number,
    min: 0
  },
  salaryAmount: {
    type: Number,
    min: 0
  },
  overtimeRate: {
    type: Number,
    default: 1.5,
    min: 1
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  
  // Contractor-Specific Information
  contractorInfo: {
    businessName: String,
    taxId: String,
    invoiceEmail: {
      type: String,
      lowercase: true
    },
    defaultProjectRate: {
      type: Number,
      min: 0
    },
    clients: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    specializations: [{
      type: String,
      trim: true
    }],
    availableHours: {
      type: Number,
      min: 1,
      max: 168 // Max hours in a week
    }
  },
  
  // Client Contact Information
  clientContactInfo: {
    companyName: String,
    approvalAuthority: {
      type: Boolean,
      default: false
    },
    contractorsManaged: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'United States'
      }
    }
  },
  
  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lockoutUntil: {
    type: Date
  },
  
  // User Preferences
  preferences: {
    timezone: {
      type: String,
      default: 'America/New_York'
    },
    language: {
      type: String,
      default: 'en',
      lowercase: true
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      clockInReminder: { type: Boolean, default: false },
      timesheetReminder: { type: Boolean, default: true },
      approvalNotification: { type: Boolean, default: true }
    },
    dashboard: {
      defaultView: String,
      showWeekends: { type: Boolean, default: false },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h'
      }
    }
  },
  
  // Security
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    secret: String,
    backupCodes: [String]
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret: any) {
      delete ret.pin;
      delete ret.__v;
      if (ret.twoFactorAuth?.secret) {
        delete ret.twoFactorAuth.secret;
      }
      return ret;
    }
  }
});

// Compound indexes for efficient multi-tenant queries
UserSchema.index({ tenantId: 1, isActive: 1 });
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, department: 1 });
UserSchema.index({ tenantId: 1, employeeId: 1 }, { sparse: true });
UserSchema.index({ tenantId: 1, email: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { email: { $type: "string" } }
});

// PIN should be unique within tenant
UserSchema.index({ tenantId: 1, pin: 1 }, { unique: true });

// Manager-employee relationship
UserSchema.index({ manager: 1 });

// Contractor-specific indexes
UserSchema.index({ 'contractorInfo.clients': 1 });
UserSchema.index({ 'clientContactInfo.contractorsManaged': 1 });

// Login security indexes
UserSchema.index({ lockoutUntil: 1 }, { sparse: true });

// Pre-save middleware for PIN hashing
UserSchema.pre('save', async function(next) {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin as string, 12);
  }
  next();
});

// Instance method to compare PIN
UserSchema.methods.comparePin = async function(candidatePin: string): Promise<boolean> {
  return bcrypt.compare(candidatePin, this.pin);
};

// Instance method to check if account is locked
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
};

// Instance method to increment login attempts
UserSchema.methods.incLoginAttempts = async function(): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockoutUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockoutUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
UserSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockoutUntil: 1 }
  });
};

// Instance method to check permissions
UserSchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission) || this.role === 'admin';
};

// Instance method to check if user can manage another user
UserSchema.methods.canManage = function(userId: string): boolean {
  if (this.role === 'admin') return true;
  if (this.role === 'manager') {
    // Can manage direct reports
    return this._id.toString() === this.manager?.toString();
  }
  // Staff and contractors can only manage themselves
  return this._id.toString() === userId;
};

// Virtual for full name display
UserSchema.virtual('displayName').get(function() {
  return this.name || this.email;
});

// Static method to find users by tenant
UserSchema.statics.findByTenant = function(tenantId: string, filters = {}) {
  return this.find({ tenantId, isActive: true, ...filters });
};

// Static method to find contractors for a client
UserSchema.statics.findContractorsForClient = function(clientId: string) {
  return this.find({
    role: 'contractor',
    'contractorInfo.clients': clientId,
    isActive: true
  });
};

// Static method to get default permissions by role
UserSchema.statics.getDefaultPermissions = function(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    admin: [
      'user_management', 'tenant_settings', 'billing_management', 'analytics_access',
      'export_data', 'system_configuration', 'audit_logs'
    ],
    manager: [
      'team_management', 'schedule_management', 'approval_workflows', 'team_reports',
      'time_entry_management'
    ],
    staff: [
      'time_tracking', 'view_own_data', 'edit_own_profile', 'view_schedule'
    ],
    contractor: [
      'time_tracking', 'project_assignment', 'invoice_generation', 'client_interaction',
      'view_own_data', 'timesheet_submission'
    ],
    client_contact: [
      'contractor_oversight', 'approval_workflows', 'project_reports', 'invoice_approval'
    ]
  };
  
  return permissions[role] || permissions.staff;
};

export default mongoose.model<IUser>('User', UserSchema);