/**
 * Request Editor Component
 * 
 * DEPRECATED: This component is no longer used directly.
 * MainLayout now handles the request editing state management.
 * 
 * This file is kept for potential future use as a standalone editor.
 * It delegates all state management to the parent component.
 */

import { memo } from 'react';
import { Send } from 'lucide-react';
import UrlBar from './UrlBar';
import RequestTabs from './RequestTabs';

/**
 * RequestEditor - Pure presentational component
 * 
 * Props:
 * - request: The current request object
 * - method: Current HTTP method
 * - url: Current URL
 * - onMethodChange: Callback when method changes
 * - onUrlChange: Callback when URL changes
 * - onFieldUpdate: Callback when other fields change
 * - onSend: Callback to send request
 * - isLoading: Whether request is in progress
 */
function RequestEditor({ 
  request, 
  method = 'GET',
  url = '',
  onMethodChange, 
  onUrlChange, 
  onFieldUpdate,
  onSend, 
  isLoading = false,
}) {
  // Empty state - no request selected
  if (!request) {
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
      {/* URL Bar */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <UrlBar
          method={method}
          url={url}
          onMethodChange={onMethodChange}
          onUrlChange={onUrlChange}
          onSend={onSend}
          isLoading={isLoading}
        />
      </div>
      
      {/* Request Tabs */}
      <div className="flex-1 overflow-hidden">
        <RequestTabs
          request={request}
          onUpdate={onFieldUpdate}
        />
      </div>
    </div>
  );
}

export default memo(RequestEditor);
