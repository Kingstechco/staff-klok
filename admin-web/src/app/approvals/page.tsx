'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { timeEntriesAPI, contractorAPI } from '../../utils/api';

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

const TimesheetApprovalInterface: React.FC = () => {
  const { currentUser, currentTenant, canApproveTimesheets } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
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

  // Check permissions
  if (!canApproveTimesheets()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to approve timesheets.
          </p>
        </div>
      </div>
    );
  }

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
        
        const data = await timeEntriesAPI.getEntriesForApproval(params);
        setTimeEntries(data.entries || data || []);
      } catch (err: any) {
        console.error('Failed to load pending entries:', err);
        setError(err.message || 'Failed to load pending time entries');
      } finally {
        setLoading(false);
      }
    };

    loadPendingEntries();
  }, [dateRange, filterContractor, filterProject]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Timesheet Approvals</h1>
                <p className="text-gray-600">
                  Review and approve time entries - {timeEntries.length} pending
                </p>
              </div>
              <div className="flex space-x-3">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bulk Actions */}
        {selectedEntries.size > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Bulk Actions ({selectedEntries.size} selected)
            </h3>
            <div className="flex items-center space-x-4">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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
                className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 max-w-md"
              />
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || (bulkAction === 'reject' && !bulkNotes)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setSelectedEntries(new Set());
                  setBulkAction('');
                  setBulkNotes('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Time Entries Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Pending Time Entries
              </h3>
              {timeEntries.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedEntries.size === timeEntries.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            
            {timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-5xl mb-4">✓</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">No pending time entries require approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedEntries.size === timeEntries.length && timeEntries.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contractor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeEntries.map((entry) => (
                      <tr 
                        key={entry._id}
                        className={selectedEntries.has(entry._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry._id)}
                            onChange={() => handleSelectEntry(entry._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {entry.userId.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.userId.role}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.projectId ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {entry.projectId.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.projectId.code} - {entry.projectId.clientName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No project</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatDate(entry.clockIn)}
                            </div>
                            {entry.clockOut && (
                              <div className="text-sm text-gray-500">
                                to {new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDuration(entry.totalHours)}
                            </div>
                            {entry.overtimeHours > 0 && (
                              <div className="text-sm text-orange-600">
                                {formatDuration(entry.overtimeHours)} OT
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {entry.taskDescription || entry.notes || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const notes = prompt('Approval notes (optional):');
                                if (notes !== null) {
                                  handleSingleApproval(entry._id, 'approve', notes);
                                }
                              }}
                              className="text-green-600 hover:text-green-900 px-2 py-1 rounded border border-green-300 hover:bg-green-50"
                            >
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
                              className="text-red-600 hover:text-red-900 px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                            >
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

        {/* Help Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Approval Guidelines</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Review Carefully:</strong> Check project assignments, hours worked, and task descriptions for accuracy.</p>
            <p><strong>Bulk Actions:</strong> Select multiple entries and use bulk approve/reject for efficiency.</p>
            <p><strong>Communication:</strong> Add notes when approving or provide clear reasons when rejecting.</p>
            <p><strong>Overtime:</strong> Pay special attention to entries with overtime hours (marked in orange).</p>
            <p><strong>Projects:</strong> Ensure contractors are logging time to the correct projects and clients.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetApprovalInterface;