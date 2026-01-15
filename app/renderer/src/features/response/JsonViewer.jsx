/**
 * JSON Viewer Component
 * 
 * Pretty-prints JSON with:
 * - Syntax highlighting
 * - Collapsible nodes
 * - Copy button
 */

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

function JsonViewer({ data }) {
  const [copied, setCopied] = useState(false);
  
  const jsonString = JSON.stringify(data, null, 2);
  
  /**
   * Copy JSON to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  return (
    <div className="relative">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-md bg-surface-4 
                   text-text-secondary hover:text-text-primary
                   transition-colors z-10"
        title="Copy JSON"
      >
        {copied ? (
          <Check size={16} className="text-accent-green" />
        ) : (
          <Copy size={16} />
        )}
      </button>
      
      {/* JSON Content */}
      <div className="p-4 bg-surface-3 rounded-md overflow-auto">
        <JsonNode data={data} />
      </div>
    </div>
  );
}

/**
 * Recursive JSON Node Component
 */
function JsonNode({ data, depth = 0 }) {
  const [isCollapsed, setIsCollapsed] = useState(depth > 2);
  
  // Handle null
  if (data === null) {
    return <span className="text-text-muted">null</span>;
  }
  
  // Handle primitives
  if (typeof data !== 'object') {
    return <JsonValue value={data} />;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-text-muted">[]</span>;
    }
    
    return (
      <span>
        <CollapseButton 
          isCollapsed={isCollapsed} 
          onClick={() => setIsCollapsed(!isCollapsed)} 
        />
        <span className="text-text-muted">[</span>
        
        {isCollapsed ? (
          <span className="text-text-muted"> {data.length} items... </span>
        ) : (
          <div className="pl-4 border-l border-border ml-2">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <JsonNode data={item} depth={depth + 1} />
                {index < data.length - 1 && <span className="text-text-muted">,</span>}
              </div>
            ))}
          </div>
        )}
        
        <span className="text-text-muted">]</span>
      </span>
    );
  }
  
  // Handle objects
  const entries = Object.entries(data);
  
  if (entries.length === 0) {
    return <span className="text-text-muted">{'{}'}</span>;
  }
  
  return (
    <span>
      <CollapseButton 
        isCollapsed={isCollapsed} 
        onClick={() => setIsCollapsed(!isCollapsed)} 
      />
      <span className="text-text-muted">{'{'}</span>
      
      {isCollapsed ? (
        <span className="text-text-muted"> {entries.length} properties... </span>
      ) : (
        <div className="pl-4 border-l border-border ml-2">
          {entries.map(([key, value], index) => (
            <div key={key} className="py-0.5">
              <span className="text-accent-orange">"{key}"</span>
              <span className="text-text-muted">: </span>
              <JsonNode data={value} depth={depth + 1} />
              {index < entries.length - 1 && <span className="text-text-muted">,</span>}
            </div>
          ))}
        </div>
      )}
      
      <span className="text-text-muted">{'}'}</span>
    </span>
  );
}

/**
 * JSON Primitive Value
 */
function JsonValue({ value }) {
  if (typeof value === 'string') {
    return <span className="text-accent-green">"{value}"</span>;
  }
  
  if (typeof value === 'number') {
    return <span className="text-accent-blue">{value}</span>;
  }
  
  if (typeof value === 'boolean') {
    return <span className="text-method-PATCH">{value ? 'true' : 'false'}</span>;
  }
  
  return <span className="text-text-muted">{String(value)}</span>;
}

/**
 * Collapse/Expand Button
 */
function CollapseButton({ isCollapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center w-4 h-4 mr-1
                 text-text-muted hover:text-text-primary"
    >
      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
    </button>
  );
}

export default JsonViewer;
