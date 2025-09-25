import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import ContractorInvoice from '../../src/models/ContractorInvoice';
import { ContractorClassificationService } from '../../src/services/ContractorClassificationService';

describe('Contractor Classification and South African Labor Law Compliance', () => {
  const testOrganizationId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  describe('ContractorInvoice Model - SA Labor Law Validation', () => {
    
    it('should allow invoice creation for independent contractors', async () => {
      const validInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: 'INV-TEST-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Software Development Services',
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

      // Should save successfully
      await expect(validInvoice.validate()).resolves.toBeUndefined();
    });

    it('should allow invoice creation for freelancers', async () => {
      const freelancerInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'freelancer',
        invoiceNumber: 'INV-TEST-002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Web Design Project',
          quantity: 1,
          unitRate: 15000,
          units: 'fixed',
          totalAmount: 15000
        }],
        subtotal: 15000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 15000,
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

      await expect(freelancerInvoice.validate()).resolves.toBeUndefined();
    });

    it('should allow invoice creation for consultants', async () => {
      const consultantInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'consultant',
        invoiceNumber: 'INV-TEST-003',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Business Strategy Consulting',
          quantity: 5,
          unitRate: 2000,
          units: 'days',
          totalAmount: 10000
        }],
        subtotal: 10000,
        vatAmount: 1500,
        vatRate: 15,
        totalAmount: 11500,
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

      await expect(consultantInvoice.validate()).resolves.toBeUndefined();
    });

    it('should REJECT invoice creation for fixed-term employees', async () => {
      const employeeInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'fixed_term_employee',
        invoiceNumber: 'INV-TEST-004',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Should not be allowed',
          quantity: 1,
          unitRate: 10000,
          units: 'fixed',
          totalAmount: 10000
        }],
        subtotal: 10000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 10000,
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

      // Should fail validation with SA labor law message
      await expect(employeeInvoice.validate()).rejects.toThrow(
        /South African Labor Law Violation.*fixed_term_employee.*EMPLOYEES/
      );
    });

    it('should REJECT invoice creation for temporary employees', async () => {
      const tempEmployeeInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'temporary_employee',
        invoiceNumber: 'INV-TEST-005',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'This should fail',
          quantity: 1,
          unitRate: 10000,
          units: 'fixed',
          totalAmount: 10000
        }],
        subtotal: 10000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 10000,
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

      await expect(tempEmployeeInvoice.validate()).rejects.toThrow(
        /South African Labor Law Violation.*temporary_employee.*EMPLOYEES.*PAYE.*UIF.*BCEA/
      );
    });

    it('should REJECT invoice creation for casual workers', async () => {
      const casualWorkerInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'casual_worker',
        invoiceNumber: 'INV-TEST-006',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'This should also fail',
          quantity: 1,
          unitRate: 5000,
          units: 'fixed',
          totalAmount: 5000
        }],
        subtotal: 5000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 5000,
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

      await expect(casualWorkerInvoice.validate()).rejects.toThrow(
        /South African Labor Law Violation.*casual_worker.*EMPLOYEES/
      );
    });

    it('should provide correct compliance info for each contractor type', () => {
      const contractorInfo = ContractorInvoice.getContractorComplianceInfo('independent_contractor');
      expect(contractorInfo.canIssueInvoices).toBe(true);
      expect(contractorInfo.isEmployee).toBe(false);
      expect(contractorInfo.paymentMethod).toBe('Invoice-based payments');
      expect(contractorInfo.laborLawCompliance).toContain('not employment');

      const employeeInfo = ContractorInvoice.getContractorComplianceInfo('fixed_term_employee');
      expect(employeeInfo.canIssueInvoices).toBe(false);
      expect(employeeInfo.isEmployee).toBe(true);
      expect(employeeInfo.paymentMethod).toBe('Salary/wage payments through payroll');
      expect(employeeInfo.benefitsEntitled).toContain('BCEA benefits');
    });

    it('should correctly identify employee vs contractor relationships', () => {
      expect(ContractorInvoice.canContractorIssueInvoices('independent_contractor')).toBe(true);
      expect(ContractorInvoice.canContractorIssueInvoices('freelancer')).toBe(true);
      expect(ContractorInvoice.canContractorIssueInvoices('consultant')).toBe(true);
      
      expect(ContractorInvoice.canContractorIssueInvoices('fixed_term_employee')).toBe(false);
      expect(ContractorInvoice.canContractorIssueInvoices('temporary_employee')).toBe(false);
      expect(ContractorInvoice.canContractorIssueInvoices('casual_worker')).toBe(false);
      expect(ContractorInvoice.canContractorIssueInvoices('labour_broker_employee')).toBe(false);

      expect(ContractorInvoice.isEmployeeUnderSALaw('fixed_term_employee')).toBe(true);
      expect(ContractorInvoice.isEmployeeUnderSALaw('temporary_employee')).toBe(true);
      expect(ContractorInvoice.isEmployeeUnderSALaw('independent_contractor')).toBe(false);
    });
  });

  describe('ContractorClassificationService', () => {
    
    it('should validate contractor classification correctly', () => {
      // Strong contractor indicators
      const contractorDetails = {
        hasFixedWorkplace: false,
        hasFixedHours: false,
        isSupervised: false,
        usesCompanyEquipment: false,
        hasOtherClients: true,
        receivesTraining: false,
        hasEmployeeBenefits: false,
        paidRegularSalary: false,
        canSubstitute: true
      };

      const result = ContractorClassificationService.validateClassification(
        'independent_contractor', 
        contractorDetails
      );
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeLessThanOrEqual(1); // Should have minimal warnings
    });

    it('should flag high-risk employee relationships', () => {
      // Strong employee indicators
      const employeeDetails = {
        hasFixedWorkplace: true,
        hasFixedHours: true,
        isSupervised: true,
        usesCompanyEquipment: true,
        hasOtherClients: false,
        receivesTraining: true,
        hasEmployeeBenefits: true,
        paidRegularSalary: true,
        canSubstitute: false
      };

      const result = ContractorClassificationService.validateClassification(
        'independent_contractor',
        employeeDetails
      );

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('HIGH RISK'))).toBe(true);
      expect(result.warnings.some(w => w.includes('deemed employment'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('fixed_term_employee'))).toBe(true);
    });

    it('should recommend appropriate classification', () => {
      const projectWork = {
        hasFixedWorkplace: false,
        hasFixedHours: false,
        isSupervised: false,
        usesCompanyEquipment: false,
        hasOtherClients: true,
        receivesTraining: false,
        hasEmployeeBenefits: false,
        paidRegularSalary: false,
        canSubstitute: true,
        workDuration: 'short_term',
        workType: 'project'
      };

      const recommendation = ContractorClassificationService.recommendClassification(projectWork);
      
      expect(recommendation.recommendedClassification).toBe('freelancer');
      expect(recommendation.confidence).toBe('high');
      expect(recommendation.reasoning.some(r => r.includes('project-based'))).toBe(true);
    });

    it('should provide compliance requirements for each classification', () => {
      const contractorReqs = ContractorClassificationService.getComplianceRequirements('independent_contractor');
      expect(contractorReqs.paymentMethod).toContain('invoice');
      expect(contractorReqs.benefits).toContain('No BCEA');
      expect(contractorReqs.complianceRisks.some(risk => risk.includes('deemed employment'))).toBe(true);

      const employeeReqs = ContractorClassificationService.getComplianceRequirements('fixed_term_employee');
      expect(employeeReqs.paymentMethod).toContain('payroll');
      expect(employeeReqs.benefits).toContain('BCEA');
      expect(employeeReqs.taxObligations).toContain('PAYE');
    });

    it('should generate appropriate contract templates', () => {
      const contractorTemplate = ContractorClassificationService.getContractTemplate('independent_contractor');
      expect(contractorTemplate).toContain('INDEPENDENT CONTRACTOR AGREEMENT');
      expect(contractorTemplate).toContain('commercial relationship, NOT an employment');
      expect(contractorTemplate).toContain('No BCEA benefits');
      expect(contractorTemplate).toContain('invoice');

      const employeeTemplate = ContractorClassificationService.getContractTemplate('fixed_term_employee');
      expect(employeeTemplate).toContain('EMPLOYMENT CONTRACT');
      expect(employeeTemplate).toContain('BCEA Compliant');
      expect(employeeTemplate).toContain('45 hours per week maximum');
      expect(employeeTemplate).toContain('payroll');
    });
  });

  describe('South African Labor Law Edge Cases', () => {
    
    it('should handle mixed contractor/employee indicators', () => {
      const mixedDetails = {
        hasFixedWorkplace: true,    // Employee indicator
        hasFixedHours: false,       // Contractor indicator
        isSupervised: false,        // Contractor indicator
        usesCompanyEquipment: true, // Employee indicator
        hasOtherClients: false,     // Employee indicator
        receivesTraining: false,    // Contractor indicator
        hasEmployeeBenefits: false, // Contractor indicator
        paidRegularSalary: true,    // Strong employee indicator
        canSubstitute: false        // Employee indicator
      };

      const validation = ContractorClassificationService.validateClassification(
        'independent_contractor',
        mixedDetails
      );

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('MEDIUM RISK') || w.includes('HIGH RISK'))).toBe(true);
    });

    it('should enforce VAT registration requirements for high-turnover contractors', async () => {
      // Contractor with high turnover should register for VAT
      const highTurnoverInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: 'INV-HIGH-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Large contract work',
          quantity: 1,
          unitRate: 100000,
          units: 'fixed',
          totalAmount: 100000
        }],
        subtotal: 100000,
        vatAmount: 15000,
        vatRate: 15,
        totalAmount: 115000,
        taxInfo: {
          country: 'ZA',
          vatRegistered: true,
          vatNumber: '4987654321',
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

      await expect(highTurnoverInvoice.validate()).resolves.toBeUndefined();
    });

    it('should validate South African tax number formats', async () => {
      const invalidTaxInvoice = new ContractorInvoice({
        organizationId: testOrganizationId,
        contractorId: testUserId,
        contractorClassification: 'independent_contractor',
        invoiceNumber: 'INV-TAX-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        currency: 'ZAR',
        lineItems: [{
          description: 'Test work',
          quantity: 1,
          unitRate: 5000,
          units: 'fixed',
          totalAmount: 5000
        }],
        subtotal: 5000,
        vatAmount: 0,
        vatRate: 0,
        totalAmount: 5000,
        taxInfo: {
          country: 'ZA',
          vatRegistered: false,
          taxNumber: '123456789', // Invalid - should be 10 digits
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

      await expect(invalidTaxInvoice.validate()).rejects.toThrow(/Invalid tax number format/);
    });
  });
});