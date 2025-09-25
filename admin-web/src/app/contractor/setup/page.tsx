'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SetupStep {
  id: number;
  title: string;
  description: string;
}

const SETUP_STEPS: SetupStep[] = [
  { id: 1, title: 'Basic Information', description: 'Set up your PIN and preferences' },
  { id: 2, title: 'Work Schedule', description: 'Configure your regular working hours' },
  { id: 3, title: 'Auto-Clocking Options', description: 'Choose how you want your time tracked' },
  { id: 4, title: 'Review & Submit', description: 'Confirm your settings' }
];

const AutoClockingOptions = {
  proactive: {
    title: 'Start of Day Auto-Clock',
    description: 'Automatically clock you in at 9 AM. Report exceptions before your shift.',
    pros: ['Always ready to work', 'No end-of-day surprises'],
    cons: ['Must report sick days early'],
    bestFor: 'Contractors with predictable schedules'
  },
  reactive: {
    title: 'End of Day Auto-Fill',
    description: 'System checks at 6 PM if you\'ve clocked time. Auto-fills if missing.',
    pros: ['Flexible during the day', 'Covers forgotten clock-ins'],
    cons: ['Late discovery of issues'],
    bestFor: 'Contractors who sometimes manual clock'
  },
  weekly_batch: {
    title: 'Weekly Timesheet Generation',
    description: 'Generate full week timesheet every Friday, minus reported exceptions.',
    pros: ['Bulk management', 'Week overview'],
    cons: ['Less daily control'],
    bestFor: 'Set-and-forget contractors'
  }
};

export default function ContractorSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    pin: '',
    confirmPin: '',
    timezone: 'America/New_York',
    preferences: {
      notifications: {
        email: true,
        clockInReminder: false,
        timesheetReminder: true,
        approvalNotification: true
      }
    },
    workSchedule: {
      startTime: '09:00',
      endTime: '17:00',
      workDays: [1, 2, 3, 4, 5], // Mon-Fri
      hoursPerDay: 8
    },
    autoClockingSettings: {
      enabled: true,
      processingMode: 'reactive' as 'proactive' | 'reactive' | 'weekly_batch',
      requiresApproval: false,
      exceptionNotificationMethod: 'email' as 'email' | 'sms' | 'app'
    }
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid setup link. Please contact your administrator.');
    }
  }, [token]);

  const handleNext = () => {
    if (currentStep < SETUP_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      setError('Invalid setup token');
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (formData.pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contractor/setup/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin: formData.pin,
          timezone: formData.timezone,
          preferences: formData.preferences,
          autoClockingSettings: formData.autoClockingSettings,
          workSchedule: formData.workSchedule
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Store the auth token for immediate login
        localStorage.setItem('token', data.token);
        
        alert('Setup completed successfully! Awaiting admin approval. You can now log in.');
        router.push('/login?message=setup_complete');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Setup failed');
      }
    } catch (err) {
      setError('Failed to complete setup. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Create Your PIN (4-6 digits)
                  </label>
                  <input
                    type="password"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter 4-6 digit PIN"
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPin}
                    onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your PIN"
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Notification Preferences
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.preferences.notifications.email}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            notifications: {
                              ...formData.preferences.notifications,
                              email: e.target.checked
                            }
                          }
                        })}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700">Email notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.preferences.notifications.clockInReminder}
                        onChange={(e) => setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            notifications: {
                              ...formData.preferences.notifications,
                              clockInReminder: e.target.checked
                            }
                          }
                        })}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700">Clock-in reminders</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Work Schedule</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.workSchedule.startTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        workSchedule: {
                          ...formData.workSchedule,
                          startTime: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.workSchedule.endTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        workSchedule: {
                          ...formData.workSchedule,
                          endTime: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.workSchedule.hoursPerDay}
                    onChange={(e) => setFormData({
                      ...formData,
                      workSchedule: {
                        ...formData.workSchedule,
                        hoursPerDay: parseInt(e.target.value)
                      }
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Days
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <label key={index} className="flex flex-col items-center">
                        <input
                          type="checkbox"
                          checked={formData.workSchedule.workDays.includes(index)}
                          onChange={(e) => {
                            const newWorkDays = e.target.checked
                              ? [...formData.workSchedule.workDays, index]
                              : formData.workSchedule.workDays.filter(d => d !== index);
                            
                            setFormData({
                              ...formData,
                              workSchedule: {
                                ...formData.workSchedule,
                                workDays: newWorkDays
                              }
                            });
                          }}
                          className="mb-1"
                        />
                        <span className="text-xs text-gray-600">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Auto-Clocking Options</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={formData.autoClockingSettings.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        autoClockingSettings: {
                          ...formData.autoClockingSettings,
                          enabled: e.target.checked
                        }
                      })}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Auto-Clocking</span>
                  </label>
                </div>

                {formData.autoClockingSettings.enabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Choose Your Auto-Clocking Mode
                      </label>
                      <div className="space-y-4">
                        {Object.entries(AutoClockingOptions).map(([key, option]) => (
                          <div
                            key={key}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              formData.autoClockingSettings.processingMode === key
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setFormData({
                              ...formData,
                              autoClockingSettings: {
                                ...formData.autoClockingSettings,
                                processingMode: key as any
                              }
                            })}
                          >
                            <div className="flex items-start">
                              <input
                                type="radio"
                                name="processingMode"
                                checked={formData.autoClockingSettings.processingMode === key}
                                onChange={() => {}}
                                className="mt-1 mr-3"
                              />
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{option.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                <div className="mt-2 grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-xs font-medium text-green-800">Pros:</h4>
                                    <ul className="text-xs text-green-700 mt-1">
                                      {option.pros.map((pro, index) => (
                                        <li key={index}>• {pro}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-medium text-red-800">Cons:</h4>
                                    <ul className="text-xs text-red-700 mt-1">
                                      {option.cons.map((con, index) => (
                                        <li key={index}>• {con}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  <strong>Best for:</strong> {option.bestFor}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.autoClockingSettings.requiresApproval}
                          onChange={(e) => setFormData({
                            ...formData,
                            autoClockingSettings: {
                              ...formData.autoClockingSettings,
                              requiresApproval: e.target.checked
                            }
                          })}
                          className="mr-3"
                        />
                        <span className="text-sm text-gray-700">Require manager approval for auto-generated entries</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Review & Submit</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Basic Information</h3>
                  <p className="text-sm text-gray-600">PIN: {'•'.repeat(formData.pin.length)}</p>
                  <p className="text-sm text-gray-600">Timezone: {formData.timezone}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900">Work Schedule</h3>
                  <p className="text-sm text-gray-600">
                    {formData.workSchedule.startTime} - {formData.workSchedule.endTime} 
                    ({formData.workSchedule.hoursPerDay} hours/day)
                  </p>
                  <p className="text-sm text-gray-600">
                    Work days: {formData.workSchedule.workDays.map(d => 
                      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
                    ).join(', ')}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900">Auto-Clocking</h3>
                  {formData.autoClockingSettings.enabled ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Mode: {AutoClockingOptions[formData.autoClockingSettings.processingMode].title}
                      </p>
                      <p className="text-sm text-gray-600">
                        Requires Approval: {formData.autoClockingSettings.requiresApproval ? 'Yes' : 'No'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Disabled</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Your settings will be saved and sent for admin approval</li>
                  <li>2. You'll receive an email notification once approved</li>
                  <li>3. You can then log in and start using the system</li>
                  <li>4. Auto-clocking will begin once you're activated</li>
                </ol>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Invalid Setup Link</h2>
          <p className="text-gray-600">
            This setup link is invalid or has expired. Please contact your administrator for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to StaffClock Pro</h1>
          <p className="text-gray-600 mt-2">Complete your contractor setup to get started</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {SETUP_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.id}
                </div>
                {index < SETUP_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-medium text-gray-900">
              {SETUP_STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">{SETUP_STEPS[currentStep - 1].description}</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep < SETUP_STEPS.length ? (
            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}