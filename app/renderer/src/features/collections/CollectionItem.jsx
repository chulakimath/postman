/**
 * Collection Item Component
 * 
 * Expandable collection in sidebar showing:
 * - Collection name
 * - Request count
 * - Nested requests
 * - Context menu (rename, delete, add request)
 * 
 * LAYOUT STABILITY:
 * - Uses stable width for name container
 * - Rename input overlays text without causing reflow
 * - No flex-shrink jumps during rename
 */

import { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal,
  Plus,
  Edit2,
  Trash2,
  Folder,
  FolderOpen,
  Copy,
  Download,
} from 'lucide-react';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';
import useUIStore from '../../store/uiStore';
import { exportCollection } from '../../utils/importerExporter';
import RequestItem from './RequestItem';

function CollectionItem({ collection, searchQuery = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuState, setMenuState] = useState({ isOpen: false, x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(collection.name);
  
  const inputRef = useRef(null);
  const nameContainerRef = useRef(null);
  const menuButtonRef = useRef(null);
  
  const { updateCollection, duplicateCollection, setActiveCollection, activeCollectionId } = useCollectionsStore();
  const { createNewRequest } = useRequestsStore();
  const { openDeleteConfirmModal } = useUIStore();
  
  const isActive = activeCollectionId === collection.id;
  const requestCount = collection.requests?.length || 0;
  
  // Filter requests by search query
  const filteredRequests = searchQuery
    ? collection.requests?.filter(req => 
        req.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : collection.requests;
  
  // Auto-expand if search matches requests
  const shouldExpand = isExpanded || (searchQuery && filteredRequests?.length > 0);
  
  // Sync rename value when collection name changes externally
  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(collection.name);
    }
  }, [collection.name, isRenaming]);
  
  /**
   * Handle rename submit
   */
  const handleRename = async () => {
    const trimmedValue = renameValue.trim();
    if (trimmedValue && trimmedValue !== collection.name) {
      await updateCollection(collection.id, { name: trimmedValue });
    } else {
      setRenameValue(collection.name);
    }
    setIsRenaming(false);
  };
  
  /**
   * Handle adding new request
   */
  const handleAddRequest = async () => {
    setActiveCollection(collection.id);
    createNewRequest(collection.id);
    setIsExpanded(true);
    setMenuState({ isOpen: false, x: 0, y: 0 });
  };

  /**
   * Handle duplicating collection
   */
  const handleDuplicate = async () => {
    setMenuState({ isOpen: false, x: 0, y: 0 });
    await duplicateCollection(collection.id);
  };
  
  /**
   * Start rename mode
   */
  const startRename = () => {
    setRenameValue(collection.name);
    setIsRenaming(true);
    setMenuState({ isOpen: false, x: 0, y: 0 });
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  /**
   * Open context menu at mouse coordinates (right click) or button position
   */
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 180;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setMenuState({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
    });
  };

  const handleMenuButtonClick = (e) => {
    e.stopPropagation();
    if (menuState.isOpen) {
      setMenuState({ isOpen: false, x: 0, y: 0 });
    } else if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuState({
        isOpen: true,
        x: Math.max(10, rect.left - 130),
        y: Math.max(10, rect.bottom + 4),
      });
    }
  };
  
  return (
    <div className="rounded-md select-none">
      {/* Collection Header */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 cursor-pointer
          transition-colors group rounded-md
          ${isActive ? 'bg-surface-3' : 'hover:bg-surface-3'}
        `}
        onClick={() => {
          setIsExpanded(!isExpanded);
          setActiveCollection(collection.id);
        }}
        onContextMenu={handleContextMenu}
      >
        {/* Expand Icon */}
        <span className="text-text-muted flex-shrink-0">
          {shouldExpand ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </span>
        
        {/* Folder Icon */}
        <span className="text-accent-orange flex-shrink-0">
          {shouldExpand ? (
            <FolderOpen size={16} />
          ) : (
            <Folder size={16} />
          )}
        </span>
        
        {/* Name Container */}
        <div 
          ref={nameContainerRef}
          className="flex-1 min-w-0 relative"
        >
          <span 
            className={`
              block text-sm font-medium text-text-primary truncate
              ${isRenaming ? 'invisible' : 'visible'}
            `}
          >
            {collection.name}
          </span>
          
          {/* Rename input overlays the text */}
          {isRenaming && (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRename();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setRenameValue(collection.name);
                  setIsRenaming(false);
                }
              }}
              className="absolute inset-0 w-full bg-surface-3 border border-accent-orange 
                         rounded px-1 text-sm text-text-primary focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        
        {/* Request Count */}
        <span className="text-xs text-text-muted flex-shrink-0 tabular-nums">
          {requestCount}
        </span>
        
        {/* Context Menu Button */}
        <div className="relative flex-shrink-0">
          <button
            ref={menuButtonRef}
            onClick={handleMenuButtonClick}
            className={`
              p-1 rounded hover:bg-surface-4 transition-colors
              ${menuState.isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
          >
            <MoreHorizontal size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* Fixed Context Menu Overlay */}
      {menuState.isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={(e) => {
              e.stopPropagation();
              setMenuState({ isOpen: false, x: 0, y: 0 });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
                handleAddRequest();
              }}
              className="w-full px-3 py-1.5 text-left text-text-secondary
                         hover:bg-surface-4 hover:text-text-primary
                         flex items-center gap-2 transition-colors"
            >
              <Plus size={14} />
              Add Request
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate();
              }}
              className="w-full px-3 py-1.5 text-left text-text-secondary
                         hover:bg-surface-4 hover:text-text-primary
                         flex items-center gap-2 transition-colors"
            >
              <Copy size={14} />
              Duplicate Collection
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
              className="w-full px-3 py-1.5 text-left text-text-secondary
                         hover:bg-surface-4 hover:text-text-primary
                         flex items-center gap-2 transition-colors"
            >
              <Edit2 size={14} />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuState({ isOpen: false, x: 0, y: 0 });
                exportCollection(collection);
              }}
              className="w-full px-3 py-1.5 text-left text-text-secondary
                         hover:bg-surface-4 hover:text-accent-orange
                         flex items-center gap-2 transition-colors"
            >
              <Download size={14} />
              Export Collection
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuState({ isOpen: false, x: 0, y: 0 });
                openDeleteConfirmModal('collection', collection.id, collection.name);
              }}
              className="w-full px-3 py-1.5 text-left text-accent-red
                         hover:bg-accent-red/10
                         flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
      
      {/* Requests List */}
      {shouldExpand && filteredRequests && filteredRequests.length > 0 && (
        <div className="ml-4 border-l border-border">
          {filteredRequests.map(request => (
            <RequestItem 
              key={request.id}
              request={request}
              collectionId={collection.id}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
      
      {/* Empty Requests Message */}
      {shouldExpand && (!collection.requests || collection.requests.length === 0) && (
        <div className="ml-8 py-2 text-xs text-text-muted">
          No requests yet
        </div>
      )}
    </div>
  );
}

export default CollectionItem;
