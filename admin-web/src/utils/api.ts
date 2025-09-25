const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

    return response.json();
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
    return apiRequest('/time-entries/clock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async clockOut(data: any = {}) {
    return apiRequest('/time-entries/clock-out', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEntries(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/time-entries${queryString ? `?${queryString}` : ''}`);
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
    return apiRequest('/tenant/info');
  },

  async updateTenantSettings(settings: any) {
    return apiRequest('/tenant/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
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