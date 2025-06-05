import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import unifiedNotesService from '../services/UnifiedNotesService';
import 'draft-js/dist/Draft.css';

const TextNotes = () => {
  // ... existing state variables ...
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

  // ... rest of component (continuing in next file due to size limit)