'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface RouteGuardProps {
  children: ReactNode;
  requiredRoles?: ('admin' | 'staff' | 'manager' | 'contractor' | 'client_contact')[];
  fallbackPath?: string;
}

export default function RouteGuard({ 
  children, 
  requiredRoles = [], 
  fallbackPath = '/clockin' 
}: RouteGuardProps) {
  const { currentUser, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        if (pathname !== '/clockin') {
          router.push('/clockin');
        }
        return;
      }

      // If authenticated but doesn't have required role, show access denied or redirect
      if (requiredRoles.length > 0 && currentUser) {
        const hasRequiredRole = requiredRoles.includes(currentUser.role);
        if (!hasRequiredRole) {
          // For certain protected routes, redirect to fallback
          if (pathname === '/staff' && !['admin', 'manager'].includes(currentUser.role)) {
            router.push(fallbackPath);
            return;
          }
          
          if (pathname === '/reports' && !['admin', 'manager'].includes(currentUser.role)) {
            router.push(fallbackPath);
            return;
          }
        }
      }
    }
  }, [isAuthenticated, currentUser, loading, pathname, router, requiredRoles, fallbackPath]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button 
            onClick={() => router.push('/clockin')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRoles.length > 0 && currentUser) {
    const hasRequiredRole = requiredRoles.includes(currentUser.role);
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
              {requiredRoles.length === 1 
                ? ` This page requires ${requiredRoles[0]} role.`
                : ` This page requires one of: ${requiredRoles.join(', ')} roles.`
              }
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Current role: {currentUser.role}
            </p>
            <button 
              onClick={() => router.push(fallbackPath)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}