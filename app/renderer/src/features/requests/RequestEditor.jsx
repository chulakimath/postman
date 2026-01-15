/**
 * Request Editor Component
 * 
 * Main editing panel for API requests.
 * Contains:
 * - URL bar with method selector
 * - Tabs for Params, Headers, Body, Auth
 * - Tab content editors
 * 
 * OPTIMIZED: Uses local state for URL and method for instant responsiveness.
 * Changes are debounced before saving.
 */

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Send } from 'lucide-react';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';
import useResponseStore from '../../store/responseStore';
import UrlBar from './UrlBar';
import RequestTabs from './RequestTabs';

// Debounce delay for autosave (ms)
const AUTOSAVE_DELAY = 800;

function RequestEditor() {
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
    }
  }, [activeRequestId]); // Only sync when request ID changes, not on every draft change
  
  // Get the full current request for display (excluding method/url which are local)
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
  
  // Check if current request is new (unsaved)
  const isNewRequest = useMemo(() => {
    const tab = openTabs.find(t => t.requestId === activeRequestId);
    return tab?.isNew === true;
  }, [openTabs, activeRequestId]);
  
  /**
   * Perform save immediately (no debounce)
   */
  const performSave = useCallback(async (requestId, collectionId) => {
    const currentDraft = useRequestsStore.getState().getDraft(requestId);
    if (!currentDraft) return;
    
    const tab = useRequestsStore.getState().openTabs.find(t => t.requestId === requestId);
    
    if (tab?.isNew && !savedNewRequestRef.current.has(requestId)) {
      // This is a new request that hasn't been saved yet
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
        // Save failed, allow retry
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
    
    // Update draft with the changes
    updateDraft(activeRequestId, updates);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Capture current values for timeout closure
    const reqId = activeRequestId;
    const colId = activeCollectionId;
    
    // Set new autosave timeout
    saveTimeoutRef.current = setTimeout(async () => {
      await performSave(reqId, colId);
    }, AUTOSAVE_DELAY);
  }, [activeRequestId, activeCollectionId, updateDraft, performSave]);
  
  /**
   * Handle method change - update local state immediately
   */
  const handleMethodChange = useCallback((method) => {
    setLocalMethod(method);
    triggerAutosave({ method });
  }, [triggerAutosave]);
  
  /**
   * Handle URL change - update local state immediately
   */
  const handleUrlChange = useCallback((url) => {
    setLocalUrl(url);
    triggerAutosave({ url });
  }, [triggerAutosave]);
  
  /**
   * Update other request fields (params, headers, body, auth)
   */
  const updateField = useCallback((field, value) => {
    triggerAutosave({ [field]: value });
  }, [triggerAutosave]);
  
  /**
   * Handle send request
   */
  const handleSend = useCallback(async () => {
    if (!localUrl?.trim()) return;
    
    // Create the request object with current local state
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
    const prevColId = activeCollectionId; // Use current collection as approximation
    
    // If switching to a different request, flush any pending save for the previous one
    if (prevReqId && prevReqId !== activeRequestId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Immediately save the previous request's draft if it exists
      performSave(prevReqId, prevColId);
    }
    
    prevRequestIdRef.current = activeRequestId;
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeRequestId, activeCollectionId, performSave]);
  
  // Empty state - no request selected
  if (!currentRequest) {
    return (
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
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* URL Bar - Uses local state for method and URL */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <UrlBar
          method={localMethod}
          url={localUrl}
          onMethodChange={handleMethodChange}
          onUrlChange={handleUrlChange}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </div>
      
      {/* Request Tabs */}
      <div className="flex-1 overflow-hidden">
        <RequestTabs
          request={currentRequest}
          onUpdate={updateField}
        />
      </div>
    </div>
  );
}

export default memo(RequestEditor);
