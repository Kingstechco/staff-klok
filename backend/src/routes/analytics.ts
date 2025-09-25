import { Router } from 'express';
import { query } from 'express-validator';
import { getAnalytics, getPayrollAnalytics } from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication and manager/admin role
router.use(authenticate);
router.use(authorize(['admin', 'manager']));

// Get comprehensive analytics
router.get('/', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('department').optional().trim(),
  handleValidationErrors
], getAnalytics);

// Get payroll analytics
router.get('/payroll', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], getPayrollAnalytics);

export default router;