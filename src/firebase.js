// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Initialize Firebase configuration with fallbacks for storage bucket
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  // Ensure storage bucket uses the correct format for new Firebase projects.
  // Projects created after October 30, 2024 use the ".firebasestorage.app" format.
  // Fallback to the default bucket based on the project id when storageBucket is missing.
  storageBucket:
    (() => {
      const raw = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
      const pid = process.env.REACT_APP_FIREBASE_PROJECT_ID;
      if (!raw) {
        // Use new default bucket format for projects created after Oct 30, 2024
        return `${pid}.firebasestorage.app`;
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

// Ensure we have at least an anonymous auth session so that Firestore and
// Storage use an auth token instead of an API key (which is often restricted
// in production). This also avoids permission issues with default Firebase
// security rules that require authentication. The sign-in only runs once and
// does not interfere if the user later performs email/password or Google
// login.
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // No user signed in – perform anonymous sign-in.
      signInAnonymously(auth).catch((err) => {
        console.error('Anonymous sign-in failed:', err);
      });
    }
  });
}

// Export the app instance
export default app; 