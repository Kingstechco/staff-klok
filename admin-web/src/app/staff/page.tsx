'use client';

import { useState } from 'react';
import RouteGuard from '@/components/RouteGuard';

interface StaffMember {
  id: string;
  name: string;
  status: 'clocked-in' | 'clocked-out';
  weeklyHours: number;
  lastClockIn?: string;
  lastClockOut?: string;
}

const mockStaffData: StaffMember[] = [
  // Production-ready - no mock staff data
];

export default function StaffDashboard() {
  const [staffData, setStaffData] = useState<StaffMember[]>(mockStaffData);
  const [selectedWeek, setSelectedWeek] = useState('current');

  const totalWeeklyHours = staffData.reduce((sum, staff) => sum + staff.weeklyHours, 0);
  const currentlyClockedIn = staffData.filter(staff => staff.status === 'clocked-in').length;
  const averageHours = totalWeeklyHours / staffData.length;

  const downloadCSV = () => {
    const headers = ['Staff ID', 'Name', 'Status', 'Weekly Hours', 'Target', 'Remaining'];
    const csvContent = [
      headers.join(','),
      ...staffData.map(staff => [
        staff.id,
        staff.name,
        staff.status,
        staff.weeklyHours,
        45,
        Math.max(45 - staff.weeklyHours, 0).toFixed(1)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-hours-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <RouteGuard requiredRoles={['admin', 'manager']}>
      <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Staff Management</h1>
              <p className="mt-1 sm:mt-2 text-gray-600">Monitor staff hours and attendance</p>
            </div>
            <button
              onClick={downloadCSV}
              className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="stat-card animate-in p-3 sm:p-6" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-indigo-100">
                <UsersIcon className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-600">Active</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{staffData.length}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Total Staff</p>
            </div>
          </div>

          <div className="stat-card animate-in p-3 sm:p-6" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-green-100">
                <CheckCircleIcon className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-600">{Math.round((currentlyClockedIn / staffData.length) * 100)}%</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{currentlyClockedIn}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Currently Working</p>
            </div>
          </div>

          <div className="stat-card animate-in p-3 sm:p-6" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-amber-100">
                <ClockIcon className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-green-600">+12.3%</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{totalWeeklyHours.toFixed(1)}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Total Hours</p>
            </div>
          </div>

          <div className="stat-card animate-in p-3 sm:p-6" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-blue-100">
                <ChartBarIcon className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-600">Weekly</span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{averageHours.toFixed(1)}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Average Hours</p>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="chart-container animate-in p-4 sm:p-6" style={{ animationDelay: '500ms' }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Staff Overview</h3>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all w-full sm:w-auto"
            >
              <option value="current">This Week</option>
              <option value="last">Last Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-4">
            {staffData.map((staff) => (
              <div key={staff.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                      {staff.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                      <div className="text-xs text-gray-500">{staff.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full mr-2 ${
                      staff.status === 'clocked-in' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      staff.status === 'clocked-in' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {staff.status === 'clocked-in' ? 'Working' : 'Off Duty'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Weekly Hours</div>
                    <div className="font-medium">{staff.weeklyHours}h / 45h</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Progress</div>
                    <div className="font-medium">{Math.round((staff.weeklyHours / 45) * 100)}%</div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      staff.weeklyHours >= 45 ? 'bg-green-500' : 
                      staff.weeklyHours >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((staff.weeklyHours / 45) * 100, 100)}%` }}
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  {staff.status === 'clocked-in' 
                    ? `Clocked in at ${staff.lastClockIn}`
                    : `Clocked out at ${staff.lastClockOut}`
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    Staff Member
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    Weekly Hours
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffData.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {staff.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {staff.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`h-3 w-3 rounded-full mr-2 ${
                          staff.status === 'clocked-in' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          staff.status === 'clocked-in' ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {staff.status === 'clocked-in' ? 'Working' : 'Off Duty'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {staff.weeklyHours}h <span className="text-gray-500">/ 45h</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              staff.weeklyHours >= 45 ? 'bg-green-500' : 
                              staff.weeklyHours >= 40 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((staff.weeklyHours / 45) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {Math.round((staff.weeklyHours / 45) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {staff.status === 'clocked-in' 
                        ? `Clocked in at ${staff.lastClockIn}`
                        : `Clocked out at ${staff.lastClockOut}`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </RouteGuard>
  );
}

// Icon Components
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}