'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedule, Shift, ShiftTemplate } from '@/contexts/ScheduleContext';
import TimeDisplay from '@/components/ui/TimeDisplay';

export default function SchedulePage() {
  const { currentUser } = useAuth();
  const { 
    shifts, 
    templates,
    getWeekSchedule, 
    getScheduleStats,
    updateShift,
    createShift,
    deleteShift,
    generateScheduleFromTemplate
  } = useSchedule();

  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'templates'>('list');
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ day: Date; hour: number } | null>(null);
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

  // Generate time slots from 6 AM to 11 PM
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push({
        hour,
        display: hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : hour === 0 ? '12 AM' : `${hour} AM`
      });
    }
    return slots;
  }, []);

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

  const timeToPosition = (timeStr: string): number => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const totalMinutes = hour * 60 + minute;
    const startMinutes = 6 * 60; // 6 AM
    return ((totalMinutes - startMinutes) / 60) * 60; // 60px per hour
  };

  const calculateShiftHeight = (shift: Shift): number => {
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = shift.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;
    return (durationMinutes / 60) * 60; // 60px per hour
  };

  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDay: Date, targetHour: number) => {
    e.preventDefault();
    if (!draggedShift) return;

    const newDate = new Date(targetDay);
    const newStartTime = `${targetHour.toString().padStart(2, '0')}:00`;
    
    // Calculate duration to maintain shift length
    const [origStartHour, origStartMinute] = draggedShift.startTime.split(':').map(Number);
    const [origEndHour, origEndMinute] = draggedShift.endTime.split(':').map(Number);
    const durationMinutes = (origEndHour * 60 + origEndMinute) - (origStartHour * 60 + origStartMinute);
    
    const endTotalMinutes = (targetHour * 60) + durationMinutes;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    const newEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    updateShift(draggedShift.id, {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime
    });

    setDraggedShift(null);
  };

  const handleTimeSlotClick = (day: Date, hour: number) => {
    setSelectedTimeSlot({ day, hour });
    setShowCreateModal(true);
  };

  const getShiftColor = (shift: Shift) => {
    const colors = {
      scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
      confirmed: 'bg-green-100 border-green-300 text-green-800',
      completed: 'bg-gray-100 border-gray-300 text-gray-800',
      'no-show': 'bg-red-100 border-red-300 text-red-800',
      cancelled: 'bg-yellow-100 border-yellow-300 text-yellow-800'
    };
    return colors[shift.status] || colors.scheduled;
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
                Schedule Management
              </h1>
              <p className="mt-1 text-sm font-semibold text-gray-600">
                Manage staff schedules and shift templates
              </p>
            </div>
            
            {/* Professional Time Display */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                {/* Enhanced View Mode Toggle */}
                <div className="flex rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 p-1 shadow-inner">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                      viewMode === 'list' 
                        ? 'bg-gradient-to-r from-white to-gray-50 text-indigo-700 shadow-lg transform scale-105' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ListIcon className="inline h-4 w-4 mr-2" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                      viewMode === 'calendar' 
                        ? 'bg-gradient-to-r from-white to-gray-50 text-indigo-700 shadow-lg transform scale-105' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CalendarIcon className="inline h-4 w-4 mr-2" />
                    Calendar
                  </button>
                  <button
                    onClick={() => setViewMode('templates')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                      viewMode === 'templates' 
                        ? 'bg-gradient-to-r from-white to-gray-50 text-indigo-700 shadow-lg transform scale-105' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <TemplateIcon className="inline h-4 w-4 mr-2" />
                    Templates
                  </button>
                </div>
                
                {/* Enhanced Add Button */}
                <button
                  onClick={() => viewMode === 'templates' ? setShowTemplateModal(true) : setShowCreateModal(true)}
                  className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <PlusIcon className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  {viewMode === 'templates' ? 'New Template' : 'Add Shift'}
                </button>
              </div>
              
              <TimeDisplay collapsible />
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigation - Show for list and calendar views */}
      {(viewMode === 'list' || viewMode === 'calendar') && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2.5 text-gray-400 hover:text-indigo-600 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md group/btn"
              >
                <ChevronLeftIcon className="w-5 h-5 group-hover/btn:-translate-x-0.5 transition-transform duration-300" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                Week of {selectedWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2.5 text-gray-400 hover:text-indigo-600 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:shadow-md group/btn"
              >
                <ChevronRightIcon className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform duration-300" />
              </button>
              <button
                onClick={() => setSelectedWeek(new Date())}
                className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Enhanced Week View & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="group relative lg:col-span-2 bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-500 overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-4 right-4 opacity-20">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" />
                </div>

                {/* Enhanced Weekly Calendar Grid */}
                <div className="relative grid grid-cols-1 sm:grid-cols-7 gap-3">
                  {weekDays.map((day, index) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayShifts = getShiftsForDay(day);
                    
                    return (
                      <div 
                        key={index} 
                        className={`relative border rounded-xl min-h-[140px] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden ${
                          isToday 
                            ? 'border-indigo-300 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 shadow-md shadow-indigo-500/10' 
                            : 'border-gray-200/60 bg-gradient-to-br from-white to-gray-50/30 hover:border-indigo-200'
                        }`}
                      >
                        {/* Day Header */}
                        <div className={`p-3 border-b ${
                          isToday 
                            ? 'border-indigo-200 bg-gradient-to-r from-indigo-100 to-purple-100' 
                            : 'border-gray-200/60 bg-gradient-to-r from-gray-50 to-gray-100/50'
                        }`}>
                          <div className={`text-xs font-bold uppercase tracking-wide ${
                            isToday ? 'text-indigo-700' : 'text-gray-700'
                          }`}>
                            {formatDate(day)}
                          </div>
                          {isToday && (
                            <div className="text-xs font-semibold text-indigo-600 mt-0.5">Today</div>
                          )}
                        </div>
                        
                        {/* Shifts Container */}
                        <div className="p-2 space-y-2">
                          {dayShifts.length > 0 ? (
                            dayShifts.map((shift) => (
                              <div
                                key={shift.id}
                                onClick={() => setEditingShift(shift)}
                                className="group relative p-3 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md overflow-hidden"
                                style={{ 
                                  background: `linear-gradient(135deg, ${
                                    shift.status === 'confirmed' ? '#dcfce7' : '#e0f2fe'
                                  } 0%, ${
                                    shift.status === 'confirmed' ? '#bbf7d0' : '#bae6fd'
                                  } 100%)`
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                <div className="relative">
                                  <div className="font-bold text-xs text-gray-900 mb-1">{shift.userName}</div>
                                  <div className="flex items-center gap-1 text-xs text-gray-700">
                                    <ClockIcon className="h-3 w-3" />
                                    {shift.startTime}-{shift.endTime}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">{shift.department}</div>
                                </div>
                                
                                {/* Status Badge */}
                                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(shift.status)}`}>
                                  {shift.status}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-400 text-center py-4">
                              No shifts
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enhanced Week Stats */}
              <div className="group relative bg-gradient-to-br from-white via-white to-indigo-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-500 overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute top-4 right-4 opacity-20">
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" />
                    <div className="h-1 w-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '500ms' }} />
                  </div>
                </div>
                
                <h3 className="relative text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                  Week Statistics
                  <div className="h-1 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
                </h3>
                
                <div className="relative space-y-5">
                  {/* Stats Items */}
                  <div className="group/stat flex justify-between items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                    <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500" />
                      Total Shifts
                    </span>
                    <span className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {weekStats.totalShifts}
                    </span>
                  </div>
                  
                  <div className="group/stat flex justify-between items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 transition-all duration-300">
                    <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
                      Total Hours
                    </span>
                    <span className="text-lg font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {weekStats.totalHours}h
                    </span>
                  </div>
                  
                  <div className="group/stat flex justify-between items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 transition-all duration-300">
                    <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500" />
                      Staff Utilization
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        {weekStats.staffUtilization}%
                      </span>
                      {/* Progress Bar */}
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${weekStats.staffUtilization}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Department Breakdown */}
                  <div className="pt-5 border-t border-gray-200/60">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">By Department</h4>
                    <div className="space-y-2">
                      {Object.entries(weekStats.departmentBreakdown).map(([dept, count], index) => (
                        <div 
                          key={dept} 
                          className="flex justify-between items-center p-2 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50/30 transition-all duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <span className="text-xs font-semibold text-gray-600">{dept}</span>
                          <span className="text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {count} shifts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="group relative bg-gradient-to-br from-white via-white to-purple-50/30 border border-gray-200/60 rounded-2xl p-6 mb-8 hover:shadow-2xl hover:shadow-purple-500/15 transition-all duration-500 overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="absolute top-4 right-4 opacity-20">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" />
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-400 to-indigo-500 animate-pulse" style={{ animationDelay: '500ms' }} />
                </div>
              </div>
              
              <h3 className="relative text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                Quick Actions
                <div className="h-1 w-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" />
              </h3>
              
              <div className="relative">
                {templates.filter(t => t.isActive).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {templates.filter(t => t.isActive).map((template, index) => (
                      <button
                        key={template.id}
                        onClick={() => generateScheduleFromTemplate(template.id, selectedWeek)}
                        className="group/btn relative p-4 border border-gray-200/60 rounded-xl hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 text-left transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/20 overflow-hidden"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 to-pink-50/30 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative">
                          <div className="font-bold text-sm text-gray-900 group-hover/btn:text-purple-700 transition-colors duration-300 mb-2">
                            {template.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                            <BriefcaseIcon className="h-3 w-3" />
                            <span>{template.department}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <ClockIcon className="h-3 w-3" />
                            <span>{template.startTime}-{template.endTime}</span>
                          </div>
                        </div>
                        
                        <div className="absolute top-2 right-2 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                          <ArrowRightIcon className="h-4 w-4 text-purple-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TemplateIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No active templates available</p>
                    <p className="text-xs text-gray-400 mt-1">Create templates to quickly generate schedules</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Calendar Header - Days of Week */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="p-4 text-sm font-medium text-gray-500 border-r border-gray-200">
                Time
              </div>
              {weekDays.map((day, index) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={index}
                    className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                      isToday ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Body - Time Grid */}
            <div className="grid grid-cols-8">
              {/* Time Column */}
              <div className="border-r border-gray-200 bg-gray-50">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="h-16 border-b border-gray-200 px-4 py-2 text-xs text-gray-500 font-medium"
                  >
                    {slot.display}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const dayShifts = getShiftsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={dayIndex}
                    className={`relative border-r border-gray-200 last:border-r-0 ${
                      isToday ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Time Slots */}
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.hour}
                        className="h-16 border-b border-gray-200 cursor-pointer hover:bg-gray-50 relative"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day, slot.hour)}
                        onClick={() => handleTimeSlotClick(day, slot.hour)}
                      >
                        <div className="absolute top-0 left-0 right-0 border-t border-gray-100"></div>
                      </div>
                    ))}

                    {/* Shifts positioned absolutely */}
                    {dayShifts.map((shift) => {
                      const top = timeToPosition(shift.startTime);
                      const height = calculateShiftHeight(shift);
                      
                      return (
                        <div
                          key={shift.id}
                          className={`absolute left-1 right-1 rounded-md border-l-4 cursor-move shadow-sm hover:shadow-md transition-shadow ${getShiftColor(shift)}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            zIndex: 10
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shift)}
                          onClick={() => setEditingShift(shift)}
                        >
                          <div className="p-2 text-xs">
                            <div className="font-semibold truncate">{shift.userName}</div>
                            <div className="text-xs opacity-75">
                              {shift.startTime} - {shift.endTime}
                            </div>
                            <div className="text-xs opacity-75 truncate">{shift.department}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Templates View */}
        {viewMode === 'templates' && (
          <div className="group relative bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Shift Templates
                <div className="h-1 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template, index) => (
                <div 
                  key={template.id} 
                  className="group relative border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-indigo-50/20 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex justify-between items-start mb-3">
                    <h4 className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">{template.name}</h4>
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

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Shift</h3>
            {selectedTimeSlot && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedTimeSlot.day.toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    defaultValue={`${selectedTimeSlot.hour.toString().padStart(2, '0')}:00`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    defaultValue={`${(selectedTimeSlot.hour + 8).toString().padStart(2, '0')}:00`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Select employee...</option>
                    <option value="john-doe">John Doe</option>
                    <option value="jane-smith">Jane Smith</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Select department...</option>
                    <option value="front-desk">Front Desk</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedTimeSlot(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedTimeSlot(null);
                }}
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}