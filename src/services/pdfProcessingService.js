// PDF processing service with PDF.js support
import pdfjsLib from '../utils/pdfConfig';

class PDFProcessingService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.processedFiles = new Map();
    this.progressCallbacks = new Map();
    this.annotations = new Map();
    this.readingProgress = new Map();
    this.maxCacheSize = 50;
    this.cacheExpiryTime = 30 * 60 * 1000; // 30 minutes
    
    this.defaultOptions = {
      thumbnailWidth: 200,
      thumbnailHeight: 280,
      maxTextLength: 10000,
      enableAnnotations: true,
      enableProgressTracking: true
    };
  }

  // Cache management
  getCachedData(key) {
    const now = Date.now();
    if (this.cache.has(key) && this.cacheExpiry.get(key) > now) {
      return this.cache.get(key);
    }
    
    // Remove expired entry
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    }
    
    return null;
  }

  setCachedData(key, data) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheExpiry.delete(firstKey);
    }
    
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.cacheExpiryTime);
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // File validation
  isValidPDFFile(file) {
    return file && 
           file.type === 'application/pdf' && 
           file.size > 0 && 
           file.size < 50 * 1024 * 1024; // 50MB limit
  }

  // Generate unique file ID
  generateFileId(file) {
    return `pdf_${file.name}_${file.size}_${file.lastModified || Date.now()}`;
  }

  // Main PDF processing function
  async processPDFFile(file, options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const fileId = this.generateFileId(file);
    
    try {
      // Check if already processed
      if (this.processedFiles.has(fileId)) {
        return this.processedFiles.get(fileId);
      }

      // Validate file
      if (!this.isValidPDFFile(file)) {
        throw new Error('Invalid PDF file or file too large (max 50MB)');
      }

      this.updateProgress(fileId, 0, 'Starting PDF processing...');

      // Load PDF document
      const arrayBuffer = await file.arrayBuffer();
      this.updateProgress(fileId, 20, 'Loading PDF document...');
      
      const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
      this.updateProgress(fileId, 40, 'Extracting metadata...');

      // Extract basic information
      const numPages = pdfDoc.numPages;
      
      // Extract metadata
      let metadata = {};
      try {
        const pdfMetadata = await pdfDoc.getMetadata();
        metadata = {
          title: pdfMetadata.info?.Title || file.name,
          author: pdfMetadata.info?.Author || 'Unknown',
          subject: pdfMetadata.info?.Subject || '',
          creator: pdfMetadata.info?.Creator || '',
          creationDate: pdfMetadata.info?.CreationDate || null,
          modificationDate: pdfMetadata.info?.ModDate || null,
          keywords: pdfMetadata.info?.Keywords || ''
        };
      } catch (metaError) {
        console.warn('Could not extract PDF metadata:', metaError);
      }

      this.updateProgress(fileId, 60, 'Generating thumbnail...');

      // Generate thumbnail from first page
      let thumbnail = null;
      try {
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        
        // Calculate scale to fit thumbnail dimensions
        const scale = Math.min(
          opts.thumbnailWidth / viewport.width,
          opts.thumbnailHeight / viewport.height
        );
        
        const scaledViewport = page.getViewport({ scale });
        
        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        // Render page to canvas
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise;

        thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      } catch (thumbError) {
        console.warn('Could not generate thumbnail:', thumbError);
      }

      this.updateProgress(fileId, 80, 'Extracting text content...');

      // Extract text from first few pages for search
      let extractedText = '';
      const pagesToExtract = Math.min(numPages, 5); // Extract from first 5 pages
      
      try {
        for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
          extractedText += pageText + ' ';
          
          if (extractedText.length > opts.maxTextLength) {
            extractedText = extractedText.substring(0, opts.maxTextLength);
            break;
          }
        }
      } catch (textError) {
        console.warn('Could not extract text:', textError);
      }

      this.updateProgress(fileId, 95, 'Finalizing...');

      // Create result object
      const result = {
        success: true,
        fileId,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        },
        metadata,
        pageCount: numPages,
        thumbnail,
        text: extractedText.trim(),
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - (this.progressCallbacks.get(fileId)?.startTime || Date.now())
      };

      // Store result
      this.processedFiles.set(fileId, result);
      
      if (opts.enableProgressTracking) {
        this.readingProgress.set(fileId, {
          currentPage: 1,
          totalPages: numPages,
          lastViewed: new Date().toISOString()
        });
      }

      this.updateProgress(fileId, 100, 'Processing complete');
      
      return result;

    } catch (error) {
      console.error('PDF processing error:', error);
      const errorResult = {
        success: false,
        fileId,
        error: error.message,
        processedAt: new Date().toISOString()
      };
      
      this.processedFiles.set(fileId, errorResult);
      this.updateProgress(fileId, 0, `Error: ${error.message}`);
      
      return errorResult;
    }
  }

  // Progress tracking
  updateProgress(fileId, percentage, message) {
    const callback = this.progressCallbacks.get(fileId);
    if (callback) {
      callback({ fileId, percentage, message, timestamp: Date.now() });
    }
  }

  setProgressCallback(fileId, callback) {
    this.progressCallbacks.set(fileId, { 
      ...callback, 
      startTime: Date.now() 
    });
  }

  removeProgressCallback(fileId) {
    this.progressCallbacks.delete(fileId);
  }

  // Search functionality
  searchInPDF(fileId, query, options = {}) {
    const processed = this.processedFiles.get(fileId);
    if (!processed || !processed.success) {
      return { results: [], total: 0 };
    }

    const { caseSensitive = false, wholeWord = false } = options;
    const searchText = caseSensitive ? processed.text : processed.text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    const results = [];
    let index = 0;
    
    while (index < searchText.length) {
      let foundIndex;
      
      if (wholeWord) {
        const regex = new RegExp(`\\b${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 
                                 caseSensitive ? 'g' : 'gi');
        const match = regex.exec(searchText.substring(index));
        if (match) {
          foundIndex = index + match.index;
        } else {
          break;
        }
      } else {
        foundIndex = searchText.indexOf(searchQuery, index);
        if (foundIndex === -1) break;
      }
      
      // Extract context around the match
      const contextStart = Math.max(0, foundIndex - 50);
      const contextEnd = Math.min(searchText.length, foundIndex + searchQuery.length + 50);
      const context = processed.text.substring(contextStart, contextEnd);
      
      results.push({
        index: foundIndex,
        context: context,
        beforeMatch: context.substring(0, foundIndex - contextStart),
        match: context.substring(foundIndex - contextStart, foundIndex - contextStart + searchQuery.length),
        afterMatch: context.substring(foundIndex - contextStart + searchQuery.length)
      });
      
      index = foundIndex + searchQuery.length;
    }

    return {
      results,
      total: results.length,
      query,
      fileId
    };
  }

  // Annotation management
  addAnnotation(fileId, pageNumber, annotation) {
    if (!this.annotations.has(fileId)) {
      this.annotations.set(fileId, new Map());
    }
    
    const fileAnnotations = this.annotations.get(fileId);
    if (!fileAnnotations.has(pageNumber)) {
      fileAnnotations.set(pageNumber, []);
    }
    
    const pageAnnotations = fileAnnotations.get(pageNumber);
    annotation.id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    annotation.createdAt = new Date().toISOString();
    
    pageAnnotations.push(annotation);
    return annotation.id;
  }

  getAnnotations(fileId, pageNumber = null) {
    const fileAnnotations = this.annotations.get(fileId);
    if (!fileAnnotations) return [];
    
    if (pageNumber !== null) {
      return fileAnnotations.get(pageNumber) || [];
    }
    
    // Return all annotations for all pages
    const allAnnotations = [];
    for (const [page, annotations] of fileAnnotations) {
      allAnnotations.push(...annotations.map(ann => ({ ...ann, pageNumber: page })));
    }
    return allAnnotations;
  }

  removeAnnotation(fileId, annotationId) {
    const fileAnnotations = this.annotations.get(fileId);
    if (!fileAnnotations) return false;
    
    for (const [pageNumber, annotations] of fileAnnotations) {
      const index = annotations.findIndex(ann => ann.id === annotationId);
      if (index !== -1) {
        annotations.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // Reading progress tracking
  updateReadingProgress(fileId, pageNumber) {
    const progress = this.readingProgress.get(fileId);
    if (progress) {
      progress.currentPage = pageNumber;
      progress.lastViewed = new Date().toISOString();
    }
  }

  getReadingProgress(fileId) {
    return this.readingProgress.get(fileId) || null;
  }

  // Utility methods
  getProcessedFile(fileId) {
    return this.processedFiles.get(fileId) || null;
  }

  getAllProcessedFiles() {
    return Array.from(this.processedFiles.values());
  }

  removeProcessedFile(fileId) {
    this.processedFiles.delete(fileId);
    this.annotations.delete(fileId);
    this.readingProgress.delete(fileId);
    this.progressCallbacks.delete(fileId);
  }

  getStats() {
    return {
      processedFiles: this.processedFiles.size,
      cacheSize: this.cache.size,
      totalAnnotations: Array.from(this.annotations.values())
        .reduce((total, fileAnns) => {
          return total + Array.from(fileAnns.values())
            .reduce((fileTotal, pageAnns) => fileTotal + pageAnns.length, 0);
        }, 0)
    };
  }
}

// Export a singleton instance
const pdfProcessingService = new PDFProcessingService();
export default pdfProcessingService;