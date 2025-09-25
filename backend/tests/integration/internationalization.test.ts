import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ComplianceProviderFactory } from '../../src/services/ComplianceProviderFactory';
import { SouthAfricanComplianceProvider } from '../../src/providers/SouthAfricanComplianceProvider';
import OrganizationVerificationService from '../../src/services/organizationVerificationService';
import { EmploymentTypeFactory } from '../../src/services/EmploymentTypeFactory';
import Organization from '../../src/models/Organization';
import EmploymentType from '../../src/models/EmploymentType';
import ContractorInvoice from '../../src/models/ContractorInvoice';

describe('Internationalization Integration Tests', () => {
  let testOrganizationId: mongoose.Types.ObjectId;
  let testTenantId: mongoose.Types.ObjectId;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/staff_klok_test');
    }
    
    testTenantId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Cleanup
    await Organization.deleteMany({ legalName: { $regex: /Test.*International/ } });
    await EmploymentType.deleteMany({ tenantId: testTenantId });
    await ContractorInvoice.deleteMany({ organizationId: testOrganizationId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create a test organization for each test
    const testOrg = new Organization({
      legalName: 'Test International Corporation',
      organizationType: 'corporation',
      industryCode: 'tech',
      industryDescription: 'Technology Services',
      registrationNumber: '2024/123456/07', // SA format
      businessAddress: {
        street: '123 Test Street',
        city: 'Cape Town',
        state: 'Western Cape',
        postalCode: '8001',
        country: 'ZA',
        isVerified: false
      },
      phone: '+27211234567',
      email: 'test@international-corp.co.za',
      beneficialOwners: [{
        name: 'John Test',
        title: 'CEO',
        ownershipPercentage: 100,
        dateOfBirth: new Date('1980-01-01'),
        nationalId: '8001015009087',
        address: {
          street: '123 Test Street',
          city: 'Cape Town',
          state: 'Western Cape',
          postalCode: '8001',
          country: 'ZA',
          isVerified: false
        },
        isSignatory: true,
        isPoliticallyExposed: false,
        sanctionsCheck: {
          checked: false,
          status: 'pending'
        }
      }],
      authorizedSignatories: [],
      financialInfo: {
        estimatedAnnualRevenue: 5000000,
        numberOfEmployees: 25,
        payrollFrequency: 'monthly',
        currency: 'ZAR',
        bankAccount: {
          accountHolderName: 'Test International Corporation',
          bankName: 'Standard Bank',
          accountNumber: '12345678901',
          routingNumber: '051001',
          verified: false
        },
        taxInformation: {
          taxId: '1234567890',
          taxIdType: 'other',
          taxJurisdiction: 'ZA',
          taxExempt: false
        }
      },
      documents: [],
      complianceChecks: [],
      riskAssessment: {
        overallRisk: 'medium',
        riskFactors: {
          industryRisk: 5,
          geographicRisk: 5,
          ownershipRisk: 5,
          transactionRisk: 5,
          complianceRisk: 5
        },
        calculatedAt: new Date(),
        reviewRequiredAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      },
      status: 'pending_verification',
      verificationLevel: 'basic',
      verificationStartedAt: new Date(),
      requiredDocuments: [],
      submittedDocuments: [],
      verifiedDocuments: [],
      createdBy: testUserId
    });

    const savedOrg = await testOrg.save();
    testOrganizationId = savedOrg._id;
  });

  describe('ComplianceProviderFactory', () => {
    it('should initialize with South African provider', () => {
      expect(ComplianceProviderFactory.isCountrySupported('ZA')).toBe(true);
      expect(ComplianceProviderFactory.getSupportedCountries()).toContain('ZA');
    });

    it('should return South African compliance provider', () => {
      const provider = ComplianceProviderFactory.getProvider('ZA');
      expect(provider).toBeInstanceOf(SouthAfricanComplianceProvider);
      expect(provider.getConfig().countryCode).toBe('ZA');
      expect(provider.getConfig().currency).toBe('ZAR');
    });

    it('should throw error for unsupported country', () => {
      expect(() => {
        ComplianceProviderFactory.getProvider('XX');
      }).toThrow('No compliance provider available for country: XX');
    });

    it('should allow registering new providers', () => {
      class TestProvider extends SouthAfricanComplianceProvider {
        constructor() {
          super();
          this.config.countryCode = 'TEST';
          this.config.countryName = 'Test Country';
        }
      }

      ComplianceProviderFactory.registerProvider('TEST', TestProvider);
      expect(ComplianceProviderFactory.isCountrySupported('TEST')).toBe(true);
      
      const provider = ComplianceProviderFactory.getProvider('TEST');
      expect(provider.getConfig().countryCode).toBe('TEST');
    });
  });

  describe('South African Compliance Provider', () => {
    let provider: SouthAfricanComplianceProvider;

    beforeEach(() => {
      provider = new SouthAfricanComplianceProvider();
    });

    it('should validate SA company registration numbers correctly', () => {
      expect(provider.validateCompanyRegistration('2024/123456/07', 'corporation')).toBe(true);
      expect(provider.validateCompanyRegistration('CK2024/123456/07', 'llc')).toBe(true);
      expect(provider.validateCompanyRegistration('NPO123-456', 'nonprofit')).toBe(true);
      expect(provider.validateCompanyRegistration('invalid', 'corporation')).toBe(false);
    });

    it('should validate SA tax numbers correctly', () => {
      expect(provider.validateTaxNumber('1234567890')).toBe(true);
      expect(provider.validateTaxNumber('123456789')).toBe(false);
      expect(provider.validateTaxNumber('12345678901')).toBe(false);
    });

    it('should validate SA VAT numbers correctly', () => {
      expect(provider.validateVATNumber('4123456789')).toBe(true);
      expect(provider.validateVATNumber('5123456789')).toBe(false);
      expect(provider.validateVATNumber('412345678')).toBe(false);
    });

    it('should get required documents for different organization types', () => {
      const corpDocs = provider.getRequiredDocuments('corporation', 2000000, 10);
      expect(corpDocs.some(doc => doc.type === 'certificate_of_incorporation')).toBe(true);
      expect(corpDocs.some(doc => doc.type === 'vat_registration_certificate')).toBe(true);
      expect(corpDocs.some(doc => doc.type === 'paye_registration')).toBe(true);

      const soleProps = provider.getRequiredDocuments('sole_proprietorship', 500000, 0);
      expect(soleProps.some(doc => doc.type === 'id_document')).toBe(true);
      expect(soleProps.some(doc => doc.type === 'vat_registration_certificate')).toBe(false);
    });

    it('should calculate risk score based on SA factors', () => {
      const orgData = {
        industryCode: 'cryptocurrency',
        businessAddress: { state: 'Limpopo', country: 'ZA' },
        beneficialOwners: [
          { isPoliticallyExposed: true, address: { country: 'US' } }
        ],
        financialInfo: { estimatedAnnualRevenue: 100000000 },
        documents: [{ type: 'tax_registration', verified: true }]
      };

      const riskProfile = provider.calculateRiskScore(orgData);
      expect(riskProfile.overallRisk).toBe('high');
      expect(riskProfile.riskReasons).toContain('High-risk industry classification');
      expect(riskProfile.riskReasons).toContain('Politically Exposed Person (PEP) identified');
    });

    it('should generate employment types for South Africa', async () => {
      const employmentTypes = await provider.getDefaultEmploymentTypes(testTenantId, testUserId);
      
      expect(employmentTypes.length).toBeGreaterThan(0);
      expect(employmentTypes[0].compliance.jurisdiction).toBe('ZA');
      expect(employmentTypes[0].workHourRules.standardHoursPerWeek).toBe(45);
      expect(employmentTypes[0].entitlements.paidTimeOff.annualLeaveDays).toBe(21);
    });
  });

  describe('OrganizationVerificationService Integration', () => {
    it('should validate organization using country-specific provider', async () => {
      const result = await OrganizationVerificationService.validateOrganization(
        testOrganizationId.toString(), 
        'ZA'
      );

      expect(result.isValid).toBe(false); // Should have validation errors
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.complianceChecks).toBeDefined();
      expect(result.riskProfile).toBeDefined();
    });

    it('should auto-detect country from organization address', async () => {
      const result = await OrganizationVerificationService.validateOrganization(
        testOrganizationId.toString()
      );

      expect(result.complianceChecks).toBeDefined();
      expect(result.riskProfile).toBeDefined();
    });

    it('should update risk assessment with country provider', async () => {
      await OrganizationVerificationService.updateRiskAssessment(
        testOrganizationId.toString(),
        'ZA'
      );

      const org = await Organization.findById(testOrganizationId);
      expect(org!.riskAssessment.calculatedAt).toBeDefined();
      expect(org!.riskAssessment.overallRisk).toBeDefined();
    });

    it('should generate country-specific verification checklist', async () => {
      const org = await Organization.findById(testOrganizationId);
      const checklist = OrganizationVerificationService.generateVerificationChecklist(org!, 'ZA');

      expect(checklist.length).toBeGreaterThan(0);
      expect(checklist.some(cat => cat.category === 'SARS Tax Compliance')).toBe(true);
      expect(checklist.some(cat => cat.category === 'Employment Compliance')).toBe(true);
    });

    it('should return supported countries', () => {
      const countries = OrganizationVerificationService.getSupportedCountries();
      expect(countries).toContain('ZA');
      expect(OrganizationVerificationService.isCountrySupported('ZA')).toBe(true);
      expect(OrganizationVerificationService.isCountrySupported('XX')).toBe(false);
    });
  });

  describe('EmploymentTypeFactory Integration', () => {
    it('should create default employment types for South Africa', async () => {
      const types = await EmploymentTypeFactory.createDefaultTypes(testTenantId, testUserId, 'ZA');
      
      expect(types.length).toBeGreaterThan(0);
      expect(types[0].compliance.jurisdiction).toBe('ZA');
      expect(types[0].workHourRules.standardHoursPerWeek).toBe(45);
      
      // Verify they can be saved to database
      for (const typeData of types) {
        const employmentType = new EmploymentType({
          ...typeData,
          tenantId: testTenantId,
          createdBy: testUserId
        });
        await employmentType.save();
      }

      const savedTypes = await EmploymentType.find({ tenantId: testTenantId });
      expect(savedTypes.length).toBe(types.length);
    });

    it('should validate employment type for specific country', async () => {
      const validType = {
        compliance: { jurisdiction: 'ZA' },
        payrollSettings: { currency: 'ZAR' }
      };

      const invalidType = {
        compliance: { jurisdiction: 'US' }, // Wrong country
        payrollSettings: { currency: 'USD' }
      };

      const validResult = await EmploymentTypeFactory.validateEmploymentType(validType, 'ZA');
      expect(validResult.isValid).toBe(true);

      const invalidResult = await EmploymentTypeFactory.validateEmploymentType(invalidType, 'ZA');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Employment type jurisdiction must be ZA');
    });

    it('should get employment type template for country', () => {
      const template = EmploymentTypeFactory.getEmploymentTypeTemplate('ZA');
      expect(template.compliance.jurisdiction).toBe('ZA');
      expect(template.payrollSettings.currency).toBe('ZAR');
    });

    it('should return supported countries with details', () => {
      const countries = EmploymentTypeFactory.getSupportedCountries();
      expect(countries.length).toBeGreaterThan(0);
      expect(countries[0]).toHaveProperty('countryCode');
      expect(countries[0]).toHaveProperty('countryName');
      expect(countries[0]).toHaveProperty('supportedTypes');
    });
  });

  describe('ContractorInvoice Multi-Country Support', () => {
    it('should create invoice with country-specific tax info', async () => {
      const invoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: 'INV-2024-000001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Software Development',
          quantity: 40,
          unitRate: 500,
          units: 'hours',
          totalAmount: 20000
        }],
        subtotal: 20000,
        vatAmount: 3000,
        vatRate: 15,
        totalAmount: 23000,
        taxInfo: {
          country: 'ZA',
          vatRegistered: true,
          vatNumber: '4123456789',
          taxNumber: '1234567890',
          companyType: 'individual'
        },
        paymentTerms: 'Net 30 days',
        status: 'draft',
        complianceChecks: {
          vatCalculationVerified: false,
          contractorStatusVerified: false
        },
        communicationLog: [],
        generatedFromTimesheet: false,
        isRecurring: false,
        createdBy: testUserId
      });

      const savedInvoice = await invoice.save();
      expect(savedInvoice.taxInfo.country).toBe('ZA');
      expect(savedInvoice.currency).toBe('ZAR');
      expect(savedInvoice.vatRate).toBe(15);
    });

    it('should validate country-specific tax information', async () => {
      const invalidInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: 'INV-2024-000002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'USD', // Wrong currency for ZA
        lineItems: [{
          description: 'Software Development',
          quantity: 40,
          unitRate: 500,
          units: 'hours',
          totalAmount: 20000
        }],
        subtotal: 20000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 20000,
        taxInfo: {
          country: 'ZA',
          vatRegistered: false,
          taxNumber: '1234567890',
          companyType: 'individual'
        },
        paymentTerms: 'Net 30 days',
        status: 'draft',
        complianceChecks: {
          vatCalculationVerified: false,
          contractorStatusVerified: false
        },
        communicationLog: [],
        generatedFromTimesheet: false,
        isRecurring: false,
        createdBy: testUserId
      });

      await expect(invalidInvoice.save()).rejects.toThrow('Currency must be ZAR for South African tax compliance');
    });

    it('should calculate taxes using country provider', () => {
      const calculation = ContractorInvoice.calculateTax(
        20000, 
        'independent_contractor', 
        'ZA', 
        { vatRegistered: true, vatRate: 15 }
      );

      expect(calculation.subtotal).toBe(20000);
      expect(calculation.vatAmount).toBe(3000);
      expect(calculation.totalAmount).toBe(23000);
      expect(calculation.taxImplications.contractorResponsible).toContain('VAT');
    });

    it('should maintain backward compatibility with legacy SA tax info', async () => {
      const legacyInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: 'INV-2024-000003',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Consulting',
          quantity: 1,
          unitRate: 10000,
          units: 'fixed',
          totalAmount: 10000
        }],
        subtotal: 10000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 10000,
        // Using legacy field
        southAfricanTaxInfo: {
          country: 'ZA',
          vatRegistered: false,
          taxNumber: '1234567890',
          companyType: 'individual',
          uifContributor: false
        },
        paymentTerms: 'Net 30 days',
        status: 'draft',
        complianceChecks: {
          vatCalculationVerified: false,
          contractorStatusVerified: false
        },
        communicationLog: [],
        generatedFromTimesheet: false,
        isRecurring: false,
        createdBy: testUserId
      });

      const savedInvoice = await legacyInvoice.save();
      expect(savedInvoice.southAfricanTaxInfo!.country).toBe('ZA');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full organization setup with country-specific compliance', async () => {
      // 1. Create organization
      const org = await Organization.findById(testOrganizationId);
      expect(org!.businessAddress.country).toBe('ZA');

      // 2. Get required documents for the country
      const requiredDocs = OrganizationVerificationService.getRequiredDocuments(
        'corporation', 
        5000000, 
        25, 
        'ZA'
      );
      expect(requiredDocs.length).toBeGreaterThan(5);

      // 3. Validate organization
      const validation = await OrganizationVerificationService.validateOrganization(
        testOrganizationId.toString(),
        'ZA'
      );
      expect(validation).toBeDefined();

      // 4. Create employment types
      const employmentTypes = await EmploymentTypeFactory.createDefaultTypes(
        testTenantId,
        testUserId,
        'ZA'
      );
      expect(employmentTypes.length).toBeGreaterThan(0);

      // 5. Create contractor invoice
      const invoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: await ContractorInvoice.generateInvoiceNumber(testOrganizationId),
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Software Development',
          quantity: 40,
          unitRate: 500,
          units: 'hours',
          totalAmount: 20000
        }],
        subtotal: 20000,
        vatAmount: 3000,
        vatRate: 15,
        totalAmount: 23000,
        taxInfo: {
          country: 'ZA',
          vatRegistered: true,
          vatNumber: '4123456789',
          taxNumber: '1234567890',
          companyType: 'individual'
        },
        paymentTerms: 'Net 30 days',
        status: 'draft',
        complianceChecks: {
          vatCalculationVerified: false,
          contractorStatusVerified: false
        },
        communicationLog: [],
        generatedFromTimesheet: false,
        isRecurring: false,
        createdBy: testUserId
      });

      const savedInvoice = await invoice.save();
      expect(savedInvoice.invoiceNumber).toContain('INV-2024');

      // 6. Verify all components work together
      expect(org!.businessAddress.country).toBe('ZA');
      expect(employmentTypes[0].compliance.jurisdiction).toBe('ZA');
      expect(savedInvoice.taxInfo.country).toBe('ZA');
    });
  });
});