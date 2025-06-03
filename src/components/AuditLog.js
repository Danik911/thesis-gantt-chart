import React, { useState, useEffect } from 'react';
import { useRole } from '../contexts/RoleContext';
import { useAdminPermissions } from '../hooks/usePermissions';
import LoadingSpinner from './LoadingSpinner';

const AuditLog = () => {
  const { auditLog, loadAuditLog, isLoading, error, clearError } = useRole();
  const { canViewAuditLog } = useAdminPermissions();
  
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    if (canViewAuditLog) {
      loadAuditLog();
    }
  }, [canViewAuditLog, loadAuditLog]);

  useEffect(() => {
    filterLogs();
  }, [auditLog, searchTerm, actionFilter, dateFilter]);

  const filterLogs = () => {
    let filtered = [...auditLog];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.assignedBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by action type
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate = null;
      }

      if (filterDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
      }
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'ROLE_ASSIGNED':
        return '👤';
      case 'ROLE_REMOVED':
        return '❌';
      case 'LOGIN':
        return '🔓';
      case 'LOGOUT':
        return '🔒';
      case 'FILE_UPLOAD':
        return '📁';
      case 'FILE_DELETE':
        return '🗑️';
      case 'GANTT_EDIT':
        return '📊';
      case 'AUDIT_LOG_CLEARED':
        return '🧹';
      default:
        return '📝';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'ROLE_ASSIGNED':
        return 'bg-green-100 text-green-800';
      case 'ROLE_REMOVED':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-blue-100 text-blue-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      case 'FILE_UPLOAD':
        return 'bg-purple-100 text-purple-800';
      case 'FILE_DELETE':
        return 'bg-orange-100 text-orange-800';
      case 'GANTT_EDIT':
        return 'bg-indigo-100 text-indigo-800';
      case 'AUDIT_LOG_CLEARED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDetails = (details) => {
    if (!details || Object.keys(details).length === 0) return 'No additional details';
    
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  const getUniqueActions = () => {
    const actions = [...new Set(auditLog.map(log => log.action))];
    return actions.sort();
  };

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!canViewAuditLog) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
        <p className="text-gray-600">You don&rsquo;t have permission to view the audit log.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
        <p className="text-center mt-4">Loading audit log...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit Log</h2>
        <p className="text-gray-600">View system activities and user actions</p>
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

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{auditLog.length}</div>
          <div className="text-sm text-gray-600">Total Events</div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">{filteredLogs.length}</div>
          <div className="text-sm text-gray-600">Filtered Events</div>
        </div>
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{getUniqueActions().length}</div>
          <div className="text-sm text-gray-600">Action Types</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actions, users..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              {getUniqueActions().map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Agent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      <span className="mr-1">{getActionIcon(log.action)}</span>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={formatDetails(log.details)}>
                      {formatDetails(log.details)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={log.userAgent}>
                      {log.userAgent.split(' ')[0]} {/* Show browser name */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {currentLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No audit entries found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            
            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              const isCurrentPage = pageNumber === currentPage;
              
              // Show first page, last page, current page, and pages around current page
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => paginate(pageNumber)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      isCurrentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (
                pageNumber === currentPage - 3 ||
                pageNumber === currentPage + 3
              ) {
                return (
                  <span
                    key={pageNumber}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                );
              }
              return null;
            })}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default AuditLog; 