import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TimeEntry from '../models/TimeEntry';
import Shift from '../models/Shift';
import logger from '../utils/logger';

export const getMyTimeEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, status } = req.query;
    const userId = req.user!._id;
    
    const filter: any = { userId };
    
    if (startDate || endDate) {
      filter.clockIn = {};
      if (startDate) filter.clockIn.$gte = new Date(startDate as string);
      if (endDate) filter.clockIn.$lte = new Date(endDate as string);
    }
    
    if (status) filter.status = status;
    
    const entries = await TimeEntry.find(filter)
      .populate('approvedBy', 'name')
      .sort('-clockIn')
      .limit(100); // Limit to prevent excessive data loading
    
    res.json(entries);
  } catch (error) {
    logger.error('Get my time entries error:', error);
    res.status(500).json({ error: 'Failed to fetch your time entries' });
  }
};

export const getMyPayrollSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user!._id;
    const user = req.user!;
    
    // Default to current pay period (last 2 weeks)
    const endDateObj = endDate ? new Date(endDate as string) : new Date();
    const startDateObj = startDate ? new Date(startDate as string) : 
      new Date(endDateObj.getTime() - (14 * 24 * 60 * 60 * 1000));
    
    const entries = await TimeEntry.find({
      userId,
      clockIn: { $gte: startDateObj, $lte: endDateObj },
      clockOut: { $exists: true }
    }).sort('clockIn');
    
    const regularPay = entries.reduce((sum, e) => sum + ((e.regularHours || 0) * (user.hourlyRate || 0)), 0);
    const overtimePay = entries.reduce((sum, e) => sum + ((e.overtimeHours || 0) * ((user.hourlyRate || 0) * (user.overtimeRate || 1.5))), 0);
    
    const summary = {
      period: {
        start: startDateObj,
        end: endDateObj
      },
      hours: {
        regular: entries.reduce((sum, e) => sum + (e.regularHours || 0), 0),
        overtime: entries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0),
        total: entries.reduce((sum, e) => sum + (e.totalHours || 0), 0)
      },
      pay: {
        regularRate: user.hourlyRate || 0,
        overtimeRate: ((user.hourlyRate || 0) * (user.overtimeRate || 1.5)),
        regularPay: regularPay,
        overtimePay: overtimePay,
        total: regularPay + overtimePay
      },
      entries: entries.length,
      approvalStatus: {
        approved: entries.filter(e => e.isApproved).length,
        pending: entries.filter(e => !e.isApproved).length
      }
    };
    
    res.json(summary);
  } catch (error) {
    logger.error('Get my payroll summary error:', error);
    res.status(500).json({ error: 'Failed to fetch your payroll summary' });
  }
};

export const getMySchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user!._id;
    
    // Default to next 30 days
    const startDateObj = startDate ? new Date(startDate as string) : new Date();
    const endDateObj = endDate ? new Date(endDate as string) : 
      new Date(startDateObj.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const shifts = await Shift.find({
      userId,
      date: { $gte: startDateObj, $lte: endDateObj }
    })
    .populate('createdBy', 'name')
    .sort('date startTime');
    
    res.json({
      period: {
        start: startDateObj,
        end: endDateObj
      },
      shifts,
      summary: {
        totalShifts: shifts.length,
        scheduledHours: shifts.reduce((sum, shift) => {
          const start = new Date(`2000-01-01T${shift.startTime}`);
          const end = new Date(`2000-01-01T${shift.endTime}`);
          return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
        }, 0)
      }
    });
  } catch (error) {
    logger.error('Get my schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch your schedule' });
  }
};

export const downloadMyTimesheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'csv' } = req.query;
    const userId = req.user!._id;
    const user = req.user!;
    
    const entries = await TimeEntry.find({
      userId,
      clockIn: { 
        $gte: new Date(startDate as string), 
        $lte: new Date(endDate as string) 
      },
      clockOut: { $exists: true }
    }).sort('clockIn');
    
    if (format === 'csv') {
      const csvData = [
        'Date,Clock In,Clock Out,Break Time (min),Regular Hours,Overtime Hours,Total Hours,Status,Approved',
        ...entries.map(entry => {
          const clockIn = entry.clockIn.toLocaleString();
          const clockOut = entry.clockOut?.toLocaleString() || '';
          return [
            entry.clockIn.toDateString(),
            clockIn,
            clockOut,
            entry.totalBreakTime || 0,
            entry.regularHours || 0,
            entry.overtimeHours || 0,
            entry.totalHours || 0,
            entry.status,
            entry.isApproved ? 'Yes' : 'No'
          ].join(',');
        })
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${user.name}_timesheet_${startDate}_${endDate}.csv"`);
      res.send(csvData);
    } else {
      // For PDF format, you would implement PDF generation here
      res.status(501).json({ error: 'PDF format not yet implemented. Please use CSV format.' });
    }
  } catch (error) {
    logger.error('Download my timesheet error:', error);
    res.status(500).json({ error: 'Failed to download your timesheet' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    // Return user profile without sensitive data like PIN
    const profile = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      hourlyRate: user.hourlyRate,
      overtimeRate: user.overtimeRate,
      isActive: user.isActive,
      createdAt: user.createdAt,
      // Add some calculated fields
      totalWorkDays: await TimeEntry.countDocuments({
        userId: user._id,
        clockOut: { $exists: true }
      }),
      lastClockIn: await TimeEntry.findOne({
        userId: user._id
      }).sort('-clockIn').select('clockIn clockOut status')
    };
    
    res.json(profile);
  } catch (error) {
    logger.error('Get my profile error:', error);
    res.status(500).json({ error: 'Failed to fetch your profile' });
  }
};

export const getMyStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'month' } = req.query;
    const userId = req.user!._id;
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }
    
    const entries = await TimeEntry.find({
      userId,
      clockIn: { $gte: startDate, $lte: endDate },
      clockOut: { $exists: true }
    });
    
    const upcomingShifts = await Shift.find({
      userId,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] }
    }).sort('date').limit(10);
    
    const stats = {
      period: {
        name: period,
        start: startDate,
        end: endDate
      },
      workDays: entries.length,
      totalHours: entries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
      regularHours: entries.reduce((sum, e) => sum + (e.regularHours || 0), 0),
      overtimeHours: entries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0),
      averageHoursPerDay: entries.length > 0 ? 
        entries.reduce((sum, e) => sum + (e.totalHours || 0), 0) / entries.length : 0,
      breakTime: entries.reduce((sum, e) => sum + (e.totalBreakTime || 0), 0),
      pendingApprovals: entries.filter(e => !e.isApproved).length,
      perfectAttendance: entries.every(e => e.status === 'completed'),
      upcomingShifts: upcomingShifts.length,
      nextShift: upcomingShifts[0] || null
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Get my stats error:', error);
    res.status(500).json({ error: 'Failed to fetch your statistics' });
  }
};