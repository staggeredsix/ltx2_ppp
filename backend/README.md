# GenB-Roll Backend

Node.js orchestration service for ComfyUI-driven B-roll generation.

## Quick start (Linux/WSL)

```bash
./backend/scripts/install_and_run.sh
```

This installs dependencies, clones ComfyUI, starts ComfyUI, and starts GenB-Roll.

## Service endpoints

- `GET /health`
- `GET /capabilities`
- `GET /jobs/:id`
- `GET /jobs/:id/result`
- WebSocket: `ws://<host>:31977/ws`

## CLI smoke test against ComfyUI

```bash
cd backend
npm run comfy:test -- /absolute/path/to/input.png
```

## Notes on LTX-2

The included template workflow is patchable and intentionally generic. Replace node graph details with your installed LTX-2 custom nodes as needed; `workflowPatcher.js` resolves by class type/title and fails with actionable messages when required nodes are missing.
