import React, { useState } from 'react';
import FileUpload from './FileUpload';

const FileUploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);

  const handleUploadComplete = (file, response) => {
    // Upload completed successfully
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Upload completed:', file.name, response);
    }
    setUploadedFiles(prev => [...prev, { file, response, timestamp: new Date() }]);
  };

  const handleUploadError = (file, error) => {
    // Upload failed
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Upload failed:', file.name, error);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Page Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            📁 File Upload System
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Upload and manage your PDF documents and audio files for your thesis project.
          </p>
        </div>

        {/* File Upload Component */}
        <div className="mb-6 sm:mb-8">
          <FileUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFiles={20}
          />
        </div>

        {/* Upload History and Statistics - Mobile First Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Upload Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
              </svg>
              Upload Statistics
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200 touch-manipulation">
                <span className="text-green-800 font-medium text-sm sm:text-base">Successful Uploads</span>
                <span className="text-green-600 font-bold text-xl sm:text-2xl">{uploadedFiles.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200 touch-manipulation">
                <span className="text-red-800 font-medium text-sm sm:text-base">Failed Uploads</span>
                <span className="text-red-600 font-bold text-xl sm:text-2xl">{uploadErrors.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 touch-manipulation">
                <span className="text-blue-800 font-medium text-sm sm:text-base">Total Attempts</span>
                <span className="text-blue-600 font-bold text-xl sm:text-2xl">{uploadedFiles.length + uploadErrors.length}</span>
              </div>
            </div>
            {(uploadedFiles.length > 0 || uploadErrors.length > 0) && (
              <button
                onClick={clearHistory}
                className="mt-4 w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors touch-manipulation min-h-[48px] flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear History
              </button>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Activity
            </h3>
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
              {/* Recent successful uploads */}
              {uploadedFiles.slice(-5).reverse().map((item, index) => (
                <div key={`success-${index}`} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200 touch-manipulation">
                  <span className="text-green-600 mr-3 text-lg">✅</span>
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
                <div key={`error-${index}`} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200 touch-manipulation">
                  <span className="text-red-600 mr-3 text-lg">❌</span>
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
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-medium">No upload activity yet.</p>
                  <p className="text-sm">Upload some files to see activity here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions - Mobile Optimized */}
        <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How to Use
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 text-sm text-blue-800">
            <div className="space-y-2">
              <h4 className="font-medium mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Supported Files:
              </h4>
              <ul className="space-y-1 pl-4">
                <li>• PDF documents (up to 50MB)</li>
                <li>• M4A audio files (up to 100MB)</li>
                <li>• WAV audio files (up to 200MB)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Methods:
              </h4>
              <ul className="space-y-1 pl-4">
                <li>• Drag and drop files to the upload area</li>
                <li>• Tap &ldquo;browse files&rdquo; to select files</li>
                <li>• Upload multiple files at once</li>
                <li>• Monitor progress in real-time</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Developer Note */}
        <div className="mt-4 sm:mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.88-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This is a demonstration of the file upload system. 
                In a production environment, you would need to configure a proper backend endpoint 
                to handle file uploads. Currently, the upload endpoint is set to &lsquo;/api/upload&rsquo; 
                which you&rsquo;ll need to implement on your server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadPage; 