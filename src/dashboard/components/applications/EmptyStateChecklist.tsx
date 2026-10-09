/** Empty-state checklist shown when the user has zero applications.
 *  Provides a clear first-week path: CV tailored → 3 apps logged
 *  → interview notes. Complements the longer guide in docs/GETTING-STARTED.md. */

export default function EmptyStateChecklist() {
  return (
    <div className="ds-empty" style={{ padding: 48, maxWidth: 480, margin: '0 auto' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-1)' }}>
        Your first week with Career OS
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.5 }}>
        No applications yet. Here's what to do in the next 15 minutes:
      </p>
      
      <ol
        style={{
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          fontSize: 13,
          color: 'var(--text-2)',
          lineHeight: 1.6,
          paddingLeft: 20,
        }}
      >
        <li>
          <strong style={{ color: 'var(--text-1)' }}>Upload and tailor your CV</strong>
          <br />
          Go to <strong>CV Manager</strong> → upload your master CV → let the ATS scanner
          identify weak spots. Tailor it for your first target role.
        </li>
        <li>
          <strong style={{ color: 'var(--text-1)' }}>Log 3 applications</strong>
          <br />
          Head to <strong>Jobs</strong> → paste job URLs from LinkedIn or company sites.
          Career OS will extract the JD and track each application's stage.
        </li>
        <li>
          <strong style={{ color: 'var(--text-1)' }}>Capture interview notes</strong>
          <br />
          Select a job → open its <strong>War Room</strong> → add notes after every call.
          The app will suggest next steps based on your activity.
        </li>
      </ol>

      <p
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          marginTop: 24,
          fontStyle: 'italic',
        }}
      >
        Bonus: Turn on <strong>Live Copilot</strong> in Settings when you have your first
        interview scheduled.
      </p>
    </div>
  );
}
