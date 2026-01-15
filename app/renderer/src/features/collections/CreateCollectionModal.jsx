/**
 * Create Collection Modal
 * 
 * Modal for creating a new collection.
 * Simple form with collection name input.
 */

import { useState } from 'react';
import Modal from '../../shared/components/Modal';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import useCollectionsStore from '../../store/collectionsStore';
import useUIStore from '../../store/uiStore';
import { Folder } from 'lucide-react';

function CreateCollectionModal() {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const { createCollection } = useCollectionsStore();
  const { isCreateCollectionModalOpen: isOpen, closeCreateCollectionModal: onClose } = useUIStore();
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsCreating(true);
    
    try {
      await createCollection(name.trim());
      setName('');
      onClose();
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  /**
   * Handle modal close
   */
  const handleClose = () => {
    setName('');
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Collection"
      description="Collections help you organize related API requests"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Collection Icon Preview */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-accent-orange/10 
                          flex items-center justify-center">
            <Folder size={32} className="text-accent-orange" />
          </div>
        </div>
        
        {/* Name Input */}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          autoFocus
        />
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            loading={isCreating}
            disabled={!name.trim()}
          >
            Create Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateCollectionModal;
