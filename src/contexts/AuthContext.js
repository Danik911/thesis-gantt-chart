import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

// Authentication Context for managing user state
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  loading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  SIGN_OUT: 'SIGN_OUT'
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case AUTH_ACTIONS.SIGN_OUT:
      return {
        ...state,
        user: null,
        loading: false,
        error: null
      };
    default:
      return state;
  }
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Auth actions
  const signIn = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    const result = await authService.signIn(email, password);
    
    if (result.error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: result.user });
    }
    
    return result;
  };

  const signUp = async (email, password, displayName) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    const result = await authService.signUp(email, password, displayName);
    
    if (result.error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: result.user });
    }
    
    return result;
  };

  const signInWithGoogle = async () => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    const result = await authService.signInWithGoogle();
    
    if (result.error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: result.user });
    }
    
    return result;
  };

  const signOut = async () => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    const result = await authService.signOut();
    
    if (result.error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
    } else {
      dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
    }
    
    return result;
  };

  const resetPassword = async (email) => {
    const result = await authService.resetPassword(email);
    
    if (result.error) {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: result.error });
    }
    
    return result;
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: null });
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
      } else {
        dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 