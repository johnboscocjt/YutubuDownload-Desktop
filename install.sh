#!/usr/bin/env bash
# YutubuDownload Installer - Tanzania-Optimized YouTube Downloader
# Author: Johnbosco | Updated: February 08, 2026
# GitHub: https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal

# Exit on critical errors only
set -uo pipefail

# === ANIMATED LOADING FUNCTION (GREEN) ===
print_loading() {
    local msg="$1"
    echo -ne "\033[38;5;46m$msg\033[0m"
    for _ in {1..5}; do
        echo -ne "."
        sleep 0.3
    done
    echo -e " ✅\033[0m"
}

# Check root privileges
if [[ $EUID -ne 0 ]]; then
    echo "❌ ERROR: This installer requires root privileges."
    echo "   Run with:"
    echo "   sudo bash -c '\$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)'"
    exit 1
fi

echo ""
cat << 'EOF'

                    ▖▖  ▗   ▌   ▄        ▜      ▌
                    ▌▌▌▌▜▘▌▌▛▌▌▌▌▌▛▌▌▌▌▛▌▐ ▛▌▀▌▛▌
                    ▐ ▙▌▐▖▙▌▙▌▙▌▙▘▙▌▚▚▘▌▌▐▖▙▌█▌▙▌
                                                                                                                                       
EOF
echo "        Y U T U B U D O W N L O A D   I N S T A L L E R                  "
echo "            Tanzania-Optimized • v2.0.1 • Jun 08, 2026                   "
echo ""

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SCRIPT="$INSTALLER_DIR/YutubuDownload"

if command -v ytd &>/dev/null || [[ -f /usr/local/bin/YutubuDownload ]]; then
    echo "ℹ️  Existing installation detected — safe to reinstall (updates ytd and repairs dependencies)."
    echo ""
fi

# Helper function to check if package is installed
is_installed() {
    dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"
}

# Helper function to wait for apt lock
wait_for_apt_lock() {
    local timeout=30
    local count=0
    while sudo fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock >/dev/null 2>&1 && [ $count -lt $timeout ]; do
        if [ $count -eq 0 ]; then
            echo "   ⏳ Waiting for package manager to become available..."
        fi
        sleep 2
        ((count+=2))
    done
    if [ $count -ge $timeout ]; then
        echo "   ⚠️  Warning: Package manager still locked after 30s. Proceeding anyway..."
    fi
}

# STEP 1: System dependencies
echo "📦 STEP 1/5: Checking system dependencies..."
wait_for_apt_lock

if [ ! -f /var/cache/apt/pkgcache.bin ] || [ "$(find /var/cache/apt/pkgcache.bin -mmin +1440 2>/dev/null)" ]; then
    print_loading "   ↻ Updating package lists"
    apt-get update -qq > /dev/null 2>&1 || echo "   ⚠️  Warning: apt update failed (continuing anyway)"
fi

MISSING_PKGS=()
for pkg in ffmpeg python3-venv python3-pip; do
    if is_installed "$pkg"; then
        echo "   ✅ $pkg already installed"
    else
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    echo "   ⬇️  Installing missing packages: ${MISSING_PKGS[*]}..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${MISSING_PKGS[@]}" > /dev/null 2>&1
    if is_installed "${MISSING_PKGS[0]}"; then
        echo "   ✅ System dependencies installed"
    else
        echo "   ❌ FAILED to install dependencies. Try manually:"
        echo "      sudo apt install -y ${MISSING_PKGS[*]}"
        exit 1
    fi
else
    echo "   ✅ All system dependencies already installed"
fi

if is_installed mpv; then
    echo "   ✅ mpv already installed (instant in-app video playback)"
else
    echo "   ⬇️  Installing mpv for instant video playback..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mpv > /dev/null 2>&1 || true
    if is_installed mpv; then
        echo "   ✅ mpv installed"
    else
        echo "   ⚠️  mpv not installed — video will use slower WebKit fallback"
        echo "      Install later: sudo apt install mpv"
    fi
fi

# STEP 2: yt-dlp (always refresh — YouTube breaks stale builds often)
echo ""
echo "📦 STEP 2/5: Checking yt-dlp..."
print_loading "   ⬇️  Installing/updating yt-dlp"
if curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp; then
    chmod a+rx /usr/local/bin/yt-dlp
    echo "   ✅ yt-dlp ready at /usr/local/bin/yt-dlp ($(yt-dlp --version | head -1))"
else
    echo "   ❌ FAILED to install yt-dlp. Try manually:"
    echo "      sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp"
    echo "      sudo chmod a+rx /usr/local/bin/yt-dlp"
    exit 1
fi

# STEP 3: Deno - SIMPLIFIED VERSION
echo ""
echo "📦 STEP 3/5: Checking Deno (JavaScript runtime)..."
CURRENT_USER="${SUDO_USER:-$USER}"

# Check if deno is already accessible
if command -v deno &> /dev/null; then
    DENO_VERSION=$(deno --version 2>/dev/null | head -1 | awk '{print $2}' 2>/dev/null || echo "installed")
    echo "   ✅ Deno already available in PATH (v${DENO_VERSION})"
else
    # Check if user has deno in their home directory
    if [ -n "$CURRENT_USER" ] && [ "$CURRENT_USER" != "root" ]; then
        USER_HOME=$(eval echo "~$CURRENT_USER")
        if [ -f "$USER_HOME/.deno/bin/deno" ]; then
            DENO_VERSION=$("$USER_HOME/.deno/bin/deno" --version 2>/dev/null | head -1 | awk '{print $2}' 2>/dev/null || echo "installed")
            echo "   ✅ Deno installed for user $CURRENT_USER (v${DENO_VERSION})"
            echo "   ℹ️  Note: When running as root, Deno is not in PATH. But YutubuDownload will work when"
            echo "       running as regular user (without sudo)."
            
            # Add deno to user's PATH for future if not already there
            for rcfile in "$USER_HOME/.bashrc" "$USER_HOME/.zshrc"; do
                if [ -f "$rcfile" ] && ! grep -q '.deno/bin' "$rcfile" 2>/dev/null; then
                    echo 'export PATH="$HOME/.deno/bin:$PATH"' >> "$rcfile"
                    chown "$CURRENT_USER:$CURRENT_USER" "$rcfile"
                fi
            done
        else
            print_loading "   ⬇️  Installing Deno"
            # Simple direct download method - no piping through sh
            curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip 2>/dev/null
            if [ -f /tmp/deno.zip ]; then
                unzip -q -o /tmp/deno.zip -d /usr/local/bin/ 2>/dev/null
                chmod +x /usr/local/bin/deno 2>/dev/null
                rm -f /tmp/deno.zip 2>/dev/null
                if [ -f /usr/local/bin/deno ]; then
                    echo "   ✅ Deno installed to /usr/local/bin/deno"
                else
                    echo "   ⚠️  Could not install Deno (non-critical for basic functionality)"
                    echo "      You can install it manually later if needed for advanced features."
                fi
            else
                echo "   ⚠️  Could not download Deno (non-critical for basic functionality)"
            fi
        fi
    else
        print_loading "   ⬇️  Installing Deno for root"
        # Simple direct download for root
        curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip 2>/dev/null
        if [ -f /tmp/deno.zip ]; then
            unzip -q -o /tmp/deno.zip -d /usr/local/bin/ 2>/dev/null
            chmod +x /usr/local/bin/deno 2>/dev/null
            rm -f /tmp/deno.zip 2>/dev/null
            if [ -f /usr/local/bin/deno ]; then
                echo "   ✅ Deno installed to /usr/local/bin/deno"
            else
                echo "   ⚠️  Could not install Deno (non-critical for basic functionality)"
            fi
        else
            echo "   ⚠️  Could not download Deno (non-critical for basic functionality)"
        fi
    fi
fi

# STEP 4: Python venv for cookies
echo ""
echo "📦 STEP 4/5: Setting up Python environment for Chrome cookies..."
USER_DIR="/home/${CURRENT_USER:-$USER}/youtubedownloading"
ROOT_DIR="/root/youtubedownloading"

mkdir -p "$ROOT_DIR" 2>/dev/null
cd "$ROOT_DIR"
if [ -f "yt-venv/bin/activate" ]; then
    echo "   ✅ Root Python venv already exists"
else
    print_loading "   ⬇️  Creating root Python venv"
    python3 -m venv yt-venv > /dev/null 2>&1
    echo "   ✅ Root Python venv setup complete"
fi

print_loading "   🔧 Ensuring root cookie Python dependencies"
source yt-venv/bin/activate
pip install -q secretstorage cryptography browser-cookie3 > /dev/null 2>&1
deactivate
echo "   ✅ Root cookie Python dependencies ready"

if [ "$CURRENT_USER" != "root" ] && [ "$CURRENT_USER" != "" ]; then
    mkdir -p "$USER_DIR" 2>/dev/null
    chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_DIR" 2>/dev/null
    if sudo -u "$CURRENT_USER" test -f "$USER_DIR/yt-venv/bin/activate" 2>/dev/null; then
        echo "   ✅ User Python venv already exists"
    else
        print_loading "   ⬇️  Creating user Python venv"
        sudo -u "$CURRENT_USER" python3 -m venv "$USER_DIR/yt-venv" > /dev/null 2>&1
        echo "   ✅ User Python venv setup complete"
    fi

    print_loading "   🔧 Ensuring user cookie Python dependencies"
    sudo -u "$CURRENT_USER" bash -c "source $USER_DIR/yt-venv/bin/activate && pip install -q secretstorage cryptography browser-cookie3 > /dev/null 2>&1"
    echo "   ✅ User cookie Python dependencies ready"
fi

# STEP 5: YutubuDownload script
echo ""
echo "📦 STEP 5/5: Installing YutubuDownload script..."
if [[ -f "$LOCAL_SCRIPT" ]]; then
    echo "   📂 Using local script from repository (reinstall/update)"
    cp "$LOCAL_SCRIPT" /usr/local/bin/YutubuDownload
else
    print_loading "   ⬇️  Fetching latest script from GitHub"
    curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/YutubuDownload -o /usr/local/bin/YutubuDownload > /dev/null 2>&1
fi
chmod +x /usr/local/bin/YutubuDownload > /dev/null 2>&1
ln -sf /usr/local/bin/YutubuDownload /usr/local/bin/ytd > /dev/null 2>&1

if command -v ytd &> /dev/null && ytd --version &> /dev/null; then
    echo "   ✅ ytd installed to /usr/local/bin/ytd"
    echo "   ✅ Compatibility command: /usr/local/bin/YutubuDownload"
    echo "   ✅ Version: $(ytd --version)"
else
    echo "   ❌ FAILED to install ytd. Try manually:"
    echo "      sudo curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/YutubuDownload -o /usr/local/bin/YutubuDownload"
    echo "      sudo chmod +x /usr/local/bin/YutubuDownload"
    echo "      sudo ln -sf /usr/local/bin/YutubuDownload /usr/local/bin/ytd"
    exit 1
fi

# Optional: D-Bus wrapper + menu entry for terminal workflow (never removes desktop .deb)
echo ""
print_loading "   🔧 Installing terminal launcher and optional menu entry"
if [ -f "$INSTALLER_DIR/desktop/launch-with-dbus.sh" ]; then
    cp "$INSTALLER_DIR/desktop/launch-with-dbus.sh" /usr/local/bin/yutubu-launch
    chmod a+rx /usr/local/bin/yutubu-launch
    echo "   ✅ Installed D-Bus launcher: /usr/local/bin/yutubu-launch"
else
    echo "   ⚠️  D-Bus launcher script not found in repo (skipping)"
fi

if [ -f "$INSTALLER_DIR/desktop/yutubu-download.desktop.template" ]; then
    # Coexist with packaged GUI at /usr/bin/yutubu-download — separate menu name + file.
    if [ -x /usr/bin/yutubu-download ]; then
        DESKTOP_OUT="/usr/share/applications/yutubu-download-terminal.desktop"
        DESKTOP_NAME="YutubuDownload (Terminal)"
        rm -f /usr/share/applications/yutubu-download.desktop 2>/dev/null || true
        echo "   ℹ️  Desktop GUI detected — keeping ytd CLI; terminal menu entry is separate."
    else
        DESKTOP_OUT="/usr/share/applications/yutubu-download.desktop"
        DESKTOP_NAME="YutubuDownload"
    fi
    sed -e "s|^Name=.*|Name=${DESKTOP_NAME}|" \
        -e "s|Exec=.*|Exec=/usr/local/bin/yutubu-launch /usr/local/bin/YutubuDownload %U|" \
        "$INSTALLER_DIR/desktop/yutubu-download.desktop.template" > /tmp/yutubu-download.desktop
    mv /tmp/yutubu-download.desktop "$DESKTOP_OUT"
    chmod a+r "$DESKTOP_OUT"
    echo "   ✅ Installed menu entry: $DESKTOP_OUT"
else
    echo "   ⚠️  Desktop template not found in repo (skipping menu entry)"
fi


# === COMPLETION MESSAGE ===
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║ ✅ INSTALLATION COMPLETE!                                                    ║"
echo "║                                                                              ║"
echo "║   Next steps:                                                                ║"
echo "║ 1. CLOSE ALL CHROME WINDOWS COMPLETELY (required for cookies)                ║"
echo "║ 2. Open terminal and run:                                                    ║"
echo "║    ytd                                                                        ║"
echo "║ 3. Paste YouTube URL when prompted                                           ║"
echo "║                                                                              ║"
echo "║   🔁 To update or repair later, run the installer again (safe to repeat).    ║"
echo "║                                                                              ║"
echo "║   💡 Tanzania Tip: Run during off-peak hours (after 10 PM EAT)               ║"
echo "║    for best success on unstable networks                                     ║"
echo "║                                                                              ║"
echo "║ 🌍 Made with ❤️ for Tanzania by Johnbosco (Dar es Salaam)                     ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

echo "YUTUBUDOWNLOAD v2.0.1 • TANZANIA'S TERMINAL POWER  "
echo "Fast • Reliable • Bot-Bypass • Designed for TZ Networks"
echo ""

echo "Version: YutubuDownload v2.0.1 (2026-06-08)"
echo "Repository: https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal"
echo ""

# Quick test
echo "📊 Quick System Check:"
echo -n "   yt-dlp: " && command -v yt-dlp &>/dev/null && yt-dlp --version | head -1 || echo "Not found"
echo -n "   Deno: " && (command -v deno &>/dev/null && echo "Available" || echo "Not in root PATH")
if [ -n "$CURRENT_USER" ] && [ "$CURRENT_USER" != "root" ]; then
    USER_HOME=$(eval echo "~$CURRENT_USER")
    if [ -f "$USER_HOME/.deno/bin/deno" ]; then
        echo "   Deno location: $USER_HOME/.deno/bin/deno (user installation)"
        echo ""
        echo "💡 IMPORTANT: Since you have Deno as user '$CURRENT_USER',"
        echo "   run ytd WITHOUT sudo:"
        echo "   ytd"
        echo "   run from any directory of your choice"
    fi
fi
echo ""
