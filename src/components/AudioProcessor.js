import React, { useState, useRef } from 'react';
import useAudioProcessing from '../hooks/useAudioProcessing';

const AudioProcessor = () => {
  const fileInputRef = useRef();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processedResults, setProcessedResults] = useState([]);
  const [processingMode, setProcessingMode] = useState('complete'); // complete, convert, metadata, waveform

  const {
    isProcessing,
    progress,
    status,
    error,
    results,
    processAudioFile,
    convertM4AToMP3,
    convertWAVToMP3,
    extractMetadata,
    generateWaveform,
    processMultipleFiles,
    reset,
    clearCache,
    getCacheStats,
    isValidAudioFile
  } = useAudioProcessing();

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => isValidAudioFile(file));
    
    if (validFiles.length !== files.length) {
      alert(`${files.length - validFiles.length} files were skipped (invalid audio format)`);
    }
    
    setSelectedFiles(validFiles);
    reset();
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;

    try {
      let results;
      
      if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        
        switch (processingMode) {
          case 'complete':
            results = await processAudioFile(file);
            break;
          case 'convert':
            if (file.type.includes('m4a')) {
              results = await convertM4AToMP3(file);
            } else if (file.type.includes('wav')) {
              results = await convertWAVToMP3(file);
            } else {
              throw new Error('File does not need conversion');
            }
            break;
          case 'metadata':
            results = await extractMetadata(file);
            break;
          case 'waveform':
            results = await generateWaveform(file);
            break;
          default:
            results = await processAudioFile(file);
        }
        
        setProcessedResults([results]);
      } else {
        // Multiple files - always use complete processing
        results = await processMultipleFiles(selectedFiles);
        setProcessedResults(results);
      }
    } catch (err) {
      console.error('Processing failed:', err);
    }
  };

  const handleClearCache = () => {
    clearCache();
    alert('Cache cleared successfully');
  };

  const handleReset = () => {
    reset();
    setSelectedFiles([]);
    setProcessedResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cacheStats = getCacheStats();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Audio File Processor</h2>
      
      {/* File Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Audio Files (M4A, WAV, MP3, etc.)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.m4a,.wav,.mp3,.aac,.ogg"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Processing Mode Selection */}
      {selectedFiles.length === 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Processing Mode
          </label>
          <select
            value={processingMode}
            onChange={(e) => setProcessingMode(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="complete">Complete Processing (All features)</option>
            <option value="convert">Convert Only (M4A/WAV → MP3)</option>
            <option value="metadata">Extract Metadata Only</option>
            <option value="waveform">Generate Waveform Only</option>
          </select>
        </div>
      )}

      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Selected Files:</h3>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <span className="font-medium text-gray-800">{file.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({formatFileSize(file.size)}, {file.type || 'Unknown type'})
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {file.type.includes('m4a') && '🔄 Will convert to MP3'}
                  {file.type.includes('wav') && '🔄 Will convert to MP3'}
                  {file.type.includes('mp3') && '✅ Already compatible'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleProcess}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : `Process ${selectedFiles.length} file(s)`}
        </button>
        
        <button
          onClick={handleReset}
          disabled={isProcessing}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        
        <button
          onClick={handleClearCache}
          disabled={isProcessing}
          className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Clear Cache
        </button>
      </div>

      {/* Progress Display */}
      {isProcessing && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Processing Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Status: {status}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <h4 className="font-semibold">Error:</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Results Display */}
      {processedResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Results:</h3>
          <div className="space-y-6">
            {processedResults.map((result, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">
                  {result.originalFile?.name || `File ${index + 1}`}
                  {result.success === false && <span className="text-red-500 ml-2">(Failed)</span>}
                  {result.fallback && <span className="text-orange-500 ml-2">(Fallback)</span>}
                </h4>

                {/* Metadata Display */}
                {result.metadata && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Metadata:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div><strong>Title:</strong> {result.metadata.title}</div>
                      <div><strong>Artist:</strong> {result.metadata.artist}</div>
                      <div><strong>Album:</strong> {result.metadata.album}</div>
                      <div><strong>Duration:</strong> {formatDuration(result.metadata.duration)}</div>
                      <div><strong>Bitrate:</strong> {result.metadata.bitrate} kbps</div>
                      <div><strong>Sample Rate:</strong> {result.metadata.sampleRate} Hz</div>
                      <div><strong>Channels:</strong> {result.metadata.channels}</div>
                      <div><strong>Format:</strong> {result.metadata.format}</div>
                      <div><strong>Size:</strong> {formatFileSize(result.metadata.fileSize)}</div>
                    </div>
                  </div>
                )}

                {/* Conversion Results */}
                {result.conversion && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Conversion:</h5>
                    {result.conversion.success ? (
                      <div className="space-y-2">
                        <p className="text-green-600">✅ Successfully converted to MP3</p>
                        <p className="text-sm">
                          <strong>Size:</strong> {formatFileSize(result.conversion.size)}
                        </p>
                        <a
                          href={result.conversion.ssl_url || result.conversion.convertedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Download Converted File
                        </a>
                      </div>
                    ) : (
                      <p className="text-red-600">❌ Conversion failed</p>
                    )}
                  </div>
                )}

                {/* Waveform Results */}
                {result.waveform && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Waveform:</h5>
                    {result.waveform.success ? (
                      <div className="space-y-2">
                        <p className="text-green-600">✅ Waveform generated</p>
                        <img
                          src={result.waveform.ssl_url || result.waveform.waveformUrl}
                          alt="Audio Waveform"
                          className="max-w-full h-auto border rounded"
                        />
                        <a
                          href={result.waveform.ssl_url || result.waveform.waveformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Download Waveform
                        </a>
                      </div>
                    ) : (
                      <p className="text-red-600">❌ Waveform generation failed</p>
                    )}
                  </div>
                )}

                {/* Thumbnail Results */}
                {result.thumbnail && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Thumbnail:</h5>
                    {result.thumbnail.success ? (
                      <div className="space-y-2">
                        <p className="text-green-600">✅ Thumbnail generated</p>
                        <img
                          src={result.thumbnail.ssl_url || result.thumbnail.thumbnailUrl}
                          alt="Audio Thumbnail"
                          className="h-12 border rounded"
                        />
                        <a
                          href={result.thumbnail.ssl_url || result.thumbnail.thumbnailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                        >
                          Download Thumbnail
                        </a>
                      </div>
                    ) : (
                      <p className="text-red-600">❌ Thumbnail generation failed</p>
                    )}
                  </div>
                )}

                {/* Error Information */}
                {result.error && (
                  <div className="mb-4">
                    <p className="text-red-600">Error: {result.error}</p>
                    {result.fallback && result.originalUrl && (
                      <a
                        href={result.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm mt-2"
                      >
                        Use Original File
                      </a>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-500">
                  Processed: {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Information */}
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Cache Statistics:</h3>
        <div className="text-xs text-gray-600">
          <p>Cached items: {cacheStats.size} / {cacheStats.maxSize}</p>
          <p>Cache expiry: {Math.round(cacheStats.expiryTime / 1000 / 60)} minutes</p>
        </div>
      </div>
    </div>
  );
};

export default AudioProcessor; 