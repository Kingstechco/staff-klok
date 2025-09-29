import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TimeEntry from '../models/TimeEntry';
import User from '../models/User';
import Shift from '../models/Shift';
import logger from '../utils/logger';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, department } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const filter: any = {
      tenantId: req.user?.tenantId,
      clockIn: { $gte: start, $lte: end }
    };
    
    // Filter by department if specified
    if (department) {
      const departmentUsers = await User.find({ 
        tenantId: req.user?.tenantId,
        department, 
        isActive: true 
      }).select('_id');
      filter.userId = { $in: departmentUsers.map(u => u._id) };
    }
    
    const entries = await TimeEntry.find(filter)
      .populate('userId', 'name email department hourlyRate')
      .sort('-clockIn');
    
    // Calculate comprehensive analytics
    const analytics: any = {
      summary: {
        totalEntries: entries.length,
        completedEntries: entries.filter(e => e.clockOut).length,
        pendingApprovals: entries.filter(e => !e.isApproved && e.clockOut).length,
        totalHours: entries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
        totalOvertime: entries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0),
        uniqueEmployees: new Set(entries.map(e => (e.userId as any)._id.toString())).size
      },
      departmentBreakdown: {},
      weeklyTrend: [],
      topPerformers: [],
      attendanceRate: 0
    };
    
    // Department breakdown
    const departmentStats: Record<string, any> = {};
    entries.forEach(entry => {
      const dept = (entry.userId as any).department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          hours: 0,
          overtime: 0,
          employees: new Set(),
          entries: 0
        };
      }
      
      departmentStats[dept].hours += entry.totalHours || 0;
      departmentStats[dept].overtime += entry.overtimeHours || 0;
      departmentStats[dept].employees.add((entry.userId as any)._id.toString());
      departmentStats[dept].entries += 1;
    });
    
    analytics.departmentBreakdown = Object.entries(departmentStats).map(([dept, stats]: [string, any]) => ({
      department: dept,
      totalHours: Math.round(stats.hours * 100) / 100,
      overtime: Math.round(stats.overtime * 100) / 100,
      employeeCount: stats.employees.size,
      entriesCount: stats.entries,
      averageHours: Math.round((stats.hours / Math.max(stats.entries, 1)) * 100) / 100
    }));
    
    // Weekly trend (last 8 weeks)
    const weeklyTrend = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(end);
      weekStart.setDate(end.getDate() - (i * 7) - end.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekEntries = entries.filter(e => 
        e.clockIn >= weekStart && e.clockIn <= weekEnd && e.clockOut
      );
      
      weeklyTrend.push({
        week: `${weekStart.toISOString().split('T')[0]}`,
        hours: weekEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0),
        overtime: weekEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0),
        employees: new Set(weekEntries.map(e => (e.userId as any)._id.toString())).size
      });
    }
    analytics.weeklyTrend = weeklyTrend as any;
    
    // Top performers (by hours worked)
    const userStats: Record<string, any> = {};
    entries.forEach(entry => {
      const userId = (entry.userId as any)._id.toString();
      if (!userStats[userId]) {
        userStats[userId] = {
          user: entry.userId,
          hours: 0,
          overtime: 0,
          entries: 0,
          punctuality: 0
        };
      }
      
      userStats[userId].hours += entry.totalHours || 0;
      userStats[userId].overtime += entry.overtimeHours || 0;
      userStats[userId].entries += 1;
    });
    
    analytics.topPerformers = Object.values(userStats)
      .sort((a: any, b: any) => b.hours - a.hours)
      .slice(0, 10)
      .map((stat: any) => ({
        user: stat.user,
        totalHours: Math.round(stat.hours * 100) / 100,
        overtime: Math.round(stat.overtime * 100) / 100,
        entries: stat.entries,
        averageHours: Math.round((stat.hours / Math.max(stat.entries, 1)) * 100) / 100
      })) as any;
    
    // Calculate attendance rate
    const scheduledShifts = await Shift.countDocuments({
      tenantId: req.user?.tenantId,
      date: { $gte: start, $lte: end },
      status: { $in: ['scheduled', 'confirmed', 'completed'] }
    });
    
    const completedShifts = await Shift.countDocuments({
      tenantId: req.user?.tenantId,
      date: { $gte: start, $lte: end },
      status: 'completed'
    });
    
    analytics.attendanceRate = scheduledShifts > 0 ? 
      Math.round((completedShifts / scheduledShifts) * 100) : 100;
    
    // Round summary numbers
    analytics.summary.totalHours = Math.round(analytics.summary.totalHours * 100) / 100;
    analytics.summary.totalOvertime = Math.round(analytics.summary.totalOvertime * 100) / 100;
    
    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      analytics
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
};

export const getPayrollAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const entries = await TimeEntry.find({
      tenantId: req.user?.tenantId,
      clockIn: { $gte: start, $lte: end },
      clockOut: { $exists: true }
    }).populate('userId', 'name department hourlyRate');
    
    // Calculate payroll by employee
    const payrollData = entries.reduce((acc: any, entry) => {
      const userId = (entry.userId as any)._id.toString();
      const hourlyRate = (entry.userId as any).hourlyRate || 15.00;
      const overtimeRate = hourlyRate * 1.5;
      
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.userId,
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          regularPay: 0,
          overtimePay: 0,
          totalPay: 0,
          hourlyRate
        };
      }
      
      const regularHours = Math.max(0, (entry.totalHours || 0) - (entry.overtimeHours || 0));
      const overtime = entry.overtimeHours || 0;
      
      acc[userId].regularHours += regularHours;
      acc[userId].overtimeHours += overtime;
      acc[userId].totalHours += entry.totalHours || 0;
      acc[userId].regularPay += regularHours * hourlyRate;
      acc[userId].overtimePay += overtime * overtimeRate;
      acc[userId].totalPay += (regularHours * hourlyRate) + (overtime * overtimeRate);
      
      return acc;
    }, {});
    
    const payroll = Object.values(payrollData).map((p: any) => ({
      ...p,
      regularHours: Math.round(p.regularHours * 100) / 100,
      overtimeHours: Math.round(p.overtimeHours * 100) / 100,
      totalHours: Math.round(p.totalHours * 100) / 100,
      regularPay: Math.round(p.regularPay * 100) / 100,
      overtimePay: Math.round(p.overtimePay * 100) / 100,
      totalPay: Math.round(p.totalPay * 100) / 100
    }));
    
    const totals = payroll.reduce((acc, p) => ({
      regularHours: acc.regularHours + p.regularHours,
      overtimeHours: acc.overtimeHours + p.overtimeHours,
      totalHours: acc.totalHours + p.totalHours,
      regularPay: acc.regularPay + p.regularPay,
      overtimePay: acc.overtimePay + p.overtimePay,
      totalPay: acc.totalPay + p.totalPay
    }), {
      regularHours: 0,
      overtimeHours: 0,
      totalHours: 0,
      regularPay: 0,
      overtimePay: 0,
      totalPay: 0
    });
    
    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      payroll: payroll.sort((a, b) => b.totalPay - a.totalPay),
      totals: {
        ...totals,
        regularHours: Math.round(totals.regularHours * 100) / 100,
        overtimeHours: Math.round(totals.overtimeHours * 100) / 100,
        totalHours: Math.round(totals.totalHours * 100) / 100,
        regularPay: Math.round(totals.regularPay * 100) / 100,
        overtimePay: Math.round(totals.overtimePay * 100) / 100,
        totalPay: Math.round(totals.totalPay * 100) / 100
      },
      employeeCount: payroll.length
    });
  } catch (error) {
    logger.error('Get payroll analytics error:', error);
    res.status(500).json({ error: 'Failed to generate payroll analytics' });
  }
};