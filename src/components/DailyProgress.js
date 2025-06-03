import React, { useState, useEffect } from 'react';
import Calendar from './Calendar';

const DailyProgress = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daysWithEntries, setDaysWithEntries] = useState([]);

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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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

  const completedTasks = tasks.filter(task => task.completed);
  const pendingTasks = tasks.filter(task => !task.completed);

  // Check if selected date is today
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const isSelectedDateInPast = selectedDate < new Date().setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="Loading daily progress">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading daily progress...</span>
      </div>
    );
  }

  return (
    <div className="daily-progress p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          What Has Been Done Today
        </h1>
        <p className="text-gray-600">
          Track your daily accomplishments and view progress over time
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
              {isToday && 'Current day'} 
              {isSelectedDateInPast && !isToday && 'Past accomplishments'}
              {!isSelectedDateInPast && !isToday && 'Future planning'}
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

      {/* Task Input */}
      <div className="mb-6">
        <div className="flex gap-2">
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
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Add task"
          >
            Add
          </button>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800">Total Tasks</h3>
          <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-800">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">{pendingTasks.length}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Daily Progress</span>
            <span className="text-sm text-gray-500">
              {Math.round((completedTasks.length / tasks.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(completedTasks.length / tasks.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={Math.round((completedTasks.length / tasks.length) * 100)}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      )}

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed Tasks */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold text-green-800 mb-4">
            ✅ Completed Tasks ({completedTasks.length})
          </h2>
          {completedTasks.length === 0 ? (
            <p className="text-green-600 italic">No completed tasks yet</p>
          ) : (
            <ul className="space-y-2">
              {completedTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between bg-white p-3 rounded border">
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
                      {task.completedAt && new Date(task.completedAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      aria-label="Remove task"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Tasks */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h2 className="text-xl font-semibold text-yellow-800 mb-4">
            ⏳ Pending Tasks ({pendingTasks.length})
          </h2>
          {pendingTasks.length === 0 ? (
            <p className="text-yellow-600 italic">All tasks completed! 🎉</p>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between bg-white p-3 rounded border">
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
                      {new Date(task.createdAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      aria-label="Remove task"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Daily Motivation */}
      {completedTasks.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">🎉 Great work!</h3>
          <p className="text-purple-700">
            You&apos;ve completed {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} 
            {isToday ? ' today' : ` on ${selectedDate.toLocaleDateString()}`}. 
            {completedTasks.length >= 5 && " You&apos;re on fire! 🔥"}
            {completedTasks.length >= 10 && " Absolutely incredible productivity! 🚀"}
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