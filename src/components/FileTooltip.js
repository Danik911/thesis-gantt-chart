import React from 'react';

const FileTooltip = ({ files, position, isVisible, onFileClick, onClose }) => {
  if (!isVisible || !files || files.length === 0) return null;

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6l-4-4H4v16zm8-14v3h3l-3-3z"/>
          </svg>
        );
      case 'm4a':
      case 'wav':
      case 'mp3':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 0 0-1.196-.98l-10 2A1 1 0 0 0 6 5v6.499c-.313-.139-.648-.248-1-.291C4.227 11.061 3 11.3 3 12.5s1.227 1.439 2 1.291c.77-.147 1-.736 1-1.291V6.697l9-1.8v5.542c-.313-.139-.648-.248-1-.291C13.227 10.001 12 10.24 12 11.44s1.227 1.439 2 1.291c.77-.147 1-.736 1-1.291V3z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
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

  const truncateFileName = (name, maxLength = 25) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
    return truncated + '.' + extension;
  };

  return (
    <div
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-64 max-w-80"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: position.x > window.innerWidth - 320 ? 'translateX(-100%)' : 'none'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800">
          Files ({files.length})
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onFileClick(file)}
          >
            <div className="flex-shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {truncateFileName(file.name)}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(file.size)}
                {file.uploadDate && (
                  <span className="ml-2">
                    {new Date(file.uploadDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileTooltip; 