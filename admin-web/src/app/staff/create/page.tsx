'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface EmploymentType {
  _id: string;
  name: string;
  code: string;
  category: string;
  classification: string;
  displayName: string;
  workHourRules: {
    standardHoursPerWeek: number;
    maxHoursPerDay: number;
    maxHoursPerWeek: number;
    overtimeThreshold: {
      daily?: number;
      weekly?: number;
    };
  };
  schedulingRules: {
    flexibleScheduling: boolean;
    remoteWorkAllowed: boolean;
    weekendWorkAllowed: boolean;
  };
  entitlements: {
    paidTimeOff: {
      annualLeaveDays: number;
      sickLeaveDays: number;
      personalLeaveDays: number;
    };
  };
  isDefault: boolean;
}

const CreateStaffPage = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<EmploymentType | null>(null);

  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    email: '',
    pin: '',
    confirmPin: '',
    phone: '',
    employeeId: '',
    
    // Employment Details
    employmentTypeId: '',
    employmentStatus: 'active',
    hireDate: new Date().toISOString().split('T')[0],
    department: '',
    position: '',
    manager: '',
    
    // Compensation
    hourlyRate: '',
    salaryAmount: '',
    currency: 'USD',
    
    // Work Schedule
    workSchedule: {
      standardHoursPerWeek: 40,
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'America/New_York',
      flexibleScheduling: false,
      remoteWorkDays: [] as number[]
    },
    
    // Compliance
    compliance: {
      backgroundCheckRequired: false,
      drugTestingRequired: false,
      workEligibilityVerified: false
    }
  });

  useEffect(() => {
    fetchEmploymentTypes();
  }, [token]);

  const fetchEmploymentTypes = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/employment-types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmploymentTypes(data.employmentTypes);
        
        // Set default employment type
        const defaultType = data.employmentTypes.find((type: EmploymentType) => type.isDefault);
        if (defaultType) {
          handleEmploymentTypeChange(defaultType._id);
        }
      } else {
        setError('Failed to fetch employment types');
      }
    } catch (err) {
      setError('Failed to fetch employment types');
      console.error('Error fetching employment types:', err);
    }
  };

  const handleEmploymentTypeChange = (employmentTypeId: string) => {
    const employmentType = employmentTypes.find(type => type._id === employmentTypeId);
    if (employmentType) {
      setSelectedEmploymentType(employmentType);
      setFormData(prev => ({
        ...prev,
        employmentTypeId,
        workSchedule: {
          ...prev.workSchedule,
          standardHoursPerWeek: employmentType.workHourRules.standardHoursPerWeek,
          flexibleScheduling: employmentType.schedulingRules.flexibleScheduling,
          remoteWorkDays: employmentType.schedulingRules.remoteWorkAllowed ? prev.workSchedule.remoteWorkDays : []
        }
      }));
    }
  };

  const handleWorkDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        workDays: prev.workSchedule.workDays.includes(day)
          ? prev.workSchedule.workDays.filter(d => d !== day)
          : [...prev.workSchedule.workDays, day].sort()
      }
    }));
  };

  const handleRemoteWorkDayToggle = (day: number) => {
    if (!selectedEmploymentType?.schedulingRules.remoteWorkAllowed) return;
    
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        remoteWorkDays: prev.workSchedule.remoteWorkDays.includes(day)
          ? prev.workSchedule.remoteWorkDays.filter(d => d !== day)
          : [...prev.workSchedule.remoteWorkDays, day].sort()
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    if (!formData.employmentTypeId) {
      setError('Please select an employment type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          salaryAmount: formData.salaryAmount ? parseFloat(formData.salaryAmount) : undefined,
          hireDate: new Date(formData.hireDate),
          // Initialize leave balances based on employment type
          leaveBalances: selectedEmploymentType ? {
            annualLeave: {
              available: selectedEmploymentType.entitlements.paidTimeOff.annualLeaveDays,
              used: 0
            },
            sickLeave: {
              available: selectedEmploymentType.entitlements.paidTimeOff.sickLeaveDays,
              used: 0
            },
            personalLeave: {
              available: selectedEmploymentType.entitlements.paidTimeOff.personalLeaveDays,
              used: 0
            },
            lastUpdated: new Date()
          } : undefined
        })
      });

      if (response.ok) {
        router.push('/staff?message=user_created');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create staff member');
      }
    } catch (err) {
      setError('Failed to create staff member. Please try again.');
      console.error('Error creating staff member:', err);
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Staff Member</h1>
        <p className="text-gray-600">Add a new team member with HR compliance and employment type configuration</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN (4-6 digits) *
              </label>
              <input
                type="password"
                required
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
                pattern="[0-9]{4,6}"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPin}
                onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional unique identifier"
              />
            </div>
          </div>
        </div>

        {/* Employment Type Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employment Type & Classification</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employment Type *
            </label>
            <select
              required
              value={formData.employmentTypeId}
              onChange={(e) => handleEmploymentTypeChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Employment Type</option>
              {employmentTypes.map(type => (
                <option key={type._id} value={type._id}>
                  {type.displayName} - {type.category}
                </option>
              ))}
            </select>
          </div>
          
          {selectedEmploymentType && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Employment Type Details</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <div>
                  <strong>Standard Hours:</strong> {selectedEmploymentType.workHourRules.standardHoursPerWeek} hours/week
                  ({selectedEmploymentType.workHourRules.maxHoursPerDay} hours/day max)
                </div>
                <div>
                  <strong>Overtime:</strong> After {selectedEmploymentType.workHourRules.overtimeThreshold.daily || 8} hours/day 
                  or {selectedEmploymentType.workHourRules.overtimeThreshold.weekly || 40} hours/week
                </div>
                <div>
                  <strong>Leave Entitlement:</strong> {selectedEmploymentType.entitlements.paidTimeOff.annualLeaveDays} annual, 
                  {selectedEmploymentType.entitlements.paidTimeOff.sickLeaveDays} sick, 
                  {selectedEmploymentType.entitlements.paidTimeOff.personalLeaveDays} personal days
                </div>
                <div>
                  <strong>Flexible Schedule:</strong> {selectedEmploymentType.schedulingRules.flexibleScheduling ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Remote Work:</strong> {selectedEmploymentType.schedulingRules.remoteWorkAllowed ? 'Allowed' : 'Not Allowed'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Employment Details */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hire Date *
              </label>
              <input
                type="date"
                required
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Status
              </label>
              <select
                value={formData.employmentStatus}
                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position/Job Title
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Compensation */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Salary ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Work Schedule */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours per Week
              </label>
              <input
                type="number"
                min="1"
                max="80"
                value={formData.workSchedule.standardHoursPerWeek}
                onChange={(e) => setFormData({
                  ...formData,
                  workSchedule: { ...formData.workSchedule, standardHoursPerWeek: parseInt(e.target.value) }
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.workSchedule.startTime}
                onChange={(e) => setFormData({
                  ...formData,
                  workSchedule: { ...formData.workSchedule, startTime: e.target.value }
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
                  workSchedule: { ...formData.workSchedule, endTime: e.target.value }
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={formData.workSchedule.timezone}
                onChange={(e) => setFormData({
                  ...formData,
                  workSchedule: { ...formData.workSchedule, timezone: e.target.value }
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Work Days
              </label>
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((day, index) => (
                  <label key={index} className="flex flex-col items-center">
                    <input
                      type="checkbox"
                      checked={formData.workSchedule.workDays.includes(index)}
                      onChange={() => handleWorkDayToggle(index)}
                      className="mb-1"
                    />
                    <span className="text-xs text-gray-600">{day}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {selectedEmploymentType?.schedulingRules.remoteWorkAllowed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Remote Work Days (Optional)
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <label key={index} className="flex flex-col items-center">
                      <input
                        type="checkbox"
                        checked={formData.workSchedule.remoteWorkDays.includes(index)}
                        onChange={() => handleRemoteWorkDayToggle(index)}
                        disabled={!formData.workSchedule.workDays.includes(index)}
                        className="mb-1"
                      />
                      <span className="text-xs text-gray-600">{day}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select which work days can be performed remotely
                </p>
              </div>
            )}
            
            {selectedEmploymentType?.schedulingRules.flexibleScheduling && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.workSchedule.flexibleScheduling}
                    onChange={(e) => setFormData({
                      ...formData,
                      workSchedule: { ...formData.workSchedule, flexibleScheduling: e.target.checked }
                    })}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Enable flexible scheduling</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Allows employee to adjust start/end times within employment type limits
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">HR Compliance</h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.compliance.backgroundCheckRequired}
                onChange={(e) => setFormData({
                  ...formData,
                  compliance: { ...formData.compliance, backgroundCheckRequired: e.target.checked }
                })}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Background check completed</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.compliance.drugTestingRequired}
                onChange={(e) => setFormData({
                  ...formData,
                  compliance: { ...formData.compliance, drugTestingRequired: e.target.checked }
                })}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Drug testing completed</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.compliance.workEligibilityVerified}
                onChange={(e) => setFormData({
                  ...formData,
                  compliance: { ...formData.compliance, workEligibilityVerified: e.target.checked }
                })}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">Work eligibility verified (I-9, etc.)</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Staff Member'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateStaffPage;