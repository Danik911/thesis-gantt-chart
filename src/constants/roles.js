// Role definitions for thesis management system
export const USER_ROLES = {
  PHD_CANDIDATE: 'phd_candidate',
  SUPERVISOR: 'supervisor',
  VIVA_COMMISSION: 'viva_commission',
  ADMIN: 'admin'
};

// Permission definitions
export const PERMISSIONS = {
  // Gantt Chart permissions
  VIEW_GANTT: 'view_gantt',
  EDIT_GANTT: 'edit_gantt',
  DELETE_GANTT: 'delete_gantt',
  
  // File management permissions
  UPLOAD_FILES: 'upload_files',
  DELETE_FILES: 'delete_files',
  VIEW_FILES: 'view_files',
  EDIT_FILES: 'edit_files',
  
  // User management permissions
  VIEW_USERS: 'view_users',
  EDIT_USERS: 'edit_users',
  ASSIGN_ROLES: 'assign_roles',
  
  // Progress tracking permissions
  VIEW_PROGRESS: 'view_progress',
  EDIT_PROGRESS: 'edit_progress',
  
  // Comments and feedback permissions
  ADD_COMMENTS: 'add_comments',
  EDIT_COMMENTS: 'edit_comments',
  DELETE_COMMENTS: 'delete_comments',
  
  // Administrative permissions
  VIEW_AUDIT_LOG: 'view_audit_log',
  SYSTEM_SETTINGS: 'system_settings',
  
  // Assessment permissions
  ASSESS_WORK: 'assess_work',
  APPROVE_MILESTONES: 'approve_milestones',
  
  // Export permissions
  EXPORT_DATA: 'export_data',
  EXPORT_REPORTS: 'export_reports'
};

// Role-permission mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.PHD_CANDIDATE]: [
    PERMISSIONS.VIEW_GANTT,
    PERMISSIONS.EDIT_GANTT,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.EDIT_FILES,
    PERMISSIONS.VIEW_PROGRESS,
    PERMISSIONS.EDIT_PROGRESS,
    PERMISSIONS.ADD_COMMENTS,
    PERMISSIONS.EDIT_COMMENTS,
    PERMISSIONS.EXPORT_DATA
  ],
  
  [USER_ROLES.SUPERVISOR]: [
    PERMISSIONS.VIEW_GANTT,
    PERMISSIONS.EDIT_GANTT,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.DELETE_FILES,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.EDIT_FILES,
    PERMISSIONS.VIEW_PROGRESS,
    PERMISSIONS.EDIT_PROGRESS,
    PERMISSIONS.ADD_COMMENTS,
    PERMISSIONS.EDIT_COMMENTS,
    PERMISSIONS.DELETE_COMMENTS,
    PERMISSIONS.ASSESS_WORK,
    PERMISSIONS.APPROVE_MILESTONES,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_USERS
  ],
  
  [USER_ROLES.VIVA_COMMISSION]: [
    PERMISSIONS.VIEW_GANTT,
    PERMISSIONS.VIEW_FILES,
    PERMISSIONS.VIEW_PROGRESS,
    PERMISSIONS.ADD_COMMENTS,
    PERMISSIONS.ASSESS_WORK,
    PERMISSIONS.EXPORT_REPORTS
  ],
  
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS) // Admin has all permissions
};

// Role hierarchy (higher roles inherit permissions from lower roles)
export const ROLE_HIERARCHY = {
  [USER_ROLES.PHD_CANDIDATE]: 1,
  [USER_ROLES.SUPERVISOR]: 2,
  [USER_ROLES.VIVA_COMMISSION]: 2,
  [USER_ROLES.ADMIN]: 3
};

// Role display names
export const ROLE_DISPLAY_NAMES = {
  [USER_ROLES.PHD_CANDIDATE]: 'PhD Candidate',
  [USER_ROLES.SUPERVISOR]: 'Supervisor',
  [USER_ROLES.VIVA_COMMISSION]: 'Viva Commission',
  [USER_ROLES.ADMIN]: 'Administrator'
};

// Default role for new users
export const DEFAULT_ROLE = USER_ROLES.PHD_CANDIDATE;

// Session timeout durations by role (in minutes)
export const ROLE_SESSION_TIMEOUTS = {
  [USER_ROLES.PHD_CANDIDATE]: 480, // 8 hours
  [USER_ROLES.SUPERVISOR]: 240, // 4 hours
  [USER_ROLES.VIVA_COMMISSION]: 120, // 2 hours
  [USER_ROLES.ADMIN]: 60 // 1 hour (more secure)
}; 