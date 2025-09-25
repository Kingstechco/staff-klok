/**
 * Multi-tenant routing utilities
 * Handles tenant-aware URL generation and navigation
 */

import { getTenantFromURL } from './api';

export interface RouteOptions {
  tenantSubdomain?: string;
  preserveTenant?: boolean;
}

/**
 * Generate a tenant-aware URL
 */
export const generateTenantUrl = (path: string, options: RouteOptions = {}): string => {
  const { tenantSubdomain, preserveTenant = true } = options;
  
  if (typeof window === 'undefined') {
    return path; // Server-side rendering fallback
  }

  let subdomain = tenantSubdomain;
  
  if (preserveTenant && !subdomain) {
    subdomain = getTenantFromURL() || undefined;
  }

  // If we have a subdomain and current host supports it
  if (subdomain && subdomain !== 'default') {
    const currentHost = window.location.hostname;
    const isLocalhost = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
    
    if (!isLocalhost) {
      // Production: use subdomain.domain.com
      const baseDomain = currentHost.split('.').slice(-2).join('.');
      return `https://${subdomain}.${baseDomain}${path}`;
    } else {
      // Development: use path-based routing
      return `/${subdomain}${path}`;
    }
  }

  return path;
};

/**
 * Navigate to a tenant-aware route
 */
export const navigateToTenantRoute = (path: string, options: RouteOptions = {}): void => {
  if (typeof window === 'undefined') return;
  
  const url = generateTenantUrl(path, options);
  window.location.href = url;
};

/**
 * Get current tenant context from various sources
 */
export const getTenantContext = (): {
  subdomain: string | null;
  isMultiTenant: boolean;
  loginUrl: string;
  baseUrl: string;
} => {
  if (typeof window === 'undefined') {
    return {
      subdomain: null,
      isMultiTenant: false,
      loginUrl: '/login',
      baseUrl: ''
    };
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  let subdomain: string | null = null;
  
  if (!isLocalhost) {
    // Extract subdomain from hostname
    const parts = hostname.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  } else {
    // Extract from path for development
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] && !['api', 'auth', 'signup'].includes(pathParts[1])) {
      subdomain = pathParts[1];
    }
  }

  const isMultiTenant = !!subdomain && subdomain !== 'www';
  
  return {
    subdomain,
    isMultiTenant,
    loginUrl: isMultiTenant ? generateTenantUrl('/login') : '/login',
    baseUrl: isMultiTenant ? generateTenantUrl('/') : '/'
  };
};

/**
 * Validate tenant subdomain format
 */
export const validateTenantSubdomain = (subdomain: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!subdomain) {
    errors.push('Subdomain is required');
    return { isValid: false, errors };
  }

  if (subdomain.length < 2) {
    errors.push('Subdomain must be at least 2 characters long');
  }

  if (subdomain.length > 50) {
    errors.push('Subdomain cannot exceed 50 characters');
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    errors.push('Subdomain can only contain lowercase letters, numbers, and hyphens');
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    errors.push('Subdomain cannot start or end with a hyphen');
  }

  // Reserved subdomains
  const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'support', 'help', 'docs', 'dev', 'test', 'staging'];
  if (reserved.includes(subdomain)) {
    errors.push(`"${subdomain}" is a reserved subdomain`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Redirect to login with tenant context
 */
export const redirectToLogin = (returnUrl?: string): void => {
  const { loginUrl } = getTenantContext();
  const params = new URLSearchParams();
  
  if (returnUrl) {
    params.set('return', returnUrl);
  } else if (typeof window !== 'undefined') {
    params.set('return', window.location.pathname);
  }

  const url = params.toString() ? `${loginUrl}?${params.toString()}` : loginUrl;
  
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
};

/**
 * Handle tenant switching
 */
export const switchTenant = (newSubdomain: string, currentPath?: string): void => {
  const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const url = generateTenantUrl(path, { tenantSubdomain: newSubdomain });
  
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
};

/**
 * Get organization signup URL
 */
export const getSignupUrl = (): string => {
  if (typeof window === 'undefined') return '/signup';
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  if (!isLocalhost) {
    // Production: redirect to main domain signup
    const baseDomain = hostname.split('.').slice(-2).join('.');
    return `https://${baseDomain}/signup`;
  }
  
  return '/signup';
};

/**
 * Check if current request is for a valid tenant route
 */
export const isValidTenantRoute = async (subdomain: string): Promise<boolean> => {
  if (!subdomain || subdomain === 'www') return false;
  
  try {
    // This would typically make an API call to validate the subdomain
    // For now, we'll do basic validation
    const validation = validateTenantSubdomain(subdomain);
    return validation.isValid;
  } catch (error) {
    console.warn('Failed to validate tenant route:', error);
    return false;
  }
};

/**
 * Multi-tenant Next.js middleware helper
 */
export const handleTenantRouting = (request: Request) => {
  if (typeof window !== 'undefined') return; // Client-side only runs in middleware
  
  const url = new URL(request.url);
  const hostname = url.hostname;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  if (!isLocalhost) {
    // Extract subdomain from hostname
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const subdomain = parts[0];
      
      // Add tenant context to headers
      const headers = new Headers(request.headers);
      headers.set('x-tenant-subdomain', subdomain);
      
      return { subdomain, headers };
    }
  }
  
  return null;
};