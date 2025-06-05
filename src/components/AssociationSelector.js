/**
 * AssociationSelector - Component for selecting PDFs to associate with notes
 * Provides search, filter, and selection functionality for file associations
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAssociations } from '../contexts/AssociationContext';
import FileStorageService from '../services/FileStorageService';

const AssociationSelector = ({ 
  currentPdfId = null, 
  onSelect, 
  onClear, 
  disabled = false,
  placeholder = "Select a PDF to associate...",
  showClearButton = true,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  
  const dropdownRef = useRef(null);
  const { getAssociationsByPdfId } = useAssociations();

  // Load PDFs on mount
  useEffect(() => {
    loadPdfs();
  }, []);

  // Set selected PDF when currentPdfId changes
  useEffect(() => {
    if (currentPdfId && pdfs.length > 0) {
      const pdf = pdfs.find(p => p.id === currentPdfId);
      setSelectedPdf(pdf);
    } else {
      setSelectedPdf(null);
    }
  }, [currentPdfId, pdfs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fileList = await FileStorageService.getAllFiles();
      const pdfFiles = fileList.filter(file => 
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      );
      
      // Add association count to each PDF
      const pdfsWithAssociations = await Promise.all(
        pdfFiles.map(async (pdf) => {
          try {
            const associations = await getAssociationsByPdfId(pdf.id);
            return {
              ...pdf,
              associationCount: associations.length
            };
          } catch (error) {
            return {
              ...pdf,
              associationCount: 0
            };
          }
        })
      );

      setPdfs(pdfsWithAssociations);
    } catch (error) {
      setError(error.message);
      console.error('Failed to load PDFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPdfs = pdfs.filter(pdf =>
    pdf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pdf.title && pdf.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectPdf = (pdf) => {
    setSelectedPdf(pdf);
    setIsOpen(false);
    setSearchTerm('');
    
    if (onSelect) {
      onSelect(pdf);
    }
  };

  const handleClear = () => {
    setSelectedPdf(null);
    
    if (onClear) {
      onClear();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="association-selector-compact">
        <div className="flex items-center gap-2">
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled}
              className={`
                w-full px-3 py-2 text-left border rounded-md
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
                ${selectedPdf ? 'border-blue-300' : 'border-gray-300'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              `}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">
                  {selectedPdf ? (
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600">📄</span>
                      <span className="text-sm">{selectedPdf.name}</span>
                      {selectedPdf.associationCount > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-xs px-1 rounded">
                          {selectedPdf.associationCount}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">{placeholder}</span>
                  )}
                </span>
                <span className="text-gray-400">
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden">
                {/* Search Input */}
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search PDFs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                {/* PDF List */}
                <div className="overflow-y-auto max-h-48">
                  {loading ? (
                    <div className="p-3 text-center text-gray-500 text-sm">Loading PDFs...</div>
                  ) : error ? (
                    <div className="p-3 text-center text-red-500 text-sm">Error: {error}</div>
                  ) : filteredPdfs.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      {searchTerm ? 'No PDFs match your search' : 'No PDFs available'}
                    </div>
                  ) : (
                    filteredPdfs.map((pdf) => (
                      <button
                        key={pdf.id}
                        onClick={() => handleSelectPdf(pdf)}
                        className={`
                          w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0
                          ${selectedPdf?.id === pdf.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span>📄</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{pdf.name}</div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(pdf.size)} • {formatDate(pdf.uploadDate)}
                              {pdf.associationCount > 0 && (
                                <span className="ml-2 bg-blue-100 text-blue-600 px-1 rounded">
                                  {pdf.associationCount} notes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear Button */}
          {showClearButton && selectedPdf && (
            <button
              onClick={handleClear}
              disabled={disabled}
              className="px-2 py-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
              title="Clear association"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full-size version
  return (
    <div className="association-selector">
      <div className="relative" ref={dropdownRef}>
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Associated PDF
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled}
              className={`
                flex-1 px-4 py-3 text-left border rounded-lg
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
                ${selectedPdf ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  {selectedPdf ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">📄</span>
                        <span className="font-medium text-gray-900">{selectedPdf.name}</span>
                        {selectedPdf.associationCount > 0 && (
                          <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                            {selectedPdf.associationCount} notes
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatFileSize(selectedPdf.size)} • Uploaded {formatDate(selectedPdf.uploadDate)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-500">{placeholder}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Click to select a PDF file to associate with this note
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-gray-400 ml-2">
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Clear Button */}
            {showClearButton && selectedPdf && (
              <button
                onClick={handleClear}
                disabled={disabled}
                className="px-3 py-3 text-gray-400 hover:text-red-500 border border-gray-300 rounded-lg hover:border-red-300 disabled:opacity-50"
                title="Clear association"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search PDFs by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* PDF List */}
            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading PDFs...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  <div className="mb-2">⚠️</div>
                  Error loading PDFs: {error}
                </div>
              ) : filteredPdfs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="mb-2">📄</div>
                  {searchTerm ? 'No PDFs match your search' : 'No PDFs available'}
                </div>
              ) : (
                filteredPdfs.map((pdf) => (
                  <button
                    key={pdf.id}
                    onClick={() => handleSelectPdf(pdf)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0
                      ${selectedPdf?.id === pdf.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📄</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{pdf.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatFileSize(pdf.size)} • Uploaded {formatDate(pdf.uploadDate)}
                          {pdf.associationCount > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                              {pdf.associationCount} existing notes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssociationSelector; 