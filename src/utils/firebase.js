// src/utils/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, where } from 'firebase/firestore';
import { getDocs, setDoc, doc } from 'firebase/firestore'; // Ensure all Firestore functions are imported

let app;
let db;
let auth;
let userId; // Declare userId here to be accessible throughout the module

// Get global variables provided by the Canvas environment.
// For Vercel deployment, these might not be present, so we use a fallback.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for Vercel
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {}; // Fallback for Vercel
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; // Fallback for Vercel

export const initializeFirebase = async () => {
    try {
        if (!app) {
            // If firebaseConfig is empty or default, it means we are likely outside the Canvas environment
            // and relying on environment variables or hardcoded config.
            if (Object.keys(firebaseConfig).length === 0) {
                console.warn("Firebase config is empty. This might be expected if running outside Canvas environment or if configuration is loaded differently.");
                // IMPORTANT: For deployment on Vercel, if you intend to use YOUR OWN Firebase project
                // and not the Canvas provided one, you MUST set these as Environment Variables in Vercel
                // or uncomment/replace with your actual Firebase project config.
                // Example:
                app = initializeApp({
                    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY", // Replace with your actual API Key
                    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
                    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
                    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
                    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
                    appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID"
                });
                console.log("Using fallback Firebase config (for Vercel or local).");
            } else {
                app = initializeApp(firebaseConfig);
                console.log("Using Canvas-provided Firebase config.");
            }
            db = getFirestore(app);
            auth = getAuth(app);

            // Sign in anonymously or with custom token if available
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log("Signed in with custom token.");
            } else {
                await signInAnonymously(auth);
                console.log("Signed in anonymously.");
            }

            // Set up an auth state listener to get the current user ID
            auth.onAuthStateChanged(user => {
                if (user) {
                    userId = user.uid;
                    console.log("Auth state changed: User ID set to", userId);
                } else {
                    userId = null;
                    console.log("Auth state changed: No user.");
                }
            });

            console.log("Firebase initialized successfully.");
        }
        return { app, db, auth };
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        throw error; // Re-throw to be caught by App.js
    }
};

export const getDb = () => {
    if (!db) {
        console.error("Firestore not initialized. Call initializeFirebase first.");
        throw new Error("Firestore not initialized.");
    }
    return db;
};

export const getAuthInstance = () => {
    if (!auth) {
        console.error("Auth not initialized. Call initializeFirebase first.");
        throw new Error("Auth not initialized.");
    }
    return auth;
};

// Function to get the current user ID
export const getCurrentUserId = () => {
    // Return the cached userId. It's updated by the onAuthStateChanged listener.
    return userId;
};

// --- Firestore Operations ---

// Save video progress for a specific user and video
export const saveVideoProgress = async (videoId, currentTime, duration, watchedSegments, currentUserId) => {
    if (!db) {
        await initializeFirebase(); // Ensure Firebase is initialized
    }
    // Using the appId from the environment/fallback
    const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const userVidProgressCollectionRef = collection(db, `artifacts/${currentAppId}/users/${currentUserId}/videoProgress`);
    const docRef = query(userVidProgressCollectionRef, where("videoId", "==", videoId));

    try {
        const querySnapshot = await getDocs(docRef);
        if (!querySnapshot.empty) {
            // Document exists, update it
            const docId = querySnapshot.docs[0].id;
            await setDoc(doc(userVidProgressCollectionRef, docId), {
                videoId,
                currentTime,
                duration,
                watchedSegments: JSON.stringify(watchedSegments), // Store array as JSON string
                timestamp: serverTimestamp()
            }, { merge: true });
            console.log("Video progress updated for videoId:", videoId, "userId:", currentUserId);
        } else {
            // Document does not exist, create a new one
            await addDoc(userVidProgressCollectionRef, {
                videoId,
                currentTime,
                duration,
                watchedSegments: JSON.stringify(watchedSegments), // Store array as JSON string
                timestamp: serverTimestamp()
            });
            console.log("New video progress saved for videoId:", videoId, "userId:", currentUserId);
        }
    } catch (e) {
        console.error("Error saving video progress: ", e);
        throw e;
    }
};


// Load video progress for a specific user and video
export const loadVideoProgress = (videoId, currentUserId, callback) => {
    if (!db) {
      initializeFirebase().then(() => {
            _loadVideoProgress(videoId, currentUserId, callback);
        }).catch(err => {
            console.error("Failed to initialize Firebase for loading progress:", err);
            callback(null);
        });
        return;
    }
    _loadVideoProgress(videoId, currentUserId, callback);
};

const _loadVideoProgress = (videoId, currentUserId, callback) => {
    const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const userVidProgressCollectionRef = collection(db, `artifacts/${currentAppId}/users/${currentUserId}/videoProgress`);
    const q = query(userVidProgressCollectionRef, where("videoId", "==", videoId));

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            const loadedProgress = {
                currentTime: data.currentTime,
                duration: data.duration,
                // Parse the JSON string back to an array
                watchedSegments: data.watchedSegments ? JSON.parse(data.watchedSegments) : [],
            };
            console.log("Video progress loaded:", loadedProgress);
            callback(loadedProgress);
        } else {
            console.log("No video progress found for videoId:", videoId, "userId:", currentUserId);
            callback(null);
        }
    }, (error) => {
        console.error("Error loading video progress:", error);
        callback(null);
    });

    return unsubscribe; // Return unsubscribe function for cleanup
};

// Get all video progress entries for a user (not directly used by VideoPlayer but useful)
export const getAllVideoProgress = (currentUserId, callback) => {
    if (!db) {
        initializeFirebase().then(() => {
            _getAllVideoProgress(currentUserId, callback);
        }).catch(err => {
            console.error("Failed to initialize Firebase for getting all progress:", err);
            callback([]);
        });
        return;
    }
    _getAllVideoProgress(currentUserId, callback);
};

const _getAllVideoProgress = (currentUserId, callback) => {
    const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const userVidProgressCollectionRef = collection(db, `artifacts/${currentAppId}/users/${currentUserId}/videoProgress`);
    const q = query(userVidProgressCollectionRef, orderBy("timestamp", "desc"));

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const allProgress = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            watchedSegments: doc.data().watchedSegments ? JSON.parse(doc.data().watchedSegments) : []
        }));
        console.log("All video progress for user:", allProgress);
        callback(allProgress);
    }, (error) => {
        console.error("Error getting all video progress:", error);
        callback([]);
    });

    return unsubscribe;
};
