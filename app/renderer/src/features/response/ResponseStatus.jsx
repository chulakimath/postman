/**
 * Response Status Component
 * 
 * Displays HTTP status code with appropriate color:
 * - 2xx: Green (Success)
 * - 3xx: Blue (Redirect)
 * - 4xx: Orange (Client Error)
 * - 5xx: Red (Server Error)
 */

function ResponseStatus({ status, statusText }) {
  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return 'bg-accent-green/20 text-accent-green';
    if (code >= 300 && code < 400) return 'bg-accent-blue/20 text-accent-blue';
    if (code >= 400 && code < 500) return 'bg-accent-orange/20 text-accent-orange';
    if (code >= 500) return 'bg-accent-red/20 text-accent-red';
    return 'bg-surface-3 text-text-secondary';
  };
  
  const getStatusLabel = (code) => {
    if (code >= 200 && code < 300) return 'Success';
    if (code >= 300 && code < 400) return 'Redirect';
    if (code >= 400 && code < 500) return 'Client Error';
    if (code >= 500) return 'Server Error';
    return 'Unknown';
  };
  
  const colorClass = getStatusColor(status);
  const label = statusText || getStatusLabel(status);
  
  return (
    <div className="flex items-center gap-3">
      {/* Status Code Badge */}
      <span className={`
        px-3 py-1.5 rounded-md font-mono font-bold text-sm
        ${colorClass}
      `}>
        {status}
      </span>
      
      {/* Status Text */}
      <span className="text-sm text-text-secondary">
        {label}
      </span>
    </div>
  );
}

export default ResponseStatus;
