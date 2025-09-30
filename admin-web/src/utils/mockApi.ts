// Mock API for testing when backend is not available
export const mockUsers = [
  {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@test.com',
    pin: '1234',
    role: 'admin',
    tenantId: 'test-tenant'
  },
  {
    id: 'user-2',
    name: 'Manager User',
    email: 'manager@test.com',
    pin: '2345',
    role: 'manager',
    tenantId: 'test-tenant'
  },
  {
    id: 'user-3',
    name: 'Staff User',
    email: 'staff@test.com',
    pin: '3456',
    role: 'staff',
    tenantId: 'test-tenant'
  }
];

export const mockTenant = {
  id: 'test-tenant',
  name: 'Test Oklok Company',
  businessType: 'office',
  timezone: 'America/New_York',
  currency: 'USD',
  settings: {
    workHours: {
      standardDaily: 8,
      standardWeekly: 40,
      overtimeThreshold: 8,
      workweekStart: 'monday'
    },
    breaks: {
      requireBreaks: true,
      minimumShiftForBreak: 4,
      breakDuration: 15,
      lunchThreshold: 6,
      lunchDuration: 30
    },
    location: {
      enforceGeofencing: false,
      allowMobileClocking: true,
      requireLocationForClocking: false
    },
    approvals: {
      requireManagerApproval: false,
      allowSelfEdit: true
    }
  },
  contactInfo: {
    primaryContactName: 'Test Contact',
    primaryContactEmail: 'contact@test.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345'
  }
};

export const mockTimeEntries = [
  {
    id: 'entry-1',
    userId: 'user-3',
    tenantId: 'test-tenant',
    clockIn: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    clockOut: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    totalHours: 3.5,
    status: 'completed',
    date: new Date().toISOString().split('T')[0]
  }
];

// Mock API functions
export const mockApi = {
  async authenticateUser(pin: string) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    const user = mockUsers.find(u => u.pin === pin);
    if (!user) {
      // Return error object instead of throwing
      return {
        success: false,
        error: 'Invalid PIN',
        message: 'Invalid PIN'
      };
    }
    
    return {
      success: true,
      user,
      tenant: mockTenant,
      token: 'mock-jwt-token'
    };
  },

  async getTenantInfo() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      success: true,
      tenant: mockTenant
    };
  },

  async updateTenantSettings(settings: any) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      message: 'Settings updated successfully'
    };
  },

  async clockIn(userId: string, userName: string, location?: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Check if already clocked in
    const activeEntry = mockTimeEntries.find(e => e.userId === userId && (!e.clockOut || e.clockOut === ''));
    if (activeEntry) {
      throw new Error('Already clocked in');
    }
    
    const newEntry = {
      id: `entry-${Date.now()}`,
      userId,
      tenantId: 'test-tenant',
      clockIn: new Date().toISOString(),
      clockOut: '',
      totalHours: 0,
      status: 'active',
      date: new Date().toISOString().split('T')[0]
    };
    
    mockTimeEntries.push(newEntry);
    return {
      success: true,
      entry: newEntry
    };
  },

  async clockOut(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const activeEntry = mockTimeEntries.find(e => e.userId === userId && (!e.clockOut || e.clockOut === ''));
    if (!activeEntry) {
      throw new Error('No active clock-in found');
    }
    
    const clockOutTime = new Date();
    const clockInTime = new Date(activeEntry.clockIn);
    const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    activeEntry.clockOut = clockOutTime.toISOString();
    activeEntry.totalHours = Math.round(totalHours * 100) / 100;
    activeEntry.status = 'completed';
    
    return {
      success: true,
      entry: activeEntry
    };
  },

  async getTimeEntries(userId?: string, days?: number) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let entries = [...mockTimeEntries];
    
    if (userId) {
      entries = entries.filter(e => e.userId === userId);
    }
    
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      entries = entries.filter(e => new Date(e.clockIn) >= cutoff);
    }
    
    return {
      success: true,
      entries
    };
  }
};

// Check if we should use mock API
export const shouldUseMockApi = () => {
  // Use mock API if:
  // 1. We're in development and backend is not available
  // 2. NEXT_PUBLIC_USE_MOCK_API is set to true
  return process.env.NODE_ENV === 'development' && 
         (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' || 
          typeof window !== 'undefined' && localStorage.getItem('useMockApi') === 'true');
};