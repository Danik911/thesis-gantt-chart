import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = ({ 
  showDropdown = true, 
  className = '', 
  compact = false, 
  expanded = false, 
  mobile = false, 
  onClose 
}) => {
  const { user, logout, isAuthenticated, fetchRepositories, repositories } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showRepositories, setShowRepositories] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    if (onClose) onClose();
  };

  const handleFetchRepositories = async () => {
    try {
      await fetchRepositories();
      setShowRepositories(true);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAction = (action) => {
    action();
    if (onClose) onClose();
  };

  // Compact version for desktop header
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <img
          src={user.avatar_url}
          alt={`${user.login}'s avatar`}
          className="w-8 h-8 rounded-full border-2 border-gray-300"
        />
        <div className="hidden xl:block">
          <p className="text-sm font-medium text-gray-900 truncate max-w-24">
            {user.name || user.login}
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

  // Expanded version for dropdown menu
  if (expanded) {
    return (
      <div className="py-1">
        {/* User Info Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar_url}
              alt={`${user.login}'s avatar`}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || user.login}
              </p>
              <p className="text-xs text-gray-500 truncate">@{user.login}</p>
              {user.email && (
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {user.public_repos || 0}
              </p>
              <p className="text-xs text-gray-500">Repositories</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {user.followers || 0}
              </p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">
          <button
            onClick={() => handleAction(handleFetchRepositories)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center touch-manipulation"
          >
            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            View Repositories
          </button>

          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center touch-manipulation"
          >
            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View GitHub Profile
          </a>

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

  // Mobile version
  if (mobile) {
    return (
      <div className="space-y-4">
        {/* User Info */}
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <img
            src={user.avatar_url}
            alt={`${user.login}'s avatar`}
            className="w-12 h-12 rounded-full border-2 border-gray-300"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900 truncate">
              {user.name || user.login}
            </p>
            <p className="text-sm text-gray-500 truncate">@{user.login}</p>
            {user.email && (
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            )}
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xl font-semibold text-gray-900">
              {user.public_repos || 0}
            </p>
            <p className="text-sm text-gray-500">Repositories</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xl font-semibold text-gray-900">
              {user.followers || 0}
            </p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => handleAction(handleFetchRepositories)}
            className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center space-x-3 touch-manipulation min-h-[48px]"
          >
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-base text-gray-700">View Repositories</span>
          </button>

          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center space-x-3 touch-manipulation min-h-[48px]"
          >
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="text-base text-gray-700">View GitHub Profile</span>
          </a>

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

  // Default/Legacy version
  return (
    <div className={`relative ${className}`}>
      {/* User Avatar and Name */}
      <div 
        className="flex items-center space-x-3 cursor-pointer"
        onClick={showDropdown ? toggleDropdown : undefined}
      >
        <img
          src={user.avatar_url}
          alt={`${user.login}'s avatar`}
          className="w-8 h-8 rounded-full border-2 border-gray-300"
        />
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            {user.name || user.login}
          </p>
          <p className="text-xs text-gray-500">
            @{user.login}
          </p>
        </div>
        {showDropdown && (
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Dropdown Menu */}
      {showDropdown && isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar_url}
                  alt={`${user.login}'s avatar`}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || user.login}
                  </p>
                  <p className="text-xs text-gray-500">@{user.login}</p>
                  {user.email && (
                    <p className="text-xs text-gray-500">{user.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* User Stats */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.public_repos || 0}
                  </p>
                  <p className="text-xs text-gray-500">Repositories</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.followers || 0}
                  </p>
                  <p className="text-xs text-gray-500">Followers</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={handleFetchRepositories}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                View Repositories
              </button>

              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View GitHub Profile
              </a>

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
        </div>
      )}

      {/* Repositories Modal - Made more mobile-responsive */}
      {showRepositories && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Your Repositories</h3>
              <button
                onClick={() => setShowRepositories(false)}
                className="text-gray-400 hover:text-gray-600 p-2 -m-2 touch-manipulation"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {repositories.length > 0 ? (
                repositories.slice(0, 10).map((repo) => (
                  <div key={repo.id} className="p-3 border rounded-md hover:bg-gray-50 touch-manipulation">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{repo.name}</h4>
                        {repo.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{repo.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-blue-500 mr-1 flex-shrink-0"></span>
                              {repo.language}
                            </span>
                          )}
                          <span>⭐ {repo.stargazers_count}</span>
                          <span>🍴 {repo.forks_count}</span>
                        </div>
                      </div>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded border hover:bg-blue-50 flex-shrink-0 touch-manipulation"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No repositories found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 