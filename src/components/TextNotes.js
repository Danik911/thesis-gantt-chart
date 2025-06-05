import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaTrash } from 'react-icons/fa';
import unifiedNotesService from '../services/UnifiedNotesService';
import 'draft-js/dist/Draft.css';

const TextNotes = () => {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [folders, setFolders] = useState(['General', 'Research', 'Ideas', 'Tasks']);
  const [selectedFolder, setSelectedFolder] = useState('General');
  const [newFolder, setNewFolder] = useState('');
  const [showNotesList, setShowNotesList] = useState(true);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFileForAssociation, setSelectedFileForAssociation] = useState(null);

  // Character and word count
  const { characterCount, wordCount } = useMemo(() => {
    const contentState = editorState.getCurrentContent();
    const text = contentState.getPlainText('');
    return {
      characterCount: text.length,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0
    };
  }, [editorState]);

  // Load notes and data from unified service
  useEffect(() => {
    const initializeData = async () => {
      try {
        await unifiedNotesService.initialize();
        await loadNotes();
        await loadTags();
        await loadFolders();
        await loadAvailableFiles();
      } catch (error) {
        console.error('Error initializing notes:', error);
      }
    };
    
    initializeData();
  }, []);

  const loadNotes = async () => {
    try {
      const standaloneNotes = await unifiedNotesService.getStandaloneNotes();
      setNotes(standaloneNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadTags = async () => {
    try {
      const availableTags = await unifiedNotesService.getTags();
      setTags(availableTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const availableFolders = await unifiedNotesService.getFolders();
      setFolders(availableFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadAvailableFiles = async () => {
    try {
      // Get files from the file storage (you may need to adjust this based on your file storage service)
      const fileStorage = JSON.parse(localStorage.getItem('fileStorage') || '[]');
      setAvailableFiles(fileStorage);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Move saveCurrentNote function declaration before useEffect that uses it
  const saveCurrentNote = useCallback(async () => {
    if (!noteTitle.trim()) return;

    try {
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

      let savedNote;
      if (currentNote) {
        savedNote = await unifiedNotesService.updateNote(currentNote.id, noteData);
      } else {
        savedNote = await unifiedNotesService.createNote(noteData);
      }

      setCurrentNote(savedNote);
      await loadNotes();
      
      // Update tags if new ones were added
      for (const tag of selectedTags) {
        if (!tags.includes(tag)) {
          await unifiedNotesService.createTag(tag);
        }
      }
      await loadTags();

    } catch (error) {
      console.error('Error saving note:', error);
    }
  }, [editorState, noteTitle, selectedTags, selectedFolder, markdownContent, isMarkdownMode, characterCount, wordCount, currentNote, selectedFileForAssociation, availableFiles, tags]);

  // Auto-save functionality
  useEffect(() => {
    if (currentNote && noteTitle.trim()) {
      setAutoSaveStatus('saving');
      const timer = setTimeout(async () => {
        await saveCurrentNote();
        setAutoSaveStatus('saved');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [editorState, noteTitle, selectedTags, selectedFolder, markdownContent, currentNote, saveCurrentNote]);

  const createNewNote = () => {
    setCurrentNote(null);
    setEditorState(EditorState.createEmpty());
    setNoteTitle('');
    setSelectedTags([]);
    setMarkdownContent('');
    setIsMarkdownMode(false);
    setSelectedFolder('General');
    setSelectedFileForAssociation(null);
  };

  const loadNote = (note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setSelectedTags(note.tags || []);
    setSelectedFolder(note.folder || 'General');
    setIsMarkdownMode(!!note.markdownContent);
    setMarkdownContent(note.markdownContent || '');
    setSelectedFileForAssociation(note.fileId);
    
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
        await unifiedNotesService.deleteNote(noteId);
        await loadNotes();
        
        if (currentNote?.id === noteId) {
          createNewNote();
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const addTag = async () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      try {
        await unifiedNotesService.createTag(newTag.trim());
        await loadTags();
        setNewTag('');
      } catch (error) {
        console.error('Error adding tag:', error);
      }
    }
  };

  const addFolder = async () => {
    if (newFolder.trim() && !folders.includes(newFolder.trim())) {
      try {
        await unifiedNotesService.createFolder(newFolder.trim());
        await loadFolders();
        setNewFolder('');
      } catch (error) {
        console.error('Error adding folder:', error);
      }
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // NEW: Clear all applied tag filters
  const clearAllFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  // NEW: Remove a specific applied filter
  const removeFilter = (tag) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleDeleteTag = async (tagName) => {
    // Placeholder for tag deletion - will be implemented in later subtasks
    console.log('Delete tag:', tagName);
  };

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

          {/* Active Filters Display with Delete Options */}
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
              
              {/* Search filter */}
              {searchQuery && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Search: &quot;{searchQuery}&quot;
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
              
              {/* Tag filters */}
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
                    className="px-1 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-r transition-colors"
                    title="Delete tag"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
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
                      {note.folder} • {new Date(note.updatedAt).toLocaleDateString()}
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
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className={`px-2 py-1 rounded ${
                autoSaveStatus === 'saved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {autoSaveStatus === 'saved' ? '✅ Saved' : '💾 Saving...'}
              </span>
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
    </div>
  );
};

export default TextNotes;