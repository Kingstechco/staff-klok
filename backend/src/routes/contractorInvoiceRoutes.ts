import express from 'express';
import { ContractorInvoiceController } from '../controllers/contractorInvoiceController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route GET /api/contractor-invoices/types
 * @desc Get all contractor types with compliance information
 * @access Private
 */
router.get('/types', ContractorInvoiceController.getContractorTypes);

/**
 * @route POST /api/contractor-invoices/check-eligibility
 * @desc Check if a contractor can issue invoices based on SA labor law
 * @access Private
 */
router.post('/check-eligibility', [
  body('contractorClassification')
    .isIn(['independent_contractor', 'freelancer', 'consultant', 'fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'])
    .withMessage('Invalid contractor classification'),
  body('workerDetails').optional().isObject(),
  validateRequest
], ContractorInvoiceController.checkContractorEligibility);

/**
 * @route POST /api/contractor-invoices/recommend-classification
 * @desc Get recommended contractor classification based on work arrangement
 * @access Private
 */
router.post('/recommend-classification', [
  body('workDetails').isObject().withMessage('Work details are required'),
  body('workDetails.hasFixedWorkplace').isBoolean(),
  body('workDetails.hasFixedHours').isBoolean(),
  body('workDetails.isSupervised').isBoolean(),
  body('workDetails.usesCompanyEquipment').isBoolean(),
  body('workDetails.hasOtherClients').isBoolean(),
  body('workDetails.receivesTraining').isBoolean(),
  body('workDetails.hasEmployeeBenefits').isBoolean(),
  body('workDetails.paidRegularSalary').isBoolean(),
  body('workDetails.canSubstitute').isBoolean(),
  body('workDetails.workDuration').isIn(['short_term', 'medium_term', 'long_term']),
  body('workDetails.workType').isIn(['core_business', 'specialized', 'temporary', 'project']),
  validateRequest
], ContractorInvoiceController.getRecommendedClassification);

/**
 * @route GET /api/contractor-invoices/compliance/:classification
 * @desc Get compliance requirements for a specific contractor classification
 * @access Private
 */
router.get('/compliance/:classification', [
  param('classification')
    .isIn(['independent_contractor', 'freelancer', 'consultant', 'fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'])
    .withMessage('Invalid contractor classification'),
  validateRequest
], ContractorInvoiceController.getComplianceRequirements);

/**
 * @route POST /api/contractor-invoices/validate
 * @desc Validate contractor invoice data before creation
 * @access Private
 */
router.post('/validate', [
  body('contractorClassification')
    .isIn(['independent_contractor', 'freelancer', 'consultant', 'fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'])
    .withMessage('Invalid contractor classification'),
  body('subtotal').optional().isFloat({ min: 0 }).withMessage('Subtotal must be a positive number'),
  body('taxInfo').optional().isObject(),
  body('taxInfo.vatRegistered').optional().isBoolean(),
  body('taxInfo.vatRate').optional().isFloat({ min: 0, max: 100 }),
  validateRequest
], ContractorInvoiceController.validateInvoice);

/**
 * @route POST /api/contractor-invoices
 * @desc Create a new contractor invoice with SA labor law validation
 * @access Private
 */
router.post('/', [
  // Basic invoice validation
  body('contractorId').isMongoId().withMessage('Valid contractor ID is required'),
  body('contractorClassification')
    .isIn(['independent_contractor', 'freelancer', 'consultant', 'fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee'])
    .withMessage('Invalid contractor classification'),
  
  // Invoice details
  body('invoiceDate').isISO8601().toDate().withMessage('Valid invoice date is required'),
  body('dueDate').optional().isISO8601().toDate(),
  body('periodStart').isISO8601().toDate().withMessage('Period start date is required'),
  body('periodEnd').isISO8601().toDate().withMessage('Period end date is required'),
  body('currency').equals('ZAR').withMessage('Currency must be ZAR for South African compliance'),
  
  // Line items
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').isLength({ min: 1 }).withMessage('Line item description is required'),
  body('lineItems.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('lineItems.*.unitRate').isFloat({ min: 0 }).withMessage('Unit rate must be non-negative'),
  body('lineItems.*.units').isIn(['hours', 'days', 'weeks', 'months', 'fixed']).withMessage('Invalid units'),
  body('lineItems.*.totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be non-negative'),
  
  // Totals
  body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal must be non-negative'),
  body('vatAmount').isFloat({ min: 0 }).withMessage('VAT amount must be non-negative'),
  body('vatRate').isFloat({ min: 0, max: 100 }).withMessage('VAT rate must be between 0 and 100'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be non-negative'),
  
  // Tax information
  body('taxInfo').isObject().withMessage('Tax information is required'),
  body('taxInfo.country').equals('ZA').withMessage('Country must be ZA for South African compliance'),
  body('taxInfo.vatRegistered').isBoolean().withMessage('VAT registered status must be specified'),
  body('taxInfo.vatNumber').optional().matches(/^4\d{9}$/).withMessage('Invalid South African VAT number format'),
  body('taxInfo.taxNumber').matches(/^\d{10}$/).withMessage('South African tax number must be 10 digits'),
  body('taxInfo.companyType').isIn(['sole_proprietor', 'close_corporation', 'pty_ltd', 'individual', 'llc', 'corporation', 'partnership']).withMessage('Invalid company type'),
  
  // Payment terms
  body('paymentTerms').isLength({ min: 1 }).withMessage('Payment terms are required'),
  
  validateRequest
], ContractorInvoiceController.createInvoice);

/**
 * @route GET /api/contractor-invoices
 * @desc Get contractor invoices with filtering and compliance information
 * @access Private
 */
router.get('/', [
  query('contractorId').optional().isMongoId().withMessage('Invalid contractor ID'),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status'),
  query('classification').optional().isIn(['independent_contractor', 'freelancer', 'consultant', 'fixed_term_employee', 'temporary_employee', 'casual_worker', 'labour_broker_employee']).withMessage('Invalid classification'),
  validateRequest
], ContractorInvoiceController.getInvoices);

export default router;