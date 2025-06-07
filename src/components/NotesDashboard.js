import React, { useState, useEffect, useMemo } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaSearch, 
  FaPlus, 
  FaFolder, 
  FaTag, 
  FaEdit, 
  FaTrash, 
  FaFilter,
  FaTh,
  FaList,
  FaSort,
  FaChevronDown,
  FaChevronRight,
  FaTimes,
  FaExpand,
  FaCompress
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import NotesEditor from './NotesEditor';

const NotesDashboard = () => {
  const { user } = useAuth();
  const {
    notes,
    folders,
    tags,
    currentNote,
    selectedFolder,
    selectedTags,
    searchQuery,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    setSearchQuery,
    setSelectedFolder,
    setSelectedTags,
    setCurrentNote,
    clearError,
    getNotesByFolder,
    getNotesCountByFolder
  } = useNotes();

  // Local UI state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt', 'createdAt', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/General']));
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [selectedNotesForBulk, setSelectedNotesForBulk] = useState(new Set());

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !showSidebar) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSidebar]);

  // Clear error when component mounts
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Filtered and sorted notes
  const filteredAndSortedNotes = useMemo(() => {
    let filtered = [...notes];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.searchableText?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply folder filter
    if (selectedFolder) {
      filtered = filtered.filter(note => note.folderPath === selectedFolder);
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note => 
        selectedTags.every(tag => note.tags?.includes(tag))
      );
    }

    // Sort notes
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
          bValue = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt);
          break;
        default: // updatedAt
          aValue = new Date(a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : a.updatedAt);
          bValue = new Date(b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : b.updatedAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [notes, searchQuery, selectedFolder, selectedTags, sortBy, sortOrder]);

  // Folder tree structure
  const folderTree = useMemo(() => {
    const tree = {};
    folders.forEach(folder => {
      const parts = folder.path.split('/').filter(part => part);
      let current = tree;
      
      parts.forEach((part, index) => {
        const path = '/' + parts.slice(0, index + 1).join('/');
        if (!current[part]) {
          current[part] = {
            name: part,
            path: path,
            children: {},
            count: 0
          };
        }
        current = current[part].children;
      });
    });

    // Add note counts
    const noteCounts = getNotesCountByFolder();
    const addCounts = (node) => {
      node.count = noteCounts[node.path] || 0;
      Object.values(node.children).forEach(addCounts);
    };
    
    Object.values(tree).forEach(addCounts);
    
    return tree;
  }, [folders, getNotesCountByFolder]);

  // Handlers
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) {
      toast.error('Please enter a note title');
      return;
    }

    try {
      const noteData = {
        title: newNoteTitle,
        content: '',
        folderPath: selectedFolder || '/General',
        tags: [],
        type: 'standalone',
        noteType: 'text'
      };

      const newNote = await createNote(noteData);
      setNewNoteTitle('');
      setShowCreateNote(false);
      setCurrentNote(newNote);
      setShowEditor(true);
      toast.success('Note created successfully');
    } catch (error) {
      toast.error('Failed to create note');
    }
  };

  const handleCreateNewNote = () => {
    setCurrentNote(null);
    setShowEditor(true);
    setShowCreateNote(false);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(noteId);
        toast.success('Note deleted successfully');
      } catch (error) {
        toast.error('Failed to delete note');
      }
    }
  };

  const handleFolderClick = (folderPath) => {
    if (selectedFolder === folderPath) {
      setSelectedFolder(null);
    } else {
      setSelectedFolder(folderPath);
    }
  };

  const handleTagClick = (tag) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
  };

  const toggleFolderExpanded = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date?.seconds ? date.seconds * 1000 : date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderFolderTree = (tree, level = 0) => {
    return Object.values(tree).map(folder => (
      <div key={folder.path} style={{ marginLeft: `${level * 20}px` }}>
        <div 
          className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 rounded ${
            selectedFolder === folder.path ? 'bg-blue-100 text-blue-700' : ''
          }`}
          onClick={() => handleFolderClick(folder.path)}
        >
          {Object.keys(folder.children).length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpanded(folder.path);
              }}
              className="mr-1"
            >
              {expandedFolders.has(folder.path) ? <FaChevronDown /> : <FaChevronRight />}
            </button>
          )}
          <FaFolder className="mr-2 text-yellow-600" />
          <span className="flex-1">{folder.name}</span>
          <span className="text-sm text-gray-500">({folder.count})</span>
        </div>
        {expandedFolders.has(folder.path) && renderFolderTree(folder.children, level + 1)}
      </div>
    ));
  };

  const renderNoteCard = (note) => (
    <div
      key={note.id}
      className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        currentNote?.id === note.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={() => {
        setCurrentNote(note);
        setShowEditor(true);
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-800 truncate flex-1">{note.title}</h3>
        <div className="flex space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentNote(note);
              setShowEditor(true);
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNote(note.id);
            }}
            className="text-red-600 hover:text-red-800"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {note.content ? (typeof note.content === 'string' ? note.content : 'Rich text content') : 'No content'}
      </p>
      
      <div className="flex flex-wrap gap-1 mb-2">
        {note.tags?.map(tag => (
          <span
            key={tag}
            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{note.folderPath}</span>
        <span>{formatDate(note.updatedAt)}</span>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        {note.characterCount} chars • {note.wordCount} words
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Please sign in to access your notes.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'block' : 'hidden'} ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'} w-64 bg-white shadow-lg flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Notes</h2>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCreateNote(true)}
            className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <FaPlus className="mr-2" />
            New Note
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Folders */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Folders</h3>
            <div className="space-y-1">
              {renderFolderTree(folderTree)}
            </div>
          </div>

          {/* Tags */}
          <div className="p-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.name)}
                  className={`inline-block text-xs px-2 py-1 rounded-full ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag.name} ({tag.usageCount || 0})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isMobile && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FaFilter />
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-800">
                {selectedFolder ? `Notes in ${selectedFolder}` : 'All Notes'} 
                <span className="text-sm text-gray-500 ml-2">({filteredAndSortedNotes.length})</span>
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                >
                  <FaTh />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  <FaList />
                </button>
              </div>

              {/* Sort Options */}
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('_');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="updatedAt_desc">Last Modified</option>
                <option value="createdAt_desc">Newest First</option>
                <option value="createdAt_asc">Oldest First</option>
                <option value="title_asc">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedFolder || selectedTags.length > 0 || searchQuery) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedFolder && (
                <span className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  <FaFolder className="mr-1" />
                  {selectedFolder}
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              )}
              {selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                  <FaTag className="mr-1" />
                  {tag}
                  <button
                    onClick={() => handleTagClick(tag)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              ))}
              {searchQuery && (
                <span className="inline-flex items-center bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                  <FaSearch className="mr-1" />
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <FaTimes size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notes Grid/List */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAndSortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FaFolder size={48} className="mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notes found</h3>
              <p className="text-center">
                {searchQuery || selectedFolder || selectedTags.length > 0
                  ? 'Try adjusting your filters or search terms.'
                  : 'Create your first note to get started.'}
              </p>
              <button
                onClick={() => setShowCreateNote(true)}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Note
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'
            }>
              {filteredAndSortedNotes.map(renderNoteCard)}
            </div>
          )}
        </div>
      </div>

      {/* Create Note Modal */}
      {showCreateNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
            <input
              type="text"
              placeholder="Enter note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateNote()}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-between">
              <button
                onClick={handleCreateNewNote}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                Start Writing
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateNote(false);
                    setNewNoteTitle('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNote}
                  disabled={!newNoteTitle.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create & Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Editor Modal */}
      {showEditor && (
        <div className={`${isEditorFullscreen ? '' : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'}`}>
          <div className={`${isEditorFullscreen ? 'fixed inset-0 z-50' : 'bg-white rounded-lg w-full max-w-6xl mx-4 h-5/6 max-h-screen'}`}>
            <NotesEditor
              note={currentNote}
              onClose={() => {
                setShowEditor(false);
                setCurrentNote(null);
                setIsEditorFullscreen(false);
              }}
              isFullscreen={isEditorFullscreen}
              onToggleFullscreen={() => setIsEditorFullscreen(!isEditorFullscreen)}
            />
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};

export default NotesDashboard; 