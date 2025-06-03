import React, { createContext, useContext, useState, useEffect } from 'react';
import securityService from '../services/securityService';
import encryptionService from '../services/encryptionService';
import authService from '../services/authService';

const SecurityContext = createContext();

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const [securityState, setSecurityState] = useState({
    isEncryptionEnabled: false,
    publicKey: null,
    csrfToken: null,
    sessionId: null,
    securityScore: 0,
    lastAudit: null,
    rateLimitStatus: null
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSecurity();
  }, []);

  const initializeSecurity = async () => {
    try {
      // Get encryption status
      const encryptionStatus = encryptionService.getEncryptionStatus();
      
      // Get session info
      const sessionId = authService.getSessionId();
      const csrfToken = authService.getCSRFToken();
      
      // Perform security audit
      const audit = securityService.performSecurityAudit();
      
      // Get rate limit status
      const rateLimitStatus = authService.checkRateLimit(100, 900000);

      setSecurityState({
        isEncryptionEnabled: encryptionStatus.hasKeyPair,
        publicKey: encryptionStatus.publicKey,
        csrfToken,
        sessionId,
        securityScore: audit.score,
        lastAudit: audit,
        rateLimitStatus
      });

    } catch (error) {
      console.error('Failed to initialize security:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Security Actions
  const enableEncryption = () => {
    try {
      encryptionService.generateNewKeyPair();
      const status = encryptionService.getEncryptionStatus();
      
      setSecurityState(prev => ({
        ...prev,
        isEncryptionEnabled: true,
        publicKey: status.publicKey
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to enable encryption:', error);
      return false;
    }
  };

  const disableEncryption = () => {
    try {
      encryptionService.clearEncryptionData();
      
      setSecurityState(prev => ({
        ...prev,
        isEncryptionEnabled: false,
        publicKey: null
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to disable encryption:', error);
      return false;
    }
  };

  const encryptData = (data, recipientPublicKey) => {
    if (!securityState.isEncryptionEnabled) {
      throw new Error('Encryption is not enabled');
    }
    return encryptionService.encryptMessage(data, recipientPublicKey);
  };

  const decryptData = (encryptedData, senderPublicKey) => {
    if (!securityState.isEncryptionEnabled) {
      throw new Error('Encryption is not enabled');
    }
    return encryptionService.decryptMessage(encryptedData, senderPublicKey);
  };

  const encryptFile = (fileContent, recipientPublicKey) => {
    if (!securityState.isEncryptionEnabled) {
      throw new Error('Encryption is not enabled');
    }
    return encryptionService.encryptFile(fileContent, recipientPublicKey);
  };

  const decryptFile = (encryptedFileData, senderPublicKey) => {
    if (!securityState.isEncryptionEnabled) {
      throw new Error('Encryption is not enabled');
    }
    return encryptionService.decryptFile(encryptedFileData, senderPublicKey);
  };

  const validateCSRFToken = (token) => {
    return securityService.validateCSRFToken(token, securityState.sessionId);
  };

  const checkRateLimit = (maxRequests, windowMs) => {
    const identifier = authService.getCurrentUser()?.id || securityState.sessionId || 'anonymous';
    return securityService.checkRateLimit(identifier, maxRequests, windowMs);
  };

  const validateInput = (input) => {
    return securityService.validateInput(input);
  };

  const sanitizeInput = (input) => {
    return securityService.sanitizeInput(input);
  };

  const hashPassword = async (password) => {
    return securityService.hashPassword(password);
  };

  const verifyPassword = async (password, hash) => {
    return securityService.verifyPassword(password, hash);
  };

  const performSecurityAudit = () => {
    const audit = securityService.performSecurityAudit();
    setSecurityState(prev => ({
      ...prev,
      securityScore: audit.score,
      lastAudit: audit
    }));
    return audit;
  };

  const getPasswordRequirements = () => {
    return securityService.getPasswordRequirements();
  };

  const generateSecureToken = (length) => {
    return securityService.generateSecureRandomString(length);
  };

  const clearSecurityData = () => {
    securityService.clearAllSecurityData();
    encryptionService.clearEncryptionData();
    
    setSecurityState({
      isEncryptionEnabled: false,
      publicKey: null,
      csrfToken: null,
      sessionId: null,
      securityScore: 0,
      lastAudit: null,
      rateLimitStatus: null
    });
  };

  // Security Hooks
  const withRateLimit = (callback, maxRequests = 10, windowMs = 60000) => {
    return (...args) => {
      const rateLimitResult = checkRateLimit(maxRequests, windowMs);
      
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`);
      }
      
      return callback(...args);
    };
  };

  const withCSRFProtection = (callback) => {
    return (formData, ...args) => {
      const csrfToken = formData.get?.('_csrf') || formData._csrf;
      
      if (!csrfToken || !validateCSRFToken(csrfToken)) {
        throw new Error('Invalid CSRF token');
      }
      
      return callback(formData, ...args);
    };
  };

  const withInputValidation = (callback) => {
    return (input, ...args) => {
      if (!validateInput(input)) {
        throw new Error('Input contains potentially harmful content');
      }
      
      const sanitizedInput = sanitizeInput(input);
      return callback(sanitizedInput, ...args);
    };
  };

  const refreshSecurityState = () => {
    initializeSecurity();
  };

  const value = {
    // State
    securityState,
    isLoading,

    // Core Actions
    enableEncryption,
    disableEncryption,
    performSecurityAudit,
    clearSecurityData,
    refreshSecurityState,

    // Encryption
    encryptData,
    decryptData,
    encryptFile,
    decryptFile,

    // Security Utilities
    validateCSRFToken,
    checkRateLimit,
    validateInput,
    sanitizeInput,
    hashPassword,
    verifyPassword,
    getPasswordRequirements,
    generateSecureToken,

    // Higher-order functions
    withRateLimit,
    withCSRFProtection,
    withInputValidation,

    // Services (for direct access when needed)
    securityService,
    encryptionService
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityContext; 