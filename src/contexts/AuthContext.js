import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService'; // authService is now generic

// Authentication context
const AuthContext = createContext();

// Authentication state
const initialState = {
  user: null, // Generic user object
  isAuthenticated: false,
  isLoading: true, // For initial auth check or other async auth ops
  error: null,
  // Removed GitHub specific state: repositories, hasRepositoryAccess
};

// Authentication actions
const AUTH_ACTIONS = {
  // Generic actions, can be expanded if a new auth system is added
  AUTH_INIT_START: 'AUTH_INIT_START',
  AUTH_INIT_SUCCESS: 'AUTH_INIT_SUCCESS',
  AUTH_INIT_FAILURE: 'AUTH_INIT_FAILURE',
  LOGIN_REQUEST: 'LOGIN_REQUEST', // For a potential new login system
  LOGIN_SUCCESS: 'LOGIN_SUCCESS', // Generic success
  LOGIN_FAILURE: 'LOGIN_FAILURE', // Generic failure
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Authentication reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_INIT_START:
    case AUTH_ACTIONS.LOGIN_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AUTH_ACTIONS.AUTH_INIT_SUCCESS:
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.AUTH_INIT_FAILURE:
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
        ...initialState, // Reset to a clean state, not GitHub specific
        isLoading: false,
      };
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    // Removed GitHub specific actions like SET_REPOSITORIES, SET_REPOSITORY_ACCESS
    // Removed TOKEN_REFRESH actions as they were GitHub specific
    default:
      return state;
  }
}

// Authentication provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeGenericAuth = async () => {
      dispatch({ type: AUTH_ACTIONS.AUTH_INIT_START });
      try {
        // Example: Check for a locally stored generic session
        // const storedUser = authService.getStoredAppUserInfo(); 
        // if (storedUser) {
        //   authService.user = storedUser; // Set in service
        //   dispatch({ type: AUTH_ACTIONS.AUTH_INIT_SUCCESS, payload: { user: storedUser } });
        // } else {
        //   dispatch({ type: AUTH_ACTIONS.AUTH_INIT_FAILURE, payload: { error: 'No active session'} });
        // }
        
        // For now, assume no user is logged in on init as GitHub auth is removed
        // And no alternative is in place yet.
        dispatch({ type: AUTH_ACTIONS.AUTH_INIT_FAILURE, payload: { error: 'Authentication system removed.'} });

      } catch (error) {
        console.error('Generic authentication initialization failed:', error);
        dispatch({
          type: AUTH_ACTIONS.AUTH_INIT_FAILURE,
          payload: { error: error.message },
        });
      }
    };
    initializeGenericAuth();
  }, []);

  // --- GitHub specific login and callback handlers removed ---
  // const login = () => { ...GitHub specific... };
  // const handleOAuthCallback = async (code, receivedState) => { ...GitHub specific... };

  // Generic logout (calls the modified authService.logout)
  const logout = () => {
    try {
      authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
        console.error('Logout failed:', error);
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error.message });
    }
  };
  
  // Placeholder for a new login mechanism if needed
  // const genericLogin = async (credentials) => {
  //   dispatch({ type: AUTH_ACTIONS.LOGIN_REQUEST });
  //   try {
  //     const user = await authService.login(credentials); // Assuming authService has a new login method
  //     dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { user } });
  //   } catch (error) {
  //     dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: { error: error.message } });
  //     throw error;
  //   }
  // };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // --- Removed GitHub specific functions like refreshToken, fetchRepositories, checkRepositoryAccess, getOctokit ---
  
  // Example: a function to check a generic permission if user object contains roles/permissions
  // const hasPermission = (permission) => {
  //   if (!state.user || !state.user.permissions) return false;
  //   return state.user.permissions.includes(permission);
  // };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        // Provide generic functions or new auth functions here
        // genericLogin, 
        logout,
        clearError,
        // hasPermission,
        // Removed GitHub specific functions from context value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optional: Higher-order component for protecting routes (can be adapted)
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    // const navigate = useNavigate(); // If using react-router for redirection

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        // Redirect to a login page or home if not authenticated
        // navigate('/login'); 
        console.log('User not authenticated, redirecting...');
      }
    }, [isLoading, isAuthenticated]); // Add navigate to dependencies if used

    if (isLoading) {
      return <div>Loading authentication...</div>; // Or a spinner component
    }

    return isAuthenticated ? <Component {...props} /> : null; // Or redirect component
  };
}

export default AuthContext; 