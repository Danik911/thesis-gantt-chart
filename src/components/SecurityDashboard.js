import React, { useState, useEffect } from 'react';
import securityService from '../services/securityService';
import encryptionService from '../services/encryptionService';
import authService from '../services/authService';

const SecurityDashboard = () => {
  const [securityAudit, setSecurityAudit] = useState(null);
  const [encryptionStatus, setEncryptionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [rateLimitStatus, setRateLimitStatus] = useState(null);

  useEffect(() => {
    performSecurityCheck();
  }, []);

  const performSecurityCheck = async () => {
    setIsLoading(true);
    try {
      // Get security audit
      const audit = securityService.performSecurityAudit();
      setSecurityAudit(audit);

      // Get encryption status
      const encStatus = encryptionService.getEncryptionStatus();
      setEncryptionStatus(encStatus);

      // Get CSRF token
      const token = authService.getCSRFToken();
      setCsrfToken(token || 'No active session');

      // Check rate limit status
      const rateLimit = authService.checkRateLimit(100, 900000);
      setRateLimitStatus(rateLimit);

    } catch (error) {
      console.error('Security check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateEncryptionKeys = () => {
    encryptionService.generateNewKeyPair();
    performSecurityCheck();
  };

  const clearSecurityData = () => {
    if (window.confirm('Are you sure you want to clear all security data? This cannot be undone.')) {
      securityService.clearAllSecurityData();
      encryptionService.clearEncryptionData();
      performSecurityCheck();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return 'text-green-600 bg-green-100';
      case 'FAIL': return 'text-red-600 bg-red-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'INFO': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg">Running security audit...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
        <button
          onClick={performSecurityCheck}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh Audit
        </button>
      </div>

      {/* Security Score */}
      {securityAudit && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Security Score</h3>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{securityAudit.score}/100</span>
              <span className={`text-xl font-bold ${getGradeColor(securityAudit.grade)}`}>
                Grade: {securityAudit.grade}
              </span>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${securityAudit.score}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityAudit.checks.map((check, index) => (
              <div key={index} className={`p-3 rounded-md ${getStatusColor(check.status)}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{check.name}</span>
                  <span className="text-sm">{check.status}</span>
                </div>
                <div className="text-sm mt-1">Score: {check.score}/20</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encryption Status */}
      {encryptionStatus && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Encryption Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-md">
              <span>Key Pair Status</span>
              <span className={`px-2 py-1 rounded text-sm ${
                encryptionStatus.hasKeyPair ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {encryptionStatus.hasKeyPair ? 'Active' : 'Not Found'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-md">
              <span>Shared Keys</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {encryptionStatus.sharedKeysCount}
              </span>
            </div>
          </div>
          
          {encryptionStatus.publicKey && (
            <div className="mt-4 p-3 bg-white rounded-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Public Key (share with others):
              </label>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                {encryptionStatus.publicKey}
              </div>
            </div>
          )}

          <div className="mt-4 flex space-x-3">
            <button
              onClick={regenerateEncryptionKeys}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Regenerate Keys
            </button>
          </div>
        </div>
      )}

      {/* CSRF Protection */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">CSRF Protection</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-md">
            <span>Current Session Token</span>
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
              {csrfToken}
            </span>
          </div>
        </div>
      </div>

      {/* Rate Limiting */}
      {rateLimitStatus && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Rate Limiting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-white rounded-md">
              <span>Requests Made</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {rateLimitStatus.current}/{rateLimitStatus.limit}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-md">
              <span>Remaining</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                {rateLimitStatus.remaining || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-md">
              <span>Status</span>
              <span className={`px-2 py-1 rounded text-sm ${
                rateLimitStatus.allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {rateLimitStatus.allowed ? 'OK' : 'Limited'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {securityAudit?.recommendations?.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800">Security Recommendations</h3>
          <ul className="space-y-2">
            {securityAudit.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-800">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-800">Danger Zone</h3>
        <p className="text-red-700 mb-4">
          These actions are irreversible and will affect your security configuration.
        </p>
        <button
          onClick={clearSecurityData}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Clear All Security Data
        </button>
      </div>

      {/* Last Updated */}
      {securityAudit && (
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(securityAudit.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard; 