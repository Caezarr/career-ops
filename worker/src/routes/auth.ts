import { Hono } from "hono";
import { signJwt } from "../lib/jwt";
import { sendMagicLinkEmail, LoopsError } from "../lib/email";
import {
  consumeMagicLink,
  createMagicLink,
  touchLastLogin,
  upsertUserByEmail,
} from "../lib/db";
import { randomMagicLinkToken, uuidv4 } from "../lib/token";
import type { Env, JwtPayload } from "../types";

/**
 * Auth flow — magic link only (no OAuth providers in Phase 1).
 *
 *   POST /auth/request          — body: { email }. Creates a magic
 *                                  link, emails it. Always 200 to
 *                                  avoid email-enumeration leaks.
 *   GET  /auth/verify?token=…   — clicked from the email. Marks the
 *                                  link consumed, signs a JWT, and
 *                                  302-redirects the browser to the
 *                                  app's deep link with the JWT in
 *                                  the fragment. Tauri picks it up
 *                                  via the registered URL scheme.
 *
 * Anti-bot: the magic link IS the anti-bot. A bot that submits
 * a random email will never see the verification link, so it
 * can't complete the flow. We additionally rate-limit per IP at
 * the Cloudflare edge (configure in dashboard).
 */

export const authRoutes = new Hono<{ Bindings: Env }>();

// ── POST /auth/request ────────────────────────────────────────────────

authRoutes.post("/request", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    email?: unknown;
  };
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  if (!emailRaw || !isValidEmail(emailRaw)) {
    // Non-revealing — same shape as success.
    return c.json({ ok: true });
  }
  const emailLower = emailRaw.toLowerCase();
  const now = Date.now();
  const ttlMs = parseInt(c.env.MAGIC_LINK_TTL_SECONDS, 10) * 1000;
  const expiresAt = now + ttlMs;

  // Upsert user + mint token + insert magic_link.
  const newUserId = uuidv4();
  const user = await upsertUserByEmail(c.env.DB, {
    id: newUserId,
    email: emailRaw,
    emailLower,
    nowMs: now,
  });

  const token = randomMagicLinkToken();
  await createMagicLink(c.env.DB, {
    token,
    userId: user.id,
    emailLower,
    nowMs: now,
    expiresAtMs: expiresAt,
  });

  const magicLink = `${c.env.WEB_BASE_URL}/auth/verify?token=${token}`;

  // Dev-only escape hatch: when no real Loops key is configured
  // (we're in `pnpm dev` with `.dev.vars` placeholder values), log
  // the magic link to the worker console so the developer can
  // copy-paste it into their browser. The "dev-noop" / empty
  // string sentinel keeps prod safe — Cloudflare secrets are
  // always real strings, never "dev-noop".
  const isDevNoop =
    !c.env.LOOPS_API_KEY ||
    c.env.LOOPS_API_KEY === "dev-noop" ||
    c.env.LOOPS_API_KEY.startsWith("dev-");

  if (isDevNoop) {
    // Loud, copy-pasteable. Open the worker terminal during dev,
    // paste this URL into your browser → /auth/verify hands the
    // app a JWT via the careeros:// deep link.
    console.log(
      `\n[auth/request] DEV mode (no Loops) — magic link for ${emailRaw}:\n  ${magicLink}\n`,
    );
  } else {
    try {
      await sendMagicLinkEmail({
        apiKey: c.env.LOOPS_API_KEY,
        templateId: c.env.LOOPS_TRANSACTIONAL_ID,
        email: emailRaw,
        magicLink,
      });
    } catch (err) {
      const status = err instanceof LoopsError ? err.status : 0;
      console.error(
        `auth/request: send failed (loops status=${status}) for user=${user.id}`,
      );
      // Still return 200 — never reveal email enumeration via error
      // shape. The user will retry if they don't see the email.
    }
  }

  return c.json({ ok: true });
});

// ── GET /auth/verify ──────────────────────────────────────────────────

authRoutes.get("/verify", async (c) => {
  const token = c.req.query("token") ?? "";
  if (!token) {
    return c.html(errorPageHtml("Lien invalide."), 400);
  }

  const now = Date.now();
  const link = await consumeMagicLink(c.env.DB, token, now);
  if (!link) {
    return c.html(
      errorPageHtml(
        "Lien expiré ou déjà utilisé. Demande un nouveau lien depuis l'app.",
      ),
      400,
    );
  }

  await touchLastLogin(c.env.DB, link.user_id, now);

  // Sign JWT.
  const ttlSec = parseInt(c.env.JWT_TTL_SECONDS, 10);
  const nowSec = Math.floor(now / 1000);
  const payload: JwtPayload = {
    sub: link.user_id,
    email: link.email_lower,
    iat: nowSec,
    exp: nowSec + ttlSec,
  };
  const jwt = await signJwt(payload, c.env.JWT_SECRET);

  // Redirect to the app's deep link. The JWT lives in the FRAGMENT
  // (after the `#`) so it doesn't hit the Worker logs / browser
  // history as a query string. Tauri's deep-link handler parses
  // the fragment client-side.
  const redirectUrl = `${c.env.APP_DEEP_LINK}#jwt=${encodeURIComponent(jwt)}`;

  // Dev escape hatch: in `pnpm tauri dev`, macOS routes
  // `careeros://` to the bundled release app (not the running
  // debug binary), so the deep-link round-trip can't reach the
  // dev instance. The page below shows the raw JWT with a
  // "Copier" button so the developer can paste it via the dev
  // input in Settings → Account. Production never hits this
  // branch — `LOOPS_API_KEY` always has a real value there.
  const isDevNoop =
    !c.env.LOOPS_API_KEY ||
    c.env.LOOPS_API_KEY === "dev-noop" ||
    c.env.LOOPS_API_KEY.startsWith("dev-");
  if (isDevNoop) {
    return c.html(devVerifyHtml(jwt, redirectUrl));
  }

  // We send a tiny HTML page that does the redirect via JS. A 302
  // to a custom URL scheme works on macOS Safari but some browsers
  // strip the location header on schemes they don't recognise; the
  // explicit `<meta>` + button fallback is more reliable.
  return c.html(redirectHtml(redirectUrl));
});

// ── helpers ───────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function errorPageHtml(msg: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Career OS — Auth</title>
<style>body{font:16px/1.6 system-ui,-apple-system,sans-serif;background:#0A0B0F;color:#F4F5F8;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.box{max-width:420px;text-align:center;padding:32px;border:1px solid #21232C;border-radius:14px;background:#16181F}
h1{font-size:18px;margin:0 0 12px;letter-spacing:-0.01em}
p{margin:0;color:#B8BAC4}</style></head>
<body><div class="box"><h1>Lien invalide</h1><p>${escapeHtml(msg)}</p></div></body>
</html>`;
}

/** Dev-only landing for /auth/verify when LOOPS_API_KEY is the
 *  "dev-noop" sentinel. macOS routes `careeros://` to the
 *  bundled release app (not the running `pnpm tauri dev`
 *  instance), so the deep-link round-trip can't reach the dev
 *  process. We display the raw JWT with a Copier button so the
 *  developer can paste it via Settings → Account → "Coller un
 *  JWT (dev)". */
function devVerifyHtml(jwt: string, redirectUrl: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Career OS — Dev sign-in</title>
<style>body{font:14px/1.6 system-ui,-apple-system,sans-serif;background:#0A0B0F;color:#F4F5F8;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.box{max-width:560px;width:100%;padding:32px;border:1px solid #21232C;border-radius:14px;background:#16181F}
h1{font-size:18px;margin:0 0 6px;letter-spacing:-0.01em}
.tag{display:inline-block;font-size:11px;font-weight:600;color:#fcd34d;background:rgba(252,211,77,0.12);padding:2px 8px;border-radius:999px;margin-bottom:12px}
p{margin:0 0 14px;color:#B8BAC4;font-size:13px}
ol{margin:0 0 18px;padding-left:18px;color:#B8BAC4;font-size:13px;line-height:1.7}
.jwt{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:#0A0B0F;border:1px solid #21232C;border-radius:8px;padding:10px;margin:0 0 12px;word-break:break-all;color:#F4F5F8}
.row{display:flex;gap:8px;flex-wrap:wrap}
button,a.btn{font:inherit;font-size:13px;font-weight:600;padding:9px 14px;border-radius:8px;border:1px solid #21232C;background:#16181F;color:#F4F5F8;cursor:pointer;text-decoration:none;display:inline-block}
button.primary{background:#6366f1;border-color:#6366f1;color:#fff}
.ok{color:#22c55e;font-weight:600;display:none}</style></head>
<body><div class="box">
<span class="tag">DEV mode</span>
<h1>Authentification réussie</h1>
<p>macOS route les liens <code>careeros://</code> vers la version bundle, pas la version dev. En attendant, copie le JWT et colle-le dans l'app : <strong>Settings → Account → Coller un JWT (dev)</strong>.</p>
<div class="jwt" id="jwt">${escapeHtml(jwt)}</div>
<div class="row">
  <button class="primary" onclick="copyJwt()">Copier le JWT</button>
  <a class="btn" href="${escapeAttr(redirectUrl)}">Tenter le deep-link quand même</a>
</div>
<span class="ok" id="ok">✅ Copié — colle dans Settings → Account</span>
</div>
<script>
function copyJwt() {
  const jwt = ${JSON.stringify(jwt)};
  navigator.clipboard.writeText(jwt).then(() => {
    document.getElementById("ok").style.display = "inline-block";
  });
}
</script>
</body></html>`;
}

function redirectHtml(target: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Career OS</title>
<meta http-equiv="refresh" content="0;url=${escapeAttr(target)}">
<style>body{font:16px/1.6 system-ui,-apple-system,sans-serif;background:#0A0B0F;color:#F4F5F8;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.box{max-width:420px;text-align:center;padding:32px;border:1px solid #21232C;border-radius:14px;background:#16181F}
h1{font-size:18px;margin:0 0 12px;letter-spacing:-0.01em}
p{margin:0 0 18px;color:#B8BAC4}
a{display:inline-block;padding:10px 18px;background:#6366f1;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px}</style></head>
<body><div class="box"><h1>Connexion réussie</h1>
<p>Career OS s'ouvre dans un instant. Si rien ne se passe, clique ci-dessous.</p>
<a href="${escapeAttr(target)}">Ouvrir Career OS</a></div>
<script>window.location.href = ${JSON.stringify(target)};</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

function escapeAttr(s: string): string {
  return s.replace(/[<>"']/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === '"'
          ? "&quot;"
          : "&#39;",
  );
}
