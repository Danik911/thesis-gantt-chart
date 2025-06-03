import { 
  USER_ROLES, 
  PERMISSIONS, 
  ROLE_PERMISSIONS, 
  ROLE_HIERARCHY, 
  DEFAULT_ROLE,
  ROLE_SESSION_TIMEOUTS 
} from '../constants/roles';

class RoleService {
  constructor() {
    this.storageKey = 'user_roles';
    this.sessionKey = 'role_session';
  }

  /**
   * Check if user has a specific permission
   * @param {string} userRole - User's role
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  hasPermission(userRole, permission) {
    if (!userRole || !permission) return false;
    
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   * @param {string} userRole - User's role
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean}
   */
  hasAnyPermission(userRole, permissions) {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if user has all specified permissions
   * @param {string} userRole - User's role
   * @param {string[]} permissions - Array of permissions to check
   * @returns {boolean}
   */
  hasAllPermissions(userRole, permissions) {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Get all permissions for a role
   * @param {string} role - Role to get permissions for
   * @returns {string[]}
   */
  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if role exists
   * @param {string} role - Role to validate
   * @returns {boolean}
   */
  isValidRole(role) {
    return Object.values(USER_ROLES).includes(role);
  }

  /**
   * Get role hierarchy level
   * @param {string} role - Role to get level for
   * @returns {number}
   */
  getRoleLevel(role) {
    return ROLE_HIERARCHY[role] || 0;
  }

  /**
   * Check if role A has higher or equal level than role B
   * @param {string} roleA - First role
   * @param {string} roleB - Second role
   * @returns {boolean}
   */
  hasHigherOrEqualRole(roleA, roleB) {
    return this.getRoleLevel(roleA) >= this.getRoleLevel(roleB);
  }

  /**
   * Store user role information
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @param {Object} metadata - Additional role metadata
   */
  setUserRole(userId, role, metadata = {}) {
    if (!this.isValidRole(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const roleData = {
      userId,
      role,
      assignedAt: new Date().toISOString(),
      assignedBy: metadata.assignedBy || 'system',
      ...metadata
    };

    const existingRoles = this.getAllUserRoles();
    existingRoles[userId] = roleData;
    
    localStorage.setItem(this.storageKey, JSON.stringify(existingRoles));
    this.logAuditEvent('ROLE_ASSIGNED', { userId, role, assignedBy: metadata.assignedBy });
  }

  /**
   * Get user role
   * @param {string} userId - User ID
   * @returns {Object|null}
   */
  getUserRole(userId) {
    const roles = this.getAllUserRoles();
    return roles[userId] || null;
  }

  /**
   * Get all user roles
   * @returns {Object}
   */
  getAllUserRoles() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading user roles:', error);
      return {};
    }
  }

  /**
   * Remove user role
   * @param {string} userId - User ID
   * @param {string} removedBy - Who removed the role
   */
  removeUserRole(userId, removedBy = 'system') {
    const roles = this.getAllUserRoles();
    const oldRole = roles[userId]?.role;
    
    if (roles[userId]) {
      delete roles[userId];
      localStorage.setItem(this.storageKey, JSON.stringify(roles));
      this.logAuditEvent('ROLE_REMOVED', { userId, oldRole, removedBy });
    }
  }

  /**
   * Get default role for new users
   * @returns {string}
   */
  getDefaultRole() {
    return DEFAULT_ROLE;
  }

  /**
   * Initialize role session with timeout
   * @param {string} userId - User ID
   * @param {string} role - User role
   */
  initializeSession(userId, role) {
    const timeout = ROLE_SESSION_TIMEOUTS[role] || ROLE_SESSION_TIMEOUTS[DEFAULT_ROLE];
    const sessionData = {
      userId,
      role,
      startTime: Date.now(),
      timeout: timeout * 60 * 1000, // Convert to milliseconds
      lastActivity: Date.now()
    };

    sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    this.scheduleSessionCheck();
  }

  /**
   * Update session activity
   */
  updateSessionActivity() {
    const session = this.getSessionData();
    if (session) {
      session.lastActivity = Date.now();
      sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  /**
   * Get current session data
   * @returns {Object|null}
   */
  getSessionData() {
    try {
      const stored = sessionStorage.getItem(this.sessionKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading session data:', error);
      return null;
    }
  }

  /**
   * Check if session is valid
   * @returns {boolean}
   */
  isSessionValid() {
    const session = this.getSessionData();
    if (!session) return false;

    const now = Date.now();
    const sessionAge = now - session.startTime;
    const inactivityTime = now - session.lastActivity;

    // Check if session has expired
    if (sessionAge > session.timeout) {
      this.clearSession();
      return false;
    }

    // Check for inactivity timeout (30 minutes)
    const inactivityTimeout = 30 * 60 * 1000;
    if (inactivityTime > inactivityTimeout) {
      this.clearSession();
      return false;
    }

    return true;
  }

  /**
   * Clear session data
   */
  clearSession() {
    sessionStorage.removeItem(this.sessionKey);
  }

  /**
   * Schedule session validation check
   */
  scheduleSessionCheck() {
    // Check every 5 minutes
    setTimeout(() => {
      if (!this.isSessionValid()) {
        // Session expired, trigger logout
        window.dispatchEvent(new CustomEvent('sessionExpired'));
      } else {
        this.scheduleSessionCheck();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Log audit events
   * @param {string} action - Action performed
   * @param {Object} details - Action details
   */
  logAuditEvent(action, details) {
    const auditLog = this.getAuditLog();
    const event = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ip: 'client-side' // In a real app, this would be captured server-side
    };

    auditLog.push(event);
    
    // Keep only last 1000 events
    if (auditLog.length > 1000) {
      auditLog.splice(0, auditLog.length - 1000);
    }

    localStorage.setItem('audit_log', JSON.stringify(auditLog));
  }

  /**
   * Get audit log
   * @returns {Array}
   */
  getAuditLog() {
    try {
      const stored = localStorage.getItem('audit_log');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading audit log:', error);
      return [];
    }
  }

  /**
   * Clear audit log (admin only)
   */
  clearAuditLog() {
    localStorage.removeItem('audit_log');
    this.logAuditEvent('AUDIT_LOG_CLEARED', {});
  }

  /**
   * Get users by role
   * @param {string} role - Role to filter by
   * @returns {Array}
   */
  getUsersByRole(role) {
    const allRoles = this.getAllUserRoles();
    return Object.entries(allRoles)
      .filter(([_, roleData]) => roleData.role === role)
      .map(([userId, roleData]) => ({ userId, ...roleData }));
  }

  /**
   * Validate role transition
   * @param {string} fromRole - Current role
   * @param {string} toRole - Target role
   * @param {string} requestedBy - Who is requesting the change
   * @returns {boolean}
   */
  canTransitionRole(fromRole, toRole, requestedBy) {
    const requesterRole = this.getUserRole(requestedBy)?.role;
    
    // Only admin can assign admin role
    if (toRole === USER_ROLES.ADMIN && requesterRole !== USER_ROLES.ADMIN) {
      return false;
    }

    // Users can only assign roles at their level or below
    if (!this.hasHigherOrEqualRole(requesterRole, toRole)) {
      return false;
    }

    return true;
  }
}

export default new RoleService(); 