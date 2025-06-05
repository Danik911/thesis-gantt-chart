/**
 * AssociationService - Manages associations between notes and PDF files
 * Uses both Firestore for persistent storage and IndexedDB for local operations
 */

import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

class AssociationService {
  constructor() {
    this.collectionName = 'associations';
    this.dbName = 'thesis-file-storage';
    this.dbVersion = 3; // Increment version for associations store
    this.storeName = 'associations';
    this.db = null;
  }

  /**
   * Initialize IndexedDB for local association storage
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
        
        // Create associations store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const associationsStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          associationsStore.createIndex('noteId', 'noteId', { unique: false });
          associationsStore.createIndex('pdfId', 'pdfId', { unique: false });
          associationsStore.createIndex('createdAt', 'createdAt', { unique: false });
          associationsStore.createIndex('lastModified', 'lastModified', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a unique ID for associations
   */
  generateAssociationId() {
    return `assoc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new association between a note and PDF
   * @param {string} noteId - The note ID
   * @param {string} pdfId - The PDF file ID
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - The created association
   */
  async createAssociation(noteId, pdfId, metadata = {}) {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to create associations');
      }

      const now = new Date();
      const associationData = {
        noteId,
        pdfId,
        userId: currentUser.uid,
        createdAt: now,
        lastModified: now,
        ...metadata
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...associationData,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp()
      });

      // Save to IndexedDB with generated ID
      await this.initDB();
      const localAssociation = {
        id: docRef.id,
        ...associationData
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(localAssociation);

        request.onsuccess = () => resolve(localAssociation);
        request.onerror = () => reject(new Error('Failed to save association locally'));
      });
    } catch (error) {
      throw new Error(`Failed to create association: ${error.message}`);
    }
  }

  /**
   * Get association by note ID
   * @param {string} noteId - The note ID
   * @returns {Promise<Object|null>} - The association or null
   */
  async getAssociationByNoteId(noteId) {
    try {
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to access associations');
      }

      await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('noteId');
        const request = index.get(noteId);

        request.onsuccess = () => {
          const result = request.result;
          // Filter by user ID for security
          if (result && result.userId === currentUser.uid) {
            resolve(result);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // Fallback to Firestore
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to access associations');
      }

      const q = query(
        collection(db, this.collectionName),
        where('noteId', '==', noteId),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
  }

  /**
   * Get associations by PDF ID
   * @param {string} pdfId - The PDF file ID
   * @returns {Promise<Array>} - Array of associations
   */
  async getAssociationsByPdfId(pdfId) {
    try {
      await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('pdfId');
        const request = index.getAll(pdfId);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // Fallback to Firestore
      const q = query(
        collection(db, this.collectionName),
        where('pdfId', '==', pdfId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }

  /**
   * Get all associations
   * @returns {Promise<Array>} - Array of all associations
   */
  async getAllAssociations() {
    try {
      await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // Fallback to Firestore
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }

  /**
   * Update an association
   * @param {string} associationId - The association ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - The updated association
   */
  async updateAssociation(associationId, updates) {
    try {
      const now = new Date();
      const updateData = {
        ...updates,
        lastModified: now
      };

      // Update in Firestore
      await updateDoc(doc(db, this.collectionName, associationId), {
        ...updateData,
        lastModified: serverTimestamp()
      });

      // Update in IndexedDB
      await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        // Get existing record first
        const getRequest = store.get(associationId);
        getRequest.onsuccess = () => {
          const existingRecord = getRequest.result;
          if (existingRecord) {
            const updatedRecord = { ...existingRecord, ...updateData };
            const putRequest = store.put(updatedRecord);
            putRequest.onsuccess = () => resolve(updatedRecord);
            putRequest.onerror = () => reject(new Error('Failed to update association locally'));
          } else {
            reject(new Error('Association not found'));
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      throw new Error(`Failed to update association: ${error.message}`);
    }
  }

  /**
   * Delete an association
   * @param {string} associationId - The association ID
   * @returns {Promise<void>}
   */
  async deleteAssociation(associationId) {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, this.collectionName, associationId));

      // Delete from IndexedDB
      await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(associationId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      throw new Error(`Failed to delete association: ${error.message}`);
    }
  }

  /**
   * Delete association by note ID
   * @param {string} noteId - The note ID
   * @returns {Promise<void>}
   */
  async deleteAssociationByNoteId(noteId) {
    const association = await this.getAssociationByNoteId(noteId);
    if (association) {
      await this.deleteAssociation(association.id);
    }
  }

  /**
   * Check if a note has an associated PDF
   * @param {string} noteId - The note ID
   * @returns {Promise<boolean>} - True if association exists
   */
  async hasAssociation(noteId) {
    const association = await this.getAssociationByNoteId(noteId);
    return !!association;
  }

  /**
   * Get association statistics
   * @returns {Promise<Object>} - Association statistics
   */
  async getAssociationStats() {
    try {
      const associations = await this.getAllAssociations();
      const uniqueNotes = new Set(associations.map(a => a.noteId));
      const uniquePdfs = new Set(associations.map(a => a.pdfId));

      return {
        totalAssociations: associations.length,
        uniqueNotesWithAssociations: uniqueNotes.size,
        uniquePdfsWithAssociations: uniquePdfs.size,
        averageAssociationsPerPdf: uniquePdfs.size > 0 ? associations.length / uniquePdfs.size : 0
      };
    } catch (error) {
      throw new Error(`Failed to get association stats: ${error.message}`);
    }
  }

  /**
   * Sync local associations with Firestore
   * @returns {Promise<void>}
   */
  async syncWithFirestore() {
    try {
      // Get all associations from Firestore
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const firestoreAssociations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to Date objects
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastModified: doc.data().lastModified?.toDate() || new Date()
      }));

      await this.initDB();

      // Clear local store and repopulate
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          // Add all Firestore associations to local store
          let addedCount = 0;
          firestoreAssociations.forEach(association => {
            const addRequest = store.add(association);
            addRequest.onsuccess = () => {
              addedCount++;
              if (addedCount === firestoreAssociations.length) {
                resolve();
              }
            };
            addRequest.onerror = () => reject(addRequest.error);
          });

          if (firestoreAssociations.length === 0) {
            resolve();
          }
        };
        clearRequest.onerror = () => reject(clearRequest.error);
      });
    } catch (error) {
      throw new Error(`Failed to sync with Firestore: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
const associationService = new AssociationService();
export default associationService; 