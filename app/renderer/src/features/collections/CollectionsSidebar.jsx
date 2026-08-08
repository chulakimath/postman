/**
 * Collections Sidebar
 * 
 * Left sidebar displaying all collections and their requests.
 * Features:
 * - New collection button
 * - Search/filter
 * - Collapsible collection items
 * - Context menu for actions
 */

import { useState } from 'react';
import { 
  FolderPlus, 
  Search, 
  ChevronRight,
  MoreHorizontal,
  Plus,
  Upload,
} from 'lucide-react';
import useCollectionsStore from '../../store/collectionsStore';
import useUIStore from '../../store/uiStore';
import CollectionItem from './CollectionItem';
import Input from '../../shared/components/Input';
import ImportModal from '../import/ImportModal';

function CollectionsSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const { collections, isLoading } = useCollectionsStore();
  const { openCreateCollectionModal } = useUIStore();
  
  // Filter collections by search query
  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.requests?.some(req => 
      req.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  const [menuState, setMenuState] = useState({ isOpen: false, x: 0, y: 0 });

  const handleSidebarContextMenu = (e) => {
    // Only handle context menu if clicking directly on container background, not on children with their own context menu
    if (e.target === e.currentTarget || e.target.classList.contains('sidebar-bg')) {
      e.preventDefault();
      const menuWidth = 180;
      const menuHeight = 100;
      const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
      const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

      setMenuState({
        isOpen: true,
        x: Math.max(10, x),
        y: Math.max(10, y),
      });
    }
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Collections</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsImportOpen(true)}
              className="p-1.5 rounded-md text-text-secondary hover:text-accent-orange 
                         hover:bg-surface-3 transition-colors"
              title="Import Collection or Environment (Postman / Testly JSON)"
            >
              <Upload size={16} />
            </button>
            <button
              onClick={openCreateCollectionModal}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary 
                         hover:bg-surface-3 transition-colors"
              title="New Collection"
            >
              <FolderPlus size={18} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter collections..."
          icon={Search}
          size="sm"
        />
      </div>
      
      {/* Collections List */}
      <div 
        className="flex-1 overflow-y-auto py-2 sidebar-bg"
        onContextMenu={handleSidebarContextMenu}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-accent-orange border-t-transparent rounded-full" />
          </div>
        ) : filteredCollections.length === 0 ? (
          <EmptyState 
            hasCollections={collections.length > 0}
            onCreateCollection={openCreateCollectionModal}
          />
        ) : (
          <div className="space-y-1 px-2">
            {filteredCollections.map(collection => (
              <CollectionItem 
                key={collection.id} 
                collection={collection}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>

      {/* Blank Space Context Menu */}
      {menuState.isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setMenuState({ isOpen: false, x: 0, y: 0 })}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuState({ isOpen: false, x: 0, y: 0 });
            }}
          />
          <div
            className="fixed z-[101] w-48 py-1.5 bg-surface-3 border border-border rounded-lg shadow-2xl animate-fade-in text-sm"
            style={{
              top: `${menuState.y}px`,
              left: `${menuState.x}px`,
            }}
          >
            <button
              onClick={() => {
                setMenuState({ isOpen: false, x: 0, y: 0 });
                openCreateCollectionModal();
              }}
              className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-surface-4 hover:text-text-primary flex items-center gap-2 transition-colors"
            >
              <FolderPlus size={14} />
              New Collection
            </button>
          </div>
        </>
      )}
      
      {/* Keyboard Shortcut Hint */}
      <div className="flex-shrink-0 p-3 border-t border-border">
        <button
          onClick={() => useUIStore.getState().openSearch()}
          className="w-full flex items-center justify-between px-3 py-2 
                     bg-surface-3 rounded-md text-sm text-text-secondary
                     hover:bg-surface-4 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search size={14} />
            Search requests
          </span>
          <kbd className="px-1.5 py-0.5 bg-surface-1 rounded text-xs">⌘K</kbd>
        </button>
      </div>

      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ hasCollections, onCreateCollection }) {
  if (hasCollections) {
    // Has collections but search returned nothing
    return (
      <div className="text-center py-8 px-4">
        <p className="text-text-muted text-sm">
          No matching collections or requests
        </p>
      </div>
    );
  }
  
  // No collections at all
  return (
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-3 
                      flex items-center justify-center">
        <FolderPlus size={24} className="text-text-muted" />
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">
        No collections yet
      </h3>
      <p className="text-text-muted text-sm mb-4">
        Create your first collection to organize API requests
      </p>
      <button
        onClick={onCreateCollection}
        className="inline-flex items-center gap-2 px-4 py-2 
                   bg-accent-orange text-white rounded-md text-sm font-medium
                   hover:bg-accent-orange-hover transition-colors"
      >
        <Plus size={16} />
        New Collection
      </button>
    </div>
  );
}

export default CollectionsSidebar;
