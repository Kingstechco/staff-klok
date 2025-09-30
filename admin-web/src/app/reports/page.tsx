'use client';

import { useState, useMemo } from 'react';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';
import { useAuth } from '@/contexts/AuthContext';
import { ExportManager } from '@/utils/exportUtils';
import RouteGuard from '@/components/RouteGuard';
import TimeDisplay from '@/components/ui/TimeDisplay';

export default function ReportsPage() {
  const { getWeeklyStats, getAllEntriesInRange, timeEntries, exportData } = useTimeTracking();
  const { users, currentUser } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Calculate analytics for the selected date range
  const analyticsData = useMemo(() => {
    const entriesInRange = getAllEntriesInRange(dateRange.start, dateRange.end);
    
    const totalEntries = entriesInRange.length;
    const completedEntries = entriesInRange.filter(e => e.clockOut).length;
    const pendingApprovals = entriesInRange.filter(e => !e.isApproved && e.clockOut).length;
    const totalHours = entriesInRange.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const totalOvertime = entriesInRange.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);
    
    // Department breakdown
    const departmentStats = users.reduce((acc, user) => {
      if (user.department) {
        const userEntries = entriesInRange.filter(e => e.userId === user.id);
        const userHours = userEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
        
        if (!acc[user.department]) {
          acc[user.department] = { hours: 0, count: 0 };
        }
        acc[user.department].hours += userHours;
        acc[user.department].count += userEntries.length;
      }
      return acc;
    }, {} as Record<string, { hours: number; count: number }>);

    // Weekly trend data (last 8 weeks)
    const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const stats = getWeeklyStats(i);
      return {
        week: `Week ${8 - i}`,
        hours: stats.totalHours,
        overtime: stats.overtimeHours,
        staff: stats.totalStaff,
      };
    }).reverse();

    return {
      totalEntries,
      completedEntries,
      pendingApprovals,
      totalHours: Math.round(totalHours * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
      departmentStats,
      weeklyTrend,
      averageHoursPerDay: Math.round((totalHours / Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))) * 100) / 100,
    };
  }, [dateRange, getAllEntriesInRange, users, getWeeklyStats]);

  const currentWeekStats = getWeeklyStats(selectedWeek);
  const previousWeekStats = getWeeklyStats(selectedWeek + 1);

  const handleExport = (format: 'csv' | 'excel', includePayroll = false) => {
    const entriesInRange = getAllEntriesInRange(dateRange.start, dateRange.end);
    const options = {
      format,
      dateRange,
      includePayroll,
      includeSummary: true,
      groupBy: 'employee' as const,
    };

    if (format === 'csv') {
      ExportManager.exportToCSV(entriesInRange, users, options);
    } else {
      ExportManager.exportToExcel(entriesInRange, users, options);
    }
  };

  const handleBackup = () => {
    ExportManager.backupData(timeEntries, users);
  };

  return (
    <RouteGuard requiredRoles={['admin', 'manager']}>
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
                  Reports & Analytics
                </h1>
                <p className="mt-1 text-sm font-semibold text-gray-600">
                  Comprehensive time tracking insights and data export
                </p>
              </div>
              
              {/* Actions and Time Display */}
              <div className="flex items-center gap-4">
                <div className="flex gap-3">
                  {/* Enhanced Export Buttons */}
                  <button
                    onClick={() => handleExport('csv', false)}
                    className="group relative inline-flex items-center px-5 py-2.5 border border-gray-300/60 rounded-xl text-sm font-bold text-gray-700 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-0.5"
                  >
                    <DownloadIcon className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('excel', false)}
                    className="group relative inline-flex items-center px-5 py-2.5 border border-gray-300/60 rounded-xl text-sm font-bold text-gray-700 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-0.5"
                  >
                    <ExcelIcon className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                    Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv', true)}
                    className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <DollarIcon className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Payroll Export
                  </button>
                </div>
                
                <TimeDisplay />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8">

          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="group relative bg-gradient-to-br from-white to-blue-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-blue-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <ClockIcon className="h-6 w-6 text-blue-600 group-hover:animate-pulse" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Hours</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-cyan-700 transition-all duration-300">{analyticsData.totalHours}h</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">This period</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>

            <div className="group relative bg-gradient-to-br from-white to-amber-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-amber-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <TrendingUpIcon className="h-6 w-6 text-amber-600 group-hover:animate-bounce" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Overtime Hours</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:from-amber-700 group-hover:to-orange-700 transition-all duration-300">{analyticsData.totalOvertime}h</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Extra time</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>

            <div className="group relative bg-gradient-to-br from-white to-green-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-green-300 hover:shadow-2xl hover:shadow-green-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-green-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 group-hover:animate-pulse" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Completed Entries</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-emerald-700 transition-all duration-300">{analyticsData.completedEntries}</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Finalized</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>

            <div className="group relative bg-gradient-to-br from-white to-red-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-red-300 hover:shadow-2xl hover:shadow-red-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/10 via-pink-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-red-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <AlertCircleIcon className="h-6 w-6 text-red-600 group-hover:animate-bounce" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Pending Approvals</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent group-hover:from-red-700 group-hover:to-pink-700 transition-all duration-300">{analyticsData.pendingApprovals}</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Need review</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>
          </div>

          {/* Enhanced Date Range Selector */}
          <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-6 mb-8 hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300 overflow-hidden backdrop-blur-sm">
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
              Report Period
              <div className="h-1 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
            </h3>
            
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Quick Select</label>
                <select
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    if (days > 0) {
                      setDateRange({
                        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                        end: new Date(),
                      });
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
                >
                  <option value="">Custom Range</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 3 Months</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleBackup}
                  className="group relative w-full inline-flex items-center justify-center px-5 py-3 border border-gray-300/60 rounded-xl text-sm font-bold text-gray-700 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-0.5"
                >
                  <BackupIcon className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                  Backup Data
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Enhanced Weekly Trend */}
            <div className="group relative bg-gradient-to-br from-white to-indigo-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Hours Trend</h3>
              <div className="space-y-3">
                {analyticsData.weeklyTrend.map((week, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-16">{week.week}</span>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((week.hours / Math.max(...analyticsData.weeklyTrend.map(w => w.hours), 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{week.hours}h</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Department Breakdown */}
            <div className="group relative bg-gradient-to-br from-white to-purple-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 via-transparent to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-4">Department Hours</h3>
              <div className="space-y-4">
                {Object.entries(analyticsData.departmentStats).map(([dept, stats]) => (
                  <div key={dept} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{dept}</span>
                      <span className="text-sm text-gray-600">{stats.hours.toFixed(1)}h</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(stats.hours / Math.max(...Object.values(analyticsData.departmentStats).map(s => s.hours), 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{stats.count} entries</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Weekly Comparison */}
          <div className="group relative bg-gradient-to-br from-white to-indigo-50/30 border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Floating Decorative Elements */}
            <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
              <div className="flex space-x-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '800ms' }} />
              </div>
            </div>

            <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Weekly Comparison
                <div className="h-1 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
              </h3>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <option value={0}>This Week</option>
                <option value={1}>Last Week</option>
                <option value={2}>2 Weeks Ago</option>
                <option value={3}>3 Weeks Ago</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Period Card */}
              <div className="group/card relative bg-gradient-to-br from-blue-50 to-cyan-50/50 border border-blue-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="relative flex items-center mb-3">
                  <div className="inline-flex p-2 rounded-lg bg-blue-100 shadow-md group-hover/card:shadow-lg group-hover/card:scale-110 transition-all duration-300">
                    <CalendarIcon className="h-4 w-4 text-blue-600 group-hover/card:animate-pulse" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-bold text-blue-800 uppercase tracking-wider">Current Period</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover/card:from-blue-700 group-hover/card:to-cyan-700 transition-all duration-300">{currentWeekStats.totalHours}h</div>
                  <div className="text-xs text-blue-600 font-semibold mt-1">{currentWeekStats.week}</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
              </div>
              
              {/* Previous Period Card */}
              <div className="group/card relative bg-gradient-to-br from-gray-50 to-slate-50/50 border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-500/15 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 via-slate-500/10 to-gray-500/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="relative flex items-center mb-3">
                  <div className="inline-flex p-2 rounded-lg bg-gray-100 shadow-md group-hover/card:shadow-lg group-hover/card:scale-110 transition-all duration-300">
                    <HistoryIcon className="h-4 w-4 text-gray-600 group-hover/card:animate-pulse" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">Previous Period</div>
                  </div>
                </div>
                <div className="relative">
                  <div className="text-3xl font-black bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent group-hover/card:from-gray-700 group-hover/card:to-slate-700 transition-all duration-300">{previousWeekStats.totalHours}h</div>
                  <div className="text-xs text-gray-600 font-semibold mt-1">{previousWeekStats.week}</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-500 to-slate-500 transform scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
              </div>
              
              {/* Change Card */}
              <div className={`group/card relative border border-gray-200/60 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                currentWeekStats.totalHours >= previousWeekStats.totalHours 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 hover:shadow-green-500/15' 
                  : 'bg-gradient-to-br from-red-50 to-rose-50/50 hover:shadow-red-500/15'
              }`}>
                <div className={`absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 blur-sm ${
                  currentWeekStats.totalHours >= previousWeekStats.totalHours
                    ? 'bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10'
                    : 'bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/10'
                }`} />
                <div className="relative flex items-center mb-3">
                  <div className={`inline-flex p-2 rounded-lg shadow-md group-hover/card:shadow-lg group-hover/card:scale-110 transition-all duration-300 ${
                    currentWeekStats.totalHours >= previousWeekStats.totalHours ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {currentWeekStats.totalHours >= previousWeekStats.totalHours ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-600 group-hover/card:animate-bounce" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-600 group-hover/card:animate-bounce" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-bold uppercase tracking-wider ${
                      currentWeekStats.totalHours >= previousWeekStats.totalHours ? 'text-green-800' : 'text-red-800'
                    }`}>Change</div>
                  </div>
                </div>
                <div className="relative">
                  <div className={`text-3xl font-black transition-all duration-300 ${
                    currentWeekStats.totalHours >= previousWeekStats.totalHours 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover/card:from-green-700 group-hover/card:to-emerald-700'
                      : 'bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent group-hover/card:from-red-700 group-hover/card:to-rose-700'
                  }`}>
                    {currentWeekStats.totalHours >= previousWeekStats.totalHours ? '+' : ''}
                    {(currentWeekStats.totalHours - previousWeekStats.totalHours).toFixed(1)}h
                  </div>
                  <div className={`text-xs font-semibold mt-1 ${
                    currentWeekStats.totalHours >= previousWeekStats.totalHours ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {previousWeekStats.totalHours > 0 
                      ? `${Math.abs(Math.round(((currentWeekStats.totalHours - previousWeekStats.totalHours) / previousWeekStats.totalHours) * 100))}%`
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500 rounded-b-2xl ${
                  currentWeekStats.totalHours >= previousWeekStats.totalHours
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-red-500 to-rose-500'
                }`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

// Icon Components
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ExcelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BackupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}