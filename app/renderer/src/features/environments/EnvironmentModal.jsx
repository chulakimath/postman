/**
 * Environment Manager Modal
 * 
 * Interactive manager for Environment profiles and variables:
 * - Create, rename, duplicate, delete environments
 * - Key-value editor for environment variables
 * - Variables toggle enable/disable
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Layers,
  Check,
  Edit2,
  HelpCircle,
  X,
  Download,
} from 'lucide-react';
import Modal from '../../shared/components/Modal';
import useEnvironmentStore from '../../store/environmentStore';
import { exportEnvironment } from '../../utils/importerExporter';

const generateId = () => `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function EnvironmentModal() {
  const {
    environments,
    isEnvironmentModalOpen,
    closeEnvironmentModal,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    activeEnvironmentId,
    setActiveEnvironment,
  } = useEnvironmentStore();

  const [selectedEnvId, setSelectedEnvId] = useState(null);
  const [envName, setEnvName] = useState('');
  const [variables, setVariables] = useState([]);

  // Default selection when modal opens
  useEffect(() => {
    if (isEnvironmentModalOpen) {
      const targetId = activeEnvironmentId || (environments.length > 0 ? environments[0].id : null);
      setSelectedEnvId(targetId);
    }
  }, [isEnvironmentModalOpen, activeEnvironmentId, environments]);

  // Load selected environment into right panel state
  useEffect(() => {
    if (selectedEnvId) {
      const targetEnv = environments.find(e => e.id === selectedEnvId);
      if (targetEnv) {
        setEnvName(targetEnv.name);
        setVariables(Array.isArray(targetEnv.variables) ? targetEnv.variables : []);
      }
    } else {
      setEnvName('');
      setVariables([]);
    }
  }, [selectedEnvId, environments]);

  const handleCreateNew = async () => {
    try {
      const newEnv = await createEnvironment('New Environment', [
        { id: generateId(), key: 'baseUrl', value: 'https://api.example.com', enabled: true },
      ]);
      if (newEnv) {
        setSelectedEnvId(newEnv.id);
      }
    } catch (err) {
      console.error('Failed to create new environment profile:', err);
    }
  };

  const handleSaveEnvName = async () => {
    if (selectedEnvId && envName.trim()) {
      await updateEnvironment(selectedEnvId, { name: envName.trim() });
    }
  };

  const handleVariableChange = (id, field, value) => {
    const updated = variables.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    );
    setVariables(updated);
    if (selectedEnvId) {
      updateEnvironment(selectedEnvId, { variables: updated });
    }
  };

  const handleAddVariable = () => {
    const newVar = {
      id: generateId(),
      key: '',
      value: '',
      enabled: true,
    };
    const updated = [...variables, newVar];
    setVariables(updated);
    if (selectedEnvId) {
      updateEnvironment(selectedEnvId, { variables: updated });
    }
  };

  const handleDeleteVariable = (id) => {
    const updated = variables.filter(v => v.id !== id);
    setVariables(updated);
    if (selectedEnvId) {
      updateEnvironment(selectedEnvId, { variables: updated });
    }
  };

  const handleDuplicateEnv = async (env) => {
    const dupName = `${env.name} (Copy)`;
    const newEnv = await createEnvironment(dupName, env.variables || []);
    if (newEnv) {
      setSelectedEnvId(newEnv.id);
    }
  };

  const handleDeleteEnv = async (id) => {
    await deleteEnvironment(id);
    if (selectedEnvId === id) {
      const remaining = environments.filter(e => e.id !== id);
      setSelectedEnvId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  return (
    <Modal
      isOpen={isEnvironmentModalOpen}
      onClose={closeEnvironmentModal}
      title="Manage Environment Profiles"
      size="5xl"
    >
      <div className="flex h-[620px] max-h-[80vh] -m-5 text-text-primary select-none">
        {/* Left Panel: List of Environment Profiles */}
        <div className="w-72 bg-surface-2 border-r border-border flex flex-col p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Environments ({environments.length})
            </span>
            <button
              type="button"
              onClick={handleCreateNew}
              className="p-1 rounded bg-accent-orange/10 text-accent-orange hover:bg-accent-orange/20 transition-colors"
              title="Add Environment"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {environments.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No environment profiles yet. Click + to create one.
              </div>
            ) : (
              environments.map((env) => {
                const isSelected = env.id === selectedEnvId;
                const isActive = env.id === activeEnvironmentId;

                return (
                  <div
                    key={env.id}
                    onClick={() => setSelectedEnvId(env.id)}
                    className={`
                      group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors
                      ${isSelected ? 'bg-surface-4 text-text-primary font-medium' : 'hover:bg-surface-3 text-text-secondary'}
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers size={14} className={isActive ? 'text-accent-orange' : 'text-text-muted'} />
                      <span className="truncate">{env.name}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateEnv(env);
                        }}
                        className="p-1 hover:text-accent-orange rounded"
                        title="Duplicate"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEnv(env.id);
                        }}
                        className="p-1 hover:text-accent-red rounded"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Variable Key-Value Editor */}
        <div className="flex-1 flex flex-col p-5 overflow-hidden bg-surface-1">
          {selectedEnv ? (
            <>
              {/* Header: Environment Name & Active Toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <input
                    type="text"
                    value={envName}
                    onChange={(e) => setEnvName(e.target.value)}
                    onBlur={handleSaveEnvName}
                    className="text-lg font-semibold text-text-primary bg-transparent border-b border-transparent hover:border-border focus:border-accent-orange px-1 py-0.5 focus:outline-none w-full"
                    placeholder="Environment Name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportEnvironment(selectedEnv)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-accent-orange border border-border transition-colors"
                    title="Export Environment Profile as JSON"
                  >
                    <Download size={14} />
                    Export
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEnvironment(selectedEnv.id === activeEnvironmentId ? null : selectedEnv.id)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors
                      ${selectedEnv.id === activeEnvironmentId
                        ? 'bg-accent-orange text-white border-accent-orange'
                        : 'bg-surface-3 text-text-secondary hover:text-text-primary border-border'
                      }
                    `}
                  >
                    {selectedEnv.id === activeEnvironmentId ? (
                      <>
                        <Check size={14} /> Active Environment
                      </>
                    ) : (
                      'Set Active'
                    )}
                  </button>
                </div>
              </div>

              {/* Variable Table Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Variables ({variables.length})
                </span>
                <span className="text-2xs text-text-muted flex items-center gap-1">
                  <HelpCircle size={12} /> Reference in request using <code className="bg-surface-3 px-1 rounded font-mono text-accent-orange">{"{{variableName}}"}</code>
                </span>
              </div>

              {/* Variable Table Rows */}
              <div className="flex-1 overflow-y-auto border border-border rounded-md bg-surface-2/40">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      <th className="py-2 px-3 w-10 text-center">Use</th>
                      <th className="py-2 px-3 w-1/3">Variable Key</th>
                      <th className="py-2 px-3">Value</th>
                      <th className="py-2 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variables.map((v) => (
                      <tr key={v.id} className="border-b border-border/50 hover:bg-surface-3/50 group">
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={v.enabled !== false}
                            onChange={(e) => handleVariableChange(v.id, 'enabled', e.target.checked)}
                            className="rounded border-border text-accent-orange focus:ring-accent-orange cursor-pointer"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={v.key || ''}
                            onChange={(e) => handleVariableChange(v.id, 'key', e.target.value)}
                            placeholder="e.g. baseUrl"
                            className="w-full bg-transparent border-0 font-mono text-sm text-accent-orange focus:outline-none placeholder:text-text-muted"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={v.value || ''}
                            onChange={(e) => handleVariableChange(v.id, 'value', e.target.value)}
                            placeholder="e.g. https://api.example.com"
                            className="w-full bg-transparent border-0 font-mono text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteVariable(v.id)}
                            className="p-1 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Variable"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Variable Button */}
              <div className="pt-3 flex justify-start">
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-3 hover:bg-surface-4 border border-border rounded-md transition-colors"
                >
                  <Plus size={14} />
                  Add Variable
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select or create an environment profile from the left sidebar
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default EnvironmentModal;
