// src/components/VideoPlayer.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { mergeIntervals, calculateUniqueDuration } from '../utils/intervalUtils';
import { getFirestoreInstance, saveVideoProgress, getVideoProgress } from '../utils/firebase';

function VideoPlayer({ videoUrl, videoId, userId }) {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentPlayheadPosition, setCurrentPlayheadPosition] = useState(0);
  const [lastTrackedPosition, setLastTrackedPosition] = useState(0); // For tracking new segments
  const [watchedIntervals, setWatchedIntervals] = useState([]); // All merged unique intervals
  const [videoDuration, setVideoDuration] = useState(0);
  const [isReady, setIsReady] = useState(false); // Player ready state
  const [isSeeking, setIsSeeking] = useState(false); // Track if user is seeking

  // Throttling mechanism for onProgress to avoid excessive updates
  const progressUpdateInterval = 500; // ms
  const lastProgressUpdateTime = useRef(0);

  // Fetch initial progress from Firestore
  useEffect(() => {
    if (!userId || !videoId || !getFirestoreInstance()) return;

    const unsubscribe = getVideoProgress(userId, videoId, (data) => {
      if (data) {
        // Only update if data is loaded, prevents overriding local state on mount before first save
        if (data.watchedIntervals) {
          setWatchedIntervals(data.watchedIntervals);
        }
        if (data.uniqueProgressPercentage !== undefined) {
          setProgressPercentage(data.uniqueProgressPercentage);
        }
        // Seek to last watched position only after the player is ready
        if (data.lastWatchedPosition !== undefined && playerRef.current && isReady) {
          playerRef.current.seekTo(data.lastWatchedPosition, 'seconds');
          setCurrentPlayheadPosition(data.lastWatchedPosition);
          setLastTrackedPosition(data.lastWatchedPosition);
        }
      }
      console.log('Progress loaded/updated from Firestore:', data);
    });

    return () => {
      // Cleanup the Firestore listener on unmount
      unsubscribe();
      // Ensure progress is saved one last time when component unmounts or user navigates away
      // This is a crucial step for persistence, particularly if not using periodic saves.
      if (userId && videoId && watchedIntervals.length > 0) {
        saveProgressToFirestore(currentPlayheadPosition, watchedIntervals, videoDuration);
      }
    };
  }, [userId, videoId, isReady, videoDuration]); // Depend on isReady to seek after player loads

  // Function to save current progress to Firestore
  const saveProgressToFirestore = useCallback(async (position, intervals, duration) => {
    if (!userId || !videoId || !getFirestoreInstance()) return;

    const calculatedPercentage = calculateUniqueDuration(intervals, duration);
    console.log('Saving progress:', {
      lastWatchedPosition: position,
      watchedIntervals: intervals,
      uniqueProgressPercentage: calculatedPercentage,
    });
    try {
      await saveVideoProgress(userId, videoId, {
        lastWatchedPosition: position,
        watchedIntervals: intervals, // Storing already merged intervals
        uniqueProgressPercentage: calculatedPercentage,
      });
      console.log('Progress saved successfully!');
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  }, [userId, videoId]);

  const handleProgress = useCallback((state) => {
    const now = Date.now();
    if (now - lastProgressUpdateTime.current < progressUpdateInterval && isPlaying && !isSeeking) {
      return; // Throttle updates
    }
    lastProgressUpdateTime.current = now;

    const currentPosition = state.playedSeconds;

    // Only track progress if playing forward and not seeking
    if (isPlaying && !isSeeking && currentPosition > lastTrackedPosition) {
      const newSegment = [lastTrackedPosition, currentPosition];
      const updatedIntervals = mergeIntervals([...watchedIntervals], newSegment); // Merge with existing
      setWatchedIntervals(updatedIntervals);

      const calculatedPercentage = calculateUniqueDuration(updatedIntervals, videoDuration);
      setProgressPercentage(calculatedPercentage);
    }

    setCurrentPlayheadPosition(currentPosition);
    setLastTrackedPosition(currentPosition); // Update last tracked position for next interval
  }, [isPlaying, isSeeking, lastTrackedPosition, watchedIntervals, videoDuration]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setIsSeeking(false); // Ensure seeking flag is off when playing
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    // Save progress on pause
    saveProgressToFirestore(currentPlayheadPosition, watchedIntervals, videoDuration);
  }, [currentPlayheadPosition, watchedIntervals, videoDuration, saveProgressToFirestore]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    // Ensure all intervals are saved when video ends
    saveProgressToFirestore(videoDuration, watchedIntervals, videoDuration);
    setProgressPercentage(100); // Mark as 100% if video ended
  }, [watchedIntervals, videoDuration, saveProgressToFirestore]);

  const handleDuration = useCallback((duration) => {
    setVideoDuration(duration);
    console.log('Video Duration:', duration);
  }, []);

  const handleReady = useCallback(() => {
    setIsReady(true);
    console.log('ReactPlayer is ready.');
    // The useEffect will handle seeking after `isReady` becomes true
  }, []);

  const handleSeek = useCallback((seconds) => {
    setIsSeeking(true); // Set seeking flag true
    console.log('Seeking to:', seconds);
  }, []);

  const handleSeeked = useCallback((seconds) => {
    setIsSeeking(false); // Reset seeking flag after seek is complete
    setCurrentPlayheadPosition(seconds);
    setLastTrackedPosition(seconds); // Update last tracked position to current seek time
    }, []);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
      <div className="relative pt-[56.25%] bg-black rounded-md overflow-hidden"> {/* 16:9 Aspect Ratio */}
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={isPlaying}
          controls={true}
          width="100%"
          height="100%"
          className="absolute top-0 left-0"
          onReady={handleReady}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onSeek={handleSeek}
          // The onSeeked event is not directly exposed by react-player for all cases,
          // but onProgress typically fires right after a seek completes.
          // For this assignment, the `isSeeking` flag helps manage this.
        />
      </div>

      <div className="text-center">
        <p className="text-xl font-semibold text-white">
          Unique Progress: {progressPercentage.toFixed(2)}%
        </p>
        <div className="w-full bg-gray-700 rounded-full h-4 mt-3 overflow-hidden">
          <div
            className="bg-indigo-500 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-center flex-wrap gap-4 pt-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => saveProgressToFirestore(currentPlayheadPosition, watchedIntervals, videoDuration)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        >
          Manually Save Progress
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
