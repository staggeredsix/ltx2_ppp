# Troubleshooting

- **Backend not discovered**: Ensure firewall allows mDNS and UDP/41235; panel also scans common LAN subnets.
- **Comfy unreachable**: Check `backend/data/logs/comfy.log` and port `8188`.
- **Jobs fail immediately**: Workflow template likely mismatched to installed LTX nodes.
- **No output mp4 found**: Confirm ComfyUI output dir is `comfy/ComfyUI/output` or set `COMFY_ROOT`.
- **UXP cannot extract frame directly**: Use panel fallback by exporting frame/clip in Premiere and selecting file.
