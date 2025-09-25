import { Router } from 'express';
import { getDashboardStats, getUserDashboard } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get general dashboard stats (all users can see basic stats)
router.get('/stats', getDashboardStats);

// Get user-specific dashboard
router.get('/user', getUserDashboard);

export default router;