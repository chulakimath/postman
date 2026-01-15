/**
 * Main Application Component
 * 
 * Root component that:
 * - Sets up the main layout
 * - Initializes stores and loads data
 * - Handles global keyboard shortcuts
 * - Renders modals
 */

import { useEffect, useCallback } from 'react';
import MainLayout from './layout/MainLayout';
import useCollectionsStore from './store/collectionsStore';
import useUIStore from './store/uiStore';

// Modals
import CreateCollectionModal from './features/collections/CreateCollectionModal';
import SearchModal from './features/search/SearchModal';
import DeleteConfirmModal from './shared/components/DeleteConfirmModal';

function App() {
  // Store actions
  const loadCollections = useCollectionsStore(state => state.loadCollections);
  const { isSearchOpen, openSearch, closeSearch } = useUIStore();
  
  /**
   * Initialize application
   * Load collections and app state from storage
   */
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);
  
  /**
   * Handle global keyboard shortcuts
   */
  const handleKeyDown = useCallback((e) => {
    // Ctrl/Cmd + K - Open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isSearchOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    }
    
    // Escape - Close modals
    if (e.key === 'Escape') {
      if (isSearchOpen) {
        closeSearch();
      }
    }
  }, [isSearchOpen, openSearch, closeSearch]);
  
  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-1 text-text-primary">
      {/* Main Layout */}
      <MainLayout />
      
      {/* Modals */}
      <CreateCollectionModal />
      <SearchModal />
      <DeleteConfirmModal />
    </div>
  );
}

export default App;
