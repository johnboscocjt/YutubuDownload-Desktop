# 🛠️ Troubleshooting Guide

## ❌ Error: `browser-cookie3` Not Found

### Symptoms

When running `ytd`, you see:

```
⚠️  browser-cookie3 not found in active Python environment
🔧 Attempting auto-fix (installing browser-cookie3)...
❌ browser-cookie3 is still missing ❗ ❗ ❗ ❌
   Run installer again to repair dependencies:
   sudo bash -c '$(curl -sL https://...install.sh)'
```

### Cause

The Python virtual environment at `~/youtubedownloading/yt-venv` is either missing or the `browser-cookie3` package failed to install during setup (often due to a network timeout or pip error).

---

### ✅ Fix (Manual Repair)

**Step 1 — Create or repair the virtual environment:**

```bash
mkdir -p ~/youtubedownloading
python3 -m venv ~/youtubedownloading/yt-venv
source ~/youtubedownloading/yt-venv/bin/activate
pip install --upgrade pip
pip install browser-cookie3 secretstorage cryptography
deactivate
```

**Step 2 — Verify the installation:**

```bash
source ~/youtubedownloading/yt-venv/bin/activate
python3 -c "import browser_cookie3; print('✅ browser-cookie3 OK')"
deactivate
```

You should see:

```
✅ browser-cookie3 OK
```

**Step 3 — Run ytd normally (no sudo):**

```bash
ytd
```

---

### 💡 Important Notes

| ✅ Do | ❌ Don't |
|---|---|
| Run `ytd` as your normal user | Run `ytd` with `sudo` |
| Close Chrome completely before running | Leave Chrome open in background |
| Use a working internet connection for pip | Run pip on a metered/slow connection |

---

### 🔧 Still Not Working?

**If `python3-venv` itself is missing:**

```bash
sudo apt install python3-venv python3-pip -y
```

Then repeat the fix steps above.

**If pip fails due to SSL or network issues (common on TZ networks):**

```bash
source ~/youtubedownloading/yt-venv/bin/activate
pip install --upgrade pip --trusted-host pypi.org --trusted-host files.pythonhosted.org
pip install browser-cookie3 secretstorage cryptography \
    --trusted-host pypi.org \
    --trusted-host files.pythonhosted.org
deactivate
```

**If you get a `distutils` or `ensurepip` error:**

```bash
sudo apt install python3-distutils python3-full -y
```

Then recreate the venv:

```bash
rm -rf ~/youtubedownloading/yt-venv
python3 -m venv ~/youtubedownloading/yt-venv
source ~/youtubedownloading/yt-venv/bin/activate
pip install browser-cookie3 secretstorage cryptography
deactivate
```

---

### ℹ️ Why `browser-cookie3` Is Needed

`browser-cookie3` reads your Chrome session cookies so that `yt-dlp` can authenticate with YouTube and bypass bot-detection blocks. Without it, downloads of age-restricted or login-required videos may fail.

> Chrome must be **fully closed** (not just minimized) before running `ytd`, otherwise the cookie database is locked and cannot be read.

---

### 📬 Still Having Issues?

Open an issue on the [GitHub repository](https://github.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/issues) and include:

- Your Ubuntu version: `lsb_release -a`
- Python version: `python3 --version`
- pip version: `pip3 --version`
- The full error output from your terminal
