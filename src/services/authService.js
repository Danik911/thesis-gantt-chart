import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { Octokit } from '@octokit/rest';
import securityService from './securityService';
import encryptionService from './encryptionService';

class AuthService {
  constructor() {
    this.clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_GITHUB_CLIENT_SECRET;
    this.redirectUri = process.env.REACT_APP_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/callback`;
    this.scopes = ['repo', 'user', 'admin:org'];
    
    this.octokit = null;
    this.accessToken = this.getStoredToken();
    this.refreshToken = this.getStoredRefreshToken();
    this.user = null;
    this.sessionId = securityService.generateSessionId();
    this.csrfToken = null;
  }

  // Initialize OAuth app authentication
  initializeAuth() {
    if (!this.clientId) {
      throw new Error('GitHub Client ID is required. Please set REACT_APP_GITHUB_CLIENT_ID environment variable.');
    }

    this.auth = createOAuthAppAuth({
      clientType: 'oauth-app',
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state = null) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state: state || this.generateState(),
      allow_signup: 'true'
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state = null) {
    try {
      if (!this.auth) {
        this.initializeAuth();
      }

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`OAuth Error: ${data.error_description || data.error}`);
      }

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      // Store tokens securely
      this.storeTokens(this.accessToken, this.refreshToken);

      // Generate CSRF token for this session
      this.csrfToken = securityService.generateCSRFToken(this.sessionId);

      // Initialize Octokit with the new token
      await this.initializeOctokit();

      // Fetch user information
      await this.fetchUserInfo();

      return {
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
        user: this.user,
        sessionId: this.sessionId,
        csrfToken: this.csrfToken
      };
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Initialize Octokit instance with authentication
  async initializeOctokit() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    this.octokit = new Octokit({
      auth: this.accessToken,
      userAgent: 'thesis-gantt-chart v1.0.0',
    });
  }

  // Fetch authenticated user information
  async fetchUserInfo() {
    try {
      if (!this.octokit) {
        await this.initializeOctokit();
      }

      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.user = data;
      this.storeUserInfo(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      throw new Error(`Failed to fetch user information: ${error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
      }

      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      this.storeTokens(this.accessToken, this.refreshToken);
      await this.initializeOctokit();

      return this.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, clear stored tokens and require re-authentication
      this.logout();
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken && !!this.user;
  }

  // Get current user
  getCurrentUser() {
    return this.user || this.getStoredUserInfo();
  }

  // Get Octokit instance
  getOctokit() {
    return this.octokit;
  }

  // Check token validity and refresh if needed
  async validateToken() {
    try {
      if (!this.accessToken) {
        return false;
      }

      // Try to make a simple API call to validate token
      if (!this.octokit) {
        await this.initializeOctokit();
      }

      await this.octokit.rest.users.getAuthenticated();
      return true;
    } catch (error) {
      // If token is invalid, try to refresh
      if (error.status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          return true;
        } catch (refreshError) {
          console.error('Token validation and refresh failed:', refreshError);
          return false;
        }
      }
      return false;
    }
  }

  // Logout user
  logout() {
    // Remove CSRF token
    if (this.csrfToken) {
      securityService.removeCSRFToken(this.csrfToken);
    }

    // Clear encryption data
    encryptionService.clearEncryptionData();

    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.octokit = null;
    this.sessionId = null;
    this.csrfToken = null;

    // Clear stored data
    localStorage.removeItem('github_access_token');
    localStorage.removeItem('github_refresh_token');
    localStorage.removeItem('github_user_info');
    sessionStorage.removeItem('github_access_token');
  }

  // Secure token storage
  storeTokens(accessToken, refreshToken) {
    try {
      // Use sessionStorage for access token (more secure, cleared on tab close)
      sessionStorage.setItem('github_access_token', accessToken);
      
      // Use localStorage for refresh token (persists across sessions)
      if (refreshToken) {
        localStorage.setItem('github_refresh_token', refreshToken);
      }
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  // Retrieve stored tokens
  getStoredToken() {
    return sessionStorage.getItem('github_access_token') || 
           localStorage.getItem('github_access_token');
  }

  getStoredRefreshToken() {
    return localStorage.getItem('github_refresh_token');
  }

  // Store user information
  storeUserInfo(user) {
    try {
      localStorage.setItem('github_user_info', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user info:', error);
    }
  }

  // Retrieve stored user information
  getStoredUserInfo() {
    try {
      const storedUser = localStorage.getItem('github_user_info');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Failed to retrieve user info:', error);
      return null;
    }
  }

  // Generate state parameter for OAuth security
  generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Validate state parameter
  validateState(receivedState, expectedState) {
    return receivedState === expectedState;
  }

  // Handle repository operations with proper error handling
  async getRepositories() {
    try {
      if (!this.octokit) {
        await this.initializeOctokit();
      }

      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  // Check repository access permissions
  async checkRepositoryAccess(owner, repo) {
    try {
      if (!this.octokit) {
        await this.initializeOctokit();
      }

      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo
      });

      return {
        hasAccess: true,
        permissions: data.permissions || {},
        repository: data
      };
    } catch (error) {
      if (error.status === 404) {
        return {
          hasAccess: false,
          error: 'Repository not found or access denied'
        };
      }
      throw new Error(`Failed to check repository access: ${error.message}`);
    }
  }

  // Security Methods
  // ================

  /**
   * Get current session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Get current CSRF token
   * @returns {string} CSRF token
   */
  getCSRFToken() {
    return this.csrfToken;
  }

  /**
   * Validate CSRF token
   * @param {string} token - Token to validate
   * @returns {boolean} True if valid
   */
  validateCSRFToken(token) {
    return securityService.validateCSRFToken(token, this.sessionId);
  }

  /**
   * Check rate limit for current user
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {object} Rate limit status
   */
  checkRateLimit(maxRequests, windowMs) {
    const identifier = this.user?.id || this.sessionId || 'anonymous';
    return securityService.checkRateLimit(identifier, maxRequests, windowMs);
  }

  /**
   * Get user's public encryption key
   * @returns {string} Public key
   */
  getPublicKey() {
    return encryptionService.getPublicKey();
  }

  /**
   * Encrypt data for another user
   * @param {string} data - Data to encrypt
   * @param {string} recipientPublicKey - Recipient's public key
   * @returns {object} Encrypted data
   */
  encryptForUser(data, recipientPublicKey) {
    return encryptionService.encryptMessage(data, recipientPublicKey);
  }

  /**
   * Decrypt data from another user
   * @param {object} encryptedData - Encrypted data
   * @param {string} senderPublicKey - Sender's public key
   * @returns {string} Decrypted data
   */
  decryptFromUser(encryptedData, senderPublicKey) {
    return encryptionService.decryptMessage(encryptedData, senderPublicKey);
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService; 