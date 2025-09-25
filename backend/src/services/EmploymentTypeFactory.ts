import mongoose from 'mongoose';
import { ComplianceProviderFactory } from './ComplianceProviderFactory';

/**
 * Factory for creating country-specific employment types
 * Uses compliance providers to generate appropriate employment types
 */
export class EmploymentTypeFactory {
  
  /**
   * Create default employment types for a specific country
   */
  static async createDefaultTypes(
    tenantId: mongoose.Types.ObjectId, 
    createdBy: mongoose.Types.ObjectId,
    countryCode: string = 'ZA'
  ): Promise<any[]> {
    try {
      const provider = ComplianceProviderFactory.getProvider(countryCode);
      return await provider.getDefaultEmploymentTypes(tenantId, createdBy);
    } catch (error) {
      throw new Error(`Failed to create employment types for country ${countryCode}: ${error.message}`);
    }
  }
  
  /**
   * Get supported employment type configurations by country
   */
  static getSupportedCountries(): { 
    countryCode: string; 
    countryName: string; 
    supportedTypes: string[] 
  }[] {
    const supportedCountries = ComplianceProviderFactory.getSupportedCountries();
    
    return supportedCountries.map(countryCode => {
      const config = ComplianceProviderFactory.getProviderConfig(countryCode);
      return {
        countryCode,
        countryName: config.countryName,
        supportedTypes: config.supportedOrganizationTypes || []
      };
    });
  }
  
  /**
   * Validate employment type configuration for a specific country
   */
  static async validateEmploymentType(
    employmentTypeData: any, 
    countryCode: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const provider = ComplianceProviderFactory.getProvider(countryCode);
      const config = provider.getConfig();
      
      // Validate jurisdiction matches
      if (employmentTypeData.compliance?.jurisdiction !== countryCode) {
        errors.push(`Employment type jurisdiction must be ${countryCode}`);
      }
      
      // Validate currency matches country
      if (employmentTypeData.payrollSettings?.currency && 
          employmentTypeData.payrollSettings.currency !== config.currency) {
        errors.push(`Currency must be ${config.currency} for ${config.countryName}`);
      }
      
      // Country-specific validations could be added here
      
    } catch (error) {
      errors.push(`Country ${countryCode} is not supported`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get template for creating custom employment type for a country
   */
  static getEmploymentTypeTemplate(countryCode: string): any {
    const provider = ComplianceProviderFactory.getProvider(countryCode);
    const config = provider.getConfig();
    
    return {
      // Basic template that can be customized
      name: '',
      code: '',
      category: 'permanent',
      classification: 'full_time',
      
      workHourRules: {
        standardHoursPerWeek: 40,
        maxHoursPerDay: 8,
        maxHoursPerWeek: 48,
        overtimeThreshold: { daily: 8, weekly: 40 },
        overtimeRates: { standardOvertime: 1.5 }
      },
      
      breakRules: {
        minBreakDuration: 30,
        maxWorkWithoutBreak: 5,
        lunchBreakRequired: true,
        lunchBreakDuration: 60,
        restBetweenShifts: 11
      },
      
      schedulingRules: {
        maxConsecutiveDays: 6,
        minRestDaysPerWeek: 1,
        advanceNoticeRequired: 24,
        flexibleScheduling: false,
        remoteWorkAllowed: false,
        nightShiftAllowed: true,
        weekendWorkAllowed: true,
        holidayWorkAllowed: false
      },
      
      entitlements: {
        paidTimeOff: {
          annualLeaveDays: 15,
          sickLeaveDays: 10,
          personalLeaveDays: 3
        },
        healthInsurance: false,
        workersCompensation: true,
        retirementPlan: false
      },
      
      compliance: {
        jurisdiction: countryCode,
        laborLaws: [],
        backgroundCheckRequired: false,
        drugTestingRequired: false
      },
      
      employmentTerms: {
        probationPeriodDays: 90,
        reviewPeriods: [30, 90, 365],
        noticePeriodDays: 14,
        severanceEligible: true
      },
      
      timeTrackingRules: {
        clockInRequired: true,
        locationRestrictions: false,
        photoVerificationRequired: false,
        biometricAuthRequired: false,
        autoClockingEligible: false,
        timesheetApprovalRequired: true,
        geofencingRequired: false
      },
      
      payrollSettings: {
        payFrequency: 'bi_weekly',
        payrollProcessingDays: 3,
        invoiceRequired: false,
        taxWithholding: true,
        benefitsDeduction: false,
        currency: config.currency
      }
    };
  }
  
  /**
   * Convert legacy South African types to new internationalized format
   */
  static async migrateLegacyTypes(tenantId: mongoose.Types.ObjectId): Promise<void> {
    const EmploymentType = require('../models/EmploymentType').default;
    
    // Find all employment types without jurisdiction specified
    const legacyTypes = await EmploymentType.find({
      tenantId,
      'compliance.jurisdiction': { $exists: false }
    });
    
    // Update them to use South African jurisdiction
    for (const type of legacyTypes) {
      type.compliance.jurisdiction = 'ZA';
      type.payrollSettings.currency = 'ZAR';
      await type.save();
    }
  }
}