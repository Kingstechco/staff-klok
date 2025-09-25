import mongoose from 'mongoose';
import { 
  ComplianceProvider, 
  CountryComplianceCheck, 
  CountryRiskProfile, 
  CountryDocumentRequirement,
  CountryValidationRules,
  ComplianceProviderConfig 
} from '../interfaces/ComplianceProvider';
import { IOrganization, OrganizationType } from '../models/Organization';
import logger from '../utils/logger';

export class SouthAfricanComplianceProvider extends ComplianceProvider {
  constructor() {
    super({
      countryCode: 'ZA',
      countryName: 'South Africa',
      currency: 'ZAR',
      defaultVATRate: 15,
      supportedOrganizationTypes: [
        'corporation', 'llc', 'sole_proprietorship', 'nonprofit', 
        'ngo', 'trust', 'cooperative'
      ],
      requiredIntegrations: ['SARS', 'CIPC', 'CIFA'],
      apiEndpoints: {
        sars: 'https://api.sars.gov.za/v1',
        cipc: 'https://api.cipc.co.za/v1',
        cifa: 'https://api.cifa.co.za/v1'
      }
    });
  }

  getRequiredDocuments(
    organizationType: OrganizationType, 
    annualRevenue: number,
    numberOfEmployees: number
  ): CountryDocumentRequirement[] {
    const baseDocuments: CountryDocumentRequirement[] = [
      {
        type: 'certificate_of_incorporation',
        name: 'Certificate of Incorporation/Registration',
        description: 'CIPC issued certificate of incorporation',
        mandatory: true,
        category: 'legal'
      },
      {
        type: 'tax_registration',
        name: 'SARS Tax Registration',
        description: 'South African Revenue Service tax registration',
        mandatory: true,
        category: 'tax'
      },
      {
        type: 'bank_statement',
        name: 'Bank Statement (3 months)',
        description: 'Recent bank statements from South African bank',
        mandatory: true,
        category: 'financial',
        validityPeriod: 90
      },
      {
        type: 'utility_bill',
        name: 'Proof of Business Address',
        description: 'Municipal rates or utility bill',
        mandatory: true,
        category: 'legal',
        validityPeriod: 90
      }
    ];

    const typeSpecificDocuments: Partial<Record<OrganizationType, CountryDocumentRequirement[]>> = {
      corporation: [
        {
          type: 'memorandum_of_association',
          name: 'Memorandum of Incorporation (MOI)',
          description: 'CIPC filed Memorandum of Incorporation',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'directors_resolution',
          name: 'Board Resolution',
          description: 'Resolution authorizing business operations',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'beneficial_ownership_disclosure',
          name: 'Beneficial Ownership Declaration',
          description: 'Declaration of beneficial owners (>25% shareholding)',
          mandatory: true,
          category: 'compliance'
        }
      ],
      llc: [
        {
          type: 'memorandum_of_association',
          name: 'Founding Statement',
          description: 'Close Corporation founding statement',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'beneficial_ownership_disclosure',
          name: 'Member Declaration',
          description: 'Declaration of CC members and interests',
          mandatory: true,
          category: 'compliance'
        }
      ],
      sole_proprietorship: [
        {
          type: 'id_document',
          name: 'Owner Identity Document',
          description: 'South African ID or passport',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'business_registration',
          name: 'Municipal Business License',
          description: 'Municipal trading license or business registration',
          mandatory: true,
          category: 'legal'
        }
      ],
      nonprofit: [
        {
          type: 'nonprofit_determination_letter',
          name: 'NPO Registration Certificate',
          description: 'Department of Social Development NPO certificate',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'constitution',
          name: 'NPO Constitution',
          description: 'Organizational constitution and bylaws',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'board_resolution',
          name: 'Board Resolution',
          description: 'Board resolution for business operations',
          mandatory: true,
          category: 'legal'
        }
      ],
      ngo: [
        {
          type: 'nonprofit_determination_letter',
          name: 'NPO/PBO Registration',
          description: 'NPO or Public Benefit Organization certificate',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'constitution',
          name: 'NGO Constitution',
          description: 'Organizational constitution',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'funding_agreements',
          name: 'Funding Documentation',
          description: 'Primary funding source agreements',
          mandatory: false,
          category: 'financial'
        }
      ],
      trust: [
        {
          type: 'trust_deed',
          name: 'Trust Deed',
          description: 'Master of High Court registered trust deed',
          mandatory: true,
          category: 'legal'
        },
        {
          type: 'trustees_resolution',
          name: 'Trustees Resolution',
          description: 'Resolution authorizing business activities',
          mandatory: true,
          category: 'legal'
        }
      ]
    };

    const additionalRequirements: CountryDocumentRequirement[] = [];

    // VAT registration (mandatory if turnover > R1 million)
    if (annualRevenue > 1000000) {
      additionalRequirements.push({
        type: 'vat_registration_certificate',
        name: 'VAT Registration Certificate',
        description: 'SARS VAT registration certificate',
        mandatory: true,
        category: 'tax'
      });
    }

    // Employment-related registrations
    if (numberOfEmployees > 0) {
      additionalRequirements.push(
        {
          type: 'paye_registration',
          name: 'PAYE Registration',
          description: 'Pay-As-You-Earn tax registration',
          mandatory: true,
          category: 'employment'
        },
        {
          type: 'uif_registration',
          name: 'UIF Registration',
          description: 'Unemployment Insurance Fund registration',
          mandatory: true,
          category: 'employment'
        },
        {
          type: 'workermens_compensation_certificate',
          name: 'Workers Compensation Certificate',
          description: 'Compensation Fund certificate of good standing',
          mandatory: true,
          category: 'employment'
        }
      );

      // Skills Development Levy (if payroll > R500,000 annually)
      if (annualRevenue > 500000) {
        additionalRequirements.push({
          type: 'sdl_registration',
          name: 'Skills Development Levy Registration',
          description: 'SDL registration with SETA',
          mandatory: true,
          category: 'employment'
        });
      }
    }

    // B-BBEE compliance for larger organizations
    if (annualRevenue > 10000000) {
      additionalRequirements.push({
        type: 'bee_certificate',
        name: 'B-BBEE Certificate',
        description: 'Broad-Based Black Economic Empowerment certificate',
        mandatory: true,
        category: 'compliance',
        validityPeriod: 365
      });
    }

    return [
      ...baseDocuments,
      ...(typeSpecificDocuments[organizationType] || []),
      ...additionalRequirements
    ];
  }

  validateCompanyRegistration(registrationNumber: string, organizationType: OrganizationType): boolean {
    if (!registrationNumber) return false;
    
    const rules = this.getValidationRules().companyRegistration;
    const pattern = rules[organizationType];
    return pattern ? pattern.test(registrationNumber) : false;
  }

  validateTaxNumber(taxNumber: string): boolean {
    return this.getValidationRules().taxNumber.test(taxNumber);
  }

  validateVATNumber(vatNumber: string): boolean {
    const vatRule = this.getValidationRules().vatNumber;
    return vatRule ? vatRule.test(vatNumber) : false;
  }

  getValidationRules(): CountryValidationRules {
    return {
      companyRegistration: {
        corporation: /^\d{4}\/\d{6}\/\d{2}$/, // Pty Ltd format
        llc: /^CK\d{4}\/\d{6}\/\d{2}$/, // Close Corporation
        nonprofit: /^NPO\d{3}-\d{3}$/, // Non-profit organization
        ngo: /^(NPO\d{3}-\d{3}|PBO\d{9})$/, // NGO/PBO registration
        trust: /^IT\d{4}\/\d{6}$/, // Trust registration
        sole_proprietorship: /^\d{13}$/ // ID number format
      },
      taxNumber: /^\d{10}$/, // 10-digit tax reference number
      vatNumber: /^4\d{9}$/, // VAT number starting with 4
      phoneNumber: /^(\+27|0)[1-9]\d{8}$/, // South African phone format
      postalCode: /^\d{4}$/ // 4-digit postal code
    };
  }

  protected getGeographicRiskLevels(): { high: string[]; medium: string[]; low: string[] } {
    return {
      high: ['Limpopo', 'Eastern Cape', 'KwaZulu-Natal', 'North West'],
      medium: ['Free State', 'Mpumalanga', 'Northern Cape'],
      low: ['Western Cape', 'Gauteng']
    };
  }

  calculateRiskScore(orgData: any): CountryRiskProfile {
    let industryRisk = 5;
    let geographicRisk = 2; // South Africa baseline
    let ownershipRisk = 5;
    let complianceRisk = 5;
    let financialRisk = 5;
    
    const riskReasons: string[] = [];
    const recommendedActions: string[] = [];
    
    // Industry Risk Assessment (South African context)
    const industryLevels = this.getIndustryRiskLevels();
    const industryCode = orgData.industryCode?.toLowerCase();
    
    if (industryLevels.high.includes(industryCode)) {
      industryRisk = 8;
      riskReasons.push('High-risk industry classification');
      recommendedActions.push('Enhanced due diligence required');
    } else if (industryLevels.low.includes(industryCode)) {
      industryRisk = 2;
    } else if (industryLevels.medium.includes(industryCode)) {
      industryRisk = 5;
    }
    
    // Geographic Risk (South African provinces)
    const geoLevels = this.getGeographicRiskLevels();
    const province = orgData.businessAddress?.state;
    
    if (geoLevels.high.includes(province)) {
      geographicRisk = 4;
      riskReasons.push('Higher-risk province location');
    } else if (geoLevels.low.includes(province)) {
      geographicRisk = 1;
    } else if (geoLevels.medium.includes(province)) {
      geographicRisk = 3;
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
      riskReasons.push('SARS tax registration not provided');
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

  async performComplianceChecks(organization: IOrganization): Promise<CountryComplianceCheck> {
    const checks: CountryComplianceCheck = {
      companyRegistrationValid: false,
      taxComplianceStatus: 'unknown',
      additionalChecks: {}
    };
    
    try {
      // 1. Validate company registration format
      checks.companyRegistrationValid = this.validateCompanyRegistration(
        organization.registrationNumber,
        organization.organizationType
      );
      
      // 2. Check tax number format
      const taxInfo = organization.financialInfo.taxInformation;
      if (taxInfo.taxId && this.validateTaxNumber(taxInfo.taxId)) {
        // In a real implementation, this would call SARS API
        checks.taxComplianceStatus = 'compliant';
      }
      
      // 3. VAT registration check
      if (organization.financialInfo.estimatedAnnualRevenue > 1000000) {
        const vatDoc = organization.documents.find(doc => 
          doc.type === 'vat_registration_certificate'
        );
        checks.additionalChecks.vatRegistrationValid = vatDoc?.verified || false;
        if (!vatDoc?.verified) {
          checks.taxComplianceStatus = 'non_compliant';
        }
      }
      
      // 4. B-BBEE status check (for larger organizations)
      if (organization.financialInfo.estimatedAnnualRevenue > 10000000) {
        checks.additionalChecks.beeStatus = 'not_applicable'; // Default
      }
      
      // 5. Directors/Beneficial owners check
      const flaggedDirectors: string[] = [];
      let allDirectorsVerified = true;
      
      for (const owner of organization.beneficialOwners) {
        if (owner.sanctionsCheck.status === 'flagged') {
          flaggedDirectors.push(owner.name);
          allDirectorsVerified = false;
        }
      }
      
      checks.additionalChecks.directorsCheck = {
        allDirectorsVerified,
        flaggedDirectors
      };
      
      // 6. Credit Bureau (CIFA) check
      checks.additionalChecks.cifaStatus = 'pending';
      
    } catch (error) {
      logger.error('Error performing SA compliance checks:', error);
    }
    
    return checks;
  }

  generateVerificationChecklist(organization: IOrganization): any[] {
    const checklist = [];
    const revenue = organization.financialInfo.estimatedAnnualRevenue;
    const employeeCount = organization.financialInfo.numberOfEmployees;
    const orgType = organization.organizationType;
    
    // Legal Documentation
    checklist.push({
      category: 'Legal Documentation',
      items: [
        { 
          requirement: 'CIPC Certificate of Incorporation', 
          mandatory: true,
          completed: organization.documents.some(doc => doc.type === 'certificate_of_incorporation' && doc.verified)
        },
        {
          requirement: 'Memorandum of Incorporation (if applicable)',
          mandatory: ['corporation', 'llc'].includes(orgType),
          completed: organization.documents.some(doc => doc.type === 'memorandum_of_association' && doc.verified)
        }
      ]
    });
    
    // SARS Tax Compliance
    checklist.push({
      category: 'SARS Tax Compliance',
      items: [
        {
          requirement: 'SARS Tax Registration',
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
          mandatory: employeeCount > 0,
          completed: organization.documents.some(doc => doc.type === 'paye_registration' && doc.verified)
        }
      ]
    });
    
    // Employment Compliance (if applicable)
    if (employeeCount > 0) {
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
    
    return checklist;
  }

  async validateOrganization(organizationId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    complianceChecks: CountryComplianceCheck;
    riskProfile: CountryRiskProfile;
  }> {
    const Organization = require('../models/Organization').default;
    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (!this.validateCompanyRegistration(organization.registrationNumber, organization.organizationType)) {
      errors.push('Invalid South African company registration number format');
    }
    
    if (!this.validateTaxNumber(organization.financialInfo.taxInformation.taxId)) {
      errors.push('Invalid South African tax number format');
    }
    
    // Revenue-based requirements
    const revenue = organization.financialInfo.estimatedAnnualRevenue;
    if (revenue > 1000000 && !organization.documents.some((doc: any) => doc.type === 'vat_registration_certificate')) {
      errors.push('VAT registration required for businesses with revenue > R1,000,000');
    }
    
    // Employee-based requirements
    if (organization.financialInfo.numberOfEmployees > 0) {
      if (!organization.documents.some((doc: any) => doc.type === 'paye_registration')) {
        errors.push('PAYE registration required when employing staff');
      }
      if (!organization.documents.some((doc: any) => doc.type === 'uif_registration')) {
        errors.push('UIF registration required when employing staff');
      }
    }
    
    // Perform compliance checks
    const complianceChecks = await this.performComplianceChecks(organization);
    
    // Calculate risk profile
    const riskProfile = this.calculateRiskScore(organization);
    
    // Add risk-based warnings
    if (riskProfile.overallRisk === 'high' || riskProfile.overallRisk === 'critical') {
      warnings.push('Organization flagged as high risk - enhanced due diligence required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      complianceChecks,
      riskProfile
    };
  }

  async getDefaultEmploymentTypes(
    tenantId: mongoose.Types.ObjectId, 
    createdBy: mongoose.Types.ObjectId
  ): Promise<any[]> {
    // Return the South African employment types as defined in the previous implementation
    return [
      {
        name: 'Permanent Employee (South African Labour Relations Act)',
        code: 'SA_PERM_EMP',
        category: 'permanent',
        classification: 'full_time',
        workHourRules: {
          standardHoursPerWeek: 45,
          maxHoursPerDay: 9,
          maxHoursPerWeek: 45,
          overtimeThreshold: { daily: 9, weekly: 45 },
          overtimeRates: { 
            standardOvertime: 1.5,
            weekendRate: 1.5,
            holidayRate: 2.0
          }
        },
        compliance: {
          jurisdiction: 'ZA',
          laborLaws: ['Basic Conditions of Employment Act', 'Labour Relations Act', 'Employment Equity Act']
        },
        entitlements: {
          paidTimeOff: {
            annualLeaveDays: 21,
            sickLeaveDays: 30,
            parentalLeaveDays: 10
          }
        },
        tenantId,
        createdBy,
        isDefault: true
      }
      // Additional employment types would be added here
    ];
  }

  calculateContractorTax(
    subtotal: number, 
    contractorClassification: string,
    additionalParams?: Record<string, any>
  ) {
    const vatRegistered = additionalParams?.vatRegistered || false;
    const vatRate = this.config.defaultVATRate || 15;
    
    // CRITICAL: Validate contractor classification under SA law FIRST
    const trueContractorTypes = ['independent_contractor', 'freelancer', 'consultant'];
    const employeeTypes = ['fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'];
    
    if (!trueContractorTypes.includes(contractorClassification)) {
      if (employeeTypes.includes(contractorClassification)) {
        throw new Error(
          `SA Labor Law Violation: ${contractorClassification} cannot issue invoices. ` +
          `This is an EMPLOYEE relationship requiring salary payments with PAYE/UIF deductions and BCEA benefits. ` +
          `Use payroll system, not invoicing.`
        );
      } else {
        throw new Error(
          `Invalid contractor classification for South Africa: ${contractorClassification}. ` +
          `Only independent contractors, freelancers, and consultants can issue invoices.`
        );
      }
    }
    
    let vatAmount = 0;
    let totalAmount = subtotal;
    
    // Only apply VAT if contractor is VAT registered AND is a true contractor
    if (vatRegistered && trueContractorTypes.includes(contractorClassification)) {
      vatAmount = (subtotal * vatRate) / 100;
      totalAmount = subtotal + vatAmount;
    }
    
    return {
      subtotal,
      vatAmount,
      vatRate: vatRegistered ? vatRate : 0,
      totalAmount,
      taxImplications: {
        contractorResponsible: vatRegistered 
          ? 'VAT registration and returns (15%), Income tax, Independent contractor status verification' 
          : 'Income tax, Independent contractor status verification',
        organizationResponsible: 
          'Verify true contractor status to avoid deemed employment. Withholding tax may apply for non-residents. ' +
          'Ensure no control/supervision that would create employment relationship.',
        requiredCertificates: [
          'Tax clearance certificate',
          'Independent contractor declaration',
          ...(vatRegistered ? ['VAT registration certificate'] : []),
          'Proof of separate business registration (if applicable)'
        ],
        complianceNotes: [
          'Must pass "control test" under SA Labour Relations Act',
          'No fixed working hours or workplace supervision',
          'Contractor uses own tools/equipment',
          'Can work for multiple clients simultaneously',
          'No employee benefits (leave, UIF, medical aid, etc.)'
        ]
      }
    };
  }
}