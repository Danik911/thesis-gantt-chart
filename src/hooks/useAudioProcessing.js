import { useState, useCallback, useRef, useEffect } from 'react';
import audioProcessingService from '../services/audioProcessingService';

const useAudioProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const processingRef = useRef(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioProcessingService.cleanup();
    };
  }, []);

  // Progress callback handler
  const handleProgress = useCallback((progressData) => {
    setProgress(progressData.progress || 0);
    setStatus(progressData.status || 'processing');
    
    if (progressData.status === 'error') {
      setError(progressData.message || 'Processing failed');
      setIsProcessing(false);
    } else if (progressData.status === 'completed') {
      setIsProcessing(false);
    }
  }, []);

  // Process a single audio file
  const processAudioFile = useCallback(async (file, options = {}) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatus('starting');

      // Validate file
      if (!audioProcessingService.isValidAudioFile(file)) {
        throw new Error('Invalid audio file format');
      }

      const result = await audioProcessingService.processAudioFile(file, {
        progressCallback: handleProgress,
        ...options
      });

      setResults(result);
      setStatus('completed');
      setProgress(100);
      
      return result;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, [handleProgress]);

  // Convert M4A to MP3
  const convertM4AToMP3 = useCallback(async (file) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatus('converting');

      const result = await audioProcessingService.convertM4AToMP3(file, handleProgress);
      setIsProcessing(false);
      setStatus('completed');
      
      return result;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, [handleProgress]);

  // Convert WAV to MP3
  const convertWAVToMP3 = useCallback(async (file) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatus('converting');

      const result = await audioProcessingService.convertWAVToMP3(file, handleProgress);
      setIsProcessing(false);
      setStatus('completed');
      
      return result;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, [handleProgress]);

  // Extract metadata
  const extractMetadata = useCallback(async (file) => {
    try {
      setIsProcessing(true);
      setError(null);
      setStatus('extracting');

      const metadata = await audioProcessingService.extractMetadata(file);
      setIsProcessing(false);
      setStatus('completed');
      
      return metadata;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, []);

  // Generate waveform
  const generateWaveform = useCallback(async (file) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatus('generating');

      const result = await audioProcessingService.generateWaveform(file, handleProgress);
      setIsProcessing(false);
      setStatus('completed');
      
      return result;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, [handleProgress]);

  // Generate client-side waveform (for immediate preview)
  const generateClientWaveform = useCallback(async (audioBuffer, containerId, options = {}) => {
    try {
      setIsProcessing(true);
      setError(null);
      setStatus('generating');

      const result = await audioProcessingService.generateClientWaveform(audioBuffer, containerId, options);
      setIsProcessing(false);
      setStatus('completed');
      
      return result;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, []);

  // Generate thumbnail
  const generateThumbnail = useCallback(async (file) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setStatus('generating');

      const result = await audioProcessingService.generateThumbnail(file, handleProgress);
      setIsProcessing(false);
      setStatus('completed');
      
      return result;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, [handleProgress]);

  // Process multiple files
  const processMultipleFiles = useCallback(async (files, options = {}) => {
    const results = [];
    const totalFiles = files.length;
    
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setStatus('processing');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileProgress = (i / totalFiles) * 100;
        
        setProgress(fileProgress);
        setStatus(`Processing file ${i + 1} of ${totalFiles}`);

        try {
          const result = await audioProcessingService.processAudioFile(file, {
            progressCallback: (progressData) => {
              const totalProgress = fileProgress + (progressData.progress / totalFiles);
              setProgress(totalProgress);
            },
            ...options
          });
          results.push(result);
        } catch (fileError) {
          console.error(`Failed to process file ${file.name}:`, fileError);
          results.push({
            success: false,
            error: fileError.message,
            originalFile: file
          });
        }
      }

      setProgress(100);
      setStatus('completed');
      setIsProcessing(false);
      
      return results;
    } catch (err) {
      setError(err.message);
      setStatus('error');
      setIsProcessing(false);
      throw err;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setStatus('idle');
    setError(null);
    setResults(null);
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    audioProcessingService.clearCache();
  }, []);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    return audioProcessingService.getCacheStats();
  }, []);

  // Validate audio file
  const isValidAudioFile = useCallback((file) => {
    return audioProcessingService.isValidAudioFile(file);
  }, []);

  return {
    // State
    isProcessing,
    progress,
    status,
    error,
    results,
    
    // Actions
    processAudioFile,
    convertM4AToMP3,
    convertWAVToMP3,
    extractMetadata,
    generateWaveform,
    generateClientWaveform,
    generateThumbnail,
    processMultipleFiles,
    reset,
    clearCache,
    
    // Utilities
    getCacheStats,
    isValidAudioFile
  };
};

export default useAudioProcessing; 