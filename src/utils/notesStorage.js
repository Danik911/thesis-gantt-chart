/**
 * Notes Storage Utility
 * Implements localStorage persistence with auto-save and manual save functionality
 * As specified in Task 15: Implement Notes Persistence System
 */

/**
 * Debounce function to limit the frequency of function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Storage keys for localStorage
 */
const STORAGE_KEYS = {
  NOTES: 'thesisGanttChart_notes',
  TAGS: 'thesisGanttChart_tags',
  FOLDERS: 'thesisGanttChart_folders',
  CURRENT_NOTE: 'thesisGanttChart_currentNote'
};

/**
 * Validate notes data before saving
 * @param {Object} data - Data to validate
 * @returns {boolean} - True if valid
 */
const validateNotesData = (data) => {
  if (!data || typeof data !== 'object') return false;
  
  // Check for required fields
  if (!data.hasOwnProperty('id') || !data.hasOwnProperty('title')) return false;
  
  // Validate data types
  if (typeof data.id !== 'string' || typeof data.title !== 'string') return false;
  
  return true;
};

/**
 * Check available localStorage space
 * @returns {number} - Available space in bytes (approximate)
 */
const getAvailableStorageSpace = () => {
  try {
    const testKey = 'localStorage_test';
    let data = '';
    let totalSize = 0;
    
    // Try to fill localStorage to find limit
    try {
      for (let i = 0; i < 10000; i++) {
        data += '0123456789';
        localStorage.setItem(testKey, data);
        totalSize += 10;
      }
    } catch (e) {
      localStorage.removeItem(testKey);
      return totalSize;
    }
    
    localStorage.removeItem(testKey);
    return totalSize;
  } catch (error) {
    console.warn('Could not determine localStorage space:', error);
    return 0;
  }
};

/**
 * Save notes to localStorage with error handling
 * @param {Array} notes - Notes array to save
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveNotesToStorage = async (notes) => {
  try {
    if (!Array.isArray(notes)) {
      throw new Error('Notes must be an array');
    }

    // Validate each note
    for (const note of notes) {
      if (!validateNotesData(note)) {
        throw new Error('Invalid note data detected');
      }
    }

    const dataToSave = JSON.stringify(notes);
    
    // Check if data size is reasonable (under 5MB)
    const dataSize = new Blob([dataToSave]).size;
    if (dataSize > 5 * 1024 * 1024) {
      throw new Error('Data size too large for localStorage');
    }

    localStorage.setItem(STORAGE_KEYS.NOTES, dataToSave);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving notes to storage:', error);
    
    // Handle specific localStorage errors
    if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
      return { 
        success: false, 
        error: 'Storage quota exceeded. Please delete some notes or clear old data.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to save notes to storage' 
    };
  }
};

/**
 * Load notes from localStorage with error handling
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const loadNotesFromStorage = async () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEYS.NOTES);
    
    if (!storedData) {
      // No data exists yet, return empty array
      return { success: true, data: [] };
    }

    const notes = JSON.parse(storedData);
    
    if (!Array.isArray(notes)) {
      throw new Error('Stored notes data is corrupted');
    }

    // Validate loaded data
    const validNotes = notes.filter(note => validateNotesData(note));
    
    if (validNotes.length !== notes.length) {
      console.warn(`Filtered out ${notes.length - validNotes.length} invalid notes`);
    }

    return { success: true, data: validNotes };
  } catch (error) {
    console.error('Error loading notes from storage:', error);
    
    // Handle corrupted data
    if (error instanceof SyntaxError) {
      return { 
        success: false, 
        error: 'Stored notes data is corrupted. Starting with empty notes.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to load notes from storage' 
    };
  }
};

/**
 * Save current note state for recovery
 * @param {Object} noteData - Current note data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveCurrentNoteState = async (noteData) => {
  try {
    if (!noteData || typeof noteData !== 'object') {
      throw new Error('Invalid note data provided');
    }

    const dataToSave = JSON.stringify({
      ...noteData,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_NOTE, dataToSave);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving current note state:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save current note state' 
    };
  }
};

/**
 * Load current note state for recovery
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const loadCurrentNoteState = async () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEYS.CURRENT_NOTE);
    
    if (!storedData) {
      return { success: true, data: null };
    }

    const noteData = JSON.parse(storedData);
    
    return { success: true, data: noteData };
  } catch (error) {
    console.error('Error loading current note state:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to load current note state' 
    };
  }
};

/**
 * Save tags to localStorage
 * @param {Array} tags - Tags array to save
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveTagsToStorage = async (tags) => {
  try {
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be an array');
    }

    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    return { success: true };
  } catch (error) {
    console.error('Error saving tags:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save tags' 
    };
  }
};

/**
 * Load tags from localStorage
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const loadTagsFromStorage = async () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEYS.TAGS);
    
    if (!storedData) {
      return { success: true, data: [] };
    }

    const tags = JSON.parse(storedData);
    
    if (!Array.isArray(tags)) {
      throw new Error('Stored tags data is corrupted');
    }

    return { success: true, data: tags };
  } catch (error) {
    console.error('Error loading tags:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to load tags' 
    };
  }
};

/**
 * Save folders to localStorage
 * @param {Array} folders - Folders array to save
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveFoldersToStorage = async (folders) => {
  try {
    if (!Array.isArray(folders)) {
      throw new Error('Folders must be an array');
    }

    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    return { success: true };
  } catch (error) {
    console.error('Error saving folders:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save folders' 
    };
  }
};

/**
 * Load folders from localStorage
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const loadFoldersFromStorage = async () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    
    if (!storedData) {
      // Return default folders if none exist
      const defaultFolders = ['General', 'Research', 'Ideas', 'Tasks'];
      return { success: true, data: defaultFolders };
    }

    const folders = JSON.parse(storedData);
    
    if (!Array.isArray(folders)) {
      throw new Error('Stored folders data is corrupted');
    }

    return { success: true, data: folders };
  } catch (error) {
    console.error('Error loading folders:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to load folders' 
    };
  }
};

/**
 * Clear all notes data from localStorage
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const clearAllNotesData = async () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing notes data:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to clear notes data' 
    };
  }
};

/**
 * Check if localStorage is available and working
 * @returns {boolean}
 */
export const isStorageAvailable = () => {
  try {
    const test = 'localStorage_test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn('localStorage is not available:', error);
    return false;
  }
};

/**
 * Get storage usage information
 * @returns {Object} Storage usage info
 */
export const getStorageInfo = () => {
  try {
    let totalSize = 0;
    const itemSizes = {};
    
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      const data = localStorage.getItem(storageKey);
      const size = data ? new Blob([data]).size : 0;
      itemSizes[key] = size;
      totalSize += size;
    });
    
    return {
      totalSize,
      itemSizes,
      isAvailable: isStorageAvailable(),
      availableSpace: getAvailableStorageSpace()
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      totalSize: 0,
      itemSizes: {},
      isAvailable: false,
      availableSpace: 0
    };
  }
};

export default {
  debounce,
  saveNotesToStorage,
  loadNotesFromStorage,
  saveCurrentNoteState,
  loadCurrentNoteState,
  saveTagsToStorage,
  loadTagsFromStorage,
  saveFoldersToStorage,
  loadFoldersFromStorage,
  clearAllNotesData,
  isStorageAvailable,
  getStorageInfo
};