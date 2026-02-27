/**
 * Pending Operations Tracker
 * 
 * Tracks async operations (file writes) that must complete before app shutdown.
 * Ensures no data loss when user closes the app during a save operation.
 * 
 * Usage:
 * - Call trackOperation(promise) when starting a critical async operation
 * - Call waitForPending() before allowing app to quit
 * - Call hasPending() to check if operations are in progress
 */

// Set of currently pending operation promises
const pendingOperations = new Set();

/**
 * Track a critical async operation
 * The operation will be awaited before app shutdown
 * @param {Promise} promise - The operation to track
 * @returns {Promise} The same promise (for chaining)
 */
const trackOperation = (promise) => {
  pendingOperations.add(promise);
  
  // Remove from set when complete (success or failure)
  promise.finally(() => {
    pendingOperations.delete(promise);
  });
  
  return promise;
};

/**
 * Wait for all pending operations to complete
 * Call this before allowing app to quit
 * @param {number} timeout - Max time to wait in ms (default 10000)
 * @returns {Promise<boolean>} True if all completed, false if timed out
 */
const waitForPending = async (timeout = 10000) => {
  if (pendingOperations.size === 0) {
    return true;
  }
  
  console.log(`Waiting for ${pendingOperations.size} pending operations...`);
  
  try {
    // Wait for all pending operations with timeout
    await Promise.race([
      Promise.all(Array.from(pendingOperations)),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
    
    console.log('All pending operations completed');
    return true;
  } catch (error) {
    console.error('Some operations may not have completed:', error.message);
    return false;
  }
};

/**
 * Check if there are pending operations
 * @returns {boolean} True if operations are pending
 */
const hasPending = () => pendingOperations.size > 0;

/**
 * Get count of pending operations
 * @returns {number} Number of pending operations
 */
const getPendingCount = () => pendingOperations.size;

module.exports = {
  trackOperation,
  waitForPending,
  hasPending,
  getPendingCount,
};
