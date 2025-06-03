// Temporary PDF processing service replacement for deployment
// import * as pdfjsLib from 'pdfjs-dist';
// import 'pdfjs-dist/build/pdf.worker.entry';

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
    
    // Temporarily disabled for deployment
    // pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.7.107/pdf.worker.min.js`;
    
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

  // Extract metadata from PDF file - temporarily disabled
  async extractMetadata(file) {
    console.warn('PDF metadata extraction temporarily disabled for deployment');
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

  // Generate PDF thumbnail - temporarily disabled
  async generateThumbnail(file, pageNumber = 1, options = {}) {
    console.warn('PDF thumbnail generation temporarily disabled for deployment');
    return null;
  }

  // Extract text content - temporarily disabled
  async extractTextContent(file, maxPages = null, progressCallback = null) {
    console.warn('PDF text extraction temporarily disabled for deployment');
    return {
      fullText: '',
      pageTexts: [],
      totalPages: 0,
      extractedPages: 0
    };
  }

  // Extract PDF outline - temporarily disabled
  async extractOutline(file) {
    console.warn('PDF outline extraction temporarily disabled for deployment');
    return {
      hasOutline: false,
      outline: null
    };
  }

  // Process PDF file comprehensively - temporarily disabled
  async processPDFFile(file, options = {}) {
    console.warn('PDF processing temporarily disabled for deployment');
    
    return {
      success: false,
      originalFile: file,
      error: 'PDF processing temporarily disabled for deployment',
      fallback: true,
      fileId: `${file.name}_${Date.now()}`,
      metadata: await this.extractMetadata(file),
      thumbnail: null,
      textContent: await this.extractTextContent(file),
      outline: await this.extractOutline(file),
      processed: false,
      timestamp: new Date().toISOString()
    };
  }

  // Annotation management - disabled
  addAnnotation(fileId, annotation) {
    console.warn('PDF annotations temporarily disabled for deployment');
    return null;
  }

  getAnnotations(fileId) {
    return [];
  }

  updateAnnotation(fileId, annotationId, updates) {
    console.warn('PDF annotations temporarily disabled for deployment');
    return false;
  }

  deleteAnnotation(fileId, annotationId) {
    console.warn('PDF annotations temporarily disabled for deployment');
    return false;
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

  // Search in PDF - temporarily disabled
  searchInPDF(fileId, query, options = {}) {
    console.warn('PDF search temporarily disabled for deployment');
    return {
      query: query,
      results: [],
      totalMatches: 0,
      caseSensitive: options.caseSensitive || false,
      wholeWord: options.wholeWord || false
    };
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