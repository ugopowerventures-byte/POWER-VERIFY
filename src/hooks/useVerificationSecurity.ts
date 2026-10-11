import { useState, useCallback } from 'react';

/**
 * Global Customer Confirmation Gate Hook
 * 
 * Flow:
 * - Customer must review and confirm request ([Confirm] -> ✓ Confirmed)
 * - Actual execution only runs when customer proceeds after confirming.
 */
export function useVerificationSecurity() {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<(() => Promise<void> | void) | null>(null);

  const triggerVerification = useCallback((executeFn: () => Promise<void> | void) => {
    setPendingExecution(() => executeFn);
    setConfirmModalOpen(true);
  }, []);

  const handleModalConfirm = useCallback(async () => {
    if (pendingExecution) {
      setConfirmModalOpen(false);
      await pendingExecution();
      setPendingExecution(null);
    }
  }, [pendingExecution]);

  const handleModalClose = useCallback(() => {
    setConfirmModalOpen(false);
    setPendingExecution(null);
  }, []);

  return {
    confirmModalOpen,
    triggerVerification,
    handleModalConfirm,
    handleModalClose
  };
}
