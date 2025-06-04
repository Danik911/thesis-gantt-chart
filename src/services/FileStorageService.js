/**
 * FileStorageService - Client-side file storage using IndexedDB
 * This service provides file storage capabilities for applications deployed 
 * on static hosting platforms like GitHub Pages where server endpoints are not available.
 */

class FileStorageService {
  constructor() {
    this.dbName = 'thesis-file-storage';
    this.dbVersion = 1;
    this.storeName = 'files';
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   */
  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for files
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('uploadDate', 'uploadDate', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a unique ID for files
   */
  generateFileId() {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store a file in IndexedDB with metadata
   * @param {File} file - The file to store
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Upload result
   */
  async storeFile(file, metadata = {}) {
    try {
      await this.initDB();

      const fileId = this.generateFileId();
      const uploadDate = new Date().toISOString();

      // Convert file to ArrayBuffer for storage
      const arrayBuffer = await file.arrayBuffer();

      const fileData = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: arrayBuffer,
        uploadDate: uploadDate,
        metadata: metadata
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(fileData);

        request.onsuccess = () => {
          // Update localStorage statistics
          this.updateUploadStats('success');
          
          // Add to recent activity
          this.addToRecentActivity({
            id: fileId,
            name: file.name,
            status: 'success',
            date: uploadDate,
            size: file.size
          });

          resolve({
            status: 200,
            body: {
              success: true,
              fileId: fileId,
              message: 'File uploaded successfully',
              file: {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadDate: uploadDate
              }
            }
          });
        };

        request.onerror = () => {
          this.updateUploadStats('error');
          this.addToRecentActivity({
            id: fileId,
            name: file.name,
            status: 'error',
            date: uploadDate,
            error: 'Storage error'
          });
          reject(new Error('Failed to store file'));
        };
      });
    } catch (error) {
      this.updateUploadStats('error');
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a file from storage
   * @param {string} fileId - The file ID
   * @returns {Promise<Object>} - File data
   */
  async getFile(fileId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error('File not found'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all stored files
   * @returns {Promise<Array>} - Array of file metadata
   */
  async listFiles() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Return only metadata, not the actual file data
        const files = request.result.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadDate: file.uploadDate,
          metadata: file.metadata
        }));
        resolve(files);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a file from storage
   * @param {string} fileId - The file ID to delete
   */
  async deleteFile(fileId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Download a file from storage by triggering browser download
   * @param {string} fileId - The file ID to download
   * @returns {Promise<void>} - Download promise
   */
  async downloadFile(fileId) {
    try {
      const fileData = await this.getFile(fileId);
      
      // Create a Blob from the stored ArrayBuffer
      const blob = new Blob([fileData.data], { type: fileData.type });
      
      // Create a temporary URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.name;
      link.style.display = 'none';
      
      // Add to DOM, click, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the temporary URL
      URL.revokeObjectURL(url);
      
      return Promise.resolve();
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Get file URL for preview purposes
   * @param {string} fileId - The file ID
   * @returns {Promise<string>} - Blob URL for the file
   */
  async getFileUrl(fileId) {
    try {
      const fileData = await this.getFile(fileId);
      const blob = new Blob([fileData.data], { type: fileData.type });
      return URL.createObjectURL(blob);
    } catch (error) {
      throw new Error(`Failed to create file URL: ${error.message}`);
    }
  }

  /**
   * Update upload statistics in localStorage
   * @param {string} type - 'success' or 'error'
   */
  updateUploadStats(type) {
    const stats = this.getUploadStats();
    
    if (type === 'success') {
      stats.successful++;
    } else {
      stats.failed++;
    }
    stats.total++;

    localStorage.setItem('thesis-upload-stats', JSON.stringify(stats));
  }

  /**
   * Get upload statistics from localStorage
   * @returns {Object} - Upload statistics
   */
  getUploadStats() {
    const stored = localStorage.getItem('thesis-upload-stats');
    return stored ? JSON.parse(stored) : { successful: 0, failed: 0, total: 0 };
  }

  /**
   * Add entry to recent activity
   * @param {Object} activity - Activity entry
   */
  addToRecentActivity(activity) {
    const maxEntries = 10;
    const stored = localStorage.getItem('thesis-recent-activity');
    let activities = stored ? JSON.parse(stored) : [];
    
    activities.unshift(activity);
    activities = activities.slice(0, maxEntries); // Keep only recent entries
    
    localStorage.setItem('thesis-recent-activity', JSON.stringify(activities));
  }

  /**
   * Get recent activity from localStorage
   * @returns {Array} - Recent activities
   */
  getRecentActivity() {
    const stored = localStorage.getItem('thesis-recent-activity');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Clear all upload statistics and activity
   */
  clearHistory() {
    localStorage.removeItem('thesis-upload-stats');
    localStorage.removeItem('thesis-recent-activity');
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} - Storage usage details
   */
  async getStorageInfo() {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        usedMB: Math.round((estimate.usage || 0) / (1024 * 1024)),
        quotaMB: Math.round((estimate.quota || 0) / (1024 * 1024))
      };
    } catch (error) {
      return {
        used: 0,
        quota: 0,
        usedMB: 0,
        quotaMB: 0,
        error: error.message
      };
    }
  }

  /**
   * Simulate upload progress for better UX
   * @param {File} file - File being uploaded
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Upload simulation promise
   */
  async simulateUpload(file, onProgress) {
    const totalSteps = 20;
    const stepDelay = 50; // ms

    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDelay));
      const progress = {
        bytesUploaded: Math.round((file.size * i) / totalSteps),
        bytesTotal: file.size,
        percentage: Math.round((i / totalSteps) * 100)
      };
      onProgress(progress);
    }
  }
}

// Export a singleton instance
const fileStorageService = new FileStorageService();
export default fileStorageService; 