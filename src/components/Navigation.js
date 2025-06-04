import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import UserProfile from './UserProfile';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  // Base navigation items available to all users (removed requiresAuth)
  const baseNavItems = [
    {
      path: '/',
      label: 'Gantt Chart',
      icon: '📊',
      description: 'View and manage your project timeline'
    },
    {
      path: '/daily-progress',
      label: 'Daily Progress',
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
    },
    {
      path: '/pdf-manager',
      label: 'PDF Library',
      icon: '📄',
      description: 'View and manage PDF documents with annotations'
    },
    {
      path: '/github-files',
      label: 'GitHub Files',
      icon: '🔗',
      description: 'Manage files in GitHub repositories'
    }
  ];

  // All navigation items are now available (removed role-based filtering and auth requirements)
  const navItems = baseNavItems;

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main navigation bar */}
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand - Mobile optimized */}
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
              <span className="hidden sm:inline">📋 Thesis GANTT Chart</span>
              <span className="sm:hidden">📋 GANTT</span>
            </h1>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 xl:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 min-w-0 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-2 border-transparent'
                  }`
                }
                title={item.description}
                aria-label={`Navigate to ${item.label}`}
              >
                <span className="text-lg flex-shrink-0" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Right side - Mobile Menu Button only */}
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors touch-manipulation min-h-[44px] min-w-[44px]"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle main menu"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          ref={mobileMenuRef}
          className={`lg:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen 
              ? 'max-h-screen opacity-100 visible' 
              : 'max-h-0 opacity-0 invisible overflow-hidden'
          }`}
          id="mobile-menu"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-3 min-h-[48px] touch-manipulation ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
                aria-label={item.description}
              >
                <span className="text-xl flex-shrink-0" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-gray-500 mt-1">{item.description}</span>
                </div>
              </NavLink>
            ))}
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