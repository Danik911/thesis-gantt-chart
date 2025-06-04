import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuthCallback = () => {
  const { handleOAuthCallback, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        // Get the full URL
        const fullUrl = window.location.href;
        let code, state, errorParam, errorDescription;

        // Check if query parameters are before the hash
        const hashIndex = fullUrl.indexOf('#');
        // Use the part before '#' if '#' exists, otherwise the full URL might be the search part
        const preHashPart = hashIndex > -1 ? fullUrl.substring(0, hashIndex) : fullUrl;
        
        const questionMarkIndex = preHashPart.indexOf('?');
        if (questionMarkIndex > -1) {
            const queryParamsString = preHashPart.substring(questionMarkIndex + 1);
            const urlParams = new URLSearchParams(queryParamsString);
            code = urlParams.get('code');
            state = urlParams.get('state');
            errorParam = urlParams.get('error');
            errorDescription = urlParams.get('error_description');
        }

        // Fallback to check location.search from router if primary parsing failed
        // This is mostly for safety, primary logic relies on parsing fullUrl
        if (!code && location.search) {
            const routerUrlParams = new URLSearchParams(location.search);
            if (routerUrlParams.has('code')) code = routerUrlParams.get('code');
            if (routerUrlParams.has('state')) state = routerUrlParams.get('state');
            if (routerUrlParams.has('error')) errorParam = routerUrlParams.get('error');
            if (routerUrlParams.has('error_description')) errorDescription = routerUrlParams.get('error_description');
        }
        
        // Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || `OAuth Error: ${errorParam}`);
        }

        // Check for required parameters
        if (!code) {
          throw new Error('Authorization code not found in callback URL');
        }

        if (!state) {
          throw new Error('State parameter not found in callback URL');
        }

        // Handle the OAuth callback
        await handleOAuthCallback(code, state);

        // Success - redirect to main application
        const redirectTo = sessionStorage.getItem('auth_redirect_to') || '/';
        sessionStorage.removeItem('auth_redirect_to');
        navigate(redirectTo, { replace: true });

      } catch (error) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('OAuth callback processing failed:', error);
        }
        setError(error.message);
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [handleOAuthCallback, navigate]);

  const handleRetry = () => {
    setError(null);
    setIsProcessing(true);
    // Restart the process
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  if (isProcessing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            {/* Loading spinner */}
            <div className="mx-auto mb-4">
              <svg 
                className="animate-spin h-12 w-12 text-gray-600 mx-auto" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
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
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Completing Authentication
            </h2>
            <p className="text-gray-600 mb-4">
              Please wait while we securely process your GitHub authentication...
            </p>
            
            {/* Progress indicators */}
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                GitHub authorization received
              </div>
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 mr-2">
                  <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                Exchanging authorization code for access token
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            {/* Error icon */}
            <div className="mx-auto mb-4">
              <svg 
                className="h-12 w-12 text-red-500 mx-auto" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">
              We encountered an issue while processing your GitHub authentication.
            </p>
            
            {/* Error details */}
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            
            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Go to Home
              </button>
            </div>
            
            {/* Help text */}
            <div className="mt-6 text-xs text-gray-500">
              <p>If the problem persists, please check:</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• Your internet connection</li>
                <li>• GitHub service status</li>
                <li>• Browser cookies and local storage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Processing...
        </h2>
        <p className="text-gray-600">
          Please wait while we complete your authentication.
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback; 