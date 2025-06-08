// src/App.js
import React, { useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import { initializeFirebase, getAuthInstance } from './utils/firebase';

function App() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Initialize Firebase and set up auth listener
    const init = async () => {
      try {
        const { app, auth, db } = await initializeFirebase();
        console.log('Firebase initialized:', app.name);

        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChanged(user => {
          if (user) {
            setUserId(user.uid);
            console.log("User signed in:", user.uid);
          } else {
            setUserId(null);
            console.log("No user signed in.");
          }
          setFirebaseInitialized(true); // Mark Firebase as ready after initial auth check
        });

        return () => unsubscribe(); // Cleanup auth listener on unmount
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        // Handle error, e.g., show a message to the user
      }
    };

    init();
  }, []); // Run only once on component mount

  if (!firebaseInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading application...</p>
      </div>
    );
  }

  // Example video URL (replace with your actual lecture video URL)
  const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Replace with a real lecture video URL for testing
  const videoId = 'sampleVideo'; // A unique ID for this specific video

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8 text-indigo-400">
          Lecture Video Progress Tracker
        </h1>

        {userId ? (
          <>
            <p className="text-center text-sm mb-6 text-gray-400">
              Current User ID: <span className="font-mono bg-gray-800 rounded px-2 py-1">{userId}</span>
            </p>
            <VideoPlayer videoUrl={videoUrl} videoId={videoId} userId={userId} />
          </>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <p className="text-xl text-red-400 font-semibold mb-4">Authentication Required</p>
            <p className="text-gray-300">
              Please ensure Firebase is correctly set up. If running in the Canvas environment, this should
              happen automatically. If running locally, ensure your Firebase config is provided.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
