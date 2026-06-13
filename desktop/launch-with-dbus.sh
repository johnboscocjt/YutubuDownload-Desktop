#!/usr/bin/env bash
# Lightweight launcher that ensures the app runs with a user D-Bus session.
# Usage: launch-with-dbus.sh /path/to/yutubu-download [args...]

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 /path/to/executable [args...]" >&2
  exit 2
fi

EXEC="$1"
shift || true

# Helps WebKitGTK video on some Linux drivers (avoids black frames).
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"
export GST_PLUGIN_FEATURE_RANK="${GST_PLUGIN_FEATURE_RANK:-avdec_h264:PRIMARY,avdec_h265:PRIMARY,vaapih264dec:NONE,vaapidecodebin:NONE,vaapisink:NONE}"
# XWayland enables mpv --wid embedding inside the app window on Wayland sessions.
export GDK_BACKEND="${GDK_BACKEND:-x11}"

# If DBUS_SESSION_BUS_ADDRESS is already set and not 'disabled', just exec.
if [ -n "${DBUS_SESSION_BUS_ADDRESS-}" ] && [ "${DBUS_SESSION_BUS_ADDRESS}" != "disabled" ]; then
  exec "$EXEC" "$@"
fi

# Launch with dbus-run-session to ensure WebKitWebProcess can talk to the bus.
if command -v dbus-run-session >/dev/null 2>&1; then
  exec dbus-run-session -- "$EXEC" "$@"
elif command -v dbus-launch >/dev/null 2>&1; then
  # dbus-launch --exit-with-session keeps the session tied to the process
  exec dbus-launch --exit-with-session "$EXEC" "$@"
else
  echo "Warning: dbus-run-session and dbus-launch not found: launching without D-Bus session." >&2
  exec "$EXEC" "$@"
fi
