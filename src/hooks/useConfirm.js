import { useState, useCallback } from 'react';

let globalConfirmDialog = null;

export const setConfirmDialogRef = (ref) => {
  globalConfirmDialog = ref;
};

export const useConfirm = () => {
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      if (globalConfirmDialog) {
        globalConfirmDialog.show({
          ...options,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      } else {
        // Fallback to native confirm
        resolve(window.confirm(options.message || 'Are you sure?'));
      }
    });
  }, []);

  return { confirm };
};
