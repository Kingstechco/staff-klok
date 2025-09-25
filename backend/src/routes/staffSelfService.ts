import { Router } from 'express';
import { query } from 'express-validator';
import {
  getMyTimeEntries,
  getMyPayrollSummary,
  getMySchedule,
  downloadMyTimesheet,
  getMyProfile,
  getMyStats
} from '../controllers/staffSelfServiceController';
import { authenticate } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication and are automatically restricted to staff's own data
router.use(authenticate);

// Get my time entries with filtering
router.get('/time-entries', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['active', 'completed', 'cancelled']),
  handleValidationErrors
], getMyTimeEntries);

// Get my payroll summary for a date range
router.get('/payroll-summary', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], getMyPayrollSummary);

// Get my upcoming schedule
router.get('/schedule', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], getMySchedule);

// Download my timesheet (CSV/PDF format)
router.get('/timesheet/download', [
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('format').optional().isIn(['csv', 'pdf']),
  handleValidationErrors
], downloadMyTimesheet);

// Get my complete profile (read-only)
router.get('/profile', getMyProfile);

// Get my work statistics
router.get('/stats', [
  query('period').optional().isIn(['week', 'month', 'year']),
  handleValidationErrors
], getMyStats);

export default router;