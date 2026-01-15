/**
 * Headers Editor Component
 * 
 * Editor for HTTP headers.
 * Uses KeyValueEditor component.
 * Shows common header suggestions.
 */

import { memo, useCallback } from 'react';
import KeyValueEditor from '../../shared/components/KeyValueEditor';
import { FileText } from 'lucide-react';

// Common headers for quick add
const COMMON_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
  { key: 'Authorization', value: 'Bearer <token>' },
  { key: 'Cache-Control', value: 'no-cache' },
];

// Fast ID generation
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function HeadersEditor({ headers, onChange }) {
  /**
   * Add a common header
   */
  const addCommonHeader = useCallback((header) => {
    const newHeader = {
      id: generateId(),
      key: header.key,
      value: header.value,
      enabled: true,
    };
    onChange([...headers, newHeader]);
  }, [headers, onChange]);
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-text-secondary">
        <FileText size={16} />
        <span className="text-sm font-medium">Request Headers</span>
      </div>
      
      {/* Quick Add */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-text-muted">Quick add:</span>
        {COMMON_HEADERS.map((header) => (
          <button
            key={header.key}
            type="button"
            onClick={() => addCommonHeader(header)}
            className="px-2 py-0.5 text-xs bg-surface-3 text-text-secondary
                       rounded hover:bg-surface-4 hover:text-text-primary
                       transition-colors"
          >
            {header.key}
          </button>
        ))}
      </div>
      
      {/* Editor */}
      <KeyValueEditor
        items={headers}
        onChange={onChange}
        keyPlaceholder="Header name"
        valuePlaceholder="Header value"
        showDescription={false}
      />
    </div>
  );
}

export default memo(HeadersEditor);

