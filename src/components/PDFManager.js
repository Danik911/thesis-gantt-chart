import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import pdfProcessingService from '../services/pdfProcessingService';
import fileStorageService from '../services/FileStorageService';
import LoadingSpinner from './LoadingSpinner';

const PDFManager = ({ 
  onFileSelect, 
  selectedFile = null,
  className = '' 
}) => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [processedPdfs, setProcessedPdfs] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showViewer, setShowViewer] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Load PDF files from IndexedDB storage
  useEffect(() => {
    loadStoredFiles();
  }, []);

  const loadStoredFiles = async () => {
    try {
      setLoadingFiles(true);
      await fileStorageService.initDB();
      const storedFiles = await fileStorageService.getAllFiles();
      
      // Filter only PDF files and convert to File objects
      const pdfFiles = storedFiles
        .filter(storedFile => storedFile.type === 'application/pdf')
        .map(storedFile => {
          // Create File object from stored data
          const blob = new Blob([storedFile.data], { type: storedFile.type });
          const file = new File([blob], storedFile.name, {
            type: storedFile.type,
            lastModified: new Date(storedFile.uploadedAt).getTime()
          });
          
          // Add metadata from storage
          file.storedId = storedFile.id;
          file.uploadedAt = storedFile.uploadedAt;
          file.metadata = storedFile.metadata;
          
          return file;
        });

      setPdfFiles(pdfFiles);
    } catch (error) {
      console.error('Error loading stored files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Auto-select PDF if provided via props
  useEffect(() => {
    if (selectedFile && pdfProcessingService.isValidPDFFile(selectedFile)) {
      setSelectedPdfFile(selectedFile);
      setShowViewer(true);
    }
  }, [selectedFile]);

  const handleFileSelect = async (file) => {
    setSelectedPdfFile(file);
    setShowViewer(true);
    
    if (onFileSelect) {
      onFileSelect(file);
    }

    // Process PDF if not already processed
    const fileKey = `${file.name}_${file.size}`;
    if (!processedPdfs.has(fileKey)) {
      await processPdfFile(file);
    }
  };

  const processPdfFile = async (file) => {
    try {
      setLoading(true);
      
      const result = await pdfProcessingService.processPDFFile(file, {
        thumbnailWidth: 150,
        thumbnailHeight: 200,
        enableAnnotations: true,
        enableProgressTracking: true
      });

      const fileKey = `${file.name}_${file.size}`;
      setProcessedPdfs(prev => new Map(prev).set(fileKey, result));
      
    } catch (error) {
      console.error('Error processing PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchInAllPdfs = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results = [];
    
    for (const [fileKey, processed] of processedPdfs) {
      if (processed.success && processed.fileId) {
        const searchResult = pdfProcessingService.searchInPDF(
          processed.fileId, 
          searchQuery, 
          { caseSensitive: false, wholeWord: false }
        );
        
        if (searchResult.results.length > 0) {
          results.push({
            file: pdfFiles.find(f => `${f.name}_${f.size}` === fileKey),
            processed,
            searchResult
          });
        }
      }
    }
    
    setSearchResults(results);
  };

  const getProcessedData = (file) => {
    const fileKey = `${file.name}_${file.size}`;
    return processedPdfs.get(fileKey);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const downloadFile = (file) => {
    try {
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const deleteFile = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      if (file.storedId) {
        await fileStorageService.deleteFile(file.storedId);
        await loadStoredFiles(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  if (showViewer && selectedPdfFile) {
    return (
      <div className={`pdf-manager-viewer ${className} h-full flex flex-col`}>
        <div className="viewer-header bg-gray-100 border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowViewer(false)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Back to Library
            </button>
            <h2 className="text-lg font-semibold">{selectedPdfFile.name}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {formatFileSize(selectedPdfFile.size)}
            </span>
          </div>
        </div>
        
        <div className="viewer-content flex-1">
          <PDFViewer
            file={selectedPdfFile}
            onMetadataExtracted={(metadata) => {
              console.log('Extracted metadata:', metadata);
            }}
            onTextExtracted={(textContent) => {
              console.log('Extracted text content:', textContent);
            }}
            onError={(error) => {
              console.error('PDF viewer error:', error);
            }}
            className="h-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-manager ${className}`}>
      <div className="pdf-manager-header mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">PDF Library</h2>
          <button
            onClick={loadStoredFiles}
            disabled={loadingFiles}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loadingFiles ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="search-bar flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchInAllPdfs()}
            placeholder="Search across all PDFs..."
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={searchInAllPdfs}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">
              Search Results ({searchResults.reduce((sum, result) => sum + result.searchResult.totalMatches, 0)} matches)
            </h3>
            {searchResults.map((result, index) => (
              <div key={index} className="search-result-item mb-2 p-2 bg-white rounded border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.file.name}</span>
                  <span className="text-sm text-gray-600">
                    {result.searchResult.totalMatches} matches
                  </span>
                </div>
                <button
                  onClick={() => handleFileSelect(result.file)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Open and view matches →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Grid */}
      {loadingFiles ? (
        <div className="loading-state text-center py-12">
          <LoadingSpinner size="large" />
          <p className="text-gray-600 mt-4">Loading your PDF files...</p>
        </div>
      ) : pdfFiles.length === 0 ? (
        <div className="empty-state text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF files found</h3>
          <p className="text-gray-600 mb-4">Upload some PDF files to get started with PDF management.</p>
          <a 
            href="#/file-upload" 
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload PDF Files
          </a>
        </div>
      ) : (
        <div className="pdf-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pdfFiles.map((file, index) => {
            const processedData = getProcessedData(file);
            const readingProgress = processedData?.success 
              ? pdfProcessingService.getReadingProgress(processedData.fileId).progress 
              : 0;

            return (
              <div
                key={index}
                className="pdf-card bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border"
                onClick={() => handleFileSelect(file)}
              >
                {/* Thumbnail */}
                <div className="thumbnail-container h-48 bg-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                  {processedData?.success && processedData.thumbnail ? (
                    <img
                      src={processedData.thumbnail.dataUrl}
                      alt={`${file.name} thumbnail`}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-sm">PDF Preview</div>
                    </div>
                  )}
                  
                  {/* Processing Indicator */}
                  {loading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  )}
                  
                  {/* Reading Progress */}
                  {readingProgress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${readingProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate mb-1" title={file.name}>
                    {file.name}
                  </h3>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Size: {formatFileSize(file.size)}</div>
                    
                    {processedData?.success && (
                      <>
                        <div>Pages: {processedData.metadata.pages}</div>
                        <div>Author: {processedData.metadata.author}</div>
                        {readingProgress > 0 && (
                          <div>Progress: {readingProgress}%</div>
                        )}
                      </>
                    )}
                    
                    <div>Uploaded: {formatDate(file.uploadedAt || new Date(file.lastModified).toISOString())}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file);
                        }}
                        className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Open
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file);
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        title="Download PDF"
                      >
                        📥
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      {!processedData && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            processPdfFile(file);
                          }}
                          className="flex-1 px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                        >
                          Process
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file);
                        }}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        title="Delete PDF"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cache Stats (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">PDF Service Stats</h4>
          <pre>{JSON.stringify(pdfProcessingService.getCacheStats(), null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default PDFManager;