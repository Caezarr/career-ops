// Job Teaser auth bridge — runs inside the auth WebViewWindow.
//
// Strategy: poll `document.cookie` every 500ms. Once we see the JT
// session token, attempt to fetch the user's profile from JT's
// internal API to learn their career_center. When BOTH cookies AND
// profile are captured, invoke the Tauri `jobteaser_auth_complete`
// command, which persists to Keychain and closes this window.
//
// We never touch storage other than the live cookie jar — the only
// side effect is the single Tauri command call at the end.

(() => {
  'use strict';

  // The cookies we care about. JT wraps Devise/Rails session under
  // `_jobteaser_session` historically, plus a CSRF token. The set
  // may evolve — we capture EVERYTHING document.cookie exposes and
  // let the Rust scraper sort them out.
  const SESSION_COOKIE_NAMES = [
    '_jobteaser_session',
    '_jobteaser_user',
    'remember_user_token',
    'jobteaser_user_id',
  ];

  // Where to look up the user's profile. Educated guess from the
  // sprint spec — falls back to a banner asking the user to confirm
  // their school name if every endpoint 404s.
  const PROFILE_ENDPOINTS = [
    '/api/v1/users/me',
    '/api/v2/users/me',
    '/api/users/me',
    '/fr/users/me.json',
  ];

  let captured = false;

  function readCookieMap() {
    const map = {};
    for (const piece of (document.cookie || '').split(';')) {
      const [name, ...rest] = piece.trim().split('=');
      if (name) map[name] = rest.join('=');
    }
    return map;
  }

  function hasSessionCookie(map) {
    return SESSION_COOKIE_NAMES.some((n) => n in map);
  }

  async function tryProfileEndpoint(path) {
    try {
      const r = await fetch(path, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) return null;
      const j = await r.json();
      return j;
    } catch {
      return null;
    }
  }

  async function fetchProfile() {
    for (const p of PROFILE_ENDPOINTS) {
      const j = await tryProfileEndpoint(p);
      if (j) return { endpoint: p, json: j };
    }
    return null;
  }

  // Best-effort field extraction — different JT API versions use
  // different shapes; we try several common keys.
  function deriveProfile(profileJson) {
    if (!profileJson) return null;
    const root =
      profileJson.user ||
      profileJson.data ||
      profileJson.result ||
      profileJson;

    const center = root.career_center || root.school || root.university || {};

    const career_center_slug =
      center.slug ||
      center.identifier ||
      center.code ||
      String(center.id || '').trim() ||
      // Last resort: derive from window URL hostname.
      window.location.hostname.split('.')[0];

    if (!career_center_slug) return null;

    return {
      career_center_slug,
      career_center_name:
        center.name || center.display_name || center.title || null,
      user_full_name:
        root.full_name ||
        [root.first_name, root.last_name].filter(Boolean).join(' ') ||
        null,
    };
  }

  function showBanner(text, isError = false) {
    let el = document.getElementById('career-os-jt-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'career-os-jt-banner';
      el.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
        'padding:10px 16px;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;' +
        'text-align:center;color:#fff;';
      document.documentElement.appendChild(el);
    }
    el.style.background = isError ? '#dc2626' : '#0f172a';
    el.textContent = text;
  }

  async function attemptCapture() {
    if (captured) return;
    const map = readCookieMap();
    if (!hasSessionCookie(map)) {
      return;
    }

    captured = true;
    showBanner('Career OS · capturing your Job Teaser session…');

    const profileResult = await fetchProfile();
    const profile = deriveProfile(profileResult ? profileResult.json : null);

    if (!profile) {
      captured = false;
      showBanner(
        'Career OS · authenticated, but could not read your profile. Reload the page after logging in.',
        true,
      );
      return;
    }

    const cookies = {
      raw_cookie: document.cookie || '',
      captured_at: Date.now(),
    };

    try {
      await window.__TAURI_INTERNALS__.invoke('jobteaser_auth_complete', {
        profile,
        cookies,
      });
      // The Rust handler closes the window after persisting.
    } catch (e) {
      captured = false;
      showBanner('Career OS · capture failed: ' + (e && e.message ? e.message : e), true);
    }
  }

  // Initial banner so the user knows we're watching.
  showBanner(
    'Career OS · sign in normally. We will capture your session locally once you finish.',
  );

  // Poll every 500ms — cheap, simple, and covers SSO redirects that
  // mutate the cookie jar without firing JS events we can hook.
  setInterval(attemptCapture, 500);

  // Attempt immediately too in case the user already had a live
  // session from a previous browser tab.
  attemptCapture();
})();
