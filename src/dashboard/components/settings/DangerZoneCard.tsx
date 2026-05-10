import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, RotateCcw } from 'lucide-react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  useToast,
} from '../../primitives';
import { deleteAccount } from '../../lib/account';
import { useAppStore } from '../../store';

/**
 * Account-deletion flow. The Settings → Billing tab is the natural
 * home for it — destructive account-level action.
 *
 * Two-step: confirm intent → type DELETE → execute. Once we ship auth
 * + a /api/me endpoint, deleteAccount() will hit the server first, but
 * the UI flow stays identical.
 */
export default function DangerZoneCard() {
  const toast = useToast();
  const updateUser = useAppStore((s) => s.updateUser);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const [resetting, setResetting] = useState(false);

  function resetOnboarding() {
    if (resetting) return;
    if (
      !window.confirm(
        'Re-run the onboarding wizard? Your profile data stays put — only the "completed" flag is cleared, so the wizard re-appears on next launch. Your saved CVs, applications, and prep history are untouched.',
      )
    ) {
      return;
    }
    setResetting(true);
    updateUser({
      onboarded: false,
      onboardingComplete: false,
      onboardingStep: 0,
    });
    toast.success('Onboarding will re-run', 'Reloading the app…');
    window.setTimeout(() => window.location.reload(), 600);
  }

  useEffect(() => {
    if (step === 0) {
      setConfirmText('');
      setWorking(false);
    }
  }, [step]);

  function start() {
    setStep(1);
  }
  function close() {
    if (working) return; // don't dismiss mid-deletion
    setStep(0);
  }

  async function executeDelete() {
    setWorking(true);
    try {
      await deleteAccount();
      // We won't actually reach this branch because deleteAccount() reloads
      // the window. The toast is here for the rare case where reload is
      // blocked (e.g. dev tools open with "preserve log").
      toast.success('Account data deleted', 'You will see a fresh state on next launch.');
    } catch (e) {
      setWorking(false);
      toast.error(
        'Could not delete account data',
        (e as Error).message ?? 'Try again, or contact support.',
      );
    }
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
            Permanently delete your account and all of its data — CVs,
            applications, prep history, ATS analyses, and preferences.
            This action cannot be undone.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="settings-btn settings-btn--outline"
          onClick={resetOnboarding}
          disabled={resetting}
          title="Re-run the first-launch onboarding wizard — useful when re-testing the flow. Doesn't delete any data."
        >
          <RotateCcw size={14} />
          <span>{resetting ? 'Reloading…' : 'Re-run onboarding'}</span>
        </button>
        <button type="button" className="settings-danger__btn" onClick={start}>
          <Trash2 size={14} />
          <span>Delete account</span>
        </button>
      </div>

      <Modal open={step !== 0} onClose={close} size="sm" ariaLabel="Delete account">
        {step === 1 && (
          <>
            <ModalHeader
              title="Delete your Career OS account?"
              subtitle="Everything below will be erased."
              onClose={close}
            />
            <ModalBody>
              <ul className="settings-danger-modal__list">
                <li>All saved CVs and optimized variants</li>
                <li>Every cached ATS analysis</li>
                <li>Applications, prep sessions, tasks, and history</li>
                <li>Profile, contact details, and the career narrative</li>
                <li>API keys, audio devices, and appearance preferences</li>
              </ul>
              <p className="settings-danger-modal__hint">
                Career OS is local-first today, so this deletes the data
                on this device. When account sync is enabled, your remote
                account will be deleted too — there is no recovery.
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
              subtitle="This is the last step before we erase your data."
              onClose={close}
            />
            <ModalBody>
              <p className="settings-danger-modal__hint" style={{ marginTop: 0 }}>
                Type the word <strong>DELETE</strong> below — case-sensitive — to enable the
                final button.
              </p>
              <input
                type="text"
                className="ds-shared-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                disabled={working}
              />
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                onClick={close}
                disabled={working}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ds-btn ds-btn--danger"
                disabled={confirmText !== 'DELETE' || working}
                onClick={executeDelete}
              >
                {working ? (
                  <>
                    <Loader2 size={14} className="settings-danger-modal__spin" />
                    <span style={{ marginLeft: 6 }}>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span style={{ marginLeft: 6 }}>Delete everything</span>
                  </>
                )}
              </button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </section>
  );
}
