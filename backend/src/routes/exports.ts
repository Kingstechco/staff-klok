import { Router } from 'express';
import { query } from 'express-validator';
import {
  exportTimeEntries,
  exportPayrollReport,
  backupData
} from '../controllers/exportController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export time entries (admin/manager only)
router.get('/time-entries', [
  authorize(['admin', 'manager']),
  query('format').isIn(['csv', 'excel']).withMessage('Format must be csv or excel'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isMongoId(),
  query('includePayroll').optional().isBoolean(),
  query('department').optional().trim(),
  handleValidationErrors
], exportTimeEntries);

// Generate payroll report (admin/manager only)
router.get('/payroll', [
  authorize(['admin', 'manager']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('format').optional().isIn(['csv', 'excel']).withMessage('Format must be csv or excel'),
  handleValidationErrors
], exportPayrollReport);

// Full data backup (admin only)
router.get('/backup', authorize(['admin']), backupData);

export default router;