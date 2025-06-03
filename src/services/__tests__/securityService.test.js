import securityService from '../securityService';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock CryptoJS
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  enc: {
    Utf8: {},
  },
}));

// Mock window.crypto
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'https:',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock setInterval to prevent actual timers
global.setInterval = jest.fn();

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    securityService.clearAllSecurityData();
  });

  describe('Password Security', () => {
    describe('hashPassword', () => {
      it('should hash a valid password', async () => {
        const password = 'TestPassword123!';
        const hashedPassword = '$2b$12$hashedpassword';
        bcrypt.hash.mockResolvedValue(hashedPassword);

        const result = await securityService.hashPassword(password);

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        expect(result).toBe(hashedPassword);
      });

      it('should reject empty password', async () => {
        await expect(securityService.hashPassword('')).rejects.toThrow('Password must be a non-empty string');
        await expect(securityService.hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
      });

      it('should reject weak passwords', async () => {
        const weakPassword = 'weak';
        await expect(securityService.hashPassword(weakPassword)).rejects.toThrow('Password does not meet security requirements');
      });

      it('should handle bcrypt errors', async () => {
        const password = 'TestPassword123!';
        bcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

        await expect(securityService.hashPassword(password)).rejects.toThrow('Failed to hash password: Bcrypt error');
      });
    });

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const password = 'TestPassword123!';
        const hash = '$2b$12$hashedpassword';
        bcrypt.compare.mockResolvedValue(true);

        const result = await securityService.verifyPassword(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const password = 'WrongPassword';
        const hash = '$2b$12$hashedpassword';
        bcrypt.compare.mockResolvedValue(false);

        const result = await securityService.verifyPassword(password, hash);

        expect(result).toBe(false);
      });

      it('should return false for empty inputs', async () => {
        expect(await securityService.verifyPassword('', 'hash')).toBe(false);
        expect(await securityService.verifyPassword('password', '')).toBe(false);
        expect(await securityService.verifyPassword(null, 'hash')).toBe(false);
      });

      it('should handle bcrypt errors gracefully', async () => {
        bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

        const result = await securityService.verifyPassword('password', 'hash');

        expect(result).toBe(false);
      });
    });

    describe('isPasswordStrong', () => {
      it('should accept strong passwords', () => {
        const strongPasswords = [
          'TestPassword123!',
          'MySecure@Pass99',
          'Complex#Pass123',
          'StrongPassword1$'
        ];

        strongPasswords.forEach(password => {
          expect(securityService.isPasswordStrong(password)).toBe(true);
        });
      });

      it('should reject weak passwords', () => {
        const weakPasswords = [
          'short',           // Too short
          'nouppercase123!', // No uppercase
          'NOLOWERCASE123!', // No lowercase
          'NoNumbers!',      // No numbers
          'NoSpecialChars123', // No special characters
          ''                 // Empty
        ];

        weakPasswords.forEach(password => {
          expect(securityService.isPasswordStrong(password)).toBe(false);
        });
      });
    });

    describe('getPasswordRequirements', () => {
      it('should return password requirements', () => {
        const requirements = securityService.getPasswordRequirements();

        expect(requirements).toEqual({
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          specialChars: '!@#$%^&*()_+-=[]{};\':"|,.<>/?'
        });
      });
    });
  });

  describe('CSRF Protection', () => {
    describe('generateCSRFToken', () => {
      it('should generate a CSRF token', () => {
        const sessionId = 'test-session-123';
        const encryptedToken = 'encrypted-token-string';
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => encryptedToken });

        const token = securityService.generateCSRFToken(sessionId);

        expect(CryptoJS.AES.encrypt).toHaveBeenCalled();
        expect(token).toBe(encryptedToken);
      });

      it('should handle encryption errors', () => {
        const sessionId = 'test-session-123';
        CryptoJS.AES.encrypt.mockImplementation(() => {
          throw new Error('Encryption failed');
        });

        expect(() => securityService.generateCSRFToken(sessionId)).toThrow('Failed to generate CSRF token: Encryption failed');
      });
    });

    describe('validateCSRFToken', () => {
      it('should validate correct CSRF token', () => {
        const sessionId = 'test-session-123';
        const token = 'valid-token';
        
        // First generate a token
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => token });
        securityService.generateCSRFToken(sessionId);

        // Mock decryption
        const decryptedData = JSON.stringify({ sessionId, timestamp: Date.now() });
        CryptoJS.AES.decrypt.mockReturnValue({
          toString: () => decryptedData
        });

        const isValid = securityService.validateCSRFToken(token, sessionId);

        expect(isValid).toBe(true);
      });

      it('should reject invalid token', () => {
        const sessionId = 'test-session-123';
        const invalidToken = 'invalid-token';

        const isValid = securityService.validateCSRFToken(invalidToken, sessionId);

        expect(isValid).toBe(false);
      });

      it('should reject empty inputs', () => {
        expect(securityService.validateCSRFToken('', 'session')).toBe(false);
        expect(securityService.validateCSRFToken('token', '')).toBe(false);
        expect(securityService.validateCSRFToken(null, 'session')).toBe(false);
      });

      it('should reject expired tokens', () => {
        const sessionId = 'test-session-123';
        const token = 'expired-token';
        
        // Generate token
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => token });
        securityService.generateCSRFToken(sessionId);
        
        // Mock expired timestamp
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 7200000); // 2 hours later

        const isValid = securityService.validateCSRFToken(token, sessionId);

        expect(isValid).toBe(false);
        
        jest.restoreAllMocks();
      });
    });

    describe('removeCSRFToken', () => {
      it('should remove CSRF token', () => {
        const sessionId = 'test-session-123';
        const token = 'test-token';
        
        // Generate token first
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => token });
        securityService.generateCSRFToken(sessionId);

        // Remove token
        securityService.removeCSRFToken(token);

        // Verify token is removed
        const isValid = securityService.validateCSRFToken(token, sessionId);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('checkRateLimit', () => {
      it('should allow requests within limit', () => {
        const identifier = 'user-123';
        const maxRequests = 10;
        const windowMs = 60000;

        const result = securityService.checkRateLimit(identifier, maxRequests, windowMs);

        expect(result.allowed).toBe(true);
        expect(result.current).toBe(1);
        expect(result.remaining).toBe(9);
        expect(result.limit).toBe(10);
      });

      it('should block requests exceeding limit', () => {
        const identifier = 'user-123';
        const maxRequests = 2;
        const windowMs = 60000;

        // Make requests up to limit
        securityService.checkRateLimit(identifier, maxRequests, windowMs);
        securityService.checkRateLimit(identifier, maxRequests, windowMs);
        
        // This request should be blocked
        const result = securityService.checkRateLimit(identifier, maxRequests, windowMs);

        expect(result.allowed).toBe(false);
        expect(result.current).toBe(2);
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      it('should reset limit after window expires', () => {
        const identifier = 'user-123';
        const maxRequests = 1;
        const windowMs = 1000;

        // Make first request
        const firstResult = securityService.checkRateLimit(identifier, maxRequests, windowMs);
        expect(firstResult.allowed).toBe(true);

        // Mock time passage
        const originalNow = Date.now;
        Date.now = jest.fn(() => originalNow() + 2000); // 2 seconds later

        // Should allow new request after window
        const secondResult = securityService.checkRateLimit(identifier, maxRequests, windowMs);
        expect(secondResult.allowed).toBe(true);

        Date.now = originalNow;
      });

      it('should handle errors gracefully', () => {
        const identifier = null; // This might cause issues
        
        const result = securityService.checkRateLimit(identifier);

        expect(result.allowed).toBe(true);
        expect(result.error).toBeDefined();
      });
    });

    describe('resetRateLimit', () => {
      it('should reset rate limit for identifier', () => {
        const identifier = 'user-123';
        const maxRequests = 1;

        // Make request to reach limit
        securityService.checkRateLimit(identifier, maxRequests);
        
        // Reset limit
        securityService.resetRateLimit(identifier);
        
        // Should allow new request
        const result = securityService.checkRateLimit(identifier, maxRequests);
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(1);
      });
    });
  });

  describe('Security Utilities', () => {
    describe('generateSecureRandomString', () => {
      it('should generate random string of specified length', () => {
        const length = 16;
        const randomString = securityService.generateSecureRandomString(length);

        expect(randomString).toHaveLength(length);
        expect(typeof randomString).toBe('string');
      });

      it('should generate different strings on multiple calls', () => {
        const string1 = securityService.generateSecureRandomString(32);
        const string2 = securityService.generateSecureRandomString(32);

        expect(string1).not.toBe(string2);
      });

      it('should use default length when not specified', () => {
        const randomString = securityService.generateSecureRandomString();

        expect(randomString).toHaveLength(32);
      });

      it('should fallback when crypto API unavailable', () => {
        const originalCrypto = window.crypto;
        delete window.crypto;

        const randomString = securityService.generateSecureRandomString(10);

        expect(randomString).toHaveLength(10);
        expect(typeof randomString).toBe('string');

        window.crypto = originalCrypto;
      });
    });

    describe('generateSessionId', () => {
      it('should generate session ID', () => {
        const sessionId = securityService.generateSessionId();

        expect(sessionId).toHaveLength(64);
        expect(typeof sessionId).toBe('string');
      });
    });

    describe('sanitizeInput', () => {
      it('should sanitize HTML characters', () => {
        const maliciousInput = '<script>alert("xss")</script>';
        const sanitized = securityService.sanitizeInput(maliciousInput);

        expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      });

      it('should sanitize quotes and ampersands', () => {
        const input = 'Tom & Jerry "quote" \'single\' & more';
        const sanitized = securityService.sanitizeInput(input);

        expect(sanitized).toBe('Tom &amp; Jerry &quot;quote&quot; &#x27;single&#x27; &amp; more');
      });

      it('should return non-string inputs unchanged', () => {
        expect(securityService.sanitizeInput(123)).toBe(123);
        expect(securityService.sanitizeInput(null)).toBe(null);
        expect(securityService.sanitizeInput({})).toEqual({});
      });
    });

    describe('validateInput', () => {
      it('should allow safe input', () => {
        const safeInputs = [
          'Hello World',
          'user@example.com',
          'Normal text with numbers 123',
          'Special chars: !@#$%^&*()'
        ];

        safeInputs.forEach(input => {
          expect(securityService.validateInput(input)).toBe(true);
        });
      });

      it('should reject SQL injection attempts', () => {
        const sqlInjections = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "SELECT * FROM users",
          "UNION SELECT password FROM users"
        ];

        sqlInjections.forEach(input => {
          expect(securityService.validateInput(input)).toBe(false);
        });
      });

      it('should reject XSS attempts', () => {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img onclick="alert(1)">',
          '<iframe src="malicious.com"></iframe>'
        ];

        xssAttempts.forEach(input => {
          expect(securityService.validateInput(input)).toBe(false);
        });
      });

      it('should allow non-string inputs', () => {
        expect(securityService.validateInput(123)).toBe(true);
        expect(securityService.validateInput(null)).toBe(true);
        expect(securityService.validateInput({})).toBe(true);
      });
    });

    describe('getCSPHeader', () => {
      it('should return CSP header string', () => {
        const csp = securityService.getCSPHeader();

        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self'");
        expect(csp).toContain("frame-src 'none'");
        expect(csp).toContain("object-src 'none'");
      });
    });
  });

  describe('Security Audit', () => {
    describe('performSecurityAudit', () => {
      it('should perform complete security audit with HTTPS', () => {
        window.location.protocol = 'https:';
        localStorageMock.getItem.mockReturnValue('encrypted-data');

        const audit = securityService.performSecurityAudit();

        expect(audit.timestamp).toBeDefined();
        expect(audit.checks).toHaveLength(5);
        expect(audit.score).toBeGreaterThan(0);
        expect(audit.grade).toBeDefined();
        expect(audit.recommendations).toBeDefined();

        // Check for HTTPS pass
        const httpsCheck = audit.checks.find(check => check.name === 'HTTPS');
        expect(httpsCheck.status).toBe('PASS');
      });

      it('should fail HTTPS check for HTTP', () => {
        window.location.protocol = 'http:';

        const audit = securityService.performSecurityAudit();

        const httpsCheck = audit.checks.find(check => check.name === 'HTTPS');
        expect(httpsCheck.status).toBe('FAIL');
        expect(audit.recommendations).toContain('Enable HTTPS for secure communication');
      });

      it('should check data encryption', () => {
        localStorageMock.getItem.mockReturnValue(null);

        const audit = securityService.performSecurityAudit();

        const encryptionCheck = audit.checks.find(check => check.name === 'Data Encryption');
        expect(encryptionCheck.status).toBe('FAIL');
      });

      it('should check CSRF protection when tokens exist', () => {
        // Generate a token to populate the tokens map
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => 'token' });
        securityService.generateCSRFToken('session-123');

        const audit = securityService.performSecurityAudit();

        const csrfCheck = audit.checks.find(check => check.name === 'CSRF Protection');
        expect(csrfCheck.status).toBe('PASS');
      });

      it('should check rate limiting when active', () => {
        // Make a request to populate rate limiters
        securityService.checkRateLimit('user-123');

        const audit = securityService.performSecurityAudit();

        const rateLimitCheck = audit.checks.find(check => check.name === 'Rate Limiting');
        expect(rateLimitCheck.status).toBe('PASS');
      });

      it('should calculate correct grades', () => {
        // Test different score ranges
        const testCases = [
          { score: 90, expectedGrade: 'A' },
          { score: 70, expectedGrade: 'B' },
          { score: 50, expectedGrade: 'C' },
          { score: 30, expectedGrade: 'D' },
          { score: 10, expectedGrade: 'F' }
        ];

        testCases.forEach(({ score, expectedGrade }) => {
          // Mock a specific score by adjusting the audit conditions
          localStorageMock.getItem.mockReturnValue(score >= 50 ? 'data' : null);
          window.location.protocol = score >= 70 ? 'https:' : 'http:';
          
          if (score >= 80) {
            // Add tokens and rate limiters for high scores
            securityService.generateCSRFToken('session');
            securityService.checkRateLimit('user');
          } else {
            securityService.clearAllSecurityData();
          }

          const audit = securityService.performSecurityAudit();
          expect(audit.grade).toBe(expectedGrade);
        });
      });
    });
  });

  describe('Cleanup Functions', () => {
    describe('cleanupExpiredCSRFTokens', () => {
      it('should remove expired tokens', () => {
        // Generate token
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => 'token' });
        const token = securityService.generateCSRFToken('session-123');

        // Mock expired time
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 7200000); // 2 hours later

        securityService.cleanupExpiredCSRFTokens();

        // Token should be removed
        const isValid = securityService.validateCSRFToken(token, 'session-123');
        expect(isValid).toBe(false);

        jest.restoreAllMocks();
      });
    });

    describe('cleanupOldRateLimitData', () => {
      it('should remove old rate limit data', () => {
        const identifier = 'user-123';
        
        // Make request
        securityService.checkRateLimit(identifier);

        // Mock time passage beyond window
        const originalNow = Date.now;
        Date.now = jest.fn(() => originalNow() + 1800000); // 30 minutes later

        securityService.cleanupOldRateLimitData();

        // Reset time and check that rate limit was cleaned
        Date.now = originalNow;
        const result = securityService.checkRateLimit(identifier);
        expect(result.current).toBe(1); // Should start fresh
      });
    });

    describe('clearAllSecurityData', () => {
      it('should clear all tokens and rate limiters', () => {
        // Generate some data
        CryptoJS.AES.encrypt.mockReturnValue({ toString: () => 'token' });
        securityService.generateCSRFToken('session-123');
        securityService.checkRateLimit('user-123');

        // Clear all data
        securityService.clearAllSecurityData();

        // Verify data is cleared
        expect(securityService.validateCSRFToken('token', 'session-123')).toBe(false);
        
        const rateLimitResult = securityService.checkRateLimit('user-123');
        expect(rateLimitResult.current).toBe(1); // Should start fresh
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed token data gracefully', () => {
      const sessionId = 'test-session';
      const token = 'malformed-token';
      
      // Generate valid token first
      CryptoJS.AES.encrypt.mockReturnValue({ toString: () => token });
      securityService.generateCSRFToken(sessionId);

      // Mock decryption to return invalid JSON
      CryptoJS.AES.decrypt.mockReturnValue({
        toString: () => 'invalid-json{'
      });

      const isValid = securityService.validateCSRFToken(token, sessionId);
      expect(isValid).toBe(false);
    });

    it('should handle rate limiting with non-string identifier', () => {
      const result = securityService.checkRateLimit(undefined);
      
      expect(result.allowed).toBe(true);
      expect(result.error).toBeDefined();
    });
  });
}); 