import mongoose, { Document, Schema } from 'mongoose';

export type OrganizationType = 
  | 'corporation' 
  | 'llc' 
  | 'partnership' 
  | 'sole_proprietorship' 
  | 'nonprofit' 
  | 'ngo' 
  | 'government' 
  | 'educational' 
  | 'healthcare'
  | 'trust'
  | 'cooperative';

export type OrganizationStatus = 
  | 'pending_verification' 
  | 'documents_required' 
  | 'under_review' 
  | 'additional_info_required'
  | 'approved' 
  | 'suspended' 
  | 'rejected' 
  | 'terminated';

export type DocumentType = 
  | 'certificate_of_incorporation'
  | 'business_license'
  | 'tax_registration'
  | 'employer_identification'
  | 'articles_of_association'
  | 'memorandum_of_association'
  | 'nonprofit_determination_letter'
  | 'government_authorization'
  | 'professional_license'
  | 'insurance_certificate'
  | 'bank_statement'
  | 'utility_bill'
  | 'directors_resolution'
  | 'beneficial_ownership_disclosure'
  // South African specific documents
  | 'vat_registration_certificate'
  | 'paye_registration'
  | 'uif_registration'
  | 'sdl_registration'
  | 'workermens_compensation_certificate'
  | 'municipal_trading_license'
  | 'bee_certificate'
  | 'id_document'
  | 'business_registration'
  | 'constitution'
  | 'board_resolution'
  | 'funding_agreements'
  | 'trust_deed'
  | 'trustees_resolution';

export interface IOrganizationDocument {
  type: DocumentType;
  fileName: string;
  filePath: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  expiryDate?: Date;
  documentNumber?: string;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isVerified: boolean;
  verificationMethod?: 'utility_bill' | 'bank_statement' | 'government_record';
  verifiedAt?: Date;
}

export interface IBeneficialOwner {
  name: string;
  title: string;
  ownershipPercentage: number;
  dateOfBirth: Date;
  nationalId: string;
  address: IAddress;
  isSignatory: boolean;
  isPoliticallyExposed: boolean;
  sanctionsCheck: {
    checked: boolean;
    checkedAt?: Date;
    status: 'clear' | 'flagged' | 'pending';
    details?: string;
  };
}

export interface IAuthorizedSignatory {
  userId: mongoose.Types.ObjectId;
  name: string;
  title: string;
  email: string;
  phone: string;
  authorizedActions: string[];
  isActive: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  idVerification: {
    documentType: 'passport' | 'drivers_license' | 'national_id';
    documentNumber: string;
    verified: boolean;
    verifiedAt?: Date;
  };
}

export interface IFinancialInformation {
  estimatedAnnualRevenue: number;
  numberOfEmployees: number;
  payrollFrequency: 'weekly' | 'bi_weekly' | 'semi_monthly' | 'monthly';
  currency: string;
  bankAccount: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string; // Encrypted
    routingNumber: string; // Encrypted
    iban?: string; // Encrypted
    swiftCode?: string;
    verified: boolean;
    verificationMethod?: 'micro_deposits' | 'instant_verification' | 'bank_statement';
    verifiedAt?: Date;
  };
  taxInformation: {
    taxId: string; // EIN, ABN, VAT Number, etc.
    taxIdType: 'ein' | 'ssn' | 'abn' | 'vat' | 'gst' | 'other';
    taxJurisdiction: string;
    taxExempt: boolean;
    taxExemptionNumber?: string;
  };
}

export interface IComplianceCheck {
  type: 'sanctions' | 'pep' | 'adverse_media' | 'business_registry' | 'credit_check';
  status: 'pending' | 'clear' | 'flagged' | 'error';
  checkedAt: Date;
  provider: string; // e.g., 'WorldCheck', 'Refinitiv', 'LexisNexis'
  score?: number;
  details?: string;
  expiresAt?: Date;
}

export interface IRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: {
    industryRisk: number; // 1-10
    geographicRisk: number; // 1-10
    ownershipRisk: number; // 1-10
    transactionRisk: number; // 1-10
    complianceRisk: number; // 1-10
  };
  calculatedAt: Date;
  reviewRequiredAt: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  notes?: string;
}

export interface IOrganization extends Document {
  // Basic Information
  legalName: string;
  tradingName?: string;
  organizationType: OrganizationType;
  industryCode: string; // NAICS, SIC, or similar
  industryDescription: string;
  incorporationDate?: Date;
  incorporationJurisdiction?: string;
  registrationNumber: string; // Company registration number
  
  // Contact Information
  businessAddress: IAddress;
  mailingAddress?: IAddress;
  website?: string;
  phone: string;
  email: string;
  
  // Ownership & Control
  beneficialOwners: IBeneficialOwner[];
  authorizedSignatories: IAuthorizedSignatory[];
  parentOrganization?: mongoose.Types.ObjectId;
  subsidiaries: mongoose.Types.ObjectId[];
  
  // Financial Information
  financialInfo: IFinancialInformation;
  
  // Legal & Compliance
  documents: IOrganizationDocument[];
  complianceChecks: IComplianceCheck[];
  riskAssessment: IRiskAssessment;
  
  // Verification Status
  status: OrganizationStatus;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  verificationStartedAt: Date;
  verificationCompletedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  
  // Required Document Checklist
  requiredDocuments: DocumentType[];
  submittedDocuments: DocumentType[];
  verifiedDocuments: DocumentType[];
  
  // Subscription & Billing
  subscriptionPlan: 'starter' | 'professional' | 'enterprise' | 'custom';
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  maxEmployees: number;
  maxContractors: number;
  features: string[];
  
  // Operational Settings
  timezone: string;
  locale: string;
  currency: string;
  dateFormat: string;
  workweekStart: number; // 0 = Sunday, 1 = Monday
  
  // Security & Access
  twoFactorRequired: boolean;
  ipWhitelist: string[];
  ssoEnabled: boolean;
  ssoProvider?: string;
  dataRetentionPolicy: number; // Years
  
  // Monitoring & Alerts
  suspiciousActivityFlags: {
    flag: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
    notes?: string;
  }[];
  
  // System Fields
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: mongoose.Types.ObjectId;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  lastReviewedAt?: Date;
  nextReviewDue?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>({
  street: { type: String, required: true, trim: true, maxlength: 200 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  state: { type: String, required: true, trim: true, maxlength: 100 },
  postalCode: { type: String, required: true, trim: true, maxlength: 20 },
  country: { type: String, required: true, trim: true, maxlength: 100 },
  isVerified: { type: Boolean, default: false },
  verificationMethod: { 
    type: String, 
    enum: ['utility_bill', 'bank_statement', 'government_record'] 
  },
  verifiedAt: { type: Date }
});

const BeneficialOwnerSchema = new Schema<IBeneficialOwner>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  ownershipPercentage: { type: Number, required: true, min: 0, max: 100 },
  dateOfBirth: { type: Date, required: true },
  nationalId: { type: String, required: true, trim: true }, // Encrypted
  address: { type: AddressSchema, required: true },
  isSignatory: { type: Boolean, default: false },
  isPoliticallyExposed: { type: Boolean, default: false },
  sanctionsCheck: {
    checked: { type: Boolean, default: false },
    checkedAt: { type: Date },
    status: { type: String, enum: ['clear', 'flagged', 'pending'], default: 'pending' },
    details: { type: String, trim: true }
  }
});

const AuthorizedSignatorySchema = new Schema<IAuthorizedSignatory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  authorizedActions: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  idVerification: {
    documentType: { 
      type: String, 
      enum: ['passport', 'drivers_license', 'national_id'],
      required: true
    },
    documentNumber: { type: String, required: true, trim: true }, // Encrypted
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  }
});

const OrganizationDocumentSchema = new Schema<IOrganizationDocument>({
  type: { 
    type: String, 
    required: true,
    enum: [
      'certificate_of_incorporation',
      'business_license',
      'tax_registration',
      'employer_identification',
      'articles_of_association',
      'memorandum_of_association',
      'nonprofit_determination_letter',
      'government_authorization',
      'professional_license',
      'insurance_certificate',
      'bank_statement',
      'utility_bill',
      'directors_resolution',
      'beneficial_ownership_disclosure',
      // South African specific documents
      'vat_registration_certificate',
      'paye_registration',
      'uif_registration',
      'sdl_registration',
      'workermens_compensation_certificate',
      'municipal_trading_license',
      'bee_certificate',
      'id_document',
      'business_registration',
      'constitution',
      'board_resolution',
      'funding_agreements',
      'trust_deed',
      'trustees_resolution'
    ]
  },
  fileName: { type: String, required: true, trim: true },
  filePath: { type: String, required: true, trim: true }, // Encrypted storage path
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, trim: true },
  expiryDate: { type: Date },
  documentNumber: { type: String, trim: true }
});

const ComplianceCheckSchema = new Schema<IComplianceCheck>({
  type: { 
    type: String, 
    required: true,
    enum: ['sanctions', 'pep', 'adverse_media', 'business_registry', 'credit_check']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'clear', 'flagged', 'error'],
    default: 'pending'
  },
  checkedAt: { type: Date, default: Date.now },
  provider: { type: String, required: true, trim: true },
  score: { type: Number, min: 0, max: 100 },
  details: { type: String, trim: true },
  expiresAt: { type: Date }
});

const OrganizationSchema = new Schema<IOrganization>({
  // Basic Information
  legalName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 200,
    index: true 
  },
  tradingName: { type: String, trim: true, maxlength: 200 },
  organizationType: { 
    type: String, 
    required: true,
    enum: [
      'corporation', 'llc', 'partnership', 'sole_proprietorship', 
      'nonprofit', 'ngo', 'government', 'educational', 'healthcare',
      'trust', 'cooperative'
    ],
    index: true
  },
  industryCode: { type: String, required: true, trim: true, maxlength: 20 },
  industryDescription: { type: String, required: true, trim: true, maxlength: 200 },
  incorporationDate: { type: Date },
  incorporationJurisdiction: { type: String, trim: true, maxlength: 100 },
  registrationNumber: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50,
    index: { unique: true, sparse: true }
  },
  
  // Contact Information
  businessAddress: { type: AddressSchema, required: true },
  mailingAddress: { type: AddressSchema },
  website: { type: String, trim: true, maxlength: 200 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    index: true
  },
  
  // Ownership & Control
  beneficialOwners: [BeneficialOwnerSchema],
  authorizedSignatories: [AuthorizedSignatorySchema],
  parentOrganization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  subsidiaries: [{ type: Schema.Types.ObjectId, ref: 'Organization' }],
  
  // Financial Information
  financialInfo: {
    estimatedAnnualRevenue: { type: Number, required: true, min: 0 },
    numberOfEmployees: { type: Number, required: true, min: 1, max: 100000 },
    payrollFrequency: { 
      type: String, 
      required: true,
      enum: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly'],
      default: 'bi_weekly'
    },
    currency: { type: String, required: true, default: 'USD', maxlength: 3 },
    bankAccount: {
      accountHolderName: { type: String, required: true, trim: true },
      bankName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true }, // Encrypted
      routingNumber: { type: String, required: true }, // Encrypted
      iban: { type: String }, // Encrypted
      swiftCode: { type: String, trim: true },
      verified: { type: Boolean, default: false },
      verificationMethod: { 
        type: String, 
        enum: ['micro_deposits', 'instant_verification', 'bank_statement'] 
      },
      verifiedAt: { type: Date }
    },
    taxInformation: {
      taxId: { type: String, required: true, trim: true }, // Encrypted
      taxIdType: { 
        type: String, 
        required: true,
        enum: ['ein', 'ssn', 'abn', 'vat', 'gst', 'other']
      },
      taxJurisdiction: { type: String, required: true, trim: true },
      taxExempt: { type: Boolean, default: false },
      taxExemptionNumber: { type: String, trim: true }
    }
  },
  
  // Legal & Compliance
  documents: [OrganizationDocumentSchema],
  complianceChecks: [ComplianceCheckSchema],
  riskAssessment: {
    overallRisk: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    riskFactors: {
      industryRisk: { type: Number, min: 1, max: 10, default: 5 },
      geographicRisk: { type: Number, min: 1, max: 10, default: 5 },
      ownershipRisk: { type: Number, min: 1, max: 10, default: 5 },
      transactionRisk: { type: Number, min: 1, max: 10, default: 5 },
      complianceRisk: { type: Number, min: 1, max: 10, default: 5 }
    },
    calculatedAt: { type: Date, default: Date.now },
    reviewRequiredAt: { type: Date, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }
  },
  
  // Verification Status
  status: { 
    type: String, 
    required: true,
    enum: [
      'pending_verification', 'documents_required', 'under_review', 
      'additional_info_required', 'approved', 'suspended', 'rejected', 'terminated'
    ],
    default: 'pending_verification',
    index: true
  },
  verificationLevel: { 
    type: String, 
    enum: ['basic', 'enhanced', 'premium'],
    default: 'basic'
  },
  verificationStartedAt: { type: Date, default: Date.now },
  verificationCompletedAt: { type: Date },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Required Document Checklist
  requiredDocuments: [{ 
    type: String, 
    enum: [
      'certificate_of_incorporation', 'business_license', 'tax_registration',
      'employer_identification', 'articles_of_association', 'memorandum_of_association',
      'nonprofit_determination_letter', 'government_authorization', 'professional_license',
      'insurance_certificate', 'bank_statement', 'utility_bill', 'directors_resolution',
      'beneficial_ownership_disclosure'
    ]
  }],
  submittedDocuments: [{ type: String }],
  verifiedDocuments: [{ type: String }],
  
  // Subscription & Billing
  subscriptionPlan: { 
    type: String, 
    enum: ['starter', 'professional', 'enterprise', 'custom'],
    default: 'starter'
  },
  billingCycle: { 
    type: String, 
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  maxEmployees: { type: Number, default: 50 },
  maxContractors: { type: Number, default: 10 },
  features: [{ type: String, trim: true }],
  
  // Operational Settings
  timezone: { type: String, default: 'America/New_York' },
  locale: { type: String, default: 'en-US' },
  currency: { type: String, default: 'USD' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  workweekStart: { type: Number, min: 0, max: 6, default: 1 }, // Monday
  
  // Security & Access
  twoFactorRequired: { type: Boolean, default: false },
  ipWhitelist: [{ type: String, trim: true }],
  ssoEnabled: { type: Boolean, default: false },
  ssoProvider: { type: String, trim: true },
  dataRetentionPolicy: { type: Number, default: 7 }, // Years
  
  // Monitoring & Alerts
  suspiciousActivityFlags: [{
    flag: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    detectedAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    notes: { type: String, trim: true }
  }],
  
  // System Fields
  isActive: { type: Boolean, default: true, index: true },
  isSuspended: { type: Boolean, default: false, index: true },
  suspensionReason: { type: String, trim: true },
  suspendedAt: { type: Date },
  suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Metadata
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastReviewedAt: { type: Date },
  nextReviewDue: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and uniqueness
OrganizationSchema.index({ registrationNumber: 1, incorporationJurisdiction: 1 }, { unique: true });
OrganizationSchema.index({ 'financialInfo.taxInformation.taxId': 1 }, { unique: true });
OrganizationSchema.index({ status: 1, isActive: 1 });
OrganizationSchema.index({ 'riskAssessment.overallRisk': 1 });
OrganizationSchema.index({ nextReviewDue: 1 });
OrganizationSchema.index({ createdAt: 1 });

// Virtual for getting verification completion percentage
OrganizationSchema.virtual('verificationProgress').get(function(this: IOrganization) {
  if (this.requiredDocuments.length === 0) return 100;
  return Math.round((this.verifiedDocuments.length / this.requiredDocuments.length) * 100);
});

// Virtual for determining if organization needs review
OrganizationSchema.virtual('needsReview').get(function(this: IOrganization) {
  return this.nextReviewDue && this.nextReviewDue <= new Date();
});

// Virtual for calculating overall compliance score
OrganizationSchema.virtual('complianceScore').get(function(this: IOrganization) {
  const factors = this.riskAssessment.riskFactors;
  const totalRisk = factors.industryRisk + factors.geographicRisk + 
                   factors.ownershipRisk + factors.transactionRisk + factors.complianceRisk;
  const averageRisk = totalRisk / 5;
  return Math.max(0, 100 - (averageRisk * 10)); // Convert to compliance score (0-100)
});

// Pre-save middleware
OrganizationSchema.pre('save', function(this: IOrganization, next) {
  // Update the updatedAt field
  this.updatedAt = new Date();
  
  // Set next review date based on risk level
  if (this.isNew || this.isModified('riskAssessment.overallRisk')) {
    const monthsUntilReview = this.riskAssessment.overallRisk === 'low' ? 12 : 
                             this.riskAssessment.overallRisk === 'medium' ? 6 : 3;
    this.nextReviewDue = new Date();
    this.nextReviewDue.setMonth(this.nextReviewDue.getMonth() + monthsUntilReview);
  }
  
  // Update document tracking arrays
  this.submittedDocuments = this.documents.map(doc => doc.type);
  this.verifiedDocuments = this.documents.filter(doc => doc.verified).map(doc => doc.type);
  
  // Auto-update verification status based on document completion
  const completionRate = this.requiredDocuments.length === 0 ? 100 : 
    Math.round((this.verifiedDocuments.length / this.requiredDocuments.length) * 100);
  if (completionRate === 100 && this.status === 'documents_required') {
    this.status = 'under_review';
  } else if (completionRate < 100 && this.status === 'under_review') {
    this.status = 'documents_required';
  }
  
  next();
});

// Static method to determine required documents based on organization type
OrganizationSchema.statics.getRequiredDocuments = function(organizationType: OrganizationType, jurisdiction: string) {
  const baseDocuments: DocumentType[] = [
    'certificate_of_incorporation',
    'tax_registration',
    'business_license',
    'bank_statement',
    'utility_bill'
  ];
  
  const typeSpecificDocuments: Partial<Record<OrganizationType, DocumentType[]>> = {
    corporation: ['articles_of_association', 'directors_resolution', 'beneficial_ownership_disclosure'],
    llc: ['articles_of_association', 'beneficial_ownership_disclosure'],
    nonprofit: ['nonprofit_determination_letter', 'articles_of_association'],
    ngo: ['nonprofit_determination_letter', 'articles_of_association'],
    government: ['government_authorization'],
    healthcare: ['professional_license', 'insurance_certificate'],
    educational: ['government_authorization', 'insurance_certificate']
  };
  
  return [...baseDocuments, ...(typeSpecificDocuments[organizationType] || [])];
};

// Static method to calculate risk score
OrganizationSchema.statics.calculateRiskScore = function(orgData: any) {
  let industryRisk = 5; // Default medium risk
  let geographicRisk = 5;
  let ownershipRisk = 5;
  
  // Industry-based risk
  const highRiskIndustries = ['cryptocurrency', 'money_services', 'gambling', 'adult_entertainment'];
  const lowRiskIndustries = ['education', 'healthcare', 'government', 'nonprofit'];
  
  if (highRiskIndustries.includes(orgData.industryCode)) industryRisk = 8;
  else if (lowRiskIndustries.includes(orgData.industryCode)) industryRisk = 2;
  
  // Geographic risk (simplified - would use actual country risk ratings)
  const highRiskCountries = ['AF', 'KP', 'IR', 'SY'];
  const lowRiskCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR'];
  
  if (highRiskCountries.includes(orgData.businessAddress?.country)) geographicRisk = 9;
  else if (lowRiskCountries.includes(orgData.businessAddress?.country)) geographicRisk = 2;
  
  // Ownership complexity risk
  if (orgData.beneficialOwners?.length > 5) ownershipRisk += 2;
  if (orgData.beneficialOwners?.some((owner: any) => owner.isPoliticallyExposed)) ownershipRisk += 3;
  
  const averageRisk = (industryRisk + geographicRisk + ownershipRisk) / 3;
  const overallRisk = averageRisk <= 3 ? 'low' : averageRisk <= 6 ? 'medium' : 'high';
  
  return {
    overallRisk,
    riskFactors: {
      industryRisk,
      geographicRisk,
      ownershipRisk,
      transactionRisk: 5,
      complianceRisk: 5
    }
  };
};

const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
export default Organization;