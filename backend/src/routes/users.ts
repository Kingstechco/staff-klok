import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPin
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all users (admin/manager only)
router.get('/', [
  authorize(['admin', 'manager']),
  query('department').optional().trim(),
  query('role').optional().isIn(['admin', 'manager', 'staff']),
  query('isActive').optional().isBoolean(),
  validate
], getAllUsers);

// Create new user (admin only)
router.post('/', [
  authorize(['admin']),
  body('name').trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric(),
  body('role').optional().isIn(['admin', 'manager', 'staff']),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('overtimeRate').optional().isFloat({ min: 1 }),
  validate
], createUser);

// Get specific user (admin/manager only)
router.get('/:id', authorize(['admin', 'manager']), getUser);

// Update user (admin only)
router.put('/:id', [
  authorize(['admin']),
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'manager', 'staff']),
  body('department').optional().trim(),
  body('position').optional().trim(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('overtimeRate').optional().isFloat({ min: 1 }),
  body('isActive').optional().isBoolean(),
  validate
], updateUser);

// Deactivate user (admin only)
router.delete('/:id', authorize(['admin']), deleteUser);

// Reset user PIN (admin only)
router.patch('/:id/reset-pin', [
  authorize(['admin']),
  body('newPin').isLength({ min: 4, max: 6 }).isNumeric(),
  validate
], resetUserPin);

export default router;