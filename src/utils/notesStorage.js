/**
 * Notes Storage Utility
 * Provides localStorage-based persistence for notes with debouncing and error handling
 * Task 15 - Notes Persistence System Implementation
 */

// Debounce function to limit save frequency
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Storage keys
const STORAGE_KEYS = {
  NOTES: 'userNotes',
  TAGS: 'userTags',
  FOLDERS: 'userFolders',
  CURRENT_NOTE: 'currentNote',
  SAVE_TIMESTAMP: 'lastSaveTimestamp'
};

// Data validation functions
export const validateNotesData = (data) => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check if required properties exist and are of correct types
  if (data.title !== undefined && typeof data.title !== 'string') {
    return false;
  }
  
  if (data.content !== undefined && typeof data.content !== 'string') {
    return false;
  }
  
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    return false;
  }
  
  return true;
};

// Check localStorage availability
export const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

// Get storage usage information
export const getStorageUsage = () => {
  if (!isLocalStorageAvailable()) {
    return { used: 0, total: 0, available: 0 };
  }
  
  try {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // Estimate total storage (usually around 5-10MB for most browsers)
    const total = 10 * 1024 * 1024; // 10MB estimate
    const available = total - used;
    
    return { used, total, available };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, total: 0, available: 0 };
  }
};

// Check if storage has enough space for data
export const hasEnoughStorage = (dataSize) => {
  const usage = getStorageUsage();
  return usage.available > dataSize * 2; // Keep some buffer
};

// Save notes to localStorage
export const saveNotesToStorage = async (notesData) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate data before saving
      if (!validateNotesData(notesData)) {
        throw new Error('Invalid notes data format');
      }
      
      // Check localStorage availability
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available');
      }
      
      // Serialize data
      const serializedData = JSON.stringify(notesData);
      const dataSize = serializedData.length;
      
      // Check storage space
      if (!hasEnoughStorage(dataSize)) {
        throw new Error('Insufficient storage space');
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.NOTES, serializedData);
      localStorage.setItem(STORAGE_KEYS.SAVE_TIMESTAMP, Date.now().toString());
      
      resolve({
        success: true,
        timestamp: Date.now(),
        dataSize,
        message: 'Notes saved successfully'
      });
      
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
      
      let errorMessage = 'Failed to save notes';
      
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        errorMessage = 'Storage quota exceeded. Please delete some notes or clear browser data.';
      } else if (error.message.includes('not available')) {
        errorMessage = 'Local storage is not available. Your notes cannot be saved persistently.';
      } else if (error.message.includes('Invalid')) {
        errorMessage = 'Invalid data format. Please check your notes content.';
      }
      
      reject({
        success: false,
        error: error.message,
        userMessage: errorMessage,
        timestamp: Date.now()
      });
    }
  });
};

// Load notes from localStorage
export const loadNotesFromStorage = async () => {
  return new Promise((resolve, reject) => {
    try {
      // Check localStorage availability
      if (!isLocalStorageAvailable()) {
        throw new Error('localStorage is not available');
      }
      
      // Get data from localStorage
      const serializedData = localStorage.getItem(STORAGE_KEYS.NOTES);
      const lastSaveTimestamp = localStorage.getItem(STORAGE_KEYS.SAVE_TIMESTAMP);
      
      if (!serializedData) {
        // No saved data found - return empty state
        resolve({
          success: true,
          data: {
            title: '',
            content: '',
            tags: [],
            folders: [],
            lastModified: Date.now()
          },
          timestamp: null,
          message: 'No saved notes found'
        });
        return;
      }
      
      // Parse data
      const notesData = JSON.parse(serializedData);
      
      // Validate loaded data
      if (!validateNotesData(notesData)) {
        throw new Error('Corrupted notes data detected');
      }
      
      resolve({
        success: true,
        data: notesData,
        timestamp: lastSaveTimestamp ? parseInt(lastSaveTimestamp) : null,
        message: 'Notes loaded successfully'
      });
      
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
      
      let errorMessage = 'Failed to load notes';
      
      if (error instanceof SyntaxError) {
        errorMessage = 'Corrupted notes data. Starting with empty notes.';
        
        // Attempt to clear corrupted data
        try {
          localStorage.removeItem(STORAGE_KEYS.NOTES);
          localStorage.removeItem(STORAGE_KEYS.SAVE_TIMESTAMP);
        } catch (clearError) {
          console.error('Could not clear corrupted data:', clearError);
        }
        
        // Return empty state for corrupted data
        resolve({
          success: true,
          data: {
            title: '',
            content: '',
            tags: [],
            folders: [],
            lastModified: Date.now()
          },
          timestamp: null,
          message: 'Corrupted data cleared, starting fresh'
        });
        return;
      }
      
      if (error.message.includes('not available')) {
        errorMessage = 'Local storage is not available. Notes will not persist between sessions.';
      }
      
      reject({
        success: false,
        error: error.message,
        userMessage: errorMessage,
        timestamp: Date.now()
      });
    }
  });
};

// Save additional data (tags, folders, etc.)
export const saveAdditionalData = async (key, data) => {
  try {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available');
    }
    
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    
    return {
      success: true,
      message: `${key} saved successfully`
    };
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Load additional data (tags, folders, etc.)
export const loadAdditionalData = async (key, defaultValue = []) => {
  try {
    if (!isLocalStorageAvailable()) {
      return {
        success: true,
        data: defaultValue,
        message: 'localStorage not available, using defaults'
      };
    }
    
    const serializedData = localStorage.getItem(key);
    
    if (!serializedData) {
      return {
        success: true,
        data: defaultValue,
        message: `No saved ${key} found`
      };
    }
    
    const data = JSON.parse(serializedData);
    
    return {
      success: true,
      data,
      message: `${key} loaded successfully`
    };
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return {
      success: true,
      data: defaultValue,
      message: `Error loading ${key}, using defaults`
    };
  }
};

// Clear all notes data
export const clearAllNotesData = async () => {
  try {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage is not available');
    }
    
    // Remove all notes-related data
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    return {
      success: true,
      message: 'All notes data cleared successfully'
    };
  } catch (error) {
    console.error('Error clearing notes data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export storage keys for use in components
export { STORAGE_KEYS };

// Create debounced save function (1.5 second delay)
export const createDebouncedSave = (saveFunction, delay = 1500) => {
  return debounce(saveFunction, delay);
};

// Fallback in-memory storage for when localStorage is unavailable
let inMemoryStorage = {
  notes: null,
  tags: [],
  folders: [],
  timestamp: null
};

export const saveToMemory = (data) => {
  inMemoryStorage.notes = data;
  inMemoryStorage.timestamp = Date.now();
  return {
    success: true,
    message: 'Data saved to memory (temporary)'
  };
};

export const loadFromMemory = () => {
  return {
    success: true,
    data: inMemoryStorage.notes || {
      title: '',
      content: '',
      tags: [],
      folders: [],
      lastModified: Date.now()
    },
    timestamp: inMemoryStorage.timestamp,
    message: 'Data loaded from memory'
  };
};

// Export default object with all functions
export default {
  debounce,
  validateNotesData,
  isLocalStorageAvailable,
  getStorageUsage,
  hasEnoughStorage,
  saveNotesToStorage,
  loadNotesFromStorage,
  saveAdditionalData,
  loadAdditionalData,
  clearAllNotesData,
  createDebouncedSave,
  saveToMemory,
  loadFromMemory,
  STORAGE_KEYS
};