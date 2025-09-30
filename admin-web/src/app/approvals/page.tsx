'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { timeEntriesAPI, contractorAPI } from '../../utils/api';
import TimeDisplay from '@/components/ui/TimeDisplay';

// Define TimeEntry interface at top level
interface TimeEntry {
  _id: string;
  userId: {
    _id: string;
    name: string;
    role: string;
  };
  projectId?: {
    name: string;
    code: string;
    clientName: string;
  };
  clockIn: string;
  clockOut?: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  taskDescription?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  approvals: Array<{
    approverId: string;
    approverType: 'manager' | 'client';
    status: string;
    timestamp: string;
    notes?: string;
  }>;
  notes?: string;
}

// Type guard to ensure we have a valid TimeEntry array
const isTimeEntryArray = (data: any): data is TimeEntry[] => {
  if (!Array.isArray(data)) {
    return false;
  }
  
  // Empty array is valid
  if (data.length === 0) {
    return true;
  }
  
  // Check first item has required properties
  const firstItem = data[0];
  return firstItem && 
         typeof firstItem === 'object' && 
         '_id' in firstItem && 
         'userId' in firstItem;
};

const TimesheetApprovalInterface: React.FC = () => {
  const authContext = useAuth();
  const { currentUser, currentTenant, canApproveTimesheets } = authContext;
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | ''>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [filterContractor, setFilterContractor] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });

  // Load pending time entries
  useEffect(() => {
    const loadPendingEntries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params: any = {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          approvalStatus: 'pending'
        };
        
        if (filterContractor) {
          params.userId = filterContractor;
        }
        
        if (filterProject) {
          params.projectId = filterProject;
        }
        
        console.log('Loading pending entries with params:', params);
        
        const data = await timeEntriesAPI.getEntriesForApproval(params);
        console.log('API response:', data);
        
        const entries = data?.entries || data || [];
        
        // Ensure we have a valid array of time entries
        if (isTimeEntryArray(entries)) {
          setTimeEntries(entries);
          console.log('Set time entries:', entries.length, 'entries');
        } else {
          console.warn('Invalid time entries data received:', entries);
          setTimeEntries([]);
        }
      } catch (err: any) {
        console.error('Failed to load pending entries:', err);
        setError(err.message || 'Failed to load pending time entries');
        setTimeEntries([]); // Ensure we set an empty array on error
      } finally {
        setLoading(false);
      }
    };

    // Only load if we have the necessary auth context
    if (currentUser && canApproveTimesheets()) {
      loadPendingEntries();
    } else {
      setLoading(false);
    }
  }, [dateRange, filterContractor, filterProject, currentUser, canApproveTimesheets]);

  // Check if auth is loaded and if user has permissions - render conditionally
  if (authContext.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check permissions (with safe call)
  if (!canApproveTimesheets || !canApproveTimesheets()) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            You don&apos;t have permission to approve timesheets.
          </p>
        </div>
      </div>
    );
  }

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === timeEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(timeEntries.map(entry => entry._id)));
    }
  };

  const handleSingleApproval = async (entryId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      if (action === 'approve') {
        await timeEntriesAPI.approveTimeEntry(entryId, notes);
      } else {
        await timeEntriesAPI.rejectTimeEntry(entryId, notes || 'No reason provided');
      }
      
      // Refresh the list
      setTimeEntries(prev => prev.filter(entry => entry._id !== entryId));
    } catch (err: any) {
      console.error(`Failed to ${action} entry:`, err);
      alert(`Failed to ${action} time entry: ${err.message}`);
    }
  };

  const handleBulkAction = async () => {
    if (selectedEntries.size === 0 || !bulkAction) return;

    try {
      const entryIds = Array.from(selectedEntries);
      
      if (bulkAction === 'approve') {
        await contractorAPI.bulkApproveTimesheets({
          entryIds,
          approvalNotes: bulkNotes,
          approverType: currentUser?.role === 'client_contact' ? 'client' : 'manager'
        });
      } else {
        await contractorAPI.bulkRejectTimesheets({
          entryIds,
          rejectionReason: bulkNotes || 'Bulk rejection',
          approverType: currentUser?.role === 'client_contact' ? 'client' : 'manager'
        });
      }
      
      // Remove processed entries from the list
      setTimeEntries(prev => prev.filter(entry => !selectedEntries.has(entry._id)));
      setSelectedEntries(new Set());
      setBulkAction('');
      setBulkNotes('');
      
    } catch (err: any) {
      console.error(`Bulk ${bulkAction} failed:`, err);
      alert(`Bulk ${bulkAction} failed: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-indigo-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Header */}
      <div className="relative border-b border-gray-200/60 bg-gradient-to-r from-white via-white to-indigo-50/30 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10 opacity-50" />
        
        {/* Floating Decorative Elements */}
        <div className="absolute top-4 right-8 opacity-20">
          <div className="flex space-x-2">
            <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '800ms' }} />
          </div>
        </div>
        
        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Title Section */}
            <div className="flex-1">
              <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-700 bg-clip-text text-transparent">
                Timesheet Approvals
              </h1>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Review and approve time entries - {timeEntries.length} pending
              </p>
            </div>
            
            {/* Date Range and Time Display */}
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                {/* Enhanced Date Inputs */}
                <div className="relative group">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">From</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
                    className="px-4 py-2.5 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md text-sm"
                  />
                </div>
                <div className="relative group">
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">To</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
                    className="px-4 py-2.5 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md text-sm"
                  />
                </div>
              </div>
              
              <TimeDisplay collapsible />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-white to-amber-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-amber-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <ClockIcon className="h-6 w-6 text-amber-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Pending Approvals</p>
                <p className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:from-amber-700 group-hover:to-orange-700 transition-all duration-300">{timeEntries.length}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Need review</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-blue-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-blue-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <CheckCircleIcon className="h-6 w-6 text-blue-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Selected</p>
                <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-cyan-700 transition-all duration-300">{selectedEntries.size}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">For bulk action</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-purple-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-purple-300 hover:shadow-2xl hover:shadow-purple-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-purple-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <CalendarIcon className="h-6 w-6 text-purple-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Date Range</p>
                <p className="text-lg font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-violet-700 transition-all duration-300">{Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Filter period</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-green-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-green-300 hover:shadow-2xl hover:shadow-green-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-green-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <DocumentCheckIcon className="h-6 w-6 text-green-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Hours</p>
                <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-emerald-700 transition-all duration-300">{timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0).toFixed(1)}h</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Pending review</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>
        </div>
        {/* Enhanced Bulk Actions */}
        {selectedEntries.size > 0 && (
          <div className="group relative bg-gradient-to-br from-white via-white to-indigo-50/30 border border-gray-200/60 rounded-2xl p-6 mb-8 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden backdrop-blur-sm">
            {/* Enhanced Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Floating Decorative Elements */}
            <div className="absolute top-4 right-4 opacity-20">
              <div className="flex space-x-1">
                <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" />
                <div className="h-1 w-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '500ms' }} />
              </div>
            </div>
            
            <h3 className="relative text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 flex items-center gap-3">
              Bulk Actions ({selectedEntries.size} selected)
              <div className="h-1 w-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
            </h3>
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as any)}
                  className="px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
                >
                  <option value="">Select Action</option>
                  <option value="approve">Approve All</option>
                  <option value="reject">Reject All</option>
                </select>
                <input
                  type="text"
                  placeholder="Notes (optional for approve, required for reject)"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md placeholder-gray-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || (bulkAction === 'reject' && !bulkNotes)}
                  className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  Apply Action
                </button>
                <button
                  onClick={() => {
                    setSelectedEntries(new Set());
                    setBulkAction('');
                    setBulkNotes('');
                  }}
                  className="group relative inline-flex items-center px-5 py-2.5 border border-gray-300/60 rounded-xl text-sm font-bold text-gray-700 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-0.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Time Entries Table */}
        <div className="group relative bg-gradient-to-br from-white to-gray-50/20 border border-gray-200/60 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/10 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative px-6 py-5 border-b border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-indigo-50/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                Pending Time Entries
                <div className="h-1 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
              </h3>
              {timeEntries.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-300"
                >
                  {selectedEntries.size === timeEntries.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>
          <div className="relative px-4 py-5 sm:p-6">
            
            {timeEntries.length === 0 ? (
              <div className="relative text-center py-16 px-6">
                <div className="absolute inset-0 bg-gradient-to-r from-green-50/30 via-emerald-50/20 to-green-50/30 opacity-50" />
                <div className="relative">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg mb-4">
                    <CheckCircleIcon className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    No pending time entries require approval. Great job staying on top of timesheet reviews!
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-indigo-50/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedEntries.size === timeEntries.length && timeEntries.length > 0}
                          onChange={handleSelectAll}
                          className="rounded-lg border-2 border-gray-300/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Contractor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Task Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gradient-to-b from-white to-gray-50/30 divide-y divide-gray-200/60">
                    {timeEntries.map((entry, index) => (
                      <tr 
                        key={entry._id}
                        className={`group relative transition-all duration-300 hover:shadow-lg border-l-4 border-transparent hover:border-indigo-400 ${
                          selectedEntries.has(entry._id) 
                            ? 'bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-indigo-400' 
                            : 'hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/20'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry._id)}
                            onChange={() => handleSelectEntry(entry._id)}
                            className="rounded-lg border-2 border-gray-300/60 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 group-hover:border-indigo-400"
                          />
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                              {entry.userId.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">
                                {entry.userId.name}
                              </div>
                              <div className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                                {entry.userId.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          {entry.projectId ? (
                            <div className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                              <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">
                                {entry.projectId.name}
                              </div>
                              <div className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                                {entry.projectId.code} - {entry.projectId.clientName}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600">No project</span>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">
                              {formatDate(entry.clockIn)}
                            </div>
                            {entry.clockOut && (
                              <div className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                                to {new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                            <div className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300">
                              {formatDuration(entry.totalHours)}
                            </div>
                            {entry.overtimeHours > 0 && (
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 shadow-sm border border-orange-200/60">
                                {formatDuration(entry.overtimeHours)} OT
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate group-hover:text-indigo-700 transition-colors duration-300">
                              {entry.taskDescription || entry.notes || 'No description'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                const notes = prompt('Approval notes (optional):');
                                if (notes !== null) {
                                  handleSingleApproval(entry._id, 'approve', notes);
                                }
                              }}
                              className="group relative inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:shadow-green-500/25 hover:scale-105 border-2 border-white/20"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <CheckIcon className="h-4 w-4 mr-1 group-hover:rotate-12 transition-transform duration-300" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason (required):');
                                if (reason && reason.trim()) {
                                  handleSingleApproval(entry._id, 'reject', reason);
                                } else if (reason !== null) {
                                  alert('Rejection reason is required');
                                }
                              }}
                              className="group relative inline-flex items-center px-4 py-2 border border-red-300/60 rounded-xl text-sm font-bold text-red-700 bg-gradient-to-r from-white to-red-50 hover:from-red-50 hover:to-red-100 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-0.5"
                            >
                              <XMarkIcon className="h-4 w-4 mr-1 group-hover:animate-bounce" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Help Information */}
        <div className="relative mt-8 bg-gradient-to-br from-blue-50 via-blue-50/80 to-indigo-50/60 border border-blue-200/60 rounded-2xl p-6 overflow-hidden group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Floating Decorative Elements */}
          <div className="absolute top-3 right-3 opacity-30">
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '500ms' }} />
              <div className="h-1 w-1 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 animate-pulse" style={{ animationDelay: '1000ms' }} />
            </div>
          </div>
          
          <div className="relative flex">
            <div className="flex-shrink-0">
              <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <InformationCircleIcon className="h-5 w-5 text-white group-hover:animate-pulse" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide flex items-center gap-2 mb-3">
                Approval Guidelines
                <div className="h-1 w-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" />
              </h3>
              <div className="text-sm text-blue-700 font-medium leading-relaxed space-y-2">
                <div className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mt-2 mr-3 flex-shrink-0" />
                  <span><strong>Review Carefully:</strong> Check project assignments, hours worked, and task descriptions for accuracy.</span>
                </div>
                <div className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 mt-2 mr-3 flex-shrink-0" />
                  <span><strong>Bulk Actions:</strong> Select multiple entries and use bulk approve/reject for efficiency.</span>
                </div>
                <div className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 mt-2 mr-3 flex-shrink-0" />
                  <span><strong>Communication:</strong> Add notes when approving or provide clear reasons when rejecting.</span>
                </div>
                <div className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mt-2 mr-3 flex-shrink-0" />
                  <span><strong>Overtime:</strong> Pay special attention to entries with overtime hours (marked in orange).</span>
                </div>
                <div className="flex items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 mt-2 mr-3 flex-shrink-0" />
                  <span><strong>Projects:</strong> Ensure contractors are logging time to the correct projects and clients.</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-b-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </div>
  );
};

export default TimesheetApprovalInterface;

// Icon Components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DocumentCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InformationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}