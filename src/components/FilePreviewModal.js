import React, { useState, useEffect } from 'react';

const FilePreviewModal = ({ file, isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && file) {
      setIsLoading(true);
      setError(null);
      
      // Simulate loading delay for preview
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6l-4-4H4v16zm8-14v3h3l-3-3z"/>
          </svg>
        );
      case 'm4a':
      case 'wav':
      case 'mp3':
        return (
          <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 0 0-1.196-.98l-10 2A1 1 0 0 0 6 5v6.499c-.313-.139-.648-.248-1-.291C4.227 11.061 3 11.3 3 12.5s1.227 1.439 2 1.291c.77-.147 1-.736 1-1.291V6.697l9-1.8v5.542c-.313-.139-.648-.248-1-.291C13.227 10.001 12 10.24 12 11.44s1.227 1.439 2 1.291c.77-.147 1-.736 1-1.291V3z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
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

  const canPreview = (fileType) => {
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileType.toLowerCase());
  };

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500 text-center">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <p>Error loading file preview</p>
          </div>
        </div>
      );
    }

    const fileType = file.type || file.name.split('.').pop();

    if (canPreview(fileType)) {
      if (fileType.toLowerCase() === 'pdf') {
        return (
          <div className="h-96 border rounded-lg bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              {getFileIcon(fileType)}
              <p className="mt-4 text-gray-600">PDF Preview</p>
              <p className="text-sm text-gray-500">Click &ldquo;Open File&rdquo; to view in full</p>
            </div>
          </div>
        );
      } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileType.toLowerCase())) {
        return (
          <div className="h-96 border rounded-lg bg-gray-50 flex items-center justify-center">
            <img
              src={file.url || file.path}
              alt={file.name}
              className="max-h-full max-w-full object-contain"
              onError={() => setError('Failed to load image')}
            />
          </div>
        );
      }
    }

    // For audio files or non-previewable files
    if (['m4a', 'wav', 'mp3'].includes(fileType.toLowerCase())) {
      return (
        <div className="h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            {getFileIcon(fileType)}
            <p className="mt-4 text-gray-600">Audio File</p>
            <p className="text-sm text-gray-500">Click &ldquo;Open File&rdquo; to play</p>
            {file.url && (
              <audio controls className="mt-4">
                <source src={file.url} type={`audio/${fileType}`} />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {getFileIcon(fileType)}
          <p className="mt-4 text-gray-600">File Preview</p>
          <p className="text-sm text-gray-500">Click &ldquo;Open File&rdquo; to download</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getFileIcon(file.type || file.name.split('.').pop())}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {file.name}
              </h2>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)}
                {file.uploadDate && (
                  <span className="ml-2">
                    • Uploaded {new Date(file.uploadDate).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderPreview()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {file.description && (
              <p><strong>Description:</strong> {file.description}</p>
            )}
            {file.tags && file.tags.length > 0 && (
              <p className="mt-1">
                <strong>Tags:</strong> {file.tags.join(', ')}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                if (file.url) {
                  window.open(file.url, '_blank');
                } else {
                  // Handle file download logic here
                  console.log('Download file:', file);
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Open File
            </button>
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

export default FilePreviewModal; 