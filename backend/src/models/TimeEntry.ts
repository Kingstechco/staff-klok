import mongoose, { Document, Schema } from 'mongoose';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';
export type ApproverType = 'manager' | 'client';
export type TimeEntryStatus = 'active' | 'completed' | 'cancelled';

export interface IApproval {
  approverId: mongoose.Types.ObjectId;
  approverType: ApproverType;
  status: ApprovalStatus;
  timestamp: Date;
  notes?: string;
}

export interface ITimeEntry extends Document {
  // Multi-tenant support
  tenantId: mongoose.Types.ObjectId;
  
  // Basic time tracking
  userId: mongoose.Types.ObjectId;
  clockIn: Date;
  clockOut?: Date;
  
  // Break tracking
  breakStart?: Date;
  breakEnd?: Date;
  totalBreakTime?: number; // in minutes
  
  // Hours calculation
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  doubleTimeHours?: number;
  
  // Contractor-specific fields
  projectId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  taskDescription?: string;
  billableHours?: number;
  nonBillableHours?: number;
  
  // Approval workflow
  approvalStatus: ApprovalStatus;
  approvals: IApproval[];
  requiresApproval: boolean;
  
  // Simple approval fields (for backward compatibility)
  isApproved?: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  
  // Status and metadata
  status: TimeEntryStatus;
  notes?: string;
  adminNotes?: string;
  
  // Location tracking
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    geofenceId?: string;
  };
  
  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Methods
  calculateHours(): void;
  canBeApprovedBy(userId: string, userRole: string): boolean;
  addApproval(approval: Omit<IApproval, 'timestamp'>): void;
  isFullyApproved(): boolean;
}

const ApprovalSchema = new Schema({
  approverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approverType: {
    type: String,
    enum: ['manager', 'client'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, { _id: false });

const TimeEntrySchema: Schema = new Schema({
  // Multi-tenant support - CRITICAL for data isolation
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  
  // Basic time tracking
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clockIn: {
    type: Date,
    required: true
  },
  clockOut: {
    type: Date
  },
  
  // Break tracking
  breakStart: {
    type: Date
  },
  breakEnd: {
    type: Date
  },
  totalBreakTime: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Hours calculation
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  regularHours: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  doubleTimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Contractor-specific fields
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  taskDescription: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  billableHours: {
    type: Number,
    default: 0,
    min: 0
  },
  nonBillableHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'pending'
  },
  approvals: [ApprovalSchema],
  requiresApproval: {
    type: Boolean,
    default: true
  },
  
  // Simple approval fields (for backward compatibility)
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  
  // Status and metadata
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  notes: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  adminNotes: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  
  // Enhanced location tracking
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      trim: true
    },
    geofenceId: {
      type: String,
      trim: true
    }
  },
  
  // Audit fields
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
    virtuals: true,
    transform: function(_doc, ret: any) {
      delete ret.__v;
      return ret;
    }
  }
});

// Enhanced hours calculation with multi-tenant support
TimeEntrySchema.pre('save', async function(next) {
  const entry = this as any;
  
  // Calculate hours when clocking out
  if (entry.clockOut && entry.clockIn) {
    entry.calculateHours();
    
    // Auto-complete the entry
    if (entry.status === 'active') {
      entry.status = 'completed';
    }
    
    // Determine if approval is needed (fetch tenant settings)
    try {
      const Tenant = mongoose.model('Tenant');
      const User = mongoose.model('User');
      
      const [tenant, user] = await Promise.all([
        Tenant.findById(entry.tenantId),
        User.findById(entry.userId)
      ]);
      
      if (tenant && user) {
        // Check if contractor requires approval
        if (user.role === 'contractor') {
          entry.requiresApproval = tenant.settings?.contractors?.clientApprovalRequired || true;
        } else {
          entry.requiresApproval = tenant.settings?.approvals?.requireManagerApproval || false;
        }
        
        // Auto-approve if not required
        if (!entry.requiresApproval && entry.approvalStatus === 'pending') {
          entry.approvalStatus = 'auto_approved';
          const autoApprovalTimestamp = new Date();
          entry.approvals.push({
            approverId: entry.userId, // Self-approved
            approverType: 'manager',
            status: 'auto_approved',
            timestamp: autoApprovalTimestamp,
            notes: 'Auto-approved - no approval required'
          });
          // Update simple approval fields for backward compatibility
          entry.isApproved = true;
          entry.approvedBy = entry.userId;
          entry.approvedAt = autoApprovalTimestamp;
        }
      }
    } catch (error) {
      // Continue without auto-approval if tenant lookup fails
      console.warn('Failed to determine approval requirements:', error);
    }
  }
  
  next();
});

// Instance method to calculate hours with overtime rules
TimeEntrySchema.methods.calculateHours = function() {
  if (!this.clockOut || !this.clockIn) return;
  
  const totalMs = this.clockOut.getTime() - this.clockIn.getTime();
  const breakMs = (this.totalBreakTime || 0) * 60 * 1000;
  const workMs = Math.max(0, totalMs - breakMs);
  
  this.totalHours = Number((workMs / (1000 * 60 * 60)).toFixed(2));
  
  // Calculate regular, overtime, and double-time hours
  // Standard: 8 hours regular, 8-12 hours overtime, >12 hours double-time
  if (this.totalHours <= 8) {
    this.regularHours = this.totalHours;
    this.overtimeHours = 0;
    this.doubleTimeHours = 0;
  } else if (this.totalHours <= 12) {
    this.regularHours = 8;
    this.overtimeHours = Number((this.totalHours - 8).toFixed(2));
    this.doubleTimeHours = 0;
  } else {
    this.regularHours = 8;
    this.overtimeHours = 4;
    this.doubleTimeHours = Number((this.totalHours - 12).toFixed(2));
  }
  
  // For contractors, calculate billable vs non-billable hours
  if (this.projectId) {
    this.billableHours = this.totalHours;
    this.nonBillableHours = 0;
  } else {
    this.billableHours = 0;
    this.nonBillableHours = this.totalHours;
  }
};

// Instance method to check approval permissions
TimeEntrySchema.methods.canBeApprovedBy = function(userId: string, userRole: string): boolean {
  if (userRole === 'admin') return true;
  
  // Managers can approve their direct reports
  if (userRole === 'manager') return true;
  
  // Client contacts can approve contractor entries they manage
  if (userRole === 'client_contact') {
    return this.approvals.some((approval: IApproval) => 
      approval.approverType === 'client' && 
      approval.approverId.toString() === userId
    );
  }
  
  return false;
};

// Instance method to add approval
TimeEntrySchema.methods.addApproval = function(approval: Omit<IApproval, 'timestamp'>) {
  const approvalWithTimestamp = {
    ...approval,
    timestamp: new Date()
  };
  
  this.approvals.push(approvalWithTimestamp);
  
  // Update overall approval status
  if (approval.status === 'approved' && this.isFullyApproved()) {
    this.approvalStatus = 'approved';
    // Update simple approval fields for backward compatibility
    this.isApproved = true;
    this.approvedBy = approval.approverId;
    this.approvedAt = approvalWithTimestamp.timestamp;
  } else if (approval.status === 'rejected') {
    this.approvalStatus = 'rejected';
    // Reset simple approval fields
    this.isApproved = false;
    this.approvedBy = undefined;
    this.approvedAt = undefined;
  }
};

// Instance method to check if fully approved
TimeEntrySchema.methods.isFullyApproved = function(): boolean {
  if (!this.requiresApproval) return true;
  
  // Check if we have at least one approval
  const hasApproval = this.approvals.some((approval: IApproval) => 
    approval.status === 'approved' || approval.status === 'auto_approved'
  );
  
  return hasApproval;
};

// Virtual for display purposes
TimeEntrySchema.virtual('duration').get(function() {
  if (!this.clockOut || !this.clockIn) return null;
  
  const totalHours = Number(this.totalHours) || 0;
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours % 1) * 60);
  
  return `${hours}h ${minutes}m`;
});

// Comprehensive indexes for multi-tenant queries
TimeEntrySchema.index({ tenantId: 1, userId: 1, clockIn: -1 }); // Primary query pattern
TimeEntrySchema.index({ tenantId: 1, status: 1, clockIn: -1 }); // Status filtering
TimeEntrySchema.index({ tenantId: 1, approvalStatus: 1, clockIn: -1 }); // Approval filtering
TimeEntrySchema.index({ tenantId: 1, projectId: 1, clockIn: -1 }); // Project-based queries
TimeEntrySchema.index({ tenantId: 1, clientId: 1, clockIn: -1 }); // Client-based queries
TimeEntrySchema.index({ tenantId: 1, userId: 1, status: 1 }); // User status queries
TimeEntrySchema.index({ userId: 1, clockIn: -1 }); // User timeline queries
TimeEntrySchema.index({ clockIn: -1 }); // Global timeline queries
TimeEntrySchema.index({ 'approvals.approverId': 1 }); // Approval lookup

// Sparse indexes for optional fields
TimeEntrySchema.index({ tenantId: 1, 'location.geofenceId': 1 }, { sparse: true });
TimeEntrySchema.index({ createdAt: -1 }); // Audit queries

// Static method to find entries by tenant with filters
TimeEntrySchema.statics.findByTenant = function(tenantId: string, filters = {}) {
  return this.find({ tenantId, ...filters });
};

// Static method to find pending approvals for a user
TimeEntrySchema.statics.findPendingApprovals = function(tenantId: string, approverId: string) {
  return this.find({
    tenantId,
    approvalStatus: 'pending',
    requiresApproval: true,
    'approvals.approverId': approverId
  });
};

// Static method to get contractor timesheet data
TimeEntrySchema.statics.getContractorTimesheet = function(
  tenantId: string, 
  contractorId: string, 
  startDate: Date, 
  endDate: Date,
  projectId?: string
) {
  const query: any = {
    tenantId,
    userId: contractorId,
    clockIn: { $gte: startDate, $lte: endDate },
    status: 'completed'
  };
  
  if (projectId) {
    query.projectId = projectId;
  }
  
  return this.find(query)
    .populate('projectId', 'name code clientName billing')
    .populate('userId', 'name email contractorInfo')
    .populate('approvals.approverId', 'name role')
    .sort({ clockIn: -1 });
};

export default mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);