/**
 * Auto-update check on app boot.
 *
 * Tauri's updater plugin exposes two commands the JS side calls
 * via `invoke('plugin:updater|<name>')`:
 *   - `check`                 — returns Some({version,...}) when an
 *                               update exists, None otherwise
 *   - `download_and_install`  — downloads the new bundle, verifies
 *                               its signature against the pubkey in
 *                               tauri.conf.json, swaps the binary,
 *                               and prompts a relaunch.
 *
 * The Worker endpoint (/v1/updates/:target/:arch/:current_version)
 * proxies GitHub Releases to produce the manifest. See
 * `worker/src/routes/updates.ts`.
 *
 * UX strategy: silent on launch, surface a single dismissable
 * toast when a new version is found. The user can ignore it (we
 * recheck on next launch) or click → triggers download + install.
 *
 * In dev mode (`pnpm tauri dev`) the plugin commands return errors
 * because the registered endpoint resolves to localhost; we
 * swallow them silently.
 */
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../primitives";

interface CheckResult {
  available?: boolean;
  version?: string;
  body?: string;
}

export function useAutoUpdate(): void {
  const toast = useToast();
  // Prevent double-firing under React strict-mode StrictMode in dev.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // The Tauri updater plugin commands are async — wrap so a
    // network/plugin failure never crashes the boot path.
    void (async () => {
      try {
        const res = await invoke<CheckResult | null>("plugin:updater|check");
        // Tauri returns either an object with `available: true` +
        // metadata, or null/undefined when nothing's pending.
        // (The exact shape varies slightly across plugin minor
        // versions; we read defensively.)
        if (!res || res.available !== true) return;
        const v = typeof res.version === "string" ? res.version : "";
        const notesPreview = (res.body ?? "")
          .split("\n")
          .slice(0, 2)
          .join(" ")
          .slice(0, 120);
        toast.info(
          `Mise à jour disponible — Career OS ${v}`,
          notesPreview || "Téléchargement en cours, l'app va redémarrer…",
        );
        // Auto-install — the plugin verifies the .sig against the
        // pubkey embedded in tauri.conf.json before swapping the
        // bundle, so an attacker who hijacks the Worker would need
        // both endpoints AND the signing key to push malicious
        // updates. Failure surfaces as an error toast.
        try {
          await invoke("plugin:updater|download_and_install");
          // The plugin relaunches the app on success — code past
          // this point typically doesn't run.
        } catch (installErr) {
          // eslint-disable-next-line no-console
          console.error("[updater] install failed:", installErr);
          toast.error(
            "Mise à jour impossible",
            installErr instanceof Error
              ? installErr.message
              : "Réessaye au prochain démarrage.",
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[updater] check failed:", e);
      }
    })();
    // Mount-once. Slice action references / toast are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
