import { Router } from 'express';
import { body, query } from 'express-validator';
import { TenantController } from '../controllers/tenantController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant, requireFeature } from '../middleware/tenantResolver';
import { handleValidationErrors } from '../middleware/validation';
import { auditLog } from '../middleware/auditLogger';

const router = Router();

/**
 * Public tenant creation route (for new signups)
 * POST /api/tenant/create
 */
router.post('/create', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('subdomain').trim().isLength({ min: 2, max: 50 }).matches(/^[a-z0-9-]+$/),
  body('businessType').isIn(['retail', 'restaurant', 'office', 'healthcare', 'manufacturing', 'contractors']),
  body('industry').optional().trim().isLength({ max: 100 }),
  body('timezone').optional().trim().isLength({ max: 50 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('adminUser.name').trim().isLength({ min: 1, max: 100 }),
  body('adminUser.email').isEmail().normalizeEmail(),
  body('adminUser.pin').isLength({ min: 4, max: 8 }).matches(/^\d+$/),
  body('adminUser.phone').optional().trim().isMobilePhone('any'),
  body('contactInfo').optional().isObject(),
  body('subscriptionPlan').optional().isIn(['basic', 'professional', 'enterprise', 'contractor']),
  handleValidationErrors
], TenantController.createTenant);

/**
 * Get subscription plans and pricing
 * GET /api/tenant/plans
 */
router.get('/plans', TenantController.getSubscriptionPlans);

/**
 * Get available business types
 * GET /api/tenant/business-types
 */
router.get('/business-types', TenantController.getBusinessTypes);

// Apply tenant resolution and authentication to remaining routes
router.use(resolveTenant);
router.use(authenticate);

/**
 * Get tenant information
 * GET /api/tenant/info
 */
router.get('/info', [
  authorize(['admin', 'manager']),
  auditLog({
    action: 'tenant_info_viewed',
    resource: 'tenant',
    severity: 'low'
  })
], TenantController.getTenantInfo);

/**
 * Update tenant settings
 * PUT /api/tenant/settings
 */
router.put('/settings', [
  authorize(['admin']),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('businessType').optional().isIn(['retail', 'restaurant', 'office', 'healthcare', 'manufacturing', 'contractors']),
  body('timezone').optional().trim().isLength({ max: 50 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('settings').optional().isObject(),
  body('contactInfo').optional().isObject(),
  handleValidationErrors,
  auditLog({
    action: 'tenant_settings_updated',
    resource: 'tenant',
    severity: 'medium'
  })
], TenantController.updateTenantSettings);

/**
 * Update subscription plan
 * PUT /api/tenant/subscription
 */
router.put('/subscription', [
  authorize(['admin']),
  requireFeature('subscription_management'),
  body('plan').isIn(['basic', 'professional', 'enterprise', 'contractor']),
  body('billingCycle').optional().isIn(['monthly', 'annual']),
  handleValidationErrors,
  auditLog({
    action: 'subscription_updated',
    resource: 'tenant',
    severity: 'high'
  })
], TenantController.updateSubscription);

/**
 * Suspend/Activate tenant (Super admin only)
 * POST /api/tenant/:tenantId/status
 */
router.post('/:tenantId/status', [
  authorize(['admin']), // This would need super admin check in real implementation
  body('action').isIn(['suspend', 'activate']),
  body('reason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
  auditLog({
    action: 'tenant_status_changed',
    resource: 'tenant',
    severity: 'critical'
  })
], TenantController.toggleTenantStatus);

export default router;