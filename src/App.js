import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Import IndexedDB reset utility for debugging
import './utils/indexedDBReset';

// Lazy loaded components for better performance
const WeeklyGanttChart = lazy(() => import('./components/WeeklyGanttChart'));
const DailyProgress = lazy(() => import('./components/DailyProgress'));
const TextNotesWithLocalStorage = lazy(() => import('./components/TextNotesWithLocalStorage'));
const FileUploadPage = lazy(() => import('./components/FileUploadPage'));
const GitHubFileManager = lazy(() => import('./components/GitHubFileManager'));
const PDFManager = lazy(() => import('./components/PDFManager'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const AuditLog = lazy(() => import('./components/AuditLog'));

function App() {
  // Register service worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/thesis-gantt-chart/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50 flex flex-col safe-area-top safe-area-bottom">
            <Navigation />
          
          <main className="flex-1 transition-all duration-300 safe-area-left safe-area-right">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh] px-4">
              <LoadingSpinner message="Loading page..." size="large" />
            </div>
          }>
            <Routes>
              <Route 
                path="/" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <WeeklyGanttChart />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/daily-progress" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <DailyProgress />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/text-notes" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <TextNotesWithLocalStorage />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/file-upload" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <FileUploadPage />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/pdf-manager" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <PDFManager />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/github-files" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <GitHubFileManager />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/user-management" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <UserManagement />
                    </div>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="/audit-log" 
                element={
                  <ErrorBoundary>
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <AuditLog />
                    </div>
                  </ErrorBoundary>
                } 
              />
              {/* Catch-all route for 404 errors */}
              <Route 
                path="*" 
                element={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center max-w-md mx-auto">
                      <div className="text-6xl sm:text-8xl mb-6">📋</div>
                      <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-800 mb-4">404</h1>
                      <p className="text-gray-600 mb-8 text-base sm:text-lg leading-relaxed">
                        Oops! The page you&rsquo;re looking for doesn&rsquo;t exist. Let&rsquo;s get you back on track.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <a 
                          href="/" 
                          className="inline-flex items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation min-h-[48px] w-full sm:w-auto focus-mobile"
                        >
                          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Go Home
                        </a>
                        <button 
                          onClick={() => window.history.back()}
                          className="inline-flex items-center justify-center bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors touch-manipulation min-h-[48px] w-full sm:w-auto focus-mobile"
                        >
                          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                          Go Back
                        </button>
                      </div>
                    </div>
                  </div>
                } 
              />
            </Routes>
          </Suspense>
          </main>
        </div>
      </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;