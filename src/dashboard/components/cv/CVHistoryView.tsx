import { Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';

export default function CVHistoryView() {
  const setCvTab = useAppStore((s) => s.setCvTab);

  function jumpToTailoring() {
    setCvTab('manager');
    // Scroll to the workspace after the manager tab renders.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.querySelector('.cv-workspace');
        if (el && 'scrollIntoView' in el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  return (
    <section className="cv-history-empty" aria-label="Optimization history">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '64px 24px',
          textAlign: 'center',
          background: 'var(--bg-soft)',
          borderRadius: 14,
          border: '1px dashed var(--border)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--indigo-soft)',
            color: 'var(--indigo-text)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={20} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
          No optimization runs yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 360 }}>
          Generate a tailored variant from the Tailoring workspace to see its history here.
        </div>
        <button
          type="button"
          className="cv-workspace__btn cv-workspace__btn--primary"
          onClick={jumpToTailoring}
        >
          <Sparkles size={14} strokeWidth={2.2} />
          <span>Run your first optimization</span>
        </button>
      </div>
    </section>
  );
}
