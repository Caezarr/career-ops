import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { getBuiltinSources } from "../lib/ingest";

/**
 * Idempotently seed `ingestSources` from the curated `BUILTIN_SOURCES`
 * list shipped in Rust on first launch. Once the user has any source
 * configured, we never overwrite — that's how custom slugs / disabled
 * defaults survive.
 *
 * Mounted once per dashboard window (see DashboardApp).
 */
export function useSeedIngestSources(): void {
  const ingestSources = useAppStore((s) => s.ingestSources);
  const seedIngestSources = useAppStore((s) => s.seedIngestSources);
  const ranRef = useRef(false);

  useEffect(() => {
    // Already configured (existing user, or seed already ran in a
    // previous render) — nothing to do.
    if (ingestSources.length > 0) return;
    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const builtin = await getBuiltinSources();
        if (!cancelled) seedIngestSources(builtin);
      } catch (e) {
        // Non-fatal — runIngestAll falls back to the Rust BUILTIN list
        // when the store is empty, so the app still works.
        console.warn("Failed to seed BUILTIN ingest sources:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We deliberately depend on `ingestSources.length` only — once
    // seeded we never re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingestSources.length]);
}
