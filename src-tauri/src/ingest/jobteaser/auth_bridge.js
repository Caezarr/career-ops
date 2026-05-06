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
  // Secondary button — only shown after a successful scrape so the
  // user can navigate to a different URL (different filter / "all
  // offers" tab / company page) and re-scrape from there.
  const btn2 = document.createElement('button');
  btn2.type = 'button';
  btn2.textContent = 'Re-scrape this page';
  btn2.style.cssText =
    'background:#475569;color:#fff;border:none;padding:6px 12px;' +
    'border-radius:6px;cursor:pointer;font:inherit;font-weight:600;' +
    'margin-right:8px;display:none;';
  panel.appendChild(statusEl);
  panel.appendChild(detailEl);
  panel.appendChild(btn2);
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
  const AUTOSCROLL_MAX_ROUNDS = 80; // ~80 rounds * 700ms = 56s ceiling
  const AUTOSCROLL_STABLE_THRESHOLD = 5; // stop after N stable rounds in a row

  /** Force more job cards to render by combining three signals:
   *
   *   1. `scrollIntoView` on the LAST job link — works even when the
   *      lazy-load container isn't the window (JT often nests the
   *      list inside a div with overflow-y:scroll).
   *   2. window.scrollBy as a belt-and-braces.
   *   3. Click any visible "Voir plus" / "Charger plus" / "Show more"
   *      button — some JT skins use a button instead of infinite
   *      scroll.
   *
   *  Stops when card count is stable for AUTOSCROLL_STABLE_THRESHOLD
   *  rounds OR we hit the round ceiling.
   *
   *  First round logs the page's scrollable containers so we can
   *  see if there's a non-window scroll target we should hit
   *  directly. */
  /** Combined scroll+collect for virtualized lists.
   *
   *  JT only keeps ~22 cards in DOM at any moment — older ones get
   *  unmounted as we scroll past. So we MUST snapshot each card the
   *  first time we see it, BEFORE it disappears. We use a Map keyed
   *  by canonical href as the natural dedup mechanism.
   *
   *  Stops when the unique-href count is stable for THRESHOLD rounds
   *  in a row — meaning recent scrolls are no longer revealing new
   *  postings.
   *
   *  Returns the collected job snapshots as `Map<href, jobObj>`.
   */
  async function autoscrollAndCollect(slug) {
    const collected = new Map();
    snapshotVisibleJobs(collected, slug);

    let lastCount = collected.size;
    let stable = 0;
    let rounds = 0;
    console.log(`[jt-scrape] autoscroll start: ${lastCount} unique jobs collected`);

    // One-shot diagnostic — log the obvious scroll containers so we
    // can target them directly in v3 if the simple strategies miss.
    const scrollContainers = Array.from(
      document.querySelectorAll('*'),
    ).filter((el) => {
      if (el === document.documentElement || el === document.body) return false;
      const cs = getComputedStyle(el);
      return (
        (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 50
      );
    });
    if (scrollContainers.length > 0) {
      console.log(
        `[jt-scrape] inner scroll containers found: ${scrollContainers
          .slice(0, 5)
          .map(
            (el) =>
              `${el.tagName.toLowerCase()}.${(el.className || '')
                .toString()
                .slice(0, 30)}`,
          )
          .join(' | ')}`,
      );
    }

    while (rounds < AUTOSCROLL_MAX_ROUNDS && stable < AUTOSCROLL_STABLE_THRESHOLD) {
      // Strategy A: scrollIntoView on the LAST visible link.
      const links = document.querySelectorAll(
        'a[href*="/job-offers/"]:not([href$="/job-offers/"]):not([href*="?"])',
      );
      if (links.length > 0) {
        try {
          links[links.length - 1].scrollIntoView({
            block: 'end',
            behavior: 'instant',
          });
        } catch {
          links[links.length - 1].scrollIntoView(false);
        }
      }

      // Strategy B: window scroll fallback.
      window.scrollBy(0, Math.max(window.innerHeight * 0.85, 600));

      // Strategy C: max-scroll inner containers.
      for (const c of scrollContainers) {
        c.scrollTop = c.scrollHeight;
      }

      // Strategy D: click "Voir plus"-style buttons.
      const loadMore = findLoadMoreButton();
      if (loadMore) {
        console.log('[jt-scrape] clicking load-more button');
        loadMore.click();
      }

      await new Promise((r) => setTimeout(r, 700));

      // Snapshot whatever's now in the DOM — accumulates across rounds.
      snapshotVisibleJobs(collected, slug);

      if (collected.size === lastCount) {
        stable++;
      } else {
        stable = 0;
        lastCount = collected.size;
      }
      rounds++;
      if (rounds % 4 === 0) {
        console.log(
          `[jt-scrape] autoscroll round ${rounds}: ${collected.size} unique jobs (stable=${stable}/${AUTOSCROLL_STABLE_THRESHOLD})`,
        );
      }
    }
    console.log(
      `[jt-scrape] autoscroll done at round ${rounds}: ${collected.size} unique jobs collected`,
    );
    return collected;
  }

  /** Snapshot every currently-visible job card into `collected`.
   *  Keyed by canonical href so re-scans don't duplicate. */
  function snapshotVisibleJobs(collected, slug) {
    const links = document.querySelectorAll(
      'a[href*="/job-offers/"]:not([href$="/job-offers/"]):not([href*="?"])',
    );
    const byHref = new Map();
    for (const a of links) {
      if (!byHref.has(a.href)) byHref.set(a.href, a);
    }
    for (const [href, a] of byHref) {
      if (collected.has(href)) continue;
      const card =
        a.closest(
          '[data-testid*="job"], [class*="JobCard"], [class*="jobCard"], article, li, [role="article"]',
        ) ||
        a.parentElement ||
        a;
      const job = domNodeToJob(card, a);
      if (job && job.title && job.url) {
        collected.set(href, mapJob(job, slug));
      }
    }
  }

  function countJobLinks() {
    return document.querySelectorAll(
      'a[href*="/job-offers/"]:not([href$="/job-offers/"]):not([href*="?"])',
    ).length;
  }

  /** Find a visible button whose text suggests it loads more results.
   *  We tolerate FR ("Voir plus", "Charger plus") + EN ("Show more",
   *  "Load more") + button[aria-label*="more"]. */
  function findLoadMoreButton() {
    const candidates = document.querySelectorAll(
      'button, a[role="button"], [data-testid*="load-more"], [data-testid*="show-more"]',
    );
    for (const el of candidates) {
      const text = (el.textContent || '').toLowerCase().trim();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      if (
        /voir plus|charger plus|afficher plus|plus d.offres|load more|show more|more results/.test(
          text + ' ' + aria,
        )
      ) {
        const r = el.getBoundingClientRect();
        // Must be visible (non-zero size, on-screen).
        if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
      }
    }
    return null;
  }

  const PAGINATE_MAX_PAGES = 30;
  const PAGINATE_WAIT_MS = 1500;

  /** Walk through every paginated page of the current view.
   *
   *   1. autoscrollAndCollect on the current page (handles in-page
   *      lazy loading, virtualization).
   *   2. Look for a "next page" button. If found and enabled:
   *      click → wait for the URL or the visible card hrefs to
   *      change → loop.
   *   3. If no next button visible, stop.
   *
   *  Map<href, job> is shared across pages so duplicates are free.
   */
  async function paginateAndCollect(slug) {
    const collected = new Map();
    let pageIdx = 1;

    while (pageIdx <= PAGINATE_MAX_PAGES) {
      const before = collected.size;

      // JT shows ALL cards for the current page in DOM at once. We
      // do a single fast snapshot + one polite scroll to the bottom
      // (in case anything is below the fold), then a final snapshot.
      // No long autoscroll loop — that wasted ~3 rounds per page.
      snapshotVisibleJobs(collected, slug);
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 250));
      snapshotVisibleJobs(collected, slug);

      const newOnPage = collected.size - before;
      console.log(
        `[jt-paginate] page ${pageIdx}: +${newOnPage} (cumulative ${collected.size})`,
      );

      const nextBtn = findNextPageButton();
      if (!nextBtn) {
        console.log(`[jt-paginate] no next-page button after page ${pageIdx}`);
        break;
      }

      // Snapshot a sentinel href so we can detect the page change.
      const firstLinkBefore =
        document
          .querySelector(
            'a[href*="/job-offers/"]:not([href$="/job-offers/"]):not([href*="?"])',
          )
          ?.getAttribute('href') || '';

      console.log(`[jt-paginate] clicking next → page ${pageIdx + 1}`);
      try {
        nextBtn.click();
      } catch (e) {
        console.warn('[jt-paginate] click failed:', e);
        break;
      }

      // Wait for either URL change OR first-card href change.
      const changed = await waitForPageChange(firstLinkBefore, PAGINATE_WAIT_MS);
      if (!changed) {
        console.warn(
          '[jt-paginate] page did not change after click — stopping',
        );
        break;
      }

      pageIdx++;
    }
    console.log(
      `[jt-paginate] done at page ${pageIdx}: ${collected.size} unique jobs`,
    );
    return collected;
  }

  /** Find a visible+enabled next-page control. JT pagination is
   *  rendered with various aria-labels across skins / locales:
   *  "Page suivante", "Next page", or just an icon-only button
   *  with rel="next" or data-testid="*-next". */
  function findNextPageButton() {
    const sels = [
      '[data-testid*="next-page"]',
      '[data-testid*="pagination-next"]',
      '[data-testid="next"]',
      'a[rel="next"]',
      'button[aria-label*="suivant" i]',
      'button[aria-label*="next" i]',
      'a[aria-label*="suivant" i]',
      'a[aria-label*="next" i]',
      // Numbered pagination — pick the link whose text is the
      // current-page-+1 if we can guess.
    ];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.disabled) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
      }
    }
    // Fallback: numeric pagination — find a `[aria-current="page"]`
    // and click its sibling that's currentPage+1.
    const current = document.querySelector('[aria-current="page"]');
    if (current) {
      const text = current.textContent.trim();
      const num = parseInt(text, 10);
      if (Number.isFinite(num)) {
        for (const el of document.querySelectorAll(
          'a, button, [role="button"]',
        )) {
          if (parseInt((el.textContent || '').trim(), 10) === num + 1) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
          }
        }
      }
    }
    return null;
  }

  /** Resolve true once either the URL changes OR the first job link
   *  is different from the snapshot. Resolves false on timeout. */
  async function waitForPageChange(firstLinkBefore, timeoutMs) {
    const urlBefore = window.location.href;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.location.href !== urlBefore) return true;
      const firstLinkNow =
        document
          .querySelector(
            'a[href*="/job-offers/"]:not([href$="/job-offers/"]):not([href*="?"])',
          )
          ?.getAttribute('href') || '';
      if (firstLinkNow && firstLinkNow !== firstLinkBefore) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return false;
  }

  async function scrapeJobs(slug, opts) {
    opts = opts || {};
    const allJobs = [];

    console.log(
      `[jt-scrape] scraping at: ${window.location.href} (skipNavigation=${!!opts.skipNavigation})`,
    );

    // ── Strategy 1: navigate to clean /fr/job-offers + auto-scroll
    //   + scrape the live DOM. JT lazy-loads job cards as you
    //   scroll; without this we only see the first 4-15 jobs that
    //   happen to be in the viewport.
    //
    //   We use sessionStorage to survive the navigation: the bridge
    //   re-injects on every page load, sees the flag, and runs the
    //   scrape there instead of re-doing the auth roundtrip.
    //
    //   `opts.skipNavigation` lets the user trigger a manual scrape
    //   from whatever URL they're currently on (via the "Re-scrape
    //   this page" button) — useful when the default /fr/job-offers
    //   redirects to a saved-search the user wants to bypass.
    if (
      !opts.skipNavigation &&
      (window.location.pathname !== '/fr/job-offers' ||
        window.location.search.length > 0)
    ) {
      try {
        sessionStorage.setItem('careerOsJtScrapeSlug', slug);
      } catch {}
      console.log('[jt-scrape] navigating to clean /fr/job-offers');
      // The bridge will re-init on the new page and pick up where we left.
      window.location.assign('/fr/job-offers');
      return 0; // scrape resumes after navigation
    }

    // Combined scroll+snapshot. JT virtualizes the listing — older
    // cards get unmounted as you scroll past, so a one-shot
    // scrapeLiveDom at the end only sees the LAST viewport's worth.
    // autoscrollAndCollect captures each card the first time it's
    // visible, accumulating in a Map.
    //
    // BUT — JT uses CLASSIC PAGINATION (page 1/2/3 buttons), not
    // infinite scroll. So scroll alone caps at 22 (= page size).
    // paginateAndCollect wraps autoscrollAndCollect: scrape current
    // page, click "next page", wait for re-render, scrape, repeat
    // until no next-page button is visible.
    const collected = await paginateAndCollect(slug);
    for (const job of collected.values()) allJobs.push(job);
    console.log(`[jt-scrape] strategy=paginate+scroll: ${allJobs.length} jobs`);

    // ── Strategy 2: fetch + __NEXT_DATA__ across pages ─────────────
    if (allJobs.length === 0) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `/fr/job-offers?page=${page}`;
        let html;
        try {
          const r = await fetch(url, {
            credentials: 'include',
            headers: { Accept: 'text/html' },
          });
          console.log(
            `[jt-scrape] GET ${url} → ${r.status} (${r.headers.get('content-length') || '?'} bytes)`,
          );
          if (!r.ok) break;
          html = await r.text();
        } catch (e) {
          console.error('[jt-scrape] fetch failed:', e);
          break;
        }

        // Log a snippet of the response so we can see if cookies
        // worked (logged-out HTML shouts "Connexion" everywhere).
        if (page === 1) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          console.log(
            `[jt-scrape] page 1 title: "${titleMatch ? titleMatch[1] : '?'}", html length: ${html.length}`,
          );
        }

        const data = extractNextData(html);
        if (!data) {
          console.warn('[jt-scrape] no __NEXT_DATA__ on', url);
          // Inspect what JSON-bearing tags ARE in the page so we can
          // adapt next iteration.
          const scripts = [
            ...html.matchAll(
              /<script(?:[^>]*type="application\/(?:json|ld\+json)")?[^>]*id="([^"]+)"/g,
            ),
          ].map((m) => m[1]);
          console.log(
            `[jt-scrape] script ids in HTML: ${scripts.join(', ') || '(none)'}`,
          );
          break;
        }

        // Log the shape so I can wire the right path next iteration.
        if (page === 1) {
          const topKeys = Object.keys(data || {});
          const propsKeys = Object.keys(data.props || {});
          const pageKeys = Object.keys((data.props && data.props.pageProps) || {});
          console.log(
            `[jt-scrape] __NEXT_DATA__ shape: top=[${topKeys}] props=[${propsKeys}] pageProps=[${pageKeys}]`,
          );
        }

        const jobs = findJobsArray(data);
        if (!jobs || jobs.length === 0) {
          console.log(`[jt-scrape] page ${page}: no jobs — stopping`);
          break;
        }
        console.log(`[jt-scrape] page ${page}: ${jobs.length} jobs`);
        for (const j of jobs) allJobs.push(mapJob(j, slug));
      }
    }

    console.log(
      `[jt-scrape] scraped ${allJobs.length} unique jobs total for slug=${slug}`,
    );

    try {
      sessionStorage.removeItem('careerOsJtScrapeSlug');
    } catch {}

    if (allJobs.length > 0) {
      // Chunk the IPC payload — Tauri's custom-protocol fetch can hit
      // access-control errors on large bodies (saw "Not allowed to
      // request resource" on a single 22-job batch). Tauri falls back
      // to postMessage, but smaller batches sidestep the issue and
      // give us partial-success even if one batch errors.
      const CHUNK = 10;
      let sent = 0;
      for (let i = 0; i < allJobs.length; i += CHUNK) {
        const batch = allJobs.slice(i, i + CHUNK);
        const payloadBytes = JSON.stringify(batch).length;
        try {
          await window.__TAURI_INTERNALS__.invoke('jobteaser_jobs_received', {
            slug,
            jobs: batch,
          });
          sent += batch.length;
          console.log(
            `[jt-scrape] sent batch ${i / CHUNK + 1}: ${batch.length} jobs (${payloadBytes} bytes)`,
          );
        } catch (e) {
          console.warn(
            `[jt-scrape] batch ${i / CHUNK + 1} failed (${payloadBytes} bytes):`,
            e,
          );
        }
      }
      console.log(
        `[jt-scrape] total: ${sent}/${allJobs.length} jobs delivered to Rust`,
      );
    }
    return allJobs.length;
  }

  /** Try to read jobs from the currently rendered DOM.
   *
   *  Strategy: anchors to a JT job posting follow the URL pattern
   *  `/fr/job-offers/<id-or-slug>` (with or without further path).
   *  Those links are the most stable signal. We collect every such
   *  link, group by their target href (so multiple links to the
   *  same posting collapse), then for each unique posting walk up
   *  to the closest sensible card container and pull title +
   *  company + location.
   *
   *  Falls back to data-testid / class-based scans only if the
   *  href approach turns up nothing (e.g. JT switches anchor to a
   *  button + JS onclick at some point). */
  function scrapeLiveDom() {
    // 1) Find every link that points to an individual posting.
    const linkNodes = document.querySelectorAll(
      'a[href*="/job-offers/"]:not([href$="/job-offers/"]):not([href*="?"])',
    );
    console.log(
      `[jt-scrape] live-dom: ${linkNodes.length} <a href*="/job-offers/"> links found`,
    );

    if (linkNodes.length > 0) {
      // Dedup by href — JT often renders 2+ links per card (image,
      // title, "Voir l'offre" CTA…) all pointing at the same job.
      const byHref = new Map();
      for (const a of linkNodes) {
        if (!byHref.has(a.href)) byHref.set(a.href, a);
      }
      console.log(
        `[jt-scrape] live-dom: ${byHref.size} unique job links after dedup`,
      );

      const rows = [];
      for (const a of byHref.values()) {
        const card = a.closest(
          '[data-testid*="job"], [class*="JobCard"], [class*="jobCard"], article, li, [role="article"]',
        ) || a.parentElement || a;
        const job = domNodeToJob(card, a);
        if (job && job.title && job.url) rows.push(job);
      }
      console.log(
        `[jt-scrape] live-dom: ${rows.length} jobs mapped from links`,
      );
      if (rows.length > 0) return rows;
    }

    // 2) Fallback: testid / class scans (kept from earlier iteration).
    const candidates = [
      '[data-testid*="job-card"]',
      '[data-testid*="job-offer"]',
      '[data-testid*="JobCard"]',
      'article[class*="job"]',
      'li[class*="job"]',
    ];
    for (const sel of candidates) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length === 0) continue;
      console.log(
        `[jt-scrape] live-dom selector "${sel}" matched ${nodes.length} nodes`,
      );
      const rows = Array.from(nodes)
        .map((n) => domNodeToJob(n))
        .filter((r) => r && r.title && r.url);
      if (rows.length > 0) return rows;
    }

    // 3) Diagnostic dump: tell me what testids JT actually uses so
    // I can write a precise selector next iteration.
    const allTestIds = new Set();
    for (const n of document.querySelectorAll('[data-testid]')) {
      const v = n.getAttribute('data-testid');
      if (v && /job|offer|card|posting/i.test(v)) allTestIds.add(v);
    }
    console.log(
      `[jt-scrape] live-dom: no jobs. Visible job-ish data-testids: ${
        Array.from(allTestIds).slice(0, 20).join(' | ') || '(none)'
      }`,
    );
    console.log(
      `[jt-scrape] live-dom: visible classes containing "job": ${
        Array.from(
          new Set(
            Array.from(document.querySelectorAll('[class*="job"]'))
              .slice(0, 15)
              .map((n) => n.className),
          ),
        ).join(' | ') || '(none)'
      }`,
    );
    return [];
  }

  function domNodeToJob(n, providedLink) {
    // Caller can pass the canonical link (the one from the
    // dedup-by-href map). Otherwise we rediscover one inside the node.
    const link =
      providedLink ||
      (n.tagName === 'A' ? n : n.querySelector('a[href*="/job-offers/"]'));
    if (!link) return null;
    const url = link.href;
    const m = url.match(/\/job-offers\/([\w-]+)/);
    const id = m ? m[1] : url.split('?')[0];
    const text = (n.textContent || '').trim();
    // Cards often have title in <h2>/<h3>/<strong> or class*="title".
    // Fallback: link's own text (the canonical link is usually the
    // title CTA).
    const titleEl = n.querySelector('h2, h3, h4, [class*="title"]');
    const title =
      (titleEl && titleEl.textContent.trim()) ||
      (link.textContent && link.textContent.trim()) ||
      text.split('\n')[0].slice(0, 200);
    // Best-effort company / location pull.
    const companyEl = n.querySelector('[class*="company"], [class*="employer"]');
    const locationEl = n.querySelector('[class*="location"], [class*="place"]');
    return {
      id,
      slug: id,
      url,
      title,
      company: { name: companyEl ? companyEl.textContent.trim() : '' },
      location: { city: locationEl ? locationEl.textContent.trim() : '' },
      description: '',
    };
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

  // ── Resume hook (must be last — uses const + function decls
  //   defined throughout this IIFE) ───────────────────────────────
  // If the previous load triggered a navigation to /fr/job-offers
  // (see scrapeJobs), the bridge re-injects on the new page and
  // we pick the scrape back up here without re-doing the auth
  // probe. Live-on-test 2026-05-05: TDZ bug if you put this earlier
  // in the IIFE — the const declarations for AUTOSCROLL_* haven't
  // executed yet when scrapeJobs(resumeSlug) reaches them.
  let resumeSlug = null;
  try {
    resumeSlug = sessionStorage.getItem('careerOsJtScrapeSlug');
  } catch {}

  if (resumeSlug && !isOnLoginPage()) {
    console.log(
      '[jobteaser-bridge] resuming scrape after navigation:',
      resumeSlug,
    );
    setStatus('resuming scrape after navigation…', `slug=${resumeSlug}`);
    panel.style.background = '#0ea5e9';
    captured = true; // suppresses the auth-poll setInterval

    // Defer slightly so the page's own scripts get a chance to
    // render the first batch of cards before we start scrolling.
    setTimeout(() => {
      scrapeJobs(resumeSlug)
        .then((count) => {
          panel.style.background = '#16a34a';
          statusEl.textContent =
            count > 0
              ? `Career OS · scraped ${count} job offers ✓ · navigate then "Re-scrape" for more`
              : 'Career OS · scrape returned 0 jobs · navigate to a different page and "Re-scrape"';
          // Show the "Re-scrape this page" secondary button — user
          // can navigate to a richer URL (e.g. unfilter saved searches,
          // browse companies, all-internships tab) and click to scrape
          // from there. The same slug is reused.
          btn2.style.display = 'inline-block';
          btn2.onclick = () => {
            panel.style.background = '#0ea5e9';
            statusEl.textContent = `Career OS · re-scraping ${window.location.pathname}…`;
            btn2.style.display = 'none';
            scrapeJobs(resumeSlug, { skipNavigation: true })
              .then((c) => {
                panel.style.background = '#16a34a';
                statusEl.textContent =
                  c > 0
                    ? `Career OS · scraped ${c} more job offers ✓`
                    : 'Career OS · 0 new jobs on this page';
                btn2.style.display = 'inline-block';
              })
              .catch((err) => {
                panel.style.background = '#dc2626';
                statusEl.textContent =
                  'Career OS · re-scrape failed — see DevTools';
                console.error('[jt-scrape] manual re-scrape failed:', err);
                btn2.style.display = 'inline-block';
              });
          };
          btn.textContent = 'Close window';
          btn.style.background = '#0f172a';
          btn.onclick = async () => {
            try {
              await window.__TAURI_INTERNALS__.invoke(
                'jobteaser_close_auth_window',
              );
            } catch (e) {
              console.warn('[jobteaser-bridge] close failed:', e);
            }
          };
        })
        .catch((err) => {
          panel.style.background = '#dc2626';
          statusEl.textContent =
            'Career OS · scrape failed — see DevTools console for details';
          console.error('[jt-scrape] resume failed:', err);
        });
    }, 1500);
  }
})();
