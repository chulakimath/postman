/**
 * Collections Store
 * 
 * Zustand store for managing collections state.
 * Handles:
 * - Loading collections from storage
 * - CRUD operations
 * - Active collection tracking
 * 
 * Uses the IPC bridge to communicate with main process.
 */

import { create } from 'zustand';

/**
 * Helper to safely call API methods
 * Returns null if window.api is not available (e.g., during SSR or tests)
 */
const api = () => typeof window !== 'undefined' ? window.api : null;

const useCollectionsStore = create((set, get) => ({
  // State
  collections: [],
  activeCollectionId: null,
  isLoading: false,
  error: null,
  
  // ==========================================
  // Actions
  // ==========================================
  
  /**
   * Load all collections from storage
   * Called on app initialization
   */
  loadCollections: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await api()?.getCollections();
      
      if (result?.success) {
        set({ collections: result.data, isLoading: false });
      } else {
        set({ error: result?.error || 'Failed to load collections', isLoading: false });
      }
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  /**
   * Create a new collection
   * @param {string} name - Collection name
   */
  createCollection: async (name) => {
    try {
      const result = await api()?.createCollection({ name });
      
      if (result?.success) {
        const { collections } = get();
        set({ 
          collections: [result.data, ...collections],
          activeCollectionId: result.data.id,
        });
        return result.data;
      } else {
        set({ error: result?.error || 'Failed to create collection' });
        return null;
      }
    } catch (error) {
      set({ error: error.message });
      return null;
    }
  },
  
  /**
   * Update a collection (name, requests, etc.)
   * @param {string} id - Collection ID
   * @param {Object} data - Updated data
   */
  updateCollection: async (id, data) => {
    try {
      const result = await api()?.updateCollection(id, data);
      
      if (result?.success) {
        const { collections } = get();
        set({
          collections: collections.map(c => 
            c.id === id ? result.data : c
          ),
        });
        return result.data;
      } else {
        set({ error: result?.error || 'Failed to update collection' });
        return null;
      }
    } catch (error) {
      set({ error: error.message });
      return null;
    }
  },
  
  /**
   * Delete a collection
   * @param {string} id - Collection ID
   */
  deleteCollection: async (id) => {
    try {
      const result = await api()?.deleteCollection(id);
      
      if (result?.success) {
        const { collections, activeCollectionId } = get();
        const newCollections = collections.filter(c => c.id !== id);
        
        set({
          collections: newCollections,
          // Clear active if deleted collection was active
          activeCollectionId: activeCollectionId === id ? null : activeCollectionId,
        });
        return true;
      } else {
        set({ error: result?.error || 'Failed to delete collection' });
        return false;
      }
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },
  
  /**
   * Set the active collection
   * @param {string} id - Collection ID
   */
  setActiveCollection: (id) => {
    set({ activeCollectionId: id });
  },
  
  /**
   * Get the currently active collection
   */
  getActiveCollection: () => {
    const { collections, activeCollectionId } = get();
    return collections.find(c => c.id === activeCollectionId) || null;
  },
  
  /**
   * Add a request to a collection
   * @param {string} collectionId - Collection ID
   * @param {Object} request - Request object
   */
  addRequest: async (collectionId, request) => {
    const collection = get().collections.find(c => c.id === collectionId);
    if (!collection) return null;
    
    const newRequest = {
      id: crypto.randomUUID(),
      name: request.name || 'New Request',
      method: request.method || 'GET',
      url: request.url || '',
      headers: request.headers || [],
      params: request.params || [],
      body: request.body || { type: 'none', content: '' },
      auth: request.auth || { type: 'none', data: {} },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const updatedRequests = [...collection.requests, newRequest];
    await get().updateCollection(collectionId, { requests: updatedRequests });
    
    return newRequest;
  },
  
  /**
   * Update a request in a collection
   * @param {string} collectionId - Collection ID
   * @param {string} requestId - Request ID
   * @param {Object} data - Updated request data
   */
  updateRequest: async (collectionId, requestId, data) => {
    const collection = get().collections.find(c => c.id === collectionId);
    if (!collection) return null;
    
    const updatedRequests = collection.requests.map(r =>
      r.id === requestId
        ? { ...r, ...data, updatedAt: Date.now() }
        : r
    );
    
    await get().updateCollection(collectionId, { requests: updatedRequests });
  },
  
  /**
   * Delete a request from a collection
   * @param {string} collectionId - Collection ID
   * @param {string} requestId - Request ID
   */
  deleteRequest: async (collectionId, requestId) => {
    const collection = get().collections.find(c => c.id === collectionId);
    if (!collection) return;
    
    const updatedRequests = collection.requests.filter(r => r.id !== requestId);
    await get().updateCollection(collectionId, { requests: updatedRequests });
  },
  
  /**
   * Duplicate a request
   * @param {string} collectionId - Collection ID
   * @param {string} requestId - Request ID
   */
  duplicateRequest: async (collectionId, requestId) => {
    const collection = get().collections.find(c => c.id === collectionId);
    if (!collection) return null;
    
    const request = collection.requests.find(r => r.id === requestId);
    if (!request) return null;
    
    return get().addRequest(collectionId, {
      ...request,
      name: `${request.name} (copy)`,
    });
  },
  
  /**
   * Clear any error state
   */
  clearError: () => {
    set({ error: null });
  },
}));

export default useCollectionsStore;
