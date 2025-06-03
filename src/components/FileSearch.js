import React, { useState, useEffect, useMemo } from 'react';

const FileSearch = ({ allFiles, onFileSelect, onClose, isOpen }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, date, size, type
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedFileType('all');
      setSortBy('name');
      setSortOrder('asc');
    }
  }, [isOpen]);

  const filteredAndSortedFiles = useMemo(() => {
    if (!allFiles || allFiles.length === 0) return [];

    let filtered = allFiles.filter(fileData => {
      const file = fileData.file;
      const matchesSearch = searchTerm === '' || 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

      const fileType = file.type || file.name.split('.').pop().toLowerCase();
      const matchesType = selectedFileType === 'all' || fileType === selectedFileType;

      return matchesSearch && matchesType;
    });

    // Sort files
    filtered.sort((a, b) => {
      const fileA = a.file;
      const fileB = b.file;
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = fileA.name.localeCompare(fileB.name);
          break;
        case 'date': {
          const dateA = fileA.uploadDate ? new Date(fileA.uploadDate) : new Date(0);
          const dateB = fileB.uploadDate ? new Date(fileB.uploadDate) : new Date(0);
          comparison = dateA - dateB;
          break;
        }
        case 'size':
          comparison = (fileA.size || 0) - (fileB.size || 0);
          break;
        case 'type': {
          const typeA = fileA.type || fileA.name.split('.').pop();
          const typeB = fileB.type || fileB.name.split('.').pop();
          comparison = typeA.localeCompare(typeB);
          break;
        }
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allFiles, searchTerm, selectedFileType, sortBy, sortOrder]);

  const getUniqueFileTypes = () => {
    if (!allFiles) return [];
    
    const types = new Set();
    allFiles.forEach(fileData => {
      const fileType = fileData.file.type || fileData.file.name.split('.').pop().toLowerCase();
      types.add(fileType);
    });
    
    return Array.from(types).sort();
  };

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6l-4-4H4v16zm8-14v3h3l-3-3z"/>
          </svg>
        );
      case 'm4a':
      case 'wav':
      case 'mp3':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 0 0-1.196-.98l-10 2A1 1 0 0 0 6 5v6.499c-.313-.139-.648-.248-1-.291C4.227 11.061 3 11.3 3 12.5s1.227 1.439 2 1.291c.77-.147 1-.736 1-1.291V6.697l9-1.8v5.542c-.313-.139-.648-.248-1-.291C13.227 10.001 12 10.24 12 11.44s1.227 1.439 2 1.291c.77-.147 1-.736 1-1.291V3z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4v12h12V8l-4-4H4zm8 0v3h3l-3-3z"/>
          </svg>
        );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const toggleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 12l5-5 5 5H5z"/>
        </svg>
      );
    }
    
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 12l5-5 5 5H5z"/>
      </svg>
    ) : (
      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M15 8l-5 5-5-5h10z"/>
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            File Search ({filteredAndSortedFiles.length} files)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search files by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* File Type Filter */}
            <div className="min-w-0">
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {getUniqueFileTypes().map(type => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {filteredAndSortedFiles.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd"/>
                </svg>
                <p>No files found matching your criteria</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto h-96">
              {/* Table Header */}
              <div className="sticky top-0 bg-gray-50 border-b px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div 
                    className="col-span-5 flex items-center cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('name')}
                  >
                    Name
                    {getSortIcon('name')}
                  </div>
                  <div 
                    className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('type')}
                  >
                    Type
                    {getSortIcon('type')}
                  </div>
                  <div 
                    className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('size')}
                  >
                    Size
                    {getSortIcon('size')}
                  </div>
                  <div 
                    className="col-span-2 flex items-center cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('date')}
                  >
                    Date
                    {getSortIcon('date')}
                  </div>
                  <div className="col-span-1">Activity</div>
                </div>
              </div>

              {/* File List */}
              <div className="divide-y divide-gray-200">
                {filteredAndSortedFiles.map((fileData, index) => {
                  const file = fileData.file;
                  const fileType = file.type || file.name.split('.').pop();
                  
                  return (
                    <div
                      key={index}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors grid grid-cols-12 gap-4 items-center"
                      onClick={() => onFileSelect(file)}
                    >
                      <div className="col-span-5 flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getFileIcon(fileType)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </div>
                          {file.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {file.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-sm text-gray-500 uppercase">
                        {fileType}
                      </div>
                      <div className="col-span-2 text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </div>
                      <div className="col-span-2 text-sm text-gray-500">
                        {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString() : '-'}
                      </div>
                      <div className="col-span-1 text-xs text-gray-400 truncate">
                        {fileData.activityName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredAndSortedFiles.length} of {allFiles?.length || 0} files shown
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSearch; 