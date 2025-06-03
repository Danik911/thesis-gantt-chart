import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import WeeklyGanttChart from './components/WeeklyGanttChart';
import DailyProgress from './components/DailyProgress';
import TextNotes from './components/TextNotes';
import FileUploadPage from './components/FileUploadPage';
import OAuthCallback from './components/OAuthCallback';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <Navigation />
            
            <main className="transition-all duration-300">
              <Suspense fallback={<LoadingSpinner message="Loading page..." size="large" />}>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <ErrorBoundary>
                        <div className="container mx-auto p-4">
                          <WeeklyGanttChart />
                        </div>
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="/daily-progress" 
                    element={
                      <ErrorBoundary>
                        <DailyProgress />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="/text-notes" 
                    element={
                      <ErrorBoundary>
                        <TextNotes />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="/file-upload" 
                    element={
                      <ErrorBoundary>
                        <FileUploadPage />
                      </ErrorBoundary>
                    } 
                  />
                  {/* OAuth callback route */}
                  <Route 
                    path="/auth/callback" 
                    element={
                      <ErrorBoundary>
                        <OAuthCallback />
                      </ErrorBoundary>
                    } 
                  />
                  {/* Catch-all route for 404 errors */}
                  <Route 
                    path="*" 
                    element={
                      <div className="flex flex-col items-center justify-center h-96">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                        <p className="text-gray-600 mb-6">Page not found</p>
                        <a 
                          href="/" 
                          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Go Home
                        </a>
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