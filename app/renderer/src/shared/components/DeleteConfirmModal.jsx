/**
 * Delete Confirm Modal
 * 
 * Confirmation dialog for delete actions.
 * Prevents accidental deletion of collections/requests.
 */

import Modal from './Modal';
import Button from './Button';
import useUIStore from '../../store/uiStore';
import useCollectionsStore from '../../store/collectionsStore';
import useRequestsStore from '../../store/requestsStore';

function DeleteConfirmModal() {
  const { 
    isDeleteConfirmModalOpen: isOpen, 
    closeDeleteConfirmModal: onClose,
    deleteTarget,
  } = useUIStore();
  
  const { deleteCollection, deleteRequest } = useCollectionsStore();
  const { closeTab } = useRequestsStore();
  
  if (!deleteTarget) return null;
  
  const handleDelete = async () => {
    if (deleteTarget.type === 'collection') {
      await deleteCollection(deleteTarget.id);
    } else if (deleteTarget.type === 'request') {
      // Use collectionId from deleteTarget (passed when opening modal)
      await deleteRequest(deleteTarget.collectionId, deleteTarget.id);
      closeTab(deleteTarget.id);
    }
    onClose();
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${deleteTarget.type === 'collection' ? 'Collection' : 'Request'}`}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-text-secondary">
          Are you sure you want to delete{' '}
          <span className="font-medium text-text-primary">"{deleteTarget.name}"</span>?
          {deleteTarget.type === 'collection' && (
            <span className="block mt-2 text-sm text-text-muted">
              This will delete all requests inside this collection.
            </span>
          )}
        </p>
        
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteConfirmModal;
