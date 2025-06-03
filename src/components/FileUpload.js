import React, { useEffect, useState } from 'react';
import Uppy from '@uppy/core';
import { Dashboard } from '@uppy/react';
import DragDrop from '@uppy/drag-drop';
import FileInput from '@uppy/file-input';
import ProgressBar from '@uppy/progress-bar';
import StatusBar from '@uppy/status-bar';
import XHRUpload from '@uppy/xhr-upload';

// Import Uppy CSS
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import '@uppy/drag-drop/dist/style.css';
import '@uppy/file-input/dist/style.css';
import '@uppy/progress-bar/dist/style.css';
import '@uppy/status-bar/dist/style.css';

const FileUpload = ({ onUploadComplete, onUploadError, maxFiles = 10 }) => {
  const [uppy, setUppy] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);

  useEffect(() => {
    // Initialize Uppy instance
    const uppyInstance = new Uppy({
      id: 'FileUpload',
      autoProceed: false,
      allowMultipleUploads: true,
      debug: process.env.NODE_ENV === 'development',
      restrictions: {
        maxFileSize: null, // We'll handle this per file type
        maxNumberOfFiles: maxFiles,
        minNumberOfFiles: 1,
        allowedFileTypes: ['.pdf', '.m4a', '.wav']
      },
      locale: {
        strings: {
          dropPasteFiles: 'Drop files here, paste or %{browseFiles}',
          browseFiles: 'browse files',
          uploadComplete: 'Upload complete',
          uploadFailed: 'Upload failed',
          noFilesFound: 'No files found',
          fileAdded: 'File added',
          fileRemoved: 'File removed',
          uploadStarted: 'Upload started'
        }
      }
    });

    // File type and size validation
    uppyInstance.addPreProcessor((fileIDs) => {
      return new Promise((resolve, reject) => {
        const errors = [];
        
        fileIDs.forEach(fileID => {
          const file = uppyInstance.getFile(fileID);
          const fileExtension = file.name.toLowerCase().split('.').pop();
          
          // Define file size limits in bytes
          const sizeLimits = {
            'pdf': 50 * 1024 * 1024,  // 50MB
            'm4a': 100 * 1024 * 1024, // 100MB
            'wav': 200 * 1024 * 1024  // 200MB
          };
          
          // Check file size based on type
          if (sizeLimits[fileExtension] && file.size > sizeLimits[fileExtension]) {
            const limitMB = sizeLimits[fileExtension] / (1024 * 1024);
            errors.push(`File "${file.name}" exceeds ${limitMB}MB size limit for ${fileExtension.toUpperCase()} files`);
            uppyInstance.removeFile(fileID);
          }
          
          // Additional validation for file types
          if (!['pdf', 'm4a', 'wav'].includes(fileExtension)) {
            errors.push(`File "${file.name}" has unsupported format. Only PDF, M4A, and WAV files are allowed.`);
            uppyInstance.removeFile(fileID);
          }
        });
        
        if (errors.length > 0) {
          setUploadErrors(prev => [...prev, ...errors]);
          // Still resolve to allow other files to proceed
          resolve();
        } else {
          resolve();
        }
      });
    });

    // Configure XHR Upload (you'll need to replace with your actual upload endpoint)
    uppyInstance.use(XHRUpload, {
      endpoint: '/api/upload', // Replace with your actual upload endpoint
      method: 'POST',
      formData: true,
      fieldName: 'files',
      limit: 3, // Number of concurrent uploads
      timeout: 30000, // 30 seconds timeout
      headers: {
        // Add any required headers here
      }
    });

    // Event listeners
    uppyInstance.on('file-added', (file) => {
      console.log('File added:', file);
      // Clear previous errors when new files are added
      setUploadErrors([]);
    });

    uppyInstance.on('file-removed', (file) => {
      console.log('File removed:', file);
    });

    uppyInstance.on('upload-progress', (file, progress) => {
      console.log('Upload progress:', file.name, progress);
    });

    uppyInstance.on('upload-success', (file, response) => {
      console.log('Upload success:', file, response);
      setUploadedFiles(prev => [...prev, { file, response }]);
      
      if (onUploadComplete) {
        onUploadComplete(file, response);
      }
    });

    uppyInstance.on('upload-error', (file, error, response) => {
      console.error('Upload error:', file, error, response);
      const errorMessage = `Failed to upload ${file.name}: ${error.message || 'Unknown error'}`;
      setUploadErrors(prev => [...prev, errorMessage]);
      
      if (onUploadError) {
        onUploadError(file, error, response);
      }
    });

    uppyInstance.on('complete', (result) => {
      console.log('Upload complete:', result);
    });

    setUppy(uppyInstance);

    // Cleanup
    return () => {
      if (uppyInstance) {
        uppyInstance.close();
      }
    };
  }, [maxFiles, onUploadComplete, onUploadError]);

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear all files
  const clearAllFiles = () => {
    if (uppy) {
      uppy.cancelAll();
      setUploadedFiles([]);
      setUploadErrors([]);
    }
  };

  // Clear errors
  const clearErrors = () => {
    setUploadErrors([]);
  };

  if (!uppy) {
    return <div className="flex justify-center items-center p-8">Loading file upload...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">File Upload</h2>
        <p className="text-gray-600 mb-4">
          Upload PDF, M4A, or WAV files. Size limits: PDF (50MB), M4A (100MB), WAV (200MB)
        </p>
        
        {/* Error display */}
        {uploadErrors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-red-800 font-semibold mb-2">Upload Errors:</h4>
                <ul className="text-red-700 text-sm space-y-1">
                  {uploadErrors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={clearErrors}
                className="text-red-500 hover:text-red-700 font-semibold text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uppy Dashboard */}
      <div className="mb-6">
        <Dashboard
          uppy={uppy}
          plugins={['Webcam']}
          metaFields={[
            { id: 'name', name: 'Name', placeholder: 'File name (optional)' },
            { id: 'description', name: 'Description', placeholder: 'File description (optional)' }
          ]}
          note="Only PDF, M4A, and WAV files are allowed"
          height={400}
          showProgressDetails={true}
          showRemoveButtonAfterComplete={true}
          locale={{
            strings: {
              dropPasteFiles: 'Drop files here, paste, or %{browseFiles}',
              browseFiles: 'browse files',
              uploadComplete: 'Upload complete!',
              uploadFailed: 'Upload failed',
              processing: 'Processing...',
              uploadPaused: 'Upload paused',
              resumeUpload: 'Resume upload',
              pauseUpload: 'Pause upload',
              retryUpload: 'Retry upload',
              cancelUpload: 'Cancel upload',
              xFilesSelected: {
                0: '%{smart_count} file selected',
                1: '%{smart_count} files selected'
              },
              uploadingXFiles: {
                0: 'Uploading %{smart_count} file',
                1: 'Uploading %{smart_count} files'
              }
            }
          }}
        />
      </div>

      {/* Upload controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => uppy.upload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={!uppy || Object.keys(uppy.getState().files).length === 0}
          >
            Start Upload
          </button>
          <button
            onClick={clearAllFiles}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          Files: {uppy ? Object.keys(uppy.getState().files).length : 0} / {maxFiles}
        </div>
      </div>

      {/* Successfully uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-green-800 font-semibold mb-3">Successfully Uploaded Files:</h4>
          <div className="space-y-2">
            {uploadedFiles.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <div>
                    <div className="font-medium text-gray-800">{item.file.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatFileSize(item.file.size)} • {item.file.type || 'Unknown type'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File type information */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-blue-800 font-semibold mb-2">Supported File Types & Limits:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <span className="w-12 h-8 bg-red-100 text-red-800 rounded text-xs font-semibold flex items-center justify-center mr-3">
              PDF
            </span>
            <span className="text-gray-700">Max 50MB</span>
          </div>
          <div className="flex items-center">
            <span className="w-12 h-8 bg-green-100 text-green-800 rounded text-xs font-semibold flex items-center justify-center mr-3">
              M4A
            </span>
            <span className="text-gray-700">Max 100MB</span>
          </div>
          <div className="flex items-center">
            <span className="w-12 h-8 bg-blue-100 text-blue-800 rounded text-xs font-semibold flex items-center justify-center mr-3">
              WAV
            </span>
            <span className="text-gray-700">Max 200MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 