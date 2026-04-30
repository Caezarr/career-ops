/**
 * Reads the Anthropic API key from the same localStorage slot the Copilot
 * overlay uses (`ic-config`). Returns the key string or null if unset.
 *
 * Future: migrate to macOS Keychain via the `keyring` crate (see Sprint 7).
 */
export function readAnthropicKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('ic-config');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { anthropic_key?: string };
    const key = parsed.anthropic_key?.trim();
    return key && key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

/** Same for the model preference (optional). */
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

/** Shape we read out of `ic-config`. Mirrors the overlay's `Config`
 *  so a future migration to a real keychain doesn't break either side.
 *  Every field is optional because the overlay tolerates missing keys
 *  and we want the same behaviour here. */
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

/** Read the entire copilot config blob in one go. Used by
 *  useCopilotSession() when it builds a CaptureConfig. */
export function readCopilotConfig(): CopilotConfigSnapshot {
  if (typeof window === 'undefined') return DEFAULT_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem('ic-config');
    if (!raw) return DEFAULT_SNAPSHOT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const pick = (k: string): string => {
      const v = parsed[k];
      return typeof v === 'string' ? v : '';
    };
    const persona = (parsed.persona as CopilotConfigSnapshot['persona']) ?? 'finance';
    return {
      anthropicKey: pick('anthropic_key'),
      assemblyaiKey: pick('assemblyai_key'),
      openaiKey: pick('openai_key'),
      model: pick('model'),
      audioDevice: pick('audio_device'),
      loopbackDevice: pick('loopback_device'),
      persona,
      cv: pick('cv'),
      jd: pick('jd'),
    };
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}
