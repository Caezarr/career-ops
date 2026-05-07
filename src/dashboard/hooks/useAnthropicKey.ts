/**
 * Sync accessors over the Keychain-backed secrets cache.
 *
 * Sprint 1 PR-B moved API keys out of `localStorage.ic-config` into
 * the macOS Keychain (`src-tauri/src/secrets.rs`). The cache layer
 * (`../lib/secrets.ts`) keeps these accessors synchronous so the
 * existing call-sites — `runAnalyzer.ts`, `AnalyzeMatchModal.tsx`,
 * `useCopilotSession.ts`, `ConfigurationPanel.tsx` — don't need to
 * become async (which would balloon the diff far past the security
 * fix).
 *
 * The cache is hydrated once at app boot via
 * `hydrateSecrets()` in `src/dashboard/main.tsx`. Before hydration
 * resolves these readers return null / empty — the consumers all
 * already handle that state ("Configure your Anthropic API key
 * first" toasts, etc.).
 */

import {
  readAnthropicKey as cacheReadAnthropic,
  readOpenaiKey as cacheReadOpenai,
  readAssemblyaiKey as cacheReadAssembly,
} from '../lib/secrets';

/** Anthropic key, trimmed. `null` when unset. */
export function readAnthropicKey(): string | null {
  const v = cacheReadAnthropic();
  return v && v.length > 0 ? v : null;
}

/** Model preference still lives in `ic-config` — it's a UX pref,
 *  not a secret, so localStorage is the right home. */
export function readClaudeModel(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('ic-config');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { model?: string };
    const m = parsed.model?.trim();
    return m && m.length > 0 ? m : null;
  } catch {
    return null;
  }
}

/** Shape we expose to `useCopilotSession()` when it builds a
 *  `CaptureConfig`. Secrets come from the Keychain cache; the
 *  remaining UX prefs come from `ic-config` (model, audio device,
 *  persona, CV/JD blobs). */
export interface CopilotConfigSnapshot {
  anthropicKey: string;
  assemblyaiKey: string;
  openaiKey: string;
  model: string;
  audioDevice: string;
  loopbackDevice: string;
  persona: 'finance' | 'tech-ai' | 'consulting';
  cv: string;
  jd: string;
}

const DEFAULT_SNAPSHOT: CopilotConfigSnapshot = {
  anthropicKey: '',
  assemblyaiKey: '',
  openaiKey: '',
  model: '',
  audioDevice: '',
  loopbackDevice: '',
  persona: 'finance',
  cv: '',
  jd: '',
};

/** Snapshot for `useCopilotSession()`. Secrets ← Keychain cache,
 *  rest ← `ic-config` localStorage. */
export function readCopilotConfig(): CopilotConfigSnapshot {
  if (typeof window === 'undefined') return DEFAULT_SNAPSHOT;

  let prefs: Record<string, unknown> = {};
  try {
    const raw = window.localStorage.getItem('ic-config');
    if (raw) prefs = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* fall through with empty prefs */
  }

  const pickStr = (k: string): string => {
    const v = prefs[k];
    return typeof v === 'string' ? v : '';
  };
  const persona =
    (prefs.persona as CopilotConfigSnapshot['persona']) ?? 'finance';

  return {
    anthropicKey: cacheReadAnthropic(),
    openaiKey: cacheReadOpenai(),
    assemblyaiKey: cacheReadAssembly(),
    model: pickStr('model'),
    audioDevice: pickStr('audio_device'),
    loopbackDevice: pickStr('loopback_device'),
    persona,
    cv: pickStr('cv'),
    jd: pickStr('jd'),
  };
}
