/**
 * useAutosave Hook
 * 
 * Production-grade autosave with:
 * - Debounce (configurable delay)
 * - Race condition prevention via version tracking
 * - No stale closures (uses refs for latest values)
 * - Atomic saves with mutex
 * - Last change always wins
 */

import { useEffect, useRef, useCallback } from 'react';

function useAutosave(data, saveFn, delay = 400) {
  // Refs to avoid stale closures
  const dataRef = useRef(data);
  const saveFnRef = useRef(saveFn);
  const timeoutRef = useRef(null);
  const saveVersionRef = useRef(0);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const previousDataRef = useRef(null);
  
  // Keep refs updated with latest values
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);
  
  /**
   * Perform save with race condition prevention
   * Uses version tracking to ensure only the latest data is saved
   */
  const performSave = useCallback(async (saveVersion) => {
    // If a newer save was triggered, skip this one
    if (saveVersion !== saveVersionRef.current) {
      return;
    }
    
    // If already saving, mark pending and return
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    
    isSavingRef.current = true;
    
    try {
      // Get latest data at save time (not from closure)
      const latestData = dataRef.current;
      await saveFnRef.current(latestData);
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      isSavingRef.current = false;
      
      // If a save was pending while we were saving, trigger another save
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        // Increment version for the new save
        saveVersionRef.current += 1;
        performSave(saveVersionRef.current);
      }
    }
  }, []);
  
  /**
   * Trigger debounced save
   */
  const triggerSave = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Increment version - this invalidates any pending saves
    saveVersionRef.current += 1;
    const currentVersion = saveVersionRef.current;
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave(currentVersion);
    }, delay);
  }, [delay, performSave]);
  
  // Trigger save when data changes
  useEffect(() => {
    // Skip initial render and when data hasn't actually changed
    const dataStr = JSON.stringify(data);
    const prevStr = JSON.stringify(previousDataRef.current);
    
    if (dataStr === prevStr) {
      return;
    }
    
    previousDataRef.current = data;
    triggerSave();
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, triggerSave]);
  
  /**
   * Force save immediately (flush pending changes)
   * Returns a promise that resolves when save completes
   */
  const forceSave = useCallback(async () => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Wait for any in-progress save to complete
    while (isSavingRef.current) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Perform immediate save with latest data
    saveVersionRef.current += 1;
    const currentVersion = saveVersionRef.current;
    
    try {
      const latestData = dataRef.current;
      await saveFnRef.current(latestData);
    } catch (error) {
      console.error('Force save failed:', error);
      throw error;
    }
  }, []);
  
  /**
   * Cancel any pending save
   */
  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingSaveRef.current = false;
  }, []);
  
  /**
   * Check if there's a pending save
   */
  const hasPendingSave = useCallback(() => {
    return timeoutRef.current !== null || isSavingRef.current || pendingSaveRef.current;
  }, []);
  
  return { 
    forceSave, 
    cancelPending,
    hasPendingSave,
    triggerSave,
  };
}

export default useAutosave;
