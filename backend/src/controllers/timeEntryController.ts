import { Response } from 'express';
import TimeEntry from '../models/TimeEntry';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const clockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    // Check if user already has an active time entry
    const activeEntry = await TimeEntry.findOne({
      userId: req.user._id,
      status: 'active'
    });
    
    if (activeEntry) {
      res.status(400).json({ error: 'Already clocked in' });
      return;
    }
    
    const { location, notes } = req.body;
    
    const timeEntry = new TimeEntry({
      userId: req.user._id,
      clockIn: new Date(),
      location,
      notes,
      status: 'active'
    });
    
    await timeEntry.save();
    
    res.status(201).json(timeEntry);
  } catch (error) {
    logger.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
};

export const clockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const activeEntry = await TimeEntry.findOne({
      userId: req.user._id,
      status: 'active'
    });
    
    if (!activeEntry) {
      res.status(400).json({ error: 'No active clock-in found' });
      return;
    }
    
    const { notes } = req.body;
    
    activeEntry.clockOut = new Date();
    if (notes) activeEntry.notes = notes;
    
    await activeEntry.save();
    
    res.json(activeEntry);
  } catch (error) {
    logger.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
};

export const startBreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const activeEntry = await TimeEntry.findOne({
      userId: req.user._id,
      status: 'active'
    });
    
    if (!activeEntry) {
      res.status(400).json({ error: 'No active clock-in found' });
      return;
    }
    
    if (activeEntry.breakStart && !activeEntry.breakEnd) {
      res.status(400).json({ error: 'Break already in progress' });
      return;
    }
    
    activeEntry.breakStart = new Date();
    await activeEntry.save();
    
    res.json(activeEntry);
  } catch (error) {
    logger.error('Start break error:', error);
    res.status(500).json({ error: 'Failed to start break' });
  }
};

export const endBreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const activeEntry = await TimeEntry.findOne({
      userId: req.user._id,
      status: 'active'
    });
    
    if (!activeEntry || !activeEntry.breakStart || activeEntry.breakEnd) {
      res.status(400).json({ error: 'No active break found' });
      return;
    }
    
    activeEntry.breakEnd = new Date();
    const breakDuration = (activeEntry.breakEnd.getTime() - activeEntry.breakStart.getTime()) / (1000 * 60);
    activeEntry.totalBreakTime = (activeEntry.totalBreakTime || 0) + breakDuration;
    
    await activeEntry.save();
    
    res.json(activeEntry);
  } catch (error) {
    logger.error('End break error:', error);
    res.status(500).json({ error: 'Failed to end break' });
  }
};

export const getTimeEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, startDate, endDate, status, isApproved } = req.query;
    
    const filter: any = {};
    
    // If not admin/manager, only show own entries
    if (req.user?.role === 'staff') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }
    
    if (startDate || endDate) {
      filter.clockIn = {};
      if (startDate) filter.clockIn.$gte = new Date(startDate as string);
      if (endDate) filter.clockIn.$lte = new Date(endDate as string);
    }
    
    if (status) filter.status = status;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
    
    const entries = await TimeEntry.find(filter)
      .populate('userId', 'name email department')
      .populate('approvedBy', 'name')
      .sort('-clockIn');
    
    res.json(entries);
  } catch (error) {
    logger.error('Get time entries error:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
};

export const getTimeEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await TimeEntry.findById(req.params.id)
      .populate('userId', 'name email department')
      .populate('approvedBy', 'name');
    
    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    // Check access
    if (req.user?.role === 'staff' && entry.userId.toString() !== (req.user._id as any).toString()) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    res.json(entry);
  } catch (error) {
    logger.error('Get time entry error:', error);
    res.status(500).json({ error: 'Failed to fetch time entry' });
  }
};

export const updateTimeEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clockIn, clockOut, notes } = req.body;
    
    const entry = await TimeEntry.findById(req.params.id);
    
    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    // Only admin/manager can edit entries
    if (req.user?.role === 'staff') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    if (clockIn) entry.clockIn = new Date(clockIn);
    if (clockOut) entry.clockOut = new Date(clockOut);
    if (notes !== undefined) entry.notes = notes;
    
    await entry.save();
    
    res.json(entry);
  } catch (error) {
    logger.error('Update time entry error:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
};

export const approveTimeEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await TimeEntry.findById(req.params.id);
    
    if (!entry) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    
    if (!entry.clockOut) {
      res.status(400).json({ error: 'Cannot approve incomplete entry' });
      return;
    }
    
    // Use the comprehensive approval system
    entry.addApproval({
      approverId: req.user?._id as any,
      approverType: req.user?.role === 'client_contact' ? 'client' : 'manager',
      status: 'approved',
      notes: 'Manual approval via controller'
    });
    
    await entry.save();
    
    res.json(entry);
  } catch (error) {
    logger.error('Approve time entry error:', error);
    res.status(500).json({ error: 'Failed to approve time entry' });
  }
};

export const getWeeklyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { weekOffset = 0 } = req.query;
    const offset = parseInt(weekOffset as string);
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const filter: any = {
      clockIn: { $gte: startOfWeek, $lt: endOfWeek }
    };
    
    if (req.user?.role === 'staff') {
      filter.userId = req.user._id;
    }
    
    const entries = await TimeEntry.find(filter)
      .populate('userId', 'name email department hourlyRate')
      .sort('clockIn');
    
    const stats = {
      week: `${startOfWeek.toLocaleDateString()} - ${new Date(endOfWeek.getTime() - 1).toLocaleDateString()}`,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      totalStaff: new Set(),
      entriesByUser: {} as any
    };
    
    entries.forEach(entry => {
      stats.totalHours += entry.totalHours || 0;
      stats.regularHours += entry.regularHours || 0;
      stats.overtimeHours += entry.overtimeHours || 0;
      
      const userId = entry.userId._id.toString();
      stats.totalStaff.add(userId);
      
      if (!stats.entriesByUser[userId]) {
        stats.entriesByUser[userId] = {
          user: entry.userId,
          entries: [],
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0
        };
      }
      
      stats.entriesByUser[userId].entries.push(entry);
      stats.entriesByUser[userId].totalHours += entry.totalHours || 0;
      stats.entriesByUser[userId].regularHours += entry.regularHours || 0;
      stats.entriesByUser[userId].overtimeHours += entry.overtimeHours || 0;
    });
    
    res.json({
      ...stats,
      totalStaff: stats.totalStaff.size,
      entries
    });
  } catch (error) {
    logger.error('Get weekly report error:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
};