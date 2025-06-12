/**
 * FirebaseNotesService - Firebase Firestore implementation for text notes management
 * Implements best practices: materialized paths, real-time updates, efficient querying
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../firebase';

class FirebaseNotesService {
  constructor() {
    this.collections = {
      notes: 'notes',
      folders: 'folders', 
      tags: 'tags',
      userProfiles: 'userProfiles'
    };
    this.listeners = new Map(); // Store active listeners
  }

  /**
   * Initialize user-specific collections and default data
   */
  async initializeUser(userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      // Create user profile if it doesn't exist
      const userProfileRef = doc(db, this.collections.userProfiles, userId);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (!userProfileSnap.exists()) {
        await updateDoc(userProfileRef, {
          createdAt: serverTimestamp(),
          notesCount: 0,
          foldersCount: 0,
          tagsCount: 0,
          storageUsed: 0
        });
      }

      // Create default folders if they don't exist
      await this.createDefaultFolders(userId);
      
      return true;
    } catch (error) {
      console.error('Error initializing user:', error);
      throw error;
    }
  }

  /**
   * Create default folder structure for new users
   */
  async createDefaultFolders(userId) {
    const defaultFolders = [
      { name: 'General', path: '/General', level: 0 },
      { name: 'Research', path: '/Research', level: 0 },
      { name: 'Ideas', path: '/Ideas', level: 0 },
      { name: 'Tasks', path: '/Tasks', level: 0 }
    ];

    const batch = writeBatch(db);
    
    for (const folder of defaultFolders) {
      // Check if folder already exists
      const foldersQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        where('path', '==', folder.path)
      );
      const existingFolders = await getDocs(foldersQuery);
      
      if (existingFolders.empty) {
        const folderRef = doc(collection(db, this.collections.folders));
        batch.set(folderRef, {
          id: folderRef.id,
          name: folder.name,
          path: folder.path,
          level: folder.level,
          parentPath: null,
          ownerId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          notesCount: 0
        });
      }
    }
    
    await batch.commit();
  }

  /**
   * Create a new note
   */
  async createNote(noteData, userId) {
    if (!userId) throw new Error('User ID is required');
    
    const noteRef = doc(collection(db, this.collections.notes));
    const now = serverTimestamp();
    
    // Normalize folder path – ensure it starts with '/'
    const folderPath = (noteData.folderPath || noteData.folder || '/General').startsWith('/')
      ? (noteData.folderPath || noteData.folder || '/General')
      : `/${noteData.folderPath || noteData.folder}`;

    const note = {
      id: noteRef.id,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      htmlContent: noteData.htmlContent || '',
      markdownContent: noteData.markdownContent || '',
      folderPath,
      tags: noteData.tags || [],
      fileId: noteData.fileId || null,
      fileName: noteData.fileName || null,
      fileType: noteData.fileType || null,
      ownerId: userId,
      type: noteData.type || 'standalone',
      noteType: noteData.noteType || 'text',
      characterCount: noteData.characterCount || 0,
      wordCount: noteData.wordCount || 0,
      createdAt: now,
      updatedAt: now,
      searchableText: `${noteData.title || ''} ${this.extractPlainText(noteData.content || '')}`.toLowerCase()
    };

    try {
      // Ensure the folder exists; ignore error if it already exists
      await this.createFolder({ name: folderPath.replace(/^\//, ''), path: folderPath }, userId)
        .catch(() => {});
    } catch (_) {
      // Folder already exists or creation failed – silently continue
    }

    await setDoc(noteRef, note);

    // Update folder note count & create tags
    await this.updateFolderNotesCount(folderPath, userId, 1);
    await this.createTagsIfNotExist(note.tags, userId);

    return { ...note, id: noteRef.id };
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId, updates, userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const noteRef = doc(db, this.collections.notes, noteId);
      const noteSnap = await getDoc(noteRef);
      
      if (!noteSnap.exists()) {
        throw new Error('Note not found');
      }
      
      const currentNote = noteSnap.data();
      if (currentNote.ownerId !== userId) {
        throw new Error('Unauthorized: You can only update your own notes');
      }
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        searchableText: updates.title || updates.content ? 
          `${updates.title || currentNote.title || ''} ${this.extractPlainText(updates.content || currentNote.content || '')}`.toLowerCase() :
          currentNote.searchableText
      };
      
      await updateDoc(noteRef, updateData);
      
      // Update folder counts if folder changed
      if (updates.folderPath && updates.folderPath !== currentNote.folderPath) {
        await this.updateFolderNotesCount(currentNote.folderPath, userId, -1);
        await this.updateFolderNotesCount(updates.folderPath, userId, 1);
      }
      
      // Handle tag changes
      if (updates.tags) {
        await this.createTagsIfNotExist(updates.tags, userId);
      }
      
      return { ...currentNote, ...updateData, id: noteId };
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId, userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const noteRef = doc(db, this.collections.notes, noteId);
      const noteSnap = await getDoc(noteRef);
      
      if (!noteSnap.exists()) {
        throw new Error('Note not found');
      }
      
      const note = noteSnap.data();
      if (note.ownerId !== userId) {
        throw new Error('Unauthorized: You can only delete your own notes');
      }
      
      await deleteDoc(noteRef);
      
      // Update folder notes count
      await this.updateFolderNotesCount(note.folderPath, userId, -1);
      
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  /**
   * Get all notes for a user with optional filtering
   */
  async getNotes(userId, filters = {}) {
    if (!userId) throw new Error('User ID is required');
    
    let notesQuery = query(
      collection(db, this.collections.notes),
      where('ownerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(notesQuery);
    const notes = [];
    
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });
    
    return this.applyFilters(notes, filters);
  }

  /**
   * Apply client-side filters for complex queries
   */
  applyFilters(notes, filters) {
    let filteredNotes = [...notes];
    
    // Tag filtering (AND operation - note must have all specified tags)
    if (filters.tags && filters.tags.length > 0) {
      filteredNotes = filteredNotes.filter(note => 
        filters.tags.every(tag => note.tags && note.tags.includes(tag))
      );
    }
    
    // Search filtering
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.searchableText && note.searchableText.includes(searchLower)
      );
    }
    
    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = note.updatedAt?.toDate?.() || new Date(note.updatedAt);
        if (filters.dateFrom && noteDate < filters.dateFrom) return false;
        if (filters.dateTo && noteDate > filters.dateTo) return false;
        return true;
      });
    }
    
    // Folder filtering
    if (filters.folderPath) {
      filteredNotes = filteredNotes.filter(note => note.folderPath === filters.folderPath);
    }
    
    return filteredNotes;
  }

  /**
   * Search notes using simple text matching (for now - Algolia integration would be ideal)
   */
  async searchNotes(userId, searchQuery, options = {}) {
    if (!userId || !searchQuery) return [];
    
    try {
      const allNotes = await this.getNotes(userId, { limit: options.limit || 100 });
      const searchLower = searchQuery.toLowerCase();
      
      return allNotes.filter(note => 
        note.searchableText && note.searchableText.includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  /**
   * Create a new folder using materialized path pattern
   */
  async createFolder(folderData, userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      // Validate path format
      if (!folderData.path || !folderData.path.startsWith('/')) {
        throw new Error('Folder path must start with /');
      }
      
      // Check if folder already exists
      const existingFolderQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        where('path', '==', folderData.path)
      );
      const existingFolders = await getDocs(existingFolderQuery);
      
      if (!existingFolders.empty) {
        throw new Error('Folder with this path already exists');
      }
      
      const folderRef = doc(collection(db, this.collections.folders));
      const now = serverTimestamp();
      
      // Calculate level and parent path
      const pathParts = folderData.path.split('/').filter(part => part.length > 0);
      const level = pathParts.length - 1;
      const parentPath = level > 0 ? '/' + pathParts.slice(0, -1).join('/') : null;
      
      const folder = {
        id: folderRef.id,
        name: folderData.name,
        path: folderData.path,
        level: level,
        parentPath: parentPath,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
        notesCount: 0,
        description: folderData.description || ''
      };
      
      await setDoc(folderRef, folder);
      
      return { ...folder, id: folderRef.id };
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Get all folders for a user in hierarchical order
   */
  async getFolders(userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const foldersQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        orderBy('path')
      );
      
      const querySnapshot = await getDocs(foldersQuery);
      const folders = [];
      
      querySnapshot.forEach((doc) => {
        folders.push({ id: doc.id, ...doc.data() });
      });
      
      return folders;
    } catch (error) {
      console.error('Error getting folders:', error);
      throw error;
    }
  }

  /**
   * Delete a folder and optionally move its notes to another folder
   */
  async deleteFolder(folderPath, userId, moveNotesToPath = '/General') {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const batch = writeBatch(db);
      
      // Get folder to delete
      const folderQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        where('path', '==', folderPath)
      );
      const folderSnap = await getDocs(folderQuery);
      
      if (folderSnap.empty) {
        throw new Error('Folder not found');
      }
      
      // Delete folder
      folderSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete descendant folders (using materialized path pattern)
      const descendantQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        where('path', '>=', folderPath + '/'),
        where('path', '<=', folderPath + '/\uf8ff')
      );
      const descendantSnap = await getDocs(descendantQuery);
      
      descendantSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Move notes to new folder
      const notesQuery = query(
        collection(db, this.collections.notes),
        where('ownerId', '==', userId),
        where('folderPath', '>=', folderPath),
        where('folderPath', '<=', folderPath + '\uf8ff')
      );
      const notesSnap = await getDocs(notesQuery);
      
      notesSnap.forEach((doc) => {
        batch.update(doc.ref, {
          folderPath: moveNotesToPath,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  /**
   * Create tags if they don't exist
   */
  async createTagsIfNotExist(tags, userId) {
    if (!userId || !tags || tags.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      for (const tagName of tags) {
        // Check if tag exists
        const tagQuery = query(
          collection(db, this.collections.tags),
          where('ownerId', '==', userId),
          where('name', '==', tagName)
        );
        const existingTags = await getDocs(tagQuery);
        
        if (existingTags.empty) {
          const tagRef = doc(collection(db, this.collections.tags));
          batch.set(tagRef, {
            id: tagRef.id,
            name: tagName,
            ownerId: userId,
            createdAt: serverTimestamp(),
            usageCount: 1
          });
        } else {
          // Increment usage count
          existingTags.forEach((doc) => {
            batch.update(doc.ref, {
              usageCount: (doc.data().usageCount || 0) + 1
            });
          });
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error creating tags:', error);
      throw error;
    }
  }

  /**
   * Get all tags for a user
   */
  async getTags(userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const tagsQuery = query(
        collection(db, this.collections.tags),
        where('ownerId', '==', userId),
        orderBy('usageCount', 'desc')
      );
      
      const querySnapshot = await getDocs(tagsQuery);
      const tags = [];
      
      querySnapshot.forEach((doc) => {
        tags.push({ id: doc.id, ...doc.data() });
      });
      
      return tags;
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagName, userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const batch = writeBatch(db);
      
      // Delete tag document
      const tagQuery = query(
        collection(db, this.collections.tags),
        where('ownerId', '==', userId),
        where('name', '==', tagName)
      );
      const tagSnap = await getDocs(tagQuery);
      
      tagSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Remove tag from all notes
      const notesQuery = query(
        collection(db, this.collections.notes),
        where('ownerId', '==', userId)
      );
      const notesSnap = await getDocs(notesQuery);
      
      notesSnap.forEach((doc) => {
        const noteData = doc.data();
        if (noteData.tags && noteData.tags.includes(tagName)) {
          const updatedTags = noteData.tags.filter(tag => tag !== tagName);
          batch.update(doc.ref, {
            tags: updatedTags,
            updatedAt: serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for notes
   */
  subscribeToNotes(userId, callback, filters = {}) {
    if (!userId) throw new Error('User ID is required');
    
    const notesQuery = query(
      collection(db, this.collections.notes),
      where('ownerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    // Fallback helper: perform one-time fetch if realtime listener fails (e.g., missing index still building)
    const fetchOnce = async () => {
      try {
        const snapshot = await getDocs(notesQuery);
        const notes = [];
        snapshot.forEach((doc) => notes.push({ id: doc.id, ...doc.data() }));
        callback(this.applyFilters(notes, filters));
      } catch (err) {
        console.error('Error fetching notes fallback:', err);
        callback([], err);
      }
    };

    return onSnapshot(notesQuery, (snapshot) => {
      const notes = [];
      snapshot.forEach((doc) => {
        notes.push({ id: doc.id, ...doc.data() });
      });
      callback(this.applyFilters(notes, filters));
    }, (error) => {
      console.error('Error in notes subscription:', error);
      fetchOnce();
    });
  }

  /**
   * Set up real-time listener for folders
   */
  subscribeToFolders(userId, callback) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const foldersQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        orderBy('path')
      );
      
      const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
        const folders = [];
        snapshot.forEach((doc) => {
          folders.push({ id: doc.id, ...doc.data() });
        });
        callback(folders);
      }, (error) => {
        console.error('Error in folders subscription:', error);
        callback([], error);
      });
      
      const listenerId = `folders_${userId}_${Date.now()}`;
      this.listeners.set(listenerId, unsubscribe);
      
      return () => {
        unsubscribe();
        this.listeners.delete(listenerId);
      };
    } catch (error) {
      console.error('Error setting up folders subscription:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for tags
   */
  subscribeToTags(userId, callback) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const tagsQuery = query(
        collection(db, this.collections.tags),
        where('ownerId', '==', userId),
        orderBy('usageCount', 'desc')
      );

      const fetchOnce = async () => {
        try {
          const snapshot = await getDocs(tagsQuery);
          const tags = [];
          snapshot.forEach((doc) => tags.push({ id: doc.id, ...doc.data() }));
          callback(tags);
        } catch (err) {
          console.error('Error fetching tags fallback:', err);
          callback([], err);
        }
      };

      const unsubscribe = onSnapshot(tagsQuery, (snapshot) => {
        const tags = [];
        snapshot.forEach((doc) => {
          tags.push({ id: doc.id, ...doc.data() });
        });
        callback(tags);
      }, (error) => {
        console.error('Error in tags subscription:', error);
        fetchOnce();
      });

      const listenerId = `tags_${userId}_${Date.now()}`;
      this.listeners.set(listenerId, unsubscribe);

      return () => {
        unsubscribe();
        this.listeners.delete(listenerId);
      };
    } catch (error) {
      console.error('Error setting up tags subscription:', error);
      throw error;
    }
  }

  /**
   * Cleanup all active listeners
   */
  cleanup() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * Utility functions
   */
  
  extractPlainText(content) {
    if (typeof content === 'string') return content;
    if (content && content.blocks) {
      return content.blocks.map(block => block.text).join(' ');
    }
    return '';
  }

  async updateFolderNotesCount(folderPath, userId, increment) {
    try {
      const folderQuery = query(
        collection(db, this.collections.folders),
        where('ownerId', '==', userId),
        where('path', '==', folderPath)
      );
      const folderSnap = await getDocs(folderQuery);
      
      folderSnap.forEach(async (doc) => {
        const currentCount = doc.data().notesCount || 0;
        await updateDoc(doc.ref, {
          notesCount: Math.max(0, currentCount + increment),
          updatedAt: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Error updating folder notes count:', error);
    }
  }

  /**
   * Export all notes for backup
   */
  async exportAllData(userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const [notes, folders, tags] = await Promise.all([
        this.getNotes(userId),
        this.getFolders(userId),
        this.getTags(userId)
      ]);
      
      return {
        exportDate: new Date().toISOString(),
        userId,
        notes,
        folders,
        tags
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Get note by ID
   */
  async getNote(noteId, userId) {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const noteRef = doc(db, this.collections.notes, noteId);
      const noteSnap = await getDoc(noteRef);
      
      if (!noteSnap.exists()) {
        throw new Error('Note not found');
      }
      
      const note = noteSnap.data();
      if (note.ownerId !== userId) {
        throw new Error('Unauthorized: You can only access your own notes');
      }
      
      return { id: noteSnap.id, ...note };
    } catch (error) {
      console.error('Error getting note:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const firebaseNotesService = new FirebaseNotesService();
export default firebaseNotesService; 