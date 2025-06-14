import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import PropTypes from 'prop-types';
import './Calendar.css';

const Calendar = ({ 
  onDateSelect, 
  selectedDate, 
  daysWithEntries = [],
  locale = 'en',
  className = ''
}) => {
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Date range constraints: June 1 - September 1
  const validRange = {
    start: new Date(new Date().getFullYear(), 5, 1), // June 1st (month is 0-indexed)
    end: new Date(new Date().getFullYear(), 8, 2)    // September 2nd (end is exclusive)
  };

  // Handle date clicks
  const handleDateClick = useCallback((info) => {
    const clickedDate = info.date;
    
    // Check if date is within valid range
    if (clickedDate >= validRange.start && clickedDate < validRange.end) {
      if (onDateSelect) {
        onDateSelect(clickedDate);
      }
      // Don't change the view when selecting a date - stay in current view
    }
  }, [onDateSelect, validRange.start, validRange.end]);

  // Handle view changes - FIXED to prevent unwanted view changes
  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
  }, []);

  // Go to today
  const goToToday = useCallback(() => {
    const today = new Date();
    if (today >= validRange.start && today < validRange.end) {
      setCurrentDate(today);
      if (onDateSelect) {
        onDateSelect(today);
      }
    } else {
      // If today is outside range, go to the start of the range
      setCurrentDate(validRange.start);
      if (onDateSelect) {
        onDateSelect(validRange.start);
      }
    }
  }, [validRange.start, validRange.end, onDateSelect]);

  // Create events for days with entries
  const events = daysWithEntries.map(date => ({
    id: `entry-${date}`,
    start: date,
    display: 'background',
    backgroundColor: '#dcfce7', // light green background
    borderColor: '#16a34a',     // green border
    classNames: ['has-entries']
  }));

  // Add selected date as an event if it exists
  if (selectedDate) {
    const selectedDateString = selectedDate.toISOString().split('T')[0];
    const isAlreadyMarked = daysWithEntries.includes(selectedDateString);
    
    if (!isAlreadyMarked) {
      events.push({
        id: 'selected-date',
        start: selectedDate,
        display: 'background',
        backgroundColor: '#dbeafe', // light blue background
        borderColor: '#2563eb',     // blue border
        classNames: ['selected-date']
      });
    }
  }

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event) => {
    if (!event.target.closest('.fc')) return;

    const calendarApi = event.target.closest('.fc')?.__fullCalendar?.view?.calendar;
    if (!calendarApi) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        calendarApi.prev();
        break;
      case 'ArrowRight':
        event.preventDefault();
        calendarApi.next();
        break;
      case 't':
      case 'T':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          goToToday();
        }
        break;
      case '1':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleViewChange('dayGridMonth');
        }
        break;
      case '2':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleViewChange('timeGridWeek');
        }
        break;
      default:
        break;
    }
  }, [goToToday, handleViewChange]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`calendar-container ${className}`}>
      {/* Calendar Controls */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Calendar View
          </h2>
          <span className="text-sm text-gray-500">
            (June - September {new Date().getFullYear()})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('dayGridMonth')}
              className={`px-3 py-1 text-sm rounded transition-all ${
                currentView === 'dayGridMonth'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-label="Month view"
              title="Month view (Ctrl+1)"
            >
              Month
            </button>
            <button
              onClick={() => handleViewChange('timeGridWeek')}
              className={`px-3 py-1 text-sm rounded transition-all ${
                currentView === 'timeGridWeek'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-label="Week view"
              title="Week view (Ctrl+2)"
            >
              Week
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            aria-label="Go to today"
            title="Go to today (Ctrl+T)"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
          <span className="text-gray-600">Days with entries</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
          <span className="text-gray-600">Selected date</span>
        </div>
        <div className="text-gray-500 text-xs">
          Keyboard: ← → (navigate) | Ctrl+T (today) | Ctrl+1/2 (views)
        </div>
      </div>

      {/* FullCalendar Component */}
      <div className="calendar-wrapper bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          initialDate={currentDate}
          locale={locale}
          validRange={validRange}
          events={events}
          dateClick={handleDateClick}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: ''
          }}
          height="auto"
          dayMaxEvents={true}
          moreLinkClick="popover"
          selectMirror={true}
          dayHeaders={true}
          weekNumbers={false}
          navLinks={true}
          selectable={true}
          selectHelper={true}
          editable={false}
          eventDisplay="auto"
          displayEventTime={false}
          allDayDefault={true}
          weekNumberCalculation="ISO"
          firstDay={1} // Start week on Monday
          
          // Accessibility
          eventDidMount={(info) => {
            const element = info.el;
            if (info.event.classNames.includes('has-entries')) {
              element.setAttribute('aria-label', `Date with entries: ${info.event.startStr}`);
              element.setAttribute('role', 'button');
              element.setAttribute('tabindex', '0');
            } else if (info.event.classNames.includes('selected-date')) {
              element.setAttribute('aria-label', `Selected date: ${info.event.startStr}`);
            }
          }}
          
          // Custom styling
          dayClassNames={(dayInfo) => {
            const dateString = dayInfo.date.toISOString().split('T')[0];
            const classes = [];
            
            if (daysWithEntries.includes(dateString)) {
              classes.push('fc-day-with-entries');
            }
            
            if (selectedDate && dateString === selectedDate.toISOString().split('T')[0]) {
              classes.push('fc-day-selected');
            }
            
            return classes;
          }}
        />
      </div>
    </div>
  );
};

Calendar.propTypes = {
  onDateSelect: PropTypes.func,
  selectedDate: PropTypes.instanceOf(Date),
  daysWithEntries: PropTypes.arrayOf(PropTypes.string),
  locale: PropTypes.string,
  className: PropTypes.string
};

export default Calendar; 