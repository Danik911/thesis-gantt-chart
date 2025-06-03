import React, { useState, useEffect, useRef } from 'react';
import gitHubFileService from '../services/gitHubFileService';
import authService from '../services/authService';
import LoadingSpinner from './LoadingSpinner';

const GitHubFileManager = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPath, setUploadPath] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRepositories();
      updateStatusInfo();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedRepo) {
      loadFiles();
    }
  }, [selectedRepo, currentPath]);

  const checkAuthentication = async () => {
    try {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        await authService.validateToken();
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setError('Authentication check failed');
    }
  };

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const repos = await authService.getRepositories();
      setRepositories(repos);
    } catch (error) {
      setError(`Failed to load repositories: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!selectedRepo) return;

    try {
      setLoading(true);
      const [owner, repo] = selectedRepo.split('/');
      const fileList = await gitHubFileService.listFiles(owner, repo, currentPath);
      setFiles(fileList);
      setError('');
    } catch (error) {
      setError(`Failed to load files: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateStatusInfo = () => {
    const rateLimit = gitHubFileService.getRateLimitStatus();
    const cache = gitHubFileService.getCacheStatus();
    setRateLimitInfo(rateLimit);
    setCacheInfo(cache);
  };

  const handleRepoSelect = (repoFullName) => {
    setSelectedRepo(repoFullName);
    setCurrentPath('');
    setSelectedFile(null);
    setFileContent('');
    setIsEditing(false);
  };

  const navigateToFolder = (folderPath) => {
    setCurrentPath(folderPath);
    setSelectedFile(null);
    setFileContent('');
    setIsEditing(false);
  };

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(part => part !== '');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const selectFile = async (file) => {
    if (file.type === 'file') {
      try {
        setLoading(true);
        const [owner, repo] = selectedRepo.split('/');
        const content = await gitHubFileService.getFileContent(owner, repo, file.path);
        setSelectedFile(file);
        setFileContent(content.content);
        setIsEditing(false);
        updateStatusInfo();
      } catch (error) {
        setError(`Failed to load file content: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else if (file.type === 'dir') {
      navigateToFolder(file.path);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedRepo) return;

    try {
      setLoading(true);
      const [owner, repo] = selectedRepo.split('/');
      const filePath = uploadPath ? `${currentPath}/${uploadPath}` : `${currentPath}/${uploadFile.name}`;
      
      const result = await gitHubFileService.uploadFile(
        owner,
        repo,
        filePath,
        uploadFile,
        commitMessage || `Upload ${uploadFile.name}`
      );

      setSuccess(`File uploaded successfully: ${result.url}`);
      setUploadFile(null);
      setUploadPath('');
      setCommitMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload files
      await loadFiles();
      updateStatusInfo();
    } catch (error) {
      setError(`File upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpdate = async () => {
    if (!selectedFile || !selectedRepo) return;

    try {
      setLoading(true);
      const [owner, repo] = selectedRepo.split('/');
      
      const result = await gitHubFileService.updateFile(
        owner,
        repo,
        selectedFile.path,
        fileContent,
        commitMessage || `Update ${selectedFile.name}`
      );

      setSuccess(`File updated successfully: ${result.url}`);
      setIsEditing(false);
      setCommitMessage('');
      updateStatusInfo();
    } catch (error) {
      setError(`File update failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDelete = async (file) => {
    if (!file || !selectedRepo) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete ${file.name}?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const [owner, repo] = selectedRepo.split('/');
      
      await gitHubFileService.deleteFile(
        owner,
        repo,
        file.path,
        `Delete ${file.name}`
      );

      setSuccess(`File deleted successfully: ${file.name}`);
      
      // Clear selected file if it was deleted
      if (selectedFile && selectedFile.path === file.path) {
        setSelectedFile(null);
        setFileContent('');
        setIsEditing(false);
      }
      
      // Reload files
      await loadFiles();
      updateStatusInfo();
    } catch (error) {
      setError(`File deletion failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createFolderStructure = async () => {
    if (!selectedRepo) return;

    try {
      setLoading(true);
      const [owner, repo] = selectedRepo.split('/');
      
      const result = await gitHubFileService.createFolderStructure(owner, repo);
      
      setSuccess(`Folder structure created: ${result.createdFolders.join(', ')}`);
      await loadFiles();
      updateStatusInfo();
    } catch (error) {
      setError(`Failed to create folder structure: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    gitHubFileService.clearCache();
    setSuccess('Cache cleared successfully');
    updateStatusInfo();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">GitHub File Manager</h2>
          <p className="text-gray-600 mb-4">Please log in to access GitHub file management features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">GitHub File Manager</h2>
        
        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {rateLimitInfo && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-800">Rate Limit Status</h4>
              <p className="text-sm text-blue-600">
                Remaining: {rateLimitInfo.remaining} | 
                Reset: {formatDate(rateLimitInfo.reset)}
              </p>
            </div>
          )}
          {cacheInfo && (
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold text-green-800">Cache Status</h4>
              <p className="text-sm text-green-600">
                Size: {cacheInfo.size}/{cacheInfo.maxSize}
                <button 
                  onClick={clearCache}
                  className="ml-2 text-xs bg-green-200 hover:bg-green-300 px-2 py-1 rounded"
                >
                  Clear
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
            <button 
              onClick={() => setSuccess('')}
              className="mt-2 text-sm text-green-600 hover:text-green-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Repository Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Repository:
          </label>
          <select
            value={selectedRepo}
            onChange={(e) => handleRepoSelect(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a repository...</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.full_name}>
                {repo.full_name} {repo.private ? '(Private)' : '(Public)'}
              </option>
            ))}
          </select>
        </div>

        {selectedRepo && (
          <div className="mb-4">
            <button
              onClick={createFolderStructure}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              disabled={loading}
            >
              Create Default Folder Structure
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center mb-4">
          <LoadingSpinner />
        </div>
      )}

      {selectedRepo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Browser */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Files</h3>
              <div className="flex space-x-2">
                {currentPath && (
                  <button
                    onClick={navigateUp}
                    className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={loadFiles}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              Path: /{currentPath || 'root'}
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((file) => (
                <div
                  key={file.path}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedFile && selectedFile.path === file.path
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white hover:bg-gray-100 border-gray-200'
                  }`}
                  onClick={() => selectFile(file)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">
                        {file.type === 'dir' ? '📁' : '📄'}
                      </span>
                      <div>
                        <div className="font-medium">{file.name}</div>
                        {file.type === 'file' && (
                          <div className="text-xs text-gray-500">
                            {formatBytes(file.size)}
                          </div>
                        )}
                      </div>
                    </div>
                    {file.type === 'file' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileDelete(file);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {files.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-8">
                No files found in this directory
              </div>
            )}
          </div>

          {/* File Upload & Content Editor */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Upload File</h3>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Custom file path (optional)"
                  value={uploadPath}
                  onChange={(e) => setUploadPath(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Commit message (optional)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* File Content Editor */}
            {selectedFile && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {selectedFile.name}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                      {isEditing ? 'View' : 'Edit'}
                    </button>
                    {isEditing && (
                      <button
                        onClick={handleFileUpdate}
                        disabled={loading}
                        className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
                
                {isEditing && (
                  <input
                    type="text"
                    placeholder="Commit message for update"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                  />
                )}
                
                <div className="border border-gray-300 rounded-lg">
                  {isEditing ? (
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="w-full h-96 p-3 border-0 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                      placeholder="File content..."
                    />
                  ) : (
                    <pre className="p-3 h-96 overflow-auto text-sm bg-white rounded-lg">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubFileManager; 