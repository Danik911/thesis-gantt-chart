import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import pdfProcessingService from '../services/pdfProcessingService';
import LoadingSpinner from './LoadingSpinner';

const PDFManager = ({ 
  uploadedFiles = [], 
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

  // Filter PDF files from uploaded files
  useEffect(() => {
    const pdfs = uploadedFiles.filter(file => 
      pdfProcessingService.isValidPDFFile(file)
    );
    setPdfFiles(pdfs);
  }, [uploadedFiles]);

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
        <h2 className="text-2xl font-bold mb-4">PDF Library</h2>
        
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
      {pdfFiles.length === 0 ? (
        <div className="empty-state text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF files found</h3>
          <p className="text-gray-600">Upload some PDF files to get started with PDF management.</p>
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
                    
                    <div>Modified: {formatDate(new Date(file.lastModified).toISOString())}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileSelect(file);
                      }}
                      className="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Open
                    </button>
                    
                    {!processedData && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          processPdfFile(file);
                        }}
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                      >
                        Process
                      </button>
                    )}
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