/**
 * Requests Store
 * 
 * Zustand store for managing the current request editing state.
 * 
 * ARCHITECTURE:
 * - Single source of truth for request editing state
 * - Drafts store ALL request state (method, url, headers, body, params, auth)
 * - Tab state is independent - switching tabs preserves all state
 * - No derived state that can reset
 * 
 * CRITICAL BEHAVIORS:
 * - Method change NEVER resets other fields
 * - Tab switching NEVER loses state
 * - Each tab maintains isolated, complete state
 * - Drafts are only cleared after confirmed save
 * - Closing tab preserves draft and response for reopening
 * 
 * BODY STATE STRUCTURE:
 * body = {
 *   activeType: "none" | "json" | "formdata" | "raw",
 *   json: "...",
 *   formdata: [...],
 *   raw: "..."
 * }
 * Switching activeType does NOT delete other type data.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useResponseStore from './responseStore';

/**
 * Default body structure with independent storage per type
 */
const createDefaultBody = () => ({
  activeType: 'none',
  json: '{\n  \n}',
  formdata: [],
  raw: '',
});

/**
 * Default request structure
 */
const createDefaultRequest = (overrides = {}) => {
  const request = {
    id: null,
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: createDefaultBody(),
    auth: { type: 'none', data: {} },
  };
  
  // Handle legacy body format migration
  if (overrides.body && typeof overrides.body === 'object') {
    if ('type' in overrides.body && 'content' in overrides.body) {
      // Legacy format: { type, content } -> new format: { activeType, json, formdata, raw }
      const legacyType = overrides.body.type || 'none';
      const legacyContent = overrides.body.content;
      
      const newBody = createDefaultBody();
      newBody.activeType = legacyType;
      
      if (legacyType === 'json' && typeof legacyContent === 'string') {
        newBody.json = legacyContent;
      } else if (legacyType === 'formdata' && Array.isArray(legacyContent)) {
        newBody.formdata = legacyContent;
      } else if (legacyType === 'raw' && typeof legacyContent === 'string') {
        newBody.raw = legacyContent;
      }
      
      overrides.body = newBody;
    } else if (!('activeType' in overrides.body)) {
      // Has body but no activeType - ensure proper structure
      overrides.body = { ...createDefaultBody(), ...overrides.body };
    }
  }
  
  return { ...request, ...overrides };
};

const useRequestsStore = create(
  persist(
    (set, get) => ({
      // State
      activeRequestId: null,
      activeCollectionId: null,
      openTabs: [], // Array of { collectionId, requestId, isNew }
      
      // Draft changes (unsaved modifications)
      // Key: requestId, Value: COMPLETE draft request object (not partial)
      drafts: {},
      
      // Dirty tracking - which requests have unsaved changes
      // Key: requestId, Value: true if dirty
      dirtyRequests: {},
      
      // Save state tracking (not persisted)
      savingRequests: {}, // Request IDs currently being saved { [requestId]: true }
      saveVersions: {}, // Version tracking for optimistic locking
      
      // ==========================================
      // Actions
      // ==========================================
      
      /**
       * Open a request in the editor
       * Adds to tabs if not already open
       * 
       * CRITICAL: Preserves existing draft if one exists.
       * This ensures reopening a request restores previous state.
       */
      openRequest: (collectionId, request) => {
        const { openTabs, drafts } = get();
        
        // Check if tab already exists
        const existingTab = openTabs.find(
          t => t.collectionId === collectionId && t.requestId === request.id
        );
        
        if (!existingTab) {
          // Check if we have a cached draft (from previous editing session)
          const existingDraft = drafts[request.id];
          
          const newTab = {
            collectionId,
            requestId: request.id,
            isNew: false,
          };
          
          // Only create new draft if one doesn't already exist
          // This preserves edits from previous session
          const draftToUse = existingDraft || createDefaultRequest({
            ...request,
            id: request.id,
          });
          
          // Update response store's active request
          useResponseStore.getState().setActiveRequestId(request.id);
          
          set({
            openTabs: [...openTabs, newTab],
            activeRequestId: request.id,
            activeCollectionId: collectionId,
            drafts: {
              ...drafts,
              [request.id]: draftToUse,
            },
          });
        } else {
          // Just switch to existing tab - draft already exists
          useResponseStore.getState().setActiveRequestId(request.id);
          
          set({
            activeRequestId: request.id,
            activeCollectionId: collectionId,
          });
        }
      },
      
      /**
       * Close a tab
       * 
       * CRITICAL: This ONLY removes the tab from view.
       * It does NOT delete:
       * - Request draft data (preserved for reopening)
       * - Response data (preserved for reopening)
       * 
       * Data is only cleared when explicitly deleted.
       */
      closeTab: (requestId) => {
        const { openTabs, activeRequestId } = get();
        
        const newTabs = openTabs.filter(t => t.requestId !== requestId);
        
        // If closing active tab, switch to another
        let newActiveId = activeRequestId;
        let newActiveCollection = get().activeCollectionId;
        
        if (activeRequestId === requestId && newTabs.length > 0) {
          const lastTab = newTabs[newTabs.length - 1];
          newActiveId = lastTab.requestId;
          newActiveCollection = lastTab.collectionId;
        } else if (newTabs.length === 0) {
          newActiveId = null;
          newActiveCollection = null;
        }
        
        // NOTE: Draft is NOT removed - it's preserved for when the request is reopened
        // NOTE: Response is NOT cleared - it's preserved for when the request is reopened
        
        // Update active request in response store
        if (newActiveId) {
          useResponseStore.getState().setActiveRequestId(newActiveId);
        }
        
        set({
          openTabs: newTabs,
          activeRequestId: newActiveId,
          activeCollectionId: newActiveCollection,
          // drafts are NOT modified - preserved for reopening
        });
      },
      
      /**
       * Set active tab
       */
      setActiveTab: (requestId, collectionId) => {
        useResponseStore.getState().setActiveRequestId(requestId);
        set({
          activeRequestId: requestId,
          activeCollectionId: collectionId,
        });
      },
      
      /**
       * Update draft - MERGES with existing draft
       * This is the PRIMARY way to update request state
       * 
       * CRITICAL: This preserves ALL existing fields
       * Method change only updates method field, not others
       */
      updateDraft: (requestId, changes) => {
        const { drafts, dirtyRequests } = get();
        const existingDraft = drafts[requestId] || createDefaultRequest({ id: requestId });
        
        // Deep merge for nested objects (body, auth)
        const mergedDraft = {
          ...existingDraft,
          ...changes,
        };
        
        // Handle nested objects separately if provided
        if (changes.body) {
          mergedDraft.body = { ...existingDraft.body, ...changes.body };
        }
        if (changes.auth) {
          mergedDraft.auth = { ...existingDraft.auth, ...changes.auth };
        }
        
        set({
          drafts: {
            ...drafts,
            [requestId]: mergedDraft,
          },
          // Mark as dirty when changes are made
          dirtyRequests: {
            ...dirtyRequests,
            [requestId]: true,
          },
        });
        
          // No longer syncing method or name to tab object
          // since they are retrieved directly from the draft
      },
      
      /**
       * Get draft for a request
       * Returns null if no draft exists
       */
      getDraft: (requestId) => {
        return get().drafts[requestId] || null;
      },
      
      /**
       * Check if request has unsaved changes
       * Uses dirtyRequests tracking, not just draft existence
       */
      hasDraft: (requestId) => {
        return !!get().dirtyRequests[requestId];
      },
      
      /**
       * Mark a request as dirty (has unsaved changes)
       */
      markDirty: (requestId) => {
        const { dirtyRequests } = get();
        set({
          dirtyRequests: {
            ...dirtyRequests,
            [requestId]: true,
          },
        });
      },
      
      /**
       * Mark a request as clean (saved successfully)
       */
      markClean: (requestId) => {
        const { dirtyRequests } = get();
        const { [requestId]: _, ...rest } = dirtyRequests;
        set({ dirtyRequests: rest });
      },
      
      /**
       * Clear draft after save
       * Only call this after confirmed successful save
       */
      clearDraft: (requestId) => {
        const { drafts } = get();
        const { [requestId]: removed, ...remainingDrafts } = drafts;
        set({ drafts: remainingDrafts });
      },
      
      /**
       * Sync request metadata (like name) from the persistent store,
       * without marking it as dirty, so that tabs and UI stay in sync.
       */
      syncRequestMeta: (requestId, meta) => {
        const { drafts } = get();
        if (drafts[requestId]) {
          set({
            drafts: {
              ...drafts,
              [requestId]: { ...drafts[requestId], ...meta },
            }
          });
        }
      },
      
      /**
       * Update tab info (when request is renamed or method changes)
       */
      updateTabInfo: (requestId, updates) => {
        const { openTabs } = get();
        
        set({
          openTabs: openTabs.map(tab =>
            tab.requestId === requestId
              ? { ...tab, ...updates }
              : tab
          ),
        });
      },
      
      /**
       * Replace request ID in tab (after saving new request)
       * Also cleans up dirty state since the request was just saved
       */
      replaceRequestId: (oldRequestId, newRequestId, updates = {}) => {
        const { openTabs, drafts, dirtyRequests, activeRequestId } = get();
        
        // Update tabs
        const newTabs = openTabs.map(tab =>
          tab.requestId === oldRequestId
            ? { ...tab, requestId: newRequestId, isNew: false, ...updates }
            : tab
        );
        
        // Move draft to new ID
        const { [oldRequestId]: oldDraft, ...otherDrafts } = drafts;
        const newDrafts = oldDraft 
          ? { ...otherDrafts, [newRequestId]: { ...oldDraft, id: newRequestId, isNew: false } }
          : otherDrafts;
        
        // Clean up dirty state for old ID (it was just saved)
        const { [oldRequestId]: _, ...cleanDirtyRequests } = dirtyRequests;
        
        // Update response store if this was active
        if (activeRequestId === oldRequestId) {
          useResponseStore.getState().setActiveRequestId(newRequestId);
        }
        
        set({
          openTabs: newTabs,
          activeRequestId: activeRequestId === oldRequestId ? newRequestId : activeRequestId,
          drafts: newDrafts,
          dirtyRequests: cleanDirtyRequests,
        });
      },
      
      /**
       * Create new request tab (unsaved)
       */
      createNewRequest: (collectionId) => {
        const tempId = `new-${Date.now()}`;
        
        const newRequest = createDefaultRequest({
          id: tempId,
          isNew: true,
        });
        
        const newTab = {
          collectionId,
          requestId: tempId,
          isNew: true,
        };
        
        const { openTabs, drafts, dirtyRequests } = get();
        
        // Update response store's active request
        useResponseStore.getState().setActiveRequestId(tempId);
        
        set({
          openTabs: [...openTabs, newTab],
          activeRequestId: tempId,
          activeCollectionId: collectionId,
          drafts: {
            ...drafts,
            [tempId]: newRequest,
          },
          // New requests are dirty by default
          dirtyRequests: {
            ...dirtyRequests,
            [tempId]: true,
          },
        });
        
        return newRequest;
      },
      
      /**
       * Mark request as being saved
       */
      setSaving: (requestId, isSaving) => {
        const { savingRequests } = get();
        if (isSaving) {
          set({ savingRequests: { ...savingRequests, [requestId]: true } });
        } else {
          const { [requestId]: _, ...rest } = savingRequests;
          set({ savingRequests: rest });
        }
      },
      
      /**
       * Check if request is being saved
       */
      isSaving: (requestId) => {
        return !!get().savingRequests[requestId];
      },
      
      /**
       * Increment save version (for optimistic locking)
       */
      incrementSaveVersion: (requestId) => {
        const { saveVersions } = get();
        const currentVersion = saveVersions[requestId] || 0;
        set({
          saveVersions: {
            ...saveVersions,
            [requestId]: currentVersion + 1,
          },
        });
        return currentVersion + 1;
      },
      
      /**
       * Get current save version
       */
      getSaveVersion: (requestId) => {
        return get().saveVersions[requestId] || 0;
      },
      
      /**
       * Clear all state (on collection delete, etc.)
       */
      clearAll: () => {
        set({
          activeRequestId: null,
          activeCollectionId: null,
          openTabs: [],
          drafts: {},
          dirtyRequests: {},
          savingRequests: {},
          saveVersions: {},
        });
      },
    }),
    {
      name: 'requests-storage',
      partialize: (state) => ({
        openTabs: state.openTabs,
        drafts: state.drafts,
        dirtyRequests: state.dirtyRequests,
        activeRequestId: state.activeRequestId,
        activeCollectionId: state.activeCollectionId,
      }),
    }
  )
);

export default useRequestsStore;
