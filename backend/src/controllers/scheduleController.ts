import { Request, Response } from 'express';
import Shift from '../models/Shift';
import ShiftTemplate from '../models/ShiftTemplate';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const getShifts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, userId, department, status } = req.query;
    const user = req.user!;
    
    const filter: any = {};
    
    // Role-based access control
    if (user.role === 'staff') {
      // Staff can only see their own shifts
      filter.userId = user._id;
      
      // Staff cannot filter by other users
      if (userId && userId !== (user._id as any).toString()) {
        res.status(403).json({ error: 'Access denied: Cannot view other users schedules' });
        return;
      }
    } else if (user.role === 'manager') {
      // Managers can see all shifts in their department (if we had department field on user)
      // For now, managers can see all shifts
      if (userId) filter.userId = userId;
      if (department) filter.department = department;
    } else {
      // Admin can see all shifts
      if (userId) filter.userId = userId;
      if (department) filter.department = department;
    }
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }
    
    if (status) filter.status = status;
    
    const shifts = await Shift.find(filter)
      .populate('userId', 'name email department')
      .populate('createdBy', 'name')
      .populate('modifiedBy', 'name')
      .sort('date startTime');
    
    res.json(shifts);
  } catch (error) {
    logger.error('Get shifts error:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

export const getShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const shift = await Shift.findById(req.params.id)
      .populate('userId', 'name email department')
      .populate('createdBy', 'name')
      .populate('modifiedBy', 'name');
    
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }
    
    // Role-based access control
    if (user.role === 'staff' && shift.userId._id.toString() !== (user._id as any).toString()) {
      res.status(403).json({ error: 'Access denied: Cannot view other users shifts' });
      return;
    }
    
    res.json(shift);
  } catch (error) {
    logger.error('Get shift error:', error);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
};

export const createShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shiftData = {
      ...req.body,
      createdBy: req.user?._id
    };
    
    // Check for conflicts
    const conflicts = await checkShiftConflicts(
      shiftData.userId,
      shiftData.date,
      shiftData.startTime,
      shiftData.endTime
    );
    
    if (conflicts.length > 0) {
      res.status(400).json({ 
        error: 'Shift conflict detected',
        conflicts 
      });
      return;
    }
    
    const shift = new Shift(shiftData);
    await shift.save();
    
    const populatedShift = await Shift.findById(shift._id)
      .populate('userId', 'name email department');
    
    res.status(201).json(populatedShift);
  } catch (error) {
    logger.error('Create shift error:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

export const updateShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updates = {
      ...req.body,
      modifiedBy: req.user?._id
    };
    
    // Check for conflicts if time or user changed
    if (updates.userId || updates.date || updates.startTime || updates.endTime) {
      const currentShift = await Shift.findById(req.params.id);
      if (!currentShift) {
        res.status(404).json({ error: 'Shift not found' });
        return;
      }
      
      const conflicts = await checkShiftConflicts(
        updates.userId || currentShift.userId,
        updates.date || currentShift.date,
        updates.startTime || currentShift.startTime,
        updates.endTime || currentShift.endTime,
        req.params.id
      );
      
      if (conflicts.length > 0) {
        res.status(400).json({ 
          error: 'Shift conflict detected',
          conflicts 
        });
        return;
      }
    }
    
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email department');
    
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }
    
    res.json(shift);
  } catch (error) {
    logger.error('Update shift error:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

export const deleteShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }
    
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    logger.error('Delete shift error:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
};

export const bulkCreateShifts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shifts } = req.body;
    
    if (!Array.isArray(shifts) || shifts.length === 0) {
      res.status(400).json({ error: 'Shifts array is required' });
      return;
    }
    
    const shiftsWithCreator = shifts.map(shift => ({
      ...shift,
      createdBy: req.user?._id
    }));
    
    const createdShifts = await Shift.insertMany(shiftsWithCreator);
    
    res.status(201).json({
      message: `${createdShifts.length} shifts created successfully`,
      shifts: createdShifts
    });
  } catch (error) {
    logger.error('Bulk create shifts error:', error);
    res.status(500).json({ error: 'Failed to create shifts' });
  }
};

export const getShiftTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { department } = req.query;
    
    const filter: any = { isActive: true };
    if (department) filter.department = department;
    
    const templates = await ShiftTemplate.find(filter)
      .populate('createdBy', 'name')
      .sort('name');
    
    res.json(templates);
  } catch (error) {
    logger.error('Get shift templates error:', error);
    res.status(500).json({ error: 'Failed to fetch shift templates' });
  }
};

export const createShiftTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user?._id
    };
    
    const template = new ShiftTemplate(templateData);
    await template.save();
    
    res.status(201).json(template);
  } catch (error) {
    logger.error('Create shift template error:', error);
    res.status(500).json({ error: 'Failed to create shift template' });
  }
};

export const applyTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { templateId, startDate, endDate, userAssignments } = req.body;
    
    const template = await ShiftTemplate.findById(templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const shifts = [];
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      
      const templateShifts = template.shifts.filter(s => s.dayOfWeek === dayOfWeek);
      
      for (const templateShift of templateShifts) {
        const assignedUsers = userAssignments[templateShift.position] || [];
        
        for (const userId of assignedUsers) {
          shifts.push({
            userId,
            date: new Date(date),
            startTime: templateShift.startTime,
            endTime: templateShift.endTime,
            position: templateShift.position,
            department: template.department,
            createdBy: req.user?._id
          });
        }
      }
    }
    
    if (shifts.length > 0) {
      const createdShifts = await Shift.insertMany(shifts);
      res.json({
        message: `${createdShifts.length} shifts created from template`,
        shifts: createdShifts
      });
    } else {
      res.json({ message: 'No shifts created', shifts: [] });
    }
  } catch (error) {
    logger.error('Apply template error:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
};

export const getStaffUtilization = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, department } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const userFilter: any = { isActive: true };
    if (department) userFilter.department = department;
    
    const users = await User.find(userFilter).select('name department');
    const shifts = await Shift.find({
      date: { $gte: start, $lte: end },
      status: { $in: ['scheduled', 'confirmed', 'completed'] }
    }).populate('userId', 'name department');
    
    const utilization = users.map(user => {
      const userShifts = shifts.filter(s => (s.userId as any)._id.toString() === ((user as any)._id).toString());
      const totalHours = userShifts.reduce((sum, shift) => {
        const [startHour, startMin] = shift.startTime.split(':').map(Number);
        const [endHour, endMin] = shift.endTime.split(':').map(Number);
        const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
        return sum + hours;
      }, 0);
      
      return {
        user,
        shiftsCount: userShifts.length,
        totalHours: Math.round(totalHours * 100) / 100,
        shifts: userShifts
      };
    });
    
    res.json({
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      utilization
    });
  } catch (error) {
    logger.error('Get staff utilization error:', error);
    res.status(500).json({ error: 'Failed to get staff utilization' });
  }
};

// Helper function to check for shift conflicts
const checkShiftConflicts = async (
  userId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<any[]> => {
  const filter: any = {
    userId,
    date: new Date(date),
    status: { $in: ['scheduled', 'confirmed'] }
  };
  
  if (excludeShiftId) {
    filter._id = { $ne: excludeShiftId };
  }
  
  const existingShifts = await Shift.find(filter);
  
  const conflicts = existingShifts.filter(shift => {
    return timeOverlap(startTime, endTime, shift.startTime, shift.endTime);
  });
  
  return conflicts;
};

// Helper function to check if two time ranges overlap
const timeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const [start1Hour, start1Min] = start1.split(':').map(Number);
  const [end1Hour, end1Min] = end1.split(':').map(Number);
  const [start2Hour, start2Min] = start2.split(':').map(Number);
  const [end2Hour, end2Min] = end2.split(':').map(Number);
  
  const start1Minutes = start1Hour * 60 + start1Min;
  const end1Minutes = end1Hour * 60 + end1Min;
  const start2Minutes = start2Hour * 60 + start2Min;
  const end2Minutes = end2Hour * 60 + end2Min;
  
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
};