import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TimeEntry from '../models/TimeEntry';
import User from '../models/User';
import Shift from '../models/Shift';
import logger from '../utils/logger';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Staff users should only see their own dashboard data
    if (req.user.role === 'staff') {
      res.status(403).json({ error: 'Access denied: Staff users cannot view organization stats. Use /api/dashboard/user instead.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get today's stats (admin/manager only)
    const todayEntries = await TimeEntry.find({
      clockIn: { $gte: today, $lt: tomorrow }
    }).populate('userId', 'name department');

    const clockedInToday = todayEntries.filter(e => !e.clockOut).length;
    const totalHoursToday = todayEntries
      .filter(e => e.clockOut)
      .reduce((sum, e) => sum + (e.totalHours || 0), 0);

    // Get weekly stats (admin/manager only)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const weeklyEntries = await TimeEntry.find({
      clockIn: { $gte: startOfWeek, $lt: tomorrow }
    }).populate('userId', 'name department');

    const totalWeeklyHours = weeklyEntries
      .filter(e => e.clockOut)
      .reduce((sum, e) => sum + (e.totalHours || 0), 0);

    const weeklyOvertime = weeklyEntries
      .filter(e => e.clockOut)
      .reduce((sum, e) => sum + (e.overtimeHours || 0), 0);

    // Get pending approvals (admin/manager only)
    const pendingApprovals = await TimeEntry.countDocuments({
      isApproved: { $ne: true },
      clockOut: { $exists: true }
    });

    // Get today's schedule (admin/manager only)
    const todayShifts = await Shift.find({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('userId', 'name department');

    // Active employees count (admin/manager only)
    const activeEmployees = await User.countDocuments({ isActive: true });

    res.json({
      today: {
        clockedIn: clockedInToday,
        totalHours: Math.round(totalHoursToday * 100) / 100,
        scheduledShifts: todayShifts.length,
        entries: todayEntries
      },
      weekly: {
        totalHours: Math.round(totalWeeklyHours * 100) / 100,
        overtime: Math.round(weeklyOvertime * 100) / 100,
        averageDaily: Math.round((totalWeeklyHours / 7) * 100) / 100
      },
      general: {
        activeEmployees,
        pendingApprovals
      },
      todaySchedule: todayShifts
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getUserDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get current active entry
    const currentEntry = await TimeEntry.findOne({
      userId,
      status: 'active'
    });

    // Get today's completed entries
    const todayEntries = await TimeEntry.find({
      userId,
      clockIn: { $gte: today, $lt: tomorrow },
      clockOut: { $exists: true }
    });

    const todayHours = todayEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);

    // Get weekly stats
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const weeklyEntries = await TimeEntry.find({
      userId,
      clockIn: { $gte: startOfWeek, $lt: tomorrow },
      clockOut: { $exists: true }
    });

    const weeklyHours = weeklyEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const weeklyOvertime = weeklyEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);

    // Get upcoming shifts
    const upcomingShifts = await Shift.find({
      userId,
      date: { $gte: today },
      status: { $in: ['scheduled', 'confirmed'] }
    }).sort('date').limit(5);

    res.json({
      currentEntry,
      today: {
        hours: Math.round(todayHours * 100) / 100,
        entries: todayEntries.length
      },
      weekly: {
        hours: Math.round(weeklyHours * 100) / 100,
        overtime: Math.round(weeklyOvertime * 100) / 100,
        entries: weeklyEntries.length
      },
      upcomingShifts
    });
  } catch (error) {
    logger.error('Get user dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch user dashboard' });
  }
};