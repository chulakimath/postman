/**
 * Body Editor Component
 * 
 * Editor for request body with type selector:
 * - None (no body)
 * - JSON (Monaco editor with beautify)
 * - Form Data (key-value pairs)
 * - Raw (plain text)
 * 
 * BODY STATE STRUCTURE:
 * body = {
 *   activeType: "none" | "json" | "formdata" | "raw",
 *   json: "...",
 *   formdata: [...],
 *   raw: "..."
 * }
 * 
 * CRITICAL: Switching activeType does NOT delete other type data.
 * Each type has independent storage.
 */

import React, { useCallback, useRef, useEffect, memo, useState, lazy, Suspense } from 'react';
import { FileJson, FormInput, FileText, X, Wand2 } from 'lucide-react';
import KeyValueEditor from '../../shared/components/KeyValueEditor';

// Lazy load Monaco Editor (it's heavy)
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const BODY_TYPES = [
  { value: 'none', label: 'None', icon: X },
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'formdata', label: 'Form Data', icon: FormInput },
  { value: 'raw', label: 'Raw', icon: FileText },
];

// Debounce delay for Monaco content updates
const CONTENT_UPDATE_DELAY = 200;

/**
 * Normalize body to new structure
 * Handles both legacy and new formats
 */
function normalizeBody(body) {
  if (!body) {
    return {
      activeType: 'none',
      json: '{\n  \n}',
      formdata: [],
      raw: '',
    };
  }
  
  // Legacy format: { type, content }
  if ('type' in body && 'content' in body && !('activeType' in body)) {
    const legacyType = body.type || 'none';
    const legacyContent = body.content;
    
    const newBody = {
      activeType: legacyType,
      json: '{\n  \n}',
      formdata: [],
      raw: '',
    };
    
    if (legacyType === 'json' && typeof legacyContent === 'string') {
      newBody.json = legacyContent;
    } else if (legacyType === 'formdata' && Array.isArray(legacyContent)) {
      newBody.formdata = legacyContent;
    } else if (legacyType === 'raw' && typeof legacyContent === 'string') {
      newBody.raw = legacyContent;
    }
    
    return newBody;
  }
  
  // New format - ensure all keys exist
  return {
    activeType: body.activeType || 'none',
    json: body.json ?? '{\n  \n}',
    formdata: body.formdata ?? [],
    raw: body.raw ?? '',
  };
}

function BodyEditor({ body, onChange, method }) {
  // Normalize body to ensure consistent structure
  const normalizedBody = normalizeBody(body);
  
  const currentType = normalizedBody.activeType;
  const jsonContent = normalizedBody.json;
  const formdataContent = normalizedBody.formdata;
  const rawContent = normalizedBody.raw;
  
  const contentTimeoutRef = useRef(null);
  const editorRef = useRef(null);
  
  // Methods that typically don't have a body
  const noBodyMethods = ['GET', 'HEAD', 'OPTIONS'];
  const showWarning = noBodyMethods.includes(method);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
    };
  }, []);
  
  /**
   * Handle type change - ONLY changes activeType, preserves all content
   */
  const handleTypeChange = useCallback((newType) => {
    // Clear any pending content updates
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
      contentTimeoutRef.current = null;
    }
    
    // Only update activeType - all content is preserved
    onChange({
      ...normalizedBody,
      activeType: newType,
    });
  }, [normalizedBody, onChange]);
  
  /**
   * Handle JSON content change (needs debounce)
   */
  const handleJsonChange = useCallback((content) => {
    if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
    contentTimeoutRef.current = setTimeout(() => {
      onChange({
        ...normalizedBody,
        json: content,
      });
    }, CONTENT_UPDATE_DELAY);
  }, [normalizedBody, onChange]);
  
  /**
   * Handle FormData content change (immediate)
   */
  const handleFormdataChange = useCallback((content) => {
    onChange({
      ...normalizedBody,
      formdata: content,
    });
  }, [normalizedBody, onChange]);
  
  /**
   * Handle Raw content change (debounced in child component)
   */
  const handleRawChange = useCallback((content) => {
    onChange({
      ...normalizedBody,
      raw: content,
    });
  }, [normalizedBody, onChange]);
  
  /**
   * Beautify/Format JSON
   */
  const handleBeautify = useCallback(() => {
    try {
      if (!jsonContent?.trim()) return;
      
      const parsed = JSON.parse(jsonContent);
      const beautified = JSON.stringify(parsed, null, 2);
      
      onChange({
        ...normalizedBody,
        json: beautified,
      });
    } catch (e) {
      console.warn('Cannot beautify invalid JSON:', e.message);
    }
  }, [jsonContent, normalizedBody, onChange]);
  
  /**
   * Minify JSON (compress)
   */
  const handleMinify = useCallback(() => {
    try {
      if (!jsonContent?.trim()) return;
      
      const parsed = JSON.parse(jsonContent);
      const minified = JSON.stringify(parsed);
      
      onChange({
        ...normalizedBody,
        json: minified,
      });
    } catch (e) {
      console.warn('Cannot minify invalid JSON:', e.message);
    }
  }, [jsonContent, normalizedBody, onChange]);
  
  /**
   * Handle editor mount - store reference
   */
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);
  
  return (
    <div className="space-y-4">
      {/* Warning for GET/HEAD/OPTIONS */}
      {showWarning && currentType !== 'none' && (
        <div className="px-3 py-2 bg-accent-yellow/10 border border-accent-yellow/30 
                        rounded-md text-sm text-accent-yellow">
          {method} requests typically don't include a body. Consider using POST, PUT, or PATCH.
        </div>
      )}
      
      {/* Type Selector */}
      <div className="flex items-center gap-1 p-1 bg-surface-3 rounded-lg w-fit">
        {BODY_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = currentType === type.value;
          
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                transition-colors
                ${isActive 
                  ? 'bg-surface-1 text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              <Icon size={14} />
              {type.label}
            </button>
          );
        })}
      </div>
      
      {/* Content Editor */}
      <div className="min-h-[200px]">
        {currentType === 'none' && (
          <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">
            This request does not have a body
          </div>
        )}
        
        {currentType === 'json' && (
          <>
            <Suspense fallback={<EditorLoading />}>
              <div className="border border-border rounded-md overflow-hidden">
                <MonacoEditor
                  height="300px"
                  language="json"
                  value={jsonContent}
                  onChange={handleJsonChange}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 10 },
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>
            </Suspense>
            
            {/* Beautify/Minify buttons below editor */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleBeautify}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                           bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary
                           rounded-md transition-colors border border-border"
                title="Format JSON (Beautify)"
              >
                <Wand2 size={14} />
                Beautify
              </button>
              <button
                type="button"
                onClick={handleMinify}
                className="px-3 py-1.5 text-sm
                           bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary
                           rounded-md transition-colors border border-border"
                title="Compress JSON (Minify)"
              >
                Minify
              </button>
            </div>
          </>
        )}
        
        {currentType === 'formdata' && (
          <KeyValueEditor
            items={formdataContent}
            onChange={handleFormdataChange}
            keyPlaceholder="Field name"
            valuePlaceholder="Field value"
          />
        )}
        
        {currentType === 'raw' && (
          <RawTextArea
            value={rawContent}
            onChange={handleRawChange}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Raw Text Area with local state for responsiveness
 */
const RawTextArea = memo(function RawTextArea({ value, onChange }) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);
  
  // Sync when value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 150);
  };
  
  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      placeholder="Enter raw body content..."
      className="w-full h-[300px] p-4 bg-surface-3 border border-border rounded-md
                 text-text-primary placeholder:text-text-muted
                 font-mono text-sm resize-none
                 focus:border-accent-orange focus:ring-1 focus:ring-accent-orange"
    />
  );
});

/**
 * Loading placeholder for Monaco Editor
 */
function EditorLoading() {
  return (
    <div className="h-[300px] bg-surface-3 border border-border rounded-md
                    flex items-center justify-center">
      <div className="flex items-center gap-2 text-text-muted">
        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        Loading editor...
      </div>
    </div>
  );
}

export default memo(BodyEditor);
