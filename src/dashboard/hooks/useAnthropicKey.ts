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
