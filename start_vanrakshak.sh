#!/usr/bin/env bash
# =============================================================================
#  VanRakshak-X  —  One-Click Launcher (macOS / Linux)
#  Usage:  bash start_vanrakshak.sh
#          (or double-click if your terminal app supports it)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_PYTHON="$BACKEND_DIR/.venv/bin/python3"

# ── Pre-flight check ─────────────────────────────────────────────────────────
if [[ ! -f "$VENV_PYTHON" ]]; then
    echo ""
    echo "[ERROR] Python virtual environment not found."
    echo "        Please run the installer first:  bash install.sh"
    echo ""
    # Keep terminal open so the user can read the error
    read -rp "Press Enter to exit..." _
    exit 1
fi

echo ""
echo "=================================================="
echo "         VanRakshak-X  Startup Initiated"
echo "=================================================="
echo ""

# Launch the Python orchestrator (which handles everything else)
exec "$VENV_PYTHON" -u "$SCRIPT_DIR/launcher.py"
