#!/usr/bin/env bash
# Career OS — Loops email packager
# ────────────────────────────────
# For each template:
#   1. Stage index.mjml + img/ assets into build/staging/<name>/
#   2. Per-template img/ takes precedence over shared _shared/img/
#   3. Compile staging/<name>/index.mjml to build/<name>.html (preview)
#   4. Zip the staging dir into build/<name>.zip with index.mjml at root,
#      ready for upload via Loops → Templates → Code (upload .zip).
#
# Logo strategy: drop your master logo once into _shared/img/logo.png and
# every template ZIP picks it up. Override per-template by putting an
# img/ folder inside the template's own directory.
#
# Usage:
#   ./build.sh                            # build all templates
#   ./build.sh welcome-lifetime-pro       # build only one
#
# Requires:
#   - node (for `npx mjml`)
#   - zip (macOS / Linux built-in)

set -euo pipefail

cd "$(dirname "$0")"

BUILD_DIR="build"
STAGING_DIR="$BUILD_DIR/staging"
SHARED_IMG_DIR="_shared/img"
mkdir -p "$BUILD_DIR"

# Either argv[1] (single template) or all sibling folders containing index.mjml
if [[ $# -gt 0 ]]; then
  TEMPLATES=("$1")
else
  TEMPLATES=()
  for d in */; do
    name="${d%/}"
    # Skip helper folders.
    case "$name" in
      build|_shared) continue ;;
    esac
    [[ -f "$name/index.mjml" ]] && TEMPLATES+=("$name")
  done
fi

if [[ ${#TEMPLATES[@]} -eq 0 ]]; then
  echo "No templates found (need <name>/index.mjml)."
  exit 1
fi

for name in "${TEMPLATES[@]}"; do
  src_dir="$name"
  src_mjml="$src_dir/index.mjml"
  stage_dir="$STAGING_DIR/$name"
  zip_path="$BUILD_DIR/$name.zip"
  html_preview="$BUILD_DIR/$name.html"

  if [[ ! -f "$src_mjml" ]]; then
    echo "  skip   $name (no index.mjml)"
    continue
  fi

  echo "  build  $name"

  # 1. Stage: fresh directory with index.mjml + (per-template OR shared) img/
  rm -rf "$stage_dir"
  mkdir -p "$stage_dir"
  cp "$src_mjml" "$stage_dir/index.mjml"

  if [[ -d "$src_dir/img" ]]; then
    cp -R "$src_dir/img" "$stage_dir/img"
    img_source="local"
  elif [[ -d "$SHARED_IMG_DIR" ]]; then
    cp -R "$SHARED_IMG_DIR" "$stage_dir/img"
    img_source="shared"
  else
    img_source="none"
  fi

  # 2. Compile to HTML for local preview + MJML syntax validation.
  npx --yes mjml@latest "$stage_dir/index.mjml" -o "$html_preview" --config.minify false >/dev/null

  # 3. Zip the staging dir contents. index.mjml ends up at the ZIP root —
  #    Loops requires this exact layout. We use an absolute path because
  #    the subshell cd's into the staging dir before zipping.
  rm -f "$zip_path"
  abs_zip_path="$(pwd)/$zip_path"
  (cd "$stage_dir" && zip -qr "$abs_zip_path" . -x "*.DS_Store")

  echo "         → $zip_path (img: $img_source)"
  echo "         → $html_preview  (preview)"
done

echo "Done."
