/**
 * Request Item Component
 * 
 * Single request in the sidebar.
 * Shows method badge, name, and opens in editor on click.
 * 
 * LAYOUT STABILITY:
 * - Uses stable width for name container
 * - Rename input overlays text without causing reflow
 * - No flex-shrink jumps during rename
 */

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit2, Trash2, Copy, ExternalLink, Link } from 'lucide-react';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';
import useUIStore from '../../store/uiStore';
import MethodBadge from '../../shared/components/MethodBadge';

function RequestItem({ request, collectionId, searchQuery = '' }) {
  const [menuState, setMenuState] = useState({ isOpen: false, x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(request.name);

  const inputRef = useRef(null);
  const menuButtonRef = useRef(null);

  const { updateRequest, duplicateRequest } = useCollectionsStore();
  const { openRequest, activeRequestId } = useRequestsStore();
  const { openDeleteConfirmModal } = useUIStore();

  const isActive = activeRequestId === request.id;

  // Sync rename value when request name changes externally
  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(request.name);
    }
  }, [request.name, isRenaming]);

  /**
   * Handle click - open request in editor
   */
  const handleClick = () => {
    openRequest(collectionId, request);
  };

  /**
   * Handle rename submit
   */
  const handleRename = async () => {
    const trimmedValue = renameValue.trim();
    if (trimmedValue && trimmedValue !== request.name) {
      await updateRequest(collectionId, request.id, { name: trimmedValue });
      useRequestsStore.getState().syncRequestMeta(request.id, { name: trimmedValue });
    } else {
      setRenameValue(request.name);
    }
    setIsRenaming(false);
  };

  /**
   * Start rename mode
   */
  const startRename = () => {
    setRenameValue(request.name);
    setIsRenaming(true);
    setMenuState({ isOpen: false, x: 0, y: 0 });
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  /**
   * Handle duplicate
   */
  const handleDuplicate = async () => {
    setMenuState({ isOpen: false, x: 0, y: 0 });
    await duplicateRequest(collectionId, request.id);
  };

  /**
   * Handle right click / context menu
   */
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 180;
    const menuHeight = 180;
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

  /**
   * Highlight search query in name
   */
  const highlightMatch = (text) => {
    if (!searchQuery) return text;

    try {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-accent-orange/30 text-text-primary">{part}</mark>
          : part
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none
        transition-colors group rounded-md
        ${isActive ? 'bg-surface-4' : 'hover:bg-surface-3'}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Method Badge */}
      <div className="flex-shrink-0">
        <MethodBadge method={request.method} size="sm" />
      </div>

      {/* Name Container */}
      <div className="flex-1 min-w-0 relative">
        <span
          className={`
            block text-sm text-text-secondary truncate
            ${isRenaming ? 'invisible' : 'visible'}
          `}
        >
          {highlightMatch(request.name)}
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
                setRenameValue(request.name);
                setIsRenaming(false);
              }
            }}
            className="absolute inset-0 w-full bg-surface-3 border border-accent-orange 
                       rounded px-1 text-sm text-text-primary focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

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
                setMenuState({ isOpen: false, x: 0, y: 0 });
                handleClick();
              }}
              className="w-full px-3 py-1.5 text-left text-text-secondary
                         hover:bg-surface-4 hover:text-text-primary
                         flex items-center gap-2 transition-colors"
            >
              <ExternalLink size={14} />
              Open Request
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
              Duplicate Request
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
            {request.url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(request.url);
                  setMenuState({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full px-3 py-1.5 text-left text-text-secondary
                           hover:bg-surface-4 hover:text-text-primary
                           flex items-center gap-2 transition-colors"
              >
                <Link size={14} />
                Copy URL
              </button>
            )}
            <div className="my-1 border-t border-border" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuState({ isOpen: false, x: 0, y: 0 });
                openDeleteConfirmModal('request', request.id, request.name, collectionId);
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
    </div>
  );
}
export default RequestItem;
