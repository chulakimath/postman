/**
 * Tabs Bar Component
 * 
 * Displays open request tabs at the top of the editor area.
 * Features:
 * - Shows method badge + request name
 * - Close button on each tab
 * - Unsaved indicator dot (shows when changes are pending)
 * - Saving spinner (shows during save operation)
 * - Click to switch tabs
 * 
 * BEHAVIOR:
 * - Dot appears when changes are made (dirty state)
 * - Spinner appears when save is in progress
 * - Dot disappears after successful save
 * - Dot reappears if more changes are made
 */

import { X, Loader2 } from 'lucide-react';
import useRequestsStore from '../store/requestsStore';
import MethodBadge from '../shared/components/MethodBadge';

function TabsBar() {
  const {
    openTabs,
    activeRequestId,
    setActiveTab,
    closeTab,
    hasDraft,
    isSaving,
    getDraft,
  } = useRequestsStore();

  // Don't render if no tabs
  if (openTabs.length === 0) {
    return (
      <div className="h-10 bg-surface-2 border-b border-border flex items-center px-4">
        <span className="text-text-muted text-sm">
          No requests open — Select a request from the sidebar or create a new one
        </span>
      </div>
    );
  }

  return (
    <div className="h-10 bg-surface-2 border-b border-border flex items-center overflow-x-auto scrollbar-hide">
      {openTabs.map((tab) => {
        const draft = getDraft(tab.requestId);
        const tabName = draft?.name || 'Unknown Request';
        const tabMethod = draft?.method || 'GET';

        const isActive = tab.requestId === activeRequestId;
        const hasUnsavedChanges = hasDraft(tab.requestId);
        const currentlySaving = isSaving(tab.requestId);

        return (
          <div
            key={tab.requestId}
            onClick={() => setActiveTab(tab.requestId, tab.collectionId)}
            className={`
              group flex items-center gap-2 px-4 h-full border-r border-border
              cursor-pointer transition-colors min-w-[140px] max-w-[200px]
              ${isActive
                ? 'bg-surface-1 border-b-2 border-b-accent-orange'
                : 'bg-surface-2 hover:bg-surface-3'
              }
            `}
          >
            {/* Method Badge */}
            <MethodBadge method={tabMethod} size="sm" />

            {/* Request Name */}
            <span className={`
              flex-1 truncate text-sm
              ${isActive ? 'text-text-primary' : 'text-text-secondary'}
            `}>
              {tabName}
              {tab.isNew && <span className="text-text-muted ml-1">(new)</span>}
            </span>

            {/* Status Indicator */}
            {currentlySaving ? (
              // Saving spinner
              <Loader2 size={12} className="animate-spin text-accent-orange flex-shrink-0" />
            ) : hasUnsavedChanges ? (
              // Unsaved changes dot
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
  );
}

export default TabsBar;
