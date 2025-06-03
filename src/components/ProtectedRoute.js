import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [],
  fallback = null,
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { currentUserRole, hasAllPermissions, hasAnyPermission, isLoading: roleLoading } = useRole();

  // Show loading while authentication or role data is being fetched
  if (authLoading || (isAuthenticated && roleLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <LoadingSpinner message="Loading permissions..." size="large" />
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl sm:text-8xl mb-6">🔒</div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-8 text-base sm:text-lg leading-relaxed">
            You need to sign in to access this page. Please log in to continue.
          </p>
          <div className="flex justify-center">
            <a 
              href="/" 
              className="inline-flex items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation min-h-[48px] focus-mobile"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home & Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !requiredRoles.includes(currentUserRole)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl sm:text-8xl mb-6">⛔</div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4 text-base sm:text-lg leading-relaxed">
            Your current role (<strong>{currentUserRole}</strong>) doesn&rsquo;t have permission to access this page.
          </p>
          <p className="text-gray-500 mb-8 text-sm">
            Required roles: {requiredRoles.join(', ')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a 
              href="/" 
              className="inline-flex items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation min-h-[48px] w-full sm:w-auto focus-mobile"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </a>
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-h-[48px] w-full sm:w-auto focus-mobile"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl sm:text-8xl mb-6">🚫</div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            Insufficient Permissions
          </h1>
          <p className="text-gray-600 mb-4 text-base sm:text-lg leading-relaxed">
            You don&rsquo;t have the required permissions to access this page.
          </p>
          <p className="text-gray-500 mb-8 text-sm">
            Required permissions: {requiredPermissions.join(', ')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a 
              href="/" 
              className="inline-flex items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation min-h-[48px] w-full sm:w-auto focus-mobile"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </a>
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-h-[48px] w-full sm:w-auto focus-mobile"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return children;
};

export default ProtectedRoute; 