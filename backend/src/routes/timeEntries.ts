import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTimeEntries,
  getTimeEntry,
  updateTimeEntry,
  approveTimeEntry,
  getWeeklyReport
} from '../controllers/timeEntryController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Clock in
router.post('/clock-in', [
  body('location.latitude').optional().isFloat(),
  body('location.longitude').optional().isFloat(),
  body('location.address').optional().trim(),
  body('location.ip').optional().isIP(),
  body('location.ssid').optional().trim(),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], clockIn);

// Clock out
router.post('/clock-out', [
  body('location.ip').optional().isIP(),
  body('location.ssid').optional().trim(),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], clockOut);

// Start break
router.post('/break/start', startBreak);

// End break
router.post('/break/end', endBreak);

// Get time entries (with filtering)
router.get('/', [
  query('userId').optional().isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['active', 'completed', 'cancelled']),
  query('isApproved').optional().isBoolean(),
  handleValidationErrors
], getTimeEntries);

// Get weekly report
router.get('/weekly-report', [
  query('weekOffset').optional().isInt({ min: -52, max: 0 }),
  handleValidationErrors
], getWeeklyReport);

// Get specific time entry
router.get('/:id', getTimeEntry);

// Update time entry (admin/manager only)
router.put('/:id', [
  authorize(['admin', 'manager']),
  body('clockIn').optional().isISO8601(),
  body('clockOut').optional().isISO8601(),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], updateTimeEntry);

// Approve time entry (admin/manager only)
router.patch('/:id/approve', authorize(['admin', 'manager']), approveTimeEntry);

export default router;