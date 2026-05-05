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

    const slug =
      center.slug ||
      center.identifier ||
      center.code ||
      (center.id != null ? String(center.id) : null) ||
      // fallback: derive from URL host or visible login
      (window.location.hostname || '')
        .split('.')[0]
        .replace(/^www$/, '') ||
      'jobteaser';

    // CamelCase keys so the Rust deserialiser (rename_all =
    // "camelCase") accepts them straight off the IPC.
    return {
      careerCenterSlug: String(slug || 'jobteaser').trim(),
      careerCenterName:
        center.name ||
        center.display_name ||
        center.title ||
        root.school_name ||
        null,
      userFullName:
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

    if (!profile || !profile.careerCenterSlug) {
      // Fallback: derive the slug from the post-auth URL host.
      // After SSO the user lands on `<school>.jobteaser.com` (e.g.
      // `ensam.jobteaser.com`) — the subdomain is the school slug.
      const host = (window.location.hostname || '').toLowerCase();
      const m = host.match(/^([a-z0-9-]+)\.jobteaser\.com$/);
      const fallbackSlug = m && m[1] !== 'www' ? m[1] : 'default';
      profile = {
        careerCenterSlug: fallbackSlug,
        careerCenterName: null,
        userFullName: null,
      };
      console.log(
        `[jobteaser-bridge] profile probe failed — using subdomain-derived slug '${fallbackSlug}'`,
      );
    }

    setStatus(
      envelope
        ? `captured profile from ${envelope.endpoint}`
        : 'no profile endpoint matched — committing session anyway',
      `slug=${profile.careerCenterSlug}` +
        (profile.userFullName ? ` · ${profile.userFullName}` : ''),
    );

    const cookies = {
      rawCookie: document.cookie || '',
      capturedAt: Date.now(),
    };

    try {
      await window.__TAURI_INTERNALS__.invoke('jobteaser_auth_complete', {
        profile,
        cookies,
      });
      captured = true;

      // Flip the banner to a "scraping" state.
      panel.style.background = '#0ea5e9';
      statusEl.textContent =
        'Career OS · session captured ✓ · scraping job offers…';
      detailEl.textContent = `slug=${profile.careerCenterSlug}`;

      // Kick off the in-WebView scrape. The auth window has the live
      // session — we read JT's server-rendered job pages, extract
      // __NEXT_DATA__, and forward to Rust.
      scrapeJobs(profile.careerCenterSlug)
        .then((count) => {
          panel.style.background = '#16a34a';
          statusEl.textContent =
            count > 0
              ? `Career OS · scraped ${count} job offers ✓`
              : 'Career OS · session captured ✓ · no jobs returned';
        })
        .catch((err) => {
          panel.style.background = '#dc2626';
          statusEl.textContent =
            'Career OS · scrape failed — see DevTools console for details';
          console.error('[jt-scrape] failed:', err);
        });
      btn.textContent = 'Close window';
      btn.style.background = '#0f172a';
      btn.onclick = async () => {
        // WebKit blocks window.close() on programmatically-opened
        // windows. Route the close through a dedicated Tauri command.
        try {
          await window.__TAURI_INTERNALS__.invoke(
            'jobteaser_close_auth_window',
          );
        } catch (e) {
          console.warn('[jobteaser-bridge] close failed:', e);
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

  // ── In-WebView scraper ──────────────────────────────────────────
  //
  // JT renders job listings server-side as Next.js pages. We fetch
  // `/fr/job-offers?page=N` (paginated), extract the __NEXT_DATA__
  // payload, find the jobs array, map to a Rust-friendly shape,
  // forward to `jobteaser_jobs_received`.
  //
  // Cookies are HttpOnly so we can't replay the session from Rust —
  // but `fetch(..., { credentials: 'include' })` from this WebView
  // sends them automatically.

  const MAX_PAGES = 8; // safety cap — adjust later if real volume justifies more

  async function scrapeJobs(slug) {
    const allJobs = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `/fr/job-offers?page=${page}`;
      let html;
      try {
        const r = await fetch(url, {
          credentials: 'include',
          headers: { Accept: 'text/html' },
        });
        if (!r.ok) {
          console.warn(`[jt-scrape] page ${page} → HTTP ${r.status}`);
          break;
        }
        html = await r.text();
      } catch (e) {
        console.error('[jt-scrape] fetch failed:', e);
        break;
      }

      const data = extractNextData(html);
      if (!data) {
        console.warn('[jt-scrape] no __NEXT_DATA__ on', url);
        break;
      }

      const jobs = findJobsArray(data);
      if (!jobs || jobs.length === 0) {
        console.log(`[jt-scrape] page ${page}: no jobs — stopping`);
        break;
      }
      console.log(`[jt-scrape] page ${page}: ${jobs.length} jobs`);
      for (const j of jobs) {
        allJobs.push(mapJob(j, slug));
      }
    }

    console.log(
      `[jt-scrape] scraped ${allJobs.length} unique jobs total for slug=${slug}`,
    );

    if (allJobs.length > 0) {
      await window.__TAURI_INTERNALS__.invoke('jobteaser_jobs_received', {
        slug,
        jobs: allJobs,
      });
    }
    return allJobs.length;
  }

  function extractNextData(html) {
    const m = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!m) return null;
    try {
      return JSON.parse(m[1]);
    } catch (e) {
      console.warn('[jt-scrape] __NEXT_DATA__ JSON parse failed:', e);
      return null;
    }
  }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function findJobsArray(data) {
    // Try common Next.js + JT-typical paths first.
    const paths = [
      'props.pageProps.jobs',
      'props.pageProps.jobOffers',
      'props.pageProps.results',
      'props.pageProps.initialJobs',
      'props.pageProps.initialState.jobs',
      'props.pageProps.data.jobs',
      'props.pageProps.data.jobOffers',
      'props.pageProps.searchResults.jobs',
      'props.pageProps.search.results',
    ];
    for (const p of paths) {
      const v = getPath(data, p);
      if (Array.isArray(v) && v.length > 0) {
        console.log(`[jt-scrape] jobs at: ${p} (${v.length})`);
        return v;
      }
    }
    // Fallback: walk the tree for any array of objects with title-like keys.
    const found = walkForJobs(data);
    if (found) {
      console.log(`[jt-scrape] jobs via walk (${found.length})`);
      return found;
    }
    console.warn(
      '[jt-scrape] could not locate jobs array — top-level shape:',
      Object.keys((data && data.props && data.props.pageProps) || {}),
    );
    return null;
  }

  function walkForJobs(obj, depth) {
    depth = depth || 0;
    if (depth > 6 || !obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0] && typeof obj[0] === 'object') {
        const keys = Object.keys(obj[0]);
        const hasTitle = ['title', 'name', 'role', 'jobTitle', 'job_title'].some(
          (k) => keys.includes(k),
        );
        const hasCompany = ['company', 'companyName', 'company_name', 'employer'].some(
          (k) => keys.includes(k),
        );
        if (hasTitle && (hasCompany || obj.length > 5)) return obj;
      }
      return null;
    }
    for (const k of Object.keys(obj)) {
      const v = walkForJobs(obj[k], depth + 1);
      if (v) return v;
    }
    return null;
  }

  function mapJob(j, slug) {
    const company = j.company || j.employer || {};
    const location = j.location || j.workplace || {};
    const contract = j.contract_type || j.contractType || j.contract || null;

    // Build a sensible source URL — JT exposes either a slug or path.
    let source_url =
      j.absolute_url ||
      j.url ||
      j.path ||
      j.href ||
      (j.slug ? `https://${slug}.jobteaser.com/fr/job-offers/${j.slug}` : null) ||
      (j.id ? `https://${slug}.jobteaser.com/fr/job-offers/${j.id}` : '');
    if (source_url && source_url.startsWith('/')) {
      source_url = `https://${slug}.jobteaser.com${source_url}`;
    }

    return {
      sourceId: String(j.id || j.uuid || j.slug || j.reference || ''),
      sourceUrl: source_url,
      role: j.title || j.name || j.jobTitle || j.job_title || '',
      company:
        (typeof company === 'object' && (company.name || company.title)) ||
        j.companyName ||
        j.company_name ||
        '',
      location:
        (typeof location === 'object' &&
          (location.city || location.name || location.label)) ||
        j.city ||
        j.locationName ||
        j.location_name ||
        '',
      description:
        j.description ||
        j.descriptionHtml ||
        j.descriptionPlain ||
        j.body ||
        j.content ||
        '',
      employmentType: contract || null,
      postedAt:
        j.created_at ||
        j.createdAt ||
        j.published_at ||
        j.publishedAt ||
        j.first_published_at ||
        null,
    };
  }

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
      // CRITICAL: do not interfere with Tauri's internal IPC bridge —
      // window.fetch is what __TAURI_INTERNALS__.invoke uses under the
      // hood. Wrapping it broke the auth roundtrip (see PR #20 discussion).
      if (url.startsWith('ipc://')) {
        return origFetch(input, init);
      }
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
