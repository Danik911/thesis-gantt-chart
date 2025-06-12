// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Initialize Firebase configuration with fallbacks for storage bucket
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  // Ensure storage bucket uses the expected "<projectId>.appspot.com" pattern.
  // Some older or incorrectly set environment variables may contain
  // the experimental ".firebasestorage.app" domain that breaks uploads and
  // triggers CORS errors. Fallback to the default bucket based on the project
  // id when storageBucket is missing or malformed.
  storageBucket:
    (() => {
      const raw = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
      const pid = process.env.REACT_APP_FIREBASE_PROJECT_ID;
      if (!raw || /\.firebasestorage\.app$/.test(raw)) {
        // Use default bucket format
        return `${pid}.appspot.com`;
      }
      return raw;
    })(),
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export the app instance
export default app; 