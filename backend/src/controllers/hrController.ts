import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TenantRequest } from '../middleware/tenantResolver';
import EmploymentType, { IEmploymentType } from '../models/EmploymentType';
import User from '../models/User';
import workHourRegulationService from '../services/workHourRegulationService';
import logger from '../utils/logger';

export class HRController {
  
  /**
   * GET /api/hr/employment-types
   * Get all employment types for the tenant
   */
  static async getEmploymentTypes(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const tenantId = req.tenant._id.toString();
      const employmentTypes = await workHourRegulationService.getAvailableEmploymentTypes(tenantId.toString());
      
      res.json({ employmentTypes });
    } catch (error) {
      logger.error('Error fetching employment types:', error);
      res.status(500).json({ error: 'Failed to fetch employment types' });
    }
  }
  
  /**
   * POST /api/hr/employment-types
   * Create a new employment type
   */
  static async createEmploymentType(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const tenantId = req.tenant._id.toString();
      const user = req.user;
      
      const employmentType = await workHourRegulationService.createEmploymentType(
        tenantId.toString(),
        req.body,
        user._id.toString()
      );
      
      res.status(201).json({ 
        message: 'Employment type created successfully',
        employmentType 
      });
    } catch (error) {
      logger.error('Error creating employment type:', error);
      res.status(500).json({ error: 'Failed to create employment type' });
    }
  }
  
  /**
   * PUT /api/hr/employment-types/:id
   * Update an employment type
   */
  static async updateEmploymentType(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant._id.toString();
      
      // If setting as default, unset other defaults first
      if (req.body.isDefault) {
        await EmploymentType.updateMany(
          { tenantId, isDefault: true },
          { $set: { isDefault: false } }
        );
      }
      
      const employmentType = await EmploymentType.findOneAndUpdate(
        { _id: id, tenantId },
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!employmentType) {
        return res.status(404).json({ error: 'Employment type not found' });
      }
      
      res.json({ 
        message: 'Employment type updated successfully',
        employmentType 
      });
    } catch (error) {
      logger.error('Error updating employment type:', error);
      res.status(500).json({ error: 'Failed to update employment type' });
    }
  }
  
  /**
   * DELETE /api/hr/employment-types/:id
   * Deactivate an employment type
   */
  static async deactivateEmploymentType(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenant._id.toString();
      
      // Check if any active users are using this employment type
      const usersWithType = await User.countDocuments({
        tenantId,
        employmentTypeId: id,
        employmentStatus: 'active'
      });
      
      if (usersWithType > 0) {
        return res.status(400).json({ 
          error: `Cannot deactivate employment type. ${usersWithType} active users are using this type.`
        });
      }
      
      const employmentType = await EmploymentType.findOneAndUpdate(
        { _id: id, tenantId },
        { 
          isActive: false, 
          expirationDate: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!employmentType) {
        return res.status(404).json({ error: 'Employment type not found' });
      }
      
      res.json({ message: 'Employment type deactivated successfully' });
    } catch (error) {
      logger.error('Error deactivating employment type:', error);
      res.status(500).json({ error: 'Failed to deactivate employment type' });
    }
  }
  
  /**
   * POST /api/hr/employment-types/default-setup
   * Create default employment types for a new tenant
   */
  static async createDefaultEmploymentTypes(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const tenantId = req.tenant._id.toString();
      const user = req.user;
      
      // Check if default types already exist
      const existingTypes = await EmploymentType.countDocuments({ tenantId });
      if (existingTypes > 0) {
        return res.status(400).json({ 
          error: 'Employment types already exist for this tenant'
        });
      }
      
      const defaultTypes = await (EmploymentType as any).createDefaultTypes(
        tenantId,
        user!._id
      );
      
      res.status(201).json({
        message: `Created ${defaultTypes.length} default employment types`,
        employmentTypes: defaultTypes
      });
    } catch (error) {
      logger.error('Error creating default employment types:', error);
      res.status(500).json({ error: 'Failed to create default employment types' });
    }
  }
  
  /**
   * POST /api/hr/validate-work-hours
   * Validate proposed work hours against employment type rules
   */
  static async validateWorkHours(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { userId, clockIn, clockOut, breakDuration = 0 } = req.body;
      
      if (!userId || !clockIn || !clockOut) {
        return res.status(400).json({ 
          error: 'userId, clockIn, and clockOut are required' 
        });
      }
      
      const validation = await workHourRegulationService.validateWorkHours(
        userId,
        new Date(clockIn),
        new Date(clockOut),
        breakDuration
      );
      
      res.json({ validation });
    } catch (error) {
      logger.error('Error validating work hours:', error);
      res.status(500).json({ error: 'Failed to validate work hours' });
    }
  }
  
  /**
   * POST /api/hr/validate-shift-scheduling
   * Validate if a shift can be scheduled based on employment rules
   */
  static async validateShiftScheduling(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { userId, startTime, endTime } = req.body;
      
      if (!userId || !startTime || !endTime) {
        return res.status(400).json({ 
          error: 'userId, startTime, and endTime are required' 
        });
      }
      
      const validation = await workHourRegulationService.validateShiftScheduling(
        userId,
        new Date(startTime),
        new Date(endTime)
      );
      
      res.json({ validation });
    } catch (error) {
      logger.error('Error validating shift scheduling:', error);
      res.status(500).json({ error: 'Failed to validate shift scheduling' });
    }
  }
  
  /**
   * POST /api/hr/calculate-payroll
   * Calculate payroll for a user for a specific pay period
   */
  static async calculatePayroll(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { userId, payPeriodStart, payPeriodEnd } = req.body;
      
      if (!userId || !payPeriodStart || !payPeriodEnd) {
        return res.status(400).json({ 
          error: 'userId, payPeriodStart, and payPeriodEnd are required' 
        });
      }
      
      const payroll = await workHourRegulationService.calculatePayroll(
        userId,
        new Date(payPeriodStart),
        new Date(payPeriodEnd)
      );
      
      res.json({ payroll });
    } catch (error) {
      logger.error('Error calculating payroll:', error);
      res.status(500).json({ error: 'Failed to calculate payroll' });
    }
  }
  
  /**
   * GET /api/hr/compliance-report
   * Generate compliance report for HR regulations
   */
  static async getComplianceReport(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const tenantId = req.tenant._id.toString();
      const { startDate, endDate, employmentTypeId } = req.query;
      
      const matchQuery: any = { tenantId, employmentStatus: 'active' };
      if (employmentTypeId) {
        matchQuery.employmentTypeId = employmentTypeId;
      }
      
      const users = await User.find(matchQuery)
        .populate('employmentTypeId')
        .populate('manager', 'name email');
      
      const complianceIssues = [];
      const expiringCertifications = [];
      const missingTraining = [];
      
      for (const user of users) {
        // Check for compliance issues
        if (user.compliance) {
          // Background check expiry
          if (user.compliance.backgroundCheckCompleted && user.compliance.backgroundCheckDate) {
            const daysSinceCheck = Math.floor(
              (new Date().getTime() - user.compliance.backgroundCheckDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceCheck > 1095) { // 3 years
              complianceIssues.push({
                userId: user._id,
                name: user.name,
                issue: 'Background check expired (>3 years)',
                severity: 'high'
              });
            }
          }
          
          // Check expiring certifications
          for (const cert of user.compliance.certifications) {
            if (cert.expirationDate) {
              const daysToExpiry = Math.floor(
                (cert.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysToExpiry <= 30) {
                expiringCertifications.push({
                  userId: user._id,
                  name: user.name,
                  certification: cert.name,
                  expirationDate: cert.expirationDate,
                  daysToExpiry
                });
              }
            }
          }
          
          // Check mandatory training completion
          const employmentType = user.employmentTypeId as unknown as IEmploymentType;
          if (employmentType && employmentType.entitlements.mandatoryTrainingRequired) {
            const missingTrainings = employmentType.entitlements.mandatoryTrainingRequired.filter(
              training => !user.compliance.mandatoryTrainingCompleted.includes(training)
            );
            if (missingTrainings.length > 0) {
              missingTraining.push({
                userId: user._id,
                name: user.name,
                missingTrainings
              });
            }
          }
        }
      }
      
      const report = {
        generatedAt: new Date(),
        totalEmployees: users.length,
        complianceIssues,
        expiringCertifications,
        missingTraining,
        summary: {
          employeesWithIssues: complianceIssues.length,
          certificationsExpiringSoon: expiringCertifications.length,
          employeesMissingTraining: missingTraining.length
        }
      };
      
      res.json({ report });
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  }
  
  /**
   * PUT /api/hr/users/:id/employment-type
   * Update a user's employment type
   */
  static async updateUserEmploymentType(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { id } = req.params;
      const { employmentTypeId, effectiveDate, reason } = req.body;
      const tenantId = req.tenant._id.toString();
      
      if (!employmentTypeId) {
        return res.status(400).json({ error: 'employmentTypeId is required' });
      }
      
      // Validate employment type exists and belongs to tenant
      const employmentType = await EmploymentType.findOne({
        _id: employmentTypeId,
        tenantId,
        isActive: true
      });
      
      if (!employmentType) {
        return res.status(404).json({ error: 'Employment type not found' });
      }
      
      // Update user
      const user = await User.findOneAndUpdate(
        { _id: id, tenantId },
        {
          employmentTypeId,
          workSchedule: {
            standardHoursPerWeek: employmentType.workHourRules.standardHoursPerWeek,
            workDays: [1, 2, 3, 4, 5], // Default Monday-Friday
            flexibleScheduling: employmentType.schedulingRules.flexibleScheduling
          },
          // Initialize leave balances based on employment type
          leaveBalances: {
            annualLeave: {
              available: employmentType.entitlements.paidTimeOff.annualLeaveDays,
              used: 0
            },
            sickLeave: {
              available: employmentType.entitlements.paidTimeOff.sickLeaveDays,
              used: 0
            },
            personalLeave: {
              available: employmentType.entitlements.paidTimeOff.personalLeaveDays,
              used: 0
            },
            lastUpdated: new Date()
          }
        },
        { new: true, runValidators: true }
      ).populate('employmentTypeId');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Log the employment type change
      logger.info(`Employment type updated for user ${user.name}`, {
        userId: user._id,
        previousType: user.employmentType,
        newType: employmentType.name,
        effectiveDate: effectiveDate || new Date(),
        reason,
        changedBy: req.user._id
      });
      
      res.json({
        message: 'Employment type updated successfully',
        user
      });
    } catch (error) {
      logger.error('Error updating user employment type:', error);
      res.status(500).json({ error: 'Failed to update employment type' });
    }
  }
  
  /**
   * PUT /api/hr/users/:id/leave-balances
   * Update user leave balances
   */
  static async updateLeaveBalances(req: AuthRequest & TenantRequest, res: Response) {
    try {
      const { id } = req.params;
      const { leaveType, adjustment, reason } = req.body;
      const tenantId = req.tenant._id.toString();
      
      if (!leaveType || typeof adjustment !== 'number') {
        return res.status(400).json({ 
          error: 'leaveType and adjustment (number) are required' 
        });
      }
      
      const validLeaveTypes = ['annualLeave', 'sickLeave', 'personalLeave', 'parentalLeave', 'studyLeave'];
      if (!validLeaveTypes.includes(leaveType)) {
        return res.status(400).json({ 
          error: `Invalid leave type. Must be one of: ${validLeaveTypes.join(', ')}` 
        });
      }
      
      const user = await User.findOne({ _id: id, tenantId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Initialize leave balances if they don't exist
      if (!user.leaveBalances) {
        user.leaveBalances = {
          annualLeave: { available: 0, used: 0 },
          sickLeave: { available: 0, used: 0 },
          personalLeave: { available: 0, used: 0 },
          parentalLeave: { available: 0, used: 0 },
          studyLeave: { available: 0, used: 0 },
          lastUpdated: new Date()
        };
      }
      
      // Apply adjustment
      if (adjustment > 0) {
        // Adding leave (available balance)
        user.leaveBalances[leaveType].available += adjustment;
      } else {
        // Using leave (used balance)
        user.leaveBalances[leaveType].used += Math.abs(adjustment);
        user.leaveBalances[leaveType].available = Math.max(
          0, 
          user.leaveBalances[leaveType].available - Math.abs(adjustment)
        );
      }
      
      user.leaveBalances.lastUpdated = new Date();
      await user.save();
      
      // Log the leave balance adjustment
      logger.info(`Leave balance adjusted for user ${user.name}`, {
        userId: user._id,
        leaveType,
        adjustment,
        reason,
        newBalance: user.leaveBalances[leaveType],
        adjustedBy: req.user._id
      });
      
      res.json({
        message: 'Leave balance updated successfully',
        leaveBalances: user.leaveBalances
      });
    } catch (error) {
      logger.error('Error updating leave balances:', error);
      res.status(500).json({ error: 'Failed to update leave balances' });
    }
  }
}

export default HRController;