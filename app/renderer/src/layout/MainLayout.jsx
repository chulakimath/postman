/**
 * Main Layout Component
 * 
 * Three-panel resizable layout with full-width URL bar:
 * - Top: Full-width URL Bar
 * - Below split into:
 *   - Left: Collections Sidebar
 *   - Center: Request Body Editor (Tabs)
 *   - Right: Response Viewer
 * 
 * ARCHITECTURE:
 * - Uses requestsStore drafts as single source of truth
 * - Local state only for UI responsiveness (synced to draft)
 * - Auto-save with debounce and race condition prevention
 * - Method change NEVER resets other fields
 * 
 * Uses react-resizable-panels for smooth resizing.
 */

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Send } from 'lucide-react';
import CollectionsSidebar from '../features/collections/CollectionsSidebar';
import RequestTabs from '../features/requests/RequestTabs';
import UrlBar from '../features/requests/UrlBar';
import ResponseViewer from '../features/response/ResponseViewer';
import TabsBar from './TabsBar';
import useUIStore from '../store/uiStore';
import useCollectionsStore from '../store/collectionsStore';
import useRequestsStore from '../store/requestsStore';
import useResponseStore from '../store/responseStore';

// Debounce delay for autosave (ms)
const AUTOSAVE_DELAY = 400;

/**
 * Custom resize handle component
 */
const ResizeHandle = ({ className = '' }) => (
  <PanelResizeHandle 
    className={`
      w-1 bg-border hover:bg-accent-orange/50 
      transition-colors duration-150 cursor-col-resize
      active:bg-accent-orange
      ${className}
    `}
  />
);

function MainLayout() {
  const { isSidebarCollapsed, isResponsePanelCollapsed } = useUIStore();
  const { collections, updateRequest, addRequest } = useCollectionsStore();
  const { 
    activeRequestId, 
    activeCollectionId, 
    getDraft, 
    updateDraft, 
    clearDraft,
    openTabs,
    replaceRequestId,
    setSaving,
    isSaving,
    incrementSaveVersion,
    getSaveVersion,
    markClean,
  } = useRequestsStore();
  const { executeRequest, isLoading } = useResponseStore();
  
  // Local state for instant UI responsiveness
  // These sync FROM the draft, and changes are pushed TO the draft
  const [localMethod, setLocalMethod] = useState('GET');
  const [localUrl, setLocalUrl] = useState('');
  
  // Refs for autosave
  const saveTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastSavedVersionRef = useRef({});
  
  // Get draft (single source of truth for this request's state)
  const currentDraft = useMemo(() => {
    return getDraft(activeRequestId);
  }, [activeRequestId, getDraft]);
  
  // Get tab info
  const currentTab = useMemo(() => {
    return openTabs.find(t => t.requestId === activeRequestId);
  }, [openTabs, activeRequestId]);
  
  // Sync local state FROM draft when switching tabs or initial load
  useEffect(() => {
    if (currentDraft) {
      setLocalMethod(currentDraft.method || 'GET');
      setLocalUrl(currentDraft.url || '');
    } else if (currentTab) {
      // No draft but tab exists - use tab defaults
      setLocalMethod(currentTab.method || 'GET');
      setLocalUrl('');
    } else {
      // No tab selected
      setLocalMethod('GET');
      setLocalUrl('');
    }
  }, [activeRequestId]); // Only re-sync when request changes, not on every draft update
  
  // Build the current request object for display/send
  const currentRequest = useMemo(() => {
    if (!currentDraft) return null;
    
    // Always use local state for method/url for instant responsiveness
    return {
      ...currentDraft,
      method: localMethod,
      url: localUrl,
    };
  }, [currentDraft, localMethod, localUrl]);
  
  /**
   * Perform save with race condition prevention
   */
  const performSave = useCallback(async (requestId, collectionId, saveVersion) => {
    if (!isMountedRef.current) return;
    
    // Check if this save is still valid (not superseded by newer save)
    const currentVersion = getSaveVersion(requestId);
    if (saveVersion !== currentVersion) {
      return; // Newer save triggered, skip this one
    }
    
    // Check if already saving this exact version
    if (lastSavedVersionRef.current[requestId] === saveVersion) {
      return;
    }
    
    // Get the latest draft at save time
    const draftToSave = useRequestsStore.getState().getDraft(requestId);
    if (!draftToSave) return;
    
    // Check if it's a new request
    const tab = useRequestsStore.getState().openTabs.find(t => t.requestId === requestId);
    const isNew = tab?.isNew === true;
    
    // Mark as saving
    setSaving(requestId, true);
    lastSavedVersionRef.current[requestId] = saveVersion;
    
    try {
      if (isNew) {
        // New request - create it
        const { isNew: _, id: tempId, ...requestData } = draftToSave;
        const savedRequest = await addRequest(collectionId, requestData);
        
        if (savedRequest && isMountedRef.current) {
          // Replace the temporary ID with the real ID
          replaceRequestId(requestId, savedRequest.id, {
            name: savedRequest.name,
          });
          // Clear the old draft (new one was created with new ID)
          clearDraft(requestId);
          // Mark new request as clean
          useRequestsStore.getState().markClean(savedRequest.id);
        }
      } else {
        // Existing request - update it
        await updateRequest(collectionId, requestId, draftToSave);
        // Mark as clean after successful save
        if (isMountedRef.current) {
          markClean(requestId);
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      // Reset save tracking to allow retry
      delete lastSavedVersionRef.current[requestId];
    } finally {
      if (isMountedRef.current) {
        setSaving(requestId, false);
      }
    }
  }, [addRequest, updateRequest, clearDraft, replaceRequestId, setSaving, getSaveVersion, markClean]);
  
  /**
   * Schedule autosave with debounce
   * Uses version tracking to prevent race conditions
   */
  const scheduleAutosave = useCallback((requestId, collectionId) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Increment save version - this invalidates any pending saves
    const saveVersion = incrementSaveVersion(requestId);
    
    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      performSave(requestId, collectionId, saveVersion);
    }, AUTOSAVE_DELAY);
  }, [incrementSaveVersion, performSave]);
  
  /**
   * Handle method change - update local state AND draft
   * CRITICAL: Only updates method field, preserves everything else
   */
  const handleMethodChange = useCallback((method) => {
    if (!activeRequestId || !activeCollectionId) return;
    
    // Update local state immediately for responsiveness
    setLocalMethod(method);
    
    // Update draft (preserves all other fields)
    updateDraft(activeRequestId, { method });
    
    // Schedule autosave
    scheduleAutosave(activeRequestId, activeCollectionId);
  }, [activeRequestId, activeCollectionId, updateDraft, scheduleAutosave]);
  
  /**
   * Handle URL change - update local state AND draft
   */
  const handleUrlChange = useCallback((url) => {
    if (!activeRequestId || !activeCollectionId) return;
    
    // Update local state immediately for responsiveness
    setLocalUrl(url);
    
    // Update draft
    updateDraft(activeRequestId, { url });
    
    // Schedule autosave
    scheduleAutosave(activeRequestId, activeCollectionId);
  }, [activeRequestId, activeCollectionId, updateDraft, scheduleAutosave]);
  
  /**
   * Update other request fields (params, headers, body, auth)
   */
  const updateField = useCallback((field, value) => {
    if (!activeRequestId || !activeCollectionId) return;
    
    // Update draft
    updateDraft(activeRequestId, { [field]: value });
    
    // Schedule autosave
    scheduleAutosave(activeRequestId, activeCollectionId);
  }, [activeRequestId, activeCollectionId, updateDraft, scheduleAutosave]);
  
  /**
   * Handle send request
   */
  const handleSend = useCallback(async () => {
    if (!localUrl?.trim() || !currentRequest) return;
    
    // Flush any pending autosave first
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      
      // Do an immediate save before sending
      if (activeRequestId && activeCollectionId) {
        const saveVersion = getSaveVersion(activeRequestId);
        await performSave(activeRequestId, activeCollectionId, saveVersion);
      }
    }
    
    // Execute the request with current state
    await executeRequest(currentRequest);
  }, [currentRequest, localUrl, activeRequestId, activeCollectionId, executeRequest, getSaveVersion, performSave]);
  
  // Flush pending saves when switching tabs
  const prevRequestIdRef = useRef(activeRequestId);
  const prevCollectionIdRef = useRef(activeCollectionId);
  
  useEffect(() => {
    const prevReqId = prevRequestIdRef.current;
    const prevColId = prevCollectionIdRef.current;
    
    // If switching to a different request, flush any pending save for the previous one
    if (prevReqId && prevReqId !== activeRequestId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Immediately save the previous request's draft
      if (prevColId) {
        const saveVersion = getSaveVersion(prevReqId);
        performSave(prevReqId, prevColId, saveVersion);
      }
    }
    
    prevRequestIdRef.current = activeRequestId;
    prevCollectionIdRef.current = activeCollectionId;
  }, [activeRequestId, activeCollectionId, getSaveVersion, performSave]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar (shows open request tabs) */}
      <TabsBar />
      
      {/* URL Bar - Full Width */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-surface-1">
        {currentRequest ? (
          <UrlBar
            method={localMethod}
            url={localUrl}
            onMethodChange={handleMethodChange}
            onUrlChange={handleUrlChange}
            onSend={handleSend}
            isLoading={isLoading}
          />
        ) : (
          <div className="flex items-center gap-2 h-[42px] text-text-muted text-sm">
            Select a request to start editing
          </div>
        )}
      </div>
      
      {/* Main Content Area - Body and Response split */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Collections Sidebar */}
          {!isSidebarCollapsed && (
            <>
              <Panel 
                defaultSize={20} 
                minSize={15} 
                maxSize={30}
                className="bg-surface-2"
              >
                <CollectionsSidebar />
              </Panel>
              
              <ResizeHandle />
            </>
          )}
          
          {/* Request Body Editor */}
          <Panel 
            defaultSize={isResponsePanelCollapsed ? 80 : 40} 
            minSize={30}
            className="bg-surface-1"
          >
            {currentRequest ? (
              <div className="flex flex-col h-full overflow-hidden">
                <RequestTabs
                  request={currentRequest}
                  onUpdate={updateField}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-3 
                                  flex items-center justify-center">
                    <Send size={28} className="text-text-muted" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    Select a Request
                  </h3>
                  <p className="text-text-muted text-sm max-w-xs">
                    Choose a request from the sidebar or create a new one to start editing
                  </p>
                </div>
              </div>
            )}
          </Panel>
          
          {/* Response Viewer */}
          {!isResponsePanelCollapsed && (
            <>
              <ResizeHandle />
              
              <Panel 
                defaultSize={40} 
                minSize={25}
                className="bg-surface-2"
              >
                <ResponseViewer />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}

export default MainLayout;
