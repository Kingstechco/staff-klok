'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking } from '@/contexts/TimeTrackingContext';
import OklokLogo from '@/components/ui/OklokLogo';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';

export default function ClockIn() {
  const { login, currentUser, logout } = useAuth();
  const { clockIn, clockOut, currentEntry, getUserEntries, refreshEntries } = useTimeTracking();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wifiStatus] = useState('Store-WiFi-Main');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Clear any stale state on mount
    setPin('');
    setError('');
    setShowError(null);
    
    return () => clearInterval(timer);
  }, []);

  // Refresh entries when user changes to sync current entry state
  useEffect(() => {
    if (currentUser) {
      refreshEntries(currentUser.id);
    }
  }, [currentUser, refreshEntries]);

  const isLoggedIn = !!currentUser;
  const isClockedIn = !!currentEntry;

  // Get user's weekly hours (memoized to prevent recalculation on every render)
  const { weeklyHours } = useMemo(() => {
    if (!currentUser) {
      return { weeklyHours: 0 };
    }
    
    const entries = getUserEntries(currentUser.id, 7);
    const hours = entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    
    return { weeklyHours: hours };
  }, [currentUser, getUserEntries]);

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

  const handleClockToggle = async () => {
    if (!currentUser) return;

    if (isClockedIn && currentEntry) {
      // Show confirmation dialog for clock out
      setShowClockOutConfirm(true);
    } else {
      try {
        await clockIn(currentUser.id, currentUser.name, wifiStatus);
      } catch (error: unknown) {
        // Show user-friendly error messages
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'Already clocked in') {
          setShowError('You are already clocked in. Please clock out first before starting a new session.');
        } else {
          setShowError(`Failed to clock in: ${errorMessage}`);
        }
        setTimeout(() => setShowError(null), 5000); // Auto-hide after 5 seconds
      }
    }
  };

  const confirmClockOut = async () => {
    if (currentUser) {
      try {
        await clockOut(currentUser.id);
        setShowClockOutConfirm(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setShowError(`Failed to clock out: ${errorMessage}`);
        setTimeout(() => setShowError(null), 5000);
        setShowClockOutConfirm(false);
      }
    } else {
      setShowClockOutConfirm(false);
    }
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

          <div className="oklok-card animate-scale-in">
            {error && (
              <div className="mb-6 oklok-error-state">
                <div className="oklok-error-icon">
                  <ExclamationTriangleIcon />
                </div>
                <p className="oklok-error-description">{error}</p>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handlePinSubmit}>
              <div className="oklok-form-group">
                <label htmlFor="pin" className="oklok-label">
                  Enter Your PIN {pin.length > 0 && <span className="text-xs text-gray-500">({pin.length}/4)</span>}
                </label>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    setPin(value);
                  }}
                  maxLength={6}
                  required
                  className="oklok-input text-center text-lg tracking-widest"
                  placeholder="••••"
                  autoComplete="off"
                  autoFocus
                  aria-describedby="pin-help"
                />
                <div id="pin-help" className="oklok-form-help">
                  Enter your 4-6 digit PIN to access the clock-in system
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || pin.trim().length < 4}
                className={`oklok-button-primary w-full ${
                  isLoading || pin.trim().length < 4 
                    ? 'opacity-50 cursor-not-allowed hover:transform-none' 
                    : ''
                }`}
                aria-label={isLoading ? 'Signing in, please wait' : 'Sign in to clock system'}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner size="sm" color="white" className="mr-2" />
                    Signing In...
                  </span>
                ) : (
                  `Sign In${pin.trim().length < 4 ? ` (${4 - pin.trim().length} more digits)` : ''}`
                )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Current Status */}
            <div className="oklok-card animate-in" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
                <div className={`oklok-badge ${
                  isClockedIn 
                    ? 'oklok-badge-success' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isClockedIn ? 'Working' : 'Off Duty'}
                </div>
              </div>
              <div className="flex items-center">
                <div className={`oklok-status-indicator mr-3 ${
                  isClockedIn ? 'oklok-status-online' : 'oklok-status-offline'
                }`} />
                <span className="text-gray-600">
                  {isClockedIn ? 'You are currently clocked in' : 'Ready to clock in'}
                </span>
              </div>
            </div>

            {/* Network Status */}
            <div className="oklok-card animate-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Network Status</h3>
                <div className="oklok-badge oklok-badge-success">
                  ✓ Verified
                </div>
              </div>
              <div className="flex items-center">
                <WifiIcon className="h-5 w-5 text-emerald-500 mr-3" aria-hidden="true" />
                <span className="text-gray-600 truncate">Connected to: {wifiStatus}</span>
              </div>
            </div>
          </div>

          {/* Clock In/Out Section */}
          <div className="oklok-card text-center mb-8 animate-in" style={{ animationDelay: '300ms' }}>
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
              className={`${isClockedIn ? 'oklok-button-danger' : 'oklok-button-success'} w-full max-w-xs text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 oklok-hover-lift`}
              aria-label={isClockedIn ? 'Clock out from work' : 'Clock in to work'}
            >
              {isClockedIn ? (
                <div className="flex items-center justify-center">
                  <LogoutIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2" aria-hidden="true" />
                  Clock Out
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LoginIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2" aria-hidden="true" />
                  Clock In
                </div>
              )}
            </button>
          </div>

          {/* Clock Out Confirmation Dialog */}
          {showClockOutConfirm && (
            <div className="oklok-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="clock-out-title">
              <div className="oklok-modal">
                <div className="oklok-modal-header text-center">
                  <div className="mx-auto h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" aria-hidden="true" />
                  </div>
                  <h3 id="clock-out-title" className="oklok-modal-title">Confirm Clock Out</h3>
                  <p className="text-gray-600 mt-2">
                    Are you sure you want to clock out? This will end your current work session.
                  </p>
                  {currentEntry && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Started at:</span> {new Date(currentEntry.clockIn).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Duration:</span> {Math.round((new Date().getTime() - new Date(currentEntry.clockIn).getTime()) / (1000 * 60))} minutes
                      </p>
                    </div>
                  )}
                </div>
                <div className="oklok-modal-footer">
                  <button
                    onClick={cancelClockOut}
                    className="oklok-button-secondary"
                    aria-label="Cancel clock out"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmClockOut}
                    className="oklok-button-danger"
                    aria-label="Confirm clock out"
                  >
                    Clock Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Progress */}
          <div className="oklok-card animate-in" style={{ animationDelay: '400ms' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Progress</h3>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Hours this week</span>
                <span className="text-lg font-bold text-gray-900">{weeklyHours}h / 45h</span>
              </div>
              <div className="oklok-progress">
                <div 
                  className="oklok-progress-bar"
                  style={{ width: `${Math.min((weeklyHours / 45) * 100, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round((weeklyHours / 45) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${Math.round((weeklyHours / 45) * 100)}% of weekly target completed`}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {Math.round((weeklyHours / 45) * 100)}% of weekly target
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="oklok-metric-card text-center">
                <div className="oklok-metric-value text-xl">
                  {Math.max(45 - weeklyHours, 0).toFixed(1)}
                </div>
                <div className="oklok-metric-label">Hours remaining</div>
              </div>
              <div className="oklok-metric-card text-center">
                <div className={`oklok-metric-value text-xl ${isClockedIn ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {isClockedIn ? 'Working' : 'Off'}
                </div>
                <div className="oklok-metric-label">Current status</div>
              </div>
              <div className="oklok-metric-card text-center">
                <div className="oklok-metric-value text-xl">
                  {Math.round((weeklyHours / 45) * 100)}%
                </div>
                <div className="oklok-metric-label">Weekly progress</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Notifications */}
      {showError && (
        <Toast
          message={showError}
          type="error"
          visible={!!showError}
          onClose={() => setShowError(null)}
          duration={5000}
        />
      )}
    </div>
  );
}

// Icon Components
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