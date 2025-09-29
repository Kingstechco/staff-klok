'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { timeEntriesAPI, dashboardAPI } from '../utils/api';

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  clockIn: Date;
  clockOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  totalHours?: number;
  overtimeHours?: number;
  notes?: string;
  location?: string;
  isApproved?: boolean;
  approvedBy?: string;
  status?: 'active' | 'completed';
}

export interface WeeklyStats {
  week: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalStaff: number;
  averageHours: number;
  laborCost: number;
}

export interface TimeTrackingContextType {
  timeEntries: TimeEntry[];
  currentEntry: TimeEntry | null;
  clockIn: (userId: string, userName: string, location?: string) => Promise<boolean>;
  clockOut: (userId?: string, notes?: string) => Promise<boolean>;
  startBreak: (entryId: string) => Promise<boolean>;
  endBreak: (entryId: string) => Promise<boolean>;
  getWeeklyStats: (weekOffset?: number) => WeeklyStats;
  getUserEntries: (userId: string, days?: number) => TimeEntry[];
  getAllEntriesInRange: (startDate: Date, endDate: Date) => TimeEntry[];
  approveEntry: (entryId: string, approvedBy: string) => Promise<boolean>;
  editEntry: (entryId: string, updates: Partial<TimeEntry>) => Promise<boolean>;
  deleteEntry: (entryId: string) => Promise<boolean>;
  exportData: (format: 'csv' | 'excel', dateRange?: { start: Date; end: Date }) => Promise<boolean>;
  refreshEntries: (userId?: string) => Promise<void>;
  loading: boolean;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshEntries = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      const response = await timeEntriesAPI.getEntries();
      const apiEntries = response.map((entry: any) => ({
        id: entry._id,
        userId: typeof entry.userId === 'object' ? entry.userId._id : entry.userId,
        userName: typeof entry.userId === 'object' ? entry.userId.name : entry.userName || 'Unknown',
        clockIn: new Date(entry.clockIn),
        clockOut: entry.clockOut ? new Date(entry.clockOut) : undefined,
        totalHours: entry.totalHours || 0,
        overtimeHours: entry.overtimeHours || 0,
        notes: entry.notes,
        location: entry.location?.address || 'Unknown',
        isApproved: entry.isApproved || false,
        approvedBy: typeof entry.approvedBy === 'object' ? entry.approvedBy?.name : undefined,
        status: entry.status,
      }));
      setTimeEntries(apiEntries);
      
      // Always check for active entries to sync current state
      // Look for entries without clockOut and with active status
      const activeEntry = apiEntries.find(
        (entry: any) => !entry.clockOut && entry.status === 'active'
      );
      
      // If userId specified, ensure the active entry belongs to that user
      const currentActiveEntry = userId && activeEntry ? 
        (activeEntry.userId === userId ? activeEntry : null) : 
        activeEntry;
      
      setCurrentEntry(currentActiveEntry || null);
      
      // Sync localStorage for consistency
      if (currentActiveEntry) {
        localStorage.setItem('currentEntry', JSON.stringify(currentActiveEntry));
      } else {
        localStorage.removeItem('currentEntry');
      }
    } catch (error) {
      console.error('Failed to refresh entries:', error);
      // Don't throw error when backend is unavailable - use mock data instead
      const mockEntries: TimeEntry[] = [];
      setTimeEntries(mockEntries);
      
      // Clear currentEntry state when API fails - don't rely on stale localStorage
      setCurrentEntry(null);
      localStorage.removeItem('currentEntry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load entries on mount
    refreshEntries();
  }, [refreshEntries]);

  const clockIn = useCallback(async (userId: string, userName: string, location = 'Store-WiFi-Main'): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await timeEntriesAPI.clockIn({
        location: { address: location },
        notes: `Clock in from ${location}`
      });

      const newEntry: TimeEntry = {
        id: response._id,
        userId: response.userId,
        userName,
        clockIn: new Date(response.clockIn),
        location,
        isApproved: response.isApproved || false,
        status: response.status || 'active',
      };
      
      setCurrentEntry(newEntry);
      localStorage.setItem('currentEntry', JSON.stringify(newEntry));
      
      // Refresh entries from API with userId
      await refreshEntries(userId);
      return true;
    } catch (error: any) {
      console.error('Clock in error:', error);
      
      // Handle specific error cases
      if (error.message === 'Already clocked in') {
        // Try to refresh entries to get current state
        await refreshEntries(userId);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [refreshEntries]);

  const clockOut = useCallback(async (userId?: string, notes?: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await timeEntriesAPI.clockOut({ notes });
      
      setCurrentEntry(null);
      localStorage.removeItem('currentEntry');
      
      // Refresh entries from API with userId
      if (userId) {
        await refreshEntries(userId);
      } else {
        await refreshEntries();
      }
      return true;
    } catch (error: any) {
      console.error('Clock out error:', error);
      
      // Handle specific error cases
      if (error.message === 'No active clock-in found') {
        // If no active clock-in, sync the state and refresh entries
        setCurrentEntry(null);
        localStorage.removeItem('currentEntry');
        if (userId) {
          await refreshEntries(userId);
        } else {
          await refreshEntries();
        }
        
        // Re-throw with a user-friendly message
        throw new Error('You are not currently clocked in. Your session may have expired or you may already be clocked out.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [refreshEntries]);

  const startBreak = async (entryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      // Implementation would need to be added to API
      console.log('Start break not yet implemented in API');
      return false;
    } catch (error) {
      console.error('Start break error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const endBreak = async (entryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      // Implementation would need to be added to API
      console.log('End break not yet implemented in API');
      return false;
    } catch (error) {
      console.error('End break error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getWeeklyStats = useCallback((weekOffset = 0): WeeklyStats => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekEntries = timeEntries.filter(entry => 
      entry.clockIn >= startOfWeek && entry.clockIn <= endOfWeek && entry.clockOut
    );

    const totalHours = weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const overtimeHours = weekEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
    const regularHours = totalHours - overtimeHours;
    const uniqueUsers = new Set(weekEntries.map(entry => entry.userId)).size;
    const averageHours = uniqueUsers > 0 ? totalHours / uniqueUsers : 0;
    
    // Calculate labor cost (requires user hourly rates from API)
    const laborCost = 0; // To be calculated with actual user rates

    return {
      week: `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`,
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      totalStaff: uniqueUsers,
      averageHours: Math.round(averageHours * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
    };
  }, [timeEntries]);

  const getUserEntries = useCallback((userId: string, days = 30): TimeEntry[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return timeEntries.filter(entry => 
      entry.userId === userId && entry.clockIn >= cutoffDate
    );
  }, [timeEntries]);

  const getAllEntriesInRange = (startDate: Date, endDate: Date): TimeEntry[] => {
    return timeEntries.filter(entry => 
      entry.clockIn >= startDate && entry.clockIn <= endDate
    );
  };

  const approveEntry = async (entryId: string, approvedBy: string): Promise<boolean> => {
    try {
      setLoading(true);
      // This would need to be implemented in the API
      console.log('Approve entry not yet implemented in API');
      return false;
    } catch (error) {
      console.error('Approve entry error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const editEntry = async (entryId: string, updates: Partial<TimeEntry>): Promise<boolean> => {
    try {
      setLoading(true);
      // This would need to be implemented in the API
      console.log('Edit entry not yet implemented in API');
      return false;
    } catch (error) {
      console.error('Edit entry error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      // This would need to be implemented in the API
      console.log('Delete entry not yet implemented in API');
      return false;
    } catch (error) {
      console.error('Delete entry error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'excel', dateRange?: { start: Date; end: Date }): Promise<boolean> => {
    try {
      setLoading(true);
      
      const params: any = { format };
      if (dateRange) {
        params.startDate = dateRange.start.toISOString();
        params.endDate = dateRange.end.toISOString();
      }

      const blob = await timeEntriesAPI.exportTimeEntries(params);
      
      // Create download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: TimeTrackingContextType = useMemo(() => ({
    timeEntries,
    currentEntry,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getWeeklyStats,
    getUserEntries,
    getAllEntriesInRange,
    approveEntry,
    editEntry,
    deleteEntry,
    exportData,
    refreshEntries,
    loading,
  }), [
    timeEntries,
    currentEntry,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getWeeklyStats,
    getUserEntries,
    getAllEntriesInRange,
    approveEntry,
    editEntry,
    deleteEntry,
    exportData,
    refreshEntries,
    loading,
  ]);

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
}