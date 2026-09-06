# Security Policy

## Supported versions

Security fixes apply to the latest commit on `main`.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security findings.

Email **gabriel@meetwonka.com** with:
- a short description of the issue
- steps to reproduce
- impact assessment (what an attacker could do)
- any suggested fix

You should get an acknowledgement within a few business days. Please give us a reasonable window to patch before any public disclosure.

## Scope

Career-ops is a local-first Mac job-hunt app (Tauri + Vite + Remotion worker). High-value reports include:
- local data exposure (CV, notes, call coach context)
- unsafe IPC or shell invocation from the desktop shell
- dependency CVEs in the Electron/Tauri or worker stack
- anything that could leak session or microphone/camera context beyond the intended coach surface
