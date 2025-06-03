import React, { useState, useEffect } from 'react';
import exportService from '../services/exportService';

const ExportPanel = ({ isOpen, onClose, ganttData = [] }) => {
  const [activeTab, setActiveTab] = useState('formats');
  const [exportOptions, setExportOptions] = useState({
    includeCompleted: true,
    includePending: true,
    includeInProgress: true,
    specificTasks: [],
    includeFiles: false,
    includeNotes: false,
    customTitle: '',
    watermark: {
      enabled: false,
      text: '',
      opacity: 0.1
    }
  });
  
  const [exportProgress, setExportProgress] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportResults, setExportResults] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Available tasks for filtering
  const [availableTasks, setAvailableTasks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const data = exportService.getGanttData();
      setAvailableTasks(data);
      
      // Reset state when opening
      setExportResults([]);
      setExportProgress({});
      setIsExporting(false);
    }
  }, [isOpen]);

  const handleExportOptionChange = (key, value) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleWatermarkChange = (key, value) => {
    setExportOptions(prev => ({
      ...prev,
      watermark: {
        ...prev.watermark,
        [key]: value
      }
    }));
  };

  const handleTaskSelection = (taskId, selected) => {
    setExportOptions(prev => ({
      ...prev,
      specificTasks: selected 
        ? [...prev.specificTasks, taskId]
        : prev.specificTasks.filter(id => id !== taskId)
    }));
  };

  const getExportOptionsForService = () => {
    const options = { ...exportOptions };
    
    // Only include watermark if enabled
    if (!options.watermark.enabled || !options.watermark.text) {
      options.watermark = null;
    }
    
    // Only include specific tasks if any are selected
    if (options.specificTasks.length === 0) {
      options.specificTasks = null;
    }
    
    // Only include custom title if provided
    if (!options.customTitle.trim()) {
      options.customTitle = null;
    }
    
    return options;
  };

  const performExport = async (exportType) => {
    setIsExporting(true);
    const exportId = `${exportType}_${Date.now()}`;
    
    try {
      // Register progress callback
      exportService.registerProgressCallback(exportId, (progress) => {
        setExportProgress(prev => ({
          ...prev,
          [exportType]: progress
        }));
      });

      const options = getExportOptionsForService();
      let result;

      switch (exportType) {
        case 'pdf':
          result = await exportService.exportToPDF(options);
          break;
        case 'excel':
          result = await exportService.exportToExcel(options);
          break;
        case 'powerpoint':
          result = await exportService.exportToPowerPoint(options);
          break;
        case 'json':
          result = await exportService.exportToJSON(options);
          break;
        case 'zip':
          result = await exportService.exportToZIP(options);
          break;
        default:
          throw new Error(`Unknown export type: ${exportType}`);
      }

      // Update results
      setExportResults(prev => [...prev, {
        type: exportType,
        timestamp: new Date(),
        ...result
      }]);

      // Clear progress after a delay
      setTimeout(() => {
        setExportProgress(prev => {
          const updated = { ...prev };
          delete updated[exportType];
          return updated;
        });
      }, 2000);

    } catch (error) {
      console.error(`Export failed for ${exportType}:`, error);
      setExportResults(prev => [...prev, {
        type: exportType,
        timestamp: new Date(),
        success: false,
        error: error.message
      }]);
    } finally {
      setIsExporting(false);
    }
  };

  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Portable document with timeline table',
      icon: '📄',
      color: 'bg-red-500'
    },
    {
      id: 'excel',
      name: 'Excel',
      description: 'Spreadsheet with timeline and summary',
      icon: '📊',
      color: 'bg-green-500'
    },
    {
      id: 'powerpoint',
      name: 'PowerPoint',
      description: 'Presentation slides with overview',
      icon: '📽️',
      color: 'bg-orange-500'
    },
    {
      id: 'json',
      name: 'JSON',
      description: 'Raw data for import/backup',
      icon: '📋',
      color: 'bg-blue-500'
    },
    {
      id: 'zip',
      name: 'ZIP Archive',
      description: 'Complete export package',
      icon: '📦',
      color: 'bg-purple-500'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Export GANTT Chart</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('formats')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'formats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Export Formats
          </button>
          <button
            onClick={() => setActiveTab('options')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'options'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Options
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Results ({exportResults.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Export Formats Tab */}
          {activeTab === 'formats' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Select an export format to generate your GANTT chart presentation files.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exportFormats.map((format) => (
                  <div
                    key={format.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-3">
                      <div className={`w-10 h-10 ${format.color} rounded-lg flex items-center justify-center text-white text-lg mr-3`}>
                        {format.icon}
                      </div>
                      <h3 className="font-semibold text-gray-900">{format.name}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">{format.description}</p>
                    
                    {/* Progress bar */}
                    {exportProgress[format.id] && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{exportProgress[format.id].message}</span>
                          <span>{Math.round(exportProgress[format.id].progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${exportProgress[format.id].progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => performExport(format.id)}
                      disabled={isExporting}
                      className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isExporting
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {exportProgress[format.id] ? 'Exporting...' : `Export ${format.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options Tab */}
          {activeTab === 'options' && (
            <div className="space-y-6">
              {/* Content Filters */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Content Filters</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCompleted}
                      onChange={(e) => handleExportOptionChange('includeCompleted', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Completed Activities</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeInProgress}
                      onChange={(e) => handleExportOptionChange('includeInProgress', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">In Progress Activities</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includePending}
                      onChange={(e) => handleExportOptionChange('includePending', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Pending Activities</span>
                  </label>
                </div>
              </div>

              {/* Task Selection */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Task Selection</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Leave unchecked to include all tasks, or select specific tasks to export.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableTasks.map((task) => (
                    <label key={task.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.specificTasks.includes(task.id)}
                        onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm truncate">{task.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Title */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Custom Title</h3>
                <input
                  type="text"
                  value={exportOptions.customTitle}
                  onChange={(e) => handleExportOptionChange('customTitle', e.target.value)}
                  placeholder="Leave empty to use default title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Advanced Options */}
              <div className="bg-gray-50 rounded-lg p-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="font-semibold text-gray-900">Advanced Options</h3>
                  <svg
                    className={`w-5 h-5 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    {/* Watermark */}
                    <div>
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={exportOptions.watermark.enabled}
                          onChange={(e) => handleWatermarkChange('enabled', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Add Watermark</span>
                      </label>
                      
                      {exportOptions.watermark.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <input
                            type="text"
                            value={exportOptions.watermark.text}
                            onChange={(e) => handleWatermarkChange('text', e.target.value)}
                            placeholder="Watermark text"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Opacity: {Math.round(exportOptions.watermark.opacity * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0.05"
                              max="0.5"
                              step="0.05"
                              value={exportOptions.watermark.opacity}
                              onChange={(e) => handleWatermarkChange('opacity', parseFloat(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Options */}
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeFiles}
                          onChange={(e) => handleExportOptionChange('includeFiles', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Include Associated Files</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeNotes}
                          onChange={(e) => handleExportOptionChange('includeNotes', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Include Notes</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {exportResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No exports have been generated yet.</p>
                  <p className="text-sm">Switch to the Export Formats tab to begin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exportResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-3 ${
                            result.success ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {result.success ? '✓' : '✗'}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{result.type} Export</p>
                            <p className="text-sm text-gray-600">
                              {result.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {result.success ? (
                            <p className="text-sm text-green-600 font-medium">
                              Downloaded: {result.filename}
                            </p>
                          ) : (
                            <p className="text-sm text-red-600">
                              Error: {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {availableTasks.length} tasks available for export
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel; 