// Temporary export service replacement for deployment
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';
// import * as XLSX from 'xlsx';
// import PptxGenJS from 'pptxgenjs';
// import JSZip from 'jszip';
import { saveAs } from 'file-saver';

class ExportService {
  constructor() {
    this.progressCallbacks = new Map();
    this.templates = {
      pdf: {
        title: 'Thesis GANTT Chart',
        author: 'Thesis Project',
        colors: {
          primary: '#2563eb',
          secondary: '#64748b',
          accent: '#10b981',
          completed: '#22c55e',
          inProgress: '#f59e0b',
          pending: '#6b7280'
        }
      },
      excel: {
        sheetName: 'GANTT Chart',
        headerStyle: {
          font: { bold: true, sz: 12 },
          fill: { fgColor: { rgb: '2563eb' } },
          alignment: { horizontal: 'center' }
        }
      },
      powerpoint: {
        title: 'Thesis GANTT Chart Presentation',
        subtitle: 'Project Timeline and Progress',
        layout: 'LAYOUT_16x9'
      }
    };
    
    this.exportOptions = {
      includeCompleted: true,
      includePending: true,
      includeInProgress: true,
      dateRange: null,
      specificTasks: null,
      includeFiles: false,
      includeNotes: false,
      watermark: null,
      customTitle: null
    };
  }

  // Progress tracking
  registerProgressCallback(exportId, callback) {
    this.progressCallbacks.set(exportId, callback);
  }

  updateProgress(exportId, progress, message = '') {
    const callback = this.progressCallbacks.get(exportId);
    if (callback) {
      callback({ progress, message });
    }
  }

  // Data retrieval and processing
  getGanttData() {
    try {
      const stored = localStorage.getItem('gantt-tasks');
      if (!stored) return [];
      
      const data = JSON.parse(stored);
      
      if (data.v === 1 && data.t) {
        return data.t.map(task => ({
          id: task.i,
          name: task.n,
          activities: task.a.map(activity => ({
            id: activity.i,
            name: activity.n,
            weeks: activity.w,
            days: activity.d,
            owner: activity.o,
            color: activity.c,
            isGateway: activity.g,
            gatewayInfo: activity.gi,
            files: activity.files || []
          }))
        }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to retrieve GANTT data:', error);
      return [];
    }
  }

  getCompletedDays() {
    try {
      const completed = localStorage.getItem('gantt-completed-days');
      return completed ? JSON.parse(completed) : {};
    } catch (error) {
      return {};
    }
  }

  filterDataByOptions(data, options = {}) {
    const mergedOptions = { ...this.exportOptions, ...options };
    let filteredData = [...data];

    if (mergedOptions.specificTasks && mergedOptions.specificTasks.length > 0) {
      filteredData = filteredData.filter(task => 
        mergedOptions.specificTasks.includes(task.id)
      );
    }

    filteredData = filteredData.map(task => ({
      ...task,
      activities: task.activities.filter(activity => {
        const progress = this.calculateActivityProgress(activity);
        if (progress === 100 && !mergedOptions.includeCompleted) return false;
        if (progress > 0 && progress < 100 && !mergedOptions.includeInProgress) return false;
        if (progress === 0 && !mergedOptions.includePending) return false;
        return true;
      })
    })).filter(task => task.activities.length > 0);

    return filteredData;
  }

  calculateActivityProgress(activity) {
    const completedDays = this.getCompletedDays();
    let totalDays = 0;
    let completedCount = 0;

    activity.weeks.forEach(weekIndex => {
      activity.days.forEach(dayIndex => {
        totalDays++;
        const dayKey = `${activity.id}_${weekIndex}_${dayIndex}`;
        if (completedDays[dayKey]) {
          completedCount++;
        }
      });
    });

    return totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
  }

  // Temporary disabled methods
  async exportToPDF(options = {}) {
    console.warn('PDF export temporarily disabled for deployment');
    throw new Error('PDF export is temporarily disabled for deployment. Please use JSON export instead.');
  }

  async exportToExcel(options = {}) {
    console.warn('Excel export temporarily disabled for deployment');
    throw new Error('Excel export is temporarily disabled for deployment. Please use JSON export instead.');
  }

  async exportToPowerPoint(options = {}) {
    console.warn('PowerPoint export temporarily disabled for deployment');
    throw new Error('PowerPoint export is temporarily disabled for deployment. Please use JSON export instead.');
  }

  async exportToZIP(options = {}) {
    console.warn('ZIP export temporarily disabled for deployment');
    throw new Error('ZIP export is temporarily disabled for deployment. Please use JSON export instead.');
  }

  // Working exports
  async exportToJSON(options = {}) {
    const exportId = `json_${Date.now()}`;
    try {
      this.updateProgress(exportId, 10, 'Initializing JSON export...');
      
      const data = this.getGanttData();
      const filteredData = this.filterDataByOptions(data, options);
      
      this.updateProgress(exportId, 30, 'Processing data...');
      
      const exportData = {
        meta: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          title: options.customTitle || this.templates.pdf.title,
          totalTasks: filteredData.length,
          totalActivities: filteredData.reduce((sum, task) => sum + task.activities.length, 0)
        },
        tasks: filteredData,
        completedDays: this.getCompletedDays(),
        options: options
      };

      this.updateProgress(exportId, 70, 'Creating JSON file...');
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      this.updateProgress(exportId, 90, 'Saving file...');
      
      const filename = `gantt-chart-${new Date().toISOString().split('T')[0]}.json`;
      saveAs(blob, filename);
      
      this.updateProgress(exportId, 100, 'JSON export completed');
      
      return {
        success: true,
        filename,
        data: exportData
      };
    } catch (error) {
      console.error('JSON export failed:', error);
      throw error;
    }
  }

  generateCSV(data) {
    let csv = 'Task,Activity,Owner,Progress,Total Days,Completed Days,Start Week,Duration\n';
    
    data.forEach(task => {
      task.activities.forEach(activity => {
        const progress = this.calculateActivityProgress(activity);
        const totalDays = activity.weeks.length * activity.days.length;
        const completedDays = Math.round((progress / 100) * totalDays);
        const startWeek = Math.min(...activity.weeks);
        const duration = activity.weeks.length;
        
        csv += `"${task.name}","${activity.name}","${activity.owner}",${progress}%,${totalDays},${completedDays},${startWeek},${duration}\n`;
      });
    });
    
    return csv;
  }

  generateTextSummary(data) {
    let summary = 'GANTT Chart Summary\n';
    summary += '==================\n\n';
    summary += `Generated on: ${new Date().toLocaleString()}\n`;
    summary += `Total Tasks: ${data.length}\n`;
    summary += `Total Activities: ${data.reduce((sum, task) => sum + task.activities.length, 0)}\n\n`;
    
    data.forEach(task => {
      summary += `Task: ${task.name}\n`;
      summary += '-'.repeat(task.name.length + 6) + '\n';
      
      task.activities.forEach(activity => {
        const progress = this.calculateActivityProgress(activity);
        summary += `  • ${activity.name} (${activity.owner}) - ${progress}% complete\n`;
      });
      
      summary += '\n';
    });
    
    return summary;
  }

  // Utility methods
  getWeekHeaders() {
    return Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`);
  }

  updateTemplate(type, updates) {
    if (this.templates[type]) {
      this.templates[type] = { ...this.templates[type], ...updates };
    }
  }

  getTemplate(type) {
    return this.templates[type] || null;
  }

  setDefaultExportOptions(options) {
    this.exportOptions = { ...this.exportOptions, ...options };
  }

  getDefaultExportOptions() {
    return { ...this.exportOptions };
  }

  cleanup() {
    this.progressCallbacks.clear();
  }
}

// Create singleton instance
const exportService = new ExportService();

export default exportService; 