import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, InputGroup, Alert, Toast, ToastContainer } from 'react-bootstrap';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// Firebase imports
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';
// Association imports
import { useAssociations } from '../contexts/AssociationContext';
import AssociationSelector from './AssociationSelector';
import { 
  saveNotesToStorage, 
  loadNotesFromStorage, 
  createDebouncedSave,
  isLocalStorageAvailable,
  getStorageUsage
} from '../utils/notesStorage';
// Debounce hook import
import useDebounce from '../hooks/useDebounce';

// Task 15: Implement Notes Persistence System with Auto-Save and Manual Save
// Task 16: Implement File Association System for Notes and PDFs
// This component implements localStorage-based notes persistence + Firebase sync + file associations

const TextNotesWithLocalStorage = () => {
  // Subtask 15.1: Set Up State Management for Notes
  const [notes, setNotes] = useState({
    title: '',
    content: '',
    tags: [],
    folders: [],
    lastModified: Date.now()
  });
  
  // Firebase and Association states
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFileForAssociation, setSelectedFileForAssociation] = useState(null);
  const [associatedFile, setAssociatedFile] = useState(null);
  
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [folderInput, setFolderInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, available: 0 });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  
  // Association context
  const { 
    createAssociation, 
    removeAssociationByNoteId, 
    getAssociationByNoteId,
    loading: associationLoading,
    error: associationError 
  } = useAssociations();
  
  // Refs for editor
  const quillRef = useRef(null);

  // Load available files for association
  const loadAvailableFiles = useCallback(async () => {
    try {
      // Get files from localStorage (FileStorageService)
      const fileStorage = JSON.parse(localStorage.getItem('fileStorage') || '[]');
      setAvailableFiles(fileStorage);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }, []);

  // Check for existing associations
  const checkAssociation = useCallback(async () => {
    if (currentNoteId) {
      try {
        const association = await getAssociationByNoteId(currentNoteId);
        if (association) {
          const associatedFile = availableFiles.find(f => f.id === association.pdfId);
          setAssociatedFile(associatedFile);
          setSelectedFileForAssociation(association.pdfId);
        } else {
          setAssociatedFile(null);
          setSelectedFileForAssociation(null);
        }
      } catch (error) {
        console.error('Error checking association:', error);
      }
    }
  }, [currentNoteId, getAssociationByNoteId, availableFiles]);
  
  // Subtask 15.3: Create localStorage Save/Load Functions + Firebase sync
  const handleSaveToStorage = useCallback(async (notesData) => {
    try {
      setSaveStatus('saving');
      setErrorMessage('');
      
      // Save to localStorage first (existing functionality)
      const localResult = await saveNotesToStorage(notesData);
      
      if (localResult.success) {
        // Also save to Firebase
        try {
          // Base data for both new and existing notes
          const baseFirebaseData = {
            title: notesData.title,
            content: notesData.content,
            tags: notesData.tags || [],
            folders: notesData.folders || [],
            lastModified: localResult.timestamp,
            type: 'standalone',
            userId: 'anonymous', // For now, using anonymous user
            updatedAt: new Date()
          };

          if (currentNoteId) {
            // Update existing note - don't include createdAt to preserve original value
            const noteRef = doc(db, 'notes', currentNoteId);
            await updateDoc(noteRef, baseFirebaseData);
          } else {
            // Create new note - include createdAt for new documents
            const newNoteData = {
              ...baseFirebaseData,
              createdAt: new Date()
            };
            const docRef = await addDoc(collection(db, 'notes'), newNoteData);
            setCurrentNoteId(docRef.id);
          }
          
          console.log('Note saved to Firebase successfully at', new Date().toLocaleTimeString());
        } catch (firebaseError) {
          console.error('Firebase save error (continuing with localStorage):', firebaseError);
          // Don't fail the save if Firebase fails, localStorage is primary
        }
        
        setSaveStatus('saved');
        setLastSaveTime(localResult.timestamp);
        setStorageInfo(getStorageUsage());
        
        // Update last modified time
        setNotes(prev => ({
          ...prev,
          lastModified: localResult.timestamp
        }));
      } else {
        throw new Error(localResult.userMessage || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setErrorMessage(error.message || 'Failed to save notes');
      
      // Show error toast
      setToastMessage(error.message || 'Failed to save notes');
      setToastVariant('danger');
      setShowToast(true);
    }
  }, [currentNoteId]);

  // Handle file association
  const handleFileAssociation = useCallback(async (fileId) => {
    if (!currentNoteId) {
      setToastMessage('Please save the note first before associating with a file');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }

    try {
      if (fileId && fileId !== selectedFileForAssociation) {
        // Remove existing association if any
        await removeAssociationByNoteId(currentNoteId);
        
        // Create new association
        await createAssociation(currentNoteId, fileId);
        setSelectedFileForAssociation(fileId);
        
        const file = availableFiles.find(f => f.id === fileId);
        setAssociatedFile(file);
        
        setToastMessage(`Note associated with ${file?.name || 'file'}`);
        setToastVariant('success');
        setShowToast(true);
      } else if (!fileId) {
        // Clear association
        await removeAssociationByNoteId(currentNoteId);
        setSelectedFileForAssociation(null);
        setAssociatedFile(null);
        
        setToastMessage('File association removed');
        setToastVariant('info');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error managing file association:', error);
      setToastMessage('Failed to update file association');
      setToastVariant('danger');
      setShowToast(true);
    }
  }, [currentNoteId, selectedFileForAssociation, createAssociation, removeAssociationByNoteId, availableFiles]);
  
  const handleLoadFromStorage = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const result = await loadNotesFromStorage();
      
      if (result.success && result.data) {
        setNotes({
          title: result.data.title || '',
          content: result.data.content || '',
          tags: result.data.tags || [],
          folders: result.data.folders || [],
          lastModified: result.data.lastModified || Date.now()
        });
        
        if (result.timestamp) {
          setLastSaveTime(result.timestamp);
          setSaveStatus('saved');
        }
        
        setStorageInfo(getStorageUsage());
        
        // Show success toast for loaded notes
        if (result.data.title || result.data.content) {
          setToastMessage('Notes loaded successfully');
          setToastVariant('success');
          setShowToast(true);
        }
      }
    } catch (error) {
      console.error('Load error:', error);
      setErrorMessage('Failed to load saved notes');
      
      // Show error toast
      setToastMessage('Failed to load saved notes');
      setToastVariant('warning');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Subtask 15.2: Implement Auto-Save with Debouncing
  // Create a serialized version of notes for debouncing to prevent object recreation issues
  const notesForDebouncing = useMemo(() => {
    return JSON.stringify({
      title: notes.title,
      content: notes.content, 
      tags: notes.tags,
      folders: notes.folders
    });
  }, [notes.title, notes.content, notes.tags, notes.folders]);
  
  // Use the debounce hook with a 2-second delay
  const debouncedNotesString = useDebounce(notesForDebouncing, 2000);
  
  // Auto-save effect - only triggers when debounced value changes
  useEffect(() => {
    // Skip if still loading or if notes are empty
    if (isLoading) return;
    
    try {
      const debouncedNotes = JSON.parse(debouncedNotesString);
      
      // Only save if there's actual content
      if (debouncedNotes.title.trim() || debouncedNotes.content.trim()) {
        console.log('Auto-save triggered for notes change at', new Date().toLocaleTimeString());
        handleSaveToStorage(notes);
      }
    } catch (error) {
      console.error('Error parsing debounced notes:', error);
    }
  }, [debouncedNotesString, isLoading, notes, handleSaveToStorage]);
  
  // Subtask 15.6: Implement Notes Loading on App Startup
  useEffect(() => {
    handleLoadFromStorage();
    loadAvailableFiles();
  }, []); // Empty dependency array for component mount only

  // Load associations when note ID or available files change
  useEffect(() => {
    if (currentNoteId && availableFiles.length > 0) {
      checkAssociation();
    }
  }, [currentNoteId, availableFiles, checkAssociation]);
  
  // Subtask 15.4: Add Manual Save Button
  const handleManualSave = useCallback(async () => {
    // Validate notes before saving
    if (!notes.title.trim() && !notes.content.trim()) {
      setToastMessage('Please add a title or content before saving');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    
    try {
      await handleSaveToStorage(notes);
      
      // Show success toast
      setToastMessage('Notes saved manually');
      setToastVariant('success');
      setShowToast(true);
    } catch (error) {
      // Error handling is already done in handleSaveToStorage
    }
  }, [notes, handleSaveToStorage]);
  
  // Content change handlers
  const handleTitleChange = useCallback((e) => {
    setNotes(prev => ({
      ...prev,
      title: e.target.value
    }));
  }, []);
  
  const handleContentChange = useCallback((content) => {
    setNotes(prev => ({
      ...prev,
      content: content
    }));
  }, []);
  
  // Tag management
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !notes.tags.includes(tagInput.trim())) {
      setNotes(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  }, [tagInput, notes.tags]);
  
  const handleRemoveTag = useCallback((tagToRemove) => {
    setNotes(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);
  
  // Folder management
  const handleAddFolder = useCallback(() => {
    if (folderInput.trim() && !notes.folders.includes(folderInput.trim())) {
      setNotes(prev => ({
        ...prev,
        folders: [...prev.folders, folderInput.trim()]
      }));
      setFolderInput('');
    }
  }, [folderInput, notes.folders]);
  
  const handleRemoveFolder = useCallback((folderToRemove) => {
    setNotes(prev => ({
      ...prev,
      folders: prev.folders.filter(folder => folder !== folderToRemove)
    }));
  }, []);
  
  // Format storage size for display
  const formatStorageSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Subtask 15.5: Create Save Status Indicators
  const SaveStatusIndicator = () => {
    const getStatusIcon = () => {
      switch (saveStatus) {
        case 'saving':
          return (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              <span className="text-warning">Saving...</span>
            </>
          );
        case 'saved':
          return (
            <>
              <i className="bi bi-check-circle-fill text-success me-2"></i>
              <span className="text-success">Saved</span>
              {lastSaveTime && (
                <small className="text-muted ms-2">
                  at {formatTimestamp(lastSaveTime)}
                </small>
              )}
            </>
          );
        case 'error':
          return (
            <>
              <i className="bi bi-exclamation-circle-fill text-danger me-2"></i>
              <span className="text-danger">Error</span>
              {errorMessage && (
                <small className="text-danger ms-2">{errorMessage}</small>
              )}
            </>
          );
        default:
          return (
            <>
              <i className="bi bi-circle text-secondary me-2"></i>
              <span className="text-secondary">Ready</span>
            </>
          );
      }
    };
    
    return (
      <div className="d-flex align-items-center small">
        {getStatusIcon()}
      </div>
    );
  };
  
  // Storage info component
  const StorageInfo = () => {
    if (!isLocalStorageAvailable()) {
      return (
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          localStorage is not available. Notes will not persist between sessions.
        </Alert>
      );
    }
    
    const usagePercent = storageInfo.total > 0 ? (storageInfo.used / storageInfo.total) * 100 : 0;
    const isNearLimit = usagePercent > 80;
    
    return (
      <div className="mt-3">
        <small className="text-muted">
          Storage: {formatStorageSize(storageInfo.used)} used
          {storageInfo.total > 0 && (
            <> of {formatStorageSize(storageInfo.total)} ({usagePercent.toFixed(1)}%)</>
          )}
        </small>
        {isNearLimit && (
          <Alert variant="warning" className="mt-2 py-2">
            <small>
              <i className="bi bi-exclamation-triangle me-2"></i>
              Storage space is running low. Consider deleting old notes.
            </small>
          </Alert>
        )}
      </div>
    );
  };
  
  // Rich text editor modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ]
  };
  
  if (isLoading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your notes...</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container className="mt-4">
      <Row>
        <Col lg={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <i className="bi bi-journal-text me-2"></i>
                Text Notes
              </h4>
              <div className="d-flex align-items-center gap-3">
                <SaveStatusIndicator />
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleManualSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      Save Now
                    </>
                  )}
                </Button>
              </div>
            </Card.Header>
            
            <Card.Body>
              {/* Title Input */}
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={notes.title}
                  onChange={handleTitleChange}
                  placeholder="Enter note title..."
                  className="form-control-lg"
                />
              </Form.Group>
              
              {/* Content Editor Mode Toggle */}
              <div className="mb-3">
                <Form.Check 
                  type="switch"
                  id="markdown-switch"
                  label="Markdown Mode"
                  checked={isMarkdownMode}
                  onChange={(e) => setIsMarkdownMode(e.target.checked)}
                />
              </div>
              
              {/* Content Editor */}
              <Form.Group className="mb-3">
                <Form.Label>Content</Form.Label>
                {isMarkdownMode ? (
                  <Form.Control
                    as="textarea"
                    rows={15}
                    value={notes.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Write your notes in Markdown..."
                    className="font-monospace"
                  />
                ) : (
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={notes.content}
                    onChange={handleContentChange}
                    modules={quillModules}
                    placeholder="Write your notes here..."
                    style={{ height: '300px', marginBottom: '50px' }}
                  />
                )}
              </Form.Group>
              
              {/* Tags Section */}
              <Form.Group className="mb-3">
                <Form.Label>Tags</Form.Label>
                <InputGroup className="mb-2">
                  <Form.Control
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button variant="outline-secondary" onClick={handleAddTag}>
                    <i className="bi bi-plus"></i>
                  </Button>
                </InputGroup>
                <div className="d-flex flex-wrap gap-1">
                  {notes.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      bg="primary" 
                      className="d-flex align-items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        className="btn-close btn-close-white"
                        style={{ fontSize: '0.7em' }}
                        onClick={() => handleRemoveTag(tag)}
                        aria-label="Remove tag"
                      ></button>
                    </Badge>
                  ))}
                </div>
              </Form.Group>
              
              {/* Folders Section */}
              <Form.Group className="mb-3">
                <Form.Label>Folders</Form.Label>
                <InputGroup className="mb-2">
                  <Form.Control
                    type="text"
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                    placeholder="Add to folder..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFolder())}
                  />
                  <Button variant="outline-secondary" onClick={handleAddFolder}>
                    <i className="bi bi-plus"></i>
                  </Button>
                </InputGroup>
                <div className="d-flex flex-wrap gap-1">
                  {notes.folders.map((folder, index) => (
                    <Badge 
                      key={index} 
                      bg="secondary" 
                      className="d-flex align-items-center gap-1"
                    >
                      <i className="bi bi-folder me-1"></i>
                      {folder}
                      <button
                        type="button"
                        className="btn-close btn-close-white"
                        style={{ fontSize: '0.7em' }}
                        onClick={() => handleRemoveFolder(folder)}
                        aria-label="Remove folder"
                      ></button>
                    </Badge>
                  ))}
                </div>
              </Form.Group>
              
              {/* File Association Section */}
              <Form.Group className="mb-3">
                <Form.Label className="d-flex align-items-center">
                  <i className="bi bi-link me-2"></i>
                  File Association
                </Form.Label>
                {currentNoteId ? (
                  <div>
                    <Form.Select
                      value={selectedFileForAssociation || ''}
                      onChange={(e) => handleFileAssociation(e.target.value)}
                      disabled={associationLoading}
                    >
                      <option value="">No file associated</option>
                      {availableFiles.map(file => (
                        <option key={file.id} value={file.id}>
                          📄 {file.name}
                        </option>
                      ))}
                    </Form.Select>
                    
                    {associatedFile && (
                      <div className="mt-2 p-2 bg-light rounded d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                          <div>
                            <strong>{associatedFile.name}</strong>
                            <br />
                            <small className="text-muted">
                              Size: {(associatedFile.size / 1024).toFixed(1)} KB • 
                              Uploaded: {new Date(associatedFile.uploadDate).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                        <div>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => window.location.hash = `/pdf-manager`}
                            title="View in PDF Manager"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="ms-2"
                            onClick={() => handleFileAssociation(null)}
                            title="Remove association"
                          >
                            <i className="bi bi-x"></i>
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {associationError && (
                      <Alert variant="warning" className="mt-2 py-2">
                        <small>
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          {associationError}
                        </small>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert variant="info" className="py-2">
                    <small>
                      <i className="bi bi-info-circle me-2"></i>
                      Save the note first to associate it with a file
                    </small>
                  </Alert>
                )}
              </Form.Group>
              
              {/* Error Display */}
              {errorMessage && (
                <Alert variant="danger" className="mt-3">
                  <i className="bi bi-exclamation-circle me-2"></i>
                  {errorMessage}
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="ms-2"
                    onClick={() => setErrorMessage('')}
                  >
                    Dismiss
                  </Button>
                </Alert>
              )}
              
              {/* Storage Information */}
              <StorageInfo />
              
              {/* Notes Statistics */}
              <div className="mt-3 pt-3 border-top">
                <Row className="text-muted small">
                  <Col md={6}>
                    <strong>Characters:</strong> {notes.content.length.toLocaleString()}
                  </Col>
                  <Col md={6}>
                    <strong>Last Modified:</strong> {formatTimestamp(notes.lastModified)}
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header closeButton={false}>
            <i className={`bi bi-${toastVariant === 'success' ? 'check-circle' : toastVariant === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2`}></i>
            <strong className="me-auto">Notes System</strong>
            <small className="text-muted">just now</small>
          </Toast.Header>
          <Toast.Body className={toastVariant === 'success' ? 'text-white' : ''}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default TextNotesWithLocalStorage;