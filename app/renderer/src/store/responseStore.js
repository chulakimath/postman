/**
 * Response Store
 * 
 * Zustand store for managing API response state.
 * 
 * CRITICAL BEHAVIORS:
 * - Response is NEVER cleared automatically
 * - Previous response persists until new response arrives
 * - Response only replaced when:
 *   1. User manually triggers "Send"
 *   2. AND new response is successfully received
 * - Network errors preserve previous response
 * - Uses requestId tracking to prevent race conditions
 * 
 * Handles:
 * - Current response data
 * - Loading state (overlay, not replacement)
 * - Error handling (separate from response)
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

/**
 * Generate unique request execution ID
 */
const generateExecutionId = () => `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const useResponseStore = create(
  persist(
    (set, get) => ({
      // State
      activeRequestId: null,
      isLoading: false,
      error: null,
      
      // Current execution ID - used to prevent stale responses from overwriting newer ones
      currentExecutionId: null,
      
      // AbortController for cancellation
      abortController: null,
      
      // Response history keyed by request ID
      // Structure: { [requestId]: { response, executionId, timestamp } }
      history: {},
      
      /**
       * Get current response based on active request ID
       * Returns the response even during loading - UI shows loading overlay
       */
      getCurrentResponse: () => {
        const { activeRequestId, history } = get();
        if (!activeRequestId) return null;
        const entry = history[activeRequestId];
        return entry?.response || null;
      },
      
      /**
       * Set the active request ID (called when switching tabs)
       * DOES NOT clear error - error is per-execution, not per-request
       */
      setActiveRequestId: (requestId) => {
        set({ activeRequestId: requestId });
      },
      
      // ==========================================
      // Actions
      // ==========================================
      
      /**
       * Execute an HTTP request
       * @param {Object} request - Request configuration
       * @returns {Promise<Object|null>} Response or null on error
       * 
       * CRITICAL: Uses executionId to prevent race conditions.
       * Only the response from the latest execution will be stored.
       */
      executeRequest: async (request) => {
        // Generate unique execution ID for this request
        const executionId = generateExecutionId();
        
        // Cancel any pending request for THIS request ID
        const { abortController: currentController, activeRequestId } = get();
        if (currentController && activeRequestId === request.id) {
          currentController.abort();
        }
        
        // Create new abort controller
        const controller = new AbortController();
        
        // Set loading state but DO NOT clear previous response
        set({ 
          isLoading: true, 
          error: null, 
          abortController: controller,
          currentExecutionId: executionId,
          activeRequestId: request.id,
        });
        
        try {
          const result = await api()?.executeRequest(request);
          
          // Check if this execution was cancelled or superseded
          const currentState = get();
          if (controller.signal.aborted || currentState.currentExecutionId !== executionId) {
            // This request was cancelled or a newer request was sent
            // Do NOT update state - let the newer request handle it
            return null;
          }
          
          if (result?.success) {
            const response = result.data;
            const { history } = get();
            
            // Store response with execution metadata
            set({
              isLoading: false,
              abortController: null,
              error: null,
              history: {
                ...history,
                [request.id]: {
                  response,
                  executionId,
                  timestamp: Date.now(),
                },
              },
            });
            
            return response;
          } else {
            // Request completed but returned an error (4xx, 5xx, etc.)
            const errorMessage = result?.error || 'Request failed';
            const { history } = get();
            
            // If we have error details (status code, etc.), treat it as a response
            // This allows showing HTTP error responses (like 404, 500) in the viewer
            if (result?.details?.status) {
              const errorResponse = {
                status: result.details.status,
                statusText: result.details.statusText || errorMessage,
                headers: result.details.headers || {},
                data: result.details.data || null,
                time: result.details.time || 0,
                size: result.details.size || 0,
                isError: true,
              };
              
              set({
                error: errorMessage,
                isLoading: false,
                abortController: null,
                history: {
                  ...history,
                  [request.id]: {
                    response: errorResponse,
                    executionId,
                    timestamp: Date.now(),
                  },
                },
              });
            } else {
              // Network error - preserve previous response, only set error
              set({
                error: errorMessage,
                isLoading: false,
                abortController: null,
                // Intentionally NOT updating history - preserve previous response
              });
            }
            
            return null;
          }
        } catch (error) {
          // Check if aborted
          if (error.name === 'AbortError' || controller.signal.aborted) {
            set({ isLoading: false, abortController: null });
            return null;
          }
          
          // Check if superseded by newer request
          const currentState = get();
          if (currentState.currentExecutionId !== executionId) {
            return null;
          }
          
          // Network/unexpected error - preserve previous response
          set({
            error: error.message,
            isLoading: false,
            abortController: null,
            // Intentionally NOT updating history - preserve previous response
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
            currentExecutionId: null,
            // Note: error is NOT set here - cancellation is not an error
            // Previous response is preserved
          });
        }
      },
      
      /**
       * Clear response for a specific request
       * ONLY called on explicit user action (like closing a tab)
       * NEVER called automatically
       */
      clearResponse: (requestId) => {
        if (!requestId) return;
        
        const { history } = get();
        const { [requestId]: removed, ...rest } = history;
        set({ history: rest });
      },
      
      /**
       * Get response for a specific request from history
       */
      getResponseForRequest: (requestId) => {
        const entry = get().history[requestId];
        return entry?.response || null;
      },
      
      /**
       * Clear error state only
       * Does NOT clear response
       */
      clearError: () => {
        set({ error: null });
      },
      
      /**
       * Check if a specific request has a cached response
       */
      hasResponse: (requestId) => {
        return !!get().history[requestId]?.response;
      },
    }),
    {
      name: 'response-storage',
      partialize: (state) => ({ 
        history: state.history 
      }),
    }
  )
);

export default useResponseStore;
