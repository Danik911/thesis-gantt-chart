// Firestore service for database operations
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

export const firestoreService = {
  // Create a new document
  create: async (collectionName, data) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, error: null };
    } catch (error) {
      return { id: null, error: error.message };
    }
  },

  // Read a single document by ID
  read: async (collectionName, docId) => {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { 
          data: { id: docSnap.id, ...docSnap.data() }, 
          error: null 
        };
      } else {
        return { data: null, error: 'Document not found' };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Read all documents from a collection
  readAll: async (collectionName, queryOptions = {}) => {
    try {
      const collectionRef = collection(db, collectionName);
      let q = collectionRef;

      // Apply query options
      if (queryOptions.where) {
        q = query(q, where(queryOptions.where.field, queryOptions.where.operator, queryOptions.where.value));
      }
      
      if (queryOptions.orderBy) {
        q = query(q, orderBy(queryOptions.orderBy.field, queryOptions.orderBy.direction || 'asc'));
      }
      
      if (queryOptions.limit) {
        q = query(q, limit(queryOptions.limit));
      }

      const querySnapshot = await getDocs(q);
      const docs = [];
      
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      
      return { data: docs, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  },

  // Update a document
  update: async (collectionName, docId, data) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Delete a document
  delete: async (collectionName, docId) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Listen to real-time updates for a collection
  subscribe: (collectionName, callback, queryOptions = {}) => {
    try {
      const collectionRef = collection(db, collectionName);
      let q = collectionRef;

      // Apply query options
      if (queryOptions.where) {
        q = query(q, where(queryOptions.where.field, queryOptions.where.operator, queryOptions.where.value));
      }
      
      if (queryOptions.orderBy) {
        q = query(q, orderBy(queryOptions.orderBy.field, queryOptions.orderBy.direction || 'asc'));
      }
      
      if (queryOptions.limit) {
        q = query(q, limit(queryOptions.limit));
      }

      return onSnapshot(q, (querySnapshot) => {
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        callback({ data: docs, error: null });
      }, (error) => {
        callback({ data: [], error: error.message });
      });
    } catch (error) {
      callback({ data: [], error: error.message });
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Listen to real-time updates for a single document
  subscribeToDoc: (collectionName, docId, callback) => {
    try {
      const docRef = doc(db, collectionName, docId);
      
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          callback({ 
            data: { id: docSnap.id, ...docSnap.data() }, 
            error: null 
          });
        } else {
          callback({ data: null, error: 'Document not found' });
        }
      }, (error) => {
        callback({ data: null, error: error.message });
      });
    } catch (error) {
      callback({ data: null, error: error.message });
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Batch operations
  batch: () => {
    return {
      batch: writeBatch(db),
      
      create: function(collectionName, data) {
        const docRef = doc(collection(db, collectionName));
        this.batch.set(docRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return docRef.id;
      },
      
      update: function(collectionName, docId, data) {
        const docRef = doc(db, collectionName, docId);
        this.batch.update(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      },
      
      delete: function(collectionName, docId) {
        const docRef = doc(db, collectionName, docId);
        this.batch.delete(docRef);
      },
      
      commit: async function() {
        try {
          await this.batch.commit();
          return { error: null };
        } catch (error) {
          return { error: error.message };
        }
      }
    };
  }
};

export default firestoreService; 