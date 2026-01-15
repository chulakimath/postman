/**
 * Request Tabs Component
 * 
 * Tab navigation for request editing:
 * - Params (query parameters)
 * - Headers
 * - Body (JSON, FormData, Raw)
 * - Auth (Bearer, Basic, API Key)
 * 
 * OPTIMIZED: Uses local state and debounced updates to prevent lag
 */

import { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import Tabs from '../../shared/components/Tabs';
import ParamsEditor from './ParamsEditor';
import HeadersEditor from './HeadersEditor';
import BodyEditor from './BodyEditor';
import AuthEditor from './AuthEditor';

// Debounce delay for parent updates
const UPDATE_DELAY = 300;

/**
 * Memoized Tab Label
 */
const TabLabel = memo(function TabLabel({ label, count = 0, active = false }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      {count > 0 && (
        <span className="px-1.5 py-0.5 text-2xs bg-accent-orange/20 text-accent-orange rounded-full">
          {count}
        </span>
      )}
      {active && count === 0 && (
        <span className="w-1.5 h-1.5 bg-accent-orange rounded-full" />
      )}
    </span>
  );
});

function RequestTabs({ request, onUpdate }) {
  const [activeTab, setActiveTab] = useState('params');
  
  // Local state for immediate responsiveness
  const [localParams, setLocalParams] = useState(request.params || []);
  const [localHeaders, setLocalHeaders] = useState(request.headers || []);
  const [localBody, setLocalBody] = useState(request.body || { type: 'none', content: '' });
  const [localAuth, setLocalAuth] = useState(request.auth || { type: 'none', data: {} });
  
  // Refs for debounce timeouts
  const paramsTimeoutRef = useRef(null);
  const headersTimeoutRef = useRef(null);
  const bodyTimeoutRef = useRef(null);
  const authTimeoutRef = useRef(null);
  
  // Sync local state when request changes (e.g., switching tabs)
  useEffect(() => {
    setLocalParams(request.params || []);
    setLocalHeaders(request.headers || []);
    setLocalBody(request.body || { type: 'none', content: '' });
    setLocalAuth(request.auth || { type: 'none', data: {} });
  }, [request.id]); // Only when request ID changes
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (paramsTimeoutRef.current) clearTimeout(paramsTimeoutRef.current);
      if (headersTimeoutRef.current) clearTimeout(headersTimeoutRef.current);
      if (bodyTimeoutRef.current) clearTimeout(bodyTimeoutRef.current);
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);
  
  // Debounced update handlers
  const handleParamsChange = useCallback((params) => {
    setLocalParams(params);
    if (paramsTimeoutRef.current) clearTimeout(paramsTimeoutRef.current);
    paramsTimeoutRef.current = setTimeout(() => {
      onUpdate('params', params);
    }, UPDATE_DELAY);
  }, [onUpdate]);
  
  const handleHeadersChange = useCallback((headers) => {
    setLocalHeaders(headers);
    if (headersTimeoutRef.current) clearTimeout(headersTimeoutRef.current);
    headersTimeoutRef.current = setTimeout(() => {
      onUpdate('headers', headers);
    }, UPDATE_DELAY);
  }, [onUpdate]);
  
  const handleBodyChange = useCallback((body) => {
    setLocalBody(body);
    if (bodyTimeoutRef.current) clearTimeout(bodyTimeoutRef.current);
    bodyTimeoutRef.current = setTimeout(() => {
      onUpdate('body', body);
    }, UPDATE_DELAY);
  }, [onUpdate]);
  
  const handleAuthChange = useCallback((auth) => {
    setLocalAuth(auth);
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      onUpdate('auth', auth);
    }, UPDATE_DELAY);
  }, [onUpdate]);
  
  // Calculate counts for tab badges (use local state for responsiveness)
  const paramsCount = useMemo(() => 
    localParams.filter(p => p.enabled !== false && p.key)?.length || 0,
    [localParams]
  );
  
  const headersCount = useMemo(() => 
    localHeaders.filter(h => h.enabled !== false && h.key)?.length || 0,
    [localHeaders]
  );
  
  const hasBody = localBody?.type !== 'none' && localBody?.content;
  const hasAuth = localAuth?.type !== 'none';
  
  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onChange={setActiveTab} className="flex flex-col h-full">
        {/* Tab List */}
        <Tabs.List className="flex-shrink-0 px-4">
          <Tabs.Trigger value="params">
            <TabLabel label="Params" count={paramsCount} />
          </Tabs.Trigger>
          <Tabs.Trigger value="headers">
            <TabLabel label="Headers" count={headersCount} />
          </Tabs.Trigger>
          <Tabs.Trigger value="body">
            <TabLabel label="Body" active={hasBody} />
          </Tabs.Trigger>
          <Tabs.Trigger value="auth">
            <TabLabel label="Auth" active={hasAuth} />
          </Tabs.Trigger>
        </Tabs.List>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs.Content value="params">
            <ParamsEditor
              params={localParams}
              onChange={handleParamsChange}
            />
          </Tabs.Content>
          
          <Tabs.Content value="headers">
            <HeadersEditor
              headers={localHeaders}
              onChange={handleHeadersChange}
            />
          </Tabs.Content>
          
          <Tabs.Content value="body">
            <BodyEditor
              body={localBody}
              onChange={handleBodyChange}
              method={request.method}
            />
          </Tabs.Content>
          
          <Tabs.Content value="auth">
            <AuthEditor
              auth={localAuth}
              onChange={handleAuthChange}
            />
          </Tabs.Content>
        </div>
      </Tabs>
    </div>
  );
}

export default memo(RequestTabs);
