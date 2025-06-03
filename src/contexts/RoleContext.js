import React, { createContext, useContext, useReducer, useEffect } from 'react';
import roleService from '../services/roleService';
import { useAuth } from './AuthContext';
import { USER_ROLES, DEFAULT_ROLE } from '../constants/roles';

// Role context
const RoleContext = createContext();

// Role state
const initialState = {
  currentUserRole: null,
  permissions: [],
  users: [],
  isLoading: false,
  error: null,
  auditLog: [],
  sessionExpired: false
};

// Role actions
const ROLE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER_ROLE: 'SET_USER_ROLE',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  SET_USERS: 'SET_USERS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_AUDIT_LOG: 'SET_AUDIT_LOG',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  CLEAR_SESSION_EXPIRED: 'CLEAR_SESSION_EXPIRED',
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE'
};

// Role reducer
function roleReducer(state, action) {
  switch (action.type) {
    case ROLE_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case ROLE_ACTIONS.SET_USER_ROLE:
      return {
        ...state,
        currentUserRole: action.payload.role,
        permissions: action.payload.permissions,
        isLoading: false,
        error: null
      };

    case ROLE_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload
      };

    case ROLE_ACTIONS.SET_USERS:
      return {
        ...state,
        users: action.payload
      };

    case ROLE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case ROLE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case ROLE_ACTIONS.SET_AUDIT_LOG:
      return {
        ...state,
        auditLog: action.payload
      };

    case ROLE_ACTIONS.SESSION_EXPIRED:
      return {
        ...state,
        sessionExpired: true
      };

    case ROLE_ACTIONS.CLEAR_SESSION_EXPIRED:
      return {
        ...state,
        sessionExpired: false
      };

    case ROLE_ACTIONS.UPDATE_USER_ROLE:
      return {
        ...state,
        users: state.users.map(user => 
          user.userId === action.payload.userId 
            ? { ...user, ...action.payload.roleData }
            : user
        )
      };

    default:
      return state;
  }
}

// Role provider component
export function RoleProvider({ children }) {
  const [state, dispatch] = useReducer(roleReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Initialize roles when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeUserRole();
    } else {
      // Clear role data when user logs out
      dispatch({ type: ROLE_ACTIONS.SET_USER_ROLE, payload: { role: null, permissions: [] } });
    }
  }, [isAuthenticated, user]);

  // Listen for session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch({ type: ROLE_ACTIONS.SESSION_EXPIRED });
    };

    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
  }, []);

  // Initialize user role
  const initializeUserRole = async () => {
    try {
      dispatch({ type: ROLE_ACTIONS.SET_LOADING, payload: true });

      let userRole = roleService.getUserRole(user.id);
      
      // If user doesn't have a role, assign default role
      if (!userRole) {
        const defaultRole = roleService.getDefaultRole();
        roleService.setUserRole(user.id, defaultRole, {
          assignedBy: 'system',
          isDefault: true
        });
        userRole = { role: defaultRole };
      }

      // Initialize role session
      roleService.initializeSession(user.id, userRole.role);

      // Get permissions for the role
      const permissions = roleService.getRolePermissions(userRole.role);

      dispatch({
        type: ROLE_ACTIONS.SET_USER_ROLE,
        payload: { role: userRole.role, permissions }
      });

      // Load additional data if user has permissions
      if (roleService.hasPermission(userRole.role, 'view_users')) {
        loadUsers();
      }

      if (roleService.hasPermission(userRole.role, 'view_audit_log')) {
        loadAuditLog();
      }

    } catch (error) {
      console.error('Failed to initialize user role:', error);
      dispatch({
        type: ROLE_ACTIONS.SET_ERROR,
        payload: error.message
      });
    }
  };

  // Load all users (for user management)
  const loadUsers = () => {
    try {
      const allRoles = roleService.getAllUserRoles();
      const users = Object.entries(allRoles).map(([userId, roleData]) => ({
        userId,
        ...roleData
      }));
      dispatch({ type: ROLE_ACTIONS.SET_USERS, payload: users });
    } catch (error) {
      console.error('Failed to load users:', error);
      dispatch({
        type: ROLE_ACTIONS.SET_ERROR,
        payload: 'Failed to load users'
      });
    }
  };

  // Load audit log
  const loadAuditLog = () => {
    try {
      const auditLog = roleService.getAuditLog();
      dispatch({ type: ROLE_ACTIONS.SET_AUDIT_LOG, payload: auditLog });
    } catch (error) {
      console.error('Failed to load audit log:', error);
      dispatch({
        type: ROLE_ACTIONS.SET_ERROR,
        payload: 'Failed to load audit log'
      });
    }
  };

  // Assign role to user
  const assignRole = async (userId, newRole, assignedBy) => {
    try {
      dispatch({ type: ROLE_ACTIONS.SET_LOADING, payload: true });

      // Check if current user can assign this role
      if (!roleService.canTransitionRole(state.currentUserRole, newRole, user.id)) {
        throw new Error('Insufficient permissions to assign this role');
      }

      roleService.setUserRole(userId, newRole, { assignedBy });

      // Update local state
      const updatedUser = roleService.getUserRole(userId);
      dispatch({
        type: ROLE_ACTIONS.UPDATE_USER_ROLE,
        payload: { userId, roleData: updatedUser }
      });

      // Reload users to get updated data
      loadUsers();
      loadAuditLog();

      dispatch({ type: ROLE_ACTIONS.SET_LOADING, payload: false });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to assign role:', error);
      dispatch({
        type: ROLE_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Remove role from user
  const removeRole = async (userId, removedBy) => {
    try {
      dispatch({ type: ROLE_ACTIONS.SET_LOADING, payload: true });

      roleService.removeUserRole(userId, removedBy);

      // Update local state
      const updatedUsers = state.users.filter(user => user.userId !== userId);
      dispatch({ type: ROLE_ACTIONS.SET_USERS, payload: updatedUsers });

      loadAuditLog();
      dispatch({ type: ROLE_ACTIONS.SET_LOADING, payload: false });

      return { success: true };
    } catch (error) {
      console.error('Failed to remove role:', error);
      dispatch({
        type: ROLE_ACTIONS.SET_ERROR,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Check permission
  const hasPermission = (permission) => {
    return roleService.hasPermission(state.currentUserRole, permission);
  };

  // Check multiple permissions
  const hasAnyPermission = (permissions) => {
    return roleService.hasAnyPermission(state.currentUserRole, permissions);
  };

  // Check all permissions
  const hasAllPermissions = (permissions) => {
    return roleService.hasAllPermissions(state.currentUserRole, permissions);
  };

  // Update session activity
  const updateActivity = () => {
    roleService.updateSessionActivity();
  };

  // Handle session expiration
  const handleSessionExpiration = () => {
    dispatch({ type: ROLE_ACTIONS.CLEAR_SESSION_EXPIRED });
    // This should trigger a logout in the auth context
    window.dispatchEvent(new CustomEvent('forceLogout'));
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: ROLE_ACTIONS.CLEAR_ERROR });
  };

  // Get users by role
  const getUsersByRole = (role) => {
    return state.users.filter(user => user.role === role);
  };

  // Context value
  const value = {
    // State
    currentUserRole: state.currentUserRole,
    permissions: state.permissions,
    users: state.users,
    isLoading: state.isLoading,
    error: state.error,
    auditLog: state.auditLog,
    sessionExpired: state.sessionExpired,

    // Actions
    assignRole,
    removeRole,
    loadUsers,
    loadAuditLog,
    updateActivity,
    handleSessionExpiration,
    clearError,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Utilities
    getUsersByRole,
    getRolePermissions: roleService.getRolePermissions,
    isValidRole: roleService.isValidRole,
    getRoleLevel: roleService.getRoleLevel
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

// Hook to use role context
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

// HOC for role-based component rendering
export function withRole(Component, requiredPermissions = []) {
  return function RoleProtectedComponent(props) {
    const { hasAllPermissions, currentUserRole } = useRole();

    if (!currentUserRole) {
      return <div>Loading permissions...</div>;
    }

    if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
      return (
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
          <p className="text-gray-600">You don&rsquo;t have permission to access this feature.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
} 