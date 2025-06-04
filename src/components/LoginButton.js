import React from 'react';
import PropTypes from 'prop-types';
// import { useAuth } from '../contexts/AuthContext'; // login is no longer available from useAuth

const LoginButton = ({ 
  className = '', 
  size = 'medium', 
  variant = 'primary', 
  fullWidth = false 
}) => {
  // const { login, isLoading, error } = useAuth(); // login and specific isLoading/error for it are removed
  const isLoading = false; // Placeholder, as GitHub login is removed
  const error = null; // Placeholder

  const sizeClasses = {
    small: 'px-3 py-2 text-sm min-h-[36px]',
    medium: 'px-4 py-2 text-base min-h-[40px]',
    large: 'px-6 py-3 text-lg min-h-[48px]',
  };

  const variantClasses = {
    primary: 'bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-700', // Adjusted color
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border-2 border-gray-300',
  };

  const handleLogin = () => {
    // GitHub login functionality has been removed.
    // Implement new login logic here if an alternative auth system is added.
    console.warn('Login function not implemented. GitHub authentication has been removed.');
    // if (!isLoading && login) {
    //   login(); 
    // }
  };

  return (
    <div className={`flex flex-col space-y-2 ${fullWidth ? 'w-full' : 'items-center'}`}>
      <button
        onClick={handleLogin}
        disabled={true} // Disabled as no login is implemented
        className={`
          inline-flex items-center justify-center
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${fullWidth ? 'w-full' : ''}
          font-medium rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
          touch-manipulation
          ${className}
        `}
        aria-label="Login" // Changed aria-label
      >
        {isLoading ? (
          <>
            <svg 
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-current flex-shrink-0" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {/* SVG icon removed - was GitHub logo */}
            <span>Login</span> {/* Changed text */}
          </>
        )}
      </button>
      
      {error && (
        <div className={`text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200 ${fullWidth ? 'w-full' : ''}`}>
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span> {/* This error is now from a placeholder */}
          </div>
        </div>
      )}
    </div>
  );
};

LoginButton.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline']),
  fullWidth: PropTypes.bool
};

export default LoginButton; 