import { Router } from 'express';
import { body } from 'express-validator';
import { 
  login, 
  quickClockIn, 
  getProfile, 
  updateProfile, 
  changePin 
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// Login with email and PIN
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric(),
  handleValidationErrors
], login);

// Quick clock-in with PIN only
router.post('/quick-login', [
  body('pin').isLength({ min: 4, max: 6 }).isNumeric(),
  handleValidationErrors
], quickClockIn);

// Get current user profile
router.get('/profile', authenticate, getProfile);

// Update profile
router.put('/profile', [
  authenticate,
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('department').optional().trim(),
  body('position').optional().trim(),
  handleValidationErrors
], updateProfile);

// Change PIN
router.put('/change-pin', [
  authenticate,
  body('currentPin').isLength({ min: 4, max: 6 }).isNumeric(),
  body('newPin').isLength({ min: 4, max: 6 }).isNumeric(),
  handleValidationErrors
], changePin);

export default router;