#!/usr/bin/env bash
# =============================================================================
#  VanRakshak-X macOS Installer
#  Run once before first launch: bash install.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
DASHBOARD_DIR="$SCRIPT_DIR/dashboard"
VENV_DIR="$BACKEND_DIR/.venv"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
info() { echo -e "       $*"; }

echo ""
echo "=================================================="
echo "        VanRakshak-X Installation  (macOS)"
echo "=================================================="
echo ""

# ── Step 1: Python 3 ─────────────────────────────────────────────────────────
echo "[1/6] Verifying Python 3..."

PYTHON_BIN=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" --version 2>&1 | awk '{print $2}')
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [[ "$MAJOR" -ge 3 && "$MINOR" -ge 8 ]]; then
            PYTHON_BIN="$cmd"
            ok "Python $VER found at $(command -v $cmd)"
            break
        fi
    fi
done

if [[ -z "$PYTHON_BIN" ]]; then
    fail "Python 3.8+ is required but not found.
       Install it from https://www.python.org/downloads/
       or via Homebrew: brew install python"
fi

echo ""

# ── Step 2: Node.js / npm ────────────────────────────────────────────────────
echo "[2/6] Verifying Node.js and npm..."

if ! command -v node &>/dev/null; then
    fail "Node.js is not installed.
       Install it from https://nodejs.org/ or: brew install node"
fi

if ! command -v npm &>/dev/null; then
    fail "npm is not installed. Please install Node.js from https://nodejs.org/"
fi

NODE_VER=$(node --version)
NPM_VER=$(npm --version)
ok "Node.js $NODE_VER  /  npm v$NPM_VER"
echo ""

# ── Step 3: Python virtual environment & packages ────────────────────────────
echo "[3/6] Setting up Python virtual environment..."

if [[ ! -d "$VENV_DIR" ]]; then
    info "Creating virtual environment in backend/.venv ..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
    ok "Virtual environment created."
else
    ok "Virtual environment already exists."
fi

VENV_PYTHON="$VENV_DIR/bin/python3"

info "Installing Python packages..."
"$VENV_PYTHON" -m pip install --upgrade pip --quiet
"$VENV_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt" --quiet
ok "Python packages installed."
echo ""

# ── Step 4: npm packages ─────────────────────────────────────────────────────
echo "[4/6] Installing dashboard npm packages..."
info "Running npm install in dashboard/ (this may take a minute)..."
npm install --prefix "$DASHBOARD_DIR" --silent
ok "npm packages installed."
echo ""

# ── Step 5: Mosquitto MQTT broker ────────────────────────────────────────────
echo "[5/6] Verifying Mosquitto MQTT broker..."

MOSQUITTO_FOUND=false

if command -v mosquitto &>/dev/null; then
    MOSQUITTO_FOUND=true
    ok "mosquitto found at $(command -v mosquitto)"
elif [[ -f /opt/homebrew/sbin/mosquitto ]]; then
    MOSQUITTO_FOUND=true
    ok "mosquitto found at /opt/homebrew/sbin/mosquitto"
elif [[ -f /usr/local/sbin/mosquitto ]]; then
    MOSQUITTO_FOUND=true
    ok "mosquitto found at /usr/local/sbin/mosquitto"
fi

if [[ "$MOSQUITTO_FOUND" = false ]]; then
    warn "Mosquitto MQTT broker was not found."
    echo ""
    info "Install it with Homebrew:"
    info "  brew install mosquitto"
    info "Then run this installer again."
    echo ""
fi
echo ""

# ── Step 6: Configuration files ──────────────────────────────────────────────
echo "[6/6] Generating default configuration files..."

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
    cat > "$BACKEND_DIR/.env" <<EOF
DATABASE_URL=sqlite:///./vanrakshak.db
MQTT_BROKER=localhost
MQTT_PORT=1883
SECRET_KEY=vanrakshak_secret_key_change_me
EOF
    ok "Generated backend/.env"
else
    ok "backend/.env already exists."
fi

# Make the launcher scripts executable
chmod +x "$SCRIPT_DIR/start_vanrakshak.sh"
ok "start_vanrakshak.sh marked as executable."
echo ""

# ── Done ─────────────────────────────────────────────────────────────────────
echo "=================================================="
echo "  VanRakshak-X Installation Completed Successfully"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Plug in your ESP32 device via USB."
echo "  2. Double-click start_vanrakshak.sh  (or: bash start_vanrakshak.sh)"
echo ""
