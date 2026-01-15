/**
 * Auth Editor Component
 * 
 * Editor for request authentication:
 * - None
 * - Bearer Token
 * - Basic Auth (username/password)
 * - API Key (header or query)
 */

import { useCallback, memo } from 'react';
import { ShieldCheck, Key, User, Lock } from 'lucide-react';
import Input from '../../shared/components/Input';

const AUTH_TYPES = [
  { value: 'none', label: 'No Auth', description: 'No authentication required' },
  { value: 'bearer', label: 'Bearer Token', description: 'Token-based authentication' },
  { value: 'basic', label: 'Basic Auth', description: 'Username and password' },
  { value: 'apiKey', label: 'API Key', description: 'Key-value pair in header or query' },
];

function AuthEditor({ auth, onChange }) {
  const currentType = auth?.type || 'none';
  const data = auth?.data || {};
  
  /**
   * Handle type change
   */
  const handleTypeChange = useCallback((type) => {
    onChange({ type, data: {} });
  }, [onChange]);
  
  /**
   * Handle data field change
   */
  const handleDataChange = useCallback((field, value) => {
    onChange({
      ...auth,
      data: { ...auth?.data, [field]: value },
    });
  }, [auth, onChange]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-text-secondary">
        <ShieldCheck size={16} />
        <span className="text-sm font-medium">Authentication</span>
      </div>
      
      {/* Type Selector */}
      <div className="grid grid-cols-2 gap-3">
        {AUTH_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            className={`
              p-3 rounded-lg border text-left transition-all
              ${currentType === type.value
                ? 'bg-accent-orange/10 border-accent-orange text-text-primary'
                : 'bg-surface-3 border-border text-text-secondary hover:border-border-light'
              }
            `}
          >
            <div className="font-medium text-sm">{type.label}</div>
            <div className="text-xs text-text-muted mt-0.5">{type.description}</div>
          </button>
        ))}
      </div>
      
      {/* Auth Config Forms */}
      <div className="pt-2">
        {currentType === 'none' && (
          <div className="text-center py-8 text-text-muted text-sm">
            No authentication will be added to this request
          </div>
        )}
        
        {currentType === 'bearer' && (
          <BearerAuthForm data={data} onChange={handleDataChange} />
        )}
        
        {currentType === 'basic' && (
          <BasicAuthForm data={data} onChange={handleDataChange} />
        )}
        
        {currentType === 'apiKey' && (
          <ApiKeyAuthForm data={data} onChange={handleDataChange} />
        )}
      </div>
    </div>
  );
}

/**
 * Bearer Token Auth Form
 */
function BearerAuthForm({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Token
        </label>
        <Input
          value={data.token || ''}
          onChange={(e) => onChange('token', e.target.value)}
          placeholder="Enter your bearer token"
          icon={Key}
        />
      </div>
      
      <div className="text-xs text-text-muted">
        The token will be sent as: <code className="text-accent-orange">Authorization: Bearer &lt;token&gt;</code>
      </div>
    </div>
  );
}

/**
 * Basic Auth Form
 */
function BasicAuthForm({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Username
        </label>
        <Input
          value={data.username || ''}
          onChange={(e) => onChange('username', e.target.value)}
          placeholder="Enter username"
          icon={User}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Password
        </label>
        <Input
          type="password"
          value={data.password || ''}
          onChange={(e) => onChange('password', e.target.value)}
          placeholder="Enter password"
          icon={Lock}
        />
      </div>
      
      <div className="text-xs text-text-muted">
        Credentials will be Base64 encoded and sent as: <code className="text-accent-orange">Authorization: Basic &lt;encoded&gt;</code>
      </div>
    </div>
  );
}

/**
 * API Key Auth Form
 */
function ApiKeyAuthForm({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Key Name
          </label>
          <Input
            value={data.key || ''}
            onChange={(e) => onChange('key', e.target.value)}
            placeholder="e.g., X-API-Key"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Value
          </label>
          <Input
            value={data.value || ''}
            onChange={(e) => onChange('value', e.target.value)}
            placeholder="Enter API key"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Add to
        </label>
        <div className="flex gap-3">
          {['header', 'query'].map((location) => (
            <button
              key={location}
              onClick={() => onChange('location', location)}
              className={`
                px-4 py-2 rounded-md text-sm capitalize
                ${(data.location || 'header') === location
                  ? 'bg-accent-orange text-white'
                  : 'bg-surface-3 text-text-secondary hover:bg-surface-4'
                }
              `}
            >
              {location === 'header' ? 'Header' : 'Query Params'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(AuthEditor);
