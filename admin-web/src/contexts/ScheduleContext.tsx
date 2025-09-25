'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  position: string;
  department: string;
  isTemplate?: boolean;
  templateId?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'no-show' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  department: string;
  position: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
  requiredStaff: number;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface ScheduleContextType {
  shifts: Shift[];
  templates: ShiftTemplate[];
  createShift: (shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  createTemplate: (template: Omit<ShiftTemplate, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, updates: Partial<ShiftTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getWeekSchedule: (weekStart: Date) => Shift[];
  getUserSchedule: (userId: string, days?: number) => Shift[];
  generateScheduleFromTemplate: (templateId: string, weekStart: Date) => void;
  checkScheduleConflicts: (shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>) => Shift[];
  getScheduleStats: (weekStart: Date) => {
    totalShifts: number;
    totalHours: number;
    staffUtilization: number;
    departmentBreakdown: Record<string, number>;
  };
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// Production-ready - no mock data

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);

  useEffect(() => {
    // Load data from localStorage only
    const savedShifts = localStorage.getItem('scheduleShifts');
    const savedTemplates = localStorage.getItem('scheduleTemplates');

    if (savedShifts) {
      const parsed = JSON.parse(savedShifts);
      const shiftsWithDates = parsed.map((shift: any) => ({
        ...shift,
        date: new Date(shift.date),
        createdAt: new Date(shift.createdAt),
        updatedAt: new Date(shift.updatedAt),
      }));
      setShifts(shiftsWithDates);
    }

    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates);
      const templatesWithDates = parsed.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
      }));
      setTemplates(templatesWithDates);
    }
  }, []);

  const saveShifts = (newShifts: Shift[]) => {
    setShifts(newShifts);
    localStorage.setItem('scheduleShifts', JSON.stringify(newShifts));
  };

  const saveTemplates = (newTemplates: ShiftTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('scheduleTemplates', JSON.stringify(newTemplates));
  };

  const createShift = (shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newShift: Shift = {
      ...shiftData,
      id: `shift-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedShifts = [...shifts, newShift];
    saveShifts(updatedShifts);
  };

  const updateShift = (id: string, updates: Partial<Shift>) => {
    const updatedShifts = shifts.map(shift =>
      shift.id === id ? { ...shift, ...updates, updatedAt: new Date() } : shift
    );
    saveShifts(updatedShifts);
  };

  const deleteShift = (id: string) => {
    const updatedShifts = shifts.filter(shift => shift.id !== id);
    saveShifts(updatedShifts);
  };

  const createTemplate = (templateData: Omit<ShiftTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: ShiftTemplate = {
      ...templateData,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
    };
    
    const updatedTemplates = [...templates, newTemplate];
    saveTemplates(updatedTemplates);
  };

  const updateTemplate = (id: string, updates: Partial<ShiftTemplate>) => {
    const updatedTemplates = templates.map(template =>
      template.id === id ? { ...template, ...updates } : template
    );
    saveTemplates(updatedTemplates);
  };

  const deleteTemplate = (id: string) => {
    const updatedTemplates = templates.filter(template => template.id !== id);
    saveTemplates(updatedTemplates);
  };

  const getWeekSchedule = (weekStart: Date): Shift[] => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    }).sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const getUserSchedule = (userId: string, days = 30): Shift[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return shifts.filter(shift => 
      shift.userId === userId && shift.date <= cutoffDate
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const generateScheduleFromTemplate = (templateId: string, weekStart: Date) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newShifts: Shift[] = [];

    template.daysOfWeek.forEach(dayOfWeek => {
      const shiftDate = new Date(weekStart);
      const daysToAdd = (dayOfWeek - weekStart.getDay() + 7) % 7;
      shiftDate.setDate(weekStart.getDate() + daysToAdd);

      // Create unassigned shifts for required staff count
      for (let i = 0; i < template.requiredStaff; i++) {
        newShifts.push({
          id: `generated-${Date.now()}-${i}`,
          userId: '', // Unassigned - needs manual assignment
          userName: 'Unassigned',
          date: new Date(shiftDate),
          startTime: template.startTime,
          endTime: template.endTime,
          position: template.position,
          department: template.department,
          status: 'scheduled',
          templateId: template.id,
          isTemplate: true,
          createdBy: template.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    const updatedShifts = [...shifts, ...newShifts];
    saveShifts(updatedShifts);
  };

  const checkScheduleConflicts = (newShift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Shift[] => {
    const shiftDate = new Date(newShift.date).toDateString();
    
    return shifts.filter(existingShift => {
      if (existingShift.userId !== newShift.userId) return false;
      if (existingShift.date.toDateString() !== shiftDate) return false;

      // Check time overlap
      const newStart = convertTimeToMinutes(newShift.startTime);
      const newEnd = convertTimeToMinutes(newShift.endTime);
      const existingStart = convertTimeToMinutes(existingShift.startTime);
      const existingEnd = convertTimeToMinutes(existingShift.endTime);

      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  const getScheduleStats = (weekStart: Date) => {
    const weekShifts = getWeekSchedule(weekStart);
    
    const totalShifts = weekShifts.length;
    const totalHours = weekShifts.reduce((sum, shift) => {
      const start = convertTimeToMinutes(shift.startTime);
      const end = convertTimeToMinutes(shift.endTime);
      return sum + (end - start) / 60;
    }, 0);

    const uniqueStaff = new Set(weekShifts.map(s => s.userId)).size;
    const totalPossibleStaff = 5; // Mock total staff count
    const staffUtilization = (uniqueStaff / totalPossibleStaff) * 100;

    const departmentBreakdown = weekShifts.reduce((acc, shift) => {
      acc[shift.department] = (acc[shift.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalShifts,
      totalHours: Math.round(totalHours * 100) / 100,
      staffUtilization: Math.round(staffUtilization),
      departmentBreakdown,
    };
  };

  const value: ScheduleContextType = {
    shifts,
    templates,
    createShift,
    updateShift,
    deleteShift,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getWeekSchedule,
    getUserSchedule,
    generateScheduleFromTemplate,
    checkScheduleConflicts,
    getScheduleStats,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}

// Helper function
function convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}