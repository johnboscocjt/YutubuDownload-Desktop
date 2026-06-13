#!/bin/sh
# Launched from the desktop entry — ensures GTK/WebKit env for GNOME menus.
export GDK_BACKEND="${GDK_BACKEND:-x11}"
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"

# If a broken environment disabled D-Bus (some IDE terminals), start a session.
if [ -z "$DBUS_SESSION_BUS_ADDRESS" ] || [ "$DBUS_SESSION_BUS_ADDRESS" = "disabled" ]; then
  if command -v dbus-run-session >/dev/null 2>&1; then
    exec dbus-run-session -- env YTD_SKIP_DBUS_BOOTSTRAP=1 /usr/bin/yutubu-download "$@"
  fi
fi

export YTD_SKIP_DBUS_BOOTSTRAP=1
exec /usr/bin/yutubu-download "$@"
