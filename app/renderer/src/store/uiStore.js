/**
 * UI Store
 * 
 * Zustand store for managing UI state.
 * Handles:
 * - Sidebar width
 * - Search modal visibility
 * - Theme (future)
 * - Panel visibility
 */

import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  // State
  sidebarWidth: 280,
  isSearchOpen: false,
  theme: 'dark', // For future light mode support
  
  // Panel visibility
  isSidebarCollapsed: false,
  isResponsePanelCollapsed: false,
  
  // Modal states
  isCreateCollectionModalOpen: false,
  isDeleteConfirmModalOpen: false,
  deleteTarget: null, // { type: 'collection' | 'request', id, name }
  
  // ==========================================
  // Actions
  // ==========================================
  
  /**
   * Set sidebar width
   */
  setSidebarWidth: (width) => {
    set({ sidebarWidth: Math.max(200, Math.min(400, width)) });
  },
  
  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar: () => {
    set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },
  
  /**
   * Toggle response panel collapsed state
   */
  toggleResponsePanel: () => {
    set(state => ({ isResponsePanelCollapsed: !state.isResponsePanelCollapsed }));
  },
  
  /**
   * Toggle search modal
   */
  toggleSearch: () => {
    set(state => ({ isSearchOpen: !state.isSearchOpen }));
  },
  
  /**
   * Open search modal
   */
  openSearch: () => {
    set({ isSearchOpen: true });
  },
  
  /**
   * Close search modal
   */
  closeSearch: () => {
    set({ isSearchOpen: false });
  },
  
  /**
   * Open create collection modal
   */
  openCreateCollectionModal: () => {
    set({ isCreateCollectionModalOpen: true });
  },
  
  /**
   * Close create collection modal
   */
  closeCreateCollectionModal: () => {
    set({ isCreateCollectionModalOpen: false });
  },
  
  /**
   * Open delete confirmation modal
   * @param {string} type - 'collection' or 'request'
   * @param {string} id - ID of item to delete
   * @param {string} name - Name of item (for display)
   * @param {string} collectionId - Collection ID (required for request deletion)
   */
  openDeleteConfirmModal: (type, id, name, collectionId = null) => {
    set({
      isDeleteConfirmModalOpen: true,
      deleteTarget: { type, id, name, collectionId },
    });
  },
  
  /**
   * Close delete confirmation modal
   */
  closeDeleteConfirmModal: () => {
    set({
      isDeleteConfirmModalOpen: false,
      deleteTarget: null,
    });
  },
  
  /**
   * Set theme
   */
  setTheme: (theme) => {
    set({ theme });
    // Apply to document for CSS
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },
}));

export default useUIStore;
