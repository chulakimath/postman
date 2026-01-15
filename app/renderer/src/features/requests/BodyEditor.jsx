/**
 * Body Editor Component
 * 
 * Editor for request body with type selector:
 * - None (no body)
 * - JSON (Monaco editor with beautify)
 * - Form Data (key-value pairs)
 * - Raw (plain text)
 * 
 * NOTE: Local state is managed by parent (RequestTabs).
 * This component receives body as prop and calls onChange.
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

function BodyEditor({ body, onChange, method }) {
  const currentType = body?.type || 'none';
  const currentContent = body?.content ?? '';
  
  const contentTimeoutRef = useRef(null);
  const editorRef = useRef(null);
  
  // Cache content per body type to preserve data when switching types
  const cachedContentRef = useRef({
    json: '{\n  \n}',
    formdata: [],
    raw: '',
  });
  
  // Methods that typically don't have a body
  const noBodyMethods = ['GET', 'HEAD', 'OPTIONS'];
  const showWarning = noBodyMethods.includes(method);
  
  // Keep cache updated with current content
  useEffect(() => {
    if (currentType !== 'none' && currentContent !== undefined) {
      cachedContentRef.current[currentType] = currentContent;
    }
  }, [currentType, currentContent]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
    };
  }, []);
  
  /**
   * Handle type change - preserves content per type
   */
  const handleTypeChange = useCallback((type) => {
    // Save current content to cache before switching
    if (currentType !== 'none' && currentContent !== undefined) {
      cachedContentRef.current[currentType] = currentContent;
    }
    
    // Get cached content for the new type, or use defaults
    let content;
    if (type === 'none') {
      content = '';
    } else {
      content = cachedContentRef.current[type];
    }
    
    // Clear any pending content updates
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
      contentTimeoutRef.current = null;
    }
    
    // Update parent immediately for type changes
    onChange({ type, content });
  }, [currentType, currentContent, onChange]);
  
  /**
   * Handle content change (for Monaco - needs debounce)
   */
  const handleMonacoChange = useCallback((content) => {
    if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
    contentTimeoutRef.current = setTimeout(() => {
      onChange({ type: currentType, content });
    }, CONTENT_UPDATE_DELAY);
  }, [currentType, onChange]);
  
  /**
   * Handle content change (for FormData and Raw - immediate)
   */
  const handleContentChange = useCallback((content) => {
    onChange({ type: currentType, content });
  }, [currentType, onChange]);
  
  /**
   * Beautify/Format JSON
   */
  const handleBeautify = useCallback(() => {
    try {
      const content = typeof currentContent === 'string' ? currentContent : '';
      if (!content.trim()) return;
      
      // Parse and re-stringify with formatting
      const parsed = JSON.parse(content);
      const beautified = JSON.stringify(parsed, null, 2);
      
      // Update immediately
      onChange({ type: currentType, content: beautified });
    } catch (e) {
      // Invalid JSON - can't beautify
      console.warn('Cannot beautify invalid JSON:', e.message);
    }
  }, [currentContent, currentType, onChange]);
  
  /**
   * Minify JSON (compress)
   */
  const handleMinify = useCallback(() => {
    try {
      const content = typeof currentContent === 'string' ? currentContent : '';
      if (!content.trim()) return;
      
      const parsed = JSON.parse(content);
      const minified = JSON.stringify(parsed);
      
      onChange({ type: currentType, content: minified });
    } catch (e) {
      console.warn('Cannot minify invalid JSON:', e.message);
    }
  }, [currentContent, currentType, onChange]);
  
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
                  value={typeof currentContent === 'string' ? currentContent : '{\n  \n}'}
                  onChange={handleMonacoChange}
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
            items={Array.isArray(currentContent) ? currentContent : []}
            onChange={handleContentChange}
            keyPlaceholder="Field name"
            valuePlaceholder="Field value"
          />
        )}
        
        {currentType === 'raw' && (
          <RawTextArea
            value={typeof currentContent === 'string' ? currentContent : ''}
            onChange={handleContentChange}
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
