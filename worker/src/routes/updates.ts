/**
 * Auto-update manifest endpoint.
 *
 * The Tauri updater calls
 *   GET /v1/updates/:target/:arch/:current_version
 *
 * `target` is one of darwin-aarch64 / darwin-x86_64 / windows-x86_64 /
 * linux-x86_64 (Tauri formats it). `current_version` is the running
 * app's `tauri.conf.json::version`.
 *
 * Response contract:
 *   - 204 No Content   → app is up to date (most common path)
 *   - 200 + JSON       → an update is available; body matches Tauri's
 *                        UpdaterManifest schema
 *   - 404              → unknown target (typo, unsupported platform)
 *
 * Source of truth for the latest version lives on GitHub Releases —
 * we proxy `GET /repos/<owner>/<repo>/releases/latest` and translate
 * the JSON shape into Tauri's expected format. This keeps the
 * release process simple (`gh release create`) without us having to
 * juggle a separate KV/D1 row.
 *
 * Required env vars (set in wrangler.toml [vars]):
 *   - GITHUB_REPO         e.g. "Caezarr/career-ops"
 *   - UPDATE_PUBKEY_NAME  e.g. "career-os"
 *
 * Required asset naming convention on each GitHub release:
 *   - Career.OS_<version>_aarch64.dmg
 *   - Career.OS_<version>_aarch64.dmg.sig   (Tauri signer output)
 *
 * If GitHub responds slowly or 404s, we degrade to 204 — better to
 * skip an update check than block the user.
 */
import { Hono } from "hono";
import type { Env } from "../types";

interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  body?: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GithubReleaseAsset[];
}

interface UpdateEnv extends Env {
  GITHUB_REPO?: string;
}

export const updateRoutes = new Hono<{ Bindings: UpdateEnv }>();

updateRoutes.get("/:target/:arch/:current", async (c) => {
  const target = c.req.param("target");
  const arch = c.req.param("arch");
  const current = c.req.param("current");

  // Normalise to the Tauri platform key, e.g. "darwin-aarch64".
  const platformKey = `${target}-${arch}`;
  const supported = ["darwin-aarch64", "darwin-x86_64"];
  if (!supported.includes(platformKey)) {
    return c.json({ error: "unsupported_platform" }, 404);
  }

  const repo = c.env.GITHUB_REPO;
  if (!repo) {
    // No repo configured = release pipeline not wired up yet.
    // Return 204 so the client treats this as "no update".
    return new Response(null, { status: 204 });
  }

  let release: GithubRelease;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases/latest`,
      {
        headers: {
          // GitHub requires a UA header — anonymous calls without one
          // get 403'd.
          "user-agent": "career-os-worker",
          accept: "application/vnd.github+json",
        },
        // The Cloudflare cache layer makes this safe to call
        // every check — GH rate-limits anonymous to 60/h/IP, but
        // each Cloudflare PoP is a separate IP, so per-edge it's
        // effectively unlimited at our scale.
      },
    );
    if (res.status === 404) {
      // Repo has no releases yet — same outcome as "no update".
      return new Response(null, { status: 204 });
    }
    if (!res.ok) {
      console.error(`updates: github ${res.status}`);
      return new Response(null, { status: 204 });
    }
    release = (await res.json()) as GithubRelease;
  } catch (e) {
    // Network blip → don't block the user, return "no update".
    console.error("updates: github fetch failed", e);
    return new Response(null, { status: 204 });
  }

  if (release.draft || release.prerelease) {
    return new Response(null, { status: 204 });
  }

  // Release tags are typically `v0.1.0`; strip the leading `v`.
  const latestVersion = release.tag_name.replace(/^v/, "");
  if (!isNewerSemver(latestVersion, current)) {
    return new Response(null, { status: 204 });
  }

  // Find the DMG + sig assets matching the requested platform.
  // Tauri convention: `<productName>_<version>_<arch>.<ext>`.
  // We accept both spelled names and underscore variants because
  // the bundler sometimes inserts dots in the product name.
  const dmgAsset = release.assets.find(
    (a) =>
      a.name.toLowerCase().includes(arch.toLowerCase()) &&
      a.name.toLowerCase().endsWith(".dmg"),
  );
  const sigAsset = release.assets.find(
    (a) =>
      a.name.toLowerCase().includes(arch.toLowerCase()) &&
      a.name.toLowerCase().endsWith(".dmg.sig"),
  );

  if (!dmgAsset || !sigAsset) {
    console.error(
      `updates: missing dmg/sig asset for ${platformKey} in ${release.tag_name}`,
    );
    return new Response(null, { status: 204 });
  }

  // The .sig file is short (~150 bytes) — fetch and inline it. The
  // Tauri client expects the signature in the manifest, not as a
  // separate URL.
  let signature: string;
  try {
    const sigRes = await fetch(sigAsset.browser_download_url);
    if (!sigRes.ok) {
      console.error(`updates: sig fetch ${sigRes.status}`);
      return new Response(null, { status: 204 });
    }
    signature = (await sigRes.text()).trim();
  } catch (e) {
    console.error("updates: sig fetch failed", e);
    return new Response(null, { status: 204 });
  }

  return c.json({
    version: latestVersion,
    notes: release.body ?? "",
    pub_date: release.published_at,
    platforms: {
      [platformKey]: {
        signature,
        url: dmgAsset.browser_download_url,
      },
    },
  });
});

/** Strict semver compare — returns true when `a` > `b`. Falls back
 *  to lexical compare for non-semver tags. */
function isNewerSemver(a: string, b: string): boolean {
  const re = /^(\d+)\.(\d+)\.(\d+)/;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (!ma || !mb) return a !== b && a > b;
  for (let i = 1; i <= 3; i++) {
    const da = parseInt(ma[i], 10);
    const db = parseInt(mb[i], 10);
    if (da > db) return true;
    if (da < db) return false;
  }
  return false;
}
