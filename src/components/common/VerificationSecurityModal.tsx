import React from 'react';
import {
  ServiceAuthorizationModal,
  ServiceReviewItem
} from './ServiceAuthorizationModal';

export interface VerificationSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  serviceName: string;
  serviceCode?: string;
  servicePrice: number;
  walletBalance: number;
  isProcessing: boolean;
  reviewDetails?: ServiceReviewItem[];
  title?: string;
  subtitle?: string;
  actionButtonText?: string;
  processingText?: string;
  turnaroundNote?: string;
}

export const VerificationSecurityModal: React.FC<VerificationSecurityModalProps> = (props) => {
  return <ServiceAuthorizationModal {...props} />;
};

export default VerificationSecurityModal;
