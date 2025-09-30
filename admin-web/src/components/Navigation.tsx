'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import OklokLogo from '@/components/ui/OklokLogo';

export default function Navigation() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const { currentUser, currentTenant, logout, canManageContractors, canApproveTimesheets } = useAuth();

  // Enhanced navigation with multi-tenant and contractor features
  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, description: 'Overview and metrics' },
    { name: 'Time Tracking', href: '/clockin', icon: ClockIcon, description: 'Clock in and out' },
    { name: 'Team', href: '/staff', icon: UsersIcon, roles: ['admin', 'manager'], description: 'Manage team members' },
    { name: 'Schedule', href: '/schedule', icon: CalendarIcon, roles: ['admin', 'manager'], description: 'Plan and organize shifts' },
    { name: 'Reports', href: '/reports', icon: ChartIcon, roles: ['admin', 'manager'], description: 'Analytics and insights' },
  ];
  
  // Add contractor-specific navigation items
  const contractorNavigation = [];
  if (canManageContractors()) {
    contractorNavigation.push({
      name: 'Contractors',
      href: '/contractors',
      icon: ContractorIcon,
      roles: ['admin', 'manager', 'client_contact'],
      description: 'Manage contractor relationships'
    });
  }
  
  if (canApproveTimesheets()) {
    contractorNavigation.push({
      name: 'Approvals',
      href: '/approvals',
      icon: ApprovalIcon,
      roles: ['admin', 'manager', 'client_contact'],
      description: 'Review and approve timesheets'
    });
  }
  
  // Add tenant management for admins
  const adminNavigation = [];
  if (currentUser?.role === 'admin') {
    adminNavigation.push({
      name: 'Settings',
      href: '/settings',
      icon: SettingsIcon,
      roles: ['admin'],
      description: 'System configuration'
    });
  }
  
  const navigation = [...baseNavigation, ...contractorNavigation, ...adminNavigation]
    .filter(item => !item.roles || (currentUser && item.roles.includes(currentUser.role)));

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Desktop Sidebar with Elevated Appearance */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        {/* Main Sidebar Container with Enhanced Shadows and Depth */}
        <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-white via-white to-gray-50/30 shadow-2xl shadow-indigo-500/10 border-r border-gray-200/60 px-6 pb-4">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10 opacity-50" />
          
          {/* Floating Decorative Elements */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="flex space-x-1">
              <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="h-1 w-1 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '1000ms' }} />
            </div>
          </div>

          {/* Enhanced Logo Section with Hamburger Menu */}
          <div className="relative flex h-16 shrink-0 items-center px-2">
            {sidebarCollapsed ? (
              /* Collapsed State - Stack vertically */
              <div className="flex flex-col items-center justify-center w-full space-y-2">
                {/* Hamburger Menu - Top */}
                <button
                  onClick={() => {
                    console.log('Toggle clicked. Current state:', sidebarCollapsed);
                    setSidebarCollapsed(!sidebarCollapsed);
                    console.log('New state should be:', !sidebarCollapsed);
                  }}
                  className="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-indigo-100 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-300 hover:border-indigo-400"
                  title="Expand sidebar"
                >
                  <Bars3Icon className="h-4 w-4 text-gray-600 hover:text-indigo-600 transition-colors duration-300" />
                </button>
                
                {/* Logo - Bottom */}
                <Link href="/" className="flex items-center p-1 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300">
                  <OklokLogo size="sm" />
                </Link>
              </div>
            ) : (
              /* Expanded State - Side by side */
              <>
                <Link href="/" className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-105 flex-1">
                  <div className="relative">
                    <OklokLogo size="md" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    {/* Primary Brand/Tenant Name */}
                    <span className="text-lg font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300 truncate">
                      {currentTenant && currentTenant.name !== 'Oklok' ? currentTenant.name : 'Oklok'}
                    </span>
                    {/* Subtitle - Only show if we have a custom tenant */}
                    {currentTenant && currentTenant.name !== 'Oklok' && (
                      <span className="text-xs font-semibold text-gray-500 group-hover:text-indigo-600 transition-colors duration-300 truncate">
                        Powered by Oklok
                      </span>
                    )}
                  </div>
                </Link>
                
                {/* Hamburger Menu - Right side */}
                <button
                  onClick={() => {
                    console.log('Toggle clicked. Current state:', sidebarCollapsed);
                    setSidebarCollapsed(!sidebarCollapsed);
                    console.log('New state should be:', !sidebarCollapsed);
                  }}
                  className="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-indigo-100 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-300 hover:border-indigo-400"
                  title="Collapse sidebar"
                >
                  <Bars3Icon className="h-4 w-4 text-gray-600 hover:text-indigo-600 transition-colors duration-300" />
                </button>
              </>
            )}
          </div>

          {/* Enhanced Navigation */}
          <nav className="relative flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-2">
                  {navigation.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name} style={{ animationDelay: `${index * 100}ms` }}>
                        <Link
                          href={item.href}
                          className={`group relative flex rounded-2xl p-4 text-sm leading-6 font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 ${sidebarCollapsed ? 'justify-center' : 'gap-x-3'} ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/25 border-2 border-white/20'
                              : 'text-gray-700 hover:text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50/80 hover:to-purple-50/60 hover:shadow-lg hover:shadow-indigo-500/10 border border-transparent hover:border-indigo-200/60'
                          }`}
                          title={sidebarCollapsed ? item.name : undefined}
                        >
                          {/* Background Glow for Active Items */}
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          )}
                          
                          {/* Icon Container with Enhanced Styling */}
                          <div className={`relative inline-flex p-2 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 ${
                            isActive 
                              ? 'bg-white/20 border border-white/30' 
                              : 'bg-gray-100/60 group-hover:bg-indigo-100/80 border border-gray-200/60 group-hover:border-indigo-200'
                          }`}>
                            <item.icon
                              className={`h-5 w-5 shrink-0 transition-all duration-300 ${
                                isActive ? 'text-white group-hover:animate-pulse' : 'text-gray-600 group-hover:text-indigo-600'
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                          
                          {/* Text Content */}
                          {!sidebarCollapsed && (
                            <div className="relative flex flex-col flex-1">
                              <span className={`font-bold transition-colors duration-300 ${
                                isActive ? 'text-white' : 'text-gray-800 group-hover:text-indigo-700'
                              }`}>{item.name}</span>
                              <span className={`text-xs mt-0.5 font-medium transition-colors duration-300 ${
                                isActive ? 'text-indigo-100' : 'text-gray-500 group-hover:text-indigo-600'
                              }`}>{item.description}</span>
                            </div>
                          )}

                          {/* Accent Line for Active Items */}
                          {isActive && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-white/80 to-indigo-200 rounded-l-full shadow-lg" />
                          )}

                          {/* Shimmer Effect */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500 rounded-2xl" />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* Enhanced User Profile Section */}
              <li className="mt-auto">
                <div className="relative border-t border-gray-200/60 pt-6">
                  {/* Subtle Glow Above Border */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
                  
                  <div className="group relative">
                    <button
                      className={`flex w-full items-center rounded-2xl p-4 text-sm leading-6 font-medium text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50/80 hover:to-purple-50/60 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-105 hover:-translate-y-0.5 border border-transparent hover:border-indigo-200/60 ${sidebarCollapsed ? 'justify-center' : 'gap-x-3'}`}
                      aria-label="User menu"
                      title={sidebarCollapsed ? `${currentUser?.name || 'Guest'} (${currentUser?.role || 'No Role'})` : undefined}
                    >
                      {/* Enhanced Avatar */}
                      <div className="relative">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                          {currentUser?.name?.charAt(0) || 'G'}
                        </div>
                        {/* Online Status Indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                      </div>
                      
                      {/* User Info */}
                      {!sidebarCollapsed && (
                        <>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">{currentUser?.name || 'Guest'}</p>
                            <p className="text-xs font-semibold text-gray-500 capitalize group-hover:text-indigo-600 transition-colors duration-300">{currentUser?.role || 'No Role'}</p>
                          </div>
                          
                          {/* Enhanced Chevron */}
                          <div className="relative">
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-500 group-hover:text-indigo-600 transition-all duration-300 group-hover:animate-bounce" />
                          </div>
                        </>
                      )}
                    </button>
                    
                    {/* Enhanced Dropdown Menu */}
                    <div className={`absolute bottom-full mb-3 bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-2xl shadow-indigo-500/20 border border-gray-200/60 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 z-50 backdrop-blur-sm ${sidebarCollapsed ? 'left-full ml-3 w-48' : 'left-0 right-0'}`}>
                      {/* Subtle Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative p-3">
                        <button
                          onClick={logout}
                          className="group/btn w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50/80 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:scale-105 border border-transparent hover:border-red-200/60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="inline-flex p-1.5 rounded-lg bg-red-100 group-hover/btn:bg-red-200 transition-colors duration-300">
                              <LogoutIcon className="h-3 w-3 text-red-600" />
                            </div>
                            <span>Sign out</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* Mobile Logo - Clean UX Design */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 flex-1 min-w-0" onClick={() => setSidebarOpen(false)}>
              <OklokLogo size="md" />
              <div className="flex flex-col flex-1 min-w-0">
                {/* Primary Brand/Tenant Name */}
                <span className="text-lg font-bold text-gray-900 truncate">
                  {currentTenant && currentTenant.name !== 'Oklok' ? currentTenant.name : 'Oklok'}
                </span>
                {/* Subtitle - Only show if we have a custom tenant */}
                {currentTenant && currentTenant.name !== 'Oklok' && (
                  <span className="text-xs text-gray-500 truncate">Powered by Oklok</span>
                )}
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Navigation - Same as desktop */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
                              : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                          }`}
                        >
                          <item.icon
                            className={`h-5 w-5 shrink-0 ${
                              isActive ? 'text-indigo-700' : 'text-gray-500 group-hover:text-indigo-600'
                            }`}
                            aria-hidden="true"
                          />
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{item.description}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <OklokLogo size="sm" />
              <span className="text-lg font-semibold text-gray-900 truncate">
                {currentTenant && currentTenant.name !== 'Oklok' ? currentTenant.name : 'Oklok'}
              </span>
            </div>
            
            {/* Mobile User Menu */}
            <div className="relative group">
              <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.name?.charAt(0) || 'G'}
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email || 'No email'}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors mt-1"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Icon Components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ContractorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
    </svg>
  );
}

function ApprovalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function Bars3Icon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

