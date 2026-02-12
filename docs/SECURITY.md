# Security Defaults

- Service binds to `0.0.0.0` for LAN discovery by default.
- Intended for trusted LAN/dev environments only.
- No auth enabled by default; isolate with firewall/VLAN.
- Disable LAN exposure by setting `HOST=127.0.0.1`.
- Uploaded media is stored under `backend/data/uploads` and outputs under `backend/data/outputs`.
