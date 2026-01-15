/**
 * Response Store
 * 
 * Zustand store for managing API response state.
 * Handles:
 * - Current response data
 * - Loading state
 * - Error handling
 * - Response history (per request)
 * - Request cancellation
 * - Persistence across app restarts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Helper to safely call API methods
 */
const api = () => typeof window !== 'undefined' ? window.api : null;

const useResponseStore = create(
  persist(
    (set, get) => ({
  // State
  activeRequestId: null,
  isLoading: false,
  error: null,
  
  // AbortController for cancellation
  abortController: null,
  
  // Response history keyed by request ID
  // Useful for comparing responses
  history: {},
  
  /**
   * Get current response based on active request ID
   */
  getCurrentResponse: () => {
    const { activeRequestId, history } = get();
    return activeRequestId ? history[activeRequestId] || null : null;
  },
  
  /**
   * Set the active request ID (called when switching tabs)
   */
  setActiveRequestId: (requestId) => {
    set({ activeRequestId: requestId, error: null });
  },
  
  // ==========================================
  // Actions
  // ==========================================
  
  /**
   * Execute an HTTP request
   * @param {Object} request - Request configuration
   */
  executeRequest: async (request) => {
    // Cancel any pending request
    const currentController = get().abortController;
    if (currentController) {
      currentController.abort();
    }
    
    // Create new abort controller
    const controller = new AbortController();
    set({ isLoading: true, error: null, abortController: controller });
    
    try {
      const result = await api()?.executeRequest(request);
      
      // Check if this request was cancelled
      if (controller.signal.aborted) {
        return null;
      }
      
      if (result?.success) {
        const response = result.data;
        
        // Store in history
        const { history } = get();
        
        set({
          isLoading: false,
          abortController: null,
          activeRequestId: request.id,
          history: {
            ...history,
            [request.id]: response,
          },
        });
        
        return response;
      } else {
        const errorMessage = result?.error || 'Request failed';
        const errorResponse = result?.details ? {
          status: result.details.status,
          statusText: result.details.statusText || errorMessage,
          isError: true,
        } : null;
        
        const { history } = get();
        set({
          error: errorMessage,
          isLoading: false,
          abortController: null,
          history: errorResponse ? {
            ...history,
            [request.id]: errorResponse,
          } : history,
        });
        return null;
      }
    } catch (error) {
      // Don't set error if aborted
      if (error.name === 'AbortError' || controller.signal.aborted) {
        set({ isLoading: false, abortController: null });
        return null;
      }
      
      set({
        error: error.message,
        isLoading: false,
        abortController: null,
      });
      return null;
    }
  },
  
  /**
   * Cancel the current request
   */
  cancelRequest: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ 
        isLoading: false, 
        abortController: null,
        error: 'Request cancelled',
      });
    }
  },
  
  /**
   * Clear response for a specific request or just clear error
   */
  clearResponse: (requestId) => {
    if (requestId) {
      // Clear specific request from history
      const { history } = get();
      const { [requestId]: removed, ...rest } = history;
      set({ history: rest, error: null });
    } else {
      set({ error: null });
    }
  },
  
  /**
   * Get response for a specific request from history
   */
  getResponseForRequest: (requestId) => {
    return get().history[requestId] || null;
  },
  
  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
    }),
    {
      name: 'response-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
);

export default useResponseStore;
