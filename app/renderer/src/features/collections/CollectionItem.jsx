/**
 * Collection Item Component
 * 
 * Expandable collection in sidebar showing:
 * - Collection name
 * - Request count
 * - Nested requests
 * - Context menu (rename, delete, add request)
 */

import { useState, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal,
  Plus,
  Edit2,
  Trash2,
  Folder,
  FolderOpen,
} from 'lucide-react';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';
import useUIStore from '../../store/uiStore';
import RequestItem from './RequestItem';

function CollectionItem({ collection, searchQuery = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(collection.name);
  
  const inputRef = useRef(null);
  
  const { updateCollection, addRequest, setActiveCollection, activeCollectionId } = useCollectionsStore();
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
  
  /**
   * Handle rename submit
   */
  const handleRename = async () => {
    if (renameValue.trim() && renameValue !== collection.name) {
      await updateCollection(collection.id, { name: renameValue.trim() });
    }
    setIsRenaming(false);
  };
  
  /**
   * Handle adding new request
   */
  const handleAddRequest = async () => {
    setActiveCollection(collection.id);
    const newRequest = createNewRequest(collection.id);
    setIsExpanded(true);
    setIsMenuOpen(false);
  };
  
  /**
   * Start rename mode
   */
  const startRename = () => {
    setIsRenaming(true);
    setIsMenuOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  return (
    <div className="rounded-md">
      {/* Collection Header */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 cursor-pointer
          transition-colors group
          ${isActive ? 'bg-surface-3' : 'hover:bg-surface-3'}
        `}
        onClick={() => {
          setIsExpanded(!isExpanded);
          setActiveCollection(collection.id);
        }}
      >
        {/* Expand Icon */}
        <span className="text-text-muted">
          {shouldExpand ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </span>
        
        {/* Folder Icon */}
        <span className="text-accent-orange">
          {shouldExpand ? (
            <FolderOpen size={16} />
          ) : (
            <Folder size={16} />
          )}
        </span>
        
        {/* Name / Rename Input */}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setRenameValue(collection.name);
                setIsRenaming(false);
              }
            }}
            className="flex-1 bg-surface-3 border border-accent-orange rounded px-1.5 py-0.5
                       text-sm text-text-primary focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-text-primary truncate">
            {collection.name}
          </span>
        )}
        
        {/* Request Count */}
        <span className="text-xs text-text-muted">
          {requestCount}
        </span>
        
        {/* Context Menu Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className={`
              p-1 rounded hover:bg-surface-4 transition-colors
              ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
          >
            <MoreHorizontal size={14} className="text-text-muted" />
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-[100]" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />
              
              <div className="absolute right-0 top-6 z-[101] w-40 py-1 
                              bg-surface-3 border border-border rounded-md shadow-xl">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddRequest();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-text-secondary
                             hover:bg-surface-4 hover:text-text-primary
                             flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Request
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-text-secondary
                             hover:bg-surface-4 hover:text-text-primary
                             flex items-center gap-2"
                >
                  <Edit2 size={14} />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    openDeleteConfirmModal('collection', collection.id, collection.name);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-accent-red
                             hover:bg-accent-red/10
                             flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
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
