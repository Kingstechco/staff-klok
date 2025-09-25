import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ContractorInvoice, { ContractorClassification } from '../models/ContractorInvoice';
import { ContractorClassificationService } from '../services/ContractorClassificationService';
import { ComplianceProviderFactory } from '../services/ComplianceProviderFactory';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export class ContractorInvoiceController {
  
  /**
   * Check if a contractor can issue invoices based on SA labor law
   */
  static async checkContractorEligibility(req: AuthenticatedRequest, res: Response) {
    try {
      const { contractorClassification, workerDetails } = req.body;

      if (!contractorClassification) {
        return res.status(400).json({
          success: false,
          message: 'Contractor classification is required'
        });
      }

      // Get basic eligibility
      const canIssueInvoices = ContractorInvoice.canContractorIssueInvoices(contractorClassification);
      const isEmployee = ContractorInvoice.isEmployeeUnderSALaw(contractorClassification);
      const complianceInfo = ContractorInvoice.getContractorComplianceInfo(contractorClassification);

      // If worker details provided, perform detailed validation
      let validation = null;
      if (workerDetails) {
        validation = ContractorClassificationService.validateClassification(
          contractorClassification,
          workerDetails
        );
      }

      return res.json({
        success: true,
        data: {
          contractorClassification,
          canIssueInvoices,
          isEmployee,
          complianceInfo,
          validation,
          recommendations: validation?.recommendations || []
        }
      });

    } catch (error) {
      logger.error('Error checking contractor eligibility:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check contractor eligibility',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recommended classification based on work arrangement
   */
  static async getRecommendedClassification(req: AuthenticatedRequest, res: Response) {
    try {
      const { workDetails } = req.body;

      if (!workDetails) {
        return res.status(400).json({
          success: false,
          message: 'Work details are required for classification recommendation'
        });
      }

      const recommendation = ContractorClassificationService.recommendClassification(workDetails);

      return res.json({
        success: true,
        data: {
          recommendation,
          complianceInfo: ContractorInvoice.getContractorComplianceInfo(
            recommendation.recommendedClassification
          ),
          contractTemplate: ContractorClassificationService.getContractTemplate(
            recommendation.recommendedClassification
          )
        }
      });

    } catch (error) {
      logger.error('Error getting classification recommendation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get classification recommendation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create contractor invoice with SA labor law validation
   */
  static async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { contractorClassification, ...invoiceData } = req.body;
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // CRITICAL: Pre-validate contractor classification
      if (!ContractorInvoice.canContractorIssueInvoices(contractorClassification)) {
        const complianceInfo = ContractorInvoice.getContractorComplianceInfo(contractorClassification);
        
        return res.status(400).json({
          success: false,
          message: `South African Labor Law Violation: ${contractorClassification} workers cannot issue invoices.`,
          details: {
            classification: contractorClassification,
            canIssueInvoices: false,
            isEmployee: ContractorInvoice.isEmployeeUnderSALaw(contractorClassification),
            paymentMethod: complianceInfo.paymentMethod,
            laborLawCompliance: complianceInfo.laborLawCompliance,
            recommendation: 'Use payroll system for employee payments, not invoicing system'
          }
        });
      }

      // Generate invoice number
      const invoiceNumber = await ContractorInvoice.generateInvoiceNumber(
        new mongoose.Types.ObjectId(organizationId)
      );

      // Create invoice
      const invoice = new ContractorInvoice({
        ...invoiceData,
        organizationId: new mongoose.Types.ObjectId(organizationId),
        contractorClassification,
        invoiceNumber,
        createdBy: new mongoose.Types.ObjectId(userId)
      });

      // Validate and save (will trigger SA labor law validation)
      await invoice.save();

      // Calculate tax implications using country-specific provider
      const taxCalculation = ContractorInvoice.calculateTax(
        invoice.subtotal,
        contractorClassification,
        'ZA',
        {
          vatRegistered: invoice.taxInfo?.vatRegistered || false,
          vatRate: invoice.vatRate
        }
      );

      return res.status(201).json({
        success: true,
        message: 'Contractor invoice created successfully',
        data: {
          invoice: invoice.toJSON(),
          taxCalculation,
          complianceInfo: ContractorInvoice.getContractorComplianceInfo(contractorClassification)
        }
      });

    } catch (error) {
      logger.error('Error creating contractor invoice:', error);
      
      // Check if it's a SA labor law validation error
      if (error instanceof Error && error.message.includes('South African Labor Law Violation')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          type: 'LABOR_LAW_VIOLATION'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get contractor invoices with compliance status
   */
  static async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const { contractorId, status, classification } = req.query;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const filter: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
      
      if (contractorId) filter.contractorId = new mongoose.Types.ObjectId(contractorId as string);
      if (status) filter.status = status;
      if (classification) filter.contractorClassification = classification;

      const invoices = await ContractorInvoice.find(filter)
        .populate('contractorId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(50);

      // Add compliance information to each invoice
      const invoicesWithCompliance = invoices.map(invoice => ({
        ...invoice.toJSON(),
        complianceInfo: ContractorInvoice.getContractorComplianceInfo(invoice.contractorClassification),
        canIssueInvoices: ContractorInvoice.canContractorIssueInvoices(invoice.contractorClassification),
        isEmployee: ContractorInvoice.isEmployeeUnderSALaw(invoice.contractorClassification)
      }));

      return res.json({
        success: true,
        data: {
          invoices: invoicesWithCompliance,
          total: invoices.length
        }
      });

    } catch (error) {
      logger.error('Error fetching invoices:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch invoices',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get compliance requirements for contractor types
   */
  static async getComplianceRequirements(req: AuthenticatedRequest, res: Response) {
    try {
      const { classification } = req.params;

      if (!classification) {
        return res.status(400).json({
          success: false,
          message: 'Classification parameter is required'
        });
      }

      const complianceInfo = ContractorInvoice.getContractorComplianceInfo(classification as ContractorClassification);
      const requirements = ContractorClassificationService.getComplianceRequirements(classification as ContractorClassification);
      const contractTemplate = ContractorClassificationService.getContractTemplate(classification as ContractorClassification);

      return res.json({
        success: true,
        data: {
          classification,
          canIssueInvoices: ContractorInvoice.canContractorIssueInvoices(classification as ContractorClassification),
          isEmployee: ContractorInvoice.isEmployeeUnderSALaw(classification as ContractorClassification),
          complianceInfo,
          requirements,
          contractTemplate
        }
      });

    } catch (error) {
      logger.error('Error getting compliance requirements:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get compliance requirements',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate contractor invoice before creation
   */
  static async validateInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { contractorClassification, taxInfo, subtotal } = req.body;

      if (!contractorClassification) {
        return res.status(400).json({
          success: false,
          message: 'Contractor classification is required for validation'
        });
      }

      // Check if classification allows invoicing
      const canIssueInvoices = ContractorInvoice.canContractorIssueInvoices(contractorClassification);
      const isEmployee = ContractorInvoice.isEmployeeUnderSALaw(contractorClassification);

      const validationResult = {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[],
        complianceInfo: ContractorInvoice.getContractorComplianceInfo(contractorClassification)
      };

      if (!canIssueInvoices) {
        validationResult.isValid = false;
        validationResult.errors.push(
          `${contractorClassification} workers cannot issue invoices under South African labor law`
        );
        
        if (isEmployee) {
          validationResult.errors.push(
            'This classification requires employee treatment with salary payments, PAYE deductions, and BCEA benefits'
          );
        }
      }

      // Tax calculation validation
      if (canIssueInvoices && subtotal) {
        try {
          const taxCalculation = ContractorInvoice.calculateTax(
            subtotal,
            contractorClassification,
            'ZA',
            {
              vatRegistered: taxInfo?.vatRegistered || false,
              vatRate: taxInfo?.vatRate || 15
            }
          );

          validationResult.warnings.push('Tax calculation preview available');
          Object.assign(validationResult, { taxCalculation });

        } catch (taxError) {
          validationResult.errors.push(
            taxError instanceof Error ? taxError.message : 'Tax calculation failed'
          );
          validationResult.isValid = false;
        }
      }

      return res.json({
        success: true,
        data: validationResult
      });

    } catch (error) {
      logger.error('Error validating invoice:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get contractor types and their compliance status
   */
  static async getContractorTypes(req: AuthenticatedRequest, res: Response) {
    try {
      const contractorTypes = [
        'independent_contractor',
        'freelancer', 
        'consultant',
        'fixed_term_employee',
        'temporary_employee',
        'casual_worker',
        'labour_broker_employee'
      ] as ContractorClassification[];

      const typesWithCompliance = contractorTypes.map(type => ({
        classification: type,
        canIssueInvoices: ContractorInvoice.canContractorIssueInvoices(type),
        isEmployee: ContractorInvoice.isEmployeeUnderSALaw(type),
        complianceInfo: ContractorInvoice.getContractorComplianceInfo(type),
        requirements: ContractorClassificationService.getComplianceRequirements(type)
      }));

      return res.json({
        success: true,
        data: {
          contractorTypes: typesWithCompliance,
          invoiceEligibleTypes: typesWithCompliance.filter(type => type.canIssueInvoices),
          employeeTypes: typesWithCompliance.filter(type => type.isEmployee)
        }
      });

    } catch (error) {
      logger.error('Error getting contractor types:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get contractor types',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}