// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration object
// These values should be replaced with your actual Firebase project config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAAkjD9jUaXmYA_lugAscCsk58V8V97wFw",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "gantt-chart-ea44e.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "gantt-chart-ea44e",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "gantt-chart-ea44e.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "202044041438",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:202044041438:web:8e7e72fa0a74ac68f03a4f",
  measurementId: "G-SE6QYE382R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export the app instance
export default app; 