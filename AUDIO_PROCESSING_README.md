# Audio File Processing Feature

This document describes the audio file processing functionality implemented for the thesis-gantt-chart project.

## Overview

The audio processing feature provides comprehensive audio file handling capabilities including:

- **Format Conversion**: M4A and WAV to MP3 conversion for web compatibility
- **Metadata Extraction**: Extract title, artist, album, duration, and technical details
- **Waveform Generation**: Visual representation of audio files
- **Thumbnail Creation**: Small preview images for quick identification
- **Server-side Caching**: Intelligent caching for processed files
- **Progress Tracking**: Real-time progress updates during processing
- **Fallback Support**: Graceful handling when processing fails

## Technology Stack

- **Transloadit**: Cloud-based audio processing service
- **music-metadata**: JavaScript library for metadata extraction
- **WaveSurfer.js**: Client-side waveform generation and audio visualization
- **React Hooks**: Custom hooks for easy integration

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the project root with your Transloadit credentials:

```env
# Transloadit API Configuration
REACT_APP_TRANSLOADIT_AUTH_KEY=your_transloadit_auth_key_here
REACT_APP_TRANSLOADIT_AUTH_SECRET=your_transloadit_auth_secret_here
```

### 2. Get Transloadit Credentials

1. Sign up at [Transloadit](https://transloadit.com)
2. Go to your [Dashboard](https://transloadit.com/dashboard/)
3. Create a new account or use existing credentials
4. Copy your Auth Key and Auth Secret

### 3. Install Dependencies

The required dependencies have been added to `package.json`:

```bash
npm install
```

## File Structure

```
src/
├── services/
│   └── audioProcessingService.js    # Core audio processing service
├── hooks/
│   └── useAudioProcessing.js        # React hook for components
├── components/
│   └── AudioProcessor.js            # Demo component
```

## Core Components

### AudioProcessingService

The main service (`src/services/audioProcessingService.js`) provides:

- **Transloadit Integration**: Handles cloud-based audio processing
- **Caching System**: LRU cache with configurable expiry
- **Progress Tracking**: Real-time processing updates
- **Error Handling**: Graceful fallbacks when processing fails

#### Key Methods:

```javascript
// Process audio file completely
await audioProcessingService.processAudioFile(file, options);

// Convert M4A to MP3
await audioProcessingService.convertM4AToMP3(file);

// Convert WAV to MP3  
await audioProcessingService.convertWAVToMP3(file);

// Extract metadata
await audioProcessingService.extractMetadata(file);

// Generate waveform
await audioProcessingService.generateWaveform(file);

// Generate thumbnail
await audioProcessingService.generateThumbnail(file);
```

### useAudioProcessing Hook

The React hook (`src/hooks/useAudioProcessing.js`) provides:

- State management for processing operations
- Progress tracking
- Error handling
- Easy-to-use interface for components

#### Usage Example:

```javascript
import useAudioProcessing from '../hooks/useAudioProcessing';

const MyComponent = () => {
  const {
    isProcessing,
    progress,
    status,
    error,
    processAudioFile,
    reset
  } = useAudioProcessing();

  const handleFileUpload = async (file) => {
    try {
      const result = await processAudioFile(file);
      console.log('Processing complete:', result);
    } catch (err) {
      console.error('Processing failed:', err);
    }
  };

  return (
    <div>
      {isProcessing && <div>Progress: {progress}%</div>}
      {error && <div>Error: {error}</div>}
      {/* File upload UI */}
    </div>
  );
};
```

### AudioProcessor Component

Demo component (`src/components/AudioProcessor.js`) showcasing:

- File selection with validation
- Multiple processing modes
- Progress visualization
- Results display with download links
- Cache management

## Processing Flow

1. **File Validation**: Check if file is a valid audio format
2. **Metadata Extraction**: Extract audio metadata using music-metadata
3. **Format Conversion**: Convert M4A/WAV to MP3 using Transloadit
4. **Waveform Generation**: Create visual waveform using Transloadit
5. **Thumbnail Creation**: Generate small preview image
6. **Caching**: Store results for future use
7. **Fallback**: Provide original file if processing fails

## Supported Audio Formats

### Input Formats:
- M4A (converts to MP3)
- WAV (converts to MP3)
- MP3 (already compatible)
- AAC
- OGG
- WebM

### Output Formats:
- MP3 (optimized for web)
- PNG (for waveforms and thumbnails)

## Features

### Intelligent Caching
- LRU (Least Recently Used) cache eviction
- Configurable cache size and expiry time
- Per-operation caching (metadata, conversion, waveform)
- Cache statistics and management

### Progress Tracking
- Real-time progress updates
- Status messages for each processing step
- Error reporting with detailed messages
- Support for batch processing

### Error Handling
- Graceful fallbacks when processing fails
- Detailed error messages
- Original file preservation
- Retry mechanisms

### Performance Optimization
- Client-side metadata extraction (faster)
- Server-side heavy processing via Transloadit
- Parallel processing support
- Efficient caching system

## Integration Examples

### Basic File Processing

```javascript
import audioProcessingService from './services/audioProcessingService';

// Process a single file
const result = await audioProcessingService.processAudioFile(file, {
  progressCallback: (progress) => {
    console.log(`Progress: ${progress.progress}% - ${progress.message}`);
  }
});

if (result.success) {
  console.log('Conversion URL:', result.conversion?.ssl_url);
  console.log('Waveform URL:', result.waveform?.ssl_url);
  console.log('Metadata:', result.metadata);
}
```

### Using with React Components

```javascript
import useAudioProcessing from './hooks/useAudioProcessing';

const FileUploader = () => {
  const { processAudioFile, isProcessing, progress } = useAudioProcessing();
  
  const handleUpload = async (files) => {
    for (const file of files) {
      const result = await processAudioFile(file);
      // Handle result
    }
  };
  
  return (
    <div>
      <input type="file" onChange={e => handleUpload(e.target.files)} />
      {isProcessing && <progress value={progress} max="100" />}
    </div>
  );
};
```

### Batch Processing

```javascript
const { processMultipleFiles } = useAudioProcessing();

const results = await processMultipleFiles(filesArray, {
  progressCallback: (progress) => {
    console.log(`Batch progress: ${progress.progress}%`);
  }
});

results.forEach((result, index) => {
  if (result.success) {
    console.log(`File ${index + 1} processed successfully`);
  } else {
    console.log(`File ${index + 1} failed:`, result.error);
  }
});
```

## Testing Strategy

### Unit Tests
- Test metadata extraction accuracy
- Validate file format detection
- Check caching functionality
- Verify error handling

### Integration Tests  
- Test Transloadit API integration
- Verify conversion accuracy
- Test waveform generation
- Validate progress tracking

### End-to-End Tests
- Test complete processing workflow
- Verify fallback mechanisms
- Test batch processing
- Check UI components

### Manual Testing
- Upload various audio formats
- Test with large files
- Verify progress indicators
- Test error scenarios

## Performance Considerations

### Client-Side Optimizations
- Metadata extraction happens locally (faster)
- File validation before upload
- Progressive loading of results
- Efficient React state management

### Server-Side Optimizations
- Transloadit handles heavy processing
- Parallel processing support
- Optimized audio encoding settings
- CDN delivery for processed files

### Caching Strategy
- Aggressive caching of processed results
- Intelligent cache eviction
- Configurable cache settings
- Cache statistics monitoring

## Security Considerations

- API keys stored in environment variables
- File type validation before processing
- Size limits on uploaded files
- Secure HTTPS connections to Transloadit
- No sensitive data in client-side code

## Troubleshooting

### Common Issues

1. **Missing API Credentials**
   - Ensure `.env` file exists with valid Transloadit credentials
   - Check environment variable names are correct

2. **Processing Failures**
   - Verify file format is supported
   - Check file size limits
   - Ensure stable internet connection

3. **Cache Issues**
   - Clear cache using `clearCache()` method
   - Check cache size limits
   - Verify cache expiry settings

### Debug Mode

Enable debug logging:
```env
REACT_APP_DEBUG_AUDIO_PROCESSING=true
```

## Future Enhancements

- Support for additional audio formats
- Real-time audio streaming
- Advanced waveform customization
- Batch operation optimization
- Integration with cloud storage services
- Audio quality analysis
- Automatic volume normalization

## Dependencies

```json
{
  "@transloadit/sdk": "^3.3.1",
  "@uppy/transloadit": "^3.2.0", 
  "music-metadata": "^7.14.0",
  "wavesurfer.js": "^7.8.2"
}
```

## API Reference

See the inline documentation in the service files for detailed API reference and method signatures.

## License

This audio processing feature is part of the thesis-gantt-chart project and follows the same licensing terms. 