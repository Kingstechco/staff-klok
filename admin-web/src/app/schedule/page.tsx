'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedule, Shift, ShiftTemplate } from '@/contexts/ScheduleContext';

export default function SchedulePage() {
  const { currentUser } = useAuth();
  const { 
    shifts, 
    templates, 
    getWeekSchedule, 
    getScheduleStats, 
    createShift, 
    updateShift, 
    deleteShift,
    createTemplate,
    generateScheduleFromTemplate,
    checkScheduleConflicts 
  } = useSchedule();

  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [viewMode, setViewMode] = useState<'week' | 'templates'>('week');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Check permissions
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to manage schedules.</p>
        </div>
      </div>
    );
  }

  const weekSchedule = getWeekSchedule(selectedWeek);
  const weekStats = getScheduleStats(selectedWeek);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(selectedWeek);
      day.setDate(selectedWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [selectedWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const getShiftsForDay = (date: Date): Shift[] => {
    const dateStr = date.toDateString();
    return weekSchedule.filter(shift => shift.date.toDateString() === dateStr);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: Shift['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'no-show': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Schedule Management</h1>
              <p className="mt-1 sm:mt-2 text-gray-600">Manage staff schedules and shift templates</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Weekly View
                </button>
                <button
                  onClick={() => setViewMode('templates')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'templates' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Templates
                </button>
              </div>
              
              <button
                onClick={() => viewMode === 'week' ? setShowCreateModal(true) : setShowTemplateModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {viewMode === 'week' ? 'Add Shift' : 'New Template'}
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'week' ? (
          <>
            {/* Week Navigation & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
              <div className="lg:col-span-2 chart-container p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Week of {selectedWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedWeek(new Date())}
                      className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => navigateWeek('next')}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Weekly Calendar Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-1">
                  {weekDays.map((day, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg sm:rounded-none sm:border-r-0 sm:last:border-r min-h-32">
                      <div className="p-2 border-b border-gray-200 bg-gray-50">
                        <div className="text-xs font-medium text-gray-900">{formatDate(day)}</div>
                      </div>
                      <div className="p-1 space-y-1">
                        {getShiftsForDay(day).map((shift) => (
                          <div
                            key={shift.id}
                            onClick={() => setEditingShift(shift)}
                            className="p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: '#e0f2fe' }}
                          >
                            <div className="font-medium text-gray-900">{shift.userName}</div>
                            <div className="text-gray-600">{shift.startTime}-{shift.endTime}</div>
                            <div className="text-gray-500">{shift.department}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Week Stats */}
              <div className="chart-container p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Week Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Shifts</span>
                    <span className="font-semibold text-gray-900">{weekStats.totalShifts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Hours</span>
                    <span className="font-semibold text-gray-900">{weekStats.totalHours}h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Staff Utilization</span>
                    <span className="font-semibold text-gray-900">{weekStats.staffUtilization}%</span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">By Department</h4>
                    <div className="space-y-2">
                      {Object.entries(weekStats.departmentBreakdown).map(([dept, count]) => (
                        <div key={dept} className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">{dept}</span>
                          <span className="text-xs font-medium text-gray-900">{count} shifts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate from Template */}
            <div className="chart-container p-4 sm:p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.filter(t => t.isActive).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => generateScheduleFromTemplate(template.id, selectedWeek)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.department}</div>
                    <div className="text-xs text-gray-500">{template.startTime}-{template.endTime}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Templates View */
          <div className="chart-container p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Shift Templates</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div><span className="font-medium">Department:</span> {template.department}</div>
                    <div><span className="font-medium">Position:</span> {template.position}</div>
                    <div><span className="font-medium">Time:</span> {template.startTime} - {template.endTime}</div>
                    <div><span className="font-medium">Staff Required:</span> {template.requiredStaff}</div>
                    <div><span className="font-medium">Days:</span> {
                      template.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
                    }</div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-3">{template.description}</p>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <button className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700">
                      Edit
                    </button>
                    <button className="px-3 py-1 text-sm text-red-600 hover:text-red-700">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals would go here - simplified for now */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Shift</h3>
            <p className="text-gray-600 mb-4">Shift creation form would go here</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}