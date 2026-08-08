/**
 * Tabs Bar Component
 * 
 * Displays open request tabs at the top of the editor area.
 * Features:
 * - Shows method badge + request name
 * - Close button on each tab (plus middle click to close)
 * - Unsaved indicator dot (shows when changes are pending)
 * - Saving spinner (shows during save operation)
 * - Click to switch tabs
 * - Smooth horizontal scroll on mouse wheel / trackpad
 * - Right click context menu with options:
 *   - Close
 *   - Close Others
 *   - Close to Right
 *   - Close to Left
 *   - Close Saved (Unmodified)
 *   - Close All
 *   - Duplicate Tab
 *   - Copy URL
 */

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Loader2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Copy,
  FileCheck,
  Link,
  Edit2,
} from 'lucide-react';
import useRequestsStore from '../store/requestsStore';
import useCollectionsStore from '../store/collectionsStore';
import MethodBadge from '../shared/components/MethodBadge';

function TabsBar() {
  const {
    openTabs,
    activeRequestId,
    setActiveTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeTabsToLeft,
    closeAllTabs,
    closeSavedTabs,
    hasDraft,
    isSaving,
    getDraft,
    updateDraft,
  } = useRequestsStore();

  const { duplicateRequest, updateRequest } = useCollectionsStore();

  // State for tab right-click context menu
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    tab: null,
  });

  // State for inline tab renaming
  const [renamingTabId, setRenamingTabId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);
  const renameInputRef = useRef(null);

  // Auto-scroll active tab into view when activeRequestId changes
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeRequestId]);

  // Handle horizontal scrolling on mouse wheel
  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      if (e.deltaY !== 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Open custom context menu on right click
  const handleContextMenu = (e, tab) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = 320;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({
      isOpen: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      tab,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, tab: null });
  };

  // Start inline rename mode
  const startRename = (tab) => {
    const draft = getDraft(tab.requestId);
    const currentName = draft?.name || 'Unknown Request';
    setRenameValue(currentName);
    setRenamingTabId(tab.requestId);
    closeContextMenu();
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  };

  // Submit rename
  const handleRenameSubmit = async (tab) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      const isCurrentlyDirty = hasDraft(tab.requestId);
      if (tab.collectionId && !tab.isNew) {
        await updateRequest(tab.collectionId, tab.requestId, { name: trimmed });
        useRequestsStore.getState().syncRequestMeta(tab.requestId, { name: trimmed });
        if (!isCurrentlyDirty) {
          useRequestsStore.getState().markClean(tab.requestId);
        }
      } else {
        updateDraft(tab.requestId, { name: trimmed });
      }
    }
    setRenamingTabId(null);
  };

  // Handle middle click to close tab
  const handleMouseDown = (e, tab) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tab.requestId);
    }
  };

  // Don't render empty bar if no tabs open
  if (openTabs.length === 0) {
    return (
      <div className="h-10 bg-surface-2 border-b border-border flex items-center px-4 select-none">
        <span className="text-text-muted text-sm">
          No requests open — Select a request from the sidebar or create a new one
        </span>
      </div>
    );
  }

  // Calculate indices for disabled states in context menu
  const targetTabIndex = contextMenu.tab
    ? openTabs.findIndex(t => t.requestId === contextMenu.tab.requestId)
    : -1;
  const hasTabsToRight = targetTabIndex >= 0 && targetTabIndex < openTabs.length - 1;
  const hasTabsToLeft = targetTabIndex > 0;
  const hasOtherTabs = openTabs.length > 1;

  return (
    <div className="relative h-10 bg-surface-2 border-b border-border flex items-center select-none overflow-hidden">
      {/* Horizontal Scrollable Tabs Container */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex items-center h-full overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-surface-4 scrollbar-track-transparent scroll-smooth"
        style={{ scrollbarWidth: 'thin' }}
      >
        {openTabs.map((tab) => {
          const draft = getDraft(tab.requestId);
          const tabName = draft?.name || 'Unknown Request';
          const tabMethod = draft?.method || 'GET';

          const isActive = tab.requestId === activeRequestId;
          const hasUnsavedChanges = hasDraft(tab.requestId);
          const currentlySaving = isSaving(tab.requestId);
          const isRenaming = renamingTabId === tab.requestId;

          return (
            <div
              key={tab.requestId}
              ref={isActive ? activeTabRef : null}
              onClick={() => setActiveTab(tab.requestId, tab.collectionId)}
              onMouseDown={(e) => handleMouseDown(e, tab)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(tab);
              }}
              className={`
                group flex items-center gap-2 px-3.5 h-full border-r border-border
                cursor-pointer transition-colors min-w-[140px] max-w-[200px] flex-shrink-0 relative
                ${isActive
                  ? 'bg-surface-1 border-b-2 border-b-accent-orange text-text-primary'
                  : 'bg-surface-2 hover:bg-surface-3 text-text-secondary'
                }
              `}
            >
              {/* Method Badge */}
              <MethodBadge method={tabMethod} size="sm" />

              {/* Request Name or Inline Rename Input */}
              <div className="flex-1 min-w-0 relative">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(tab)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRenameSubmit(tab);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setRenamingTabId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-surface-3 border border-accent-orange rounded px-1 text-sm text-text-primary focus:outline-none"
                  />
                ) : (
                  <span className={`
                    block truncate text-sm font-medium
                    ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}
                  `}>
                    {tabName}
                    {tab.isNew && <span className="text-text-muted ml-1 text-xs font-normal">(new)</span>}
                  </span>
                )}
              </div>

              {/* Status Indicator (Spinner or Unsaved Dot) */}
              {currentlySaving ? (
                <Loader2 size={12} className="animate-spin text-accent-orange flex-shrink-0" />
              ) : hasUnsavedChanges ? (
                <span
                  className="w-2 h-2 rounded-full bg-accent-orange flex-shrink-0"
                  title="Unsaved changes"
                />
              ) : null}

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.requestId);
                }}
                title="Close tab (Middle click)"
                className={`
                  p-0.5 rounded hover:bg-surface-4 transition-colors flex-shrink-0
                  ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
              >
                <X size={14} className="text-text-muted hover:text-text-primary" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu.isOpen && contextMenu.tab && (
        <>
          {/* Menu Backdrop */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={closeContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeContextMenu();
            }}
          />

          {/* Context Menu Dropdown */}
          <div
            className="fixed z-[101] w-52 py-1.5 bg-surface-3 border border-border rounded-lg shadow-2xl animate-fade-in text-sm"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
          >
            {/* Rename */}
            <button
              onClick={() => startRename(contextMenu.tab)}
              className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 hover:text-accent-orange flex items-center gap-2 transition-colors"
            >
              <Edit2 size={14} className="text-text-muted" />
              <span>Rename</span>
            </button>

            {/* Duplicate Tab */}
            {contextMenu.tab.collectionId && (
              <button
                onClick={() => {
                  duplicateRequest(contextMenu.tab.collectionId, contextMenu.tab.requestId);
                  closeContextMenu();
                }}
                className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 hover:text-accent-orange flex items-center gap-2 transition-colors"
              >
                <Copy size={14} className="text-text-muted" />
                <span>Duplicate Request</span>
              </button>
            )}

            <div className="my-1 border-t border-border" />

            {/* Close */}
            <button
              onClick={() => {
                closeTab(contextMenu.tab.requestId);
                closeContextMenu();
              }}
              className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 hover:text-accent-orange flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <X size={14} className="text-text-muted" />
                <span>Close</span>
              </div>
            </button>

            {/* Close Others */}
            <button
              disabled={!hasOtherTabs}
              onClick={() => {
                closeOtherTabs(contextMenu.tab.requestId);
                closeContextMenu();
              }}
              className={`
                w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors
                ${hasOtherTabs
                  ? 'text-text-primary hover:bg-surface-4 hover:text-accent-orange'
                  : 'text-text-muted/40 cursor-not-allowed'
                }
              `}
            >
              <XCircle size={14} className={hasOtherTabs ? 'text-text-muted' : 'text-text-muted/40'} />
              <span>Close Others</span>
            </button>

            {/* Close to Right */}
            <button
              disabled={!hasTabsToRight}
              onClick={() => {
                closeTabsToRight(contextMenu.tab.requestId);
                closeContextMenu();
              }}
              className={`
                w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors
                ${hasTabsToRight
                  ? 'text-text-primary hover:bg-surface-4 hover:text-accent-orange'
                  : 'text-text-muted/40 cursor-not-allowed'
                }
              `}
            >
              <ArrowRight size={14} className={hasTabsToRight ? 'text-text-muted' : 'text-text-muted/40'} />
              <span>Close to the Right</span>
            </button>

            {/* Close to Left */}
            <button
              disabled={!hasTabsToLeft}
              onClick={() => {
                closeTabsToLeft(contextMenu.tab.requestId);
                closeContextMenu();
              }}
              className={`
                w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors
                ${hasTabsToLeft
                  ? 'text-text-primary hover:bg-surface-4 hover:text-accent-orange'
                  : 'text-text-muted/40 cursor-not-allowed'
                }
              `}
            >
              <ArrowLeft size={14} className={hasTabsToLeft ? 'text-text-muted' : 'text-text-muted/40'} />
              <span>Close to the Left</span>
            </button>

            <div className="my-1 border-t border-border" />

            {/* Close Saved */}
            <button
              onClick={() => {
                closeSavedTabs();
                closeContextMenu();
              }}
              className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 hover:text-accent-orange flex items-center gap-2 transition-colors"
            >
              <FileCheck size={14} className="text-text-muted" />
              <span>Close Saved</span>
            </button>

            {/* Close All */}
            <button
              onClick={() => {
                closeAllTabs();
                closeContextMenu();
              }}
              className="w-full px-3 py-1.5 text-left text-accent-red hover:bg-accent-red/10 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} className="text-accent-red" />
              <span>Close All</span>
            </button>

            <div className="my-1 border-t border-border" />

            {/* Copy URL */}
            <button
              onClick={() => {
                const draft = getDraft(contextMenu.tab.requestId);
                if (draft?.url) {
                  navigator.clipboard.writeText(draft.url);
                }
                closeContextMenu();
              }}
              className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 hover:text-accent-orange flex items-center gap-2 transition-colors"
            >
              <Link size={14} className="text-text-muted" />
              <span>Copy URL</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TabsBar;

