/**
 * Tabs Component
 * 
 * Reusable tab navigation component.
 * Supports horizontal and vertical orientations.
 */

import { createContext, useContext, useState } from 'react';

// Context for tabs state
const TabsContext = createContext(null);

/**
 * Tab container component
 */
function Tabs({ 
  children, 
  defaultValue, 
  value: controlledValue,
  onChange,
  className = '' 
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleChange = (newValue) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };
  
  return (
    <TabsContext.Provider value={{ value, onChange: handleChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * Tab list (container for tab triggers)
 */
function TabsList({ children, className = '' }) {
  return (
    <div className={`
      flex items-center gap-1 border-b border-border
      ${className}
    `}>
      {children}
    </div>
  );
}

/**
 * Individual tab trigger
 */
function TabsTrigger({ value, children, className = '' }) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }
  
  const isActive = context.value === value;
  
  return (
    <button
      type="button"
      onClick={() => context.onChange(value)}
      className={`
        px-4 py-2 text-sm font-medium
        border-b-2 transition-colors
        ${isActive 
          ? 'text-text-primary border-accent-orange' 
          : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

/**
 * Tab content panel
 */
function TabsContent({ value, children, className = '' }) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }
  
  if (context.value !== value) {
    return null;
  }
  
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

// Attach sub-components
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

export default Tabs;
