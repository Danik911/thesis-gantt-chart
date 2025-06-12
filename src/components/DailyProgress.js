import React, { useState, useEffect, useMemo } from 'react';
import { useNotes } from '../contexts/NotesContext';
import { useAuth } from '../contexts/AuthContext';
import Calendar from './Calendar';
import fileStorageService from '../services/FileStorageService';
import { 
  FaStickyNote, 
  FaFile, 
  FaTasks, 
  FaEye, 
  FaDownload, 
  FaTag,
  FaFolder,
  FaClock,
  FaPlus,
  FaEdit
} from 'react-icons/fa';

const DailyProgress = () => {
  const { user } = useAuth();
  const { notes, createNote } = useNotes();
  
  // Existing task state
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState([]);
  
  // New state for notes and files
  const [dayNotes, setDayNotes] = useState([]);
  const [dayFiles, setDayFiles] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'notes', 'files', 'all'
  
  // File storage service instance (imported as singleton)

  // Helper function to check if two dates are on the same day
  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  // Helper function to format date for comparison
  const formatDateForComparison = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Load notes for selected date
  const loadNotesForDate = useMemo(() => {
    if (!notes || !user) return [];
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return notes.filter(note => {
      const noteDate = new Date(note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt);
      return noteDate >= startOfDay && noteDate <= endOfDay;
    });
  }, [notes, selectedDate, user]);

  // Load files for selected date
  const loadFilesForDate = async (date) => {
    if (!user) return;
    
    setFilesLoading(true);
    try {
      const allFiles = await fileStorageService.listFiles();
      const dateString = formatDateForComparison(date);
      
      const filteredFiles = allFiles.filter(file => {
        const fileDate = formatDateForComparison(new Date(file.uploadDate));
        return fileDate === dateString;
      });
      
      setDayFiles(filteredFiles);
    } catch (err) {
      console.error('Error loading files for date:', err);
      setDayFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  // Update notes when selectedDate or notes change
  useEffect(() => {
    setDayNotes(loadNotesForDate);
  }, [loadNotesForDate]);

  // Load files when date changes
  useEffect(() => {
    loadFilesForDate(selectedDate);
  }, [selectedDate, user]);

  // Get all days with entries from localStorage
  const getDaysWithEntries = () => {
    const daysWithData = [];
    
    // Check the June 1 - September 1 range
    const startDate = new Date(new Date().getFullYear(), 5, 1); // June 1
    const endDate = new Date(new Date().getFullYear(), 8, 1);   // September 1
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const tasksKey = `daily-tasks-${dateString}`;
      const savedTasks = localStorage.getItem(tasksKey);
      
      if (savedTasks) {
        try {
          const tasks = JSON.parse(savedTasks);
          if (tasks && tasks.length > 0) {
            daysWithData.push(dateString);
          }
        } catch (err) {
          // Ignore parsing errors for individual days
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return daysWithData;
  };

  // Load tasks for a specific date
  const loadTasksForDate = (date) => {
    setLoading(true);
    try {
      const dateString = date.toISOString().split('T')[0];
      const savedTasks = localStorage.getItem(`daily-tasks-${dateString}`);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        setTasks([]);
      }
      setError('');
    } catch (err) {
      setError('Failed to load daily tasks');
      console.error('Error loading tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks from localStorage on component mount and when date changes
  useEffect(() => {
    loadTasksForDate(selectedDate);
  }, [selectedDate]);

  // Update days with entries when tasks change
  useEffect(() => {
    const updatedDays = getDaysWithEntries();
    setDaysWithEntries(updatedDays);
  }, [tasks]);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    const dateString = selectedDate.toISOString().split('T')[0];
    try {
      localStorage.setItem(`daily-tasks-${dateString}`, JSON.stringify(tasks));
    } catch (err) {
      setError('Failed to save daily tasks');
      console.error('Error saving tasks:', err);
    }
  }, [tasks, selectedDate]);

  // Handle calendar date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
      };
      setTasks(prevTasks => [...prevTasks, task]);
      setNewTask('');
      setError('');
    }
  };

  const toggleTask = (taskId) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed ? new Date().toISOString() : null
            }
          : task
      )
    );
  };

  const removeTask = (taskId) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  // Handle file download
  const handleDownloadFile = async (fileId) => {
    try {
      await fileStorageService.downloadFile(fileId);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  // Create a quick note for the selected date
  const createQuickNote = async () => {
    if (!user) return;
    
    try {
      const noteData = {
        title: `Daily Note - ${selectedDate.toLocaleDateString()}`,
        content: '',
        folderPath: '/Daily Progress',
        tags: ['daily-progress'],
        type: 'standalone',
        noteType: 'text'
      };
      
      await createNote(noteData);
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Failed to create note');
    }
  };

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);

  // Check if selected date is today
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isSelectedDateInPast = selectedDate < new Date().setHours(0, 0, 0, 0);

  // Format date for display
  const formatDate = (date) => {
    return new Date(date?.seconds ? date.seconds * 1000 : date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get summary data for the selected date
  const summaryData = {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    pendingTasks: pendingTasks.length,
    totalNotes: dayNotes.length,
    totalFiles: dayFiles.length,
    totalItems: tasks.length + dayNotes.length + dayFiles.length
  };

  if (loading && notesLoading && filesLoading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="Loading daily progress">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading daily progress...</span>
      </div>
    );
  }

  return (
    <div className="daily-progress p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Daily Progress Overview
        </h1>
        <p className="text-gray-600">
          Track your daily accomplishments, notes, and files in one comprehensive view
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Calendar Component */}
      <div className="mb-8">
        <Calendar
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
          daysWithEntries={daysWithEntries}
          locale="en"
          className="w-full"
        />
      </div>

      {/* Selected Date Header */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-800">
              {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <p className="text-blue-600 text-sm">
              {summaryData.totalItems} total items: {summaryData.totalTasks} tasks, {summaryData.totalNotes} notes, {summaryData.totalFiles} files
            </p>
          </div>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              Go to Today
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {[
            { key: 'all', label: 'All Items', icon: FaEye, count: summaryData.totalItems },
            { key: 'tasks', label: 'Tasks', icon: FaTasks, count: summaryData.totalTasks },
                         { key: 'notes', label: 'Notes', icon: FaStickyNote, count: summaryData.totalNotes },
            { key: 'files', label: 'Files', icon: FaFile, count: summaryData.totalFiles }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="mr-2" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isToday 
                ? "What did you accomplish today?" 
                : isSelectedDateInPast 
                  ? "Add a past accomplishment..." 
                  : "Plan something for this day..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Add new task"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
            aria-label="Add task"
          >
            <FaPlus className="mr-2" />
            Add Task
          </button>
        </div>
        
        {user && (
                     <button
             onClick={createQuickNote}
             className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
           >
             <FaStickyNote className="mr-2" />
             Quick Note
           </button>
        )}
      </div>

      {/* Progress Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <FaTasks className="text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold text-blue-800">Total Tasks</h3>
              <p className="text-2xl font-bold text-blue-600">{summaryData.totalTasks}</p>
            </div>
          </div>
        </div>
                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
           <div className="flex items-center">
             <FaStickyNote className="text-green-600 mr-3" />
             <div>
               <h3 className="font-semibold text-green-800">Notes</h3>
               <p className="text-2xl font-bold text-green-600">{summaryData.totalNotes}</p>
             </div>
           </div>
         </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <FaFile className="text-purple-600 mr-3" />
            <div>
              <h3 className="font-semibold text-purple-800">Files</h3>
              <p className="text-2xl font-bold text-purple-600">{summaryData.totalFiles}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <FaClock className="text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-800">Completed</h3>
              <p className="text-2xl font-bold text-yellow-600">{summaryData.completedTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Areas */}
      <div className="space-y-6">
        {/* Tasks Section */}
        {(activeTab === 'all' || activeTab === 'tasks') && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FaTasks className="mr-2 text-blue-600" />
              Tasks for {selectedDate.toLocaleDateString()}
            </h3>
            
            {tasks.length === 0 ? (
              <p className="text-gray-500 italic">No tasks for this day</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Tasks */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">⏳ Pending ({pendingTasks.length})</h4>
                  <div className="space-y-2">
                    {pendingTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between bg-yellow-50 p-3 rounded border">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="mr-3 text-gray-400 hover:text-green-500"
                            aria-label="Mark as complete"
                          >
                            ⭕
                          </button>
                          <span>{task.text}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(task.createdAt)}
                          </span>
                          <button
                            onClick={() => removeTask(task.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            aria-label="Remove task"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Tasks */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">✅ Completed ({completedTasks.length})</h4>
                  <div className="space-y-2">
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between bg-green-50 p-3 rounded border">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="mr-3 text-green-500 hover:text-green-700"
                            aria-label="Mark as incomplete"
                          >
                            ✅
                          </button>
                          <span className="line-through text-gray-600">{task.text}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {task.completedAt && formatDate(task.completedAt)}
                          </span>
                          <button
                            onClick={() => removeTask(task.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            aria-label="Remove task"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        {(activeTab === 'all' || activeTab === 'notes') && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
                         <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
               <FaStickyNote className="mr-2 text-green-600" />
               Notes for {selectedDate.toLocaleDateString()}
             </h3>
            
            {notesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                <span className="text-sm text-gray-500 mt-2">Loading notes...</span>
              </div>
            ) : dayNotes.length === 0 ? (
              <p className="text-gray-500 italic">No notes for this day</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayNotes.map(note => (
                  <div key={note.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-green-800 truncate flex-1">{note.title}</h4>
                      <button
                        className="text-green-600 hover:text-green-800 ml-2"
                        title="Edit note"
                      >
                        <FaEdit size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {note.content ? (typeof note.content === 'string' ? note.content.substring(0, 100) + '...' : 'Rich text content') : 'No content'}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Array.isArray(note.tags) && note.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          <FaTag className="mr-1" size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center">
                        <FaFolder className="mr-1" />
                        {note.folderPath}
                      </span>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Files Section */}
        {(activeTab === 'all' || activeTab === 'files') && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FaFile className="mr-2 text-purple-600" />
              Files for {selectedDate.toLocaleDateString()}
            </h3>
            
            {filesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                <span className="text-sm text-gray-500 mt-2">Loading files...</span>
              </div>
            ) : dayFiles.length === 0 ? (
              <p className="text-gray-500 italic">No files uploaded on this day</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayFiles.map(file => (
                  <div key={file.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-purple-800 truncate flex-1">{file.name}</h4>
                      <button
                        onClick={() => handleDownloadFile(file.id)}
                        className="text-purple-600 hover:text-purple-800 ml-2"
                        title="Download file"
                      >
                        <FaDownload size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Type: {file.type || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Size: {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Uploaded: {formatDate(file.uploadDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Daily Motivation */}
      {summaryData.totalItems > 0 && (
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">🎉 Great work!</h3>
          <p className="text-purple-700">
            You&apos;ve tracked {summaryData.totalItems} items 
            {isToday ? ' today' : ` on ${selectedDate.toLocaleDateString()}`}: 
            {summaryData.completedTasks} completed tasks, {summaryData.totalNotes} notes, and {summaryData.totalFiles} files. 
            {summaryData.totalItems >= 10 && " Outstanding productivity! 🚀"}
          </p>
        </div>
      )}

      {/* Calendar Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">📊 Period Overview</h3>
        <p className="text-gray-600 text-sm">
          You have entries on <strong>{daysWithEntries.length}</strong> days 
          in the June-September period. Keep up the great work tracking your progress!
        </p>
      </div>
    </div>
  );
};

export default DailyProgress; 