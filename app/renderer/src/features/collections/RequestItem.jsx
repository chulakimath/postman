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
import { MoreHorizontal, Edit2, Trash2, Copy } from 'lucide-react';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';
import useUIStore from '../../store/uiStore';
import MethodBadge from '../../shared/components/MethodBadge';

function RequestItem({ request, collectionId, searchQuery = '' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(request.name);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const inputRef = useRef(null);
  const menuButtonRef = useRef(null);

  const { updateRequest, duplicateRequest } = useCollectionsStore();
  const { openRequest, activeRequestId, updateTabInfo } = useRequestsStore();
  const { openDeleteConfirmModal } = useUIStore();

  const isActive = activeRequestId === request.id;

  // Sync rename value when request name changes externally
  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(request.name);
    }
  }, [request.name, isRenaming]);

  // Calculate menu position when opening
  useEffect(() => {
    if (isMenuOpen && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(rect.left - 100, 10), // Position to the left, ensure not off-screen
      });
    }
  }, [isMenuOpen]);

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
    setIsMenuOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  /**
   * Handle duplicate
   */
  const handleDuplicate = async () => {
    setIsMenuOpen(false);
    await duplicateRequest(collectionId, request.id);
  };

  /**
   * Highlight search query in name
   */
  const highlightMatch = (text) => {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-accent-orange/30 text-text-primary">{part}</mark>
        : part
    );
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 cursor-pointer
        transition-colors group
        ${isActive ? 'bg-surface-4' : 'hover:bg-surface-3'}
      `}
      onClick={handleClick}
    >
      {/* Method Badge */}
      <div className="flex-shrink-0">
        <MethodBadge method={request.method} size="sm" />
      </div>

      {/* Name Container - Fixed structure to prevent layout shift */}
      <div className="flex-1 min-w-0 relative">
        {/* Always render the text span to maintain layout */}
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

        {/* Dropdown Menu - Using fixed position to avoid overflow issues */}
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

            <div
              className="fixed z-[101] w-40 py-1 bg-surface-3 border border-border rounded-md shadow-xl animate-fade-in"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename();
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-secondary
                           hover:bg-surface-4 hover:text-text-primary
                           flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate();
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-secondary
                           hover:bg-surface-4 hover:text-text-primary
                           flex items-center gap-2 transition-colors"
              >
                <Copy size={14} />
                Duplicate
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  openDeleteConfirmModal('request', request.id, request.name, collectionId);
                }}
                className="w-full px-3 py-2 text-left text-sm text-accent-red
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
    </div>
  );
}

export default RequestItem;
