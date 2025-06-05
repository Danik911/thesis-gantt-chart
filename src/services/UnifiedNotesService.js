/**
 * UnifiedNotesService - Single source of truth for all notes (standalone and file-associated)
 * Extends the existing NotesService to handle both text notes and file-specific notes
 */

class UnifiedNotesService {
  constructor() {
    this.dbName = 'thesis-unified-notes';
    this.dbVersion = 3;
    this.notesStoreName = 'unified_notes';
    this.tagsStoreName = 'tags';
    this.foldersStoreName = 'folders';
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database with unified notes structure
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
        
        // Create unified notes store
        if (!db.objectStoreNames.contains(this.notesStoreName)) {
          const notesStore = db.createObjectStore(this.notesStoreName, { keyPath: 'id' });
          notesStore.createIndex('type', 'type', { unique: false }); // 'standalone' or 'file-associated'
          notesStore.createIndex('fileId', 'fileId', { unique: false });
          notesStore.createIndex('fileName', 'fileName', { unique: false });
          notesStore.createIndex('folder', 'folder', { unique: false });
          notesStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create tags store
        if (!db.objectStoreNames.contains(this.tagsStoreName)) {
          const tagsStore = db.createObjectStore(this.tagsStoreName, { keyPath: 'id' });
          tagsStore.createIndex('name', 'name', { unique: true });
        }

        // Create folders store
        if (!db.objectStoreNames.contains(this.foldersStoreName)) {
          const foldersStore = db.createObjectStore(this.foldersStoreName, { keyPath: 'id' });
          foldersStore.createIndex('name', 'name', { unique: true });
        }
      };
    });
  }

  /**
   * Generate a unique ID
   */
  generateId(prefix = 'note') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Migrate existing localStorage notes to IndexedDB
   */
  async migrateLocalStorageNotes() {
    try {
      const existingNotes = localStorage.getItem('textNotes');
      const existingTags = localStorage.getItem('noteTags');
      const existingFolders = localStorage.getItem('noteFolders');

      if (existingNotes) {
        const notes = JSON.parse(existingNotes);
        for (const note of notes) {
          await this.createNote({
            ...note,
            type: 'standalone',
            noteType: 'text', // text, pdf-note
            fileId: null,
            fileName: null
          });
        }
        console.log(`Migrated ${notes.length} notes from localStorage`);
      }

      if (existingTags) {
        const tags = JSON.parse(existingTags);
        for (const tag of tags) {
          await this.createTag(tag);
        }
      }

      if (existingFolders) {
        const folders = JSON.parse(existingFolders);
        for (const folder of folders) {
          await this.createFolder(folder);
        }
      }
    } catch (error) {
      console.error('Error migrating localStorage notes:', error);
    }
  }

  /**
   * Create a new note (standalone or file-associated)
   * @param {Object} noteData - Note content and metadata
   * @returns {Promise<Object>} - The created note
   */
  async createNote(noteData) {
    await this.initDB();

    const noteId = noteData.id || this.generateId();
    const now = new Date().toISOString();

    const note = {
      id: noteId,
      type: noteData.type || 'standalone', // 'standalone' or 'file-associated'
      noteType: noteData.noteType || 'text', // 'text', 'pdf-note', 'audio-note'
      
      // Basic note content
      title: noteData.title || '',
      content: noteData.content || '',
      htmlContent: noteData.htmlContent || '',
      markdownContent: noteData.markdownContent || '',
      
      // Organization
      folder: noteData.folder || 'General',
      tags: noteData.tags || [],
      
      // File association (null for standalone notes)
      fileId: noteData.fileId || null,
      fileName: noteData.fileName || null,
      fileType: noteData.fileType || null, // 'pdf', 'audio', etc.
      
      // PDF-specific fields
      pageNumber: noteData.pageNumber || null,
      position: noteData.position || null,
      color: noteData.color || '#fbbf24',
      
      // Rich text fields
      characterCount: noteData.characterCount || 0,
      wordCount: noteData.wordCount || 0,
      
      // Timestamps
      createdAt: noteData.createdAt || now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.notesStoreName], 'readwrite');
      const store = transaction.objectStore(this.notesStoreName);
      const request = store.put(note); // Use put instead of add to allow updates

      request.onsuccess = () => resolve(note);
      request.onerror = () => reject(new Error('Failed to create note'));
    });
  }

  /**
   * Get all notes with optional filtering
   * @param {Object} filters - Filtering options
   * @returns {Promise<Array>} - Array of notes
   */
  async getNotes(filters = {}) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.notesStoreName], 'readonly');
      const store = transaction.objectStore(this.notesStoreName);
      const request = store.getAll();

      request.onsuccess = () => {
        let notes = request.result;
        
        // Apply filters
        if (filters.type) {
          notes = notes.filter(note => note.type === filters.type);
        }
        
        if (filters.fileId) {
          notes = notes.filter(note => note.fileId === filters.fileId);
        }
        
        if (filters.folder) {
          notes = notes.filter(note => note.folder === filters.folder);
        }
        
        if (filters.tags && filters.tags.length > 0) {
          notes = notes.filter(note => 
            filters.tags.every(tag => note.tags && note.tags.includes(tag))
          );
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          notes = notes.filter(note => 
            note.title.toLowerCase().includes(searchLower) ||
            note.content.toLowerCase().includes(searchLower) ||
            (note.htmlContent && note.htmlContent.toLowerCase().includes(searchLower))
          );
        }

        // Sort by updatedAt (most recent first)
        notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        resolve(notes);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a specific note by ID
   * @param {string} noteId - The note ID
   * @returns {Promise<Object>} - The note
   */
  async getNote(noteId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.notesStoreName], 'readonly');
      const store = transaction.objectStore(this.notesStoreName);
      const request = store.get(noteId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update an existing note
   * @param {string} noteId - The note ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - The updated note
   */
  async updateNote(noteId, updates) {
    const note = await this.getNote(noteId);
    if (!note) {
      throw new Error('Note not found');
    }

    const updatedNote = {
      ...note,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.createNote(updatedNote);
  }

  /**
   * Delete a note
   * @param {string} noteId - The note ID
   * @returns {Promise<void>}
   */
  async deleteNote(noteId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.notesStoreName], 'readwrite');
      const store = transaction.objectStore(this.notesStoreName);
      const request = store.delete(noteId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all standalone text notes (for TextNotes component)
   */
  async getStandaloneNotes() {
    return this.getNotes({ type: 'standalone' });
  }

  /**
   * Get notes associated with a file (for PDF/Audio components)
   */
  async getNotesForFile(fileId) {
    return this.getNotes({ type: 'file-associated', fileId });
  }

  /**
   * Associate an existing standalone note with a file
   */
  async associateNoteWithFile(noteId, fileId, fileName, fileType) {
    return this.updateNote(noteId, {
      type: 'file-associated',
      fileId,
      fileName,
      fileType
    });
  }

  /**
   * Unassociate a note from a file (make it standalone)
   */
  async unassociateNoteFromFile(noteId) {
    return this.updateNote(noteId, {
      type: 'standalone',
      fileId: null,
      fileName: null,
      fileType: null
    });
  }

  /**
   * Tag management
   */
  async getTags() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tagsStoreName], 'readonly');
      const store = transaction.objectStore(this.tagsStoreName);
      const request = store.getAll();

      request.onsuccess = () => {
        const tags = request.result.map(tag => tag.name).sort();
        resolve(tags);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createTag(tagName) {
    await this.initDB();

    const tagId = this.generateId('tag');
    const tag = {
      id: tagId,
      name: tagName.trim(),
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tagsStoreName], 'readwrite');
      const store = transaction.objectStore(this.tagsStoreName);
      const request = store.put(tag);

      request.onsuccess = () => resolve(tag);
      request.onerror = () => reject(new Error('Failed to create tag'));
    });
  }

  async deleteTag(tagName) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.tagsStoreName], 'readwrite');
      const store = transaction.objectStore(this.tagsStoreName);
      const index = store.index('name');
      const request = index.get(tagName);

      request.onsuccess = () => {
        if (request.result) {
          const deleteRequest = store.delete(request.result.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(new Error('Failed to delete tag'));
        } else {
          resolve(); // Tag doesn't exist
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Folder management
   */
  async getFolders() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.foldersStoreName], 'readonly');
      const store = transaction.objectStore(this.foldersStoreName);
      const request = store.getAll();

      request.onsuccess = () => {
        const folders = request.result.map(folder => folder.name).sort();
        // Always ensure default folders exist
        const defaultFolders = ['General', 'Research', 'Ideas', 'Tasks'];
        const allFolders = [...new Set([...defaultFolders, ...folders])];
        resolve(allFolders);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createFolder(folderName) {
    await this.initDB();

    const folderId = this.generateId('folder');
    const folder = {
      id: folderId,
      name: folderName.trim(),
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.foldersStoreName], 'readwrite');
      const store = transaction.objectStore(this.foldersStoreName);
      const request = store.put(folder);

      request.onsuccess = () => resolve(folder);
      request.onerror = () => reject(new Error('Failed to create folder'));
    });
  }

  /**
   * Export notes for backup
   */
  async exportNotes(filters = {}) {
    const notes = await this.getNotes(filters);
    const tags = await this.getTags();
    const folders = await this.getFolders();

    return {
      notes,
      tags,
      folders,
      exportDate: new Date().toISOString(),
      version: this.dbVersion
    };
  }

  /**
   * Clear all data and migrate from localStorage on first use
   */
  async initialize() {
    await this.initDB();
    
    // Check if we need to migrate from localStorage
    const existingNotes = await this.getNotes();
    if (existingNotes.length === 0) {
      await this.migrateLocalStorageNotes();
    }

    // Initialize default folders if none exist
    const folders = await this.getFolders();
    if (folders.length === 0) {
      const defaultFolders = ['General', 'Research', 'Ideas', 'Tasks'];
      for (const folder of defaultFolders) {
        await this.createFolder(folder);
      }
    }
  }
}

// Create and export singleton instance
const unifiedNotesService = new UnifiedNotesService();
export default unifiedNotesService;