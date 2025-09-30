import { mockApi, shouldUseMockApi } from './mockApi';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Network error detection
let networkErrorDetected = false;
let backendAvailable = true;

// Store auth token
let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('authToken', token);
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

export const clearAuthToken = () => {
  authToken = null;
  clearTenant();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
};

// Tenant management
let currentTenant: any = null;

export const setCurrentTenant = (tenant: any) => {
  currentTenant = tenant;
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentTenant', JSON.stringify(tenant));
  }
};

export const getCurrentTenant = () => {
  if (currentTenant) return currentTenant;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentTenant');
    if (stored) {
      currentTenant = JSON.parse(stored);
      return currentTenant;
    }
  }
  return null;
};

export const clearTenant = () => {
  currentTenant = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentTenant');
  }
};

export const getTenantFromURL = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  if (!isLocalhost) {
    // Extract subdomain from hostname (e.g., tenant.example.com -> tenant)
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
  } else {
    // Extract from path for development (e.g., /tenant/dashboard -> tenant)
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] && !['api', 'auth', 'signup'].includes(pathParts[1])) {
      return pathParts[1];
    }
  }
  
  return null;
};

export const getTenantId = (): string | null => {
  const tenant = getCurrentTenant();
  return tenant?.id || null;
};

// API request wrapper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Add tenant context for development mode
  // Use test tenant subdomain for localhost development
  if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
    headers['X-Tenant-ID'] = 'test';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  async loginWithPin(pin: string, tenantSubdomain?: string) {
    // Check if we should use mock API first
    if (shouldUseMockApi() || networkErrorDetected) {
      try {
        return await mockApi.authenticateUser(pin);
      } catch (error) {
        // For authentication errors, don't log to console as they're expected user errors
        if (error instanceof Error && error.message === 'Invalid PIN') {
          throw new Error('Invalid PIN');
        }
        // For unexpected errors, log them
        console.error('Mock API authentication error:', error);
        throw new Error(error instanceof Error ? error.message : 'Authentication failed');
      }
    }

    try {
      const body: any = { pin };
      if (tenantSubdomain) {
        body.tenantSubdomain = tenantSubdomain;
      }

      const response = await fetch(`${API_BASE_URL}/auth/quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Login failed');
      }

      backendAvailable = true;
      return response.json();
    } catch (error: any) {
      console.warn('Backend authentication failed, trying mock API:', error.message);
      
      // If it's a network error, enable mock API
      if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        networkErrorDetected = true;
        backendAvailable = false;
        // Store in localStorage so it persists across page reloads
        if (typeof window !== 'undefined') {
          localStorage.setItem('useMockApi', 'true');
        }
        return mockApi.authenticateUser(pin);
      }
      
      throw error;
    }
  },

  async loginWithEmail(email: string, pin: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }

    return response.json();
  },

  async getProfile() {
    return apiRequest('/auth/profile');
  },
};

// Users API
export const usersAPI = {
  async getAll() {
    return apiRequest('/users');
  },

  async create(userData: any) {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async update(id: string, updates: any) {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string) {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Time Entries API
export const timeEntriesAPI = {
  async clockIn(data: any = {}) {
    if (shouldUseMockApi() || networkErrorDetected) {
      console.log('Using mock API for clock-in');
      return mockApi.clockIn(data.userId || 'user-3', data.userName || 'Test User', data.location);
    }

    try {
      const result = await apiRequest('/time-entries/clock-in', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      backendAvailable = true;
      return result;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        console.warn('Backend clock-in failed, using mock API');
        networkErrorDetected = true;
        return mockApi.clockIn(data.userId || 'user-3', data.userName || 'Test User', data.location);
      }
      throw error;
    }
  },

  async clockOut(data: any = {}) {
    if (shouldUseMockApi() || networkErrorDetected) {
      console.log('Using mock API for clock-out');
      return mockApi.clockOut(data.userId || 'user-3');
    }

    try {
      const result = await apiRequest('/time-entries/clock-out', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      backendAvailable = true;
      return result;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        console.warn('Backend clock-out failed, using mock API');
        networkErrorDetected = true;
        return mockApi.clockOut(data.userId || 'user-3');
      }
      throw error;
    }
  },

  async getEntries(params: any = {}) {
    if (shouldUseMockApi() || networkErrorDetected) {
      console.log('Using mock API for time entries');
      return mockApi.getTimeEntries(params.userId, params.days);
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const result = await apiRequest(`/time-entries${queryString ? `?${queryString}` : ''}`);
      backendAvailable = true;
      return result;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        console.warn('Backend time entries failed, using mock API');
        networkErrorDetected = true;
        return mockApi.getTimeEntries(params.userId, params.days);
      }
      throw error;
    }
  },

  async exportTimeEntries(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    const token = getAuthToken();
    const currentTenantId = getTenantId();
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (currentTenantId) {
      headers['X-Tenant-ID'] = currentTenantId;
    }
    
    const response = await fetch(`${API_BASE_URL}/exports/time-entries${queryString ? `?${queryString}` : ''}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },

  // Enhanced with tenant-aware filtering and approval functions
  async getEntriesForApproval(params: any = {}) {
    const queryString = new URLSearchParams({
      ...params,
      approvalStatus: 'pending',
      requiresApproval: 'true'
    }).toString();
    return apiRequest(`/time-entries${queryString ? `?${queryString}` : ''}`);
  },

  async approveTimeEntry(entryId: string, notes?: string) {
    return apiRequest(`/time-entries/${entryId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async rejectTimeEntry(entryId: string, reason: string) {
    return apiRequest(`/time-entries/${entryId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// Dashboard API  
export const dashboardAPI = {
  async getStats() {
    return apiRequest('/dashboard/stats');
  },
};

// Analytics API
export const analyticsAPI = {
  async getAnalytics(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/analytics${queryString ? `?${queryString}` : ''}`);
  },
};

// Exports API (updated for multi-tenant)
export const exportsAPI = {
  async exportTimeEntries(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    const token = getAuthToken();
    const currentTenantId = getTenantId();
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (currentTenantId) {
      headers['X-Tenant-ID'] = currentTenantId;
    }
    
    const response = await fetch(`${API_BASE_URL}/exports/time-entries${queryString ? `?${queryString}` : ''}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },
};

// Tenant API
export const tenantAPI = {
  async createTenant(tenantData: any) {
    // Tenant creation is public endpoint, no auth required
    const response = await fetch(`${API_BASE_URL}/tenant/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Tenant creation failed');
    }

    return response.json();
  },

  async getTenantInfo() {
    if (shouldUseMockApi() || networkErrorDetected) {
      console.log('Using mock API for tenant info');
      return mockApi.getTenantInfo();
    }

    try {
      const result = await apiRequest('/tenant/info');
      backendAvailable = true;
      return result;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        console.warn('Backend tenant info failed, using mock API');
        networkErrorDetected = true;
        return mockApi.getTenantInfo();
      }
      throw error;
    }
  },

  async updateTenantSettings(settings: any) {
    if (shouldUseMockApi() || networkErrorDetected) {
      console.log('Using mock API for tenant settings update');
      return mockApi.updateTenantSettings(settings);
    }

    try {
      const result = await apiRequest('/tenant/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      backendAvailable = true;
      return result;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
        console.warn('Backend tenant settings update failed, using mock API');
        networkErrorDetected = true;
        return mockApi.updateTenantSettings(settings);
      }
      throw error;
    }
  },

  async getSubscriptionPlans() {
    // Public endpoint
    const response = await fetch(`${API_BASE_URL}/tenant/plans`);
    if (!response.ok) {
      throw new Error('Failed to fetch subscription plans');
    }
    return response.json();
  },

  async getBusinessTypes() {
    // Public endpoint
    const response = await fetch(`${API_BASE_URL}/tenant/business-types`);
    if (!response.ok) {
      throw new Error('Failed to fetch business types');
    }
    return response.json();
  },

  async updateSubscription(subscriptionData: any) {
    return apiRequest('/tenant/subscription', {
      method: 'PUT',
      body: JSON.stringify(subscriptionData),
    });
  },
};

// Contractor API
export const contractorAPI = {
  async getDashboard() {
    return apiRequest('/contractor/dashboard');
  },

  async getAllContractors(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/contractor/contractors${queryString ? `?${queryString}` : ''}`);
  },

  async getContractorTimesheet(contractorId: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/contractor/${contractorId}/timesheet${queryString ? `?${queryString}` : ''}`);
  },

  async downloadContractorTimesheet(contractorId: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    const token = getAuthToken();
    const currentTenantId = getTenantId();
    
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (currentTenantId) {
      headers['X-Tenant-ID'] = currentTenantId;
    }
    
    const response = await fetch(
      `${API_BASE_URL}/contractor/${contractorId}/timesheet/download${queryString ? `?${queryString}` : ''}`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Download failed');
    }

    return response.blob();
  },

  async bulkApproveTimesheets(data: any) {
    return apiRequest('/contractor/timesheets/bulk-approve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async bulkRejectTimesheets(data: any) {
    return apiRequest('/contractor/timesheets/bulk-reject', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getContractorProjects(contractorId: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/contractor/${contractorId}/projects${queryString ? `?${queryString}` : ''}`);
  },

  async getContractorAnalytics(contractorId: string, params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/contractor/${contractorId}/analytics${queryString ? `?${queryString}` : ''}`);
  },
};