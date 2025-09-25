'use client';

import { useState, useMemo } from 'react';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';
import { useAuth } from '@/contexts/AuthContext';
import { ExportManager } from '@/utils/exportUtils';
import RouteGuard from '@/components/RouteGuard';

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
      <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="mt-1 sm:mt-2 text-gray-600">Comprehensive time tracking insights and data export</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                onClick={() => handleExport('csv', false)}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport('excel', false)}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <ExcelIcon className="w-4 h-4 mr-2" />
                Excel
              </button>
              <button
                onClick={() => handleExport('csv', true)}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <DollarIcon className="w-4 h-4 mr-2" />
                Payroll CSV
              </button>
              <button
                onClick={() => handleExport('excel', true)}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <DollarIcon className="w-4 h-4 mr-2" />
                Payroll Excel
              </button>
              <button
                onClick={handleBackup}
                className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <BackupIcon className="w-4 h-4 mr-2" />
                Backup
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 sm:mb-8 chart-container p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Period</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Custom Range</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 3 Months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="stat-card p-3 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-blue-100">
                <ClockIcon className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-600">Total</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{analyticsData.totalHours}h</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Total Hours</p>
            </div>
          </div>

          <div className="stat-card p-3 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-amber-100">
                <TrendingUpIcon className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-amber-600">Overtime</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{analyticsData.totalOvertime}h</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Overtime Hours</p>
            </div>
          </div>

          <div className="stat-card p-3 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-green-100">
                <CheckCircleIcon className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-600">Completed</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{analyticsData.completedEntries}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Time Entries</p>
            </div>
          </div>

          <div className="stat-card p-3 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-red-100">
                <AlertCircleIcon className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-red-600">Pending</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{analyticsData.pendingApprovals}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Need Approval</p>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Weekly Trend */}
          <div className="chart-container p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Hours Trend</h3>
            <div className="space-y-3">
              {analyticsData.weeklyTrend.map((week, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-16">{week.week}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((week.hours / Math.max(...analyticsData.weeklyTrend.map(w => w.hours), 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{week.hours}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="chart-container p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Hours</h3>
            <div className="space-y-4">
              {Object.entries(analyticsData.departmentStats).map(([dept, stats]) => (
                <div key={dept} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{dept}</span>
                    <span className="text-sm text-gray-600">{stats.hours.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                      style={{ width: `${(stats.hours / Math.max(...Object.values(analyticsData.departmentStats).map(s => s.hours), 1)) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{stats.count} entries</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current Week Comparison */}
        <div className="chart-container p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Comparison</h3>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-auto"
            >
              <option value={0}>This Week</option>
              <option value={1}>Last Week</option>
              <option value={2}>2 Weeks Ago</option>
              <option value={3}>3 Weeks Ago</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Current Period</div>
              <div className="text-2xl font-bold text-gray-900">{currentWeekStats.totalHours}h</div>
              <div className="text-xs text-gray-500">{currentWeekStats.week}</div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Previous Period</div>
              <div className="text-2xl font-bold text-gray-900">{previousWeekStats.totalHours}h</div>
              <div className="text-xs text-gray-500">{previousWeekStats.week}</div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Change</div>
              <div className={`text-2xl font-bold ${
                currentWeekStats.totalHours >= previousWeekStats.totalHours ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentWeekStats.totalHours >= previousWeekStats.totalHours ? '+' : ''}
                {(currentWeekStats.totalHours - previousWeekStats.totalHours).toFixed(1)}h
              </div>
              <div className="text-xs text-gray-500">
                {previousWeekStats.totalHours > 0 
                  ? `${Math.abs(Math.round(((currentWeekStats.totalHours - previousWeekStats.totalHours) / previousWeekStats.totalHours) * 100))}%`
                  : 'N/A'
                }
              </div>
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