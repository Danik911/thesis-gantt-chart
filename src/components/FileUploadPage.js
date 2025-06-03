import React, { useState } from 'react';
import FileUpload from './FileUpload';

const FileUploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);

  const handleUploadComplete = (file, response) => {
    console.log('Upload completed:', file.name, response);
    setUploadedFiles(prev => [...prev, { file, response, timestamp: new Date() }]);
  };

  const handleUploadError = (file, error, response) => {
    console.error('Upload failed:', file.name, error);
    setUploadErrors(prev => [...prev, { 
      filename: file.name, 
      error: error.message || 'Unknown error',
      timestamp: new Date()
    }]);
  };

  const clearHistory = () => {
    setUploadedFiles([]);
    setUploadErrors([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📁 File Upload System
          </h1>
          <p className="text-lg text-gray-600">
            Upload and manage your PDF documents and audio files (M4A, WAV) for your thesis project.
          </p>
        </div>

        {/* File Upload Component */}
        <div className="mb-8">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFiles={20}
          />
        </div>

        {/* Upload History and Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-green-800 font-medium">Successful Uploads</span>
                <span className="text-green-600 font-bold text-xl">{uploadedFiles.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-800 font-medium">Failed Uploads</span>
                <span className="text-red-600 font-bold text-xl">{uploadErrors.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-800 font-medium">Total Attempts</span>
                <span className="text-blue-600 font-bold text-xl">{uploadedFiles.length + uploadErrors.length}</span>
              </div>
            </div>
            {(uploadedFiles.length > 0 || uploadErrors.length > 0) && (
              <button
                onClick={clearHistory}
                className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {/* Recent successful uploads */}
              {uploadedFiles.slice(-5).reverse().map((item, index) => (
                <div key={`success-${index}`} className="flex items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-600 mr-3">✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Recent errors */}
              {uploadErrors.slice(-3).reverse().map((item, index) => (
                <div key={`error-${index}`} className="flex items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-600 mr-3">❌</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.filename}
                    </div>
                    <div className="text-xs text-red-600 truncate">
                      {item.error}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {uploadedFiles.length === 0 && uploadErrors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No upload activity yet.</p>
                  <p className="text-sm">Upload some files to see activity here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Supported Files:</h4>
              <ul className="space-y-1">
                <li>• PDF documents (up to 50MB)</li>
                <li>• M4A audio files (up to 100MB)</li>
                <li>• WAV audio files (up to 200MB)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Upload Methods:</h4>
              <ul className="space-y-1">
                <li>• Drag and drop files to the upload area</li>
                <li>• Click &ldquo;browse files&rdquo; to select files</li>
                <li>• Upload multiple files at once</li>
                <li>• Monitor progress in real-time</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Developer Note */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is a demonstration of the file upload system. 
            In a production environment, you would need to configure a proper backend endpoint 
            to handle file uploads. Currently, the upload endpoint is set to &lsquo;/api/upload&rsquo; 
            which you&rsquo;ll need to implement on your server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploadPage; 