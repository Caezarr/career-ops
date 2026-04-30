import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store';

const MIN_W = 380;
const MAX_W = 900;

/** Vertical drag handle that lives on the left edge of the right preview panel.
 *  Drag horizontally to resize the panel; the new width is persisted in the
 *  store so it survives navigation + app restart.
 *
 *  We compute the new width as `viewportWidth - clientX` (the panel sits at
 *  the right edge of the window). Pointer events are captured on the handle
 *  so the drag works smoothly even when the cursor leaves the bar. */
export default function CvResizeHandle() {
  const setWidth = useAppStore((s) => s.setCvPreviewPanelWidth);
  const handleRef = useRef<HTMLButtonElement | null>(null);

  // Cleanup latest pointer handlers on unmount (defensive — drags release on pointerup).
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev: PointerEvent) {
      const next = window.innerWidth - ev.clientX;
      const clamped = Math.max(MIN_W, Math.min(MAX_W, next));
      setWidth(clamped);
    }
    function onUp(ev: PointerEvent) {
      target.releasePointerCapture(ev.pointerId);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    }
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    // Keyboard accessibility: arrow keys nudge the width.
    const cur = useAppStore.getState().cvPreviewPanelWidth;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setWidth(cur + 16);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setWidth(cur - 16);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setWidth(MIN_W);
    } else if (e.key === 'End') {
      e.preventDefault();
      setWidth(MAX_W);
    }
  }

  return (
    <button
      ref={handleRef}
      type="button"
      className="cv-resize-handle"
      aria-label="Resize CV preview panel"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className="cv-resize-handle__grip" aria-hidden="true" />
    </button>
  );
}
