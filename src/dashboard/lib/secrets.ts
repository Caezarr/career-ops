/**
 * Frontend bridge for the Keychain-backed secret store
 * (Sprint 1 PR-B). Mirrors `src-tauri/src/secrets.rs`.
 *
 * Why a bridge module + in-memory cache rather than direct invokes
 * everywhere?
 *
 * 1. Existing call-sites (`runAnalyzer.ts`, `AnalyzeMatchModal.tsx`,
 *    `useCopilotSession.ts`, `ConfigurationPanel.tsx`) expect a sync
 *    `readAnthropicKey()` — they were written against localStorage.
 *    Forcing them all to async would be a much bigger blast radius
 *    than the security fix actually requires.
 * 2. Hydrating once at app boot lets us run a one-time migration
 *    that lifts existing keys out of `ic-config` (localStorage) and
 *    into the Keychain, then scrubs them from localStorage so they
 *    never leak again.
 * 3. The cache is process-scoped (re-hydrated every reload), so a
 *    compromised webview at runtime can only steal what's already
 *    been read this session — same blast radius as before.
 *
 * SLOT names match the backend's `parse_slot()` whitelist exactly.
 */

import { invoke } from '@tauri-apps/api/core';

export type SecretSlot =
  | 'anthropic_key'
  | 'openai_key'
  | 'assemblyai_key'
  | 'deepgram_key';

const SLOTS: readonly SecretSlot[] = [
  'anthropic_key',
  'openai_key',
  'assemblyai_key',
  'deepgram_key',
] as const;

/** Process-scoped cache. Empty string = "not set" (matches the
 *  CaptureConfig contract — backend treats empty as missing). */
const CACHE: Record<SecretSlot, string> = {
  anthropic_key: '',
  openai_key: '',
  assemblyai_key: '',
  deepgram_key: '',
};

let HYDRATED = false;

/** True once `hydrateSecrets()` has resolved at least once. Used by
 *  defensive callers that want to know whether `readSecret()` is
 *  authoritative or still cold. */
export function isHydrated(): boolean {
  return HYDRATED;
}

/** Sync read from cache. Returns '' before hydration completes. */
export function readSecret(slot: SecretSlot): string {
  return CACHE[slot] ?? '';
}

/** Convenience accessors used by the React hooks layer. */
export const readAnthropicKey = () => readSecret('anthropic_key');
export const readOpenaiKey = () => readSecret('openai_key');
export const readAssemblyaiKey = () => readSecret('assemblyai_key');
export const readDeepgramKey = () => readSecret('deepgram_key');

/** Persist + update cache. Empty string deletes the slot. */
export async function writeSecret(slot: SecretSlot, value: string): Promise<void> {
  const trimmed = value.trim();
  await invoke('secrets_set', { name: slot, value: trimmed });
  CACHE[slot] = trimmed;
  // Belt-and-braces: also strip the field from any `ic-config` blob
  // still hanging around from before the migration shipped.
  scrubFromLocalStorage(slot);
}

/** Boot-time hydration. Run once from the app entry point before
 *  the first read happens. Idempotent — subsequent calls are no-ops
 *  unless `force` is set (used by tests / dev refresh). */
export async function hydrateSecrets({ force = false } = {}): Promise<void> {
  if (HYDRATED && !force) return;

  // Step 1: pull whatever is already in the Keychain.
  await Promise.all(
    SLOTS.map(async (slot) => {
      try {
        const v = await invoke<string | null>('secrets_get', { name: slot });
        if (typeof v === 'string') CACHE[slot] = v;
      } catch (e) {
        // Surface the failure so dev-mode users notice (a denied
        // Keychain prompt looks like an empty cache otherwise) but
        // don't throw — empty cache is a recoverable state.
        // eslint-disable-next-line no-console
        console.warn(`[secrets] hydrate ${slot} failed:`, e);
      }
    }),
  );

  // Step 2: one-time migration. For every slot still empty in the
  // cache, look in `ic-config.localStorage` — if a value is there,
  // promote it to the Keychain then scrub the localStorage copy.
  await migrateFromLocalStorage();

  HYDRATED = true;
}

/** Read each missing slot from `ic-config`, write to Keychain,
 *  then strip the field from the localStorage blob. */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem('ic-config');
  if (!raw) return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }

  let dirty = false;

  for (const slot of SLOTS) {
    const candidate = typeof parsed[slot] === 'string' ? (parsed[slot] as string).trim() : '';
    if (!candidate) continue;
    if (CACHE[slot]) {
      // Keychain wins — just drop the stale localStorage copy.
      delete parsed[slot];
      dirty = true;
      continue;
    }
    try {
      await invoke('secrets_set', { name: slot, value: candidate });
      CACHE[slot] = candidate;
      delete parsed[slot];
      dirty = true;
      // eslint-disable-next-line no-console
      console.info(`[secrets] migrated ${slot} from localStorage → Keychain`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[secrets] migrate ${slot} failed; leaving in localStorage:`, e);
    }
  }

  if (dirty) {
    window.localStorage.setItem('ic-config', JSON.stringify(parsed));
  }
}

/** Strip a single secret field from the persisted `ic-config` blob. */
function scrubFromLocalStorage(slot: SecretSlot): void {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem('ic-config');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (slot in parsed) {
      delete parsed[slot];
      window.localStorage.setItem('ic-config', JSON.stringify(parsed));
    }
  } catch {
    /* leave it alone */
  }
}
