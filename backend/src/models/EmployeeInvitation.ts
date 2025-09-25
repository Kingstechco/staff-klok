import mongoose, { Document, Schema } from 'mongoose';

export type InvitationType = 'employee' | 'contractor' | 'manager' | 'admin';
export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled' | 'completed';

export interface IEmployeeDetails {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  nationalId?: string; // Social Security, NI Number, etc.
  
  // Employment Details
  employeeId?: string;
  startDate: Date;
  endDate?: Date; // For contractors
  department: string;
  position: string;
  reportingManager: mongoose.Types.ObjectId;
  employmentTypeId: mongoose.Types.ObjectId;
  
  // Compensation
  salaryType: 'hourly' | 'salary' | 'contract';
  hourlyRate?: number;
  annualSalary?: number;
  contractRate?: number; // For contractors
  contractRateType?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'project';
  overtimeEligible: boolean;
  overtimeRate?: number;
  currency: string;
  payrollSchedule: 'weekly' | 'bi_weekly' | 'semi_monthly' | 'monthly';
  
  // Benefits and Entitlements
  benefitsPackage?: {
    healthInsurance: boolean;
    dentalInsurance: boolean;
    visionInsurance: boolean;
    retirementPlan: boolean;
    lifeInsurance: boolean;
    disabilityInsurance: boolean;
    paidTimeOff: boolean;
  };
  
  // Work Arrangement
  workLocation: 'onsite' | 'remote' | 'hybrid';
  workSchedule: {
    type: 'standard' | 'flexible' | 'shift';
    standardHours?: {
      monday: { start: string; end: string; } | null;
      tuesday: { start: string; end: string; } | null;
      wednesday: { start: string; end: string; } | null;
      thursday: { start: string; end: string; } | null;
      friday: { start: string; end: string; } | null;
      saturday: { start: string; end: string; } | null;
      sunday: { start: string; end: string; } | null;
    };
    hoursPerWeek: number;
    timezone: string;
    breakSchedule?: {
      morningBreak?: number; // minutes
      lunchBreak?: number; // minutes
      afternoonBreak?: number; // minutes
    };
  };
  
  // Address Information
  homeAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Emergency Contact
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  
  // Banking Information (for contractors)
  bankingInfo?: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string; // Encrypted
    routingNumber: string; // Encrypted
    accountType: 'checking' | 'savings';
    currency: string;
  };
  
  // Tax Information
  taxInfo?: {
    taxId: string; // SSN, SIN, etc. - Encrypted
    taxResidency: string;
    taxExemptions?: number;
    w4Info?: any; // US-specific
    taxFormPreference: 'electronic' | 'paper';
  };
  
  // Skills and Qualifications
  skills?: string[];
  certifications?: {
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    expiryDate?: Date;
    credentialId?: string;
  }[];
  education?: {
    level: 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate' | 'professional';
    institution: string;
    field: string;
    graduationYear?: number;
    gpa?: number;
  }[];
  
  // Contractor-Specific
  contractorDetails?: {
    businessName?: string;
    businessType: 'individual' | 'llc' | 'corporation' | 'partnership';
    businessTaxId?: string; // EIN - Encrypted
    businessAddress?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    insuranceInfo?: {
      generalLiability: boolean;
      professionalLiability: boolean;
      workersCompensation: boolean;
      policyNumbers?: string[];
      coverageAmount?: number;
    };
    autoClockingPreferences?: {
      enabled: boolean;
      processingMode: 'proactive' | 'reactive' | 'weekly_batch';
      requiresApproval: boolean;
    };
  };
}

export interface IEmployeeInvitation extends Document {
  organizationId: mongoose.Types.ObjectId;
  invitationType: InvitationType;
  
  // Invitation Details
  invitationToken: string; // Unique secure token
  invitationUrl: string;
  invitedBy: mongoose.Types.ObjectId;
  invitedAt: Date;
  expiresAt: Date;
  
  // Employee Information
  employeeDetails: IEmployeeDetails;
  
  // Onboarding Process
  status: InvitationStatus;
  acceptedAt?: Date;
  completedAt?: Date;
  
  // Onboarding Steps Tracking
  onboardingSteps: {
    personalInfo: { completed: boolean; completedAt?: Date; };
    employmentDetails: { completed: boolean; completedAt?: Date; };
    bankingInfo: { completed: boolean; completedAt?: Date; };
    taxInformation: { completed: boolean; completedAt?: Date; };
    workSchedule: { completed: boolean; completedAt?: Date; };
    systemAccess: { completed: boolean; completedAt?: Date; };
    complianceDocuments: { completed: boolean; completedAt?: Date; };
    finalReview: { completed: boolean; completedAt?: Date; };
  };
  
  // Document Collection
  requiredDocuments: {
    type: 'id_document' | 'work_authorization' | 'tax_form' | 'banking_form' | 
          'emergency_contact' | 'handbook_acknowledgment' | 'direct_deposit_form' |
          'i9_form' | 'w4_form' | 'non_disclosure_agreement' | 'employment_contract' |
          'contractor_agreement' | 'insurance_certificate' | 'business_license';
    name: string;
    description: string;
    required: boolean;
    submitted: boolean;
    submittedAt?: Date;
    approved: boolean;
    approvedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    filePath?: string;
    fileName?: string;
    rejectionReason?: string;
  }[];
  
  // System Setup
  systemSetup: {
    pinCreated: boolean;
    profilePhotoUploaded: boolean;
    twoFactorEnabled: boolean;
    notificationPreferences: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    handbookRead: boolean;
    policyAgreements: {
      policyType: string;
      agreed: boolean;
      agreedAt?: Date;
      version: string;
    }[];
  };
  
  // Communication Log
  communicationLog: {
    type: 'invitation_sent' | 'reminder_sent' | 'status_update' | 'document_request' | 'completion_notice';
    method: 'email' | 'sms' | 'system_notification';
    recipient: string;
    subject?: string;
    content: string;
    sentAt: Date;
    delivered: boolean;
    opened?: boolean;
    clickedLink?: boolean;
  }[];
  
  // Approval Workflow
  approvalWorkflow?: {
    requiresHRApproval: boolean;
    hrApproved: boolean;
    hrApprovedBy?: mongoose.Types.ObjectId;
    hrApprovedAt?: Date;
    
    requiresManagerApproval: boolean;
    managerApproved: boolean;
    managerApprovedBy?: mongoose.Types.ObjectId;
    managerApprovedAt?: Date;
    
    requiresFinanceApproval: boolean; // For high-value contracts
    financeApproved: boolean;
    financeApprovedBy?: mongoose.Types.ObjectId;
    financeApprovedAt?: Date;
    
    finalApprovalBy?: mongoose.Types.ObjectId;
    finalApprovalAt?: Date;
  };
  
  // Integration Data
  integrationData?: {
    payrollSystemId?: string;
    hrisSystemId?: string;
    adSystemId?: string; // Active Directory
    slackUserId?: string;
    teams365Id?: string;
    badgeNumber?: string;
    equipmentAssigned?: string[];
  };
  
  // Metrics and Analytics
  metrics: {
    invitationSentAt: Date;
    firstAccessAt?: Date;
    timeToAccept?: number; // Hours
    timeToComplete?: number; // Hours
    stepsCompletionTime: {
      [key: string]: number; // Step name -> completion time in hours
    };
  };
  
  // Security and Compliance
  ipAddresses: string[]; // Track access IPs for security
  deviceInfo: {
    userAgent?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
  }[];
  
  // Notes and Comments
  notes?: {
    author: mongoose.Types.ObjectId;
    content: string;
    type: 'general' | 'hr' | 'manager' | 'system';
    createdAt: Date;
    isPrivate: boolean;
  }[];
  
  // Cancellation/Expiry
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeDetailsSchema = new Schema({
  // Basic Information
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, maxlength: 50 },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: { type: String, trim: true, maxlength: 20 },
  dateOfBirth: { type: Date },
  nationalId: { type: String, trim: true }, // Encrypted
  
  // Employment Details
  employeeId: { type: String, trim: true, maxlength: 20 },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  position: { type: String, required: true, trim: true, maxlength: 100 },
  reportingManager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employmentTypeId: { type: Schema.Types.ObjectId, ref: 'EmploymentType', required: true },
  
  // Compensation
  salaryType: { type: String, enum: ['hourly', 'salary', 'contract'], required: true },
  hourlyRate: { type: Number, min: 0 },
  annualSalary: { type: Number, min: 0 },
  contractRate: { type: Number, min: 0 },
  contractRateType: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly', 'project'] },
  overtimeEligible: { type: Boolean, default: true },
  overtimeRate: { type: Number, min: 1.0, max: 5.0 },
  currency: { type: String, required: true, default: 'USD', maxlength: 3 },
  payrollSchedule: { 
    type: String, 
    enum: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly'],
    required: true
  },
  
  // Work Arrangement
  workLocation: { type: String, enum: ['onsite', 'remote', 'hybrid'], required: true },
  workSchedule: {
    type: { type: String, enum: ['standard', 'flexible', 'shift'], required: true },
    standardHours: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    },
    hoursPerWeek: { type: Number, required: true, min: 1, max: 80 },
    timezone: { type: String, required: true },
    breakSchedule: {
      morningBreak: { type: Number, min: 0, max: 60 },
      lunchBreak: { type: Number, min: 0, max: 120 },
      afternoonBreak: { type: Number, min: 0, max: 60 }
    }
  },
  
  // Contractor-Specific
  contractorDetails: {
    businessName: { type: String, trim: true, maxlength: 200 },
    businessType: { type: String, enum: ['individual', 'llc', 'corporation', 'partnership'] },
    businessTaxId: { type: String, trim: true }, // Encrypted
    autoClockingPreferences: {
      enabled: { type: Boolean, default: false },
      processingMode: { type: String, enum: ['proactive', 'reactive', 'weekly_batch'] },
      requiresApproval: { type: Boolean, default: true }
    }
  }
});

const EmployeeInvitationSchema = new Schema<IEmployeeInvitation>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  invitationType: { 
    type: String, 
    enum: ['employee', 'contractor', 'manager', 'admin'], 
    required: true,
    index: true
  },
  
  // Invitation Details
  invitationToken: { type: String, required: true, unique: true, index: true },
  invitationUrl: { type: String, required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invitedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  
  // Employee Information
  employeeDetails: { type: EmployeeDetailsSchema, required: true },
  
  // Onboarding Process
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'accepted', 'expired', 'cancelled', 'completed'],
    default: 'pending',
    index: true
  },
  acceptedAt: { type: Date },
  completedAt: { type: Date },
  
  // Onboarding Steps
  onboardingSteps: {
    personalInfo: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    employmentDetails: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    bankingInfo: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    taxInformation: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    workSchedule: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    systemAccess: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    complianceDocuments: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    },
    finalReview: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date }
    }
  },
  
  // Required Documents
  requiredDocuments: [{
    type: { 
      type: String, 
      required: true,
      enum: [
        'id_document', 'work_authorization', 'tax_form', 'banking_form',
        'emergency_contact', 'handbook_acknowledgment', 'direct_deposit_form',
        'i9_form', 'w4_form', 'non_disclosure_agreement', 'employment_contract',
        'contractor_agreement', 'insurance_certificate', 'business_license'
      ]
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true },
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date },
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    filePath: { type: String, trim: true },
    fileName: { type: String, trim: true },
    rejectionReason: { type: String, trim: true }
  }],
  
  // System Setup
  systemSetup: {
    pinCreated: { type: Boolean, default: false },
    profilePhotoUploaded: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    handbookRead: { type: Boolean, default: false },
    policyAgreements: [{
      policyType: { type: String, required: true },
      agreed: { type: Boolean, default: false },
      agreedAt: { type: Date },
      version: { type: String, required: true }
    }]
  },
  
  // Communication Log
  communicationLog: [{
    type: { 
      type: String, 
      enum: ['invitation_sent', 'reminder_sent', 'status_update', 'document_request', 'completion_notice'],
      required: true
    },
    method: { type: String, enum: ['email', 'sms', 'system_notification'], required: true },
    recipient: { type: String, required: true },
    subject: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    sentAt: { type: Date, default: Date.now },
    delivered: { type: Boolean, default: false },
    opened: { type: Boolean, default: false },
    clickedLink: { type: Boolean, default: false }
  }],
  
  // Approval Workflow
  approvalWorkflow: {
    requiresHRApproval: { type: Boolean, default: true },
    hrApproved: { type: Boolean, default: false },
    hrApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hrApprovedAt: { type: Date },
    
    requiresManagerApproval: { type: Boolean, default: true },
    managerApproved: { type: Boolean, default: false },
    managerApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    managerApprovedAt: { type: Date },
    
    requiresFinanceApproval: { type: Boolean, default: false },
    financeApproved: { type: Boolean, default: false },
    financeApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    financeApprovedAt: { type: Date },
    
    finalApprovalBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalApprovalAt: { type: Date }
  },
  
  // Metrics
  metrics: {
    invitationSentAt: { type: Date, required: true },
    firstAccessAt: { type: Date },
    timeToAccept: { type: Number }, // Hours
    timeToComplete: { type: Number }, // Hours
    stepsCompletionTime: { type: Map, of: Number }
  },
  
  // Security Tracking
  ipAddresses: [{ type: String, trim: true }],
  deviceInfo: [{
    userAgent: { type: String, trim: true },
    deviceType: { type: String, trim: true },
    browser: { type: String, trim: true },
    os: { type: String, trim: true }
  }],
  
  // Notes
  notes: [{
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    type: { type: String, enum: ['general', 'hr', 'manager', 'system'], default: 'general' },
    createdAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false }
  }],
  
  // Cancellation
  cancelledAt: { type: Date },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, trim: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
EmployeeInvitationSchema.index({ organizationId: 1, status: 1 });
EmployeeInvitationSchema.index({ invitationToken: 1 }, { unique: true });
EmployeeInvitationSchema.index({ expiresAt: 1 });
EmployeeInvitationSchema.index({ 'employeeDetails.email': 1 });
EmployeeInvitationSchema.index({ invitedBy: 1 });
EmployeeInvitationSchema.index({ createdAt: 1 });

// Virtual for completion percentage
EmployeeInvitationSchema.virtual('completionPercentage').get(function(this: IEmployeeInvitation) {
  const steps = Object.values(this.onboardingSteps);
  const completedSteps = steps.filter(step => step.completed).length;
  return Math.round((completedSteps / steps.length) * 100);
});

// Virtual for checking if invitation is expired
EmployeeInvitationSchema.virtual('isExpired').get(function(this: IEmployeeInvitation) {
  return this.expiresAt < new Date();
});

// Virtual for full employee name
EmployeeInvitationSchema.virtual('fullName').get(function(this: IEmployeeInvitation) {
  return `${this.employeeDetails.firstName} ${this.employeeDetails.lastName}`;
});

// Pre-save middleware
EmployeeInvitationSchema.pre('save', function(this: IEmployeeInvitation, next) {
  // Auto-expire if past expiry date
  if (this.expiresAt < new Date() && this.status === 'sent') {
    this.status = 'expired';
  }
  
  // Update completion status
  const allStepsCompleted = Object.values(this.onboardingSteps).every(step => step.completed);
  if (allStepsCompleted && this.status === 'accepted') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  // Calculate metrics
  if (this.acceptedAt && !this.metrics.timeToAccept) {
    this.metrics.timeToAccept = (this.acceptedAt.getTime() - this.metrics.invitationSentAt.getTime()) / (1000 * 60 * 60);
  }
  
  if (this.completedAt && !this.metrics.timeToComplete) {
    this.metrics.timeToComplete = (this.completedAt.getTime() - this.metrics.invitationSentAt.getTime()) / (1000 * 60 * 60);
  }
  
  next();
});

// Static method to generate secure invitation token
EmployeeInvitationSchema.statics.generateInvitationToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Static method to determine required documents based on invitation type
EmployeeInvitationSchema.statics.getRequiredDocuments = function(invitationType: InvitationType, jurisdiction: string) {
  const baseDocuments = [
    { type: 'id_document', name: 'Government-issued ID', description: 'Driver\'s license, passport, or state ID', required: true },
    { type: 'emergency_contact', name: 'Emergency Contact Information', description: 'Primary emergency contact details', required: true },
    { type: 'handbook_acknowledgment', name: 'Employee Handbook Acknowledgment', description: 'Signed acknowledgment of handbook receipt', required: true }
  ];
  
  const employeeDocuments = [
    { type: 'i9_form', name: 'Form I-9 (Employment Eligibility)', description: 'Employment eligibility verification', required: true },
    { type: 'w4_form', name: 'Form W-4 (Tax Withholding)', description: 'Federal tax withholding form', required: true },
    { type: 'direct_deposit_form', name: 'Direct Deposit Authorization', description: 'Banking information for payroll', required: false }
  ];
  
  const contractorDocuments = [
    { type: 'contractor_agreement', name: 'Independent Contractor Agreement', description: 'Signed contractor agreement', required: true },
    { type: 'business_license', name: 'Business License (if applicable)', description: 'Valid business license', required: false },
    { type: 'insurance_certificate', name: 'Certificate of Insurance', description: 'Liability insurance certificate', required: false }
  ];
  
  if (invitationType === 'contractor') {
    return [...baseDocuments, ...contractorDocuments];
  } else {
    return [...baseDocuments, ...employeeDocuments];
  }
};

const EmployeeInvitation = mongoose.model<IEmployeeInvitation>('EmployeeInvitation', EmployeeInvitationSchema);
export default EmployeeInvitation;