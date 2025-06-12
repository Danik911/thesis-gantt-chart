import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, ContentState, getDefaultKeyBinding, KeyBindingUtil } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FaBold, FaItalic, FaUnderline, FaListUl, FaListOl, FaHeading,
  FaCode, FaQuoteLeft, FaUndo, FaRedo, FaSave, FaFileExport,
  FaMarkdown, FaEye, FaKeyboard, FaTimes, FaExpand, FaCompress, FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNotes } from '../contexts/NotesContext';
import { useAuth } from '../contexts/AuthContext';
import AssociationSelector from './AssociationSelector';
import 'draft-js/dist/Draft.css';
import firebaseNotesService from '../services/FirebaseNotesService';

const { hasCommandModifier } = KeyBindingUtil;

const NotesEditor = ({ note, onClose, isFullscreen = false, onToggleFullscreen }) => {
  const {
    updateNote,
    createNote,
    loading,
    availableFiles,
    folders,
    tags: availableTags
  } = useNotes();

  const { user } = useAuth();

  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [title, setTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('/General');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [associatedFile, setAssociatedFile] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const editorRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Initialize editor with note data
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setSelectedTags(note.tags || []);
      setSelectedFolder(note.folderPath || '/General');
      setAssociatedFile(note.fileId || null);
      setIsMarkdownMode(!!note.markdownContent);
      setMarkdownContent(note.markdownContent || '');

      if (note.content) {
        try {
          let contentState;
          if (typeof note.content === 'object') {
            // DraftJS raw object
            contentState = convertFromRaw(note.content);
          } else {
            // Treat as plain text (e.g., pdf-note)
            contentState = ContentState.createFromText(String(note.content));
          }
          setEditorState(EditorState.createWithContent(contentState));
        } catch (error) {
          console.error('Error loading note content:', error);
          setEditorState(EditorState.createEmpty());
        }
      } else {
        setEditorState(EditorState.createEmpty());
      }
    }
  }, [note]);

  // Character and word count
  const { characterCount, wordCount } = useMemo(() => {
    const contentState = editorState.getCurrentContent();
    const text = contentState.getPlainText('');
    return {
      characterCount: text.length,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0
    };
  }, [editorState]);

  // Auto-save functionality
  const saveNote = useCallback(async () => {
    if (!title.trim()) {
      toast.warning('Please enter a title for your note');
      return false;
    }

    try {
      setAutoSaveStatus('saving');
      
      const contentState = editorState.getCurrentContent();
      const rawContent = convertToRaw(contentState);
      const htmlContent = stateToHTML(contentState);
      
      const noteData = {
        title: title.trim(),
        content: rawContent,
        htmlContent,
        markdownContent: isMarkdownMode ? markdownContent : '',
        tags: selectedTags,
        folderPath: selectedFolder,
        characterCount,
        wordCount,
        fileId: associatedFile,
        type: 'standalone',
        noteType: 'text'
      };

      if (note?.id) {
        await updateNote(note.id, noteData);
      } else {
        await createNote(noteData);
      }

      setAutoSaveStatus('saved');
      toast.success('Note saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      setAutoSaveStatus('error');
      toast.error('Failed to save note');
      return false;
    }
  }, [editorState, title, selectedTags, selectedFolder, markdownContent, isMarkdownMode, 
      characterCount, wordCount, associatedFile, note, updateNote, createNote]);

  // Auto-save effect
  useEffect(() => {
    if (title.trim() && (note?.id || editorState.getCurrentContent().hasText())) {
      setAutoSaveStatus('pending');
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveNote();
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editorState, title, selectedTags, selectedFolder, markdownContent, saveNote, note]);

  // Custom key bindings for keyboard shortcuts
  const keyBindingFn = (e) => {
    if (e.keyCode === 83 && hasCommandModifier(e)) return 'save-note';
    if (e.keyCode === 75 && hasCommandModifier(e)) return 'show-shortcuts';
    if (e.keyCode === 77 && hasCommandModifier(e)) return 'toggle-markdown';
    if (e.keyCode === 80 && hasCommandModifier(e)) return 'toggle-preview';
    if (e.keyCode === 27) return 'close-editor';
    return getDefaultKeyBinding(e);
  };

  const handleKeyCommand = (command, editorState) => {
    switch (command) {
      case 'save-note':
        saveNote();
        return 'handled';
      case 'show-shortcuts':
        setShowKeyboardShortcuts(true);
        return 'handled';
      case 'toggle-markdown':
        toggleMarkdownMode();
        return 'handled';
      case 'toggle-preview':
        setIsPreviewMode(!isPreviewMode);
        return 'handled';
      case 'close-editor':
        onClose && onClose();
        return 'handled';
    }

    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const toggleMarkdownMode = () => {
    if (isMarkdownMode) {
      try {
        const contentState = stateFromHTML(markdownContent);
        setEditorState(EditorState.createWithContent(contentState));
      } catch (error) {
        console.error('Error converting markdown:', error);
      }
    } else {
      const content = editorState.getCurrentContent().getPlainText('');
      setMarkdownContent(content);
    }
    setIsMarkdownMode(!isMarkdownMode);
    setIsPreviewMode(false);
  };

  // Handle creation of new folder from dropdown
  const handleFolderChange = async (value) => {
    if (value === '__create_new__') {
      const folderName = prompt('Enter new folder name');
      if (!folderName) return;
      const path = folderName.startsWith('/') ? folderName : `/${folderName}`;
      try {
        await firebaseNotesService.createFolder({ name: folderName, path }, user?.uid);
        toast.success('Folder created');
        setSelectedFolder(path);
      } catch (err) {
        toast.error(err.message || 'Failed to create folder');
      }
    } else {
      setSelectedFolder(value);
    }
  };

  return (
    <div className={`notes-editor ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter note title..."
          className="text-xl font-semibold border-none outline-none bg-transparent flex-1"
        />
        
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {autoSaveStatus === 'saving' && '💾 Saving...'}
            {autoSaveStatus === 'saved' && '✅ Saved'}
            {autoSaveStatus === 'error' && '❌ Error'}
          </div>
          
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Keyboard shortcuts (Ctrl+K)"
          >
            <FaKeyboard />
          </button>
          
          <button
            onClick={saveNote}
            disabled={loading || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <FaSave className="w-4 h-4" />
            <span>Save</span>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-1">
          <button onClick={() => setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'))} className="p-2 hover:bg-gray-200 rounded">
            <FaBold className={editorState.getCurrentInlineStyle().has('BOLD') ? 'text-blue-600' : 'text-gray-600'} />
          </button>
          <button onClick={() => setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'))} className="p-2 hover:bg-gray-200 rounded">
            <FaItalic className={editorState.getCurrentInlineStyle().has('ITALIC') ? 'text-blue-600' : 'text-gray-600'} />
          </button>
          <button onClick={() => setEditorState(RichUtils.toggleInlineStyle(editorState, 'UNDERLINE'))} className="p-2 hover:bg-gray-200 rounded">
            <FaUnderline className={editorState.getCurrentInlineStyle().has('UNDERLINE') ? 'text-blue-600' : 'text-gray-600'} />
          </button>
          
          <div className="border-l border-gray-300 mx-2 h-6"></div>
          
          <button onClick={() => setEditorState(RichUtils.toggleBlockType(editorState, 'header-two'))} className="p-2 hover:bg-gray-200 rounded">
            <FaHeading className="text-gray-600" />
          </button>
          <button onClick={() => setEditorState(RichUtils.toggleBlockType(editorState, 'unordered-list-item'))} className="p-2 hover:bg-gray-200 rounded">
            <FaListUl className="text-gray-600" />
          </button>
          <button onClick={() => setEditorState(RichUtils.toggleBlockType(editorState, 'ordered-list-item'))} className="p-2 hover:bg-gray-200 rounded">
            <FaListOl className="text-gray-600" />
          </button>
          
          <div className="border-l border-gray-300 mx-2 h-6"></div>
          
          <button
            onClick={toggleMarkdownMode}
            className={`p-2 hover:bg-gray-200 rounded ${isMarkdownMode ? 'text-blue-600 bg-blue-100' : 'text-gray-600'}`}
          >
            <FaMarkdown />
          </button>
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`p-2 hover:bg-gray-200 rounded ${isPreviewMode ? 'text-blue-600 bg-blue-100' : 'text-gray-600'}`}
          >
            <FaEye />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col ${isPreviewMode ? 'border-r border-gray-200' : ''}`}>
          {/* Metadata */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                <select
                  value={selectedFolder}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {folders.map(folder => (
                    <option key={folder.path} value={folder.path}>{folder.name}</option>
                  ))}
                  <option value="__create_new__">➕ Create new folder…</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <select
                    onChange={async (e) => {
                      const value = e.target.value;
                      if (!value) return;
                      if (value === '__create_new__') {
                        const newTag = prompt('Enter new tag name');
                        if (newTag && !selectedTags.includes(newTag)) {
                          try {
                            await firebaseNotesService.createTagsIfNotExist([newTag], user.uid);
                            setSelectedTags([...selectedTags, newTag]);
                          } catch (err) {
                            toast.error(err.message || 'Failed to create tag');
                          }
                        }
                      } else {
                        setSelectedTags([...selectedTags, value]);
                      }
                    }}
                    value=""
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="">Add tag...</option>
                    {availableTags
                      .map(t => t.name)
                      .filter(tagName => !selectedTags.includes(tagName))
                      .map(tagName => (
                        <option key={tagName} value={tagName}>{tagName}</option>
                      ))}
                    <option value="__create_new__">➕ Create new tag…</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-4 overflow-auto">
            {isMarkdownMode ? (
              <textarea
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                className="w-full h-full border-none outline-none resize-none font-mono text-sm"
                placeholder="Type your markdown here..."
              />
            ) : (
              <div className="min-h-full border border-gray-200 rounded p-4">
                <Editor
                  editorState={editorState}
                  onChange={setEditorState}
                  handleKeyCommand={handleKeyCommand}
                  keyBindingFn={keyBindingFn}
                  placeholder="Start typing your note..."
                />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
            Words: {wordCount} | Characters: {characterCount}
          </div>
        </div>

        {/* Preview Panel */}
        {isPreviewMode && (
          <div className="w-1/2 p-4 overflow-auto bg-white">
            <h3 className="text-lg font-semibold mb-4">Preview</h3>
            {isMarkdownMode ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                {markdownContent}
              </ReactMarkdown>
            ) : (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: stateToHTML(editorState.getCurrentContent())
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Save note</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">Ctrl+S</span></div>
              <div className="flex justify-between"><span>Bold</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">Ctrl+B</span></div>
              <div className="flex justify-between"><span>Italic</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">Ctrl+I</span></div>
              <div className="flex justify-between"><span>Toggle Markdown</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">Ctrl+M</span></div>
              <div className="flex justify-between"><span>Toggle Preview</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">Ctrl+P</span></div>
              <div className="flex justify-between"><span>Close editor</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">Esc</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesEditor; 