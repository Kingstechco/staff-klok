import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
  bulkCreateShifts,
  getShiftTemplates,
  createShiftTemplate,
  applyTemplate,
  getStaffUtilization
} from '../controllers/scheduleController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get shifts with filtering (staff can only see their own shifts)
router.get('/shifts', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isMongoId(),
  query('department').optional().trim(),
  query('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'no-show', 'cancelled']),
  handleValidationErrors
], getShifts);

// Get specific shift
router.get('/shifts/:id', getShift);

// Create shift (admin/manager only)
router.post('/shifts', [
  authorize(['admin', 'manager']),
  body('userId').isMongoId(),
  body('date').isISO8601(),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('position').trim().isLength({ min: 1, max: 100 }),
  body('department').trim().isLength({ min: 1, max: 100 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], createShift);

// Update shift (admin/manager only)
router.put('/shifts/:id', [
  authorize(['admin', 'manager']),
  body('userId').optional().isMongoId(),
  body('date').optional().isISO8601(),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('position').optional().trim().isLength({ min: 1, max: 100 }),
  body('department').optional().trim().isLength({ min: 1, max: 100 }),
  body('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'no-show', 'cancelled']),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
], updateShift);

// Delete shift (admin/manager only)
router.delete('/shifts/:id', authorize(['admin', 'manager']), deleteShift);

// Bulk create shifts (admin/manager only)
router.post('/shifts/bulk', [
  authorize(['admin', 'manager']),
  body('shifts').isArray({ min: 1 }),
  body('shifts.*.userId').isMongoId(),
  body('shifts.*.date').isISO8601(),
  body('shifts.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('shifts.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('shifts.*.position').trim().isLength({ min: 1, max: 100 }),
  body('shifts.*.department').trim().isLength({ min: 1, max: 100 }),
  handleValidationErrors
], bulkCreateShifts);

// Get shift templates (admin/manager only)
router.get('/templates', [
  authorize(['admin', 'manager']),
  query('department').optional().trim(),
  handleValidationErrors
], getShiftTemplates);

// Create shift template (admin/manager only)
router.post('/templates', [
  authorize(['admin', 'manager']),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('department').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('shifts').isArray({ min: 1 }),
  body('shifts.*.dayOfWeek').isInt({ min: 0, max: 6 }),
  body('shifts.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('shifts.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('shifts.*.position').trim().isLength({ min: 1, max: 100 }),
  body('shifts.*.staffCount').isInt({ min: 1 }),
  handleValidationErrors
], createShiftTemplate);

// Apply template to generate shifts (admin/manager only)
router.post('/templates/:id/apply', [
  authorize(['admin', 'manager']),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('userAssignments').isObject(),
  handleValidationErrors
], applyTemplate);

// Get staff utilization report (admin/manager only)
router.get('/utilization', [
  authorize(['admin', 'manager']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('department').optional().trim(),
  handleValidationErrors
], getStaffUtilization);

export default router;