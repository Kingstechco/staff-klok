import mongoose, { Document, Schema, Model } from 'mongoose';

export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'overdue' | 'cancelled';
export type ContractorClassification = 
  | 'independent_contractor' // TRUE CONTRACTOR: Issues invoices, own tax/VAT responsibility, no employment benefits
  | 'fixed_term_employee'    // EMPLOYEE: Fixed salary, company handles tax, entitled to benefits per BCEA
  | 'temporary_employee'     // EMPLOYEE: Hourly/daily rate via labor broker, company handles tax, some benefits
  | 'consultant'            // TRUE CONTRACTOR: Project-based independent service provider, issues invoices
  | 'freelancer'            // TRUE CONTRACTOR: Independent service provider, issues invoices
  | 'casual_worker'         // EMPLOYEE: Irregular work, limited benefits, company handles tax
  | 'labour_broker_employee'; // EMPLOYEE: Via TES Act, company handles tax through broker

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitRate: number;
  units: 'hours' | 'days' | 'weeks' | 'months' | 'fixed';
  totalAmount: number;
  vatRate?: number; // South African VAT rate (15% as of 2024)
  vatAmount?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
  timeEntryIds?: mongoose.Types.ObjectId[]; // Link to time entries
}

export interface ICountryTaxInfo {
  country: string; // ISO country code
  vatRegistered: boolean;
  vatNumber?: string;
  taxNumber: string; // Primary tax identification number
  companyRegistrationNumber?: string; // For registered businesses
  companyType: 'sole_proprietor' | 'close_corporation' | 'pty_ltd' | 'individual' | 'llc' | 'corporation' | 'partnership';
  countrySpecificData?: Record<string, any>; // Flexible field for country-specific tax information
}

// Legacy interface for backward compatibility
export interface ISouthAfricanTaxInfo extends ICountryTaxInfo {
  beeLevel?: string; // B-BBEE contribution level
  payeReference?: string; // For employees, not independent contractors
  uifContributor: boolean; // Unemployment Insurance Fund
}

export interface IContractorInvoice extends Document {
  // Basic Information
  organizationId: mongoose.Types.ObjectId;
  contractorId: mongoose.Types.ObjectId;
  contractorClassification: ContractorClassification;
  
  // Invoice Details
  invoiceNumber: string; // Auto-generated sequential number
  invoiceDate: Date;
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  currency: string; // Should be ZAR for South African compliance
  
  // Line Items
  lineItems: IInvoiceLineItem[];
  
  // Totals
  subtotal: number;
  vatAmount: number;
  vatRate: number; // 15% for South Africa
  totalAmount: number;
  
  // Country-specific Tax Compliance
  taxInfo: ICountryTaxInfo;
  
  // Legacy field for backward compatibility
  southAfricanTaxInfo?: ISouthAfricanTaxInfo;
  
  // Payment Terms
  paymentTerms: string; // e.g., "Net 30 days"
  paymentMethod?: 'eft' | 'bank_transfer' | 'cheque' | 'cash';
  bankingDetails?: {
    bankName: string;
    branchCode: string;
    accountNumber: string; // Encrypted
    accountHolderName: string;
    accountType: 'cheque' | 'savings' | 'transmission' | 'business_cheque';
  };
  
  // Status and Approval
  status: InvoiceStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  paidAt?: Date;
  paidAmount?: number;
  
  // Document Management
  pdfPath?: string; // Path to generated PDF
  attachments?: {
    fileName: string;
    filePath: string;
    fileType: string;
    uploadedAt: Date;
    description?: string;
  }[];
  
  // Compliance and Audit
  complianceChecks: {
    vatCalculationVerified: boolean;
    contractorStatusVerified: boolean;
    taxClearanceValid?: boolean;
    taxClearanceExpiryDate?: Date;
    beeComplianceVerified?: boolean;
  };
  
  // Communication Log
  communicationLog: {
    type: 'invoice_submitted' | 'approval_requested' | 'approved' | 'rejected' | 'payment_processed' | 'reminder_sent';
    sentTo: mongoose.Types.ObjectId[];
    subject?: string;
    content: string;
    sentAt: Date;
  }[];
  
  // Metadata
  generatedFromTimesheet: boolean;
  timesheetPeriodId?: mongoose.Types.ObjectId;
  isRecurring: boolean;
  recurringSchedule?: {
    frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
    nextGenerationDate?: Date;
  };
  
  // System Fields
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IContractorInvoiceModel extends Model<IContractorInvoice> {
  generateInvoiceNumber(organizationId: mongoose.Types.ObjectId): Promise<string>;
  canContractorIssueInvoices(contractorClassification: ContractorClassification): boolean;
  isEmployeeUnderSALaw(contractorClassification: ContractorClassification): boolean;
  getContractorComplianceInfo(contractorClassification: ContractorClassification): any;
  calculateTax(subtotal: number, contractorClassification: string, countryCode?: string, additionalParams?: Record<string, any>): any;
  calculateSouthAfricanTax(subtotal: number, vatRegistered: boolean, vatRate?: number): any;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>({
  description: { type: String, required: true, trim: true, maxlength: 500 },
  quantity: { type: Number, required: true, min: 0, max: 10000 },
  unitRate: { type: Number, required: true, min: 0 },
  units: { 
    type: String, 
    required: true,
    enum: ['hours', 'days', 'weeks', 'months', 'fixed']
  },
  totalAmount: { type: Number, required: true, min: 0 },
  vatRate: { type: Number, min: 0, max: 100, default: 15 }, // South African VAT rate
  vatAmount: { type: Number, min: 0 },
  dateRange: {
    from: { type: Date },
    to: { type: Date }
  },
  timeEntryIds: [{ type: Schema.Types.ObjectId, ref: 'TimeEntry' }]
});

const CountryTaxInfoSchema = new Schema<ICountryTaxInfo>({
  country: { 
    type: String, 
    required: true, 
    trim: true, 
    uppercase: true, 
    maxlength: 2,
    default: 'ZA' 
  },
  vatRegistered: { type: Boolean, default: false },
  vatNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(this: ICountryTaxInfo, v: string) {
        if (!v) return true; // Optional field
        
        // Country-specific VAT validation can be implemented here
        // For now, basic validation
        switch (this.country) {
          case 'ZA': // South African VAT number (10 digits starting with 4)
            return /^4\d{9}$/.test(v);
          default:
            return v.length >= 5 && v.length <= 15; // Generic validation
        }
      },
      message: 'Invalid VAT number format for the specified country'
    }
  },
  taxNumber: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(this: ICountryTaxInfo, v: string) {
        // Country-specific tax number validation
        switch (this.country) {
          case 'ZA': // South African tax number (10 digits)
            return /^\d{10}$/.test(v);
          default:
            return v.length >= 5 && v.length <= 20; // Generic validation
        }
      },
      message: 'Invalid tax number format for the specified country'
    }
  },
  companyRegistrationNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(this: ICountryTaxInfo, v: string) {
        if (!v) return true; // Optional field
        
        // Country-specific company registration validation
        switch (this.country) {
          case 'ZA': // South African format
            return /^\d{4}\/\d{6}\/\d{2}$/.test(v);
          default:
            return v.length >= 5 && v.length <= 30; // Generic validation
        }
      },
      message: 'Invalid company registration number format for the specified country'
    }
  },
  companyType: { 
    type: String, 
    required: true,
    enum: ['sole_proprietor', 'close_corporation', 'pty_ltd', 'individual', 'llc', 'corporation', 'partnership']
  },
  countrySpecificData: { type: Schema.Types.Mixed }
});

// Legacy schema for backward compatibility
const SouthAfricanTaxInfoSchema = new Schema<ISouthAfricanTaxInfo>({
  country: { type: String, default: 'ZA' },
  vatRegistered: { type: Boolean, default: false },
  vatNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^4\d{9}$/.test(v);
      },
      message: 'VAT number must be 10 digits starting with 4'
    }
  },
  taxNumber: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^\d{10}$/.test(v);
      },
      message: 'Tax number must be 10 digits'
    }
  },
  companyRegistrationNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^\d{4}\/\d{6}\/\d{2}$/.test(v);
      },
      message: 'Company registration number format invalid (YYYY/NNNNNN/NN)'
    }
  },
  beeLevel: { 
    type: String, 
    trim: true,
    enum: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Non-compliant', '']
  },
  payeReference: { type: String, trim: true },
  uifContributor: { type: Boolean, default: false },
  companyType: { 
    type: String, 
    required: true,
    enum: ['sole_proprietor', 'close_corporation', 'pty_ltd', 'individual']
  },
  countrySpecificData: { type: Schema.Types.Mixed }
});

const ContractorInvoiceSchema = new Schema<IContractorInvoice>({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  contractorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contractorClassification: { 
    type: String, 
    required: true,
    enum: ['independent_contractor', 'fixed_term_employee', 'temporary_employee', 'consultant', 'freelancer', 'casual_worker', 'labour_broker_employee'],
    index: true
  },
  
  // Invoice Details
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    index: true
  },
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  currency: { type: String, required: true, default: 'ZAR', maxlength: 3 },
  
  // Line Items
  lineItems: [InvoiceLineItemSchema],
  
  // Totals
  subtotal: { type: Number, required: true, min: 0 },
  vatAmount: { type: Number, required: true, min: 0 },
  vatRate: { type: Number, required: true, min: 0, max: 100, default: 15 },
  totalAmount: { type: Number, required: true, min: 0 },
  
  // Country-specific Tax Compliance
  taxInfo: { type: CountryTaxInfoSchema, required: true },
  
  // Legacy field for backward compatibility
  southAfricanTaxInfo: { type: SouthAfricanTaxInfoSchema },
  
  // Payment Terms
  paymentTerms: { type: String, required: true, default: 'Net 30 days', maxlength: 200 },
  paymentMethod: { type: String, enum: ['eft', 'bank_transfer', 'cheque', 'cash'] },
  bankingDetails: {
    bankName: { type: String, trim: true, maxlength: 100 },
    branchCode: { type: String, trim: true, maxlength: 10 },
    accountNumber: { type: String, trim: true }, // Encrypted
    accountHolderName: { type: String, trim: true, maxlength: 100 },
    accountType: { 
      type: String, 
      enum: ['cheque', 'savings', 'transmission', 'business_cheque']
    }
  },
  
  // Status and Approval
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'pending', 'approved', 'rejected', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
    index: true
  },
  submittedAt: { type: Date },
  approvedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, trim: true, maxlength: 500 },
  paidAt: { type: Date },
  paidAmount: { type: Number, min: 0 },
  
  // Document Management
  pdfPath: { type: String, trim: true },
  attachments: [{
    fileName: { type: String, required: true, trim: true },
    filePath: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String, trim: true, maxlength: 200 }
  }],
  
  // Compliance and Audit
  complianceChecks: {
    vatCalculationVerified: { type: Boolean, default: false },
    contractorStatusVerified: { type: Boolean, default: false },
    taxClearanceValid: { type: Boolean },
    taxClearanceExpiryDate: { type: Date },
    beeComplianceVerified: { type: Boolean }
  },
  
  // Communication Log
  communicationLog: [{
    type: { 
      type: String, 
      enum: ['invoice_submitted', 'approval_requested', 'approved', 'rejected', 'payment_processed', 'reminder_sent'],
      required: true
    },
    sentTo: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    subject: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    sentAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  generatedFromTimesheet: { type: Boolean, default: false },
  timesheetPeriodId: { type: Schema.Types.ObjectId, ref: 'TimesheetPeriod' },
  isRecurring: { type: Boolean, default: false },
  recurringSchedule: {
    frequency: { type: String, enum: ['weekly', 'bi_weekly', 'monthly', 'quarterly'] },
    nextGenerationDate: { type: Date }
  },
  
  // System Fields
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound Indexes
ContractorInvoiceSchema.index({ organizationId: 1, contractorId: 1, invoiceDate: -1 });
ContractorInvoiceSchema.index({ status: 1, dueDate: 1 });
ContractorInvoiceSchema.index({ periodStart: 1, periodEnd: 1 });

// Virtual for determining if invoice is overdue
ContractorInvoiceSchema.virtual('isOverdue').get(function(this: IContractorInvoice) {
  return this.dueDate < new Date() && ['pending', 'approved'].includes(this.status);
});

// Virtual for days until due/overdue
ContractorInvoiceSchema.virtual('daysUntilDue').get(function(this: IContractorInvoice) {
  const today = new Date();
  const diffTime = this.dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual to check if contractor can issue invoices based on SA labor law
ContractorInvoiceSchema.virtual('canIssueInvoices').get(function(this: IContractorInvoice) {
  // Only TRUE contractors can issue invoices per SA Income Tax Act and Labour Relations Act
  const trueContractorTypes = ['independent_contractor', 'freelancer', 'consultant'];
  return trueContractorTypes.includes(this.contractorClassification);
});

// Virtual to check if this is an employee relationship (not allowed to issue invoices)
ContractorInvoiceSchema.virtual('isEmployeeRelationship').get(function(this: IContractorInvoice) {
  // These are all employee relationships under SA labor law - no invoices allowed
  const employeeTypes = ['fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'];
  return employeeTypes.includes(this.contractorClassification);
});

// Pre-save middleware
ContractorInvoiceSchema.pre('save', function(this: IContractorInvoice, next) {
  // CRITICAL: Enforce South African labor law - only TRUE contractors can issue invoices
  const trueContractorTypes = ['independent_contractor', 'freelancer', 'consultant'];
  const employeeTypes = ['fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'];
  
  if (!trueContractorTypes.includes(this.contractorClassification)) {
    if (employeeTypes.includes(this.contractorClassification)) {
      return next(new Error(
        `South African Labor Law Violation: ${this.contractorClassification} workers are EMPLOYEES, not contractors. ` +
        `They cannot issue invoices and must be paid salary/wages with PAYE tax deduction, UIF contributions, ` +
        `and are entitled to BCEA benefits. Use timesheet system instead of invoices.`
      ));
    } else {
      return next(new Error(
        'Only independent contractors, freelancers, and consultants can issue invoices. ' +
        'Other worker types must use the timesheet and payroll system.'
      ));
    }
  }
  
  // Calculate totals
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.totalAmount, 0);
  
  // Calculate VAT only if VAT registered
  const taxInfo = this.taxInfo || this.southAfricanTaxInfo; // Support both new and legacy fields
  if (taxInfo?.vatRegistered) {
    this.vatAmount = (this.subtotal * this.vatRate) / 100;
    this.totalAmount = this.subtotal + this.vatAmount;
  } else {
    this.vatAmount = 0;
    this.totalAmount = this.subtotal;
  }
  
  // Set due date if not provided (default 30 days)
  if (!this.dueDate) {
    this.dueDate = new Date(this.invoiceDate);
    this.dueDate.setDate(this.dueDate.getDate() + 30);
  }
  
  // Update status to overdue if past due date
  if (this.dueDate < new Date() && this.status === 'approved') {
    this.status = 'overdue';
  }
  
  // Validate VAT number if VAT registered
  const validationTaxInfo = this.taxInfo || this.southAfricanTaxInfo; // Support both new and legacy fields
  if (validationTaxInfo?.vatRegistered && !validationTaxInfo.vatNumber) {
    return next(new Error('VAT number required for VAT registered contractors'));
  }
  
  next();
});

// Pre-validate middleware for country-specific compliance
ContractorInvoiceSchema.pre('validate', function(this: IContractorInvoice, next) {
  const taxInfo = this.taxInfo || this.southAfricanTaxInfo; // Support both new and legacy fields
  
  if (!taxInfo) {
    return next(new Error('Tax information is required'));
  }
  
  // Country-specific validations
  if (taxInfo.country === 'ZA') {
    // South African specific validations
    if (this.currency !== 'ZAR') {
      return next(new Error('Currency must be ZAR for South African tax compliance'));
    }
    
    if (this.vatRate !== 15 && taxInfo.vatRegistered) {
      return next(new Error('South African VAT rate must be 15%'));
    }
  }
  
  // Generic validation: currency should match the expected currency for the country
  // This could be extended with a mapping of countries to currencies
  
  next();
});

// Static method to generate invoice number
ContractorInvoiceSchema.statics.generateInvoiceNumber = async function(organizationId: mongoose.Types.ObjectId) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Find the highest invoice number for this year
  const lastInvoice = await this.findOne({
    organizationId,
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ invoiceNumber: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
};

// Static method to validate contractor eligibility for invoicing per SA labor law
ContractorInvoiceSchema.statics.canContractorIssueInvoices = function(contractorClassification: ContractorClassification) {
  // South African labor law: Only true independent contractors can issue invoices
  const trueContractorTypes = ['independent_contractor', 'freelancer', 'consultant'];
  return trueContractorTypes.includes(contractorClassification);
};

// Static method to check if worker classification requires employee treatment
ContractorInvoiceSchema.statics.isEmployeeUnderSALaw = function(contractorClassification: ContractorClassification) {
  // These classifications are considered employees under SA Labour Relations Act and BCEA
  const employeeTypes = ['fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'];
  return employeeTypes.includes(contractorClassification);
};

// Static method to get compliance explanation for contractor type
ContractorInvoiceSchema.statics.getContractorComplianceInfo = function(contractorClassification: ContractorClassification) {
  const complianceInfo = {
    'independent_contractor': {
      canIssueInvoices: true,
      isEmployee: false,
      taxResponsibility: 'Self-responsible for income tax and VAT (if registered)',
      benefitsEntitled: 'No BCEA benefits - truly independent',
      paymentMethod: 'Invoice-based payments',
      laborLawCompliance: 'Not covered by BCEA - commercial relationship'
    },
    'freelancer': {
      canIssueInvoices: true,
      isEmployee: false,
      taxResponsibility: 'Self-responsible for income tax and VAT (if registered)',
      benefitsEntitled: 'No BCEA benefits - independent service provider',
      paymentMethod: 'Invoice-based payments',
      laborLawCompliance: 'Commercial service agreement - not employment'
    },
    'consultant': {
      canIssueInvoices: true,
      isEmployee: false,
      taxResponsibility: 'Self-responsible for income tax and VAT (if registered)',
      benefitsEntitled: 'No BCEA benefits - professional service provider',
      paymentMethod: 'Invoice-based payments',
      laborLawCompliance: 'Professional services agreement - not employment'
    },
    'fixed_term_employee': {
      canIssueInvoices: false,
      isEmployee: true,
      taxResponsibility: 'Company deducts PAYE, UIF, and other statutory contributions',
      benefitsEntitled: 'Full BCEA benefits: annual leave, sick leave, overtime, etc.',
      paymentMethod: 'Salary/wage payments through payroll',
      laborLawCompliance: 'Protected under BCEA and Labour Relations Act'
    },
    'temporary_employee': {
      canIssueInvoices: false,
      isEmployee: true,
      taxResponsibility: 'Company or TES deducts PAYE, UIF, and statutory contributions',
      benefitsEntitled: 'Prorated BCEA benefits based on service duration',
      paymentMethod: 'Wage payments through payroll system',
      laborLawCompliance: 'Protected under TES Act and BCEA after qualifying period'
    },
    'casual_worker': {
      canIssueInvoices: false,
      isEmployee: true,
      taxResponsibility: 'Company deducts PAYE if earnings exceed threshold',
      benefitsEntitled: 'Limited BCEA benefits after 4 months service',
      paymentMethod: 'Wage payments, not invoices',
      laborLawCompliance: 'Protected under BCEA after qualifying period'
    },
    'labour_broker_employee': {
      canIssueInvoices: false,
      isEmployee: true,
      taxResponsibility: 'Labour broker handles PAYE, UIF, and statutory deductions',
      benefitsEntitled: 'Full BCEA benefits through labour broker arrangement',
      paymentMethod: 'Wages through labour broker payroll',
      laborLawCompliance: 'Protected under TES Act - client and broker jointly liable'
    }
  };

  return complianceInfo[contractorClassification] || {
    canIssueInvoices: false,
    isEmployee: false,
    taxResponsibility: 'Consult legal advice',
    benefitsEntitled: 'Consult legal advice',
    paymentMethod: 'Consult legal advice',
    laborLawCompliance: 'Classification unclear - legal review required'
  };
};

// Static method to calculate tax implications for any country
ContractorInvoiceSchema.statics.calculateTax = function(
  subtotal: number, 
  contractorClassification: string,
  countryCode: string = 'ZA',
  additionalParams: Record<string, any> = {}
) {
  try {
    const { ComplianceProviderFactory } = require('../services/ComplianceProviderFactory');
    const provider = ComplianceProviderFactory.getProvider(countryCode);
    return provider.calculateContractorTax(subtotal, contractorClassification, additionalParams);
  } catch (error) {
    // Fallback to basic calculation if country provider not available
    const vatRegistered = additionalParams.vatRegistered || false;
    const vatRate = additionalParams.vatRate || 0;
    
    let vatAmount = 0;
    let totalAmount = subtotal;
    
    if (vatRegistered) {
      vatAmount = (subtotal * vatRate) / 100;
      totalAmount = subtotal + vatAmount;
    }
    
    return {
      subtotal,
      vatAmount,
      vatRate: vatRegistered ? vatRate : 0,
      totalAmount,
      taxImplications: {
        contractorResponsible: vatRegistered ? 'VAT registration and returns' : 'Income tax only',
        organizationResponsible: 'Tax obligations vary by jurisdiction',
        requiredCertificates: ['Tax compliance certificate']
      }
    };
  }
};

// Legacy method for backward compatibility
ContractorInvoiceSchema.statics.calculateSouthAfricanTax = function(
  subtotal: number, 
  vatRegistered: boolean, 
  vatRate: number = 15
) {
  return (this as any).calculateTax(subtotal, 'independent_contractor', 'ZA', { vatRegistered, vatRate });
};

const ContractorInvoice = mongoose.model<IContractorInvoice, IContractorInvoiceModel>('ContractorInvoice', ContractorInvoiceSchema);
export default ContractorInvoice;