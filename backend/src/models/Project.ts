import mongoose, { Document, Schema } from 'mongoose';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface IProject extends Document {
  tenantId: mongoose.Types.ObjectId;
  
  // Project Information
  name: string;
  code: string; // Unique project identifier
  description?: string;
  tags: string[];
  
  // Client/Customer Information
  clientId: mongoose.Types.ObjectId; // Reference to client user
  clientName: string; // Denormalized for performance
  clientContact: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Project Manager/Lead
  projectManagerId?: mongoose.Types.ObjectId;
  
  // Financial Information
  budgetType: 'fixed' | 'hourly' | 'milestone';
  budget?: {
    amount: number;
    currency: string;
    remainingAmount?: number;
  };
  
  // Billing Configuration
  billing: {
    defaultRate: number; // Default hourly rate
    currency: string;
    rateType: 'hourly' | 'daily' | 'fixed';
    invoicingSchedule?: 'weekly' | 'bi-weekly' | 'monthly' | 'milestone';
    invoiceApprovalRequired: boolean;
  };
  
  // Timeline
  startDate: Date;
  endDate?: Date;
  estimatedHours?: number;
  actualHours: number; // Calculated field
  
  // Project Assignment
  assignedContractors: Array<{
    contractorId: mongoose.Types.ObjectId;
    contractorName: string; // Denormalized
    role: string;
    hourlyRate: number;
    maxHoursPerWeek?: number;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
  }>;
  
  // Project Configuration
  settings: {
    requiresApproval: boolean;
    allowOvertime: boolean;
    trackMilestones: boolean;
    requireTaskDescription: boolean;
    allowMultipleSessions: boolean; // Can contractors work multiple sessions per day
    maxHoursPerDay?: number;
  };
  
  // Milestones and Deliverables
  milestones: Array<{
    name: string;
    description?: string;
    dueDate: Date;
    completedDate?: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
    billableAmount?: number;
  }>;
  
  // Status and Progress
  status: ProjectStatus;
  progress: {
    percentComplete: number;
    hoursLogged: number;
    hoursRemaining?: number;
    lastActivityDate?: Date;
  };
  
  // Integration Settings
  integrations: {
    invoicing?: {
      provider: string;
      externalId?: string;
      settings: Record<string, any>;
    };
    projectManagement?: {
      provider: string;
      externalId?: string;
      settings: Record<string, any>;
    };
  };
  
  // Approval Workflow
  approvalWorkflow: {
    levels: Array<{
      level: number;
      approverId: mongoose.Types.ObjectId;
      approverType: 'client' | 'manager';
      threshold?: number; // Auto-approve under this amount
      isRequired: boolean;
    }>;
    currentLevel?: number;
  };
  
  // Metadata
  notes?: string;
  attachments: Array<{
    filename: string;
    url: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
    size: number;
    contentType: string;
  }>;
  
  // System fields
  isActive: boolean;
  isArchived: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
}

const ProjectSchema = new Schema<IProject>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  
  // Project Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 20
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  tags: [{ type: String, trim: true }],
  
  // Client Information
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientContact: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true }
  },
  
  // Project Manager
  projectManagerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Financial Information
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly', 'milestone'],
    required: true,
    default: 'hourly'
  },
  budget: {
    amount: { type: Number, min: 0 },
    currency: { type: String, uppercase: true, minlength: 3, maxlength: 3 },
    remainingAmount: { type: Number }
  },
  
  // Billing Configuration
  billing: {
    defaultRate: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'USD' },
    rateType: { type: String, enum: ['hourly', 'daily', 'fixed'], default: 'hourly' },
    invoicingSchedule: { 
      type: String, 
      enum: ['weekly', 'bi-weekly', 'monthly', 'milestone'] 
    },
    invoiceApprovalRequired: { type: Boolean, default: true }
  },
  
  // Timeline
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  estimatedHours: { type: Number, min: 0 },
  actualHours: { type: Number, default: 0, min: 0 },
  
  // Assignments
  assignedContractors: [{
    contractorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contractorName: { type: String, required: true },
    role: { type: String, required: true, trim: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    maxHoursPerWeek: { type: Number, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  
  // Settings
  settings: {
    requiresApproval: { type: Boolean, default: true },
    allowOvertime: { type: Boolean, default: false },
    trackMilestones: { type: Boolean, default: false },
    requireTaskDescription: { type: Boolean, default: true },
    allowMultipleSessions: { type: Boolean, default: true },
    maxHoursPerDay: { type: Number, min: 1, max: 24 }
  },
  
  // Milestones
  milestones: [{
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    completedDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending'
    },
    billableAmount: { type: Number, min: 0 }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    required: true,
    default: 'planning'
  },
  
  // Progress tracking
  progress: {
    percentComplete: { type: Number, default: 0, min: 0, max: 100 },
    hoursLogged: { type: Number, default: 0, min: 0 },
    hoursRemaining: { type: Number, min: 0 },
    lastActivityDate: { type: Date }
  },
  
  // Integrations
  integrations: {
    invoicing: {
      provider: String,
      externalId: String,
      settings: Schema.Types.Mixed
    },
    projectManagement: {
      provider: String,
      externalId: String,
      settings: Schema.Types.Mixed
    }
  },
  
  // Approval Workflow
  approvalWorkflow: {
    levels: [{
      level: { type: Number, required: true, min: 1 },
      approverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      approverType: { type: String, enum: ['client', 'manager'], required: true },
      threshold: { type: Number, min: 0 },
      isRequired: { type: Boolean, default: true }
    }],
    currentLevel: { type: Number, min: 1 }
  },
  
  // Metadata
  notes: { type: String, trim: true },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    size: { type: Number, required: true, min: 0 },
    contentType: { type: String, required: true }
  }],
  
  // System fields
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

// Compound indexes for efficient querying
ProjectSchema.index({ tenantId: 1, isActive: 1 });
ProjectSchema.index({ tenantId: 1, status: 1 });
ProjectSchema.index({ tenantId: 1, clientId: 1 });
ProjectSchema.index({ tenantId: 1, code: 1 }, { unique: true });
ProjectSchema.index({ 'assignedContractors.contractorId': 1, status: 1 });
ProjectSchema.index({ startDate: 1, endDate: 1 });
ProjectSchema.index({ createdAt: -1 });

// Text search index
ProjectSchema.index({ 
  name: 'text', 
  description: 'text', 
  code: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    code: 8,
    description: 5,
    tags: 3
  }
});

// Virtual for project duration in days
ProjectSchema.virtual('durationDays').get(function() {
  if (!this.endDate) return null;
  const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for budget utilization
ProjectSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget?.amount || this.budgetType !== 'fixed') return null;
  
  const spent = this.actualHours * this.billing.defaultRate;
  return {
    spent,
    remaining: this.budget.amount - spent,
    utilizationPercentage: (spent / this.budget.amount) * 100
  };
});

// Pre-save middleware to update calculated fields
ProjectSchema.pre('save', async function(next) {
  // Update progress based on actual hours vs estimated hours
  if (this.estimatedHours && this.actualHours) {
    this.progress.percentComplete = Math.min((this.actualHours / this.estimatedHours) * 100, 100);
  }
  
  // Update remaining budget for fixed projects
  if (this.budgetType === 'fixed' && this.budget?.amount) {
    const spent = this.actualHours * this.billing.defaultRate;
    this.budget.remainingAmount = this.budget.amount - spent;
  }
  
  // Set status to overdue if past end date and not completed
  if (this.endDate && this.endDate < new Date() && this.status !== 'completed' && this.status !== 'cancelled') {
    // Don't automatically change status, but this could be used for notifications
  }
  
  next();
});

// Instance methods
ProjectSchema.methods.addContractor = function(contractorData: any) {
  this.assignedContractors.push({
    ...contractorData,
    startDate: contractorData.startDate || new Date(),
    isActive: true
  });
  return this.save();
};

ProjectSchema.methods.removeContractor = function(contractorId: string) {
  const contractor = this.assignedContractors.id(contractorId);
  if (contractor) {
    contractor.isActive = false;
    contractor.endDate = new Date();
  }
  return this.save();
};

ProjectSchema.methods.updateProgress = function(hoursLogged: number) {
  this.progress.hoursLogged = hoursLogged;
  this.progress.lastActivityDate = new Date();
  this.actualHours = hoursLogged;
  
  if (this.estimatedHours) {
    this.progress.percentComplete = Math.min((hoursLogged / this.estimatedHours) * 100, 100);
    this.progress.hoursRemaining = Math.max(this.estimatedHours - hoursLogged, 0);
  }
  
  return this.save();
};

ProjectSchema.methods.getActiveContractors = function() {
  return this.assignedContractors.filter((contractor: any) => 
    contractor.isActive && 
    (!contractor.endDate || contractor.endDate > new Date())
  );
};

// Static methods
ProjectSchema.statics.findByTenant = function(tenantId: string) {
  return this.find({ tenantId, isActive: true });
};

ProjectSchema.statics.findActiveProjectsForContractor = function(tenantId: string, contractorId: string) {
  return this.find({
    tenantId,
    status: 'active',
    'assignedContractors.contractorId': contractorId,
    'assignedContractors.isActive': true,
    isActive: true
  });
};

export default mongoose.model<IProject>('Project', ProjectSchema);