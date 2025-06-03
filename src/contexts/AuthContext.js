import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

// Authentication context
const AuthContext = createContext();

// Authentication state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  repositories: [],
  hasRepositoryAccess: false,
};

// Authentication actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_REPOSITORIES: 'SET_REPOSITORIES',
  SET_REPOSITORY_ACCESS: 'SET_REPOSITORY_ACCESS',
  TOKEN_REFRESH_START: 'TOKEN_REFRESH_START',
  TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILURE: 'TOKEN_REFRESH_FAILURE',
};

// Authentication reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.SET_REPOSITORIES:
      return {
        ...state,
        repositories: action.payload,
      };

    case AUTH_ACTIONS.SET_REPOSITORY_ACCESS:
      return {
        ...state,
        hasRepositoryAccess: action.payload,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_START:
      return {
        ...state,
        isLoading: true,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
        user: null,
        isAuthenticated: false,
      };

    default:
      return state;
  }
}

// Authentication provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      // Check if user has stored tokens
      const storedUser = authService.getStoredUserInfo();
      const hasToken = authService.getStoredToken();

      if (hasToken && storedUser) {
        // Validate stored token
        const isValidToken = await authService.validateToken();
        
        if (isValidToken) {
          authService.user = storedUser;
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user: storedUser }
          });
        } else {
          // Token is invalid, clear stored data
          authService.logout();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
    }
  };

  // Login with GitHub OAuth
  const login = () => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      // Generate state for security
      const state = authService.generateState();
      sessionStorage.setItem('oauth_state', state);
      
      // Get authorization URL and redirect
      const authUrl = authService.getAuthorizationUrl(state);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login initiation failed:', error);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
    }
  };

  // Handle OAuth callback
  const handleOAuthCallback = async (code, receivedState) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      // Validate state parameter
      const storedState = sessionStorage.getItem('oauth_state');
      if (!authService.validateState(receivedState, storedState)) {
        throw new Error('Invalid state parameter. Possible CSRF attack.');
      }

      // Exchange code for token
      const result = await authService.exchangeCodeForToken(code, receivedState);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: result.user }
      });

      // Clean up state
      sessionStorage.removeItem('oauth_state');

      return result;
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  };

  // Logout
  const logout = () => {
    authService.logout();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.TOKEN_REFRESH_START });
      
      await authService.refreshAccessToken();
      
      dispatch({ type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS });
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_FAILURE,
        payload: { error: error.message }
      });
      return false;
    }
  };

  // Get user repositories
  const fetchRepositories = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const repositories = await authService.getRepositories();
      
      dispatch({
        type: AUTH_ACTIONS.SET_REPOSITORIES,
        payload: repositories
      });
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      return repositories;
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Check repository access
  const checkRepositoryAccess = async (owner, repo) => {
    try {
      const accessInfo = await authService.checkRepositoryAccess(owner, repo);
      
      dispatch({
        type: AUTH_ACTIONS.SET_REPOSITORY_ACCESS,
        payload: accessInfo.hasAccess
      });
      
      return accessInfo;
    } catch (error) {
      console.error('Failed to check repository access:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Clear errors
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Get Octokit instance for API calls
  const getOctokit = () => {
    return authService.getOctokit();
  };

  // Check if user has specific scopes
  const hasScope = (scope) => {
    // This would need to be implemented based on how you store scope information
    // For now, we'll assume all required scopes are granted
    return true;
  };

  // Context value
  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    repositories: state.repositories,
    hasRepositoryAccess: state.hasRepositoryAccess,
    
    // Actions
    login,
    logout,
    handleOAuthCallback,
    refreshToken,
    fetchRepositories,
    checkRepositoryAccess,
    clearError,
    getOctokit,
    hasScope,
    
    // Utilities
    authService,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting routes that require authentication
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this feature.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

export default AuthContext; 