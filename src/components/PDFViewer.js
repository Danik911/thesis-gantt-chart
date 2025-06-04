import React, { useEffect, useRef, useState } from 'react';
import pdfjsLib from '../utils/pdfConfig';

const PDFViewer = ({ 
  file, 
  onMetadataExtracted, 
  onTextExtracted, 
  onError,
  className = ''
}) => {
  const canvasRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  useEffect(() => {
    if (pdf && currentPage) {
      renderPage();
    }
  }, [pdf, currentPage, scale]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      const arrayBuffer = await file.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      setPdf(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setCurrentPage(1);

      // Extract metadata if callback provided
      if (onMetadataExtracted) {
        try {
          const metadata = await loadedPdf.getMetadata();
          onMetadataExtracted(metadata);
        } catch (metaError) {
          console.warn('Could not extract metadata:', metaError);
        }
      }

      // Extract text if callback provided
      if (onTextExtracted) {
        try {
          const page = await loadedPdf.getPage(1);
          const textContent = await page.getTextContent();
          const text = textContent.items.map(item => item.str).join(' ');
          onTextExtracted(text);
        } catch (textError) {
          console.warn('Could not extract text:', textError);
        }
      }

    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err.message);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPage = async () => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

    } catch (err) {
      console.error('Error rendering page:', err);
      setError(err.message);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  if (loading) {
    return (
      <div className={`pdf-viewer-loading ${className}`}>
        <div className="flex items-center justify-center h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="animate-spin text-4xl text-gray-400 mb-4">🔄</div>
            <p className="text-gray-600 font-medium">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`pdf-viewer-error ${className}`}>
        <div className="flex items-center justify-center h-64 bg-red-50 border-2 border-dashed border-red-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl text-red-400 mb-4">⚠️</div>
            <p className="text-red-600 font-medium">Error loading PDF</p>
            <p className="text-red-500 text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className={`pdf-viewer-placeholder ${className}`}>
        <div className="flex items-center justify-center h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl text-gray-400 mb-4">📄</div>
            <p className="text-gray-600 font-medium">No PDF selected</p>
            <p className="text-gray-500 text-sm mt-2">Select a PDF file to view</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${className}`}>
      {/* PDF Controls */}
      <div className="pdf-controls bg-gray-100 p-3 rounded-t-lg border flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={zoomOut}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Zoom Out
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button 
            onClick={zoomIn}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Zoom In
          </button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="pdf-canvas-container bg-white border border-t-0 rounded-b-lg overflow-auto" style={{ maxHeight: '600px' }}>
        <canvas 
          ref={canvasRef}
          className="block mx-auto"
          style={{ maxWidth: '100%' }}
        />
      </div>
    </div>
  );
};

export default PDFViewer;