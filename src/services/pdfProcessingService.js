// PDF processing service with PDF.js support
import * as pdfjsLib from 'pdfjs-dist';

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
    
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js`;
    
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
    const expiry = this.cacheExpiry.get(key);
    
    if (expiry && now > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  setCachedData(key, data) {
    // Implement LRU cache eviction
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheExpiry.delete(firstKey);
    }
    
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.cacheExpiryTime);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.annotations.clear();
    this.readingProgress.clear();
  }

  // Progress tracking
  registerProgressCallback(fileId, callback) {
    this.progressCallbacks.set(fileId, callback);
  }

  updateProgress(fileId, progress) {
    const callback = this.progressCallbacks.get(fileId);
    if (callback) {
      callback(progress);
    }
  }

  // Extract metadata from PDF file
  async extractMetadata(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const metadata = await pdf.getMetadata();
      
      return {
        title: metadata.info?.Title || file.name,
        author: metadata.info?.Author || 'Unknown Author',
        subject: metadata.info?.Subject || '',
        keywords: metadata.info?.Keywords || '',
        creator: metadata.info?.Creator || '',
        producer: metadata.info?.Producer || '',
        creationDate: metadata.info?.CreationDate || null,
        modificationDate: metadata.info?.ModDate || null,
        pages: pdf.numPages,
        version: metadata.info?.PDFFormatVersion || '1.4',
        fileSize: file.size,
        lastModified: file.lastModified,
        encrypted: metadata.info?.IsEncrypted || false,
        linearized: metadata.info?.IsLinearized || false
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      return {
        title: file.name,
        author: 'Unknown Author',
        subject: '',
        keywords: '',
        creator: '',
        producer: '',
        creationDate: null,
        modificationDate: null,
        pages: 0,
        version: '1.4',
        fileSize: file.size,
        lastModified: file.lastModified,
        encrypted: false,
        linearized: false
      };
    }
  }

  // Generate PDF thumbnail
  async generateThumbnail(file, pageNumber = 1, options = {}) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Calculate scale to fit desired dimensions
      const { thumbnailWidth = 200, thumbnailHeight = 280 } = { ...this.defaultOptions, ...options };
      const scaleX = thumbnailWidth / viewport.width;
      const scaleY = thumbnailHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledViewport = page.getViewport({ scale });
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error);
      return null;
    }
  }

  // Extract text content
  async extractTextContent(file, maxPages = null, progressCallback = null) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const totalPages = pdf.numPages;
      const pagesToExtract = maxPages ? Math.min(maxPages, totalPages) : totalPages;
      
      const pageTexts = [];
      let fullText = '';
      
      for (let i = 1; i <= pagesToExtract; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter(item => item.str && item.str.trim())
            .map(item => item.str)
            .join(' ');
          
          pageTexts.push(pageText);
          fullText += pageText + '\n';
          
          if (progressCallback) {
            progressCallback({
              page: i,
              totalPages: pagesToExtract,
              progress: (i / pagesToExtract) * 100
            });
          }
        } catch (pageError) {
          console.error(`Error extracting text from page ${i}:`, pageError);
          pageTexts.push('');
        }
      }
      
      return {
        fullText: fullText.trim(),
        pageTexts,
        totalPages,
        extractedPages: pagesToExtract
      };
    } catch (error) {
      console.error('Error extracting PDF text content:', error);
      return {
        fullText: '',
        pageTexts: [],
        totalPages: 0,
        extractedPages: 0
      };
    }
  }

  // Extract PDF outline
  async extractOutline(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const outline = await pdf.getOutline();
      
      return {
        hasOutline: outline && outline.length > 0,
        outline: outline
      };
    } catch (error) {
      console.error('Error extracting PDF outline:', error);
      return {
        hasOutline: false,
        outline: null
      };
    }
  }

  // Process PDF file comprehensively
  async processPDFFile(file, options = {}) {
    try {
      const fileId = `${file.name}_${Date.now()}`;
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Register progress callback if provided
      if (mergedOptions.enableProgressTracking && options.progressCallback) {
        this.registerProgressCallback(fileId, options.progressCallback);
      }
      
      this.updateProgress(fileId, { stage: 'Extracting metadata', progress: 10 });
      const metadata = await this.extractMetadata(file);
      
      this.updateProgress(fileId, { stage: 'Generating thumbnail', progress: 30 });
      const thumbnail = await this.generateThumbnail(file, 1, mergedOptions);
      
      this.updateProgress(fileId, { stage: 'Extracting text content', progress: 50 });
      const textContent = await this.extractTextContent(file, null, (progress) => {
        this.updateProgress(fileId, { 
          stage: `Extracting text (page ${progress.page}/${progress.totalPages})`, 
          progress: 50 + (progress.progress * 0.3) 
        });
      });
      
      this.updateProgress(fileId, { stage: 'Extracting outline', progress: 80 });
      const outline = await this.extractOutline(file);
      
      this.updateProgress(fileId, { stage: 'Finalizing', progress: 90 });
      
      const result = {
        success: true,
        originalFile: file,
        fileId,
        metadata,
        thumbnail,
        textContent,
        outline,
        processed: true,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      const cacheKey = `${file.name}_${file.size}`;
      this.setCachedData(cacheKey, result);
      this.processedFiles.set(fileId, result);
      
      this.updateProgress(fileId, { stage: 'Complete', progress: 100 });
      
      return result;
    } catch (error) {
      console.error('Error processing PDF file:', error);
      return this.createFallbackResult(file, error);
    }
  }

  // Annotation management
  addAnnotation(fileId, annotation) {
    try {
      if (!this.annotations.has(fileId)) {
        this.annotations.set(fileId, new Map());
      }
      
      const annotationId = Date.now().toString();
      const fullAnnotation = {
        id: annotationId,
        ...annotation,
        timestamp: new Date().toISOString()
      };
      
      this.annotations.get(fileId).set(annotationId, fullAnnotation);
      return annotationId;
    } catch (error) {
      console.error('Error adding annotation:', error);
      return null;
    }
  }

  getAnnotations(fileId) {
    try {
      const fileAnnotations = this.annotations.get(fileId);
      return fileAnnotations ? Array.from(fileAnnotations.values()) : [];
    } catch (error) {
      console.error('Error getting annotations:', error);
      return [];
    }
  }

  updateAnnotation(fileId, annotationId, updates) {
    try {
      const fileAnnotations = this.annotations.get(fileId);
      if (!fileAnnotations || !fileAnnotations.has(annotationId)) {
        return false;
      }
      
      const existingAnnotation = fileAnnotations.get(annotationId);
      const updatedAnnotation = {
        ...existingAnnotation,
        ...updates,
        lastModified: new Date().toISOString()
      };
      
      fileAnnotations.set(annotationId, updatedAnnotation);
      return true;
    } catch (error) {
      console.error('Error updating annotation:', error);
      return false;
    }
  }

  deleteAnnotation(fileId, annotationId) {
    try {
      const fileAnnotations = this.annotations.get(fileId);
      if (!fileAnnotations) {
        return false;
      }
      
      return fileAnnotations.delete(annotationId);
    } catch (error) {
      console.error('Error deleting annotation:', error);
      return false;
    }
  }

  // Reading progress tracking
  updateReadingProgress(fileId, progress) {
    this.readingProgress.set(fileId, progress);
  }

  getReadingProgress(fileId) {
    return { progress: this.readingProgress.get(fileId) || 0 };
  }

  // Create fallback result when processing fails
  createFallbackResult(file, error) {
    return {
      success: false,
      originalFile: file,
      error: error.message,
      fallback: true,
      originalUrl: URL.createObjectURL(file),
      processed: false,
      timestamp: new Date().toISOString()
    };
  }

  // Get processing status
  getProcessingStatus(fileId) {
    return {
      inProgress: this.progressCallbacks.has(fileId),
      cached: this.processedFiles.has(fileId)
    };
  }

  // Cleanup resources
  cleanup() {
    this.clearCache();
    this.progressCallbacks.clear();
    this.processedFiles.clear();
  }

  // Validate PDF file
  isValidPDFFile(file) {
    const validTypes = ['application/pdf'];
    return validTypes.includes(file.type.toLowerCase()) || 
           file.name.toLowerCase().endsWith('.pdf');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: Array.from(this.cache.keys()),
      expiryTime: this.cacheExpiryTime
    };
  }

  // Search in PDF
  searchInPDF(fileId, query, options = {}) {
    try {
      const processedData = this.processedFiles.get(fileId);
      if (!processedData || !processedData.textContent) {
        return {
          query: query,
          results: [],
          totalMatches: 0,
          caseSensitive: options.caseSensitive || false,
          wholeWord: options.wholeWord || false
        };
      }

      const { caseSensitive = false, wholeWord = false } = options;
      const searchQuery = caseSensitive ? query : query.toLowerCase();
      const results = [];
      let totalMatches = 0;

      processedData.textContent.pageTexts.forEach((pageText, pageIndex) => {
        const searchText = caseSensitive ? pageText : pageText.toLowerCase();
        
        if (wholeWord) {
          const regex = new RegExp(`\\b${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
          let match;
          while ((match = regex.exec(searchText)) !== null) {
            results.push({
              page: pageIndex + 1,
              position: match.index,
              context: this.extractContext(pageText, match.index, searchQuery.length)
            });
            totalMatches++;
          }
        } else {
          let index = searchText.indexOf(searchQuery);
          while (index !== -1) {
            results.push({
              page: pageIndex + 1,
              position: index,
              context: this.extractContext(pageText, index, searchQuery.length)
            });
            totalMatches++;
            index = searchText.indexOf(searchQuery, index + 1);
          }
        }
      });

      return {
        query: query,
        results,
        totalMatches,
        caseSensitive,
        wholeWord
      };
    } catch (error) {
      console.error('Error searching in PDF:', error);
      return {
        query: query,
        results: [],
        totalMatches: 0,
        caseSensitive: options.caseSensitive || false,
        wholeWord: options.wholeWord || false
      };
    }
  }

  // Extract context around search matches
  extractContext(text, position, matchLength, contextSize = 50) {
    const start = Math.max(0, position - contextSize);
    const end = Math.min(text.length, position + matchLength + contextSize);
    return text.substring(start, end);
  }
}

// Create singleton instance
const pdfProcessingService = new PDFProcessingService();

export default pdfProcessingService; 