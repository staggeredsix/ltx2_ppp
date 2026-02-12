#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for p in "$ROOT_DIR/backend/data/genbroll.pid" "$ROOT_DIR/backend/data/comfy.pid"; do
  if [ -f "$p" ]; then
    kill "$(cat "$p")" || true
    rm -f "$p"
  fi
done
echo "Stopped GenB-Roll and ComfyUI (if running)."
