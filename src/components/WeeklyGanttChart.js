import React, { useState, useEffect, useRef } from 'react';

const ThesisGanttChart = () => {
  // State for the tooltip/hover details and position
  const [hoveredGateway, setHoveredGateway] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // State for tracking completed days
  const [completedDays, setCompletedDays] = useState({});
  
  // Auto-save effect for tasks
  useEffect(() => {
    const savedTasks = localStorage.getItem('gantt-tasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error('Error loading saved tasks:', error);
      }
    }
  }, []);
  
  // Auto-save tasks to localStorage
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('gantt-tasks', JSON.stringify(tasks));
    }
  }, [tasks]);
  
  // State for instruction modal
  const [showInstructions, setShowInstructions] = useState(false);
  
  // State for row editing functionality
  const [editingRow, setEditingRow] = useState(null); // { type: 'task'|'activity', id: number, originalName: string }
  const [editValue, setEditValue] = useState('');
  const [showEditFeedback, setShowEditFeedback] = useState({ show: false, message: '', type: '' });
  
  // State for add row functionality
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [addRowType, setAddRowType] = useState('task'); // 'task' or 'activity'
  const [addRowData, setAddRowData] = useState({
    name: '',
    parentTaskId: null,
    weeks: [],
    days: [],
    owner: 'ME',
    color: 'bg-blue-400',
    isGateway: false
  });
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  
  // Refs for inputs
  const editInputRef = useRef(null);
  const addRowInputRef = useRef(null);
  
  // Project timeframe: June 1 - September 1, 2024
  // Calculate weeks in the project (June, July, August)
  const weeks = [
    { name: "JUN 1-7", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 8-14", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 15-21", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 22-28", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUN 29-JUL 5", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 6-12", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 13-19", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 20-26", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "JUL 27-AUG 2", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 3-9", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 10-16", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 17-23", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 24-30", days: ["S", "M", "T", "W", "T", "F", "S"] },
    { name: "AUG 31-SEP 1", days: ["S", "M", "-", "-", "-", "-", "-"] },
  ];

  // Task structure with timing in weeks - moved to state for editing
  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: "PLANNING",
      activities: [
        { 
          id: 1.1, 
          name: "Confirm topic & objectives", 
          weeks: [0], 
          days: [1, 2, 3], 
          owner: "ME",
          color: "bg-blue-400",
          isGateway: false
        },
        { 
          id: 1.2, 
          name: "Write research proposal", 
          weeks: [0, 1], 
          days: [4, 5, 6, 0, 1], 
          owner: "ME",
          color: "bg-blue-400",
          isGateway: true,
          gatewayInfo: {
            name: "Research Proposal Approved",
            deliverables: ["Approved research topic", "Research objectives defined", "Initial literature survey", "Methodology outline"],
            nextSteps: "Proceed to detailed research and prototype development"
          }
        }
      ]
    },
    {
      id: 2,
      name: "PROTOTYPE DEVELOPMENT",
      activities: [
        { 
          id: 2.1, 
          name: "Requirements gathering", 
          weeks: [0, 1], 
          days: [1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-purple-400",
          isGateway: false
        },
        { 
          id: 2.2, 
          name: "Design phase", 
          weeks: [1, 2], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-purple-400", 
          isGateway: false
        },
        { 
          id: 2.3, 
          name: "Test development (TDD)", 
          weeks: [2, 3], 
          days: [4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-purple-400", 
          isGateway: false
        },
        { 
          id: 2.4, 
          name: "Implementation (Agile sprints)", 
          weeks: [3, 4, 5, 6], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-purple-400", 
          isGateway: false
        },
        { 
          id: 2.5, 
          name: "DevOps implementation", 
          weeks: [6, 7, 8], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-indigo-400", 
          isGateway: false
        },
        { 
          id: 2.6, 
          name: "Test and debug prototype", 
          weeks: [8, 9, 10], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-indigo-400", 
          isGateway: true,
          gatewayInfo: {
            name: "Functional Prototype Complete",
            deliverables: ["Working AI-powered CSV to CSA transition tool", "Test documentation", "Performance metrics", "Comparison with traditional methods"],
            nextSteps: "Begin evaluation and data analysis phase"
          }
        }
      ]
    },
    {
      id: 3,
      name: "RESEARCH & WRITING",
      activities: [
        { 
          id: 3.1, 
          name: "Background reading/literature review", 
          weeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], // Ongoing throughout project
          owner: "ME",
          color: "bg-green-300", 
          isGateway: false
        },
        { 
          id: 3.2, 
          name: "Write Chapter 1: Introduction", 
          weeks: [1, 2], 
          days: [0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 3.3, 
          name: "Write Chapter 2: Literature Review", 
          weeks: [2, 3, 4], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 3.4, 
          name: "Write Chapter 3: Methodology", 
          weeks: [4, 5], 
          days: [1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 3.5, 
          name: "Conduct surveys (LinkedIn/email)", 
          weeks: [5, 6, 7, 8], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3], 
          owner: "ME",
          color: "bg-green-400", 
          isGateway: true,
          gatewayInfo: {
            name: "Survey Data Collection Complete",
            deliverables: ["Expert feedback on CSV to CSA transition", "Industry professional perspectives", "Market validation of AI approach", "Data for quantitative analysis"],
            nextSteps: "Analyze data and incorporate findings into thesis"
          }
        },
        { 
          id: 3.6, 
          name: "Write Chapter 4: Findings & Analysis", 
          weeks: [8, 9, 10], 
          days: [4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        }
      ]
    },
    {
      id: 4,
      name: "EVALUATION & FINALIZATION",
      activities: [
        { 
          id: 4.1, 
          name: "Mid-project supervisor review", 
          weeks: [6], 
          days: [3, 4, 5], 
          owner: "SV",
          color: "bg-red-400", 
          isGateway: true,
          gatewayInfo: {
            name: "Mid-Project Supervisor Review",
            deliverables: ["Progress report", "Initial findings", "Prototype development status", "Timeline adherence assessment"],
            nextSteps: "Address feedback and continue with implementation"
          }
        },
        { 
          id: 4.2, 
          name: "SME evaluation of reports", 
          weeks: [10, 11], 
          days: [1, 2, 3, 4, 5, 6, 0], 
          owner: "SME",
          color: "bg-purple-300", 
          isGateway: true,
          gatewayInfo: {
            name: "Subject Matter Expert Evaluation",
            deliverables: ["Expert validation of AI approach", "Industry relevance assessment", "Technical accuracy confirmation", "Implementation recommendations"],
            nextSteps: "Incorporate expert feedback into final chapters"
          }
        },
        { 
          id: 4.3, 
          name: "Write Chapter 5: Conclusions", 
          weeks: [11, 12], 
          days: [1, 2, 3, 4, 5, 6, 0], 
          owner: "ME",
          color: "bg-pink-400", 
          isGateway: false
        },
        { 
          id: 4.4, 
          name: "Compile references & appendices", 
          weeks: [12], 
          days: [1, 2, 3], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: false
        },
        { 
          id: 4.5, 
          name: "Write abstract", 
          weeks: [12], 
          days: [4, 5], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: false
        },
        { 
          id: 4.6, 
          name: "Final review and submission", 
          weeks: [12, 13], 
          days: [6, 0, 1], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: true,
          gatewayInfo: {
            name: "Thesis Submission Complete",
            deliverables: ["Complete thesis document", "Functional AI prototype", "All appendices and references", "Executive summary"],
            nextSteps: "Prepare for viva and demonstration"
          }
        },
        { 
          id: 4.7, 
          name: "Viva preparation", 
          weeks: [13], 
          days: [0, 1], 
          owner: "ME",
          color: "bg-blue-300", 
          isGateway: false
        }
      ]
    }
  ]);

  // Owner information
  const owners = {
    "ME": "Daniil Vladimirov (Thesis Author)",
    "SV": "Supervisor",
    "SME": "Subject Matter Expert"
  };

  // Load completed days from localStorage on initial render
  useEffect(() => {
    const savedCompletedDays = localStorage.getItem('thesisGanttCompletedDays');
    if (savedCompletedDays) {
      setCompletedDays(JSON.parse(savedCompletedDays));
    }
    
    // Check if this is the first visit
    const hasVisitedBefore = localStorage.getItem('thesisGanttVisited');
    if (!hasVisitedBefore) {
      setShowInstructions(true);
      localStorage.setItem('thesisGanttVisited', 'true');
    }
  }, []);

  // Save completed days to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('thesisGanttCompletedDays', JSON.stringify(completedDays));
  }, [completedDays]);

  // Function to toggle completion status of a day
  const toggleDayCompletion = (activityId, weekIndex, dayIndex) => {
    const dayKey = `${activityId}-${weekIndex}-${dayIndex}`;
    
    setCompletedDays(prevState => {
      const newState = { ...prevState };
      
      // Toggle completed status
      if (newState[dayKey]) {
        delete newState[dayKey];
      } else {
        newState[dayKey] = true;
      }
      
      return newState;
    });
  };

  // Calculate progress for an activity
  const calculateActivityProgress = (activity) => {
    let totalDays = 0;
    let completedDaysCount = 0;
    
    // First, identify all days that are part of this activity
    const activityDays = [];
    
    // For each week in the activity's span
    for (let w = 0; w < activity.weeks.length; w++) {
      const weekIndex = activity.weeks[w];
      
      // Determine the start and end days for this week
      let startDay, endDay;
      
      if (w === 0) {
        // If this is the first week, start from the specified first day
        startDay = activity.days[0];
      } else {
        // Otherwise start from the beginning of the week
        startDay = 0;
      }
      
      if (w === activity.weeks.length - 1) {
        // If this is the last week, end at the specified last day
        endDay = activity.days[activity.days.length - 1];
      } else {
        // Otherwise end at the end of the week
        endDay = 6;
      }
      
      // Add each day in this week to our activity days
      for (let dayIndex = startDay; dayIndex <= endDay; dayIndex++) {
        // Skip non-existent days in the last week
        if (weekIndex === 13 && dayIndex > 1) continue;
        
        activityDays.push({
          weekIndex,
          dayIndex
        });
      }
    }
    
    // Now count the total days and completed days
    totalDays = activityDays.length;
    
    // Check each day to see if it's completed
    activityDays.forEach(({ weekIndex, dayIndex }) => {
      const dayKey = `${activity.id}-${weekIndex}-${dayIndex}`;
      if (completedDays[dayKey]) {
        completedDaysCount++;
      }
    });
    
    return totalDays > 0 ? (completedDaysCount / totalDays) * 100 : 0;
  };

  // Helper function to determine if a day is part of an activity
  const isDayInActivity = (activity, weekIndex, dayIndex) => {
    if (!activity.weeks.includes(weekIndex)) return false;
    
    // First week of activity
    if (weekIndex === activity.weeks[0]) {
      return dayIndex >= activity.days[0];
    }
    // Last week of activity
    else if (weekIndex === activity.weeks[activity.weeks.length - 1]) {
      return dayIndex <= activity.days[activity.days.length - 1];
    }
    // Weeks in between
    else {
      return true;
    }
  };

  // Render a cell for a particular week and day
  const renderCell = (weekIndex, dayIndex, activity) => {
    // Skip non-existent days in the last week
    if (weekIndex === 13 && dayIndex > 1) {
      return <td key={`${weekIndex}-${dayIndex}-${activity.id}`} className="bg-white border border-gray-200 w-6 h-6"></td>;
    }
    
    // Check if this day is part of the activity
    const isActiveDay = isDayInActivity(activity, weekIndex, dayIndex);
    
    // Handle first or last day of an activity
    const isFirstDay = weekIndex === activity.weeks[0] && dayIndex === activity.days[0];
    const isLastDay = weekIndex === activity.weeks[activity.weeks.length-1] && dayIndex === activity.days[activity.days.length-1];
    
    // Check if this is a gateway (last cell of a gateway activity)
    const isGatewayCell = activity.isGateway && isLastDay;
    
    // Check if this day is completed
    const dayKey = `${activity.id}-${weekIndex}-${dayIndex}`;
    const isCompleted = completedDays[dayKey];
    
    // Determine the cell color
    let cellColor = 'bg-white';
    
    if (isActiveDay) {
      if (isCompleted) {
        cellColor = 'bg-gray-400'; // Completed tasks are gray
      } else if (isGatewayCell) {
        cellColor = 'bg-amber-500'; // Gateway color
      } else {
        cellColor = activity.color; // Normal activity color
      }
    }
    
    // Handler functions for mouse events
    const handleMouseEnter = (e) => {
      if (isGatewayCell) {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = window.pageXOffset + rect.left + rect.width/2;
        const bottomY = window.pageYOffset + rect.bottom;
        
        setTooltipPosition({ x: centerX, y: bottomY });
        setHoveredGateway(activity.gatewayInfo);
      }
    };
    
    const handleMouseLeave = () => {
      if (isGatewayCell) {
        setHoveredGateway(null);
      }
    };
    
    // Click handler for toggling completion
    const handleClick = () => {
      if (isActiveDay) {
        toggleDayCompletion(activity.id, weekIndex, dayIndex);
      }
    };
    
    return (
      <td 
        key={`${weekIndex}-${dayIndex}-${activity.id}`} 
        className={`border border-gray-200 w-6 h-6 
          ${cellColor} 
          ${isFirstDay ? 'rounded-l' : ''} 
          ${isLastDay ? 'rounded-r' : ''}
          ${isActiveDay ? 'cursor-pointer hover:opacity-80' : ''}`
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {isCompleted && (
          <div className="flex items-center justify-center h-full">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        )}
      </td>
    );
  };

  // Row editing functions
  const startEditing = (type, id, currentName) => {
    setEditingRow({ type, id, originalName: currentName });
    setEditValue(currentName);
    setShowEditFeedback({ show: false, message: '', type: '' });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditValue('');
    setShowEditFeedback({ show: false, message: '', type: '' });
  };

  const validateEditValue = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return { isValid: false, message: 'Name cannot be empty' };
    }
    if (trimmedValue.length > 100) {
      return { isValid: false, message: 'Name must be 100 characters or less' };
    }
    return { isValid: true, message: '' };
  };

  const saveEdit = () => {
    const validation = validateEditValue(editValue);
    
    if (!validation.isValid) {
      setShowEditFeedback({ 
        show: true, 
        message: validation.message, 
        type: 'error' 
      });
      return;
    }

    const trimmedValue = editValue.trim();
    
    if (trimmedValue === editingRow.originalName) {
      // No changes made, just cancel
      cancelEditing();
      return;
    }

    // Update the tasks state
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (editingRow.type === 'task' && task.id === editingRow.id) {
          return { ...task, name: trimmedValue };
        } else if (editingRow.type === 'activity') {
          return {
            ...task,
            activities: task.activities.map(activity => {
              if (activity.id === editingRow.id) {
                return { ...activity, name: trimmedValue };
              }
              return activity;
            })
          };
        }
        return task;
      });
    });

    // Show success feedback
    setShowEditFeedback({ 
      show: true, 
      message: 'Name updated successfully!', 
      type: 'success' 
    });

    // Clear editing state after short delay
    setTimeout(() => {
      cancelEditing();
    }, 1500);
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editingRow && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingRow]);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('thesisGanttTasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error('Failed to load tasks from localStorage:', error);
      }
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        localStorage.setItem('thesisGanttTasks', JSON.stringify(tasks));
      } catch (error) {
        console.error('Failed to save tasks to localStorage:', error);
      }
    }
  }, [tasks]);

  // Generate unique task ID
  const generateUniqueTaskId = () => {
    const existingIds = tasks.map(task => task.id);
    let newId = Math.max(...existingIds, 0) + 1;
    while (existingIds.includes(newId)) {
      newId++;
    }
    return newId;
  };
  
  // Generate unique activity ID for a task
  const generateUniqueActivityId = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return `${taskId}.1`;
    
    const existingActivityIds = task.activities.map(activity => 
      parseFloat(activity.id.toString().split('.')[1] || '0')
    );
    const nextActivityId = Math.max(...existingActivityIds, 0) + 1;
    return parseFloat(`${taskId}.${nextActivityId}`);
  };
  
  // Add new task
  const addNewTask = (taskData) => {
    const newId = generateUniqueTaskId();
    const newTask = {
      id: newId,
      name: taskData.name || `New Task ${newId}`,
      activities: []
    };
    
    setTasks(prevTasks => {
      const newTasks = [...prevTasks, newTask];
      showEditFeedbackMessage(`Task "${newTask.name}" added successfully!`, 'success');
      return newTasks;
    });
    
    return newId;
  };
  
  // Add new activity to existing task
  const addNewActivity = (activityData) => {
    const { parentTaskId, name, weeks, days, owner, color, isGateway } = activityData;
    const newActivityId = generateUniqueActivityId(parentTaskId);
    
    const newActivity = {
      id: newActivityId,
      name: name || `New Activity ${newActivityId}`,
      weeks: weeks || [0],
      days: days || [1, 2, 3],
      owner: owner || 'ME',
      color: color || 'bg-blue-400',
      isGateway: isGateway || false
    };
    
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task => {
        if (task.id === parentTaskId) {
          return {
            ...task,
            activities: [...task.activities, newActivity]
          };
        }
        return task;
      });
      showEditFeedbackMessage(`Activity "${newActivity.name}" added successfully!`, 'success');
      return newTasks;
    });
    
    return newActivityId;
  };
  
  // Handle add row submission
  const handleAddRow = () => {
    if (!addRowData.name.trim()) {
      showEditFeedbackMessage('Please enter a name for the new row.', 'error');
      return;
    }
    
    if (addRowType === 'task') {
      addNewTask(addRowData);
    } else if (addRowType === 'activity' && addRowData.parentTaskId) {
      addNewActivity(addRowData);
    } else {
      showEditFeedbackMessage('Please select a parent task for the new activity.', 'error');
      return;
    }
    
    // Reset form
    setAddRowData({
      name: '',
      parentTaskId: null,
      weeks: [],
      days: [],
      owner: 'ME',
      color: 'bg-blue-400',
      isGateway: false
    });
    setShowAddRowModal(false);
  };
  
  // Handle drag start
  const handleDragStart = (e, item, type) => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = 'move';
  };
  
  // Handle drag over
  const handleDragOver = (e, item, type) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem({ ...item, type });
  };
  
  // Handle drop
  const handleDrop = (e, targetItem, targetType) => {
    e.preventDefault();
    
    if (!draggedItem || !targetItem) return;
    
    // Implement repositioning logic here
    if (draggedItem.type === 'task' && targetType === 'task') {
      // Reorder tasks
      const draggedIndex = tasks.findIndex(task => task.id === draggedItem.id);
      const targetIndex = tasks.findIndex(task => task.id === targetItem.id);
      
      if (draggedIndex !== targetIndex) {
        const newTasks = [...tasks];
        const [removed] = newTasks.splice(draggedIndex, 1);
        newTasks.splice(targetIndex, 0, removed);
        setTasks(newTasks);
        showEditFeedbackMessage('Task repositioned successfully!', 'success');
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };
  
  // Helper function to show feedback messages
  const showEditFeedbackMessage = (message, type) => {
    setShowEditFeedback({ show: true, message, type });
    setTimeout(() => {
      setShowEditFeedback({ show: false, message: '', type: '' });
    }, 3000);
  };
  
  // Delete task
  const deleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task and all its activities?')) {
      setTasks(prevTasks => {
        const newTasks = prevTasks.filter(task => task.id !== taskId);
        showEditFeedbackMessage('Task deleted successfully!', 'success');
        return newTasks;
      });
    }
  };
  
  // Delete activity
  const deleteActivity = (taskId, activityId) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      setTasks(prevTasks => {
        const newTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              activities: task.activities.filter(activity => activity.id !== activityId)
            };
          }
          return task;
        });
        showEditFeedbackMessage('Activity deleted successfully!', 'success');
        return newTasks;
      });
    }
  };
  
  // Focus input when add row modal opens
  useEffect(() => {
    if (showAddRowModal && addRowInputRef.current) {
      addRowInputRef.current.focus();
    }
  }, [showAddRowModal]);

  // Add Row Modal Component
  const AddRowModal = () => {
    if (!showAddRowModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-800">Add New Row</h2>
            <button 
              onClick={() => setShowAddRowModal(false)}
              className="bg-gray-200 rounded-full p-2 hover:bg-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="task"
                    checked={addRowType === 'task'}
                    onChange={(e) => setAddRowType(e.target.value)}
                    className="mr-2"
                  />
                  Task
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="activity"
                    checked={addRowType === 'activity'}
                    onChange={(e) => setAddRowType(e.target.value)}
                    className="mr-2"
                  />
                  Activity
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                ref={addRowInputRef}
                type="text"
                value={addRowData.name}
                onChange={(e) => setAddRowData({...addRowData, name: e.target.value})}
                placeholder="Enter name for new row"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {addRowType === 'activity' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Task</label>
                <select
                  value={addRowData.parentTaskId || ''}
                  onChange={(e) => setAddRowData({...addRowData, parentTaskId: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a parent task</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>{task.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
              <select
                value={addRowData.owner}
                onChange={(e) => setAddRowData({...addRowData, owner: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ME">ME (Daniil Vladimirov)</option>
                <option value="SV">Supervisor</option>
                <option value="SME">Subject Matter Expert</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <select
                value={addRowData.color}
                onChange={(e) => setAddRowData({...addRowData, color: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bg-blue-400">Planning (Blue)</option>
                <option value="bg-purple-400">Development (Purple)</option>
                <option value="bg-indigo-400">Testing (Indigo)</option>
                <option value="bg-green-300">Ongoing Research (Light Green)</option>
                <option value="bg-green-400">Research Activities (Green)</option>
                <option value="bg-pink-400">Writing (Pink)</option>
                <option value="bg-red-400">Review (Red)</option>
                <option value="bg-blue-300">Finalization (Light Blue)</option>
                <option value="bg-purple-300">Other (Light Purple)</option>
              </select>
            </div>
            
            {addRowType === 'activity' && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={addRowData.isGateway}
                    onChange={(e) => setAddRowData({...addRowData, isGateway: e.target.checked})}
                    className="mr-2"
                  />
                  Gateway Milestone
                </label>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddRowModal(false)}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRow}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Row
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Instructions Modal Component
  const InstructionsModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-blue-800">Welcome to Thesis GANTT Chart</h2>
            <button 
              onClick={() => setShowInstructions(false)}
              className="bg-gray-200 rounded-full p-2 hover:bg-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="mb-4 border-b pb-3">
            <p className="font-medium">Created by: <span className="text-blue-700">Daniil Vladimirov</span></p>
            <p className="font-medium">Student Number: <span className="text-blue-700">3154227</span></p>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">How to Use This GANTT Chart:</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-blue-600">1. Tracking Task Progress</h4>
              <p>Click on any colored cell to mark it as completed. The cell will turn gray with a checkmark. Click again to mark it as incomplete.</p>
              <div className="flex mt-1 items-center">
                <div className="w-6 h-6 bg-purple-400 mr-2"></div>
                <span>→ Click →</span>
                <div className="w-6 h-6 bg-gray-400 flex items-center justify-center ml-2">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">2. Progress Tracking</h4>
              <p>Each task has a progress bar showing completion percentage. As you mark days complete, the progress bar updates automatically.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">3. Gateway Milestones</h4>
              <p>Amber cells represent gateway milestones. Hover over them to see deliverables and next steps.</p>
              <div className="bg-amber-500 w-12 h-6 rounded mt-1"></div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">4. Row Editing</h4>
              <p>Edit task and activity names by clicking the &quot;Edit&quot; button that appears on hover, or double-click on activity names. Press Enter to save or Escape to cancel.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">5. Adding New Rows</h4>
              <p>Click the &quot;Add Row&quot; button to add new tasks or activities. You can specify the type, parent task (for activities), owner, color, and whether it&apos;s a gateway milestone.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">6. Drag and Drop</h4>
              <p>Drag task rows to reorder them. This helps organize your timeline and adjust priorities as your project evolves.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">7. Automatic Saving</h4>
              <p>Your progress and edits are automatically saved in your browser&apos;s local storage. It will persist even if you close the browser and return later.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">8. Thesis Timeline</h4>
              <p>This GANTT chart covers the 3-month thesis timeframe from June 1 to September 1, 2024. All tasks include a 10% buffer time as requested.</p>
            </div>
          </div>
          
          <div className="mt-6 bg-blue-50 p-4 rounded">
            <h4 className="font-semibold">Research Focus</h4>
            <p>This chart is designed for tracking progress on the thesis topic: &quot;Can AI agents facilitate the transition from computer system validation to computer software assurance?&quot; as outlined in the assignment.</p>
          </div>
          
          <button 
            onClick={() => setShowInstructions(false)}
            className="mt-6 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 w-full font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-2 bg-white rounded-lg shadow-lg overflow-x-auto relative">
      {showInstructions && <InstructionsModal />}
      <AddRowModal />
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI-Enabled CSV to CSA Transition: Thesis GANTT Chart</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowAddRowModal(true)} 
            className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Row
          </button>
          <button 
            onClick={() => setShowInstructions(true)} 
            className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Help
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Project Timeline: June 1 - September 1, 2024</h2>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Daniil Vladimirov</span> | Student #3154227
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2">Research Objectives:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-100 p-2 rounded">1. Analyze existing CSV practices</div>
          <div className="bg-gray-100 p-2 rounded">2. Investigate CSA&apos;s risk-based approach</div>
          <div className="bg-gray-100 p-2 rounded">3. Conduct gap analysis for CSV to CSA transition</div>
          <div className="bg-gray-100 p-2 rounded">4. Examine AI agent capabilities and limitations</div>
          <div className="bg-gray-100 p-2 rounded">5. Suggest AI applications to bridge CSV-CSA gap</div>
          <div className="bg-gray-100 p-2 rounded">6. Develop and test AI prototype for validation</div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">Legend:</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-blue-400"></div>
            <span>Planning</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-purple-400"></div>
            <span>Development</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-indigo-400"></div>
            <span>Testing</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-green-300"></div>
            <span>Ongoing Research</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-green-400"></div>
            <span>Research Activities</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-pink-400"></div>
            <span>Writing</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-red-400"></div>
            <span>Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-blue-300"></div>
            <span>Finalization</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-amber-500"></div>
            <span>Gateway</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-1 bg-gray-400"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold">Resources:</h3>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
                localStorage.removeItem('thesisGanttCompletedDays');
                localStorage.removeItem('thesisGanttVisited');
                alert("Progress has been reset. The page will now reload.");
                window.location.reload();
              }
            }}
            className="text-xs text-red-600 hover:text-red-800 border border-red-300 rounded px-2 py-1 hover:bg-red-50"
          >
            Reset Progress
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(owners).map(([key, value]) => (
            <div key={key} className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-1">
                {key}
              </div>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
        <p className="text-sm font-medium">Click on colored cells to mark progress. Hover over task/activity names to edit them. Use &quot;Add Row&quot; to create new tasks/activities. Drag tasks to reorder them. Your changes are automatically saved.</p>
        <button 
          onClick={() => setShowInstructions(true)}
          className="text-blue-700 hover:text-blue-900 text-sm font-medium"
        >
          View full instructions
        </button>
      </div>
      
      {/* Gateway Hover Tooltip */}
      {hoveredGateway && (
        <div 
          className="absolute bg-white border border-gray-300 shadow-lg rounded-md p-3 z-50 max-w-sm"
          style={{
            left: `${tooltipPosition.x}px`, 
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, 10px)',
            pointerEvents: 'none'
          }}
        >
          <h4 className="font-bold text-lg text-amber-600">{hoveredGateway.name}</h4>
          <h5 className="font-semibold mt-2">Deliverables:</h5>
          <ul className="list-disc pl-5 mt-1">
            {hoveredGateway.deliverables.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <h5 className="font-semibold mt-2">Next Steps:</h5>
          <p>{hoveredGateway.nextSteps}</p>
        </div>
      )}
      
      {/* Edit Feedback Notification */}
      {showEditFeedback.show && (
        <div 
          className={`fixed top-4 right-4 p-3 rounded-md shadow-lg z-50 max-w-sm ${
            showEditFeedback.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center">
            {showEditFeedback.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            <span className="font-medium">{showEditFeedback.message}</span>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="border-collapse w-full min-w-max">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 p-2 w-48 text-left">Tasks & Activities</th>
              {weeks.map((week, weekIndex) => (
                <th key={week.name} colSpan={7} className="border border-gray-300 bg-gray-800 text-white p-1 text-center text-xs">
                  {week.name}
                </th>
              ))}
              <th className="border border-gray-300 bg-gray-100 p-2 w-16 text-center">Owner</th>
              <th className="border border-gray-300 bg-gray-100 p-2 w-24 text-center">Progress</th>
            </tr>
            <tr>
              <th className="border border-gray-300 bg-gray-100"></th>
              {weeks.map((week, weekIndex) => (
                week.days.map((day, dayIndex) => (
                  <th key={`${weekIndex}-${day}`} className="border border-gray-300 bg-gray-200 w-6 p-1 text-center text-xs">
                    {day}
                  </th>
                ))
              ))}
              <th className="border border-gray-300 bg-gray-100"></th>
              <th className="border border-gray-300 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <React.Fragment key={task.id}>
                <tr
                  draggable
                  onDragStart={(e) => handleDragStart(e, task, 'task')}
                  onDragOver={(e) => handleDragOver(e, task, 'task')}
                  onDrop={(e) => handleDrop(e, task, 'task')}
                  className={`transition-all duration-300 ${
                    dragOverItem?.type === 'task' && dragOverItem.id === task.id 
                      ? 'border-blue-500 border-2 transform scale-105' 
                      : ''
                  } ${
                    draggedItem?.type === 'task' && draggedItem.id === task.id 
                      ? 'opacity-50' 
                      : ''
                  }`}
                >
                  <td className="border border-gray-300 bg-gray-800 text-white p-2 font-bold relative cursor-move">
                    <div className="flex items-center justify-between group">
                      {editingRow?.type === 'task' && editingRow?.id === task.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyPress}
                            className="flex-1 bg-white text-gray-900 px-2 py-1 rounded text-sm font-bold"
                            maxLength={100}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={saveEdit}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                              title="Save (Enter)"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                              title="Cancel (Escape)"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1">{task.name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditing('task', task.id, task.name)}
                              className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-opacity"
                              title="Edit task name"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-opacity"
                              title="Delete task"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  {weeks.map((week, weekIndex) => (
                    week.days.map((day, dayIndex) => (
                      <td key={`${weekIndex}-${dayIndex}`} className="border border-gray-300 bg-gray-700"></td>
                    ))
                  ))}
                  <td className="border border-gray-300 bg-gray-800 text-white"></td>
                  <td className="border border-gray-300 bg-gray-800 text-white"></td>
                </tr>
                {task.activities.map((activity) => {
                  const progress = calculateActivityProgress(activity);
                  
                  return (
                    <tr key={activity.id} className="transition-all duration-300 hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-sm relative">
                        <div className="flex items-center justify-between group">
                          {editingRow?.type === 'activity' && editingRow?.id === activity.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleEditKeyPress}
                                className="flex-1 bg-white text-gray-900 px-2 py-1 rounded text-sm border"
                                maxLength={100}
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={saveEdit}
                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                  title="Save (Enter)"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                                  title="Cancel (Escape)"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span 
                                className="flex-1 cursor-pointer" 
                                onDoubleClick={() => startEditing('activity', activity.id, activity.name)}
                                title="Double-click to edit"
                              >
                                {activity.name}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEditing('activity', activity.id, activity.name)}
                                  className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-opacity"
                                  title="Edit activity name"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteActivity(task.id, activity.id)}
                                  className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-opacity"
                                  title="Delete activity"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      {weeks.map((week, weekIndex) => (
                        week.days.map((day, dayIndex) => (
                          renderCell(weekIndex, dayIndex, activity)
                        ))
                      ))}
                      <td className="border border-gray-300 p-1 text-center">
                        <div className="w-8 h-8 rounded-full bg-red-100 mx-auto flex items-center justify-center text-sm">
                          {activity.owner}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className={`h-4 rounded-full ${progress > 0 ? 'bg-blue-600' : 'bg-gray-300'}`}
                            style={{ width: `${progress > 0 ? progress : 0}%` }}
                          ></div>
                        </div>
                        <div className="text-center text-xs mt-1 font-semibold">{Math.round(progress)}%</div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Key Notes:</h3>
          <div className="text-xs text-gray-500">
            Created by Daniil Vladimirov (3154227) for AI-Enabled CSV to CSA Transition Thesis
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each task includes a 10% time buffer as requested</li>
          <li>Amber colored cells indicate gateways at the end of key tasks (hover to see details)</li>
          <li>Background literature review runs throughout the project</li>
          <li>The prototype development follows Agile/DevOps methodology with TDD</li>
          <li>Mid-project supervisor review scheduled mid-July</li>
          <li>SME evaluation of generated reports scheduled in August</li>
          <li>Sequential dependencies are maintained in the task flow</li>
          <li>The chart visualizes which tasks can be done in parallel</li>
          <li>Click any colored cell to mark it as completed (gray with checkmark)</li>
          <li>Use &quot;Add Row&quot; button to create new tasks or activities with custom properties</li>
          <li>Drag task rows to reorder them within the project timeline</li>
          <li>Edit or delete tasks and activities using the buttons that appear on hover</li>
          <li>Progress and structure changes are automatically saved in your browser</li>
        </ul>
      </div>
    </div>
  );
};

export default ThesisGanttChart;