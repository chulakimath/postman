/**
 * useAutosave Hook
 * 
 * Automatically saves data after a debounce period.
 * Used for request/collection autosave.
 */

import { useEffect, useRef, useCallback } from 'react';

function useAutosave(data, saveFn, delay = 500) {
  const timeoutRef = useRef(null);
  const previousDataRef = useRef(data);
  
  const save = useCallback(async () => {
    try {
      await saveFn(data);
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }, [data, saveFn]);
  
  useEffect(() => {
    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }
    
    previousDataRef.current = data;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(save, delay);
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, save]);
  
  // Force save immediately
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return save();
  }, [save]);
  
  return { forceSave };
}

export default useAutosave;
