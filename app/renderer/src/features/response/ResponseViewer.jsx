/**
 * Response Viewer Component
 * 
 * Displays API response with:
 * - Status code badge
 * - Response time and size
 * - Tabs for Body, Headers, Cookies
 * - Pretty JSON formatting
 */

import { useState } from 'react';
import useResponseStore from '../../store/responseStore';
import Tabs from '../../shared/components/Tabs';
import ResponseStatus from './ResponseStatus';
import JsonViewer from './JsonViewer';
import { FileJson, FileText, Cookie, Clock, Scale, Download } from 'lucide-react';

function ResponseViewer() {
  const { getCurrentResponse, isLoading, error } = useResponseStore();
  const currentResponse = getCurrentResponse();
  const [activeTab, setActiveTab] = useState('body');
  
  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-accent-orange border-t-transparent 
                          rounded-full mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Sending request...</p>
        </div>
      </div>
    );
  }
  
  // Error state (network error, no response)
  if (error && !currentResponse) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-red/10 
                          flex items-center justify-center">
            <span className="text-accent-red text-xl">!</span>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Request Failed
          </h3>
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (!currentResponse) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-3 
                          flex items-center justify-center">
            <FileJson size={28} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Response
          </h3>
          <p className="text-text-muted text-sm">
            Send a request to see the response here
          </p>
        </div>
      </div>
    );
  }
  
  // Format headers for display
  const responseHeaders = currentResponse.headers 
    ? Object.entries(currentResponse.headers).map(([key, value]) => ({ key, value }))
    : [];
  
  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <ResponseStatus 
            status={currentResponse.status}
            statusText={currentResponse.statusText}
          />
          
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            {/* Response Time */}
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{currentResponse.time || 0} ms</span>
            </div>
            
            {/* Response Size */}
            <div className="flex items-center gap-1.5">
              <Scale size={14} />
              <span>{formatBytes(currentResponse.size || 0)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <Tabs.List className="flex-shrink-0 px-4">
          <Tabs.Trigger value="body">
            <span className="flex items-center gap-1.5">
              <FileJson size={14} />
              Body
            </span>
          </Tabs.Trigger>
          <Tabs.Trigger value="headers">
            <span className="flex items-center gap-1.5">
              <FileText size={14} />
              Headers
              {responseHeaders.length > 0 && (
                <span className="px-1.5 py-0.5 text-2xs bg-surface-3 rounded-full">
                  {responseHeaders.length}
                </span>
              )}
            </span>
          </Tabs.Trigger>
        </Tabs.List>
        
        <div className="flex-1 overflow-auto p-4">
          <Tabs.Content value="body">
            <BodyTab data={currentResponse.data} />
          </Tabs.Content>
          
          <Tabs.Content value="headers">
            <HeadersTab headers={responseHeaders} />
          </Tabs.Content>
        </div>
      </Tabs>
    </div>
  );
}

/**
 * Body Tab Content
 */
function BodyTab({ data }) {
  if (data === null || data === undefined) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        No response body
      </div>
    );
  }
  
  // If it's an object/array, use JsonViewer
  if (typeof data === 'object') {
    return <JsonViewer data={data} />;
  }
  
  // For strings, try to parse as JSON first
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return <JsonViewer data={parsed} />;
    } catch {
      // Not JSON, display as raw text
      return (
        <pre className="p-4 bg-surface-3 rounded-md text-sm text-text-primary 
                        font-mono whitespace-pre-wrap overflow-auto">
          {data}
        </pre>
      );
    }
  }
  
  // Fallback
  return (
    <pre className="p-4 bg-surface-3 rounded-md text-sm text-text-primary 
                    font-mono whitespace-pre-wrap overflow-auto">
      {String(data)}
    </pre>
  );
}

/**
 * Headers Tab Content
 */
function HeadersTab({ headers }) {
  if (!headers || headers.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        No response headers
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {headers.map(({ key, value }, index) => (
        <div 
          key={index}
          className="flex items-start gap-4 py-2 border-b border-border last:border-0"
        >
          <span className="font-mono text-sm text-accent-orange min-w-[150px]">
            {key}
          </span>
          <span className="font-mono text-sm text-text-secondary break-all">
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default ResponseViewer;
