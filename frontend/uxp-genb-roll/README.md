# GenB-Roll UXP Panel (Premiere Pro)

## Load in UXP Developer Tool

1. Open Adobe UXP Developer Tool.
2. `Add Plugin` -> choose `frontend/uxp-genb-roll/manifest.json`.
3. Launch Premiere Pro from UXP Developer Tool.
4. Open panel: `Window -> Extensions (UXP) -> GenB-Roll`.

## Functional flow

1. Start backend (`./backend/scripts/install_and_run.sh`).
2. In panel, wait for backend discovery status.
3. Choose input mode and enter prompt (or use presets).
4. Click **Generate**.
5. Track queue/progress.
6. Preview generated MP4 in panel.
7. Save to disk with **Save Output**.

## Premiere extraction fallback

If your Premiere UXP build does not expose frame export APIs, the panel falls back to file-picking media exported from Premiere (Export Frame / Media Export), keeping end-to-end generation functional.
