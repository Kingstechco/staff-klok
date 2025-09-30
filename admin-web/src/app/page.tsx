'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TimeDisplay from '@/components/ui/TimeDisplay';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  roles?: string[];
}

interface DashboardStats {
  today: {
    clockedIn: number;
    totalHours: number;
    scheduledShifts: number;
    entries: any[];
  };
  weekly: {
    totalHours: number;
    overtime: number;
    averageDaily: number;
  };
  general: {
    activeEmployees: number;
    pendingApprovals: number;
  };
  todaySchedule: any[];
}

interface UserDashboard {
  currentEntry: any;
  today: {
    hours: number;
    entries: number;
  };
  weekly: {
    hours: number;
    overtime: number;
    entries: number;
  };
  upcomingShifts: any[];
}

export default function Home() {
  const { currentUser, hasPermission } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userDashboard, setUserDashboard] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (currentUser?.role === 'staff') {
        const response = await fetch('/api/dashboard/user', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserDashboard(data);
        } else {
          setUserDashboard({
            currentEntry: null,
            today: { hours: 0, entries: 0 },
            weekly: { hours: 0, overtime: 0, entries: 0 },
            upcomingShifts: []
          });
        }
      } else if (hasPermission('analytics_access') || currentUser?.role === 'admin' || currentUser?.role === 'manager') {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setDashboardStats(data);
        } else {
          setDashboardStats({
            today: { clockedIn: 0, totalHours: 0, scheduledShifts: 0, entries: [] },
            weekly: { totalHours: 0, overtime: 0, averageDaily: 0 },
            general: { activeEmployees: 0, pendingApprovals: 0 },
            todaySchedule: []
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (currentUser?.role === 'staff') {
        setUserDashboard({
          currentEntry: null,
          today: { hours: 0, entries: 0 },
          weekly: { hours: 0, overtime: 0, entries: 0 },
          upcomingShifts: []
        });
      } else {
        setDashboardStats({
          today: { clockedIn: 0, totalHours: 0, scheduledShifts: 0, entries: [] },
          weekly: { totalHours: 0, overtime: 0, averageDaily: 0 },
          general: { activeEmployees: 0, pendingApprovals: 0 },
          todaySchedule: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        title: 'Clock In/Out',
        description: 'Track your time effortlessly',
        href: '/clockin',
        icon: ClockIcon,
        color: 'bg-gradient-to-r from-green-500 to-emerald-600',
      }
    ];

    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      baseActions.push(
        {
          title: 'Team Overview',
          description: 'Manage your team members',
          href: '/staff',
          icon: UsersIcon,
          color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          roles: ['admin', 'manager']
        },
        {
          title: 'Reports & Analytics',
          description: 'View insights and metrics',
          href: '/reports',
          icon: ChartBarIcon,
          color: 'bg-gradient-to-r from-purple-500 to-violet-600',
          roles: ['admin', 'manager']
        }
      );
    }

    return baseActions;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be authenticated to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const quickActions = getQuickActions();

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Header with User Context */}
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
            {/* User Welcome Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                {/* Enhanced User Avatar */}
                <div className="relative">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/50">
                    {currentUser.name?.charAt(0) || currentUser.role?.charAt(0) || 'U'}
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                </div>
                
                {/* Welcome Text */}
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-700 bg-clip-text text-transparent">
                    {greeting}, {currentUser.name?.split(' ')[0] || currentUser.role}!
                  </h1>
                  <p className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-indigo-500" />
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              {/* Role Badge */}
              <div className="inline-flex items-center px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200/60 shadow-sm">
                <RoleIcon className="h-4 w-4 text-indigo-600 mr-2" />
                <span className="text-sm font-bold text-indigo-800 capitalize">{currentUser.role}</span>
              </div>
            </div>

            {/* Professional Time Display with Format Toggle */}
            <div className="lg:text-right">
              <TimeDisplay collapsible />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Quick Actions with Better Visual Hierarchy */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Quick Actions</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Access key features instantly</p>
            </div>
            <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-indigo-400/50 to-transparent ml-8" />
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => (
              <Link
                key={action.title}
                href={action.href}
                className="relative group bg-gradient-to-br from-white via-white to-gray-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-2 overflow-hidden backdrop-blur-sm"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Enhanced Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Floating Accent */}
                <div className="absolute top-3 right-3 opacity-20">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: `${index * 200}ms` }} />
                </div>
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex p-3 rounded-xl ${action.color} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/30`}>
                      <action.icon className="h-6 w-6 group-hover:animate-bounce" />
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-700 transition-colors duration-300 mb-2">{action.title}</h3>
                    <p className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors duration-300 leading-relaxed">{action.description}</p>
                  </div>
                </div>
                
                {/* Enhanced Shimmer Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500 rounded-2xl" />
                </div>
                
                {/* Bottom Accent Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="text-gray-600">Loading dashboard...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Staff Dashboard */}
            {currentUser.role === 'staff' && userDashboard && (
              <StaffDashboard userDashboard={userDashboard} />
            )}

            {/* Admin/Manager Dashboard */}
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && dashboardStats && (
              <AdminManagerDashboard dashboardStats={dashboardStats} />
            )}
          </>
        )}

        {/* Enhanced Tips Section */}
        <div className="mt-8 relative bg-gradient-to-br from-indigo-50 via-indigo-50/80 to-purple-50/60 border border-indigo-200/60 rounded-2xl p-6 overflow-hidden group hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Floating Decorative Elements */}
          <div className="absolute top-3 right-3 opacity-30">
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '500ms' }} />
              <div className="h-1 w-1 rounded-full bg-gradient-to-r from-pink-400 to-indigo-500 animate-pulse" style={{ animationDelay: '1000ms' }} />
            </div>
          </div>
          
          <div className="relative flex">
            <div className="flex-shrink-0">
              <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <LightBulbIcon className="h-5 w-5 text-white group-hover:animate-pulse" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                Pro Tip
                <div className="h-1 w-8 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
              </h3>
              <div className="mt-3 text-sm text-indigo-700 font-medium leading-relaxed">
                <p className="relative">
                  {currentUser.role === 'staff' 
                    ? "Use your unique PIN to clock in/out securely. Make sure you're connected to the correct network."
                    : "Staff members can clock in/out using their unique PIN. Monitor real-time activity from this dashboard."
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-b-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </div>
  );
}

// Staff Dashboard Component
function StaffDashboard({ userDashboard }: { userDashboard: UserDashboard }) {
  const stats = [
    {
      label: 'Today\'s Hours',
      value: userDashboard.today.hours.toFixed(1),
      subtext: `${userDashboard.today.entries} entries`,
      icon: ClockIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Weekly Hours',
      value: userDashboard.weekly.hours.toFixed(1),
      subtext: `${userDashboard.weekly.entries} total entries`,
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Current Status',
      value: userDashboard.currentEntry ? 'Clocked In' : 'Clocked Out',
      subtext: userDashboard.currentEntry ? 'Active session' : 'Ready to clock in',
      icon: CheckCircleIcon,
      color: userDashboard.currentEntry ? 'text-green-600' : 'text-gray-600',
      bgColor: userDashboard.currentEntry ? 'bg-green-50' : 'bg-gray-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Personal Stats */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Statistics</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className="group relative bg-gradient-to-br from-white to-gray-50/50 p-6 border border-gray-200/60 rounded-2xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative flex items-center">
                <div className={`inline-flex p-3 rounded-xl ${stat.bgColor} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-6 w-6 ${stat.color} group-hover:animate-pulse`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{stat.subtext}</p>
                </div>
              </div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Shifts */}
      {userDashboard.upcomingShifts.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Shifts</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-200">
              {userDashboard.upcomingShifts.slice(0, 5).map((shift, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(shift.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">{shift.status}</p>
                  </div>
                  <span className="text-sm text-gray-600">{shift.startTime} - {shift.endTime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin/Manager Dashboard Component
function AdminManagerDashboard({ dashboardStats }: { dashboardStats: DashboardStats }) {
  const stats = [
    {
      label: 'Active Staff',
      value: dashboardStats.general.activeEmployees.toString(),
      subtext: `${dashboardStats.today.clockedIn} currently clocked in`,
      icon: UsersIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: 'Today\'s Hours',
      value: dashboardStats.today.totalHours.toString(),
      subtext: `${dashboardStats.today.scheduledShifts} scheduled shifts`,
      icon: ClockIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Weekly Hours',
      value: dashboardStats.weekly.totalHours.toString(),
      subtext: `${dashboardStats.weekly.overtime.toFixed(1)}h overtime`,
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Pending Approvals',
      value: dashboardStats.general.pendingApprovals.toString(),
      subtext: 'Require review',
      icon: ExclamationTriangleIcon,
      color: dashboardStats.general.pendingApprovals > 0 ? 'text-amber-600' : 'text-green-600',
      bgColor: dashboardStats.general.pendingApprovals > 0 ? 'bg-amber-50' : 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Organization Stats */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Team Overview</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden backdrop-blur-sm"
              style={{ 
                animationDelay: `${index * 150}ms`,
                background: `linear-gradient(135deg, white 0%, ${stat.bgColor.includes('indigo') ? '#f0f9ff' : stat.bgColor.includes('green') ? '#f0fdf4' : stat.bgColor.includes('blue') ? '#eff6ff' : '#fffbeb'} 100%)`
              }}
            >
              {/* Animated Border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              
              {/* Main Content */}
              <div className="relative flex items-center">
                <div className={`inline-flex p-3 rounded-xl ${stat.bgColor} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50`}>
                  <stat.icon className={`h-6 w-6 ${stat.color} group-hover:animate-bounce`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">{stat.subtext}</p>
                </div>
              </div>
              
              {/* Shimmer Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
              </div>
              
              {/* Bottom Accent Line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Recent Activity</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Latest team interactions</p>
            </div>
            <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-green-400/50 to-transparent ml-6" />
          </div>
          
          <div className="relative bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 backdrop-blur-sm">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/20 via-transparent to-emerald-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative p-6">
              {dashboardStats.today.entries.length > 0 ? (
                <div className="space-y-4">
                  {dashboardStats.today.entries.slice(0, 5).map((entry, index) => (
                    <div key={index} className="group/item flex items-center space-x-4 p-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 transition-all duration-300 border border-transparent hover:border-green-200/40">
                      <div className="relative flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full shadow-lg ${
                          entry.clockOut ? 'bg-gradient-to-r from-red-400 to-rose-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'
                        } group-hover/item:scale-125 transition-transform duration-300`} />
                        <div className={`absolute inset-0 rounded-full ${
                          entry.clockOut ? 'bg-red-400' : 'bg-green-400'
                        } animate-ping opacity-30`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate group-hover/item:text-green-700 transition-colors duration-300">
                          {entry.userId?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs font-medium text-gray-500 group-hover/item:text-gray-600 transition-colors duration-300">
                          {entry.clockOut ? 'Clocked out' : 'Clocked in'} at{' '}
                          {new Date(entry.clockIn).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200/60">
                    <Link
                      href="/staff"
                      className="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors duration-300 group/link"
                    >
                      <span>View all activity</span>
                      <ArrowRightIcon className="h-4 w-4 group-hover/link:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex p-3 rounded-full bg-gray-100 mb-4">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No activity today</p>
                  <p className="text-xs text-gray-400 mt-1">Check back later for updates</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Weekly Summary */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Weekly Summary</h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Progress overview</p>
            </div>
            <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-indigo-400/50 to-transparent ml-6" />
          </div>
          
          <div className="relative bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 rounded-2xl p-6 overflow-hidden group hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 backdrop-blur-sm">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Hours</span>
                <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{dashboardStats.weekly.totalHours}h</span>
              </div>
              
              <div className="space-y-3">
                <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full shadow-lg transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${Math.min((dashboardStats.weekly.totalHours / 180) * 100, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {Math.round((dashboardStats.weekly.totalHours / 180) * 100)}% of target
                  </p>
                  <p className="text-xs font-medium text-gray-400">180h goal</p>
                </div>
              </div>

              {dashboardStats.general.pendingApprovals > 0 && (
                <div className="pt-4 border-t border-gray-200/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-amber-700 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Pending Approvals
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200/60">
                      {dashboardStats.general.pendingApprovals}
                    </span>
                  </div>
                  <Link
                    href="/approvals"
                    className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors duration-300 group/link"
                  >
                    <span>Review timesheets</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover/link:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Components
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function LightBulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
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

function RoleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}