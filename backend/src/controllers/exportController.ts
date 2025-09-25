import { Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import TimeEntry from '../models/TimeEntry';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { createExport, cleanupOldExports } from '../utils/exportUtils';
import logger from '../utils/logger';

export const exportTimeEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      userId,
      department,
      includeDetails = false,
      status,
      isApproved
    } = req.query;

    // Build filter based on user role and query parameters
    const filter: any = {};

    // Date range filter
    if (startDate || endDate) {
      filter.clockIn = {};
      if (startDate) filter.clockIn.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999); // Include full end date
        filter.clockIn.$lte = end;
      }
    }

    // User-specific filters
    if (req.user?.role === 'staff') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    // Department filter
    if (department) {
      const departmentUsers = await User.find({ department, isActive: true }).select('_id');
      filter.userId = { $in: departmentUsers.map(u => u._id) };
    }

    // Status and approval filters
    if (status) filter.status = status;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';

    // Fetch time entries
    const timeEntries = await TimeEntry.find(filter)
      .populate('userId', 'name email department position hourlyRate overtimeRate')
      .populate('approvedBy', 'name')
      .sort('-clockIn');

    if (timeEntries.length === 0) {
      res.status(404).json({ error: 'No time entries found for the specified criteria' });
      return;
    }

    // Fetch users if detailed export is requested
    let users = [];
    if (includeDetails === 'true') {
      const userIds = [...new Set(timeEntries.map(entry => entry.userId._id.toString()))];
      users = await User.find({ _id: { $in: userIds } }).select('-pin');
    }

    // Create export
    const exportPath = await createExport(
      { timeEntries, users },
      {
        format: format as 'csv' | 'excel',
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        } : undefined,
        includeDetails: includeDetails === 'true'
      }
    );

    // Send file
    const filename = path.basename(exportPath);
    const contentType = format === 'excel' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = await fs.readFile(exportPath);
    res.send(fileStream);

    // Log the export
    logger.info('Export generated', {
      userId: req.user?._id,
      format,
      recordCount: timeEntries.length,
      filename
    });

    // Schedule cleanup of the file after a delay
    setTimeout(async () => {
      try {
        await fs.unlink(exportPath);
        logger.info(`Cleaned up export file: ${filename}`);
      } catch (error) {
        logger.warn(`Failed to cleanup export file: ${filename}`, error);
      }
    }, 10 * 60 * 1000); // 10 minutes

  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate export' });
  }
};

export const getExportHistory = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically come from a database table tracking exports
    // For now, we'll return a simple response
    res.json({
      message: 'Export history not yet implemented',
      note: 'This feature would track previous exports and their status'
    });
  } catch (error) {
    logger.error('Get export history error:', error);
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
};

export const generatePayrollReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, department } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required for payroll reports' });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    const filter: any = {
      clockIn: { $gte: start, $lte: end },
      status: 'completed',
      isApproved: true
    };

    // Department filter
    if (department) {
      const departmentUsers = await User.find({ department, isActive: true }).select('_id');
      filter.userId = { $in: departmentUsers.map(u => u._id) };
    }

    const timeEntries = await TimeEntry.find(filter)
      .populate('userId', 'name email department position hourlyRate overtimeRate')
      .sort('userId clockIn');

    // Group by user and calculate payroll data
    const payrollData = new Map();

    timeEntries.forEach(entry => {
      const user = entry.userId;
      const userId = user._id.toString();

      if (!payrollData.has(userId)) {
        payrollData.set(userId, {
          employee: user,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          regularPay: 0,
          overtimePay: 0,
          totalPay: 0,
          entries: []
        });
      }

      const data = payrollData.get(userId);
      data.totalHours += entry.totalHours || 0;
      data.regularHours += entry.regularHours || 0;
      data.overtimeHours += entry.overtimeHours || 0;
      
      const userObj = user as any;
      const regularPay = (userObj.hourlyRate || 0) * (entry.regularHours || 0);
      const overtimePay = (userObj.hourlyRate || 0) * (userObj.overtimeRate || 1.5) * (entry.overtimeHours || 0);
      
      data.regularPay += regularPay;
      data.overtimePay += overtimePay;
      data.totalPay += regularPay + overtimePay;
      data.entries.push(entry);
    });

    // Convert to array and create export
    const payrollArray = Array.from(payrollData.values());
    
    // Create a specialized export for payroll
    const exportPath = await createExport(
      { timeEntries, users: payrollArray.map(p => p.employee) },
      {
        format: 'excel',
        dateRange: { start, end },
        includeDetails: true
      }
    );

    const filename = path.basename(exportPath);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="payroll_${filename}"`);

    const fileStream = await fs.readFile(exportPath);
    res.send(fileStream);

    logger.info('Payroll report generated', {
      userId: req.user?._id,
      dateRange: `${start.toISOString()} - ${end.toISOString()}`,
      employeeCount: payrollArray.length,
      filename
    });

    // Cleanup
    setTimeout(async () => {
      try {
        await fs.unlink(exportPath);
      } catch (error) {
        logger.warn(`Failed to cleanup payroll file: ${filename}`, error);
      }
    }, 10 * 60 * 1000);

  } catch (error) {
    logger.error('Payroll report error:', error);
    res.status(500).json({ error: 'Failed to generate payroll report' });
  }
};

// Endpoint to trigger cleanup of old exports
export const cleanupExports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { maxAgeHours = 24 } = req.query;
    await cleanupOldExports(parseInt(maxAgeHours as string));
    
    res.json({ message: 'Export cleanup completed' });
  } catch (error) {
    logger.error('Export cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup exports' });
  }
};

// Alias for backward compatibility
export const exportPayrollReport = generatePayrollReport;

export const backupData = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This would typically backup all system data
    // For now, we'll return a simple response indicating the feature is planned
    res.json({
      message: 'Backup functionality not yet implemented',
      note: 'This feature would create a complete backup of all system data including users, time entries, and settings'
    });
  } catch (error) {
    logger.error('Backup data error:', error);
    res.status(500).json({ error: 'Failed to backup data' });
  }
};