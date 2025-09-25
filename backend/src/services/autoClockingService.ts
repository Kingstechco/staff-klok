import cron from 'node-cron';
import User from '../models/User';
import TimeEntry from '../models/TimeEntry';
import ContractorException from '../models/ContractorException';
import logger from '../utils/logger';
import { startOfDay, endOfDay, format, getDay } from 'date-fns';

export class AutoClockingService {
  private static instance: AutoClockingService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {
    this.initializeCronJobs();
  }

  public static getInstance(): AutoClockingService {
    if (!AutoClockingService.instance) {
      AutoClockingService.instance = new AutoClockingService();
    }
    return AutoClockingService.instance;
  }

  private initializeCronJobs() {
    // Daily proactive processing - runs at midnight
    const proactiveJob = cron.schedule('0 0 * * *', async () => {
      await this.processProactiveContractors();
    }, { scheduled: false });

    // End of day reactive processing - runs at 6 PM
    const reactiveJob = cron.schedule('0 18 * * *', async () => {
      await this.processReactiveContractors();
    }, { scheduled: false });

    // Weekly batch processing - runs on Fridays at 11 PM
    const weeklyJob = cron.schedule('0 23 * * 5', async () => {
      await this.processWeeklyBatchContractors();
    }, { scheduled: false });

    this.jobs.set('proactive', proactiveJob);
    this.jobs.set('reactive', reactiveJob);
    this.jobs.set('weekly', weeklyJob);

    // Start all jobs
    this.startAllJobs();
  }

  public startAllJobs() {
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Started auto-clocking job: ${name}`);
    });
  }

  public stopAllJobs() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped auto-clocking job: ${name}`);
    });
  }

  // Process contractors with proactive mode
  private async processProactiveContractors() {
    try {
      logger.info('Starting proactive auto-clocking processing');
      const today = new Date();

      const contractors = await User.find({
        role: 'contractor',
        isActive: true,
        'contractorInfo.autoClocking.enabled': true,
        'contractorInfo.autoClocking.processingMode': 'proactive'
      });

      logger.info(`Found ${contractors.length} proactive contractors to process`);

      for (const contractor of contractors) {
        await this.processContractorDay(contractor, today);
      }

      logger.info('Completed proactive auto-clocking processing');
    } catch (error) {
      logger.error('Error in proactive auto-clocking processing:', error);
    }
  }

  // Process contractors with reactive mode
  private async processReactiveContractors() {
    try {
      logger.info('Starting reactive auto-clocking processing');
      const today = new Date();

      const contractors = await User.find({
        role: 'contractor',
        isActive: true,
        'contractorInfo.autoClocking.enabled': true,
        'contractorInfo.autoClocking.processingMode': 'reactive'
      });

      logger.info(`Found ${contractors.length} reactive contractors to process`);

      for (const contractor of contractors) {
        await this.processContractorDay(contractor, today);
      }

      logger.info('Completed reactive auto-clocking processing');
    } catch (error) {
      logger.error('Error in reactive auto-clocking processing:', error);
    }
  }

  // Process contractors with weekly batch mode
  private async processWeeklyBatchContractors() {
    try {
      logger.info('Starting weekly batch auto-clocking processing');
      
      const contractors = await User.find({
        role: 'contractor',
        isActive: true,
        'contractorInfo.autoClocking.enabled': true,
        'contractorInfo.autoClocking.processingMode': 'weekly_batch'
      });

      logger.info(`Found ${contractors.length} weekly batch contractors to process`);

      for (const contractor of contractors) {
        await this.processContractorWeek(contractor);
      }

      logger.info('Completed weekly batch auto-clocking processing');
    } catch (error) {
      logger.error('Error in weekly batch auto-clocking processing:', error);
    }
  }

  // Process a single contractor for a specific day
  public async processContractorDay(contractor: any, date: Date): Promise<boolean> {
    try {
      const dayOfWeek = getDay(date);
      const workSchedule = contractor.contractorInfo?.autoClocking?.workSchedule;

      if (!workSchedule) {
        logger.warn(`No work schedule found for contractor ${contractor.name}`);
        return false;
      }

      // Check if it's a work day
      if (!workSchedule.workDays.includes(dayOfWeek)) {
        logger.debug(`Skipping ${contractor.name} - not a work day (${dayOfWeek})`);
        return false;
      }

      // Check for exceptions (sick days, holidays, etc.)
      const hasException = await this.checkForExceptions(contractor._id, date);
      if (hasException) {
        logger.debug(`Skipping ${contractor.name} - has exception for ${format(date, 'yyyy-MM-dd')}`);
        return false;
      }

      // Check if entry already exists
      const existingEntry = await TimeEntry.findOne({
        userId: contractor._id,
        tenantId: contractor.tenantId,
        clockIn: {
          $gte: startOfDay(date),
          $lte: endOfDay(date)
        }
      });

      if (existingEntry) {
        logger.debug(`Skipping ${contractor.name} - entry already exists for ${format(date, 'yyyy-MM-dd')}`);
        return false;
      }

      // Create auto time entry
      await this.createAutoTimeEntry(contractor, date);
      logger.info(`Created auto time entry for ${contractor.name} on ${format(date, 'yyyy-MM-dd')}`);
      return true;

    } catch (error) {
      logger.error(`Error processing contractor day for ${contractor.name}:`, error);
      return false;
    }
  }

  // Process a contractor's entire week
  private async processContractorWeek(contractor: any): Promise<number> {
    const today = new Date();
    const currentDayOfWeek = getDay(today);
    let processedDays = 0;

    // Process Monday through Friday of the current week
    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - currentDayOfWeek + i + 1); // +1 because Monday is 1

      const success = await this.processContractorDay(contractor, targetDate);
      if (success) {
        processedDays++;
      }
    }

    return processedDays;
  }

  // Check for contractor exceptions on a specific date
  private async checkForExceptions(contractorId: string, date: Date): Promise<boolean> {
    const exceptions = await ContractorException.find({
      userId: contractorId,
      $or: [
        {
          date: {
            $gte: startOfDay(date),
            $lte: endOfDay(date)
          }
        },
        {
          date: { $lte: startOfDay(date) },
          endDate: { $gte: endOfDay(date) }
        }
      ],
      status: { $in: ['pending', 'approved', 'auto_approved'] }
    });

    return exceptions.length > 0;
  }

  // Create an automatic time entry
  private async createAutoTimeEntry(contractor: any, date: Date): Promise<void> {
    const workSchedule = contractor.contractorInfo.autoClocking.workSchedule;
    const timezone = workSchedule.timezone || 'America/New_York';

    // Parse start and end times
    const [startHour, startMinute] = workSchedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = workSchedule.endTime.split(':').map(Number);

    const clockInTime = new Date(date);
    clockInTime.setHours(startHour, startMinute, 0, 0);

    const clockOutTime = new Date(date);
    clockOutTime.setHours(endHour, endMinute, 0, 0);

    const totalHours = workSchedule.hoursPerDay;
    const regularHours = Math.min(totalHours, 8); // Assume 8 hours regular, rest overtime
    const overtimeHours = Math.max(0, totalHours - 8);

    const timeEntry = new TimeEntry({
      tenantId: contractor.tenantId,
      userId: contractor._id,
      clockIn: clockInTime,
      clockOut: clockOutTime,
      totalHours,
      regularHours,
      overtimeHours,
      breakDuration: 0,
      isAutoGenerated: true,
      autoGeneratedAt: new Date(),
      status: 'completed',
      approvalStatus: contractor.contractorInfo.autoClocking.requiresApproval ? 'pending' : 'auto_approved',
      location: {
        source: 'auto_generated',
        timestamp: new Date()
      },
      taskDescription: 'Auto-generated time entry based on contractor schedule',
      notes: `Automatically generated for ${workSchedule.hoursPerDay} hour workday`
    });

    await timeEntry.save();

    // Log the auto-generation
    logger.info(`Auto-generated time entry for contractor ${contractor.name}: ${totalHours} hours on ${format(date, 'yyyy-MM-dd')}`);
  }

  // Manual trigger for specific contractor
  public async processSpecificContractor(contractorId: string, date?: Date): Promise<{ success: boolean; message: string }> {
    try {
      const contractor = await User.findOne({
        _id: contractorId,
        role: 'contractor',
        isActive: true,
        'contractorInfo.autoClocking.enabled': true
      });

      if (!contractor) {
        return { success: false, message: 'Contractor not found or auto-clocking not enabled' };
      }

      const targetDate = date || new Date();
      const success = await this.processContractorDay(contractor, targetDate);

      return {
        success,
        message: success 
          ? `Auto time entry created for ${format(targetDate, 'yyyy-MM-dd')}`
          : `No auto time entry created - may already exist or not a work day`
      };

    } catch (error) {
      logger.error('Error processing specific contractor:', error);
      return { success: false, message: 'Error processing contractor' };
    }
  }

  // Regenerate entries for a date range
  public async regenerateEntries(contractorId: string, startDate: Date, endDate: Date): Promise<{ processed: number; skipped: number }> {
    const contractor = await User.findOne({
      _id: contractorId,
      role: 'contractor',
      isActive: true
    });

    if (!contractor) {
      throw new Error('Contractor not found');
    }

    let processed = 0;
    let skipped = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Delete existing auto-generated entry for this date
      await TimeEntry.deleteOne({
        userId: contractorId,
        tenantId: contractor.tenantId,
        clockIn: {
          $gte: startOfDay(currentDate),
          $lte: endOfDay(currentDate)
        },
        isAutoGenerated: true
      });

      // Try to create new auto entry
      const success = await this.processContractorDay(contractor, new Date(currentDate));
      if (success) {
        processed++;
      } else {
        skipped++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { processed, skipped };
  }

  // Get auto-clocking statistics
  public async getStatistics(tenantId?: string): Promise<any> {
    const matchQuery: any = {
      role: 'contractor',
      isActive: true,
      'contractorInfo.autoClocking.enabled': true
    };

    if (tenantId) {
      matchQuery.tenantId = tenantId;
    }

    const contractors = await User.find(matchQuery);

    const stats = {
      totalEnabledContractors: contractors.length,
      byProcessingMode: {
        proactive: 0,
        reactive: 0,
        weekly_batch: 0
      },
      autoGeneratedToday: 0,
      autoGeneratedThisWeek: 0,
      autoGeneratedThisMonth: 0
    };

    // Count by processing mode
    contractors.forEach(contractor => {
      const mode = contractor.contractorInfo?.autoClocking?.processingMode;
      if (mode && stats.byProcessingMode.hasOwnProperty(mode)) {
        stats.byProcessingMode[mode]++;
      }
    });

    // Count auto-generated entries
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayEntries = await TimeEntry.countDocuments({
      isAutoGenerated: true,
      autoGeneratedAt: {
        $gte: startOfDay(today),
        $lte: endOfDay(today)
      },
      ...(tenantId && { tenantId })
    });

    const weekEntries = await TimeEntry.countDocuments({
      isAutoGenerated: true,
      autoGeneratedAt: { $gte: weekStart },
      ...(tenantId && { tenantId })
    });

    const monthEntries = await TimeEntry.countDocuments({
      isAutoGenerated: true,
      autoGeneratedAt: { $gte: monthStart },
      ...(tenantId && { tenantId })
    });

    stats.autoGeneratedToday = todayEntries;
    stats.autoGeneratedThisWeek = weekEntries;
    stats.autoGeneratedThisMonth = monthEntries;

    return stats;
  }

  // Health check for auto-clocking service
  public getHealthStatus(): { status: string; jobs: any[] } {
    const jobStatuses = Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.running || false,
      scheduled: job.scheduled || false
    }));

    const allRunning = jobStatuses.every(job => job.running);

    return {
      status: allRunning ? 'healthy' : 'degraded',
      jobs: jobStatuses
    };
  }
}

// Export singleton instance
export default AutoClockingService.getInstance();