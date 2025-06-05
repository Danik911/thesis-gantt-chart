import React, { useState, useEffect } from 'react';
import unifiedNotesService from '../services/UnifiedNotesService';

const PDFNotesPanel = ({ fileId, fileName, onClose, onNotesChanged, className = '' }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({
    noteType: 'pdf-note',
    type: 'general',
    title: '',
    content: '',
    tags: []
  });

  const noteTypes = [
    { value: 'abstract', label: 'Abstract', icon: '📄', color: 'bg-blue-100 text-blue-800' },
    { value: 'thoughts', label: 'Thoughts', icon: '💭', color: 'bg-purple-100 text-purple-800' },
    { value: 'citation', label: 'Citation', icon: '📚', color: 'bg-green-100 text-green-800' },
    { value: 'general', label: 'General', icon: '📝', color: 'bg-yellow-100 text-yellow-800' }
  ];

  useEffect(() => {
    if (fileId) {
      loadNotes();
    }
  }, [fileId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const fileNotes = await unifiedNotesService.getNotesForFile(fileId);
      setNotes(fileNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.title.trim() && !newNote.content.trim()) {
      return;
    }

    try {
      const noteData = {
        ...newNote,
        type: 'file-associated',
        noteType: 'pdf-note',
        fileId: fileId,
        fileName: fileName,
        fileType: 'pdf',
        tags: newNote.tags.filter(tag => tag.trim() !== '')
      };

      const addedNote = await unifiedNotesService.createNote(noteData);
      setNotes(prev => [addedNote, ...prev]);
      setNewNote({ noteType: 'pdf-note', type: 'general', title: '', content: '', tags: [] });
      setShowAddForm(false);
      
      // Notify parent component
      if (onNotesChanged) {
        onNotesChanged();
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
    }
  };

  // ... rest of component continues ...
};

export default PDFNotesPanel;