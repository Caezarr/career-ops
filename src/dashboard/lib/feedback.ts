import { getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { open as openPath } from '@tauri-apps/plugin-shell';

/** Email the bug reports land in. Beta phase: direct to the
 *  founder's inbox so nothing falls through the cracks. Move to
 *  a Linear webhook / dedicated forwarder once the volume crosses
 *  ~5 reports/day. */
const FEEDBACK_EMAIL = 'gabranpro@gmail.com';

export type FeedbackSeverity = 'crash' | 'bug' | 'idea' | 'praise';

export interface FeedbackPayload {
  severity: FeedbackSeverity;
  /** Short summary the user types in. Used as email subject. */
  title: string;
  /** Free-form description of what happened. */
  description: string;
  /** Optional reproduction steps. */
  steps?: string;
  /** Page the user was on when they hit Report. */
  page: string;
  /** App version captured from Tauri. */
  appVersion: string;
  /** Tauri runtime version. */
  tauriVersion: string;
  /** navigator.userAgent — useful to spot WebKit-only bugs. */
  userAgent: string;
  /** When the report was authored (ISO). */
  capturedAt: string;
}

/** Best-effort capture of the runtime context. Falls back to "unknown"
 *  for fields that fail (e.g. when running outside Tauri during dev
 *  without the desktop wrapper). The user never sees a hard error from
 *  the diagnostics step — we'd rather ship an incomplete report than
 *  block the user from sending one. */
export async function captureDiagnostics(page: string): Promise<{
  appVersion: string;
  tauriVersion: string;
  userAgent: string;
  page: string;
  capturedAt: string;
}> {
  const [appVersion, tauriVersion] = await Promise.all([
    getVersion().catch(() => 'unknown'),
    getTauriVersion().catch(() => 'unknown'),
  ]);
  return {
    appVersion,
    tauriVersion,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    page,
    capturedAt: new Date().toISOString(),
  };
}

/** Format the payload as a plain-text body that reads well both in an
 *  email client and pasted into a Linear / GitHub issue. */
export function formatFeedbackBody(p: FeedbackPayload): string {
  const lines: string[] = [];
  lines.push(`Severity: ${p.severity}`);
  lines.push('');
  lines.push('## What happened');
  lines.push(p.description.trim() || '(no description)');
  if (p.steps?.trim()) {
    lines.push('');
    lines.push('## Steps to reproduce');
    lines.push(p.steps.trim());
  }
  lines.push('');
  lines.push('---');
  lines.push('## Diagnostics');
  lines.push(`- Page: ${p.page}`);
  lines.push(`- App version: ${p.appVersion}`);
  lines.push(`- Tauri runtime: ${p.tauriVersion}`);
  lines.push(`- Captured at: ${p.capturedAt}`);
  lines.push(`- User agent: ${p.userAgent}`);
  return lines.join('\n');
}

const SEVERITY_PREFIX: Record<FeedbackSeverity, string> = {
  crash: '[CRASH]',
  bug: '[BUG]',
  idea: '[IDEA]',
  praise: '[PRAISE]',
};

/** Best-effort copy-to-clipboard. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Submit a feedback report. Today this is dual-channel: copy the full
 *  formatted body to the clipboard AND open the user's email client to
 *  the founder's inbox (cf. FEEDBACK_EMAIL) with the subject pre-filled
 *  and the body duplicated as best-effort (some mail clients drop long
 *  mailto bodies, hence the clipboard belt-and-braces). */
export async function submitFeedback(p: FeedbackPayload): Promise<{
  copied: boolean;
  mailOpened: boolean;
}> {
  const body = formatFeedbackBody(p);
  const copied = await copyToClipboard(body);
  const subject = `${SEVERITY_PREFIX[p.severity]} ${p.title || '(untitled)'}`;
  const mailto =
    `mailto:${FEEDBACK_EMAIL}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
  let mailOpened = true;
  try {
    await openPath(mailto);
  } catch {
    mailOpened = false;
  }
  return { copied, mailOpened };
}
