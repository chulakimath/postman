/**
 * Input Component
 * 
 * Styled input with dark mode support.
 * Supports icons, error states, and various sizes.
 */

import { forwardRef } from 'react';

const Input = forwardRef(function Input({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  size = 'md',
  ...props
}, ref) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  };
  
  const iconPadding = {
    sm: Icon ? (iconPosition === 'left' ? 'pl-7' : 'pr-7') : '',
    md: Icon ? (iconPosition === 'left' ? 'pl-9' : 'pr-9') : '',
    lg: Icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '',
  };
  
  return (
    <div className="relative w-full">
      {/* Icon */}
      {Icon && (
        <div className={`
          absolute top-1/2 -translate-y-1/2 text-text-muted
          ${iconPosition === 'left' ? 'left-3' : 'right-3'}
        `}>
          <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
        </div>
      )}
      
      {/* Input */}
      <input
        ref={ref}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full bg-surface-3 border rounded-md text-text-primary
          placeholder:text-text-muted
          focus:border-accent-orange focus:ring-1 focus:ring-accent-orange
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-accent-red' : 'border-border'}
          ${sizeClasses[size]}
          ${iconPadding[size]}
          ${className}
        `}
        {...props}
      />
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-accent-red">{error}</p>
      )}
    </div>
  );
});

export default Input;
