/**
 * Button Component
 * 
 * Reusable button with variants:
 * - primary: Orange accent button
 * - secondary: Bordered button
 * - ghost: Transparent background
 * - danger: Red for destructive actions
 */

function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 
    font-medium rounded-md transition-all duration-150
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1
  `;
  
  const variantClasses = {
    primary: 'bg-accent-orange text-white hover:bg-accent-orange-hover active:scale-[0.98]',
    secondary: 'bg-surface-3 text-text-primary border border-border hover:bg-surface-4 active:scale-[0.98]',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-3 hover:text-text-primary',
    danger: 'bg-accent-red/10 text-accent-red border border-accent-red/30 hover:bg-accent-red/20',
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
    icon: 'p-2', // Square button for icon-only
  };
  
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : 16} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : 16} />}
        </>
      )}
    </button>
  );
}

export default Button;
