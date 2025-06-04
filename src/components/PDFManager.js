import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import PDFNotesPanel from './PDFNotesPanel';
import pdfProcessingService from '../services/pdfProcessingService';
import fileStorageService from '../services/FileStorageService';
import notesService from '../services/NotesService';
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
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [notesCount, setNotesCount] = useState(new Map());
  const [initError, setInitError] = useState(null);

  // Load PDF files from IndexedDB storage
  useEffect(() => {
    loadStoredFiles();
  }, []);

  const loadStoredFiles = async () => {
    try {
      console.log('PDFManager: Starting to load stored files...');
      setLoadingFiles(true);
      setInitError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('IndexedDB initialization timeout')), 10000)
      );
      
      const initPromise = fileStorageService.initDB();
      
      await Promise.race([initPromise, timeoutPromise]);
      console.log('PDFManager: IndexedDB initialized successfully');
      
      const storedFiles = await fileStorageService.listFiles();
      console.log('PDFManager: Found stored files:', storedFiles.length);
      
      // Filter only PDF files and get full file data
      const pdfMetadata = storedFiles.filter(storedFile => storedFile.type === 'application/pdf');
      console.log('PDFManager: PDF files found:', pdfMetadata.length);
      
      const pdfFiles = [];
      
      for (const metadata of pdfMetadata) {
        try {
          // Get full file data including content
          const fullFileData = await fileStorageService.getFile(metadata.id);
          
          // Create File object from stored data
          const blob = new Blob([fullFileData.data], { type: fullFileData.type });
          const file = new File([blob], fullFileData.name, {
            type: fullFileData.type,
            lastModified: new Date(fullFileData.uploadDate).getTime()
          });
          
          // Add metadata from storage
          file.storedId = fullFileData.id;
          file.uploadedAt = fullFileData.uploadDate;
          file.metadata = fullFileData.metadata;
          
          pdfFiles.push(file);
        } catch (error) {
          console.error('Error loading file:', metadata.name, error);
        }
      }

      setPdfFiles(pdfFiles);
      console.log('PDFManager: PDF files loaded successfully:', pdfFiles.length);
      
      // Load notes count for each file
      await loadNotesCount(pdfFiles);
      console.log('PDFManager: Notes count loaded');
    } catch (error) {
      console.error('PDFManager: Error loading stored files:', error);
      setInitError(error.message);
      // Set empty files array on error to show empty state instead of infinite loading
      setPdfFiles([]);
    } finally {
      setLoadingFiles(false);
      console.log('PDFManager: Finished loading stored files');
    }
  };

  const loadNotesCount = async (files) => {
    const counts = new Map();
    for (const file of files) {
      try {
        const notes = await notesService.getNotesForFile(file.storedId || file.name);
        counts.set(file.storedId || file.name, notes.length);
      } catch (error) {
        console.error('Error loading notes for file:', file.name, error);
        counts.set(file.storedId || file.name, 0);
      }
    }
    setNotesCount(counts);
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
        // Also delete associated notes
        await notesService.deleteNotesForFile(file.storedId);
        await loadStoredFiles(); // Refresh the list
      }
      
      // Remove from current lists if it was the selected file
      if (selectedPdfFile === file) {
        setSelectedPdfFile(null);
        setShowViewer(false);
        setShowNotesPanel(false);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const handleNotesChanged = async () => {
    // Reload notes count when notes are added/updated/deleted
    await loadNotesCount(pdfFiles);
  };

  const openNotesPanel = (file) => {
    setSelectedPdfFile(file);
    setShowNotesPanel(true);
    setShowViewer(true);
  };

  const getFileNotesCount = (file) => {
    return notesCount.get(file.storedId || file.name) || 0;
  };

  if (loadingFiles) {
    return (
      <div className={`pdf-manager flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <LoadingSpinner message="Loading PDF library..." />
          {initError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">Initialization Error:</p>
              <p className="text-red-500 text-sm">{initError}</p>
              <button
                onClick={() => {
                  setInitError(null);
                  loadStoredFiles();
                }}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showViewer && selectedPdfFile) {
    return (
      <div className={`pdf-manager h-full flex ${className}`}>
        {/* PDF Viewer */}
        <div className={`pdf-viewer-container ${showNotesPanel ? 'flex-1' : 'w-full'}`}>
          <div className="h-full flex flex-col">
            {/* Viewer Header */}
            <div className="viewer-header bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowViewer(false);
                    setShowNotesPanel(false);
                    setSelectedPdfFile(null);
                  }}
                  className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Library
                </button>
                
                <div className="text-lg font-semibold text-gray-900">
                  {selectedPdfFile.name}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNotesPanel(!showNotesPanel)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    showNotesPanel 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes
                  {getFileNotesCount(selectedPdfFile) > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 ml-1">
                      {getFileNotesCount(selectedPdfFile)}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => downloadFile(selectedPdfFile)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Download
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <PDFViewer
                file={selectedPdfFile}
                processedData={getProcessedData(selectedPdfFile)}
                onProcessingComplete={(result) => {
                  const fileKey = `${selectedPdfFile.name}_${selectedPdfFile.size}`;
                  setProcessedPdfs(prev => new Map(prev).set(fileKey, result));
                }}
              />
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        {showNotesPanel && (
          <div className="w-96 h-full">
            <PDFNotesPanel
              fileId={selectedPdfFile.storedId || selectedPdfFile.name}
              fileName={selectedPdfFile.name}
              onClose={() => setShowNotesPanel(false)}
              onNotesChanged={handleNotesChanged}
              className="h-full"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`pdf-manager p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PDF Library</h2>
          <p className="text-gray-600 mt-1">
            {pdfFiles.length} {pdfFiles.length === 1 ? 'file' : 'files'} in your library
          </p>
          {initError && (
            <p className="text-red-500 text-sm mt-1">
              ⚠️ There was an issue loading the library. Some features may not work correctly.
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchInAllPdfs()}
            placeholder="Search across all PDFs..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={searchInAllPdfs}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">
              Search Results ({searchResults.length} files)
            </h3>
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{result.file.name}</span>
                    <span className="text-yellow-700 ml-2">
                      {result.searchResult.results.length} matches
                    </span>
                  </div>
                  <button
                    onClick={() => handleFileSelect(result.file)}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PDF Files Grid */}
      {pdfFiles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No PDF files yet</h3>
          <p className="text-gray-600">
            Upload your first PDF file to get started with your research library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pdfFiles.map((file, index) => {
            const processed = getProcessedData(file);
            const notesCount = getFileNotesCount(file);

            return (
              <div
                key={`${file.name}_${index}`}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
                  {processed?.thumbnail ? (
                    <img
                      src={processed.thumbnail}
                      alt={`${file.name} thumbnail`}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-4xl">📄</div>
                  )}
                </div>

                {/* File Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Size: {formatFileSize(file.size)}</div>
                    <div>Added: {formatDate(file.uploadedAt)}</div>
                    {processed?.pageCount && (
                      <div>Pages: {processed.pageCount}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleFileSelect(file)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      View
                    </button>
                    
                    <button
                      onClick={() => openNotesPanel(file)}
                      className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1"
                      title="View notes"
                    >
                      📝
                      {notesCount > 0 && (
                        <span className="bg-gray-600 text-white text-xs rounded-full px-2 py-1">
                          {notesCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => downloadFile(file)}
                      className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                      title="Download"
                    >
                      ⬇️
                    </button>
                    
                    <button
                      onClick={() => deleteFile(file)}
                      className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner message="Processing PDF..." />
        </div>
      )}
    </div>
  );
};

export default PDFManager;