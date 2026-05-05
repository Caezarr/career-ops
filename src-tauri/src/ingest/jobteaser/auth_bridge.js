// Job Teaser auth bridge — runs inside the auth WebViewWindow.
//
// IMPORTANT — why this works the way it does:
//
// JT's session cookie is **HttpOnly** (Devise / Rails default). That
// means `document.cookie` cannot see it. Instead of trying to grep
// cookie names, we detect "logged in" via:
//   1. URL changing away from `/fr/users/sign_in`
//   2. A `fetch` to a candidate profile endpoint returning 200 with
//      JSON shaped like a user record (the browser sends HttpOnly
//      cookies automatically with `credentials: 'include'`)
//
// This bridge does NOT exfiltrate cookies. Cookies stay in the
// WebView's WebKit data store. The Rust scraper (JT-07) will run
// `fetch()` from inside this same WebView via injected JS, OR will
// use the persistent cookie store across launches if Tauri is
// configured with `data_directory`.

(() => {
  'use strict';

  console.log('[jobteaser-bridge] script loaded on', window.location.href);

  // We can't hard-code cookie names (HttpOnly anyway). We detect
  // post-auth via URL — once the user is OFF the login page, they're
  // either signed in OR mid-redirect. Then we confirm with /me fetches.
  const LOGIN_PATHS = [
    '/fr/users/sign_in',
    '/en/users/sign_in',
    '/users/sign_in',
  ];

  // Candidate profile endpoints. We try all of them in parallel and
  // use whichever returns something that looks like a user record.
  const PROFILE_ENDPOINTS = [
    '/api/v1/users/me',
    '/api/v2/users/me',
    '/api/users/me',
    '/api/me',
    '/api/v1/me',
    '/api/v2/me',
    '/fr/users/me.json',
    '/me.json',
    '/api/v1/profile',
    '/api/profile',
  ];

  // ── Status panel (visible in-page debug) ─────────────────────────
  const panel = document.createElement('div');
  panel.id = 'career-os-jt-panel';
  panel.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
    'padding:10px 14px;font:12px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;' +
    'background:#0f172a;color:#fff;display:flex;align-items:center;gap:10px;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.2);';
  const statusEl = document.createElement('span');
  statusEl.style.cssText = 'flex:1;';
  statusEl.textContent = 'Career OS · sign in normally. We\'ll capture once you finish.';
  const detailEl = document.createElement('span');
  detailEl.style.cssText = 'opacity:.6;font-size:11px;';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Capture now';
  btn.style.cssText =
    'background:#8b5cf6;color:#fff;border:none;padding:6px 12px;' +
    'border-radius:6px;cursor:pointer;font:inherit;font-weight:600;';
  panel.appendChild(statusEl);
  panel.appendChild(detailEl);
  panel.appendChild(btn);

  function setStatus(msg, detail, isError) {
    statusEl.textContent = 'Career OS · ' + msg;
    detailEl.textContent = detail || '';
    panel.style.background = isError ? '#dc2626' : '#0f172a';
    console.log('[jobteaser-bridge]', msg, detail || '');
  }

  // Inject panel as soon as <html> exists. We MAY load before <body>.
  function mountPanel() {
    if (panel.parentNode) return;
    if (document.body) {
      document.body.appendChild(panel);
    } else {
      // Wait for body
      const obs = new MutationObserver(() => {
        if (document.body) {
          document.body.appendChild(panel);
          obs.disconnect();
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: false });
    }
  }
  mountPanel();

  // ── Login state detection ────────────────────────────────────────
  function isOnLoginPage() {
    const p = window.location.pathname;
    return LOGIN_PATHS.some((path) => p === path || p.endsWith(path));
  }

  async function tryEndpoint(path) {
    try {
      const r = await fetch(path, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      console.log(`[jobteaser-bridge] ${path} → ${r.status}`);
      if (!r.ok) return null;
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        console.log(`[jobteaser-bridge] ${path} non-JSON content-type:`, ct);
        return null;
      }
      const j = await r.json();
      return { endpoint: path, json: j };
    } catch (e) {
      console.log(`[jobteaser-bridge] ${path} error:`, e && e.message);
      return null;
    }
  }

  async function findProfile() {
    for (const p of PROFILE_ENDPOINTS) {
      const r = await tryEndpoint(p);
      if (r) return r;
    }
    return null;
  }

  // Liberal field extraction — JT internal API shapes vary.
  function deriveProfile(envelope) {
    if (!envelope || !envelope.json) return null;
    const j = envelope.json;
    const root = j.user || j.data || j.result || j;
    const center =
      root.career_center ||
      root.school ||
      root.university ||
      root.affiliation ||
      root.organisation ||
      root.organization ||
      {};

    const career_center_slug =
      center.slug ||
      center.identifier ||
      center.code ||
      (center.id != null ? String(center.id) : null) ||
      // fallback: derive from URL host or visible login
      (window.location.hostname || '')
        .split('.')[0]
        .replace(/^www$/, '') ||
      'jobteaser';

    return {
      career_center_slug: String(career_center_slug || 'jobteaser').trim(),
      career_center_name:
        center.name ||
        center.display_name ||
        center.title ||
        root.school_name ||
        null,
      user_full_name:
        root.full_name ||
        [root.first_name, root.last_name].filter(Boolean).join(' ') ||
        root.name ||
        null,
    };
  }

  // ── Capture flow ─────────────────────────────────────────────────
  let captureInProgress = false;
  let captured = false;

  async function capture(viaButton) {
    if (captured || captureInProgress) return;
    captureInProgress = true;
    setStatus(
      viaButton ? 'manual capture…' : 'capturing your session…',
      window.location.pathname,
    );

    if (!window.__TAURI_INTERNALS__) {
      setStatus(
        '__TAURI_INTERNALS__ not available — IPC bridge not injected.',
        'Capability config issue — see capabilities/jobteaser.json.',
        true,
      );
      console.error('[jobteaser-bridge] no Tauri IPC bridge on this window');
      captureInProgress = false;
      return;
    }

    // Best-effort profile enrichment. If every endpoint 404s we
    // STILL commit the session — JT's profile API path isn't part
    // of the auth contract, just nice-to-have for labelling.
    const envelope = await findProfile();
    let profile = deriveProfile(envelope);

    if (!profile || !profile.career_center_slug) {
      // Fallback profile so we can commit anyway. The user can rename
      // the source in Settings once it appears.
      profile = {
        career_center_slug: 'default',
        career_center_name: null,
        user_full_name: null,
      };
      console.log(
        '[jobteaser-bridge] profile probe failed — committing with default slug',
      );
    }

    setStatus(
      envelope
        ? `captured profile from ${envelope.endpoint}`
        : 'no profile endpoint matched — committing session anyway',
      `slug=${profile.career_center_slug}` +
        (profile.user_full_name ? ` · ${profile.user_full_name}` : ''),
    );

    const cookies = {
      raw_cookie: document.cookie || '',
      captured_at: Date.now(),
    };

    try {
      await window.__TAURI_INTERNALS__.invoke('jobteaser_auth_complete', {
        profile,
        cookies,
      });
      captured = true;

      // Flip the banner to a "success + please navigate" state.
      // Window stays open so the XHR sniffer can keep logging.
      panel.style.background = '#16a34a';
      statusEl.textContent =
        'Career OS · session captured ✓ · click around the JT portal — every API call is logged for the next sprint';
      detailEl.textContent = `slug=${profile.career_center_slug}`;
      btn.textContent = 'Close window';
      btn.style.background = '#0f172a';
      btn.onclick = () => {
        // Use Tauri's webview close if available, else window.close.
        try {
          window.close();
        } catch {
          // no-op
        }
      };
      // Rust no longer auto-closes the window — by design.
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      setStatus('capture failed', msg, true);
      console.error('[jobteaser-bridge] invoke error:', e);
    }
    captureInProgress = false;
  }

  btn.addEventListener('click', () => capture(true));

  // Auto-poll: every 1s, check if we're off the login page. If so,
  // try to capture. Keep going until success or user clicks elsewhere.
  let polls = 0;
  const interval = setInterval(() => {
    if (captured) {
      clearInterval(interval);
      return;
    }
    polls++;
    if (isOnLoginPage()) {
      detailEl.textContent = `still on login (${polls}s)`;
      return;
    }
    detailEl.textContent = `auto-capture attempt #${polls}`;
    capture(false);
  }, 1000);

  // Some quality-of-life: log the URL on every navigation so we can
  // see in the console where the user lands after SSO.
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      console.log('[jobteaser-bridge] navigation:', lastUrl, '→', window.location.href);
      lastUrl = window.location.href;
    }
  }, 500);

  // ── XHR sniffer ─────────────────────────────────────────────────
  // After auth captures, the user can keep clicking around in JT
  // (search jobs, open a posting, filter by company…). Every fetch
  // gets logged as [jobteaser-bridge:xhr] METHOD URL → STATUS so we
  // can discover the real API surface for the scraper (JT-07).
  // Enabled regardless of capture state — the more URLs we log, the
  // better the next sprint.
  try {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url =
        typeof input === 'string' ? input : input && input.url ? input.url : '';
      const method = (init && init.method) || (input && input.method) || 'GET';
      try {
        const res = await origFetch(input, init);
        if (url.includes('jobteaser') || url.startsWith('/')) {
          console.log(
            `[jobteaser-bridge:xhr] ${method} ${url} → ${res.status}`,
          );
        }
        return res;
      } catch (e) {
        console.log(
          `[jobteaser-bridge:xhr] ${method} ${url} → ERROR ${e && e.message}`,
        );
        throw e;
      }
    };

    const OrigXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      const x = new OrigXHR();
      const origOpen = x.open;
      x.open = function (method, url) {
        x.__xb_url = url;
        x.__xb_method = method;
        return origOpen.apply(x, arguments);
      };
      x.addEventListener('loadend', () => {
        if (
          x.__xb_url &&
          (x.__xb_url.includes('jobteaser') || x.__xb_url.startsWith('/'))
        ) {
          console.log(
            `[jobteaser-bridge:xhr] ${x.__xb_method} ${x.__xb_url} → ${x.status}`,
          );
        }
      });
      return x;
    };
  } catch (e) {
    console.warn('[jobteaser-bridge] failed to install XHR sniffer:', e);
  }
})();
