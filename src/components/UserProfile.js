import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = ({ 
  compact = false, 
  expanded = false, 
  mobile = false, 
  onClose 
}) => {
  // user object is now generic or null, fetchRepositories and repositories are removed from AuthContext
  const { user, logout, isAuthenticated } = useAuth(); 

  if (!isAuthenticated || !user) {
    // This check remains useful. If no user is authenticated, don't render anything.
    return null;
  }

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  // Generic user display (e.g., email or a placeholder if user object is very simple)
  const displayName = user?.email || user?.name || user?.id || 'User';
  const displayAvatarPlaceholder = displayName.charAt(0).toUpperCase();

  // Compact version for desktop header (simplified)
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Placeholder Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
          {displayAvatarPlaceholder}
        </div>
        <div className="hidden xl:block">
          <p className="text-sm font-medium text-gray-900 truncate max-w-24">
            {displayName}
          </p>
        </div>
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }

  // Expanded version for dropdown menu (simplified)
  if (expanded) {
    return (
      <div className="py-1">
        {/* User Info Header (simplified) */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Placeholder Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-semibold">
              {displayAvatarPlaceholder}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              {/* Additional generic user details could go here if available */}
            </div>
          </div>
        </div>

        {/* Actions (Sign Out only) */}
        <div className="py-1">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center touch-manipulation"
          >
            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Mobile version (simplified)
  if (mobile) {
    return (
      <div className="space-y-4">
        {/* User Info (simplified) */}
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
           {/* Placeholder Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-semibold">
            {displayAvatarPlaceholder}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900 truncate">
              {displayName}
            </p>
            {/* Additional generic user details */}
          </div>
        </div>

        {/* Actions (Sign Out only) */}
        <div className="space-y-2">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left bg-white border border-red-200 rounded-lg hover:bg-red-50 flex items-center space-x-3 touch-manipulation min-h-[48px]"
          >
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-base text-red-700">Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  // Fallback for default/legacy version (simplified, if rendered)
  // This default rendering path from the original component might not be hit often with compact/expanded/mobile props.
  // However, simplifying it as well for consistency.
  return (
    <div className={`relative`}> {/* Removed className prop as it's not in simplified version params */}
      <div 
        className="flex items-center space-x-3 cursor-pointer"
        // onClick prop removed, dropdown logic simplified or removed
      >
        {/* Placeholder Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
            {displayAvatarPlaceholder}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            {displayName}
          </p>
        </div>
        {/* Dropdown indicator SVG could be removed if no dropdown */}
      </div>

      {/* Dropdown Menu - Simplified to only show Sign Out or nothing if no other actions */}
      {/* The original component had isDropdownOpen state, which is removed. */}
      {/* For simplicity, if this default view is used, it implies a very basic display or just the logout button */}
      {/* Or, this section can be removed if the compact/expanded/mobile props always cover use cases */}
      <div className="py-1 mt-2 border-t">
        <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
        >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
        </button>
      </div>
    </div>
  );
};

// PropTypes can be simplified if props like showDropdown are removed
// import PropTypes from 'prop-types'; 
// UserProfile.propTypes = { ... };

export default UserProfile; 