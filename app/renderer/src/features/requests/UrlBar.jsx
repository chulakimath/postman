/**
 * URL Bar Component
 * 
 * Contains:
 * - HTTP method selector dropdown
 * - URL input field
 * - Send/Cancel button
 * 
 * NOTE: Parent (RequestEditor) manages local state for method and URL.
 * This component just renders and reports changes.
 */

import { useState, useCallback, memo } from 'react';
import { Send, ChevronDown, X } from 'lucide-react';
import Button from '../../shared/components/Button';
import useResponseStore from '../../store/responseStore';

const HTTP_METHODS = [
  { value: 'GET', color: 'text-method-GET' },
  { value: 'POST', color: 'text-method-POST' },
  { value: 'PUT', color: 'text-method-PUT' },
  { value: 'PATCH', color: 'text-method-PATCH' },
  { value: 'DELETE', color: 'text-method-DELETE' },
  { value: 'HEAD', color: 'text-method-HEAD' },
  { value: 'OPTIONS', color: 'text-method-OPTIONS' },
];

function UrlBar({ method = 'GET', url = '', onMethodChange, onUrlChange, onSend, isLoading }) {
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  
  const { cancelRequest } = useResponseStore();
  
  const currentMethod = HTTP_METHODS.find(m => m.value === method) || HTTP_METHODS[0];
  
  /**
   * Handle URL input change
   */
  const handleUrlChange = useCallback((e) => {
    onUrlChange(e.target.value);
  }, [onUrlChange]);
  
  /**
   * Handle keyboard submit
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);
  
  /**
   * Handle method change
   */
  const handleMethodChange = useCallback((newMethod) => {
    onMethodChange(newMethod);
    setIsMethodOpen(false);
  }, [onMethodChange]);
  
  /**
   * Handle cancel click
   */
  const handleCancel = useCallback(() => {
    cancelRequest();
  }, [cancelRequest]);
  
  return (
    <div className="flex items-center gap-2">
      {/* Method Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMethodOpen(!isMethodOpen)}
          className={`
            flex items-center gap-2 px-3 py-2.5 
            bg-surface-3 border border-border rounded-md
            hover:bg-surface-4 transition-colors
            font-mono font-medium text-sm
            min-w-[100px]
            ${currentMethod.color}
          `}
        >
          {method}
          <ChevronDown size={14} className="text-text-muted" />
        </button>
        
        {/* Dropdown */}
        {isMethodOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsMethodOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 z-20 w-32 py-1
                            bg-surface-3 border border-border rounded-md shadow-lg">
              {HTTP_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleMethodChange(m.value)}
                  className={`
                    w-full px-3 py-1.5 text-left text-sm font-mono font-medium
                    hover:bg-surface-4 transition-colors
                    ${m.color}
                    ${method === m.value ? 'bg-surface-4' : ''}
                  `}
                >
                  {m.value}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* URL Input */}
      <div className="flex-1">
        <input
          type="text"
          value={url}
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter request URL (e.g., https://api.example.com/users)"
          className="w-full bg-surface-3 border border-border rounded-md
                     px-4 py-2.5 text-text-primary placeholder:text-text-muted
                     focus:border-accent-orange focus:ring-1 focus:ring-accent-orange
                     transition-colors font-mono text-sm"
        />
      </div>
      
      {/* Send or Cancel Button */}
      {isLoading ? (
        <Button
          variant="danger"
          onClick={handleCancel}
          icon={X}
          className="px-6"
        >
          Cancel
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={onSend}
          disabled={!url?.trim()}
          icon={Send}
          className="px-6"
        >
          Send
        </Button>
      )}
    </div>
  );
}

export default memo(UrlBar);
