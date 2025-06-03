import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';

class SecurityService {
  constructor() {
    this.csrfTokens = new Map();
    this.rateLimiters = new Map();
    this.saltRounds = 12; // bcrypt salt rounds
    this.csrfTokenExpiry = 3600000; // 1 hour in milliseconds
    this.rateLimitWindow = 900000; // 15 minutes in milliseconds
    this.maxRequestsPerWindow = 100; // Default rate limit
    
    // Initialize cleanup intervals
    this.startCleanupIntervals();
  }

  // Password Security
  // ================

  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Check password strength
      if (!this.isPasswordStrong(password)) {
        throw new Error('Password does not meet security requirements');
      }

      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  /**
   * Verify a password against its hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }

      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Check if password meets security requirements
   * @param {string} password - Password to check
   * @returns {boolean} True if password is strong enough
   */
  isPasswordStrong(password) {
    if (!password || password.length < 8) {
      return false;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return false;
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return false;
    }

    return true;
  }

  /**
   * Get password strength requirements
   * @returns {object} Password requirements
   */
  getPasswordRequirements() {
    return {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      specialChars: '!@#$%^&*()_+-=[]{};\':"|,.<>/?'
    };
  }

  // CSRF Protection
  // ===============

  /**
   * Generate a CSRF token
   * @param {string} sessionId - User session identifier
   * @returns {string} CSRF token
   */
  generateCSRFToken(sessionId) {
    try {
      const timestamp = Date.now();
      const tokenData = {
        sessionId,
        timestamp,
        random: this.generateSecureRandomString(32)
      };

      const token = CryptoJS.AES.encrypt(
        JSON.stringify(tokenData), 
        process.env.REACT_APP_CSRF_SECRET || 'default-csrf-secret'
      ).toString();

      // Store token with expiry
      this.csrfTokens.set(token, {
        sessionId,
        timestamp,
        expiresAt: timestamp + this.csrfTokenExpiry
      });

      return token;
    } catch (error) {
      console.error('CSRF token generation failed:', error);
      throw new Error(`Failed to generate CSRF token: ${error.message}`);
    }
  }

  /**
   * Validate a CSRF token
   * @param {string} token - CSRF token to validate
   * @param {string} sessionId - User session identifier
   * @returns {boolean} True if token is valid
   */
  validateCSRFToken(token, sessionId) {
    try {
      if (!token || !sessionId) {
        return false;
      }

      const tokenData = this.csrfTokens.get(token);
      if (!tokenData) {
        return false;
      }

      // Check if token has expired
      if (Date.now() > tokenData.expiresAt) {
        this.csrfTokens.delete(token);
        return false;
      }

      // Check if session matches
      if (tokenData.sessionId !== sessionId) {
        return false;
      }

      // Decrypt and verify token structure
      try {
        const decrypted = CryptoJS.AES.decrypt(
          token, 
          process.env.REACT_APP_CSRF_SECRET || 'default-csrf-secret'
        );
        const decryptedData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        
        return decryptedData.sessionId === sessionId;
      } catch (decryptError) {
        return false;
      }
    } catch (error) {
      console.error('CSRF token validation failed:', error);
      return false;
    }
  }

  /**
   * Remove a CSRF token (e.g., after use)
   * @param {string} token - CSRF token to remove
   */
  removeCSRFToken(token) {
    this.csrfTokens.delete(token);
  }

  // Rate Limiting
  // =============

  /**
   * Check if request is within rate limit
   * @param {string} identifier - User/IP identifier
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} Rate limit status
   */
  checkRateLimit(identifier, maxRequests = this.maxRequestsPerWindow, windowMs = this.rateLimitWindow) {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create rate limit data for identifier
      if (!this.rateLimiters.has(identifier)) {
        this.rateLimiters.set(identifier, []);
      }

      const requests = this.rateLimiters.get(identifier);

      // Remove old requests outside the window
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      this.rateLimiters.set(identifier, recentRequests);

      // Check if under limit
      if (recentRequests.length >= maxRequests) {
        const oldestRequest = Math.min(...recentRequests);
        const resetTime = oldestRequest + windowMs;

        return {
          allowed: false,
          limit: maxRequests,
          current: recentRequests.length,
          resetTime: resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        };
      }

      // Add current request
      recentRequests.push(now);
      this.rateLimiters.set(identifier, recentRequests);

      return {
        allowed: true,
        limit: maxRequests,
        current: recentRequests.length,
        remaining: maxRequests - recentRequests.length,
        resetTime: now + windowMs
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request but log the issue
      return {
        allowed: true,
        limit: maxRequests,
        current: 0,
        error: error.message
      };
    }
  }

  /**
   * Reset rate limit for an identifier
   * @param {string} identifier - User/IP identifier
   */
  resetRateLimit(identifier) {
    this.rateLimiters.delete(identifier);
  }

  // Security Utilities
  // ==================

  /**
   * Generate a secure random string
   * @param {number} length - Length of the string
   * @returns {string} Random string
   */
  generateSecureRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    const randomArray = new Uint8Array(length);
    
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomArray);
      for (let i = 0; i < length; i++) {
        result += chars[randomArray[i] % chars.length];
      }
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  /**
   * Generate a secure session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return this.generateSecureRandomString(64);
  }

  /**
   * Sanitize input to prevent XSS
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate input against common injection patterns
   * @param {string} input - Input to validate
   * @returns {boolean} True if input is safe
   */
  validateInput(input) {
    if (typeof input !== 'string') {
      return true;
    }

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
      /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
      /['"]\s*(OR|AND)\s*['"]\d+['"]\s*=\s*['"]\d+['"]|--|#|\*|\/\*/i
    ];

    // Check for XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];

    const allPatterns = [...sqlInjectionPatterns, ...xssPatterns];

    for (const pattern of allPatterns) {
      if (pattern.test(input)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create Content Security Policy header value
   * @returns {string} CSP header value
   */
  getCSPHeader() {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.github.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.github.com https://github.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  // Security Audit
  // ==============

  /**
   * Perform basic security audit
   * @returns {object} Security audit results
   */
  performSecurityAudit() {
    const audit = {
      timestamp: new Date().toISOString(),
      checks: [],
      score: 0,
      recommendations: []
    };

    // Check HTTPS
    if (window.location.protocol === 'https:') {
      audit.checks.push({ name: 'HTTPS', status: 'PASS', score: 20 });
      audit.score += 20;
    } else {
      audit.checks.push({ name: 'HTTPS', status: 'FAIL', score: 0 });
      audit.recommendations.push('Enable HTTPS for secure communication');
    }

    // Check localStorage encryption
    const hasEncryptedData = localStorage.getItem('encryptionKeyPair');
    if (hasEncryptedData) {
      audit.checks.push({ name: 'Data Encryption', status: 'PASS', score: 20 });
      audit.score += 20;
    } else {
      audit.checks.push({ name: 'Data Encryption', status: 'FAIL', score: 0 });
      audit.recommendations.push('Enable data encryption for sensitive information');
    }

    // Check CSRF protection
    if (this.csrfTokens.size > 0) {
      audit.checks.push({ name: 'CSRF Protection', status: 'PASS', score: 15 });
      audit.score += 15;
    } else {
      audit.checks.push({ name: 'CSRF Protection', status: 'WARNING', score: 5 });
      audit.score += 5;
      audit.recommendations.push('Implement CSRF tokens for form submissions');
    }

    // Check rate limiting
    if (this.rateLimiters.size > 0) {
      audit.checks.push({ name: 'Rate Limiting', status: 'PASS', score: 15 });
      audit.score += 15;
    } else {
      audit.checks.push({ name: 'Rate Limiting', status: 'WARNING', score: 5 });
      audit.score += 5;
      audit.recommendations.push('Implement rate limiting for API endpoints');
    }

    // Check secure headers
    audit.checks.push({ name: 'Security Headers', status: 'INFO', score: 10 });
    audit.score += 10;
    audit.recommendations.push('Ensure CSP and other security headers are configured');

    // Calculate overall grade
    if (audit.score >= 80) audit.grade = 'A';
    else if (audit.score >= 60) audit.grade = 'B';
    else if (audit.score >= 40) audit.grade = 'C';
    else if (audit.score >= 20) audit.grade = 'D';
    else audit.grade = 'F';

    return audit;
  }

  // Cleanup Functions
  // =================

  /**
   * Start cleanup intervals for expired tokens and rate limits
   */
  startCleanupIntervals() {
    // Clean up expired CSRF tokens every 10 minutes
    setInterval(() => {
      this.cleanupExpiredCSRFTokens();
    }, 600000);

    // Clean up old rate limit data every 30 minutes
    setInterval(() => {
      this.cleanupOldRateLimitData();
    }, 1800000);
  }

  /**
   * Clean up expired CSRF tokens
   */
  cleanupExpiredCSRFTokens() {
    const now = Date.now();
    for (const [token, data] of this.csrfTokens.entries()) {
      if (now > data.expiresAt) {
        this.csrfTokens.delete(token);
      }
    }
  }

  /**
   * Clean up old rate limit data
   */
  cleanupOldRateLimitData() {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;

    for (const [identifier, requests] of this.rateLimiters.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      if (recentRequests.length === 0) {
        this.rateLimiters.delete(identifier);
      } else {
        this.rateLimiters.set(identifier, recentRequests);
      }
    }
  }

  /**
   * Clear all security data (for testing or reset)
   */
  clearAllSecurityData() {
    this.csrfTokens.clear();
    this.rateLimiters.clear();
  }
}

// Create a singleton instance
const securityService = new SecurityService();

export default securityService; 