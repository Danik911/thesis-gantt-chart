import { BasePlugin } from '@uppy/core';
import fileStorageService from '../services/FileStorageService.js';

/**
 * ClientStorageUpload - Custom Uppy plugin for client-side file storage
 * This plugin replaces the standard XHRUpload plugin to store files locally
 * when no backend server is available (e.g., on GitHub Pages)
 */
export default class ClientStorageUpload extends BasePlugin {
  static VERSION = '1.0.0';

  constructor(uppy, opts) {
    super(uppy, opts);
    this.type = 'uploader';
    this.id = this.opts.id || 'ClientStorageUpload';
    
    // Default options
    this.defaultOptions = {
      limit: 3, // Number of concurrent uploads
      timeout: 30000, // 30 seconds timeout
    };

    this.opts = { ...this.defaultOptions, ...opts };
    
    // Track upload state
    this.uploadsInProgress = new Map();
  }

  install() {
    this.uppy.addUploader(this.uploadFiles.bind(this));
  }

  uninstall() {
    this.uppy.removeUploader(this.uploadFiles.bind(this));
  }

  /**
   * Main upload function called by Uppy
   * @param {Array} fileIDs - Array of file IDs to upload
   * @returns {Promise} - Upload promise
   */
  async uploadFiles(fileIDs) {
    if (fileIDs.length === 0) {
      this.uppy.log('[ClientStorageUpload] No files to upload');
      return Promise.resolve();
    }

    this.uppy.log(`[ClientStorageUpload] Uploading ${fileIDs.length} files`);

    // Process uploads with concurrency limit
    const uploadPromises = [];
    let activeUploads = 0;

    return new Promise((resolve, reject) => {
      let completedUploads = 0;
      let hasErrors = false;
      const errors = [];

      const processNextUpload = () => {
        if (uploadPromises.length === 0 && activeUploads === 0) {
          // All uploads completed
          if (hasErrors) {
            reject(new Error(`Upload failed for some files: ${errors.join(', ')}`));
          } else {
            resolve();
          }
          return;
        }

        while (activeUploads < this.opts.limit && uploadPromises.length > 0) {
          const uploadPromise = uploadPromises.shift();
          activeUploads++;

          uploadPromise
            .then(() => {
              completedUploads++;
              activeUploads--;
              processNextUpload();
            })
            .catch((error) => {
              hasErrors = true;
              errors.push(error.message);
              activeUploads--;
              processNextUpload();
            });
        }
      };

      // Create upload promises for all files
      fileIDs.forEach(fileID => {
        uploadPromises.push(this.uploadSingleFile(fileID));
      });

      // Start processing
      processNextUpload();
    });
  }

  /**
   * Upload a single file
   * @param {string} fileID - File ID from Uppy
   * @returns {Promise} - Single file upload promise
   */
  async uploadSingleFile(fileID) {
    const file = this.uppy.getFile(fileID);
    
    if (!file) {
      throw new Error(`File with ID ${fileID} not found`);
    }

    this.uppy.log(`[ClientStorageUpload] Starting upload for ${file.name}`);

    try {
      // Emit upload-started event
      this.uppy.emit('upload-started', file);

      // Define progress handler
      const onProgress = (progress) => {
          this.uppy.emit('upload-progress', file, {
            bytesUploaded: progress.bytesUploaded,
            bytesTotal: progress.bytesTotal,
          });
      };

      // Extract metadata from file, including folder information
      const metadata = file.meta || {};
      
      // Get folder path from upload options or file metadata
      const folderPath = this.opts.folderPath || metadata.folderPath || '/General';
      metadata.folderPath = folderPath;

      // Store file using our storage service
      const result = await fileStorageService.storeFile(file.data, metadata, onProgress);

      // Emit upload-success event
      this.uppy.emit('upload-success', file, result);
      
      this.uppy.log(`[ClientStorageUpload] Successfully uploaded ${file.name}`);
      
      return result;

    } catch (error) {
      this.uppy.log(`[ClientStorageUpload] Upload failed for ${file.name}: ${error.message}`, 'error');
      
      // Emit upload-error event
      this.uppy.emit('upload-error', file, error);
      
      throw error;
    }
  }

  /**
   * Cancel upload for a specific file
   * @param {string} fileID - File ID to cancel
   */
  cancelUpload(fileID) {
    const file = this.uppy.getFile(fileID);
    if (file && this.uploadsInProgress.has(fileID)) {
      this.uploadsInProgress.delete(fileID);
      this.uppy.emit('upload-error', file, new Error('Upload cancelled'));
      this.uppy.log(`[ClientStorageUpload] Upload cancelled for ${file.name}`);
    }
  }

  /**
   * Cancel all uploads
   */
  cancelAll() {
    this.uploadsInProgress.forEach((_, fileID) => {
      this.cancelUpload(fileID);
    });
  }
} 