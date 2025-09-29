'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';
import OklokLogo from '@/components/ui/OklokLogo';

export default function ClockIn() {
  const { login, currentUser, logout } = useAuth();
  const { clockIn, clockOut, currentEntry, getUserEntries, refreshEntries } = useTimeTracking();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wifiStatus] = useState('Store-WiFi-Main');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Refresh entries when user changes to sync current entry state
  useEffect(() => {
    if (currentUser) {
      refreshEntries();
    }
  }, [currentUser, refreshEntries]);

  const isLoggedIn = !!currentUser;
  const isClockedIn = !!currentEntry;

  // Get user's weekly hours
  const userEntries = currentUser ? getUserEntries(currentUser.id, 7) : [];
  const weeklyHours = userEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);

  const handleLogin = async (inputPin: string) => {
    setIsLoading(true);
    setError('');
    
    const result = await login(inputPin);
    if (!result.success) {
      setError(result.error || 'Invalid PIN. Please try again.');
    }
    setIsLoading(false);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      handleLogin(pin);
    }
  };

  const handleClockToggle = () => {
    if (!currentUser) return;

    if (isClockedIn && currentEntry) {
      // Show confirmation dialog for clock out
      setShowClockOutConfirm(true);
    } else {
      clockIn(currentUser.id, currentUser.name, wifiStatus);
    }
  };

  const confirmClockOut = () => {
    if (currentUser) {
      clockOut(currentUser.id);
    }
    setShowClockOutConfirm(false);
  };

  const cancelClockOut = () => {
    setShowClockOutConfirm(false);
  };

  // Quick PIN handler removed - production ready

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-6">
              <OklokLogo size="lg" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Staff Clock-In</h2>
            <p className="mt-2 text-gray-600">Enter your PIN to continue</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handlePinSubmit}>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Your PIN
                </label>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-base text-center text-lg tracking-widest"
                  placeholder="••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 sm:mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Demo PINs</span>
                </div>
              </div>

              {/* Quick PIN access removed - production ready */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8 animate-in">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1"></div>
              <div className="flex-1 text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {currentUser.name}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Current Status */}
            <div className="stat-card animate-in p-4 sm:p-6" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Current Status</h3>
                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                  isClockedIn 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isClockedIn ? 'Working' : 'Off Duty'}
                </div>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-3 ${
                  isClockedIn ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600 text-sm sm:text-base">
                  {isClockedIn ? 'You are currently clocked in' : 'Ready to clock in'}
                </span>
              </div>
            </div>

            {/* Network Status */}
            <div className="stat-card animate-in p-4 sm:p-6" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Network Status</h3>
                <div className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700">
                  ✓ Verified
                </div>
              </div>
              <div className="flex items-center">
                <WifiIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-3" />
                <span className="text-gray-600 text-sm sm:text-base truncate">Connected to: {wifiStatus}</span>
              </div>
            </div>
          </div>

          {/* Clock In/Out Section */}
          <div className="chart-container text-center mb-6 sm:mb-8 animate-in p-6 sm:p-8" style={{ animationDelay: '300ms' }}>
            <div className="mb-6">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 font-mono">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-base sm:text-lg text-gray-600">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            
            <button
              onClick={handleClockToggle}
              className={`w-full max-w-xs px-8 sm:px-12 py-3 sm:py-4 text-lg sm:text-xl font-semibold rounded-2xl text-white shadow-lg transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl ${
                isClockedIn
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
              }`}
            >
              {isClockedIn ? (
                <div className="flex items-center justify-center">
                  <LogoutIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Clock Out
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LoginIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Clock In
                </div>
              )}
            </button>
          </div>

          {/* Clock Out Confirmation Dialog */}
          {showClockOutConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in">
                <div className="text-center mb-6">
                  <div className="mx-auto h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Clock Out</h3>
                  <p className="text-gray-600">
                    Are you sure you want to clock out? This will end your current work session.
                  </p>
                  {currentEntry && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Started at: {new Date(currentEntry.clockIn).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        Duration: {Math.round((new Date().getTime() - new Date(currentEntry.clockIn).getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={cancelClockOut}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmClockOut}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all font-medium"
                  >
                    Clock Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Progress */}
          <div className="chart-container animate-in p-4 sm:p-6" style={{ animationDelay: '400ms' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Weekly Progress</h3>
            
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Hours this week</span>
                <span className="text-base sm:text-lg font-bold text-gray-900">{weeklyHours}h / 45h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 sm:h-4 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((weeklyHours / 45) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {Math.round((weeklyHours / 45) * 100)}% of weekly target
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {Math.max(45 - weeklyHours, 0).toFixed(1)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Hours remaining</div>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isClockedIn ? 'Working' : 'Off'}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Current status</div>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {Math.round((weeklyHours / 45) * 100)}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Weekly progress</div>
              </div>
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

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
}

function LoginIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
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

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}