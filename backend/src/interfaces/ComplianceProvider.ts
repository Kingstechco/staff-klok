import mongoose from 'mongoose';
import { IOrganization, OrganizationType } from '../models/Organization';

export interface CountryComplianceCheck {
  companyRegistrationValid: boolean;
  taxComplianceStatus: 'compliant' | 'non_compliant' | 'pending' | 'unknown';
  additionalChecks: Record<string, any>;
}

export interface CountryRiskProfile {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: {
    industryRisk: number;
    geographicRisk: number;
    ownershipRisk: number;
    complianceRisk: number;
    financialRisk: number;
  };
  riskReasons: string[];
  recommendedActions: string[];
}

export interface CountryDocumentRequirement {
  type: string;
  name: string;
  description: string;
  mandatory: boolean;
  category: 'legal' | 'tax' | 'employment' | 'financial' | 'compliance';
  validityPeriod?: number; // Days
}

export interface CountryValidationRules {
  companyRegistration: {
    [key in OrganizationType]?: RegExp;
  };
  taxNumber: RegExp;
  vatNumber?: RegExp;
  phoneNumber: RegExp;
  postalCode: RegExp;
}

export interface ComplianceProviderConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  defaultVATRate?: number;
  supportedOrganizationTypes: OrganizationType[];
  requiredIntegrations?: string[];
  apiEndpoints?: Record<string, string>;
}

/**
 * Abstract base class for country-specific compliance providers
 * Each country implementation extends this to provide localized compliance rules
 */
export abstract class ComplianceProvider {
  protected config: ComplianceProviderConfig;
  
  constructor(config: ComplianceProviderConfig) {
    this.config = config;
  }
  
  /**
   * Get configuration for this compliance provider
   */
  getConfig(): ComplianceProviderConfig {
    return this.config;
  }
  
  /**
   * Determine required documents for organization verification
   */
  abstract getRequiredDocuments(
    organizationType: OrganizationType, 
    annualRevenue: number,
    numberOfEmployees: number
  ): CountryDocumentRequirement[];
  
  /**
   * Validate organization registration number format
   */
  abstract validateCompanyRegistration(
    registrationNumber: string, 
    organizationType: OrganizationType
  ): boolean;
  
  /**
   * Validate tax identification number
   */
  abstract validateTaxNumber(taxNumber: string): boolean;
  
  /**
   * Validate VAT number (if applicable)
   */
  abstract validateVATNumber(vatNumber: string): boolean;
  
  /**
   * Calculate country-specific risk assessment
   */
  abstract calculateRiskScore(orgData: any): CountryRiskProfile;
  
  /**
   * Perform country-specific compliance checks
   */
  abstract performComplianceChecks(organization: IOrganization): Promise<CountryComplianceCheck>;
  
  /**
   * Generate verification requirements checklist
   */
  abstract generateVerificationChecklist(organization: IOrganization): any[];
  
  /**
   * Validate complete organization data
   */
  abstract validateOrganization(organizationId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    complianceChecks: CountryComplianceCheck;
    riskProfile: CountryRiskProfile;
  }>;
  
  /**
   * Get validation rules for this country
   */
  abstract getValidationRules(): CountryValidationRules;
  
  /**
   * Get default employment types for this country
   */
  abstract getDefaultEmploymentTypes(
    tenantId: mongoose.Types.ObjectId, 
    createdBy: mongoose.Types.ObjectId
  ): Promise<any[]>;
  
  /**
   * Calculate tax implications for contractors
   */
  abstract calculateContractorTax(
    subtotal: number, 
    contractorClassification: string,
    additionalParams?: Record<string, any>
  ): {
    subtotal: number;
    vatAmount: number;
    vatRate: number;
    totalAmount: number;
    taxImplications: {
      contractorResponsible: string;
      organizationResponsible: string;
      requiredCertificates: string[];
    };
  };
  
  /**
   * Validate business address format
   */
  validateBusinessAddress(address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!address.street?.trim()) errors.push('Street address is required');
    if (!address.city?.trim()) errors.push('City is required');
    if (!address.state?.trim()) errors.push('State/Province is required');
    if (!address.country?.trim()) errors.push('Country is required');
    
    // Validate postal code format
    const rules = this.getValidationRules();
    if (address.postalCode && !rules.postalCode.test(address.postalCode)) {
      errors.push('Invalid postal code format');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const rules = this.getValidationRules();
    return rules.phoneNumber.test(phoneNumber);
  }
  
  /**
   * Get industry risk levels specific to this country
   */
  protected getIndustryRiskLevels(): {
    high: string[];
    medium: string[];
    low: string[];
  } {
    return {
      high: ['cryptocurrency', 'money_transfer', 'gambling', 'adult_entertainment'],
      medium: ['retail', 'hospitality', 'transport', 'construction'],
      low: ['education', 'healthcare', 'government', 'nonprofit']
    };
  }
  
  /**
   * Get geographic risk assessment for this country's provinces/states
   */
  protected abstract getGeographicRiskLevels(): {
    high: string[];
    medium: string[];
    low: string[];
  };
}