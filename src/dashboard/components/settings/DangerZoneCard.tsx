import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from '../../primitives';

export default function DangerZoneCard() {
  const toast = useToast();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (step === 0) setConfirmText('');
  }, [step]);

  function start() {
    setStep(1);
  }
  function close() {
    setStep(0);
  }

  return (
    <section
      className="settings-card settings-danger"
      aria-labelledby="settings-danger-title"
    >
      <div className="settings-danger__left">
        <div className="settings-danger__icon" aria-hidden="true">
          <AlertTriangle size={20} strokeWidth={2} />
        </div>
        <div className="settings-danger__text">
          <h2 id="settings-danger-title" className="settings-danger__title">
            Danger zone
          </h2>
          <p className="settings-danger__copy">
            Permanently delete your account and all of your data. This action cannot be undone.
          </p>
        </div>
      </div>
      <button type="button" className="settings-danger__btn" onClick={start}>
        Delete account
      </button>

      <Modal open={step !== 0} onClose={close} size="sm" ariaLabel="Delete account">
        {step === 1 && (
          <>
            <ModalHeader
              title="Are you sure?"
              subtitle="This will delete your CVs, applications, prep history and all account data."
              onClose={close}
            />
            <ModalBody>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                You won't be able to recover anything. We strongly recommend exporting your
                data first.
              </p>
            </ModalBody>
            <ModalFooter>
              <button type="button" className="ds-btn ds-btn--secondary" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="ds-btn ds-btn--danger"
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </ModalFooter>
          </>
        )}
        {step === 2 && (
          <>
            <ModalHeader
              title="Type DELETE to confirm"
              subtitle="Final step before we permanently delete your account."
              onClose={close}
            />
            <ModalBody>
              <input
                type="text"
                className="ds-shared-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                autoFocus
              />
            </ModalBody>
            <ModalFooter>
              <button type="button" className="ds-btn ds-btn--secondary" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="ds-btn ds-btn--danger"
                disabled={confirmText !== 'DELETE'}
                onClick={() => {
                  toast.warning('Account deletion is disabled in the MVP');
                  close();
                }}
              >
                Delete account
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </section>
  );
}
