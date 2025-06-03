import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginButton from './LoginButton';
import UserProfile from './UserProfile';

const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();

  const navItems = [
    {
      path: '/',
      label: 'Gantt Chart',
      icon: '📊',
      description: 'View and manage your project timeline'
    },
    {
      path: '/daily-progress',
      label: 'What Has Been Done Today',
      icon: '✅',
      description: 'Track your daily accomplishments'
    },
    {
      path: '/text-notes',
      label: 'Text Notes',
      icon: '📝',
      description: 'Create and manage text notes with rich editing'
    },
    {
      path: '/file-upload',
      label: 'File Upload',
      icon: '📁',
      description: 'Upload PDF, M4A, and WAV files'
    }
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">
              📋 Thesis GANTT Chart
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-2 border-transparent'
                  }`
                }
                title={item.description}
                aria-label={`Navigate to ${item.label}`}
              >
                <span className="text-lg" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Authentication Section */}
          <div className="flex items-center ml-4">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            ) : isAuthenticated ? (
              <UserProfile />
            ) : (
              <LoginButton size="small" variant="outline" />
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator for tab transitions */}
      <div 
        id="tab-loading-indicator" 
        className="h-1 bg-blue-500 transform scale-x-0 transition-transform duration-300"
        role="progressbar"
        aria-hidden="true"
      ></div>
    </nav>
  );
};

export default Navigation; 