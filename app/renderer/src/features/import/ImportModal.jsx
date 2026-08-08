/**
 * Import Modal Component
 * 
 * Interactive import dialog supporting:
 * - Drag and drop .json files
 * - Raw JSON paste
 * - Auto-detects Postman Collection v2.1, Testly Collection, Testly Environment
 * - Imports directly into SQLite database & Zustand stores
 */

import { useState, useRef } from 'react';
import { Upload, FileCode, CheckCircle, AlertCircle, FileJson, ArrowRight, FolderPlus } from 'lucide-react';
import Modal from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import useCollectionsStore from '../../store/collectionsStore';
import useEnvironmentStore from '../../store/environmentStore';
import { parseImportPayload } from '../../utils/importerExporter';

function ImportModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [parsedPayload, setParsedPayload] = useState(null);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const { createCollection, addRequest } = useCollectionsStore();
  const { createEnvironment } = useEnvironmentStore();

  const handleReset = () => {
    setParsedPayload(null);
    setError(null);
    setPasteText('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFileContent = (contentString) => {
    setError(null);
    try {
      const result = parseImportPayload(contentString);
      setParsedPayload(result);
    } catch (err) {
      setError(err.message || 'Failed to parse file content.');
      setParsedPayload(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          processFileContent(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          processFileContent(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePasteChange = (text) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsedPayload(null);
      setError(null);
      return;
    }
    processFileContent(text);
  };

  const handleConfirmImport = async () => {
    if (!parsedPayload) return;

    try {
      if (parsedPayload.type === 'collection' || parsedPayload.type === 'postman') {
        const colData = parsedPayload.data;
        const newCollection = await createCollection(colData.name || 'Imported Collection');

        if (newCollection && Array.isArray(colData.requests)) {
          for (const req of colData.requests) {
            await addRequest(newCollection.id, req);
          }
        }
      } else if (parsedPayload.type === 'environment') {
        const envData = parsedPayload.data;
        await createEnvironment(envData.name || 'Imported Environment', envData.variables || []);
      }

      handleClose();
    } catch (err) {
      setError(`Failed to import data: ${err.message}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Collections & Environments"
      size="2xl"
    >
      <div className="space-y-4 text-text-primary select-none">
        {/* Mode Selector */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              handleReset();
            }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activeTab === 'file'
                ? 'bg-surface-3 text-accent-orange border border-accent-orange/30'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <Upload size={14} />
            File Upload / Drag & Drop
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('paste');
              handleReset();
            }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activeTab === 'paste'
                ? 'bg-surface-3 text-accent-orange border border-accent-orange/30'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <FileCode size={14} />
            Paste Raw JSON
          </button>
        </div>

        {/* Tab 1: File Upload / Drag & Drop */}
        {activeTab === 'file' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              flex flex-col items-center justify-center gap-3 min-h-[200px]
              ${isDragOver
                ? 'border-accent-orange bg-accent-orange/10'
                : 'border-border hover:border-text-muted bg-surface-2/40'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="p-3 bg-surface-3 rounded-full text-accent-orange">
              <Upload size={24} />
            </div>
            <div>
              <p className="font-medium text-sm text-text-primary">
                Drop Postman or Testly JSON file here
              </p>
              <p className="text-xs text-text-muted mt-1">
                Supports Postman Collection v2.1, Testly Collections, and Environment profiles
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Raw JSON Paste */}
        {activeTab === 'paste' && (
          <textarea
            value={pasteText}
            onChange={(e) => handlePasteChange(e.target.value)}
            placeholder="Paste raw Postman or Testly JSON here..."
            className="w-full h-[200px] p-3 bg-surface-3 border border-border rounded-md font-mono text-xs text-text-primary focus:outline-none focus:border-accent-orange resize-none"
          />
        )}

        {/* Validation / Format Preview Result */}
        {error && (
          <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {parsedPayload && (
          <div className="p-4 bg-surface-3 border border-accent-orange/30 rounded-md space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-accent-orange font-medium text-sm">
              <CheckCircle size={16} />
              <span>Valid Import Data Detected</span>
            </div>
            <p className="text-xs text-text-secondary pl-6">
              {parsedPayload.summary}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!parsedPayload}
            onClick={handleConfirmImport}
            icon={FolderPlus}
          >
            Import Data
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ImportModal;
