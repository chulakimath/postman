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
const AUTOSAVE_DELAY = 800;

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
    updateTabInfo,
  } = useRequestsStore();
  const { executeRequest, isLoading } = useResponseStore();
  
  // Get the base request (original from collection)
  const baseRequest = useMemo(() => {
    const collection = collections.find(c => c.id === activeCollectionId);
    return collection?.requests?.find(r => r.id === activeRequestId) || null;
  }, [activeRequestId, activeCollectionId, collections]);
  
  // Get draft if exists
  const draft = useMemo(() => getDraft(activeRequestId), [activeRequestId, getDraft]);
  
  // Local state for method and URL for instant responsiveness
  const [localMethod, setLocalMethod] = useState('GET');
  const [localUrl, setLocalUrl] = useState('');
  
  // Refs for timeouts
  const saveTimeoutRef = useRef(null);
  const savedNewRequestRef = useRef(new Set());
  
  // Sync local state when request changes (switching tabs)
  useEffect(() => {
    const request = draft || baseRequest;
    if (request) {
      setLocalMethod(request.method || 'GET');
      setLocalUrl(request.url || '');
    } else {
      setLocalMethod('GET');
      setLocalUrl('');
    }
  }, [activeRequestId]);
  
  // Get the full current request for display
  const currentRequest = useMemo(() => {
    if (draft) return { ...draft, method: localMethod, url: localUrl };
    if (baseRequest) return { ...baseRequest, method: localMethod, url: localUrl };
    
    // Check if it's a new request
    const tab = openTabs.find(t => t.requestId === activeRequestId);
    if (tab?.isNew) {
      return {
        id: activeRequestId,
        name: 'New Request',
        method: localMethod,
        url: localUrl,
        headers: [],
        params: [],
        body: { type: 'none', content: '' },
        auth: { type: 'none', data: {} },
        isNew: true,
      };
    }
    
    return null;
  }, [activeRequestId, baseRequest, draft, localMethod, localUrl, openTabs]);
  
  /**
   * Perform save immediately (no debounce)
   */
  const performSave = useCallback(async (requestId, collectionId) => {
    const currentDraft = useRequestsStore.getState().getDraft(requestId);
    if (!currentDraft) return;
    
    const tab = useRequestsStore.getState().openTabs.find(t => t.requestId === requestId);
    
    if (tab?.isNew && !savedNewRequestRef.current.has(requestId)) {
      savedNewRequestRef.current.add(requestId);
      
      const { isNew, id, ...requestData } = currentDraft;
      const savedRequest = await addRequest(collectionId, requestData);
      
      if (savedRequest) {
        updateTabInfo(requestId, { 
          requestId: savedRequest.id, 
          isNew: false,
          name: savedRequest.name,
        });
        clearDraft(requestId);
        savedNewRequestRef.current.delete(requestId);
      } else {
        savedNewRequestRef.current.delete(requestId);
      }
    } else if (!tab?.isNew) {
      await updateRequest(collectionId, requestId, currentDraft);
      clearDraft(requestId);
    }
  }, [addRequest, updateRequest, clearDraft, updateTabInfo]);
  
  /**
   * Trigger autosave with current values
   */
  const triggerAutosave = useCallback((updates = {}) => {
    if (!activeRequestId || !activeCollectionId) return;
    
    updateDraft(activeRequestId, updates);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const reqId = activeRequestId;
    const colId = activeCollectionId;
    
    saveTimeoutRef.current = setTimeout(async () => {
      await performSave(reqId, colId);
    }, AUTOSAVE_DELAY);
  }, [activeRequestId, activeCollectionId, updateDraft, performSave]);
  
  /**
   * Handle method change
   */
  const handleMethodChange = useCallback((method) => {
    setLocalMethod(method);
    triggerAutosave({ method });
  }, [triggerAutosave]);
  
  /**
   * Handle URL change
   */
  const handleUrlChange = useCallback((url) => {
    setLocalUrl(url);
    triggerAutosave({ url });
  }, [triggerAutosave]);
  
  /**
   * Update other request fields
   */
  const updateField = useCallback((field, value) => {
    triggerAutosave({ [field]: value });
  }, [triggerAutosave]);
  
  /**
   * Handle send request
   */
  const handleSend = useCallback(async () => {
    if (!localUrl?.trim()) return;
    
    const requestToSend = {
      ...currentRequest,
      method: localMethod,
      url: localUrl,
    };
    
    await executeRequest(requestToSend);
  }, [currentRequest, localMethod, localUrl, executeRequest]);
  
  // Track previous request ID for flushing saves
  const prevRequestIdRef = useRef(activeRequestId);
  
  // Flush pending saves when switching tabs
  useEffect(() => {
    const prevReqId = prevRequestIdRef.current;
    const prevColId = activeCollectionId;
    
    if (prevReqId && prevReqId !== activeRequestId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      performSave(prevReqId, prevColId);
    }
    
    prevRequestIdRef.current = activeRequestId;
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeRequestId, activeCollectionId, performSave]);
  
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

