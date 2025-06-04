// Temporarily disabled for deployment
// import Transloadit from 'transloadit';
// import { parseBuffer } from 'music-metadata';
// import WaveSurfer from 'wavesurfer.js';

class AudioProcessingService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.processedFiles = new Map();
    this.progressCallbacks = new Map();
    this.maxCacheSize = 50;
    this.cacheExpiryTime = 30 * 60 * 1000; // 30 minutes
    
    // Initialize Transloadit client - disabled for deployment
    // this.transloaditClient = new Transloadit({
    //   authKey: process.env.REACT_APP_TRANSLOADIT_AUTH_KEY,
    //   authSecret: process.env.REACT_APP_TRANSLOADIT_AUTH_SECRET,
    // });

    // Audio conversion templates
    this.conversionTemplates = {
      m4aToMp3: {
        steps: {
          convert: {
            robot: '/audio/encode',
            use: ':original',
            preset: 'mp3',
            bitrate: 128,
            sample_rate: 44100,
          },
          optimize: {
            robot: '/audio/encode',
            use: 'convert',
            preset: 'mp3',
            bitrate: 'auto',
            normalize_audio: true,
          }
        }
      },
      wavToMp3: {
        steps: {
          convert: {
            robot: '/audio/encode',
            use: ':original',
            preset: 'mp3',
            bitrate: 128,
            sample_rate: 44100,
          },
          optimize: {
            robot: '/audio/encode',
            use: 'convert',
            preset: 'mp3',
            bitrate: 'auto',
            normalize_audio: true,
          }
        }
      },
      waveformGeneration: {
        steps: {
          waveform: {
            robot: '/audio/waveform',
            use: ':original',
            width: 800,
            height: 200,
            background_color: '#ffffff',
            waveform_color: '#3b82f6',
            format: 'png'
          }
        }
      },
      thumbnailGeneration: {
        steps: {
          thumbnail: {
            robot: '/image/resize',
            use: 'waveform',
            width: 200,
            height: 50,
            resize_strategy: 'fit',
            background: '#f3f4f6'
          }
        }
      }
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

  // Extract metadata from audio file
  async extractMetadata(file) {
    try {
      const cacheKey = `metadata_${file.name}_${file.size}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // Create basic metadata from file properties
      // Note: music-metadata is commented out due to Node.js compatibility issues in browser builds
      const extractedMetadata = {
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        genre: 'Unknown',
        duration: 0, // Will be populated by audio element if possible
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        format: file.type,
        fileSize: file.size,
        lastModified: file.lastModified
      };

      this.setCachedData(cacheKey, extractedMetadata);
      return extractedMetadata;
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {
        title: file.name,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: null,
        genre: 'Unknown',
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        format: file.type,
        fileSize: file.size,
        lastModified: file.lastModified
      };
    }
  }

  // Generate waveform using WaveSurfer.js for client-side preview - disabled for deployment
  async generateClientWaveform(audioBuffer, containerId, options = {}) {
    try {
      // Temporarily disabled for deployment
      console.warn('WaveSurfer functionality disabled for deployment');
      return {
        wavesurfer: null,
        peaks: [],
        duration: 0
      };
    } catch (error) {
      console.error('Failed to generate client-side waveform:', error);
      throw error;
    }
  }

  // Convert M4A to MP3 using Transloadit
  async convertM4AToMP3(file, progressCallback = null) {
    const fileId = `${file.name}_${Date.now()}`;
    try {
      if (progressCallback) {
        this.registerProgressCallback(fileId, progressCallback);
      }

      this.updateProgress(fileId, { status: 'starting', progress: 0 });

      /* Disabled for deployment
      const assembly = await this.transloaditClient.createAssembly({
        params: this.conversionTemplates.m4aToMp3,
        files: { input: file },
        waitForCompletion: true,
        progressCallback: (assembly) => {
          const progress = Math.round((assembly.bytes_received / assembly.bytes_expected) * 100);
          this.updateProgress(fileId, { 
            status: 'processing', 
            progress,
            message: `Converting M4A to MP3: ${progress}%`
          });
        }
      });

      if (assembly.ok) {
        const result = assembly.results.optimize[0];
        this.updateProgress(fileId, { 
          status: 'completed', 
          progress: 100,
          message: 'M4A to MP3 conversion completed'
        });

        // Cache the result
        const cacheKey = `m4a_conversion_${file.name}_${file.size}`;
        this.setCachedData(cacheKey, result);

        return {
          success: true,
          originalFile: file,
          convertedUrl: result.url,
          ssl_url: result.ssl_url,
          size: result.size,
          metadata: result.meta
        };
      } else {
        throw new Error('Conversion failed');
      }
      */
      
      // Fallback implementation for deployment
      throw new Error('Conversion service disabled for deployment');
    } catch (error) {
      console.error('M4A to MP3 conversion failed:', error);
      this.updateProgress(fileId, { 
        status: 'error', 
        progress: 0,
        message: `Conversion failed: ${error.message}`
      });
      
      // Fallback to original file
      return this.createFallbackResult(file, error);
    }
  }

  // Convert WAV to MP3 using Transloadit
  async convertWAVToMP3(file, progressCallback = null) {
    const fileId = `${file.name}_${Date.now()}`;
    try {
      if (progressCallback) {
        this.registerProgressCallback(fileId, progressCallback);
      }

      this.updateProgress(fileId, { status: 'starting', progress: 0 });

      /* Disabled for deployment
      const assembly = await this.transloaditClient.createAssembly({
        params: this.conversionTemplates.wavToMp3,
        files: { input: file },
        waitForCompletion: true,
        progressCallback: (assembly) => {
          const progress = Math.round((assembly.bytes_received / assembly.bytes_expected) * 100);
          this.updateProgress(fileId, { 
            status: 'processing', 
            progress,
            message: `Converting WAV to MP3: ${progress}%`
          });
        }
      });

      if (assembly.ok) {
        const result = assembly.results.optimize[0];
        this.updateProgress(fileId, { 
          status: 'completed', 
          progress: 100,
          message: 'WAV to MP3 conversion completed'
        });

        // Cache the result
        const cacheKey = `wav_conversion_${file.name}_${file.size}`;
        this.setCachedData(cacheKey, result);

        return {
          success: true,
          originalFile: file,
          convertedUrl: result.url,
          ssl_url: result.ssl_url,
          size: result.size,
          metadata: result.meta
        };
      } else {
        throw new Error('Conversion failed');
      }
      */
      
      // Fallback implementation for deployment
      throw new Error('Conversion service disabled for deployment');
    } catch (error) {
      console.error('WAV to MP3 conversion failed:', error);
      this.updateProgress(fileId, { 
        status: 'error', 
        progress: 0,
        message: `Conversion failed: ${error.message}`
      });
      
      // Fallback to original file
      return this.createFallbackResult(file, error);
    }
  }

  // Generate waveform using Transloadit
  async generateWaveform(file, progressCallback = null) {
    const fileId = `waveform_${file.name}_${Date.now()}`;
    try {
      const cacheKey = `waveform_${file.name}_${file.size}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      if (progressCallback) {
        this.registerProgressCallback(fileId, progressCallback);
      }

      this.updateProgress(fileId, { status: 'starting', progress: 0 });

      /* Disabled for deployment
      const assembly = await this.transloaditClient.createAssembly({
        params: this.conversionTemplates.waveformGeneration,
        files: { input: file },
        waitForCompletion: true,
        progressCallback: (assembly) => {
          const progress = Math.round((assembly.bytes_received / assembly.bytes_expected) * 100);
          this.updateProgress(fileId, { 
            status: 'processing', 
            progress,
            message: `Generating waveform: ${progress}%`
          });
        }
      });

      if (assembly.ok) {
        const result = assembly.results.waveform[0];
        this.updateProgress(fileId, { 
          status: 'completed', 
          progress: 100,
          message: 'Waveform generation completed'
        });

        const waveformData = {
          success: true,
          originalFile: file,
          waveformUrl: result.url,
          ssl_url: result.ssl_url,
          dimensions: {
            width: result.meta.width,
            height: result.meta.height
          }
        };

        this.setCachedData(cacheKey, waveformData);
        return waveformData;
      } else {
        throw new Error('Waveform generation failed');
      }
      */
      
      // Fallback implementation for deployment
      throw new Error('Waveform generation service disabled for deployment');
    } catch (error) {
      console.error('Waveform generation failed:', error);
      this.updateProgress(fileId, { 
        status: 'error', 
        progress: 0,
        message: `Waveform generation failed: ${error.message}`
      });
      
      return {
        success: false,
        error: error.message,
        originalFile: file
      };
    }
  }

  // Generate audio thumbnail
  async generateThumbnail(file, progressCallback = null) {
    const fileId = `thumbnail_${file.name}_${Date.now()}`;
    try {
      const cacheKey = `thumbnail_${file.name}_${file.size}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // First generate waveform, then create thumbnail
      const waveform = await this.generateWaveform(file, progressCallback);
      if (!waveform.success) {
        throw new Error('Failed to generate waveform for thumbnail');
      }

      if (progressCallback) {
        this.registerProgressCallback(fileId, progressCallback);
      }

      /* Disabled for deployment
      // Create a template that uses the waveform to generate thumbnail
      const thumbnailTemplate = {
        steps: {
          import_waveform: {
            robot: '/http/import',
            url: waveform.ssl_url || waveform.waveformUrl
          },
          thumbnail: {
            robot: '/image/resize',
            use: 'import_waveform',
            width: 200,
            height: 50,
            resize_strategy: 'fit',
            background: '#f3f4f6'
          }
        }
      };

      const assembly = await this.transloaditClient.createAssembly({
        params: thumbnailTemplate,
        waitForCompletion: true
      });

      if (assembly.ok) {
        const result = assembly.results.thumbnail[0];
        
        const thumbnailData = {
          success: true,
          originalFile: file,
          thumbnailUrl: result.url,
          ssl_url: result.ssl_url,
          dimensions: {
            width: result.meta.width,
            height: result.meta.height
          }
        };

        this.setCachedData(cacheKey, thumbnailData);
        return thumbnailData;
      } else {
        throw new Error('Thumbnail generation failed');
      }
      */
      
      // Fallback implementation for deployment
      throw new Error('Thumbnail generation service disabled for deployment');
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return {
        success: false,
        error: error.message,
        originalFile: file
      };
    }
  }

  // Process audio file comprehensively
  async processAudioFile(file, options = {}) {
    const fileId = `process_${file.name}_${Date.now()}`;
    try {
      const progressCallback = options.progressCallback;
      
      if (progressCallback) {
        this.registerProgressCallback(fileId, progressCallback);
      }

      this.updateProgress(fileId, { 
        status: 'starting', 
        progress: 0,
        message: 'Starting audio processing...'
      });

      const results = {
        originalFile: file,
        metadata: null,
        conversion: null,
        waveform: null,
        thumbnail: null,
        processed: true,
        timestamp: new Date().toISOString()
      };

      // Extract metadata
      this.updateProgress(fileId, { 
        status: 'processing', 
        progress: 10,
        message: 'Extracting metadata...'
      });
      results.metadata = await this.extractMetadata(file);

      // Determine if conversion is needed
      const fileType = file.type.toLowerCase();
      const needsConversion = fileType.includes('m4a') || fileType.includes('wav') || fileType.includes('x-m4a');

      if (needsConversion) {
        this.updateProgress(fileId, { 
          status: 'processing', 
          progress: 25,
          message: 'Converting audio format...'
        });

        if (fileType.includes('m4a') || fileType.includes('x-m4a')) {
          results.conversion = await this.convertM4AToMP3(file);
        } else if (fileType.includes('wav')) {
          results.conversion = await this.convertWAVToMP3(file);
        }
      }

      // Generate waveform
      this.updateProgress(fileId, { 
        status: 'processing', 
        progress: 60,
        message: 'Generating waveform...'
      });
      results.waveform = await this.generateWaveform(file);

      // Generate thumbnail
      this.updateProgress(fileId, { 
        status: 'processing', 
        progress: 80,
        message: 'Creating thumbnail...'
      });
      results.thumbnail = await this.generateThumbnail(file);

      this.updateProgress(fileId, { 
        status: 'completed', 
        progress: 100,
        message: 'Audio processing completed successfully'
      });

      // Cache the complete result
      const cacheKey = `complete_processing_${file.name}_${file.size}`;
      this.setCachedData(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Audio processing failed:', error);
      this.updateProgress(fileId, { 
        status: 'error', 
        progress: 0,
        message: `Processing failed: ${error.message}`
      });
      
      return this.createFallbackResult(file, error);
    }
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

  // Validate audio file
  isValidAudioFile(file) {
    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
      'audio/webm'
    ];
    
    return validTypes.includes(file.type.toLowerCase()) || 
           file.name.toLowerCase().match(/\.(mp3|wav|m4a|aac|ogg|webm)$/);
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
}

// Create singleton instance
const audioProcessingService = new AudioProcessingService();

export default audioProcessingService;