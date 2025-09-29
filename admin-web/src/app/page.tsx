'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userDashboard, setUserDashboard] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    return () => clearInterval(timer);
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
        // Staff users get their personal dashboard only
        const response = await fetch('/api/dashboard/user', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserDashboard(data);
        }
      } else if (hasPermission('analytics_access') || currentUser?.role === 'admin' || currentUser?.role === 'manager') {
        // Admins/managers get organization-wide dashboard
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setDashboardStats(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        title: 'Clock In/Out',
        description: 'Quick access to time tracking',
        href: '/clockin',
        icon: ClockIcon,
        color: 'from-emerald-500 to-teal-600',
      }
    ];

    // Admin/Manager specific actions
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      baseActions.push({
        title: 'Staff Overview',
        description: 'View and manage all staff',
        href: '/staff',
        icon: UsersIcon,
        color: 'from-blue-500 to-indigo-600',
        roles: ['admin', 'manager']
      });
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 animate-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting}, {currentUser.name || currentUser.role}
          </h1>
          <p className="mt-1 text-sm text-gray-500 break-words">
            <span className="block sm:inline">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 animate-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-90`}></div>
              <div className="relative p-4 sm:p-6 text-white">
                <action.icon className="h-6 w-6 sm:h-8 sm:w-8 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{action.title}</h3>
                <p className="text-white/80 text-sm">{action.description}</p>
                <div className="mt-3 sm:mt-4 flex items-center text-white/90">
                  <span className="text-sm">Access now</span>
                  <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading dashboard...</span>
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

        {/* Quick Tips */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl animate-in" style={{ animationDelay: '800ms' }}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <LightBulbIcon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Pro tip</h3>
              <p className="text-sm text-gray-600 mt-1">
                {currentUser.role === 'staff' 
                  ? "Use your unique PIN to clock in/out securely. Make sure you're connected to the correct network."
                  : "Staff members can clock in/out using their unique PIN. Monitor real-time activity from this dashboard."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Staff Dashboard Component
function StaffDashboard({ userDashboard }: { userDashboard: UserDashboard }) {
  const stats = [
    {
      label: 'Today Hours',
      value: userDashboard.today.hours.toFixed(1),
      change: `${userDashboard.today.entries} entries`,
      changeType: 'neutral',
      icon: ClockIcon,
      color: 'emerald',
    },
    {
      label: 'Weekly Hours',
      value: userDashboard.weekly.hours.toFixed(1),
      change: `${userDashboard.weekly.entries} entries`,
      changeType: 'neutral',
      icon: ChartBarIcon,
      color: 'blue',
    },
    {
      label: 'Overtime This Week',
      value: userDashboard.weekly.overtime.toFixed(1),
      change: 'hours',
      changeType: userDashboard.weekly.overtime > 0 ? 'increase' : 'neutral',
      icon: UserGroupIcon,
      color: 'amber',
    },
    {
      label: 'Current Status',
      value: userDashboard.currentEntry ? 'Clocked In' : 'Clocked Out',
      change: userDashboard.currentEntry ? 'Active' : 'Inactive',
      changeType: userDashboard.currentEntry ? 'increase' : 'neutral',
      icon: CheckCircleIcon,
      color: userDashboard.currentEntry ? 'green' : 'gray',
    },
  ];

  return (
    <>
      {/* Personal Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="stat-card animate-in p-3 sm:p-6"
            style={{ animationDelay: `${(index + 2) * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-xl bg-${stat.color}-100`}>
                <stat.icon className={`h-4 w-4 sm:h-6 sm:w-6 text-${stat.color}-600`} />
              </div>
              <span className={`text-xs sm:text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' :
                stat.changeType === 'decrease' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Shifts */}
      {userDashboard.upcomingShifts.length > 0 && (
        <div className="chart-container animate-in mb-6" style={{ animationDelay: '600ms' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Upcoming Shifts</h3>
          <div className="space-y-3">
            {userDashboard.upcomingShifts.slice(0, 5).map((shift, index) => (
              <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(shift.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">{shift.status}</p>
                </div>
                <span className="text-sm text-gray-600">{shift.startTime} - {shift.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Admin/Manager Dashboard Component
function AdminManagerDashboard({ dashboardStats }: { dashboardStats: DashboardStats }) {
  const stats = [
    {
      label: 'Active Staff',
      value: dashboardStats.general.activeEmployees.toString(),
      change: `${dashboardStats.today.clockedIn} clocked in`,
      changeType: 'neutral',
      icon: UserGroupIcon,
      color: 'indigo',
    },
    {
      label: 'Today Hours',
      value: dashboardStats.today.totalHours.toString(),
      change: `${dashboardStats.today.scheduledShifts} shifts`,
      changeType: 'neutral',
      icon: CheckCircleIcon,
      color: 'emerald',
    },
    {
      label: 'Weekly Hours',
      value: dashboardStats.weekly.totalHours.toString(),
      change: `+${dashboardStats.weekly.overtime.toFixed(1)} OT`,
      changeType: dashboardStats.weekly.overtime > 0 ? 'increase' : 'neutral',
      icon: ChartBarIcon,
      color: 'amber',
    },
    {
      label: 'Pending Approvals',
      value: dashboardStats.general.pendingApprovals.toString(),
      change: 'need review',
      changeType: dashboardStats.general.pendingApprovals > 0 ? 'increase' : 'neutral',
      icon: ClockIcon,
      color: 'rose',
    },
  ];

  return (
    <>
      {/* Organization Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="stat-card animate-in p-3 sm:p-6"
            style={{ animationDelay: `${(index + 2) * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-xl bg-${stat.color}-100`}>
                <stat.icon className={`h-4 w-4 sm:h-6 sm:w-6 text-${stat.color}-600`} />
              </div>
              <span className={`text-xs sm:text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-green-600' :
                stat.changeType === 'decrease' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Activity - Showing actual staff data */}
        <div className="lg:col-span-2 chart-container animate-in" style={{ animationDelay: '600ms' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h3>
          <div className="space-y-3">
            {dashboardStats.today.entries.slice(0, 5).map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center min-w-0 flex-1">
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.clockOut ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${
                      entry.clockOut ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.userId?.name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.clockOut ? 'Clocked out' : 'Clocked in'}
                    </p>
                  </div>
                </div>
                <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
                  {new Date(entry.clockIn).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            ))}
            
            {dashboardStats.today.entries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No activity today yet</p>
              </div>
            )}
          </div>
          
          {dashboardStats.today.entries.length > 0 && (
            <Link
              href="/staff"
              className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              View all activity
              <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Weekly Overview */}
        <div className="chart-container animate-in" style={{ animationDelay: '700ms' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Hours</span>
                <span className="text-lg font-bold text-gray-900">{dashboardStats.weekly.totalHours}h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((dashboardStats.weekly.totalHours / 180) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {Math.round((dashboardStats.weekly.totalHours / 180) * 100)}% of weekly target (180h)
              </p>
            </div>

            {dashboardStats.general.pendingApprovals > 0 && (
              <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">Pending Approvals</span>
                  <span className="text-lg font-bold text-amber-900">{dashboardStats.general.pendingApprovals}</span>
                </div>
                <Link
                  href="/approvals"
                  className="mt-2 inline-flex items-center text-xs text-amber-700 hover:text-amber-900"
                >
                  Review timesheets
                  <ArrowRightIcon className="ml-1 h-3 w-3" />
                </Link>
              </div>
            )}

            <Link 
              href="/reports"
              className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors block text-center"
            >
              Generate Report
            </Link>
          </div>
        </div>
      </div>
    </>
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

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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