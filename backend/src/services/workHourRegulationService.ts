import { startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInHours, format, addDays, isWeekend } from 'date-fns';
import User from '../models/User';
import TimeEntry from '../models/TimeEntry';
import EmploymentType, { IEmploymentType } from '../models/EmploymentType';
import logger from '../utils/logger';

export interface WorkHourValidation {
  isValid: boolean;
  violations: {
    type: 'DAILY_LIMIT' | 'WEEKLY_LIMIT' | 'CONSECUTIVE_DAYS' | 'REST_PERIOD' | 'BREAK_REQUIRED' | 'OVERTIME_LIMIT';
    message: string;
    severity: 'warning' | 'error' | 'critical';
    currentValue: number;
    allowedValue: number;
  }[];
  warnings: string[];
  calculatedHours: {
    regularHours: number;
    overtimeHours: number;
    premiumOvertimeHours: number;
    weekendHours: number;
    holidayHours: number;
  };
  breakRequirements: {
    breakRequired: boolean;
    lunchRequired: boolean;
    minimumBreakMinutes: number;
    actualBreakMinutes: number;
  };
}

export interface ShiftValidation {
  canSchedule: boolean;
  conflicts: {
    type: 'REST_PERIOD' | 'MAX_CONSECUTIVE' | 'DAILY_LIMIT' | 'WEEKLY_LIMIT' | 'TIME_RESTRICTION';
    message: string;
    conflictingShifts?: any[];
  }[];
  recommendations: string[];
}

export interface PayrollCalculation {
  userId: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  premiumOvertimeHours: number;
  weekendHours: number;
  holidayHours: number;
  regularPay: number;
  overtimePay: number;
  premiumOvertimePay: number;
  weekendPay: number;
  holidayPay: number;
  totalGrossPay: number;
  violations: any[];
}

export class WorkHourRegulationService {
  
  /**
   * Validate work hours for a specific time entry against employment type rules
   */
  async validateWorkHours(
    userId: string, 
    clockIn: Date, 
    clockOut: Date,
    breakDuration: number = 0
  ): Promise<WorkHourValidation> {
    
    const user = await User.findById(userId).populate('employmentTypeId');
    if (!user || !user.employmentTypeId) {
      throw new Error('User or employment type not found');
    }

    const employmentType = user.employmentTypeId as unknown as IEmploymentType;
    const shiftHours = differenceInHours(clockOut, clockIn) - (breakDuration / 60);
    
    const validation: WorkHourValidation = {
      isValid: true,
      violations: [],
      warnings: [],
      calculatedHours: {
        regularHours: 0,
        overtimeHours: 0,
        premiumOvertimeHours: 0,
        weekendHours: 0,
        holidayHours: 0
      },
      breakRequirements: {
        breakRequired: false,
        lunchRequired: false,
        minimumBreakMinutes: 0,
        actualBreakMinutes: breakDuration
      }
    };

    // Check daily hour limits
    if (shiftHours > employmentType.workHourRules.maxHoursPerDay) {
      validation.violations.push({
        type: 'DAILY_LIMIT',
        message: `Shift duration (${shiftHours}h) exceeds maximum daily hours (${employmentType.workHourRules.maxHoursPerDay}h)`,
        severity: 'error',
        currentValue: shiftHours,
        allowedValue: employmentType.workHourRules.maxHoursPerDay
      });
      validation.isValid = false;
    }

    // Check break requirements
    const minBreakMinutes = employmentType.breakRules.minBreakDuration;
    const maxWorkWithoutBreak = employmentType.breakRules.maxWorkWithoutBreak;
    
    if (shiftHours > maxWorkWithoutBreak) {
      validation.breakRequirements.breakRequired = true;
      validation.breakRequirements.minimumBreakMinutes = minBreakMinutes;
      
      if (breakDuration < minBreakMinutes) {
        validation.violations.push({
          type: 'BREAK_REQUIRED',
          message: `Break of at least ${minBreakMinutes} minutes required for shifts longer than ${maxWorkWithoutBreak} hours`,
          severity: 'error',
          currentValue: breakDuration,
          allowedValue: minBreakMinutes
        });
        validation.isValid = false;
      }
    }

    // Check lunch break for full-day shifts
    if (employmentType.breakRules.lunchBreakRequired && shiftHours >= 6) {
      validation.breakRequirements.lunchRequired = true;
      const lunchDuration = employmentType.breakRules.lunchBreakDuration || 60;
      
      if (breakDuration < lunchDuration) {
        validation.violations.push({
          type: 'BREAK_REQUIRED',
          message: `Lunch break of ${lunchDuration} minutes required for shifts 6+ hours`,
          severity: 'warning',
          currentValue: breakDuration,
          allowedValue: lunchDuration
        });
      }
    }

    // Check weekly hours
    const weekStart = startOfWeek(clockIn);
    const weekEnd = endOfWeek(clockIn);
    const weeklyHours = await this.calculateWeeklyHours(userId, weekStart, weekEnd, clockIn, clockOut, breakDuration);
    
    if (weeklyHours > employmentType.workHourRules.maxHoursPerWeek) {
      validation.violations.push({
        type: 'WEEKLY_LIMIT',
        message: `Weekly hours (${weeklyHours}h) would exceed maximum (${employmentType.workHourRules.maxHoursPerWeek}h)`,
        severity: 'error',
        currentValue: weeklyHours,
        allowedValue: employmentType.workHourRules.maxHoursPerWeek
      });
      validation.isValid = false;
    }

    // Check rest between shifts
    const lastEntry = await this.getLastTimeEntry(userId, clockIn);
    if (lastEntry && lastEntry.clockOut) {
      const restHours = differenceInHours(clockIn, lastEntry.clockOut);
      const requiredRest = employmentType.breakRules.restBetweenShifts;
      
      if (restHours < requiredRest) {
        validation.violations.push({
          type: 'REST_PERIOD',
          message: `Insufficient rest between shifts (${restHours}h). Minimum ${requiredRest}h required`,
          severity: 'critical',
          currentValue: restHours,
          allowedValue: requiredRest
        });
        validation.isValid = false;
      }
    }

    // Calculate overtime and premium rates
    validation.calculatedHours = await this.calculateOvertimeHours(
      employmentType, 
      shiftHours, 
      weeklyHours, 
      isWeekend(clockIn)
    );

    return validation;
  }

  /**
   * Validate if a shift can be scheduled based on employment type constraints
   */
  async validateShiftScheduling(
    userId: string,
    proposedStartTime: Date,
    proposedEndTime: Date
  ): Promise<ShiftValidation> {
    
    const user = await User.findById(userId).populate('employmentTypeId');
    if (!user || !user.employmentTypeId) {
      throw new Error('User or employment type not found');
    }

    const employmentType = user.employmentTypeId as unknown as IEmploymentType;
    const shiftHours = differenceInHours(proposedEndTime, proposedStartTime);
    
    const validation: ShiftValidation = {
      canSchedule: true,
      conflicts: [],
      recommendations: []
    };

    // Check time restrictions
    const rules = employmentType.schedulingRules;
    if (rules.earliestStartTime || rules.latestEndTime) {
      const startTime = format(proposedStartTime, 'HH:mm');
      const endTime = format(proposedEndTime, 'HH:mm');
      
      if (rules.earliestStartTime && startTime < rules.earliestStartTime) {
        validation.conflicts.push({
          type: 'TIME_RESTRICTION',
          message: `Start time ${startTime} is before allowed earliest start time ${rules.earliestStartTime}`
        });
        validation.canSchedule = false;
      }
      
      if (rules.latestEndTime && endTime > rules.latestEndTime) {
        validation.conflicts.push({
          type: 'TIME_RESTRICTION',
          message: `End time ${endTime} is after allowed latest end time ${rules.latestEndTime}`
        });
        validation.canSchedule = false;
      }
    }

    // Check weekend/holiday restrictions
    if (isWeekend(proposedStartTime) && !rules.weekendWorkAllowed) {
      validation.conflicts.push({
        type: 'TIME_RESTRICTION',
        message: 'Weekend work not allowed for this employment type'
      });
      validation.canSchedule = false;
    }

    // Check consecutive days worked
    const consecutiveDays = await this.calculateConsecutiveDays(userId, proposedStartTime);
    if (consecutiveDays >= rules.maxConsecutiveDays) {
      validation.conflicts.push({
        type: 'MAX_CONSECUTIVE',
        message: `Would exceed maximum consecutive working days (${rules.maxConsecutiveDays})`
      });
      validation.canSchedule = false;
    }

    // Check weekly hour limits
    const weekStart = startOfWeek(proposedStartTime);
    const weekEnd = endOfWeek(proposedStartTime);
    const currentWeeklyHours = await this.calculateWeeklyHours(userId, weekStart, weekEnd);
    const projectedWeeklyHours = currentWeeklyHours + shiftHours;
    
    if (projectedWeeklyHours > employmentType.workHourRules.maxHoursPerWeek) {
      validation.conflicts.push({
        type: 'WEEKLY_LIMIT',
        message: `Would exceed weekly hour limit (${projectedWeeklyHours}h > ${employmentType.workHourRules.maxHoursPerWeek}h)`
      });
      validation.canSchedule = false;
    }

    // Check rest period from previous shift
    const previousShift = await this.getLastTimeEntry(userId, proposedStartTime);
    if (previousShift && previousShift.clockOut) {
      const restHours = differenceInHours(proposedStartTime, previousShift.clockOut);
      const requiredRest = employmentType.breakRules.restBetweenShifts;
      
      if (restHours < requiredRest) {
        validation.conflicts.push({
          type: 'REST_PERIOD',
          message: `Insufficient rest period (${restHours}h < ${requiredRest}h required)`
        });
        validation.canSchedule = false;
      }
    }

    // Generate recommendations
    if (validation.canSchedule) {
      if (projectedWeeklyHours > employmentType.workHourRules.standardHoursPerWeek) {
        validation.recommendations.push(
          `This shift will result in ${projectedWeeklyHours - employmentType.workHourRules.standardHoursPerWeek} overtime hours`
        );
      }
      
      if (shiftHours > employmentType.breakRules.maxWorkWithoutBreak) {
        validation.recommendations.push(
          `Break of at least ${employmentType.breakRules.minBreakDuration} minutes recommended for this shift duration`
        );
      }
    }

    return validation;
  }

  /**
   * Calculate payroll for a pay period based on employment type rules
   */
  async calculatePayroll(
    userId: string,
    payPeriodStart: Date,
    payPeriodEnd: Date
  ): Promise<PayrollCalculation> {
    
    const user = await User.findById(userId).populate('employmentTypeId');
    if (!user || !user.employmentTypeId) {
      throw new Error('User or employment type not found');
    }

    const employmentType = user.employmentTypeId as unknown as IEmploymentType;
    const hourlyRate = user.hourlyRate || 0;
    
    // Get all time entries for the pay period
    const timeEntries = await TimeEntry.find({
      userId,
      clockIn: { $gte: payPeriodStart, $lte: payPeriodEnd },
      status: 'completed',
      approvalStatus: { $in: ['approved', 'auto_approved'] }
    }).sort({ clockIn: 1 });

    const payroll: PayrollCalculation = {
      userId,
      payPeriodStart,
      payPeriodEnd,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      premiumOvertimeHours: 0,
      weekendHours: 0,
      holidayHours: 0,
      regularPay: 0,
      overtimePay: 0,
      premiumOvertimePay: 0,
      weekendPay: 0,
      holidayPay: 0,
      totalGrossPay: 0,
      violations: []
    };

    // Process each time entry
    for (const entry of timeEntries) {
      const entryHours = entry.totalHours || 0;
      const isWeekendEntry = isWeekend(entry.clockIn);
      const isHolidayEntry = await this.isHoliday(entry.clockIn);

      payroll.totalHours += entryHours;

      // Determine hour classifications for this entry
      const weekStart = startOfWeek(entry.clockIn);
      const weekEnd = endOfWeek(entry.clockIn);
      const weeklyHoursBeforeEntry = await this.calculateWeeklyHours(
        userId, weekStart, entry.clockIn, undefined, undefined, 0
      );

      const hourClassifications = this.classifyHours(
        employmentType,
        entryHours,
        weeklyHoursBeforeEntry,
        isWeekendEntry,
        isHolidayEntry
      );

      payroll.regularHours += hourClassifications.regular;
      payroll.overtimeHours += hourClassifications.overtime;
      payroll.premiumOvertimeHours += hourClassifications.premiumOvertime;
      payroll.weekendHours += hourClassifications.weekend;
      payroll.holidayHours += hourClassifications.holiday;
    }

    // Calculate pay amounts
    const rates = employmentType.workHourRules.overtimeRates;
    payroll.regularPay = payroll.regularHours * hourlyRate;
    payroll.overtimePay = payroll.overtimeHours * hourlyRate * rates.standardOvertime;
    payroll.premiumOvertimePay = payroll.premiumOvertimeHours * hourlyRate * (rates.premiumOvertime || rates.standardOvertime);
    payroll.weekendPay = payroll.weekendHours * hourlyRate * (rates.weekendRate || 1.0);
    payroll.holidayPay = payroll.holidayHours * hourlyRate * (rates.holidayRate || 1.0);
    
    payroll.totalGrossPay = payroll.regularPay + payroll.overtimePay + 
                          payroll.premiumOvertimePay + payroll.weekendPay + payroll.holidayPay;

    // Check for violations during the pay period
    payroll.violations = await this.findPayPeriodViolations(userId, payPeriodStart, payPeriodEnd);

    return payroll;
  }

  /**
   * Get employment types available for a tenant
   */
  async getAvailableEmploymentTypes(tenantId: string): Promise<IEmploymentType[]> {
    return await EmploymentType.find({
      tenantId,
      isActive: true,
      $or: [
        { expirationDate: { $exists: false } },
        { expirationDate: { $gte: new Date() } }
      ],
      effectiveDate: { $lte: new Date() }
    }).sort({ isDefault: -1, name: 1 });
  }

  /**
   * Create or update employment type
   */
  async createEmploymentType(
    tenantId: string,
    employmentTypeData: Partial<IEmploymentType>,
    createdBy: string
  ): Promise<IEmploymentType> {
    
    // If setting as default, unset other defaults
    if (employmentTypeData.isDefault) {
      await EmploymentType.updateMany(
        { tenantId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const employmentType = new EmploymentType({
      ...employmentTypeData,
      tenantId,
      createdBy,
      effectiveDate: employmentTypeData.effectiveDate || new Date()
    });

    return await employmentType.save();
  }

  // Helper methods

  private async calculateWeeklyHours(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
    excludeClockIn?: Date,
    excludeClockOut?: Date,
    additionalHours: number = 0
  ): Promise<number> {
    
    const query: any = {
      userId,
      clockIn: { $gte: weekStart, $lte: weekEnd },
      status: 'completed'
    };

    // Exclude specific time entry if provided
    if (excludeClockIn && excludeClockOut) {
      query.$and = [{
        $or: [
          { clockIn: { $ne: excludeClockIn } },
          { clockOut: { $ne: excludeClockOut } }
        ]
      }];
    }

    const entries = await TimeEntry.find(query);
    const totalHours = entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    
    return totalHours + additionalHours;
  }

  private async getLastTimeEntry(userId: string, beforeDate: Date) {
    return await TimeEntry.findOne({
      userId,
      clockIn: { $lt: beforeDate },
      status: 'completed'
    }).sort({ clockOut: -1 });
  }

  private async calculateConsecutiveDays(userId: string, proposedDate: Date): Promise<number> {
    let consecutiveDays = 0;
    let checkDate = addDays(proposedDate, -1);

    // Look back to find consecutive working days
    for (let i = 0; i < 14; i++) { // Max check of 14 days
      const dayStart = startOfDay(checkDate);
      const dayEnd = endOfDay(checkDate);
      
      const hasWork = await TimeEntry.exists({
        userId,
        clockIn: { $gte: dayStart, $lte: dayEnd },
        status: 'completed'
      });

      if (hasWork) {
        consecutiveDays++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  private async calculateOvertimeHours(
    employmentType: IEmploymentType,
    shiftHours: number,
    weeklyHours: number,
    isWeekendShift: boolean
  ) {
    const rules = employmentType.workHourRules;
    const dailyOT = rules.overtimeThreshold.daily || 8;
    const weeklyOT = rules.overtimeThreshold.weekly || 40;

    let regularHours = Math.min(shiftHours, dailyOT);
    let overtimeHours = Math.max(0, shiftHours - dailyOT);
    let premiumOvertimeHours = 0;
    let weekendHours = isWeekendShift ? shiftHours : 0;

    // Check weekly overtime
    const weeklyOTHours = Math.max(0, weeklyHours - weeklyOT);
    if (weeklyOTHours > 0) {
      // Adjust regular/overtime split based on weekly threshold
      const adjustedOT = Math.max(overtimeHours, weeklyOTHours);
      regularHours = Math.max(0, shiftHours - adjustedOT);
      overtimeHours = adjustedOT;
    }

    return {
      regularHours,
      overtimeHours,
      premiumOvertimeHours,
      weekendHours,
      holidayHours: 0 // Would need holiday calendar integration
    };
  }

  private classifyHours(
    employmentType: IEmploymentType,
    entryHours: number,
    weeklyHoursBefore: number,
    isWeekend: boolean,
    isHoliday: boolean
  ) {
    const rules = employmentType.workHourRules;
    const dailyOT = rules.overtimeThreshold.daily || 8;
    const weeklyOT = rules.overtimeThreshold.weekly || 40;

    let regular = 0;
    let overtime = 0;
    let premiumOvertime = 0;
    let weekend = 0;
    let holiday = 0;

    if (isHoliday) {
      holiday = entryHours;
    } else if (isWeekend && rules.overtimeRates.weekendRate) {
      weekend = entryHours;
    } else {
      // Daily overtime calculation
      regular = Math.min(entryHours, dailyOT);
      overtime = Math.max(0, entryHours - dailyOT);

      // Weekly overtime adjustment
      if (weeklyHoursBefore + entryHours > weeklyOT) {
        const weeklyOTFromThis = Math.min(entryHours, weeklyHoursBefore + entryHours - weeklyOT);
        overtime = Math.max(overtime, weeklyOTFromThis);
        regular = entryHours - overtime;
      }

      // Premium overtime (if defined)
      if (rules.overtimeRates.premiumOvertime && overtime > 4) {
        premiumOvertime = overtime - 4;
        overtime = 4;
      }
    }

    return { regular, overtime, premiumOvertime, weekend, holiday };
  }

  private async isHoliday(date: Date): Promise<boolean> {
    // This would integrate with a holiday calendar system
    // For now, return false
    return false;
  }

  private async findPayPeriodViolations(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // This would check for various violations during the pay period
    // Return empty array for now
    return [];
  }
}

export default new WorkHourRegulationService();