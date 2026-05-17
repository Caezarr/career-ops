# FRONTEND_TODO — Sprint 1.3 `interviewer-utterance` listener

> Sandbox blocked the agent from writing files inside `src/` during
> the Sprint 1 run (the writable working directories were limited to
> `src-tauri/`, `remotion/`, `.planning/`, and `/tmp`). Parking this
> diff here for the maintainer to apply.
>
> Without this listener, the frontend transcript pane will stay empty
> during a live Copilot session even though the Rust side is happily
> producing utterances + the debouncer is firing Claude. The legacy
> `transcript` event listener is still registered but no longer fired
> from the live-session path (only from legacy `start_capture`).

## File

`src/dashboard/hooks/useCopilotSession.ts`

## Change

Replace the existing `transcript` listener block (~line 109-121) with
the snippet below. Adds a new `interviewer-utterance` listener that
routes through the same `applyTranscriptDelta` store action as the
legacy `transcript` event did — every utterance is self-contained, so
we apply it as `final: true` (no partial-merge needed). The legacy
listener stays registered for the BYOK `start_capture` one-shot flow.

```ts
// Sprint 1.3 (2026-05-17): the interviewer transcript pipeline is
// now VAD → HTTP STT, which emits ONE `interviewer-utterance`
// event per utterance (silence boundary) instead of the legacy
// per-partial `transcript` stream. The shape grew a `ts` and a
// `duration_ms` field for UI badges; text routing is otherwise
// identical — apply as a `final: true` delta (every utterance is
// self-contained, no partials to merge).
//
// The legacy `transcript` listener stays registered for the BYOK
// one-shot `start_capture` flow — the live Copilot session no
// longer fires it.
track(
  listen<{ text: string; ts: number; duration_ms: number }>(
    'interviewer-utterance',
    (e) => {
      applyTranscriptDelta({ text: e.payload.text, final: true });
      // A new utterance wipes the previous in-flight answer.
      clearPendingAnswer();
    },
  ),
);

track(
  listen<{ text: string; final: boolean }>('transcript', (e) => {
    // Legacy partial-stream path — kept for non-Copilot call sites
    // (BYOK `start_capture` one-shot recorder). Sprint 1.3 stripped
    // the live-session emitter.
    applyTranscriptDelta(e.payload);
    clearPendingAnswer();
  }),
);
```

## TS build

After applying:

```
cd /Users/gabriel/Desktop/Wonka/code/interview-copilot
./node_modules/.bin/tsc -b --force
```

should exit 0. The `interviewer-utterance` event type is inferred
inline; no shared types module update is required.

## Optional follow-up

If the maintainer wants the per-utterance latency badge in the
transcript bubble, plumb `ts` and `duration_ms` through to
`commitPendingTranscript` (currently it stamps `at: Date.now()` —
swap to the payload `ts` for cross-boundary timing consistency).
