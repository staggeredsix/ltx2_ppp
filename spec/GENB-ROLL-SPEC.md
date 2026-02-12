# GenB-Roll Specification

## Goals
- Premiere UXP panel drives generated B-roll from frame/clip input.
- Zero-config LAN discovery to backend.
- Backend orchestrates upload -> queue -> ComfyUI -> MP4 result.

## Non-goals
- Production auth/multi-tenant hardening.
- Full dynamic workflow authoring UI.

## UX Flows
1. Panel discovers backend automatically.
2. User chooses input mode (auto/frame/clip), enters prompt, clicks Generate.
3. Panel extracts or user-selects exported frame/clip fallback.
4. Upload + JOB_SUBMIT over WebSocket.
5. Queue/progress updates stream back.
6. Result MP4 preview and save.
7. Generate Another Version resubmits same input with random seed and `parentJobId`.

## Wire Protocol (WebSocket)

### Frontend -> Backend
- `HELLO`: `{ type, source }`
- `FILE_BEGIN`: `{ type, uploadId, filename }`
- binary frames: raw media bytes
- `FILE_END`: `{ type, uploadId }`
- `JOB_SUBMIT`: `{ type, uploadId, prompt, seed|"random", parentJobId? }`

### Backend -> Frontend
- `HELLO_ACK`: `{ type, version, queueDepth }`
- `FILE_ACK`: `{ type, uploadId }`
- `FILE_STORED`: `{ type, uploadId, bytes }`
- `JOB_ACCEPTED`: `{ type, jobId, seed }`
- `JOB_STATUS`: `{ type, jobId, status, error?, queueDepth? }`
- `JOB_PROGRESS`: `{ type, jobId, value, max, queueDepth }`
- `JOB_RESULT`: `{ type, jobId, status:"completed", downloadUrl }`

## Security defaults
- LAN-only expected usage.
- No auth by default.
- Documented mitigation: set `HOST=127.0.0.1` and firewall rules.

## Install Instructions
- Backend: `./backend/scripts/install_and_run.sh`
- Frontend: load `frontend/uxp-genb-roll/manifest.json` via UXP Developer Tool.

## Acceptance Tests
1. **Frame mode E2E**: export/select frame in Premiere, Generate, receive MP4 result.
2. **Clip segment E2E**: export/select clip segment, Generate, receive MP4 result.
3. **Queueing 3 jobs**: submit 3 times quickly, observe FIFO with queue depth decreasing.
4. **Generate Another Version**: run once then click again, verify new random seed and distinct output prefix.

## Troubleshooting checklist
- GPU/driver issue in ComfyUI.
- ComfyUI not reachable on `8188`.
- Required LTX custom nodes missing.
- mDNS/UDP blocked by firewall.
- Wrong `COMFY_ROOT` preventing output lookup.
