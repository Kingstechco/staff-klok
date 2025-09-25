'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

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

  const quickActions: QuickAction[] = [
    {
      title: 'Clock In/Out',
      description: 'Quick access to time tracking',
      href: '/clockin',
      icon: ClockIcon,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Staff Overview',
      description: 'View and manage all staff',
      href: '/staff',
      icon: UsersIcon,
      color: 'from-blue-500 to-indigo-600',
    },
  ];

  const stats = [
    {
      label: 'Total Staff',
      value: '5',
      change: '+1',
      changeType: 'increase',
      icon: UserGroupIcon,
      color: 'indigo',
    },
    {
      label: 'Currently Working',
      value: '3',
      change: '60%',
      changeType: 'neutral',
      icon: CheckCircleIcon,
      color: 'emerald',
    },
    {
      label: 'Weekly Hours',
      value: '127.5',
      change: '+12.3%',
      changeType: 'increase',
      icon: ChartBarIcon,
      color: 'amber',
    },
    {
      label: 'Overtime Hours',
      value: '8.5',
      change: '-2.1',
      changeType: 'decrease',
      icon: ClockIcon,
      color: 'rose',
    },
  ];

  const recentActivity = [
    { id: 1, person: 'John Smith', action: 'Clocked in', time: '9:00 AM', status: 'in' },
    { id: 2, person: 'Sarah Johnson', action: 'Clocked in', time: '8:30 AM', status: 'in' },
    { id: 3, person: 'Mike Davis', action: 'Clocked out', time: '5:00 PM', status: 'out' },
    { id: 4, person: 'Lisa Chen', action: 'Clocked in', time: '10:00 AM', status: 'in' },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 animate-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{greeting}, Admin</h1>
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

        {/* Stats Grid */}
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
          {/* Recent Activity */}
          <div className="lg:col-span-2 chart-container animate-in" style={{ animationDelay: '600ms' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.status === 'in' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${
                        activity.status === 'in' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.person}</p>
                      <p className="text-xs text-gray-500">{activity.action}</p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">{activity.time}</span>
                </div>
              ))}
            </div>
            <Link
              href="/staff"
              className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
            >
              View all activity
              <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {/* Weekly Overview */}
          <div className="chart-container animate-in" style={{ animationDelay: '700ms' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
            <div className="space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Total Hours</span>
                  <span className="text-lg font-bold text-gray-900">127.5h</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full" style={{ width: '71%' }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">71% of weekly target (180h)</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Top Performers</h4>
                {['Sarah Johnson', 'Tom Wilson', 'Lisa Chen'].map((name, index) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-500 w-6 flex-shrink-0">#{index + 1}</span>
                      <span className="text-sm text-gray-900 ml-2 truncate">{name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600 flex-shrink-0">{44 - index * 2}h</span>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl animate-in" style={{ animationDelay: '800ms' }}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <LightBulbIcon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">Pro tip</h3>
              <p className="text-sm text-gray-600 mt-1">
                Staff members can clock in/out using their unique ID. Make sure they&apos;re connected to the store WiFi for location verification.
              </p>
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