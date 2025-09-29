'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/utils/api';

interface User {
  _id: string;
  name: string;
  department: string;
  position: string;
  employmentTypeId: string;
  employmentStatus: string;
  workSchedule: {
    standardHoursPerWeek: number;
    workDays: number[];
    startTime: string;
    endTime: string;
    flexibleScheduling: boolean;
  };
}

interface EmploymentType {
  _id: string;
  name: string;
  workHourRules: {
    standardHoursPerWeek: number;
    maxHoursPerDay: number;
    maxHoursPerWeek: number;
  };
  schedulingRules: {
    maxConsecutiveDays: number;
    minRestDaysPerWeek: number;
    advanceNoticeRequired: number;
    flexibleScheduling: boolean;
    earliestStartTime?: string;
    latestEndTime?: string;
    weekendWorkAllowed: boolean;
    nightShiftAllowed: boolean;
  };
}

interface ShiftValidation {
  canSchedule: boolean;
  conflicts: {
    type: string;
    message: string;
  }[];
  recommendations: string[];
}

interface Shift {
  _id?: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  department: string;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'no-show' | 'cancelled';
  isHRCompliant?: boolean;
  hrValidation?: ShiftValidation;
}

interface HRCompliantShiftSchedulerProps {
  selectedDate: Date;
  onShiftCreated: (shift: Shift) => void;
  onShiftUpdated: (shift: Shift) => void;
  existingShifts: Shift[];
}

const HRCompliantShiftScheduler: React.FC<HRCompliantShiftSchedulerProps> = ({
  selectedDate,
  onShiftCreated,
  onShiftUpdated,
  existingShifts
}) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  
  const [shiftForm, setShiftForm] = useState({
    userId: '',
    startTime: '09:00',
    endTime: '17:00',
    position: '',
    department: '',
    notes: ''
  });
  
  const [validation, setValidation] = useState<ShiftValidation | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchEmploymentTypes();
  }, [currentUser]);

  useEffect(() => {
    if (shiftForm.userId && shiftForm.startTime && shiftForm.endTime) {
      validateShift();
    } else {
      setValidation(null);
    }
  }, [shiftForm.userId, shiftForm.startTime, shiftForm.endTime, selectedDate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users?employmentStatus=active`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchEmploymentTypes = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/employment-types`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmploymentTypes(data.employmentTypes || []);
      }
    } catch (err) {
      console.error('Error fetching employment types:', err);
    }
  };

  const validateShift = async () => {
    if (!shiftForm.userId || !shiftForm.startTime || !shiftForm.endTime) return;
    
    setValidating(true);
    
    try {
      const startDateTime = new Date(selectedDate);
      const [startHour, startMin] = shiftForm.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin, 0, 0);
      
      const endDateTime = new Date(selectedDate);
      const [endHour, endMin] = shiftForm.endTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMin, 0, 0);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/validate-shift-scheduling`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: shiftForm.userId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setValidation(data.validation);
      } else {
        const errorData = await response.json();
        setError(errorData.error);
      }
    } catch (err) {
      console.error('Error validating shift:', err);
      setError('Failed to validate shift');
    } finally {
      setValidating(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u._id === userId);
    setSelectedUser(user || null);
    
    if (user) {
      setShiftForm(prev => ({
        ...prev,
        userId,
        department: user.department || prev.department,
        position: user.position || prev.position,
        // Set default times from user's work schedule
        startTime: user.workSchedule?.startTime || prev.startTime,
        endTime: user.workSchedule?.endTime || prev.endTime
      }));
    } else {
      setShiftForm(prev => ({ ...prev, userId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation?.canSchedule) {
      setError('Cannot schedule shift due to HR compliance violations. Please resolve conflicts first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const startDateTime = new Date(selectedDate);
      const [startHour, startMin] = shiftForm.startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMin, 0, 0);
      
      const endDateTime = new Date(selectedDate);
      const [endHour, endMin] = shiftForm.endTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMin, 0, 0);
      
      const newShift: Shift = {
        userId: shiftForm.userId,
        date: selectedDate.toISOString().split('T')[0],
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        position: shiftForm.position,
        department: shiftForm.department,
        notes: shiftForm.notes,
        status: 'scheduled',
        isHRCompliant: true,
        hrValidation: validation
      };
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/shifts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newShift)
      });
      
      if (response.ok) {
        const data = await response.json();
        onShiftCreated(data.shift);
        
        // Reset form
        setShiftForm({
          userId: '',
          startTime: '09:00',
          endTime: '17:00',
          position: '',
          department: '',
          notes: ''
        });
        setValidation(null);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create shift');
      }
    } catch (err) {
      setError('Failed to create shift. Please try again.');
      console.error('Error creating shift:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmploymentTypeForUser = (userId: string): EmploymentType | null => {
    const user = users.find(u => u._id === userId);
    if (!user) return null;
    
    return employmentTypes.find(et => et._id === user.employmentTypeId) || null;
  };

  const formatDuration = (startTime: string, endTime: string): string => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Schedule Shift - {selectedDate.toLocaleDateString()}
        {isWeekend(selectedDate) && (
          <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
            Weekend
          </span>
        )}
      </h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee *
          </label>
          <select
            required
            value={shiftForm.userId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Employee</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name} - {user.department} ({user.position})
              </option>
            ))}
          </select>
        </div>

        {/* Employee Info Display */}
        {selectedUser && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <strong>Standard Hours:</strong> {selectedUser.workSchedule?.standardHoursPerWeek || 'N/A'} hours/week
              </div>
              <div>
                <strong>Regular Schedule:</strong> {selectedUser.workSchedule?.startTime || 'N/A'} - {selectedUser.workSchedule?.endTime || 'N/A'}
              </div>
              <div>
                <strong>Work Days:</strong> {selectedUser.workSchedule?.workDays ? 
                  selectedUser.workSchedule.workDays.map(day => 
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                  ).join(', ') : 'N/A'}
              </div>
              <div>
                <strong>Flexible Scheduling:</strong> {selectedUser.workSchedule?.flexibleScheduling ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}

        {/* Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={shiftForm.startTime}
              onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time *
            </label>
            <input
              type="time"
              required
              value={shiftForm.endTime}
              onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <strong>Duration:</strong> {formatDuration(shiftForm.startTime, shiftForm.endTime)}
            </div>
          </div>
        </div>

        {/* Position and Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <input
              type="text"
              value={shiftForm.position}
              onChange={(e) => setShiftForm({ ...shiftForm, position: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Sales Associate"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              value={shiftForm.department}
              onChange={(e) => setShiftForm({ ...shiftForm, department: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Sales"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            rows={2}
            value={shiftForm.notes}
            onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional notes about this shift"
          />
        </div>

        {/* HR Validation Results */}
        {validating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800">Validating shift against HR policies...</span>
            </div>
          </div>
        )}

        {validation && (
          <div className={`border rounded-lg p-4 ${
            validation.canSchedule 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                validation.canSchedule ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <h4 className={`font-medium ${
                validation.canSchedule ? 'text-green-900' : 'text-red-900'
              }`}>
                HR Compliance Check
              </h4>
            </div>
            
            {validation.conflicts.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-red-900 mb-1">Conflicts:</h5>
                <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                  {validation.conflicts.map((conflict, index) => (
                    <li key={index}>{conflict.message}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation.recommendations.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-900 mb-1">Recommendations:</h5>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  {validation.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || validating || (validation ? !validation.canSchedule : false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Schedule Shift'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HRCompliantShiftScheduler;