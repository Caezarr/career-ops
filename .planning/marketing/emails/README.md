# Career OS — Loops email templates (MJML)

Source of truth for the 4 Loops email templates Career OS ships.
Versioned MJML → compiled to a `.zip` with `index.mjml` at the root →
**uploaded** to Loops via Templates → Code (upload `.zip`).

This is the workflow Loops officially documents for custom emails
([Loops docs: Uploading a custom email](https://loops.so/docs/creating-emails/uploading-custom-email)).

## Templates

| Folder                                          | Fires from                                                   | Loops env var                       |
| ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `welcome-lifetime/index.mjml`                   | Worker webhook (plan === `lifetime`)                         | `LOOPS_TEMPLATE_WELCOME_LIFETIME`   |
| `welcome-lifetime-pro/index.mjml`               | Worker webhook (plan === `lifetime_pro`)                     | `LOOPS_TEMPLATE_WELCOME_PRO`        |
| `refund-requested/index.mjml`                   | Worker `POST /v1/billing/refund`                             | `LOOPS_TEMPLATE_REFUND_REQUESTED`   |
| `beta-accepted/index.mjml`                      | Manual campaign send from Loops Audiences                    | — (operator-triggered, not in env)  |

The magic-link sign-in email lives directly in Loops (no MJML mirror —
it's been stable since launch and editing in-place is fine).

> **Why two welcome templates instead of one with a conditional?**
> Loops' MJML upload path doesn't support Handlebars `{{#if}}` blocks
> (the dynamic-tag system is single-brace `{DATA_VARIABLE:foo}`, with
> repeating content only via `<loops-array>`). Splitting into two
> dedicated templates is simpler and the Worker picks which to fire
> based on `plan`.

## Variable syntax (Loops dialect)

Loops uses **single-brace** tags, not Handlebars. Three flavours:

| Email type     | Syntax                              | Source                                      |
| -------------- | ----------------------------------- | ------------------------------------------- |
| Transactional  | `{DATA_VARIABLE:userEmail}`         | `dataVariables` block in the API call       |
| Workflow event | `{EVENT_PROPERTY:firstName}`        | Loops event property                        |
| Campaign       | `{firstName}` (no prefix)           | Loops contact property                      |

Our transactional templates (`welcome-*`, `refund-requested`) all use the
`DATA_VARIABLE:` prefix. The campaign template (`beta-accepted`) uses
contact properties without prefix.

### Variable contracts

#### `welcome-lifetime/index.mjml` (transactional)

| Variable     | Type   | Example                |
| ------------ | ------ | ---------------------- |
| `userEmail`  | string | `gabriel@example.com`  |

#### `welcome-lifetime-pro/index.mjml` (transactional)

| Variable          | Type   | Example                |
| ----------------- | ------ | ---------------------- |
| `userEmail`       | string | `gabriel@example.com`  |
| `refundDeadline`  | string | `13 novembre 2026`     |

#### `refund-requested/index.mjml` (transactional)

| Variable             | Type   | Example                |
| -------------------- | ------ | ---------------------- |
| `userEmail`          | string | `gabriel@example.com`  |
| `daysSincePurchase`  | number | `42`                   |
| `deadlineAt`         | string | `13 novembre 2026`     |

#### `beta-accepted/index.mjml` (campaign)

| Variable          | Type   | Example                                |
| ----------------- | ------ | -------------------------------------- |
| `firstName`       | string | `Gabriel`                              |
| `downloadUrl`     | string | `https://download.careeros.fr/beta.dmg`|
| `betaCode`        | string | `OS-BETA-A12F`                         |
| `earlyBirdPrice`  | string | `79€ au lieu de 99€`                   |

## Unsubscribe link — campaigns only, **not transactional**

Loops **rejects** `{unsubscribe_link}` on transactional templates at upload
time with the error _"Unsubscribe link is not allowed in transactional
emails"_. The rule is: transactional = no unsubscribe (the user opted in
by paying / acting), campaign = mandatory unsubscribe.

So our templates split as follows:

| Template                                 | Type           | Unsubscribe link |
| ---------------------------------------- | -------------- | ---------------- |
| `welcome-lifetime/index.mjml`            | Transactional  | ❌ no             |
| `welcome-lifetime-pro/index.mjml`        | Transactional  | ❌ no             |
| `refund-requested/index.mjml`            | Transactional  | ❌ no             |
| `beta-accepted/index.mjml`               | Campaign       | ✅ `{unsubscribe_link}` in footer |

## Build workflow

The build script lives next to the MJML sources. From the repo root:

```bash
./.planning/marketing/emails/build.sh                  # build all 4 templates
./.planning/marketing/emails/build.sh welcome-lifetime # build just one
```

For each template the script:

1. **Compiles** `<name>/index.mjml` to `build/<name>.html` (preview +
   syntax sanity check — Loops compiles server-side on upload, so the
   HTML preview is for browser-checking only)
2. **Zips** `<name>/` (containing `index.mjml` and an optional `img/`
   subdir) into `build/<name>.zip` with `index.mjml` at the root

Requires `node` (for `npx mjml`) and `zip` (macOS / Linux built-in).

## Upload to Loops

For each template:

1. Run the build script
2. Loops → **Templates** → select the template (create one if it doesn't exist)
3. In the template editor, click **Code** (the styling option that reveals
   a file picker)
4. Drag-and-drop `build/<name>.zip`
5. Click **Upload**
6. Send a test from inside the template editor to validate variable
   substitution before publishing

If you edit a template later, just re-run `build.sh` and re-upload the
`.zip` — Loops replaces the previous version on the same template.

## Adding images

If you want hosted images that aren't on `careeros.fr`:

1. Drop image files in `<template-name>/img/`
2. Reference them in the MJML with relative paths: `<mj-image src="img/header.png" />`
3. Re-run `build.sh` — the script preserves `img/` inside the ZIP
4. On upload, Loops hosts the images and rewrites paths

Right now all templates pull the logo from `https://careeros.fr/favicon.png`
(absolute URL) — no `img/` subdir needed.

## Brand cheat sheet

| Token        | Value                                |
| ------------ | ------------------------------------ |
| Accent       | `#6366f1` (indigo-500)               |
| Accent light | `#eef2ff` / `#c7d2fe` (indigo-50/200)|
| Text primary | `#111827` (gray-900)                 |
| Text body    | `#1f2937` (gray-800)                 |
| Text muted   | `#6b7280` (gray-500)                 |
| Card bg      | `#f9fafb` (gray-50)                  |
| Border       | `#e5e7eb` (gray-200)                 |
| Body bg      | `#f3f4f6` (gray-100)                 |
| Font         | Inter, system fallback               |
| Logo         | `https://careeros.fr/favicon.png` (48px)|

Keep these consistent across the four templates — Inter + indigo is the
visual signature of Career OS in-product, so each email should feel like
a direct extension of the app rather than a generic transactional shell.
