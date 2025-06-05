import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaTrash, FaSave, FaExclamationTriangle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import ConfirmationDialog from './ConfirmationDialog';
import notesStorage, { 
  debounce,
  saveNotesToStorage,
  loadNotesFromStorage,
  saveCurrentNoteState,
  loadCurrentNoteState,
  saveTagsToStorage,
  loadTagsFromStorage,
  saveFoldersToStorage,
  loadFoldersFromStorage,
  isStorageAvailable,
  getStorageInfo
} from '../utils/notesStorage';
import 'draft-js/dist/Draft.css';
import 'react-toastify/dist/ReactToastify.css';

/**
 * TextNotes component with localStorage persistence
 * Implements Task 15: Notes Persistence System with Auto-Save and Manual Save
 */
const TextNotesWithLocalStorage = () => {
  // Core state management for notes and save status (Subtask 15.1)
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [folders, setFolders] = useState(['General', 'Research', 'Ideas', 'Tasks']);
  const [selectedFolder, setSelectedFolder] = useState('General');
  const [newFolder, setNewFolder] = useState('');
  const [showNotesList, setShowNotesList] = useState(true);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFileForAssociation, setSelectedFileForAssociation] = useState(null);
  
  // Error handling state
  const [storageError, setStorageError] = useState(null);
  const [isStorageAvailableFlag, setIsStorageAvailableFlag] = useState(true);
  
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    tagToDelete: null
  });

  // Loading state for operations
  const [isDeletingTag, setIsDeletingTag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for debouncing
  const debouncedSaveRef = useRef();
  const saveTimeoutRef = useRef();

  // Character and word count
  const { characterCount, wordCount } = useMemo(() => {
    const contentState = editorState.getCurrentContent();
    const text = contentState.getPlainText('');
    return {
      characterCount: text.length,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0
    };
  }, [editorState]);

  // Generate unique ID for notes
  const generateNoteId = () => {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Save current note to localStorage (Subtask 15.3)
  const saveToLocalStorage = useCallback(async (noteData) => {
    if (!isStorageAvailableFlag) {
      setSaveStatus('error');
      setStorageError('localStorage is not available');
      return { success: false, error: 'localStorage is not available' };
    }

    try {
      setSaveStatus('saving');
      setIsSaving(true);

      // Validate note data
      if (!noteData || !noteData.title?.trim()) {
        throw new Error('Note title is required');
      }

      // Get current notes
      const { success: loadSuccess, data: currentNotes, error: loadError } = await loadNotesFromStorage();
      if (!loadSuccess) {
        throw new Error(loadError || 'Failed to load existing notes');
      }

      let updatedNotes = [...currentNotes];
      const noteIndex = updatedNotes.findIndex(note => note.id === noteData.id);
      
      if (noteIndex >= 0) {
        // Update existing note
        updatedNotes[noteIndex] = {
          ...updatedNotes[noteIndex],
          ...noteData,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new note
        const newNote = {
          ...noteData,
          id: noteData.id || generateNoteId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedNotes.unshift(newNote); // Add to beginning
      }

      // Save to localStorage
      const { success: saveSuccess, error: saveError } = await saveNotesToStorage(updatedNotes);
      if (!saveSuccess) {
        throw new Error(saveError || 'Failed to save notes');
      }

      // Update local state
      setNotes(updatedNotes);
      setSaveStatus('saved');
      setLastSaveTime(new Date());
      setStorageError(null);

      // Save current note state for recovery
      await saveCurrentNoteState(noteData);

      return { success: true };
    } catch (error) {
      console.error('Error saving note:', error);
      setSaveStatus('error');
      setStorageError(error.message);
      
      // Show error toast
      toast.error(`Save failed: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, [isStorageAvailableFlag]);

  // Create debounced auto-save function (Subtask 15.2)
  useEffect(() => {
    debouncedSaveRef.current = debounce(async (noteData) => {
      await saveToLocalStorage(noteData);
    }, 1500); // 1.5 second delay for auto-save

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveToLocalStorage]);

  // Manual save function (Subtask 15.4)
  const handleManualSave = useCallback(async () => {
    if (!noteTitle.trim()) {
      toast.warn('Please enter a note title before saving', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const contentState = editorState.getCurrentContent();
    const rawContent = convertToRaw(contentState);
    const htmlContent = stateToHTML(contentState);
    
    const noteData = {
      id: currentNote?.id,
      title: noteTitle,
      content: rawContent,
      htmlContent,
      markdownContent: isMarkdownMode ? markdownContent : '',
      tags: selectedTags,
      folder: selectedFolder,
      characterCount,
      wordCount,
      type: 'standalone',
      noteType: 'text',
      fileId: selectedFileForAssociation,
      fileName: selectedFileForAssociation ? availableFiles.find(f => f.id === selectedFileForAssociation)?.name : null,
      fileType: selectedFileForAssociation ? availableFiles.find(f => f.id === selectedFileForAssociation)?.type : null
    };

    const result = await saveToLocalStorage(noteData);
    
    if (result.success) {
      toast.success('Note saved successfully!', {
        position: "top-right",
        autoClose: 2000,
      });
      
      // Update current note if it was a new note
      if (!currentNote && result.noteId) {
        setCurrentNote({ ...noteData, id: result.noteId });
      }
    }
  }, [
    editorState, noteTitle, selectedTags, selectedFolder, markdownContent, 
    isMarkdownMode, characterCount, wordCount, currentNote, 
    selectedFileForAssociation, availableFiles, saveToLocalStorage
  ]);

  // Auto-save functionality with debouncing (Subtask 15.2)
  useEffect(() => {
    if (currentNote && noteTitle.trim() && debouncedSaveRef.current) {
      const contentState = editorState.getCurrentContent();
      const rawContent = convertToRaw(contentState);
      const htmlContent = stateToHTML(contentState);
      
      const noteData = {
        id: currentNote.id,
        title: noteTitle,
        content: rawContent,
        htmlContent,
        markdownContent: isMarkdownMode ? markdownContent : '',
        tags: selectedTags,
        folder: selectedFolder,
        characterCount,
        wordCount,
        type: 'standalone',
        noteType: 'text',
        fileId: selectedFileForAssociation,
        fileName: selectedFileForAssociation ? availableFiles.find(f => f.id === selectedFileForAssociation)?.name : null,
        fileType: selectedFileForAssociation ? availableFiles.find(f => f.id === selectedFileForAssociation)?.type : null
      };

      debouncedSaveRef.current(noteData);
    }
  }, [
    editorState, noteTitle, selectedTags, selectedFolder, markdownContent, 
    isMarkdownMode, characterCount, wordCount, currentNote, 
    selectedFileForAssociation, availableFiles
  ]);

  // Load notes on startup (Subtask 15.6)
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check localStorage availability
        const storageAvailable = isStorageAvailable();
        setIsStorageAvailableFlag(storageAvailable);
        
        if (!storageAvailable) {
          setStorageError('localStorage is not available. Notes will not be saved.');
          toast.error('localStorage is not available. Notes will not be saved.', {
            position: "top-right",
            autoClose: 5000,
          });
          return;
        }

        // Load notes
        const { success: notesSuccess, data: notesData, error: notesError } = await loadNotesFromStorage();
        if (notesSuccess) {
          setNotes(notesData || []);
        } else {
          console.error('Failed to load notes:', notesError);
          setStorageError(notesError);
        }

        // Load tags
        const { success: tagsSuccess, data: tagsData, error: tagsError } = await loadTagsFromStorage();
        if (tagsSuccess) {
          setTags(tagsData || []);
        } else {
          console.error('Failed to load tags:', tagsError);
        }

        // Load folders
        const { success: foldersSuccess, data: foldersData, error: foldersError } = await loadFoldersFromStorage();
        if (foldersSuccess) {
          setFolders(foldersData || ['General', 'Research', 'Ideas', 'Tasks']);
        } else {
          console.error('Failed to load folders:', foldersError);
        }

        // Load available files (from other storage)
        try {
          const fileStorage = JSON.parse(localStorage.getItem('fileStorage') || '[]');
          setAvailableFiles(fileStorage);
        } catch (error) {
          console.error('Error loading files:', error);
        }

        // Attempt to recover current note state
        const { success: currentNoteSuccess, data: currentNoteData } = await loadCurrentNoteState();
        if (currentNoteSuccess && currentNoteData) {
          // Auto-recovery can be implemented here if needed
          console.log('Found recoverable note state:', currentNoteData);
        }

      } catch (error) {
        console.error('Error initializing notes:', error);
        setStorageError(error.message);
      }
    };
    
    initializeData();
  }, []);

  // Save tags to localStorage
  const saveTagsToLocalStorage = useCallback(async (newTags) => {
    try {
      const { success, error } = await saveTagsToStorage(newTags);
      if (!success) {
        console.error('Failed to save tags:', error);
      }
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }, []);

  // Save folders to localStorage
  const saveFoldersToLocalStorage = useCallback(async (newFolders) => {
    try {
      const { success, error } = await saveFoldersToStorage(newFolders);
      if (!success) {
        console.error('Failed to save folders:', error);
      }
    } catch (error) {
      console.error('Error saving folders:', error);
    }
  }, []);

  const createNewNote = () => {
    setCurrentNote(null);
    setEditorState(EditorState.createEmpty());
    setNoteTitle('');
    setSelectedTags([]);
    setMarkdownContent('');
    setIsMarkdownMode(false);
    setSelectedFolder('General');
    setSelectedFileForAssociation(null);
    setSaveStatus('saved');
    setStorageError(null);
  };

  const loadNote = (note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setSelectedTags(note.tags || []);
    setSelectedFolder(note.folder || 'General');
    setIsMarkdownMode(!!note.markdownContent);
    setMarkdownContent(note.markdownContent || '');
    setSelectedFileForAssociation(note.fileId);
    setSaveStatus('saved');
    setStorageError(null);
    
    if (note.content) {
      try {
        const contentState = convertFromRaw(note.content);
        setEditorState(EditorState.createWithContent(contentState));
      } catch (error) {
        console.error('Error loading note content:', error);
        setEditorState(EditorState.createEmpty());
      }
    }
  };

  const deleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        const { success, data: currentNotes, error } = await loadNotesFromStorage();
        if (!success) {
          throw new Error(error || 'Failed to load notes');
        }

        const updatedNotes = currentNotes.filter(note => note.id !== noteId);
        const saveResult = await saveNotesToStorage(updatedNotes);
        
        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save updated notes');
        }

        setNotes(updatedNotes);
        
        if (currentNote?.id === noteId) {
          createNewNote();
        }

        toast.success('Note deleted successfully!', {
          position: "top-right",
          autoClose: 2000,
        });
      } catch (error) {
        console.error('Error deleting note:', error);
        toast.error(`Failed to delete note: ${error.message}`, {
          position: "top-right",
          autoClose: 3000,
        });
      }
    }
  };

  const addTag = async () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()].sort();
      setTags(updatedTags);
      await saveTagsToLocalStorage(updatedTags);
      setNewTag('');
    }
  };

  const addFolder = async () => {
    if (newFolder.trim() && !folders.includes(newFolder.trim())) {
      const updatedFolders = [...folders, newFolder.trim()].sort();
      setFolders(updatedFolders);
      await saveFoldersToLocalStorage(updatedFolders);
      setNewFolder('');
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  const removeFilter = (tag) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleDeleteTag = async (tagName) => {
    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Tag',
      message: `Are you sure you want to delete the tag "${tagName}"? This will remove it from all notes that use this tag.`,
      tagToDelete: tagName
    });
  };

  const confirmDeleteTag = async () => {
    const tagName = confirmationDialog.tagToDelete;
    
    setConfirmationDialog({
      isOpen: false,
      title: '',
      message: '',
      tagToDelete: null
    });

    if (!tagName) return;

    setIsDeletingTag(true);

    try {
      // Remove tag from tags list
      const updatedTags = tags.filter(tag => tag !== tagName);
      setTags(updatedTags);
      await saveTagsToLocalStorage(updatedTags);

      // Remove tag from all notes
      const { success, data: currentNotes, error } = await loadNotesFromStorage();
      if (success) {
        const updatedNotes = currentNotes.map(note => ({
          ...note,
          tags: note.tags ? note.tags.filter(tag => tag !== tagName) : []
        }));
        
        await saveNotesToStorage(updatedNotes);
        setNotes(updatedNotes);
      }

      // Remove from selected tags
      setSelectedTags(prevSelected => prevSelected.filter(tag => tag !== tagName));
      
      toast.success(`Tag "${tagName}" has been deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
      });
      
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error(`Failed to delete tag "${tagName}". Please try again.`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsDeletingTag(false);
    }
  };

  const cancelDeleteTag = () => {
    setConfirmationDialog({
      isOpen: false,
      title: '',
      message: '',
      tagToDelete: null
    });
  };

  // Rich text editor handlers
  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const onBoldClick = () => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'));
  };

  const onItalicClick = () => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'));
  };

  const onUnderlineClick = () => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, 'UNDERLINE'));
  };

  const onBulletListClick = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'unordered-list-item'));
  };

  const onNumberedListClick = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'ordered-list-item'));
  };

  const onHeaderClick = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'header-two'));
  };

  const exportToMarkdown = () => {
    const content = editorState.getCurrentContent().getPlainText('');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const contentState = editorState.getCurrentContent();
    const htmlContent = stateToHTML(contentState);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${noteTitle || 'Note'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1, h2, h3 { color: #333; }
            .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${noteTitle || 'Untitled Note'}</h1>
          <div class="meta">
            Created: ${new Date(currentNote?.createdAt || Date.now()).toLocaleDateString()}<br>
            Tags: ${selectedTags.join(', ')}<br>
            Folder: ${selectedFolder}<br>
            Words: ${wordCount} | Characters: ${characterCount}
          </div>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Filter notes based on search and selected tags
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = !searchQuery || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.htmlContent && note.htmlContent.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => note.tags?.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  }, [notes, searchQuery, selectedTags]);

  const toggleMarkdownMode = () => {
    if (isMarkdownMode) {
      // Convert markdown to rich text
      const htmlContent = markdownContent;
      const contentState = stateFromHTML(htmlContent);
      setEditorState(EditorState.createWithContent(contentState));
    } else {
      // Convert rich text to markdown
      const content = editorState.getCurrentContent().getPlainText('');
      setMarkdownContent(content);
    }
    setIsMarkdownMode(!isMarkdownMode);
  };

  // Status indicator component (Subtask 15.5)
  const SaveStatusIndicator = () => {
    const getStatusColor = () => {
      switch (saveStatus) {
        case 'saving': return 'bg-yellow-100 text-yellow-700';
        case 'saved': return 'bg-green-100 text-green-700';
        case 'error': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    const getStatusIcon = () => {
      switch (saveStatus) {
        case 'saving': return '💾';
        case 'saved': return '✅';
        case 'error': return '❌';
        default: return '💾';
      }
    };

    const getStatusText = () => {
      switch (saveStatus) {
        case 'saving': return 'Saving...';
        case 'saved': return lastSaveTime ? `Saved at ${lastSaveTime.toLocaleTimeString()}` : 'Saved';
        case 'error': return 'Save failed';
        default: return 'Ready';
      }
    };

    return (
      <div className={`px-2 py-1 rounded text-sm ${getStatusColor()}`}>
        <span className="mr-1">{getStatusIcon()}</span>
        {getStatusText()}
        {storageError && (
          <div className="text-xs text-red-600 mt-1" title={storageError}>
            <FaExclamationTriangle className="inline mr-1" />
            {storageError.substring(0, 30)}...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 h-screen flex">
      {/* Sidebar */}
      <div className={`${showNotesList ? 'w-1/3' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">📝 Text Notes</h2>
            <button
              onClick={() => setShowNotesList(!showNotesList)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              {showNotesList ? '⬅️' : '➡️'}
            </button>
          </div>
          
          <button
            onClick={createNewNote}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors mb-4"
          >
            ✨ New Note
          </button>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mb-4"
          />

          {/* Active Filters Display */}
          {(selectedTags.length > 0 || searchQuery) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                  title="Clear all filters"
                >
                  Clear All ✕
                </button>
              </div>
              
              {searchQuery && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Search: "{searchQuery}"
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-red-500 hover:text-red-700 text-xs"
                    title="Remove search filter"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {selectedTags.map(tag => (
                <div key={tag} className="flex items-center gap-1 mb-1">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Tag: {tag}
                  </span>
                  <button
                    onClick={() => removeFilter(tag)}
                    className="text-red-500 hover:text-red-700 text-xs"
                    title="Remove this filter"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tag Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by Tags:</label>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <div key={tag} className="flex items-center bg-gray-100 rounded">
                  <button
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-xs rounded-l ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag);
                    }}
                    disabled={isDeletingTag}
                    className={`px-1 py-1 rounded-r transition-colors ${
                      isDeletingTag 
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100' 
                        : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    }`}
                    title={isDeletingTag ? "Deleting..." : "Delete tag"}
                  >
                    {isDeletingTag ? (
                      <div className="w-3 h-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                    ) : (
                      <FaTrash className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Storage status warning */}
          {!isStorageAvailableFlag && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded">
              <div className="text-xs text-red-700">
                <FaExclamationTriangle className="inline mr-1" />
                localStorage unavailable - notes won't be saved
              </div>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              {notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                className={`p-3 mb-2 border rounded-lg cursor-pointer transition-colors ${
                  currentNote?.id === note.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => loadNote(note)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    <p className="text-xs text-gray-500">
                      {note.folder} • {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                    </p>
                    {note.fileName && (
                      <p className="text-xs text-blue-600">
                        📎 {note.fileName}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {note.tags?.map(tag => (
                        <span key={tag} className="px-1 py-0.5 text-xs bg-gray-200 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder="Note title..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-xl font-bold bg-transparent border-none focus:outline-none flex-1"
            />
            <div className="flex items-center gap-2">
              {/* Manual Save Button (Subtask 15.4) */}
              <button
                onClick={handleManualSave}
                disabled={isSaving || !noteTitle.trim() || !isStorageAvailableFlag}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isSaving || !noteTitle.trim() || !isStorageAvailableFlag
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title={!isStorageAvailableFlag ? 'localStorage not available' : 'Save note manually'}
              >
                <FaSave className="w-3 h-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              
              {/* Save Status Indicator (Subtask 15.5) */}
              <SaveStatusIndicator />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={onBoldClick} className="p-2 border rounded hover:bg-gray-100" title="Bold">
              <strong>B</strong>
            </button>
            <button onClick={onItalicClick} className="p-2 border rounded hover:bg-gray-100" title="Italic">
              <em>I</em>
            </button>
            <button onClick={onUnderlineClick} className="p-2 border rounded hover:bg-gray-100" title="Underline">
              <u>U</u>
            </button>
            <button onClick={onHeaderClick} className="p-2 border rounded hover:bg-gray-100" title="Header">
              H
            </button>
            <button onClick={onBulletListClick} className="p-2 border rounded hover:bg-gray-100" title="Bullet List">
              •
            </button>
            <button onClick={onNumberedListClick} className="p-2 border rounded hover:bg-gray-100" title="Numbered List">
              1.
            </button>
            
            <div className="border-l border-gray-300 h-6 mx-2"></div>
            
            <button
              onClick={toggleMarkdownMode}
              className={`p-2 border rounded hover:bg-gray-100 ${isMarkdownMode ? 'bg-blue-100' : ''}`}
              title="Toggle Markdown Mode"
            >
              MD
            </button>

            <div className="border-l border-gray-300 h-6 mx-2"></div>

            <button onClick={exportToMarkdown} className="p-2 border rounded hover:bg-gray-100" title="Export as Markdown">
              📄
            </button>
            <button onClick={exportToPDF} className="p-2 border rounded hover:bg-gray-100" title="Print/Export as PDF">
              🖨️
            </button>
          </div>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Folder Selection */}
            <div className="flex items-center gap-2">
              <label>📁 Folder:</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1"
              >
                {folders.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="New folder"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                />
                <button onClick={addFolder} className="px-2 py-1 bg-gray-200 rounded text-sm">+</button>
              </div>
            </div>

            {/* File Association */}
            <div className="flex items-center gap-2">
              <label>📎 File:</label>
              <select
                value={selectedFileForAssociation || ''}
                onChange={(e) => setSelectedFileForAssociation(e.target.value || null)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">No file</option>
                {availableFiles.map(file => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2">
              <label>🏷️ Tags:</label>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => e.target.value && toggleTag(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Add tag...</option>
                {tags.filter(tag => !selectedTags.includes(tag)).map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="New tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                />
                <button onClick={addTag} className="px-2 py-1 bg-gray-200 rounded text-sm">+</button>
              </div>
            </div>

            {/* Word Count */}
            <div className="text-gray-500">
              📊 {wordCount} words, {characterCount} characters
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden">
          {isMarkdownMode ? (
            <div className="h-full flex">
              <div className="w-1/2 p-4 border-r border-gray-200">
                <textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="Write in Markdown..."
                  className="w-full h-full resize-none border-none focus:outline-none font-mono"
                />
              </div>
              <div className="w-1/2 p-4 overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose max-w-none">
                  {markdownContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="h-full p-4 overflow-y-auto">
              <Editor
                editorState={editorState}
                onChange={setEditorState}
                handleKeyCommand={handleKeyCommand}
                placeholder="Start writing your note..."
                spellCheck={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText="Delete Tag"
        cancelText="Cancel"
        onConfirm={confirmDeleteTag}
        onCancel={cancelDeleteTag}
      />

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default TextNotesWithLocalStorage;