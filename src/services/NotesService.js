/**
 * @deprecated This service is deprecated and will be removed in a future version. 
 * Please use firestoreService for all note-related operations.
 * 
 * NotesService - Client-side notes storage for PDF files using IndexedDB
 * This service provides notes and annotation capabilities for PDF files
 */

class NotesService {
  constructor() {
    this.dbName = 'thesis-file-storage';
    this.dbVersion = 3; // Increment version to add notes store
    this.storeName = 'notes';
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database with notes store
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
        
        // Create files store if it doesn't exist (from FileStorageService)
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('name', 'name', { unique: false });
          filesStore.createIndex('type', 'type', { unique: false });
          filesStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        }

        // Create notes store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const notesStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          notesStore.createIndex('fileId', 'fileId', { unique: false });
          notesStore.createIndex('type', 'type', { unique: false });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a unique ID for notes
   */
  generateNoteId() {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a note to a PDF file
   * @param {string} fileId - The PDF file ID
   * @param {Object} noteData - Note content and metadata
   * @returns {Promise<Object>} - The created note
   */
  async addNote(fileId, noteData) {
    try {
      await this.initDB();

      const noteId = this.generateNoteId();
      const now = new Date().toISOString();

      const note = {
        id: noteId,
        fileId: fileId,
        type: noteData.type || 'general', // 'abstract', 'thoughts', 'citation', 'general'
        title: noteData.title || '',
        content: noteData.content || '',
        tags: noteData.tags || [],
        color: noteData.color || '#fbbf24', // Default yellow
        position: noteData.position || null, // For PDF coordinate annotations
        pageNumber: noteData.pageNumber || null,
        createdAt: now,
        updatedAt: now
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(note);

        request.onsuccess = () => resolve(note);
        request.onerror = () => reject(new Error('Failed to add note'));
      });
    } catch (error) {
      throw new Error(`Failed to add note: ${error.message}`);
    }
  }

  /**
   * Get all notes for a specific PDF file
   * @param {string} fileId - The PDF file ID
   * @returns {Promise<Array>} - Array of notes
   */
  async getNotesForFile(fileId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('fileId');
      const request = index.getAll(fileId);

      request.onsuccess = () => {
        const notes = request.result.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        resolve(notes);
      };

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
    try {
      await this.initDB();

      const note = await this.getNote(noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      const updatedNote = {
        ...note,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(updatedNote);

        request.onsuccess = () => resolve(updatedNote);
        request.onerror = () => reject(new Error('Failed to update note'));
      });
    } catch (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }
  }

  /**
   * Get a specific note by ID
   * @param {string} noteId - The note ID
   * @returns {Promise<Object>} - The note
   */
  async getNote(noteId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(noteId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a note
   * @param {string} noteId - The note ID
   * @returns {Promise<void>}
   */
  async deleteNote(noteId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(noteId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all notes for a specific file
   * @param {string} fileId - The PDF file ID
   * @returns {Promise<void>}
   */
  async deleteNotesForFile(fileId) {
    try {
      const notes = await this.getNotesForFile(fileId);
      const deletePromises = notes.map(note => this.deleteNote(note.id));
      await Promise.all(deletePromises);
    } catch (error) {
      throw new Error(`Failed to delete notes for file: ${error.message}`);
    }
  }

  /**
   * Search notes across all files
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of matching notes with file info
   */
  async searchNotes(query, options = {}) {
    await this.initDB();

    const searchQuery = query.toLowerCase();
    const { type, tags } = options;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let notes = request.result;

        // Filter by search query
        if (searchQuery) {
          notes = notes.filter(note => 
            note.title.toLowerCase().includes(searchQuery) ||
            note.content.toLowerCase().includes(searchQuery) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchQuery))
          );
        }

        // Filter by type
        if (type) {
          notes = notes.filter(note => note.type === type);
        }

        // Filter by tags
        if (tags && tags.length > 0) {
          notes = notes.filter(note => 
            tags.some(tag => note.tags.includes(tag))
          );
        }

        resolve(notes);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get notes statistics
   * @returns {Promise<Object>} - Notes statistics
   */
  async getNotesStats() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const notes = request.result;
        const stats = {
          totalNotes: notes.length,
          notesByType: {},
          notesByFile: {},
          recentNotes: notes
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
        };

        // Count by type
        notes.forEach(note => {
          stats.notesByType[note.type] = (stats.notesByType[note.type] || 0) + 1;
          stats.notesByFile[note.fileId] = (stats.notesByFile[note.fileId] || 0) + 1;
        });

        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export notes for a file as JSON
   * @param {string} fileId - The PDF file ID
   * @returns {Promise<Object>} - Exported notes data
   */
  async exportNotesForFile(fileId) {
    const notes = await this.getNotesForFile(fileId);
    return {
      fileId,
      exportDate: new Date().toISOString(),
      notesCount: notes.length,
      notes: notes
    };
  }

  /**
   * Import notes for a file
   * @param {string} fileId - The PDF file ID
   * @param {Array} notes - Notes to import
   * @returns {Promise<Array>} - Imported notes
   */
  async importNotesForFile(fileId, notes) {
    const importedNotes = [];
    
    for (const noteData of notes) {
      try {
        const note = await this.addNote(fileId, {
          ...noteData,
          id: undefined, // Generate new ID
          fileId: fileId, // Ensure correct file ID
          createdAt: undefined, // Generate new timestamp
          updatedAt: undefined
        });
        importedNotes.push(note);
      } catch (error) {
        console.error('Failed to import note:', error);
      }
    }

    return importedNotes;
  }
}

// Create and export a singleton instance
const notesService = new NotesService();
export default notesService;