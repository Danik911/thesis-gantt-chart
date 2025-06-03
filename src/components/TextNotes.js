import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, getDefaultKeyBinding, KeyBindingUtil } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [viewMode, setViewMode] = useState('editor'); // 'editor', 'preview', 'split'
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [folders, setFolders] = useState(['General', 'Research', 'Ideas', 'Tasks']);
  const [selectedFolder, setSelectedFolder] = useState('General');
  const [newFolder, setNewFolder] = useState('');
  const [showNotesList, setShowNotesList] = useState(true);

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('textNotes');
    const savedTags = localStorage.getItem('noteTags');
    const savedFolders = localStorage.getItem('noteFolders');
    
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    }
    
    if (savedTags) {
      try {
        setTags(JSON.parse(savedTags));
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    }
    
    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    }
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (currentNote && noteTitle.trim()) {
      setAutoSaveStatus('saving');
      const timer = setTimeout(() => {
        saveCurrentNote();
        setAutoSaveStatus('saved');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [editorState, noteTitle, selectedTags, selectedFolder, markdownContent]);

  // Character and word count
  const { characterCount, wordCount } = useMemo(() => {
    const contentState = editorState.getCurrentContent();
    const text = contentState.getPlainText('');
    return {
      characterCount: text.length,
      wordCount: text.trim() ? text.trim().split(/\s+/).length : 0
    };
  }, [editorState]);

  const saveCurrentNote = useCallback(() => {
    if (!noteTitle.trim()) return;

    const contentState = editorState.getCurrentContent();
    const rawContent = convertToRaw(contentState);
    const htmlContent = stateToHTML(contentState);
    
    const noteData = {
      id: currentNote?.id || Date.now(),
      title: noteTitle,
      content: rawContent,
      htmlContent,
      markdownContent: isMarkdownMode ? markdownContent : '',
      tags: selectedTags,
      folder: selectedFolder,
      createdAt: currentNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      characterCount,
      wordCount
    };

    const updatedNotes = currentNote 
      ? notes.map(note => note.id === currentNote.id ? noteData : note)
      : [...notes, noteData];

    setNotes(updatedNotes);
    setCurrentNote(noteData);
    localStorage.setItem('textNotes', JSON.stringify(updatedNotes));
  }, [editorState, noteTitle, selectedTags, selectedFolder, markdownContent, isMarkdownMode, characterCount, wordCount, currentNote, notes]);

  const createNewNote = () => {
    if (currentNote && noteTitle.trim()) {
      saveCurrentNote();
    }
    setCurrentNote(null);
    setEditorState(EditorState.createEmpty());
    setNoteTitle('');
    setSelectedTags([]);
    setMarkdownContent('');
    setIsMarkdownMode(false);
    setSelectedFolder('General');
  };

  const loadNote = (note) => {
    if (currentNote && noteTitle.trim()) {
      saveCurrentNote();
    }
    
    setCurrentNote(note);
    setNoteTitle(note.title);
    setSelectedTags(note.tags || []);
    setSelectedFolder(note.folder || 'General');
    setIsMarkdownMode(!!note.markdownContent);
    setMarkdownContent(note.markdownContent || '');
    
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

  const deleteNote = (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      localStorage.setItem('textNotes', JSON.stringify(updatedNotes));
      
      if (currentNote?.id === noteId) {
        createNewNote();
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      localStorage.setItem('noteTags', JSON.stringify(updatedTags));
      setNewTag('');
    }
  };

  const addFolder = () => {
    if (newFolder.trim() && !folders.includes(newFolder.trim())) {
      const updatedFolders = [...folders, newFolder.trim()];
      setFolders(updatedFolders);
      localStorage.setItem('noteFolders', JSON.stringify(updatedFolders));
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

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.htmlContent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => note.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  const toggleMarkdownMode = () => {
    if (isMarkdownMode) {
      // Convert markdown to rich text
      const htmlContent = markdownContent; // You might want to convert markdown to HTML here
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

          {/* Tag Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by Tags:</label>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredNotes.map(note => (
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
          ))}
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