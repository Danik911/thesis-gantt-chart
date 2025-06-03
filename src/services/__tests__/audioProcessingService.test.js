import audioProcessingService from '../audioProcessingService';

// Mock the external dependencies
jest.mock('@transloadit/sdk');
// jest.mock('music-metadata'); // Removed due to Node.js compatibility issues
jest.mock('wavesurfer.js');

describe('AudioProcessingService', () => {
  beforeEach(() => {
    // Clear cache before each test
    audioProcessingService.clearCache();
  });

  describe('File Validation', () => {
    test('should validate MP3 files', () => {
      const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      expect(audioProcessingService.isValidAudioFile(mp3File)).toBe(true);
    });

    test('should validate M4A files', () => {
      const m4aFile = new File([''], 'test.m4a', { type: 'audio/m4a' });
      expect(audioProcessingService.isValidAudioFile(m4aFile)).toBe(true);
    });

    test('should validate WAV files', () => {
      const wavFile = new File([''], 'test.wav', { type: 'audio/wav' });
      expect(audioProcessingService.isValidAudioFile(wavFile)).toBe(true);
    });

    test('should reject non-audio files', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      expect(audioProcessingService.isValidAudioFile(textFile)).toBe(false);
    });

    test('should validate by file extension when type is missing', () => {
      const mp3File = new File([''], 'test.mp3', { type: '' });
      expect(audioProcessingService.isValidAudioFile(mp3File)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    test('should store and retrieve cached data', () => {
      const testData = { test: 'data' };
      audioProcessingService.setCachedData('test-key', testData);
      
      const retrieved = audioProcessingService.getCachedData('test-key');
      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent cache keys', () => {
      const retrieved = audioProcessingService.getCachedData('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should clear all cached data', () => {
      audioProcessingService.setCachedData('key1', 'data1');
      audioProcessingService.setCachedData('key2', 'data2');
      
      audioProcessingService.clearCache();
      
      expect(audioProcessingService.getCachedData('key1')).toBeNull();
      expect(audioProcessingService.getCachedData('key2')).toBeNull();
    });

    test('should provide cache statistics', () => {
      audioProcessingService.setCachedData('key1', 'data1');
      audioProcessingService.setCachedData('key2', 'data2');
      
      const stats = audioProcessingService.getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(50);
      expect(stats.entries).toContain('key1');
      expect(stats.entries).toContain('key2');
    });

    test('should evict oldest entries when cache is full', () => {
      // Set max cache size to 2 for testing
      const originalMaxSize = audioProcessingService.maxCacheSize;
      audioProcessingService.maxCacheSize = 2;
      
      audioProcessingService.setCachedData('key1', 'data1');
      audioProcessingService.setCachedData('key2', 'data2');
      audioProcessingService.setCachedData('key3', 'data3'); // Should evict key1
      
      expect(audioProcessingService.getCachedData('key1')).toBeNull();
      expect(audioProcessingService.getCachedData('key2')).toBe('data2');
      expect(audioProcessingService.getCachedData('key3')).toBe('data3');
      
      // Restore original max size
      audioProcessingService.maxCacheSize = originalMaxSize;
    });
  });

  describe('Progress Tracking', () => {
    test('should register and call progress callbacks', () => {
      const mockCallback = jest.fn();
      const fileId = 'test-file-id';
      
      audioProcessingService.registerProgressCallback(fileId, mockCallback);
      audioProcessingService.updateProgress(fileId, { progress: 50, status: 'processing' });
      
      expect(mockCallback).toHaveBeenCalledWith({ progress: 50, status: 'processing' });
    });

    test('should not call callback for unregistered file ID', () => {
      const mockCallback = jest.fn();
      const fileId = 'test-file-id';
      
      audioProcessingService.registerProgressCallback(fileId, mockCallback);
      audioProcessingService.updateProgress('different-id', { progress: 50 });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Processing Status', () => {
    test('should track processing status', () => {
      const fileId = 'test-file-id';
      const mockCallback = jest.fn();
      
      // Initially not in progress
      let status = audioProcessingService.getProcessingStatus(fileId);
      expect(status.inProgress).toBe(false);
      
      // Register callback to mark as in progress
      audioProcessingService.registerProgressCallback(fileId, mockCallback);
      status = audioProcessingService.getProcessingStatus(fileId);
      expect(status.inProgress).toBe(true);
    });
  });

  describe('Metadata Extraction', () => {
    test('should extract basic metadata from audio file', async () => {
      const testFile = new File(['fake audio data'], 'test.mp3', { 
        type: 'audio/mpeg',
        lastModified: Date.now()
      });

      const result = await audioProcessingService.extractMetadata(testFile);

      expect(result).toMatchObject({
        title: 'test', // File name without extension
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        genre: 'Unknown',
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        format: 'audio/mpeg'
      });
    });

    test('should handle metadata extraction and return basic file info', async () => {
      const testFile = new File(['audio data'], 'my-song.wav', { 
        type: 'audio/wav',
        lastModified: Date.now()
      });

      const result = await audioProcessingService.extractMetadata(testFile);

      // Should return basic metadata based on file properties
      expect(result).toMatchObject({
        title: 'my-song', // File name without extension
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: 'Unknown',
        format: 'audio/wav'
      });
    });

    test('should cache metadata results', async () => {
      const mockMetadata = {
        common: { title: 'Test Song' },
        format: { duration: 180 }
      };

      const { parseBuffer } = require('music-metadata');
      parseBuffer.mockResolvedValue(mockMetadata);

      const testFile = new File(['data'], 'test.mp3', { 
        type: 'audio/mpeg',
        lastModified: Date.now()
      });

      testFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      // First call
      await audioProcessingService.extractMetadata(testFile);
      
      // Second call should use cache
      await audioProcessingService.extractMetadata(testFile);

      // parseBuffer should only be called once due to caching
      expect(parseBuffer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Handling', () => {
    test('should create fallback result on processing failure', () => {
      const testFile = new File(['data'], 'test.mp3', { type: 'audio/mpeg' });
      const testError = new Error('Processing failed');

      const fallbackResult = audioProcessingService.createFallbackResult(testFile, testError);

      expect(fallbackResult).toMatchObject({
        success: false,
        originalFile: testFile,
        error: 'Processing failed',
        fallback: true,
        processed: false
      });

      expect(fallbackResult.originalUrl).toMatch(/^blob:/);
      expect(fallbackResult.timestamp).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', () => {
      const mockCallback = jest.fn();
      
      audioProcessingService.setCachedData('test', 'data');
      audioProcessingService.registerProgressCallback('test-id', mockCallback);
      
      audioProcessingService.cleanup();
      
      expect(audioProcessingService.getCachedData('test')).toBeNull();
      expect(audioProcessingService.getProcessingStatus('test-id').inProgress).toBe(false);
    });
  });
});

// Integration tests would go here for testing with actual Transloadit API
describe('AudioProcessingService Integration', () => {
  // These tests would require actual API credentials and should be run separately
  
  test.skip('should convert M4A to MP3 via Transloadit', async () => {
    // Integration test for M4A conversion
  });

  test.skip('should generate waveform via Transloadit', async () => {
    // Integration test for waveform generation
  });

  test.skip('should handle API failures gracefully', async () => {
    // Integration test for API error handling
  });
}); 