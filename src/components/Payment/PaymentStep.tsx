import React from 'react';
import { ChildProfile, ArchetypeDefinition } from '../../types';
import { PaymentModal } from './PaymentModal';

interface PaymentStepProps {
  childProfile: ChildProfile;
  archetype: ArchetypeDefinition;
  onPaymentSuccess: () => void;
  onClose: () => void;
  accessToken: string | null;
  parentEmail: string;
  onEmailChange: (email: string) => void;
}

/**
 * Payment step. PaymentModal is rendered full-page (isOpen) — onClose returns
 * the user to the result step. The checkout itself uses a two-column layout
 * (form + sticky order summary) rather than a centred overlay dialog.
 */
export const PaymentStep: React.FC<PaymentStepProps> = ({
  childProfile,
  archetype,
  onPaymentSuccess,
  onClose,
  accessToken,
  parentEmail,
  onEmailChange
}) => {
  return (
    <PaymentModal
      isOpen={true}
      onClose={onClose}
      childProfile={childProfile}
      archetype={archetype}
      onPaymentSuccess={onPaymentSuccess}
      accessToken={accessToken}
      parentEmail={parentEmail}
      onEmailChange={onEmailChange}
    />
  );
};
