# YutubuDownload v2.0.1 Release Notes

**Release date:** June 08, 2026

## Patch Summary

v2.0.1 fixes video ID extraction on Bash and makes reinstalling the preferred repair path for outdated installs.

## Fixes

- **Video ID regex:** Replaced unsupported Perl-style `(?:...)` groups with Bash ERE-compatible patterns so metadata detection works reliably.
- **Reinstall flow:** `install.sh` can be run again safely; it detects existing installs and uses the local `YutubuDownload` script when run from a cloned repo.

## Documentation

- Added reinstall/update instructions to `TROUBLESHOOTING.md`
- Added on-screen reinstall hint when a YouTube URL cannot be parsed

## Upgrade

```bash
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/install.sh)"
```

Verify:

```bash
ytd --version
```

Expected output:

`ytd (YutubuDownload) v2.0.1 (2026-06-08) • Tanzania-Optimized • MULTI-INSTANCE + SHARED COOKIES`
