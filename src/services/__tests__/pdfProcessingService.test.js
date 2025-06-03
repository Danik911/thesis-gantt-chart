import pdfProcessingService from '../pdfProcessingService';

// Mock PDF.js
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getMetadata: () => Promise.resolve({
        info: {
          Title: 'Test PDF Document',
          Author: 'Test Author',
          Subject: 'Test Subject',
          Keywords: 'test, pdf, document',
          Creator: 'Test Creator',
          Producer: 'Test Producer',
          CreationDate: 'D:20231201000000Z',
          ModDate: 'D:20231201120000Z',
          IsEncrypted: false,
          IsLinearized: true,
          PDFFormatVersion: '1.7'
        }
      }),
      getPage: (pageNum) => Promise.resolve({
        getViewport: ({ scale }) => ({
          width: 595,
          height: 842,
          scale
        }),
        getTextContent: () => Promise.resolve({
          items: [
            { str: 'Test page ' + pageNum + ' content' },
            { str: ' with multiple items' },
            { str: ' for testing purposes.' }
          ]
        }),
        render: () => ({
          promise: Promise.resolve()
        })
      }),
      getOutline: () => Promise.resolve([
        {
          title: 'Chapter 1',
          dest: [{ num: 1, gen: 0 }, { name: 'XYZ' }, 0, 842, 0],
          items: [
            {
              title: 'Section 1.1',
              dest: [{ num: 2, gen: 0 }, { name: 'XYZ' }, 0, 700, 0],
              items: []
            }
          ]
        }
      ])
    })
  }))
}));

// Mock canvas and context
global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return {
      getContext: () => ({
        fillText: jest.fn(),
        drawImage: jest.fn(),
        clearRect: jest.fn()
      }),
      width: 200,
      height: 280,
      toDataURL: () => 'data:image/png;base64,mockImageData'
    };
  }
  return {};
});

describe('PDFProcessingService', () => {
  let mockFile;

  beforeEach(() => {
    mockFile = {
      name: 'test-document.pdf',
      size: 1024000,
      lastModified: Date.now(),
      type: 'application/pdf',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    };
    pdfProcessingService.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Metadata Extraction', () => {
    test('should extract metadata accurately from PDF', async () => {
      const metadata = await pdfProcessingService.extractMetadata(mockFile);
      
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe('Test PDF Document');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.subject).toBe('Test Subject');
      expect(metadata.keywords).toBe('test, pdf, document');
      expect(metadata.creator).toBe('Test Creator');
      expect(metadata.producer).toBe('Test Producer');
      expect(metadata.pages).toBe(3);
      expect(metadata.version).toBe('1.7');
      expect(metadata.fileSize).toBe(1024000);
      expect(metadata.encrypted).toBe(false);
      expect(metadata.linearized).toBe(true);
    });

    test('should handle PDF with missing metadata gracefully', async () => {
      const pdfWithoutMetadata = {
        ...mockFile,
        name: 'no-metadata.pdf'
      };

      // Mock PDF with empty metadata
      const originalGetDocument = require('pdfjs-dist').getDocument;
      require('pdfjs-dist').getDocument = jest.fn(() => ({
        promise: Promise.resolve({
          numPages: 1,
          getMetadata: () => Promise.resolve({
            info: {}
          })
        })
      }));

      const metadata = await pdfProcessingService.extractMetadata(pdfWithoutMetadata);
      
      expect(metadata.title).toBe('no-metadata.pdf');
      expect(metadata.author).toBe('Unknown Author');
      expect(metadata.subject).toBe('');
      expect(metadata.keywords).toBe('');
      
      // Restore original mock
      require('pdfjs-dist').getDocument = originalGetDocument;
    });

    test('should cache metadata extraction results', async () => {
      await pdfProcessingService.extractMetadata(mockFile);
      const secondCall = await pdfProcessingService.extractMetadata(mockFile);
      
      // Should return cached result without calling PDF.js again
      expect(secondCall.title).toBe('Test PDF Document');
    });
  });

  describe('Thumbnail Generation', () => {
    test('should generate PDF thumbnails correctly', async () => {
      const thumbnail = await pdfProcessingService.generateThumbnail(mockFile, 1, {
        width: 150,
        height: 200
      });
      
      expect(thumbnail).toBeDefined();
      expect(thumbnail.dataUrl).toBe('data:image/png;base64,mockImageData');
      expect(thumbnail.width).toBeGreaterThan(0);
      expect(thumbnail.height).toBeGreaterThan(0);
      expect(thumbnail.pageNumber).toBe(1);
      expect(thumbnail.totalPages).toBe(3);
    });

    test('should handle invalid page numbers gracefully', async () => {
      const thumbnail = await pdfProcessingService.generateThumbnail(mockFile, 999);
      
      expect(thumbnail).toBeDefined();
      expect(thumbnail.pageNumber).toBe(1); // Should default to page 1
    });

    test('should cache thumbnail generation results', async () => {
      const firstThumbnail = await pdfProcessingService.generateThumbnail(mockFile, 1);
      const secondThumbnail = await pdfProcessingService.generateThumbnail(mockFile, 1);
      
      expect(firstThumbnail.dataUrl).toBe(secondThumbnail.dataUrl);
    });

    test('should generate thumbnails for different page sizes', async () => {
      const smallThumbnail = await pdfProcessingService.generateThumbnail(mockFile, 1, {
        width: 100,
        height: 150
      });
      
      const largeThumbnail = await pdfProcessingService.generateThumbnail(mockFile, 1, {
        width: 300,
        height: 400
      });
      
      expect(smallThumbnail).toBeDefined();
      expect(largeThumbnail).toBeDefined();
      expect(smallThumbnail.dataUrl).toBeDefined();
      expect(largeThumbnail.dataUrl).toBeDefined();
    });
  });

  describe('Text Extraction and Search', () => {
    test('should extract text content for search indexing', async () => {
      const textContent = await pdfProcessingService.extractTextContent(mockFile);
      
      expect(textContent).toBeDefined();
      expect(textContent.fullText).toContain('Test page');
      expect(textContent.pageTexts).toHaveLength(3);
      expect(textContent.pageTexts[0]).toContain('Test page 1');
      expect(textContent.pageTexts[1]).toContain('Test page 2');
      expect(textContent.pageTexts[2]).toContain('Test page 3');
    });

    test('should handle progress callback during text extraction', async () => {
      const progressCallback = jest.fn();
      
      await pdfProcessingService.extractTextContent(mockFile, null, progressCallback);
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(expect.any(Number));
    });

    test('should search within extracted text content', async () => {
      // First process the PDF to extract text
      await pdfProcessingService.processPDFFile(mockFile);
      
      const fileId = `${mockFile.name}_${mockFile.size}`;
      const searchResults = pdfProcessingService.searchInPDF(fileId, 'Test page', {
        caseSensitive: false,
        wholeWord: false
      });
      
      expect(searchResults).toBeDefined();
      expect(searchResults.results.length).toBeGreaterThan(0);
      expect(searchResults.totalMatches).toBeGreaterThan(0);
    });

    test('should perform case-sensitive search', async () => {
      await pdfProcessingService.processPDFFile(mockFile);
      const fileId = `${mockFile.name}_${mockFile.size}`;
      
      const caseSensitiveResults = pdfProcessingService.searchInPDF(fileId, 'TEST', {
        caseSensitive: true
      });
      
      const caseInsensitiveResults = pdfProcessingService.searchInPDF(fileId, 'TEST', {
        caseSensitive: false
      });
      
      expect(caseInsensitiveResults.totalMatches).toBeGreaterThanOrEqual(
        caseSensitiveResults.totalMatches
      );
    });

    test('should limit text extraction by page count', async () => {
      const limitedTextContent = await pdfProcessingService.extractTextContent(mockFile, 2);
      
      expect(limitedTextContent.pageTexts).toHaveLength(2);
    });
  });

  describe('PDF Navigation Features', () => {
    test('should extract PDF outline for navigation', async () => {
      const outline = await pdfProcessingService.extractOutline(mockFile);
      
      expect(outline).toBeDefined();
      expect(outline.hasOutline).toBe(true);
      expect(outline.outline).toBeDefined();
      expect(outline.outline[0].title).toBe('Chapter 1');
      expect(outline.outline[0].items[0].title).toBe('Section 1.1');
    });

    test('should handle PDFs without outline', async () => {
      // Mock PDF without outline
      const originalGetDocument = require('pdfjs-dist').getDocument;
      require('pdfjs-dist').getDocument = jest.fn(() => ({
        promise: Promise.resolve({
          numPages: 1,
          getOutline: () => Promise.resolve(null)
        })
      }));

      const outline = await pdfProcessingService.extractOutline(mockFile);
      
      expect(outline.hasOutline).toBe(false);
      expect(outline.outline).toBeNull();
      
      // Restore original mock
      require('pdfjs-dist').getDocument = originalGetDocument;
    });
  });

  describe('Annotation System', () => {
    const fileId = 'test-file-id';
    const mockAnnotation = {
      type: 'highlight',
      page: 1,
      position: { x: 100, y: 200, width: 150, height: 20 },
      content: 'Test annotation',
      color: '#ffff00',
      timestamp: Date.now()
    };

    test('should add annotations to PDF', () => {
      const result = pdfProcessingService.addAnnotation(fileId, mockAnnotation);
      
      expect(result.success).toBe(true);
      expect(result.annotationId).toBeDefined();
      
      const annotations = pdfProcessingService.getAnnotations(fileId);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].content).toBe('Test annotation');
    });

    test('should update existing annotations', () => {
      const addResult = pdfProcessingService.addAnnotation(fileId, mockAnnotation);
      const annotationId = addResult.annotationId;
      
      const updateResult = pdfProcessingService.updateAnnotation(fileId, annotationId, {
        content: 'Updated annotation content'
      });
      
      expect(updateResult.success).toBe(true);
      
      const annotations = pdfProcessingService.getAnnotations(fileId);
      expect(annotations[0].content).toBe('Updated annotation content');
    });

    test('should delete annotations', () => {
      const addResult = pdfProcessingService.addAnnotation(fileId, mockAnnotation);
      const annotationId = addResult.annotationId;
      
      const deleteResult = pdfProcessingService.deleteAnnotation(fileId, annotationId);
      expect(deleteResult.success).toBe(true);
      
      const annotations = pdfProcessingService.getAnnotations(fileId);
      expect(annotations).toHaveLength(0);
    });

    test('should handle invalid annotation operations', () => {
      const updateResult = pdfProcessingService.updateAnnotation(fileId, 'nonexistent', {
        content: 'Should fail'
      });
      expect(updateResult.success).toBe(false);
      
      const deleteResult = pdfProcessingService.deleteAnnotation(fileId, 'nonexistent');
      expect(deleteResult.success).toBe(false);
    });
  });

  describe('Reading Progress Tracking', () => {
    const fileId = 'test-file-id';

    test('should track reading progress', () => {
      pdfProcessingService.updateReadingProgress(fileId, {
        currentPage: 2,
        totalPages: 10,
        progress: 20,
        lastReadTime: Date.now()
      });
      
      const progress = pdfProcessingService.getReadingProgress(fileId);
      expect(progress.currentPage).toBe(2);
      expect(progress.totalPages).toBe(10);
      expect(progress.progress).toBe(20);
    });

    test('should return default progress for new files', () => {
      const progress = pdfProcessingService.getReadingProgress('new-file-id');
      expect(progress.currentPage).toBe(1);
      expect(progress.progress).toBe(0);
    });

    test('should update existing progress', () => {
      pdfProcessingService.updateReadingProgress(fileId, {
        currentPage: 5,
        totalPages: 10,
        progress: 50
      });
      
      pdfProcessingService.updateReadingProgress(fileId, {
        currentPage: 8,
        totalPages: 10,
        progress: 80
      });
      
      const progress = pdfProcessingService.getReadingProgress(fileId);
      expect(progress.currentPage).toBe(8);
      expect(progress.progress).toBe(80);
    });
  });

  describe('File Processing Integration', () => {
    test('should process PDF file with all features enabled', async () => {
      const result = await pdfProcessingService.processPDFFile(mockFile, {
        thumbnailWidth: 200,
        thumbnailHeight: 280,
        enableAnnotations: true,
        enableProgressTracking: true
      });
      
      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.textContent).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.outline).toBeDefined();
    });

    test('should handle processing errors gracefully', async () => {
      const invalidFile = {
        ...mockFile,
        arrayBuffer: () => Promise.reject(new Error('Invalid file'))
      };
      
      const result = await pdfProcessingService.processPDFFile(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate PDF file types', () => {
      const validPDF = { name: 'test.pdf', type: 'application/pdf' };
      const invalidFile = { name: 'test.txt', type: 'text/plain' };
      
      expect(pdfProcessingService.isValidPDFFile(validPDF)).toBe(true);
      expect(pdfProcessingService.isValidPDFFile(invalidFile)).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should provide cache statistics', () => {
      const stats = pdfProcessingService.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.cacheSize).toBeDefined();
      expect(stats.maxCacheSize).toBeDefined();
      expect(stats.annotationsCount).toBeDefined();
      expect(stats.progressEntriesCount).toBeDefined();
    });

    test('should clear cache completely', async () => {
      await pdfProcessingService.extractMetadata(mockFile);
      pdfProcessingService.addAnnotation('test-id', { type: 'highlight', content: 'test' });
      
      pdfProcessingService.clearCache();
      
      const stats = pdfProcessingService.getCacheStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.annotationsCount).toBe(0);
      expect(stats.progressEntriesCount).toBe(0);
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large PDF files with lazy loading', async () => {
      const largeMockFile = {
        ...mockFile,
        size: 50 * 1024 * 1024, // 50MB
        name: 'large-document.pdf'
      };
      
      const result = await pdfProcessingService.processPDFFile(largeMockFile);
      expect(result.success).toBe(true);
    });

    test('should respect cache size limits', async () => {
      // Add multiple files to exceed cache limit
      for (let i = 0; i < 60; i++) {
        const testFile = {
          ...mockFile,
          name: `test-${i}.pdf`,
          size: 1024 * i
        };
        await pdfProcessingService.extractMetadata(testFile);
      }
      
      const stats = pdfProcessingService.getCacheStats();
      expect(stats.cacheSize).toBeLessThanOrEqual(50); // maxCacheSize
    });
  });
}); 