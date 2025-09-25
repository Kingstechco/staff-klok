import mongoose, { Document, Schema } from 'mongoose';

export type ExceptionType = 'sick' | 'vacation' | 'holiday' | 'unpaid_leave' | 'personal' | 'bereavement' | 'jury_duty' | 'custom';
export type ExceptionStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface IContractorException extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Contractor
  
  // Exception Details
  date: Date;
  endDate?: Date; // For multi-day exceptions
  type: ExceptionType;
  status: ExceptionStatus;
  reason?: string;
  description?: string;
  
  // Time Impact
  isFullDay: boolean;
  hoursAffected?: number; // For partial day exceptions
  startTime?: string; // "09:00" - for partial day exceptions
  endTime?: string; // "12:00" - for partial day exceptions
  
  // Documentation
  attachments?: string[]; // File URLs for documentation
  requiresDocumentation: boolean;
  
  // Approval Workflow
  createdBy: mongoose.Types.ObjectId; // Self-reported or admin-created
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  rejectionReason?: string;
  
  // Auto-processing
  autoApproved: boolean;
  autoApprovalRule?: string; // Which rule auto-approved this
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: mongoose.Types.ObjectId;
  
  // Methods
  canBeModified(): boolean;
  isExpired(): boolean;
  getAffectedHours(): number;
}

const ContractorExceptionSchema: Schema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Exception Details
  date: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(endDate: Date) {
        return !endDate || endDate >= this.date;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  type: {
    type: String,
    enum: ['sick', 'vacation', 'holiday', 'unpaid_leave', 'personal', 'bereavement', 'jury_duty', 'custom'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'pending',
    index: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Time Impact
  isFullDay: {
    type: Boolean,
    default: true
  },
  hoursAffected: {
    type: Number,
    min: 0,
    max: 24,
    validate: {
      validator: function(hours: number) {
        return this.isFullDay || (hours && hours > 0);
      },
      message: 'Hours affected is required for partial day exceptions'
    }
  },
  startTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function(startTime: string) {
        return this.isFullDay || startTime;
      },
      message: 'Start time is required for partial day exceptions'
    }
  },
  endTime: {
    type: String,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function(endTime: string) {
        return this.isFullDay || endTime;
      },
      message: 'End time is required for partial day exceptions'
    }
  },
  
  // Documentation
  attachments: [{
    type: String,
    trim: true
  }],
  requiresDocumentation: {
    type: Boolean,
    default: false
  },
  
  // Approval Workflow
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Auto-processing
  autoApproved: {
    type: Boolean,
    default: false
  },
  autoApprovalRule: {
    type: String,
    trim: true
  },
  
  // Metadata
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret: any) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for efficient queries
ContractorExceptionSchema.index({ tenantId: 1, userId: 1, date: 1 });
ContractorExceptionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
ContractorExceptionSchema.index({ tenantId: 1, type: 1, date: 1 });
ContractorExceptionSchema.index({ userId: 1, date: 1, status: 1 });

// Ensure no duplicate exceptions for same user/date
ContractorExceptionSchema.index(
  { tenantId: 1, userId: 1, date: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $in: ['pending', 'approved', 'auto_approved'] } 
    }
  }
);

// Auto-set approval date when status changes to approved
ContractorExceptionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'approved' && !this.approvalDate) {
      this.approvalDate = new Date();
    }
    if (this.status === 'auto_approved' && !this.approvalDate) {
      this.approvalDate = new Date();
      this.autoApproved = true;
    }
  }
  next();
});

// Instance method to check if exception can be modified
ContractorExceptionSchema.methods.canBeModified = function(): boolean {
  // Can only modify pending exceptions that haven't passed
  return this.status === 'pending' && this.date > new Date();
};

// Instance method to check if exception is expired
ContractorExceptionSchema.methods.isExpired = function(): boolean {
  const expirationDate = this.endDate || this.date;
  return expirationDate < new Date();
};

// Instance method to get affected hours
ContractorExceptionSchema.methods.getAffectedHours = function(): number {
  if (this.isFullDay) {
    // Get default work hours from user's contractor settings
    return 8; // Default, should be calculated from user's workSchedule
  }
  return this.hoursAffected || 0;
};

// Static method to find exceptions by date range
ContractorExceptionSchema.statics.findByDateRange = function(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    userId,
    $or: [
      { date: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { 
        date: { $lte: startDate }, 
        endDate: { $gte: endDate } 
      }
    ],
    status: { $in: ['pending', 'approved', 'auto_approved'] }
  });
};

// Static method to find pending exceptions requiring approval
ContractorExceptionSchema.statics.findPendingApprovals = function(tenantId: string) {
  return this.find({
    tenantId,
    status: 'pending',
    date: { $gte: new Date() } // Only future or today's exceptions
  }).populate('userId', 'name email department')
    .populate('createdBy', 'name email')
    .sort({ date: 1, createdAt: 1 });
};

// Static method to auto-approve based on rules
ContractorExceptionSchema.statics.autoApproveByRules = async function(
  exception: IContractorException
) {
  // Auto-approve holidays
  if (exception.type === 'holiday') {
    exception.status = 'auto_approved';
    exception.autoApprovalRule = 'holiday_auto_approval';
    return true;
  }
  
  // Auto-approve single sick days (configurable)
  if (exception.type === 'sick' && exception.isFullDay && !exception.endDate) {
    exception.status = 'auto_approved';
    exception.autoApprovalRule = 'single_sick_day_auto_approval';
    return true;
  }
  
  return false;
};

// Static method to check for consecutive exceptions
ContractorExceptionSchema.statics.findConsecutiveExceptions = function(
  userId: string, 
  date: Date, 
  type: ExceptionType
) {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - 7);
  
  const endOfWeek = new Date(date);
  endOfWeek.setDate(date.getDate() + 7);
  
  return this.find({
    userId,
    type,
    date: { $gte: startOfWeek, $lte: endOfWeek },
    status: { $in: ['approved', 'auto_approved'] }
  }).sort({ date: 1 });
};

export default mongoose.model<IContractorException>('ContractorException', ContractorExceptionSchema);