// PDF.js configuration utility
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker once globally
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Update worker version to match the current API version (3.11.174)
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

export default pdfjsLib;