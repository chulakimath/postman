/**
 * Search Modal Component
 * 
 * Command palette style search (Ctrl+K):
 * - Search across all collections and requests
 * - Keyboard navigation
 * - Quick open request
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileJson, Folder, ArrowRight } from 'lucide-react';
import Modal from '../../shared/components/Modal';
import MethodBadge from '../../shared/components/MethodBadge';
import useUIStore from '../../store/uiStore';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';

function SearchModal() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef(null);
  
  const { isSearchOpen, closeSearch } = useUIStore();
  const { collections } = useCollectionsStore();
  const { openRequest } = useRequestsStore();
  
  // Build searchable items
  const searchItems = useMemo(() => {
    const items = [];
    
    collections.forEach(collection => {
      // Add collection
      items.push({
        type: 'collection',
        id: collection.id,
        name: collection.name,
        collection: null,
      });
      
      // Add requests in collection
      collection.requests?.forEach(request => {
        items.push({
          type: 'request',
          id: request.id,
          name: request.name,
          method: request.method,
          url: request.url,
          collection: {
            id: collection.id,
            name: collection.name,
          },
        });
      });
    });
    
    return items;
  }, [collections]);
  
  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return searchItems.slice(0, 10); // Show first 10 when empty
    }
    
    const lowerQuery = query.toLowerCase();
    
    return searchItems.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(lowerQuery);
      const urlMatch = item.url?.toLowerCase().includes(lowerQuery);
      const collectionMatch = item.collection?.name.toLowerCase().includes(lowerQuery);
      
      return nameMatch || urlMatch || collectionMatch;
    });
  }, [searchItems, query]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isSearchOpen]);
  
  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
        
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
        
      case 'Escape':
        closeSearch();
        break;
    }
  };
  
  /**
   * Handle item selection
   */
  const handleSelect = (item) => {
    if (item.type === 'request') {
      // Find the full request object
      const collection = collections.find(c => c.id === item.collection.id);
      const request = collection?.requests?.find(r => r.id === item.id);
      
      if (request) {
        openRequest(item.collection.id, request);
      }
    } else if (item.type === 'collection') {
      useCollectionsStore.getState().setActiveCollection(item.id);
    }
    
    closeSearch();
  };
  
  /**
   * Highlight matching text
   */
  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? <mark key={i} className="bg-accent-orange/30 text-text-primary rounded">{part}</mark>
        : part
    );
  };
  
  return (
    <Modal
      isOpen={isSearchOpen}
      onClose={closeSearch}
      size="lg"
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search collections and requests..."
            className="w-full pl-10 pr-4 py-3 bg-surface-3 border border-border rounded-lg
                       text-text-primary placeholder:text-text-muted text-sm
                       focus:border-accent-orange focus:ring-1 focus:ring-accent-orange"
          />
        </div>
        
        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer
                    transition-colors
                    ${index === selectedIndex ? 'bg-surface-4' : 'hover:bg-surface-3'}
                  `}
                >
                  {item.type === 'collection' ? (
                    <>
                      <Folder size={16} className="text-accent-orange flex-shrink-0" />
                      <span className="text-sm text-text-primary">
                        {highlightMatch(item.name, query)}
                      </span>
                    </>
                  ) : (
                    <>
                      <MethodBadge method={item.method} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary truncate">
                          {highlightMatch(item.name, query)}
                        </div>
                        {item.url && (
                          <div className="text-xs text-text-muted truncate font-mono">
                            {highlightMatch(item.url, query)}
                          </div>
                        )}
                      </div>
                      {item.collection && (
                        <div className="flex items-center gap-1 text-xs text-text-muted flex-shrink-0">
                          <Folder size={12} />
                          {item.collection.name}
                        </div>
                      )}
                    </>
                  )}
                  
                  {index === selectedIndex && (
                    <ArrowRight size={14} className="text-text-muted flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Keyboard Hints */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-border 
                        text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-surface-3 rounded">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-surface-3 rounded">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-surface-3 rounded">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default SearchModal;
