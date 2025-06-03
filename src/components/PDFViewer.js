import React from 'react';

// Temporary PDFViewer replacement for deployment
const PDFViewer = ({ 
  file, 
  onMetadataExtracted, 
  onTextExtracted, 
  onError,
  className = ''
}) => {
  return (
    <div className={`pdf-viewer-placeholder ${className}`}>
      <div className="flex items-center justify-center h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <div className="text-4xl text-gray-400 mb-4">📄</div>
          <p className="text-gray-600 font-medium">PDF Viewer Temporarily Disabled</p>
          <p className="text-gray-500 text-sm mt-2">
            {file ? `File: ${file.name}` : 'No file selected'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            PDF functionality will be restored after deployment fixes
          </p>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer; 