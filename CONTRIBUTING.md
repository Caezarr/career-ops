# Contributing to career-ops

## Setup

```bash
pnpm install
```

Use the Node version in `.nvmrc`. App shell is Vite + Tauri; Remotion lives under `remotion/`; worker under `worker/`.

## Pull requests

- Keep PRs focused — one surface (app, worker, remotion, docs) when possible.
- Prefer conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Do not commit secrets, real CVs, or personal job-hunt data.
- Update `CHANGELOG.md` under `## Unreleased` for user-visible changes.
- Smoke-test the affected package before opening the PR.

## Security

Follow `SECURITY.md` for vulnerability reports — no public issues for security findings.
