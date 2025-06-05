import securityService from './securityService';
import encryptionService from './encryptionService';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';

class AuthService {
  constructor() {
    // Retain general session management if needed for other purposes
    this.user = null; // Generic user, not GitHub specific anymore
    this.sessionId = securityService.generateSessionId();
    this.csrfToken = null; // If CSRF is used for other non-GitHub forms
    console.log('AuthService initialized for non-GitHub auth or general session management.');
  }

  // Example: A general login method if you plan to implement other auth
  // async login(credentials) {
  //   // Implement other login logic here
  //   // this.user = ...;
  //   // this.storeUserSession();
  //   // return this.user;
  // }

  // Example: A general logout method
  logout() {
    if (this.csrfToken) {
      securityService.removeCSRFToken(this.csrfToken); // If CSRF tokens are used
    }
    encryptionService.clearEncryptionData(); // If encryption is used

    this.user = null;
    this.sessionId = null; // Or regenerate if sessions persist logged out
    this.csrfToken = null;

    // Clear any generic session storage you might implement
    // localStorage.removeItem('app_user_info');
    // sessionStorage.removeItem('app_session_token');
    
    console.log('User logged out, session cleared.');
  }

  // Example: Check if a user is generally authenticated
  isAuthenticated() {
    return !!this.user; // Based on a generic user object
  }

  getCurrentUser() {
    return this.user; // Or load from a generic session storage
    // return this.user || this.getStoredAppUserInfo();
  }
  
  // Store generic user info if needed
  // storeAppUserInfo(userData) {
  //   localStorage.setItem('app_user_info', JSON.stringify(userData));
  // }

  // Get generic stored user info
  // getStoredAppUserInfo() {
  //   const storedUser = localStorage.getItem('app_user_info');
  //   return storedUser ? JSON.parse(storedUser) : null;
  // }


  // --- Methods related to GitHub OAuth have been removed ---
  // getAuthorizationUrl
  // exchangeCodeForToken
  // initializeOctokit
  // fetchUserInfo
  // refreshAccessToken
  // validateToken
  // storeTokens (GitHub specific)
  // getStoredToken (GitHub specific)
  // getStoredRefreshToken (GitHub specific)
  // storeUserInfo (GitHub specific)
  // getStoredUserInfo (GitHub specific)
  // generateState (OAuth specific)
  // validateState (OAuth specific)
  // getRepositories (GitHub specific)
  // checkRepositoryAccess (GitHub specific)
  // getPublicKey (GitHub specific)
  // encryptForUser (GitHub specific)
  // decryptFromUser (GitHub specific)

  // --- Octokit and related imports are removed ---

  // Session and CSRF methods might still be relevant if you have other forms
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = securityService.generateSessionId();
    }
    return this.sessionId;
  }

  getCSRFToken() {
    if (!this.csrfToken && this.sessionId) {
      this.csrfToken = securityService.generateCSRFToken(this.sessionId);
    }
    return this.csrfToken;
  }

  validateCSRFToken(token) {
    return securityService.validateCSRFToken(token, this.sessionId);
  }

  // Rate limiting might still be useful for other API calls if any
  // checkRateLimit(maxRequests, windowMs) {
  //   // Implementation for general rate limiting
  // }
}

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Authentication service object
export const authService = {
  // Sign in with email and password
  signIn: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  // Sign up with email and password
  signUp: async (email, password, displayName = '') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      return { user: userCredential.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Send password reset email
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Get current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};

const authServiceInstance = new AuthService();
export default authServiceInstance; 