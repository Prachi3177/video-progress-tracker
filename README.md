Video Progress Tracker: Understanding Real Engagement
Ever noticed how some online learning platforms just say a video is "complete" once you hit the end, even if you skipped half of it or re-watched a tricky section twenty times? That's not really tracking learning, is it?

This project tackles that exact problem head-on. My goal was to build a smart system that figures out how much of a lecture video someone actually watched uniquely. No more counting skipped parts or double-counting re-watches. Plus, it remembers where you left off, so you can pick up seamlessly next time.

What This Project Does
Real Progress Tracking: It only adds to your progress when you're watching a part of the video you haven't seen before. Think of it like a highlight reel of your new learning.

No Skipping Credit: If you fast-forward past a section, that time won't magically count towards your progress. You have to actually watch it.

Smart Re-watch Handling: Go over a complex part again? Great for learning! But your overall unique progress won't inflate, because you've already "covered" that ground.

Remembers Everything: All your unique viewing intervals are saved, along with your overall progress percentage.

Seamless Resumption: Close your browser, come back later, and the video starts right where you left off, showing your accurate progress. No fumbling around trying to find your spot.

Clear Visuals: There's a percentage display and a visual progress bar that updates in real-time, but only when you're consuming new content.

Under the Hood: The Tech Stack
I chose these tools to build it:

Frontend Magic: React.js – It's fantastic for building interactive user interfaces.

Video Playback: react-player – A versatile library that makes embedding and controlling videos super easy.

Making it Look Good: Tailwind CSS – For quick, utility-first styling that keeps things neat and responsive.

Saving Your Spot (Backend): Firebase Firestore – This is a serverless, NoSQL database that handles all the data persistence. No need to set up a separate backend server, which keeps things simpler.

Who's Watching?: Firebase Authentication – Used for anonymous user management, especially handy in environments like Canvas.

Project Layout
Here’s how the code is organized:

video-progress-tracker/
├── public/
│   └── index.html             # The main HTML file
├── src/
│   ├── App.js                 # The main React component that brings everything together
│   ├── index.js               # React's entry point
│   ├── components/
│   │   └── VideoPlayer.js     # All the video player logic and UI lives here
│   ├── utils/
│   │   ├── firebase.js        # Handles Firebase initialization and talking to Firestore
│   │   └── intervalUtils.js   # My special sauce for merging those video intervals
│   └── index.css              # Where Tailwind CSS gets included and any custom styles go
├── package.json               # All the project dependencies and scripts
└── tailwind.config.js         # Tailwind CSS configuration

How to Get It Running (Locally)
Want to see it in action on your machine? Here’s what you need:

What you'll need:

Node.js (the latest LTS version is always a good bet)

npm or Yarn (your choice of package manager)

Let's get started:

Grab the code:

git clone https://github.com/Prachi3177/video-progress-tracker.git
cd video-progress-tracker

Install everything:

npm install
# OR if you prefer Yarn:
yarn install

Fire it up!

npm start
# OR:
yarn start

This should open the app in your browser, usually at http://localhost:3000.

A quick note on Firebase when running locally:

This app uses Firebase for user authentication and saving progress. In the Canvas environment where this assignment is run, special global variables (__app_id, __firebase_config, __initial_auth_token) are automatically injected. This makes everything work seamlessly.

However, if you're running this purely on your local machine outside of that environment, those variables won't exist. My firebase.js utility has a fallback to signInAnonymously(), but if you want persistent local testing against your own Firebase project, you'll need to:

Set up a Firebase project yourself.

Make sure you enable both Firestore and Anonymous Authentication within your Firebase project settings.

Then, you'd copy your specific Firebase configuration details into src/utils/firebase.js (there's a commented-out section where you could put it).

For the purpose of this assignment submission, don't worry about setting up your own Firebase locally; the code is built to just work in the Canvas environment.

The Nitty-Gritty: My Design Choices
How I Tracked What You Watched
The VideoPlayer.js component is the heart of the tracking. I relied on react-player's onProgress event. This event fires pretty frequently (like every 100-250 milliseconds), which is perfect for capturing continuous viewing.

I keep track of two positions: currentPlayheadPosition (where the video is right now) and lastTrackedPosition (where it was the last time I recorded a segment). If you're playing forward and currentPlayheadPosition is ahead of lastTrackedPosition (and you haven't just made a huge jump), then I know you've watched a new segment like [lastTrackedPosition, currentPlayheadPosition]. This helps me capture all those continuous chunks.

My Secret Sauce: The Interval Merging Algorithm
This was a fun part! The mergeIntervals function in src/utils/intervalUtils.js is what ensures only unique time is counted.

Here’s the breakdown:

Gather and Sort: First, I collect all the video segments you've ever watched (new ones and old ones) and dump them into one big list. Then, I sort this list by the start_time of each segment. If two segments start at the same time, I sort them by their end_time.

Example: If you watched [0, 20], then [50, 60], and then [10, 30], my sorted list would look like [[0, 20], [10, 30], [50, 60]].

Stitch Them Together: I go through this sorted list, segment by segment. I take the first one and add it to my mergedIntervals list. Then, for every new segment:

I compare it with the last segment I added to mergedIntervals.

If there’s an overlap or they touch (meaning the new segment's start time is earlier than or equal to the last merged segment's end time), I simply extend the lastMergedInterval to cover the new segment's end time (taking the maximum of the two end times).

If there's no overlap, it's a completely new, separate chunk, so I just add it as a new item to mergedIntervals.

The end result? A perfectly clean list of non-overlapping time chunks that represent every unique second you've watched!

How I Calculate the Percentage
Once I have that super-clean list of mergedIntervals, calculating your unique progress is straightforward:

Total Unique Time: I loop through all the mergedIntervals and simply add up the duration of each one (end - start). This gives me your totalUniqueSeconds.

The Percentage: I take that totalUniqueSeconds, divide it by the totalVideoDuration (which I also get from the video player), and multiply by 100. And there you have it: your accurate, unique progress percentage!

Saving Your Progress: Firebase Firestore
For persistent progress, I went with Firebase Firestore. It's a fantastic, serverless database that handles all the heavy lifting of storing and retrieving data.

Getting Started: My src/utils/firebase.js file handles all the Firebase setup. It smartly uses the special __app_id, __firebase_config, and __initial_auth_token variables provided by the Canvas environment for secure initialization and user authentication.

How I Store Data: For each user and each video, I store a single document in Firestore.

The Collection Path is artifacts/${appId}/users/${userId}/videoProgress (following the specific instructions for private user data in Canvas).

The Document ID is simply the videoId (like 'sampleVideo').

Inside each document, I save:

watchedIntervals: This is where I store the merged unique intervals.

lastWatchedPosition: The exact second you last left the video.

uniqueProgressPercentage: Your calculated unique progress.

Saving: When you pause the video, or when it ends (or even periodically as a backup), I send your current mergedIntervals, playhead position, and calculated percentage to my saveVideoProgress function. This function uses setDoc with merge: true, so it updates just the necessary fields in Firestore.

Loading: This is where Firestore really shines with its real-time capabilities. I set up an onSnapshot listener. This means that whenever your progress data changes in Firestore (like when you return to the page), my VideoPlayer.js component instantly gets the updated watchedIntervals, lastWatchedPosition, and uniqueProgressPercentage.

Picking Up Where You Left Off
Thanks to that onSnapshot listener and the lastWatchedPosition I store:

When you open the lecture page, the listener immediately grabs your last saved position from Firestore.

I then tell react-player to seekTo that specific lastWatchedPosition. Voila! The video starts exactly where you were.

Your unique progress percentage is also loaded and displayed right away, so you see your accurate progress from the get-go.

Thinking About Tricky Scenarios (Edge Cases)
Fast Forwarding/Skipping: If you jump ahead, onSeek gets triggered. The currentPlayheadPosition then effectively becomes the starting point for any new segments you watch after the skip. The interval merging logic ensures that only those newly watched parts count towards your progress, not the parts you zipped past.

Re-watching Sections: Let's say you've already watched [0, 20] seconds of the video. If you then go back and re-watch [5, 15], my mergeIntervals algorithm is smart enough to see that [5, 15] is already covered by your existing [0, 20] segment. So, your total unique duration won't increase, keeping your progress accurate.

User Experience: Keeping It Simple
I focused on making this tool intuitive and easy to use:

Clean Look: A straightforward interface with the video player front and center, and a clear progress bar and percentage display.

Smooth Updates: The progress bar and percentage update fluidly as you watch new content, giving immediate feedback.

No Fuss Resumption: The video automatically goes back to your last position, making the learning experience feel continuous.

Who Are You?: I display your current userId right on the screen. This is helpful for demonstrating multi-user capabilities, as requested by the assignment.

How to Deploy (and get your links!)
This application is set up for easy deployment. The frontend (your React app) is perfect for platforms like Vercel, and Firebase handles all the backend data.

Deploying the Frontend (Vercel):

Connect GitHub: Link your GitHub repository (Prachi3177/video-progress-tracker) to your Vercel account.

Configure: When prompted, set up your project's build settings:

Framework Preset: Choose either Create React App or Vite (depending on how you initially set up your React project).

Build Command: It should usually be npm run build.

Output Directory: This will be build if you used Create React App, or dist if you used Vite.

Deploy! Hit that deploy button. Vercel will then give you your Deployed Link (e.g., https://your-app-name.vercel.app). Copy this link for your submission!

The Backend (Firebase Firestore):

Good news! Firestore is a completely serverless database. This means you don't need to deploy a separate backend server. Your React app talks directly to Firestore using its SDK. Just make sure that in your Firebase project, Firestore and Anonymous Authentication are enabled. The Canvas environment handles the Firebase configuration automatically for you.

Roadblocks I Hit (and How I Solved Them)
Building this wasn't without its moments! Here are a couple of challenges I tackled:

Getting Tracking Just Right: It was tricky to capture [start, end] intervals accurately. I had to ensure I wasn't missing tiny bits of viewing or, conversely, over-counting due to how frequently onProgress events fire. My solution involved throttling onProgress events and carefully using lastTrackedPosition to define only truly new segments.

Making Merging Foolproof: The interval merging algorithm was crucial. It needed to be robust enough to handle all sorts of overlaps and adjacencies. The sorting and iterative merging strategy I implemented proved to be the most reliable way to produce a clean set of unique intervals.

Ensuring Data Integrity: It's important that what's stored in Firestore is always the merged, unique set of intervals. I made sure the merging logic happens before sending data to Firestore, which keeps the stored data clean and consistent.

Firebase in the Canvas Environment: Integrating Firebase with the special global variables (__app_id, etc.) provided by Canvas was a learning curve. I implemented a solid authentication flow in firebase.js that correctly uses signInWithCustomToken when available or falls back to signInAnonymously().
