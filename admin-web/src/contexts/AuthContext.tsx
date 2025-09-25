'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  authAPI, 
  usersAPI, 
  tenantAPI,
  setAuthToken, 
  clearAuthToken, 
  getAuthToken,
  setCurrentTenant,
  getCurrentTenant,
  getTenantFromURL,
  clearTenant
} from '../utils/api';

export interface User {
  id: string;
  tenantId?: string;
  name: string;
  role: 'admin' | 'staff' | 'manager' | 'contractor' | 'client_contact';
  email?: string;
  department?: string;
  position?: string;
  hourlyRate?: number;
  isActive: boolean;
  permissions?: string[];
  employmentType?: 'full_time' | 'part_time' | 'contractor' | 'intern';
  contractorInfo?: {
    businessName?: string;
    clients: string[];
    defaultProjectRate?: number;
    specializations: string[];
  };
  clientContactInfo?: {
    companyName: string;
    approvalAuthority: boolean;
    contractorsManaged: string[];
  };
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  businessType: 'retail' | 'restaurant' | 'office' | 'healthcare' | 'manufacturing' | 'contractors';
  subscription: {
    plan: string;
    status: string;
    features: string[];
  };
  settings: any;
}

export interface AuthContextType {
  // User & Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (pin: string, tenantSubdomain?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  adminLogin: (password: string) => Promise<{ success: boolean; error?: string }>;
  
  // Tenant context
  currentTenant: Tenant | null;
  switchTenant: (tenantData: Tenant) => void;
  
  // User management
  users: User[];
  contractors: User[];
  clientContacts: User[];
  addUser: (user: Omit<User, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Permissions & capabilities
  hasPermission: (permission: string) => boolean;
  canManageContractors: () => boolean;
  canApproveTimesheets: () => boolean;
  
  // State
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<User[]>([]);
  const [clientContacts, setClientContacts] = useState<User[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    // Check for existing session with multi-tenant support
    const checkExistingSession = async () => {
      try {
        const token = getAuthToken();
        const savedUser = localStorage.getItem('currentUser');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        const savedTenant = getCurrentTenant();
        
        if (token && savedUser && sessionExpiry) {
          const expiry = new Date(sessionExpiry);
          if (expiry > new Date()) {
            try {
              // Verify token is still valid
              const profile = await authAPI.getProfile();
              const user: User = {
                id: profile._id || profile.id,
                tenantId: profile.tenantId,
                name: profile.name,
                role: profile.role,
                email: profile.email,
                department: profile.department,
                position: profile.position,
                hourlyRate: profile.hourlyRate,
                isActive: profile.isActive !== false,
                permissions: profile.permissions || [],
                employmentType: profile.employmentType,
                contractorInfo: profile.contractorInfo,
                clientContactInfo: profile.clientContactInfo,
              };
              setCurrentUser(user);
              setIsAuthenticated(true);
              
              // Set tenant from saved data or fetch tenant info
              if (savedTenant) {
                setCurrentTenantState(savedTenant);
              } else if (profile.tenantId) {
                try {
                  const tenantInfo = await tenantAPI.getTenantInfo();
                  const tenant: Tenant = {
                    id: tenantInfo.tenant._id,
                    name: tenantInfo.tenant.name,
                    subdomain: tenantInfo.tenant.subdomain,
                    businessType: tenantInfo.tenant.businessType,
                    subscription: tenantInfo.tenant.subscription,
                    settings: tenantInfo.tenant.settings,
                  };
                  setCurrentTenant(tenant);
                  setCurrentTenantState(tenant);
                } catch (tenantError) {
                  console.warn('Failed to fetch tenant info:', tenantError);
                }
              }
            } catch (error) {
              console.error('Token validation failed:', error);
              // Token invalid, clear session
              logout();
            }
          } else {
            // Session expired
            console.log('Session expired, logging out');
            logout();
          }
        } else {
          // Try to resolve tenant from URL even without authentication
          const urlTenant = getTenantFromURL();
          if (urlTenant) {
            try {
              // Set a basic tenant context for login purposes
              setCurrentTenantState({ 
                id: '',
                name: urlTenant, 
                subdomain: urlTenant,
                businessType: 'office',
                subscription: { plan: 'basic', status: 'trial', features: [] },
                settings: {}
              });
            } catch (error) {
              console.warn('Could not resolve tenant from URL:', error);
            }
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    // Enhanced user loading with contractor and client contact support
    const loadUsers = async () => {
      if (isAuthenticated && currentUser && ['admin', 'manager', 'client_contact'].includes(currentUser.role)) {
        try {
          const apiUsers = await usersAPI.getAll();
          const formattedUsers: User[] = apiUsers.map((user: any) => ({
            id: user._id,
            tenantId: user.tenantId,
            name: user.name,
            role: user.role,
            email: user.email,
            department: user.department,
            position: user.position,
            hourlyRate: user.hourlyRate,
            isActive: user.isActive,
            permissions: user.permissions || [],
            employmentType: user.employmentType,
            contractorInfo: user.contractorInfo,
            clientContactInfo: user.clientContactInfo,
          }));
          
          // Separate users by role for easier access
          setUsers(formattedUsers);
          setContractors(formattedUsers.filter(user => user.role === 'contractor'));
          setClientContacts(formattedUsers.filter(user => user.role === 'client_contact'));
          
        } catch (error) {
          console.error('Failed to load users:', error);
          setError('Failed to load user data');
        }
      }
    };

    loadUsers();
  }, [isAuthenticated, currentUser]);

  // Listen for storage changes to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser' || e.key === 'isAuthenticated') {
        const savedUser = localStorage.getItem('currentUser');
        const isAuth = localStorage.getItem('isAuthenticated') === 'true';
        
        if (savedUser && isAuth) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    const handleAuthStateChange = (e: CustomEvent) => {
      setCurrentUser(e.detail.user);
      setIsAuthenticated(e.detail.isAuthenticated);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChange', handleAuthStateChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChange', handleAuthStateChange as EventListener);
    };
  }, []);

  const setSession = (user: User, duration: number = 8 * 60 * 60 * 1000) => { // 8 hours default
    const expiry = new Date(Date.now() + duration);
    
    // Store all session data
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('sessionExpiry', expiry.toISOString());
    localStorage.setItem('isAuthenticated', 'true');
    
    // Update state
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Dispatch custom event to sync across tabs/windows
    window.dispatchEvent(new CustomEvent('authStateChange', { 
      detail: { user, isAuthenticated: true } 
    }));
  };

  const login = async (pin: string, tenantSubdomain?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      clearError();
      
      // Use tenant-aware login endpoint
      const urlTenant = tenantSubdomain || getTenantFromURL();
      const response = await authAPI.loginWithPin(pin, urlTenant || undefined);

      if (response.token && response.user) {
        setAuthToken(response.token);
        
        const user: User = {
          id: response.user._id || response.user.id,
          tenantId: response.user.tenantId,
          name: response.user.name,
          role: response.user.role,
          email: response.user.email,
          department: response.user.department,
          position: response.user.position,
          hourlyRate: response.user.hourlyRate,
          isActive: response.user.isActive !== false,
          permissions: response.user.permissions || [],
          employmentType: response.user.employmentType,
          contractorInfo: response.user.contractorInfo,
          clientContactInfo: response.user.clientContactInfo,
        };
        
        // Handle tenant information
        if (response.tenant) {
          const tenant: Tenant = {
            id: response.tenant._id || response.tenant.id,
            name: response.tenant.name,
            subdomain: response.tenant.subdomain,
            businessType: response.tenant.businessType,
            subscription: response.tenant.subscription,
            settings: response.tenant.settings,
          };
          setCurrentTenant(tenant);
          setCurrentTenantState(tenant);
        }
        
        setSession(user);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      if (error.message) {
        if (error.message.includes('Too many')) {
          errorMessage = 'Too many login attempts. Please wait and try again.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'Invalid PIN. Please try again.';
        } else if (error.message.includes('tenant context')) {
          errorMessage = 'Please check your URL or select the correct organization.';
        } else if (error.message.includes('tenant mismatch')) {
          errorMessage = 'Access denied - please login through the correct organization URL.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      clearError();
      const response = await authAPI.loginWithEmail('admin@yourcompany.com', password);
      if (response.token && response.user) {
        setAuthToken(response.token);
        const user: User = {
          id: response.user.id,
          name: response.user.name,
          role: response.user.role,
          email: response.user.email,
          department: response.user.department,
          isActive: true,
        };
        setSession(user, 4 * 60 * 60 * 1000); // 4 hours for admin
        return { success: true };
      }
      return { success: false, error: 'Admin login failed' };
    } catch (error: any) {
      console.error('Admin login error:', error);
      let errorMessage = 'Admin login failed';
      
      if (error.message) {
        if (error.message.includes('Too many')) {
          errorMessage = 'Too many login attempts. Please wait and try again.';
        } else if (error.message.includes('Invalid') || error.message.includes('Unauthorized')) {
          errorMessage = 'Invalid admin credentials. Please try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    // Clear all session data including tenant data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('isAuthenticated');
    clearAuthToken(); // This also calls clearTenant()
    
    // Update state
    setCurrentUser(null);
    setCurrentTenantState(null);
    setIsAuthenticated(false);
    setUsers([]);
    setContractors([]);
    setClientContacts([]);
    clearError();
    
    // Dispatch custom event to sync across tabs/windows
    window.dispatchEvent(new CustomEvent('authStateChange', { 
      detail: { user: null, isAuthenticated: false } 
    }));
  };

  const switchTenant = (tenantData: Tenant) => {
    setCurrentTenant(tenantData);
    setCurrentTenantState(tenantData);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.permissions?.includes(permission) || false;
  };

  const canManageContractors = (): boolean => {
    if (!currentUser) return false;
    return ['admin', 'manager', 'client_contact'].includes(currentUser.role) &&
           (currentUser.role === 'admin' || 
            hasPermission('contractor_oversight') ||
            hasPermission('team_management'));
  };

  const canApproveTimesheets = (): boolean => {
    if (!currentUser) return false;
    if (['admin', 'manager'].includes(currentUser.role)) return true;
    return currentUser.role === 'client_contact' && 
           currentUser.clientContactInfo?.approvalAuthority === true;
  };

  const addUser = async (userData: Omit<User, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
      clearError();
      const newUser = await usersAPI.create(userData);
      const formattedUser: User = {
        id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
        department: newUser.department,
        hourlyRate: newUser.hourlyRate,
        isActive: newUser.isActive,
      };
      setUsers(prev => [...prev, formattedUser]);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to add user:', error);
      let errorMessage = 'Failed to add user';
      
      if (error.message) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'User with this email already exists.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Please check all required fields.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      clearError();
      const updatedUser = await usersAPI.update(id, updates);
      const formattedUser: User = {
        id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
        email: updatedUser.email,
        department: updatedUser.department,
        hourlyRate: updatedUser.hourlyRate,
        isActive: updatedUser.isActive,
      };
      
      setUsers(prev => prev.map(user => user.id === id ? formattedUser : user));
      
      // Update current user if it's the same user
      if (currentUser?.id === id) {
        setCurrentUser(formattedUser);
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update user:', error);
      let errorMessage = 'Failed to update user';
      
      if (error.message) {
        if (error.message.includes('not found')) {
          errorMessage = 'User not found.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Please check all required fields.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      clearError();
      await usersAPI.delete(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      
      // Logout if current user is deleted
      if (currentUser?.id === id) {
        logout();
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      let errorMessage = 'Failed to delete user';
      
      if (error.message) {
        if (error.message.includes('not found')) {
          errorMessage = 'User not found.';
        } else if (error.message.includes('Cannot delete')) {
          errorMessage = 'Cannot delete this user.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value: AuthContextType = {
    // User & Auth
    currentUser,
    isAuthenticated,
    login,
    logout,
    adminLogin,
    
    // Tenant context
    currentTenant,
    switchTenant,
    
    // User management
    users,
    contractors,
    clientContacts,
    addUser,
    updateUser,
    deleteUser,
    
    // Permissions & capabilities
    hasPermission,
    canManageContractors,
    canApproveTimesheets,
    
    // State
    loading,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}