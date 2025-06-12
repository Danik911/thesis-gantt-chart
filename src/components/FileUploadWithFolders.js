import React, { useState, useEffect } from 'react';
import FileUpload from './FileUpload';
import FolderManager from './FolderManager';
import fileStorageService from '../services/FileStorageService';

const FileUploadWithFolders = () => {
  const [uploadStats, setUploadStats] = useState({ successful: 0, failed: 0, total: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('/');
  const [selectedFolder, setSelectedFolder] = useState('/General');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload files when current folder changes
  useEffect(() => {
    if (currentFolder) {
      loadUploadedFiles();
    }
  }, [currentFolder]);

  const loadAllData = async () => {
    await Promise.all([
      loadStats(),
      loadActivity(),
      loadFolders(),
      loadUploadedFiles()
    ]);
  };

  const loadStats = () => {
    const stats = fileStorageService.getUploadStats();
    setUploadStats(stats);
  };

  const loadActivity = () => {
    const activity = fileStorageService.getRecentActivity();
    setRecentActivity(activity);
  };

  const loadFolders = async () => {
    try {
      const folderList = await fileStorageService.getFolders();
      setFolders(folderList);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadUploadedFiles = async () => {
    try {
      setIsLoading(true);
      const files = await fileStorageService.listFiles(
        currentFolder === '/' ? null : currentFolder
      );
      setUploadedFiles(files);
    } catch (error) {
      console.error('Failed to load uploaded files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (file, response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Upload completed:', file.name, response);
    }
    loadAllData();
  };

  const handleUploadError = (file, error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Upload failed:', file.name, error);
    }
    loadAllData();
  };

  const handleFolderSelect = (folderPath) => {
    setCurrentFolder(folderPath);
  };

  const handleFolderCreate = async (folderPath, folderName) => {
    try {
      await fileStorageService.createFolder(folderPath, folderName);
      await loadFolders();
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  };

  const handleFolderDelete = async (folderPath) => {
    try {
      await fileStorageService.deleteFolder(folderPath, '/General');
      await loadAllData();
      if (currentFolder === folderPath) {
        setCurrentFolder('/');
      }
    } catch (error) {
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  };

  const handleFolderRename = async (oldPath, newPath) => {
    // This would require more complex implementation
    // For now, we'll show an alert
    alert('Folder renaming will be implemented in a future update. Please create a new folder and move files manually.');
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      await fileStorageService.downloadFile(fileId);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download ${fileName}: ${error.message}`);
    }
  };

  const handleDelete = async (fileId, fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        await fileStorageService.deleteFile(fileId);
        loadUploadedFiles();
        loadFolders(); // Update folder counts
      } catch (error) {
        console.error('Delete failed:', error);
        alert(`Failed to delete ${fileName}: ${error.message}`);
      }
    }
  };

  const handleMoveFile = async (fileId, fileName, newFolderPath) => {
    try {
      await fileStorageService.moveFile(fileId, newFolderPath);
      loadUploadedFiles();
      loadFolders(); // Update folder counts
    } catch (error) {
      console.error('Move failed:', error);
      alert(`Failed to move ${fileName}: ${error.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('audio')) return '🎵';
    return '📁';
  };

  const clearHistory = () => {
    fileStorageService.clearHistory();
    loadStats();
    loadActivity();
  };

  // Calculate file count per folder
  const folderFileCount = {};
  uploadedFiles.forEach(file => {
    const folderPath = file.folderPath || '/General';
    folderFileCount[folderPath] = (folderFileCount[folderPath] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📁 File Management System
          </h1>
          <p className="text-lg text-gray-600">
            Upload and organize your PDF documents and audio files with folders.
          </p>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Folder Management */}
          <div className="lg:col-span-1">
            <FolderManager
              folders={folders}
              currentFolder={currentFolder}
              onFolderSelect={handleFolderSelect}
              onFolderCreate={handleFolderCreate}
              onFolderDelete={handleFolderDelete}
              onFolderRename={handleFolderRename}
              fileCount={folderFileCount}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Files
                </h2>
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    Upload to folder:
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="/General">General</option>
                    {folders.map(folder => (
                      <option key={folder.path} value={folder.path}>
                        {folder.path}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <FileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={20}
                uploadMetadata={{ folderPath: selectedFolder }}
              />
            </div>

            {/* Current Folder Display */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    📂 {currentFolder === '/' ? 'All Files' : currentFolder}
                    <span className="ml-2 text-sm text-gray-500">
                      ({uploadedFiles.length} files)
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentFolder === '/' ? 'Showing files from all folders' : `Files in ${currentFolder}`}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                  >
                    {viewMode === 'grid' ? '📋 List' : '⚏ Grid'}
                  </button>
                </div>
              </div>

              {/* Files Display */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 mx-auto text-gray-400 mb-2">⟳</div>
                  <p className="text-gray-500">Loading files...</p>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📂</div>
                  <p className="font-medium">No files in this folder</p>
                  <p className="text-sm">Upload some files to see them here</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className={`${viewMode === 'grid' ? 'p-4' : 'flex items-center justify-between p-4'} bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors`}>
                      <div className={`${viewMode === 'grid' ? 'text-center' : 'flex items-center space-x-3 flex-1 min-w-0'}`}>
                        <div className={`${viewMode === 'grid' ? 'text-4xl mb-2' : 'text-2xl'}`}>
                          {getFileIcon(file.type)}
                        </div>
                        <div className={viewMode === 'grid' ? '' : 'flex-1 min-w-0'}>
                          <div className={`${viewMode === 'grid' ? 'font-medium mb-1' : 'text-sm font-medium'} text-gray-900 truncate`}>
                            {file.name}
                          </div>
                          <div className={`${viewMode === 'grid' ? 'text-sm mb-2' : 'text-xs'} text-gray-500`}>
                            {formatFileSize(file.size)} • {new Date(file.uploadDate).toLocaleDateString()}
                          </div>
                          {viewMode === 'grid' && file.folderPath && (
                            <div className="text-xs text-blue-600 mb-2">
                              📁 {file.folderPath}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={`${viewMode === 'grid' ? 'flex justify-center space-x-2' : 'flex items-center space-x-2 ml-4'}`}>
                        {/* Move to folder dropdown */}
                        <select
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== file.folderPath) {
                              handleMoveFile(file.id, file.name, e.target.value);
                            }
                          }}
                          value=""
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          title="Move to folder"
                        >
                          <option value="">Move to...</option>
                          <option value="/General">General</option>
                          {folders.filter(f => f.path !== file.folderPath).map(folder => (
                            <option key={folder.path} value={folder.path}>
                              {folder.path}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDownload(file.id, file.name)}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          title={`Download ${file.name}`}
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => handleDelete(file.id, file.name)}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                          title={`Delete ${file.name}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadWithFolders; 