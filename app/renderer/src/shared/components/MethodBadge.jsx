/**
 * Method Badge Component
 * 
 * Displays HTTP method with color coding.
 * GET = Green, POST = Yellow, PUT = Blue, etc.
 */

const methodColors = {
  GET: 'bg-method-GET/20 text-method-GET',
  POST: 'bg-method-POST/20 text-method-POST',
  PUT: 'bg-method-PUT/20 text-method-PUT',
  PATCH: 'bg-method-PATCH/20 text-method-PATCH',
  DELETE: 'bg-method-DELETE/20 text-method-DELETE',
  HEAD: 'bg-method-HEAD/20 text-method-HEAD',
  OPTIONS: 'bg-method-OPTIONS/20 text-method-OPTIONS',
};

function MethodBadge({ method = 'GET', size = 'md' }) {
  const upperMethod = method.toUpperCase();
  const colorClass = methodColors[upperMethod] || methodColors.GET;
  
  const sizeClasses = {
    sm: 'text-2xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };
  
  return (
    <span className={`
      inline-flex items-center justify-center
      font-mono font-medium rounded
      ${colorClass}
      ${sizeClasses[size]}
    `}>
      {upperMethod}
    </span>
  );
}

export default MethodBadge;
