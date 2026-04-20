#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

VERSION="${1:-$(python3 - <<'PY'
import json
from pathlib import Path
print(json.loads(Path('manifest.json').read_text())['version'])
PY
)}"

BASENAME="reddit-stocks-translator-v${VERSION}-chrome-unpacked"
DIST_DIR="$REPO_ROOT/dist"
WORK_DIR=$(mktemp -d)
PKG_DIR="$WORK_DIR/$BASENAME"
mkdir -p "$PKG_DIR" "$DIST_DIR"

for file in manifest.json content.js shared.js options.html options.js styles.css README.md; do
  cp "$REPO_ROOT/$file" "$PKG_DIR/"
done

(
  cd "$WORK_DIR"
  zip -qr "$DIST_DIR/${BASENAME}.zip" "$BASENAME"
)

echo "$DIST_DIR/${BASENAME}.zip"
