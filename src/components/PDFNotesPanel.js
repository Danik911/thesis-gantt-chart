import React, { useState, useEffect } from 'react';
import notesService from '../services/NotesService';

const PDFNotesPanel = ({ fileId, fileName, onClose, onNotesChanged, className = '' }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({
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
      const fileNotes = await notesService.getNotesForFile(fileId);
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
        tags: newNote.tags.filter(tag => tag.trim() !== '')
      };

      const addedNote = await notesService.addNote(fileId, noteData);
      setNotes(prev => [addedNote, ...prev]);
      setNewNote({ type: 'general', title: '', content: '', tags: [] });
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

  const handleUpdateNote = async (noteId, updates) => {
    try {
      const updatedNote = await notesService.updateNote(noteId, updates);
      setNotes(prev => prev.map(note => 
        note.id === noteId ? updatedNote : note
      ));
      setEditingNote(null);
      
      // Notify parent component
      if (onNotesChanged) {
        onNotesChanged();
      }
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await notesService.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      // Notify parent component
      if (onNotesChanged) {
        onNotesChanged();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeInfo = (type) => {
    return noteTypes.find(t => t.value === type) || noteTypes[3];
  };

  const handleTagInput = (value, isNewNote = true) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    if (isNewNote) {
      setNewNote(prev => ({ ...prev, tags }));
    }
    return tags;
  };

  const exportNotes = async () => {
    try {
      const exportData = await notesService.exportNotesForFile(fileId);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_notes.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting notes:', error);
      alert('Failed to export notes. Please try again.');
    }
  };

  return (
    <div className={`pdf-notes-panel bg-white border-l border-gray-200 ${className}`}>
      {/* Header */}
      <div className="notes-header bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          {fileName}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
          
          {notes.length > 0 && (
            <button
              onClick={exportNotes}
              className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
              title="Export notes"
            >
              📥
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="notes-content flex-1 overflow-y-auto">
        {/* Add Note Form */}
        {showAddForm && (
          <div className="add-note-form bg-blue-50 border-b border-gray-200 p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {noteTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter note title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your note content..."
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newNote.tags.join(', ')}
                  onChange={(e) => handleTagInput(e.target.value, true)}
                  placeholder="research, methodology, important..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddNote}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Note
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewNote({ type: 'general', title: '', content: '', tags: [] });
                  }}
                  className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="notes-list p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📝</div>
              <p className="text-gray-600">No notes yet</p>
              <p className="text-gray-500 text-sm">Add your first note to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map(note => {
                const typeInfo = getTypeInfo(note.type);
                const isEditing = editingNote?.id === note.id;

                return (
                  <div key={note.id} className="note-item bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(note.updatedAt)}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingNote(isEditing ? null : note)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingNote.title}
                          onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Note title..."
                        />
                        
                        <textarea
                          value={editingNote.content}
                          onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                          rows="4"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="Note content..."
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateNote(note.id, editingNote)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNote(null)}
                            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {note.title && (
                          <h4 className="font-medium text-gray-900 mb-2">{note.title}</h4>
                        )}
                        
                        {note.content && (
                          <p className="text-gray-700 text-sm whitespace-pre-wrap mb-2">
                            {note.content}
                          </p>
                        )}

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFNotesPanel; 