/**
 * AssociationContext - React Context for managing file associations
 * Provides shared state and methods for notes-PDF associations
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import associationService from '../services/AssociationService';
import notesService from '../services/NotesService';

// Initial state
const initialState = {
  associations: [],
  loading: false,
  error: null,
  stats: {
    totalAssociations: 0,
    uniqueNotesWithAssociations: 0,
    uniquePdfsWithAssociations: 0,
    averageAssociationsPerPdf: 0
  }
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_ASSOCIATIONS: 'SET_ASSOCIATIONS',
  ADD_ASSOCIATION: 'ADD_ASSOCIATION',
  UPDATE_ASSOCIATION: 'UPDATE_ASSOCIATION',
  REMOVE_ASSOCIATION: 'REMOVE_ASSOCIATION',
  SET_STATS: 'SET_STATS',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer function
function associationReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case ActionTypes.SET_ASSOCIATIONS:
      return {
        ...state,
        associations: action.payload,
        loading: false,
        error: null
      };

    case ActionTypes.ADD_ASSOCIATION:
      return {
        ...state,
        associations: [...state.associations, action.payload],
        loading: false,
        error: null
      };

    case ActionTypes.UPDATE_ASSOCIATION:
      return {
        ...state,
        associations: state.associations.map(assoc =>
          assoc.id === action.payload.id ? action.payload : assoc
        ),
        loading: false,
        error: null
      };

    case ActionTypes.REMOVE_ASSOCIATION:
      return {
        ...state,
        associations: state.associations.filter(assoc => assoc.id !== action.payload),
        loading: false,
        error: null
      };

    case ActionTypes.SET_STATS:
      return {
        ...state,
        stats: action.payload
      };

    default:
      return state;
  }
}

// Create contexts
const AssociationContext = createContext();

// Custom hook to use the association context
export const useAssociations = () => {
  const context = useContext(AssociationContext);
  if (!context) {
    throw new Error('useAssociations must be used within an AssociationProvider');
  }
  return context;
};

// Provider component
export const AssociationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(associationReducer, initialState);

  // Load associations on mount
  useEffect(() => {
    loadAssociations();
    loadStats();
  }, []);

  // Action creators
  const setLoading = (loading) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: error });
  };

  const clearError = () => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  };

  const loadAssociations = async () => {
    try {
      setLoading(true);
      const associations = await associationService.getAllAssociations();
      dispatch({ type: ActionTypes.SET_ASSOCIATIONS, payload: associations });
    } catch (error) {
      setError(error.message);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await associationService.getAssociationStats();
      dispatch({ type: ActionTypes.SET_STATS, payload: stats });
    } catch (error) {
      console.error('Failed to load association stats:', error);
    }
  };

  const createAssociation = async (noteId, pdfId, metadata = {}) => {
    try {
      setLoading(true);
      clearError();

      // Check if association already exists
      const existingAssociation = await associationService.getAssociationByNoteId(noteId);
      if (existingAssociation) {
        throw new Error('This note is already associated with a PDF');
      }

      const association = await associationService.createAssociation(noteId, pdfId, metadata);
      dispatch({ type: ActionTypes.ADD_ASSOCIATION, payload: association });
      
      // Reload stats
      await loadStats();
      
      return association;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateAssociation = async (associationId, updates) => {
    try {
      setLoading(true);
      clearError();

      const updatedAssociation = await associationService.updateAssociation(associationId, updates);
      dispatch({ type: ActionTypes.UPDATE_ASSOCIATION, payload: updatedAssociation });
      
      return updatedAssociation;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const removeAssociation = async (associationId) => {
    try {
      setLoading(true);
      clearError();

      await associationService.deleteAssociation(associationId);
      dispatch({ type: ActionTypes.REMOVE_ASSOCIATION, payload: associationId });
      
      // Reload stats
      await loadStats();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const removeAssociationByNoteId = async (noteId) => {
    try {
      setLoading(true);
      clearError();

      const association = await associationService.getAssociationByNoteId(noteId);
      if (association) {
        await associationService.deleteAssociation(association.id);
        dispatch({ type: ActionTypes.REMOVE_ASSOCIATION, payload: association.id });
        
        // Reload stats
        await loadStats();
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getAssociationByNoteId = async (noteId) => {
    try {
      return await associationService.getAssociationByNoteId(noteId);
    } catch (error) {
      console.error('Failed to get association:', error);
      return null;
    }
  };

  const getAssociationsByPdfId = async (pdfId) => {
    try {
      return await associationService.getAssociationsByPdfId(pdfId);
    } catch (error) {
      console.error('Failed to get associations for PDF:', error);
      return [];
    }
  };

  const hasAssociation = async (noteId) => {
    try {
      return await associationService.hasAssociation(noteId);
    } catch (error) {
      console.error('Failed to check association:', error);
      return false;
    }
  };

  const syncWithFirestore = async () => {
    try {
      setLoading(true);
      await associationService.syncWithFirestore();
      await loadAssociations();
      await loadStats();
    } catch (error) {
      setError(error.message);
    }
  };

  // Search associations by PDF name or note content
  const searchAssociations = (searchTerm) => {
    if (!searchTerm) return state.associations;
    
    const term = searchTerm.toLowerCase();
    return state.associations.filter(association => {
      // This would need to be enhanced with actual PDF and note data
      return association.noteId.toLowerCase().includes(term) ||
             association.pdfId.toLowerCase().includes(term);
    });
  };

  // Get associations grouped by PDF
  const getAssociationsGroupedByPdf = () => {
    const grouped = {};
    state.associations.forEach(association => {
      if (!grouped[association.pdfId]) {
        grouped[association.pdfId] = [];
      }
      grouped[association.pdfId].push(association);
    });
    return grouped;
  };

  // Get PDFs that have associated notes
  const getPdfsWithAssociations = () => {
    const pdfIds = new Set(state.associations.map(assoc => assoc.pdfId));
    return Array.from(pdfIds);
  };

  // Get notes that have associated PDFs
  const getNotesWithAssociations = () => {
    const noteIds = new Set(state.associations.map(assoc => assoc.noteId));
    return Array.from(noteIds);
  };

  const contextValue = {
    // State
    ...state,
    
    // Actions
    loadAssociations,
    createAssociation,
    updateAssociation,
    removeAssociation,
    removeAssociationByNoteId,
    getAssociationByNoteId,
    getAssociationsByPdfId,
    hasAssociation,
    syncWithFirestore,
    clearError,
    
    // Utility functions
    searchAssociations,
    getAssociationsGroupedByPdf,
    getPdfsWithAssociations,
    getNotesWithAssociations
  };

  return (
    <AssociationContext.Provider value={contextValue}>
      {children}
    </AssociationContext.Provider>
  );
};

export default AssociationContext; 