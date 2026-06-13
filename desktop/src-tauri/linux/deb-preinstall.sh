#!/bin/sh
# Remove legacy manual installs (scripts in /usr/local) so the packaged .deb is clean.
set -e
rm -f /usr/local/bin/YutubuDownload /usr/local/bin/yutubu-launch 2>/dev/null || true

# Old manual desktop entry (lowercase); keep Tauri's YutubuDownload.desktop from this package.
if [ -f /usr/share/applications/yutubu-download.desktop ]; then
  if grep -q '/usr/local/bin/yutubu-launch' /usr/share/applications/yutubu-download.desktop 2>/dev/null; then
    rm -f /usr/share/applications/yutubu-download.desktop
  fi
fi

exit 0
