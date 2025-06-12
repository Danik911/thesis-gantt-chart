import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const FolderManager = ({ 
  folders, 
  currentFolder, 
  onFolderSelect, 
  onFolderCreate, 
  onFolderDelete, 
  onFolderRename,
  fileCount = {} 
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState('/');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/']));
  const [editingFolder, setEditingFolder] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');

  // Build folder tree structure
  const buildFolderTree = () => {
    const tree = {};
    const sortedFolders = [...folders].sort((a, b) => a.path.localeCompare(b.path));

    // Initialize with root
    tree['/'] = {
      path: '/',
      name: 'Root',
      children: {},
      fileCount: fileCount['/'] || 0
    };

    sortedFolders.forEach(folder => {
      const pathParts = folder.path.split('/').filter(part => part);
      let currentLevel = tree;
      let currentPath = '';

      pathParts.forEach((part, index) => {
        currentPath += `/${part}`;
        
        if (!currentLevel[currentPath]) {
          currentLevel[currentPath] = {
            path: currentPath,
            name: part,
            children: {},
            fileCount: fileCount[currentPath] || 0
          };
        }
        
        currentLevel = currentLevel[currentPath].children;
      });
    });

    return tree;
  };

  const folderTree = buildFolderTree();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const folderPath = newFolderParent === '/' 
      ? `/${newFolderName.trim()}` 
      : `${newFolderParent}/${newFolderName.trim()}`;

    try {
      await onFolderCreate(folderPath, newFolderName.trim());
      setNewFolderName('');
      setShowCreateForm(false);
      setNewFolderParent('/');
    } catch (error) {
      alert(`Failed to create folder: ${error.message}`);
    }
  };

  const handleDeleteFolder = async (folderPath) => {
    const folderFiles = fileCount[folderPath] || 0;
    const message = folderFiles > 0 
      ? `Delete "${folderPath}"? ${folderFiles} files will be moved to General folder.`
      : `Delete "${folderPath}"?`;
    
    if (window.confirm(message)) {
      try {
        await onFolderDelete(folderPath);
      } catch (error) {
        alert(`Failed to delete folder: ${error.message}`);
      }
    }
  };

  const handleRenameFolder = async (folderPath) => {
    if (!editFolderName.trim() || editFolderName === folderPath.split('/').pop()) {
      setEditingFolder(null);
      return;
    }

    try {
      const pathParts = folderPath.split('/');
      pathParts[pathParts.length - 1] = editFolderName.trim();
      const newPath = pathParts.join('/');
      
      await onFolderRename(folderPath, newPath);
      setEditingFolder(null);
      setEditFolderName('');
    } catch (error) {
      alert(`Failed to rename folder: ${error.message}`);
    }
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolderTree = (folders, level = 0) => {
    return Object.entries(folders).map(([path, folder]) => {
      const isExpanded = expandedFolders.has(path);
      const hasChildren = Object.keys(folder.children).length > 0;
      const isSelected = currentFolder === path;
      const isRoot = path === '/';

      return (
        <div key={path} className="select-none">
          <div 
            className={`flex items-center py-1 px-2 rounded cursor-pointer transition-colors ${
              isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
            onClick={() => onFolderSelect(path)}
          >
            {/* Expand/Collapse icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleFolder(path);
              }}
              className="mr-1 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {hasChildren ? (
                isExpanded ? '📂' : '📁'
              ) : '📄'}
            </button>

            {/* Folder name */}
            {editingFolder === path ? (
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onBlur={() => handleRenameFolder(path)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleRenameFolder(path);
                  if (e.key === 'Escape') setEditingFolder(null);
                }}
                className="flex-1 px-1 text-sm border rounded"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm">
                {folder.name}
                {folder.fileCount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({folder.fileCount})</span>
                )}
              </span>
            )}

            {/* Folder actions */}
            {!isRoot && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolder(path);
                    setEditFolderName(folder.name);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 text-xs"
                  title="Rename folder"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(path);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 text-xs"
                  title="Delete folder"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          {/* Render children */}
          {hasChildren && isExpanded && (
            <div>
              {renderFolderTree(folder.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          📁 Folders
        </h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          + New Folder
        </button>
      </div>

      {/* Create folder form */}
      {showCreateForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Folder
              </label>
              <select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="/">Root</option>
                {folders.map(folder => (
                  <option key={folder.path} value={folder.path}>
                    {folder.path}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFolderName('');
                  setNewFolderParent('/');
                }}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder tree */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {renderFolderTree(folderTree)}
      </div>

      {folders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📁</div>
          <p className="font-medium">No folders yet</p>
          <p className="text-sm">Create your first folder to organize files</p>
        </div>
      )}
    </div>
  );
};

FolderManager.propTypes = {
  folders: PropTypes.array.isRequired,
  currentFolder: PropTypes.string,
  onFolderSelect: PropTypes.func.isRequired,
  onFolderCreate: PropTypes.func.isRequired,
  onFolderDelete: PropTypes.func.isRequired,
  onFolderRename: PropTypes.func.isRequired,
  fileCount: PropTypes.object
};

FolderManager.defaultProps = {
  currentFolder: '/',
  fileCount: {}
};

export default FolderManager; 