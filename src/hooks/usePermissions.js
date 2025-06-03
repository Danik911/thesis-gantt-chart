import { useRole } from '../contexts/RoleContext';
import { PERMISSIONS } from '../constants/roles';

/**
 * Hook for permission-based UI rendering
 * @param {string|string[]} requiredPermissions - Permission(s) required
 * @param {string} mode - 'all' (default) or 'any'
 * @returns {boolean}
 */
export function usePermissions(requiredPermissions, mode = 'all') {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = useRole();

  if (!requiredPermissions) return true;

  if (typeof requiredPermissions === 'string') {
    return hasPermission(requiredPermissions);
  }

  if (Array.isArray(requiredPermissions)) {
    return mode === 'any' 
      ? hasAnyPermission(requiredPermissions)
      : hasAllPermissions(requiredPermissions);
  }

  return false;
}

/**
 * Hook for Gantt chart permissions
 */
export function useGanttPermissions() {
  const { hasPermission } = useRole();

  return {
    canView: hasPermission(PERMISSIONS.VIEW_GANTT),
    canEdit: hasPermission(PERMISSIONS.EDIT_GANTT),
    canDelete: hasPermission(PERMISSIONS.DELETE_GANTT)
  };
}

/**
 * Hook for file management permissions
 */
export function useFilePermissions() {
  const { hasPermission } = useRole();

  return {
    canView: hasPermission(PERMISSIONS.VIEW_FILES),
    canUpload: hasPermission(PERMISSIONS.UPLOAD_FILES),
    canEdit: hasPermission(PERMISSIONS.EDIT_FILES),
    canDelete: hasPermission(PERMISSIONS.DELETE_FILES)
  };
}

/**
 * Hook for user management permissions
 */
export function useUserManagementPermissions() {
  const { hasPermission } = useRole();

  return {
    canViewUsers: hasPermission(PERMISSIONS.VIEW_USERS),
    canEditUsers: hasPermission(PERMISSIONS.EDIT_USERS),
    canAssignRoles: hasPermission(PERMISSIONS.ASSIGN_ROLES)
  };
}

/**
 * Hook for assessment permissions
 */
export function useAssessmentPermissions() {
  const { hasPermission } = useRole();

  return {
    canAssess: hasPermission(PERMISSIONS.ASSESS_WORK),
    canApprove: hasPermission(PERMISSIONS.APPROVE_MILESTONES)
  };
}

/**
 * Hook for comment permissions
 */
export function useCommentPermissions() {
  const { hasPermission } = useRole();

  return {
    canAdd: hasPermission(PERMISSIONS.ADD_COMMENTS),
    canEdit: hasPermission(PERMISSIONS.EDIT_COMMENTS),
    canDelete: hasPermission(PERMISSIONS.DELETE_COMMENTS)
  };
}

/**
 * Hook for export permissions
 */
export function useExportPermissions() {
  const { hasPermission } = useRole();

  return {
    canExportData: hasPermission(PERMISSIONS.EXPORT_DATA),
    canExportReports: hasPermission(PERMISSIONS.EXPORT_REPORTS)
  };
}

/**
 * Hook for administrative permissions
 */
export function useAdminPermissions() {
  const { hasPermission } = useRole();

  return {
    canViewAuditLog: hasPermission(PERMISSIONS.VIEW_AUDIT_LOG),
    canAccessSystemSettings: hasPermission(PERMISSIONS.SYSTEM_SETTINGS)
  };
}

/**
 * Hook to check if user can perform elevated actions
 */
export function useElevatedPermissions() {
  const { hasAnyPermission } = useRole();

  const elevatedPermissions = [
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.DELETE_FILES,
    PERMISSIONS.DELETE_COMMENTS,
    PERMISSIONS.SYSTEM_SETTINGS,
    PERMISSIONS.VIEW_AUDIT_LOG
  ];

  return {
    hasElevatedAccess: hasAnyPermission(elevatedPermissions),
    elevatedPermissions
  };
}

/**
 * Hook for role-based content filtering
 * @param {Object} content - Content object with role-based visibility
 * @returns {boolean}
 */
export function useContentFilter(content) {
  const { currentUserRole, getRoleLevel, hasAllPermissions } = useRole();

  if (!content || !content.visibility) return true;

  const { visibility } = content;

  // Check role-specific visibility
  if (visibility.roles && Array.isArray(visibility.roles)) {
    return visibility.roles.includes(currentUserRole);
  }

  // Check minimum role level
  if (visibility.minimumLevel) {
    const userLevel = getRoleLevel(currentUserRole);
    return userLevel >= visibility.minimumLevel;
  }

  // Check required permissions
  if (visibility.permissions && Array.isArray(visibility.permissions)) {
    return hasAllPermissions(visibility.permissions);
  }

  return true;
}

/**
 * Hook for session management
 */
export function useSession() {
  const { updateActivity, sessionExpired, handleSessionExpiration } = useRole();

  // Auto-update activity on user interactions
  const trackActivity = () => {
    updateActivity();
  };

  return {
    trackActivity,
    sessionExpired,
    handleSessionExpiration
  };
}

/**
 * Hook for two-factor authentication requirements
 */
export function useTwoFactorAuth() {
  const { hasElevatedAccess } = useElevatedPermissions();
  const { currentUserRole } = useRole();

  // Determine if 2FA is required based on role and permissions
  const requiresTwoFactor = hasElevatedAccess || 
    ['supervisor', 'viva_commission', 'admin'].includes(currentUserRole);

  return {
    requiresTwoFactor,
    isEnabled: false, // This would be fetched from user settings in a real app
    canBypass: currentUserRole === 'phd_candidate' // PhD candidates can bypass for basic operations
  };
} 