import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
  });

  const confirm = useCallback(({ title, message }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    closeModal();
  };

  const handleCancel = () => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    closeModal();
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      message: '',
      resolve: null,
    });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};
