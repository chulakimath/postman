/**
 * Environment Selector Component
 * 
 * Dropdown component placed in the top bar / URL bar area:
 * - Selects active environment (No Environment, Dev, Prod, etc.)
 * - Opens Environment Management Modal
 */

import { useState, useRef, useEffect } from 'react';
import { Layers, Settings, ChevronDown, Check, Plus } from 'lucide-react';
import useEnvironmentStore from '../../store/environmentStore';

function EnvironmentSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    openEnvironmentModal,
    getActiveEnvironment,
    loadEnvironments,
  } = useEnvironmentStore();

  useEffect(() => {
    loadEnvironments();
  }, []);

  const activeEnv = getActiveEnvironment();
  const activeVarCount = activeEnv?.variables?.filter(v => v.enabled !== false && v.key)?.length || 0;

  return (
    <div className="relative select-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
          border border-border transition-colors
          ${activeEnv
            ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/30 hover:bg-accent-orange/20'
            : 'bg-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-4'
          }
        `}
      >
        <Layers size={14} className={activeEnv ? 'text-accent-orange' : 'text-text-muted'} />
        <span className="max-w-[130px] truncate">
          {activeEnv ? activeEnv.name : 'No Environment'}
        </span>
        {activeEnv && (
          <span className="px-1.5 py-0.2 text-2xs bg-accent-orange/20 text-accent-orange rounded-full font-mono">
            {activeVarCount}
          </span>
        )}
        <ChevronDown size={14} className="text-text-muted flex-shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-10 z-[101] w-56 py-1.5 bg-surface-3 border border-border rounded-lg shadow-2xl animate-fade-in text-sm">
            <div className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border mb-1">
              Environment Profiles
            </div>

            {/* No Environment option */}
            <button
              type="button"
              onClick={() => {
                setActiveEnvironment(null);
                setIsOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 flex items-center justify-between transition-colors"
            >
              <span className={!activeEnvironmentId ? 'font-medium text-accent-orange' : 'text-text-secondary'}>
                No Environment
              </span>
              {!activeEnvironmentId && <Check size={14} className="text-accent-orange" />}
            </button>

            {/* List of Environments */}
            {environments.map((env) => {
              const isActive = env.id === activeEnvironmentId;
              const count = env.variables?.filter(v => v.enabled !== false && v.key)?.length || 0;

              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => {
                    setActiveEnvironment(env.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-text-primary hover:bg-surface-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={isActive ? 'font-medium text-accent-orange truncate' : 'text-text-secondary truncate'}>
                      {env.name}
                    </span>
                    <span className="text-2xs text-text-muted tabular-nums">
                      ({count} vars)
                    </span>
                  </div>
                  {isActive && <Check size={14} className="text-accent-orange flex-shrink-0" />}
                </button>
              );
            })}

            <div className="my-1 border-t border-border" />

            {/* Manage Environments */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openEnvironmentModal();
              }}
              className="w-full px-3 py-1.5 text-left text-accent-orange hover:bg-accent-orange/10 flex items-center gap-2 font-medium transition-colors"
            >
              <Settings size={14} />
              <span>Manage Environments</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default EnvironmentSelector;
