/**
 * Params Editor Component
 * 
 * Editor for query parameters.
 * Uses KeyValueEditor component.
 */

import { memo } from 'react';
import KeyValueEditor from '../../shared/components/KeyValueEditor';
import { Link2 } from 'lucide-react';

function ParamsEditor({ params, onChange }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-text-secondary">
        <Link2 size={16} />
        <span className="text-sm font-medium">Query Parameters</span>
      </div>
      
      {/* Description */}
      <p className="text-xs text-text-muted">
        Parameters are appended to the URL as ?key=value&key2=value2
      </p>
      
      {/* Editor */}
      <KeyValueEditor
        items={params}
        onChange={onChange}
        keyPlaceholder="Parameter name"
        valuePlaceholder="Parameter value"
        showDescription={false}
      />
    </div>
  );
}

export default memo(ParamsEditor);
