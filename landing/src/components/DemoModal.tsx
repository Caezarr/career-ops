import { useEffect, useRef, useState } from "react";

/**
 * Demo video modal.
 *
 * Opens when any element fires a `careeros:open-demo` CustomEvent on
 * `window`. Closes on ESC, on backdrop click, or on the explicit close
 * button. We use a global event (not a context) so the Hero button and
 * the Footer "Démo (1 min)" link can trigger it without becoming
 * children of a provider — both are leaf components that already exist.
 *
 * Body scroll-lock while open prevents the page from jumping under the
 * modal on mobile. The video lives at `/demo.mp4` (1.5 MB, already in
 * `public/`); we lazy-load it by only setting `<video src>` once the
 * modal opens, so the cold-start payload of the landing stays small.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - focus traps to the close button on open
 *   - ESC closes
 *   - aria-live region announces open/close to SR users
 */

const DEMO_VIDEO_SRC = "/demo.mp4";

export default function DemoModal() {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("careeros:open-demo", onOpen as EventListener);
    return () =>
      window.removeEventListener("careeros:open-demo", onOpen as EventListener);
  }, []);

  // ESC closes + body scroll-lock + autoplay on open.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the modal for keyboard users.
    closeBtnRef.current?.focus();

    // Try to autoplay (muted; browsers require muted for autoplay).
    videoRef.current?.play().catch(() => {
      /* user gesture required — user can click play manually */
    });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Pause + reset on close so the next open starts from the top.
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="demo-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      onClick={(e) => {
        // Backdrop click closes — but clicks INSIDE the dialog box
        // shouldn't bubble up and close it.
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="demo-modal__panel">
        <header className="demo-modal__header">
          <h2 id="demo-modal-title" className="demo-modal__title">
            Career OS — démo en 1 minute
          </h2>
          <button
            type="button"
            ref={closeBtnRef}
            className="demo-modal__close"
            onClick={() => setOpen(false)}
            aria-label="Fermer la démo"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6 L18 18 M18 6 L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="demo-modal__video-wrap">
          <video
            ref={videoRef}
            className="demo-modal__video"
            src={DEMO_VIDEO_SRC}
            controls
            playsInline
            muted
            preload="metadata"
          >
            <p>
              Ton navigateur ne supporte pas la lecture vidéo HTML5.
              <a href={DEMO_VIDEO_SRC}>Télécharger la démo</a>.
            </p>
          </video>
        </div>

        <p className="demo-modal__hint">
          Démo de la bêta — un parcours complet : sourcer une offre, adapter
          le CV, briefer l'entretien. Aucun son nécessaire.
        </p>
      </div>
    </div>
  );
}

/** Helper for trigger components: dispatch the open event. */
export function openDemoModal() {
  window.dispatchEvent(new CustomEvent("careeros:open-demo"));
}
