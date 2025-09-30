'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';
import OklokLogo from '@/components/ui/OklokLogo';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';
import TimeDisplay from '@/components/ui/TimeDisplay';

export default function ClockIn() {
  const { login, currentUser, logout } = useAuth();
  const { clockIn, clockOut, currentEntry, getUserEntries, refreshEntries } = useTimeTracking();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wifiStatus] = useState('Store-WiFi-Main');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  useEffect(() => {
    setPin('');
    setError('');
    setShowError(null);
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshEntries(currentUser.id);
    }
  }, [currentUser, refreshEntries]);

  const isLoggedIn = !!currentUser;
  const isClockedIn = !!currentEntry;

  const { weeklyHours } = useMemo(() => {
    if (!currentUser) {
      return { weeklyHours: 0 };
    }
    
    const entries = getUserEntries(currentUser.id, 7);
    let totalHours = 0;
    
    entries.forEach(entry => {
      totalHours += entry.totalHours || 0;
    });
    
    return { weeklyHours: totalHours };
  }, [currentUser, getUserEntries]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(pin);
      setPin('');
    } catch (err: any) {
      setError(err.message || 'Invalid PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await clockIn(currentUser.id, currentUser.name);
    } catch (err: any) {
      setShowError(err.message || 'Failed to clock in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await clockOut(currentUser.id);
      setShowClockOutConfirm(false);
    } catch (err: any) {
      setShowError(err.message || 'Failed to clock out');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentSessionDuration = () => {
    if (!currentEntry || !currentEntry.clockIn) return '0:00';
    
    const startTime = new Date(currentEntry.clockIn);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // PIN Entry Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-indigo-50/30 flex items-center justify-center">
        <div className="w-full max-w-md px-6">
          {/* Enhanced Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6 group">
              <div className="relative transform hover:scale-110 transition-transform duration-300">
                <OklokLogo size="lg" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
              </div>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-700 bg-clip-text text-transparent mb-2">Time Tracking</h1>
            <p className="text-sm font-medium text-gray-600">Enter your PIN to clock in or out</p>
          </div>

          {/* Enhanced Time Display */}
          <div className="flex justify-center mb-6">
            <TimeDisplay collapsible />
          </div>

          {/* Enhanced PIN Form */}
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <label htmlFor="pin" className="block text-sm font-bold text-gray-700 mb-3">
                Enter your PIN
              </label>
              <div className="relative group">
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-4 border-2 border-gray-300/60 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-center text-lg font-mono font-bold bg-gradient-to-br from-white to-gray-50/50 group-hover:shadow-lg transition-all duration-300"
                  maxLength={6}
                  autoFocus
                  disabled={isLoading}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="relative bg-gradient-to-br from-red-50 to-rose-50/80 border border-red-200/60 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="w-full relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-4 focus:ring-indigo-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 border-2 border-white/20"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2">Verifying...</span>
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          {/* Enhanced Network Status */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-full border border-green-200/60 shadow-sm">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg"></div>
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-40"></div>
              </div>
              <span className="text-sm font-semibold text-green-700">Connected to: {wifiStatus}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {/* User Welcome Section */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                {/* Enhanced User Avatar */}
                <div className="relative">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/50">
                    {currentUser.name?.charAt(0) || 'U'}
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                </div>
                
                {/* Welcome Text */}
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-700 bg-clip-text text-transparent">
                    Welcome back, {currentUser.name}!
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
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-300"
              >
                Refresh
              </button>
              <button
                onClick={() => {/* Add logout functionality */}}
                className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-300"
              >
                Switch User
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Clock In/Out Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/30 border border-gray-200/60 rounded-2xl p-8 text-center hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Decorative Elements */}
            <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
              <div className="flex space-x-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse" style={{ animationDelay: '800ms' }} />
              </div>
            </div>
            {/* Status */}
            <div className="relative mb-6">
              <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-lg border-2 border-white/50 transition-all duration-300 ${
                isClockedIn 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 shadow-green-500/20' 
                  : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 shadow-gray-500/20'
              }`}>
                <div className={`w-3 h-3 rounded-full mr-3 animate-pulse ${
                  isClockedIn ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}></div>
                {isClockedIn ? 'Currently Working' : 'Off Duty'}
              </div>
            </div>

            {/* Current Time Display - Always Visible */}
            <div className="relative mb-6">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Current Time</p>
              <div className="flex justify-center">
                <TimeDisplay collapsible />
              </div>
            </div>

            {/* Session Duration */}
            {isClockedIn && (
              <div className="relative mb-6">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Current Session</p>
                <div className="inline-block p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-xl shadow-lg">
                  <div className="text-4xl font-mono font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent">
                    {getCurrentSessionDuration()}
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-ping" />
              </div>
            )}

            {/* Action Button */}
            <div className="relative mb-6">
              {isClockedIn ? (
                <button
                  onClick={() => setShowClockOutConfirm(true)}
                  disabled={isLoading}
                  className="group relative bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-8 rounded-xl hover:from-red-700 hover:to-red-800 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-red-500/25 hover:scale-105 border-2 border-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-red-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative">{isLoading ? 'Processing...' : 'Clock Out'}</span>
                </button>
              ) : (
                <button
                  onClick={handleClockIn}
                  disabled={isLoading}
                  className="group relative bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-8 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-green-500/25 hover:scale-105 border-2 border-white/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative">{isLoading ? 'Processing...' : 'Clock In'}</span>
                </button>
              )}
            </div>

            {/* Additional Info */}
            {isClockedIn && currentEntry && (
              <div className="text-sm text-gray-600">
                <p>Started at {new Date(currentEntry.clockIn).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-white to-blue-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-blue-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <ClockIcon className="h-6 w-6 text-blue-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Weekly Hours</p>
                <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-cyan-700 transition-all duration-300">{weeklyHours.toFixed(1)}h</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">This week</p>
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
                <CheckCircleIcon className="h-6 w-6 text-green-600 group-hover:animate-bounce" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Status</p>
                <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:from-green-700 group-hover:to-emerald-700 transition-all duration-300">{isClockedIn ? 'Active' : 'Inactive'}</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">Current session</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>

          <div className="group relative bg-gradient-to-br from-white to-indigo-50/30 p-6 border border-gray-200/60 rounded-2xl hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
            <div className="relative flex items-center">
              <div className="inline-flex p-3 rounded-xl bg-indigo-50 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-white/50">
                <WifiIcon className="h-6 w-6 text-indigo-600 group-hover:animate-pulse" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Network</p>
                <p className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300">Connected</p>
                <p className="text-xs text-gray-500 font-semibold group-hover:text-gray-600 transition-colors duration-300">{wifiStatus}</p>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-300%] transition-transform duration-1500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl" />
          </div>
        </div>

        {/* Enhanced Tips Section */}
        <div className="relative bg-gradient-to-br from-indigo-50 via-indigo-50/80 to-purple-50/60 border border-indigo-200/60 rounded-2xl p-6 overflow-hidden group hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
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
                <InformationCircleIcon className="h-5 w-5 text-white group-hover:animate-pulse" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
                Quick Tips
                <div className="h-1 w-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
              </h3>
              <div className="mt-3 text-sm text-indigo-700 font-medium leading-relaxed">
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 mt-2 mr-3 flex-shrink-0" />
                    <span>Make sure you're connected to the correct network before clocking in</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 mt-2 mr-3 flex-shrink-0" />
                    <span>Your session time is tracked automatically while you're clocked in</span>
                  </li>
                  <li className="flex items-start">
                    <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-400 to-indigo-500 mt-2 mr-3 flex-shrink-0" />
                    <span>Remember to clock out at the end of your shift</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Bottom Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-b-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Clock Out Confirmation Modal */}
      {showClockOutConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowClockOutConfirm(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Clock Out Confirmation
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to clock out? Your current session duration is {getCurrentSessionDuration()}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Clock Out'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClockOutConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {showError && (
        <Toast
          type="error"
          message={showError}
          visible={!!showError}
          onClose={() => setShowError(null)}
        />
      )}
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}

function InformationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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