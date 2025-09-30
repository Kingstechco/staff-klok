'use client';

import { useState } from 'react';
import Link from 'next/link';
import RouteGuard from '@/components/RouteGuard';
import TimeDisplay from '@/components/ui/TimeDisplay';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'clocked-in' | 'clocked-out';
  weeklyHours: number;
  todayHours: number;
  lastClockIn?: string;
  lastClockOut?: string;
  avatar?: string;
}

const mockStaffData: StaffMember[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@company.com',
    role: 'Manager',
    status: 'clocked-in',
    weeklyHours: 32.5,
    todayHours: 6.2,
    lastClockIn: '2024-01-15T09:00:00Z'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'Staff',
    status: 'clocked-out',
    weeklyHours: 28.0,
    todayHours: 0,
    lastClockOut: '2024-01-14T17:30:00Z'
  },
  {
    id: '3',
    name: 'Mike Davis',
    email: 'mike@company.com',
    role: 'Staff',
    status: 'clocked-in',
    weeklyHours: 35.8,
    todayHours: 4.5,
    lastClockIn: '2024-01-15T10:30:00Z'
  }
];

export default function StaffDashboard() {
  const [staffData, setStaffData] = useState<StaffMember[]>(mockStaffData);
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const totalWeeklyHours = staffData.reduce((sum, staff) => sum + staff.weeklyHours, 0);
  const currentlyClockedIn = staffData.filter(staff => staff.status === 'clocked-in').length;
  const averageHours = staffData.length > 0 ? totalWeeklyHours / staffData.length : 0;

  const filteredStaff = staffData.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const downloadCSV = () => {
    const headers = ['Staff ID', 'Name', 'Email', 'Role', 'Status', 'Weekly Hours', 'Today Hours'];
    const csvContent = [
      headers.join(','),
      ...staffData.map(staff => [
        staff.id,
        staff.name,
        staff.email,
        staff.role,
        staff.status,
        staff.weeklyHours,
        staff.todayHours
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
                  Team Management
                </h1>
                <p className="mt-1 text-sm font-semibold text-gray-600">
                  Monitor and manage your team members
                </p>
              </div>
              
              {/* Actions and Time Display */}
              <div className="flex items-center gap-4">
                <div className="flex gap-3">
                  {/* Enhanced Export Button */}
                  <button
                    onClick={downloadCSV}
                    className="group relative inline-flex items-center px-5 py-2.5 border border-gray-300/60 rounded-xl text-sm font-bold text-gray-700 bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/10 hover:-translate-y-0.5"
                  >
                    <DownloadIcon className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                    Export CSV
                  </button>
                  
                  {/* Enhanced Add Staff Button */}
                  <Link
                    href="/staff/create"
                    className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <PlusIcon className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Add Staff
                  </Link>
                </div>
                
                <TimeDisplay collapsible />
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
                  <UsersIcon className="h-6 w-6 text-blue-600 group-hover:animate-pulse" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Staff</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-cyan-700 transition-all duration-300">{staffData.length}</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Active members</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>

            <div className="group relative bg-gradient-to-br from-white to-green-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-green-300 hover:shadow-2xl hover:shadow-green-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-green-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <ClockIcon className="h-6 w-6 text-green-600 group-hover:animate-bounce" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Currently Working</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-emerald-700 transition-all duration-300">{currentlyClockedIn}</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Clocked in now</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>

            <div className="group relative bg-gradient-to-br from-white to-purple-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-purple-300 hover:shadow-2xl hover:shadow-purple-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-purple-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <ChartBarIcon className="h-6 w-6 text-purple-600 group-hover:animate-pulse" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Total Weekly Hours</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-violet-700 transition-all duration-300">{totalWeeklyHours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">This week</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>

            <div className="group relative bg-gradient-to-br from-white to-amber-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center">
                <div className="inline-flex p-3 rounded-xl bg-amber-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                  <CalculatorIcon className="h-6 w-6 text-amber-600 group-hover:animate-bounce" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Average Hours</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent group-hover:from-amber-700 group-hover:to-orange-700 transition-all duration-300">{averageHours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Per person</p>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>
          </div>

          {/* Enhanced Filters and Search */}
          <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-6 mb-8 hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-300 overflow-hidden backdrop-blur-sm">
            {/* Enhanced Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 max-w-lg">
                <div className="relative group/search">
                  <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover/search:text-indigo-600 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Search staff members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-4 py-3 w-full border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-medium transition-all duration-300 hover:shadow-md"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover/search:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
                >
                  <option value="all">All Status</option>
                  <option value="clocked-in">Clocked In</option>
                  <option value="clocked-out">Clocked Out</option>
                </select>

                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50/50 font-bold text-gray-700 cursor-pointer hover:shadow-md transition-all duration-300"
                >
                  <option value="current">Current Week</option>
                  <option value="last">Last Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enhanced Staff Table */}
          <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-gray-500/15 transition-all duration-500 backdrop-blur-sm">
            {/* Enhanced Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Enhanced Header */}
            <div className="relative px-6 py-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-indigo-50/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center gap-3">
                  Staff Members
                  <div className="h-1 w-20 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
                </h3>
                <div className="text-sm font-semibold text-gray-600">
                  {filteredStaff.length} of {staffData.length} members
                </div>
              </div>
            </div>
            
            {filteredStaff.length > 0 ? (
              <div className="relative overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200/60">
                  <thead className="bg-gradient-to-r from-gray-50 to-indigo-50/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Staff Member
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Today
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Weekly Hours
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gradient-to-b from-white to-gray-50/30 divide-y divide-gray-200/60">
                    {filteredStaff.map((staff, index) => (
                      <tr 
                        key={staff.id} 
                        className="group/row relative hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300 hover:shadow-lg border-l-4 border-transparent hover:border-indigo-400"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover/row:shadow-xl group-hover/row:scale-110 transition-all duration-300 border-2 border-white/50">
                              {staff.name.charAt(0)}
                              {/* Online Status for Clocked In */}
                              {staff.status === 'clocked-in' && (
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900 group-hover/row:text-indigo-700 transition-colors duration-300">{staff.name}</div>
                              <div className="text-sm font-medium text-gray-500 group-hover/row:text-gray-600 transition-colors duration-300">{staff.email}</div>
                              <div className="inline-flex items-center mt-1">
                                <div className="text-xs font-semibold bg-gradient-to-r from-gray-100 to-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{staff.role}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold shadow-sm ${
                            staff.status === 'clocked-in'
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
                              : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              staff.status === 'clocked-in' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                            {staff.status === 'clocked-in' ? 'Working' : 'Off Duty'}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {staff.todayHours.toFixed(1)}h
                          </div>
                          <div className="text-xs font-semibold text-gray-500">Today</div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900 mb-2">{staff.weeklyHours.toFixed(1)}h</div>
                          <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-2 shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full shadow-sm transition-all duration-1000 ease-out relative overflow-hidden"
                              style={{ width: `${Math.min((staff.weeklyHours / 40) * 100, 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent animate-pulse" />
                            </div>
                          </div>
                          <div className="text-xs font-bold text-gray-500 mt-1 flex justify-between">
                            <span>{Math.round((staff.weeklyHours / 40) * 100)}% of target</span>
                            <span>40h goal</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-700">
                            {staff.status === 'clocked-in' && staff.lastClockIn
                              ? `Clocked in: ${new Date(staff.lastClockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                              : staff.lastClockOut
                              ? `Last out: ${new Date(staff.lastClockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                              : 'No activity'
                            }
                          </div>
                          <div className="text-xs font-semibold text-gray-500 mt-1">
                            {staff.status === 'clocked-in' ? 'Currently active' : 'Last session'}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button className="px-3 py-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 rounded-lg transition-all duration-300 hover:shadow-md">
                              View
                            </button>
                            <button className="px-3 py-2 text-sm font-bold text-gray-600 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 rounded-lg transition-all duration-300 hover:shadow-md">
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="relative text-center py-16 px-6">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 via-purple-50/20 to-pink-50/30 opacity-50" />
                <div className="relative">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg mb-4">
                    <UsersIcon className="h-12 w-12 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No staff members found</h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                      : 'Get started by adding your first staff member to begin managing your team.'
                    }
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <div className="mt-8">
                      <Link
                        href="/staff/create"
                        className="group relative inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/25"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <PlusIcon className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                        <span className="relative">Add Staff Member</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
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

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}