#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
COMFY_ROOT="${COMFY_ROOT:-$ROOT_DIR/comfy/ComfyUI}"
COMFY_PORT="${COMFY_PORT:-8188}"
API_PORT="${API_PORT:-31977}"

is_wsl="false"
if grep -qi microsoft /proc/version 2>/dev/null; then
  is_wsl="true"
fi

echo "== GenB-Roll one-click installer =="
echo "Root: $ROOT_DIR"
echo "WSL: $is_wsl"

sudo apt-get update
sudo apt-get install -y git python3 python3-venv python3-pip build-essential ffmpeg curl

if ! command -v node >/dev/null; then
  echo "Installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

mkdir -p "$(dirname "$COMFY_ROOT")"
if [ ! -d "$COMFY_ROOT" ]; then
  git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFY_ROOT"
fi

cd "$COMFY_ROOT"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -d "custom_nodes" ]; then
  mkdir -p custom_nodes
fi

if ! ls custom_nodes | grep -Eqi "ltx|ltxv"; then
  echo "[NOTICE] LTX-2 custom nodes not detected in ComfyUI/custom_nodes."
  echo "Install your LTX-2 package, then rerun this script (or continue for smoke testing)."
fi

nohup python3 main.py --listen 0.0.0.0 --port "$COMFY_PORT" > "$ROOT_DIR/backend/data/logs/comfy.log" 2>&1 &
echo $! > "$ROOT_DIR/backend/data/comfy.pid"

cd "$BACKEND_DIR"
npm ci
nohup node src/server.js > "$ROOT_DIR/backend/data/logs/genbroll.log" 2>&1 &
echo $! > "$ROOT_DIR/backend/data/genbroll.pid"

echo ""
echo "ComfyUI URL: http://localhost:$COMFY_PORT"
echo "GenB-Roll URL: http://localhost:$API_PORT"
echo "Discovery: mDNS _genbroll._tcp.local + UDP 41235"
echo "Run backend/scripts/stop.sh to stop services."
