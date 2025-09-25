import Organization, { IOrganization, OrganizationType } from '../models/Organization';
import { ComplianceProviderFactory } from './ComplianceProviderFactory';
import { ComplianceProvider, CountryComplianceCheck, CountryRiskProfile } from '../interfaces/ComplianceProvider';
import logger from '../utils/logger';

// Legacy interfaces for backward compatibility
export interface SouthAfricanComplianceCheck extends CountryComplianceCheck {}
export interface OrganizationRiskProfile extends CountryRiskProfile {}

export class OrganizationVerificationService {
  
  /**
   * Get compliance provider for a specific country
   */
  static getComplianceProvider(countryCode: string): ComplianceProvider {
    return ComplianceProviderFactory.getProvider(countryCode);
  }
  
  /**
   * Determine required documents for any supported country
   * Defaults to South African requirements for backward compatibility
   */
  static getRequiredDocuments(
    organizationType: OrganizationType, 
    annualRevenue: number, 
    numberOfEmployees: number = 0,
    countryCode: string = 'ZA'
  ): any[] {
    const provider = this.getComplianceProvider(countryCode);
    return provider.getRequiredDocuments(organizationType, annualRevenue, numberOfEmployees);
  }
  
  /**
   * @deprecated Use getRequiredDocuments() with countryCode='ZA' instead
   * Determine required documents for South African organizations
   */
  static getRequiredDocumentsSA(organizationType: OrganizationType, annualRevenue: number): string[] {
    const baseDocuments = [
      'certificate_of_incorporation',
      'tax_registration',
      'bank_statement', // 3 months
      'utility_bill' // Proof of address
    ];
    
    const typeSpecificDocuments: { [key in OrganizationType]?: string[] } = {
      'corporation': [
        'memorandum_of_association',
        'articles_of_association', 
        'directors_resolution',
        'beneficial_ownership_disclosure'
      ],
      'llc': [ // Close Corporation in SA
        'memorandum_of_association',
        'beneficial_ownership_disclosure'
      ],
      'sole_proprietorship': [
        'id_document', // Owner's ID
        'business_registration' // Municipal trading license
      ],
      'nonprofit': [
        'nonprofit_determination_letter', // Section 18A or PBO status
        'constitution',
        'board_resolution'
      ],
      'ngo': [
        'nonprofit_determination_letter',
        'constitution',
        'board_resolution',
        'funding_agreements'
      ],
      'trust': [
        'trust_deed',
        'trustees_resolution',
        'beneficial_ownership_disclosure'
      ],
      'government': [
        'government_authorization',
        'enabling_legislation'
      ]
    };
    
    const additionalRequirements = [];
    
    // VAT registration (mandatory if turnover > R1 million)
    if (annualRevenue > 1000000) {
      additionalRequirements.push('vat_registration_certificate');
    }
    
    // PAYE registration (if employing staff)
    additionalRequirements.push('paye_registration');
    
    // UIF registration (if employing staff)
    additionalRequirements.push('uif_registration');
    
    // Skills Development Levy (if payroll > R500,000 annually)
    if (annualRevenue > 500000) {
      additionalRequirements.push('sdl_registration');
    }
    
    // Workers Compensation registration
    additionalRequirements.push('workermens_compensation_certificate');
    
    // Municipal trading license
    additionalRequirements.push('municipal_trading_license');
    
    // Professional licenses (industry-specific)
    if (['healthcare', 'educational', 'financial'].includes(organizationType)) {
      additionalRequirements.push('professional_license');
    }
    
    return [
      ...baseDocuments,
      ...(typeSpecificDocuments[organizationType] || []),
      ...additionalRequirements
    ];
  }
  
  /**
   * Validate company registration number for any supported country
   */
  static validateCompanyRegistration(
    registrationNumber: string, 
    organizationType: OrganizationType, 
    countryCode: string = 'ZA'
  ): boolean {
    const provider = this.getComplianceProvider(countryCode);
    return provider.validateCompanyRegistration(registrationNumber, organizationType);
  }
  
  /**
   * @deprecated Use validateCompanyRegistration() with countryCode='ZA' instead
   * Validate South African company registration number
   */
  static validateSACompanyRegistration(registrationNumber: string, organizationType: OrganizationType): boolean {
    if (!registrationNumber) return false;
    
    switch (organizationType) {
      case 'corporation': // Pty Ltd
        return /^\d{4}\/\d{6}\/\d{2}$/.test(registrationNumber);
      case 'llc': // Close Corporation
        return /^CK\d{4}\/\d{6}\/\d{2}$/.test(registrationNumber);
      case 'nonprofit': // Non-profit organization
        return /^NPO\d{3}-\d{3}$/.test(registrationNumber);
      case 'ngo': // NGO registration
        return /^NGO\d{4}\/\d{6}\/\d{2}$/.test(registrationNumber);
      case 'trust': // Trust registration
        return /^IT\d{4}\/\d{6}$/.test(registrationNumber);
      case 'sole_proprietorship':
        return /^\d{13}$/.test(registrationNumber); // ID number format
      default:
        return false;
    }
  }
  
  /**
   * Validate tax number for any supported country
   */
  static validateTaxNumber(taxNumber: string, countryCode: string = 'ZA'): boolean {
    const provider = this.getComplianceProvider(countryCode);
    return provider.validateTaxNumber(taxNumber);
  }
  
  /**
   * @deprecated Use validateTaxNumber() with countryCode='ZA' instead
   * Validate South African Tax Number
   */
  static validateSATaxNumber(taxNumber: string): boolean {
    // SA tax reference number format: 10 digits
    return /^\d{10}$/.test(taxNumber);
  }
  
  /**
   * Validate VAT number for any supported country
   */
  static validateVATNumber(vatNumber: string, countryCode: string = 'ZA'): boolean {
    const provider = this.getComplianceProvider(countryCode);
    return provider.validateVATNumber(vatNumber);
  }
  
  /**
   * @deprecated Use validateVATNumber() with countryCode='ZA' instead
   * Validate South African VAT Number
   */
  static validateSAVATNumber(vatNumber: string): boolean {
    // SA VAT number format: 10 digits starting with 4
    return /^4\d{9}$/.test(vatNumber);
  }
  
  /**
   * Calculate risk score for any supported country
   */
  static calculateRiskScore(orgData: any, countryCode: string = 'ZA'): CountryRiskProfile {
    const provider = this.getComplianceProvider(countryCode);
    return provider.calculateRiskScore(orgData);
  }
  
  /**
   * @deprecated Use calculateRiskScore() with countryCode='ZA' instead
   * Calculate risk score for South African organizations
   */
  static calculateSARiskScore(orgData: any): OrganizationRiskProfile {
    let industryRisk = 5;
    let geographicRisk = 2; // South Africa baseline
    let ownershipRisk = 5;
    let complianceRisk = 5;
    let financialRisk = 5;
    
    const riskReasons: string[] = [];
    const recommendedActions: string[] = [];
    
    // Industry Risk Assessment (South African context)
    const highRiskIndustries = [
      'cryptocurrency', 'money_transfer', 'gambling', 'adult_entertainment',
      'precious_metals', 'second_hand_goods', 'cash_intensive_business',
      'foreign_exchange', 'money_lending'
    ];
    const mediumRiskIndustries = [
      'retail', 'hospitality', 'transport', 'security', 'construction'
    ];
    const lowRiskIndustries = [
      'education', 'healthcare', 'government', 'nonprofit', 'manufacturing'
    ];
    
    if (highRiskIndustries.includes(orgData.industryCode?.toLowerCase())) {
      industryRisk = 8;
      riskReasons.push('High-risk industry classification');
      recommendedActions.push('Enhanced due diligence required');
    } else if (lowRiskIndustries.includes(orgData.industryCode?.toLowerCase())) {
      industryRisk = 2;
    } else if (mediumRiskIndustries.includes(orgData.industryCode?.toLowerCase())) {
      industryRisk = 5;
    }
    
    // Geographic Risk (South African provinces)
    const higherRiskProvinces = ['Limpopo', 'Eastern Cape', 'KwaZulu-Natal'];
    const lowerRiskProvinces = ['Western Cape', 'Gauteng'];
    
    const province = orgData.businessAddress?.state;
    if (higherRiskProvinces.includes(province)) {
      geographicRisk = 4;
    } else if (lowerRiskProvinces.includes(province)) {
      geographicRisk = 1;
    }
    
    // Ownership Structure Risk
    if (orgData.beneficialOwners?.length > 5) {
      ownershipRisk += 1;
      riskReasons.push('Complex ownership structure');
    }
    
    if (orgData.beneficialOwners?.some((owner: any) => owner.isPoliticallyExposed)) {
      ownershipRisk += 3;
      riskReasons.push('Politically Exposed Person (PEP) identified');
      recommendedActions.push('Enhanced PEP due diligence required');
    }
    
    // Foreign ownership considerations
    const foreignOwners = orgData.beneficialOwners?.filter((owner: any) => 
      owner.address?.country !== 'ZA'
    );
    if (foreignOwners?.length > 0) {
      ownershipRisk += 2;
      riskReasons.push('Foreign ownership identified');
      recommendedActions.push('Verify foreign exchange compliance');
    }
    
    // Financial Risk Assessment
    const revenue = orgData.financialInfo?.estimatedAnnualRevenue || 0;
    if (revenue > 50000000) { // R50 million
      financialRisk += 1;
      recommendedActions.push('Large business - enhanced monitoring');
    } else if (revenue < 100000) { // R100,000
      financialRisk += 2;
      riskReasons.push('Very small business - verify legitimacy');
    }
    
    // Cash-intensive business check
    if (revenue > 1000000 && !orgData.financialInfo?.bankAccount?.verified) {
      financialRisk += 3;
      riskReasons.push('Large cash business without verified banking');
      recommendedActions.push('Verify all banking relationships');
    }
    
    // Compliance Risk
    if (!orgData.documents?.some((doc: any) => doc.type === 'tax_registration')) {
      complianceRisk += 2;
      riskReasons.push('Tax registration not provided');
    }
    
    if (revenue > 1000000 && !orgData.documents?.some((doc: any) => doc.type === 'vat_registration_certificate')) {
      complianceRisk += 2;
      riskReasons.push('VAT registration required but not provided');
    }
    
    // B-BBEE compliance for larger organizations
    if (revenue > 10000000 && !orgData.beeComplianceVerified) {
      complianceRisk += 1;
      recommendedActions.push('Verify B-BBEE compliance status');
    }
    
    const averageRisk = (industryRisk + geographicRisk + ownershipRisk + complianceRisk + financialRisk) / 5;
    const overallRisk = averageRisk <= 2.5 ? 'low' : 
                       averageRisk <= 5 ? 'medium' : 
                       averageRisk <= 7.5 ? 'high' : 'critical';
    
    return {
      overallRisk,
      riskFactors: {
        industryRisk,
        geographicRisk,
        ownershipRisk,
        complianceRisk,
        financialRisk
      },
      riskReasons,
      recommendedActions
    };
  }
  
  /**
   * Perform compliance checks for any supported country
   */
  static async performComplianceChecks(organization: IOrganization, countryCode?: string): Promise<CountryComplianceCheck> {
    // Determine country from organization if not provided
    const country = countryCode || organization.businessAddress?.country || 'ZA';
    const provider = this.getComplianceProvider(country);
    return provider.performComplianceChecks(organization);
  }
  
  /**
   * @deprecated Use performComplianceChecks() instead
   * Perform South African compliance checks
   */
  static async performSAComplianceChecks(organization: IOrganization): Promise<SouthAfricanComplianceCheck> {
    const checks: SouthAfricanComplianceCheck = {
      companyRegistrationValid: false,
      taxComplianceStatus: 'unknown'
    };
    
    try {
      // 1. Validate company registration format
      checks.companyRegistrationValid = this.validateSACompanyRegistration(
        organization.registrationNumber,
        organization.organizationType
      );
      
      // 2. Check tax number format
      const taxInfo = organization.financialInfo.taxInformation;
      if (taxInfo.taxId && this.validateSATaxNumber(taxInfo.taxId)) {
        // In a real implementation, this would call SARS API
        // For now, assume compliant if format is correct
        checks.taxComplianceStatus = 'compliant';
      }
      
      // 3. VAT registration check
      if (organization.financialInfo.estimatedAnnualRevenue > 1000000) {
        const vatDoc = organization.documents.find(doc => 
          doc.type === 'vat_registration_certificate'
        );
        if (vatDoc && vatDoc.verified) {
          checks.vatRegistrationValid = true;
        } else {
          checks.vatRegistrationValid = false;
          checks.taxComplianceStatus = 'non_compliant';
        }
      }
      
      // 4. B-BBEE status check (for larger organizations)
      if (organization.financialInfo.estimatedAnnualRevenue > 10000000) {
        // This would integrate with B-BBEE database
        checks.beeStatus = 'not_applicable'; // Default
      }
      
      // 5. Directors/Beneficial owners check
      const flaggedDirectors: string[] = [];
      let allDirectorsVerified = true;
      
      for (const owner of organization.beneficialOwners) {
        // In real implementation, check against:
        // - Debarred directors database
        // - Sanctions lists
        // - Credit bureaus
        if (owner.sanctionsCheck.status === 'flagged') {
          flaggedDirectors.push(owner.name);
          allDirectorsVerified = false;
        }
      }
      
      checks.directorsCheck = {
        allDirectorsVerified,
        flaggedDirectors
      };
      
      // 6. CIFA (Credit Bureau) check
      // This would integrate with credit bureaus like Experian, TransUnion SA
      checks.cifaStatus = 'pending';
      
    } catch (error) {
      logger.error('Error performing SA compliance checks:', error);
    }
    
    return checks;
  }
  
  /**
   * Generate verification requirements checklist for any supported country
   */
  static generateVerificationChecklist(organization: IOrganization, countryCode?: string): any[] {
    // Determine country from organization if not provided
    const country = countryCode || organization.businessAddress?.country || 'ZA';
    const provider = this.getComplianceProvider(country);
    return provider.generateVerificationChecklist(organization);
  }
  
  /**
   * @deprecated Use generateVerificationChecklist() instead
   * Generate verification requirements checklist
   */
  static generateLegacyVerificationChecklist(organization: IOrganization): any[] {
    const checklist = [];
    const revenue = organization.financialInfo.estimatedAnnualRevenue;
    const orgType = organization.organizationType;
    
    // Basic requirements
    checklist.push({
      category: 'Legal Documentation',
      items: [
        { 
          requirement: 'Certificate of Incorporation/Registration', 
          mandatory: true,
          completed: organization.documents.some(doc => doc.type === 'certificate_of_incorporation' && doc.verified)
        },
        {
          requirement: 'Memorandum and Articles of Association',
          mandatory: ['corporation', 'llc'].includes(orgType),
          completed: organization.documents.some(doc => doc.type === 'memorandum_of_association' && doc.verified)
        }
      ]
    });
    
    // Tax Compliance
    checklist.push({
      category: 'Tax Compliance',
      items: [
        {
          requirement: 'Tax Registration (SARS)',
          mandatory: true,
          completed: organization.documents.some(doc => doc.type === 'tax_registration' && doc.verified)
        },
        {
          requirement: 'VAT Registration Certificate',
          mandatory: revenue > 1000000,
          completed: organization.documents.some(doc => doc.type === 'vat_registration_certificate' && doc.verified)
        },
        {
          requirement: 'PAYE Registration',
          mandatory: organization.financialInfo.numberOfEmployees > 0,
          completed: organization.documents.some(doc => doc.type === 'paye_registration' && doc.verified)
        }
      ]
    });
    
    // Employment Compliance
    if (organization.financialInfo.numberOfEmployees > 0) {
      checklist.push({
        category: 'Employment Compliance',
        items: [
          {
            requirement: 'UIF Registration',
            mandatory: true,
            completed: organization.documents.some(doc => doc.type === 'uif_registration' && doc.verified)
          },
          {
            requirement: 'Workers Compensation Certificate',
            mandatory: true,
            completed: organization.documents.some(doc => doc.type === 'workermens_compensation_certificate' && doc.verified)
          },
          {
            requirement: 'Skills Development Levy Registration',
            mandatory: revenue > 500000,
            completed: organization.documents.some(doc => doc.type === 'sdl_registration' && doc.verified)
          }
        ]
      });
    }
    
    // B-BBEE Compliance (for larger organizations)
    if (revenue > 10000000) {
      checklist.push({
        category: 'B-BBEE Compliance',
        items: [
          {
            requirement: 'B-BBEE Certificate',
            mandatory: true,
            completed: organization.documents.some(doc => doc.type === 'bee_certificate' && doc.verified)
          }
        ]
      });
    }
    
    // Financial Verification
    checklist.push({
      category: 'Financial Verification',
      items: [
        {
          requirement: 'Bank Statements (3 months)',
          mandatory: true,
          completed: organization.documents.some(doc => doc.type === 'bank_statement' && doc.verified)
        },
        {
          requirement: 'Proof of Business Address',
          mandatory: true,
          completed: organization.documents.some(doc => doc.type === 'utility_bill' && doc.verified)
        }
      ]
    });
    
    return checklist;
  }
  
  /**
   * Validate organization for any supported country
   */
  static async validateOrganization(organizationId: string, countryCode?: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    complianceChecks: CountryComplianceCheck;
    riskProfile: CountryRiskProfile;
  }> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Determine country from parameter, organization, or default to ZA
    const country = countryCode || organization.businessAddress?.country || 'ZA';
    const provider = this.getComplianceProvider(country);
    
    return provider.validateOrganization(organizationId);
  }
  
  /**
   * Update organization risk assessment for any supported country
   */
  static async updateRiskAssessment(organizationId: string, countryCode?: string): Promise<void> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    // Determine country from parameter, organization, or default to ZA
    const country = countryCode || organization.businessAddress?.country || 'ZA';
    const provider = this.getComplianceProvider(country);
    
    const riskProfile = provider.calculateRiskScore(organization);
    
    organization.riskAssessment = {
      overallRisk: riskProfile.overallRisk,
      riskFactors: riskProfile.riskFactors,
      calculatedAt: new Date(),
      reviewRequiredAt: new Date(Date.now() + (
        riskProfile.overallRisk === 'low' ? 365 * 24 * 60 * 60 * 1000 :    // 1 year
        riskProfile.overallRisk === 'medium' ? 180 * 24 * 60 * 60 * 1000 : // 6 months
        90 * 24 * 60 * 60 * 1000                                           // 3 months for high/critical
      )),
      notes: `Risk factors: ${riskProfile.riskReasons.join('; ')}`
    };
    
    await organization.save();
    
    logger.info(`Risk assessment updated for organization ${organization.legalName}`, {
      organizationId,
      countryCode: country,
      overallRisk: riskProfile.overallRisk,
      riskFactors: riskProfile.riskFactors
    });
  }
  
  /**
   * Get supported countries
   */
  static getSupportedCountries(): string[] {
    return ComplianceProviderFactory.getSupportedCountries();
  }
  
  /**
   * Check if a country is supported
   */
  static isCountrySupported(countryCode: string): boolean {
    return ComplianceProviderFactory.isCountrySupported(countryCode);
  }
}

export default OrganizationVerificationService;