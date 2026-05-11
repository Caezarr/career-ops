# Career OS — brand assets

Source files for the Career OS visual identity. Don't edit the PNGs in-place; treat them as immutable canonical files. New variants go in a new file with a clear name.

## Files

| File | Dimensions | When to use |
|------|------------|-------------|
| `icon-only.png` | 1254×1254 | Standalone "C" mark. Favicons, tiny avatars, in-app placeholders, social profile pictures. |
| `app-icon.png` | 1254×1254 | "C" inside a rounded-square white tile. **macOS DMG / dock icon, iOS / Android app icons**. Tauri uses this one as the source for all bundle sizes (see "How Tauri uses these" below). |
| `logo-stacked.png` | 1254×1254 | "C" + "Career OS" wordmark stacked vertically. Splash screens, OG images, large slide titles. |
| `logo-horizontal-dark.png` | 2172×724 | "C" + "Career OS" wordmark in **dark navy**. Default for **light backgrounds** (landing header in light mode, email signatures, README banner). |
| `logo-horizontal-gradient.png` | 2172×724 | "C" + "Career OS" wordmark where the text matches the icon's blue→violet gradient. Use sparingly — splash hero, key marketing surfaces. Replace dark variant on **dark backgrounds** when contrast is too low. |

## How Tauri uses these

The `app-icon.png` is the input to:

```bash
pnpm tauri icon brand/app-icon.png
```

Which writes:

- `src-tauri/icons/32x32.png` … `1024x1024.png` (all the macOS / Windows sizes)
- `src-tauri/icons/icon.icns` (macOS DMG icon)
- `src-tauri/icons/icon.ico` (Windows)
- `src-tauri/gen/android/...` and `src-tauri/gen/apple/...` (mobile bundles)

**Re-run `pnpm tauri icon brand/app-icon.png`** after any change to `app-icon.png` — the generated files are committed to git so a fresh clone has the icons without needing the source.

## How the landing uses these

- `landing/public/favicon.png` — copy of `icon-only.png` (32px+ rendering via `<link rel="icon">`)
- `landing/public/logo.png` — copy of `logo-horizontal-dark.png` (header brand on careeros.fr)

These copies are tracked separately because the landing is deployed independently on Cloudflare Pages — keeping them in `landing/public/` means `pnpm wrangler pages deploy dist` picks them up without extra config.

## Color tokens (extracted from the gradient)

For when you need the brand colors in code:

| Token | Hex | Use |
|-------|-----|-----|
| `--brand-blue` | `#3D5BFF` | Top-left of the C gradient |
| `--brand-violet` | `#6F4FFF` | Bottom-right of the C gradient |
| `--brand-text` | `#0A0E2A` | Wordmark on light backgrounds |
| `--brand-bg-light` | `#FFFFFF` | App-icon tile background |

In CSS: `background: linear-gradient(135deg, #3D5BFF 0%, #6F4FFF 100%);`

## Don'ts

- ❌ Don't add a tagline next to the wordmark ("Career OS · the OS for…"). Keep it clean.
- ❌ Don't recolor the gradient. Blue→violet is the brand. Other accents (success green, warning amber) are for UI feedback, not branding.
- ❌ Don't squash. Both horizontal logo variants are 3:1 aspect — preserve.
- ❌ Don't use the gradient wordmark on the gradient background (low contrast). Use the dark wordmark over light, gradient wordmark over neutral, dark wordmark on the dark background with a slight desaturation if needed.

## SVG sources

If you have the vector originals (Figma export), drop them in `brand/svg/` and the build pipeline will prefer them over PNGs where SVG is supported (favicon, web header). PNG remains the fallback for email signatures + macOS dock.
