// src/App.js
import React, { useState, useEffect } from 'react';
// FIX: Changed './components/VideoPlayer' to './component/VideoPlayer'
import VideoPlayer from './component/VideoPlayer';
import { initializeFirebase, getAuthInstance } from './utils/firebase';
import './App.css'; // Assuming you have some global styling

function App() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Firebase and set up auth listener
  useEffect(() => {
    const init = async () => {
      try {
        const { auth } = await initializeFirebase();
        // Listen for auth state changes
        const unsubscribe = getAuthInstance().onAuthStateChanged(user => {
          if (user) {
            setUserId(user.uid);
            console.log("Firebase Auth State Changed: User ID", user.uid);
          } else {
            setUserId(null);
            console.log("Firebase Auth State Changed: No user logged in.");
          }
          setFirebaseInitialized(true);
          setLoading(false); // Auth listener ready, stop loading
        });
        return () => unsubscribe(); // Clean up the listener
      } catch (err) {
        console.error("Failed to initialize Firebase:", err);
        setError("Failed to connect to backend services. Please try again later.");
        setLoading(false);
      }
    };
    init();
  }, []);

  // Video URL and ID for demonstration
  // Replace with your actual video URL and a unique ID
  const demoVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give Up
  const demoVideoId = 'youtube-dQw4w9WgXcQ'; // Unique identifier for this video

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white text-2xl">
        Loading application...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white text-center p-4">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-inter">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center drop-shadow-lg">
        Video Progress Tracker
      </h1>
      <div className="w-full max-w-4xl">
        {userId ? (
          <VideoPlayer videoUrl={demoVideoUrl} videoId={demoVideoId} userId={userId} />
        ) : (
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-white text-center text-xl">
            Please ensure you are authenticated to track video progress.
          </div>
        )}
      </div>

      {userId && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg shadow-md text-gray-400 text-sm break-words max-w-lg text-center">
          <p>Your unique user ID (for demo purposes):</p>
          <p className="font-mono text-indigo-400 text-base mt-1">{userId}</p>
        </div>
      )}
    </div>
  );
}

export default App;
