import React from 'react';
import PropTypes from 'prop-types';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const containerClasses = {
    small: 'h-32',
    medium: 'h-64',
    large: 'h-96'
  };

  return (
    <div className={`flex flex-col justify-center items-center ${containerClasses[size]}`}>
      <div 
        className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`}
        role="status"
        aria-label={message}
      ></div>
      <p className="mt-4 text-gray-600 text-sm">{message}</p>
    </div>
  );
};

LoadingSpinner.propTypes = {
  message: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default LoadingSpinner; 