#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/full_mockup.png"
OUT="$ROOT/public/home"
QUALITY=75

if [[ ! -f "$SRC" ]]; then
    echo "Missing source image: $SRC" >&2
    exit 1
fi

mkdir -p "$OUT"

crop_webp() {
    local name="$1"
    local geometry="$2"
  magick "$SRC" -crop "$geometry" +repage -quality "$QUALITY" "$OUT/$name"
}

# geometry format: WxH+X+Y
crop_webp "hero-bg.webp" "870x520+400+80"
crop_webp "mode-quick.webp" "180x200+430+560"
crop_webp "mode-ranked.webp" "180x200+620+560"
crop_webp "mode-training.webp" "180x200+810+560"
crop_webp "mode-packs.webp" "180x200+1000+560"
crop_webp "icon-gold.webp" "36x36+1190+18"
crop_webp "icon-crystal.webp" "36x36+1310+18"
crop_webp "icon-gem.webp" "36x36+1430+18"
crop_webp "event-banner.webp" "280x120+20+620"
crop_webp "news-1.webp" "80x80+20+820"
crop_webp "news-2.webp" "80x80+360+820"
crop_webp "news-3.webp" "80x80+700+820"
crop_webp "avatar-placeholder.webp" "48x48+1540+18"
crop_webp "season-pass-char.webp" "200x140+1450+780"

echo "Extracted home assets to $OUT"
