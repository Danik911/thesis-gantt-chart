import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firebaseNotesService from '../services/FirebaseNotesService';
import unifiedNotesService from '../services/UnifiedNotesService';

const NotesContext = createContext();

// Initial state
const initialState = {
  notes: [],
  folders: [],
  tags: [],
  currentNote: null,
  selectedFolder: null,
  selectedTags: [],
  searchQuery: '',
  loading: false,
  error: null,
  filters: {
    search: '',
    tags: [],
    folderPath: null,
    dateRange: null
  }
};

// Action types
const NOTES_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_NOTES: 'SET_NOTES',
  SET_FOLDERS: 'SET_FOLDERS',
  SET_TAGS: 'SET_TAGS',
  SET_CURRENT_NOTE: 'SET_CURRENT_NOTE',
  SET_SELECTED_FOLDER: 'SET_SELECTED_FOLDER',
  SET_SELECTED_TAGS: 'SET_SELECTED_TAGS',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_FILTERS: 'SET_FILTERS',
  ADD_NOTE: 'ADD_NOTE',
  UPDATE_NOTE: 'UPDATE_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer function
const notesReducer = (state, action) => {
  switch (action.type) {
    case NOTES_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case NOTES_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case NOTES_ACTIONS.SET_NOTES:
      return {
        ...state,
        notes: action.payload,
        loading: false
      };
    case NOTES_ACTIONS.SET_FOLDERS:
      return {
        ...state,
        folders: action.payload
      };
    case NOTES_ACTIONS.SET_TAGS:
      return {
        ...state,
        tags: action.payload
      };
    case NOTES_ACTIONS.SET_CURRENT_NOTE:
      return {
        ...state,
        currentNote: action.payload
      };
    case NOTES_ACTIONS.SET_SELECTED_FOLDER:
      return {
        ...state,
        selectedFolder: action.payload
      };
    case NOTES_ACTIONS.SET_SELECTED_TAGS:
      return {
        ...state,
        selectedTags: action.payload
      };
    case NOTES_ACTIONS.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload
      };
    case NOTES_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case NOTES_ACTIONS.ADD_NOTE:
      return {
        ...state,
        notes: [action.payload, ...state.notes]
      };
    case NOTES_ACTIONS.UPDATE_NOTE:
      return {
        ...state,
        notes: state.notes.map(note => 
          note.id === action.payload.id ? action.payload : note
        ),
        currentNote: state.currentNote?.id === action.payload.id ? action.payload : state.currentNote
      };
    case NOTES_ACTIONS.DELETE_NOTE:
      return {
        ...state,
        notes: state.notes.filter(note => note.id !== action.payload),
        currentNote: state.currentNote?.id === action.payload ? null : state.currentNote
      };
    case NOTES_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

// NotesProvider component
export const NotesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notesReducer, initialState);
  const { user } = useAuth();

  // Real-time subscriptions cleanup
  useEffect(() => {
    let unsubscribeNotes = null;
    let unsubscribeFolders = null;
    let unsubscribeTags = null;

    if (user?.uid) {
      dispatch({ type: NOTES_ACTIONS.SET_LOADING, payload: true });

      // Notes
      unsubscribeNotes = firebaseNotesService.subscribeToNotes(
        user.uid,
        (notes, error) => {
          if (error) {
            dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
          } else {
            dispatch({ type: NOTES_ACTIONS.SET_NOTES, payload: notes });
          }
        },
        state.filters
      );

      // Folders
      unsubscribeFolders = firebaseNotesService.subscribeToFolders(
        user.uid,
        (folders, error) => {
          if (error) {
            dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
          } else {
            dispatch({ type: NOTES_ACTIONS.SET_FOLDERS, payload: folders });
          }
        }
      );

      // Tags
      unsubscribeTags = firebaseNotesService.subscribeToTags(
        user.uid,
        (tags, error) => {
          if (error) {
            dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
          } else {
            dispatch({ type: NOTES_ACTIONS.SET_TAGS, payload: tags });
          }
        }
      );
    }

    return () => {
      unsubscribeNotes && unsubscribeNotes();
      unsubscribeFolders && unsubscribeFolders();
      unsubscribeTags && unsubscribeTags();
    };
  }, [user?.uid, state.filters]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.uid) return;

      try {
        // Load folders and tags (these might not need real-time updates)
        const [folders, tags] = await Promise.all([
          firebaseNotesService.getFolders ? firebaseNotesService.getFolders(user.uid) : [],
          firebaseNotesService.getTags ? firebaseNotesService.getTags(user.uid) : []
        ]);

        dispatch({ type: NOTES_ACTIONS.SET_FOLDERS, payload: folders });
        dispatch({ type: NOTES_ACTIONS.SET_TAGS, payload: tags });
      } catch (error) {
        dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
      }
    };

    loadInitialData();
  }, [user?.uid]);

  // Notes actions
  const createNote = async (noteData) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      dispatch({ type: NOTES_ACTIONS.SET_LOADING, payload: true });
      const newNote = await firebaseNotesService.createNote(noteData, user.uid);
      // Also persist in unified local store so PDF/other components see it.
      try {
        await unifiedNotesService.createNote(newNote);
      } catch (err) {
        console.warn('UnifiedNotesService create warning:', err.message);
      }
      // Note will be automatically added via real-time subscription
      return newNote;
    } catch (error) {
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  const updateNote = async (noteId, updates) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      const updatedNote = await firebaseNotesService.updateNote(noteId, updates, user.uid);
      // Persist the same change to IndexedDB unified store so other
      // components (e.g. PDF Manager) immediately see the update.
      try {
        await unifiedNotesService.updateNote(noteId, updates);
      } catch (err) {
        // If the note is missing locally create it so that IDs stay aligned.
        if (err.message.includes('Note not found')) {
          await unifiedNotesService.createNote({ id: noteId, ...updatedNote });
        } else {
          console.warn('UnifiedNotesService update failed:', err.message);
        }
      }
      // Note will be automatically updated via real-time subscription
      return updatedNote;
    } catch (error) {
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  const deleteNote = async (noteId) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      await firebaseNotesService.deleteNote(noteId, user.uid);
      // Reflect deletion in the unified IndexedDB store as well.
      try {
        await unifiedNotesService.deleteNote(noteId);
      } catch (err) {
        console.warn('UnifiedNotesService delete warning:', err.message);
      }
      // Note will be automatically removed via real-time subscription
    } catch (error) {
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  const searchNotes = async (query) => {
    if (!user?.uid) return [];

    try {
      const results = await firebaseNotesService.searchNotes(user.uid, query);
      return results;
    } catch (error) {
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: error.message });
      return [];
    }
  };

  // Filter actions
  const setFilters = (newFilters) => {
    dispatch({ type: NOTES_ACTIONS.SET_FILTERS, payload: newFilters });
  };

  const setSearchQuery = (query) => {
    dispatch({ type: NOTES_ACTIONS.SET_SEARCH_QUERY, payload: query });
    setFilters({ search: query });
  };

  const setSelectedFolder = (folderPath) => {
    dispatch({ type: NOTES_ACTIONS.SET_SELECTED_FOLDER, payload: folderPath });
    setFilters({ folderPath });
  };

  const setSelectedTags = (tags) => {
    dispatch({ type: NOTES_ACTIONS.SET_SELECTED_TAGS, payload: tags });
    setFilters({ tags });
  };

  // UI actions
  const setCurrentNote = (note) => {
    dispatch({ type: NOTES_ACTIONS.SET_CURRENT_NOTE, payload: note });
  };

  const clearError = () => {
    dispatch({ type: NOTES_ACTIONS.CLEAR_ERROR });
  };

  // Get filtered notes
  const getFilteredNotes = () => {
    return state.notes; // Already filtered by subscription
  };

  // Get notes by folder
  const getNotesByFolder = (folderPath) => {
    return state.notes.filter(note => note.folderPath === folderPath);
  };

  // Get notes count by folder
  const getNotesCountByFolder = () => {
    const counts = {};
    state.notes.forEach(note => {
      counts[note.folderPath] = (counts[note.folderPath] || 0) + 1;
    });
    return counts;
  };

  const value = {
    // State
    notes: state.notes,
    folders: state.folders,
    tags: state.tags,
    currentNote: state.currentNote,
    selectedFolder: state.selectedFolder,
    selectedTags: state.selectedTags,
    searchQuery: state.searchQuery,
    filters: state.filters,
    loading: state.loading,
    error: state.error,

    // Actions
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    
    // Filter actions
    setFilters,
    setSearchQuery,
    setSelectedFolder,
    setSelectedTags,
    
    // UI actions
    setCurrentNote,
    clearError,
    
    // Computed values
    getFilteredNotes,
    getNotesByFolder,
    getNotesCountByFolder
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

// Custom hook to use notes context
export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export default NotesContext; 