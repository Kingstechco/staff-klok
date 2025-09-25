import mongoose, { Document, Schema } from 'mongoose';

export interface IEmploymentType extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string; // e.g., 'FT_PERM', 'PT_FLEX', 'FT_CONTRACT'
  category: 'permanent' | 'contract' | 'temporary' | 'intern' | 'consultant';
  classification: 'full_time' | 'part_time' | 'casual' | 'seasonal';
  
  // Work hour regulations
  workHourRules: {
    standardHoursPerWeek: number; // e.g., 40, 45, 37.5
    maxHoursPerDay: number; // e.g., 8, 9, 10
    maxHoursPerWeek: number; // e.g., 48, 50, 60
    minHoursPerWeek?: number; // For part-time minimums
    overtimeThreshold: {
      daily?: number; // Hours per day before overtime
      weekly?: number; // Hours per week before overtime
    };
    overtimeRates: {
      standardOvertime: number; // e.g., 1.5x for first 2 hours
      premiumOvertime?: number; // e.g., 2.0x for hours beyond threshold
      weekendRate?: number; // e.g., 1.5x for weekend work
      holidayRate?: number; // e.g., 2.0x for holiday work
    };
  };
  
  // Break and rest period requirements
  breakRules: {
    minBreakDuration: number; // Minutes
    maxWorkWithoutBreak: number; // Hours before break required
    lunchBreakRequired: boolean;
    lunchBreakDuration?: number; // Minutes
    restBetweenShifts: number; // Hours required between shifts
  };
  
  // Scheduling constraints
  schedulingRules: {
    maxConsecutiveDays: number; // Max days worked in a row
    minRestDaysPerWeek: number; // Minimum days off per week
    advanceNoticeRequired: number; // Hours notice for schedule changes
    flexibleScheduling: boolean; // Can work flexible hours
    remoteWorkAllowed: boolean;
    
    // Shift timing constraints
    earliestStartTime?: string; // '06:00'
    latestEndTime?: string; // '22:00'
    nightShiftAllowed: boolean;
    weekendWorkAllowed: boolean;
    holidayWorkAllowed: boolean;
  };
  
  // Benefits and entitlements
  entitlements: {
    paidTimeOff: {
      annualLeaveDays: number;
      sickLeaveDays: number;
      personalLeaveDays: number;
      parentalLeaveDays?: number;
      studyLeaveDays?: number;
    };
    
    // Health and safety
    healthInsurance: boolean;
    workersCompensation: boolean;
    retirementPlan: boolean;
    
    // Training and development
    professionalDevelopmentHours?: number;
    mandatoryTrainingRequired: string[]; // List of required training types
  };
  
  // Compliance requirements
  compliance: {
    jurisdiction: string; // 'ZA', 'US', 'CA', 'UK', 'AU', etc.
    laborLaws: string[]; // Applicable labor law codes
    unionAgreements?: string[]; // Union contract references
    certificationRequired?: string[]; // Professional certifications needed
    backgroundCheckRequired: boolean;
    drugTestingRequired: boolean;
    countrySpecificRequirements?: Record<string, any>; // Flexible field for country-specific data
  };
  
  // Probation and review periods
  employmentTerms: {
    probationPeriodDays?: number; // e.g., 90 days
    reviewPeriods: number[]; // Days for performance reviews [30, 90, 365]
    contractRenewalPeriod?: number; // For contractors, days
    noticePeriodDays: number; // Required notice for termination
    severanceEligible: boolean;
  };
  
  // Auto-clocking and time tracking rules
  timeTrackingRules: {
    clockInRequired: boolean;
    locationRestrictions: boolean; // Must clock in from specific locations
    photoVerificationRequired: boolean;
    biometricAuthRequired: boolean;
    autoClockingEligible: boolean; // For contractors
    timesheetApprovalRequired: boolean;
    geofencingRequired: boolean;
  };
  
  // Payroll and billing
  payrollSettings: {
    payFrequency: 'weekly' | 'bi_weekly' | 'semi_monthly' | 'monthly';
    payrollProcessingDays: number; // Days before payday to process
    invoiceRequired: boolean; // For contractors
    taxWithholding: boolean;
    benefitsDeduction: boolean;
  };
  
  // Metadata
  isActive: boolean;
  isDefault: boolean; // Default type for new employees
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  effectiveDate: Date;
  expirationDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const EmploymentTypeSchema = new Schema<IEmploymentType>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  category: { 
    type: String, 
    required: true,
    enum: ['permanent', 'contract', 'temporary', 'intern', 'consultant'],
    index: true
  },
  classification: { 
    type: String, 
    required: true,
    enum: ['full_time', 'part_time', 'casual', 'seasonal'],
    index: true
  },
  
  workHourRules: {
    standardHoursPerWeek: { type: Number, required: true, min: 1, max: 80 },
    maxHoursPerDay: { type: Number, required: true, min: 1, max: 24 },
    maxHoursPerWeek: { type: Number, required: true, min: 1, max: 168 },
    minHoursPerWeek: { type: Number, min: 0, max: 80 },
    overtimeThreshold: {
      daily: { type: Number, min: 1, max: 24 },
      weekly: { type: Number, min: 1, max: 168 }
    },
    overtimeRates: {
      standardOvertime: { type: Number, required: true, min: 1.0, max: 5.0, default: 1.5 },
      premiumOvertime: { type: Number, min: 1.0, max: 5.0 },
      weekendRate: { type: Number, min: 1.0, max: 5.0 },
      holidayRate: { type: Number, min: 1.0, max: 5.0 }
    }
  },
  
  breakRules: {
    minBreakDuration: { type: Number, required: true, min: 5, max: 120, default: 15 },
    maxWorkWithoutBreak: { type: Number, required: true, min: 2, max: 12, default: 6 },
    lunchBreakRequired: { type: Boolean, default: true },
    lunchBreakDuration: { type: Number, min: 15, max: 120, default: 60 },
    restBetweenShifts: { type: Number, required: true, min: 8, max: 24, default: 11 }
  },
  
  schedulingRules: {
    maxConsecutiveDays: { type: Number, required: true, min: 1, max: 14, default: 6 },
    minRestDaysPerWeek: { type: Number, required: true, min: 1, max: 7, default: 1 },
    advanceNoticeRequired: { type: Number, required: true, min: 2, max: 168, default: 24 },
    flexibleScheduling: { type: Boolean, default: false },
    remoteWorkAllowed: { type: Boolean, default: false },
    earliestStartTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    latestEndTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    nightShiftAllowed: { type: Boolean, default: true },
    weekendWorkAllowed: { type: Boolean, default: true },
    holidayWorkAllowed: { type: Boolean, default: false }
  },
  
  entitlements: {
    paidTimeOff: {
      annualLeaveDays: { type: Number, required: true, min: 0, max: 50, default: 15 },
      sickLeaveDays: { type: Number, required: true, min: 0, max: 30, default: 10 },
      personalLeaveDays: { type: Number, required: true, min: 0, max: 15, default: 3 },
      parentalLeaveDays: { type: Number, min: 0, max: 365 },
      studyLeaveDays: { type: Number, min: 0, max: 30 }
    },
    healthInsurance: { type: Boolean, default: false },
    workersCompensation: { type: Boolean, default: true },
    retirementPlan: { type: Boolean, default: false },
    professionalDevelopmentHours: { type: Number, min: 0, max: 200 },
    mandatoryTrainingRequired: [{ type: String, trim: true, maxlength: 100 }]
  },
  
  compliance: {
    jurisdiction: { type: String, required: true, trim: true, uppercase: true, maxlength: 5 },
    laborLaws: [{ type: String, trim: true, maxlength: 50 }],
    unionAgreements: [{ type: String, trim: true, maxlength: 100 }],
    certificationRequired: [{ type: String, trim: true, maxlength: 100 }],
    backgroundCheckRequired: { type: Boolean, default: false },
    drugTestingRequired: { type: Boolean, default: false },
    countrySpecificRequirements: { type: Schema.Types.Mixed }
  },
  
  employmentTerms: {
    probationPeriodDays: { type: Number, min: 0, max: 365 },
    reviewPeriods: [{ type: Number, min: 1, max: 1095 }], // Up to 3 years
    contractRenewalPeriod: { type: Number, min: 30, max: 1095 },
    noticePeriodDays: { type: Number, required: true, min: 0, max: 90, default: 14 },
    severanceEligible: { type: Boolean, default: true }
  },
  
  timeTrackingRules: {
    clockInRequired: { type: Boolean, default: true },
    locationRestrictions: { type: Boolean, default: false },
    photoVerificationRequired: { type: Boolean, default: false },
    biometricAuthRequired: { type: Boolean, default: false },
    autoClockingEligible: { type: Boolean, default: false },
    timesheetApprovalRequired: { type: Boolean, default: true },
    geofencingRequired: { type: Boolean, default: false }
  },
  
  payrollSettings: {
    payFrequency: { 
      type: String, 
      required: true,
      enum: ['weekly', 'bi_weekly', 'semi_monthly', 'monthly'],
      default: 'bi_weekly'
    },
    payrollProcessingDays: { type: Number, required: true, min: 1, max: 14, default: 3 },
    invoiceRequired: { type: Boolean, default: false },
    taxWithholding: { type: Boolean, default: true },
    benefitsDeduction: { type: Boolean, default: false }
  },
  
  isActive: { type: Boolean, default: true, index: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  effectiveDate: { type: Date, required: true, default: Date.now },
  expirationDate: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
EmploymentTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true });
EmploymentTypeSchema.index({ tenantId: 1, isActive: 1, category: 1 });
EmploymentTypeSchema.index({ tenantId: 1, isDefault: 1 });
EmploymentTypeSchema.index({ effectiveDate: 1, expirationDate: 1 });

// Virtual for calculating if employment type is currently effective
EmploymentTypeSchema.virtual('isCurrentlyEffective').get(function(this: IEmploymentType) {
  const now = new Date();
  const effective = this.effectiveDate <= now;
  const notExpired = !this.expirationDate || this.expirationDate >= now;
  return this.isActive && effective && notExpired;
});

// Virtual for getting full display name
EmploymentTypeSchema.virtual('displayName').get(function(this: IEmploymentType) {
  return `${this.name} (${this.classification.replace('_', ' ').toUpperCase()})`;
});

// Pre-save middleware to validate business rules
EmploymentTypeSchema.pre('save', function(this: IEmploymentType, next) {
  // Validate that max hours per week >= standard hours per week
  if (this.workHourRules.maxHoursPerWeek < this.workHourRules.standardHoursPerWeek) {
    next(new Error('Maximum hours per week cannot be less than standard hours per week'));
    return;
  }
  
  // Validate overtime thresholds
  if (this.workHourRules.overtimeThreshold.daily && 
      this.workHourRules.overtimeThreshold.daily > this.workHourRules.maxHoursPerDay) {
    next(new Error('Daily overtime threshold cannot exceed maximum daily hours'));
    return;
  }
  
  // Ensure only one default per tenant
  if (this.isDefault && this.isModified('isDefault')) {
    // This will be handled by the service layer to avoid race conditions
  }
  
  // Update timestamps
  this.updatedAt = new Date();
  next();
});

// Static method to create country-specific employment types
EmploymentTypeSchema.statics.createDefaultTypes = async function(
  tenantId: mongoose.Types.ObjectId, 
  createdBy: mongoose.Types.ObjectId,
  jurisdiction: string = 'ZA'
) {
  const defaultTypes = [
    {
      name: 'Permanent Employee (South African Labour Relations Act)',
      code: 'SA_PERM_EMP',
      category: 'permanent',
      classification: 'full_time',
      workHourRules: {
        standardHoursPerWeek: 45, // SA BCEA Section 9
        maxHoursPerDay: 9,        // SA BCEA Section 9
        maxHoursPerWeek: 45,      // SA BCEA Section 9
        overtimeThreshold: { daily: 9, weekly: 45 },
        overtimeRates: { 
          standardOvertime: 1.5,  // SA BCEA Section 10
          weekendRate: 1.5,       // SA BCEA Sunday work
          holidayRate: 2.0        // SA BCEA Public holiday work
        }
      },
      breakRules: {
        minBreakDuration: 60,     // SA BCEA 1-hour lunch break
        maxWorkWithoutBreak: 5,   // SA BCEA continuous work limit
        lunchBreakRequired: true,
        lunchBreakDuration: 60,
        restBetweenShifts: 12     // SA BCEA daily rest
      },
      schedulingRules: {
        maxConsecutiveDays: 6,    // SA BCEA weekly rest
        minRestDaysPerWeek: 1,    // SA BCEA weekly rest
        advanceNoticeRequired: 168, // 7 days notice
        weekendWorkAllowed: true,
        nightShiftAllowed: true
      },
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 21,    // SA BCEA minimum 21 days
          sickLeaveDays: 30,      // SA BCEA sick leave cycle (36 months)
          personalLeaveDays: 3,
          parentalLeaveDays: 10   // SA BCEA family responsibility leave
        }
      },
      compliance: {
        jurisdiction: 'ZA',
        laborLaws: ['Basic Conditions of Employment Act', 'Labour Relations Act', 'Employment Equity Act'],
        backgroundCheckRequired: false,
        drugTestingRequired: false
      },
      payrollSettings: {
        payFrequency: 'monthly',  // SA standard
        taxWithholding: true,     // PAYE withholding
        benefitsDeduction: true
      },
      isDefault: true
    },
    {
      name: 'Fixed-Term Contract Employee',
      code: 'SA_FT_CONTRACT',
      category: 'contract',
      classification: 'full_time',
      workHourRules: {
        standardHoursPerWeek: 45,
        maxHoursPerDay: 9,
        maxHoursPerWeek: 45,
        overtimeThreshold: { daily: 9, weekly: 45 },
        overtimeRates: { standardOvertime: 1.5, weekendRate: 1.5, holidayRate: 2.0 }
      },
      employmentTerms: {
        contractRenewalPeriod: 90,  // SA LRA fixed-term contracts
        noticePeriodDays: 30
      },
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 21,      // Same as permanent employees
          sickLeaveDays: 30,
          personalLeaveDays: 3,
          parentalLeaveDays: 10
        }
      },
      payrollSettings: {
        taxWithholding: true,       // Still employee, PAYE applies
        invoiceRequired: false      // Company handles payroll
      }
    },
    {
      name: 'Independent Contractor (True Contractor - Not Employee)',
      code: 'SA_INDEP_CONTRACT',
      category: 'contract',
      classification: 'full_time',
      workHourRules: {
        standardHoursPerWeek: 40,   // Flexible - not bound by BCEA
        maxHoursPerDay: 12,         // No BCEA limits - commercial arrangement
        maxHoursPerWeek: 60,        // No BCEA limits
        overtimeThreshold: { daily: 24, weekly: 168 }, // No overtime - they set their own rates
        overtimeRates: { standardOvertime: 1.0 } // No overtime multipliers - commercial rates
      },
      schedulingRules: {
        maxConsecutiveDays: 7,      // No BCEA rest day requirements
        minRestDaysPerWeek: 0,      // Not bound by BCEA
        advanceNoticeRequired: 0,   // Commercial agreement terms
        flexibleScheduling: true,   // Full flexibility
        remoteWorkAllowed: true,    // Work location flexible
        nightShiftAllowed: true,
        weekendWorkAllowed: true,
        holidayWorkAllowed: true
      },
      timeTrackingRules: { 
        clockInRequired: false,     // Not required for true contractors
        autoClockingEligible: true,
        timesheetApprovalRequired: false, // For billing purposes only
        locationRestrictions: false,
        geofencingRequired: false
      },
      payrollSettings: { 
        invoiceRequired: true,      // MUST issue invoices - not salary
        taxWithholding: false,      // Contractor handles own tax
        payFrequency: 'monthly',    // As per commercial agreement
        benefitsDeduction: false    // No employee benefits
      },
      compliance: {
        jurisdiction: 'ZA',
        laborLaws: ['Income Tax Act', 'VAT Act', 'Labour Relations Act (exclusion)'],
        certificationRequired: ['Tax Clearance Certificate', 'Independent Contractor Declaration'],
        backgroundCheckRequired: false,
        drugTestingRequired: false,
        countrySpecificRequirements: {
          mustPassControlTest: true,
          cannotBeSupervised: true,
          mustUseOwnEquipment: true,
          canWorkMultipleClients: true,
          excludedFromBCEA: true,
          noEmployeeBenefits: true
        }
      },
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 0,       // NO paid leave - not an employee
          sickLeaveDays: 0,         // NO sick leave - commercial risk
          personalLeaveDays: 0,     // NO personal leave
          parentalLeaveDays: 0      // NO maternity/paternity leave
        },
        healthInsurance: false,     // No employee benefits
        workersCompensation: false, // Not covered - contractor's responsibility
        retirementPlan: false       // No company retirement benefits
      },
      employmentTerms: {
        probationPeriodDays: 0,     // No probation - commercial contract
        reviewPeriods: [],          // Performance reviews not applicable
        contractRenewalPeriod: 30,  // Commercial contract terms
        noticePeriodDays: 0,        // As per commercial contract
        severanceEligible: false    // No severance - not an employee
      }
    },
    {
      name: 'Part-Time Employee',
      code: 'SA_PT_EMP',
      category: 'permanent',
      classification: 'part_time',
      workHourRules: {
        standardHoursPerWeek: 24,   // Less than 30 hours typically part-time
        maxHoursPerDay: 8,
        maxHoursPerWeek: 30,
        minHoursPerWeek: 8,
        overtimeThreshold: { daily: 8, weekly: 24 },
        overtimeRates: { standardOvertime: 1.5 }
      },
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 15,      // Pro-rated
          sickLeaveDays: 20,        // Pro-rated
          personalLeaveDays: 2
        }
      },
      payrollSettings: {
        taxWithholding: true        // Still employee
      }
    },
    {
      name: 'Casual Worker',
      code: 'SA_CASUAL',
      category: 'temporary',
      classification: 'casual',
      workHourRules: {
        standardHoursPerWeek: 20,
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        overtimeThreshold: { daily: 8, weekly: 40 },
        overtimeRates: { standardOvertime: 1.5 }
      },
      schedulingRules: {
        maxConsecutiveDays: 5,
        advanceNoticeRequired: 24,  // Short notice acceptable
        flexibleScheduling: true
      },
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 0,       // No leave for casual workers
          sickLeaveDays: 6,         // Limited sick leave after 4 months
          personalLeaveDays: 0
        }
      }
    },
    {
      name: 'Temporary Employee (Labour Broker)',
      code: 'SA_TEMP_EMP',
      category: 'temporary',
      classification: 'full_time',
      workHourRules: {
        standardHoursPerWeek: 45,
        maxHoursPerDay: 9,
        maxHoursPerWeek: 45,
        overtimeThreshold: { daily: 9, weekly: 45 },
        overtimeRates: { standardOvertime: 1.5 }
      },
      employmentTerms: {
        noticePeriodDays: 7,        // Shorter notice period
        contractRenewalPeriod: 30
      },
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 15,      // Pro-rated based on service
          sickLeaveDays: 20,
          personalLeaveDays: 1
        }
      },
      compliance: {
        jurisdiction: 'ZA',
        laborLaws: ['Basic Conditions of Employment Act', 'Temporary Employment Services Act']
      }
    }
  ];
  
  const createdTypes = [];
  for (const typeData of defaultTypes) {
    const employmentType = new this({
      ...typeData,
      tenantId,
      createdBy,
      effectiveDate: new Date()
    });
    createdTypes.push(await employmentType.save());
  }
  
  return createdTypes;
};

const EmploymentType = mongoose.model<IEmploymentType>('EmploymentType', EmploymentTypeSchema);
export default EmploymentType;