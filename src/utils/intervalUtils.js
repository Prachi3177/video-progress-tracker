// src/utils/intervalUtils.js
/**
 * Merges a list of intervals, combining overlapping or adjacent ones.
 * @param {Array<Array<number>>} intervals An array of [start, end] pairs.
 * @returns {Array<Array<number>>} A new array of merged, non-overlapping [start, end] intervals.
 */
export function mergeIntervals(intervals) {
  if (!intervals || intervals.length === 0) {
    return [];
  }

  // Sort intervals by their start time
  intervals.sort((a, b) => a[0] - b[0]);

  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const currentInterval = intervals[i];
    const lastMergedInterval = merged[merged.length - 1];

    // Check for overlap or adjacency: current start is less than or equal to last merged end
    if (currentInterval[0] <= lastMergedInterval[1]) {
      // Merge: update the end of the last merged interval
      lastMergedInterval[1] = Math.max(lastMergedInterval[1], currentInterval[1]);
    } else {
      // No overlap, add the current interval as a new merged interval
      merged.push(currentInterval);
    }
  }

  return merged;
}

/**
 * Calculates the total unique duration from a list of merged intervals.
 * @param {Array<Array<number>>} mergedIntervals An array of merged, non-overlapping [start, end] pairs.
 * @param {number} totalVideoDuration The total duration of the video in seconds.
 * @returns {number} The unique watched progress as a percentage (0-100).
 */
export function calculateUniqueDuration(mergedIntervals, totalVideoDuration) {
  if (!mergedIntervals || mergedIntervals.length === 0 || totalVideoDuration === 0) {
    return 0;
  }

  let totalUniqueSeconds = 0;
  for (const interval of mergedIntervals) {
    totalUniqueSeconds += (interval[1] - interval[0]);
  }

  // Ensure totalUniqueSeconds does not exceed totalVideoDuration
  totalUniqueSeconds = Math.min(totalUniqueSeconds, totalVideoDuration);

  return (totalUniqueSeconds / totalVideoDuration) * 100;
}
