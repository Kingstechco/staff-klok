import { Router } from 'express';
import { body, query, param } from 'express-validator';
import HRController from '../controllers/hrController';
import { authenticate, authorize } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';
import { handleValidationErrors } from '../middleware/validation';
import { auditLog } from '../middleware/auditLogger';

const router = Router();

// Apply tenant resolution and authentication to all routes
router.use(resolveTenant);
router.use(authenticate);

// Employment Type Management Routes

/**
 * GET /api/hr/employment-types
 * Get all employment types for the tenant
 */
router.get('/employment-types', [
  authorize(['admin', 'manager']),
  auditLog({
    action: 'employment_types_viewed',
    resource: 'employment_type',
    severity: 'low'
  })
], HRController.getEmploymentTypes);

/**
 * POST /api/hr/employment-types
 * Create a new employment type
 */
router.post('/employment-types', [
  authorize(['admin']),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('code').trim().isLength({ min: 1, max: 20 }).toUpperCase(),
  body('category').isIn(['permanent', 'contract', 'temporary', 'intern', 'consultant']),
  body('classification').isIn(['full_time', 'part_time', 'casual', 'seasonal']),
  
  // Work hour rules validation
  body('workHourRules.standardHoursPerWeek').isFloat({ min: 1, max: 80 }),
  body('workHourRules.maxHoursPerDay').isFloat({ min: 1, max: 24 }),
  body('workHourRules.maxHoursPerWeek').isFloat({ min: 1, max: 168 }),
  body('workHourRules.minHoursPerWeek').optional().isFloat({ min: 0, max: 80 }),
  body('workHourRules.overtimeThreshold.daily').optional().isFloat({ min: 1, max: 24 }),
  body('workHourRules.overtimeThreshold.weekly').optional().isFloat({ min: 1, max: 168 }),
  body('workHourRules.overtimeRates.standardOvertime').isFloat({ min: 1.0, max: 5.0 }),
  
  // Break rules validation
  body('breakRules.minBreakDuration').isInt({ min: 5, max: 120 }),
  body('breakRules.maxWorkWithoutBreak').isInt({ min: 2, max: 12 }),
  body('breakRules.lunchBreakRequired').isBoolean(),
  body('breakRules.lunchBreakDuration').optional().isInt({ min: 15, max: 120 }),
  body('breakRules.restBetweenShifts').isInt({ min: 8, max: 24 }),
  
  // Scheduling rules validation
  body('schedulingRules.maxConsecutiveDays').isInt({ min: 1, max: 14 }),
  body('schedulingRules.minRestDaysPerWeek').isInt({ min: 1, max: 7 }),
  body('schedulingRules.advanceNoticeRequired').isInt({ min: 2, max: 168 }),
  body('schedulingRules.flexibleScheduling').isBoolean(),
  body('schedulingRules.remoteWorkAllowed').isBoolean(),
  body('schedulingRules.nightShiftAllowed').isBoolean(),
  body('schedulingRules.weekendWorkAllowed').isBoolean(),
  body('schedulingRules.holidayWorkAllowed').isBoolean(),
  
  // Entitlements validation
  body('entitlements.paidTimeOff.annualLeaveDays').isInt({ min: 0, max: 50 }),
  body('entitlements.paidTimeOff.sickLeaveDays').isInt({ min: 0, max: 30 }),
  body('entitlements.paidTimeOff.personalLeaveDays').isInt({ min: 0, max: 15 }),
  body('entitlements.healthInsurance').isBoolean(),
  body('entitlements.workersCompensation').isBoolean(),
  body('entitlements.retirementPlan').isBoolean(),
  
  // Compliance validation
  body('compliance.jurisdiction').trim().isLength({ min: 2, max: 5 }).toUpperCase(),
  body('compliance.backgroundCheckRequired').isBoolean(),
  body('compliance.drugTestingRequired').isBoolean(),
  
  // Employment terms validation
  body('employmentTerms.noticePeriodDays').isInt({ min: 0, max: 90 }),
  body('employmentTerms.severanceEligible').isBoolean(),
  
  // Time tracking rules validation
  body('timeTrackingRules.clockInRequired').isBoolean(),
  body('timeTrackingRules.locationRestrictions').isBoolean(),
  body('timeTrackingRules.autoClockingEligible').isBoolean(),
  body('timeTrackingRules.timesheetApprovalRequired').isBoolean(),
  
  // Payroll settings validation
  body('payrollSettings.payFrequency').isIn(['weekly', 'bi_weekly', 'semi_monthly', 'monthly']),
  body('payrollSettings.payrollProcessingDays').isInt({ min: 1, max: 14 }),
  body('payrollSettings.invoiceRequired').isBoolean(),
  body('payrollSettings.taxWithholding').isBoolean(),
  body('payrollSettings.benefitsDeduction').isBoolean(),
  
  handleValidationErrors,
  auditLog({
    action: 'employment_type_created',
    resource: 'employment_type',
    severity: 'high'
  })
], HRController.createEmploymentType);

/**
 * PUT /api/hr/employment-types/:id
 * Update an employment type
 */
router.put('/employment-types/:id', [
  authorize(['admin']),
  param('id').isMongoId(),
  // Same validation as create route (could be extracted to shared validator)
  handleValidationErrors,
  auditLog({
    action: 'employment_type_updated',
    resource: 'employment_type',
    severity: 'high'
  })
], HRController.updateEmploymentType);

/**
 * DELETE /api/hr/employment-types/:id
 * Deactivate an employment type
 */
router.delete('/employment-types/:id', [
  authorize(['admin']),
  param('id').isMongoId(),
  handleValidationErrors,
  auditLog({
    action: 'employment_type_deactivated',
    resource: 'employment_type',
    severity: 'high'
  })
], HRController.deactivateEmploymentType);

/**
 * POST /api/hr/employment-types/default-setup
 * Create default employment types for a new tenant
 */
router.post('/employment-types/default-setup', [
  authorize(['admin']),
  auditLog({
    action: 'default_employment_types_created',
    resource: 'employment_type',
    severity: 'medium'
  })
], HRController.createDefaultEmploymentTypes);

// Work Hour Validation Routes

/**
 * POST /api/hr/validate-work-hours
 * Validate proposed work hours against employment type rules
 */
router.post('/validate-work-hours', [
  authorize(['admin', 'manager']),
  body('userId').isMongoId(),
  body('clockIn').isISO8601(),
  body('clockOut').isISO8601(),
  body('breakDuration').optional().isInt({ min: 0, max: 480 }),
  handleValidationErrors
], HRController.validateWorkHours);

/**
 * POST /api/hr/validate-shift-scheduling
 * Validate if a shift can be scheduled based on employment rules
 */
router.post('/validate-shift-scheduling', [
  authorize(['admin', 'manager']),
  body('userId').isMongoId(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  handleValidationErrors
], HRController.validateShiftScheduling);

// Payroll and Compliance Routes

/**
 * POST /api/hr/calculate-payroll
 * Calculate payroll for a user for a specific pay period
 */
router.post('/calculate-payroll', [
  authorize(['admin', 'manager']),
  body('userId').isMongoId(),
  body('payPeriodStart').isISO8601(),
  body('payPeriodEnd').isISO8601(),
  handleValidationErrors,
  auditLog({
    action: 'payroll_calculated',
    resource: 'payroll',
    severity: 'medium'
  })
], HRController.calculatePayroll);

/**
 * GET /api/hr/compliance-report
 * Generate compliance report for HR regulations
 */
router.get('/compliance-report', [
  authorize(['admin', 'manager']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('employmentTypeId').optional().isMongoId(),
  handleValidationErrors,
  auditLog({
    action: 'compliance_report_generated',
    resource: 'compliance',
    severity: 'medium'
  })
], HRController.getComplianceReport);

// User Employment Type Management Routes

/**
 * PUT /api/hr/users/:id/employment-type
 * Update a user's employment type
 */
router.put('/users/:id/employment-type', [
  authorize(['admin', 'manager']),
  param('id').isMongoId(),
  body('employmentTypeId').isMongoId(),
  body('effectiveDate').optional().isISO8601(),
  body('reason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
  auditLog({
    action: 'user_employment_type_updated',
    resource: 'user',
    severity: 'high'
  })
], HRController.updateUserEmploymentType);

/**
 * PUT /api/hr/users/:id/leave-balances
 * Update user leave balances
 */
router.put('/users/:id/leave-balances', [
  authorize(['admin', 'manager']),
  param('id').isMongoId(),
  body('leaveType').isIn(['annualLeave', 'sickLeave', 'personalLeave', 'parentalLeave', 'studyLeave']),
  body('adjustment').isFloat(),
  body('reason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
  auditLog({
    action: 'leave_balance_adjusted',
    resource: 'user',
    severity: 'medium'
  })
], HRController.updateLeaveBalances);

// Bulk Operations Routes

/**
 * POST /api/hr/users/bulk-employment-type-update
 * Update employment type for multiple users
 */
router.post('/users/bulk-employment-type-update', [
  authorize(['admin']),
  body('userIds').isArray({ min: 1 }),
  body('userIds.*').isMongoId(),
  body('employmentTypeId').isMongoId(),
  body('effectiveDate').optional().isISO8601(),
  body('reason').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
  auditLog({
    action: 'bulk_employment_type_updated',
    resource: 'user',
    severity: 'high'
  })
], async (req: any, res: any) => {
  try {
    const { userIds, employmentTypeId, effectiveDate, reason } = req.body;
    const { tenantId } = req.tenant;
    
    const results = await Promise.allSettled(
      userIds.map((userId: string) => 
        HRController.updateUserEmploymentType({
          ...req,
          params: { id: userId }
        }, res)
      )
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      message: `Bulk employment type update completed: ${successful} successful, ${failed} failed`,
      successful,
      failed,
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employment types' });
  }
});

/**
 * POST /api/hr/leave-balances/annual-refresh
 * Refresh annual leave balances for all users based on their employment types
 */
router.post('/leave-balances/annual-refresh', [
  authorize(['admin']),
  body('year').isInt({ min: 2020, max: 2030 }),
  body('applyProRated').optional().isBoolean(),
  handleValidationErrors,
  auditLog({
    action: 'annual_leave_refresh',
    resource: 'leave_balance',
    severity: 'high'
  })
], async (req: any, res: any) => {
  try {
    const { year, applyProRated = true } = req.body;
    const { tenantId } = req.tenant;
    
    const users = await User.find({
      tenantId,
      employmentStatus: 'active'
    }).populate('employmentTypeId');
    
    let refreshed = 0;
    const errors: any[] = [];
    
    for (const user of users) {
      try {
        const employmentType = user.employmentTypeId as any;
        if (!employmentType) continue;
        
        let annualLeaveAllocation = employmentType.entitlements.paidTimeOff.annualLeaveDays;
        
        // Apply pro-rating for new hires
        if (applyProRated && user.hireDate && user.hireDate.getFullYear() === year) {
          const monthsWorked = 12 - user.hireDate.getMonth();
          annualLeaveAllocation = Math.floor((annualLeaveAllocation / 12) * monthsWorked);
        }
        
        // Reset annual leave balance
        if (!user.leaveBalances) {
          user.leaveBalances = {
            annualLeave: { available: 0, used: 0 },
            sickLeave: { available: 0, used: 0 },
            personalLeave: { available: 0, used: 0 },
            lastUpdated: new Date()
          };
        }
        
        user.leaveBalances.annualLeave.available = annualLeaveAllocation;
        user.leaveBalances.annualLeave.used = 0;
        user.leaveBalances.lastUpdated = new Date();
        
        await user.save();
        refreshed++;
        
      } catch (error: any) {
        errors.push({
          userId: user._id,
          name: user.name,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Annual leave refresh completed for ${year}`,
      refreshed,
      errors: errors.length,
      errorDetails: errors
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh annual leave balances' });
  }
});

export default router;