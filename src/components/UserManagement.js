import React, { useState, useEffect } from 'react';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES, ROLE_DISPLAY_NAMES } from '../constants/roles';
import { useUserManagementPermissions } from '../hooks/usePermissions';
import LoadingSpinner from './LoadingSpinner';

const UserManagement = () => {
  const { 
    users, 
    isLoading, 
    error, 
    assignRole, 
    removeRole, 
    loadUsers, 
    clearError,
    currentUserRole,
    getUsersByRole 
  } = useRole();
  
  const { user: currentUser } = useAuth();
  const { canViewUsers, canEditUsers, canAssignRoles } = useUserManagementPermissions();
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    if (canViewUsers) {
      loadUsers();
    }
  }, [canViewUsers, loadUsers]);

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.assignedBy && user.assignedBy.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Check if current user can assign a specific role
  const canAssignRole = (roleToAssign) => {
    if (!canAssignRoles) return false;
    
    // Admin can assign any role
    if (currentUserRole === USER_ROLES.ADMIN) return true;
    
    // Supervisors can assign roles to PhD candidates only
    if (currentUserRole === USER_ROLES.SUPERVISOR) {
      return roleToAssign === USER_ROLES.PHD_CANDIDATE;
    }
    
    return false;
  };

  const handleRoleAssignment = async () => {
    if (!selectedUser || !newRole) return;
    
    setIsAssigning(true);
    const result = await assignRole(selectedUser.userId, newRole, currentUser.id);
    
    if (result.success) {
      setSelectedUser(null);
      setNewRole('');
      setShowConfirmDialog(false);
    }
    
    setIsAssigning(false);
  };

  const handleRoleRemoval = async () => {
    if (!selectedUser) return;
    
    setIsAssigning(true);
    const result = await removeRole(selectedUser.userId, currentUser.id);
    
    if (result.success) {
      setSelectedUser(null);
      setShowConfirmDialog(false);
    }
    
    setIsAssigning(false);
  };

  const openConfirmDialog = (user, action, role = '') => {
    setSelectedUser(user);
    setActionType(action);
    setNewRole(role);
    setShowConfirmDialog(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleStats = () => {
    const stats = Object.values(USER_ROLES).reduce((acc, role) => {
      acc[role] = getUsersByRole(role).length;
      return acc;
    }, {});
    return stats;
  };

  if (!canViewUsers) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
        <p className="text-gray-600">You don&rsquo;t have permission to view user management.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
        <p className="text-center mt-4">Loading users...</p>
      </div>
    );
  }

  const roleStats = getRoleStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
        <p className="text-gray-600">Manage user roles and permissions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Role Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(roleStats).map(([role, count]) => (
          <div key={role} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{count}</div>
            <div className="text-sm text-gray-600">{ROLE_DISPLAY_NAMES[role]}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user ID or assigned by..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              {Object.entries(ROLE_DISPLAY_NAMES).map(([role, displayName]) => (
                <option key={role} value={role}>{displayName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned By
                </th>
                {canAssignRoles && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.userId}
                    {user.userId === currentUser.id && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === USER_ROLES.ADMIN ? 'bg-purple-100 text-purple-800' :
                      user.role === USER_ROLES.SUPERVISOR ? 'bg-green-100 text-green-800' :
                      user.role === USER_ROLES.VIVA_COMMISSION ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ROLE_DISPLAY_NAMES[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.assignedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.assignedBy}
                  </td>
                  {canAssignRoles && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.userId !== currentUser.id && (
                        <>
                          <div className="flex space-x-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value && canAssignRole(e.target.value)) {
                                  openConfirmDialog(user, 'assign', e.target.value);
                                }
                                e.target.value = '';
                              }}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1"
                              defaultValue=""
                            >
                              <option value="">Change Role</option>
                              {Object.entries(ROLE_DISPLAY_NAMES).map(([role, displayName]) => (
                                canAssignRole(role) && role !== user.role && (
                                  <option key={role} value={role}>{displayName}</option>
                                )
                              ))}
                            </select>
                            <button
                              onClick={() => openConfirmDialog(user, 'remove')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove Role
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Confirm Action
              </h3>
              <div className="mt-2 px-7 py-3">
                {actionType === 'assign' ? (
                  <p className="text-sm text-gray-500">
                    Are you sure you want to assign the role &ldquo;{ROLE_DISPLAY_NAMES[newRole]}&rdquo; to user &ldquo;{selectedUser?.userId}&rdquo;?
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Are you sure you want to remove the role from user &ldquo;{selectedUser?.userId}&rdquo;?
                  </p>
                )}
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button
                  onClick={actionType === 'assign' ? handleRoleAssignment : handleRoleRemoval}
                  className={`px-4 py-2 text-white text-base font-medium rounded-md focus:outline-none focus:ring-2 ${
                    actionType === 'assign' 
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                  }`}
                  disabled={isAssigning}
                >
                  {isAssigning ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 