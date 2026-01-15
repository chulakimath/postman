/**
 * Requests Store
 * 
 * Zustand store for managing the current request editing state.
 * Handles:
 * - Active request tracking
 * - Open tabs
 * - Draft/unsaved changes
 * - Autosave with debounce
 */

import { create } from 'zustand';
import useResponseStore from './responseStore';

const useRequestsStore = create((set, get) => ({
  // State
  activeRequestId: null,
  activeCollectionId: null,
  openTabs: [], // Array of { collectionId, requestId, name, method }
  
  // Draft changes (unsaved modifications)
  // Key: requestId, Value: draft request object
  drafts: {},
  
  // ==========================================
  // Actions
  // ==========================================
  
  /**
   * Open a request in the editor
   * Adds to tabs if not already open
   */
  openRequest: (collectionId, request) => {
    const { openTabs } = get();
    
    // Check if tab already exists
    const existingTab = openTabs.find(
      t => t.collectionId === collectionId && t.requestId === request.id
    );
    
    if (!existingTab) {
      // Add new tab
      const newTab = {
        collectionId,
        requestId: request.id,
        name: request.name,
        method: request.method,
      };
      
      // Update response store's active request
      useResponseStore.getState().setActiveRequestId(request.id);
      
      set({
        openTabs: [...openTabs, newTab],
        activeRequestId: request.id,
        activeCollectionId: collectionId,
      });
    } else {
      // Just switch to existing tab
      // Update response store's active request
      useResponseStore.getState().setActiveRequestId(request.id);
      
      set({
        activeRequestId: request.id,
        activeCollectionId: collectionId,
      });
    }
  },
  
  /**
   * Close a tab
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
    
    // Clean up draft
    const { drafts } = get();
    const { [requestId]: removed, ...remainingDrafts } = drafts;
    
    // Only clear response when closing the active tab
    if (requestId === activeRequestId) {
      useResponseStore.getState().clearResponse(requestId);
    }
    
    set({
      openTabs: newTabs,
      activeRequestId: newActiveId,
      activeCollectionId: newActiveCollection,
      drafts: remainingDrafts,
    });
  },
  
  /**
   * Set active tab
   */
  setActiveTab: (requestId, collectionId) => {
    // Update response store's active request
    useResponseStore.getState().setActiveRequestId(requestId);
    set({
      activeRequestId: requestId,
      activeCollectionId: collectionId,
    });
  },
  
  /**
   * Update draft (unsaved changes)
   * Used for autosave debouncing
   */
  updateDraft: (requestId, changes) => {
    const { drafts } = get();
    
    set({
      drafts: {
        ...drafts,
        [requestId]: {
          ...(drafts[requestId] || {}),
          ...changes,
        },
      },
    });
  },
  
  /**
   * Get draft or original request
   */
  getDraft: (requestId) => {
    return get().drafts[requestId] || null;
  },
  
  /**
   * Check if request has unsaved changes
   */
  hasDraft: (requestId) => {
    return requestId in get().drafts;
  },
  
  /**
   * Clear draft after save
   */
  clearDraft: (requestId) => {
    const { drafts } = get();
    const { [requestId]: removed, ...remainingDrafts } = drafts;
    set({ drafts: remainingDrafts });
  },
  
  /**
   * Update tab info (when request is renamed)
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
   * Create new request tab (unsaved)
   */
  createNewRequest: (collectionId) => {
    const tempId = `new-${Date.now()}`;
    
    const newRequest = {
      id: tempId,
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      body: { type: 'none', content: '' },
      auth: { type: 'none', data: {} },
      isNew: true,
    };
    
    const newTab = {
      collectionId,
      requestId: tempId,
      name: 'New Request',
      method: 'GET',
      isNew: true,
    };
    
    const { openTabs, drafts } = get();
    
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
    });
    
    return newRequest;
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
    });
  },
}));

export default useRequestsStore;
