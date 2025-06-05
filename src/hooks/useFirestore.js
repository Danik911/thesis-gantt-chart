// Custom hook for Firestore operations
import { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';

// Hook for reading data from a collection
export const useFirestoreCollection = (collectionName, queryOptions = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await firestoreService.readAll(collectionName, queryOptions);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [collectionName, JSON.stringify(queryOptions)]);

  return { data, loading, error };
};

// Hook for reading a single document
export const useFirestoreDocument = (collectionName, docId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const result = await firestoreService.read(collectionName, docId);
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [collectionName, docId]);

  return { data, loading, error };
};

// Hook for real-time data updates
export const useFirestoreRealtime = (collectionName, queryOptions = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = firestoreService.subscribe(
      collectionName,
      (result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result.data);
          setError(null);
        }
        setLoading(false);
      },
      queryOptions
    );

    return unsubscribe; // Cleanup subscription on unmount
  }, [collectionName, JSON.stringify(queryOptions)]);

  return { data, loading, error };
};

// Hook for document mutations (create, update, delete)
export const useFirestoreMutations = (collectionName) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createDocument = async (data) => {
    setLoading(true);
    setError(null);
    
    const result = await firestoreService.create(collectionName, data);
    
    if (result.error) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const updateDocument = async (docId, data) => {
    setLoading(true);
    setError(null);
    
    const result = await firestoreService.update(collectionName, docId, data);
    
    if (result.error) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const deleteDocument = async (docId) => {
    setLoading(true);
    setError(null);
    
    const result = await firestoreService.delete(collectionName, docId);
    
    if (result.error) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  return {
    createDocument,
    updateDocument,
    deleteDocument,
    loading,
    error
  };
};

export default {
  useFirestoreCollection,
  useFirestoreDocument,
  useFirestoreRealtime,
  useFirestoreMutations
}; 