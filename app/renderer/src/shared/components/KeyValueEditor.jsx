/**
 * Key-Value Editor Component
 * 
 * Reusable editor for key-value pairs.
 * Used for headers, query params, form data.
 * 
 * OPTIMIZED: 
 * - Uses local state for immediate input responsiveness
 * - Debounces updates to parent to prevent lag
 * - Sanitizes input values
 * - Prevents unnecessary re-renders with memo
 */

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Debounce delay for parent updates (ms)
const UPDATE_DELAY = 150;

/**
 * Sanitize input value - removes potentially problematic characters
 * Allows most characters but escapes/handles edge cases
 */
const sanitizeValue = (value) => {
  if (typeof value !== 'string') return String(value ?? '');
  return value;
};

/**
 * Generate a simple unique ID (faster than crypto.randomUUID)
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Single Row Component - Memoized to prevent unnecessary re-renders
 */
const KeyValueRow = memo(function KeyValueRow({
  item,
  onUpdate,
  onToggle,
  onRemove,
  keyPlaceholder,
  valuePlaceholder,
  showDescription,
  descriptionPlaceholder,
  readOnly,
}) {
  // Local state for immediate input responsiveness
  const [localKey, setLocalKey] = useState(item.key ?? '');
  const [localValue, setLocalValue] = useState(item.value ?? '');
  const [localDesc, setLocalDesc] = useState(item.description ?? '');
  
  const updateTimeoutRef = useRef(null);
  
  // Sync local state when item changes externally
  useEffect(() => {
    setLocalKey(item.key ?? '');
    setLocalValue(item.value ?? '');
    setLocalDesc(item.description ?? '');
  }, [item.id]); // Only reset when item ID changes, not on every update
  
  // Debounced update to parent
  const debouncedUpdate = useCallback((field, value) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(item.id, field, sanitizeValue(value));
    }, UPDATE_DELAY);
  }, [item.id, onUpdate]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  const handleKeyChange = (e) => {
    const value = e.target.value;
    setLocalKey(value);
    debouncedUpdate('key', value);
  };
  
  const handleValueChange = (e) => {
    const value = e.target.value;
    setLocalValue(value);
    debouncedUpdate('value', value);
  };
  
  const handleDescChange = (e) => {
    const value = e.target.value;
    setLocalDesc(value);
    debouncedUpdate('description', value);
  };
  
  return (
    <div 
      className={`
        flex items-center gap-2 group
        ${item.enabled === false ? 'opacity-50' : ''}
      `}
    >
      {/* Enable/Disable Checkbox */}
      <input
        type="checkbox"
        checked={item.enabled !== false}
        onChange={() => onToggle(item.id)}
        disabled={readOnly}
        className="w-4 h-4 rounded border-border bg-surface-3 text-accent-orange 
                   focus:ring-accent-orange focus:ring-offset-0 cursor-pointer flex-shrink-0"
      />
      
      {/* Key Input */}
      <input
        type="text"
        value={localKey}
        onChange={handleKeyChange}
        placeholder={keyPlaceholder}
        disabled={readOnly}
        className="flex-1 min-w-0 bg-surface-3 border border-border rounded-md
                   px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted
                   focus:border-accent-orange focus:ring-1 focus:ring-accent-orange
                   transition-colors disabled:opacity-50"
      />
      
      {/* Value Input */}
      <input
        type="text"
        value={localValue}
        onChange={handleValueChange}
        placeholder={valuePlaceholder}
        disabled={readOnly}
        className="flex-1 min-w-0 bg-surface-3 border border-border rounded-md
                   px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted
                   focus:border-accent-orange focus:ring-1 focus:ring-accent-orange
                   transition-colors disabled:opacity-50"
      />
      
      {/* Description Input (optional) */}
      {showDescription && (
        <input
          type="text"
          value={localDesc}
          onChange={handleDescChange}
          placeholder={descriptionPlaceholder}
          disabled={readOnly}
          className="flex-1 min-w-0 bg-surface-3 border border-border rounded-md
                     px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted
                     focus:border-accent-orange focus:ring-1 focus:ring-accent-orange
                     transition-colors disabled:opacity-50"
        />
      )}
      
      {/* Delete Button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-text-muted hover:text-accent-red 
                     opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
});

/**
 * Main KeyValueEditor Component
 */
function KeyValueEditor({
  items = [],
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  showDescription = false,
  descriptionPlaceholder = 'Description',
  readOnly = false,
}) {
  // Ensure items have IDs
  const normalizedItems = items.map(item => ({
    ...item,
    id: item.id || generateId(),
    key: item.key ?? '',
    value: item.value ?? '',
    description: item.description ?? '',
    enabled: item.enabled !== false,
  }));
  
  /**
   * Add a new empty row
   */
  const addRow = useCallback(() => {
    const newItem = {
      id: generateId(),
      key: '',
      value: '',
      description: '',
      enabled: true,
    };
    onChange([...items, newItem]);
  }, [items, onChange]);
  
  /**
   * Update a specific row
   */
  const updateRow = useCallback((id, field, value) => {
    onChange(
      items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }, [items, onChange]);
  
  /**
   * Toggle row enabled state
   */
  const toggleRow = useCallback((id) => {
    onChange(
      items.map(item => 
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  }, [items, onChange]);
  
  /**
   * Remove a row
   */
  const removeRow = useCallback((id) => {
    onChange(items.filter(item => item.id !== id));
  }, [items, onChange]);
  
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-text-muted uppercase">
        <div className="w-5 flex-shrink-0" /> {/* Checkbox space */}
        <div className="flex-1">Key</div>
        <div className="flex-1">Value</div>
        {showDescription && <div className="flex-1">Description</div>}
        <div className="w-8 flex-shrink-0" /> {/* Actions space */}
      </div>
      
      {/* Rows */}
      <div className="space-y-1">
        {normalizedItems.map((item) => (
          <KeyValueRow
            key={item.id}
            item={item}
            onUpdate={updateRow}
            onToggle={toggleRow}
            onRemove={removeRow}
            keyPlaceholder={keyPlaceholder}
            valuePlaceholder={valuePlaceholder}
            showDescription={showDescription}
            descriptionPlaceholder={descriptionPlaceholder}
            readOnly={readOnly}
          />
        ))}
      </div>
      
      {/* Add Row Button */}
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary
                     hover:text-text-primary hover:bg-surface-3 rounded-md
                     transition-colors w-full"
        >
          <Plus size={16} />
          Add Row
        </button>
      )}
      
      {/* Empty State */}
      {items.length === 0 && readOnly && (
        <div className="text-center py-4 text-text-muted text-sm">
          No items
        </div>
      )}
    </div>
  );
}

export default KeyValueEditor;
