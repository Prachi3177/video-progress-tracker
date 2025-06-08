// src/utils/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

let firebaseApp = null;
let db = null;
let auth = null;

/**
 * Initializes Firebase application, authentication, and Firestore.
 * Handles Canvas-specific global variables for seamless integration.
 * @returns {Promise<{app: any, auth: any, db: any}>} Firebase app, auth, and firestore instances.
 */
export const initializeFirebase = async () => {
  if (firebaseApp) {
    return { app: firebaseApp, auth, db }; // Return existing instances if already initialized
  }

  try {
    // Access global variables safely
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;


    if (Object.keys(firebaseConfig).length === 0 && appId === 'default-app-id') {
      console.warn("Firebase configuration or __app_id not found. If running locally, please provide your firebaseConfig.");
      // Fallback for local development or if globals are missing in test environments
      // You might need to provide a hardcoded config here for local testing if not using Canvas
      // For submission, rely on the Canvas globals.
      // Example local config (replace with your own if needed for local testing):
      // firebaseConfig = {
      //   apiKey: "YOUR_API_KEY",
      //   authDomain: "YOUR_AUTH_DOMAIN",
      //   projectId: "YOUR_PROJECT_ID",
      //   storageBucket: "YOUR_STORAGE_BUCKET",
      //   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      //   appId: "YOUR_APP_ID"
      // };
    }

    firebaseApp = initializeApp(firebaseConfig, appId); // Use appId as name to avoid multiple app initialization issues
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    // Sign in using the custom token if provided (Canvas environment)
    // Otherwise, sign in anonymously as a fallback.
    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
      console.log('Signed in with custom token.');
    } else {
      await signInAnonymously(auth);
      console.log('Signed in anonymously (no custom token found).');
    }

    return { app: firebaseApp, auth, db };
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error; // Re-throw to be caught by the calling component
  }
};

/**
 * Returns the Firestore instance.
 * @returns {Firestore | null} The Firestore instance or null if not initialized.
 */
export const getFirestoreInstance = () => db;

/**
 * Returns the Auth instance.
 * @returns {Auth | null} The Auth instance or null if not initialized.
 */
export const getAuthInstance = () => auth;

/**
 * Saves video progress data to Firestore.
 * @param {string} userId The ID of the current user.
 * @param {string} videoId The unique ID of the video.
 * @param {object} progressData The data to save (lastWatchedPosition, watchedIntervals, uniqueProgressPercentage).
 */
export const saveVideoProgress = async (userId, videoId, progressData) => {
  if (!db) {
    console.error("Firestore not initialized.");
    return;
  }

  // Ensure __app_id is used for the collection path as per instructions
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  // Use private data path: /artifacts/{appId}/users/{userId}/{your_collection_name}
  const userProgressDocRef = doc(db, `artifacts/${appId}/users/${userId}/videoProgress`, videoId);

  try {
    await setDoc(userProgressDocRef, progressData, { merge: true });
  } catch (error) {
    console.error("Error writing document:", error);
    throw error;
  }
};

/**
 * Listens for real-time updates to video progress data from Firestore.
 * @param {string} userId The ID of the current user.
 * @param {string} videoId The unique ID of the video.
 * @param {function} callback A callback function to receive data updates.
 * @returns {function} An unsubscribe function to stop listening.
 */
export const getVideoProgress = (userId, videoId, callback) => {
  if (!db) {
    console.error("Firestore not initialized for listener.");
    return () => {}; // Return a no-op unsubscribe
  }

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const userProgressDocRef = doc(db, `artifacts/${appId}/users/${userId}/videoProgress`, videoId);

  // onSnapshot provides real-time updates
  const unsubscribe = onSnapshot(userProgressDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null); // No data for this video/user yet
      console.log("No progress data found for this video/user.");
    }
  }, (error) => {
    console.error("Error listening to document:", error);
    // Handle error, e.g., display a message to the user
  });

  return unsubscribe;
};
