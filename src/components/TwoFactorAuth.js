import React, { useState, useEffect } from 'react';
import { useTwoFactorAuth } from '../hooks/usePermissions';
import { useRole } from '../contexts/RoleContext';

const TwoFactorAuth = ({ onVerified, onCancel, action = "perform this action" }) => {
  const { requiresTwoFactor, isEnabled, canBypass } = useTwoFactorAuth();
  const { currentUserRole } = useRole();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('request'); // 'request', 'verify'

  // Simulate sending 2FA code
  const sendCode = async () => {
    setIsVerifying(true);
    setError('');
    
    // Simulate API call delay
    setTimeout(() => {
      setStep('verify');
      setIsVerifying(false);
      // In a real app, this would send SMS/email
      console.log('2FA code sent (simulated): 123456');
    }, 1000);
  };

  // Simulate verifying 2FA code
  const verifyCode = async () => {
    setIsVerifying(true);
    setError('');

    // Simulate API call delay
    setTimeout(() => {
      // For demo purposes, accept '123456' as valid code
      if (code === '123456' || canBypass) {
        onVerified();
      } else {
        setError('Invalid verification code. Please try again.');
      }
      setIsVerifying(false);
    }, 800);
  };

  // Auto-bypass for PhD candidates on basic operations
  useEffect(() => {
    if (canBypass && !requiresTwoFactor) {
      onVerified();
    }
  }, [canBypass, requiresTwoFactor, onVerified]);

  if (!requiresTwoFactor && canBypass) {
    return null; // No 2FA required
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4">
            Two-Factor Authentication Required
          </h3>

          {step === 'request' && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-6">
                Your role ({currentUserRole}) requires two-factor authentication to {action}.
              </p>
              
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Demo Mode:</strong> For demonstration, use code: <code className="bg-yellow-100 px-1 rounded">123456</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={sendCode}
                disabled={isVerifying}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isVerifying ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div>
              <p className="text-sm text-gray-500 mb-4 text-center">
                Enter the 6-digit verification code sent to your device.
              </p>

              <div className="mb-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center text-xl tracking-widest p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength="6"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('request')}
                  className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Resend Code
                </button>
                <button
                  onClick={verifyCode}
                  disabled={isVerifying || code.length !== 6}
                  className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth; 