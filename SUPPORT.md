# Support

## Installation and Setup

### Beta Users (DMG)

Download the latest unsigned DMG from the [Releases page](https://github.com/Caezarr/career-ops/releases/latest).

1. Download `Career OS_x.y.z_aarch64.dmg`
2. Open it → drag **Career OS** into `Applications`
3. **First launch**: Gatekeeper blocks unsigned apps. **Right-click** on `Career OS.app` in Applications → **Open** → confirm in the dialog.
4. First window: click "Settings → Account" and connect via magic-link

> Why this workaround? Beta phase, zero-budget — no Apple Developer Program ($99/year) yet. App will be properly signed for production.

### Developers

See [README.md](README.md#-get-started) for prerequisites (macOS 13+, Rust, Node 20+, pnpm, Xcode CLI Tools).

For full verification checklist (Vite, Tauri, Remotion, Worker), see [VERIFY.md](VERIFY.md).

## Bugs and Feature Requests

File a [GitHub Issue](https://github.com/Caezarr/career-ops/issues). Include:
- macOS version
- App version (Help → About)
- Steps to reproduce
- Expected vs. actual behavior
- Whether the issue is in the Tauri app, landing page, or worker

## Questions and General Support

Best-effort only; no support SLA for this personal project.

For technical questions or escalation: **gabriel@meetwonka.com**

## Security Vulnerabilities

**Do not open a public issue for security findings.**

Use [GitHub Security Advisories](https://github.com/Caezarr/career-ops/security/advisories/new) or email **gabriel@meetwonka.com** directly.

See [SECURITY.md](SECURITY.md) for full security policy and reporting guidelines.
