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

/**
 * Sentinel value the Rust backend recognises as "use the native
 * macOS Core Audio Tap" (Phase 2). When `loopback_device` is set
 * to this, the dual-capture and live-session pipelines route the
 * loopback through `audio_tap.rs` instead of opening a cpal input
 * device, so beta users no longer need BlackHole installed.
 * MUST match `audio::SYSTEM_AUDIO_TAP_SENTINEL` in the backend.
 */
export const SYSTEM_AUDIO_TAP_SENTINEL = 'system-audio-tap';

const DEFAULT_SNAPSHOT: CopilotConfigSnapshot = {
  anthropicKey: '',
  assemblyaiKey: '',
  openaiKey: '',
  model: '',
  audioDevice: '',
  // Phase 2: default to the Core Audio Tap. Pre-Phase-2 users who
  // have an explicit cpal device name persisted in `ic-config`
  // (e.g. "BlackHole 2ch") will see that value win below because
  // `pickStr('loopback_device')` overrides this default when the
  // localStorage key is set.
  loopbackDevice: SYSTEM_AUDIO_TAP_SENTINEL,
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

  // Phase 2: an empty `loopback_device` in localStorage means the
  // user has never explicitly chosen one — they get the Core Audio
  // Tap default. A non-empty value (e.g. "BlackHole 2ch") wins so
  // legacy installs keep working without a settings migration.
  const storedLoopback = pickStr('loopback_device');
  return {
    anthropicKey: cacheReadAnthropic(),
    openaiKey: cacheReadOpenai(),
    assemblyaiKey: cacheReadAssembly(),
    model: normalizeModelId(pickStr('model')),
    audioDevice: pickStr('audio_device'),
    loopbackDevice: storedLoopback || SYSTEM_AUDIO_TAP_SENTINEL,
    persona,
    cv: pickStr('cv'),
    jd: pickStr('jd'),
  };
}

/**
 * Map the human-readable model labels the `ModelStatusBar` dropdown
 * persists (e.g. "Claude Sonnet 4.5") to the canonical Anthropic
 * model IDs (e.g. "claude-sonnet-4-5") that the Rust backend +
 * Worker proxy forward to Anthropic's API. Anything Anthropic does
 * not recognise comes back as a 404 `not_found_error: model: <X>`.
 *
 * Backwards-compatible: if the stored value is already a wire ID
 * (lowercase + dashes) or empty, it's passed through untouched.
 * Unknown labels fall through unchanged so a future model added to
 * the dropdown still gets to Anthropic for diagnosis.
 */
function normalizeModelId(label: string): string {
  if (!label) return '';
  // Cheap "already a wire ID" check — wire IDs are lowercase + dashes,
  // labels contain spaces or capitals.
  if (!/[A-Z\s]/.test(label)) return label;
  const map: Record<string, string> = {
    'Claude Sonnet 4.5': 'claude-sonnet-4-5',
    'Claude Opus 4.1': 'claude-opus-4-1',
    'Claude Haiku 4.5': 'claude-haiku-4-5',
    'GPT-4o': 'gpt-4o',
  };
  return map[label] ?? label;
}
