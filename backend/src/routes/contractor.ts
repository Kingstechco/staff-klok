import { Router, Request, Response } from 'express';
import { body, query, param } from 'express-validator';
import { ContractorController } from '../controllers/contractorController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant, requireFeature } from '../middleware/tenantResolver';
import { handleValidationErrors } from '../middleware/validation';
import { auditLog } from '../middleware/auditLogger';
import autoClockingService from '../services/autoClockingService';

const router = Router();

// Apply tenant resolution to all routes
router.use(resolveTenant);

// Contractor Registration & Setup Routes (No auth required for setup completion)

/**
 * POST /api/contractor/invite
 * Admin invites a contractor to join
 */
router.post('/invite', [
  authenticate,
  authorize(['admin', 'manager']),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('contractingAgency').optional().trim().isLength({ max: 100 }),
  body('department').optional().trim().isLength({ max: 50 }),
  body('manager').optional().isMongoId(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('startDate').optional().isISO8601(),
  body('defaultSchedule.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('defaultSchedule.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('defaultSchedule.workDays').optional().isArray(),
  body('defaultSchedule.hoursPerDay').optional().isInt({ min: 1, max: 24 }),
  handleValidationErrors,
  auditLog({
    action: 'contractor_invited',
    resource: 'contractor',
    severity: 'medium'
  })
], ContractorController.inviteContractor);

/**
 * POST /api/contractor/setup/:token
 * Contractor completes their setup
 */
router.post('/setup/:token', [
  param('token').isJWT(),
  body('pin').isLength({ min: 4, max: 6 }).isNumeric(),
  body('preferences').optional().isObject(),
  body('autoClockingSettings.enabled').optional().isBoolean(),
  body('autoClockingSettings.processingMode').optional().isIn(['proactive', 'reactive', 'weekly_batch']),
  body('workSchedule.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workSchedule.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('workSchedule.workDays').optional().isArray(),
  body('workSchedule.hoursPerDay').optional().isInt({ min: 1, max: 24 }),
  body('timezone').optional().trim(),
  handleValidationErrors
], ContractorController.completeSetup);

/**
 * GET /api/contractor/pending-approvals
 * Get contractors waiting for admin approval
 */
router.get('/pending-approvals', [
  authenticate,
  authorize(['admin']),
  auditLog({
    action: 'pending_approvals_viewed',
    resource: 'contractor',
    severity: 'low'
  })
], ContractorController.getPendingApprovals);

/**
 * POST /api/contractor/:contractorId/approve
 * Approve or reject contractor registration
 */
router.post('/:contractorId/approve', [
  authenticate,
  authorize(['admin']),
  param('contractorId').isMongoId(),
  body('approved').isBoolean(),
  body('overrideSettings').optional().isObject(),
  body('rejectionReason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
  auditLog({
    action: 'contractor_approval_decision',
    resource: 'contractor',
    severity: 'high'
  })
], ContractorController.approveContractor);

// Contractor Settings & Management Routes

/**
 * GET /api/contractor/settings
 * Get current contractor's settings
 */
router.get('/settings', [
  authenticate,
  authorize(['contractor'])
], ContractorController.getContractorSettings);

/**
 * PUT /api/contractor/settings
 * Update contractor auto-clocking settings
 */
router.put('/settings', [
  authenticate,
  authorize(['contractor']),
  body('autoClockingSettings').isObject(),
  body('autoClockingSettings.enabled').optional().isBoolean(),
  body('autoClockingSettings.processingMode').optional().isIn(['proactive', 'reactive', 'weekly_batch']),
  handleValidationErrors,
  auditLog({
    action: 'contractor_settings_updated',
    resource: 'contractor',
    severity: 'medium'
  })
], ContractorController.updateAutoClockingSettings);

// Exception Management Routes

/**
 * POST /api/contractor/exceptions
 * Report an exception (sick day, etc.)
 */
router.post('/exceptions', [
  authenticate,
  authorize(['contractor']),
  body('date').isISO8601(),
  body('endDate').optional().isISO8601(),
  body('type').isIn(['sick', 'vacation', 'holiday', 'unpaid_leave', 'personal', 'bereavement', 'jury_duty', 'custom']),
  body('reason').optional().trim().isLength({ max: 500 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('isFullDay').isBoolean(),
  body('hoursAffected').optional().isFloat({ min: 0, max: 24 }),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  handleValidationErrors,
  auditLog({
    action: 'exception_reported',
    resource: 'contractor_exception',
    severity: 'medium'
  })
], ContractorController.reportException);

/**
 * GET /api/contractor/exceptions
 * Get contractor's exceptions
 */
router.get('/exceptions', [
  authenticate,
  authorize(['contractor', 'admin', 'manager']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'auto_approved']),
  handleValidationErrors
], ContractorController.getExceptions);

// Auto-clocking Management Routes

/**
 * POST /api/contractor/:contractorId/auto-clock/trigger
 * Manually trigger auto-clocking for a contractor
 */
router.post('/:contractorId/auto-clock/trigger', [
  authenticate,
  authorize(['admin', 'manager']),
  param('contractorId').isMongoId(),
  body('date').optional().isISO8601(),
  handleValidationErrors,
  auditLog({
    action: 'auto_clocking_triggered',
    resource: 'contractor',
    severity: 'medium'
  })
], async (req: Request, res: Response) => {
  try {
    const { contractorId } = req.params;
    const { date } = req.body;
    
    const result = await autoClockingService.processSpecificContractor(
      contractorId, 
      date ? new Date(date) : undefined
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger auto-clocking' });
  }
});

/**
 * POST /api/contractor/:contractorId/auto-clock/regenerate
 * Regenerate auto entries for a date range
 */
router.post('/:contractorId/auto-clock/regenerate', [
  authenticate,
  authorize(['admin', 'manager']),
  param('contractorId').isMongoId(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  handleValidationErrors,
  auditLog({
    action: 'auto_entries_regenerated',
    resource: 'contractor',
    severity: 'high'
  })
], async (req: Request, res: Response) => {
  try {
    const { contractorId } = req.params;
    const { startDate, endDate } = req.body;
    
    const result = await autoClockingService.regenerateEntries(
      contractorId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      message: 'Entries regenerated successfully',
      processed: result.processed,
      skipped: result.skipped
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate entries' });
  }
});

/**
 * GET /api/contractor/auto-clock/statistics
 * Get auto-clocking system statistics
 */
router.get('/auto-clock/statistics', [
  authenticate,
  authorize(['admin', 'manager']),
  auditLog({
    action: 'auto_clocking_stats_viewed',
    resource: 'system',
    severity: 'low'
  })
], async (req: Request, res: Response) => {
  try {
    const stats = await autoClockingService.getStatistics((req as any).user.tenantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/contractor/auto-clock/health
 * Check auto-clocking service health
 */
router.get('/auto-clock/health', [
  authenticate,
  authorize(['admin']),
], async (_req: Request, res: Response) => {
  try {
    const health = autoClockingService.getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check service health' });
  }
});

/**
 * GET /api/contractor/dashboard
 * Get contractor management dashboard overview
 * Admin/Manager only - requires contractor management feature
 */
router.get('/dashboard', [
  authenticate,
  authorize(['admin', 'manager']),
  requireFeature('contractor_management'),
  auditLog({
    action: 'contractor_dashboard_viewed',
    resource: 'contractor',
    severity: 'low'
  })
], ContractorController.getContractorDashboard);

/**
 * GET /api/contractor/contractors
 * Get all contractors in the tenant
 * Admin/Manager only
 */
router.get('/contractors', [
  authenticate,
  authorize(['admin', 'manager']),
  requireFeature('contractor_management'),
  query('status').optional().isIn(['active', 'inactive', 'all']),
  query('department').optional().trim(),
  query('client').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  auditLog({
    action: 'contractors_list_viewed',
    resource: 'contractor',
    severity: 'low'
  })
], ContractorController.getAllContractors);

/**
 * GET /api/contractor/:contractorId/timesheet
 * Get detailed timesheet for a specific contractor
 * Admin/Manager/Client Contact only
 */
router.get('/:contractorId/timesheet', [
  authenticate,
  authorize(['admin', 'manager', 'client_contact']),
  requireFeature('contractor_management'),
  param('contractorId').isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('projectId').optional().isMongoId(),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'all']),
  handleValidationErrors,
  auditLog({
    action: 'contractor_timesheet_viewed',
    resource: 'contractor',
    severity: 'medium'
  })
], ContractorController.getContractorTimesheet);

/**
 * GET /api/contractor/:contractorId/timesheet/download
 * Download contractor timesheet in CSV/PDF format
 * Admin/Manager/Client Contact only
 */
router.get('/:contractorId/timesheet/download', [
  authenticate,
  authorize(['admin', 'manager', 'client_contact']),
  requireFeature('contractor_management'),
  param('contractorId').isMongoId(),
  query('month').isInt({ min: 1, max: 12 }),
  query('year').isInt({ min: 2020, max: 2030 }),
  query('format').optional().isIn(['csv', 'pdf', 'json']),
  query('projectId').optional().isMongoId(),
  handleValidationErrors,
  auditLog({
    action: 'contractor_timesheet_downloaded',
    resource: 'contractor',
    severity: 'medium'
  })
], ContractorController.downloadContractorTimesheet);

/**
 * POST /api/contractor/timesheets/bulk-approve
 * Bulk approve multiple contractor timesheets
 * Admin/Manager/Client Contact only
 */
router.post('/timesheets/bulk-approve', [
  authenticate,
  authorize(['admin', 'manager', 'client_contact']),
  requireFeature('contractor_management'),
  body('entryIds').isArray({ min: 1 }),
  body('entryIds.*').isMongoId(),
  body('approvalNotes').optional().trim().isLength({ max: 500 }),
  body('approverType').optional().isIn(['manager', 'client']),
  handleValidationErrors,
  auditLog({
    action: 'timesheets_bulk_approved',
    resource: 'time_entry',
    severity: 'high'
  })
], ContractorController.bulkApproveTimesheets);

/**
 * POST /api/contractor/timesheets/bulk-reject
 * Bulk reject multiple contractor timesheets
 * Admin/Manager/Client Contact only
 */
router.post('/timesheets/bulk-reject', [
  authenticate,
  authorize(['admin', 'manager', 'client_contact']),
  requireFeature('contractor_management'),
  body('entryIds').isArray({ min: 1 }),
  body('entryIds.*').isMongoId(),
  body('rejectionReason').trim().isLength({ min: 1, max: 500 }),
  body('approverType').optional().isIn(['manager', 'client']),
  handleValidationErrors,
  auditLog({
    action: 'timesheets_bulk_rejected',
    resource: 'time_entry',
    severity: 'high'
  })
], async (req: Request, res: Response) => {
  // Implementation similar to bulk approve but with rejected status
  try {
    const { entryIds, rejectionReason, approverType = 'manager' } = req.body;

    const results = await Promise.allSettled(
      entryIds.map(async (entryId: string) => {
        const TimeEntry = require('../models/TimeEntry').default;
        const entry = await TimeEntry.findOne({
          _id: entryId,
          tenantId: (req as any).tenant._id
        });

        if (!entry) {
          throw new Error(`Entry ${entryId} not found`);
        }

        entry.approvals.push({
          approverId: (req as any).user._id,
          approverType: approverType as 'manager' | 'client',
          status: 'rejected',
          timestamp: new Date(),
          notes: rejectionReason
        });

        entry.approvalStatus = 'rejected';
        await entry.save();

        return { entryId, status: 'rejected' };
      })
    );

    const successful = results.filter((r: any) => r.status === 'fulfilled').length;
    const failed = results.filter((r: any) => r.status === 'rejected').length;

    res.json({
      message: `Bulk rejection completed: ${successful} successful, ${failed} failed`,
      successful,
      failed,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject timesheets' });
  }
});

/**
 * GET /api/contractor/:contractorId/projects
 * Get all projects assigned to a contractor
 * Admin/Manager/Contractor (own)/Client Contact only
 */
router.get('/:contractorId/projects', [
  authenticate,
  param('contractorId').isMongoId(),
  query('status').optional().isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled', 'all']),
  query('clientId').optional().isMongoId(),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { contractorId } = req.params;
    const { status = 'active', clientId } = req.query;

    // Permission check - users can only view their own projects unless admin/manager/client
    if ((req as any).user.role === 'contractor' && (req as any).user._id.toString() !== contractorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const Project = require('../models/Project').default;
    
    const query: any = {
      tenantId: (req as any).tenant._id,
      'assignedContractors.contractorId': contractorId,
      'assignedContractors.isActive': true
    };

    if (status !== 'all') {
      query.status = status;
    }

    if (clientId) {
      query.clientId = clientId;
    }

    const projects = await Project.find(query)
      .populate('clientId', 'name email clientContactInfo')
      .populate('projectManagerId', 'name email')
      .sort({ startDate: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contractor projects' });
  }
});

/**
 * GET /api/contractor/:contractorId/analytics
 * Get analytics and performance data for a contractor
 * Admin/Manager/Client Contact only
 */
router.get('/:contractorId/analytics', [
  authenticate,
  authorize(['admin', 'manager', 'client_contact']),
  requireFeature('advanced_analytics'),
  param('contractorId').isMongoId(),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('projectId').optional().isMongoId(),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { contractorId } = req.params;
    const { period = 'month', projectId } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    const TimeEntry = require('../models/TimeEntry').default;
    
    const query: any = {
      userId: contractorId,
      tenantId: (req as any).tenant._id,
      clockIn: { $gte: startDate }
    };

    if (projectId) {
      query.projectId = projectId;
    }

    const entries = await TimeEntry.find(query)
      .populate('projectId', 'name clientName billing.defaultRate');

    // Calculate analytics
    const analytics = {
      period: {
        name: period,
        startDate,
        endDate: now
      },
      productivity: {
        totalHours: entries.reduce((sum: number, e: any) => sum + (e.totalHours || 0), 0),
        averageHoursPerDay: 0, // Will calculate below
        mostProductiveDay: null as any,
        leastProductiveDay: null as any
      },
      projects: {
        totalProjects: new Set(entries.map((e: any) => e.projectId?._id?.toString()).filter(Boolean)).size,
        projectDistribution: {} as { [key: string]: number } // Hours per project
      },
      earnings: {
        totalBillableAmount: 0,
        averageHourlyRate: 0
      },
      patterns: {
        workingDays: new Set<string>(),
        peakHours: {} as { [key: string]: number } // Hours distribution
      }
    };

    // Calculate detailed analytics
    const dailyHours: { [key: string]: number } = {};
    const hourlyDistribution: { [key: string]: number } = {};
    let totalBillable = 0;
    let totalRateWeightedHours = 0;

    entries.forEach((entry: any) => {
      const date = entry.clockIn.toISOString().split('T')[0];
      const hour = entry.clockIn.getHours();
      const hours = entry.totalHours || 0;
      const rate = entry.projectId?.billing?.defaultRate || 0;

      // Daily hours
      dailyHours[date] = (dailyHours[date] || 0) + hours;
      
      // Hourly distribution
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + hours;
      
      // Working days
      analytics.patterns.workingDays.add(date);
      
      // Project distribution
      const projectName = entry.projectId?.name || 'No Project';
      analytics.projects.projectDistribution[projectName] = 
        (analytics.projects.projectDistribution[projectName] || 0) + hours;
      
      // Earnings
      totalBillable += hours * rate;
      totalRateWeightedHours += hours * rate;
    });

    // Finalize calculations
    const workingDaysCount = analytics.patterns.workingDays.size;
    analytics.productivity.averageHoursPerDay = workingDaysCount > 0 ? 
      analytics.productivity.totalHours / workingDaysCount : 0;
    
    analytics.earnings.totalBillableAmount = totalBillable;
    analytics.earnings.averageHourlyRate = analytics.productivity.totalHours > 0 ?
      totalBillable / analytics.productivity.totalHours : 0;
    
    analytics.patterns.peakHours = hourlyDistribution;
    
    // Find most/least productive days
    const sortedDays = Object.entries(dailyHours).sort((a, b) => b[1] - a[1]);
    analytics.productivity.mostProductiveDay = sortedDays.length > 0 ? 
      { date: sortedDays[0][0], hours: sortedDays[0][1] } : null;
    analytics.productivity.leastProductiveDay = sortedDays.length > 0 ? 
      { date: sortedDays[sortedDays.length - 1][0], hours: sortedDays[sortedDays.length - 1][1] } : null;

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contractor analytics' });
  }
});

export default router;