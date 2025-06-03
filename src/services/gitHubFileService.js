import authService from './authService.js';

class GitHubFileService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.rateLimitRemaining = 5000; // GitHub API rate limit
    this.rateLimitReset = Date.now();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.maxCacheSize = 100;
    this.cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
    
    // Configuration for default repository structure
    this.defaultStructure = {
      documents: 'documents',
      tasks: 'tasks',
      projects: 'projects',
      templates: 'templates',
      uploads: 'uploads'
    };
  }

  // Get authenticated Octokit instance from authService
  async getOctokit() {
    const octokit = authService.getOctokit();
    if (!octokit) {
      throw new Error('Not authenticated. Please login first.');
    }
    return octokit;
  }

  // Rate limiting and throttling
  async handleRateLimit() {
    const now = Date.now();
    
    // Check if we need to wait for rate limit reset
    if (this.rateLimitRemaining <= 10 && now < this.rateLimitReset) {
      const waitTime = this.rateLimitReset - now;
      console.warn(`Rate limit approaching. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Update rate limit info from response headers
  updateRateLimit(headers) {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitRemaining = parseInt(headers['x-ratelimit-remaining']);
    }
    if (headers['x-ratelimit-reset']) {
      this.rateLimitReset = parseInt(headers['x-ratelimit-reset']) * 1000;
    }
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

  // Create folder structure in repository
  async createFolderStructure(owner, repo, basePath = '') {
    try {
      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      const folders = Object.values(this.defaultStructure);
      const createdFolders = [];

      for (const folder of folders) {
        const folderPath = basePath ? `${basePath}/${folder}` : folder;
        const readmePath = `${folderPath}/README.md`;
        
        try {
          // Check if folder already exists by trying to get README
          await octokit.rest.repos.getContent({
            owner,
            repo,
            path: readmePath
          });
        } catch (error) {
          if (error.status === 404) {
            // Folder doesn't exist, create it with a README
            const readmeContent = `# ${folder.charAt(0).toUpperCase() + folder.slice(1)}\n\nThis folder contains ${folder} for the project.`;
            
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: readmePath,
              message: `Create ${folder} folder`,
              content: Buffer.from(readmeContent).toString('base64')
            });
            
            createdFolders.push(folderPath);
          } else {
            throw error;
          }
        }
      }

      return {
        success: true,
        createdFolders,
        structure: this.defaultStructure
      };
    } catch (error) {
      console.error('Failed to create folder structure:', error);
      throw new Error(`Failed to create folder structure: ${error.message}`);
    }
  }

  // Upload file to GitHub repository
  async uploadFile(owner, repo, path, content, message, branch = 'main') {
    try {
      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      // Convert content to base64 if it's not already
      let base64Content;
      if (typeof content === 'string') {
        base64Content = Buffer.from(content).toString('base64');
      } else if (content instanceof ArrayBuffer) {
        base64Content = Buffer.from(content).toString('base64');
      } else if (content instanceof Blob) {
        const arrayBuffer = await content.arrayBuffer();
        base64Content = Buffer.from(arrayBuffer).toString('base64');
      } else {
        throw new Error('Unsupported content type');
      }

      // Check if file already exists to get SHA for updates
      let sha = null;
      try {
        const existingFile = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: branch
        });
        
        if (existingFile.data.sha) {
          sha = existingFile.data.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine for new uploads
        if (error.status !== 404) {
          throw error;
        }
      }

      const requestData = {
        owner,
        repo,
        path,
        message: message || `Upload ${path}`,
        content: base64Content,
        branch
      };

      if (sha) {
        requestData.sha = sha;
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents(requestData);
      
      // Update rate limit info
      this.updateRateLimit(response.headers);

      // Clear cache for this file
      const cacheKey = `${owner}/${repo}/${path}`;
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);

      // Generate accessible link
      const fileLink = this.generateFileLink(owner, repo, path, branch);

      return {
        success: true,
        sha: response.data.content.sha,
        url: response.data.content.html_url,
        downloadUrl: response.data.content.download_url,
        accessibleLink: fileLink,
        commit: response.data.commit
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Update existing file
  async updateFile(owner, repo, path, content, message, branch = 'main') {
    try {
      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      // Get current file to get SHA
      const existingFile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      if (!existingFile.data.sha) {
        throw new Error('File not found or unable to get file SHA');
      }

      // Convert content to base64
      let base64Content;
      if (typeof content === 'string') {
        base64Content = Buffer.from(content).toString('base64');
      } else if (content instanceof ArrayBuffer) {
        base64Content = Buffer.from(content).toString('base64');
      } else if (content instanceof Blob) {
        const arrayBuffer = await content.arrayBuffer();
        base64Content = Buffer.from(arrayBuffer).toString('base64');
      } else {
        throw new Error('Unsupported content type');
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: message || `Update ${path}`,
        content: base64Content,
        sha: existingFile.data.sha,
        branch
      });

      // Update rate limit info
      this.updateRateLimit(response.headers);

      // Clear cache for this file
      const cacheKey = `${owner}/${repo}/${path}`;
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);

      return {
        success: true,
        sha: response.data.content.sha,
        url: response.data.content.html_url,
        downloadUrl: response.data.content.download_url,
        commit: response.data.commit
      };
    } catch (error) {
      console.error('File update failed:', error);
      throw new Error(`File update failed: ${error.message}`);
    }
  }

  // Delete file from repository
  async deleteFile(owner, repo, path, message, branch = 'main') {
    try {
      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      // Get current file to get SHA
      const existingFile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      if (!existingFile.data.sha) {
        throw new Error('File not found or unable to get file SHA');
      }

      const response = await octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message: message || `Delete ${path}`,
        sha: existingFile.data.sha,
        branch
      });

      // Update rate limit info
      this.updateRateLimit(response.headers);

      // Clear cache for this file
      const cacheKey = `${owner}/${repo}/${path}`;
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);

      return {
        success: true,
        commit: response.data.commit
      };
    } catch (error) {
      console.error('File deletion failed:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  // Get file content with caching
  async getFileContent(owner, repo, path, branch = 'main') {
    try {
      const cacheKey = `${owner}/${repo}/${path}`;
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      // Update rate limit info
      this.updateRateLimit(response.headers);

      const fileData = {
        content: Buffer.from(response.data.content, 'base64').toString(),
        sha: response.data.sha,
        size: response.data.size,
        url: response.data.html_url,
        downloadUrl: response.data.download_url,
        type: response.data.type,
        encoding: response.data.encoding
      };

      // Cache the result
      this.setCachedData(cacheKey, fileData);

      return fileData;
    } catch (error) {
      console.error('Failed to get file content:', error);
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  // List files in a directory
  async listFiles(owner, repo, path = '', branch = 'main') {
    try {
      const cacheKey = `${owner}/${repo}/list/${path}`;
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      // Update rate limit info
      this.updateRateLimit(response.headers);

      const files = Array.isArray(response.data) 
        ? response.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            url: item.html_url,
            downloadUrl: item.download_url
          }))
        : [{
            name: response.data.name,
            path: response.data.path,
            type: response.data.type,
            size: response.data.size,
            sha: response.data.sha,
            url: response.data.html_url,
            downloadUrl: response.data.download_url
          }];

      // Cache the result
      this.setCachedData(cacheKey, files);

      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Generate accessible file links
  generateFileLink(owner, repo, path, branch = 'main') {
    return {
      raw: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      blob: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
      download: `https://github.com/${owner}/${repo}/raw/${branch}/${path}`
    };
  }

  // Conflict resolution for simultaneous edits
  async resolveConflict(owner, repo, path, localContent, message, branch = 'main') {
    try {
      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      // Get the latest version from the repository
      const latestFile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      const latestContent = Buffer.from(latestFile.data.content, 'base64').toString();

      // Simple conflict resolution strategy: create a backup of the current version
      // and then update with new content
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupPath = `${path}.backup.${timestamp}`;

      // Create backup of the latest version
      await this.uploadFile(
        owner,
        repo,
        backupPath,
        latestContent,
        `Backup before conflict resolution for ${path}`,
        branch
      );

      // Update with new content
      const updateResult = await this.updateFile(
        owner,
        repo,
        path,
        localContent,
        message || `Resolve conflict in ${path}`,
        branch
      );

      return {
        success: true,
        resolution: 'backup_and_update',
        backupPath,
        updateResult,
        conflictInfo: {
          latestSha: latestFile.data.sha,
          backupCreated: true
        }
      };
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      throw new Error(`Conflict resolution failed: ${error.message}`);
    }
  }

  // Batch operations with queue processing
  async processBatchOperations(operations) {
    const results = [];
    
    for (const operation of operations) {
      try {
        let result;
        
        switch (operation.type) {
          case 'upload':
            result = await this.uploadFile(
              operation.owner,
              operation.repo,
              operation.path,
              operation.content,
              operation.message,
              operation.branch
            );
            break;
          case 'update':
            result = await this.updateFile(
              operation.owner,
              operation.repo,
              operation.path,
              operation.content,
              operation.message,
              operation.branch
            );
            break;
          case 'delete':
            result = await this.deleteFile(
              operation.owner,
              operation.repo,
              operation.path,
              operation.message,
              operation.branch
            );
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }
        
        results.push({
          operation,
          result,
          success: true
        });
      } catch (error) {
        results.push({
          operation,
          error: error.message,
          success: false
        });
      }
    }
    
    return results;
  }

  // Get repository information
  async getRepositoryInfo(owner, repo) {
    try {
      await this.handleRateLimit();
      const octokit = await this.getOctokit();

      const response = await octokit.rest.repos.get({
        owner,
        repo
      });

      // Update rate limit info
      this.updateRateLimit(response.headers);

      return {
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        defaultBranch: response.data.default_branch,
        permissions: response.data.permissions,
        size: response.data.size,
        language: response.data.language,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
    } catch (error) {
      console.error('Failed to get repository info:', error);
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }

  // Get rate limit status
  getRateLimitStatus() {
    return {
      remaining: this.rateLimitRemaining,
      reset: new Date(this.rateLimitReset),
      resetIn: Math.max(0, this.rateLimitReset - Date.now())
    };
  }

  // Get cache status
  getCacheStatus() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const gitHubFileService = new GitHubFileService();

export default gitHubFileService; 